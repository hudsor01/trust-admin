import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { NextRequest } from 'next/server'
import { ApiError } from '../../src/lib/api-error'

/**
 * Tests for POST /api/inventory/upload -- UploadThing-based upload (no filesystem).
 */

// Mock UTApi
const mockUploadFiles = mock(() =>
    Promise.resolve([
        { data: { ufsUrl: 'https://utfs.io/f/test-upload.jpg' }, error: null },
    ]),
)

mock.module('uploadthing/server', () => ({
    UTApi: class {
        uploadFiles = mockUploadFiles
    },
}))

// Mock auth middleware (admin by default)
const mockRequireAdmin = mock(() => Promise.resolve({ id: '1', role: 'admin' }))

mock.module('../../src/lib/middleware', () => ({
    requireAdmin: mockRequireAdmin,
}))

// Mock logger to silence output
mock.module('../../src/lib/logger', () => ({
    logger: {
        create: () => ({
            info: () => {},
            error: () => {},
            warn: () => {},
            debug: () => {},
        }),
    },
}))

const { POST } = await import('../../src/app/api/inventory/upload/route')

function createUploadRequest(files: File[]): NextRequest {
    const formData = new FormData()
    for (const file of files) formData.append('photos', file)
    return new NextRequest('http://localhost:3000/api/inventory/upload', {
        method: 'POST',
        body: formData,
    })
}

function createTestFile(
    name = 'test.jpg',
    type = 'image/jpeg',
    sizeBytes = 1024,
): File {
    const buffer = new Uint8Array(sizeBytes)
    return new File([buffer], name, { type })
}

describe('POST /api/inventory/upload', () => {
    beforeEach(() => {
        mockUploadFiles.mockClear()
        mockRequireAdmin.mockClear()
        mockRequireAdmin.mockImplementation(() =>
            Promise.resolve({ id: '1', role: 'admin' }),
        )
    })

    test('returns 200 with UploadThing URLs for valid image files', async () => {
        mockUploadFiles.mockResolvedValueOnce([
            {
                data: { ufsUrl: 'https://utfs.io/f/uploaded-1.jpg' },
                error: null,
            },
        ])

        const file = createTestFile('photo.jpg', 'image/jpeg')
        const request = createUploadRequest([file])

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.urls).toBeDefined()
        expect(data.urls.length).toBeGreaterThan(0)
        expect(data.urls[0]).toMatch(/^https:\/\//)
    })

    test('returns 400 when no files are provided', async () => {
        const request = createUploadRequest([])

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('No files provided')
    })

    test('returns 400 when more than 5 files are provided', async () => {
        const files = Array.from({ length: 6 }, (_, i) =>
            createTestFile(`photo-${i}.jpg`, 'image/jpeg'),
        )
        const request = createUploadRequest(files)

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Maximum 5 files allowed')
    })

    test('returns 400 for invalid MIME type', async () => {
        const file = createTestFile('doc.txt', 'text/plain')
        const request = createUploadRequest([file])

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid file type')
    })

    test('returns 400 for file exceeding 10MB', async () => {
        const file = createTestFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024)
        const request = createUploadRequest([file])

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('too large')
    })

    test('does not import node:fs/promises', async () => {
        const source = await Bun.file(
            'src/app/api/inventory/upload/route.ts',
        ).text()
        expect(source).not.toContain("from 'node:fs/promises'")
        expect(source).not.toContain('from "node:fs/promises"')
    })

    test('UTApi.uploadFiles is called with File objects on success', async () => {
        mockUploadFiles.mockResolvedValueOnce([
            {
                data: { ufsUrl: 'https://utfs.io/f/result.jpg' },
                error: null,
            },
        ])

        const file = createTestFile('photo.jpg', 'image/jpeg')
        const request = createUploadRequest([file])

        await POST(request)

        expect(mockUploadFiles).toHaveBeenCalledTimes(1)
        const calledWith = mockUploadFiles.mock.calls[0][0] as File[]
        expect(calledWith.length).toBe(1)
        expect(calledWith[0]).toBeInstanceOf(File)
    })

    test('rejects unauthenticated requests', async () => {
        mockRequireAdmin.mockImplementation(() => {
            throw ApiError.unauthorized('Authentication required')
        })

        const file = createTestFile('photo.jpg', 'image/jpeg')
        const request = createUploadRequest([file])

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.success).toBe(false)
    })
})
