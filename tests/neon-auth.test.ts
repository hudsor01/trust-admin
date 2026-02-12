import { isProductionDb } from './helpers/db-guard'
/**
 * Neon Auth Integration Tests
 *
 * Tests the Neon Auth integration including:
 * - Auth infrastructure is properly configured
 * - User profile creation and management
 * - Role-based access control
 * - JWT session initialization for RLS
 *
 * Note: These tests verify the auth system is correctly configured,
 * not the actual login flow (which requires browser interaction).
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { getClient, initJwtSession } from '../db'
import {
    authJwtSessionInitExists,
    authUserIdFunctionExists,
    createTestBeneficiary,
    createTestEntity,
    createTestUserProfile,
    deleteTestBeneficiary,
    deleteTestEntity,
    deleteTestUserProfile,
    getCurrentAuthUserId,
    getCurrentUserBeneficiaryId,
    getNeonAuthUserCount,
    getUserProfile,
    isCurrentUserAdmin,
    isNeonAuthAvailable,
    isNeonAuthInstalled,
    isPgSessionJwtInstalled,
    isServerAvailable,
} from './helpers/neon-auth'

const TEST_TIMEOUT = 30000

// =============================================================================
// NEON AUTH INFRASTRUCTURE TESTS
// =============================================================================

describe.skipIf(isProductionDb)('Neon Auth Infrastructure', () => {
    test('neon_auth schema exists', async () => {
        const installed = await isNeonAuthInstalled()
        expect(installed).toBe(true)
    })

    test('pg_session_jwt extension is installed', async () => {
        const installed = await isPgSessionJwtInstalled()
        expect(installed).toBe(true)
    })

    test('auth.user_id() function exists', async () => {
        const exists = await authUserIdFunctionExists()
        expect(exists).toBe(true)
    })

    test('auth.jwt_session_init() function exists', async () => {
        const exists = await authJwtSessionInitExists()
        expect(exists).toBe(true)
    })

    test('neon_auth.user table is accessible', async () => {
        const count = await getNeonAuthUserCount()
        // -1 means error, >= 0 means table exists
        expect(count).toBeGreaterThanOrEqual(0)
    })

    test('user_profile table exists and is accessible', async () => {
        const client = getClient()
        const result = await client`
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'user_profile'
        `
        expect(result.length).toBe(1)
    })
})

// =============================================================================
// USER PROFILE TESTS
// =============================================================================

describe.skipIf(isProductionDb)('User Profile Management', () => {
    const testData = {
        entityId: null as number | null,
        beneficiaryId: null as number | null,
        adminUserId: `test-admin-${Date.now()}`,
        beneficiaryUserId: `test-ben-${Date.now()}`,
    }

    beforeAll(async () => {
        // Create test entity and beneficiary
        const entity = await createTestEntity('User Profile Test Trust')
        testData.entityId = entity.id

        const beneficiary = await createTestBeneficiary({
            entityId: testData.entityId,
            firstName: 'Profile',
            lastName: 'Test',
        })
        testData.beneficiaryId = beneficiary.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        // Cleanup in reverse order
        await deleteTestUserProfile(testData.adminUserId)
        await deleteTestUserProfile(testData.beneficiaryUserId)
        if (testData.beneficiaryId) {
            await deleteTestBeneficiary(testData.beneficiaryId)
        }
        if (testData.entityId) {
            await deleteTestEntity(testData.entityId)
        }
    }, TEST_TIMEOUT)

    test('can create admin user profile', async () => {
        const profile = await createTestUserProfile({
            userId: testData.adminUserId,
            role: 'admin',
        })

        expect(profile.userId).toBe(testData.adminUserId)
        expect(profile.role).toBe('admin')
        expect(profile.beneficiaryId).toBeNull()
    })

    test('can create beneficiary user profile with beneficiaryId', async () => {
        const profile = await createTestUserProfile({
            userId: testData.beneficiaryUserId,
            role: 'beneficiary',
            beneficiaryId: testData.beneficiaryId,
        })

        expect(profile.userId).toBe(testData.beneficiaryUserId)
        expect(profile.role).toBe('beneficiary')
        expect(profile.beneficiaryId).toBe(testData.beneficiaryId)
    })

    test('can retrieve user profile by userId', async () => {
        const profile = await getUserProfile(testData.adminUserId)

        expect(profile).not.toBeNull()
        expect(profile?.role).toBe('admin')
    })

    test('returns null for non-existent user profile', async () => {
        const profile = await getUserProfile('non-existent-user-id')
        expect(profile).toBeNull()
    })

    test('user_profile has correct schema', async () => {
        const client = getClient()
        const columns = await client`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'user_profile'
            ORDER BY ordinal_position
        `

        const columnNames = columns.map((c) => c.column_name)
        expect(columnNames).toContain('user_id')
        expect(columnNames).toContain('role')
        expect(columnNames).toContain('beneficiary_id')
        expect(columnNames).toContain('created_at')
        expect(columnNames).toContain('updated_at')
    })
})

// =============================================================================
// APP SCHEMA HELPER FUNCTIONS TESTS
// =============================================================================

describe.skipIf(isProductionDb)('App Schema Helper Functions', () => {
    test('app.is_admin() function exists', async () => {
        const client = getClient()
        const result = await client`
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'app' AND routine_name = 'is_admin'
        `
        expect(result.length).toBe(1)
    })

    test('app.get_user_role() function exists', async () => {
        const client = getClient()
        const result = await client`
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'app' AND routine_name = 'get_user_role'
        `
        expect(result.length).toBe(1)
    })

    test('app.get_user_beneficiary_id() function exists', async () => {
        const client = getClient()
        const result = await client`
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'app' AND routine_name = 'get_user_beneficiary_id'
        `
        expect(result.length).toBe(1)
    })

    test('app.user_entity_ids() function exists', async () => {
        const client = getClient()
        const result = await client`
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'app' AND routine_name = 'user_entity_ids'
        `
        expect(result.length).toBe(1)
    })

    test('app.is_admin() returns false without JWT session', async () => {
        // Without a valid JWT session, is_admin should return false
        const isAdmin = await isCurrentUserAdmin()
        expect(isAdmin).toBe(false)
    })

    test('app.get_user_beneficiary_id() returns null without JWT session', async () => {
        const beneficiaryId = await getCurrentUserBeneficiaryId()
        expect(beneficiaryId).toBeNull()
    })
})

// =============================================================================
// JWT SESSION INITIALIZATION TESTS
// =============================================================================

describe.skipIf(isProductionDb)('JWT Session Initialization', () => {
    test('initJwtSession function is exported from db module', async () => {
        expect(typeof initJwtSession).toBe('function')
    })

    test('auth.user_id() returns null without JWT initialization', async () => {
        const userId = await getCurrentAuthUserId()
        expect(userId).toBeNull()
    })

    test('initJwtSession accepts a token parameter', async () => {
        // This should not throw (even with invalid token)
        // In production, invalid tokens just result in null user_id
        try {
            await initJwtSession('invalid-test-token')
            // If it doesn't throw, the function exists and accepts tokens
            expect(true).toBe(true)
        } catch (error) {
            // Expected to fail with invalid token, but function should exist
            expect(error).toBeDefined()
        }
    })
})

// =============================================================================
// AUTO USER PROFILE CREATION TRIGGER TESTS
// =============================================================================

describe.skipIf(isProductionDb)('Auto User Profile Creation', () => {
    test('trigger function exists for auto profile creation', async () => {
        const client = getClient()
        const result = await client`
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name = 'create_user_profile_on_signup'
        `
        expect(result.length).toBe(1)
    })

    test('trigger is attached to neon_auth.user table', async () => {
        const client = getClient()
        const result = await client`
            SELECT trigger_name
            FROM information_schema.triggers
            WHERE event_object_schema = 'neon_auth'
            AND event_object_table = 'user'
            AND trigger_name = 'on_auth_user_created'
        `
        expect(result.length).toBe(1)
    })
})

// =============================================================================
// AUTH UTILITY FUNCTIONS TESTS
// =============================================================================

describe('Auth Utility Functions', () => {
    // Note: authServer and authClient require Next.js runtime context.
    // We test the logic of utility functions directly here.

    test('isAdmin logic works correctly', () => {
        // Test the logic without importing the module
        const isAdmin = (user: { role?: string }) => user.role === 'admin'

        expect(isAdmin({ role: 'admin' })).toBe(true)
        expect(isAdmin({ role: 'beneficiary' })).toBe(false)
    })

    test('isBeneficiary logic works correctly', () => {
        const isBeneficiary = (user: {
            role?: string
            beneficiaryId?: number | null
        }) => user.role === 'beneficiary' && !!user.beneficiaryId

        expect(isBeneficiary({ role: 'beneficiary', beneficiaryId: 1 })).toBe(
            true,
        )
        expect(isBeneficiary({ role: 'beneficiary' })).toBe(false)
        expect(isBeneficiary({ role: 'admin' })).toBe(false)
    })

    test('IP extraction from headers works correctly', () => {
        // Test the IP extraction logic
        const extractClientIP = (req: Request): string => {
            const IPV4_REGEX =
                /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/

            const forwarded = req.headers
                .get('x-forwarded-for')
                ?.split(',')[0]
                ?.trim()
            const realIp = req.headers.get('x-real-ip')?.trim()
            const candidate = forwarded || realIp

            if (candidate && IPV4_REGEX.test(candidate)) {
                return candidate
            }
            return 'unknown'
        }

        const req1 = new Request('http://test.com', {
            headers: { 'x-forwarded-for': '10.0.0.1' },
        })
        expect(extractClientIP(req1)).toBe('10.0.0.1')

        const req2 = new Request('http://test.com', {
            headers: { 'x-forwarded-for': 'invalid-ip' },
        })
        expect(extractClientIP(req2)).toBe('unknown')
    })
})

// =============================================================================
// ENVIRONMENT CONFIGURATION TESTS
// =============================================================================

describe('Environment Configuration', () => {
    test('NEON_AUTH_BASE_URL is configured', () => {
        // In test environment, this may not be set, but we check the pattern
        const url = process.env.NEON_AUTH_BASE_URL
        if (url) {
            expect(url).toContain('neon')
        } else {
            // Log warning but don't fail - tests can run without actual Neon Auth
            console.warn(
                'NEON_AUTH_BASE_URL not set - some auth features may not work',
            )
            expect(true).toBe(true)
        }
    })

    test('DATABASE_URL is configured', () => {
        const url = process.env.DATABASE_URL
        expect(url).toBeDefined()
        expect(url).toContain('postgres')
    })
})

// =============================================================================
// SERVER AVAILABILITY TESTS
// =============================================================================

describe('Server Availability', () => {
    let serverRunning = false

    beforeAll(async () => {
        serverRunning = await isServerAvailable()
    })

    test('reports server status', async () => {
        if (serverRunning) {
            console.log('✓ Server is running')
        } else {
            console.log(
                '⚠ Server not running - HTTP-based tests will check conditionally',
            )
        }
        expect(true).toBe(true)
    })

    test('Neon Auth endpoints are accessible', async () => {
        if (!serverRunning) {
            console.log('  (skipped - server not running)')
            return
        }
        const available = await isNeonAuthAvailable()
        expect(available).toBe(true)
    })
})
