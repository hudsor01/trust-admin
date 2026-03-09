/** Idempotent E2E account provisioning (dev only). Inserts directly into neon_auth tables. */
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

/** Better Auth scrypt format: N=16384, r=16, p=1, dkLen=64. Output: hex(salt):hex(key). */
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

/** Upserts a neon_auth user; returns their ID. */
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
        // Fix emailVerified/role if stale from a prior run
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

export async function POST(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Require pre-shared secret to prevent unauthorized test account creation
    const secret = request.headers.get('x-e2e-secret')
    const expected = process.env.E2E_SETUP_SECRET
    if (!expected || !secret || secret !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getPublicDb()

    try {
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
            admin: { email: E2E_ADMIN_EMAIL },
            beneficiary: { email: E2E_BENEFICIARY_EMAIL },
        })
    } catch (err) {
        console.error('[e2e/setup]', err)
        return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
    }
}
