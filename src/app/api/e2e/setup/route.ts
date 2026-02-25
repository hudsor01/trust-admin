/**
 * E2E Test Setup Route — DEV ONLY
 *
 * Creates dedicated E2E test accounts with known credentials.
 * Inserts directly into neon_auth.user + neon_auth.account tables
 * using the same scrypt password hash format as Better Auth.
 * Idempotent: safe to call on every test run.
 * Disabled in production.
 *
 * POST /api/e2e/setup
 */

import { randomBytes, scryptSync } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getPublicDb, getSql } from '@/db'
import { beneficiary, userProfile } from '@/db/schema'

export const dynamic = 'force-dynamic'

export const E2E_ADMIN_EMAIL = 'e2e-admin@e2e.local'
export const E2E_ADMIN_PASSWORD = 'E2eTest@2026!'
export const E2E_BENEFICIARY_EMAIL = 'e2e-ben@e2e.local'
export const E2E_BENEFICIARY_PASSWORD = 'E2eTest@2026!'

/**
 * Hash a password using Better Auth's exact scrypt format.
 * Matches better-auth/dist/crypto-*.mjs: N=16384, r=16, p=1, dkLen=64
 * Format: hex(salt) + ':' + hex(derivedKey)
 * Salt: hex-encoded 16 random bytes (the hex string IS the salt input to scrypt)
 */
function hashPassword(password: string): string {
    const saltBytes = randomBytes(16)
    const salt = saltBytes.toString('hex') // 32-char hex string
    const key = scryptSync(password.normalize('NFKC'), salt, 64, {
        N: 16384,
        r: 16,
        p: 1,
        maxmem: 128 * 16384 * 16 * 2,
    })
    return `${salt}:${key.toString('hex')}`
}

/**
 * Ensure a user exists in neon_auth. Creates them if missing.
 * Returns the user ID.
 */
async function ensureAuthUser(
    email: string,
    password: string,
    name: string,
    role?: string,
): Promise<string> {
    const sql = getSql()

    const existing = (await sql`
        SELECT id FROM neon_auth."user"
        WHERE lower(email) = lower(${email}) LIMIT 1
    `) as unknown as { id: string }[]

    if (existing[0]) {
        // Update emailVerified and role in case they were wrong
        await sql`
            UPDATE neon_auth."user"
            SET "emailVerified" = true, role = ${role ?? null}
            WHERE id = ${existing[0].id}
        `
        return existing[0].id
    }

    const userId = crypto.randomUUID()
    const now = new Date()
    const passwordHash = hashPassword(password)

    await sql`
        INSERT INTO neon_auth."user" (id, name, email, "emailVerified", image, role, "createdAt", "updatedAt")
        VALUES (${userId}, ${name}, ${email}, ${true}, ${null as unknown as string}, ${role ?? null}, ${now}, ${now})
    `

    await sql`
        INSERT INTO neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        VALUES (
            ${crypto.randomUUID()},
            ${userId},
            ${'credential'},
            ${userId},
            ${passwordHash},
            ${now},
            ${now}
        )
    `

    return userId
}

export async function POST(_request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const db = getPublicDb()

    try {
        // --- Admin user ---
        const adminUserId = await ensureAuthUser(
            E2E_ADMIN_EMAIL,
            E2E_ADMIN_PASSWORD,
            'E2E Admin',
            'admin',
        )

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
        const benUserId = await ensureAuthUser(
            E2E_BENEFICIARY_EMAIL,
            E2E_BENEFICIARY_PASSWORD,
            'E2E Beneficiary',
        )

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
