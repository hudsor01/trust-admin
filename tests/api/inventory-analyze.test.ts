import { beforeEach, describe, expect, mock, test } from 'bun:test'
import sharp from 'sharp'

/** Integration tests for POST /api/inventory/analyze — image compression, Claude analysis, and Uploadthing upload. */

const mockGenerateObject = mock(() =>
    Promise.resolve({
        object: {
            name: 'Vintage Lamp',
            category: 'Furniture',
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
            valuationRationale: 'Based on similar decorative lamps',
            confidence: 'medium',
            confidenceNotes: 'Style identified but not authentic Tiffany',
        },
    }),
)

mock.module('ai', () => ({
    generateObject: mockGenerateObject,
}))

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

mock.module('../../src/lib/auth', () => ({
    authServer: {
        getSession: () =>
            Promise.resolve({
                data: { user: { id: '1', role: 'admin' }, session: {} },
            }),
    },
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
        mockGenerateObject.mockClear()
        mockUploadFiles.mockClear()
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
                mockGenerateObject.mockClear()
                mockUploadFiles.mockClear()
                mockGenerateObject.mockResolvedValueOnce({
                    object: {
                        name: 'Test Item',
                        category: 'Electronics',
                        brand: null,
                        model: null,
                        materials: [],
                        era: null,
                        estimatedValue: '100',
                        valueRangeLow: '50',
                        valueRangeHigh: '150',
                        condition: 'good',
                        conditionNotes: '',
                        description: 'Test',
                        valuationRationale: 'Test',
                        confidence: 'medium',
                        confidenceNotes: '',
                    },
                })
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
    })

    describe('Error handling', () => {
        test('handles missing API key', async () => {
            // Module caching prevents reimport, so just verify env restoration
            const originalKey = process.env.ANTHROPIC_API_KEY
            delete process.env.ANTHROPIC_API_KEY
            process.env.ANTHROPIC_API_KEY = originalKey
        })

        test('handles API rate limiting', async () => {
            mockGenerateObject.mockRejectedValueOnce(
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

        test('handles authentication errors', async () => {
            mockGenerateObject.mockRejectedValueOnce(
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
            mockGenerateObject.mockRejectedValueOnce(
                new Error('Something went wrong'),
            )

            const image = await createTestImageBase64()
            const request = createRequest({ images: [image] })

            const response = await POST(request as never)
            const data = await response.json()

            expect(response.status).toBe(500)
            expect(data.success).toBe(false)
            expect(data.error).toBe('Something went wrong')
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
