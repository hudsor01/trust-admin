/**
 * TanStack Query hooks for TrusteeFeeEntry resource
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface TrusteeFeeEntry {
  id: string
  entityId: string
  trusteeId: string
  scheduleId: string | null
  periodStart: string
  periodEnd: string
  assetFee: string | null
  assetBasis: string | null
  incomeFee: string | null
  incomeBasis: string | null
  hoursWorked: string | null
  hourlyFee: string | null
  executorFee: string | null
  totalFee: string
  status: string
  paidDate: string | null
  paymentMethod: string | null
  checkNumber: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const trusteeFeeEntryKeys = {
  all: ['trustee-fee-entries'] as const,
  byEntity: (entityId: string) => ['trustee-fee-entries', 'entity', entityId] as const,
  detail: (id: string) => ['trustee-fee-entries', id] as const,
}

// Query Options
export const trusteeFeeEntriesQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? trusteeFeeEntryKeys.byEntity(entityId) : trusteeFeeEntryKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/trustee-fee-entries?entityId=${entityId}` : '/api/trustee-fee-entries'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = await res.json() as TrusteeFeeEntry[]
      return data.sort((a, b) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime())
    },
    enabled: entityId ? !!entityId : true,
  })

export const trusteeFeeEntryQueryOptions = (id: string) =>
  queryOptions({
    queryKey: trusteeFeeEntryKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/trustee-fee-entries/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<TrusteeFeeEntry>
    },
    enabled: !!id,
  })

// Query Hooks
export function useTrusteeFeeEntries(entityId?: string) {
  return useQuery(trusteeFeeEntriesQueryOptions(entityId))
}

export function useTrusteeFeeEntry(id: string) {
  return useQuery(trusteeFeeEntryQueryOptions(id))
}

// Mutations
export function useCreateTrusteeFeeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (trusteeFeeEntry: Partial<TrusteeFeeEntry>) => {
      const res = await fetch('/api/trustee-fee-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trusteeFeeEntry),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create fee entry')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<TrusteeFeeEntry>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trusteeFeeEntryKeys.all })
      queryClient.invalidateQueries({ queryKey: trusteeFeeEntryKeys.byEntity(data.entityId) })
      toast.success('Fee entry created successfully')
    },
  })
}

export function useUpdateTrusteeFeeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TrusteeFeeEntry> }) => {
      const res = await fetch(`/api/trustee-fee-entries/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update fee entry')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<TrusteeFeeEntry>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trusteeFeeEntryKeys.all })
      queryClient.invalidateQueries({ queryKey: trusteeFeeEntryKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: trusteeFeeEntryKeys.detail(data.id) })
      toast.success('Fee entry updated successfully')
    },
  })
}

export function useDeleteTrusteeFeeEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trustee-fee-entries/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete fee entry')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trusteeFeeEntryKeys.all })
      toast.success('Fee entry deleted successfully')
    },
  })
}
