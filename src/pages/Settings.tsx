"use client"

import { useState, useEffect } from "react"
import { Calendar, Mail, Phone, User, Users, Loader2, Check, ChevronRight, Plus, Building } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate, calculateAge } from "../utils/formatters"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { EditableTextCell, EditableDateCell } from "@/components/editable-cells"

const CONTACT_ROLES = [
  { value: "ATTORNEY", label: "Attorney" },
  { value: "ACCOUNTANT", label: "CPA" },
  { value: "FINANCIAL_ADVISOR", label: "Financial Advisor" },
  { value: "INSURANCE_AGENT", label: "Insurance Agent" },
  { value: "BANKER", label: "Banker" },
  { value: "PROPERTY_MANAGER", label: "Property Manager" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "OTHER", label: "Other" },
]

// Import hooks
import {
  useEntities,
  useBeneficiaries,
  useTrustees,
  useContacts,
  type Beneficiary,
  type Trustee,
  type Contact,
} from "@/hooks"

// Person row component for beneficiaries/trustees
function PersonRow({
  name,
  dob,
  email,
  phone,
  onUpdateDob,
  onUpdateEmail,
  onUpdatePhone,
}: {
  name: string
  dob: string | null
  email: string | null
  phone: string | null
  onUpdateDob: (val: string | null) => Promise<void>
  onUpdateEmail: (val: string | null) => Promise<void>
  onUpdatePhone: (val: string | null) => Promise<void>
}) {
  const age = dob ? calculateAge(dob) : null

  return (
    <TableRow>
      <TableCell>
        <span className="font-medium">{name}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <EditableDateCell value={dob} onSave={onUpdateDob} placeholder="Set birthday" />
          {age !== null && (
            <span className="text-xs text-muted-foreground">(Age {age})</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <EditableTextCell value={email} onSave={onUpdateEmail} placeholder="Add email" />
      </TableCell>
      <TableCell>
        <EditableTextCell value={phone} onSave={onUpdatePhone} placeholder="Add phone" />
      </TableCell>
    </TableRow>
  )
}

// Contact row component (no birthday - professional contacts)
function ContactRow({
  name,
  role,
  company,
  email,
  phone,
  onUpdateEmail,
  onUpdatePhone,
}: {
  name: string
  role: string
  company: string | null
  email: string | null
  phone: string | null
  onUpdateEmail: (val: string | null) => Promise<void>
  onUpdatePhone: (val: string | null) => Promise<void>
}) {
  const roleLabel = CONTACT_ROLES.find(r => r.value === role)?.label || role

  return (
    <TableRow>
      <TableCell>
        <div>
          <span className="font-medium">{name}</span>
          {company && (
            <span className="text-xs text-muted-foreground ml-2">({company})</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{roleLabel}</Badge>
      </TableCell>
      <TableCell>
        <EditableTextCell value={email} onSave={onUpdateEmail} placeholder="Add email" />
      </TableCell>
      <TableCell>
        <EditableTextCell value={phone} onSave={onUpdatePhone} placeholder="Add phone" />
      </TableCell>
    </TableRow>
  )
}

export function Settings() {
  const { data: entities, loading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string>("")
  const [activeTab, setActiveTab] = useState("beneficiaries")

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const {
    data: beneficiaries,
    loading: beneficiariesLoading,
    update: updateBeneficiary,
  } = useBeneficiaries(selectedEntity || undefined)

  const {
    data: trustees,
    loading: trusteesLoading,
    update: updateTrustee,
  } = useTrustees(selectedEntity || undefined)

  const {
    data: contacts,
    loading: contactsLoading,
    update: updateContact,
    create: createContact,
  } = useContacts()

  // New contact form state
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({
    name: "",
    company: "",
    role: "OTHER",
    email: "",
    phone: "",
  })
  const [creatingContact, setCreatingContact] = useState(false)

  const handleCreateContact = async () => {
    if (!newContact.name.trim()) return
    setCreatingContact(true)
    try {
      await createContact({
        name: newContact.name.trim(),
        company: newContact.company.trim() || null,
        role: newContact.role,
        email: newContact.email.trim() || null,
        phone: newContact.phone.trim() || null,
      })
      setNewContact({ name: "", company: "", role: "OTHER", email: "", phone: "" })
      setShowAddContact(false)
    } catch (e) {
      console.error("Failed to create contact:", e)
    } finally {
      setCreatingContact(false)
    }
  }

  const loading = entitiesLoading || beneficiariesLoading || trusteesLoading || contactsLoading

  // Count how many people have birthdays set (for beneficiaries/trustees)
  const beneficiariesWithDob = beneficiaries.filter(b => b.dob).length
  const trusteesWithDob = trustees.filter(t => t.dob).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure personal information and preferences
          </p>
        </div>
      </div>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* People Configuration Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>People Configuration</CardTitle>
              <CardDescription>
                Manage birthdays, emails, and contact information for all people
              </CardDescription>
            </div>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
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
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="beneficiaries">
                Beneficiaries
                <Badge variant="secondary" className="ml-2">
                  {beneficiariesWithDob}/{beneficiaries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="trustees">
                Trustees
                <Badge variant="secondary" className="ml-2">
                  {trusteesWithDob}/{trustees.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="contacts">
                Contacts
                <Badge variant="secondary" className="ml-2">
                  {contacts.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="beneficiaries">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : beneficiaries.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  No beneficiaries found for this trust
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Birthday</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {beneficiaries.map((b) => (
                        <PersonRow
                          key={b.id}
                          name={`${b.firstName} ${b.lastName}`}
                          dob={b.dob}
                          email={b.email}
                          phone={b.phone}
                          onUpdateDob={async (val) => {
                            await updateBeneficiary(b.id, { dob: val })
                          }}
                          onUpdateEmail={async (val) => {
                            await updateBeneficiary(b.id, { email: val })
                          }}
                          onUpdatePhone={async (val) => {
                            await updateBeneficiary(b.id, { phone: val })
                          }}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="trustees">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : trustees.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  No trustees found for this trust
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Birthday</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trustees.map((t) => (
                        <PersonRow
                          key={t.id}
                          name={t.name}
                          dob={t.dob}
                          email={t.email}
                          phone={t.phone}
                          onUpdateDob={async (val) => {
                            await updateTrustee(t.id, { dob: val })
                          }}
                          onUpdateEmail={async (val) => {
                            await updateTrustee(t.id, { email: val })
                          }}
                          onUpdatePhone={async (val) => {
                            await updateTrustee(t.id, { phone: val })
                          }}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contacts">
              <div className="space-y-4">
                {/* Add Contact Button */}
                <div className="flex justify-end">
                  <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Contact</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="contact-name">Name *</Label>
                          <Input
                            id="contact-name"
                            value={newContact.name}
                            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                            placeholder="John Smith"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-company">Company</Label>
                          <Input
                            id="contact-company"
                            value={newContact.company}
                            onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                            placeholder="Smith & Associates"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-role">Role</Label>
                          <Select
                            value={newContact.role}
                            onValueChange={(v) => setNewContact({ ...newContact, role: v })}
                          >
                            <SelectTrigger id="contact-role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONTACT_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-email">Email</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            value={newContact.email}
                            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-phone">Phone</Label>
                          <Input
                            id="contact-phone"
                            type="tel"
                            value={newContact.phone}
                            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setShowAddContact(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateContact} disabled={!newContact.name.trim() || creatingContact}>
                            {creatingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Contact
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="py-12 text-center">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No contacts yet</p>
                    <p className="text-sm text-muted-foreground">Add attorneys, CPAs, and other professionals</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((c) => (
                          <ContactRow
                            key={c.id}
                            name={c.name}
                            role={c.role}
                            company={c.company}
                            email={c.email}
                            phone={c.phone}
                            onUpdateEmail={async (val) => {
                              await updateContact(c.id, { email: val })
                            }}
                            onUpdatePhone={async (val) => {
                              await updateContact(c.id, { phone: val })
                            }}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
