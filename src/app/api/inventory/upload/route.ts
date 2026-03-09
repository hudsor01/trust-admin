import { randomUUID } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { UTApi } from 'uploadthing/server'
import { ApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/middleware'

const log = logger.create('Upload')
const utapi = new UTApi()

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
}
const MAX_FILES = 5

export async function POST(request: NextRequest) {
    try {
        await requireAdmin(request)

        const formData = await request.formData()
        const files = formData.getAll('photos') as File[]

        if (files.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No files provided' },
                { status: 400 },
            )
        }

        if (files.length > MAX_FILES) {
            return NextResponse.json(
                { success: false, error: `Maximum ${MAX_FILES} files allowed` },
                { status: 400 },
            )
        }

        // Validate all files before uploading
        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Invalid file type: ${file.type}. Allowed: jpeg, png, gif, webp`,
                    },
                    { status: 400 },
                )
            }

            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `File too large: ${file.name}. Maximum 10MB`,
                    },
                    { status: 400 },
                )
            }
        }

        // Rename files with safe names before upload
        const renamedFiles = files.map((file) => {
            const ext = MIME_TO_EXT[file.type] ?? 'jpg'
            const filename = `inventory-${Date.now()}-${randomUUID()}.${ext}`
            return new File([file], filename, { type: file.type })
        })

        const uploadResults = await utapi.uploadFiles(renamedFiles)
        const urls = uploadResults
            .filter((r) => r.data !== null)
            .map((r) => r.data!.ufsUrl)

        if (urls.length === 0) {
            return NextResponse.json(
                { success: false, error: 'All uploads failed' },
                { status: 500 },
            )
        }

        return NextResponse.json({ success: true, urls })
    } catch (error) {
        if (error instanceof ApiError) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: error.status },
            )
        }
        log.error('Upload error', { error })
        return NextResponse.json(
            { success: false, error: 'Upload failed' },
            { status: 500 },
        )
    }
}
