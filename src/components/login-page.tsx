'use client'

/**
 * Shared Login Page Component
 *
 * Configurable magic link authentication page used by both
 * admin login and beneficiary portal login.
 */

import type { LucideIcon } from 'lucide-react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient, useSession } from '@/lib/auth-client'

interface LoginPageProps {
    /** Page title displayed in card header */
    title: string
    /** Icon component displayed above title */
    icon: LucideIcon
    /** Where to redirect if already logged in */
    redirectPath: string
    /** Magic link callback URL path (e.g., "/dashboard") */
    callbackURL: string
    /** Email input placeholder text */
    emailPlaceholder?: string
    /** Description text below title */
    description?: string
}

export function LoginPage({
    title,
    icon: Icon,
    redirectPath,
    callbackURL,
    emailPlaceholder = 'your@email.com',
    description = 'Enter your email to receive a secure login link',
}: LoginPageProps) {
    const { data: session, isPending } = useSession()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [linkSent, setLinkSent] = useState(false)

    // Redirect if already authenticated
    useEffect(() => {
        if (!isPending && session?.user) {
            router.push(redirectPath)
        }
    }, [isPending, session, router, redirectPath])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const isDev = process.env.NODE_ENV !== 'production'
            const frontendURL = isDev
                ? 'http://localhost:3000'
                : window.location.origin

            const { error: magicLinkError } = await authClient.signIn.magicLink(
                {
                    email,
                    callbackURL: `${frontendURL}${callbackURL}`,
                },
            )

            if (magicLinkError) {
                setError(magicLinkError.message || 'Failed to send login link')
                return
            }

            setLinkSent(true)
        } catch (_err) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    // Show loading while checking session
    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (linkSent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-2xl">
                            Check Your Email
                        </CardTitle>
                        <CardDescription>
                            We sent a login link to <strong>{email}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-center text-sm text-muted-foreground">
                            Click the link in your email to sign in. The link
                            expires in 10 minutes.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setLinkSent(false)
                                setEmail('')
                            }}
                        >
                            Use a different email
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder={emailPlaceholder}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending link...
                                </>
                            ) : (
                                'Send Login Link'
                            )}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        No password needed. We'll email you a secure link to
                        sign in.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
