import { and, eq, gt, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getPublicDb, getSql, typedRows } from '@/db'
import { passwordResetToken } from '@/db/schema'
import { authServer } from '@/lib/auth/server'
import { logger } from '@/lib/logger'

const ResetPasswordSchema = z.object({
    token: z.string().regex(/^[0-9a-f]{64}$/, 'Invalid token format'),
    newPassword: z
        .string()
        .min(8, 'Password too short')
        .max(128, 'Password too long'),
})

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const parsed = ResetPasswordSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input' },
                { status: 400 },
            )
        }
        const { token, newPassword } = parsed.data

        const db = getPublicDb()
        const [row] = await db
            .select()
            .from(passwordResetToken)
            .where(
                and(
                    eq(passwordResetToken.token, token),
                    isNull(passwordResetToken.usedAt),
                    gt(passwordResetToken.expiresAt, new Date()),
                ),
            )
            .limit(1)

        if (!row) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 400 },
            )
        }

        // Direct SQL lookup avoids paginated listUsers scan
        const sql = getSql()
        const [user] = typedRows<{ id: string }>(
            await sql`
            SELECT id FROM neon_auth."user"
            WHERE lower(email) = ${row.email}
            LIMIT 1
        `,
        )

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 400 },
            )
        }

        await authServer.admin.setUserPassword({
            userId: user.id,
            newPassword,
        })

        // Revoke all existing sessions so stolen tokens are invalidated
        const { error: revokeError } =
            await authServer.admin.revokeUserSessions({
                userId: user.id,
            })
        if (revokeError) {
            // Log but don't fail -- password was already changed successfully
            const Sentry = await import('@sentry/nextjs')
            Sentry.captureException(
                new Error(`Session revocation failed for user ${user.id}`),
                { tags: { subsystem: 'session-revocation' } },
            )
        }

        // Mark token consumed so it can't be reused
        await db
            .update(passwordResetToken)
            .set({ usedAt: new Date() })
            .where(eq(passwordResetToken.id, row.id))

        return NextResponse.json({ success: true })
    } catch (err) {
        logger.auth.error('Password reset failed', {
            error: err instanceof Error ? err.message : 'Unknown error',
        })
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
