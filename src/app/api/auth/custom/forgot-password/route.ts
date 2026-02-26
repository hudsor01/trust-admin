import { randomBytes } from 'node:crypto'
import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { getPublicDb, getSql } from '@/db'
import { passwordResetToken } from '@/db/schema'
import { env } from '@/lib/env'

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

        // Look up user directly by email — always return 200 to avoid email enumeration
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
                console.error(
                    '[forgot-password] webhook error:',
                    webhookRes.status,
                    body,
                )
            }
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[forgot-password]', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
