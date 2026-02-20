'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useMemo, useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { logger } from '@/lib/logger'
import { isNegative, subtractMoney, sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { calculateAge, getWithdrawalStatus } from '@/utils/formatters'
import { AccountingSummary } from './_components/AccountingSummary'
import { DashboardAlerts } from './_components/DashboardAlerts'
import { DashboardStats } from './_components/DashboardStats'
import { FinancialCharts } from './_components/FinancialCharts'
import { LiabilitiesPanel } from './_components/LiabilitiesPanel'
import { TaskList } from './_components/TaskList'
import { TrustHeader } from './_components/TrustHeader'
import { WithdrawalsPanel } from './_components/WithdrawalsPanel'
import { TASK_CATEGORIES } from './_components/constants'

const log = logger.create('Dashboard')

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
                log.error('Failed to update task', { error })
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
            log.error('Failed to add task', { error })
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
                log.error('Failed to update notes', { error })
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
            TASK_CATEGORIES.map((cat) => ({
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
        totalLiabilities,
        totalAssets,
        assetAllocationData,
    } =
        useMemo(() => {
            const bankTotal = sumStrings(
                bankAccounts.map((a) => a.currentBalance ?? '0'),
            )
            const investTotal = sumStrings(
                investmentAccounts.map((a) => a.currentBalance ?? '0'),
            )
            const realEstateTotal = sumStrings(
                [...homesteads, ...rentalProperties].map(
                    (p) => p.dodValue ?? '0',
                ),
            )
            const vehicleTotal = sumStrings(
                vehicles.map((v) => v.dodValue ?? '0'),
            )
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
                _totalBankAccounts: bankTotal,
                _totalInvestments: investTotal,
                _totalRealEstate: realEstateTotal,
                _totalVehicles: vehicleTotal,
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

    const incomeEntryCount = accountingEntries.filter(
        (e) => e.entryType === 'INCOME',
    ).length
    const expenseEntryCount = accountingEntries.filter(
        (e) => e.entryType === 'EXPENSE',
    ).length

    return (
        <div className="space-y-8">
            {entity && <TrustHeader entity={entity} />}

            <DashboardAlerts
                overdueTasks={overdueTasks}
                eligibleNow={eligibleNow}
                pendingHems={pendingHems}
                pendingHemsTotal={pendingHemsTotal}
                upcomingMilestones={upcomingMilestones}
            />

            <FinancialCharts
                totalAssets={totalAssets}
                totalLiabilities={totalLiabilities}
                assetAllocationData={assetAllocationData}
            />

            <DashboardStats
                completedCount={completedCount}
                totalCount={totalCount}
                progressPercent={progressPercent}
                incomeTotal={incomeTotal}
                expenseTotal={expenseTotal}
                netIncome={netIncome}
                incomeEntryCount={incomeEntryCount}
                expenseEntryCount={expenseEntryCount}
            />

            <Tabs defaultValue="tasks">
                <TabsList>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                    <TabsTrigger value="accounting">Accounting</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="space-y-6 pt-4">
                    <TaskList
                        groupedTasks={groupedTasks}
                        newTaskTitle={newTaskTitle}
                        newTaskCategory={newTaskCategory}
                        expandedTask={expandedTask}
                        today={today}
                        onNewTaskTitleChange={setNewTaskTitle}
                        onNewTaskCategoryChange={setNewTaskCategory}
                        onExpandedTaskChange={setExpandedTask}
                        onAddTask={addTask}
                        onToggleTask={toggleTask}
                        onUpdateTaskNotes={updateTaskNotes}
                    />
                </TabsContent>

                <TabsContent value="liabilities" className="space-y-6 pt-4">
                    <LiabilitiesPanel
                        activeLiabilities={activeLiabilities}
                        totalLiabilities={totalLiabilities}
                        totalOriginalLiabilities={totalOriginalLiabilities}
                        liabilityPayoffPercent={liabilityPayoffPercent}
                    />
                </TabsContent>

                <TabsContent value="withdrawals" className="pt-4">
                    <WithdrawalsPanel withdrawalData={withdrawalData} />
                </TabsContent>

                <TabsContent value="accounting" className="space-y-6 pt-4">
                    <AccountingSummary
                        accountingEntries={accountingEntries}
                        incomeTotal={incomeTotal}
                        expenseTotal={expenseTotal}
                        netIncome={netIncome}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
