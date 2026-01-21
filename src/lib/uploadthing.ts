import { createUploadthing, type FileRouter } from 'uploadthing/server'

const f = createUploadthing()

/**
 * Uploadthing file router for the trust admin application.
 *
 * inventoryPhoto: Handles photo uploads for inventory items.
 * - Max 5 images per upload
 * - Max 2MB per image (compressed)
 * - Accepts JPEG, PNG, WebP
 */
export const uploadRouter = {
    inventoryPhoto: f({
        image: {
            maxFileSize: '2MB',
            maxFileCount: 5,
        },
    }).onUploadComplete(({ file }) => {
        console.log('Inventory photo uploaded:', file.ufsUrl)
        return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
