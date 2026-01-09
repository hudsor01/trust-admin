import { useState, useEffect } from "react"

export interface ActivityLog {
  id: string
  action: "INSERT" | "UPDATE" | "DELETE"
  tableName: string
  recordId: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  changedBy: string | null
  createdAt: string
}

export function useActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    const res = await fetch("/api/activity-logs")
    const data = await res.json()
    // Sort by createdAt descending
    const sorted = data.sort((a: ActivityLog, b: ActivityLog) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    setLogs(sorted)
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  return { logs, loading, refetch: fetchLogs }
}
