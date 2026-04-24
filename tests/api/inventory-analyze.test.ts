/** Tests for POST /api/inventory/analyze (async kick-off).
 *
 * The route is now thin: auth → parse/validate → rate limit → start
 * managed-agent session → upload photos → insert placeholder cache row →
 * return { analysisId, photoUrls }. The actual agent work happens on
 * Anthropic infra; the /status route drains the result. These tests
 * exercise the route-level contracts; agent orchestration is covered
 * by field tests against a live session. */

import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('../../src/lib/inventory-access', () => ({
    hasInventoryAccess: () => Promise.resolve(true),
    getClientIP: () => Promise.resolve('127.0.0.1'),
    checkAnalyzeRateLimit: () => ({ allowed: true }),
}))

mock.module('../../src/lib/env', () => ({
    env: {
        ANTHROPIC_API_KEY: 'test-key',
        ANTHROPIC_AGENT_ID: 'agent_test',
        ANTHROPIC_AGENT_ENVIRONMENT_ID: 'env_test',
    },
}))

const mockStart = mock(() =>
    Promise.resolve({
        sessionId: 'sesn_test',
        compressedImages: [{ base64: 'Y29tcA==', mimeType: 'image/jpeg' }],
    }),
)
const mockIsConfigured = mock(() => true)
mock.module('../../src/lib/inventory-agent', () => ({
    startAgentSession: mockStart,
    isManagedAgentConfigured: mockIsConfigured,
}))

const mockUpload = mock(() => Promise.resolve(['https://cdn/photo1.jpg']))
mock.module('../../src/lib/uploadthing-server', () => ({
    uploadInventoryImages: mockUpload,
}))

let insertShouldFail = false
const mockInsertReturning = mock(() =>
    insertShouldFail
        ? Promise.reject(new Error('cache insert failed'))
        : Promise.resolve([{ id: 'cache-uuid-1' }]),
)
mock.module('../../db', () => ({
    db: {
        insert: () => ({
            values: () => ({ returning: mockInsertReturning }),
        }),
    },
}))
mock.module('../../db/schema', () => ({
    inventoryAnalysisCache: {
        id: 'id-col',
        sessionId: 'session-id-col',
        analysisJson: 'analysis-json-col',
        expiresAt: 'expires-at-col',
    },
    personalProperty: { _: 'mocked-personal-property' },
    entity: { id: 'entity_id_col' },
}))

let mod: typeof import('../../src/app/api/inventory/analyze/route')

async function loadRoute() {
    mod = await import('../../src/app/api/inventory/analyze/route')
}

function jsonRequest(body: unknown) {
    return new Request('http://test/api/inventory/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as Parameters<typeof mod.POST>[0]
}

describe('POST /api/inventory/analyze (async kick-off)', () => {
    beforeEach(async () => {
        mockStart.mockClear()
        mockUpload.mockClear()
        mockInsertReturning.mockClear()
        mockIsConfigured.mockImplementation(() => true)
        insertShouldFail = false
        await loadRoute()
    })

    test('happy path → 200 with analysisId + photoUrls', async () => {
        const res = await mod.POST(
            jsonRequest({
                images: [{ base64: 'Zm9v', mimeType: 'image/jpeg' }],
            }),
        )
        expect(res.status).toBe(200)
        const body = (await res.json()) as Record<string, unknown>
        expect(body.success).toBe(true)
        expect(body.analysisId).toBe('cache-uuid-1')
        expect(body.photoUrls).toEqual(['https://cdn/photo1.jpg'])
        expect(mockStart).toHaveBeenCalledTimes(1)
    })

    test('401 when access cookie missing', async () => {
        mock.module('../../src/lib/inventory-access', () => ({
            hasInventoryAccess: () => Promise.resolve(false),
            getClientIP: () => Promise.resolve('127.0.0.1'),
            checkAnalyzeRateLimit: () => ({ allowed: true }),
        }))
        await loadRoute()
        const res = await mod.POST(
            jsonRequest({
                images: [{ base64: 'Zm9v', mimeType: 'image/jpeg' }],
            }),
        )
        expect(res.status).toBe(401)
        mock.module('../../src/lib/inventory-access', () => ({
            hasInventoryAccess: () => Promise.resolve(true),
            getClientIP: () => Promise.resolve('127.0.0.1'),
            checkAnalyzeRateLimit: () => ({ allowed: true }),
        }))
    })

    test('415 when content-type is not application/json', async () => {
        const req = new Request('http://test/api/inventory/analyze', {
            method: 'POST',
            headers: { 'content-type': 'text/plain' },
            body: 'not json',
        }) as unknown as Parameters<typeof mod.POST>[0]
        const res = await mod.POST(req)
        expect(res.status).toBe(415)
    })

    test('400 on malformed JSON body', async () => {
        const req = new Request('http://test/api/inventory/analyze', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{"images": [',
        }) as unknown as Parameters<typeof mod.POST>[0]
        const res = await mod.POST(req)
        expect(res.status).toBe(400)
    })

    test('400 on schema validation failure (no images)', async () => {
        const res = await mod.POST(jsonRequest({ images: [] }))
        expect(res.status).toBe(400)
    })

    test('503 when managed agent IDs not configured', async () => {
        mockIsConfigured.mockImplementation(() => false)
        const res = await mod.POST(
            jsonRequest({
                images: [{ base64: 'Zm9v', mimeType: 'image/jpeg' }],
            }),
        )
        expect(res.status).toBe(503)
    })

    test('cache insert failure does not fail the request', async () => {
        insertShouldFail = true
        const res = await mod.POST(
            jsonRequest({
                images: [{ base64: 'Zm9v', mimeType: 'image/jpeg' }],
            }),
        )
        expect(res.status).toBe(200)
        const body = (await res.json()) as Record<string, unknown>
        expect(body.success).toBe(true)
        // analysisId is empty when cache insert fails; client will see it
        // as "no AI" and the submit path already handles that gracefully.
        expect(body.analysisId).toBe('')
    })

    test('photo upload failure does not fail the request', async () => {
        mockUpload.mockImplementationOnce(() =>
            Promise.reject(new Error('uploadthing 500')),
        )
        const res = await mod.POST(
            jsonRequest({
                images: [{ base64: 'Zm9v', mimeType: 'image/jpeg' }],
            }),
        )
        expect(res.status).toBe(200)
        const body = (await res.json()) as Record<string, unknown>
        expect(body.success).toBe(true)
        expect(body.photoUrls).toEqual([])
    })

    test('402 + billing message when Anthropic returns credit balance error', async () => {
        mockStart.mockImplementationOnce(() =>
            Promise.reject(
                new Error(
                    'Your credit balance is too low. Please visit Plans & Billing.',
                ),
            ),
        )
        const res = await mod.POST(
            jsonRequest({
                images: [{ base64: 'Zm9v', mimeType: 'image/jpeg' }],
            }),
        )
        expect(res.status).toBe(402)
        const body = (await res.json()) as Record<string, unknown>
        expect(body.error).toMatch(/credit balance/i)
    })

    test('500 on unknown error (Sentry captureException path)', async () => {
        mockStart.mockImplementationOnce(() =>
            Promise.reject(new Error('totally unexpected')),
        )
        const res = await mod.POST(
            jsonRequest({
                images: [{ base64: 'Zm9v', mimeType: 'image/jpeg' }],
            }),
        )
        expect(res.status).toBe(500)
    })
})
