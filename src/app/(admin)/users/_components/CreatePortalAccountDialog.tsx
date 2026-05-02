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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    type AppRoleOption,
    type LinkableBeneficiary,
    ROLE_OPTIONS,
} from './types'

// Re-exported for callers that previously imported LinkableBeneficiary from this module.
export type { LinkableBeneficiary } from './types'

type CreatePortalAccountDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    firstName: string
    lastName: string
    email: string
    tempPassword: string
    showPassword: boolean
    role: AppRoleOption
    /** beneficiary mode toggle: 'create' inserts a new beneficiary row; 'link' attaches to an existing one */
    beneficiaryMode: 'create' | 'link'
    linkToBeneficiaryId: number | null
    /** Beneficiaries with no current portal account — eligible to attach. */
    linkableBeneficiaries: LinkableBeneficiary[]
    isPending: boolean
    onFirstNameChange: (value: string) => void
    onLastNameChange: (value: string) => void
    onEmailChange: (value: string) => void
    onTempPasswordChange: (value: string) => void
    onShowPasswordToggle: () => void
    onRoleChange: (value: AppRoleOption) => void
    onBeneficiaryModeChange: (value: 'create' | 'link') => void
    onLinkToBeneficiaryIdChange: (value: number | null) => void
    onSubmit: () => void
}

export function CreatePortalAccountDialog({
    open,
    onOpenChange,
    firstName,
    lastName,
    email,
    tempPassword,
    showPassword,
    role,
    beneficiaryMode,
    linkToBeneficiaryId,
    linkableBeneficiaries,
    isPending,
    onFirstNameChange,
    onLastNameChange,
    onEmailChange,
    onTempPasswordChange,
    onShowPasswordToggle,
    onRoleChange,
    onBeneficiaryModeChange,
    onLinkToBeneficiaryIdChange,
    onSubmit,
}: CreatePortalAccountDialogProps) {
    const isBeneficiary = role === 'beneficiary'
    const linkRequiresSelection =
        isBeneficiary && beneficiaryMode === 'link' && !linkToBeneficiaryId
    const submitDisabled =
        !firstName.trim() ||
        !lastName.trim() ||
        !email ||
        tempPassword.length < 8 ||
        linkRequiresSelection ||
        isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Create Portal Account
                    </DialogTitle>
                    <DialogDescription>
                        Create a new user account with portal access.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={firstName}
                                onChange={(e) =>
                                    onFirstNameChange(e.target.value)
                                }
                                placeholder="First name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={lastName}
                                onChange={(e) =>
                                    onLastNameChange(e.target.value)
                                }
                                placeholder="Last name"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            placeholder="user@example.com"
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
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                            value={role}
                            onValueChange={(v) =>
                                onRoleChange(v as AppRoleOption)
                            }
                        >
                            <SelectTrigger id="role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLE_OPTIONS.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {isBeneficiary && (
                        <div className="space-y-3 rounded-md border p-3">
                            <Label className="text-sm">
                                Beneficiary record
                            </Label>
                            <Tabs
                                value={beneficiaryMode}
                                onValueChange={(v) =>
                                    onBeneficiaryModeChange(
                                        v as 'create' | 'link',
                                    )
                                }
                            >
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="create">
                                        Create new
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="link"
                                        disabled={
                                            linkableBeneficiaries.length === 0
                                        }
                                    >
                                        Link existing
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            {beneficiaryMode === 'link' && (
                                <Select
                                    value={
                                        linkToBeneficiaryId
                                            ? String(linkToBeneficiaryId)
                                            : ''
                                    }
                                    onValueChange={(v) =>
                                        onLinkToBeneficiaryIdChange(
                                            v ? Number(v) : null,
                                        )
                                    }
                                    disabled={
                                        linkableBeneficiaries.length === 0
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose an unlinked beneficiary" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {linkableBeneficiaries.map((b) => (
                                            <SelectItem
                                                key={b.id}
                                                value={String(b.id)}
                                            >
                                                {b.firstName} {b.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {linkableBeneficiaries.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    No unlinked beneficiaries — pick "create
                                    new" or add a beneficiary record from the
                                    Beneficiaries page first.
                                </p>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={onSubmit} disabled={submitDisabled}>
                            {isPending ? 'Creating...' : 'Create Account'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
