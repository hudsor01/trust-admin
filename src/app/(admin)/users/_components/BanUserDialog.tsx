'use client'

import { Ban } from 'lucide-react'
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

type BanUserDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedUser: NeonAuthUser | null
    banReason: string
    isPending: boolean
    onBanReasonChange: (value: string) => void
    onBan: () => void
}

export function BanUserDialog({
    open,
    onOpenChange,
    selectedUser,
    banReason,
    isPending,
    onBanReasonChange,
    onBan,
}: BanUserDialogProps) {
    const displayName = selectedUser?.name || selectedUser?.email || 'this user'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Ban className="h-5 w-5" />
                        Ban User
                    </DialogTitle>
                    <DialogDescription>
                        Ban {displayName} from accessing the application.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="banReason">Reason (optional)</Label>
                        <Input
                            id="banReason"
                            value={banReason}
                            onChange={(e) => onBanReasonChange(e.target.value)}
                            placeholder="Reason for ban..."
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
                            variant="destructive"
                            onClick={onBan}
                            disabled={isPending}
                        >
                            {isPending ? 'Banning...' : 'Ban User'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
