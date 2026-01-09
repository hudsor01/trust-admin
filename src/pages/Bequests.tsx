"use client"

import { useState, useEffect } from "react"
import { Trash2, Plus, Check, Pencil, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  DialogFooter,
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
  const [showForm, setShowForm] = useState(false)
  const [editingBequest, setEditingBequest] = useState<SpecificBequestType | null>(null)
  const [formData, setFormData] = useState({
    description: "",
    category: "OTHER",
    beneficiaryId: "",
    recipientName: "",
    dateDistributed: "",
    notes: "",
  })

  // Auto-select first entity when entities load
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const saveBequest = async () => {
    if (!formData.description.trim() || !selectedEntity) return

    const payload = {
      entityId: selectedEntity,
      description: formData.description,
      category: formData.category,
      beneficiaryId: formData.beneficiaryId || null,
      recipientName: formData.recipientName || null,
      dateDistributed: formData.dateDistributed || null,
      notes: formData.notes || null,
    }

    try {
      if (editingBequest) {
        await updateBequestMutation.mutateAsync({ id: editingBequest.id, data: payload })
      } else {
        await createBequestMutation.mutateAsync(payload)
      }
      setShowForm(false)
      resetForm()
    } catch (error) {
      console.error("Failed to save bequest:", error)
    }
  }

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

  const resetForm = () => {
    setFormData({
      description: "",
      category: "OTHER",
      beneficiaryId: "",
      recipientName: "",
      dateDistributed: "",
      notes: "",
    })
    setEditingBequest(null)
  }

  const openEditForm = (bequest: SpecificBequest) => {
    setEditingBequest(bequest)
    setFormData({
      description: bequest.description,
      category: bequest.category || "OTHER",
      beneficiaryId: bequest.beneficiaryId || "",
      recipientName: bequest.recipientName || "",
      dateDistributed: bequest.dateDistributed?.split("T")[0] || "",
      notes: bequest.notes || "",
    })
    setShowForm(true)
  }

  const pendingBequests = bequests.filter((b) => !b.dateDistributed)
  const distributedBequests = bequests.filter((b) => b.dateDistributed)

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
          <Button onClick={() => { resetForm(); setShowForm(true) }}>
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
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBequest ? "Edit Bequest" : "Add Bequest"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the item (e.g., 'Dog named Bandit', 'Gold wedding ring')"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="beneficiary">Beneficiary (if applicable)</Label>
              <Select
                value={formData.beneficiaryId}
                onValueChange={(v) => setFormData({ ...formData, beneficiaryId: v })}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name (if not a beneficiary)</Label>
              <Input
                id="recipientName"
                placeholder="Name of recipient"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use this if the recipient is not listed as a beneficiary
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateDistributed">Date Distributed</Label>
              <Input
                id="dateDistributed"
                type="date"
                value={formData.dateDistributed}
                onChange={(e) => setFormData({ ...formData, dateDistributed: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave blank if not yet distributed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={saveBequest}>
              {editingBequest ? "Update" : "Add"} Bequest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
