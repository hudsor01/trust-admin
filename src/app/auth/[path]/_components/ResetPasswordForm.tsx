'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token') ?? ''
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    if (!token) {
        return (
            <div className="space-y-4 text-center">
                <h2 className="text-2xl font-semibold">Invalid link</h2>
                <p className="text-muted-foreground text-sm">
                    This reset link is missing or invalid.
                </p>
                <Link
                    href="/auth/forgot-password"
                    className="text-sm underline"
                >
                    Request a new one
                </Link>
            </div>
        )
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (password !== confirm) {
            setError('Passwords do not match')
            return
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/auth/custom/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            })
            if (!res.ok) {
                const data = await res.json()
                setError(data.error ?? 'Invalid or expired link.')
                return
            }
            router.push('/auth/sign-in?reset=1')
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold">Reset password</h2>
                <p className="text-muted-foreground text-sm">
                    Enter your new password.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                        id="confirm"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Saving…' : 'Reset password'}
                </Button>
            </form>
        </div>
    )
}
