"use client"

import { useState, useEffect } from "react"
import {
  AlertTriangle,
  Check,
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { formatDate, formatCurrency, calculateAge, getWithdrawalStatus } from "../utils/formatters"

interface Task {
  id: string
  title: string
  category: string
  completed: boolean
  notes: string | null
  dueDate: string | null
  sortOrder: number
}

interface Beneficiary {
  id: string
  firstName: string
  lastName: string
  relationshipType: string
  sharePercent: string
  dob: string | null
  withdrawalAge1: number | null
  withdrawalAge2: number | null
  withdrawalPct1: number | null
  withdrawalPct2: number | null
  parentId: string | null
}

interface WithdrawalRecord {
  id: string
  beneficiaryId: string
  withdrawalType: string
  eligibleDate: string
  eligibleAmount: string
  withdrawnAmount: string | null
  status: string
}

interface TrustAccountingEntry {
  id: string
  entryType: string
  incomeType: string | null
  expenseType: string | null
  amount: string
  description: string | null
  isPrincipal: boolean
  taxDeductible: boolean
  accountingDate: string
}

interface HemsRequest {
  id: string
  beneficiaryId: string
  category: string
  amountRequested: string
  status: string
  createdAt: string
}

interface Entity {
  id: string
  name: string
  grantorName: string | null
  decedent: string | null
  dod: string | null
  trustType: string | null
  status: string
}

const CATEGORIES = [
  { value: "INVENTORY", label: "Inventory & Documentation" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "BENEFICIARY", label: "Beneficiary" },
  { value: "LEGAL", label: "Legal" },
  { value: "ADMINISTRATIVE", label: "Administrative" },
  { value: "OTHER", label: "Other" },
]

export function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [withdrawalRecords, setWithdrawalRecords] = useState<WithdrawalRecord[]>([])
  const [accountingEntries, setAccountingEntries] = useState<TrustAccountingEntry[]>([])
  const [hemsRequests, setHemsRequests] = useState<HemsRequest[]>([])
  const [entity, setEntity] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState("OTHER")
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetchTasks(),
      fetchBeneficiaries(),
      fetchWithdrawalRecords(),
      fetchAccountingEntries(),
      fetchHemsRequests(),
      fetchEntity(),
    ]).finally(() => setLoading(false))
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks")
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    }
  }

  const fetchBeneficiaries = async () => {
    try {
      const res = await fetch("/api/beneficiaries")
      if (res.ok) {
        const data = await res.json()
        setBeneficiaries(data)
      }
    } catch (error) {
      console.error("Failed to fetch beneficiaries:", error)
    }
  }

  const fetchWithdrawalRecords = async () => {
    try {
      const res = await fetch("/api/withdrawal-records")
      if (res.ok) {
        const data = await res.json()
        setWithdrawalRecords(data)
      }
    } catch (error) {
      console.error("Failed to fetch withdrawal records:", error)
    }
  }

  const fetchAccountingEntries = async () => {
    try {
      const res = await fetch("/api/trust-accounting")
      if (res.ok) {
        const data = await res.json()
        setAccountingEntries(data)
      }
    } catch (error) {
      console.error("Failed to fetch accounting entries:", error)
    }
  }

  const fetchHemsRequests = async () => {
    try {
      const res = await fetch("/api/hems-requests")
      if (res.ok) {
        const data = await res.json()
        setHemsRequests(data)
      }
    } catch (error) {
      console.error("Failed to fetch HEMS requests:", error)
    }
  }

  const fetchEntity = async () => {
    try {
      const res = await fetch("/api/entities")
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          const prioritized = data.sort((a: Entity, b: Entity) => {
            if (a.dod && !b.dod) return -1
            if (!a.dod && b.dod) return 1
            if (a.name.includes("Hudson") && !b.name.includes("Hudson")) return -1
            if (!a.name.includes("Hudson") && b.name.includes("Hudson")) return 1
            return 0
          })
          setEntity(prioritized[0])
        }
      }
    } catch (error) {
      console.error("Failed to fetch entity:", error)
    }
  }

  const toggleTask = async (task: Task) => {
    const updated = { ...task, completed: !task.completed }
    setTasks(tasks.map(t => t.id === task.id ? updated : t))

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      })
    } catch (error) {
      console.error("Failed to update task:", error)
      setTasks(tasks)
    }
  }

  const addTask = async () => {
    if (!newTaskTitle.trim()) return

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          category: newTaskCategory,
          sortOrder: tasks.length,
        }),
      })
      if (res.ok) {
        const newTask = await res.json()
        setTasks([...tasks, newTask])
        setNewTaskTitle("")
      }
    } catch (error) {
      console.error("Failed to add task:", error)
    }
  }

  const updateTaskNotes = async (taskId: string, notes: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      setTasks(tasks.map(t => t.id === taskId ? { ...t, notes } : t))
    } catch (error) {
      console.error("Failed to update notes:", error)
    }
  }

  // Calculate task stats
  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Calculate overdue tasks
  const today = new Date()
  const overdueTasks = tasks.filter(t => {
    if (t.completed || !t.dueDate) return false
    return new Date(t.dueDate) < today
  })

  // Group tasks by category
  const groupedTasks = CATEGORIES.map(cat => ({
    ...cat,
    tasks: tasks.filter(t => t.category === cat.value).sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (a.dueDate && !b.dueDate) return -1
      if (!a.dueDate && b.dueDate) return 1
      return a.sortOrder - b.sortOrder
    }),
  })).filter(cat => cat.tasks.length > 0)

  // Calculate accounting totals
  const incomeTotal = accountingEntries
    .filter(e => e.entryType === "INCOME")
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
  const expenseTotal = accountingEntries
    .filter(e => e.entryType === "EXPENSE")
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0)
  const netIncome = incomeTotal - expenseTotal

  // Get grandchildren with withdrawal info
  const grandchildren = beneficiaries.filter(b => b.relationshipType === "GRANDCHILD")

  // Build withdrawal eligibility data
  const withdrawalData = grandchildren.map(gc => {
    const records = withdrawalRecords.filter(wr => wr.beneficiaryId === gc.id)
    const age25Record = records.find(r => r.withdrawalType === "AGE_25")
    const age30Record = records.find(r => r.withdrawalType === "AGE_30")

    return {
      beneficiary: gc,
      currentAge: gc.dob ? calculateAge(gc.dob) : null,
      age25: age25Record ? {
        eligibleDate: age25Record.eligibleDate,
        status: getWithdrawalStatus(age25Record.eligibleDate),
        withdrawn: age25Record.status === "COMPLETE",
      } : null,
      age30: age30Record ? {
        eligibleDate: age30Record.eligibleDate,
        status: getWithdrawalStatus(age30Record.eligibleDate),
        withdrawn: age30Record.status === "COMPLETE",
      } : null,
    }
  }).sort((a, b) => {
    const aNext = a.age25?.status.daysUntil ?? a.age30?.status.daysUntil ?? 9999
    const bNext = b.age25?.status.daysUntil ?? b.age30?.status.daysUntil ?? 9999
    return aNext - bNext
  })

  // Count upcoming eligibilities
  const eligibleNow = withdrawalData.filter(w =>
    (w.age25 && w.age25.status.daysUntil === 0 && !w.age25.withdrawn) ||
    (w.age30 && w.age30.status.daysUntil === 0 && !w.age30.withdrawn)
  ).length

  // Count upcoming milestones (within 90 days)
  const upcomingMilestones = withdrawalData.filter(w => {
    const age25Soon = w.age25 && !w.age25.withdrawn && w.age25.status.daysUntil > 0 && w.age25.status.daysUntil <= 90
    const age30Soon = w.age30 && !w.age30.withdrawn && w.age30.status.daysUntil > 0 && w.age30.status.daysUntil <= 90
    return age25Soon || age30Soon
  })

  // Pending HEMS requests
  const pendingHems = hemsRequests.filter(r => r.status === "PENDING")
  const pendingHemsTotal = pendingHems.reduce(
    (sum, r) => sum + parseFloat(r.amountRequested || "0"),
    0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Trust Overview Header */}
      {entity && (
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            {entity.name}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {entity.trustType === "IRREVOCABLE" ? "Irrevocable" : "Revocable"} · Texas · Established Sep 18, 2024
          </p>
          <div className="flex gap-8">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Grantor
              </p>
              <p className="text-sm">{entity.grantorName || "—"}</p>
            </div>
            {entity.dod && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  Date of Death
                </p>
                <p className="text-sm">{formatDate(entity.dod)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Status
              </p>
              <div className="flex items-center gap-2">
                <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                <span className="text-sm">Active Administration</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {overdueTasks.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-700 dark:text-amber-300 font-medium">
            {overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""} require attention
          </AlertDescription>
        </Alert>
      )}

      {eligibleNow > 0 && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
            {eligibleNow} grandchild{eligibleNow > 1 ? "ren are" : " is"} now eligible for withdrawal
          </AlertDescription>
        </Alert>
      )}

      {pendingHems.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-700 dark:text-blue-300 font-medium">
            {pendingHems.length} HEMS request{pendingHems.length > 1 ? "s" : ""} pending review ({formatCurrency(pendingHemsTotal)})
            {" — "}
            <a href="#/hems-queue" className="underline hover:no-underline">
              Review now
            </a>
          </AlertDescription>
        </Alert>
      )}

      {upcomingMilestones.length > 0 && (
        <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
          <Circle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-purple-700 dark:text-purple-300 font-medium">
            {upcomingMilestones.length} beneficiar{upcomingMilestones.length > 1 ? "ies" : "y"} approaching withdrawal eligibility in the next 90 days
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="@container">
        <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
              Task Progress
            </p>
            <p className="text-2xl font-semibold mb-2">
              {completedCount} of {totalCount}
            </p>
            <Progress value={progressPercent} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">{progressPercent}% complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
              Total Income
            </p>
            <p className="text-2xl font-semibold mb-2">
              {formatCurrency(incomeTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {accountingEntries.filter(e => e.entryType === "INCOME").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
              Total Expenses
            </p>
            <p className="text-2xl font-semibold mb-2">
              {formatCurrency(expenseTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {accountingEntries.filter(e => e.entryType === "EXPENSE").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
              Net Position
            </p>
            <p className={cn(
              "text-2xl font-semibold mb-2",
              netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {formatCurrency(netIncome)}
            </p>
            <p className="text-xs text-muted-foreground">
              {netIncome >= 0 ? "+" : ""}{incomeTotal > 0 ? Math.round((netIncome / incomeTotal) * 100) : 0}% margin
            </p>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
        </TabsList>

        {/* Tasks Panel */}
        <TabsContent value="tasks" className="space-y-6 pt-4">
          {/* Add Task */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  className="flex-1"
                />
                <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addTask}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Task List by Category */}
          {groupedTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No tasks yet. Add your first task above.</p>
              </CardContent>
            </Card>
          ) : (
            groupedTasks.map((category) => (
              <div key={category.value}>
                {/* Category Header */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                    {category.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {category.tasks.filter(t => t.completed).length} of {category.tasks.length} tasks
                  </p>
                </div>

                {/* Task Card */}
                <Card>
                  <div className="divide-y">
                    {category.tasks.map((task) => {
                      const isOverdue = task.dueDate && new Date(task.dueDate) < today && !task.completed

                      return (
                        <div key={task.id}>
                          <div
                            className={cn(
                              "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50",
                              expandedTask === task.id && "bg-muted/50"
                            )}
                            onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                          >
                            <Checkbox
                              checked={task.completed}
                              onCheckedChange={() => toggleTask(task)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm",
                                task.completed && "line-through text-muted-foreground"
                              )}>
                                {task.title}
                              </p>
                              {task.dueDate && (
                                <p className={cn(
                                  "text-xs mt-0.5",
                                  isOverdue ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                                )}>
                                  Due {formatDate(task.dueDate)}
                                  {isOverdue && " · Overdue"}
                                </p>
                              )}
                            </div>
                            {task.notes && (
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {expandedTask === task.id ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          {expandedTask === task.id && (
                            <div className="px-4 pb-4 pt-0 ml-10">
                              <Textarea
                                placeholder="Add notes..."
                                value={task.notes || ""}
                                onChange={(e) => updateTaskNotes(task.id, e.target.value)}
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </div>
            ))
          )}
        </TabsContent>

        {/* Withdrawal Eligibility Panel */}
        <TabsContent value="withdrawals" className="pt-4">
          <div className="mb-4">
            <p className="font-medium mb-1">Grandchild Withdrawal Eligibility</p>
            <p className="text-sm text-muted-foreground">
              Per trust terms: 50% at age 25, remaining 50% at age 30
            </p>
          </div>

          {withdrawalData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No grandchild beneficiaries with withdrawal schedules found.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Share</TableHead>
                      <TableHead>Age 25 (50%)</TableHead>
                      <TableHead>Age 30 (50%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalData.map((row) => (
                      <TableRow key={row.beneficiary.id}>
                        <TableCell className="font-medium">
                          {row.beneficiary.firstName} {row.beneficiary.lastName}
                        </TableCell>
                        <TableCell>{row.currentAge ?? "—"}</TableCell>
                        <TableCell>{row.beneficiary.sharePercent}%</TableCell>
                        <TableCell>
                          {row.age25 ? (
                            <div>
                              <p className={cn(
                                "text-sm",
                                row.age25.withdrawn
                                  ? "text-muted-foreground"
                                  : row.age25.status.daysUntil === 0
                                    ? "text-green-600 dark:text-green-400 font-medium"
                                    : ""
                              )}>
                                {row.age25.withdrawn ? "Withdrawn" : row.age25.status.status}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(row.age25.eligibleDate)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.age30 ? (
                            <div>
                              <p className={cn(
                                "text-sm",
                                row.age30.withdrawn
                                  ? "text-muted-foreground"
                                  : row.age30.status.daysUntil === 0
                                    ? "text-green-600 dark:text-green-400 font-medium"
                                    : ""
                              )}>
                                {row.age30.withdrawn ? "Withdrawn" : row.age30.status.status}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(row.age30.eligibleDate)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Trust Accounting Panel */}
        <TabsContent value="accounting" className="space-y-6 pt-4">
          <div className="@container">
            <div className="grid gap-6 @md:grid-cols-2">
            {/* Income Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                {accountingEntries.filter(e => e.entryType === "INCOME").length === 0 ? (
                  <p className="text-muted-foreground text-sm">No income entries recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {accountingEntries
                      .filter(e => e.entryType === "INCOME")
                      .map(entry => (
                        <div key={entry.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm">{entry.description || entry.incomeType}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(entry.accountingDate)}</p>
                          </div>
                          <p className="text-sm font-medium">{formatCurrency(entry.amount)}</p>
                        </div>
                      ))}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Total</p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(incomeTotal)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {accountingEntries.filter(e => e.entryType === "EXPENSE").length === 0 ? (
                  <p className="text-muted-foreground text-sm">No expense entries recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {accountingEntries
                      .filter(e => e.entryType === "EXPENSE")
                      .map(entry => (
                        <div key={entry.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm">{entry.description || entry.expenseType}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(entry.accountingDate)}
                              {entry.taxDeductible && " · Tax deductible"}
                            </p>
                          </div>
                          <p className="text-sm font-medium">{formatCurrency(entry.amount)}</p>
                        </div>
                      ))}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Total</p>
                      <p className="text-sm font-semibold">{formatCurrency(expenseTotal)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Form 1041 Summary */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
              Form 1041 Summary
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Trust income tax return summary for the current fiscal year
            </p>
            <div className="@container">
              <div className="grid gap-4 @sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                    Gross Income
                  </p>
                  <p className="text-2xl font-semibold">{formatCurrency(incomeTotal)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                    Deductions
                  </p>
                  <p className="text-2xl font-semibold">{formatCurrency(expenseTotal)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                    Distributable Net Income
                  </p>
                  <p className={cn(
                    "text-2xl font-semibold",
                    netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {formatCurrency(netIncome)}
                  </p>
                </CardContent>
              </Card>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
