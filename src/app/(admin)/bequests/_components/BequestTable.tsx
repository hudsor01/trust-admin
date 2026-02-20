'use client'

import { Check, Loader2, Pencil, Trash2 } from 'lucide-react'
import {
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import type { SpecificBequest } from '@/db/schema'
import { formatDate } from '@/utils/formatters'

export const BEQUEST_CATEGORIES = [
    { value: 'PET', label: 'Pet' },
    { value: 'JEWELRY', label: 'Jewelry' },
    { value: 'FURNITURE', label: 'Furniture' },
    { value: 'VEHICLE', label: 'Vehicle' },
    { value: 'ARTWORK', label: 'Artwork' },
    { value: 'COLLECTIBLE', label: 'Collectible' },
    { value: 'HEIRLOOM', label: 'Family Heirloom' },
    { value: 'ELECTRONICS', label: 'Electronics' },
    { value: 'OTHER', label: 'Other' },
]

interface Beneficiary {
    id: number
    firstName: string
    lastName: string
}

interface BequestTableProps {
    pendingBequests: SpecificBequest[]
    distributedBequests: SpecificBequest[]
    beneficiaries: Beneficiary[]
    isLoading: boolean
    onEdit: (bequest: SpecificBequest) => void
    onDelete: (id: number) => void
    onMarkDistributed: (bequest: SpecificBequest) => void
    onUpdate: (id: number, updates: Partial<SpecificBequest>) => Promise<void>
}

export function BequestTable({
    pendingBequests,
    distributedBequests,
    beneficiaries,
    isLoading,
    onEdit,
    onDelete,
    onMarkDistributed,
    onUpdate,
}: BequestTableProps) {
    return (
        <>
            {/* Pending Bequests */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Bequests</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : pendingBequests.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No pending bequests
                        </p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead className="w-[120px]">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingBequests.map((b) => {
                                        const recipient = b.beneficiaryId
                                            ? beneficiaries.find(
                                                  (ben) =>
                                                      ben.id === b.beneficiaryId,
                                              )
                                            : null
                                        return (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-medium">
                                                    <EditableTextCell
                                                        value={b.description}
                                                        onSave={(v) =>
                                                            onUpdate(b.id, {
                                                                description: String(v || ''),
                                                            })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <EditableSelectCell
                                                        value={b.category || 'OTHER'}
                                                        options={BEQUEST_CATEGORIES}
                                                        onSave={(v) =>
                                                            onUpdate(b.id, { category: v })
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {recipient ? (
                                                        `${recipient.firstName} ${recipient.lastName}`
                                                    ) : (
                                                        <EditableTextCell
                                                            value={b.recipientName}
                                                            onSave={(v) =>
                                                                onUpdate(b.id, {
                                                                    recipientName: v,
                                                                })
                                                            }
                                                            placeholder="Add recipient"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <EditableTextCell
                                                        value={b.notes}
                                                        onSave={(v) =>
                                                            onUpdate(b.id, { notes: v })
                                                        }
                                                        placeholder="Add notes"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-success hover:text-success"
                                                                        onClick={() =>
                                                                            onMarkDistributed(b)
                                                                        }
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Mark Distributed
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => onEdit(b)}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Edit
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                                        onClick={() =>
                                                                            onDelete(b.id)
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Delete
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Distributed Bequests */}
            <Card>
                <CardHeader>
                    <CardTitle>Distributed Bequests</CardTitle>
                </CardHeader>
                <CardContent>
                    {distributedBequests.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            No distributed bequests
                        </p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Date Distributed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {distributedBequests.map((b) => {
                                        const recipient = b.beneficiaryId
                                            ? beneficiaries.find(
                                                  (ben) =>
                                                      ben.id === b.beneficiaryId,
                                              )
                                            : null
                                        return (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-medium">
                                                    {b.description}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {BEQUEST_CATEGORIES.find(
                                                            (c) => c.value === b.category,
                                                        )?.label || b.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {recipient
                                                        ? `${recipient.firstName} ${recipient.lastName}`
                                                        : b.recipientName || '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {formatDate(b.dateDistributed)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
