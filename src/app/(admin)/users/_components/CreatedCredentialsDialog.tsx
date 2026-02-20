'use client'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

type CreatedCredentials = {
    email: string
    tempPassword: string
}

type CreatedCredentialsDialogProps = {
    credentials: CreatedCredentials | null
    onClose: () => void
}

export function CreatedCredentialsDialog({
    credentials,
    onClose,
}: CreatedCredentialsDialogProps) {
    return (
        <Dialog
            open={!!credentials}
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-success">
                        Account Created Successfully
                    </DialogTitle>
                    <DialogDescription>
                        Share these credentials with the beneficiary. The
                        temporary password will not be shown again.
                    </DialogDescription>
                </DialogHeader>
                {credentials && (
                    <div className="space-y-4">
                        <div className="rounded-md border bg-muted/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Email
                                    </p>
                                    <p className="mt-1 font-mono text-sm">
                                        {credentials.email}
                                    </p>
                                </div>
                                <CopyButton value={credentials.email} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Temporary Password
                                    </p>
                                    <p className="mt-1 font-mono text-sm">
                                        {credentials.tempPassword}
                                    </p>
                                </div>
                                <CopyButton value={credentials.tempPassword} />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Remind the beneficiary to change their password
                            after first login.
                        </p>
                        <div className="flex justify-end">
                            <Button onClick={onClose}>Done</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
