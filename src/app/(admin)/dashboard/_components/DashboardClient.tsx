'use client'

import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useMemo, useOptimistic, useState } from 'react'
import { toast } from 'sonner'
import { KpiStrip, type KpiStripItem } from '@/components/kpi-strip'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { logger } from '@/lib/logger'
import { isPositive, subtractMoney, sumStrings, toCents } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import {
    calculateAge,
    formatCurrency,
    getWithdrawalStatus,
} from '@/utils/formatters'
import { TASK_CATEGORIES } from './constants'
import { DashboardAlerts } from './DashboardAlerts'
import { DashboardStats } from './DashboardStats'
import { FinancialCharts } from './FinancialCharts'
import { TaskList } from './TaskList'
import { TrustHeader } from './TrustHeader'

const LiabilitiesPanel = dynamic(
    () =>
        import('./LiabilitiesPanel').then((m) => ({
            default: m.LiabilitiesPanel,
        })),
    { loading: () => <Skeleton className="h-64 w-full" /> },
)

const WithdrawalsPanel = dynamic(
    () =>
        import('./WithdrawalsPanel').then((m) => ({
            default: m.WithdrawalsPanel,
        })),
    { loading: () => <Skeleton className="h-64 w-full" /> },
)

const AccountingSummary = dynamic(
    () =>
        import('./AccountingSummary').then((m) => ({
            default: m.AccountingSummary,
        })),
    { loading: () => <Skeleton className="h-64 w-full" /> },
)

const log = logger.create('Dashboard')

export function DashboardClient() {
    const utils = trpc.useUtils()

    const { data: entities } = trpc.entity.list.useQuery()
    const entity = entities?.[0] ?? null
    const entityId = entity?.id

    const { data: summary, isLoading: summaryLoading } =
        trpc.dashboard.summary.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const { data: summaryTotals } = trpc.dashboard.summaryTotals.useQuery(
        {
            entityId: entityId!,
        },
        { enabled: !!entityId },
    )

    const bankAccounts = summary?.bankAccounts ?? []
    const investmentAccounts = summary?.investmentAccounts ?? []
    const homesteads = summary?.homesteads ?? []
    const rentalProperties = summary?.rentalProperties ?? []
    const vehicles = summary?.vehicles ?? []
    const personalProperties = summary?.personalProperties ?? []
    const insurancePolicies = summary?.insurancePolicies ?? []
    const firearms = summary?.firearms ?? []
    const tasks = summary?.tasks ?? []
    const beneficiaries = summary?.beneficiaries ?? []
    const withdrawalRecords = summary?.withdrawalRecords ?? []
    const recentAccountingEntries = summary?.recentAccountingEntries ?? []
    const hemsRequests = summary?.hemsRequests ?? []
    const liabilities = summary?.liabilities ?? []

    const [optimisticTasks, setOptimisticTask] = useOptimistic(
        tasks,
        (current, update: { id: number; completed: boolean }) =>
            current.map((t) =>
                t.id === update.id ? { ...t, completed: update.completed } : t,
            ),
    )

    const createTask = trpc.task.create.useMutation({
        onSuccess: () => utils.dashboard.summary.invalidate({ entityId }),
    })

    const updateTask = trpc.task.update.useMutation({
        onSuccess: () => utils.dashboard.summary.invalidate({ entityId }),
    })

    const loading = summaryLoading || !summaryTotals

    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskCategory, setNewTaskCategory] = useState('OTHER')
    const [expandedTask, setExpandedTask] = useState<number | null>(null)

    const toggleTask = useCallback(
        async (task: (typeof optimisticTasks)[number]) => {
            setOptimisticTask({ id: task.id, completed: !task.completed })
            try {
                await updateTask.mutateAsync({
                    id: task.id,
                    data: { completed: !task.completed },
                })
            } catch (error) {
                log.error('Failed to update task', { error })
                toast.error('Failed to update task')
                utils.dashboard.summary.invalidate({ entityId })
            }
        },
        [setOptimisticTask, updateTask, utils.dashboard.summary, entityId],
    )

    const addTask = useCallback(async () => {
        if (!newTaskTitle.trim()) return

        try {
            await createTask.mutateAsync({
                title: newTaskTitle,
                category: newTaskCategory,
                sortOrder: optimisticTasks.length,
            })
            setNewTaskTitle('')
        } catch (error) {
            log.error('Failed to add task', { error })
        }
    }, [newTaskTitle, newTaskCategory, optimisticTasks.length, createTask])

    const updateTaskNotes = useCallback(
        async (taskId: number, notes: string) => {
            try {
                await updateTask.mutateAsync({
                    id: taskId,
                    data: { notes },
                })
            } catch (error) {
                log.error('Failed to update notes', { error })
            }
        },
        [updateTask],
    )

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

    const incomeTotal = summaryTotals?.incomeTotal ?? '0'
    const expenseTotal = summaryTotals?.expenseTotal ?? '0'
    const netIncome = subtractMoney(incomeTotal, expenseTotal)

    const { totalLiabilities, totalAssets, assetAllocationData } =
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
            const personalPropertyTotal = sumStrings(
                personalProperties.map((p) => p.dodValue ?? '0'),
            )
            const insuranceTotal = sumStrings(
                insurancePolicies.map((p) => p.coverageAmount ?? '0'),
            )
            const firearmTotal = sumStrings(
                firearms.map((f) => f.dodValue ?? '0'),
            )
            const liabilityTotal = sumStrings(
                liabilities.map((l) => l.currentBalance ?? '0'),
            )
            const assetTotal = sumStrings([
                bankTotal,
                investTotal,
                realEstateTotal,
                vehicleTotal,
                personalPropertyTotal,
                insuranceTotal,
                firearmTotal,
            ])
            // Chart values derive from integer cents (toCents) to avoid the
            // float drift parseFloat reintroduces — see src/lib/money.ts.
            const allocationData = [
                {
                    name: 'Bank Accounts',
                    value: toCents(bankTotal) / 100,
                    fill: 'var(--chart-1)',
                },
                {
                    name: 'Investments',
                    value: toCents(investTotal) / 100,
                    fill: 'var(--chart-2)',
                },
                {
                    name: 'Real Estate',
                    value: toCents(realEstateTotal) / 100,
                    fill: 'var(--chart-3)',
                },
                {
                    name: 'Vehicles',
                    value: toCents(vehicleTotal) / 100,
                    fill: 'var(--chart-4)',
                },
                {
                    name: 'Personal Property',
                    value: toCents(personalPropertyTotal) / 100,
                    fill: 'var(--chart-5)',
                },
                {
                    name: 'Insurance',
                    value: toCents(insuranceTotal) / 100,
                    fill: 'var(--chart-1)',
                },
                {
                    name: 'Firearms',
                    value: toCents(firearmTotal) / 100,
                    fill: 'var(--chart-2)',
                },
            ].filter((item) => item.value > 0)

            return {
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
            personalProperties,
            insurancePolicies,
            firearms,
            liabilities,
        ])

    const {
        activeLiabilities,
        liabilityPayoffPercent,
        totalOriginalLiabilities,
    } = useMemo(() => {
        const active = liabilities.filter((l) => isPositive(l.currentBalance))
        const totalOriginal = sumStrings(
            liabilities.map((l) => l.originalAmount ?? '0'),
        )
        // Payoff percent from integer cents — avoids parseFloat drift shifting
        // the rounded percentage by a point (see src/lib/money.ts).
        const origCents = toCents(totalOriginal)
        const payoffPercent =
            origCents > 0
                ? Math.round(
                      ((origCents - toCents(totalLiabilities)) / origCents) *
                          100,
                  )
                : 0
        return {
            activeLiabilities: active,
            liabilityPayoffPercent: payoffPercent,
            totalOriginalLiabilities: totalOriginal,
        }
    }, [liabilities, totalLiabilities])

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

    const incomeEntryCount = summaryTotals?.incomeCount ?? 0
    const expenseEntryCount = summaryTotals?.expenseCount ?? 0

    // UI-SPEC §2 revision 1 — KPI rollout extends to /dashboard. Wires onto
    // existing memoized totals; Cash on hand = sum of bankAccount currentBalance
    // (live cash, not DOD). KpiStrip is ADDITIVE above DashboardStats — all
    // existing panels remain.
    const netWorth = subtractMoney(totalAssets, totalLiabilities)
    const cashOnHand = sumStrings(
        bankAccounts.map((a) => a.currentBalance ?? a.dodValue),
    )
    const dashboardKpis: KpiStripItem[] = [
        { label: 'Total assets', value: formatCurrency(totalAssets) },
        {
            label: 'Total liabilities',
            value: formatCurrency(totalLiabilities),
            invertDelta: true,
        },
        { label: 'Net worth', value: formatCurrency(netWorth) },
        { label: 'Cash on hand', value: formatCurrency(cashOnHand) },
    ]

    return (
        <div className="space-y-8">
            {entity && <TrustHeader entity={entity} />}

            <KpiStrip data={dashboardKpis} isLoading={summaryLoading} />

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
                        recentAccountingEntries={recentAccountingEntries}
                        incomeTotal={incomeTotal}
                        expenseTotal={expenseTotal}
                        netIncome={netIncome}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
