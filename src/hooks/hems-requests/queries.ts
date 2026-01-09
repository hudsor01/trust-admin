/**
 * TanStack Query hooks for HemsRequest resource
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface HemsRequest {
  id: string
  beneficiaryId: string
  entityId: string
  category: string
  amountRequested: string
  justification: string
  supportingDocPath: string | null
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  approvedAmount: string | null
  distributionId: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const hemsRequestKeys = {
  all: ['hems-requests'] as const,
  byBeneficiary: (beneficiaryId: string) => ['hems-requests', 'beneficiary', beneficiaryId] as const,
  detail: (id: string) => ['hems-requests', id] as const,
}

// Queries
export function useHemsRequests(beneficiaryId?: string) {
  return useQuery({
    queryKey: beneficiaryId ? hemsRequestKeys.byBeneficiary(beneficiaryId) : hemsRequestKeys.all,
    queryFn: async () => {
      const url = beneficiaryId ? `/api/hems-requests?beneficiaryId=${beneficiaryId}` : '/api/hems-requests'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = await res.json() as HemsRequest[]
      return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
    enabled: beneficiaryId ? !!beneficiaryId : true,
  })
}

export function useHemsRequest(id: string) {
  return useQuery({
    queryKey: hemsRequestKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/hems-requests/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<HemsRequest>
    },
    enabled: !!id,
  })
}

// Mutations
export function useCreateHemsRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (hemsRequest: Partial<HemsRequest>) => {
      const res = await fetch('/api/hems-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hemsRequest),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields).map(([field, message]) => `${field}: ${message}`).join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create HEMS request')
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<HemsRequest>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: hemsRequestKeys.all })
      queryClient.invalidateQueries({ queryKey: hemsRequestKeys.byBeneficiary(data.beneficiaryId) })
      toast.success('HEMS request created successfully')
    },
  })
}

export function useUpdateHemsRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HemsRequest> }) => {
      const res = await fetch(`/api/hems-requests/${id}`, {
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
          toast.error(errorData.error?.message || 'Failed to update HEMS request')
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<HemsRequest>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: hemsRequestKeys.all })
      queryClient.invalidateQueries({ queryKey: hemsRequestKeys.byBeneficiary(data.beneficiaryId) })
      queryClient.invalidateQueries({ queryKey: hemsRequestKeys.detail(data.id) })
      toast.success('HEMS request updated successfully')
    },
  })
}

export function useDeleteHemsRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hems-requests/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete HEMS request')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hemsRequestKeys.all })
      toast.success('HEMS request deleted successfully')
    },
  })
}
