/**
 * TanStack Query hooks for Trustee resource
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Trustee {
  id: string
  entityId: string
  contactId: string | null
  name: string
  email: string | null
  phone: string | null
  dob: string | null
  status: string | null
  order: number
  isCo: boolean | null
  coTrusteeId: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const trusteeKeys = {
  all: ['trustees'] as const,
  byEntity: (entityId: string) => ['trustees', 'entity', entityId] as const,
  detail: (id: string) => ['trustees', id] as const,
}

// Query Options
export const trusteesQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? trusteeKeys.byEntity(entityId) : trusteeKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/trustees?entityId=${entityId}` : '/api/trustees'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = await res.json() as Trustee[]
      return data.sort((a, b) => a.order - b.order)
    },
    enabled: entityId ? !!entityId : true,
  })

export const trusteeQueryOptions = (id: string) =>
  queryOptions({
    queryKey: trusteeKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/trustees/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Trustee>
    },
    enabled: !!id,
  })

// Query Hooks
export function useTrustees(entityId?: string) {
  return useQuery(trusteesQueryOptions(entityId))
}

export function useTrustee(id: string) {
  return useQuery(trusteeQueryOptions(id))
}

// Mutations
export function useCreateTrustee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (trustee: Partial<Trustee>) => {
      const res = await fetch('/api/trustees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trustee),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create trustee')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Trustee>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trusteeKeys.all })
      queryClient.invalidateQueries({ queryKey: trusteeKeys.byEntity(data.entityId) })
      toast.success('Trustee created successfully')
    },
  })
}

export function useUpdateTrustee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Trustee> }) => {
      const res = await fetch(`/api/trustees/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update trustee')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Trustee>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trusteeKeys.all })
      queryClient.invalidateQueries({ queryKey: trusteeKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: trusteeKeys.detail(data.id) })
      toast.success('Trustee updated successfully')
    },
  })
}

export function useDeleteTrustee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trustees/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete trustee')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trusteeKeys.all })
      toast.success('Trustee deleted successfully')
    },
  })
}
