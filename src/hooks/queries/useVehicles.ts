/**
 * TanStack Query hooks for Vehicle resource
 *
 * Replaces: Custom createQueryHook pattern
 * Benefits: Automatic caching, deduplication, DevTools, retries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types
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

// Query keys
export const vehicleKeys = {
  all: ['vehicles'] as const,
  byEntity: (entityId: string) => ['vehicles', 'entity', entityId] as const,
  detail: (id: string) => ['vehicles', id] as const,
}

// Query hooks
export function useVehicles(entityId?: string) {
  return useQuery({
    queryKey: entityId ? vehicleKeys.byEntity(entityId) : vehicleKeys.all,
    queryFn: async () => {
      const url = entityId ? `/api/vehicles?entityId=${entityId}` : '/api/vehicles'
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Vehicle[]>
    },
    enabled: entityId ? !!entityId : true, // Only fetch when entityId is provided if filtering
  })
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${id}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Vehicle>
    },
    enabled: !!id,
  })
}

// Mutation hooks
export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vehicle: Partial<Vehicle>) => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))

        // Show validation errors
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to create vehicle')
        }

        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }

      return res.json() as Promise<Vehicle>
    },
    onSuccess: (data) => {
      // Invalidate both all vehicles and entity-specific queries
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.byEntity(data.entityId) })
      toast.success('Vehicle created successfully')
    },
    onError: (error) => {
      // Error toast already shown in mutationFn
      console.error('Failed to create vehicle:', error)
    },
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))

        // Show validation errors
        if (errorData.error?.code === 'VALIDATION_ERROR' && errorData.error.details?.fields) {
          const fields = errorData.error.details.fields as Record<string, string>
          const fieldErrors = Object.entries(fields)
            .map(([field, message]) => `${field}: ${message}`)
            .join('\n')
          toast.error(errorData.error.message, { description: fieldErrors })
        } else {
          toast.error(errorData.error?.message || 'Failed to update vehicle')
        }

        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }

      return res.json() as Promise<Vehicle>
    },
    onSuccess: (data) => {
      // Invalidate all vehicles, entity-specific, and detail queries
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.byEntity(data.entityId) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(data.id) })
      toast.success('Vehicle updated successfully')
    },
    onError: (error) => {
      console.error('Failed to update vehicle:', error)
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || 'Failed to delete vehicle')
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      // Invalidate all vehicle queries
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
      toast.success('Vehicle deleted successfully')
    },
    onError: (error) => {
      console.error('Failed to delete vehicle:', error)
    },
  })
}
