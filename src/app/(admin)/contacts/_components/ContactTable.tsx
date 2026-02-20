'use client'

import { Eye, Loader2, Pencil, Trash2 } from 'lucide-react'
import {
    EditableSelectCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Button } from '@/components/ui/button'
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
import type { Contact } from '@/db/schema'

export const ROLE_LABELS: Record<string, string> = {
    ATTORNEY: 'Attorney',
    ACCOUNTANT: 'CPA',
    FINANCIAL_ADVISOR: 'Financial Advisor',
    PROPERTY_MANAGER: 'Property Manager',
    TENANT: 'Tenant',
    INSURANCE_AGENT: 'Insurance Agent',
    BANKER: 'Banker',
    CONTRACTOR: 'Contractor',
    EMPLOYEE: 'Employee',
    BENEFICIARY_REP: 'Beneficiary Rep',
    OTHER: 'Other',
}

export type RoleFilter =
    | 'all'
    | 'ATTORNEY'
    | 'ACCOUNTANT'
    | 'FINANCIAL_ADVISOR'
    | 'INSURANCE_AGENT'
    | 'BANKER'
    | 'OTHER'

interface ContactTableProps {
    contacts: Contact[]
    isLoading: boolean
    onView: (contact: Contact) => void
    onEdit: (contact: Contact) => void
    onDelete: (contact: Contact) => Promise<void>
    onUpdateField: (id: number, data: Partial<Contact>) => Promise<void>
}

export function ContactTable({
    contacts,
    isLoading,
    onView,
    onEdit,
    onDelete,
    onUpdateField,
}: ContactTableProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (contacts.length === 0) {
        return (
            <p className="text-center py-12 text-muted-foreground">
                No contacts found
            </p>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="w-12.5"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                            <TableCell>
                                <EditableTextCell
                                    value={contact.name}
                                    onSave={async (val) => {
                                        await onUpdateField(contact.id, {
                                            name: val ?? undefined,
                                        })
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <EditableSelectCell
                                    value={contact.role}
                                    options={Object.entries(ROLE_LABELS).map(
                                        ([value, label]) => ({ value, label }),
                                    )}
                                    onSave={async (val) => {
                                        await onUpdateField(contact.id, {
                                            role: val,
                                        })
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <EditableTextCell
                                    value={contact.company}
                                    onSave={async (val) => {
                                        await onUpdateField(contact.id, {
                                            company: val,
                                        })
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <EditableTextCell
                                    value={contact.email}
                                    onSave={async (val) => {
                                        await onUpdateField(contact.id, {
                                            email: val,
                                        })
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <EditableTextCell
                                    value={contact.phone}
                                    onSave={async (val) => {
                                        await onUpdateField(contact.id, {
                                            phone: val,
                                        })
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => onView(contact)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>View details</p>
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
                                                    onClick={() => onEdit(contact)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Edit contact</p>
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
                                                    onClick={() => onDelete(contact)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Delete contact</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
