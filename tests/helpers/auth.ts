/**
 * Authentication Test Utilities
 *
 * Helper functions for creating test users, sessions, and authentication headers.
 *
 * Key pattern: Use `getAuthenticatedSession()` to get valid Better Auth sessions
 * by going through the magic link flow programmatically.
 */

import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { generateId } from '../../db/helpers'
import { beneficiary, session, user } from '../../db/schema'

const BASE_URL = 'http://localhost:5050'

// =============================================================================
// MAGIC LINK TOKEN CAPTURE (for testing)
// =============================================================================
// In test mode, auth.ts calls captureMagicLinkToken() when generating tokens.
// Tests can then retrieve the token and verify it to get valid session cookies.
// =============================================================================

let capturedMagicLinkToken: string | null = null
let capturedMagicLinkEmail: string | null = null

/**
 * Called by auth.ts in test mode to capture the magic link token
 */
export function captureMagicLinkToken(email: string, token: string): void {
    capturedMagicLinkEmail = email
    capturedMagicLinkToken = token
}

/**
 * Get the last captured magic link token (for tests)
 */
export function getCapturedMagicLinkToken(): {
    email: string
    token: string
} | null {
    if (!capturedMagicLinkToken || !capturedMagicLinkEmail) {
        return null
    }
    return { email: capturedMagicLinkEmail, token: capturedMagicLinkToken }
}

/**
 * Clear captured token (call in afterEach/afterAll)
 */
export function clearCapturedMagicLinkToken(): void {
    capturedMagicLinkToken = null
    capturedMagicLinkEmail = null
}

/**
 * Get a valid authenticated session by going through the magic link flow.
 *
 * This is the proper way to test authenticated endpoints with Better Auth.
 * It requests a magic link, captures the token, verifies it, and returns
 * the session cookies.
 *
 * @returns Session cookies string for use in request headers
 */
export async function getAuthenticatedSession(email: string): Promise<{
    cookies: string
    userId: string
} | null> {
    // Import auth here to avoid circular dependencies
    const { auth } = await import('../../src/lib/auth')

    // Clear any previous token
    clearCapturedMagicLinkToken()

    // Create mock headers for the API calls
    const mockHeaders = new Headers({
        'Content-Type': 'application/json',
        'User-Agent': 'test-runner',
    })

    try {
        // 1. Request magic link - this triggers sendMagicLink which captures the token
        await auth.api.signInMagicLink({
            body: { email },
            headers: mockHeaders,
        })

        // 2. Get the captured token
        const captured = getCapturedMagicLinkToken()
        if (!captured) {
            console.error('No magic link token captured - is NODE_ENV=test?')
            return null
        }

        // 3. Verify the token to create a session
        const response = await auth.api.magicLinkVerify({
            query: { token: captured.token },
            headers: mockHeaders,
            returnHeaders: true,
        })

        // 4. Extract cookies from response headers
        const setCookie = response.headers?.get('set-cookie')
        if (!setCookie) {
            console.error('No Set-Cookie header in magic link verify response')
            return null
        }

        // 5. Get the user ID from the session
        const sessionData = response.response as { user?: { id: string } }
        const userId = sessionData?.user?.id

        if (!userId) {
            console.error('No user ID in session response')
            return null
        }

        return { cookies: setCookie, userId }
    } catch (error) {
        console.error('Failed to get authenticated session:', error)
        return null
    }
}

/**
 * Create a test user in the database
 */
export async function createTestUser(options: {
    email: string
    name: string
    role: 'admin' | 'beneficiary'
    beneficiaryId?: string
}) {
    const userId = generateId()

    await db.insert(user).values({
        id: userId,
        email: options.email,
        name: options.name,
        role: options.role,
        beneficiaryId: options.beneficiaryId || null,
        emailVerified: true,
        // createdAt and updatedAt have defaults
    })

    return userId
}

/**
 * Create a test session for a user
 */
export async function createTestSession(userId: string) {
    const sessionId = generateId()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    await db.insert(session).values({
        id: sessionId,
        userId,
        token: `test_session_${sessionId}`,
        expiresAt,
        // createdAt and updatedAt have defaults
    })

    return sessionId
}

/**
 * Create a test beneficiary in the database
 */
export async function createTestBeneficiary(options: {
    entityId: string
    firstName: string
    lastName: string
    email: string
}) {
    const beneficiaryId = generateId()
    const now = new Date().toISOString()

    await db.insert(beneficiary).values({
        id: beneficiaryId,
        entityId: options.entityId,
        firstName: options.firstName,
        lastName: options.lastName,
        email: options.email,
        relationship: 'CHILD',
        sharePercent: '0.25',
        updatedAt: now,
        // createdAt has default
    })

    return beneficiaryId
}

/**
 * Get authentication headers for a session
 */
export function getAuthHeaders(sessionToken: string) {
    return {
        Cookie: `better-auth.session_token=${sessionToken}`,
    }
}

/**
 * Clean up test users and sessions
 */
export async function cleanupTestAuth(userIds: string[]) {
    if (userIds.length === 0) return

    // Delete sessions first (FK constraint)
    for (const userId of userIds) {
        await db.delete(session).where(eq(session.userId, userId))
    }

    // Delete users
    for (const userId of userIds) {
        await db.delete(user).where(eq(user.id, userId))
    }
}

/**
 * Clean up test beneficiaries
 */
export async function cleanupTestBeneficiaries(beneficiaryIds: string[]) {
    if (beneficiaryIds.length === 0) return

    for (const beneficiaryId of beneficiaryIds) {
        await db.delete(beneficiary).where(eq(beneficiary.id, beneficiaryId))
    }
}

/**
 * Check if server is available
 */
export async function isServerAvailable(): Promise<boolean> {
    try {
        const res = await fetch(`${BASE_URL}/health`, {
            signal: AbortSignal.timeout(2000),
        })
        return res.ok
    } catch {
        return false
    }
}
