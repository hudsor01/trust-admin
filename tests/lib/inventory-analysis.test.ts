/** Tests for inventory-analysis.ts — image compression (the only logic
 * that still lives here; the prior agentic loop + override guardrails
 * were removed as unreachable, leaving inventory-agent.ts as the sole
 * runtime path for the /forms/inventory pipeline). */

import { describe, expect, test } from 'bun:test'
import sharp from 'sharp'

const { compressImage } = await import('../../src/lib/inventory-analysis')

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
