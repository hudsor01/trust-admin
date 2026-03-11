'use client'

import { Calendar, Mail, MapPin, Phone } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { EditableDateCell, EditableTextCell } from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { Contact } from '@/db/schema'
import { ROLE_LABELS } from './ContactTable'

interface ContactDetailProps {
    contact: Contact | null
    onOpenChange: (open: boolean) => void
    onUpdateField: (id: number, data: Partial<Contact>) => Promise<void>
    onUpdateLocal: (updates: Partial<Contact>) => void
}

export function ContactDetail({
    contact,
    onOpenChange,
    onUpdateField,
    onUpdateLocal,
}: ContactDetailProps) {
    return (
        <Dialog open={!!contact} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{contact?.name}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Contact details and information
                    </DialogDescription>
                </DialogHeader>
                {contact && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Role:</span>
                            <Badge variant="secondary">
                                {ROLE_LABELS[contact.role] || contact.role}
                            </Badge>
                        </div>
                        {contact.company && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Company:</span>
                                <span>{contact.company}</span>
                            </div>
                        )}

                        <Separator />

                        {/* Contact Info - Editable */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium w-16">
                                    Birthday:
                                </span>
                                <EditableDateCell
                                    value={contact.dob}
                                    onSave={async (val) => {
                                        await onUpdateField(contact.id, {
                                            dob: val,
                                        })
                                        onUpdateLocal({ dob: val })
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium w-16">
                                    Email:
                                </span>
                                <div className="flex-1">
                                    <EditableTextCell
                                        value={contact.email}
                                        onSave={async (val) => {
                                            await onUpdateField(contact.id, {
                                                email: val,
                                            })
                                            onUpdateLocal({ email: val })
                                        }}
                                    />
                                </div>
                                {contact.email && (
                                    <CopyButton value={contact.email} />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium w-16">
                                    Phone:
                                </span>
                                <div className="flex-1">
                                    <EditableTextCell
                                        value={contact.phone}
                                        onSave={async (val) => {
                                            await onUpdateField(contact.id, {
                                                phone: val,
                                            })
                                            onUpdateLocal({ phone: val })
                                        }}
                                    />
                                </div>
                                {contact.phone && (
                                    <CopyButton value={contact.phone} />
                                )}
                            </div>
                            {contact.streetAddress && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="text-sm">
                                        {contact.streetAddress}, {contact.city}{' '}
                                        {contact.state} {contact.zip}
                                    </span>
                                </div>
                            )}
                        </div>

                        {(contact.role === 'ATTORNEY' ||
                            contact.role === 'ACCOUNTANT') &&
                            (contact.licenseNo || contact.barNo) && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                            Professional Credentials
                                        </p>
                                        {contact.licenseNo && (
                                            <p className="text-sm text-muted-foreground">
                                                {contact.role === 'ATTORNEY'
                                                    ? 'Bar Number'
                                                    : 'CPA License No.'}
                                                : {contact.licenseNo}
                                            </p>
                                        )}
                                        {contact.barNo &&
                                            contact.role === 'ATTORNEY' && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    State Bar Number:{' '}
                                                    {contact.barNo}
                                                </p>
                                            )}
                                    </div>
                                </>
                            )}

                        {contact.notes && (
                            <>
                                <Separator />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                        Notes
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {contact.notes}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
