import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface PageHeaderProps {
    title: string
    description?: string
    breadcrumb?: Array<{ label: string; href?: string }>
    actions?: ReactNode
}

export function PageHeader({
    title,
    description,
    breadcrumb,
    actions,
}: PageHeaderProps) {
    return (
        <header className="flex flex-col gap-2 pb-6 border-b border-border">
            {breadcrumb && breadcrumb.length > 0 && (
                <Breadcrumb>
                    <BreadcrumbList className="text-xs text-muted-foreground">
                        {breadcrumb.map((item, idx) => {
                            const isLast = idx === breadcrumb.length - 1
                            return (
                                <span
                                    key={`${item.label}-${idx}`}
                                    className="inline-flex items-center gap-1.5"
                                >
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <BreadcrumbPage aria-current="page">
                                                {item.label}
                                            </BreadcrumbPage>
                                        ) : item.href ? (
                                            <BreadcrumbLink asChild>
                                                <Link href={item.href}>
                                                    {item.label}
                                                </Link>
                                            </BreadcrumbLink>
                                        ) : (
                                            <span>{item.label}</span>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && (
                                        <BreadcrumbSeparator>
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        </BreadcrumbSeparator>
                                    )}
                                </span>
                            )
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
            <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-semibold leading-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    )
}
