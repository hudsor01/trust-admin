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
                <Alert className="border-warning/30 bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning font-medium">
                        {overdueTasks.length} overdue task
                        {overdueTasks.length > 1 ? 's' : ''} require attention
                    </AlertDescription>
                </Alert>
            )}

            {eligibleNow > 0 && (
                <Alert className="border-success/30 bg-success/10">
                    <Check className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success font-medium">
                        {eligibleNow} grandchild
                        {eligibleNow > 1 ? 'ren are' : ' is'} now eligible for
                        withdrawal
                    </AlertDescription>
                </Alert>
            )}

            {pendingHems.length > 0 && (
                <Alert className="border-primary/30 bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-primary font-medium">
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
                <Alert className="border-accent bg-accent">
                    <Circle className="h-4 w-4 text-accent-foreground" />
                    <AlertDescription className="text-accent-foreground font-medium">
                        {upcomingMilestones.length} beneficiar
                        {upcomingMilestones.length > 1 ? 'ies' : 'y'}{' '}
                        approaching withdrawal eligibility in the next 90 days
                    </AlertDescription>
                </Alert>
            )}
        </>
    )
}
