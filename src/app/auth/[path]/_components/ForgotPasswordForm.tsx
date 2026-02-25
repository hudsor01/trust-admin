'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordForm() {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/auth/custom/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            if (!res.ok) throw new Error('Request failed')
            setSubmitted(true)
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="space-y-4 text-center">
                <h2 className="text-2xl font-semibold">Check your email</h2>
                <p className="text-muted-foreground text-sm">
                    If an account exists for {email}, we sent a password reset
                    link. Check your inbox.
                </p>
                <Link href="/auth/sign-in" className="text-sm underline">
                    Back to sign in
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold">Forgot password</h2>
                <p className="text-muted-foreground text-sm">
                    Enter your email and we&apos;ll send a reset link.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending…' : 'Send reset link'}
                </Button>
            </form>
            <p className="text-center text-sm">
                <Link href="/auth/sign-in" className="underline">
                    Back to sign in
                </Link>
            </p>
        </div>
    )
}
