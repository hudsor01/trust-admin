/**
 * TanStack Query hooks for Liability resource
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Liability {
  id: string
  entityId: string
  liabilityType: string
  creditor: string
  description: string | null
  originalAmount: string
  currentBalance: string
  currentBalanceDate: string | null
  interestRate: string | null
  monthlyPayment: string | null
  dueDate: string | null
  paymentDueDay: number | null
  rentalPropertyId: string | null
  homesteadId: string | null
  vehicleId: string | null
  status: string
  allocationClass: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const liabilityKeys = {
  all: ['liabilities'] as const,
  byEntity: (entityId: string) => ['liabilities', 'entity', entityId] as const,
  detail: (id: string) => ['liabilities', id] as const,
}

// Query Options
export const liabilitiesQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? liabilityKeys.byEntity(entityId) : liabilityKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/liabilities?entityId=${entityId}` : '/api/liabilities'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Liability[]>
    },
    enabled: entityId ? !!entityId : true,
  })

export const liabilityQueryOptions = (id: string) =>
  queryOptions({
    queryKey: liabilityKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/liabilities/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Liability>
    },
    enabled: !!id,
  })

// Query Hooks
export function useLiabilities(entityId?: string) {
  return useQuery(liabilitiesQueryOptions(entityId))
}

export function useLiability(id: string) {
  return useQuery(liabilityQueryOptions(id))
}

// Mutations
export function useCreateLiability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (liability: Partial<Liability>) => {
      const res = await fetch('/api/liabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(liability),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create liability')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Liability>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liabilityKeys.all })
      queryClient.invalidateQueries({ queryKey: liabilityKeys.byEntity(data.entityId) })
      toast.success('Liability created successfully')
    },
  })
}

export function useUpdateLiability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Liability> }) => {
      const res = await fetch(`/api/liabilities/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update liability')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Liability>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liabilityKeys.all })
      queryClient.invalidateQueries({ queryKey: liabilityKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: liabilityKeys.detail(data.id) })
      toast.success('Liability updated successfully')
    },
  })
}

export function useDeleteLiability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/liabilities/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete liability')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liabilityKeys.all })
      toast.success('Liability deleted successfully')
    },
  })
}
