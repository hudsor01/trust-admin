'use client'

/**
 * TanStack Query hooks for Neon Data API
 *
 * Drop-in replacement for tRPC CRUD hooks on pure data tables.
 *
 * Usage:
 *   // List with filter
 *   const { data: vehicles = [] } = useNeonList<Vehicle>('vehicle', { entity_id: entityId })
 *
 *   // CRUD mutations (same interface as useCrudMutations)
 *   const { create, update, delete: remove } = useNeonMutations<Vehicle>('vehicle')
 *   await create.mutateAsync({ entityId, year: 2020, make: 'Toyota', ... })
 *   await update.mutateAsync({ id: 1, entityId: 1, data: { make: 'Honda' } })
 *   await remove.mutateAsync({ id: 1, entityId: 1 })
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { neonFetch } from '@/lib/neon-data-api'

/** Build a stable query key for a neon table + optional filters */
export function neonKey(
    table: string,
    filter?: Record<string, number | string | null | undefined>,
) {
    return ['neon', table, filter] as const
}

/** List rows from a table, optionally filtered by column equality */
export function useNeonList<T>(
    table: string,
    filter?: Record<string, number | null | undefined>,
    options?: { enabled?: boolean },
) {
    const params: Record<string, string> = {}
    let hasUndefined = false

    if (filter) {
        for (const [key, value] of Object.entries(filter)) {
            if (value == null) {
                hasUndefined = true
            } else {
                params[key] = `eq.${value}`
            }
        }
    }

    return useQuery<T[]>({
        queryKey: neonKey(table, filter),
        queryFn: () => neonFetch<T[]>(table, 'GET', { params }),
        enabled: options?.enabled !== false && !hasUndefined,
    })
}

/** Standard create/update/delete mutations for a Neon Data API table.
 *  entityId is optional — omit for tables that don't have an entity_id column (e.g. task). */
export function useNeonMutations<TModel extends { id: number }>(table: string) {
    const queryClient = useQueryClient()

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['neon', table] })
    }

    const create = useMutation<TModel, Error, Record<string, unknown>>({
        mutationFn: async (data) => {
            const result = await neonFetch<TModel | TModel[]>(table, 'POST', {
                body: { ...data, updatedAt: new Date().toISOString() },
            })
            return (Array.isArray(result) ? result[0] : result) as TModel
        },
        onSuccess: invalidate,
    })

    const update = useMutation<
        TModel,
        Error,
        { id: number; entityId?: number; data: Record<string, unknown> }
    >({
        mutationFn: async ({ id, entityId, data }) => {
            const params: Record<string, string> = { id: `eq.${id}` }
            if (entityId !== undefined) params.entity_id = `eq.${entityId}`
            const result = await neonFetch<TModel[]>(table, 'PATCH', {
                params,
                body: { ...data, updatedAt: new Date().toISOString() },
            })
            return result[0] as TModel
        },
        onSuccess: invalidate,
    })

    const remove = useMutation<
        TModel,
        Error,
        { id: number; entityId?: number }
    >({
        mutationFn: async ({ id, entityId }) => {
            const params: Record<string, string> = { id: `eq.${id}` }
            if (entityId !== undefined) params.entity_id = `eq.${entityId}`
            const result = await neonFetch<TModel[]>(table, 'DELETE', {
                params,
            })
            return result[0] as TModel
        },
        onSuccess: invalidate,
    })

    return { create, update, delete: remove }
}
