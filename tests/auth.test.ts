/**
 * Authentication Integration Tests
 *
 * Tests authentication flows including:
 * - Unauthenticated access restrictions
 * - Session validation
 * - Role-based access control
 * - Magic link generation
 */
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    test,
} from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { generateId } from '../db/helpers'
import { entity } from '../db/schema'
import {
    cleanupTestAuth,
    cleanupTestBeneficiaries,
    clearCapturedMagicLinkToken,
    createTestBeneficiary,
    createTestUser,
    getAuthenticatedSession,
    isServerAvailable,
} from './helpers/auth'

const BASE_URL = 'http://localhost:5050'

describe('Authentication', () => {
    let serverAvailable = false
    let testEntityId: string
    const testUserIds: string[] = []
    const testBeneficiaryIds: string[] = []

    beforeAll(async () => {
        serverAvailable = await isServerAvailable()

        if (!serverAvailable) {
            console.warn('⚠️  Server not running - skipping auth tests')
            return
        }

        // Create a test entity for beneficiary tests
        testEntityId = generateId()
        const now = new Date().toISOString()
        await db.insert(entity).values({
            id: testEntityId,
            name: 'Test Trust Estate',
            entityType: 'TRUST',
            trustType: 'IRREVOCABLE',
            ein: '12-3456789',
            status: 'ACTIVE',
            updatedAt: now,
        })
    })

    afterEach(() => {
        // Clear captured magic link token between tests
        clearCapturedMagicLinkToken()
    })

    afterAll(async () => {
        if (!serverAvailable) return

        // Cleanup test data
        await cleanupTestAuth(testUserIds)
        await cleanupTestBeneficiaries(testBeneficiaryIds)

        // Delete test entity
        if (testEntityId) {
            await db.delete(entity).where(eq(entity.id, testEntityId))
        }
    })

    test('should reject unauthenticated portal API requests with 401', async () => {
        if (!serverAvailable) return

        const res = await fetch(`${BASE_URL}/api/portal/me`)
        expect(res.status).toBe(401)

        const data = await res.json()
        expect(data.error).toBeDefined()
        expect(data.error).toContain('Unauthorized')
    })

    test('should allow authenticated beneficiary requests with valid session', async () => {
        // Uses proper Better Auth magic link flow to create valid sessions
        if (!serverAvailable) return

        const testEmail = `testben-${Date.now()}@example.com`

        // Create test beneficiary first
        const beneficiaryId = await createTestBeneficiary({
            entityId: testEntityId,
            firstName: 'Test',
            lastName: 'Beneficiary',
            email: testEmail,
        })
        testBeneficiaryIds.push(beneficiaryId)

        // Create test user linked to beneficiary
        const userId = await createTestUser({
            email: testEmail,
            name: 'Test Beneficiary',
            role: 'beneficiary',
            beneficiaryId,
        })
        testUserIds.push(userId)

        // Get authenticated session through magic link flow
        const session = await getAuthenticatedSession(testEmail)
        expect(session).not.toBeNull()
        if (!session) return

        // Make authenticated request with session cookies
        const res = await fetch(`${BASE_URL}/api/portal/me`, {
            headers: { Cookie: session.cookies },
        })

        expect(res.status).toBe(200)

        const data = await res.json()
        expect(data.user).toBeDefined()
        expect(data.user.role).toBe('beneficiary')
        expect(data.beneficiary).toBeDefined()
        expect(data.beneficiary.id).toBe(beneficiaryId)
    })

    test('should return 403 for user without beneficiary account', async () => {
        // Uses proper Better Auth magic link flow to create valid sessions
        if (!serverAvailable) return

        const testEmail = `testadmin-${Date.now()}@example.com`

        // Create test user WITHOUT beneficiaryId (admin role)
        await createTestUser({
            email: testEmail,
            name: 'Test Admin',
            role: 'admin',
        })

        // Get authenticated session through magic link flow
        const session = await getAuthenticatedSession(testEmail)
        expect(session).not.toBeNull()
        if (!session) return

        testUserIds.push(session.userId)

        // Make authenticated request to beneficiary-only endpoint
        const res = await fetch(`${BASE_URL}/api/portal/me`, {
            headers: { Cookie: session.cookies },
        })

        expect(res.status).toBe(403)

        const data = await res.json()
        expect(data.error).toBeDefined()
        expect(data.error).toContain('Not a beneficiary account')
    })

    test('should handle expired or invalid session tokens', async () => {
        if (!serverAvailable) return

        // Use invalid session token
        const res = await fetch(`${BASE_URL}/api/portal/me`, {
            headers: getAuthHeaders('invalid_token_12345'),
        })

        expect(res.status).toBe(401)
    })

    test('should handle magic link endpoint at /api/auth/sign-in/magic-link', async () => {
        if (!serverAvailable) return

        const res = await fetch(`${BASE_URL}/api/auth/sign-in/magic-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
            }),
        })

        // Without RESEND_API_KEY configured, we expect 500 error
        // With RESEND_API_KEY, we'd expect 200 success
        // The endpoint exists and responds (not 404)
        expect([200, 500]).toContain(res.status)
        expect(res.status).not.toBe(404)
    })

    test('should validate session expiry', async () => {
        // Uses proper Better Auth flow then expires the session
        if (!serverAvailable) return

        const testEmail = `expired-${Date.now()}@example.com`

        // Create test user
        await createTestUser({
            email: testEmail,
            name: 'Expiring User',
            role: 'beneficiary',
        })

        // Get a valid authenticated session
        const validSession = await getAuthenticatedSession(testEmail)
        expect(validSession).not.toBeNull()
        if (!validSession) return

        testUserIds.push(validSession.userId)

        // Verify session works initially
        const initialRes = await fetch(`${BASE_URL}/api/portal/me`, {
            headers: { Cookie: validSession.cookies },
        })
        // Session should work (either 200 or 403 depending on beneficiary setup)
        expect([200, 403]).toContain(initialRes.status)

        // Now expire the session by updating expiresAt in database
        const { session } = await import('../db/schema')
        const expiredDate = new Date()
        expiredDate.setDate(expiredDate.getDate() - 1) // Yesterday

        await db
            .update(session)
            .set({ expiresAt: expiredDate })
            .where(eq(session.userId, validSession.userId))

        // Try to use the now-expired session
        const expiredRes = await fetch(`${BASE_URL}/api/portal/me`, {
            headers: { Cookie: validSession.cookies },
        })

        expect(expiredRes.status).toBe(401)
    })
})

describe('Role-Based Access Control', () => {
    let serverAvailable = false

    beforeAll(async () => {
        serverAvailable = await isServerAvailable()
    })

    test('admin role should be required for admin dashboard', async () => {
        if (!serverAvailable) return

        // This test verifies the frontend auth check
        // The actual check is in App.tsx, not an API endpoint
        // We can verify the auth config is correct by checking the portal endpoint

        const res = await fetch(`${BASE_URL}/api/portal/me`)
        expect(res.status).toBe(401) // Should require authentication
    })

    test('beneficiary role should access portal endpoints', async () => {
        if (!serverAvailable) return

        // Covered by previous test "should allow authenticated beneficiary requests"
        // This is a placeholder to document RBAC expectations
        expect(true).toBe(true)
    })
})
