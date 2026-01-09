/**
 * TanStack Query hooks for TrustAccounting resource
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface TrustAccounting {
  id: string
  entityId: string
  accountingDate: string
  entryType: string
  incomeType: string | null
  expenseType: string | null
  amount: string
  description: string
  sourceAssetType: string | null
  sourceAssetId: string | null
  isPrincipal: boolean | null
  taxDeductible: boolean | null
  documentPath: string | null
  vendor: string | null
  checkNumber: string | null
  reconciled: boolean | null
  reconciledDate: string | null
  fiscalYear: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const trustAccountingKeys = {
  all: ['trust-accounting'] as const,
  byEntity: (entityId: string) => ['trust-accounting', 'entity', entityId] as const,
  detail: (id: string) => ['trust-accounting', id] as const,
}

// Queries
export function useTrustAccounting(entityId?: string) {
  return useQuery({
    queryKey: entityId ? trustAccountingKeys.byEntity(entityId) : trustAccountingKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/trust-accounting?entityId=${entityId}` : '/api/trust-accounting'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = await res.json() as TrustAccounting[]
      return data.sort((a, b) => new Date(b.accountingDate).getTime() - new Date(a.accountingDate).getTime())
    },
    enabled: entityId ? !!entityId : true,
  })
}

export function useTrustAccountingEntry(id: string) {
  return useQuery({
    queryKey: trustAccountingKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/trust-accounting/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<TrustAccounting>
    },
    enabled: !!id,
  })
}

// Mutations
export function useCreateTrustAccountingEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Partial<TrustAccounting>) => {
      const res = await fetch('/api/trust-accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create entry')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<TrustAccounting>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trustAccountingKeys.all })
      queryClient.invalidateQueries({ queryKey: trustAccountingKeys.byEntity(data.entityId) })
      toast.success('Entry created successfully')
    },
  })
}

export function useUpdateTrustAccountingEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TrustAccounting> }) => {
      const res = await fetch(`/api/trust-accounting/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update entry')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<TrustAccounting>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trustAccountingKeys.all })
      queryClient.invalidateQueries({ queryKey: trustAccountingKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: trustAccountingKeys.detail(data.id) })
      toast.success('Entry updated successfully')
    },
  })
}

export function useDeleteTrustAccountingEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trust-accounting/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete entry')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trustAccountingKeys.all })
      toast.success('Entry deleted successfully')
    },
  })
}
