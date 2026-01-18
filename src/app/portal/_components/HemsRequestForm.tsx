'use client'

/**
 * HEMS Request Form
 *
 * Allows beneficiaries to submit requests for distributions under the
 * Health, Education, Maintenance, Support standard.
 *
 * Uses tRPC for type-safe mutations.
 */

import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/lib/trpc'

interface HemsRequestFormProps {
    beneficiaryId: string
    entityId: string
    onSuccess: () => void
    onCancel: () => void
}

const CATEGORIES = [
    {
        value: 'HEALTH',
        label: 'Health',
        description: 'Medical expenses, healthcare, insurance',
    },
    {
        value: 'EDUCATION',
        label: 'Education',
        description: 'Tuition, books, educational expenses',
    },
    {
        value: 'MAINTENANCE',
        label: 'Maintenance',
        description: 'Housing, utilities, basic living expenses',
    },
    {
        value: 'SUPPORT',
        label: 'Support',
        description: 'General support and living needs',
    },
]

export function HemsRequestForm({
    beneficiaryId,
    entityId,
    onSuccess,
    onCancel,
}: HemsRequestFormProps) {
    const [category, setCategory] = useState('')
    const [amount, setAmount] = useState('')
    const [justification, setJustification] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // tRPC mutation for submitting HEMS request
    const submitMutation = trpc.hemsRequest.submit.useMutation({
        onSuccess: () => {
            setSuccess(true)
            toast.success('Request submitted successfully')
            setTimeout(() => {
                onSuccess()
            }, 2000)
        },
        onError: (err) => {
            setError(err.message || 'Failed to submit request')
            toast.error(err.message || 'Failed to submit request')
        },
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!category || !amount || !justification) {
            setError('Please fill in all required fields')
            return
        }

        const amountNum = parseFloat(amount)
        if (Number.isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount')
            return
        }

        submitMutation.mutate({
            beneficiaryId,
            entityId,
            category: category as
                | 'HEALTH'
                | 'EDUCATION'
                | 'MAINTENANCE'
                | 'SUPPORT',
            amountRequested: amount,
            justification,
        })
    }

    if (success) {
        return (
            <Card className="max-w-lg mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold">
                            Request Submitted
                        </h3>
                        <p className="text-muted-foreground">
                            Your request has been submitted for review. You'll
                            be notified when the trustee makes a decision.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="max-w-lg mx-auto">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <CardTitle>Request Distribution</CardTitle>
                        <CardDescription>
                            Submit a request for a distribution under the HEMS
                            standard
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem
                                        key={cat.value}
                                        value={cat.value}
                                    >
                                        <div>
                                            <span className="font-medium">
                                                {cat.label}
                                            </span>
                                            <span className="text-muted-foreground ml-2 text-xs">
                                                {cat.description}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount Requested *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                $
                            </span>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="pl-7"
                            />
                        </div>
                    </div>

                    {/* Justification */}
                    <div className="space-y-2">
                        <Label htmlFor="justification">Justification *</Label>
                        <Textarea
                            id="justification"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder="Please explain the purpose of this request and how it relates to health, education, maintenance, or support..."
                            rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                            Provide details to help the trustee understand your
                            need
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="rounded-lg bg-muted/50 p-4 text-sm">
                        <p className="font-medium mb-1">What happens next?</p>
                        <ul className="text-muted-foreground space-y-1">
                            <li>
                                1. Your request will be reviewed by the trustee
                            </li>
                            <li>
                                2. You'll receive notification of the decision
                            </li>
                            <li>
                                3. If approved, the distribution will be
                                processed
                            </li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={submitMutation.isPending}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitMutation.isPending}
                            className="flex-1"
                        >
                            {submitMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Submit Request
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
