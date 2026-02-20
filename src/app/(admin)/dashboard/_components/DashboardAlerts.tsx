'use client'

import { AlertTriangle, Check, Circle, FileText } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/utils/formatters'

interface OverdueTask {
    id: number
}

interface UpcomingMilestone {
    beneficiary: { firstName: string | null; lastName: string | null }
}

interface PendingHemsRequest {
    amountRequested: string
}

interface DashboardAlertsProps {
    overdueTasks: OverdueTask[]
    eligibleNow: number
    pendingHems: PendingHemsRequest[]
    pendingHemsTotal: string
    upcomingMilestones: UpcomingMilestone[]
}

export function DashboardAlerts({
    overdueTasks,
    eligibleNow,
    pendingHems,
    pendingHemsTotal,
    upcomingMilestones,
}: DashboardAlertsProps) {
    return (
        <>
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
        </>
    )
}
