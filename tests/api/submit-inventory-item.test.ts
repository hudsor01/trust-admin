/** Tests for submitInventoryItem — direct insert into personal_property
 * with access-code cookie gate + cached-analysis trust boundary. */

import { beforeEach, describe, expect, mock, test } from 'bun:test'

// Access-code cookie gate mock — submitInventoryItem gates on the same
// hasInventoryAccess() cookie check as the /forms/inventory page and the
// /api/inventory/analyze route. Tests default to an authenticated cookie.
mock.module('../../src/lib/inventory-access', () => ({
    hasInventoryAccess: () => Promise.resolve(true),
}))

mock.module('../../src/lib/env', () => ({
    env: {},
}))

// Pass-through mock for the inventory-analysis module so sibling test
// files' mocks don't leak across file boundaries (bun mock.module is
// global per process). submitInventoryItem only imports
// InventoryAnalysisSchema from this module today.
const mockSchemaParse = mock((input: unknown) => ({
    success: true,
    data: input as Record<string, unknown>,
}))
mock.module('../../src/lib/inventory-analysis', () => ({
    InventoryAnalysisSchema: { safeParse: mockSchemaParse },
}))

// Capture insert.values(...) so we can assert the server reads
// reviewStatus from CACHED analysis (not form data) — the trust boundary
// for the analyze→submit flow.
let capturedInsertValues: Record<string, unknown> | null = null
const mockReturning = mock(() => Promise.resolve([{ id: 123 }]))
const mockValues = mock((v: Record<string, unknown>) => {
    capturedInsertValues = v
    return { returning: mockReturning }
})
const mockInsert = mock(() => ({ values: mockValues }))

// Cache-lookup chain: db.select({analysisJson}).from(cache).where(...).limit(1)
let cachedAnalysis: unknown = null
const mockLimit = mock(() =>
    Promise.resolve(
        cachedAnalysis !== null ? [{ analysisJson: cachedAnalysis }] : [],
    ),
)
const mockWhere = mock(() => ({ limit: mockLimit }))
const mockFrom = mock((table: unknown) => {
    // Two different select chains exist in the action:
    //   1. cache lookup:  db.select({analysisJson}).from(cache).where(...).limit(1)
    //   2. entity resolve: db.select({id}).from(entity).orderBy(...).limit(1)
    // Distinguish by the table identifier passed to .from().
    const tableName =
        typeof table === 'object' && table !== null && 'id' in table
            ? (table as { id: string }).id
            : ''
    if (tableName === 'entity_id_col') {
        // entity chain — returns [{ id: 1 }] after orderBy().limit()
        return {
            orderBy: () => ({
                limit: () => Promise.resolve([{ id: 1 }]),
            }),
        }
    }
    // cache chain
    return { where: mockWhere }
})
const mockSelect = mock(() => ({ from: mockFrom }))

mock.module('../../db', () => ({
    db: { insert: mockInsert, select: mockSelect },
}))

mock.module('../../db/schema', () => ({
    personalProperty: { _: 'mocked-personal-property' },
    inventoryAnalysisCache: {
        id: 'mocked-cache-id',
        analysisJson: 'mocked-analysis-json',
        expiresAt: 'mocked-expires-at',
    },
    entity: {
        id: 'entity_id_col',
    },
}))

mock.module('drizzle-orm', () => ({
    and: () => 'and',
    asc: () => 'asc',
    eq: () => 'eq',
    gt: () => 'gt',
}))

const { submitInventoryItem } = await import(
    '../../src/app/forms/_actions/submitInventoryItem'
)

function buildFormData(fields: Record<string, string | undefined>): FormData {
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) fd.append(k, v)
    }
    return fd
}

function freshCachedAnalysis(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Painting',
        category: 'artwork',
        brand: null,
        model: null,
        materials: [],
        era: null,
        estimatedValue: '22000.00',
        valueRangeLow: '18000.00',
        valueRangeHigh: '30000.00',
        condition: 'good',
        conditionNotes: '',
        description: '',
        valuationRationale: 'https://heritage.com/a; https://artnet.com/b',
        reviewStatus: 'needs_professional_appraisal',
        reviewNotes: '',
        ...overrides,
    }
}

describe('submitInventoryItem — direct insert into personal_property', () => {
    beforeEach(() => {
        capturedInsertValues = null
        cachedAnalysis = null
        mockInsert.mockClear()
        mockValues.mockClear()
        mockReturning.mockClear()
        mockReturning.mockImplementation(() => Promise.resolve([{ id: 123 }]))
        mockSelect.mockClear()
        mockFrom.mockClear()
        mockWhere.mockClear()
        mockLimit.mockClear()
        mockSchemaParse.mockClear()
        mockSchemaParse.mockImplementation((input) => ({
            success: true,
            data: input,
        }))
    })

    test('uses cached reviewStatus directly (no client override), form display values flow through', async () => {
        cachedAnalysis = freshCachedAnalysis({
            estimatedValue: '22000.00',
            valueRangeLow: '18000.00',
            valueRangeHigh: '30000.00',
            valuationRationale:
                'Heritage https://heritage.com/a; Artnet https://artnet.com/b',
            reviewStatus: 'needs_professional_appraisal',
        })

        const fd = buildFormData({
            name: 'Cheap print',
            category: 'ART',
            condition: 'good',
            estimatedValue: '500.00',
            valueRangeLow: '400.00',
            valueRangeHigh: '600.00',
            aiReviewStatus: 'inventory_ready',
            aiValuationRationale:
                'https://example.com/a and https://example.com/b',
            analysisId: '11111111-2222-4333-8444-555555555555',
        })
        const result = await submitInventoryItem({ success: false }, fd)

        expect(result.success).toBe(true)
        // The stored reviewStatus from the cached analysis is written
        // directly to aiConfidence — client-submitted aiReviewStatus is
        // ignored. (Deterministic override guardrails and the
        // aiServerOverrideReasons column were dropped when the inventory
        // pipeline simplified.)
        expect(capturedInsertValues?.aiConfidence).toBe(
            'needs_professional_appraisal',
        )
        // Form display values still flow through (dodValue = estimatedValue)
        expect(capturedInsertValues?.name).toBe('Cheap print')
        expect(capturedInsertValues?.dodValue).toBe('500.00')
        expect(capturedInsertValues?.entityId).toBe(1)
    })

    test('clean cached analysis → aiConfidence=inventory_ready, aiSuggested=true', async () => {
        cachedAnalysis = freshCachedAnalysis({
            estimatedValue: '35.00',
            valueRangeLow: '25.00',
            valueRangeHigh: '60.00',
            reviewStatus: 'inventory_ready',
        })
        const fd = buildFormData({
            name: 'IKEA KALLAX',
            category: 'FURNITURE',
            condition: 'good',
            estimatedValue: '35.00',
            analysisId: '22222222-3333-4444-8555-666666666666',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(capturedInsertValues?.aiConfidence).toBe('inventory_ready')
        expect(capturedInsertValues?.aiSuggested).toBe(true)
    })

    test('missing analysisId → row stored as non-AI (no false inventory_ready)', async () => {
        const fd = buildFormData({
            name: 'Manual entry',
            category: 'OTHER',
            condition: 'good',
            estimatedValue: '100.00',
            aiReviewStatus: 'inventory_ready',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(capturedInsertValues?.aiConfidence).toBeNull()
        expect(capturedInsertValues?.aiSuggested).toBe(false)
    })

    test('stale / expired analysisId → treated as non-AI', async () => {
        cachedAnalysis = null
        const fd = buildFormData({
            name: 'Expired cache test',
            category: 'ART',
            condition: 'good',
            estimatedValue: '100.00',
            analysisId: '33333333-4444-4555-8666-777777777777',
            aiReviewStatus: 'inventory_ready',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(capturedInsertValues?.aiConfidence).toBeNull()
    })

    test('cached analysis failing schema validation → treated as non-AI', async () => {
        cachedAnalysis = { some: 'garbage' }
        mockSchemaParse.mockImplementationOnce(() => ({
            success: false,
            data: null,
        }))
        const fd = buildFormData({
            name: 'Malformed cache',
            category: 'OTHER',
            condition: 'good',
            estimatedValue: '100.00',
            analysisId: '44444444-5555-4666-8777-888888888888',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(capturedInsertValues?.aiConfidence).toBeNull()
    })
})
