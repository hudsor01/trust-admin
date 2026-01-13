/**
 * TanStack Query hooks for Distribution resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface Distribution {
  id: string
  beneficiaryId: string
  entityId: string
  distributionDate: string
  distributionType: string
  amount: string
  paymentMethod: string
  checkNumber: string | null
  hemsCategory: string | null
  hemsJustification: string | null
  isWithdrawal: boolean
  withdrawalRecordId: string | null
  form1099Sent: boolean
  form1099Date: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const distributionKeys = {
  all: ["distributions"] as const,
  byBeneficiary: (beneficiaryId: string) =>
    ["distributions", "beneficiary", beneficiaryId] as const,
  byEntity: (entityId: string) => ["distributions", "entity", entityId] as const,
  detail: (id: string) => ["distributions", id] as const,
}

// Query Options
export const distributionsQueryOptions = (beneficiaryId?: string, entityId?: string) =>
  queryOptions({
    queryKey: beneficiaryId
      ? distributionKeys.byBeneficiary(beneficiaryId)
      : entityId
        ? distributionKeys.byEntity(entityId)
        : distributionKeys.all,
    queryFn: async () => {
      let url = "/api/distributions"
      const params = new URLSearchParams()
      if (beneficiaryId) params.append("beneficiaryId", beneficiaryId)
      if (entityId) params.append("entityId", entityId)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = (await res.json()) as Distribution[]
      return data.sort(
        (a, b) => new Date(b.distributionDate).getTime() - new Date(a.distributionDate).getTime(),
      )
    },
    enabled: beneficiaryId ? !!beneficiaryId : entityId ? !!entityId : true,
  })

export const distributionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: distributionKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/distributions/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Distribution>
    },
    enabled: !!id,
  })

// Query Hooks
export function useDistributions(beneficiaryId?: string, entityId?: string) {
  return useQuery(distributionsQueryOptions(beneficiaryId, entityId))
}

export function useDistribution(id: string) {
  return useQuery(distributionQueryOptions(id))
}

// Mutations
export function useCreateDistribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (distribution: Partial<Distribution>) => {
      const res = await fetch("/api/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(distribution),
      })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === "VALIDATION_ERROR" && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join("\n")
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || "Failed to create distribution")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Distribution>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: distributionKeys.all })
      if (data.beneficiaryId) {
        queryClient.invalidateQueries({
          queryKey: distributionKeys.byBeneficiary(data.beneficiaryId),
        })
      }
      if (data.entityId) {
        queryClient.invalidateQueries({ queryKey: distributionKeys.byEntity(data.entityId) })
      }
      toast.success("Distribution created successfully")
    },
  })
}

export function useUpdateDistribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Distribution> }) => {
      const res = await fetch(`/api/distributions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        if (errorData.error?.code === "VALIDATION_ERROR" && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join("\n")
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || "Failed to update distribution")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Distribution>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: distributionKeys.all })
      if (data.beneficiaryId) {
        queryClient.invalidateQueries({
          queryKey: distributionKeys.byBeneficiary(data.beneficiaryId),
        })
      }
      if (data.entityId) {
        queryClient.invalidateQueries({ queryKey: distributionKeys.byEntity(data.entityId) })
      }
      queryClient.invalidateQueries({ queryKey: distributionKeys.detail(data.id) })
      toast.success("Distribution updated successfully")
    },
  })
}

export function useDeleteDistribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/distributions/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete distribution")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distributionKeys.all })
      toast.success("Distribution deleted successfully")
    },
  })
}
