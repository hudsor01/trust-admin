/** Tests for inventory-analysis-enhanced.ts — agentic loop, JSON extraction, schema validation, error handling. */

import { beforeEach, describe, expect, mock, test } from 'bun:test'
import sharp from 'sharp'

// ---------------------------------------------------------------------------
// SDK mock — intercepts `new Anthropic()` and `client.messages.create()`
// so the agentic loop, extractJson, and schema validation all run for real.
// ---------------------------------------------------------------------------

const mockMessagesCreate = mock(() => Promise.resolve(makeEndTurnResponse()))

mock.module('@anthropic-ai/sdk', () => ({
    default: class MockAnthropic {
        messages = { create: mockMessagesCreate }
    },
}))

// Ensure ANTHROPIC_API_KEY is set before module loads
process.env.ANTHROPIC_API_KEY = 'test-key-for-enhanced'

const { analyzeWithMarketResearch, valueItemByDescription } = await import(
    '../../src/lib/inventory-analysis-enhanced'
)

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A valid JSON response the model would emit after researching an item. */
function validAnalysisJson(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
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
            'eBay sold listing $2,200 on 2025-11-15. 1stDibs lists comparable at $3,500. Adjusted down for scratches.',
        confidence: 'high',
        confidenceNotes:
            'Brand clearly marked, multiple comparable sales found',
        ...overrides,
    })
}

/** Builds an Anthropic Message response with stop_reason='end_turn' and text content. */
function makeEndTurnResponse(
    text = validAnalysisJson(),
    extraBlocks: unknown[] = [],
) {
    return {
        id: 'msg_test',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [...extraBlocks, { type: 'text' as const, text }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn' as const,
        usage: { input_tokens: 100, output_tokens: 200 },
    }
}

/** Builds a response that indicates the model used a server-side tool. */
function makeToolUseResponse() {
    return {
        id: 'msg_tool',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [
            {
                type: 'server_tool_use' as const,
                id: 'srvtoolu_search_1',
                name: 'web_search',
                input: {
                    query: 'Henredon Aston Court dining table sold price',
                },
            },
            {
                type: 'server_tool_result' as const,
                tool_use_id: 'srvtoolu_search_1',
                content: [
                    {
                        type: 'web_search_result' as const,
                        url: 'https://www.ebay.com/itm/example',
                        title: 'Henredon Dining Table - Sold',
                        snippet: 'Sold for $2,200 on Nov 15, 2025',
                    },
                ],
            },
        ],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'tool_use' as const,
        usage: { input_tokens: 100, output_tokens: 150 },
    }
}

/** Builds a response that hit max_tokens mid-output. */
function makeMaxTokensResponse(partialText: string) {
    return {
        id: 'msg_partial',
        type: 'message' as const,
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: partialText }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'max_tokens' as const,
        usage: { input_tokens: 100, output_tokens: 16384 },
    }
}

/** Creates a tiny JPEG base64 string via sharp. */
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('inventory-analysis-enhanced', () => {
    beforeEach(() => {
        mockMessagesCreate.mockClear()
        // Default: single-turn end_turn with valid JSON
        mockMessagesCreate.mockResolvedValue(makeEndTurnResponse())
    })

    // -----------------------------------------------------------------------
    // analyzeWithMarketResearch — end-to-end through the real module
    // -----------------------------------------------------------------------

    describe('analyzeWithMarketResearch', () => {
        test('single image produces valid analysis with correct fields', async () => {
            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])

            expect(result.analysis.name).toBe(
                'Henredon Aston Court Mahogany Dining Table',
            )
            expect(result.analysis.estimatedValue).toBe('2500.00')
            expect(result.analysis.rawCategory).toBe('furniture')
            expect(result.analysis.dbCategory).toBe('FURNITURE')
            expect(result.analysis.condition).toBe('good')
            expect(result.analysis.confidence).toBe('high')
            expect(result.compressedImages).toHaveLength(1)
        })

        test('multiple images are all sent as image blocks in first message', async () => {
            const images = await Promise.all([
                createTestImage(),
                createTestImage(),
                createTestImage(),
            ])

            await analyzeWithMarketResearch(images)

            expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
            const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as {
                messages: { content: unknown[] }[]
            }
            const userContent = callArgs.messages[0]?.content as unknown[]
            // 3 image blocks + 1 text prompt
            expect(userContent).toHaveLength(4)
            const imageBlocks = userContent.filter(
                (b: unknown) => (b as { type: string }).type === 'image',
            )
            expect(imageBlocks).toHaveLength(3)
        })

        test('single image uses singular prompt', async () => {
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
            expect(textBlock?.text).toContain(
                'Analyze this personal property item',
            )
        })

        test('multiple images uses plural prompt', async () => {
            const images = await Promise.all([
                createTestImage(),
                createTestImage(),
            ])
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

        test('throws when response has no text blocks', async () => {
            mockMessagesCreate.mockResolvedValue({
                id: 'msg_empty',
                type: 'message',
                role: 'assistant',
                content: [],
                model: 'claude-sonnet-4-5-20250929',
                stop_reason: 'end_turn',
                usage: { input_tokens: 10, output_tokens: 0 },
            })

            const image = await createTestImage()
            await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
                'No text response from analysis model',
            )
        })

        test('configures web_search tool in API call', async () => {
            const image = await createTestImage()
            await analyzeWithMarketResearch([image])

            const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as {
                tools: { type: string; name: string }[]
            }
            expect(callArgs.tools).toEqual([
                {
                    type: 'web_search_20250305',
                    name: 'web_search',
                    max_uses: 10,
                },
            ])
        })

        test('returns compressed images alongside analysis', async () => {
            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])

            expect(result.compressedImages).toHaveLength(1)
            expect(result.compressedImages[0]?.mimeType).toBe('image/jpeg')
            expect(result.compressedImages[0]?.base64).toBeTruthy()
        })
    })

    // -----------------------------------------------------------------------
    // Agentic loop — multi-turn behavior
    // -----------------------------------------------------------------------

    describe('agentic loop', () => {
        test('tool_use turn continues with another API call', async () => {
            // Turn 1: model does a web search (tool_use)
            // Turn 2: model returns final JSON (end_turn)
            mockMessagesCreate
                .mockResolvedValueOnce(makeToolUseResponse())
                .mockResolvedValueOnce(makeEndTurnResponse())

            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])

            expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
            expect(result.analysis.name).toBe(
                'Henredon Aston Court Mahogany Dining Table',
            )
        })

        test('max_tokens turn sends continuation prompt', async () => {
            // Turn 1: model ran out of tokens
            // Turn 2: model finishes with complete JSON
            mockMessagesCreate
                .mockResolvedValueOnce(
                    makeMaxTokensResponse('Here is the partial analysis...'),
                )
                .mockResolvedValueOnce(makeEndTurnResponse())

            const image = await createTestImage()
            await analyzeWithMarketResearch([image])

            expect(mockMessagesCreate).toHaveBeenCalledTimes(2)

            // Check the second call includes the continuation message
            const secondCallArgs = mockMessagesCreate.mock.calls[1]?.[0] as {
                messages: { role: string; content: string | unknown[] }[]
            }
            const lastMessage =
                secondCallArgs.messages[secondCallArgs.messages.length - 1]
            expect(lastMessage?.role).toBe('user')
            expect(lastMessage?.content).toContain('Continue your response')
        })

        test('multiple tool_use turns before final response', async () => {
            // 3 search turns, then final answer
            mockMessagesCreate
                .mockResolvedValueOnce(makeToolUseResponse())
                .mockResolvedValueOnce(makeToolUseResponse())
                .mockResolvedValueOnce(makeToolUseResponse())
                .mockResolvedValueOnce(makeEndTurnResponse())

            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])

            expect(mockMessagesCreate).toHaveBeenCalledTimes(4)
            expect(result.analysis.estimatedValue).toBe('2500.00')
        })

        test('stops at MAX_TURNS and returns partial response', async () => {
            // Return tool_use 10 times, then a final response
            // (loop runs max 10 iterations after the initial call)
            for (let i = 0; i < 10; i++) {
                mockMessagesCreate.mockResolvedValueOnce(makeToolUseResponse())
            }
            // The 11th call is the last iteration — return end_turn so extractJson works
            mockMessagesCreate.mockResolvedValueOnce(makeEndTurnResponse())

            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])

            // 1 initial + 10 loop iterations = 11 calls
            expect(mockMessagesCreate).toHaveBeenCalledTimes(11)
            expect(result.analysis.name).toBeTruthy()
        })
    })

    // -----------------------------------------------------------------------
    // JSON extraction and validation
    // -----------------------------------------------------------------------

    describe('extractJson', () => {
        test('extracts JSON from text block with surrounding prose', async () => {
            const textWithJson = `Based on my research, here is the valuation:
${validAnalysisJson()}
This concludes the analysis.`

            mockMessagesCreate.mockResolvedValue(
                makeEndTurnResponse(textWithJson),
            )

            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])
            expect(result.analysis.name).toBe(
                'Henredon Aston Court Mahogany Dining Table',
            )
        })

        test('extracts JSON from last text block when multiple exist', async () => {
            // Response has search result text blocks before the final JSON
            mockMessagesCreate.mockResolvedValue({
                id: 'msg_multi',
                type: 'message',
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'I found several comparable sales on eBay and 1stDibs.',
                    },
                    {
                        type: 'text',
                        text: validAnalysisJson({ name: 'First Block Item' }),
                    },
                    {
                        type: 'text',
                        text: validAnalysisJson({
                            name: 'Final Analysis Item',
                        }),
                    },
                ],
                model: 'claude-sonnet-4-5-20250929',
                stop_reason: 'end_turn',
                usage: { input_tokens: 100, output_tokens: 500 },
            })

            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])
            // Should pick the LAST text block's JSON
            expect(result.analysis.name).toBe('Final Analysis Item')
        })

        test('throws on response with no JSON at all', async () => {
            mockMessagesCreate.mockResolvedValue(
                makeEndTurnResponse('I could not identify this item clearly.'),
            )

            const image = await createTestImage()
            await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
                'No structured valuation data in response',
            )
        })

        test('throws on malformed JSON', async () => {
            mockMessagesCreate.mockResolvedValue(
                makeEndTurnResponse('Here is the result: { invalid json... }'),
            )

            const image = await createTestImage()
            await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
                'Invalid JSON in response',
            )
        })

        test('throws on valid JSON that fails schema validation', async () => {
            // Valid JSON but missing required fields
            mockMessagesCreate.mockResolvedValue(
                makeEndTurnResponse(
                    JSON.stringify({
                        name: 'Something',
                        category: 'not_a_real_category',
                    }),
                ),
            )

            const image = await createTestImage()
            await expect(analyzeWithMarketResearch([image])).rejects.toThrow()
        })

        test('maps category to dbCategory correctly', async () => {
            mockMessagesCreate.mockResolvedValue(
                makeEndTurnResponse(validAnalysisJson({ category: 'jewelry' })),
            )

            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])
            expect(result.analysis.rawCategory).toBe('jewelry')
            expect(result.analysis.dbCategory).toBe('JEWELRY')
        })

        test('maps artwork category to ART dbCategory', async () => {
            mockMessagesCreate.mockResolvedValue(
                makeEndTurnResponse(validAnalysisJson({ category: 'artwork' })),
            )

            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])
            expect(result.analysis.dbCategory).toBe('ART')
        })

        test('ignores non-text blocks when extracting JSON', async () => {
            // Mix of server tool use/result blocks and text — only text should be searched
            mockMessagesCreate.mockResolvedValue({
                id: 'msg_mixed',
                type: 'message',
                role: 'assistant',
                content: [
                    {
                        type: 'server_tool_use',
                        id: 'srvtoolu_1',
                        name: 'web_search',
                        input: { query: 'test' },
                    },
                    { type: 'text', text: validAnalysisJson() },
                ],
                model: 'claude-sonnet-4-5-20250929',
                stop_reason: 'end_turn',
                usage: { input_tokens: 100, output_tokens: 200 },
            })

            const image = await createTestImage()
            const result = await analyzeWithMarketResearch([image])
            expect(result.analysis.name).toBeTruthy()
        })
    })

    // -----------------------------------------------------------------------
    // valueItemByDescription — text-only path
    // -----------------------------------------------------------------------

    describe('valueItemByDescription', () => {
        test('returns analysis for text description', async () => {
            const result = await valueItemByDescription(
                '2019 Toyota Camry SE, silver, 45k miles',
                {
                    brand: 'Toyota',
                    model: 'Camry',
                    year: '2019',
                    condition: 'good',
                },
            )

            expect(result.name).toBe(
                'Henredon Aston Court Mahogany Dining Table',
            )
            expect(result.dbCategory).toBe('FURNITURE')
            expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
        })

        test('assembles context parts into user message', async () => {
            await valueItemByDescription('Antique desk', {
                brand: 'Stickley',
                model: 'Mission Oak',
                year: '1910',
                condition: 'fair',
            })

            const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as {
                messages: { content: string }[]
            }
            const content = callArgs.messages[0]?.content
            expect(content).toContain('Item description: Antique desk')
            expect(content).toContain('Brand: Stickley')
            expect(content).toContain('Model: Mission Oak')
            expect(content).toContain('Year/Era: 1910')
            expect(content).toContain('Condition: fair')
        })

        test('omits undefined context fields', async () => {
            await valueItemByDescription('Old painting')

            const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as {
                messages: { content: string }[]
            }
            const content = callArgs.messages[0]?.content
            expect(content).toContain('Item description: Old painting')
            expect(content).not.toContain('Brand:')
            expect(content).not.toContain('Model:')
        })

        test('does not include image blocks', async () => {
            await valueItemByDescription('Silver tea set')

            const callArgs = mockMessagesCreate.mock.calls[0]?.[0] as {
                messages: { content: string | unknown[] }[]
            }
            // Text-only path sends a string, not an array of blocks
            expect(typeof callArgs.messages[0]?.content).toBe('string')
        })
    })

    // -----------------------------------------------------------------------
    // Error propagation
    // -----------------------------------------------------------------------

    describe('error handling', () => {
        test('API error propagates through agentic loop', async () => {
            mockMessagesCreate.mockRejectedValue(
                new Error('rate limit exceeded'),
            )

            const image = await createTestImage()
            await expect(analyzeWithMarketResearch([image])).rejects.toThrow(
                'rate limit exceeded',
            )
        })

        test('API error on second turn propagates', async () => {
            mockMessagesCreate
                .mockResolvedValueOnce(makeToolUseResponse())
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
})
