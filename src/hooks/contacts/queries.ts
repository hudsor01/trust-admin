/**
 * TanStack Query hooks for Contact resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface Contact {
  id: string
  name: string
  company: string | null
  role: string
  email: string | null
  phone: string | null
  dob: string | null
  streetAddress: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
}

// Query Keys
export const contactKeys = {
  all: ["contacts"] as const,
  detail: (id: string) => ["contacts", id] as const,
}

// Query Options
export const contactsQueryOptions = () =>
  queryOptions({
    queryKey: contactKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/contacts")
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = (await res.json()) as Contact[]
      return data.sort((a, b) => a.name.localeCompare(b.name))
    },
  })

export const contactQueryOptions = (id: string) =>
  queryOptions({
    queryKey: contactKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Contact>
    },
    enabled: !!id,
  })

// Query Hooks
export function useContacts() {
  return useQuery(contactsQueryOptions())
}

export function useContact(id: string) {
  return useQuery(contactQueryOptions(id))
}

// Mutations
export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (contact: Partial<Contact>) => {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
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
          toast.error(errorData.error?.message || "Failed to create contact")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Contact>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all })
      toast.success("Contact created successfully")
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const res = await fetch(`/api/contacts/${id}`, {
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
          toast.error(errorData.error?.message || "Failed to update contact")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Contact>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all })
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(data.id) })
      toast.success("Contact updated successfully")
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete contact")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.all })
      toast.success("Contact deleted successfully")
    },
  })
}
