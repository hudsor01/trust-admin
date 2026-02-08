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
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useMemo, useOptimistic, useState } from 'react'
import { toast } from 'sonner'

// PERF: Lazy load heavy chart components (recharts ~100KB gzipped)
// Charts are below the fold, so this reduces initial bundle significantly
const AssetAllocationChart = dynamic(
    () =>
        import('@/components/charts/asset-allocation-chart').then(
            (m) => m.AssetAllocationChart,
        ),
    {
        loading: () => (
            <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ),
        ssr: false, // Charts don't need SSR
    },
)

const NetWorthChart = dynamic(
    () =>
        import('@/components/charts/net-worth-chart').then(
            (m) => m.NetWorthChart,
        ),
    {
        loading: () => (
            <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ),
        ssr: false, // Charts don't need SSR
    },
)

import type { ColumnDef } from '@tanstack/react-table'
import { LiabilityProgressCard } from '@/components/liability-progress-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
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

    // Derive primary entity ID for all entity-scoped queries
    const selectedEntity = allEntities[0]?.id
    const queryEnabled = !!selectedEntity

    // Optimistic state for instant UI updates on task completion toggle
    const [optimisticTasks, setOptimisticTask] = useOptimistic(
        tasks,
        (current, update: { id: number; completed: boolean }) =>
            current.map((t) =>
                t.id === update.id ? { ...t, completed: update.completed } : t,
            ),
    )

    const { data: beneficiaries = [], isLoading: beneficiariesLoading } =
        trpc.beneficiary.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const {
        data: withdrawalRecords = [],
        isLoading: withdrawalRecordsLoading,
    } = trpc.withdrawalRecord.list.useQuery(
        { entityId: selectedEntity! },
        { enabled: queryEnabled },
    )
    const { data: accountingEntries = [], isLoading: accountingLoading } =
        trpc.trustAccounting.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const { data: hemsRequests = [], isLoading: hemsLoading } =
        trpc.hemsRequest.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )

    // Asset queries for charts
    const { data: bankAccounts = [], isLoading: bankAccountsLoading } =
        trpc.bankAccount.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const { data: investmentAccounts = [], isLoading: investmentsLoading } =
        trpc.investmentAccount.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const { data: homesteads = [], isLoading: homesteadsLoading } =
        trpc.homestead.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const { data: rentalProperties = [], isLoading: rentalsLoading } =
        trpc.rentalProperty.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const { data: vehicles = [], isLoading: vehiclesLoading } =
        trpc.vehicle.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )
    const { data: liabilities = [], isLoading: liabilitiesLoading } =
        trpc.liability.list.useQuery(
            { entityId: selectedEntity! },
            { enabled: queryEnabled },
        )

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
    const [expandedTask, setExpandedTask] = useState<number | null>(null)

    // PERF: Memoize handlers to prevent unnecessary re-renders of child components
    const toggleTask = useCallback(
        async (task: (typeof optimisticTasks)[number]) => {
            // Optimistic update - toggles instantly
            setOptimisticTask({ id: task.id, completed: !task.completed })
            try {
                await updateTaskMutation.mutateAsync({
                    id: task.id,
                    data: { completed: !task.completed },
                })
            } catch (error) {
                console.error('Failed to update task:', error)
                toast.error('Failed to update task')
                // Revert optimistic state by re-fetching real data
                utils.task.list.invalidate()
            }
        },
        [setOptimisticTask, updateTaskMutation, utils.task.list],
    )

    const addTask = useCallback(async () => {
        if (!newTaskTitle.trim()) return

        try {
            await createTaskMutation.mutateAsync({
                title: newTaskTitle,
                category: newTaskCategory,
                sortOrder: optimisticTasks.length,
            })
            setNewTaskTitle('')
        } catch (error) {
            console.error('Failed to add task:', error)
        }
    }, [
        newTaskTitle,
        newTaskCategory,
        optimisticTasks.length,
        createTaskMutation,
    ])

    const updateTaskNotes = useCallback(
        async (taskId: number, notes: string) => {
            try {
                await updateTaskMutation.mutateAsync({
                    id: taskId,
                    data: { notes },
                })
            } catch (error) {
                console.error('Failed to update notes:', error)
            }
        },
        [updateTaskMutation],
    )

    // PERF: Memoize task statistics to prevent recalculation on unrelated renders
    const { completedCount, totalCount, progressPercent, overdueTasks, today } =
        useMemo(() => {
            const completed = optimisticTasks.filter((t) => t.completed).length
            const total = optimisticTasks.length
            const progress =
                total > 0 ? Math.round((completed / total) * 100) : 0
            const todayDate = new Date()
            const overdue = optimisticTasks.filter((t) => {
                if (t.completed || !t.dueDate) return false
                return new Date(t.dueDate) < todayDate
            })
            return {
                completedCount: completed,
                totalCount: total,
                progressPercent: progress,
                overdueTasks: overdue,
                today: todayDate,
            }
        }, [optimisticTasks])

    // PERF: Memoize grouped tasks to prevent expensive sort operations on every render
    const groupedTasks = useMemo(
        () =>
            CATEGORIES.map((cat) => ({
                ...cat,
                tasks: optimisticTasks
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
            })).filter((cat) => cat.tasks.length > 0),
        [optimisticTasks],
    )

    // PERF: Memoize accounting totals to avoid expensive array operations
    const { incomeTotal, expenseTotal, netIncome } = useMemo(() => {
        const income = sumStrings(
            accountingEntries
                .filter((e) => e.entryType === 'INCOME')
                .map((e) => e.amount),
        )
        const expense = sumStrings(
            accountingEntries
                .filter((e) => e.entryType === 'EXPENSE')
                .map((e) => e.amount),
        )
        return {
            incomeTotal: income,
            expenseTotal: expense,
            netIncome: subtractMoney(income, expense),
        }
    }, [accountingEntries])

    // PERF: Memoize asset calculations - these involve multiple array operations
    const {
        totalBankAccounts: _totalBankAccounts,
        totalInvestments: _totalInvestments,
        totalRealEstate: _totalRealEstate,
        totalVehicles: _totalVehicles,
        totalLiabilities,
        totalAssets,
        assetAllocationData,
    } = useMemo(() => {
        const bankTotal = sumStrings(
            bankAccounts.map((a) => a.currentBalance ?? '0'),
        )
        const investTotal = sumStrings(
            investmentAccounts.map((a) => a.currentBalance ?? '0'),
        )
        const realEstateTotal = sumStrings(
            [...homesteads, ...rentalProperties].map((p) => p.dodValue ?? '0'),
        )
        const vehicleTotal = sumStrings(vehicles.map((v) => v.dodValue ?? '0'))
        const liabilityTotal = sumStrings(
            liabilities.map((l) => l.currentBalance ?? '0'),
        )
        const assetTotal = sumStrings([
            bankTotal,
            investTotal,
            realEstateTotal,
            vehicleTotal,
        ])
        const allocationData = [
            {
                name: 'Bank Accounts',
                value: Number.parseFloat(bankTotal) || 0,
                fill: 'hsl(221, 83%, 53%)',
            },
            {
                name: 'Investments',
                value: Number.parseFloat(investTotal) || 0,
                fill: 'hsl(262, 83%, 58%)',
            },
            {
                name: 'Real Estate',
                value: Number.parseFloat(realEstateTotal) || 0,
                fill: 'hsl(142, 76%, 36%)',
            },
            {
                name: 'Vehicles',
                value: Number.parseFloat(vehicleTotal) || 0,
                fill: 'hsl(38, 92%, 50%)',
            },
        ].filter((item) => item.value > 0)

        return {
            totalBankAccounts: bankTotal,
            totalInvestments: investTotal,
            totalRealEstate: realEstateTotal,
            totalVehicles: vehicleTotal,
            totalLiabilities: liabilityTotal,
            totalAssets: assetTotal,
            assetAllocationData: allocationData,
        }
    }, [
        bankAccounts,
        investmentAccounts,
        homesteads,
        rentalProperties,
        vehicles,
        liabilities,
    ])

    // PERF: Memoize liability statistics
    const {
        activeLiabilities,
        liabilityPayoffPercent,
        totalOriginalLiabilities,
    } = useMemo(() => {
        const active = liabilities.filter(
            (l) => parseFloat(l.currentBalance ?? '0') > 0,
        )
        const totalOriginal = sumStrings(
            liabilities.map((l) => l.originalAmount ?? '0'),
        )
        const payoffPercent =
            parseFloat(totalOriginal) > 0
                ? Math.round(
                      ((parseFloat(totalOriginal) -
                          parseFloat(totalLiabilities)) /
                          parseFloat(totalOriginal)) *
                          100,
                  )
                : 0
        return {
            activeLiabilities: active,
            liabilityPayoffPercent: payoffPercent,
            totalOriginalLiabilities: totalOriginal,
        }
    }, [liabilities, totalLiabilities])

    // PERF: Memoize withdrawal data calculations - involves nested loops and sorting
    const { withdrawalData, eligibleNow, upcomingMilestones } = useMemo(() => {
        const grandchildren = beneficiaries.filter(
            (b) => b.relationshipType === 'GRANDCHILD',
        )

        const data = grandchildren
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
                              status: getWithdrawalStatus(
                                  age25Record.eligibleDate,
                              ),
                              withdrawn: age25Record.status === 'COMPLETE',
                          }
                        : null,
                    age30: age30Record
                        ? {
                              eligibleDate: age30Record.eligibleDate,
                              status: getWithdrawalStatus(
                                  age30Record.eligibleDate,
                              ),
                              withdrawn: age30Record.status === 'COMPLETE',
                          }
                        : null,
                }
            })
            .sort((a, b) => {
                const aNext =
                    a.age25?.status.daysUntil ??
                    a.age30?.status.daysUntil ??
                    9999
                const bNext =
                    b.age25?.status.daysUntil ??
                    b.age30?.status.daysUntil ??
                    9999
                return aNext - bNext
            })

        const eligible = data.filter(
            (w) =>
                (w.age25 &&
                    w.age25.status.daysUntil === 0 &&
                    !w.age25.withdrawn) ||
                (w.age30 &&
                    w.age30.status.daysUntil === 0 &&
                    !w.age30.withdrawn),
        ).length

        const upcoming = data.filter((w) => {
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

        return {
            withdrawalData: data,
            eligibleNow: eligible,
            upcomingMilestones: upcoming,
        }
    }, [beneficiaries, withdrawalRecords])

    // PERF: Memoize column definitions to prevent TanStack Table recalculation
    type WithdrawalRow = (typeof withdrawalData)[number]
    const withdrawalColumns = useMemo<ColumnDef<WithdrawalRow>[]>(
        () => [
            {
                accessorKey: 'beneficiary',
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        title="Beneficiary"
                    />
                ),
                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.beneficiary.firstName}{' '}
                        {row.original.beneficiary.lastName}
                    </span>
                ),
            },
            {
                accessorKey: 'currentAge',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Age" />
                ),
                cell: ({ row }) => row.original.currentAge ?? '—',
            },
            {
                id: 'sharePercent',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title="Share" />
                ),
                cell: ({ row }) => `${row.original.beneficiary.sharePercent}%`,
            },
            {
                accessorKey: 'age25',
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        title="Age 25 (50%)"
                    />
                ),
                cell: ({ row }) =>
                    row.original.age25 ? (
                        <div>
                            <p
                                className={cn(
                                    'text-sm',
                                    row.original.age25.withdrawn
                                        ? 'text-muted-foreground'
                                        : row.original.age25.status
                                                .daysUntil === 0
                                          ? 'text-green-600 dark:text-green-400 font-medium'
                                          : '',
                                )}
                            >
                                {row.original.age25.withdrawn
                                    ? 'Withdrawn'
                                    : row.original.age25.status.status}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatDate(row.original.age25.eligibleDate)}
                            </p>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    ),
            },
            {
                accessorKey: 'age30',
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        title="Age 30 (50%)"
                    />
                ),
                cell: ({ row }) =>
                    row.original.age30 ? (
                        <div>
                            <p
                                className={cn(
                                    'text-sm',
                                    row.original.age30.withdrawn
                                        ? 'text-muted-foreground'
                                        : row.original.age30.status
                                                .daysUntil === 0
                                          ? 'text-green-600 dark:text-green-400 font-medium'
                                          : '',
                                )}
                            >
                                {row.original.age30.withdrawn
                                    ? 'Withdrawn'
                                    : row.original.age30.status.status}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatDate(row.original.age30.eligibleDate)}
                            </p>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    ),
            },
        ],
        [],
    )

    // PERF: Memoize pending HEMS calculations
    const { pendingHems, pendingHemsTotal } = useMemo(() => {
        const pending = hemsRequests.filter((r) => r.status === 'PENDING')
        return {
            pendingHems: pending,
            pendingHemsTotal: sumStrings(pending.map((r) => r.amountRequested)),
        }
    }, [hemsRequests])

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

                    <DataTable
                        data={withdrawalData}
                        columns={withdrawalColumns}
                        emptyMessage="No grandchild beneficiaries with withdrawal schedules found."
                        enableColumnVisibility={true}
                        enablePagination={true}
                    />
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
