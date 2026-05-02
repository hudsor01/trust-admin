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
import type { UserRoleEnum } from '@/db/schema'
import type { NeonAuthUser } from './types'

/** Roles assignable from the admin Users page (mirrors db UserRole enum). */
export type AppRoleOption = UserRoleEnum

type ChangeRoleDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedUser: NeonAuthUser | null
    newRole: AppRoleOption
    isPending: boolean
    onRoleChange: (role: AppRoleOption) => void
    onSave: () => void
}

export function ChangeRoleDialog({
    open,
    onOpenChange,
    selectedUser,
    newRole,
    isPending,
    onRoleChange,
    onSave,
}: ChangeRoleDialogProps) {
    const displayName = selectedUser?.name || selectedUser?.email || 'this user'

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
                                <SelectItem value="admin">
                                    Admin (full access)
                                </SelectItem>
                                <SelectItem value="trustee">
                                    Trustee (trust admin, no user mgmt)
                                </SelectItem>
                                <SelectItem value="arbiter">
                                    Arbiter (trust admin, no user mgmt)
                                </SelectItem>
                                <SelectItem value="beneficiary">
                                    Beneficiary (own info only)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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
