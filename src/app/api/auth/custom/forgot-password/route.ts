import { randomBytes } from 'node:crypto'
import * as Sentry from '@sentry/nextjs'
import { and, eq, isNull, lt } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getPublicDb, getSql } from '@/db'
import { passwordResetToken } from '@/db/schema'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const { email } = await request.json()
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email required' },
                { status: 400 },
            )
        }

        // Always return 200 regardless of email existence to prevent enumeration
        const sql = getSql()
        const rows = (await sql`
            SELECT id, name, email FROM neon_auth."user"
            WHERE lower(email) = lower(${email})
            LIMIT 1
        `) as unknown as { id: string; name: string; email: string }[]
        const [user] = rows

        if (user && env.N8N_PASSWORD_RESET_WEBHOOK_URL) {
            const token = randomBytes(32).toString('hex')
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

            const db = getPublicDb()

            // Invalidate any existing unexpired tokens for this email
            await db
                .update(passwordResetToken)
                .set({ usedAt: new Date() })
                .where(
                    and(
                        eq(passwordResetToken.email, email.toLowerCase()),
                        isNull(passwordResetToken.usedAt),
                    ),
                )

            // Clean up expired tokens older than 24 hours
            await db
                .delete(passwordResetToken)
                .where(
                    lt(
                        passwordResetToken.expiresAt,
                        new Date(Date.now() - 24 * 60 * 60 * 1000),
                    ),
                )

            await db.insert(passwordResetToken).values({
                token,
                email: email.toLowerCase(),
                expiresAt,
            })

            const appUrl =
                env.NEXT_PUBLIC_APP_URL ?? 'https://trust.thehudsonfam.com'
            const resetLink = `${appUrl}/auth/reset-password?token=${token}`

            const webhookRes = await fetch(env.N8N_PASSWORD_RESET_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    name: user.name ?? email,
                    resetLink,
                }),
            })

            if (!webhookRes.ok) {
                const body = await webhookRes.text().catch(() => '')
                const err = new Error(
                    `Password reset webhook failed: ${webhookRes.status} ${body}`,
                )
                Sentry.captureException(err, {
                    level: 'error',
                    tags: { subsystem: 'forgot-password' },
                    extra: { status: webhookRes.status },
                })
                logger.auth.error('Password reset webhook failed', {
                    status: webhookRes.status,
                    body,
                })
            }
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        logger.auth.error('Forgot password request failed', {
            error: err instanceof Error ? err.message : 'Unknown error',
        })
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
