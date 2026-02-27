import { createUploadthing, type FileRouter } from 'uploadthing/server'

const f = createUploadthing()

/** Inventory photo uploads: max 5 images, 2MB each. */
export const uploadRouter = {
    inventoryPhoto: f({
        image: {
            maxFileSize: '2MB',
            maxFileCount: 5,
        },
    }).onUploadComplete(({ file }) => {
        return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
