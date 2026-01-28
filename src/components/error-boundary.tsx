/**
 * Error Boundary Component
 *
 * Wraps components to catch and handle React errors gracefully.
 * Integrates with Sentry for error reporting.
 *
 * @see https://github.com/bvaughn/react-error-boundary
 */
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

/**
 * Get error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === 'string') {
        return error
    }
    return 'An unexpected error occurred'
}

/**
 * Default fallback UI for error boundaries
 */
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
    /** Optional custom fallback component */
    fallback?: React.ComponentType<FallbackProps>
    /** Callback when error boundary resets */
    onReset?: () => void
    /** Custom title for the error UI */
    title?: string
    /** Custom description for the error UI */
    description?: string
}

/**
 * Application Error Boundary
 *
 * Catches JavaScript errors in child components and:
 * 1. Logs to Sentry with full context
 * 2. Displays a user-friendly error UI
 * 3. Provides reset functionality
 *
 * @example
 * ```tsx
 * <AppErrorBoundary>
 *   <MyComponent />
 * </AppErrorBoundary>
 * ```
 */
export function AppErrorBoundary({
    children,
    fallback: CustomFallback,
    onReset,
    title,
    description,
}: AppErrorBoundaryProps) {
    const handleError = (error: unknown, info: React.ErrorInfo) => {
        // Report to Sentry with component stack
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

/**
 * Lightweight error boundary for individual components
 * Shows a minimal error state without full card UI
 */
function MinimalFallback({ error, resetErrorBoundary }: FallbackProps) {
    const errorMessage = getErrorMessage(error)

    return (
        <div className="flex items-center gap-2 rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
            <span>Error: {errorMessage}</span>
            <Button size="sm" variant="ghost" onClick={resetErrorBoundary}>
                Retry
            </Button>
        </div>
    )
}

/**
 * Component-level error boundary
 *
 * For wrapping individual components that might fail
 * without taking down the entire page.
 */
export function ComponentErrorBoundary({
    children,
    onReset,
}: {
    children: React.ReactNode
    onReset?: () => void
}) {
    const handleError = (error: unknown, info: React.ErrorInfo) => {
        Sentry.captureException(error, {
            extra: {
                componentStack: info.componentStack,
            },
            tags: {
                errorBoundary: 'ComponentErrorBoundary',
            },
            level: 'warning', // Lower severity for component-level errors
        })
    }

    return (
        <ReactErrorBoundary
            FallbackComponent={MinimalFallback}
            onError={handleError}
            onReset={onReset}
        >
            {children}
        </ReactErrorBoundary>
    )
}
