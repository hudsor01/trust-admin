'use client'

import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
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

type UnlinkedBeneficiary = {
    id: number
    firstName: string | null
    lastName: string | null
    email: string | null
}

type CreatePortalAccountDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    unlinkedBeneficiaries: UnlinkedBeneficiary[]
    selectedBeneficiaryId: string | null
    email: string
    tempPassword: string
    showPassword: boolean
    isPending: boolean
    onBeneficiarySelect: (id: string) => void
    onEmailChange: (value: string) => void
    onTempPasswordChange: (value: string) => void
    onShowPasswordToggle: () => void
    onSubmit: () => void
}

export function CreatePortalAccountDialog({
    open,
    onOpenChange,
    unlinkedBeneficiaries,
    selectedBeneficiaryId,
    email,
    tempPassword,
    showPassword,
    isPending,
    onBeneficiarySelect,
    onEmailChange,
    onTempPasswordChange,
    onShowPasswordToggle,
    onSubmit,
}: CreatePortalAccountDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Create Portal Account
                    </DialogTitle>
                    <DialogDescription>
                        Provision a portal login for a beneficiary.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="beneficiary">Beneficiary</Label>
                        <Select
                            value={selectedBeneficiaryId ?? ''}
                            onValueChange={onBeneficiarySelect}
                        >
                            <SelectTrigger id="beneficiary">
                                <SelectValue placeholder="Select a beneficiary..." />
                            </SelectTrigger>
                            <SelectContent>
                                {unlinkedBeneficiaries.map((b) => (
                                    <SelectItem key={b.id} value={String(b.id)}>
                                        {b.firstName} {b.lastName}
                                        {b.email ? ` (${b.email})` : ''}
                                    </SelectItem>
                                ))}
                                {unlinkedBeneficiaries.length === 0 && (
                                    <SelectItem value="none" disabled>
                                        All beneficiaries have accounts
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            placeholder="beneficiary@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tempPassword">Temporary Password</Label>
                        <div className="relative">
                            <Input
                                id="tempPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={tempPassword}
                                onChange={(e) =>
                                    onTempPasswordChange(e.target.value)
                                }
                                placeholder="Min 8 characters"
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={onShowPasswordToggle}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                        {tempPassword.length > 0 && tempPassword.length < 8 && (
                            <p className="text-xs text-destructive">
                                Password must be at least 8 characters
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onSubmit}
                            disabled={
                                !selectedBeneficiaryId ||
                                !email ||
                                tempPassword.length < 8 ||
                                isPending
                            }
                        >
                            {isPending ? 'Creating...' : 'Create Account'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
