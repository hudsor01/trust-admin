import { and, eq, gt, isNull } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getPublicDb, getSql } from '@/db'
import { passwordResetToken } from '@/db/schema'
import { authServer } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const { token, newPassword } = await request.json()
        if (!token || !newPassword) {
            return NextResponse.json(
                { error: 'Token and password required' },
                { status: 400 },
            )
        }

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

        // Find the user by email directly — avoids paginated listUsers scan
        const sql = getSql()
        const [user] = (await sql`
            SELECT id FROM neon_auth."user"
            WHERE lower(email) = ${row.email}
            LIMIT 1
        `) as unknown as { id: string }[]

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 400 },
            )
        }

        // Set new password
        await authServer.admin.setUserPassword({ userId: user.id, newPassword })

        // Mark token used
        await db
            .update(passwordResetToken)
            .set({ usedAt: new Date() })
            .where(eq(passwordResetToken.id, row.id))

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[reset-password]', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
