'use client'

/**
 * Standard CRUD mutations with auto-invalidation.
 *
 * Generics capture the router's actual mutation return types to preserve
 * full type safety without `as any` casts.
 *
 * @see https://trpc.io/docs/client/react/infer-types (Router Factory Pattern)
 */
export function useCrudMutations<TCreate, TUpdate, TDelete>(config: {
    router: {
        create: { useMutation: (opts: { onSuccess: () => void }) => TCreate }
        update: { useMutation: (opts: { onSuccess: () => void }) => TUpdate }
        delete: { useMutation: (opts: { onSuccess: () => void }) => TDelete }
    }
    invalidate: () => void
}) {
    const { router, invalidate } = config

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
