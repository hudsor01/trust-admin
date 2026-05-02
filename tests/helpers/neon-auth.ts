/** Neon Auth test utilities — users in neon_auth.user, custom fields in public.user_profile, sessions via pg_session_jwt. */

import { eq } from 'drizzle-orm'
import { db, getClient } from '@/db'
import {
    beneficiary,
    entity,
    type UserRoleEnum,
    userProfile,
} from '@/db/schema'

// =============================================================================
// TYPES
// =============================================================================

export interface TestUser {
    id: string
    email: string
    name: string
}

export interface TestUserProfile {
    userId: string
    role: UserRoleEnum
    beneficiaryId: number | null
}

export interface TestBeneficiary {
    id: number
    entityId: number
    firstName: string
    lastName: string
    email: string
}

export interface TestEntity {
    id: number
    name: string
}

// =============================================================================
// DATABASE STATE CHECKS
// =============================================================================

export async function isNeonAuthInstalled(): Promise<boolean> {
    const client = getClient()
    try {
        const result = await client`
            SELECT 1 FROM information_schema.schemata WHERE schema_name = 'neon_auth'
        `
        return result.length > 0
    } catch {
        return false
    }
}

export async function isPgSessionJwtInstalled(): Promise<boolean> {
    const client = getClient()
    try {
        const result = await client`
            SELECT 1 FROM pg_extension WHERE extname = 'pg_session_jwt'
        `
        return result.length > 0
    } catch {
        return false
    }
}

export async function authUserIdFunctionExists(): Promise<boolean> {
    const client = getClient()
    try {
        const result = await client`
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'auth' AND routine_name = 'user_id'
        `
        return result.length > 0
    } catch {
        return false
    }
}

export async function authJwtSessionInitExists(): Promise<boolean> {
    const client = getClient()
    try {
        const result = await client`
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'auth' AND routine_name = 'jwt_session_init'
        `
        return result.length > 0
    } catch {
        return false
    }
}

export async function getNeonAuthUserCount(): Promise<number> {
    const client = getClient()
    try {
        const result =
            await client`SELECT COUNT(*)::int as count FROM neon_auth."user"`
        return result[0]?.count ?? 0
    } catch {
        return -1
    }
}

// =============================================================================
// TEST DATA CREATION
// =============================================================================

export async function createTestEntity(name?: string): Promise<TestEntity> {
    const now = new Date().toISOString()
    const [created] = await db
        .insert(entity)
        .values({
            name: name ?? `Test Trust ${Date.now()}`,
            entityType: 'TRUST',
            trustType: 'IRREVOCABLE',
            ein: `99-${Math.floor(Math.random() * 10000000)
                .toString()
                .padStart(7, '0')}`,
            status: 'ACTIVE',
            updatedAt: now,
        })
        .returning()

    return { id: created.id, name: created.name }
}

export async function createTestBeneficiary(options: {
    entityId: number
    firstName?: string
    lastName?: string
    email?: string
}): Promise<TestBeneficiary> {
    const timestamp = Date.now()
    const now = new Date().toISOString()
    const [created] = await db
        .insert(beneficiary)
        .values({
            entityId: options.entityId,
            firstName: options.firstName ?? 'Test',
            lastName: options.lastName ?? `Beneficiary ${timestamp}`,
            email: options.email ?? `test-ben-${timestamp}@example.com`,
            relationship: 'CHILD',
            sharePercent: '10.00',
            updatedAt: now,
        })
        .returning()

    return {
        id: created.id,
        entityId: created.entityId,
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email!,
    }
}

/** In production user_profile is auto-created by trigger; this creates profiles directly for tests. */
export async function createTestUserProfile(options: {
    userId: string
    role: UserRoleEnum
    beneficiaryId?: number | null
}): Promise<TestUserProfile> {
    const [created] = await db
        .insert(userProfile)
        .values({
            userId: options.userId,
            role: options.role,
            beneficiaryId: options.beneficiaryId ?? null,
        })
        .returning()

    return {
        userId: created.userId,
        role: created.role,
        beneficiaryId: created.beneficiaryId,
    }
}

export async function getUserProfile(
    userId: string,
): Promise<TestUserProfile | null> {
    const [profile] = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .limit(1)

    if (!profile) return null

    return {
        userId: profile.userId,
        role: profile.role,
        beneficiaryId: profile.beneficiaryId,
    }
}

// =============================================================================
// TEST DATA CLEANUP
// =============================================================================

export async function deleteTestUserProfile(userId: string): Promise<void> {
    await db.delete(userProfile).where(eq(userProfile.userId, userId))
}

export async function deleteTestBeneficiary(
    beneficiaryId: number,
): Promise<void> {
    await db.delete(beneficiary).where(eq(beneficiary.id, beneficiaryId))
}

export async function deleteTestEntity(entityId: number): Promise<void> {
    await db.delete(entity).where(eq(entity.id, entityId))
}

// =============================================================================
// AUTH STATE HELPERS
// =============================================================================

export async function getCurrentAuthUserId(): Promise<string | null> {
    const client = getClient()
    try {
        const result = await client`SELECT auth.user_id() as user_id`
        return result[0]?.user_id ?? null
    } catch {
        return null
    }
}

export async function isCurrentUserAdmin(): Promise<boolean> {
    const client = getClient()
    try {
        const result = await client`SELECT app.is_admin() as is_admin`
        return result[0]?.is_admin === true
    } catch {
        return false
    }
}

export async function getCurrentUserBeneficiaryId(): Promise<number | null> {
    const client = getClient()
    try {
        const result =
            await client`SELECT app.get_user_beneficiary_id() as beneficiary_id`
        return result[0]?.beneficiary_id ?? null
    } catch {
        return null
    }
}

// =============================================================================
// SERVER AVAILABILITY
// =============================================================================

const BASE_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

export async function isServerAvailable(): Promise<boolean> {
    try {
        const res = await fetch(BASE_URL, {
            signal: AbortSignal.timeout(3000),
        })
        return res.status < 500
    } catch {
        return false
    }
}

export async function isNeonAuthAvailable(): Promise<boolean> {
    try {
        const res = await fetch(`${BASE_URL}/auth/sign-in`, {
            signal: AbortSignal.timeout(3000),
        })
        return res.status < 500
    } catch {
        return false
    }
}
