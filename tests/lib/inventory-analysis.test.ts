import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'
import { compressImage } from '../../src/lib/inventory-analysis'

/**
 * Unit tests for Inventory Analysis image compression
 *
 * Tests the compressImage function that ensures images fit within
 * Anthropic's 5MB limit while maintaining quality for analysis.
 */

// Constants matching the source
const TARGET_IMAGE_SIZE_BYTES = 4 * 1024 * 1024 // 4MB target
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB limit

/**
 * Helper to create a large test image (>5MB) using high dimensions and PNG
 */
async function createLargeTestImage(): Promise<{
    base64: string
    mimeType: string
    actualSize: number
}> {
    // Create a large uncompressed PNG to exceed 5MB
    // 3000x3000 RGB = ~27MB uncompressed, PNG will compress but still large
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

/**
 * Helper to create a small test image (<1MB)
 */
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

            // Verify our test image is actually small
            expect(actualSize).toBeLessThan(TARGET_IMAGE_SIZE_BYTES)

            const result = await compressImage(base64, mimeType)

            // Should return the original data unchanged
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

            // Small images pass through unchanged
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

            // Verify our test image is actually large
            expect(actualSize).toBeGreaterThan(TARGET_IMAGE_SIZE_BYTES)
            console.log(
                `Test image size: ${(actualSize / 1024 / 1024).toFixed(2)}MB`,
            )

            const result = await compressImage(base64, mimeType)

            // Verify compression happened
            const resultBuffer = Buffer.from(result.base64, 'base64')
            const resultSize = resultBuffer.length

            console.log(
                `Compressed size: ${(resultSize / 1024 / 1024).toFixed(2)}MB`,
            )

            // Result should be under target
            expect(resultSize).toBeLessThanOrEqual(TARGET_IMAGE_SIZE_BYTES)

            // Should be converted to JPEG
            expect(result.mimeType).toBe('image/jpeg')

            // Should be significantly smaller than original
            expect(resultSize).toBeLessThan(actualSize)
        })

        test('compresses large JPEG to under target size', async () => {
            // Create a large JPEG by using high quality and large dimensions
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

            // Only run this test if we successfully created a large enough image
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

            // Verify the result is a valid image by checking metadata
            const metadata = await sharp(resultBuffer).metadata()

            expect(metadata.format).toBe('jpeg')
            expect(metadata.width).toBeGreaterThan(0)
            expect(metadata.height).toBeGreaterThan(0)

            // Dimensions should be reasonable (not tiny)
            expect(metadata.width).toBeGreaterThanOrEqual(800)
            expect(metadata.height).toBeGreaterThanOrEqual(600)
        })
    })

    describe('Output format', () => {
        test('converts PNG to JPEG when compression needed', async () => {
            const { base64, actualSize } = await createLargeTestImage()

            // Only test if image is large enough
            if (actualSize > TARGET_IMAGE_SIZE_BYTES) {
                const result = await compressImage(base64, 'image/png')

                expect(result.mimeType).toBe('image/jpeg')

                // Verify it's actually a JPEG by checking magic bytes
                const resultBuffer = Buffer.from(result.base64, 'base64')
                expect(resultBuffer[0]).toBe(0xff) // JPEG magic byte 1
                expect(resultBuffer[1]).toBe(0xd8) // JPEG magic byte 2
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

            // Small images keep their original format
            expect(result.mimeType).toBe('image/png')
        })
    })

    describe('Dimension handling', () => {
        test('respects max dimension cap of 4096px', async () => {
            // Create a very wide image
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

            // Only test if large enough to trigger compression
            if (actualSize > TARGET_IMAGE_SIZE_BYTES) {
                const result = await compressImage(
                    buffer.toString('base64'),
                    'image/png',
                )
                const resultBuffer = Buffer.from(result.base64, 'base64')
                const metadata = await sharp(resultBuffer).metadata()

                // Width should be capped at 4096
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

                // Check aspect ratio is preserved (within tolerance)
                const originalRatio = originalWidth / originalHeight
                const newRatio = (metadata.width ?? 1) / (metadata.height ?? 1)

                expect(newRatio).toBeCloseTo(originalRatio, 1)
            }
        })
    })

    describe('Edge cases', () => {
        test('handles image exactly at target size', async () => {
            // Create an image and check it passes through if under target
            const { base64, mimeType, actualSize } =
                await createSmallTestImage()

            // This is actually testing that small images pass through
            // Getting exactly 4MB is difficult, so we test the boundary behavior
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

            // Small WebP should pass through unchanged
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

            // Should succeed without error
            expect(result.base64).toBeDefined()
            expect(result.mimeType).toBeDefined()
        })
    })

    describe('Integration scenarios', () => {
        test('simulates typical iPhone photo (large HEIC-like dimensions)', async () => {
            // iPhone photos are typically 4032x3024 (12MP)
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

            // Should be under the limit
            expect(resultBuffer.length).toBeLessThanOrEqual(
                MAX_IMAGE_SIZE_BYTES,
            )

            // Should be a valid JPEG
            const metadata = await sharp(resultBuffer).metadata()
            expect(metadata.format).toBe('jpeg')
        })

        test('simulates DSLR photo (high resolution)', async () => {
            // DSLR photos can be 6000x4000 (24MP) or larger
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

            // Should be under the limit
            expect(resultBuffer.length).toBeLessThanOrEqual(
                MAX_IMAGE_SIZE_BYTES,
            )
        })
    })
})
