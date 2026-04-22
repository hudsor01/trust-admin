/** Tests for inventory-analysis.ts — compression, tool-use agentic loop, validation, feedback context. */

import { beforeEach, describe, expect, mock, test } from 'bun:test'
import sharp from 'sharp'

// ---------------------------------------------------------------------------
// SDK mock — intercepts `new Anthropic()` and `client.messages.create()`.
// The agentic loop, tool-use extraction, and schema validation run for real.
// ---------------------------------------------------------------------------

const mockMessagesCreate = mock(() =>
    Promise.resolve(makeRecordValuationResponse()),
)

mock.module('@anthropic-ai/sdk', () => ({
    default: class MockAnthropic {
        messages = { create: mockMessagesCreate }
    },
}))

process.env.ANTHROPIC_API_KEY = 'test-key-for-analysis'
mock.module('../../src/lib/env', () => ({
    env: {
        ...process.env,
        ANTHROPIC_API_KEY: 'test-key-for-analysis',
    },
}))

const {
    analyzeWithMarketResearch,
    applyReviewStatusOverrides,
    buildFeedbackContext,
    compressImage,
    validateAnalysis,
} = await import('../../src/lib/inventory-analysis')

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TARGET_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

/** A valid record_valuation tool input. */
function validValuationInput(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Henredon Aston Court Mahogany Dining Table',
        category: 'furniture',
        brand: 'Henredon',
        model: 'Aston Court',
        materials: ['mahogany', 'brass hardware'],
        era: '1990s',
        estimatedValue: '2500.00',
        valueRangeLow: '1800.00',
        valueRangeHigh: '3200.00',
        condition: 'good',
        conditionNotes: 'Minor surface scratches, structurally sound',
        description:
            'Traditional mahogany dining table with two leaves. Seats 8-10.',
        valuationRationale:
            'LiveAuctioneers realized $2,200 on 2025-11-15 (https://example.com/a). 1stDibs listed comparable at $3,500 (asking, discounted to $2,100 FMV, https://example.com/b). Date-of-death-weighted midpoint: $2,500.',
        reviewStatus: 'inventory_ready',
        reviewNotes:
            'Two LiveAuctioneers + 1stDibs comps within 60 days of DOD support $2,500. File as-is.',
        ...overrides,
    }
}

/** Anthropic-style response: model calls record_valuation and stops. */
function makeRecordValuationResponse(
    input = validValuationInput(),
    extraBlocks: unknown[] = [],
) {
    return {
        id: 'msg_test',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [
            ...extraBlocks,
            {
                type: 'tool_use' as const,
                id: 'toolu_record_1',
                name: 'record_valuation',
                input,
            },
        ],
        model: 'claude-opus-4-7',
        stop_reason: 'tool_use' as const,
        usage: { input_tokens: 100, output_tokens: 200 },
    }
}

/** Server-side tool loop hit the iteration limit — client must resume. */
function makePauseTurnResponse() {
    return {
        id: 'msg_pause',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [
            {
                type: 'server_tool_use' as const,
                id: 'srvtoolu_1',
                name: 'web_search',
                input: { query: 'Henredon Aston Court dining table sold' },
            },
        ],
        model: 'claude-opus-4-7',
        stop_reason: 'pause_turn' as const,
        usage: { input_tokens: 100, output_tokens: 150 },
    }
}

/** Output hit max_tokens cap mid-response. */
function makeMaxTokensResponse(partialText = 'Partial research notes...') {
    return {
        id: 'msg_partial',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: partialText }],
        model: 'claude-opus-4-7',
        stop_reason: 'max_tokens' as const,
        usage: { input_tokens: 100, output_tokens: 64000 },
    }
}

/** Model ended the turn without calling record_valuation — a failure we must catch. */
function makeEndTurnWithoutRecordResponse() {
    return {
        id: 'msg_unrecorded',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [
            {
                type: 'text' as const,
                text: "I'm not confident enough to produce a valuation.",
            },
        ],
        model: 'claude-opus-4-7',
        stop_reason: 'end_turn' as const,
        usage: { input_tokens: 100, output_tokens: 50 },
    }
}

async function createTestImage(): Promise<{
    base64: string
    mimeType: string
}> {
    const buffer = await sharp({
        create: {
            width: 100,
            height: 100,
            channels: 3,
            background: { r: 100, g: 150, b: 200 },
        },
    })
        .jpeg({ quality: 50 })
        .toBuffer()
    return { base64: buffer.toString('base64'), mimeType: 'image/jpeg' }
}

async function createLargeTestImage(): Promise<{
    base64: string
    mimeType: string
    actualSize: number
}> {
    const buffer = await sharp({
        create: {
            width: 3000,
            height: 3000,
            channels: 3,
            background: { r: 100, g: 150, b: 200 },
            noise: { type: 'gaussian', mean: 128, sigma: 80 },
        },
    })
        .png({ compressionLevel: 0 })
        .toBuffer()
    return {
        base64: buffer.toString('base64'),
        mimeType: 'image/png',
        actualSize: buffer.length,
    }
}

async function createSmallTestImage(): Promise<{
    base64: string
    mimeType: string
    actualSize: number
}> {
    const buffer = await sharp({
        create: {
            width: 800,
            height: 600,
            channels: 3,
            background: { r: 200, g: 200, b: 200 },
        },
    })
        .jpeg({ quality: 80 })
        .toBuffer()
    return {
        base64: buffer.toString('base64'),
        mimeType: 'image/jpeg',
        actualSize: buffer.length,
    }
}

// ---------------------------------------------------------------------------
// compressImage
// ---------------------------------------------------------------------------

describe('compressImage', () => {
    describe('Small images (under target size)', () => {
        test('passes through small JPEG unchanged', async () => {
            const { base64, mimeType, actualSize } =
                await createSmallTestImage()
            expect(actualSize).toBeLessThan(TARGET_IMAGE_SIZE_BYTES)
            const result = await compressImage(base64, mimeType)
            expect(result.base64).toBe(base64)
            expect(result.mimeType).toBe(mimeType)
        })

        test('passes through small PNG unchanged', async () => {
            const buffer = await sharp({
                create: {
                    width: 400,
                    height: 300,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 },
                },
            })
                .png()
                .toBuffer()
            const base64 = buffer.toString('base64')
            expect(buffer.length).toBeLessThan(TARGET_IMAGE_SIZE_BYTES)
            const result = await compressImage(base64, 'image/png')
            expect(result.base64).toBe(base64)
            expect(result.mimeType).toBe('image/png')
        })

        test('handles 1x1 pixel image', async () => {
            const buffer = await sharp({
                create: {
                    width: 1,
                    height: 1,
                    channels: 3,
                    background: { r: 0, g: 0, b: 0 },
                },
            })
                .jpeg()
                .toBuffer()
            const base64 = buffer.toString('base64')
            const result = await compressImage(base64, 'image/jpeg')
            expect(result.base64).toBe(base64)
        })
    })

    describe('Large images (over target size)', () => {
        test('compresses large PNG to under target size', async () => {
            const { base64, mimeType, actualSize } =
                await createLargeTestImage()
            expect(actualSize).toBeGreaterThan(TARGET_IMAGE_SIZE_BYTES)
            const result = await compressImage(base64, mimeType)
            const resultBuffer = Buffer.from(result.base64, 'base64')
            expect(resultBuffer.length).toBeLessThanOrEqual(
                TARGET_IMAGE_SIZE_BYTES,
            )
            expect(result.mimeType).toBe('image/jpeg')
            expect(resultBuffer.length).toBeLessThan(actualSize)
        })

        test('maintains reasonable quality after compression', async () => {
            const { base64, mimeType } = await createLargeTestImage()
            const result = await compressImage(base64, mimeType)
            const resultBuffer = Buffer.from(result.base64, 'base64')
            const metadata = await sharp(resultBuffer).metadata()
            expect(metadata.format).toBe('jpeg')
            expect(metadata.width).toBeGreaterThan(0)
            expect(metadata.height).toBeGreaterThan(0)
            expect(metadata.width).toBeGreaterThanOrEqual(500)
            expect(metadata.height).toBeGreaterThanOrEqual(400)
        })
    })

    describe('Output format', () => {
        test('converts PNG to JPEG when compression needed', async () => {
            const { base64, actualSize } = await createLargeTestImage()
            if (actualSize > TARGET_IMAGE_SIZE_BYTES) {
                const result = await compressImage(base64, 'image/png')
                expect(result.mimeType).toBe('image/jpeg')
                const resultBuffer = Buffer.from(result.base64, 'base64')
                expect(resultBuffer[0]).toBe(0xff)
                expect(resultBuffer[1]).toBe(0xd8)
            }
        })

        test('preserves JPEG mime for small pass-through', async () => {
            const { base64 } = await createSmallTestImage()
            const result = await compressImage(base64, 'image/jpeg')
            expect(result.mimeType).toBe('image/jpeg')
        })

        test('preserves PNG mime for small pass-through', async () => {
            const buffer = await sharp({
                create: {
                    width: 200,
                    height: 200,
                    channels: 3,
                    background: { r: 100, g: 100, b: 100 },
                },
            })
                .png()
                .toBuffer()
            const result = await compressImage(
                buffer.toString('base64'),
                'image/png',
            )
            expect(result.mimeType).toBe('image/png')
        })
    })

    describe('Dimension handling', () => {
        test('respects 2576px max-dimension cap for large inputs', async () => {
            const buffer = await sharp({
                create: {
                    width: 6000,
                    height: 1000,
                    channels: 3,
                    background: { r: 50, g: 100, b: 150 },
                    noise: { type: 'gaussian', mean: 128, sigma: 40 },
                },
            })
                .png({ compressionLevel: 0 })
                .toBuffer()
            if (buffer.length > TARGET_IMAGE_SIZE_BYTES) {
                const result = await compressImage(
                    buffer.toString('base64'),
                    'image/png',
                )
                const resultBuffer = Buffer.from(result.base64, 'base64')
                const metadata = await sharp(resultBuffer).metadata()
                expect(metadata.width).toBeLessThanOrEqual(2576)
            }
        })

        test('maintains aspect ratio during resize', async () => {
            const buffer = await sharp({
                create: {
                    width: 4000,
                    height: 2000,
                    channels: 3,
                    background: { r: 80, g: 120, b: 160 },
                    noise: { type: 'gaussian', mean: 128, sigma: 50 },
                },
            })
                .png({ compressionLevel: 0 })
                .toBuffer()
            if (buffer.length > TARGET_IMAGE_SIZE_BYTES) {
                const result = await compressImage(
                    buffer.toString('base64'),
                    'image/png',
                )
                const resultBuffer = Buffer.from(result.base64, 'base64')
                const metadata = await sharp(resultBuffer).metadata()
                const newRatio = (metadata.width ?? 1) / (metadata.height ?? 1)
                expect(newRatio).toBeCloseTo(4000 / 2000, 1)
            }
        })
    })

    describe('Edge cases', () => {
        test('handles image exactly at target size', async () => {
            const { base64, mimeType, actualSize } =
                await createSmallTestImage()
            expect(actualSize).toBeLessThan(TARGET_IMAGE_SIZE_BYTES)
            const result = await compressImage(base64, mimeType)
            expect(result.base64).toBe(base64)
        })

        test('handles WebP input', async () => {
            const buffer = await sharp({
                create: {
                    width: 500,
                    height: 500,
                    channels: 3,
                    background: { r: 150, g: 150, b: 150 },
                },
            })
                .webp()
                .toBuffer()
            const result = await compressImage(
                buffer.toString('base64'),
                'image/webp',
            )
            expect(result.mimeType).toBe('image/webp')
        })

        test('handles RGBA images (with alpha channel)', async () => {
            const buffer = await sharp({
                create: {
                    width: 400,
                    height: 400,
                    channels: 4,
                    background: { r: 100, g: 100, b: 100, alpha: 0.5 },
                },
            })
                .png()
                .toBuffer()
            const result = await compressImage(
                buffer.toString('base64'),
                'image/png',
            )
            expect(result.base64).toBeDefined()
            expect(result.mimeType).toBeDefined()
        })
    })

    describe('Integration scenarios', () => {
        test('iPhone-style photo fits under final size cap', async () => {
            const buffer = await sharp({
                create: {
                    width: 4032,
                    height: 3024,
                    channels: 3,
                    background: { r: 100, g: 120, b: 140 },
                    noise: { type: 'gaussian', mean: 128, sigma: 30 },
                },
            })
                .jpeg({ quality: 95 })
                .toBuffer()
            const result = await compressImage(
                buffer.toString('base64'),
                'image/jpeg',
            )
            const resultBuffer = Buffer.from(result.base64, 'base64')
            expect(resultBuffer.length).toBeLessThanOrEqual(
                MAX_IMAGE_SIZE_BYTES,
            )
            const metadata = await sharp(resultBuffer).metadata()
            expect(metadata.format).toBe('jpeg')
        })

        test('DSLR-style photo fits under final size cap', async () => {
            const buffer = await sharp({
                create: {
                    width: 5000,
                    height: 3500,
                    channels: 3,
                    background: { r: 80, g: 100, b: 120 },
                    noise: { type: 'gaussian', mean: 128, sigma: 40 },
                },
            })
                .jpeg({ quality: 98 })
                .toBuffer()
            const result = await compressImage(
                buffer.toString('base64'),
                'image/jpeg',
            )
            const resultBuffer = Buffer.from(result.base64, 'base64')
            expect(resultBuffer.length).toBeLessThanOrEqual(
                MAX_IMAGE_SIZE_BYTES,
            )
        })
    })
})

// ---------------------------------------------------------------------------
// analyzeWithMarketResearch (tool-use agentic loop)
// ---------------------------------------------------------------------------

describe('analyzeWithMarketResearch', () => {
    beforeEach(() => {
        mockMessagesCreate.mockClear()
        mockMessagesCreate.mockResolvedValue(makeRecordValuationResponse())
    })

    test('single image produces valid analysis with mapped dbCategory', async () => {
        const image = await createTestImage()
        const result = await analyzeWithMarketResearch([image])

        expect(result.analysis.name).toBe(
            'Henredon Aston Court Mahogany Dining Table',
        )
        expect(result.analysis.estimatedValue).toBe('2500.00')
        expect(result.analysis.rawCategory).toBe('furniture')
        expect(result.analysis.dbCategory).toBe('FURNITURE')
        expect(result.analysis.condition).toBe('good')
        expect(result.analysis.reviewStatus).toBe('inventory_ready')
        expect(result.compressedImages).toHaveLength(1)
    })

    test('multiple images are sent as image blocks in the first message', async () => {
        const images = await Promise.all([
            createTestImage(),
            createTestImage(),
            createTestImage(),
        ])
        await analyzeWithMarketResearch(images)

        const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as {
            messages: { content: unknown[] }[]
        }
        const userContent = callArgs.messages[0]?.content as unknown[]
        expect(userContent).toHaveLength(4) // 3 images + 1 text
        const imageBlocks = userContent.filter(
            (b: unknown) => (b as { type: string }).type === 'image',
        )
        expect(imageBlocks).toHaveLength(3)
    })

    test('single image uses singular user prompt', async () => {
        const image = await createTestImage()
        await analyzeWithMarketResearch([image])
        const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as {
            messages: { content: unknown[] }[]
        }
        const textBlock = (
            callArgs.messages[0]?.content as {
                type: string
                text?: string
            }[]
        ).find((b) => b.type === 'text')
        expect(textBlock?.text).toContain('Analyze this personal property item')
    })

    test('multiple images use plural user prompt', async () => {
        const images = await Promise.all([createTestImage(), createTestImage()])
        await analyzeWithMarketResearch(images)
        const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as {
            messages: { content: unknown[] }[]
        }
        const textBlock = (
            callArgs.messages[0]?.content as {
                type: string
                text?: string
            }[]
        ).find((b) => b.type === 'text')
        expect(textBlock?.text).toContain('Analyze these 2 images')
    })

    test('empty images array throws', async () => {
        await expect(analyzeWithMarketResearch([])).rejects.toThrow(
            'At least one image is required',
        )
        expect(mockMessagesCreate).not.toHaveBeenCalled()
    })

    test('request uses Opus 4.7 with xhigh effort + adaptive thinking + 64k max_tokens', async () => {
        const image = await createTestImage()
        await analyzeWithMarketResearch([image])
        const params = mockMessagesCreate.mock.calls[0]?.[0] as {
            model: string
            max_tokens: number
            thinking: { type: string }
            output_config: { effort: string }
        }
        expect(params.model).toBe('claude-opus-4-7')
        expect(params.max_tokens).toBe(64000)
        expect(params.thinking).toEqual({ type: 'adaptive' })
        expect(params.output_config).toEqual({ effort: 'xhigh' })
    })

    test('tools array includes web_search_20260209, code_execution, record_valuation', async () => {
        const image = await createTestImage()
        await analyzeWithMarketResearch([image])
        const params = mockMessagesCreate.mock.calls[0]?.[0] as {
            tools: Array<{ type?: string; name: string }>
        }
        const webSearch = params.tools.find((t) => t.name === 'web_search')
        const codeExec = params.tools.find((t) => t.name === 'code_execution')
        const record = params.tools.find((t) => t.name === 'record_valuation')
        expect(webSearch?.type).toBe('web_search_20260209')
        expect(codeExec?.type).toBe('code_execution_20260120')
        expect(record).toBeDefined()
    })

    test('returns compressed images alongside analysis', async () => {
        const image = await createTestImage()
        const result = await analyzeWithMarketResearch([image])
        expect(result.compressedImages).toHaveLength(1)
        expect(result.compressedImages[0]?.mimeType).toBe('image/jpeg')
        expect(result.compressedImages[0]?.base64).toBeTruthy()
    })

    test('maps jewelry category to JEWELRY dbCategory', async () => {
        mockMessagesCreate.mockResolvedValue(
            makeRecordValuationResponse(
                validValuationInput({ category: 'jewelry' }),
            ),
        )
        const image = await createTestImage()
        const result = await analyzeWithMarketResearch([image])
        expect(result.analysis.rawCategory).toBe('jewelry')
        expect(result.analysis.dbCategory).toBe('JEWELRY')
    })

    test('maps artwork category to ART dbCategory', async () => {
        mockMessagesCreate.mockResolvedValue(
            makeRecordValuationResponse(
                validValuationInput({ category: 'artwork' }),
            ),
        )
        const image = await createTestImage()
        const result = await analyzeWithMarketResearch([image])
        expect(result.analysis.dbCategory).toBe('ART')
    })

    test('throws on end_turn without record_valuation call', async () => {
        mockMessagesCreate.mockResolvedValue(makeEndTurnWithoutRecordResponse())
        const image = await createTestImage()
        await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
            /model ended turn without calling record_valuation/i,
        )
    })

    test('throws on tool_use with invalid schema (Zod catches strict-mode violation)', async () => {
        mockMessagesCreate.mockResolvedValue(
            makeRecordValuationResponse(
                validValuationInput({
                    category: 'not_a_real_category',
                }),
            ),
        )
        const image = await createTestImage()
        await expect(analyzeWithMarketResearch([image])).rejects.toThrow()
    })
})

// ---------------------------------------------------------------------------
// Agentic loop — multi-turn behavior (pause_turn, max_tokens, MAX_TURNS)
// ---------------------------------------------------------------------------

describe('agentic loop', () => {
    beforeEach(() => {
        mockMessagesCreate.mockClear()
    })

    test('pause_turn turn continues with another API call (server-side web_search loop resume)', async () => {
        mockMessagesCreate
            .mockResolvedValueOnce(makePauseTurnResponse())
            .mockResolvedValueOnce(makeRecordValuationResponse())
        const image = await createTestImage()
        const result = await analyzeWithMarketResearch([image])
        expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
        expect(result.analysis.name).toBe(
            'Henredon Aston Court Mahogany Dining Table',
        )
    })

    test('max_tokens turn sends continuation prompt', async () => {
        mockMessagesCreate
            .mockResolvedValueOnce(makeMaxTokensResponse())
            .mockResolvedValueOnce(makeRecordValuationResponse())
        const image = await createTestImage()
        await analyzeWithMarketResearch([image])

        expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
        const secondCallArgs = mockMessagesCreate.mock.calls[1]?.[0] as {
            messages: { role: string; content: string | unknown[] }[]
        }
        const lastMessage =
            secondCallArgs.messages[secondCallArgs.messages.length - 1]
        expect(lastMessage?.role).toBe('user')
        expect(lastMessage?.content).toContain('Continue your analysis')
    })

    test('multiple pause_turn rounds before final record_valuation', async () => {
        mockMessagesCreate
            .mockResolvedValueOnce(makePauseTurnResponse())
            .mockResolvedValueOnce(makePauseTurnResponse())
            .mockResolvedValueOnce(makePauseTurnResponse())
            .mockResolvedValueOnce(makeRecordValuationResponse())
        const image = await createTestImage()
        const result = await analyzeWithMarketResearch([image])
        expect(mockMessagesCreate).toHaveBeenCalledTimes(4)
        expect(result.analysis.estimatedValue).toBe('2500.00')
    })

    test('truncated record_valuation on max_tokens triggers continuation, not Zod error', async () => {
        // Simulates Claude starting the tool call but hitting the token cap
        // mid-JSON. The block has name=record_valuation but incomplete input.
        // The loop must check stop_reason: max_tokens BEFORE parsing, else
        // Zod throws a confusing error instead of nudging.
        mockMessagesCreate
            .mockResolvedValueOnce({
                id: 'msg_truncated',
                type: 'message' as const,
                role: 'assistant' as const,
                content: [
                    {
                        type: 'tool_use' as const,
                        id: 'toolu_partial',
                        name: 'record_valuation',
                        input: { name: 'Incomplete' }, // missing 15 required fields
                    },
                ],
                model: 'claude-opus-4-7',
                stop_reason: 'max_tokens' as const,
                usage: { input_tokens: 100, output_tokens: 64000 },
            })
            .mockResolvedValueOnce(makeRecordValuationResponse())

        const image = await createTestImage()
        const result = await analyzeWithMarketResearch([image])

        expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
        // Final result comes from the SECOND (complete) response.
        expect(result.analysis.name).toBe(
            'Henredon Aston Court Mahogany Dining Table',
        )
    })

    test('stop_reason:refusal throws immediately (no retry loop)', async () => {
        mockMessagesCreate.mockResolvedValueOnce({
            id: 'msg_refused',
            type: 'message' as const,
            role: 'assistant' as const,
            content: [
                { type: 'text' as const, text: "I can't help with that." },
            ],
            model: 'claude-opus-4-7',
            stop_reason: 'refusal' as const,
            usage: { input_tokens: 100, output_tokens: 20 },
        })

        const image = await createTestImage()
        await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
            /model refused/i,
        )
        // Refusal is terminal — no resume attempt.
        expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
    })

    test('hits MAX_TURNS and throws rather than returning a partial result', async () => {
        // 16 pause_turn responses (initial + 15 loop iterations) — never records.
        for (let i = 0; i < 16; i++) {
            mockMessagesCreate.mockResolvedValueOnce(makePauseTurnResponse())
        }
        const image = await createTestImage()
        await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
            /hit MAX_TURNS/i,
        )
    })
})

// ---------------------------------------------------------------------------
// Error propagation
// ---------------------------------------------------------------------------

describe('error handling', () => {
    beforeEach(() => {
        mockMessagesCreate.mockClear()
    })

    test('API error propagates through agentic loop', async () => {
        mockMessagesCreate.mockRejectedValue(new Error('rate limit exceeded'))
        const image = await createTestImage()
        await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
            'rate limit exceeded',
        )
    })

    test('API error on second turn propagates', async () => {
        mockMessagesCreate
            .mockResolvedValueOnce(makePauseTurnResponse())
            .mockRejectedValueOnce(new Error('503 service unavailable'))
        const image = await createTestImage()
        await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
            '503 service unavailable',
        )
    })

    test('authentication failure from API propagates', async () => {
        mockMessagesCreate.mockRejectedValue(
            new Error('401 authentication failed'),
        )
        const image = await createTestImage()
        await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
            '401 authentication failed',
        )
    })
})

// ---------------------------------------------------------------------------
// validateAnalysis
// ---------------------------------------------------------------------------

describe('validateAnalysis', () => {
    test('passes for valid analysis', () => {
        const result = validateAnalysis(validValuationInput())
        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(0)
    })

    test('warns when estimatedValue is outside the range', () => {
        const result = validateAnalysis(
            validValuationInput({
                estimatedValue: '5000.00',
                valueRangeLow: '1800.00',
                valueRangeHigh: '3200.00',
            }),
        )
        expect(result.warnings).toContain('estimatedValue outside range')
    })

    test('warns on lazy default for artwork under $200', () => {
        const result = validateAnalysis(
            validValuationInput({
                category: 'artwork',
                estimatedValue: '100.00',
                valueRangeLow: '50.00',
                valueRangeHigh: '150.00',
            }),
        )
        expect(result.warnings).toContain('suspiciously low for category')
    })

    test('warns when rationale lacks dollar amounts', () => {
        const result = validateAnalysis(
            validValuationInput({
                valuationRationale:
                    'Based on general market knowledge of similar items.',
            }),
        )
        expect(result.warnings).toContain('rationale lacks specific prices')
    })

    test('does not warn for low-value mass-produced items', () => {
        const result = validateAnalysis(
            validValuationInput({
                category: 'electronics',
                estimatedValue: '50.00',
                valueRangeLow: '30.00',
                valueRangeHigh: '75.00',
                valuationRationale:
                    'Ebay sold: $45 on 2025-10. $55 on 2025-11.',
            }),
        )
        const lazyWarning = result.warnings.find((w) =>
            w.includes('suspiciously low'),
        )
        expect(lazyWarning).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// applyReviewStatusOverrides (server-side deterministic guardrails)
// ---------------------------------------------------------------------------

describe('applyReviewStatusOverrides', () => {
    function analysis(overrides: Record<string, unknown> = {}) {
        return {
            ...validValuationInput(overrides),
            rawCategory: 'furniture',
            dbCategory: 'FURNITURE' as const,
        }
    }

    test('passes through a clean inventory_ready result unchanged', () => {
        const input = analysis()
        const { analysis: out, overrideReasons } =
            applyReviewStatusOverrides(input)
        expect(out.reviewStatus).toBe('inventory_ready')
        expect(overrideReasons).toHaveLength(0)
    })

    test('escalates to needs_professional_appraisal when estimatedValue > $5,000', () => {
        const { analysis: out, overrideReasons } = applyReviewStatusOverrides(
            analysis({
                estimatedValue: '22000.00',
                valueRangeLow: '18000.00',
                valueRangeHigh: '30000.00',
            }),
        )
        expect(out.reviewStatus).toBe('needs_professional_appraisal')
        expect(overrideReasons[0]).toMatch(/exceeds \$5,000/)
    })

    test('>$5k override wins even if model said inventory_ready', () => {
        const { analysis: out } = applyReviewStatusOverrides(
            analysis({
                estimatedValue: '7500.00',
                valueRangeLow: '6000.00',
                valueRangeHigh: '9000.00',
                reviewStatus: 'inventory_ready',
            }),
        )
        expect(out.reviewStatus).toBe('needs_professional_appraisal')
    })

    test('downgrades to needs_admin_review when estimatedValue is outside the range', () => {
        const { analysis: out, overrideReasons } = applyReviewStatusOverrides(
            analysis({
                estimatedValue: '100.00',
                valueRangeLow: '500.00',
                valueRangeHigh: '800.00',
            }),
        )
        expect(out.reviewStatus).toBe('needs_admin_review')
        expect(overrideReasons.some((r) => /outside/.test(r))).toBe(true)
    })

    test('downgrades to needs_admin_review when rationale has fewer than 2 URLs', () => {
        const { analysis: out, overrideReasons } = applyReviewStatusOverrides(
            analysis({
                valuationRationale:
                    'LiveAuctioneers realized $2,200 on 2025-11-15 (https://example.com/a). Second source referenced but not linked.',
            }),
        )
        expect(out.reviewStatus).toBe('needs_admin_review')
        expect(overrideReasons.some((r) => /URL/.test(r))).toBe(true)
    })

    test('never de-escalates: professional appraisal is terminal', () => {
        const { analysis: out } = applyReviewStatusOverrides(
            analysis({
                reviewStatus: 'needs_professional_appraisal',
                estimatedValue: '100.00',
                valueRangeLow: '50.00',
                valueRangeHigh: '150.00',
            }),
        )
        expect(out.reviewStatus).toBe('needs_professional_appraisal')
    })
})

// ---------------------------------------------------------------------------
// buildFeedbackContext
// ---------------------------------------------------------------------------

describe('buildFeedbackContext', () => {
    test('returns empty string when no corrections', () => {
        expect(buildFeedbackContext([])).toBe('')
    })

    test('builds a context paragraph when corrections are present', () => {
        const ctx = buildFeedbackContext([
            {
                itemName: 'Vintage Lamp',
                category: 'decor',
                aiEstimatedValue: '250.00',
                correctedValue: '85.00',
            },
            {
                itemName: 'Oak Desk',
                category: 'furniture',
                aiEstimatedValue: '150.00',
                correctedValue: '3200.00',
            },
        ])
        expect(ctx).toContain('PREVIOUS CORRECTION FEEDBACK')
        expect(ctx).toContain('"Vintage Lamp"')
        expect(ctx).toContain('$250.00')
        expect(ctx).toContain('$85.00')
        expect(ctx).toContain('"Oak Desk"')
    })
})
