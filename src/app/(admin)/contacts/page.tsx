'use client'

import { Download, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Contact } from '@/db/schema'
import { useCrudMutations } from '@/hooks/use-crud-mutations'
import { useResourceForm } from '@/hooks/use-resource-form'
import { exportTablesInContainer } from '@/lib/csv'
import { contactFormDefaults } from '@/lib/form-factory'
import { trpc } from '@/lib/trpc'
import { ContactDetail } from './_components/ContactDetail'
import { ContactDialog } from './_components/ContactDialog'
import { ContactTable, type RoleFilter } from './_components/ContactTable'

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'ATTORNEY', label: 'Attorney' },
    { value: 'ACCOUNTANT', label: 'CPA' },
    { value: 'FINANCIAL_ADVISOR', label: 'Financial' },
    { value: 'INSURANCE_AGENT', label: 'Insurance' },
    { value: 'BANKER', label: 'Banker' },
    { value: 'OTHER', label: 'Other' },
]

export default function ContactsPage() {
    const utils = trpc.useUtils()
    const { data: contacts = [], isLoading } = trpc.contact.list.useQuery()

    const {
        create: createContactMutation,
        update: updateContactMutation,
        delete: deleteContactMutation,
    } = useCrudMutations({
        router: trpc.contact,
        invalidate: () => utils.contact.list.invalidate(),
    })

    const [filter, setFilter] = useState<RoleFilter>('all')
    const [search, setSearch] = useState('')
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [pendingDelete, setPendingDelete] = useState<Contact | null>(null)

    const contactForm = useResourceForm<Contact>({
        initialData: { ...contactFormDefaults(), id: 0, dob: null } as Contact,
        onSubmit: async (data) => {
            const payload = {
                name: data.name,
                company: data.company || null,
                role: data.role,
                email: data.email || null,
                phone: data.phone || null,
                dob: data.dob || null,
                streetAddress: data.streetAddress || null,
                city: data.city || null,
                state: data.state || null,
                zip: data.zip || null,
                notes: data.notes || null,
            }

            if (contactForm.isEditing && contactForm.editing) {
                await updateContactMutation.mutateAsync({
                    id: contactForm.editing.id,
                    data: payload,
                })
            } else {
                await createContactMutation.mutateAsync(payload)
            }
        },
    })

    const handleUpdateField = async (id: number, data: Partial<Contact>) => {
        await updateContactMutation.mutateAsync({ id, data })
    }

    const { dialogProps: deleteDialogProps, confirm: confirmDelete } =
        useConfirmDialog({
            title: 'Delete Contact',
            description:
                'Are you sure you want to delete this contact? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                if (!pendingDelete) return
                try {
                    await deleteContactMutation.mutateAsync(pendingDelete.id)
                } catch {
                    toast.error('Failed to delete contact')
                } finally {
                    setPendingDelete(null)
                }
            },
        })

    const handleDelete = (contact: Contact) => {
        setPendingDelete(contact)
        confirmDelete()
    }

    const filteredContacts = useMemo(() => {
        let data = contacts
        if (filter !== 'all') {
            data = data.filter((c) => c.role === filter)
        }
        if (search) {
            const searchLower = search.toLowerCase()
            data = data.filter(
                (c) =>
                    c.name.toLowerCase().includes(searchLower) ||
                    c.company?.toLowerCase().includes(searchLower),
            )
        }
        return data
    }, [contacts, filter, search])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Contacts
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {contacts.length} professional contacts
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                            const main = document.querySelector('main')
                            if (!main) return
                            exportTablesInContainer(
                                main as HTMLElement,
                                'contacts',
                            )
                        }}
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button onClick={contactForm.handleAdd}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Tabs
                            value={filter}
                            onValueChange={(v) => setFilter(v as RoleFilter)}
                        >
                            <TabsList>
                                {ROLE_FILTERS.map((f) => (
                                    <TabsTrigger key={f.value} value={f.value}>
                                        {f.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                        <Input
                            placeholder="Search contacts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    <ContactTable
                        contacts={filteredContacts}
                        isLoading={isLoading}
                        onView={setSelectedContact}
                        onEdit={(c) => contactForm.handleEdit(c)}
                        onDelete={handleDelete}
                        onUpdateField={handleUpdateField}
                    />
                </CardContent>
            </Card>

            <ContactDetail
                contact={selectedContact}
                onOpenChange={() => setSelectedContact(null)}
                onUpdateField={handleUpdateField}
                onUpdateLocal={(updates) =>
                    setSelectedContact((prev) =>
                        prev ? { ...prev, ...updates } : null,
                    )
                }
            />

            <ContactDialog
                isOpen={contactForm.isOpen}
                isEditing={contactForm.isEditing}
                isSubmitting={contactForm.isSubmitting}
                onOpenChange={contactForm.close}
                onSubmit={contactForm.handleSave}
                formInstance={contactForm.formInstance}
            />
            <ConfirmDialog {...deleteDialogProps} />
        </div>
    )
}
