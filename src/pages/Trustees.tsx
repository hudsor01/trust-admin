"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Loader2, Mail, Phone, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ResourceDialog } from "@/components/resource-dialog"
import { useResourceForm } from "@/hooks/use-resource-form"
import { insertTrusteeSchema } from "../../db/validation"
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

// Import types and hooks from centralized location
import { useEntities } from "@/hooks/entities/queries"
import { useTrustees, useCreateTrustee, useUpdateTrustee, useDeleteTrustee, type Trustee } from "@/hooks/trustees/queries"
import { trusteeFormDefaults, toDateInput } from "@/lib/form-factory"
import { STATUS_VARIANTS } from "@/lib/constants"
import {
  EditableTextCell,
  EditableSelectCell,
  EditableDateCell,
  EditableNumberCell,
} from "@/components/editable-cells"

const STATUS_OPTIONS = [
  { value: "CURRENT", label: "Current" },
  { value: "SUCCESSOR", label: "Successor" },
  { value: "ARBITOR", label: "Arbitor" },
  { value: "RESIGNED", label: "Resigned" },
  { value: "REMOVED", label: "Removed" },
  { value: "DECEASED", label: "Deceased" },
]

export function Trustees() {
  // Use TanStack Query hooks for data fetching
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)

  const {
    data: trustees = [],
    isLoading: trusteesLoading,
  } = useTrustees(selectedEntity || undefined)
  const createTrusteeMutation = useCreateTrustee()
  const updateTrusteeMutation = useUpdateTrustee()
  const deleteTrusteeMutation = useDeleteTrustee()

  // Form state using useResourceForm hook
  const trusteeForm = useResourceForm({
    initialData: trusteeFormDefaults(),
    schema: insertTrusteeSchema as any,
    onSubmit: async (data) => {
      if (!selectedEntity) return
      const payload = {
        entityId: selectedEntity,
        name: data.name,
        status: data.status,
        order: data.order,
        isCo: data.isCo,
        coTrusteeId: data.coTrusteeId || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      }
      if (trusteeForm.isEditing && (trusteeForm.editing as any)?.id) {
        await updateTrusteeMutation.mutateAsync({ id: (trusteeForm.editing as any)?.id, data: payload })
      } else {
        await createTrusteeMutation.mutateAsync(payload)
      }
    },
  })

  const { formInstance } = trusteeForm

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const deleteTrustee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trustee?")) return
    try {
      await deleteTrusteeMutation.mutateAsync(id)
    } catch (error) {
      console.error("Failed to delete trustee:", error)
    }
  }

  const openEditForm = (trustee: Trustee) => {
    trusteeForm.handleEdit({
      id: trustee.id,
      name: trustee.name,
      status: trustee.status ?? "",
      order: trustee.order,
      isCo: trustee.isCo || false,
      coTrusteeId: trustee.coTrusteeId || null,
      startDate: trustee.startDate,
      endDate: trustee.endDate,
    } as any)
  }

  const loading = entitiesLoading || trusteesLoading

  const currentTrustees = trustees.filter((t) => t.status === "CURRENT")
  const successorTrustees = trustees.filter((t) => t.status === "SUCCESSOR")
  const arbitorTrustees = trustees.filter((t) => t.status === "ARBITOR")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Trustees</h2>
          <p className="text-sm text-muted-foreground">
            {currentTrustees.length} current trustees, {successorTrustees.length + arbitorTrustees.length} successor trustees / arbitors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedEntity || undefined}
            onValueChange={setSelectedEntity}
          >
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
          <Button onClick={() => trusteeForm.open()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Trustee
          </Button>
        </div>
      </div>

      {/* Current Trustees */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Trustees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentTrustees.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No current trustees
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Birthday</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Co-Trustee</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTrustees.map((t) => {
                    const coTrustee = trustees.find((ct) => ct.id === t.coTrusteeId)
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <EditableNumberCell
                            value={t.order}
                            onSave={async (val) => {
                              await updateTrusteeMutation.mutateAsync({ id: t.id, data: { order: val ?? undefined } })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableTextCell
                            value={t.name}
                            onSave={async (val) => {
                              await updateTrusteeMutation.mutateAsync({ id: t.id, data: { name: val as string } })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <EditableTextCell
                              value={t.email}
                              placeholder="Add email"
                              onSave={async (val) => {
                                await updateTrusteeMutation.mutateAsync({ id: t.id, data: { email: val } })
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            <EditableTextCell
                              value={t.phone}
                              placeholder="Add phone"
                              onSave={async (val) => {
                                await updateTrusteeMutation.mutateAsync({ id: t.id, data: { phone: val } })
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            <EditableDateCell
                              value={t.dob}
                              onSave={async (val) => {
                                await updateTrusteeMutation.mutateAsync({ id: t.id, data: { dob: val } })
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.isCo ? "outline" : "secondary"} className="font-normal">
                            {t.isCo ? "Co-Trustee" : "Sole Trustee"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {coTrustee?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <EditableDateCell
                            value={t.startDate}
                            onSave={async (val) => {
                              await updateTrusteeMutation.mutateAsync({ id: t.id, data: { startDate: val } })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => deleteTrustee(t.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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

      {/* Successor Trustees / Arbitors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Successor Trustees / Arbitors</CardTitle>
        </CardHeader>
        <CardContent>
          {(successorTrustees.length + arbitorTrustees.length) === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No successor trustees or arbitors designated
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Birthday</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Co-Trustee</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...successorTrustees, ...arbitorTrustees].sort((a, b) => a.order - b.order).map((t) => {
                    const coTrustee = trustees.find((ct) => ct.id === t.coTrusteeId)
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <EditableNumberCell
                            value={t.order}
                            onSave={async (val) => {
                              await updateTrusteeMutation.mutateAsync({ id: t.id, data: { order: val ?? undefined } })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableTextCell
                            value={t.name}
                            onSave={async (val) => {
                              await updateTrusteeMutation.mutateAsync({ id: t.id, data: { name: val as string } })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <EditableTextCell
                              value={t.email}
                              placeholder="Add email"
                              onSave={async (val) => {
                                await updateTrusteeMutation.mutateAsync({ id: t.id, data: { email: val } })
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            <EditableTextCell
                              value={t.phone}
                              placeholder="Add phone"
                              onSave={async (val) => {
                                await updateTrusteeMutation.mutateAsync({ id: t.id, data: { phone: val } })
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            <EditableDateCell
                              value={t.dob}
                              onSave={async (val) => {
                                await updateTrusteeMutation.mutateAsync({ id: t.id, data: { dob: val } })
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.isCo ? "outline" : "secondary"} className="font-normal">
                            {t.isCo ? "Co-Trustee" : "Sole Trustee"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {coTrustee?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <EditableDateCell
                            value={t.startDate}
                            onSave={async (val) => {
                              await updateTrusteeMutation.mutateAsync({ id: t.id, data: { startDate: val } })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => deleteTrustee(t.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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

      {/* Trustee Form Dialog */}
      <ResourceDialog
        open={trusteeForm.isOpen}
        onOpenChange={trusteeForm.close}
        title={trusteeForm.isEditing ? "Edit Trustee" : "Add Trustee"}
        onSubmit={trusteeForm.handleSave}
        isLoading={trusteeForm.isSubmitting}
      >
        <div className="space-y-4">
          {/* Name - Required */}
          <formInstance.Field name="name">
            {(field: any) => (
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Full legal name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </formInstance.Field>

          {/* Status */}
          <formInstance.Field name="status">
            {(field: any) => (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectTrigger id="status" onBlur={field.handleBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </formInstance.Field>

          {/* Order */}
          <formInstance.Field name="order">
            {(field: any) => (
              <div className="space-y-2">
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  min={1}
                  max={10}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(parseInt(e.target.value) || 1)}
                  onBlur={field.handleBlur}
                />
                <p className="text-xs text-muted-foreground">
                  1 = Primary, 2 = First Successor, etc.
                </p>
                {field.state.meta.errors?.[0] && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </formInstance.Field>

          {/* Is Co-Trustee */}
          <formInstance.Field name="isCo">
            {(field: any) => (
              <div className="flex items-center justify-between">
                <Label htmlFor="isCo">Is Co-Trustee?</Label>
                <Switch
                  id="isCo"
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </div>
            )}
          </formInstance.Field>

          {/* Co-Trustee Selector - Conditional */}
          <formInstance.Subscribe selector={(state: any) => state.values.isCo}>
            {(isCo: any) =>
              isCo ? (
                <formInstance.Field name="coTrusteeId">
                  {(field: any) => (
                    <div className="space-y-2">
                      <Label htmlFor="coTrustee">Co-Trustee</Label>
                      <Select
                        value={field.state.value || ""}
                        onValueChange={(v) => field.handleChange(v)}
                      >
                        <SelectTrigger id="coTrustee" onBlur={field.handleBlur}>
                          <SelectValue placeholder="Select co-trustee" />
                        </SelectTrigger>
                        <SelectContent>
                          {trustees
                            .filter((t) => t.id !== (trusteeForm.editing as any)?.id)
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </formInstance.Field>
              ) : null
            }
          </formInstance.Subscribe>

          {/* Start Date */}
          <formInstance.Field name="startDate">
            {(field: any) => (
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </formInstance.Field>

          {/* End Date */}
          <formInstance.Field name="endDate">
            {(field: any) => (
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                  onBlur={field.handleBlur}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if currently serving
                </p>
              </div>
            )}
          </formInstance.Field>
        </div>
      </ResourceDialog>
    </div>
  )
}
