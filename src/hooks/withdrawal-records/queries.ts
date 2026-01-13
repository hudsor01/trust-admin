/**
 * TanStack Query hooks for WithdrawalRecord resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface WithdrawalRecord {
  id: string
  beneficiaryId: string
  entityId: string
  withdrawalType: string
  eligibleDate: string
  eligibleAmount: string
  withdrawnAmount: string | null
  remainingAmount: string | null
  status: string | null
  exercisedDate: string | null
  distributionId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const withdrawalRecordKeys = {
  all: ["withdrawal-records"] as const,
  byBeneficiary: (beneficiaryId: string) =>
    ["withdrawal-records", "beneficiary", beneficiaryId] as const,
  detail: (id: string) => ["withdrawal-records", id] as const,
}

// Query Options
export const withdrawalRecordsQueryOptions = (beneficiaryId?: string) =>
  queryOptions({
    queryKey: beneficiaryId
      ? withdrawalRecordKeys.byBeneficiary(beneficiaryId)
      : withdrawalRecordKeys.all,
    queryFn: async () => {
      const url = beneficiaryId
        ? `/api/withdrawal-records?beneficiaryId=${beneficiaryId}`
        : "/api/withdrawal-records"
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = (await res.json()) as WithdrawalRecord[]
      return data.sort(
        (a, b) => new Date(a.eligibleDate).getTime() - new Date(b.eligibleDate).getTime(),
      )
    },
    enabled: beneficiaryId ? !!beneficiaryId : true,
  })

export const withdrawalRecordQueryOptions = (id: string) =>
  queryOptions({
    queryKey: withdrawalRecordKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/withdrawal-records/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<WithdrawalRecord>
    },
    enabled: !!id,
  })

// Query Hooks
export function useWithdrawalRecords(beneficiaryId?: string) {
  return useQuery(withdrawalRecordsQueryOptions(beneficiaryId))
}

export function useWithdrawalRecord(id: string) {
  return useQuery(withdrawalRecordQueryOptions(id))
}

// Mutations
export function useCreateWithdrawalRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (withdrawalRecord: Partial<WithdrawalRecord>) => {
      const res = await fetch("/api/withdrawal-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withdrawalRecord),
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
          toast.error(errorData.error?.message || "Failed to create record")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<WithdrawalRecord>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: withdrawalRecordKeys.all })
      queryClient.invalidateQueries({
        queryKey: withdrawalRecordKeys.byBeneficiary(data.beneficiaryId),
      })
      toast.success("Record created successfully")
    },
  })
}

export function useUpdateWithdrawalRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WithdrawalRecord> }) => {
      const res = await fetch(`/api/withdrawal-records/${id}`, {
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
          toast.error(errorData.error?.message || "Failed to update record")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<WithdrawalRecord>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: withdrawalRecordKeys.all })
      queryClient.invalidateQueries({
        queryKey: withdrawalRecordKeys.byBeneficiary(data.beneficiaryId),
      })
      queryClient.invalidateQueries({ queryKey: withdrawalRecordKeys.detail(data.id) })
      toast.success("Record updated successfully")
    },
  })
}

export function useDeleteWithdrawalRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/withdrawal-records/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete record")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: withdrawalRecordKeys.all })
      toast.success("Record deleted successfully")
    },
  })
}
