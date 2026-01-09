/**
 * TanStack Query hooks for Entity resource
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Entity {
  id: string
  name: string
  entityType: string
  trustType: string | null
  grantorName: string | null
  ein: string | null
  dod: string | null
  governingLaw: string | null
  stateOfFormation: string | null
  formationDate: string | null
  status: string
}

// Query Keys
export const entityKeys = {
  all: ['entities'] as const,
  detail: (id: string) => ['entities', id] as const,
}

// Query Options
export const entitiesQueryOptions = () =>
  queryOptions({
    queryKey: entityKeys.all,
    queryFn: async () => {
      const res = await fetch('/api/entities')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = await res.json() as Entity[]
      return data.sort((a, b) => {
        if (a.dod && !b.dod) return -1
        if (!a.dod && b.dod) return 1
        return a.name.localeCompare(b.name)
      })
    },
  })

export const entityQueryOptions = (id: string) =>
  queryOptions({
    queryKey: entityKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/entities/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Entity>
    },
    enabled: !!id,
  })

// Query Hooks
export function useEntities() {
  return useQuery(entitiesQueryOptions())
}

export function useEntity(id: string) {
  return useQuery(entityQueryOptions(id))
}

// Mutations
export function useCreateEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entity: Partial<Entity>) => {
      const res = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create entity')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Entity>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all })
      toast.success('Entity created successfully')
    },
  })
}

export function useUpdateEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Entity> }) => {
      const res = await fetch(`/api/entities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to update entity')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Entity>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all })
      queryClient.invalidateQueries({ queryKey: entityKeys.detail(data.id) })
      toast.success('Entity updated successfully')
    },
  })
}

export function useDeleteEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/entities/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete entity')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.all })
      toast.success('Entity deleted successfully')
    },
  })
}
