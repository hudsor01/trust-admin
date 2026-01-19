'use client'

import { KeyRound, Loader2 } from 'lucide-react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { verifyAccessCode } from '../../_actions/verifyAccess'

export function AccessGate() {
    const [state, formAction, isPending] = useActionState(verifyAccessCode, {
        success: false,
    })

    // If access granted, reload to show the form
    if (state.success) {
        if (typeof window !== 'undefined') {
            window.location.reload()
        }
        return null
    }

    return (
        <div className="py-8">
            <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Enter Access Code</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="accessCode">Access Code</Label>
                            <Input
                                id="accessCode"
                                name="accessCode"
                                type="text"
                                placeholder="Enter the family access code"
                                autoComplete="off"
                                autoFocus
                            />
                            {state.error && (
                                <p className="text-sm text-destructive">
                                    {state.error}
                                </p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Continue'
                            )}
                        </Button>
                    </form>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                        Contact the trustee if you need the access code.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
