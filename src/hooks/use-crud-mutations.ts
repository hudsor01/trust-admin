'use client'

import { trpc } from '@/lib/trpc'

/**
 * Creates standard CRUD mutations with auto-invalidation.
 *
 * This hook wraps the common pattern of create/update/delete mutations
 * that all invalidate the same list query on success.
 *
 * @param routerKey - The tRPC router name (e.g., 'contact', 'vehicle')
 *
 * @example
 * const { create, update, delete: deleteMutation } = useCrudMutations('contact')
 *
 * // Use like normal mutations:
 * await create.mutateAsync({ name: 'John' })
 * await update.mutateAsync({ id: 1, data: { name: 'Jane' } })
 * await deleteMutation.mutateAsync({ id: 1 })
 */
export function useCrudMutations<K extends keyof typeof trpc & string>(
    routerKey: K,
) {
    const utils = trpc.useUtils()

    // Access router dynamically
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic router access requires any
    const router = trpc[routerKey] as any

    const invalidate = () => {
        // @ts-expect-error - dynamic router access
        utils[routerKey].list.invalidate()
    }

    const create = router.create.useMutation({
        onSuccess: invalidate,
    })

    const update = router.update.useMutation({
        onSuccess: invalidate,
    })

    const deleteMutation = router.delete.useMutation({
        onSuccess: invalidate,
    })

    return { create, update, delete: deleteMutation }
}
