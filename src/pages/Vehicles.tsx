"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Pencil, Loader2 } from "lucide-react"
import { formatCurrency } from "../utils/formatters"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  EditableTextCell,
  EditableCurrencyCell,
  EditableSelectCell,
} from "@/components/editable-cells"

// Import hooks and form factory
import { useEntities, useVehicles, type Vehicle } from "@/hooks"
import { vehicleFormDefaults, toDateInput } from "@/lib/form-factory"
import { TRANSFER_STATUS, DOD_VALUE_TYPES, STATUS_VARIANTS } from "@/lib/constants"

// =============================================================================
// CONSTANTS
// =============================================================================

const TITLE_STATUS = [
  { value: "CLEAR", label: "Clear" },
  { value: "LIEN", label: "Lien" },
  { value: "PENDING_TRANSFER", label: "Pending Transfer" },
]

const ASSET_STATUS = [
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD", label: "Sold" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "DISPOSED", label: "Disposed" },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function Vehicles() {
  // Use query hooks instead of manual fetch
  const { data: entities, loading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const {
    data: vehicles,
    loading: vehiclesLoading,
    update: updateVehicle,
    create: createVehicle,
    remove: deleteVehicle,
  } = useVehicles(selectedEntity || undefined)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Use form factory for defaults
  const [form, setForm] = useState(vehicleFormDefaults())

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const handleAdd = () => {
    setForm(vehicleFormDefaults())
    setEditing(null)
    setShowForm(true)
  }

  const handleEdit = (v: Vehicle) => {
    setEditing(v)
    setForm({
      year: v.year,
      make: v.make,
      model: v.model,
      vin: v.vin,
      color: v.color || "",
      licensePlate: v.licensePlate || "",
      mileage: v.mileage,
      titleStatus: v.titleStatus,
      acquisitionDate: toDateInput(v.acquisitionDate),
      acquisitionCost: v.acquisitionCost || "",
      dodValue: v.dodValue || "",
      dodValueDate: toDateInput(v.dodValueDate),
      dodValueType: v.dodValueType || "",
      status: v.status,
      transferStatus: v.transferStatus,
      notes: v.notes || "",
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!selectedEntity) return

    const payload = {
      entityId: selectedEntity,
      year: form.year,
      make: form.make,
      model: form.model,
      vin: form.vin,
      color: form.color || null,
      licensePlate: form.licensePlate || null,
      mileage: form.mileage,
      titleStatus: form.titleStatus,
      acquisitionDate: form.acquisitionDate || null,
      acquisitionCost: form.acquisitionCost || null,
      dodValue: form.dodValue || null,
      dodValueDate: form.dodValueDate || null,
      dodValueType: form.dodValueType || null,
      status: form.status,
      transferStatus: form.transferStatus,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        await updateVehicle(editing.id, payload)
      } else {
        await createVehicle(payload)
      }
      setShowForm(false)
    } catch (err) {
      console.error("Failed to save vehicle:", err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return
    try {
      await deleteVehicle(id)
    } catch (err) {
      console.error("Failed to delete vehicle:", err)
    }
  }

  const handleInlineUpdate = async (id: string, updates: Partial<Vehicle>) => {
    await updateVehicle(id, updates)
  }

  if (entitiesLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      v.make.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.vin.toLowerCase().includes(query) ||
      v.year.toString().includes(query)
    )
  })

  const totalValue = vehicles.reduce(
    (sum, v) => sum + (parseFloat(v.dodValue || "0") || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage vehicle assets
          {vehicles.length > 0 && ` - Total DOD Value: ${formatCurrency(totalValue.toString())}`}
        </p>
        <Select
          value={selectedEntity || undefined}
          onValueChange={setSelectedEntity}
        >
          <SelectTrigger className="w-70">
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
        <>
          {/* Search & Actions */}
          <div className="flex items-center justify-between gap-4">
            <Input
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => {
                const csv = [
                  ["Year", "Make", "Model", "VIN", "Color", "DOD Value", "Title Status", "Status"].join(","),
                  ...vehicles.map(v => [
                    v.year,
                    v.make,
                    v.model,
                    v.vin,
                    v.color || "",
                    v.dodValue || "",
                    v.titleStatus,
                    v.status
                  ].join(","))
                ].join("\n")
                const blob = new Blob([csv], { type: "text/csv" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `vehicles-${new Date().toISOString().split("T")[0]}.csv`
                a.click()
              }}>
                Export CSV
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </div>
          </div>

          {/* Table */}
          {vehiclesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVehicles.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  {vehicles.length === 0
                    ? "No vehicles. Click Add Vehicle to create one."
                    : "No vehicles match your search."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year/Make/Model</TableHead>
                        <TableHead>VIN</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>DOD Value</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Transfer</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {v.year} {v.make} {v.model}
                              </p>
                              {v.mileage && (
                                <p className="text-xs text-muted-foreground">
                                  {v.mileage.toLocaleString()} miles
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{v.vin.slice(-6)}</code>
                          </TableCell>
                          <TableCell>
                            <EditableTextCell
                              value={v.color}
                              onSave={(val) => handleInlineUpdate(v.id, { color: val })}
                              placeholder="Add color"
                            />
                          </TableCell>
                          <TableCell>
                            <EditableCurrencyCell
                              value={v.dodValue}
                              onSave={(val) => handleInlineUpdate(v.id, { dodValue: val })}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableSelectCell
                              value={v.titleStatus}
                              options={TITLE_STATUS}
                              variants={STATUS_VARIANTS}
                              onSave={(val) => handleInlineUpdate(v.id, { titleStatus: val })}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableSelectCell
                              value={v.status}
                              options={ASSET_STATUS}
                              variants={STATUS_VARIANTS}
                              onSave={(val) => handleInlineUpdate(v.id, { status: val })}
                            />
                          </TableCell>
                          <TableCell>
                            <EditableSelectCell
                              value={v.transferStatus}
                              options={TRANSFER_STATUS}
                              variants={STATUS_VARIANTS}
                              onSave={(val) => handleInlineUpdate(v.id, { transferStatus: val })}
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
                                      className="h-8 w-8"
                                      onClick={() => handleEdit(v)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit</p>
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
                                      onClick={() => handleDelete(v.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete</p>
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Vehicle Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Vehicle Information */}
            <div>
              <h4 className="text-sm font-medium mb-3">Vehicle Information</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear() + 1}
                    value={form.year}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        year: parseInt(e.target.value) || new Date().getFullYear(),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    placeholder="e.g., Ford, Toyota"
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    placeholder="e.g., F-150, Camry"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN *</Label>
                  <Input
                    id="vin"
                    placeholder="17 characters"
                    value={form.vin}
                    onChange={(e) =>
                      setForm({ ...form, vin: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">License Plate</Label>
                  <Input
                    id="licensePlate"
                    value={form.licensePlate}
                    onChange={(e) =>
                      setForm({ ...form, licensePlate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage</Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={form.mileage || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        mileage: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titleStatus">Title Status *</Label>
                  <Select
                    value={form.titleStatus}
                    onValueChange={(v) => setForm({ ...form, titleStatus: v })}
                  >
                    <SelectTrigger id="titleStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TITLE_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Acquisition */}
            <div>
              <h4 className="text-sm font-medium mb-3">Acquisition</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="acquisitionDate">Acquisition Date</Label>
                  <Input
                    id="acquisitionDate"
                    type="date"
                    value={form.acquisitionDate || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        acquisitionDate: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
                  <Input
                    id="acquisitionCost"
                    placeholder="$"
                    value={form.acquisitionCost}
                    onChange={(e) =>
                      setForm({ ...form, acquisitionCost: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* DOD Valuation */}
            <div>
              <h4 className="text-sm font-medium mb-3">Date of Death Valuation</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dodValue">DOD Value</Label>
                  <Input
                    id="dodValue"
                    placeholder="$ (KBB/NADA)"
                    value={form.dodValue}
                    onChange={(e) =>
                      setForm({ ...form, dodValue: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dodValueDate">DOD Value Date</Label>
                  <Input
                    id="dodValueDate"
                    type="date"
                    value={form.dodValueDate || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        dodValueDate: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dodValueType">Valuation Type</Label>
                  <Select
                    value={form.dodValueType}
                    onValueChange={(v) => setForm({ ...form, dodValueType: v })}
                  >
                    <SelectTrigger id="dodValueType">
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
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-medium mb-3">Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Asset Status *</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger id="status">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferStatus">Transfer Status *</Label>
                  <Select
                    value={form.transferStatus}
                    onValueChange={(v) => setForm({ ...form, transferStatus: v })}
                  >
                    <SelectTrigger id="transferStatus">
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
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
