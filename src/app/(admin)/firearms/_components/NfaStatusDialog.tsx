'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc'

type NfaStatus = 'NOT_FILED' | 'FILED' | 'APPROVED'

interface NfaStatusDialogProps {
    firearm: {
        id: number
        entityId: number
        nfaTransferStatus: NfaStatus | null
    }
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NfaStatusDialog({
    firearm,
    open,
    onOpenChange,
}: NfaStatusDialogProps) {
    const utils = trpc.useUtils()
    const [status, setStatus] = useState<NfaStatus>(
        firearm.nfaTransferStatus ?? 'NOT_FILED',
    )
    const [taxStampDate, setTaxStampDate] = useState('')
    const [atfControlNumber, setAtfControlNumber] = useState('')

    useEffect(() => {
        if (open) {
            setStatus(firearm.nfaTransferStatus ?? 'NOT_FILED')
            setTaxStampDate('')
            setAtfControlNumber('')
        }
    }, [open, firearm.nfaTransferStatus])

    const setNfaStatusMutation = trpc.firearm.setNfaTransferStatus.useMutation({
        onSuccess: () => {
            utils.firearm.list.invalidate()
            utils.firearm.byId.invalidate({
                id: firearm.id,
                entityId: firearm.entityId,
            })
            toast.success('NFA transfer status updated.')
            onOpenChange(false)
        },
        onError: (err) => toast.error(err.message),
    })

    const handleSubmit = () => {
        const payload = {
            id: firearm.id,
            entityId: firearm.entityId,
            status,
            taxStampDate:
                status === 'APPROVED' && taxStampDate
                    ? new Date(taxStampDate).toISOString()
                    : undefined,
            atfControlNumber:
                (status === 'FILED' || status === 'APPROVED') &&
                atfControlNumber
                    ? atfControlNumber
                    : undefined,
        }
        setNfaStatusMutation.mutate(payload)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update ATF Form 5 Status</DialogTitle>
                    <DialogDescription>
                        Record the ATF Form 5 filing progress for this NFA item.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="nfa-status">Status</Label>
                        <Select
                            value={status}
                            onValueChange={(v) => setStatus(v as NfaStatus)}
                        >
                            <SelectTrigger id="nfa-status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NOT_FILED">
                                    Not Filed
                                </SelectItem>
                                <SelectItem value="FILED">
                                    Filed — Awaiting ATF
                                </SelectItem>
                                <SelectItem value="APPROVED">
                                    Approved
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {(status === 'FILED' || status === 'APPROVED') && (
                        <div className="space-y-2">
                            <Label htmlFor="atf-control-number">
                                ATF Control Number
                            </Label>
                            <Input
                                id="atf-control-number"
                                placeholder="From the approved Form 5 stamp"
                                value={atfControlNumber}
                                onChange={(e) =>
                                    setAtfControlNumber(e.target.value)
                                }
                            />
                        </div>
                    )}

                    {status === 'APPROVED' && (
                        <div className="space-y-2">
                            <Label htmlFor="tax-stamp-date">
                                Tax Stamp Date
                            </Label>
                            <Input
                                id="tax-stamp-date"
                                type="date"
                                value={taxStampDate}
                                onChange={(e) =>
                                    setTaxStampDate(e.target.value)
                                }
                            />
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        This app does not file ATF forms. Record the status
                        after filing through your FFL or attorney.
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={setNfaStatusMutation.isPending}
                    >
                        {setNfaStatusMutation.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        Save Status
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
