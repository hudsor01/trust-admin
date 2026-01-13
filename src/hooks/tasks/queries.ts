/**
 * TanStack Query hooks for Task resource
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface Task {
  id: string
  title: string
  category: string
  completed: boolean
  notes: string | null
  dueDate: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Query Keys
export const taskKeys = {
  all: ["tasks"] as const,
  detail: (id: string) => ["tasks", id] as const,
}

// Query Options
export const tasksQueryOptions = () =>
  queryOptions({
    queryKey: taskKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/tasks")
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = (await res.json()) as Task[]
      return data.sort((a, b) => a.sortOrder - b.sortOrder)
    },
  })

export const taskQueryOptions = (id: string) =>
  queryOptions({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<Task>
    },
    enabled: !!id,
  })

// Query Hooks
export function useTasks() {
  return useQuery(tasksQueryOptions())
}

export function useTask(id: string) {
  return useQuery(taskQueryOptions(id))
}

// Mutations
export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
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
          toast.error(errorData.error?.message || "Failed to create task")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<Task>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      toast.success("Task created successfully")
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
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
          toast.error(errorData.error?.message || "Failed to update task")
        }
        throw new Error(errorData.error?.message || `Failed to update: ${res.status}`)
      }
      return res.json() as Promise<Task>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(data.id) })
      toast.success("Task updated successfully")
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        toast.error(errorData.error?.message || "Failed to delete task")
        throw new Error(errorData.error?.message || `Failed to delete: ${res.status}`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      toast.success("Task deleted successfully")
    },
  })
}
