/**
 * TanStack Query hooks for BankAccount resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface BankAccount {
  id: string
  entityId: string
  institution: string
  accountType: string
  accountName: string | null
  accountNumber: string
  routingNumber: string | null
  dodValue: string | null
  dodValueDate: string | null
  currentBalance: string | null
  currentBalanceDate: string | null
  status: string
  transferStatus: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const bankAccountKeys = {
  all: ["bank-accounts"] as const,
  byEntity: (entityId: string) => ["bank-accounts", "entity", entityId] as const,
  detail: (id: string) => ["bank-accounts", id] as const,
}

// Query Options
export const bankAccountsQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? bankAccountKeys.byEntity(entityId) : bankAccountKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/bank-accounts?entityId=${entityId}` : "/api/bank-accounts"
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<BankAccount[]>
    },
    enabled: entityId ? !!entityId : true,
  })

export const bankAccountQueryOptions = (id: string) =>
  queryOptions({
    queryKey: bankAccountKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/bank-accounts/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<BankAccount>
    },
    enabled: !!id,
  })

// Query Hooks
export function useBankAccounts(entityId?: string) {
  return useQuery(bankAccountsQueryOptions(entityId))
}

export function useBankAccount(id: string) {
  return useQuery(bankAccountQueryOptions(id))
}

// Mutations
export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bankAccount: Partial<BankAccount>) => {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankAccount),
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
          toast.error(errorData.error?.message || "Failed to create bank account")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<BankAccount>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all })
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.byEntity(data.entityId) })
      toast.success("Bank account created successfully")
    },
  })
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BankAccount> }) => {
      const res = await fetch(`/api/bank-accounts/${id}`, {
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
          toast.error(errorData.error?.message || "Failed to update bank account")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<BankAccount>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all })
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.detail(data.id) })
      toast.success("Bank account updated successfully")
    },
  })
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bank-accounts/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete bank account")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all })
      toast.success("Bank account deleted successfully")
    },
  })
}
