'use client'

import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    type AppRoleOption,
    type LinkableBeneficiary,
    type NeonAuthUser,
    ROLE_OPTIONS,
} from './types'

// Re-exported here for backwards compatibility with existing UsersClient imports.
export type { AppRoleOption } from './types'

type ChangeRoleDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedUser: NeonAuthUser | null
    newRole: AppRoleOption
    /** Picker state when promoting to beneficiary. null = preserve existing link (no change). */
    linkToBeneficiaryId: number | null
    /** Beneficiaries with no current portal account — eligible to attach to this user. */
    linkableBeneficiaries: LinkableBeneficiary[]
    isPending: boolean
    onRoleChange: (role: AppRoleOption) => void
    onLinkToBeneficiaryIdChange: (value: number | null) => void
    onSave: () => void
}

export function ChangeRoleDialog({
    open,
    onOpenChange,
    selectedUser,
    newRole,
    linkToBeneficiaryId,
    linkableBeneficiaries,
    isPending,
    onRoleChange,
    onLinkToBeneficiaryIdChange,
    onSave,
}: ChangeRoleDialogProps) {
    const displayName = selectedUser?.name || selectedUser?.email || 'this user'
    const isPromotingToBeneficiary =
        newRole === 'beneficiary' && selectedUser?.appRole !== 'beneficiary'
    const currentlyLinkedId =
        selectedUser?.appRole === 'beneficiary'
            ? (selectedUser.beneficiaryId ?? null)
            : null
    const showPicker = isPromotingToBeneficiary
    // Submit guard: if promoting to beneficiary and there's no existing link
    // AND no link is being chosen, the user would land in broken state — but
    // we don't outright disable since "no link" is occasionally what an
    // owner wants (placeholder profile they'll attach later).

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Change Role
                    </DialogTitle>
                    <DialogDescription>
                        Change role for {displayName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                            value={newRole}
                            onValueChange={(v) =>
                                onRoleChange(v as AppRoleOption)
                            }
                        >
                            <SelectTrigger>
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
                    {newRole !== 'beneficiary' &&
                        currentlyLinkedId !== null && (
                            <p className="text-xs text-muted-foreground">
                                The current beneficiary link will be cleared on
                                save (admin/trustee/arbiter users don't carry a
                                linked beneficiary record).
                            </p>
                        )}
                    {showPicker && (
                        <div className="space-y-2 rounded-md border p-3">
                            <Label className="text-sm">
                                Link to beneficiary record
                            </Label>
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
                                disabled={linkableBeneficiaries.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            linkableBeneficiaries.length === 0
                                                ? 'No unlinked beneficiaries available'
                                                : 'Choose a beneficiary (optional)'
                                        }
                                    />
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
                            <p className="text-xs text-muted-foreground">
                                Leave blank to skip linking — the user will be a
                                beneficiary with no record (you can attach one
                                later).
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={onSave} disabled={isPending}>
                            {isPending ? 'Updating...' : 'Update Role'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
