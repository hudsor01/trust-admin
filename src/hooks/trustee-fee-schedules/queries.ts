/**
 * TanStack Query hooks for TrusteeFeeSchedule resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface TrusteeFeeSchedule {
  id: string
  entityId: string
  trusteeId: string
  executorFeePercent: string | null
  annualAssetPercent: string | null
  incomePercent: string | null
  hourlyRate: string | null
  effectiveDate: string
  endDate: string | null
  notes: string | null
  createdAt: string
}

// Query Keys
export const trusteeFeeScheduleKeys = {
  all: ["trustee-fee-schedules"] as const,
  byEntity: (entityId: string) => ["trustee-fee-schedules", "entity", entityId] as const,
  detail: (id: string) => ["trustee-fee-schedules", id] as const,
}

// Query Options
export const trusteeFeeSchedulesQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? trusteeFeeScheduleKeys.byEntity(entityId) : trusteeFeeScheduleKeys.all,
    queryFn: async () => {
      const url = entityId
        ? `/api/trustee-fee-schedules?entityId=${entityId}`
        : "/api/trustee-fee-schedules"
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = (await res.json()) as TrusteeFeeSchedule[]
      return data.sort(
        (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
      )
    },
    enabled: entityId ? !!entityId : true,
  })

export const trusteeFeeScheduleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: trusteeFeeScheduleKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/trustee-fee-schedules/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<TrusteeFeeSchedule>
    },
    enabled: !!id,
  })

// Query Hooks
export function useTrusteeFeeSchedules(entityId?: string) {
  return useQuery(trusteeFeeSchedulesQueryOptions(entityId))
}

export function useTrusteeFeeSchedule(id: string) {
  return useQuery(trusteeFeeScheduleQueryOptions(id))
}

// Mutations
export function useCreateTrusteeFeeSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (trusteeFeeSchedule: Partial<TrusteeFeeSchedule>) => {
      const res = await fetch("/api/trustee-fee-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trusteeFeeSchedule),
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
          toast.error(errorData.error?.message || "Failed to create fee schedule")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<TrusteeFeeSchedule>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trusteeFeeScheduleKeys.all })
      queryClient.invalidateQueries({ queryKey: trusteeFeeScheduleKeys.byEntity(data.entityId) })
      toast.success("Fee schedule created successfully")
    },
  })
}

// Note: No update mutation - fee schedules are immutable (hasUpdatedAt: false)

export function useDeleteTrusteeFeeSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trustee-fee-schedules/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete fee schedule")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trusteeFeeScheduleKeys.all })
      toast.success("Fee schedule deleted successfully")
    },
  })
}
