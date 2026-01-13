/**
 * TanStack Query hooks for LiabilityPayment resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface LiabilityPayment {
  id: string
  liabilityId: string
  paymentDate: string
  amount: string
  principalPortion: string | null
  interestPortion: string | null
  escrowPortion: string | null
  paymentMethod: string | null
  checkNumber: string | null
  confirmationNumber: string | null
  notes: string | null
  createdAt: string
}

// Query Keys
export const liabilityPaymentKeys = {
  all: ["liability-payments"] as const,
  byLiability: (liabilityId: string) => ["liability-payments", "liability", liabilityId] as const,
  detail: (id: string) => ["liability-payments", id] as const,
}

// Query Options
export const liabilityPaymentsQueryOptions = (liabilityId?: string) =>
  queryOptions({
    queryKey: liabilityId
      ? liabilityPaymentKeys.byLiability(liabilityId)
      : liabilityPaymentKeys.all,
    queryFn: async () => {
      const url = liabilityId
        ? `/api/liability-payments?liabilityId=${liabilityId}`
        : "/api/liability-payments"
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = (await res.json()) as LiabilityPayment[]
      return data.sort(
        (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
      )
    },
    enabled: liabilityId ? !!liabilityId : true,
  })

export const liabilityPaymentQueryOptions = (id: string) =>
  queryOptions({
    queryKey: liabilityPaymentKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/liability-payments/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<LiabilityPayment>
    },
    enabled: !!id,
  })

// Query Hooks
export function useLiabilityPayments(liabilityId?: string) {
  return useQuery(liabilityPaymentsQueryOptions(liabilityId))
}

export function useLiabilityPayment(id: string) {
  return useQuery(liabilityPaymentQueryOptions(id))
}

// Mutations
export function useCreateLiabilityPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (liabilityPayment: Partial<LiabilityPayment>) => {
      const res = await fetch("/api/liability-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(liabilityPayment),
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
          toast.error(errorData.error?.message || "Failed to create liability payment")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<LiabilityPayment>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liabilityPaymentKeys.all })
      queryClient.invalidateQueries({
        queryKey: liabilityPaymentKeys.byLiability(data.liabilityId),
      })
      toast.success("Liability payment created successfully")
    },
  })
}

export function useUpdateLiabilityPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LiabilityPayment> }) => {
      const res = await fetch(`/api/liability-payments/${id}`, {
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
          toast.error(errorData.error?.message || "Failed to update liability payment")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<LiabilityPayment>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liabilityPaymentKeys.all })
      queryClient.invalidateQueries({
        queryKey: liabilityPaymentKeys.byLiability(data.liabilityId),
      })
      queryClient.invalidateQueries({ queryKey: liabilityPaymentKeys.detail(data.id) })
      toast.success("Liability payment updated successfully")
    },
  })
}

export function useDeleteLiabilityPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/liability-payments/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete liability payment")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liabilityPaymentKeys.all })
      toast.success("Liability payment deleted successfully")
    },
  })
}
