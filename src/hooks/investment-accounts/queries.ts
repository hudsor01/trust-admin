/**
 * TanStack Query hooks for InvestmentAccount resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface InvestmentAccount {
  id: string
  entityId: string
  institution: string
  accountType: string
  accountName: string | null
  accountNumber: string
  dodValue: string | null
  dodValueDate: string | null
  costBasis: string | null
  currentBalance: string | null
  currentBalanceDate: string | null
  status: string
  transferStatus: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const investmentAccountKeys = {
  all: ["investment-accounts"] as const,
  byEntity: (entityId: string) => ["investment-accounts", "entity", entityId] as const,
  detail: (id: string) => ["investment-accounts", id] as const,
}

// Query Options
export const investmentAccountsQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? investmentAccountKeys.byEntity(entityId) : investmentAccountKeys.all,
    queryFn: async () => {
      const url = entityId
        ? `/api/investment-accounts?entityId=${entityId}`
        : "/api/investment-accounts"
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<InvestmentAccount[]>
    },
    enabled: entityId ? !!entityId : true,
  })

export const investmentAccountQueryOptions = (id: string) =>
  queryOptions({
    queryKey: investmentAccountKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/investment-accounts/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<InvestmentAccount>
    },
    enabled: !!id,
  })

// Query Hooks
export function useInvestmentAccounts(entityId?: string) {
  return useQuery(investmentAccountsQueryOptions(entityId))
}

export function useInvestmentAccount(id: string) {
  return useQuery(investmentAccountQueryOptions(id))
}

// Mutations
export function useCreateInvestmentAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (investmentAccount: Partial<InvestmentAccount>) => {
      const res = await fetch("/api/investment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(investmentAccount),
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
          toast.error(errorData.error?.message || "Failed to create investment account")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<InvestmentAccount>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: investmentAccountKeys.all })
      queryClient.invalidateQueries({ queryKey: investmentAccountKeys.byEntity(data.entityId) })
      toast.success("Investment account created successfully")
    },
  })
}

export function useUpdateInvestmentAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InvestmentAccount> }) => {
      const res = await fetch(`/api/investment-accounts/${id}`, {
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
          toast.error(errorData.error?.message || "Failed to update investment account")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<InvestmentAccount>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: investmentAccountKeys.all })
      queryClient.invalidateQueries({ queryKey: investmentAccountKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: investmentAccountKeys.detail(data.id) })
      toast.success("Investment account updated successfully")
    },
  })
}

export function useDeleteInvestmentAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/investment-accounts/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete investment account")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentAccountKeys.all })
      toast.success("Investment account deleted successfully")
    },
  })
}
