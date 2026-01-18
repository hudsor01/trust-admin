'use client'

/**
 * Portal Dashboard
 *
 * Beneficiary portal dashboard showing their trust information,
 * distribution history, and HEMS request form.
 *
 * Uses tRPC for type-safe data fetching.
 */

import {
    CheckCircle,
    Clock,
    DollarSign,
    Loader2,
    LogOut,
    Mail,
    Percent,
    Phone,
    Plus,
    User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { signOut, useSession } from '@/lib/auth-client'
import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { HemsRequestForm } from './_components/HemsRequestForm'

export default function PortalDashboardPage() {
    const { data: session, isPending: sessionPending } = useSession()
    const router = useRouter()
    const [showRequestForm, setShowRequestForm] = useState(false)

    // Fetch beneficiary data via tRPC
    const {
        data: beneficiary,
        isLoading,
        error,
        refetch,
    } = trpc.beneficiary.me.useQuery(undefined, {
        enabled: !!session?.user,
    })

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!sessionPending && !session?.user) {
            router.push('/portal/login')
        }
    }, [sessionPending, session, router])

    const handleSignOut = async () => {
        await signOut()
        router.push('/portal/login')
    }

    const handleRequestSuccess = () => {
        setShowRequestForm(false)
        // Refresh beneficiary data to show new request
        refetch()
    }

    // Loading state
    if (sessionPending || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Not authenticated
    if (!session?.user) {
        return null
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-6">
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <p className="text-destructive">{error.message}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    if (!beneficiary) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-6">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-muted-foreground">
                                No beneficiary profile found for your account.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    const fullName = `${beneficiary.firstName} ${beneficiary.lastName}`
    const distributions = beneficiary.distributions || []

    // Calculate totals using dinero.js for precision
    const totalDistributed = sumStrings(distributions.map((d) => d.amount))

    const pendingDistributions = distributions.filter((d) => !d.approvalDate)
    const approvedDistributions = distributions.filter((d) => d.approvalDate)

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm">
                            TA
                        </div>
                        <div>
                            <h1 className="font-semibold">
                                Beneficiary Portal
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Trust Administration
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{session?.user?.name}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSignOut}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6 flex-1">
                <div className="space-y-6">
                    {/* Welcome Header */}
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Welcome, {beneficiary.firstName}
                        </h1>
                        <p className="text-muted-foreground">
                            Here's an overview of your trust information
                        </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Your Share
                                </CardTitle>
                                <Percent className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {beneficiary.sharePercent
                                        ? `${beneficiary.sharePercent}%`
                                        : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    of residuary estate
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Received
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(totalDistributed)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {approvedDistributions.length}{' '}
                                    distribution(s)
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Pending
                                </CardTitle>
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
                            <CardTitle className="text-lg">
                                Your Information
                            </CardTitle>
                            <CardDescription>
                                Contact your trustee if any information needs to
                                be updated
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Name
                                        </p>
                                        <p className="font-medium">
                                            {fullName}
                                        </p>
                                    </div>
                                </div>

                                {beneficiary.email && (
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Email
                                            </p>
                                            <p className="font-medium">
                                                {beneficiary.email}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {beneficiary.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Phone
                                            </p>
                                            <p className="font-medium">
                                                {beneficiary.phone}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {beneficiary.distributionStandard && (
                                    <div className="flex items-center gap-3">
                                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Distribution Standard
                                            </p>
                                            <Badge variant="secondary">
                                                {
                                                    beneficiary.distributionStandard
                                                }
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
                            <CardTitle className="text-lg">
                                Distribution History
                            </CardTitle>
                            <CardDescription>
                                All distributions made from the trust to you
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {distributions.length === 0 ? (
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
                                            <TableHead className="text-right">
                                                Amount
                                            </TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {distributions.map((dist) => (
                                            <TableRow key={dist.id}>
                                                <TableCell>
                                                    {formatDate(
                                                        dist.distributionDate,
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {dist.distributionType}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {dist.hemsCategory || '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(
                                                        dist.amount,
                                                    )}
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
                            <CardTitle className="text-lg">
                                Request a Distribution
                            </CardTitle>
                            <CardDescription>
                                Submit a request for funds under the HEMS
                                standard
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => setShowRequestForm(true)}
                                className="w-full gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                New Request
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Request Form Dialog */}
                {showRequestForm && beneficiary.entityId && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <HemsRequestForm
                            beneficiaryId={beneficiary.id}
                            entityId={beneficiary.entityId}
                            onSuccess={handleRequestSuccess}
                            onCancel={() => setShowRequestForm(false)}
                        />
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t mt-auto">
                <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
                    Trust Administration Portal
                </div>
            </footer>
        </div>
    )
}
