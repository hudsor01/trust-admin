/**
 * TanStack Query hooks for Artwork resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface Artwork {
  id: string
  entityId: string
  title: string
  artist: string | null
  medium: string | null
  dimensions: string | null
  acquisitionDate: string | null
  acquisitionCost: string | null
  location: string | null
  dodValue: string | null
  dodValueDate: string | null
  dodValueType: string | null
  transferStatus: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const artworkKeys = {
  all: ["artwork"] as const,
  byEntity: (entityId: string) => ["artwork", "entity", entityId] as const,
  detail: (id: string) => ["artwork", id] as const,
}

// Query Options
export const artworkQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? artworkKeys.byEntity(entityId) : artworkKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/artwork?entityId=${entityId}` : "/api/artwork"
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Artwork[]>
    },
    enabled: entityId ? !!entityId : true,
  })

export const artworkItemQueryOptions = (id: string) =>
  queryOptions({
    queryKey: artworkKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/artwork/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Artwork>
    },
    enabled: !!id,
  })

// Query Hooks
export function useArtwork(entityId?: string) {
  return useQuery(artworkQueryOptions(entityId))
}

export function useArtworkItem(id: string) {
  return useQuery(artworkItemQueryOptions(id))
}

// Mutations
export function useCreateArtwork() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (artwork: Partial<Artwork>) => {
      const res = await fetch("/api/artwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(artwork),
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
          toast.error(errorData.error?.message || "Failed to create artwork")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Artwork>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: artworkKeys.all })
      queryClient.invalidateQueries({ queryKey: artworkKeys.byEntity(data.entityId) })
      toast.success("Artwork created successfully")
    },
  })
}

export function useUpdateArtwork() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Artwork> }) => {
      const res = await fetch(`/api/artwork/${id}`, {
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
          toast.error(errorData.error?.message || "Failed to update artwork")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Artwork>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: artworkKeys.all })
      queryClient.invalidateQueries({ queryKey: artworkKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: artworkKeys.detail(data.id) })
      toast.success("Artwork updated successfully")
    },
  })
}

export function useDeleteArtwork() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/artwork/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete artwork")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artworkKeys.all })
      toast.success("Artwork deleted successfully")
    },
  })
}
