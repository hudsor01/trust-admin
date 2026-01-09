/**
 * TanStack Query hooks for Entity resource
 *
 * Replaces: Custom createQueryHook pattern
 * Benefits: Automatic caching, deduplication, DevTools, retries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types
interface Entity {
  id: string
  name: string
  entityType: string
  taxId: string | null
  dod: string | null
  createdAt: string
  updatedAt: string
}

// Query keys
export const entityKeys = {
  all: ['entities'] as const,
  detail: (id: string) => ['entities', id] as const,
}

// Query hooks
export function useEntities() {
  return useQuery({
    queryKey: entityKeys.all,
    queryFn: async () => {
      const res = await fetch('/api/entities')
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Entity[]>
    },
  })
}

export function useEntity(id: string) {
  return useQuery({
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
}

// Mutation hooks
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

        // Show validation errors
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n')
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
    onError: (error) => {
      // Error toast already shown in mutationFn
      console.error('Failed to create entity:', error)
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

        // Show validation errors
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n')
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
    onError: (error) => {
      console.error('Failed to update entity:', error)
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
    onError: (error) => {
      console.error('Failed to delete entity:', error)
    },
  })
}
