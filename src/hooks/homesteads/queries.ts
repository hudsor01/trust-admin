/**
 * TanStack Query hooks for Homestead resource
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Homestead {
  id: string
  entityId: string
  streetAddress: string
  city: string
  state: string
  zip: string
  county: string | null
  parcelNumber: string | null
  legalDescription: string | null
  propertyType: string
  yearBuilt: number | null
  squareFeet: number | null
  lotSizeAcres: string | null
  bedrooms: number | null
  bathrooms: string | null
  acquisitionDate: string | null
  acquisitionCost: string | null
  dodValue: string | null
  dodValueDate: string | null
  dodValueType: string | null
  dodAffidavitFiled: boolean | null
  dodAffidavitDate: string | null
  clerkFileNo: string | null
  status: string
  transferStatus: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const homesteadKeys = {
  all: ['homesteads'] as const,
  byEntity: (entityId: string) => ['homesteads', 'entity', entityId] as const,
  detail: (id: string) => ['homesteads', id] as const,
}

// Queries
export function useHomesteads(entityId?: string) {
  return useQuery({
    queryKey: entityId ? homesteadKeys.byEntity(entityId) : homesteadKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/homesteads?entityId=${entityId}` : '/api/homesteads'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Homestead[]>
    },
    enabled: entityId ? !!entityId : true,
  })
}

export function useHomestead(id: string) {
  return useQuery({
    queryKey: homesteadKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/homesteads/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Homestead>
    },
    enabled: !!id,
  })
}

// Mutations
export function useCreateHomestead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (homestead: Partial<Homestead>) => {
      const res = await fetch('/api/homesteads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(homestead),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create homestead')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Homestead>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: homesteadKeys.all })
      queryClient.invalidateQueries({ queryKey: homesteadKeys.byEntity(data.entityId) })
      toast.success('Homestead created successfully')
    },
  })
}

export function useUpdateHomestead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Homestead> }) => {
      const res = await fetch(`/api/homesteads/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update homestead')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Homestead>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: homesteadKeys.all })
      queryClient.invalidateQueries({ queryKey: homesteadKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: homesteadKeys.detail(data.id) })
      toast.success('Homestead updated successfully')
    },
  })
}

export function useDeleteHomestead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/homesteads/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete homestead')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homesteadKeys.all })
      toast.success('Homestead deleted successfully')
    },
  })
}
