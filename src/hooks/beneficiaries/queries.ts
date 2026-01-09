/**
 * TanStack Query hooks for Beneficiary resource
 */

import { useQuery, useMutation, useQueryClient, queryOptions } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface Beneficiary {
  id: string
  entityId: string
  firstName: string
  lastName: string
  relationship: string | null
  relationshipType: string | null
  dob: string | null
  email: string | null
  phone: string | null
  streetAddress: string | null
  city: string | null
  state: string | null
  zip: string | null
  sharePercent: string | null
  distributionStandard: string | null
  informed: boolean
  releaseSigned: boolean
}

// Query Keys
export const beneficiaryKeys = {
  all: ['beneficiaries'] as const,
  byEntity: (entityId: string) => ['beneficiaries', 'entity', entityId] as const,
  detail: (id: string) => ['beneficiaries', id] as const,
}

// Query Options
export const beneficiariesQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? beneficiaryKeys.byEntity(entityId) : beneficiaryKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/beneficiaries?entityId=${entityId}` : '/api/beneficiaries'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Beneficiary[]>
    },
    enabled: entityId ? !!entityId : true,
  })

export const beneficiaryQueryOptions = (id: string) =>
  queryOptions({
    queryKey: beneficiaryKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/beneficiaries/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Beneficiary>
    },
    enabled: !!id,
  })

// Query Hooks
export function useBeneficiaries(entityId?: string) {
  return useQuery(beneficiariesQueryOptions(entityId))
}

export function useBeneficiary(id: string) {
  return useQuery(beneficiaryQueryOptions(id))
}

// Mutations
export function useCreateBeneficiary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (beneficiary: Partial<Beneficiary>) => {
      const res = await fetch('/api/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(beneficiary),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create beneficiary')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Beneficiary>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: beneficiaryKeys.all })
      queryClient.invalidateQueries({ queryKey: beneficiaryKeys.byEntity(data.entityId) })
      toast.success('Beneficiary created successfully')
    },
  })
}

export function useUpdateBeneficiary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Beneficiary> }) => {
      const res = await fetch(`/api/beneficiaries/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update beneficiary')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Beneficiary>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: beneficiaryKeys.all })
      queryClient.invalidateQueries({ queryKey: beneficiaryKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: beneficiaryKeys.detail(data.id) })
      toast.success('Beneficiary updated successfully')
    },
  })
}

export function useDeleteBeneficiary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/beneficiaries/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete beneficiary')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: beneficiaryKeys.all })
      toast.success('Beneficiary deleted successfully')
    },
  })
}
