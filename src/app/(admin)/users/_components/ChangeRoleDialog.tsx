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
import type { NeonAuthUser } from './types'

type ChangeRoleDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedUser: NeonAuthUser | null
    newRole: 'admin' | 'user'
    isPending: boolean
    onRoleChange: (role: 'admin' | 'user') => void
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
                                onRoleChange(v as 'admin' | 'user')
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">
                                    User (Beneficiary)
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
