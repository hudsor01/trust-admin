/**
 * TanStack Query hooks for SpecificBequest resource
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface SpecificBequest {
  id: string
  entityId: string
  beneficiaryId: string | null
  description: string
  category: string | null
  recipientName: string | null
  dateDistributed: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const specificBequestKeys = {
  all: ['specific-bequests'] as const,
  byEntity: (entityId: string) => ['specific-bequests', 'entity', entityId] as const,
  detail: (id: string) => ['specific-bequests', id] as const,
}

// Queries
export function useSpecificBequests(entityId?: string) {
  return useQuery({
    queryKey: entityId ? specificBequestKeys.byEntity(entityId) : specificBequestKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/specific-bequests?entityId=${entityId}` : '/api/specific-bequests'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<SpecificBequest[]>
    },
    enabled: entityId ? !!entityId : true,
  })
}

export function useSpecificBequest(id: string) {
  return useQuery({
    queryKey: specificBequestKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/specific-bequests/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<SpecificBequest>
    },
    enabled: !!id,
  })
}

// Mutations
export function useCreateSpecificBequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (specificBequest: Partial<SpecificBequest>) => {
      const res = await fetch('/api/specific-bequests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specificBequest),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create bequest')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<SpecificBequest>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: specificBequestKeys.all })
      queryClient.invalidateQueries({ queryKey: specificBequestKeys.byEntity(data.entityId) })
      toast.success('Bequest created successfully')
    },
  })
}

export function useUpdateSpecificBequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SpecificBequest> }) => {
      const res = await fetch(`/api/specific-bequests/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update bequest')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<SpecificBequest>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: specificBequestKeys.all })
      queryClient.invalidateQueries({ queryKey: specificBequestKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: specificBequestKeys.detail(data.id) })
      toast.success('Bequest updated successfully')
    },
  })
}

export function useDeleteSpecificBequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/specific-bequests/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete bequest')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specificBequestKeys.all })
      toast.success('Bequest deleted successfully')
    },
  })
}
