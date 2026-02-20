'use client'

import { Pencil } from 'lucide-react'
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
import type { NeonAuthUser } from './types'

type EditUserDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedUser: NeonAuthUser | null
    editName: string
    editEmail: string
    isPending: boolean
    onNameChange: (value: string) => void
    onEmailChange: (value: string) => void
    onSave: () => void
}

export function EditUserDialog({
    open,
    onOpenChange,
    selectedUser,
    editName,
    editEmail,
    isPending,
    onNameChange,
    onEmailChange,
    onSave,
}: EditUserDialogProps) {
    const displayName = selectedUser?.name || selectedUser?.email || 'this user'
    const unchanged =
        editName === (selectedUser?.name ?? '') &&
        editEmail === selectedUser?.email

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5" />
                        Edit User
                    </DialogTitle>
                    <DialogDescription>
                        Update details for {displayName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="editName">Name</Label>
                        <Input
                            id="editName"
                            value={editName}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder="Full name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="editEmail">Email</Label>
                        <Input
                            id="editEmail"
                            type="email"
                            value={editEmail}
                            onChange={(e) => onEmailChange(e.target.value)}
                            placeholder="email@example.com"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onSave}
                            disabled={isPending || unchanged}
                        >
                            {isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
