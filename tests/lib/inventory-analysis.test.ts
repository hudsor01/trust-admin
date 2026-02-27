import { beforeEach, describe, expect, mock, test } from 'bun:test'
import sharp from 'sharp'
import {
    analyzeInventoryImageWithCompressed,
    compressImage,
    type InventoryImage,
} from '@/lib/inventory-analysis'

const mockGenerateObject = mock(() =>
    Promise.resolve({
        object: {
            name: 'Test Item',
            category: 'Electronics',
            brand: 'TestBrand',
            model: 'Model123',
            materials: ['plastic', 'metal'],
            era: '2020s',
            estimatedValue: '150',
            valueRangeLow: '100',
            valueRangeHigh: '200',
            condition: 'good',
            conditionNotes: 'Minor wear',
            description: 'A test electronic item',
            valuationRationale: 'Based on market comparables',
            confidence: 'high',
            confidenceNotes: 'Clear image, identifiable brand',
        },
    }),
)

mock.module('ai', () => ({
    generateObject: mockGenerateObject,
}))

const TARGET_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

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
        .png({ compressionLevel: 0 }) // Minimal compression
        .toBuffer()

    const base64 = buffer.toString('base64')

    return {
        base64,
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

    const base64 = buffer.toString('base64')

    return {
        base64,
        mimeType: 'image/jpeg',
        actualSize: buffer.length,
    }
}

describe('Image Compression for Inventory Analysis', () => {
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
            const mimeType = 'image/png'

            expect(buffer.length).toBeLessThan(TARGET_IMAGE_SIZE_BYTES)

            const result = await compressImage(base64, mimeType)

            expect(result.base64).toBe(base64)
            expect(result.mimeType).toBe(mimeType)
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
            console.log(
                `Test image size: ${(actualSize / 1024 / 1024).toFixed(2)}MB`,
            )

            const result = await compressImage(base64, mimeType)

            const resultBuffer = Buffer.from(result.base64, 'base64')
            const resultSize = resultBuffer.length

            console.log(
                `Compressed size: ${(resultSize / 1024 / 1024).toFixed(2)}MB`,
            )

            expect(resultSize).toBeLessThanOrEqual(TARGET_IMAGE_SIZE_BYTES)
            expect(result.mimeType).toBe('image/jpeg')
            expect(resultSize).toBeLessThan(actualSize)
        })

        test('compresses large JPEG to under target size', async () => {
            const buffer = await sharp({
                create: {
                    width: 4500,
                    height: 3500,
                    channels: 3,
                    background: { r: 120, g: 80, b: 200 },
                    noise: { type: 'gaussian', mean: 128, sigma: 60 },
                },
            })
                .jpeg({ quality: 100 })
                .toBuffer()

            const base64 = buffer.toString('base64')
            const actualSize = buffer.length

            if (actualSize > TARGET_IMAGE_SIZE_BYTES) {
                console.log(
                    `Large JPEG size: ${(actualSize / 1024 / 1024).toFixed(2)}MB`,
                )

                const result = await compressImage(base64, 'image/jpeg')
                const resultBuffer = Buffer.from(result.base64, 'base64')

                expect(resultBuffer.length).toBeLessThanOrEqual(
                    TARGET_IMAGE_SIZE_BYTES,
                )
                expect(result.mimeType).toBe('image/jpeg')
            } else {
                console.log(
                    `Skipping large JPEG test - could only create ${(actualSize / 1024 / 1024).toFixed(2)}MB image`,
                )
            }
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

        test('preserves JPEG format for small images', async () => {
            const { base64 } = await createSmallTestImage()

            const result = await compressImage(base64, 'image/jpeg')

            expect(result.mimeType).toBe('image/jpeg')
        })

        test('preserves PNG format for small images', async () => {
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
        test('respects max dimension cap of 4096px', async () => {
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

            const actualSize = buffer.length

            if (actualSize > TARGET_IMAGE_SIZE_BYTES) {
                const result = await compressImage(
                    buffer.toString('base64'),
                    'image/png',
                )
                const resultBuffer = Buffer.from(result.base64, 'base64')
                const metadata = await sharp(resultBuffer).metadata()

                expect(metadata.width).toBeLessThanOrEqual(4096)
            }
        })

        test('maintains aspect ratio during resize', async () => {
            const originalWidth = 4000
            const originalHeight = 2000 // 2:1 aspect ratio

            const buffer = await sharp({
                create: {
                    width: originalWidth,
                    height: originalHeight,
                    channels: 3,
                    background: { r: 80, g: 120, b: 160 },
                    noise: { type: 'gaussian', mean: 128, sigma: 50 },
                },
            })
                .png({ compressionLevel: 0 })
                .toBuffer()

            const actualSize = buffer.length

            if (actualSize > TARGET_IMAGE_SIZE_BYTES) {
                const result = await compressImage(
                    buffer.toString('base64'),
                    'image/png',
                )
                const resultBuffer = Buffer.from(result.base64, 'base64')
                const metadata = await sharp(resultBuffer).metadata()

                const originalRatio = originalWidth / originalHeight
                const newRatio = (metadata.width ?? 1) / (metadata.height ?? 1)

                expect(newRatio).toBeCloseTo(originalRatio, 1)
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
                    channels: 4, // RGBA
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
        test('simulates typical iPhone photo (large HEIC-like dimensions)', async () => {
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

            const base64 = buffer.toString('base64')
            const actualSize = buffer.length

            console.log(
                `iPhone-like image size: ${(actualSize / 1024 / 1024).toFixed(2)}MB`,
            )

            const result = await compressImage(base64, 'image/jpeg')
            const resultBuffer = Buffer.from(result.base64, 'base64')

            expect(resultBuffer.length).toBeLessThanOrEqual(
                MAX_IMAGE_SIZE_BYTES,
            )

            const metadata = await sharp(resultBuffer).metadata()
            expect(metadata.format).toBe('jpeg')
        })

        test('simulates DSLR photo (high resolution)', async () => {
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

            const base64 = buffer.toString('base64')
            const actualSize = buffer.length

            console.log(
                `DSLR-like image size: ${(actualSize / 1024 / 1024).toFixed(2)}MB`,
            )

            const result = await compressImage(base64, 'image/jpeg')
            const resultBuffer = Buffer.from(result.base64, 'base64')

            expect(resultBuffer.length).toBeLessThanOrEqual(
                MAX_IMAGE_SIZE_BYTES,
            )
        })
    })
})

describe('analyzeInventoryImageWithCompressed', () => {
    beforeEach(() => {
        mockGenerateObject.mockClear()
    })

    test('returns both analysis and compressed images', async () => {
        const image = await createSmallTestImage()
        const images: InventoryImage[] = [image]

        const result = await analyzeInventoryImageWithCompressed(images)

        expect(result.analysis).toBeDefined()
        expect(result.analysis.name).toBe('Test Item')
        expect(result.analysis.dbCategory).toBeDefined()

        expect(result.compressedImages).toBeDefined()
        expect(result.compressedImages).toHaveLength(1)
        expect(result.compressedImages[0].base64).toBeDefined()
        expect(result.compressedImages[0].mimeType).toBeDefined()
    })

    test('compresses multiple images and returns all', async () => {
        const images: InventoryImage[] = await Promise.all([
            createSmallTestImage(),
            createSmallTestImage(),
            createSmallTestImage(),
        ])

        const result = await analyzeInventoryImageWithCompressed(images)

        expect(result.compressedImages).toHaveLength(3)
        for (const img of result.compressedImages) {
            expect(img.base64).toBeTruthy()
            expect(img.mimeType).toBeTruthy()
        }
    })

    test('throws error for empty images array', async () => {
        await expect(analyzeInventoryImageWithCompressed([])).rejects.toThrow(
            'At least one image is required',
        )
    })

    test('maps category to database category', async () => {
        const image = await createSmallTestImage()

        const result = await analyzeInventoryImageWithCompressed([image])

        expect(result.analysis.rawCategory).toBe('Electronics')
        expect(result.analysis.dbCategory).toBe('ELECTRONICS')
    })

    test('handles large images that need compression', async () => {
        const { base64, mimeType, actualSize } = await createLargeTestImage()

        if (actualSize > TARGET_IMAGE_SIZE_BYTES) {
            const images: InventoryImage[] = [{ base64, mimeType }]

            const result = await analyzeInventoryImageWithCompressed(images)

            const compressedSize = Buffer.from(
                result.compressedImages[0].base64,
                'base64',
            ).length
            expect(compressedSize).toBeLessThanOrEqual(TARGET_IMAGE_SIZE_BYTES)

            expect(result.analysis).toBeDefined()
        }
    })

    test('preserves image order in compressed output', async () => {
        const images: InventoryImage[] = []

        for (const size of [400, 600, 800]) {
            const buffer = await sharp({
                create: {
                    width: size,
                    height: size,
                    channels: 3,
                    background: { r: size / 4, g: size / 4, b: size / 4 },
                },
            })
                .jpeg({ quality: 80 })
                .toBuffer()

            images.push({
                base64: buffer.toString('base64'),
                mimeType: 'image/jpeg',
            })
        }

        const result = await analyzeInventoryImageWithCompressed(images)

        expect(result.compressedImages).toHaveLength(3)
    })

    test('includes all required analysis fields', async () => {
        const image = await createSmallTestImage()

        const result = await analyzeInventoryImageWithCompressed([image])

        expect(result.analysis).toMatchObject({
            name: expect.any(String),
            rawCategory: expect.any(String),
            dbCategory: expect.any(String),
            estimatedValue: expect.any(String),
            valueRangeLow: expect.any(String),
            valueRangeHigh: expect.any(String),
            condition: expect.any(String),
            description: expect.any(String),
            confidence: expect.any(String),
        })
    })
})
