/**
 * TanStack Query hooks for PersonalProperty resource
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface PersonalProperty {
  id: string
  entityId: string
  name: string
  description: string | null
  category: string
  location: string | null
  acquisitionDate: string | null
  acquisitionCost: string | null
  dodValue: string | null
  dodValueDate: string | null
  dodValueType: string | null
  status: string
  transferStatus: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const personalPropertyKeys = {
  all: ['personal-property'] as const,
  byEntity: (entityId: string) => ['personal-property', 'entity', entityId] as const,
  detail: (id: string) => ['personal-property', id] as const,
}

// Query Options
export const personalPropertyQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? personalPropertyKeys.byEntity(entityId) : personalPropertyKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/personal-property?entityId=${entityId}` : '/api/personal-property'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<PersonalProperty[]>
    },
    enabled: entityId ? !!entityId : true,
  })

export const personalPropertyItemQueryOptions = (id: string) =>
  queryOptions({
    queryKey: personalPropertyKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/personal-property/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<PersonalProperty>
    },
    enabled: !!id,
  })

// Query Hooks
export function usePersonalProperty(entityId?: string) {
  return useQuery(personalPropertyQueryOptions(entityId))
}

export function usePersonalPropertyItem(id: string) {
  return useQuery(personalPropertyItemQueryOptions(id))
}

// Mutations
export function useCreatePersonalProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (personalProperty: Partial<PersonalProperty>) => {
      const res = await fetch('/api/personal-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalProperty),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create personal property')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<PersonalProperty>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: personalPropertyKeys.all })
      queryClient.invalidateQueries({ queryKey: personalPropertyKeys.byEntity(data.entityId) })
      toast.success('Personal property created successfully')
    },
  })
}

export function useUpdatePersonalProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PersonalProperty> }) => {
      const res = await fetch(`/api/personal-property/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update personal property')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<PersonalProperty>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: personalPropertyKeys.all })
      queryClient.invalidateQueries({ queryKey: personalPropertyKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: personalPropertyKeys.detail(data.id) })
      toast.success('Personal property updated successfully')
    },
  })
}

export function useDeletePersonalProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/personal-property/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete personal property')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personalPropertyKeys.all })
      toast.success('Personal property deleted successfully')
    },
  })
}
