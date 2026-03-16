'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Homestead, RentalProperty } from '@/db/schema'
import { useResourceForm } from '@/hooks/use-resource-form'
import { toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { trpc } from '@/lib/trpc'
import {
    asRecordStatus,
    asRentalStatus,
    asTransferStatus,
    asValuationType,
} from '@/lib/type-utils'
import type { HomesteadFormData, RentalFormData } from './constants'
import { HomesteadDialog } from './HomesteadDialog'
import { HomesteadSection } from './HomesteadSection'
import { RentalPropertyDialog } from './RentalPropertyDialog'
import { RentalPropertyTable } from './RentalPropertyTable'

const log = logger.create('Properties')

const defaultHomesteadForm: HomesteadFormData = {
    streetAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    county: '',
    dodValue: '',
    dodValueDate: '',
    dodValueType: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
}

const defaultRentalForm: RentalFormData = {
    name: '',
    streetAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    county: '',
    rentalStatus: 'RENTED',
    monthlyRent: '',
    leaseStart: '',
    leaseEnd: '',
    propertyManager: '',
    dodValue: '',
    dodValueDate: '',
    dodValueType: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
}

export function PropertiesClient() {
    const utils = trpc.useUtils()
    const { data: entities } = trpc.entity.list.useQuery()
    const entityId = entities?.[0]?.id
    const [activeTab, setActiveTab] = useState('homestead')

    const { data: homesteads = [], isLoading: homesteadsLoading } =
        trpc.homestead.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const createHomesteadMutation = trpc.homestead.create.useMutation({
        onSuccess: () => utils.homestead.list.invalidate(),
    })
    const updateHomesteadMutation = trpc.homestead.update.useMutation({
        onSuccess: () => utils.homestead.list.invalidate(),
    })
    const deleteHomesteadMutation = trpc.homestead.delete.useMutation({
        onSuccess: () => utils.homestead.list.invalidate(),
    })

    const { data: rentals = [], isLoading: rentalsLoading } =
        trpc.rentalProperty.list.useQuery(
            { entityId: entityId! },
            { enabled: !!entityId },
        )

    const createRentalMutation = trpc.rentalProperty.create.useMutation({
        onSuccess: () => utils.rentalProperty.list.invalidate(),
    })
    const updateRentalMutation = trpc.rentalProperty.update.useMutation({
        onSuccess: () => utils.rentalProperty.list.invalidate(),
    })
    const deleteRentalMutation = trpc.rentalProperty.delete.useMutation({
        onSuccess: () => utils.rentalProperty.list.invalidate(),
    })

    const updateRental = async (id: number, data: Partial<RentalProperty>) => {
        await updateRentalMutation.mutateAsync({
            id,
            entityId: entityId!,
            data,
        })
    }

    const [editingHomesteadId, setEditingHomesteadId] = useState<number | null>(
        null,
    )
    const [editingRentalId, setEditingRentalId] = useState<number | null>(null)

    const homesteadForm = useResourceForm<HomesteadFormData>({
        initialData: defaultHomesteadForm,
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                streetAddress: data.streetAddress,
                city: data.city,
                state: data.state,
                zip: data.zip,
                county: data.county || null,
                propertyType: 'SINGLE_FAMILY' as const,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                dodValueType: asValuationType(data.dodValueType || null),
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }

            if (homesteadForm.isEditing && editingHomesteadId) {
                await updateHomesteadMutation.mutateAsync({
                    id: editingHomesteadId,
                    entityId: entityId!,
                    data: payload,
                })
            } else {
                await createHomesteadMutation.mutateAsync(payload)
            }
            setEditingHomesteadId(null)
        },
    })

    const { formInstance: homesteadFormInstance } = homesteadForm

    const handleEditHomestead = (h: Homestead) => {
        setEditingHomesteadId(h.id)
        homesteadForm.handleEdit({
            streetAddress: h.streetAddress,
            city: h.city,
            state: h.state,
            zip: h.zip,
            county: h.county || '',
            dodValue: h.dodValue || '',
            dodValueDate: toDateInput(h.dodValueDate) || '',
            dodValueType: h.dodValueType || '',
            status: h.status,
            transferStatus: h.transferStatus,
            notes: h.notes || '',
        })
    }

    const rentalForm = useResourceForm<RentalFormData>({
        initialData: defaultRentalForm,
        onSubmit: async (data) => {
            const payload = {
                entityId: entityId!,
                name: data.name,
                streetAddress: data.streetAddress,
                city: data.city,
                state: data.state,
                zip: data.zip,
                county: data.county || null,
                propertyType: 'SINGLE_FAMILY' as const,
                rentalStatus: asRentalStatus(data.rentalStatus),
                monthlyRent: data.monthlyRent || null,
                leaseStart: data.leaseStart || null,
                leaseEnd: data.leaseEnd || null,
                propertyManager: data.propertyManager || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                dodValueType: asValuationType(data.dodValueType || null),
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }

            if (rentalForm.isEditing && editingRentalId) {
                await updateRentalMutation.mutateAsync({
                    id: editingRentalId,
                    entityId: entityId!,
                    data: payload,
                })
            } else {
                await createRentalMutation.mutateAsync(payload)
            }
            setEditingRentalId(null)
        },
    })

    const { formInstance: rentalFormInstance } = rentalForm

    const handleEditRental = (r: RentalProperty) => {
        setEditingRentalId(r.id)
        rentalForm.handleEdit({
            name: r.name || '',
            streetAddress: r.streetAddress,
            city: r.city,
            state: r.state,
            zip: r.zip,
            county: r.county || '',
            rentalStatus: r.rentalStatus,
            monthlyRent: r.monthlyRent || '',
            leaseStart: toDateInput(r.leaseStart) || '',
            leaseEnd: toDateInput(r.leaseEnd) || '',
            propertyManager: r.propertyManager || '',
            dodValue: r.dodValue || '',
            dodValueDate: toDateInput(r.dodValueDate) || '',
            dodValueType: r.dodValueType || '',
            status: r.status,
            transferStatus: r.transferStatus,
            notes: r.notes || '',
        })
    }

    const loading = homesteadsLoading || rentalsLoading

    const [pendingDeleteHomesteadId, setPendingDeleteHomesteadId] = useState<
        number | null
    >(null)
    const [pendingDeleteRentalId, setPendingDeleteRentalId] = useState<
        number | null
    >(null)

    const {
        dialogProps: deleteHomesteadDialogProps,
        confirm: confirmDeleteHomestead,
    } = useConfirmDialog({
        title: 'Delete Homestead',
        description:
            'Are you sure you want to delete this homestead? This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
        onConfirm: async () => {
            if (pendingDeleteHomesteadId === null) return
            try {
                await deleteHomesteadMutation.mutateAsync({
                    id: pendingDeleteHomesteadId,
                    entityId: entityId!,
                })
            } catch (err) {
                log.error('Failed to delete homestead', { error: err })
            } finally {
                setPendingDeleteHomesteadId(null)
            }
        },
    })

    const {
        dialogProps: deleteRentalDialogProps,
        confirm: confirmDeleteRental,
    } = useConfirmDialog({
        title: 'Delete Rental Property',
        description:
            'Are you sure you want to delete this rental property? This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
        onConfirm: async () => {
            if (pendingDeleteRentalId === null) return
            try {
                await deleteRentalMutation.mutateAsync({
                    id: pendingDeleteRentalId,
                    entityId: entityId!,
                })
            } catch (err) {
                log.error('Failed to delete rental', { error: err })
            } finally {
                setPendingDeleteRentalId(null)
            }
        },
    })

    const handleDeleteHomestead = (id: number) => {
        setPendingDeleteHomesteadId(id)
        confirmDeleteHomestead()
    }

    const handleDeleteRental = (id: number) => {
        setPendingDeleteRentalId(id)
        confirmDeleteRental()
    }

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const homestead = homesteads[0] // Texas trust allows one homestead

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Properties
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage real property assets
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="homestead">Homestead</TabsTrigger>
                    <TabsTrigger value="rentals">
                        Rental Properties
                        <Badge variant="secondary" className="ml-2">
                            {rentals.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="homestead" className="mt-6">
                    <HomesteadSection
                        homestead={homestead}
                        onAdd={() => homesteadForm.open()}
                        onEdit={handleEditHomestead}
                        onDelete={handleDeleteHomestead}
                    />
                </TabsContent>

                <TabsContent value="rentals" className="mt-6">
                    <RentalPropertyTable
                        rentals={rentals}
                        rentalsLoading={rentalsLoading}
                        onAdd={() => rentalForm.open()}
                        onEdit={handleEditRental}
                        onDelete={handleDeleteRental}
                        onUpdateRental={updateRental}
                    />
                </TabsContent>
            </Tabs>

            <HomesteadDialog
                isOpen={homesteadForm.isOpen}
                isEditing={homesteadForm.isEditing}
                isSubmitting={homesteadForm.isSubmitting}
                onOpenChange={homesteadForm.close}
                onSubmit={homesteadForm.handleSave}
                formInstance={homesteadFormInstance}
            />

            <RentalPropertyDialog
                isOpen={rentalForm.isOpen}
                isEditing={rentalForm.isEditing}
                isSubmitting={rentalForm.isSubmitting}
                onOpenChange={rentalForm.close}
                onSubmit={rentalForm.handleSave}
                formInstance={rentalFormInstance}
            />

            <ConfirmDialog {...deleteHomesteadDialogProps} />
            <ConfirmDialog {...deleteRentalDialogProps} />
        </div>
    )
}
