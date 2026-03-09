'use client'

import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle>Something went wrong</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center text-muted-foreground">
                        An error occurred while loading this page. The error has
                        been reported and we'll look into it.
                    </p>
                    {error.digest && (
                        <p className="text-center text-xs text-muted-foreground font-mono">
                            Error ID: {error.digest}
                        </p>
                    )}
                    <div className="flex justify-center">
                        <Button onClick={reset}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
