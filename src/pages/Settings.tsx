"use client"

import { Building, Loader2, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { EditableDateCell, EditableTextCell } from "@/components/editable-cells"
import { ResourceDialog } from "@/components/resource-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useResourceForm } from "@/hooks/use-resource-form"
import { insertContactSchema } from "../../db/validation"
import { calculateAge } from "../utils/formatters"

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

import { useBeneficiaries, useUpdateBeneficiary } from "@/hooks/beneficiaries/queries"
import { useContacts, useCreateContact, useUpdateContact } from "@/hooks/contacts/queries"
// Import hooks
import { useEntities } from "@/hooks/entities/queries"
import { useTrustees, useUpdateTrustee } from "@/hooks/trustees/queries"

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
          {age !== null && <span className="text-xs text-muted-foreground">(Age {age})</span>}
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
  const roleLabel = CONTACT_ROLES.find((r) => r.value === role)?.label || role

  return (
    <TableRow>
      <TableCell>
        <div>
          <span className="font-medium">{name}</span>
          {company && <span className="text-xs text-muted-foreground ml-2">({company})</span>}
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
  const { data: entities = [], isLoading: entitiesLoading } = useEntities()
  const [selectedEntity, setSelectedEntity] = useState<string>("")
  const [activeTab, setActiveTab] = useState("beneficiaries")

  // Auto-select first entity
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity && entities[0]) {
      setSelectedEntity(entities[0].id)
    }
  }, [entities, selectedEntity])

  const { data: beneficiaries = [], isLoading: beneficiariesLoading } = useBeneficiaries(
    selectedEntity || undefined,
  )
  const updateBeneficiaryMutation = useUpdateBeneficiary()

  const { data: trustees = [], isLoading: trusteesLoading } = useTrustees(
    selectedEntity || undefined,
  )
  const updateTrusteeMutation = useUpdateTrustee()

  const { data: contacts = [], isLoading: contactsLoading } = useContacts()
  const updateContactMutation = useUpdateContact()
  const createContactMutation = useCreateContact()

  // Contact form using useResourceForm hook
  const contactForm = useResourceForm({
    initialData: {
      name: "",
      company: "",
      role: "OTHER",
      email: "",
      phone: "",
    },
    schema: insertContactSchema,
    onSubmit: async (data) => {
      await createContactMutation.mutateAsync({
        name: data.name.trim(),
        company: data.company?.trim() || null,
        role: data.role,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
      })
    },
  })

  const { formInstance } = contactForm

  const loading = entitiesLoading || beneficiariesLoading || trusteesLoading || contactsLoading

  // Count how many people have birthdays set (for beneficiaries/trustees)
  const beneficiariesWithDob = beneficiaries.filter((b) => b.dob).length
  const trusteesWithDob = trustees.filter((t) => t.dob).length

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
                            await updateBeneficiaryMutation.mutateAsync({
                              id: b.id,
                              data: { dob: val },
                            })
                          }}
                          onUpdateEmail={async (val) => {
                            await updateBeneficiaryMutation.mutateAsync({
                              id: b.id,
                              data: { email: val },
                            })
                          }}
                          onUpdatePhone={async (val) => {
                            await updateBeneficiaryMutation.mutateAsync({
                              id: b.id,
                              data: { phone: val },
                            })
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
                            await updateTrusteeMutation.mutateAsync({
                              id: t.id,
                              data: { dob: val },
                            })
                          }}
                          onUpdateEmail={async (val) => {
                            await updateTrusteeMutation.mutateAsync({
                              id: t.id,
                              data: { email: val },
                            })
                          }}
                          onUpdatePhone={async (val) => {
                            await updateTrusteeMutation.mutateAsync({
                              id: t.id,
                              data: { phone: val },
                            })
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
                  <Button size="sm" onClick={() => contactForm.open()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </div>

                {/* Add Contact Dialog */}
                <ResourceDialog
                  open={contactForm.isOpen}
                  onOpenChange={contactForm.close}
                  title="Add New Contact"
                  onSubmit={contactForm.handleSave}
                  isLoading={contactForm.isSubmitting}
                >
                  <div className="space-y-4">
                    {/* Name - Required */}
                    <formInstance.Field name="name">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="contact-name">Name *</Label>
                          <Input
                            id="contact-name"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="John Smith"
                          />
                          {field.state.meta.errors?.[0] && (
                            <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                          )}
                        </div>
                      )}
                    </formInstance.Field>

                    {/* Company */}
                    <formInstance.Field name="company">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="contact-company">Company</Label>
                          <Input
                            id="contact-company"
                            value={field.state.value || ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="Smith & Associates"
                          />
                        </div>
                      )}
                    </formInstance.Field>

                    {/* Role */}
                    <formInstance.Field name="role">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="contact-role">Role</Label>
                          <Select
                            value={field.state.value}
                            onValueChange={(v) => field.handleChange(v)}
                          >
                            <SelectTrigger id="contact-role" onBlur={field.handleBlur}>
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
                      )}
                    </formInstance.Field>

                    {/* Email */}
                    <formInstance.Field name="email">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="contact-email">Email</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            value={field.state.value || ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="john@example.com"
                          />
                        </div>
                      )}
                    </formInstance.Field>

                    {/* Phone */}
                    <formInstance.Field name="phone">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="contact-phone">Phone</Label>
                          <Input
                            id="contact-phone"
                            type="tel"
                            value={field.state.value || ""}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      )}
                    </formInstance.Field>
                  </div>
                </ResourceDialog>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="py-12 text-center">
                    <Building className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No contacts yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add attorneys, CPAs, and other professionals
                    </p>
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
                              await updateContactMutation.mutateAsync({
                                id: c.id,
                                data: { email: val },
                              })
                            }}
                            onUpdatePhone={async (val) => {
                              await updateContactMutation.mutateAsync({
                                id: c.id,
                                data: { phone: val },
                              })
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
