'use client'

/**
 * Creates standard CRUD mutations with auto-invalidation.
 *
 * This hook wraps the common pattern of create/update/delete mutations
 * that all invalidate the same list query on success.
 *
 * Uses TypeScript generics to capture the actual mutation return types
 * from the router passed in, preserving full type safety without any
 * `as any` casts. This follows the tRPC recommended pattern for
 * polymorphic router usage.
 *
 * @see https://trpc.io/docs/client/react/infer-types (Router Factory Pattern)
 *
 * @param config.router - The tRPC router with create/update/delete procedures
 * @param config.invalidate - Function to call after successful mutation
 *
 * @example
 * const utils = trpc.useUtils()
 * const { create, update, delete: deleteMutation } = useCrudMutations({
 *   router: trpc.contact,
 *   invalidate: () => utils.contact.list.invalidate()
 * })
 *
 * // Full type safety preserved:
 * await create.mutateAsync({ name: 'John' })  // Input type inferred
 * await update.mutateAsync({ id: 1, data: { name: 'Jane' } })
 * await deleteMutation.mutateAsync(1)
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
