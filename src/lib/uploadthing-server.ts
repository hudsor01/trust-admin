import { UTApi } from 'uploadthing/server'
import { logger } from '@/lib/logger'

const log = logger.create('UploadThing')
const utapi = new UTApi()

/** Upload compressed inventory images to Uploadthing from server-side. */
export async function uploadInventoryImages(
    images: Array<{ base64: string; mimeType: string }>,
): Promise<string[]> {
    const files = images.map((img, index) => {
        const buffer = Buffer.from(img.base64, 'base64')
        const extension = img.mimeType.split('/')[1] || 'jpg'
        const filename = `inventory-${Date.now()}-${index}.${extension}`

        const blob = new Blob([buffer], { type: img.mimeType })
        return new File([blob], filename, { type: img.mimeType })
    })

    const uploadResults = await utapi.uploadFiles(files)

    const urls = uploadResults
        .map((result) => {
            if (result.data) {
                return result.data.ufsUrl
            }
            log.error('Upload failed for file', { error: result.error })
            return null
        })
        .filter((url): url is string => url !== null)

    return urls
}
