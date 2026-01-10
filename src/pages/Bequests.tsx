"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Check, Pencil, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { DataTable, type ColumnDef } from "@/components/data-table"
import { ResourceDialog } from "@/components/resource-dialog"
import { useResourceForm } from "@/hooks/use-resource-form"
import { insertSpecificBequestSchema } from "../../db/validation"
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
import { formatDate } from "../utils/formatters"
import { EditableTextCell, EditableSelectCell } from "@/components/editable-cells"
import { useEntities } from "@/hooks/entities/queries"
import { useBeneficiaries } from "@/hooks/beneficiaries/queries"
import {
  useSpecificBequests,
  useCreateSpecificBequest,
  useUpdateSpecificBequest,
  useDeleteSpecificBequest,
  type SpecificBequest as SpecificBequestType,
} from "@/hooks/specific-bequests/queries"

// Interfaces imported from hooks

const BEQUEST_CATEGORIES = [
  { value: "PET", label: "Pet" },
  { value: "JEWELRY", label: "Jewelry" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "ARTWORK", label: "Artwork" },
  { value: "COLLECTIBLE", label: "Collectible" },
  { value: "HEIRLOOM", label: "Family Heirloom" },
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "OTHER", label: "Other" },
]

export function Bequests() {
  // Use TanStack Query hooks
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const { data: beneficiaries = [] } = useBeneficiaries(selectedEntity || undefined)
  const { data: bequests = [], isLoading: bequestsLoading } = useSpecificBequests(selectedEntity || undefined)
  const createBequestMutation = useCreateSpecificBequest()
  const updateBequestMutation = useUpdateSpecificBequest()
  const deleteBequestMutation = useDeleteSpecificBequest()

  const loading = entitiesLoading || bequestsLoading

  // Form state using useResourceForm hook
  const bequestForm = useResourceForm({
    initialData: {
      description: "",
      category: "OTHER",
      beneficiaryId: "",
      recipientName: "",
      dateDistributed: "",
      notes: "",
    },
    validationSchema: insertSpecificBequestSchema,
    onSubmit: async (data) => {
      if (!selectedEntity) return
      const payload = {
        entityId: selectedEntity,
        description: data.description,
        category: data.category || "OTHER",
        beneficiaryId: data.beneficiaryId || null,
        recipientName: data.recipientName || null,
        dateDistributed: data.dateDistributed || null,
        notes: data.notes || null,
      }
      if (bequestForm.isEditing && bequestForm.editingId) {
        await updateBequestMutation.mutateAsync({ id: bequestForm.editingId, data: payload })
      } else {
        await createBequestMutation.mutateAsync(payload)
      }
    },
  })

  const { formInstance } = bequestForm

  // Auto-select first entity when entities load
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const deleteBequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bequest?")) return

    try {
      await deleteBequestMutation.mutateAsync(id)
    } catch (error) {
      console.error("Failed to delete bequest:", error)
    }
  }

  const updateBequest = async (id: string, updates: Partial<SpecificBequestType>) => {
    await updateBequestMutation.mutateAsync({ id, data: updates })
  }

  const markDistributed = async (bequest: SpecificBequestType) => {
    try {
      await updateBequestMutation.mutateAsync({
        id: bequest.id,
        data: { dateDistributed: new Date().toISOString() },
      })
    } catch (error) {
      console.error("Failed to mark as distributed:", error)
    }
  }

  const openEditForm = (bequest: SpecificBequestType) => {
    bequestForm.edit(bequest.id, {
      description: bequest.description,
      category: bequest.category || "OTHER",
      beneficiaryId: bequest.beneficiaryId || "",
      recipientName: bequest.recipientName || "",
      dateDistributed: bequest.dateDistributed?.split("T")[0] || "",
      notes: bequest.notes || "",
    })
  }

  const pendingBequests = bequests.filter((b) => !b.dateDistributed)
  const distributedBequests = bequests.filter((b) => b.dateDistributed)

  // Column definitions for pending bequests table
  const pendingColumns: ColumnDef<SpecificBequestType>[] = [
    {
      key: "description",
      header: "Item",
      render: (bequest) => (
        <EditableTextCell
          value={bequest.description}
          onSave={(v) => updateBequest(bequest.id, { description: String(v || "") })}
        />
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (bequest) => (
        <EditableSelectCell
          value={bequest.category || "OTHER"}
          options={BEQUEST_CATEGORIES}
          onSave={(v) => updateBequest(bequest.id, { category: v })}
        />
      ),
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (bequest) => {
        const recipient = bequest.beneficiaryId
          ? beneficiaries.find((ben) => ben.id === bequest.beneficiaryId)
          : null
        return recipient ? (
          `${recipient.firstName} ${recipient.lastName}`
        ) : (
          <EditableTextCell
            value={bequest.recipientName}
            onSave={(v) => updateBequest(bequest.id, { recipientName: v })}
            placeholder="Add recipient"
          />
        )
      },
    },
    {
      key: "notes",
      header: "Notes",
      render: (bequest) => (
        <EditableTextCell
          value={bequest.notes}
          onSave={(v) => updateBequest(bequest.id, { notes: v })}
          placeholder="Add notes"
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (bequest) => (
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-success hover:text-success"
                  onClick={() => markDistributed(bequest)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mark Distributed</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEditForm(bequest)}
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
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteBequest(bequest.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ]

  // Column definitions for distributed bequests table
  const distributedColumns: ColumnDef<SpecificBequestType>[] = [
    {
      key: "description",
      header: "Item",
      render: (bequest) => <span className="font-medium">{bequest.description}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (bequest) => (
        <Badge variant="outline">
          {BEQUEST_CATEGORIES.find((c) => c.value === bequest.category)?.label ||
            bequest.category}
        </Badge>
      ),
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (bequest) => {
        const recipient = bequest.beneficiaryId
          ? beneficiaries.find((ben) => ben.id === bequest.beneficiaryId)
          : null
        return recipient
          ? `${recipient.firstName} ${recipient.lastName}`
          : bequest.recipientName || "—"
      },
    },
    {
      key: "dateDistributed",
      header: "Date Distributed",
      render: (bequest) => formatDate(bequest.dateDistributed),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Specific Bequests</h2>
          <p className="text-sm text-muted-foreground">
            {pendingBequests.length} pending, {distributedBequests.length} distributed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedEntity || ""} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select Trust" />
            </SelectTrigger>
            <SelectContent>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => bequestForm.open()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bequest
          </Button>
        </div>
      </div>

      {/* Pending Bequests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Bequests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingBequests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No pending bequests</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBequests.map((b) => {
                    const recipient = b.beneficiaryId
                      ? beneficiaries.find((ben) => ben.id === b.beneficiaryId)
                      : null
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          <EditableTextCell
                            value={b.description}
                            onSave={(v) => updateBequest(b.id, { description: String(v || "") })}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableSelectCell
                            value={b.category || "OTHER"}
                            options={BEQUEST_CATEGORIES}
                            onSave={(v) => updateBequest(b.id, { category: v })}
                          />
                        </TableCell>
                        <TableCell>
                          {recipient ? (
                            `${recipient.firstName} ${recipient.lastName}`
                          ) : (
                            <EditableTextCell
                              value={b.recipientName}
                              onSave={(v) => updateBequest(b.id, { recipientName: v })}
                              placeholder="Add recipient"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <EditableTextCell
                            value={b.notes}
                            onSave={(v) => updateBequest(b.id, { notes: v })}
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
                                    onClick={() => markDistributed(b)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mark Distributed</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditForm(b)}
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
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => deleteBequest(b.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
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
            <p className="text-center py-8 text-muted-foreground">No distributed bequests</p>
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
                      ? beneficiaries.find((ben) => ben.id === b.beneficiaryId)
                      : null
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {BEQUEST_CATEGORIES.find((c) => c.value === b.category)?.label ||
                              b.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {recipient
                            ? `${recipient.firstName} ${recipient.lastName}`
                            : b.recipientName || "—"}
                        </TableCell>
                        <TableCell>{formatDate(b.dateDistributed)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bequest Form Dialog */}
      <ResourceDialog
        open={bequestForm.isOpen}
        onOpenChange={bequestForm.close}
        title={bequestForm.isEditing ? "Edit Bequest" : "Add Bequest"}
        onSubmit={bequestForm.handleSave}
        isLoading={bequestForm.isSubmitting}
      >
        <div className="space-y-4">
          {/* Description - Required */}
          <formInstance.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the item (e.g., 'Dog named Bandit', 'Gold wedding ring')"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  rows={2}
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </formInstance.Field>

          {/* Category */}
          <formInstance.Field name="category">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger id="category" onBlur={field.handleBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BEQUEST_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </formInstance.Field>

          {/* Beneficiary */}
          <formInstance.Field name="beneficiaryId">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="beneficiary">Beneficiary (if applicable)</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger id="beneficiary" onBlur={field.handleBlur}>
                    <SelectValue placeholder="Select beneficiary" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {beneficiaries.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.firstName} {b.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </formInstance.Field>

          {/* Recipient Name */}
          <formInstance.Field name="recipientName">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name (if not a beneficiary)</Label>
                <Input
                  id="recipientName"
                  placeholder="Name of recipient"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <p className="text-xs text-muted-foreground">
                  Use this if the recipient is not listed as a beneficiary
                </p>
              </div>
            )}
          </formInstance.Field>

          {/* Date Distributed */}
          <formInstance.Field name="dateDistributed">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="dateDistributed">Date Distributed</Label>
                <Input
                  id="dateDistributed"
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <p className="text-xs text-muted-foreground">Leave blank if not yet distributed</p>
              </div>
            )}
          </formInstance.Field>

          {/* Notes */}
          <formInstance.Field name="notes">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </formInstance.Field>
        </div>
      </ResourceDialog>
    </div>
  )
}
