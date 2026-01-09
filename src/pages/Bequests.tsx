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

interface SpecificBequest {
  id: string
  entityId: string
  beneficiaryId: string | null
  description: string
  category: string | null
  recipientName: string | null
  dateDistributed: string | null
  notes: string | null
}

interface Beneficiary {
  id: string
  firstName: string
  lastName: string
}

interface Entity {
  id: string
  name: string
  dod: string | null
}

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
  const [bequests, setBequests] = useState<SpecificBequest[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBequest, setEditingBequest] = useState<SpecificBequest | null>(null)
  const [formData, setFormData] = useState({
    description: "",
    category: "OTHER",
    beneficiaryId: "",
    recipientName: "",
    dateDistributed: "",
    notes: "",
  })

  useEffect(() => {
    fetchEntities()
    fetchBeneficiaries()
  }, [])

  useEffect(() => {
    if (selectedEntity) {
      fetchBequests(selectedEntity)
    }
  }, [selectedEntity])

  const fetchEntities = async () => {
    try {
      const res = await fetch("/api/entities")
      if (res.ok) {
        const data = await res.json()
        const sorted = data.sort((a: Entity, b: Entity) => {
          if (a.dod && !b.dod) return -1
          if (!a.dod && b.dod) return 1
          if (a.name.includes("Hudson") && !b.name.includes("Hudson")) return -1
          if (!a.name.includes("Hudson") && b.name.includes("Hudson")) return 1
          return 0
        })
        setEntities(sorted)
        if (sorted.length > 0) {
          setSelectedEntity(sorted[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch entities:", error)
    }
  }

  const fetchBeneficiaries = async () => {
    try {
      const res = await fetch("/api/beneficiaries")
      if (res.ok) {
        const data = await res.json()
        setBeneficiaries(data)
      }
    } catch (error) {
      console.error("Failed to fetch beneficiaries:", error)
    }
  }

  const fetchBequests = async (entityId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/specific-bequests?entityId=${entityId}`)
      if (res.ok) {
        const data = await res.json()
        setBequests(data)
      }
    } catch (error) {
      console.error("Failed to fetch bequests:", error)
    } finally {
      setLoading(false)
    }
  }

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
      let res
      if (editingBequest) {
        res = await fetch(`/api/specific-bequests/${editingBequest.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/specific-bequests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        setShowForm(false)
        resetForm()
        fetchBequests(selectedEntity)
      }
    } catch (error) {
      console.error("Failed to save bequest:", error)
    }
  }

  const deleteBequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bequest?")) return

    try {
      const res = await fetch(`/api/specific-bequests/${id}`, { method: "DELETE" })
      if (res.ok && selectedEntity) {
        fetchBequests(selectedEntity)
      }
    } catch (error) {
      console.error("Failed to delete bequest:", error)
    }
  }

  const updateBequest = async (id: string, updates: Partial<SpecificBequest>) => {
    const res = await fetch(`/api/specific-bequests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error("Failed to update")
    setBequests(bequests.map((b) => (b.id === id ? { ...b, ...updates } : b)))
  }

  const markDistributed = async (bequest: SpecificBequest) => {
    try {
      await fetch(`/api/specific-bequests/${bequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateDistributed: new Date().toISOString(),
        }),
      })
      if (selectedEntity) {
        fetchBequests(selectedEntity)
      }
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
