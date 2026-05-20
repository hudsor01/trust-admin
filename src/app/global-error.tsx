'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
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
        <html lang="en">
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center p-4">
                    <div className="max-w-md text-center">
                        <h1 className="text-4xl font-bold text-foreground mb-4">
                            Something went wrong
                        </h1>
                        <p className="text-muted-foreground mb-6">
                            An unexpected error occurred. The error has been
                            reported and we'll look into it.
                        </p>
                        {error.digest && (
                            <p className="text-sm text-muted-foreground mb-6 font-mono">
                                Error ID: {error.digest}
                            </p>
                        )}
                        <button
                            onClick={reset}
                            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
