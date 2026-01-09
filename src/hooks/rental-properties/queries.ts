/**
 * TanStack Query hooks for RentalProperty resource
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface RentalProperty {
  id: string
  entityId: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  county: string | null
  parcelNumber: string | null
  propertyType: string
  units: number
  squareFeet: number | null
  lotSizeAcres: string | null
  yearBuilt: number | null
  rentalStatus: string
  monthlyRent: string | null
  leaseStart: string | null
  leaseEnd: string | null
  propertyManager: string | null
  acquisitionDate: string | null
  acquisitionCost: string | null
  mortgageBalance: string | null
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
export const rentalPropertyKeys = {
  all: ['rental-properties'] as const,
  byEntity: (entityId: string) => ['rental-properties', 'entity', entityId] as const,
  detail: (id: string) => ['rental-properties', id] as const,
}

// Query Options
export const rentalPropertiesQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? rentalPropertyKeys.byEntity(entityId) : rentalPropertyKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/rental-properties?entityId=${entityId}` : '/api/rental-properties'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<RentalProperty[]>
    },
    enabled: entityId ? !!entityId : true,
  })

export const rentalPropertyQueryOptions = (id: string) =>
  queryOptions({
    queryKey: rentalPropertyKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/rental-properties/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<RentalProperty>
    },
    enabled: !!id,
  })

// Query Hooks
export function useRentalProperties(entityId?: string) {
  return useQuery(rentalPropertiesQueryOptions(entityId))
}

export function useRentalProperty(id: string) {
  return useQuery(rentalPropertyQueryOptions(id))
}

// Mutations
export function useCreateRentalProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rentalProperty: Partial<RentalProperty>) => {
      const res = await fetch('/api/rental-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rentalProperty),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create rental property')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<RentalProperty>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rentalPropertyKeys.all })
      queryClient.invalidateQueries({ queryKey: rentalPropertyKeys.byEntity(data.entityId) })
      toast.success('Rental property created successfully')
    },
  })
}

export function useUpdateRentalProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RentalProperty> }) => {
      const res = await fetch(`/api/rental-properties/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update rental property')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<RentalProperty>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rentalPropertyKeys.all })
      queryClient.invalidateQueries({ queryKey: rentalPropertyKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: rentalPropertyKeys.detail(data.id) })
      toast.success('Rental property updated successfully')
    },
  })
}

export function useDeleteRentalProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/rental-properties/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete rental property')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rentalPropertyKeys.all })
      toast.success('Rental property deleted successfully')
    },
  })
}
