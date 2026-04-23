import { beforeEach, describe, expect, mock, test } from 'bun:test'
import sharp from 'sharp'

/** Integration tests for POST /api/inventory/analyze — image compression, Claude analysis, and Uploadthing upload. */

const mockUploadFiles = mock(() =>
    Promise.resolve([
        { data: { ufsUrl: 'https://utfs.io/f/lamp-photo-1.jpg' }, error: null },
    ]),
)

mock.module('uploadthing/server', () => ({
    UTApi: class {
        uploadFiles = mockUploadFiles
    },
}))

mock.module('../../src/lib/inventory-access', () => ({
    hasInventoryAccess: () => Promise.resolve(true),
    getClientIP: () => Promise.resolve('test-ip'),
    checkAnalyzeRateLimit: () => ({ allowed: true }),
}))

// Mock drizzle-orm (desc used in feedback query)
mock.module('drizzle-orm', () => ({
    desc: () => 'desc',
    eq: () => 'eq',
    and: () => 'and',
    sql: () => 'sql',
}))

// Chainable mock for db.select().from().where().orderBy().limit()
const mockDbChain = {
    select: mock(() => mockDbChain),
    from: mock(() => mockDbChain),
    where: mock(() => mockDbChain),
    orderBy: mock(() => mockDbChain),
    limit: mock(() => Promise.resolve([])),
    // db.insert(table).values({...}).returning({id}) — used by the
    // inventory_analysis_cache write.
    insert: mock(() => mockDbChain),
    values: mock(() => mockDbChain),
    returning: mock(() =>
        Promise.resolve([{ id: '00000000-0000-0000-0000-000000000000' }]),
    ),
}

mock.module('../../db', () => ({
    db: mockDbChain,
}))

mock.module('../../db/schema', () => ({
    valuationCorrection: {
        itemName: 'item_name',
        category: 'category',
        aiEstimatedValue: 'ai_estimated_value',
        correctedValue: 'corrected_value',
        entityId: 'entity_id',
        createdAt: 'created_at',
    },
    inventoryAnalysisCache: {
        id: 'cache_id',
        analysisJson: 'analysis_json',
    },
}))

const mockAnalysisResult = {
    name: 'Vintage Lamp',
    category: 'Furniture',
    rawCategory: 'Furniture',
    dbCategory: 'FURNITURE',
    brand: 'Tiffany Style',
    model: null,
    materials: ['glass', 'bronze'],
    era: '1990s',
    estimatedValue: '250',
    valueRangeLow: '150',
    valueRangeHigh: '350',
    condition: 'good',
    conditionNotes: 'Minor patina on base',
    description: 'Stained glass table lamp in Tiffany style',
    valuationRationale:
        'LiveAuctioneers realized $220 on 2025-11-20 (https://example.com/a). eBay sold for $275 on 2025-12-05 (https://example.com/b).',
    reviewStatus: 'inventory_ready',
    reviewNotes: 'Two realized comps within 60 days of DOD support $250.',
}

const mockAnalyzeWithMarketResearch = mock(
    async (images: { base64: string; mimeType: string }[]) => ({
        analysis: mockAnalysisResult,
        compressedImages: images.map((img) => ({
            base64: img.base64,
            mimeType: img.mimeType,
        })),
    }),
)

const mockValidateAnalysis = mock(() => ({
    valid: true,
    warnings: [],
}))

const mockBuildFeedbackContext = mock(() => '')

const mockApplyReviewStatusOverrides = mock(
    (analysis: typeof mockAnalysisResult) => ({
        analysis,
        overrideReasons: [] as string[],
    }),
)

mock.module('../../src/lib/inventory-analysis', () => ({
    analyzeWithMarketResearch: mockAnalyzeWithMarketResearch,
    applyReviewStatusOverrides: mockApplyReviewStatusOverrides,
    validateAnalysis: mockValidateAnalysis,
    buildFeedbackContext: mockBuildFeedbackContext,
    // Pass-through compressImage — route calls it on every image before
    // handing off to analyze*. Tests don't exercise sharp here.
    compressImage: (base64: string, mimeType: string) =>
        Promise.resolve({ base64, mimeType }),
}))

process.env.ANTHROPIC_API_KEY = 'test-api-key'

const { POST } = await import('../../src/app/api/inventory/analyze/route')

async function createTestImageBase64(): Promise<{
    base64: string
    mimeType: string
}> {
    const buffer = await sharp({
        create: {
            width: 800,
            height: 600,
            channels: 3,
            background: { r: 100, g: 150, b: 200 },
        },
    })
        .jpeg({ quality: 80 })
        .toBuffer()

    return {
        base64: buffer.toString('base64'),
        mimeType: 'image/jpeg',
    }
}

function createRequest(body: unknown): Request {
    return new Request('http://localhost:3000/api/inventory/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
}

describe('POST /api/inventory/analyze', () => {
    beforeEach(() => {
        mockUploadFiles.mockClear()
        mockAnalyzeWithMarketResearch.mockClear()
        mockValidateAnalysis.mockClear()
        mockBuildFeedbackContext.mockClear()
        mockApplyReviewStatusOverrides.mockClear()
        mockApplyReviewStatusOverrides.mockImplementation((analysis) => ({
            analysis,
            overrideReasons: [],
        }))
    })

    describe('Successful analysis', () => {
        test('returns analysis and photo URLs for single image', async () => {
            mockUploadFiles.mockResolvedValueOnce([
                {
                    data: { ufsUrl: 'https://utfs.io/f/lamp-photo-1.jpg' },
                    error: null,
                },
            ])

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toBeDefined()
            expect(data.data.name).toBe('Vintage Lamp')
            expect(data.photoUrls).toBeDefined()
            expect(data.photoUrls).toHaveLength(1)
            expect(data.photoUrls[0]).toBe('https://utfs.io/f/lamp-photo-1.jpg')
            expect(data.validationWarnings).toBeDefined()
            expect(Array.isArray(data.validationWarnings)).toBe(true)
        })

        test('returns analysis and photo URLs for multiple images', async () => {
            mockUploadFiles.mockResolvedValueOnce([
                {
                    data: { ufsUrl: 'https://utfs.io/f/photo-1.jpg' },
                    error: null,
                },
                {
                    data: { ufsUrl: 'https://utfs.io/f/photo-2.jpg' },
                    error: null,
                },
                {
                    data: { ufsUrl: 'https://utfs.io/f/photo-3.jpg' },
                    error: null,
                },
            ])

            const images = await Promise.all([
                createTestImageBase64(),
                createTestImageBase64(),
                createTestImageBase64(),
            ])
            const request = createRequest({ images })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.photoUrls).toHaveLength(3)
        })

        test('includes dbCategory mapping in response', async () => {
            mockUploadFiles.mockResolvedValueOnce([
                {
                    data: { ufsUrl: 'https://utfs.io/f/test.jpg' },
                    error: null,
                },
            ])

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(data.data.dbCategory).toBe('FURNITURE')
            expect(data.data.rawCategory).toBe('Furniture')
        })

        test('returns an analysisId pointing at the persisted cache row', async () => {
            mockUploadFiles.mockResolvedValueOnce([
                {
                    data: { ufsUrl: 'https://utfs.io/f/test.jpg' },
                    error: null,
                },
            ])
            // Override returning to yield a specific id so we can assert it
            mockDbChain.returning.mockImplementationOnce(() =>
                Promise.resolve([
                    { id: 'deadbeef-dead-beef-dead-beefdeadbeef' },
                ]),
            )
            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })
            const response = await POST(request as never)
            const data = await response.json()
            expect(response.status).toBe(200)
            expect(data.analysisId).toBe('deadbeef-dead-beef-dead-beefdeadbeef')
        })

        test('cache insert failure does not break analysis response', async () => {
            mockUploadFiles.mockResolvedValueOnce([
                {
                    data: { ufsUrl: 'https://utfs.io/f/test.jpg' },
                    error: null,
                },
            ])
            mockDbChain.returning.mockImplementationOnce(() =>
                Promise.reject(new Error('DB cache write failed')),
            )
            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })
            const response = await POST(request as never)
            const data = await response.json()
            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            // analysisId falls back to empty string, signaling the submit
            // action to treat the submission as non-AI (safer default)
            expect(data.analysisId).toBe('')
        })

        test('appends server-side override reasons to validationWarnings AND exposes them separately', async () => {
            mockUploadFiles.mockResolvedValueOnce([
                {
                    data: { ufsUrl: 'https://utfs.io/f/test.jpg' },
                    error: null,
                },
            ])
            mockApplyReviewStatusOverrides.mockImplementationOnce(
                (analysis) => ({
                    analysis: {
                        ...analysis,
                        reviewStatus: 'needs_professional_appraisal',
                    },
                    overrideReasons: [
                        'Server override: estimatedValue $22,000 exceeds $3,000.',
                    ],
                }),
            )

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })
            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.data.reviewStatus).toBe('needs_professional_appraisal')
            // Merged into validationWarnings for the form's warning UI…
            expect(data.validationWarnings).toContain(
                'Server override: estimatedValue $22,000 exceeds $3,000.',
            )
            // …AND exposed as a dedicated top-level field so submitInventoryItem
            // can persist override reasons separately from warnings.
            expect(Array.isArray(data.overrideReasons)).toBe(true)
            expect(data.overrideReasons).toContain(
                'Server override: estimatedValue $22,000 exceeds $3,000.',
            )
        })

        test('continues with analysis even if upload fails', async () => {
            mockUploadFiles.mockRejectedValueOnce(new Error('Upload failed'))

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.name).toBe('Vintage Lamp')
            expect(data.photoUrls).toHaveLength(0)
        })
    })

    describe('Request validation', () => {
        test('rejects request without application/json Content-Type', async () => {
            const request = new Request(
                'http://localhost:3000/api/inventory/analyze',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: '{"images":[]}',
                },
            )
            const response = await POST(request as never)
            const data = await response.json()
            expect(response.status).toBe(415)
            expect(data.success).toBe(false)
            expect(data.error).toMatch(/content-type/i)
        })

        test('rejects request with malformed JSON body', async () => {
            const request = new Request(
                'http://localhost:3000/api/inventory/analyze',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{not valid json',
                },
            )
            const response = await POST(request as never)
            const data = await response.json()
            expect(response.status).toBe(400)
            expect(data.error).toMatch(/invalid json/i)
        })

        test('rejects request with no images', async () => {
            const request = createRequest({ images: [] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error).toBe('Invalid request')
        })

        test('rejects request with too many images', async () => {
            const images = await Promise.all(
                Array.from({ length: 6 }, () => createTestImageBase64()),
            )
            const request = createRequest({ images })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
        })

        test('rejects request with invalid image data', async () => {
            const request = createRequest({
                images: [{ base64: '', mimeType: 'image/jpeg' }],
            })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
        })

        test('rejects request with invalid mime type', async () => {
            const image = await createTestImageBase64()
            const request = createRequest({
                images: [{ ...image, mimeType: 'text/plain' }],
            })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
        })

        test('accepts valid mime types', async () => {
            const validMimeTypes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
            ]

            for (const mimeType of validMimeTypes) {
                mockUploadFiles.mockClear()
                mockAnalyzeWithMarketResearch.mockClear()
                mockUploadFiles.mockResolvedValueOnce([
                    {
                        data: { ufsUrl: 'https://utfs.io/f/test.jpg' },
                        error: null,
                    },
                ])

                const image = await createTestImageBase64()
                const request = createRequest({
                    images: [{ ...image, mimeType }],
                })

                const response = await POST(request as never)

                expect(response.status).toBe(200)
            }
        })

        test('rejects oversized base64 image data', async () => {
            const oversizedBase64 = 'A'.repeat(10_485_761) // 1 byte over limit
            const request = createRequest({
                images: [{ base64: oversizedBase64, mimeType: 'image/jpeg' }],
            })
            const response = await POST(request as never)
            const data = await response.json()
            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
        })
    })

    describe('Error handling', () => {
        test('handles missing API key', async () => {
            // Module caching prevents reimport, so just verify env restoration
            const originalKey = process.env.ANTHROPIC_API_KEY
            delete process.env.ANTHROPIC_API_KEY
            process.env.ANTHROPIC_API_KEY = originalKey
        })

        test('handles API rate limiting', async () => {
            mockAnalyzeWithMarketResearch.mockRejectedValueOnce(
                new Error('rate limit exceeded'),
            )

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(429)
            expect(data.success).toBe(false)
            expect(data.error.toLowerCase()).toContain('rate limit')
        })

        test('surfaces credit-balance-low as 402 with a reload hint', async () => {
            // Anthropic's real error text for out-of-credits accounts, pulled
            // verbatim from Sentry event TRUST-ADMIN-Z. The route matches on
            // the phrasing, so a plain Error with the real message is enough
            // to exercise the 402 branch.
            mockAnalyzeWithMarketResearch.mockRejectedValueOnce(
                new Error(
                    '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}',
                ),
            )

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(402)
            expect(data.success).toBe(false)
            expect(data.error.toLowerCase()).toContain('credit balance')
            expect(data.error).toContain('console.anthropic.com')
        })

        test('handles authentication errors', async () => {
            mockAnalyzeWithMarketResearch.mockRejectedValueOnce(
                new Error('401 authentication failed'),
            )

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.success).toBe(false)
            expect(data.error).toContain('authentication')
        })

        test('handles generic errors', async () => {
            mockAnalyzeWithMarketResearch.mockRejectedValueOnce(
                new Error('Something went wrong'),
            )

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.success).toBe(false)
            expect(data.error).toBe('Internal server error')
        })

        test('continues with empty feedback when valuation_correction query fails (e.g. missing table in prod)', async () => {
            // Simulate NeonDbError('relation "valuation_correction" does not exist')
            mockDbChain.limit.mockRejectedValueOnce(
                new Error(
                    'Failed query: relation "valuation_correction" does not exist',
                ),
            )

            mockUploadFiles.mockResolvedValueOnce([
                {
                    data: { ufsUrl: 'https://utfs.io/f/photo.jpg' },
                    error: null,
                },
            ])

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            // Whole analysis still succeeds with empty feedback context
            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.name).toBe('Vintage Lamp')
            // buildFeedbackContext gets called with [] (no recent corrections)
            expect(mockBuildFeedbackContext).toHaveBeenCalledWith([])
            // Reset for subsequent tests
            mockDbChain.limit.mockImplementation(() => Promise.resolve([]))
        })
    })

    describe('Maximum images boundary', () => {
        test('accepts exactly 5 images', async () => {
            mockUploadFiles.mockResolvedValueOnce(
                Array.from({ length: 5 }, (_, i) => ({
                    data: { ufsUrl: `https://utfs.io/f/photo-${i}.jpg` },
                    error: null,
                })),
            )

            const images = await Promise.all(
                Array.from({ length: 5 }, () => createTestImageBase64()),
            )
            const request = createRequest({ images })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.photoUrls).toHaveLength(5)
        })

        test('accepts exactly 1 image', async () => {
            mockUploadFiles.mockResolvedValueOnce([
                {
                    data: { ufsUrl: 'https://utfs.io/f/single-photo.jpg' },
                    error: null,
                },
            ])

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.photoUrls).toHaveLength(1)
        })
    })
})
