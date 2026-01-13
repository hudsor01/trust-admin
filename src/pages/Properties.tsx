"use client"

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { type ColumnDef, DataTable } from "@/components/data-table"
import {
  EditableCurrencyCell,
  EditableNumberCell,
  EditableSelectCell,
  EditableTextCell,
} from "@/components/editable-cells"
import { ResourceDialog } from "@/components/resource-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// Import types and hooks from TanStack Query hooks
import { useEntities } from "@/hooks/entities/queries"
import {
  type Homestead,
  useCreateHomestead,
  useDeleteHomestead,
  useHomesteads,
  useUpdateHomestead,
} from "@/hooks/homesteads/queries"
import {
  type RentalProperty,
  useCreateRentalProperty,
  useDeleteRentalProperty,
  useRentalProperties,
  useUpdateRentalProperty,
} from "@/hooks/rental-properties/queries"
import { useResourceForm } from "@/hooks/use-resource-form"
import { DOD_VALUE_TYPES, RENTAL_STATUS, STATUS_VARIANTS, TRANSFER_STATUS } from "@/lib/constants"
import { toDateInput } from "@/lib/form-factory"
import { formatCurrency, formatDate } from "../utils/formatters"

const PROPERTY_TYPES = [
  { value: "SINGLE_FAMILY", label: "Single Family" },
  { value: "MULTI_FAMILY", label: "Multi Family" },
  { value: "CONDO", label: "Condo" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "LAND", label: "Land" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "MOBILE_HOME", label: "Mobile Home" },
]

const ASSET_STATUS = [
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD", label: "Sold" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "DISPOSED", label: "Disposed" },
]

interface HomesteadFormData {
  streetAddress: string
  city: string
  state: string
  zip: string
  county: string
  parcelNumber: string
  legalDescription: string
  propertyType: string
  yearBuilt: string
  squareFeet: string
  lotSizeAcres: string
  bedrooms: string
  bathrooms: string
  acquisitionDate: string
  acquisitionCost: string
  dodValue: string
  dodValueDate: string
  dodValueType: string
  dodAffidavitFiled: boolean
  dodAffidavitDate: string
  clerkFileNo: string
  status: string
  transferStatus: string
  notes: string
}

interface RentalFormData {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  county: string
  parcelNumber: string
  propertyType: string
  units: string
  squareFeet: string
  lotSizeAcres: string
  yearBuilt: string
  rentalStatus: string
  monthlyRent: string
  leaseStart: string
  leaseEnd: string
  propertyManager: string
  acquisitionDate: string
  acquisitionCost: string
  mortgageBalance: string
  dodValue: string
  dodValueDate: string
  dodValueType: string
  dodAffidavitFiled: boolean
  dodAffidavitDate: string
  clerkFileNo: string
  status: string
  transferStatus: string
  notes: string
}

const defaultHomesteadForm: HomesteadFormData = {
  streetAddress: "",
  city: "",
  state: "TX",
  zip: "",
  county: "",
  parcelNumber: "",
  legalDescription: "",
  propertyType: "SINGLE_FAMILY",
  yearBuilt: "",
  squareFeet: "",
  lotSizeAcres: "",
  bedrooms: "",
  bathrooms: "",
  acquisitionDate: "",
  acquisitionCost: "",
  dodValue: "",
  dodValueDate: "",
  dodValueType: "",
  dodAffidavitFiled: false,
  dodAffidavitDate: "",
  clerkFileNo: "",
  status: "ACTIVE",
  transferStatus: "PENDING",
  notes: "",
}

const defaultRentalForm: RentalFormData = {
  name: "",
  streetAddress: "",
  city: "",
  state: "TX",
  zip: "",
  county: "",
  parcelNumber: "",
  propertyType: "SINGLE_FAMILY",
  units: "1",
  squareFeet: "",
  lotSizeAcres: "",
  yearBuilt: "",
  rentalStatus: "RENTED",
  monthlyRent: "",
  leaseStart: "",
  leaseEnd: "",
  propertyManager: "",
  acquisitionDate: "",
  acquisitionCost: "",
  mortgageBalance: "",
  dodValue: "",
  dodValueDate: "",
  dodValueType: "",
  dodAffidavitFiled: false,
  dodAffidavitDate: "",
  clerkFileNo: "",
  status: "ACTIVE",
  transferStatus: "PENDING",
  notes: "",
}

export function Properties() {
  // Use TanStack Query hooks for data fetching
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string>("")
  const [activeTab, setActiveTab] = useState("homestead")

  // Homestead hooks
  const { data: homesteads = [], isLoading: homesteadsLoading } = useHomesteads(
    selectedEntity || undefined,
  )
  const createHomesteadMutation = useCreateHomestead()
  const updateHomesteadMutation = useUpdateHomestead()

  // Wrapper functions to match inline cell API
  const _updateHomestead = async (id: string, data: Partial<Homestead>) => {
    return await updateHomesteadMutation.mutateAsync({ id, data })
  }
  const updateRental = async (id: string, data: Partial<RentalProperty>) => {
    return await updateRentalMutation.mutateAsync({ id, data })
  }
  const deleteHomesteadMutation = useDeleteHomestead()

  // Track editing ID for Homestead
  const [editingHomesteadId, setEditingHomesteadId] = useState<string | null>(null)

  // Homestead form state
  const {
    isOpen: isHomesteadOpen,
    close: closeHomestead,
    form: _homesteadForm,
    setForm: _setHomesteadForm,
    handleEdit: handleEditHomesteadForm,
    handleAdd: handleAddHomestead,
    handleSave: handleSaveHomestead,
    isSubmitting: isHomesteadSubmitting,
    isEditing: isEditingHomestead,
    formInstance: homesteadFormInstance,
  } = useResourceForm<HomesteadFormData>({
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
        propertyType: data.propertyType,
        yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt, 10) : null,
        squareFeet: data.squareFeet ? parseInt(data.squareFeet, 10) : null,
        lotSizeAcres: data.lotSizeAcres || null,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms, 10) : null,
        bathrooms: data.bathrooms || null,
        acquisitionDate: data.acquisitionDate || null,
        acquisitionCost: data.acquisitionCost || null,
        dodValue: data.dodValue || null,
        dodValueDate: data.dodValueDate || null,
        dodValueType: data.dodValueType || null,
        dodAffidavitFiled: data.dodAffidavitFiled || false,
        dodAffidavitDate: data.dodAffidavitDate || null,
        clerkFileNo: data.clerkFileNo || null,
        status: data.status,
        transferStatus: data.transferStatus,
        notes: data.notes || null,
      }

      if (isEditingHomestead && editingHomesteadId) {
        await updateHomesteadMutation.mutateAsync({ id: editingHomesteadId, data: payload })
      } else {
        await createHomesteadMutation.mutateAsync(payload)
      }
    },
  })

  // Custom edit handler to track ID and transform data
  const handleEditHomestead = (h: Homestead) => {
    setEditingHomesteadId(h.id)
    handleEditHomesteadForm({
      streetAddress: h.streetAddress,
      city: h.city,
      state: h.state,
      zip: h.zip,
      county: h.county || "",
      parcelNumber: h.parcelNumber || "",
      legalDescription: h.legalDescription || "",
      propertyType: h.propertyType,
      yearBuilt: h.yearBuilt?.toString() || "",
      squareFeet: h.squareFeet?.toString() || "",
      lotSizeAcres: h.lotSizeAcres?.toString() || "",
      bedrooms: h.bedrooms?.toString() || "",
      bathrooms: h.bathrooms || "",
      acquisitionDate: toDateInput(h.acquisitionDate) || "",
      acquisitionCost: h.acquisitionCost || "",
      dodValue: h.dodValue || "",
      dodValueDate: toDateInput(h.dodValueDate) || "",
      dodValueType: h.dodValueType || "",
      dodAffidavitFiled: h.dodAffidavitFiled || false,
      dodAffidavitDate: toDateInput(h.dodAffidavitDate) || "",
      clerkFileNo: h.clerkFileNo || "",
      status: h.status,
      transferStatus: h.transferStatus,
      notes: h.notes || "",
    })
  }

  // Rental hooks
  const { data: rentals = [], isLoading: rentalsLoading } = useRentalProperties(
    selectedEntity || undefined,
  )
  const createRentalMutation = useCreateRentalProperty()
  const updateRentalMutation = useUpdateRentalProperty()
  const deleteRentalMutation = useDeleteRentalProperty()

  // Track editing ID for Rental
  const [editingRentalId, setEditingRentalId] = useState<string | null>(null)

  // Rental form state
  const {
    isOpen: isRentalOpen,
    close: closeRental,
    form: _rentalForm,
    setForm: _setRentalForm,
    handleEdit: handleEditRentalForm,
    handleAdd: handleAddRental,
    handleSave: handleSaveRental,
    isSubmitting: isRentalSubmitting,
    isEditing: isEditingRental,
    formInstance: rentalFormInstance,
  } = useResourceForm<RentalFormData>({
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
        propertyType: data.propertyType,
        units: parseInt(data.units, 10) || 1,
        squareFeet: data.squareFeet ? parseInt(data.squareFeet, 10) : null,
        lotSizeAcres: data.lotSizeAcres || null,
        yearBuilt: data.yearBuilt ? parseInt(data.yearBuilt, 10) : null,
        rentalStatus: data.rentalStatus,
        monthlyRent: data.monthlyRent || null,
        leaseStart: data.leaseStart || null,
        leaseEnd: data.leaseEnd || null,
        propertyManager: data.propertyManager || null,
        acquisitionDate: data.acquisitionDate || null,
        acquisitionCost: data.acquisitionCost || null,
        mortgageBalance: data.mortgageBalance || null,
        dodValue: data.dodValue || null,
        dodValueDate: data.dodValueDate || null,
        dodValueType: data.dodValueType || null,
        dodAffidavitFiled: data.dodAffidavitFiled || false,
        dodAffidavitDate: data.dodAffidavitDate || null,
        clerkFileNo: data.clerkFileNo || null,
        status: data.status,
        transferStatus: data.transferStatus,
        notes: data.notes || null,
      }

      if (isEditingRental && editingRentalId) {
        await updateRentalMutation.mutateAsync({ id: editingRentalId, data: payload })
      } else {
        await createRentalMutation.mutateAsync(payload)
      }
    },
  })

  // Custom edit handler to track ID and transform data
  const handleEditRental = (r: RentalProperty) => {
    setEditingRentalId(r.id)
    handleEditRentalForm({
      name: r.name || "",
      streetAddress: r.streetAddress,
      city: r.city,
      state: r.state,
      zip: r.zip,
      county: r.county || "",
      parcelNumber: r.parcelNumber || "",
      propertyType: r.propertyType,
      units: r.units?.toString() || "1",
      squareFeet: r.squareFeet?.toString() || "",
      lotSizeAcres: r.lotSizeAcres?.toString() || "",
      yearBuilt: r.yearBuilt?.toString() || "",
      rentalStatus: r.rentalStatus,
      monthlyRent: r.monthlyRent || "",
      leaseStart: toDateInput(r.leaseStart) || "",
      leaseEnd: toDateInput(r.leaseEnd) || "",
      propertyManager: r.propertyManager || "",
      acquisitionDate: toDateInput(r.acquisitionDate) || "",
      acquisitionCost: r.acquisitionCost || "",
      mortgageBalance: r.mortgageBalance || "",
      dodValue: r.dodValue || "",
      dodValueDate: toDateInput(r.dodValueDate) || "",
      dodValueType: r.dodValueType || "",
      dodAffidavitFiled: r.dodAffidavitFiled || false,
      dodAffidavitDate: toDateInput(r.dodAffidavitDate) || "",
      clerkFileNo: r.clerkFileNo || "",
      status: r.status,
      transferStatus: r.transferStatus,
      notes: r.notes || "",
    })
  }

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const loading = entitiesLoading || homesteadsLoading || rentalsLoading

  const handleDeleteHomestead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this homestead?")) return
    try {
      await deleteHomesteadMutation.mutateAsync(id)
    } catch (err) {
      console.error("Failed to delete homestead:", err)
    }
  }

  const handleDeleteRental = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rental property?")) return
    try {
      await deleteRentalMutation.mutateAsync(id)
    } catch (err) {
      console.error("Failed to delete rental:", err)
    }
  }

  // Column configuration for Rental Properties table
  const rentalColumns: ColumnDef<RentalProperty>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (item) => (
        <EditableTextCell
          value={item.name}
          onSave={async (v) => updateRental(item.id, { name: v as string })}
        />
      ),
    },
    {
      key: "streetAddress",
      header: "Address",
      render: (item) => (
        <>
          <p className="text-sm">{item.streetAddress}</p>
          <p className="text-xs text-muted-foreground">
            {item.city}, {item.state} {item.zip}
          </p>
        </>
      ),
    },
    {
      key: "units",
      header: "Units",
      sortable: true,
      render: (item) => (
        <EditableNumberCell
          value={item.units}
          onSave={async (v) => updateRental(item.id, { units: v as number })}
        />
      ),
    },
    {
      key: "monthlyRent",
      header: "Monthly Rent",
      sortable: true,
      render: (item) => (
        <EditableCurrencyCell
          value={item.monthlyRent}
          onSave={async (v) => updateRental(item.id, { monthlyRent: v })}
        />
      ),
    },
    {
      key: "dodValue",
      header: "DOD Value",
      sortable: true,
      render: (item) => (
        <EditableCurrencyCell
          value={item.dodValue}
          onSave={async (v) => updateRental(item.id, { dodValue: v })}
        />
      ),
    },
    {
      key: "rentalStatus",
      header: "Status",
      render: (item) => (
        <EditableSelectCell
          value={item.rentalStatus}
          options={RENTAL_STATUS}
          onSave={async (v) => updateRental(item.id, { rentalStatus: v })}
          variants={STATUS_VARIANTS}
        />
      ),
    },
    {
      key: "transferStatus",
      header: "Transfer",
      render: (item) => (
        <EditableSelectCell
          value={item.transferStatus}
          options={TRANSFER_STATUS}
          onSave={async (v) => updateRental(item.id, { transferStatus: v })}
          variants={STATUS_VARIANTS}
        />
      ),
    },
  ]

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
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Properties</h2>
          <p className="text-sm text-muted-foreground">Manage real property assets</p>
        </div>
        <Select value={selectedEntity} onValueChange={setSelectedEntity}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select entity" />
          </SelectTrigger>
          <SelectContent>
            {entities.map((e) => (
              <SelectItem key={e.id} value={e.id}>
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
            {homestead ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{homestead.streetAddress}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANTS[homestead.transferStatus]}>
                        {homestead.transferStatus}
                      </Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditHomestead(homestead)}
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
                              onClick={() => handleDeleteHomestead(homestead.id)}
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
                      <p className="mt-1 text-sm">{homestead.streetAddress}</p>
                      <p className="text-sm">
                        {homestead.city}, {homestead.state} {homestead.zip}
                      </p>
                      {homestead.county && (
                        <p className="text-sm text-muted-foreground">{homestead.county} County</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Property Details
                      </p>
                      <p className="mt-1 text-sm">
                        {PROPERTY_TYPES.find((t) => t.value === homestead.propertyType)?.label}
                      </p>
                      {homestead.bedrooms && homestead.bathrooms && (
                        <p className="text-sm">
                          {homestead.bedrooms} bed / {homestead.bathrooms} bath
                        </p>
                      )}
                      {homestead.squareFeet && (
                        <p className="text-sm">{homestead.squareFeet.toLocaleString()} sq ft</p>
                      )}
                      {homestead.yearBuilt && (
                        <p className="text-sm">Built {homestead.yearBuilt}</p>
                      )}
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

                  {(homestead.parcelNumber || homestead.dodAffidavitFiled) && (
                    <div className="mt-6 grid grid-cols-2 gap-6">
                      {homestead.parcelNumber && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Parcel Number
                          </p>
                          <p className="mt-1 text-sm">{homestead.parcelNumber}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          DOD Affidavit Filed
                        </p>
                        <p className="mt-1 text-sm">
                          {homestead.dodAffidavitFiled ? (
                            <>
                              Yes - {formatDate(homestead.dodAffidavitDate)}{" "}
                              {homestead.clerkFileNo && `(#${homestead.clerkFileNo})`}
                            </>
                          ) : (
                            "Not yet filed"
                          )}
                        </p>
                      </div>
                    </div>
                  )}

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
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="mb-4 text-muted-foreground">No homestead on record</p>
                  <Button onClick={handleAddHomestead}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Homestead
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rentals" className="mt-6">
            <div className="mb-4 flex justify-end">
              <Button onClick={handleAddRental}>
                <Plus className="mr-2 h-4 w-4" />
                Add Rental Property
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <DataTable
                  data={rentals}
                  columns={rentalColumns}
                  onEdit={handleEditRental}
                  onDelete={(r) => handleDeleteRental(r.id)}
                  isLoading={rentalsLoading}
                  emptyMessage="No rental properties. Click Add to create one."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Homestead Form Dialog */}
      <ResourceDialog
        open={isHomesteadOpen}
        onOpenChange={closeHomestead}
        title={isEditingHomestead ? "Edit Homestead" : "Add Homestead"}
        onSubmit={handleSaveHomestead}
        isLoading={isHomesteadSubmitting}
      >
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 text-sm font-medium">Address</h4>
            <div className="space-y-3">
              <homesteadFormInstance.Field name="streetAddress">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-street">Street Address</Label>
                    <Input
                      id="h-street"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <div className="grid grid-cols-4 gap-3">
                <homesteadFormInstance.Field name="city">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="h-city">City</Label>
                      <Input
                        id="h-city"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors?.[0] && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </homesteadFormInstance.Field>
                <homesteadFormInstance.Field name="state">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="h-state">State</Label>
                      <Input
                        id="h-state"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors?.[0] && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </homesteadFormInstance.Field>
                <homesteadFormInstance.Field name="zip">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="h-zip">ZIP</Label>
                      <Input
                        id="h-zip"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors?.[0] && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </homesteadFormInstance.Field>
                <homesteadFormInstance.Field name="county">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="h-county">County</Label>
                      <Input
                        id="h-county"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors?.[0] && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </homesteadFormInstance.Field>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-medium">Property Details</h4>
            <div className="grid grid-cols-3 gap-3">
              <homesteadFormInstance.Field name="propertyType">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="yearBuilt">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-year">Year Built</Label>
                    <Input
                      id="h-year"
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="squareFeet">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-sqft">Square Feet</Label>
                    <Input
                      id="h-sqft"
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <homesteadFormInstance.Field name="bedrooms">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-beds">Bedrooms</Label>
                    <Input
                      id="h-beds"
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="bathrooms">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-baths">Bathrooms</Label>
                    <Input
                      id="h-baths"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="lotSizeAcres">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-lot">Lot Size (acres)</Label>
                    <Input
                      id="h-lot"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="parcelNumber">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-parcel">Parcel Number</Label>
                    <Input
                      id="h-parcel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-medium">Acquisition</h4>
            <div className="grid grid-cols-2 gap-3">
              <homesteadFormInstance.Field name="acquisitionDate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-acq-date">Acquisition Date</Label>
                    <Input
                      id="h-acq-date"
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="acquisitionCost">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-acq-cost">Acquisition Cost</Label>
                    <Input
                      id="h-acq-cost"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="$"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-medium">Date of Death Valuation</h4>
            <div className="grid grid-cols-3 gap-3">
              <homesteadFormInstance.Field name="dodValue">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-dod-val">DOD Value</Label>
                    <Input
                      id="h-dod-val"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="$"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="dodValueDate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="h-dod-date">DOD Value Date</Label>
                    <Input
                      id="h-dod-date"
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="dodValueType">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Valuation Type</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOD_VALUE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-medium">DOD Affidavit (Texas)</h4>
            <div className="grid grid-cols-3 items-end gap-3">
              <homesteadFormInstance.Field name="dodAffidavitFiled">
                {(field) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="h-affidavit"
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(!!checked)}
                    />
                    <Label htmlFor="h-affidavit">Affidavit Filed</Label>
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Subscribe<boolean>
                selector={(state) => state.values.dodAffidavitFiled}
              >
                {(dodAffidavitFiled) => (
                  <>
                    <homesteadFormInstance.Field name="dodAffidavitDate">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="h-filing-date">Filing Date</Label>
                          <Input
                            id="h-filing-date"
                            type="date"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            disabled={!dodAffidavitFiled}
                          />
                          {field.state.meta.errors?.[0] && (
                            <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                          )}
                        </div>
                      )}
                    </homesteadFormInstance.Field>
                    <homesteadFormInstance.Field name="clerkFileNo">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="h-clerk">Clerk File Number</Label>
                          <Input
                            id="h-clerk"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            disabled={!dodAffidavitFiled}
                          />
                          {field.state.meta.errors?.[0] && (
                            <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                          )}
                        </div>
                      )}
                    </homesteadFormInstance.Field>
                  </>
                )}
              </homesteadFormInstance.Subscribe>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-medium">Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <homesteadFormInstance.Field name="status">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Asset Status</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_STATUS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
              <homesteadFormInstance.Field name="transferStatus">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Transfer Status</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFER_STATUS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </homesteadFormInstance.Field>
            </div>
          </div>

          <homesteadFormInstance.Field name="notes">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="h-notes">Notes</Label>
                <Textarea
                  id="h-notes"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </homesteadFormInstance.Field>
        </div>
      </ResourceDialog>

      {/* Rental Property Form Dialog */}
      <ResourceDialog
        open={isRentalOpen}
        onOpenChange={closeRental}
        title={isEditingRental ? "Edit Rental Property" : "Add Rental Property"}
        onSubmit={handleSaveRental}
        isLoading={isRentalSubmitting}
      >
        <div className="space-y-6">
          {/* Property Info */}
          <div>
            <h4 className="mb-3 text-sm font-medium">Property Info</h4>
            <div className="space-y-3">
              <rentalFormInstance.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-name">Property Name</Label>
                    <Input
                      id="r-name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Oak Street Duplex"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="streetAddress">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-street">Street Address</Label>
                    <Input
                      id="r-street"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <div className="grid grid-cols-4 gap-3">
                <rentalFormInstance.Field name="city">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="r-city">City</Label>
                      <Input
                        id="r-city"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors?.[0] && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </rentalFormInstance.Field>
                <rentalFormInstance.Field name="state">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="r-state">State</Label>
                      <Input
                        id="r-state"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors?.[0] && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </rentalFormInstance.Field>
                <rentalFormInstance.Field name="zip">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="r-zip">ZIP</Label>
                      <Input
                        id="r-zip"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors?.[0] && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </rentalFormInstance.Field>
                <rentalFormInstance.Field name="county">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="r-county">County</Label>
                      <Input
                        id="r-county"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors?.[0] && (
                        <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                      )}
                    </div>
                  )}
                </rentalFormInstance.Field>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h4 className="mb-3 text-sm font-medium">Property Details</h4>
            <div className="grid grid-cols-4 gap-3">
              <rentalFormInstance.Field name="propertyType">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="units">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-units">Units</Label>
                    <Input
                      id="r-units"
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="yearBuilt">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-year">Year Built</Label>
                    <Input
                      id="r-year"
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="squareFeet">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-sqft">Square Feet</Label>
                    <Input
                      id="r-sqft"
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
            </div>
          </div>

          {/* Rental Info */}
          <div>
            <h4 className="mb-3 text-sm font-medium">Rental Info</h4>
            <div className="grid grid-cols-4 gap-3">
              <rentalFormInstance.Field name="rentalStatus">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Rental Status</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RENTAL_STATUS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="monthlyRent">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-rent">Monthly Rent</Label>
                    <Input
                      id="r-rent"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="$"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="leaseStart">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-lease-start">Lease Start</Label>
                    <Input
                      id="r-lease-start"
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="leaseEnd">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-lease-end">Lease End</Label>
                    <Input
                      id="r-lease-end"
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
            </div>
            <div className="mt-3">
              <rentalFormInstance.Field name="propertyManager">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-manager">Property Manager</Label>
                    <Input
                      id="r-manager"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
            </div>
          </div>

          {/* Financials */}
          <div>
            <h4 className="mb-3 text-sm font-medium">Financials</h4>
            <div className="grid grid-cols-3 gap-3">
              <rentalFormInstance.Field name="acquisitionDate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-acq-date">Acquisition Date</Label>
                    <Input
                      id="r-acq-date"
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="acquisitionCost">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-acq-cost">Acquisition Cost</Label>
                    <Input
                      id="r-acq-cost"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="$"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="mortgageBalance">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-mortgage">Mortgage Balance</Label>
                    <Input
                      id="r-mortgage"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="$"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
            </div>
          </div>

          {/* DOD Valuation */}
          <div>
            <h4 className="mb-3 text-sm font-medium">Date of Death Valuation</h4>
            <div className="grid grid-cols-3 gap-3">
              <rentalFormInstance.Field name="dodValue">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-dod-val">DOD Value</Label>
                    <Input
                      id="r-dod-val"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="$"
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="dodValueDate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="r-dod-date">DOD Value Date</Label>
                    <Input
                      id="r-dod-date"
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="dodValueType">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Valuation Type</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOD_VALUE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
            </div>
          </div>

          {/* DOD Affidavit */}
          <div>
            <h4 className="mb-3 text-sm font-medium">DOD Affidavit (Texas)</h4>
            <div className="grid grid-cols-3 items-end gap-3">
              <rentalFormInstance.Field name="dodAffidavitFiled">
                {(field) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="r-affidavit"
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(!!checked)}
                    />
                    <Label htmlFor="r-affidavit">Affidavit Filed</Label>
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Subscribe<boolean>
                selector={(state) => state.values.dodAffidavitFiled}
              >
                {(dodAffidavitFiled) => (
                  <>
                    <rentalFormInstance.Field name="dodAffidavitDate">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="r-filing-date">Filing Date</Label>
                          <Input
                            id="r-filing-date"
                            type="date"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            disabled={!dodAffidavitFiled}
                          />
                          {field.state.meta.errors?.[0] && (
                            <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                          )}
                        </div>
                      )}
                    </rentalFormInstance.Field>
                    <rentalFormInstance.Field name="clerkFileNo">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="r-clerk">Clerk File Number</Label>
                          <Input
                            id="r-clerk"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            disabled={!dodAffidavitFiled}
                          />
                          {field.state.meta.errors?.[0] && (
                            <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                          )}
                        </div>
                      )}
                    </rentalFormInstance.Field>
                  </>
                )}
              </rentalFormInstance.Subscribe>
            </div>
          </div>

          {/* Status */}
          <div>
            <h4 className="mb-3 text-sm font-medium">Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <rentalFormInstance.Field name="status">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Asset Status</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_STATUS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
              <rentalFormInstance.Field name="transferStatus">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Transfer Status</Label>
                    <Select value={field.state.value} onValueChange={(v) => field.handleChange(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFER_STATUS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors?.[0] && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </div>
                )}
              </rentalFormInstance.Field>
            </div>
          </div>

          {/* Notes */}
          <rentalFormInstance.Field name="notes">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="r-notes">Notes</Label>
                <Textarea
                  id="r-notes"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </rentalFormInstance.Field>
        </div>
      </ResourceDialog>
    </div>
  )
}
