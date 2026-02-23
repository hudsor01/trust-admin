'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Homestead, RentalProperty } from '@/db/schema'
import { useEntityFilter } from '@/hooks/use-entity-filter'
import { useNeonList, useNeonMutations } from '@/hooks/use-neon-data'
import { useResourceForm } from '@/hooks/use-resource-form'
import { toDateInput } from '@/lib/form-factory'
import { logger } from '@/lib/logger'
import { trpc } from '@/lib/trpc'
import {
    asPropertyType,
    asRecordStatus,
    asRentalStatus,
    asTransferStatus,
    asValuationType,
} from '@/lib/type-utils'
import type { HomesteadFormData, RentalFormData } from './_components/constants'
import { HomesteadDialog } from './_components/HomesteadDialog'
import { HomesteadSection } from './_components/HomesteadSection'
import { RentalPropertyDialog } from './_components/RentalPropertyDialog'
import { RentalPropertyTable } from './_components/RentalPropertyTable'

const log = logger.create('Properties')

const defaultHomesteadForm: HomesteadFormData = {
    streetAddress: '',
    city: '',
    state: 'TX',
    zip: '',
    county: '',
    parcelNumber: '',
    legalDescription: '',
    propertyType: 'SINGLE_FAMILY',
    yearBuilt: '',
    squareFeet: '',
    lotSizeAcres: '',
    bedrooms: '',
    bathrooms: '',
    acquisitionDate: '',
    acquisitionCost: '',
    dodValue: '',
    dodValueDate: '',
    dodValueType: '',
    dodAffidavitFiled: false,
    dodAffidavitDate: '',
    clerkFileNo: '',
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
    parcelNumber: '',
    propertyType: 'SINGLE_FAMILY',
    units: '1',
    squareFeet: '',
    lotSizeAcres: '',
    yearBuilt: '',
    rentalStatus: 'RENTED',
    monthlyRent: '',
    leaseStart: '',
    leaseEnd: '',
    propertyManager: '',
    acquisitionDate: '',
    acquisitionCost: '',
    mortgageBalance: '',
    dodValue: '',
    dodValueDate: '',
    dodValueType: '',
    dodAffidavitFiled: false,
    dodAffidavitDate: '',
    clerkFileNo: '',
    status: 'ACTIVE',
    transferStatus: 'PENDING',
    notes: '',
}

export default function PropertiesPage() {
    const { data: entities = [], isLoading: entitiesLoading } =
        trpc.entity.list.useQuery()
    const [entityId, setEntityId] = useEntityFilter()
    const selectedEntity = entityId ? Number(entityId) : entities[0]?.id
    const [activeTab, setActiveTab] = useState('homestead')

    const queryEnabled = !!selectedEntity

    // Homestead queries and mutations
    const { data: homesteads = [], isLoading: homesteadsLoading } =
        useNeonList<Homestead>(
            'homestead',
            selectedEntity ? { entity_id: selectedEntity } : undefined,
            { enabled: queryEnabled },
        )
    const {
        create: createHomesteadMutation,
        update: updateHomesteadMutation,
        delete: deleteHomesteadMutation,
    } = useNeonMutations<Homestead>('homestead')

    // Rental property queries and mutations
    const { data: rentals = [], isLoading: rentalsLoading } =
        useNeonList<RentalProperty>(
            'rental_property',
            selectedEntity ? { entity_id: selectedEntity } : undefined,
            { enabled: queryEnabled },
        )
    const {
        create: createRentalMutation,
        update: updateRentalMutation,
        delete: deleteRentalMutation,
    } = useNeonMutations<RentalProperty>('rental_property')

    // Wrapper for inline edits in the rental table
    const updateRental = async (id: number, data: Partial<RentalProperty>) => {
        if (!selectedEntity) return
        await updateRentalMutation.mutateAsync({
            id,
            entityId: selectedEntity,
            data,
        })
    }

    // Track editing IDs
    const [editingHomesteadId, setEditingHomesteadId] = useState<number | null>(
        null,
    )
    const [editingRentalId, setEditingRentalId] = useState<number | null>(null)

    // Homestead form
    const homesteadForm = useResourceForm<HomesteadFormData>({
        initialData: defaultHomesteadForm,
        onSubmit: async (data) => {
            if (!selectedEntity) return

            const payload = {
                entityId: selectedEntity,
                streetAddress: data.streetAddress,
                city: data.city,
                state: data.state,
                zip: data.zip,
                county: data.county || null,
                parcelNumber: data.parcelNumber || null,
                legalDescription: data.legalDescription || null,
                propertyType: asPropertyType(data.propertyType),
                yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt, 10) : null,
                squareFeet: data.squareFeet
                    ? parseInt(data.squareFeet, 10)
                    : null,
                lotSizeAcres: data.lotSizeAcres || null,
                bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : null,
                bathrooms: data.bathrooms || null,
                acquisitionDate: data.acquisitionDate || null,
                acquisitionCost: data.acquisitionCost || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                dodValueType: asValuationType(data.dodValueType || null),
                dodAffidavitFiled: data.dodAffidavitFiled || false,
                dodAffidavitDate: data.dodAffidavitDate || null,
                clerkFileNo: data.clerkFileNo || null,
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }

            if (homesteadForm.isEditing && editingHomesteadId) {
                await updateHomesteadMutation.mutateAsync({
                    id: editingHomesteadId,
                    entityId: selectedEntity,
                    data: payload,
                })
            } else {
                await createHomesteadMutation.mutateAsync(payload)
            }
            setEditingHomesteadId(null)
        },
    })

    const { formInstance: homesteadFormInstance } = homesteadForm

    // Custom edit handler for homestead
    const handleEditHomestead = (h: Homestead) => {
        setEditingHomesteadId(h.id)
        homesteadForm.handleEdit({
            streetAddress: h.streetAddress,
            city: h.city,
            state: h.state,
            zip: h.zip,
            county: h.county || '',
            parcelNumber: h.parcelNumber || '',
            legalDescription: h.legalDescription || '',
            propertyType: h.propertyType,
            yearBuilt: h.yearBuilt?.toString() || '',
            squareFeet: h.squareFeet?.toString() || '',
            lotSizeAcres: h.lotSizeAcres?.toString() || '',
            bedrooms: h.bedrooms?.toString() || '',
            bathrooms: h.bathrooms || '',
            acquisitionDate: toDateInput(h.acquisitionDate) || '',
            acquisitionCost: h.acquisitionCost || '',
            dodValue: h.dodValue || '',
            dodValueDate: toDateInput(h.dodValueDate) || '',
            dodValueType: h.dodValueType || '',
            dodAffidavitFiled: h.dodAffidavitFiled || false,
            dodAffidavitDate: toDateInput(h.dodAffidavitDate) || '',
            clerkFileNo: h.clerkFileNo || '',
            status: h.status,
            transferStatus: h.transferStatus,
            notes: h.notes || '',
        })
    }

    // Rental form
    const rentalForm = useResourceForm<RentalFormData>({
        initialData: defaultRentalForm,
        onSubmit: async (data) => {
            if (!selectedEntity) return

            const payload = {
                entityId: selectedEntity,
                name: data.name,
                streetAddress: data.streetAddress,
                city: data.city,
                state: data.state,
                zip: data.zip,
                county: data.county || null,
                parcelNumber: data.parcelNumber || null,
                propertyType: asPropertyType(data.propertyType),
                units: parseInt(data.units, 10) || 1,
                squareFeet: data.squareFeet
                    ? parseInt(data.squareFeet, 10)
                    : null,
                lotSizeAcres: data.lotSizeAcres || null,
                yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt, 10) : null,
                rentalStatus: asRentalStatus(data.rentalStatus),
                monthlyRent: data.monthlyRent || null,
                leaseStart: data.leaseStart || null,
                leaseEnd: data.leaseEnd || null,
                propertyManager: data.propertyManager || null,
                acquisitionDate: data.acquisitionDate || null,
                acquisitionCost: data.acquisitionCost || null,
                mortgageBalance: data.mortgageBalance || null,
                dodValue: data.dodValue || null,
                dodValueDate: data.dodValueDate || null,
                dodValueType: asValuationType(data.dodValueType || null),
                dodAffidavitFiled: data.dodAffidavitFiled || false,
                dodAffidavitDate: data.dodAffidavitDate || null,
                clerkFileNo: data.clerkFileNo || null,
                status: asRecordStatus(data.status),
                transferStatus: asTransferStatus(data.transferStatus),
                notes: data.notes || null,
            }

            if (rentalForm.isEditing && editingRentalId) {
                await updateRentalMutation.mutateAsync({
                    id: editingRentalId,
                    entityId: selectedEntity,
                    data: payload,
                })
            } else {
                await createRentalMutation.mutateAsync(payload)
            }
            setEditingRentalId(null)
        },
    })

    const { formInstance: rentalFormInstance } = rentalForm

    // Custom edit handler for rental
    const handleEditRental = (r: RentalProperty) => {
        setEditingRentalId(r.id)
        rentalForm.handleEdit({
            name: r.name || '',
            streetAddress: r.streetAddress,
            city: r.city,
            state: r.state,
            zip: r.zip,
            county: r.county || '',
            parcelNumber: r.parcelNumber || '',
            propertyType: r.propertyType,
            units: r.units?.toString() || '1',
            squareFeet: r.squareFeet?.toString() || '',
            lotSizeAcres: r.lotSizeAcres?.toString() || '',
            yearBuilt: r.yearBuilt?.toString() || '',
            rentalStatus: r.rentalStatus,
            monthlyRent: r.monthlyRent || '',
            leaseStart: toDateInput(r.leaseStart) || '',
            leaseEnd: toDateInput(r.leaseEnd) || '',
            propertyManager: r.propertyManager || '',
            acquisitionDate: toDateInput(r.acquisitionDate) || '',
            acquisitionCost: r.acquisitionCost || '',
            mortgageBalance: r.mortgageBalance || '',
            dodValue: r.dodValue || '',
            dodValueDate: toDateInput(r.dodValueDate) || '',
            dodValueType: r.dodValueType || '',
            dodAffidavitFiled: r.dodAffidavitFiled || false,
            dodAffidavitDate: toDateInput(r.dodAffidavitDate) || '',
            clerkFileNo: r.clerkFileNo || '',
            status: r.status,
            transferStatus: r.transferStatus,
            notes: r.notes || '',
        })
    }

    const loading = entitiesLoading || homesteadsLoading || rentalsLoading

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
            if (pendingDeleteHomesteadId === null || !selectedEntity) return
            try {
                await deleteHomesteadMutation.mutateAsync({
                    id: pendingDeleteHomesteadId,
                    entityId: selectedEntity,
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
            if (pendingDeleteRentalId === null || !selectedEntity) return
            try {
                await deleteRentalMutation.mutateAsync({
                    id: pendingDeleteRentalId,
                    entityId: selectedEntity,
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

    const homestead = homesteads[0] // Only one homestead per trust

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Properties
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage real property assets
                    </p>
                </div>
                <Select
                    value={selectedEntity?.toString() ?? ''}
                    onValueChange={(val) => setEntityId(val || null)}
                >
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                        {entities.map((e) => (
                            <SelectItem key={e.id} value={e.id.toString()}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedEntity && (
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
                            selectedEntity={selectedEntity}
                            onAdd={() => homesteadForm.open()}
                            onEdit={handleEditHomestead}
                            onDelete={handleDeleteHomestead}
                        />
                    </TabsContent>

                    <TabsContent value="rentals" className="mt-6">
                        <RentalPropertyTable
                            rentals={rentals}
                            rentalsLoading={rentalsLoading}
                            selectedEntity={selectedEntity}
                            onAdd={() => rentalForm.open()}
                            onEdit={handleEditRental}
                            onDelete={handleDeleteRental}
                            onUpdateRental={updateRental}
                        />
                    </TabsContent>
                </Tabs>
            )}

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
