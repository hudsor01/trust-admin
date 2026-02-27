import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type NextRequest, NextResponse } from 'next/server'
import { ApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/middleware'

const log = logger.create('Upload')

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'inventory')
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

        await mkdir(UPLOAD_DIR, { recursive: true })

        const paths: string[] = []

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

            // Extension from validated MIME type, not client filename (prevents spoofing)
            const ext = MIME_TO_EXT[file.type] ?? 'jpg'
            const filename = `${Date.now()}-${randomUUID()}.${ext}`
            const filepath = join(UPLOAD_DIR, filename)

            const bytes = await file.arrayBuffer()
            await writeFile(filepath, Buffer.from(bytes))

            paths.push(`/uploads/inventory/${filename}`)
        }

        return NextResponse.json({ success: true, paths })
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
