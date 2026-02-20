'use client'

import { Eye, EyeOff, KeyRound } from 'lucide-react'
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

type ResetPasswordDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedUser: NeonAuthUser | null
    newPassword: string
    showNewPassword: boolean
    isPending: boolean
    onPasswordChange: (value: string) => void
    onShowPasswordToggle: () => void
    onSave: () => void
}

export function ResetPasswordDialog({
    open,
    onOpenChange,
    selectedUser,
    newPassword,
    showNewPassword,
    isPending,
    onPasswordChange,
    onShowPasswordToggle,
    onSave,
}: ResetPasswordDialogProps) {
    const displayName = selectedUser?.name || selectedUser?.email || 'this user'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5" />
                        Reset Password
                    </DialogTitle>
                    <DialogDescription>
                        Set a new password for {displayName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) =>
                                    onPasswordChange(e.target.value)
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
                                {showNewPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        </div>
                        {newPassword.length > 0 && newPassword.length < 8 && (
                            <p className="text-xs text-destructive">
                                Password must be at least 8 characters
                            </p>
                        )}
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
                            disabled={newPassword.length < 8 || isPending}
                        >
                            {isPending ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
