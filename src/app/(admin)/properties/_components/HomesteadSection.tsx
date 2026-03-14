'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Homestead } from '@/db/schema'
import { STATUS_VARIANTS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface HomesteadSectionProps {
    homestead: Homestead | undefined
    onAdd: () => void
    onEdit: (h: Homestead) => void
    onDelete: (id: number) => void
}

export function HomesteadSection({
    homestead,
    onAdd,
    onEdit,
    onDelete,
}: HomesteadSectionProps) {
    if (!homestead) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="mb-4 text-muted-foreground">
                        No homestead on record
                    </p>
                    <Button onClick={onAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Homestead
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                        {homestead.streetAddress}
                    </h3>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={STATUS_VARIANTS[homestead.transferStatus]}
                        >
                            {homestead.transferStatus}
                        </Badge>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(homestead)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => onDelete(homestead.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Address
                        </p>
                        <p className="mt-1 text-sm">
                            {homestead.streetAddress}
                        </p>
                        <p className="text-sm">
                            {homestead.city}, {homestead.state} {homestead.zip}
                        </p>
                        {homestead.county && (
                            <p className="text-sm text-muted-foreground">
                                {homestead.county} County
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Transfer Status
                        </p>
                        <Badge
                            variant={STATUS_VARIANTS[homestead.status]}
                            className="mt-1"
                        >
                            {homestead.status}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            DOD Value
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                            {formatCurrency(homestead.dodValue)}
                        </p>
                        {homestead.dodValueDate && (
                            <p className="text-xs text-muted-foreground">
                                as of {formatDate(homestead.dodValueDate)}
                            </p>
                        )}
                        {homestead.dodValueType && (
                            <Badge variant="outline" className="mt-1">
                                {homestead.dodValueType}
                            </Badge>
                        )}
                    </div>
                </div>

                {homestead.notes && (
                    <div className="mt-6">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Notes
                        </p>
                        <p className="mt-1 text-sm">{homestead.notes}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
