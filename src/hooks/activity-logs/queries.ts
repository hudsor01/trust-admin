/**
 * TanStack Query hooks for ActivityLog resource
 * Note: Activity logs are immutable audit records (no updates or deletes)
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface ActivityLog {
  id: string
  tableName: string
  recordId: string
  action: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  changedBy: string
  ipAddress: string | null
  createdAt: string
}

// Query Keys
export const activityLogKeys = {
  all: ["activity-logs"] as const,
  detail: (id: string) => ["activity-logs", id] as const,
}

// Query Options
export const activityLogsQueryOptions = () =>
  queryOptions({
    queryKey: activityLogKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/activity-logs")
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      const data = (await res.json()) as ActivityLog[]
      return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
  })

export const activityLogQueryOptions = (id: string) =>
  queryOptions({
    queryKey: activityLogKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/activity-logs/${id}`)
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: { message: `HTTP ${res.status}` } }))
        throw new Error(errorData.error?.message || `Failed to fetch: ${res.status}`)
      }
      return res.json() as Promise<ActivityLog>
    },
    enabled: !!id,
  })

// Query Hooks
export function useActivityLogs() {
  return useQuery(activityLogsQueryOptions())
}

export function useActivityLog(id: string) {
  return useQuery(activityLogQueryOptions(id))
}

// Mutations
export function useCreateActivityLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (activityLog: Partial<ActivityLog>) => {
      const res = await fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityLog),
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
          toast.error(errorData.error?.message || "Failed to create activity log")
        }
        throw new Error(errorData.error?.message || `Failed to create: ${res.status}`)
      }
      return res.json() as Promise<ActivityLog>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityLogKeys.all })
      toast.success("Activity log created successfully")
    },
  })
}

// Note: No update or delete mutations - activity logs are immutable audit records
