'use client'

import {
    AlertTriangle,
    Check,
    ChevronDown,
    ChevronUp,
    Circle,
    FileText,
    Loader2,
    Plus,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { AssetAllocationChart } from '@/components/charts/asset-allocation-chart'
import { NetWorthChart } from '@/components/charts/net-worth-chart'
import { type ColumnDef, DataTable } from '@/components/data-table'
import { LiabilityProgressCard } from '@/components/liability-progress-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { isNegative, isPositive, subtractMoney, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import {
    calculateAge,
    formatCurrency,
    formatDate,
    getWithdrawalStatus,
} from '@/utils/formatters'

const CATEGORIES = [
    { value: 'INVENTORY', label: 'Inventory & Documentation' },
    { value: 'FINANCIAL', label: 'Financial' },
    { value: 'BENEFICIARY', label: 'Beneficiary' },
    { value: 'LEGAL', label: 'Legal' },
    { value: 'ADMINISTRATIVE', label: 'Administrative' },
    { value: 'OTHER', label: 'Other' },
]

export default function DashboardPage() {
    // Use tRPC hooks for all data
    const { data: allEntities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const { data: tasks = [], isLoading: tasksLoading } =
        trpc.task.list.useQuery()
    const { data: beneficiaries = [], isLoading: beneficiariesLoading } =
        trpc.beneficiary.list.useQuery()
    const {
        data: withdrawalRecords = [],
        isLoading: withdrawalRecordsLoading,
    } = trpc.withdrawalRecord.list.useQuery()
    const { data: accountingEntries = [], isLoading: accountingLoading } =
        trpc.trustAccounting.list.useQuery()
    const { data: hemsRequests = [], isLoading: hemsLoading } =
        trpc.hemsRequest.list.useQuery()

    // Asset queries for charts
    const { data: bankAccounts = [], isLoading: bankAccountsLoading } =
        trpc.bankAccount.list.useQuery()
    const { data: investmentAccounts = [], isLoading: investmentsLoading } =
        trpc.investmentAccount.list.useQuery()
    const { data: homesteads = [], isLoading: homesteadsLoading } =
        trpc.homestead.list.useQuery()
    const { data: rentalProperties = [], isLoading: rentalsLoading } =
        trpc.rentalProperty.list.useQuery()
    const { data: vehicles = [], isLoading: vehiclesLoading } =
        trpc.vehicle.list.useQuery()
    const { data: liabilities = [], isLoading: liabilitiesLoading } =
        trpc.liability.list.useQuery()

    const utils = trpc.useUtils()
    const createTaskMutation = trpc.task.create.useMutation({
        onSuccess: () => utils.task.list.invalidate(),
    })
    const updateTaskMutation = trpc.task.update.useMutation({
        onSuccess: () => utils.task.list.invalidate(),
    })

    const loading =
        entitiesLoading ||
        tasksLoading ||
        beneficiariesLoading ||
        withdrawalRecordsLoading ||
        accountingLoading ||
        hemsLoading ||
        bankAccountsLoading ||
        investmentsLoading ||
        homesteadsLoading ||
        rentalsLoading ||
        vehiclesLoading ||
        liabilitiesLoading

    // Get primary entity
    const entity = allEntities.length > 0 ? allEntities[0] : null

    // Local UI state
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskCategory, setNewTaskCategory] = useState('OTHER')
    const [expandedTask, setExpandedTask] = useState<string | null>(null)

    const toggleTask = async (task: (typeof tasks)[number]) => {
        try {
            await updateTaskMutation.mutateAsync({
                id: task.id,
                data: { completed: !task.completed },
            })
        } catch (error) {
            console.error('Failed to update task:', error)
        }
    }

    const addTask = async () => {
        if (!newTaskTitle.trim()) return

        try {
            await createTaskMutation.mutateAsync({
                title: newTaskTitle,
                category: newTaskCategory,
                sortOrder: tasks.length,
            })
            setNewTaskTitle('')
        } catch (error) {
            console.error('Failed to add task:', error)
        }
    }

    const updateTaskNotes = async (taskId: string, notes: string) => {
        try {
            await updateTaskMutation.mutateAsync({
                id: taskId,
                data: { notes },
            })
        } catch (error) {
            console.error('Failed to update notes:', error)
        }
    }

    // Calculate task stats
    const completedCount = tasks.filter((t) => t.completed).length
    const totalCount = tasks.length
    const progressPercent =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    // Calculate overdue tasks
    const today = new Date()
    const overdueTasks = tasks.filter((t) => {
        if (t.completed || !t.dueDate) return false
        return new Date(t.dueDate) < today
    })

    // Group tasks by category
    const groupedTasks = CATEGORIES.map((cat) => ({
        ...cat,
        tasks: tasks
            .filter((t) => t.category === cat.value)
            .sort((a, b) => {
                if (a.dueDate && b.dueDate) {
                    return (
                        new Date(a.dueDate).getTime() -
                        new Date(b.dueDate).getTime()
                    )
                }
                if (a.dueDate && !b.dueDate) return -1
                if (!a.dueDate && b.dueDate) return 1
                return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
            }),
    })).filter((cat) => cat.tasks.length > 0)

    // Calculate accounting totals using dinero.js for precision
    const incomeTotal = sumStrings(
        accountingEntries
            .filter((e) => e.entryType === 'INCOME')
            .map((e) => e.amount),
    )
    const expenseTotal = sumStrings(
        accountingEntries
            .filter((e) => e.entryType === 'EXPENSE')
            .map((e) => e.amount),
    )
    const netIncome = subtractMoney(incomeTotal, expenseTotal)

    // Calculate asset totals for charts using dinero.js for precision
    const totalBankAccounts = sumStrings(
        bankAccounts.map((a) => a.currentBalance ?? '0'),
    )
    const totalInvestments = sumStrings(
        investmentAccounts.map((a) => a.currentBalance ?? '0'),
    )
    const totalRealEstate = sumStrings(
        [...homesteads, ...rentalProperties].map((p) => p.dodValue ?? '0'),
    )
    const totalVehicles = sumStrings(vehicles.map((v) => v.dodValue ?? '0'))
    const totalLiabilities = sumStrings(
        liabilities.map((l) => l.currentBalance ?? '0'),
    )

    // Calculate liability statistics
    const activeLiabilities = liabilities.filter(
        (l) => parseFloat(l.currentBalance ?? '0') > 0,
    )
    const totalOriginalLiabilities = sumStrings(
        liabilities.map((l) => l.originalAmount ?? '0'),
    )
    const liabilityPayoffPercent =
        parseFloat(totalOriginalLiabilities) > 0
            ? Math.round(
                  ((parseFloat(totalOriginalLiabilities) -
                      parseFloat(totalLiabilities)) /
                      parseFloat(totalOriginalLiabilities)) *
                      100,
              )
            : 0

    // Calculate total assets and net worth
    const totalAssets = sumStrings([
        totalBankAccounts,
        totalInvestments,
        totalRealEstate,
        totalVehicles,
    ])
    // Prepare asset allocation data for chart
    const assetAllocationData = [
        {
            name: 'Bank Accounts',
            value: Number.parseFloat(totalBankAccounts) || 0,
            fill: 'hsl(221, 83%, 53%)',
        },
        {
            name: 'Investments',
            value: Number.parseFloat(totalInvestments) || 0,
            fill: 'hsl(262, 83%, 58%)',
        },
        {
            name: 'Real Estate',
            value: Number.parseFloat(totalRealEstate) || 0,
            fill: 'hsl(142, 76%, 36%)',
        },
        {
            name: 'Vehicles',
            value: Number.parseFloat(totalVehicles) || 0,
            fill: 'hsl(38, 92%, 50%)',
        },
    ].filter((item) => item.value > 0)

    // Get grandchildren with withdrawal info
    const grandchildren = beneficiaries.filter(
        (b) => b.relationshipType === 'GRANDCHILD',
    )

    // Build withdrawal eligibility data
    const withdrawalData = grandchildren
        .map((gc) => {
            const records = withdrawalRecords.filter(
                (wr) => wr.beneficiaryId === gc.id,
            )
            const age25Record = records.find(
                (r) => r.withdrawalType === 'AGE_25',
            )
            const age30Record = records.find(
                (r) => r.withdrawalType === 'AGE_30',
            )

            return {
                beneficiary: gc,
                currentAge: gc.dob ? calculateAge(gc.dob) : null,
                age25: age25Record
                    ? {
                          eligibleDate: age25Record.eligibleDate,
                          status: getWithdrawalStatus(age25Record.eligibleDate),
                          withdrawn: age25Record.status === 'COMPLETE',
                      }
                    : null,
                age30: age30Record
                    ? {
                          eligibleDate: age30Record.eligibleDate,
                          status: getWithdrawalStatus(age30Record.eligibleDate),
                          withdrawn: age30Record.status === 'COMPLETE',
                      }
                    : null,
            }
        })
        .sort((a, b) => {
            const aNext =
                a.age25?.status.daysUntil ?? a.age30?.status.daysUntil ?? 9999
            const bNext =
                b.age25?.status.daysUntil ?? b.age30?.status.daysUntil ?? 9999
            return aNext - bNext
        })

    // Count upcoming eligibilities
    const eligibleNow = withdrawalData.filter(
        (w) =>
            (w.age25 && w.age25.status.daysUntil === 0 && !w.age25.withdrawn) ||
            (w.age30 && w.age30.status.daysUntil === 0 && !w.age30.withdrawn),
    ).length

    // Count upcoming milestones (within 90 days)
    const upcomingMilestones = withdrawalData.filter((w) => {
        const age25Soon =
            w.age25 &&
            !w.age25.withdrawn &&
            w.age25.status.daysUntil > 0 &&
            w.age25.status.daysUntil <= 90
        const age30Soon =
            w.age30 &&
            !w.age30.withdrawn &&
            w.age30.status.daysUntil > 0 &&
            w.age30.status.daysUntil <= 90
        return age25Soon || age30Soon
    })

    // Withdrawal schedule table columns
    type WithdrawalRow = (typeof withdrawalData)[number]
    const withdrawalColumns: ColumnDef<WithdrawalRow>[] = [
        {
            key: 'beneficiary',
            header: 'Beneficiary',
            render: (row) => (
                <span className="font-medium">
                    {row.beneficiary.firstName} {row.beneficiary.lastName}
                </span>
            ),
        },
        {
            key: 'currentAge',
            header: 'Age',
            render: (row) => row.currentAge ?? '—',
        },
        {
            key: 'sharePercent',
            header: 'Share',
            render: (row) => `${row.beneficiary.sharePercent}%`,
        },
        {
            key: 'age25',
            header: 'Age 25 (50%)',
            render: (row) =>
                row.age25 ? (
                    <div>
                        <p
                            className={cn(
                                'text-sm',
                                row.age25.withdrawn
                                    ? 'text-muted-foreground'
                                    : row.age25.status.daysUntil === 0
                                      ? 'text-green-600 dark:text-green-400 font-medium'
                                      : '',
                            )}
                        >
                            {row.age25.withdrawn
                                ? 'Withdrawn'
                                : row.age25.status.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatDate(row.age25.eligibleDate)}
                        </p>
                    </div>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            key: 'age30',
            header: 'Age 30 (50%)',
            render: (row) =>
                row.age30 ? (
                    <div>
                        <p
                            className={cn(
                                'text-sm',
                                row.age30.withdrawn
                                    ? 'text-muted-foreground'
                                    : row.age30.status.daysUntil === 0
                                      ? 'text-green-600 dark:text-green-400 font-medium'
                                      : '',
                            )}
                        >
                            {row.age30.withdrawn
                                ? 'Withdrawn'
                                : row.age30.status.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatDate(row.age30.eligibleDate)}
                        </p>
                    </div>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
    ]

    // Pending HEMS requests
    const pendingHems = hemsRequests.filter((r) => r.status === 'PENDING')
    const pendingHemsTotal = sumStrings(
        pendingHems.map((r) => r.amountRequested),
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
                        {entity.trustType === 'IRREVOCABLE'
                            ? 'Irrevocable'
                            : 'Revocable'}{' '}
                        · Texas · Established Sep 18, 2024
                    </p>
                    <div className="flex gap-8">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                                Grantor
                            </p>
                            <p className="text-sm">
                                {entity.grantorName || '—'}
                            </p>
                        </div>
                        {entity.dod && (
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                                    Date of Death
                                </p>
                                <p className="text-sm">
                                    {formatDate(entity.dod)}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                                Status
                            </p>
                            <div className="flex items-center gap-2">
                                <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                                <span className="text-sm">
                                    Active Administration
                                </span>
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
                        {overdueTasks.length} overdue task
                        {overdueTasks.length > 1 ? 's' : ''} require attention
                    </AlertDescription>
                </Alert>
            )}

            {eligibleNow > 0 && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
                        {eligibleNow} grandchild
                        {eligibleNow > 1 ? 'ren are' : ' is'} now eligible for
                        withdrawal
                    </AlertDescription>
                </Alert>
            )}

            {pendingHems.length > 0 && (
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-700 dark:text-blue-300 font-medium">
                        {pendingHems.length} HEMS request
                        {pendingHems.length > 1 ? 's' : ''} pending review (
                        {formatCurrency(pendingHemsTotal)}){' — '}
                        <Link
                            href="/hems-queue"
                            className="underline hover:no-underline"
                        >
                            Review now
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            {upcomingMilestones.length > 0 && (
                <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
                    <Circle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <AlertDescription className="text-purple-700 dark:text-purple-300 font-medium">
                        {upcomingMilestones.length} beneficiar
                        {upcomingMilestones.length > 1 ? 'ies' : 'y'}{' '}
                        approaching withdrawal eligibility in the next 90 days
                    </AlertDescription>
                </Alert>
            )}

            {/* Financial Overview Charts */}
            <div className="@container">
                <div className="grid gap-6 @md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Net Worth</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <NetWorthChart
                                totalAssets={totalAssets}
                                totalLiabilities={totalLiabilities}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Asset Allocation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AssetAllocationChart data={assetAllocationData} />
                        </CardContent>
                    </Card>
                </div>
            </div>

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
                            <Progress
                                value={progressPercent}
                                className="h-2 mb-2"
                            />
                            <p className="text-xs text-muted-foreground">
                                {progressPercent}% complete
                            </p>
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
                                {
                                    accountingEntries.filter(
                                        (e) => e.entryType === 'INCOME',
                                    ).length
                                }{' '}
                                transactions
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
                                {
                                    accountingEntries.filter(
                                        (e) => e.entryType === 'EXPENSE',
                                    ).length
                                }{' '}
                                transactions
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                Net Position
                            </p>
                            <p
                                className={cn(
                                    'text-2xl font-semibold mb-2',
                                    isNegative(netIncome)
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-green-600 dark:text-green-400',
                                )}
                            >
                                {formatCurrency(netIncome)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {!isNegative(netIncome) ? '+' : ''}
                                {isPositive(incomeTotal)
                                    ? Math.round(
                                          (parseFloat(netIncome) /
                                              parseFloat(incomeTotal)) *
                                              100,
                                      )
                                    : 0}
                                % margin
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="tasks">
                <TabsList>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
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
                                    onChange={(e) =>
                                        setNewTaskTitle(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && addTask()
                                    }
                                    className="flex-1"
                                />
                                <Select
                                    value={newTaskCategory}
                                    onValueChange={setNewTaskCategory}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem
                                                key={c.value}
                                                value={c.value}
                                            >
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
                                <p className="text-muted-foreground">
                                    No tasks yet. Add your first task above.
                                </p>
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
                                        {
                                            category.tasks.filter(
                                                (t) => t.completed,
                                            ).length
                                        }{' '}
                                        of {category.tasks.length} tasks
                                    </p>
                                </div>

                                {/* Task Card */}
                                <Card>
                                    <div className="divide-y">
                                        {category.tasks.map((task) => {
                                            const isOverdue =
                                                task.dueDate &&
                                                new Date(task.dueDate) <
                                                    today &&
                                                !task.completed

                                            return (
                                                <div key={task.id}>
                                                    <div
                                                        className={cn(
                                                            'flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50',
                                                            expandedTask ===
                                                                task.id &&
                                                                'bg-muted/50',
                                                        )}
                                                        onClick={() =>
                                                            setExpandedTask(
                                                                expandedTask ===
                                                                    task.id
                                                                    ? null
                                                                    : task.id,
                                                            )
                                                        }
                                                    >
                                                        <Checkbox
                                                            checked={
                                                                task.completed ??
                                                                false
                                                            }
                                                            onCheckedChange={() =>
                                                                toggleTask(task)
                                                            }
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        />
                                                        <div className="flex-1">
                                                            <p
                                                                className={cn(
                                                                    'text-sm',
                                                                    task.completed &&
                                                                        'line-through text-muted-foreground',
                                                                )}
                                                            >
                                                                {task.title}
                                                            </p>
                                                            {task.dueDate && (
                                                                <p
                                                                    className={cn(
                                                                        'text-xs mt-0.5',
                                                                        isOverdue
                                                                            ? 'text-amber-600 dark:text-amber-400'
                                                                            : 'text-muted-foreground',
                                                                    )}
                                                                >
                                                                    Due{' '}
                                                                    {formatDate(
                                                                        task.dueDate,
                                                                    )}
                                                                    {isOverdue &&
                                                                        ' · Overdue'}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {task.notes && (
                                                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                        )}
                                                        {expandedTask ===
                                                        task.id ? (
                                                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    {expandedTask ===
                                                        task.id && (
                                                        <div className="px-4 pb-4 pt-0 ml-10">
                                                            <Textarea
                                                                placeholder="Add notes..."
                                                                value={
                                                                    task.notes ||
                                                                    ''
                                                                }
                                                                onChange={(e) =>
                                                                    updateTaskNotes(
                                                                        task.id,
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
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

                {/* Liabilities Panel */}
                <TabsContent value="liabilities" className="space-y-6 pt-4">
                    {/* Summary Stats */}
                    <div className="@container">
                        <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                        Total Owed
                                    </p>
                                    <p className="text-2xl font-semibold mb-1">
                                        {formatCurrency(totalLiabilities)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {activeLiabilities.length} active{' '}
                                        {activeLiabilities.length === 1
                                            ? 'liability'
                                            : 'liabilities'}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                        Original Total
                                    </p>
                                    <p className="text-2xl font-semibold mb-1">
                                        {formatCurrency(
                                            totalOriginalLiabilities,
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Combined original amounts
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                        Overall Progress
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Progress
                                            value={liabilityPayoffPercent}
                                            className="h-2 flex-1"
                                        />
                                        <span className="text-lg font-semibold">
                                            {liabilityPayoffPercent}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        paid off
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                        Amount Paid
                                    </p>
                                    <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-1">
                                        {formatCurrency(
                                            subtractMoney(
                                                totalOriginalLiabilities,
                                                totalLiabilities,
                                            ),
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        since inception
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Liability List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="font-medium mb-1">
                                    Liability Payoff Progress
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Track progress toward paying off trust
                                    liabilities
                                </p>
                            </div>
                            <Link href="/liabilities">
                                <Button variant="outline" size="sm">
                                    View All
                                </Button>
                            </Link>
                        </div>

                        {activeLiabilities.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <p className="text-muted-foreground">
                                        No active liabilities. All debts have
                                        been paid off.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="divide-y py-2">
                                    {activeLiabilities
                                        .slice(0, 5)
                                        .map((liability) => (
                                            <LiabilityProgressCard
                                                key={liability.id}
                                                liability={liability}
                                                compact
                                            />
                                        ))}
                                </CardContent>
                                {activeLiabilities.length > 5 && (
                                    <div className="px-6 py-3 border-t bg-muted/30">
                                        <Link
                                            href="/liabilities"
                                            className="text-sm text-muted-foreground hover:text-foreground"
                                        >
                                            +{activeLiabilities.length - 5} more{' '}
                                            {activeLiabilities.length - 5 === 1
                                                ? 'liability'
                                                : 'liabilities'}
                                        </Link>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                </TabsContent>

                {/* Withdrawal Eligibility Panel */}
                <TabsContent value="withdrawals" className="pt-4">
                    <div className="mb-4">
                        <p className="font-medium mb-1">
                            Grandchild Withdrawal Eligibility
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Per trust terms: 50% at age 25, remaining 50% at age
                            30
                        </p>
                    </div>

                    {withdrawalData.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">
                                    No grandchild beneficiaries with withdrawal
                                    schedules found.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <DataTable
                            data={withdrawalData}
                            columns={withdrawalColumns}
                        />
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
                                    {accountingEntries.filter(
                                        (e) => e.entryType === 'INCOME',
                                    ).length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                            No income entries recorded yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {accountingEntries
                                                .filter(
                                                    (e) =>
                                                        e.entryType ===
                                                        'INCOME',
                                                )
                                                .map((entry) => (
                                                    <div
                                                        key={entry.id}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <p className="text-sm">
                                                                {entry.description ||
                                                                    entry.incomeType}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatDate(
                                                                    entry.accountingDate,
                                                                )}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm font-medium">
                                                            {formatCurrency(
                                                                entry.amount,
                                                            )}
                                                        </p>
                                                    </div>
                                                ))}
                                            <Separator />
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium">
                                                    Total
                                                </p>
                                                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                    {formatCurrency(
                                                        incomeTotal,
                                                    )}
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
                                    {accountingEntries.filter(
                                        (e) => e.entryType === 'EXPENSE',
                                    ).length === 0 ? (
                                        <p className="text-muted-foreground text-sm">
                                            No expense entries recorded yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {accountingEntries
                                                .filter(
                                                    (e) =>
                                                        e.entryType ===
                                                        'EXPENSE',
                                                )
                                                .map((entry) => (
                                                    <div
                                                        key={entry.id}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <p className="text-sm">
                                                                {entry.description ||
                                                                    entry.expenseType}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatDate(
                                                                    entry.accountingDate,
                                                                )}
                                                                {entry.taxDeductible &&
                                                                    ' · Tax deductible'}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm font-medium">
                                                            {formatCurrency(
                                                                entry.amount,
                                                            )}
                                                        </p>
                                                    </div>
                                                ))}
                                            <Separator />
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium">
                                                    Total
                                                </p>
                                                <p className="text-sm font-semibold">
                                                    {formatCurrency(
                                                        expenseTotal,
                                                    )}
                                                </p>
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
                            Trust income tax return summary for the current
                            fiscal year
                        </p>
                        <div className="@container">
                            <div className="grid gap-4 @sm:grid-cols-3">
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                            Gross Income
                                        </p>
                                        <p className="text-2xl font-semibold">
                                            {formatCurrency(incomeTotal)}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                            Deductions
                                        </p>
                                        <p className="text-2xl font-semibold">
                                            {formatCurrency(expenseTotal)}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                            Distributable Net Income
                                        </p>
                                        <p
                                            className={cn(
                                                'text-2xl font-semibold',
                                                isNegative(netIncome)
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-green-600 dark:text-green-400',
                                            )}
                                        >
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
