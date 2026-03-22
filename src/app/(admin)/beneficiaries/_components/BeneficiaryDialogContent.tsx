'use client'

import {
    AlertTriangle,
    Cake,
    Check,
    Mail,
    MapPin,
    Phone,
    Plus,
    ShieldCheck,
} from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import {
    EditableNumberCell,
    EditableTextCell,
} from '@/components/editable-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import type { Beneficiary } from '@/db/schema'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/utils/formatters'
import {
    type BeneficiaryWithDistributions,
    calculateEligibility,
    WITHDRAWAL_AGE_50_PERCENT,
    WITHDRAWAL_AGE_100_PERCENT,
} from './types'

interface NewDistribution {
    amount: string
    paymentMethod: string
    hemsCategory: string
    hemsJustification: string
    notes: string
}

interface BeneficiaryDialogContentProps {
    beneficiary: BeneficiaryWithDistributions
    updateBeneficiary: (
        id: number,
        data: Partial<Beneficiary>,
    ) => Promise<unknown>
    setSelectedBeneficiary: (b: BeneficiaryWithDistributions | null) => void
    showDistributionForm: boolean
    setShowDistributionForm: (show: boolean) => void
    newDistribution: NewDistribution
    setNewDistribution: (d: NewDistribution) => void
    recordDistribution: () => Promise<void>
    showDeceasedForm: boolean
    setShowDeceasedForm: (show: boolean) => void
    deceasedDate: string
    setDeceasedDate: (date: string) => void
    handleMarkDeceased: () => Promise<void>
    isMarkingDeceased: boolean
}

export function BeneficiaryDialogContent({
    beneficiary,
    updateBeneficiary,
    setSelectedBeneficiary,
    showDistributionForm,
    setShowDistributionForm,
    newDistribution,
    setNewDistribution,
    recordDistribution,
    showDeceasedForm,
    setShowDeceasedForm,
    deceasedDate,
    setDeceasedDate,
    handleMarkDeceased,
    isMarkingDeceased,
}: BeneficiaryDialogContentProps) {
    const utils = trpc.useUtils()
    const toggleDistTax = trpc.distribution.update.useMutation({
        onSuccess: () => {
            utils.beneficiary.listWithDistributions.invalidate()
        },
    })

    const age50 = beneficiary.withdrawalAge1 ?? WITHDRAWAL_AGE_50_PERCENT
    const age100 = beneficiary.withdrawalAge2 ?? WITHDRAWAL_AGE_100_PERCENT
    const eligibility = calculateEligibility(
        beneficiary.dob,
        beneficiary.withdrawalAge1,
        beneficiary.withdrawalAge2,
    )
    const age25Date = beneficiary.dob
        ? new Date(
              new Date(beneficiary.dob).setFullYear(
                  new Date(beneficiary.dob).getFullYear() + age50,
              ),
          )
        : null
    const age30Date = beneficiary.dob
        ? new Date(
              new Date(beneficiary.dob).setFullYear(
                  new Date(beneficiary.dob).getFullYear() + age100,
              ),
          )
        : null

    return (
        <div className="space-y-4">
            {/* Key Info */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">Share</p>
                    <p className="mt-1 text-xl font-bold">
                        {beneficiary.sharePercent
                            ? `${beneficiary.sharePercent}%`
                            : '—'}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Eligibility</p>
                    <Badge
                        className={cn(
                            'mt-1',
                            eligibility.status === 'full' &&
                                'bg-success hover:bg-success/90',
                            eligibility.status === 'partial' &&
                                'bg-amber-500/20 text-amber-700 border-amber-500/30',
                        )}
                        variant={
                            eligibility.status === 'none'
                                ? 'outline'
                                : 'default'
                        }
                    >
                        {eligibility.label}
                    </Badge>
                </div>
            </div>

            {/* Date of Birth */}
            <Separator />
            <div className="flex items-center gap-2">
                <Cake className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                        Date of Birth
                    </p>
                    <Input
                        type="date"
                        value={
                            beneficiary.dob
                                ? new Date(beneficiary.dob)
                                      .toISOString()
                                      .split('T')[0]
                                : ''
                        }
                        onChange={async (e) => {
                            const val = e.target.value
                            if (!val) return
                            const isoDate = `${val}T00:00:00.000Z`
                            await updateBeneficiary(beneficiary.id, {
                                dob: isoDate,
                            })
                            setSelectedBeneficiary({
                                ...beneficiary,
                                dob: isoDate,
                            })
                        }}
                        className="h-8 w-auto"
                    />
                </div>
            </div>

            {/* Withdrawal Rights */}
            <Separator />
            <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Withdrawal Rights
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <Card
                        className={cn(
                            eligibility.percent >= 50 &&
                                'border-success bg-success/5',
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Age {age50}
                                </p>
                                {eligibility.percent >= 50 && (
                                    <Check className="h-4 w-4 text-success" />
                                )}
                            </div>
                            <p className="font-medium">50% of share</p>
                            {age25Date ? (
                                <p
                                    className={cn(
                                        'mt-1 text-xs',
                                        eligibility.percent >= 50
                                            ? 'text-success'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {eligibility.percent >= 50
                                        ? 'Eligible since'
                                        : 'Eligible'}
                                    : {formatDate(age25Date.toISOString())}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Set birthday to calculate
                                </p>
                            )}
                            <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">
                                    Withdrawal age
                                </p>
                                <EditableNumberCell
                                    value={beneficiary.withdrawalAge1}
                                    min={18}
                                    max={65}
                                    placeholder="25 (default)"
                                    onSave={async (val) => {
                                        await updateBeneficiary(
                                            beneficiary.id,
                                            { withdrawalAge1: val },
                                        )
                                        setSelectedBeneficiary({
                                            ...beneficiary,
                                            withdrawalAge1: val,
                                        })
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card
                        className={cn(
                            eligibility.percent >= 100 &&
                                'border-success bg-success/5',
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Age {age100}
                                </p>
                                {eligibility.percent >= 100 && (
                                    <Check className="h-4 w-4 text-success" />
                                )}
                            </div>
                            <p className="font-medium">Remaining 50%</p>
                            {age30Date ? (
                                <p
                                    className={cn(
                                        'mt-1 text-xs',
                                        eligibility.percent >= 100
                                            ? 'text-success'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {eligibility.percent >= 100
                                        ? 'Eligible since'
                                        : 'Eligible'}
                                    : {formatDate(age30Date.toISOString())}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Set birthday to calculate
                                </p>
                            )}
                            <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">
                                    Withdrawal age
                                </p>
                                <EditableNumberCell
                                    value={beneficiary.withdrawalAge2}
                                    min={18}
                                    max={65}
                                    placeholder="30 (default)"
                                    onSave={async (val) => {
                                        await updateBeneficiary(
                                            beneficiary.id,
                                            { withdrawalAge2: val },
                                        )
                                        setSelectedBeneficiary({
                                            ...beneficiary,
                                            withdrawalAge2: val,
                                        })
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Contact Information */}
            <Separator />
            <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Contact Information
                </p>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <EditableTextCell
                            value={beneficiary.email}
                            onSave={async (val) => {
                                await updateBeneficiary(beneficiary.id, {
                                    email: val,
                                })
                                setSelectedBeneficiary({
                                    ...beneficiary,
                                    email: val,
                                })
                            }}
                        />
                        {beneficiary.email && (
                            <CopyButton value={beneficiary.email} />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <EditableTextCell
                            value={beneficiary.phone}
                            onSave={async (val) => {
                                await updateBeneficiary(beneficiary.id, {
                                    phone: val,
                                })
                                setSelectedBeneficiary({
                                    ...beneficiary,
                                    phone: val,
                                })
                            }}
                        />
                    </div>
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        <div className="flex-1 space-y-1">
                            <EditableTextCell
                                value={beneficiary.streetAddress}
                                onSave={async (val) => {
                                    await updateBeneficiary(beneficiary.id, {
                                        streetAddress: val,
                                    })
                                    setSelectedBeneficiary({
                                        ...beneficiary,
                                        streetAddress: val,
                                    })
                                }}
                            />
                            <div className="flex gap-1">
                                <EditableTextCell
                                    value={beneficiary.city}
                                    onSave={async (val) => {
                                        await updateBeneficiary(
                                            beneficiary.id,
                                            { city: val },
                                        )
                                        setSelectedBeneficiary({
                                            ...beneficiary,
                                            city: val,
                                        })
                                    }}
                                />
                                <EditableTextCell
                                    value={beneficiary.state}
                                    onSave={async (val) => {
                                        await updateBeneficiary(
                                            beneficiary.id,
                                            { state: val },
                                        )
                                        setSelectedBeneficiary({
                                            ...beneficiary,
                                            state: val,
                                        })
                                    }}
                                />
                                <EditableTextCell
                                    value={beneficiary.zip}
                                    onSave={async (val) => {
                                        await updateBeneficiary(
                                            beneficiary.id,
                                            { zip: val },
                                        )
                                        setSelectedBeneficiary({
                                            ...beneficiary,
                                            zip: val,
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tax Information */}
            <Separator />
            <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tax Information
                </p>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                            Tax ID (SSN/TIN)
                        </p>
                        <EditableTextCell
                            value={beneficiary.taxId}
                            onSave={async (val) => {
                                await updateBeneficiary(beneficiary.id, {
                                    taxId: val,
                                })
                                setSelectedBeneficiary({
                                    ...beneficiary,
                                    taxId: val,
                                })
                            }}
                            placeholder="Add Tax ID"
                            validate={(v) => {
                                const digits = v.replace(/\D/g, '')
                                if (digits.length !== 9)
                                    return 'Tax ID must be 9 digits'
                                return null
                            }}
                        />
                    </div>
                </div>
                {beneficiary.taxId && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                        Stored: ***-**-
                        {beneficiary.taxId.replace(/\D/g, '').slice(-4)}
                    </p>
                )}
            </div>

            {/* Distribution History */}
            <Separator />
            <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Distribution History
                </p>
                {(beneficiary.distributions || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No distributions recorded
                    </p>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Tax Reported</TableHead>
                                    <TableHead>1099</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(beneficiary.distributions || []).map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell className="text-sm">
                                            {formatDate(d.distributionDate)}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatCurrency(d.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    d.isWithdrawal
                                                        ? 'outline'
                                                        : d.hemsCategory
                                                          ? 'default'
                                                          : 'secondary'
                                                }
                                            >
                                                {d.isWithdrawal
                                                    ? 'Withdrawal'
                                                    : d.hemsCategory ||
                                                      'Distribution'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {d.paymentMethod}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={d.taxReported}
                                                onCheckedChange={(checked) =>
                                                    toggleDistTax.mutate({
                                                        id: d.id,
                                                        entityId:
                                                            beneficiary.entityId,
                                                        data: {
                                                            taxReported:
                                                                checked,
                                                        },
                                                    })
                                                }
                                                disabled={
                                                    toggleDistTax.isPending
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={d.tax1099Issued}
                                                onCheckedChange={(checked) =>
                                                    toggleDistTax.mutate({
                                                        id: d.id,
                                                        entityId:
                                                            beneficiary.entityId,
                                                        data: {
                                                            tax1099Issued:
                                                                checked,
                                                        },
                                                    })
                                                }
                                                disabled={
                                                    toggleDistTax.isPending
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Record Distribution Form */}
            {showDistributionForm ? (
                <Card>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={newDistribution.amount}
                                onChange={(e) =>
                                    setNewDistribution({
                                        ...newDistribution,
                                        amount: e.target.value,
                                    })
                                }
                                placeholder="$0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentMethod">
                                Payment Method
                            </Label>
                            <Select
                                value={newDistribution.paymentMethod}
                                onValueChange={(v) =>
                                    setNewDistribution({
                                        ...newDistribution,
                                        paymentMethod: v,
                                    })
                                }
                            >
                                <SelectTrigger id="paymentMethod">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CHECK">Check</SelectItem>
                                    <SelectItem value="ACH">ACH</SelectItem>
                                    <SelectItem value="WIRE">Wire</SelectItem>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {beneficiary.distributionStandard === 'HEMS' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="hemsCategory">
                                        HEMS Category
                                    </Label>
                                    <Select
                                        value={newDistribution.hemsCategory}
                                        onValueChange={(v) =>
                                            setNewDistribution({
                                                ...newDistribution,
                                                hemsCategory: v,
                                            })
                                        }
                                    >
                                        <SelectTrigger id="hemsCategory">
                                            <SelectValue placeholder="Select category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HEALTH">
                                                Health
                                            </SelectItem>
                                            <SelectItem value="EDUCATION">
                                                Education
                                            </SelectItem>
                                            <SelectItem value="MAINTENANCE">
                                                Maintenance
                                            </SelectItem>
                                            <SelectItem value="SUPPORT">
                                                Support
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="justification">
                                        Justification
                                    </Label>
                                    <Input
                                        id="justification"
                                        value={
                                            newDistribution.hemsJustification
                                        }
                                        onChange={(e) =>
                                            setNewDistribution({
                                                ...newDistribution,
                                                hemsJustification:
                                                    e.target.value,
                                            })
                                        }
                                        placeholder="Explain why this qualifies under HEMS..."
                                    />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                                id="notes"
                                value={newDistribution.notes}
                                onChange={(e) =>
                                    setNewDistribution({
                                        ...newDistribution,
                                        notes: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={recordDistribution}>Save</Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShowDistributionForm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Button
                    className="w-full"
                    onClick={() => setShowDistributionForm(true)}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Record Distribution
                </Button>
            )}

            {/* Mark as Deceased - only show if not already deceased */}
            {!beneficiary.deceasedDate && (
                <>
                    <Separator />
                    {showDeceasedForm ? (
                        <Card className="border-destructive/50 bg-destructive/5">
                            <CardContent className="space-y-4 pt-4">
                                <div className="flex items-start gap-2 text-destructive">
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium">
                                            Mark Beneficiary as Deceased
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            This will automatically redistribute
                                            their share pro-rata to living
                                            beneficiaries per Section 7.01.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="deceasedDate">
                                        Date of Death
                                    </Label>
                                    <Input
                                        id="deceasedDate"
                                        type="date"
                                        value={deceasedDate}
                                        onChange={(e) =>
                                            setDeceasedDate(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="destructive"
                                        onClick={handleMarkDeceased}
                                        disabled={
                                            !deceasedDate || isMarkingDeceased
                                        }
                                    >
                                        {isMarkingDeceased
                                            ? 'Processing...'
                                            : 'Confirm'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() =>
                                            setShowDeceasedForm(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full text-muted-foreground hover:text-destructive hover:border-destructive"
                            onClick={() => setShowDeceasedForm(true)}
                        >
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Mark as Deceased
                        </Button>
                    )}
                </>
            )}

            {/* Show deceased status if already marked */}
            {beneficiary.deceasedDate && (
                <>
                    <Separator />
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge
                            variant="outline"
                            className="border-destructive/50 text-destructive"
                        >
                            Deceased
                        </Badge>
                        <span className="text-sm">
                            {formatDate(beneficiary.deceasedDate)}
                        </span>
                    </div>
                </>
            )}
        </div>
    )
}
