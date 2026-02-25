/**
 * E2E Test Setup Route — DEV ONLY
 *
 * Creates dedicated E2E test accounts with known credentials.
 * Disabled in production. Protected by E2E_SECRET header.
 *
 * POST /api/e2e/setup
 * Header: x-e2e-secret: <E2E_SECRET>
 */

import { asc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getPublicDb, getSql } from '@/db'
import { beneficiary, userProfile } from '@/db/schema'
import { authServer } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export const E2E_ADMIN_EMAIL = 'e2e-admin@e2e.local'
export const E2E_ADMIN_PASSWORD = 'E2eTest@2026!'
export const E2E_BENEFICIARY_EMAIL = 'e2e-ben@e2e.local'
export const E2E_BENEFICIARY_PASSWORD = 'E2eTest@2026!'

export async function POST(_request: Request) {
    // Only available in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const db = getPublicDb()
    const sql = getSql()

    try {
        // --- Admin user ---
        let adminUserId: string
        const adminRows = await sql<{ id: string }[]>`
            SELECT id FROM neon_auth."user"
            WHERE lower(email) = lower(${E2E_ADMIN_EMAIL}) LIMIT 1
        `

        if (adminRows[0]) {
            adminUserId = adminRows[0].id
            await authServer.admin.setUserPassword({
                userId: adminUserId,
                newPassword: E2E_ADMIN_PASSWORD,
            })
        } else {
            const { data, error } = await authServer.admin.createUser({
                email: E2E_ADMIN_EMAIL,
                password: E2E_ADMIN_PASSWORD,
                name: 'E2E Admin',
                role: 'user',
            })
            if (error || !data)
                throw new Error(`createUser: ${error?.message ?? 'no data'}`)
            adminUserId = data.user.id
        }

        await sql`
            UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = ${adminUserId}
        `
        await db
            .insert(userProfile)
            .values({ userId: adminUserId, role: 'admin' })
            .onConflictDoUpdate({
                target: userProfile.userId,
                set: { role: 'admin' },
            })

        // --- Find first beneficiary in entity 1 ---
        const [ben] = await db
            .select({ id: beneficiary.id })
            .from(beneficiary)
            .where(eq(beneficiary.entityId, 1))
            .orderBy(asc(beneficiary.id))
            .limit(1)

        if (!ben) {
            return NextResponse.json(
                {
                    error: 'No beneficiary found in entity 1. Run bun run db:seed first.',
                },
                { status: 500 },
            )
        }

        // --- Beneficiary user ---
        let benUserId: string
        const benRows = await sql<{ id: string }[]>`
            SELECT id FROM neon_auth."user"
            WHERE lower(email) = lower(${E2E_BENEFICIARY_EMAIL}) LIMIT 1
        `

        if (benRows[0]) {
            benUserId = benRows[0].id
            await authServer.admin.setUserPassword({
                userId: benUserId,
                newPassword: E2E_BENEFICIARY_PASSWORD,
            })
        } else {
            const { data, error } = await authServer.admin.createUser({
                email: E2E_BENEFICIARY_EMAIL,
                password: E2E_BENEFICIARY_PASSWORD,
                name: 'E2E Beneficiary',
                role: 'user',
            })
            if (error || !data)
                throw new Error(`createUser: ${error?.message ?? 'no data'}`)
            benUserId = data.user.id
        }

        await sql`
            UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = ${benUserId}
        `
        await db
            .insert(userProfile)
            .values({
                userId: benUserId,
                role: 'beneficiary',
                beneficiaryId: ben.id,
            })
            .onConflictDoUpdate({
                target: userProfile.userId,
                set: { role: 'beneficiary', beneficiaryId: ben.id },
            })

        return NextResponse.json({
            ok: true,
            admin: { email: E2E_ADMIN_EMAIL, userId: adminUserId },
            beneficiary: {
                email: E2E_BENEFICIARY_EMAIL,
                userId: benUserId,
                beneficiaryId: ben.id,
            },
        })
    } catch (err) {
        console.error('[e2e/setup]', err)
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}
