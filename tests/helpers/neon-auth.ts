/**
 * Neon Auth Test Utilities
 *
 * Helper functions for testing with the Neon Auth system.
 * Provides utilities for creating test users, sessions, and verifying auth state.
 *
 * Key differences from legacy Better Auth helpers:
 * - Users are in neon_auth.user schema (managed by Neon)
 * - Custom fields (role, beneficiaryId) are in public.user_profile
 * - Sessions use JWT tokens via pg_session_jwt extension
 */

import { eq } from 'drizzle-orm'
import { db, getClient } from '../../db'
import { beneficiary, entity, userProfile } from '../../db/schema'

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
    role: 'admin' | 'beneficiary'
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

/**
 * Check if Neon Auth extension is installed
 */
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

/**
 * Check if pg_session_jwt extension is installed
 */
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

/**
 * Check if auth.user_id() function exists
 */
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

/**
 * Check if auth.jwt_session_init() function exists
 */
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

/**
 * Get the count of users in neon_auth.user table
 */
export async function getNeonAuthUserCount(): Promise<number> {
    const client = getClient()
    try {
        const result =
            await client`SELECT COUNT(*)::int as count FROM neon_auth."user"`
        return result[0]?.count ?? 0
    } catch {
        return -1 // -1 indicates error (table may not exist)
    }
}

// =============================================================================
// TEST DATA CREATION
// =============================================================================

/**
 * Create a test entity (trust)
 */
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

/**
 * Create a test beneficiary
 */
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

/**
 * Create a test user profile (for existing Neon Auth user)
 * Note: In production, user_profile is auto-created by trigger.
 * This function creates profiles for test scenarios.
 */
export async function createTestUserProfile(options: {
    userId: string
    role: 'admin' | 'beneficiary'
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

/**
 * Get user profile by user ID
 */
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

/**
 * Delete a test user profile
 */
export async function deleteTestUserProfile(userId: string): Promise<void> {
    await db.delete(userProfile).where(eq(userProfile.userId, userId))
}

/**
 * Delete a test beneficiary
 */
export async function deleteTestBeneficiary(
    beneficiaryId: number,
): Promise<void> {
    await db.delete(beneficiary).where(eq(beneficiary.id, beneficiaryId))
}

/**
 * Delete a test entity
 */
export async function deleteTestEntity(entityId: number): Promise<void> {
    await db.delete(entity).where(eq(entity.id, entityId))
}

// =============================================================================
// AUTH STATE HELPERS
// =============================================================================

/**
 * Get current auth.user_id() from database
 */
export async function getCurrentAuthUserId(): Promise<string | null> {
    const client = getClient()
    try {
        const result = await client`SELECT auth.user_id() as user_id`
        return result[0]?.user_id ?? null
    } catch {
        return null
    }
}

/**
 * Check if current session has admin role (via app.is_admin())
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
    const client = getClient()
    try {
        const result = await client`SELECT app.is_admin() as is_admin`
        return result[0]?.is_admin === true
    } catch {
        return false
    }
}

/**
 * Get current user's beneficiary ID (via app.get_user_beneficiary_id())
 */
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

/**
 * Check if the Next.js server is available
 */
export async function isServerAvailable(): Promise<boolean> {
    try {
        // Check root endpoint - Next.js dev server should return 200
        const res = await fetch(BASE_URL, {
            signal: AbortSignal.timeout(3000),
        })
        return res.status < 500
    } catch {
        return false
    }
}

/**
 * Check if Neon Auth endpoints are available
 */
export async function isNeonAuthAvailable(): Promise<boolean> {
    try {
        // Try to access the auth sign-in page
        const res = await fetch(`${BASE_URL}/auth/sign-in`, {
            signal: AbortSignal.timeout(3000),
        })
        // 200 or redirect (302/307) indicates auth is configured
        return res.status < 500
    } catch {
        return false
    }
}
