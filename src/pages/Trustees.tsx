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

// Import types and hooks from centralized location
import { useEntities, useTrustees, type Trustee } from "@/hooks"
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
  // Use centralized hooks for data fetching
  const { data: entities, loading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)

  const {
    data: trustees,
    loading: trusteesLoading,
    create: createTrustee,
    update: updateTrustee,
    remove: removeTrustee,
  } = useTrustees(selectedEntity || undefined)

  const [showForm, setShowForm] = useState(false)
  const [editingTrustee, setEditingTrustee] = useState<Trustee | null>(null)
  const [formData, setFormData] = useState(trusteeFormDefaults())

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const saveTrustee = async () => {
    if (!formData.name.trim() || !selectedEntity) return

    const payload = {
      entityId: selectedEntity,
      name: formData.name,
      status: formData.status,
      order: formData.order,
      isCo: formData.isCo,
    }

    try {
      if (editingTrustee) {
        await updateTrustee(editingTrustee.id, payload)
      } else {
        await createTrustee(payload)
      }
      setShowForm(false)
      resetForm()
    } catch (error) {
      console.error("Failed to save trustee:", error)
    }
  }

  const deleteTrustee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trustee?")) return
    try {
      await removeTrustee(id)
    } catch (error) {
      console.error("Failed to delete trustee:", error)
    }
  }

  const resetForm = () => {
    setFormData(trusteeFormDefaults())
    setEditingTrustee(null)
  }

  const openEditForm = (trustee: Trustee) => {
    setEditingTrustee(trustee)
    setFormData({
      name: trustee.name,
      status: trustee.status,
      order: trustee.order,
      isCo: trustee.isCo,
      coTrusteeId: trustee.coTrusteeId,
      startDate: trustee.startDate,
      endDate: trustee.endDate,
    })
    setShowForm(true)
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
          <Button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
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
                              await updateTrustee(t.id, { order: val ?? undefined })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableTextCell
                            value={t.name}
                            onSave={async (val) => {
                              await updateTrustee(t.id, { name: val as string })
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
                                await updateTrustee(t.id, { email: val })
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
                                await updateTrustee(t.id, { phone: val })
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
                                await updateTrustee(t.id, { dob: val })
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
                              await updateTrustee(t.id, { startDate: val })
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
                              await updateTrustee(t.id, { order: val ?? undefined })
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableTextCell
                            value={t.name}
                            onSave={async (val) => {
                              await updateTrustee(t.id, { name: val as string })
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
                                await updateTrustee(t.id, { email: val })
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
                                await updateTrustee(t.id, { phone: val })
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
                                await updateTrustee(t.id, { dob: val })
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
                              await updateTrustee(t.id, { startDate: val })
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
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTrustee ? "Edit Trustee" : "Add Trustee"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Full legal name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger id="status">
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

            <div className="space-y-2">
              <Label htmlFor="order">Order</Label>
              <Input
                id="order"
                type="number"
                min={1}
                max={10}
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value) || 1 })
                }
              />
              <p className="text-xs text-muted-foreground">
                1 = Primary, 2 = First Successor, etc.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isCo">Is Co-Trustee?</Label>
              <Switch
                id="isCo"
                checked={formData.isCo}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isCo: checked })
                }
              />
            </div>

            {formData.isCo && (
              <div className="space-y-2">
                <Label htmlFor="coTrustee">Co-Trustee</Label>
                <Select
                  value={formData.coTrusteeId || undefined}
                  onValueChange={(v) => setFormData({ ...formData, coTrusteeId: v })}
                >
                  <SelectTrigger id="coTrustee">
                    <SelectValue placeholder="Select co-trustee" />
                  </SelectTrigger>
                  <SelectContent>
                    {trustees
                      .filter((t) => t.id !== editingTrustee?.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value || null })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate || ""}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value || null })
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if currently serving
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveTrustee}>
                {editingTrustee ? "Update" : "Add"} Trustee
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
