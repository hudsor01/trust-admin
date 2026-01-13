/**
 * TanStack Query hooks for Vehicle resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface Vehicle {
  id: string
  entityId: string
  year: number
  make: string
  model: string
  vin: string
  color: string | null
  licensePlate: string | null
  mileage: number | null
  titleStatus: string
  acquisitionDate: string | null
  acquisitionCost: string | null
  dodValue: string | null
  dodValueDate: string | null
  dodValueType: string | null
  status: string
  transferStatus: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

// Query Keys
export const vehicleKeys = {
  all: ["vehicles"] as const,
  byEntity: (entityId: string) => ["vehicles", "entity", entityId] as const,
  detail: (id: string) => ["vehicles", id] as const,
}

// Query Options
export const vehiclesQueryOptions = (entityId?: string) =>
  queryOptions({
    queryKey: entityId ? vehicleKeys.byEntity(entityId) : vehicleKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/vehicles?entityId=${entityId}` : "/api/vehicles"
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Vehicle[]>
    },
    enabled: entityId ? !!entityId : true,
  })

export const vehicleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: vehicleKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Vehicle>
    },
    enabled: !!id,
  })

// Query Hooks
export function useVehicles(entityId?: string) {
  return useQuery(vehiclesQueryOptions(entityId))
}

export function useVehicle(id: string) {
  return useQuery(vehicleQueryOptions(id))
}

// Mutations
export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vehicle: Partial<Vehicle>) => {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicle),
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
          toast.error(errorData.error?.message || "Failed to create vehicle")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Vehicle>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.byEntity(data.entityId) })
      toast.success("Vehicle created successfully")
    },
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
      const res = await fetch(`/api/vehicles/${id}`, {
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
          toast.error(errorData.error?.message || "Failed to update vehicle")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Vehicle>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(data.id) })
      toast.success("Vehicle updated successfully")
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete vehicle")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      toast.success("Vehicle deleted successfully")
    },
  })
}
