'use client'

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusType =
    | 'current'
    | 'successor'
    | 'pending'
    | 'approved'
    | 'denied'
    | 'complete'
    | 'active'
    | 'inactive'
    | 'warning'
    | 'error'
    | 'info'
    | 'default'

interface StatusBadgeProps {
    status: StatusType | string
    children?: ReactNode
    className?: string
}

const statusStyles: Record<StatusType, string> = {
    current: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
    successor:
        'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
    pending: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
    approved:
        'bg-success/10 text-success border-success/20 hover:bg-success/20',
    denied: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
    complete:
        'bg-success/10 text-success border-success/20 hover:bg-success/20',
    active: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
    inactive: 'bg-muted text-muted-foreground border-muted hover:bg-muted/80',
    warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
    error: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
    info: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
    default: 'bg-muted text-muted-foreground border-muted hover:bg-muted/80',
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase() as StatusType
    const styles = statusStyles[normalizedStatus] || statusStyles.default

    return (
        <Badge
            variant="outline"
            className={cn('font-medium', styles, className)}
        >
            {children || status}
        </Badge>
    )
}

export function CurrentBadge({
    children = 'Current',
    className,
}: Omit<StatusBadgeProps, 'status'>) {
    return (
        <StatusBadge status="current" className={className}>
            {children}
        </StatusBadge>
    )
}

export function SuccessorBadge({
    children = 'Successor',
    className,
}: Omit<StatusBadgeProps, 'status'>) {
    return (
        <StatusBadge status="successor" className={className}>
            {children}
        </StatusBadge>
    )
}

export function PendingBadge({
    children = 'Pending',
    className,
}: Omit<StatusBadgeProps, 'status'>) {
    return (
        <StatusBadge status="pending" className={className}>
            {children}
        </StatusBadge>
    )
}

export function ApprovedBadge({
    children = 'Approved',
    className,
}: Omit<StatusBadgeProps, 'status'>) {
    return (
        <StatusBadge status="approved" className={className}>
            {children}
        </StatusBadge>
    )
}

export function DeniedBadge({
    children = 'Denied',
    className,
}: Omit<StatusBadgeProps, 'status'>) {
    return (
        <StatusBadge status="denied" className={className}>
            {children}
        </StatusBadge>
    )
}
