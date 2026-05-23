/** Error boundaries with Sentry integration. */
'use client'

import * as Sentry from '@sentry/nextjs'
import type { FallbackProps } from 'react-error-boundary'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { Button } from './ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card'

interface ErrorFallbackProps extends FallbackProps {
    title?: string
    description?: string
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === 'string') {
        return error
    }
    return 'An unexpected error occurred'
}

function ErrorFallback({
    error,
    resetErrorBoundary,
    title = 'Something went wrong',
    description = "An unexpected error occurred. The error has been reported and we'll look into it.",
}: ErrorFallbackProps) {
    const errorMessage = getErrorMessage(error)

    return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
            <Card className="max-w-lg">
                <CardHeader>
                    <CardTitle className="text-destructive">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <details className="rounded border p-3 text-sm">
                        <summary className="cursor-pointer font-medium">
                            Technical Details
                        </summary>
                        <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                            {errorMessage}
                        </pre>
                    </details>
                    <div className="flex gap-2">
                        <Button onClick={resetErrorBoundary}>Try Again</Button>
                        <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

interface AppErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ComponentType<FallbackProps>
    onReset?: () => void
    title?: string
    description?: string
}

/** Page-level error boundary: reports to Sentry and shows a full-card error UI with retry. */
export function AppErrorBoundary({
    children,
    fallback: CustomFallback,
    onReset,
    title,
    description,
}: AppErrorBoundaryProps) {
    const handleError = (error: unknown, info: React.ErrorInfo) => {
        Sentry.captureException(error, {
            extra: {
                componentStack: info.componentStack,
            },
            tags: {
                errorBoundary: 'AppErrorBoundary',
            },
        })
    }

    const handleReset = () => {
        onReset?.()
    }

    const FallbackComponent =
        CustomFallback ??
        ((props: FallbackProps) => (
            <ErrorFallback {...props} title={title} description={description} />
        ))

    return (
        <ReactErrorBoundary
            FallbackComponent={FallbackComponent}
            onError={handleError}
            onReset={handleReset}
        >
            {children}
        </ReactErrorBoundary>
    )
}
