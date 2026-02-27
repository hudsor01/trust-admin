'use client'

import {
    CheckCircle,
    Clock,
    DollarSign,
    Loader2,
    LogOut,
    Mail,
    MapPin,
    Pencil,
    Percent,
    Phone,
    Plus,
    User,
    X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { authClient } from '@/lib/auth/client'

const { signOut, useSession } = authClient

import { sumStrings } from '@/lib/money'
import { trpc } from '@/lib/trpc'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { HemsRequestForm } from './_components/HemsRequestForm'

export default function PortalDashboardPage() {
    const { data: session, isPending: sessionPending } = useSession()
    const router = useRouter()
    const [showRequestForm, setShowRequestForm] = useState(false)
    const [editingContact, setEditingContact] = useState(false)
    const [contactForm, setContactForm] = useState({
        email: '',
        phone: '',
        streetAddress: '',
        city: '',
        state: '',
        zip: '',
    })

    const updateContact = trpc.beneficiary.updateMyContact.useMutation({
        onSuccess: () => {
            toast.success('Contact information updated')
            setEditingContact(false)
            refetch()
        },
        onError: (err) => {
            toast.error(err.message)
        },
    })

    const {
        data: beneficiary,
        isLoading,
        error,
        refetch,
    } = trpc.beneficiary.me.useQuery(undefined, {
        enabled: !!session?.user,
    })

    useEffect(() => {
        if (!sessionPending && !session?.user) {
            router.push('/auth/sign-in')
        }
    }, [sessionPending, session, router])

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth/sign-in')
    }

    const handleRequestSuccess = () => {
        setShowRequestForm(false)
        refetch()
    }

    if (sessionPending || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!session?.user) {
        return null
    }

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
                        <CardContent className="pt-6 space-y-4">
                            <p className="text-muted-foreground">
                                No beneficiary profile found for your account.
                            </p>
                            <Button
                                variant="outline"
                                onClick={handleSignOut}
                                className="gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    const fullName = `${beneficiary.firstName} ${beneficiary.lastName}`
    const distributions = beneficiary.distributions || []

    const totalDistributed = sumStrings(distributions.map((d) => d.amount))

    const pendingDistributions = distributions.filter((d) => !d.approvalDate)
    const approvedDistributions = distributions.filter((d) => d.approvalDate)

    return (
        <div className="min-h-screen bg-background flex flex-col">
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

            <main className="container mx-auto px-4 py-6 flex-1">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Welcome, {beneficiary.firstName}
                        </h1>
                        <p className="text-muted-foreground">
                            Here's an overview of your trust information
                        </p>
                    </div>

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

                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="text-lg">
                                    Your Information
                                </CardTitle>
                                <CardDescription>
                                    Keep your contact details up to date
                                </CardDescription>
                            </div>
                            {!editingContact && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setContactForm({
                                            email: beneficiary.email ?? '',
                                            phone: beneficiary.phone ?? '',
                                            streetAddress:
                                                beneficiary.streetAddress ?? '',
                                            city: beneficiary.city ?? '',
                                            state: beneficiary.state ?? '',
                                            zip: beneficiary.zip ?? '',
                                        })
                                        setEditingContact(true)
                                    }}
                                    className="gap-2 shrink-0"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {editingContact ? (
                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="contact-email">
                                                Email
                                            </Label>
                                            <Input
                                                id="contact-email"
                                                type="email"
                                                value={contactForm.email}
                                                onChange={(e) =>
                                                    setContactForm((f) => ({
                                                        ...f,
                                                        email: e.target.value,
                                                    }))
                                                }
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contact-phone">
                                                Phone
                                            </Label>
                                            <Input
                                                id="contact-phone"
                                                type="tel"
                                                value={contactForm.phone}
                                                onChange={(e) =>
                                                    setContactForm((f) => ({
                                                        ...f,
                                                        phone: e.target.value,
                                                    }))
                                                }
                                                placeholder="(555) 000-0000"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="contact-street">
                                                Street Address
                                            </Label>
                                            <Input
                                                id="contact-street"
                                                value={
                                                    contactForm.streetAddress
                                                }
                                                onChange={(e) =>
                                                    setContactForm((f) => ({
                                                        ...f,
                                                        streetAddress:
                                                            e.target.value,
                                                    }))
                                                }
                                                placeholder="123 Main St"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contact-city">
                                                City
                                            </Label>
                                            <Input
                                                id="contact-city"
                                                value={contactForm.city}
                                                onChange={(e) =>
                                                    setContactForm((f) => ({
                                                        ...f,
                                                        city: e.target.value,
                                                    }))
                                                }
                                                placeholder="City"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="contact-state">
                                                    State
                                                </Label>
                                                <Input
                                                    id="contact-state"
                                                    value={contactForm.state}
                                                    onChange={(e) =>
                                                        setContactForm((f) => ({
                                                            ...f,
                                                            state: e.target
                                                                .value,
                                                        }))
                                                    }
                                                    placeholder="TX"
                                                    maxLength={2}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="contact-zip">
                                                    Zip
                                                </Label>
                                                <Input
                                                    id="contact-zip"
                                                    value={contactForm.zip}
                                                    onChange={(e) =>
                                                        setContactForm((f) => ({
                                                            ...f,
                                                            zip: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="78701"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() =>
                                                updateContact.mutate({
                                                    email:
                                                        contactForm.email ||
                                                        null,
                                                    phone:
                                                        contactForm.phone ||
                                                        null,
                                                    streetAddress:
                                                        contactForm.streetAddress ||
                                                        null,
                                                    city:
                                                        contactForm.city ||
                                                        null,
                                                    state:
                                                        contactForm.state ||
                                                        null,
                                                    zip:
                                                        contactForm.zip || null,
                                                })
                                            }
                                            disabled={updateContact.isPending}
                                            size="sm"
                                        >
                                            {updateContact.isPending && (
                                                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                            )}
                                            Save Changes
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setEditingContact(false)
                                            }
                                            disabled={updateContact.isPending}
                                        >
                                            <X className="h-3.5 w-3.5 mr-1" />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
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

                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Email
                                            </p>
                                            <p className="font-medium">
                                                {beneficiary.email || (
                                                    <span className="text-muted-foreground italic">
                                                        Not set
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Phone
                                            </p>
                                            <p className="font-medium">
                                                {beneficiary.phone || (
                                                    <span className="text-muted-foreground italic">
                                                        Not set
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Address
                                            </p>
                                            {beneficiary.streetAddress ? (
                                                <p className="font-medium">
                                                    {beneficiary.streetAddress}
                                                    <br />
                                                    {[
                                                        beneficiary.city,
                                                        beneficiary.state,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                    {beneficiary.zip
                                                        ? ` ${beneficiary.zip}`
                                                        : ''}
                                                </p>
                                            ) : (
                                                <p className="text-muted-foreground italic">
                                                    Not set
                                                </p>
                                            )}
                                        </div>
                                    </div>

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
                            )}
                        </CardContent>
                    </Card>

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

            <footer className="border-t mt-auto">
                <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
                    Trust Administration Portal
                </div>
            </footer>
        </div>
    )
}
