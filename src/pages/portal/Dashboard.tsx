import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, User, Percent, DollarSign, Phone, Mail, CheckCircle, Clock, Plus } from "lucide-react"
import { formatCurrency, formatDate, formatPercent } from "@/utils/formatters"
import { HemsRequestForm } from "./HemsRequestForm"

interface Distribution {
  id: string
  distributionDate: string
  amount: string
  distributionType: string
  hemsCategory?: string
  hemsJustification?: string
  approvedBy?: string
  approvalDate?: string
  paymentMethod: string
  notes?: string
}

interface Beneficiary {
  id: string
  entityId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  sharePercent?: string
  distributionStandard?: string
  distributions: Distribution[]
}

interface PortalData {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  beneficiary: Beneficiary
}

export function PortalDashboard() {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRequestForm, setShowRequestForm] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/portal/me", {
          credentials: "include",
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Redirect to login
            window.location.hash = "#/portal/login"
            return
          }
          throw new Error("Failed to load your information")
        }

        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { beneficiary } = data
  const fullName = `${beneficiary.firstName} ${beneficiary.lastName}`

  // Calculate totals
  const totalDistributed = beneficiary.distributions.reduce(
    (sum, d) => sum + parseFloat(d.amount || "0"),
    0
  )

  const pendingDistributions = beneficiary.distributions.filter(
    (d) => !d.approvalDate
  )
  const approvedDistributions = beneficiary.distributions.filter(
    (d) => d.approvalDate
  )

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {beneficiary.firstName}</h1>
        <p className="text-muted-foreground">
          Here's an overview of your trust information
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Share</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {beneficiary.sharePercent
                ? formatPercent(parseFloat(beneficiary.sharePercent) / 100)
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              of residuary estate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDistributed)}
            </div>
            <p className="text-xs text-muted-foreground">
              {approvedDistributions.length} distribution(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingDistributions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              request(s) awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Information</CardTitle>
          <CardDescription>
            Contact your trustee if any information needs to be updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{fullName}</p>
              </div>
            </div>

            {beneficiary.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{beneficiary.email}</p>
                </div>
              </div>
            )}

            {beneficiary.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{beneficiary.phone}</p>
                </div>
              </div>
            )}

            {beneficiary.distributionStandard && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Distribution Standard</p>
                  <Badge variant="secondary">
                    {beneficiary.distributionStandard}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Distributions History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribution History</CardTitle>
          <CardDescription>
            All distributions made from the trust to you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {beneficiary.distributions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No distributions have been made yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beneficiary.distributions.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell>
                      {formatDate(dist.distributionDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{dist.distributionType}</Badge>
                    </TableCell>
                    <TableCell>
                      {dist.hemsCategory || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parseFloat(dist.amount))}
                    </TableCell>
                    <TableCell>
                      {dist.approvalDate ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request a Distribution</CardTitle>
          <CardDescription>
            Submit a request for funds under the HEMS standard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowRequestForm(true)} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </CardContent>
      </Card>

      {/* Request Form Dialog */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <HemsRequestForm
            beneficiaryId={beneficiary.id}
            entityId={beneficiary.entityId}
            onSuccess={() => {
              setShowRequestForm(false)
              // Refresh data
              window.location.reload()
            }}
            onCancel={() => setShowRequestForm(false)}
          />
        </div>
      )}
    </div>
  )
}
