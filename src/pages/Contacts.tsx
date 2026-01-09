"use client"

import { useState, useMemo } from "react"
import { Mail, Phone, MapPin, Eye, Loader2, Calendar, Plus, Pencil, Trash2, Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Import reusable editable cell components
import { EditableTextCell, EditableSelectCell, EditableDateCell } from "@/components/editable-cells"
import { CopyButton } from "@/components/copy-button"

// Import types and hooks from TanStack Query hooks
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, type Contact } from "@/hooks/contacts/queries"
import { contactFormDefaults } from "@/lib/form-factory"
import { exportTablesInContainer } from "@/lib/csv"

type RoleFilter = "all" | "ATTORNEY" | "ACCOUNTANT" | "FINANCIAL_ADVISOR" | "INSURANCE_AGENT" | "BANKER" | "OTHER"

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ATTORNEY", label: "Attorney" },
  { value: "ACCOUNTANT", label: "CPA" },
  { value: "FINANCIAL_ADVISOR", label: "Financial" },
  { value: "INSURANCE_AGENT", label: "Insurance" },
  { value: "BANKER", label: "Banker" },
  { value: "OTHER", label: "Other" },
]

const ROLE_LABELS: Record<string, string> = {
  ATTORNEY: "Attorney",
  ACCOUNTANT: "CPA",
  FINANCIAL_ADVISOR: "Financial Advisor",
  PROPERTY_MANAGER: "Property Manager",
  TENANT: "Tenant",
  INSURANCE_AGENT: "Insurance Agent",
  BANKER: "Banker",
  CONTRACTOR: "Contractor",
  EMPLOYEE: "Employee",
  BENEFICIARY_REP: "Beneficiary Rep",
  OTHER: "Other",
}

export function Contacts() {
  // Use TanStack Query hooks for data fetching
  const { data: contacts = [], isLoading } = useContacts()
  const createContactMutation = useCreateContact()
  const updateContactMutation = useUpdateContact()
  const deleteContactMutation = useDeleteContact()

  const [filter, setFilter] = useState<RoleFilter>("all")
  const [search, setSearch] = useState("")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState(contactFormDefaults())

  const saveContact = async () => {
    if (!formData.name.trim()) return

    const payload = {
      name: formData.name,
      company: formData.company || null,
      role: formData.role,
      email: formData.email || null,
      phone: formData.phone || null,
      dob: formData.dob || null,
      streetAddress: formData.streetAddress || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      notes: formData.notes || null,
    }

    try {
      if (editingContact) {
        await updateContactMutation.mutateAsync({ id: editingContact.id, data: payload })
      } else {
        await createContactMutation.mutateAsync(payload)
      }
      setShowForm(false)
      resetForm()
    } catch (error) {
      console.error("Failed to save contact:", error)
    }
  }

  const resetForm = () => {
    setFormData(contactFormDefaults())
    setEditingContact(null)
  }

  const openEditForm = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      company: contact.company,
      role: contact.role,
      email: contact.email,
      phone: contact.phone,
      dob: contact.dob,
      streetAddress: contact.streetAddress,
      city: contact.city,
      state: contact.state,
      zip: contact.zip,
      notes: contact.notes,
    })
    setShowForm(true)
  }

  const filteredContacts = useMemo(() => {
    let data = contacts
    if (filter !== "all") {
      data = data.filter((c) => c.role === filter)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          (c.company && c.company.toLowerCase().includes(searchLower))
      )
    }
    return data
  }, [contacts, filter, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">Contacts</h2>
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
              const main = document.querySelector("main")
              if (!main) return
              const baseName = "contacts"
              exportTablesInContainer(main as HTMLElement, baseName || "export")
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => {
            setFormData(contactFormDefaults());
            setEditingContact(null);
            setShowForm(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as RoleFilter)}>
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

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              No contacts found
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Birthday</TableHead>
                    <TableHead className="w-12.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <EditableTextCell
                          value={contact.name}
                          onSave={async (val) => {
                            await updateContactMutation.mutateAsync({ id: contact.id, data: { name: val as string } })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableSelectCell
                          value={contact.role}
                          options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
                            value,
                            label,
                          }))}
                          onSave={async (val) => {
                            await updateContactMutation.mutateAsync({ id: contact.id, data: { role: val } })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableTextCell
                          value={contact.company}
                          onSave={async (val) => {
                            await updateContactMutation.mutateAsync({ id: contact.id, data: { company: val } })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableTextCell
                          value={contact.email}
                          onSave={async (val) => {
                            await updateContactMutation.mutateAsync({ id: contact.id, data: { email: val } })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableTextCell
                          value={contact.phone}
                          onSave={async (val) => {
                            await updateContactMutation.mutateAsync({ id: contact.id, data: { phone: val } })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableDateCell
                          value={contact.dob}
                          onSave={async (val) => {
                            await updateContactMutation.mutateAsync({ id: contact.id, data: { dob: val } })
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setSelectedContact(contact)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditForm(contact)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit contact</p>
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
                                  onClick={async () => {
                                    if (confirm("Are you sure you want to delete this contact?")) {
                                      await deleteContactMutation.mutateAsync(contact.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete contact</p>
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
          )}
        </CardContent>
      </Card>

      {/* Contact Detail Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedContact?.name}</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Role:</span>
                <Badge variant="secondary">
                  {ROLE_LABELS[selectedContact.role] || selectedContact.role}
                </Badge>
              </div>
              {selectedContact.company && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Company:</span>
                  <span>{selectedContact.company}</span>
                </div>
              )}

              <Separator />

              {/* Contact Info - Editable */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium w-16">Birthday:</span>
                  <EditableDateCell
                    value={selectedContact.dob}
                    onSave={async (val) => {
                      await updateContactMutation.mutateAsync({ id: selectedContact.id, data: { dob: val } })
                      setSelectedContact({ ...selectedContact, dob: val })
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium w-16">Email:</span>
                  <div className="flex-1">
                    <EditableTextCell
                      value={selectedContact.email}
                      onSave={async (val) => {
                        await updateContactMutation.mutateAsync({ id: selectedContact.id, data: { email: val } })
                        setSelectedContact({ ...selectedContact, email: val })
                      }}
                    />
                  </div>
                  {selectedContact.email && <CopyButton value={selectedContact.email} />}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium w-16">Phone:</span>
                  <div className="flex-1">
                    <EditableTextCell
                      value={selectedContact.phone}
                      onSave={async (val) => {
                        await updateContactMutation.mutateAsync({ id: selectedContact.id, data: { phone: val } })
                        setSelectedContact({ ...selectedContact, phone: val })
                      }}
                    />
                  </div>
                  {selectedContact.phone && <CopyButton value={selectedContact.phone} />}
                </div>
                {selectedContact.streetAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      {selectedContact.streetAddress}, {selectedContact.city}{" "}
                      {selectedContact.state} {selectedContact.zip}
                    </span>
                  </div>
                )}
              </div>

              {selectedContact.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Notes
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedContact.notes}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Company name"
                value={formData.company || ""}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Birthday</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob || ""}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="streetAddress">Street Address</Label>
              <Input
                id="streetAddress"
                placeholder="123 Main St"
                value={formData.streetAddress || ""}
                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="ST"
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  placeholder="12345"
                  value={formData.zip || ""}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this contact..."
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
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
              <Button onClick={saveContact}>
                {editingContact ? "Update" : "Add"} Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}