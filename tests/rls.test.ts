/**
 * Row-Level Security (RLS) Integration Tests
 *
 * Tests that RLS policies correctly enforce data isolation:
 * - Admins can see all records
 * - Beneficiaries can only see their own records
 * - Unauthenticated users see nothing
 * - JWT session initialization enables auth.user_id()
 *
 * These tests verify database-level security, not just application-level checks.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db, getClient, initJwtSession } from '@/db'
import {
    beneficiary,
    distribution,
    entity,
    hemsRequest,
    userProfile,
} from '@/db/schema'
import { isProductionDb } from './helpers/db-guard'

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_TIMEOUT = 30000

// Track test data for cleanup
const testData = {
    entityId: null as number | null,
    adminUserId: null as string | null,
    beneficiaryUserId1: null as string | null,
    beneficiaryUserId2: null as string | null,
    beneficiaryId1: null as number | null,
    beneficiaryId2: null as number | null,
    distributionId1: null as number | null,
    distributionId2: null as number | null,
    hemsRequestId1: null as number | null,
    hemsRequestId2: null as number | null,
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if RLS is enabled on a table
 */
async function isRlsEnabled(tableName: string): Promise<boolean> {
    const client = getClient()
    const result = await client`
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = ${tableName} AND relnamespace = 'public'::regnamespace
    `
    return result[0]?.relrowsecurity === true
}

/**
 * Get RLS policies for a table
 */
async function getTablePolicies(tableName: string): Promise<
    Array<{
        policyname: string
        cmd: string
        qual: string | null
        with_check: string | null
    }>
> {
    const client = getClient()
    const result = await client`
        SELECT policyname, cmd, qual::text, with_check::text
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = ${tableName}
    `
    return result as Array<{
        policyname: string
        cmd: string
        qual: string | null
        with_check: string | null
    }>
}

/**
 * Check if app schema helper functions exist
 */
async function checkAppSchemaFunctions(): Promise<{
    isAdmin: boolean
    getUserRole: boolean
    getUserBeneficiaryId: boolean
    userEntityIds: boolean
}> {
    const client = getClient()
    const result = await client`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'app' AND routine_type = 'FUNCTION'
    `
    const functions = result.map((r) => r.routine_name)
    return {
        isAdmin: functions.includes('is_admin'),
        getUserRole: functions.includes('get_user_role'),
        getUserBeneficiaryId: functions.includes('get_user_beneficiary_id'),
        userEntityIds: functions.includes('user_entity_ids'),
    }
}

/**
 * Get current auth.user_id() value (for debugging)
 */
async function getCurrentAuthUserId(): Promise<string | null> {
    const client = getClient()
    try {
        const result = await client`SELECT auth.user_id() as user_id`
        return result[0]?.user_id ?? null
    } catch {
        return null
    }
}

/**
 * Reset JWT session (clear auth context)
 */
async function resetJwtSession(): Promise<void> {
    const client = getClient()
    try {
        // Reset by setting to empty/null token
        await client`SELECT set_config('request.jwt.claims', '', true)`
    } catch {
        // Ignore errors - session may not be initialized
    }
}

// =============================================================================
// TEST SETUP
// =============================================================================

describe.skipIf(isProductionDb)('Row-Level Security', () => {
    beforeAll(async () => {
        // Create test entity
        const now = new Date().toISOString()
        const [createdEntity] = await db
            .insert(entity)
            .values({
                name: 'RLS Test Trust',
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                ein: '99-9999999',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        testData.entityId = createdEntity.id

        // Create two test beneficiaries
        const [ben1] = await db
            .insert(beneficiary)
            .values({
                entityId: testData.entityId,
                firstName: 'RLS Test',
                lastName: 'Beneficiary One',
                email: `rls-test-ben1-${Date.now()}@example.com`,
                relationship: 'CHILD',
                sharePercent: '50.00',
                updatedAt: now,
            })
            .returning()
        testData.beneficiaryId1 = ben1.id

        const [ben2] = await db
            .insert(beneficiary)
            .values({
                entityId: testData.entityId,
                firstName: 'RLS Test',
                lastName: 'Beneficiary Two',
                email: `rls-test-ben2-${Date.now()}@example.com`,
                relationship: 'CHILD',
                sharePercent: '50.00',
                updatedAt: now,
            })
            .returning()
        testData.beneficiaryId2 = ben2.id

        // Create user_profile records (simulating Neon Auth users)
        testData.adminUserId = `rls-admin-${Date.now()}`
        testData.beneficiaryUserId1 = `rls-ben1-${Date.now()}`
        testData.beneficiaryUserId2 = `rls-ben2-${Date.now()}`

        await db.insert(userProfile).values([
            {
                userId: testData.adminUserId,
                role: 'admin',
                beneficiaryId: null,
            },
            {
                userId: testData.beneficiaryUserId1,
                role: 'beneficiary',
                beneficiaryId: testData.beneficiaryId1,
            },
            {
                userId: testData.beneficiaryUserId2,
                role: 'beneficiary',
                beneficiaryId: testData.beneficiaryId2,
            },
        ])

        // Create distributions for each beneficiary
        const [dist1] = await db
            .insert(distribution)
            .values({
                entityId: testData.entityId,
                beneficiaryId: testData.beneficiaryId1,
                distributionType: 'INCOME',
                amount: '1000.00',
                distributionDate: new Date().toISOString().split('T')[0],
                paymentMethod: 'CHECK',
                updatedAt: now,
            })
            .returning()
        testData.distributionId1 = dist1.id

        const [dist2] = await db
            .insert(distribution)
            .values({
                entityId: testData.entityId,
                beneficiaryId: testData.beneficiaryId2,
                distributionType: 'INCOME',
                amount: '2000.00',
                distributionDate: new Date().toISOString().split('T')[0],
                paymentMethod: 'CHECK',
                updatedAt: now,
            })
            .returning()
        testData.distributionId2 = dist2.id

        // Create HEMS requests for each beneficiary
        const [hems1] = await db
            .insert(hemsRequest)
            .values({
                entityId: testData.entityId,
                beneficiaryId: testData.beneficiaryId1,
                category: 'HEALTH',
                amountRequested: '500.00',
                justification: 'RLS Test HEMS 1',
                status: 'PENDING',
                updatedAt: now,
            })
            .returning()
        testData.hemsRequestId1 = hems1.id

        const [hems2] = await db
            .insert(hemsRequest)
            .values({
                entityId: testData.entityId,
                beneficiaryId: testData.beneficiaryId2,
                category: 'EDUCATION',
                amountRequested: '1500.00',
                justification: 'RLS Test HEMS 2',
                status: 'PENDING',
                updatedAt: now,
            })
            .returning()
        testData.hemsRequestId2 = hems2.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        // Reset role and session before cleanup (neondb_owner needed for DELETE permissions)
        const client = getClient()
        await client.unsafe('RESET ROLE')
        await resetJwtSession()

        // Clean up in reverse order of creation (FK constraints)
        if (testData.hemsRequestId1) {
            await db
                .delete(hemsRequest)
                .where(eq(hemsRequest.id, testData.hemsRequestId1))
        }
        if (testData.hemsRequestId2) {
            await db
                .delete(hemsRequest)
                .where(eq(hemsRequest.id, testData.hemsRequestId2))
        }
        if (testData.distributionId1) {
            await db
                .delete(distribution)
                .where(eq(distribution.id, testData.distributionId1))
        }
        if (testData.distributionId2) {
            await db
                .delete(distribution)
                .where(eq(distribution.id, testData.distributionId2))
        }
        if (testData.adminUserId) {
            await db
                .delete(userProfile)
                .where(eq(userProfile.userId, testData.adminUserId))
        }
        if (testData.beneficiaryUserId1) {
            await db
                .delete(userProfile)
                .where(eq(userProfile.userId, testData.beneficiaryUserId1))
        }
        if (testData.beneficiaryUserId2) {
            await db
                .delete(userProfile)
                .where(eq(userProfile.userId, testData.beneficiaryUserId2))
        }
        if (testData.beneficiaryId1) {
            await db
                .delete(beneficiary)
                .where(eq(beneficiary.id, testData.beneficiaryId1))
        }
        if (testData.beneficiaryId2) {
            await db
                .delete(beneficiary)
                .where(eq(beneficiary.id, testData.beneficiaryId2))
        }
        if (testData.entityId) {
            await db.delete(entity).where(eq(entity.id, testData.entityId))
        }
    }, TEST_TIMEOUT)

    // =========================================================================
    // RLS INFRASTRUCTURE TESTS
    // =========================================================================

    describe('RLS Infrastructure', () => {
        test('RLS is enabled on beneficiary table', async () => {
            const enabled = await isRlsEnabled('beneficiary')
            expect(enabled).toBe(true)
        })

        test('RLS is enabled on distribution table', async () => {
            const enabled = await isRlsEnabled('distribution')
            expect(enabled).toBe(true)
        })

        test('RLS is enabled on hems_request table', async () => {
            const enabled = await isRlsEnabled('hems_request')
            expect(enabled).toBe(true)
        })

        test('beneficiary table has access policy', async () => {
            const policies = await getTablePolicies('beneficiary')
            expect(policies.length).toBeGreaterThan(0)

            // Should have a policy that references app.is_admin() or similar
            const hasAccessPolicy = policies.some(
                (p) =>
                    p.qual?.includes('is_admin') ||
                    p.qual?.includes('beneficiary'),
            )
            expect(hasAccessPolicy).toBe(true)
        })

        test('distribution table has access policy', async () => {
            const policies = await getTablePolicies('distribution')
            expect(policies.length).toBeGreaterThan(0)
        })

        test('hems_request table has access policy', async () => {
            const policies = await getTablePolicies('hems_request')
            expect(policies.length).toBeGreaterThan(0)
        })

        test('app schema helper functions exist', async () => {
            const functions = await checkAppSchemaFunctions()
            expect(functions.isAdmin).toBe(true)
            expect(functions.getUserRole).toBe(true)
            expect(functions.getUserBeneficiaryId).toBe(true)
            expect(functions.userEntityIds).toBe(true)
        })
    })

    // =========================================================================
    // JWT SESSION TESTS
    // =========================================================================

    describe('JWT Session Initialization', () => {
        test('initJwtSession function exists and is callable', async () => {
            expect(typeof initJwtSession).toBe('function')
        })

        test('auth.user_id() returns null without JWT session', async () => {
            await resetJwtSession()
            const userId = await getCurrentAuthUserId()
            // Without a valid JWT, should return null
            expect(userId).toBeNull()
        })
    })

    // =========================================================================
    // DATA ISOLATION TESTS (Application Level)
    // These tests verify that the RLS policies are working by checking
    // what data is visible through the application's database connection.
    // =========================================================================

    describe('Data Isolation - Application Level', () => {
        test('test data was created correctly', async () => {
            // Verify all test data exists
            expect(testData.entityId).not.toBeNull()
            expect(testData.beneficiaryId1).not.toBeNull()
            expect(testData.beneficiaryId2).not.toBeNull()
            expect(testData.distributionId1).not.toBeNull()
            expect(testData.distributionId2).not.toBeNull()
            expect(testData.hemsRequestId1).not.toBeNull()
            expect(testData.hemsRequestId2).not.toBeNull()
        })

        test('two distinct beneficiaries exist in test data', async () => {
            const testBeneficiaries = await db
                .select()
                .from(beneficiary)
                .where(eq(beneficiary.entityId, testData.entityId!))

            expect(testBeneficiaries.length).toBe(2)
            expect(testBeneficiaries.map((b) => b.id)).toContain(
                testData.beneficiaryId1,
            )
            expect(testBeneficiaries.map((b) => b.id)).toContain(
                testData.beneficiaryId2,
            )
        })

        test('two distinct distributions exist in test data', async () => {
            const testDistributions = await db
                .select()
                .from(distribution)
                .where(eq(distribution.entityId, testData.entityId!))

            expect(testDistributions.length).toBe(2)
            expect(testDistributions.map((d) => d.id)).toContain(
                testData.distributionId1,
            )
            expect(testDistributions.map((d) => d.id)).toContain(
                testData.distributionId2,
            )
        })

        test('two distinct HEMS requests exist in test data', async () => {
            const testHemsRequests = await db
                .select()
                .from(hemsRequest)
                .where(eq(hemsRequest.entityId, testData.entityId!))

            expect(testHemsRequests.length).toBe(2)
            expect(testHemsRequests.map((h) => h.id)).toContain(
                testData.hemsRequestId1,
            )
            expect(testHemsRequests.map((h) => h.id)).toContain(
                testData.hemsRequestId2,
            )
        })

        test('user_profile records link users to beneficiaries', async () => {
            const profiles = await db
                .select()
                .from(userProfile)
                .where(
                    sql`${userProfile.userId} IN (${testData.adminUserId}, ${testData.beneficiaryUserId1}, ${testData.beneficiaryUserId2})`,
                )

            expect(profiles.length).toBe(3)

            const adminProfile = profiles.find(
                (p) => p.userId === testData.adminUserId,
            )
            const ben1Profile = profiles.find(
                (p) => p.userId === testData.beneficiaryUserId1,
            )
            const ben2Profile = profiles.find(
                (p) => p.userId === testData.beneficiaryUserId2,
            )

            expect(adminProfile?.role).toBe('admin')
            expect(adminProfile?.beneficiaryId).toBeNull()

            expect(ben1Profile?.role).toBe('beneficiary')
            expect(ben1Profile?.beneficiaryId).toBe(testData.beneficiaryId1)

            expect(ben2Profile?.role).toBe('beneficiary')
            expect(ben2Profile?.beneficiaryId).toBe(testData.beneficiaryId2)
        })
    })

    // =========================================================================
    // RLS POLICY BEHAVIOR TESTS
    // These tests verify the RLS policies are correctly configured by
    // examining the policy definitions and ensuring they reference the
    // correct helper functions.
    // =========================================================================

    describe('RLS Policy Configuration', () => {
        test('beneficiary policy uses is_admin() for admin access', async () => {
            const policies = await getTablePolicies('beneficiary')
            const hasAdminCheck = policies.some(
                (p) =>
                    p.qual?.includes('is_admin') ||
                    p.qual?.includes('app.is_admin'),
            )
            expect(hasAdminCheck).toBe(true)
        })

        test('beneficiary policy uses get_user_beneficiary_id() for beneficiary access', async () => {
            const policies = await getTablePolicies('beneficiary')
            const hasBeneficiaryCheck = policies.some(
                (p) =>
                    p.qual?.includes('beneficiary_id') ||
                    p.qual?.includes('get_user_beneficiary_id'),
            )
            expect(hasBeneficiaryCheck).toBe(true)
        })

        test('distribution policy restricts by beneficiary_id', async () => {
            const policies = await getTablePolicies('distribution')
            const hasBeneficiaryRestriction = policies.some(
                (p) =>
                    p.qual?.includes('beneficiary_id') ||
                    p.qual?.includes('is_admin'),
            )
            expect(hasBeneficiaryRestriction).toBe(true)
        })

        test('hems_request policy restricts by beneficiary_id', async () => {
            const policies = await getTablePolicies('hems_request')
            const hasBeneficiaryRestriction = policies.some(
                (p) =>
                    p.qual?.includes('beneficiary_id') ||
                    p.qual?.includes('is_admin'),
            )
            expect(hasBeneficiaryRestriction).toBe(true)
        })

        test('policies have WITH CHECK clauses for write protection', async () => {
            const beneficiaryPolicies = await getTablePolicies('beneficiary')
            const distributionPolicies = await getTablePolicies('distribution')
            const hemsPolicies = await getTablePolicies('hems_request')

            // At least one policy should have a WITH CHECK clause
            const allPolicies = [
                ...beneficiaryPolicies,
                ...distributionPolicies,
                ...hemsPolicies,
            ]
            const hasWithCheck = allPolicies.some((p) => p.with_check !== null)

            // WITH CHECK is important for INSERT/UPDATE protection
            expect(hasWithCheck).toBe(true)
        })
    })

    // =========================================================================
    // CROSS-BENEFICIARY ISOLATION TESTS
    // These tests verify that one beneficiary CANNOT see another beneficiary's
    // data. This is the core RLS security requirement.
    //
    // Uses app.set_test_user() to simulate different users. In production,
    // this test context is never set, so auth.user_id() from Neon Auth is used.
    // =========================================================================

    /**
     * Run a query as a specific user with RLS enforced.
     *
     * IMPORTANT: neondb_owner has BYPASSRLS=true, so we must SET ROLE authenticated
     * within a transaction to actually test RLS policies.
     */
    async function runAsUser<T>(
        userId: string,
        queryFn: (
            sql: typeof getClient extends () => infer R ? R : never,
        ) => Promise<T>,
    ): Promise<T> {
        const client = getClient()
        return client.begin(async (sql) => {
            // Switch to authenticated role (no BYPASSRLS)
            await sql.unsafe('SET ROLE authenticated')
            // Set search_path to include public and app schemas
            await sql.unsafe('SET search_path TO public, app')
            // Set test user context
            await sql`SELECT app.set_test_user(${userId})`
            // Run the query
            return queryFn(sql)
        })
    }

    /**
     * Run a query without authentication (clear user context)
     */
    async function runUnauthenticated<T>(
        queryFn: (
            sql: typeof getClient extends () => infer R ? R : never,
        ) => Promise<T>,
    ): Promise<T> {
        const client = getClient()
        return client.begin(async (sql) => {
            // Switch to authenticated role (no BYPASSRLS)
            await sql.unsafe('SET ROLE authenticated')
            await sql.unsafe('SET search_path TO public, app')
            // Clear any test user context
            await sql`SELECT app.clear_test_user()`
            return queryFn(sql)
        })
    }

    // Legacy helpers (for compatibility with existing tests)
    async function setTestUser(userId: string): Promise<void> {
        const client = getClient()
        await client`SELECT app.set_test_user(${userId})`
    }

    async function clearTestUser(): Promise<void> {
        const client = getClient()
        await client`SELECT app.clear_test_user()`
    }

    describe('Cross-Beneficiary Data Isolation', () => {
        test('beneficiary 1 session returns correct user info', async () => {
            await setTestUser(testData.beneficiaryUserId1!)
            const client = getClient()

            // Check app.effective_user_id() returns correct value
            const userIdResult =
                await client`SELECT app.effective_user_id() as user_id`
            expect(userIdResult[0]?.user_id).toBe(testData.beneficiaryUserId1)

            // Check app.get_user_beneficiary_id() returns correct value
            const beneficiaryIdResult =
                await client`SELECT app.get_user_beneficiary_id() as beneficiary_id`
            expect(Number(beneficiaryIdResult[0]?.beneficiary_id)).toBe(
                testData.beneficiaryId1,
            )

            // Check app.is_admin() returns false
            const isAdminResult =
                await client`SELECT app.is_admin() as is_admin`
            expect(isAdminResult[0]?.is_admin).toBe(false)

            await clearTestUser()
        })

        test('beneficiary 2 session returns correct user info', async () => {
            await setTestUser(testData.beneficiaryUserId2!)
            const client = getClient()

            // Check app.effective_user_id() returns correct value
            const userIdResult =
                await client`SELECT app.effective_user_id() as user_id`
            expect(userIdResult[0]?.user_id).toBe(testData.beneficiaryUserId2)

            // Check app.get_user_beneficiary_id() returns correct value
            const beneficiaryIdResult =
                await client`SELECT app.get_user_beneficiary_id() as beneficiary_id`
            expect(Number(beneficiaryIdResult[0]?.beneficiary_id)).toBe(
                testData.beneficiaryId2,
            )

            await clearTestUser()
        })

        test('admin session has is_admin = true', async () => {
            await setTestUser(testData.adminUserId!)
            const client = getClient()

            // Check app.is_admin() returns true
            const isAdminResult =
                await client`SELECT app.is_admin() as is_admin`
            expect(isAdminResult[0]?.is_admin).toBe(true)

            await clearTestUser()
        })

        test('beneficiary 1 can only see their own distributions', async () => {
            const entityId = testData.entityId
            const distributions = await runAsUser(
                testData.beneficiaryUserId1!,
                async (sql) => {
                    return sql`
                    SELECT id, "beneficiaryId", amount
                    FROM public.distribution
                    WHERE "entityId" = ${entityId}
                `
                },
            )

            // Should only see beneficiary 1's distribution
            expect(distributions.length).toBe(1)
            expect(Number(distributions[0]?.beneficiaryId)).toBe(
                testData.beneficiaryId1,
            )
            expect(distributions[0]?.amount).toBe('1000.00')

            // Should NOT see beneficiary 2's distribution
            const ben2Dist = distributions.find(
                (d) => Number(d.beneficiaryId) === testData.beneficiaryId2,
            )
            expect(ben2Dist).toBeUndefined()
        })

        test('beneficiary 2 can only see their own distributions', async () => {
            const entityId = testData.entityId
            const distributions = await runAsUser(
                testData.beneficiaryUserId2!,
                async (sql) => {
                    return sql`
                    SELECT id, "beneficiaryId", amount
                    FROM public.distribution
                    WHERE "entityId" = ${entityId}
                `
                },
            )

            // Should only see beneficiary 2's distribution
            expect(distributions.length).toBe(1)
            expect(Number(distributions[0]?.beneficiaryId)).toBe(
                testData.beneficiaryId2,
            )
            expect(distributions[0]?.amount).toBe('2000.00')

            // Should NOT see beneficiary 1's distribution
            const ben1Dist = distributions.find(
                (d) => Number(d.beneficiaryId) === testData.beneficiaryId1,
            )
            expect(ben1Dist).toBeUndefined()
        })

        test('beneficiary 1 can only see their own HEMS requests', async () => {
            const entityId = testData.entityId
            const hemsRequests = await runAsUser(
                testData.beneficiaryUserId1!,
                async (sql) => {
                    return sql`
                    SELECT id, "beneficiaryId", category, "amountRequested"
                    FROM public.hems_request
                    WHERE "entityId" = ${entityId}
                `
                },
            )

            // Should only see beneficiary 1's HEMS request
            expect(hemsRequests.length).toBe(1)
            expect(Number(hemsRequests[0]?.beneficiaryId)).toBe(
                testData.beneficiaryId1,
            )
            expect(hemsRequests[0]?.category).toBe('HEALTH')

            // Should NOT see beneficiary 2's HEMS request
            const ben2Hems = hemsRequests.find(
                (h) => Number(h.beneficiaryId) === testData.beneficiaryId2,
            )
            expect(ben2Hems).toBeUndefined()
        })

        test('beneficiary 2 can only see their own HEMS requests', async () => {
            const entityId = testData.entityId
            const hemsRequests = await runAsUser(
                testData.beneficiaryUserId2!,
                async (sql) => {
                    return sql`
                    SELECT id, "beneficiaryId", category, "amountRequested"
                    FROM public.hems_request
                    WHERE "entityId" = ${entityId}
                `
                },
            )

            // Should only see beneficiary 2's HEMS request
            expect(hemsRequests.length).toBe(1)
            expect(Number(hemsRequests[0]?.beneficiaryId)).toBe(
                testData.beneficiaryId2,
            )
            expect(hemsRequests[0]?.category).toBe('EDUCATION')

            // Should NOT see beneficiary 1's HEMS request
            const ben1Hems = hemsRequests.find(
                (h) => Number(h.beneficiaryId) === testData.beneficiaryId1,
            )
            expect(ben1Hems).toBeUndefined()
        })

        test('beneficiary 1 can only see their own beneficiary record', async () => {
            const entityId = testData.entityId
            const beneficiaries = await runAsUser(
                testData.beneficiaryUserId1!,
                async (sql) => {
                    return sql`
                    SELECT id, "firstName", "lastName"
                    FROM public.beneficiary
                    WHERE "entityId" = ${entityId}
                    AND "firstName" = 'RLS Test'
                `
                },
            )

            // Should only see their own record
            expect(beneficiaries.length).toBe(1)
            expect(Number(beneficiaries[0]?.id)).toBe(testData.beneficiaryId1)
            expect(beneficiaries[0]?.lastName).toBe('Beneficiary One')
        })

        test('beneficiary 2 can only see their own beneficiary record', async () => {
            const entityId = testData.entityId
            const beneficiaries = await runAsUser(
                testData.beneficiaryUserId2!,
                async (sql) => {
                    return sql`
                    SELECT id, "firstName", "lastName"
                    FROM public.beneficiary
                    WHERE "entityId" = ${entityId}
                    AND "firstName" = 'RLS Test'
                `
                },
            )

            // Should only see their own record
            expect(beneficiaries.length).toBe(1)
            expect(Number(beneficiaries[0]?.id)).toBe(testData.beneficiaryId2)
            expect(beneficiaries[0]?.lastName).toBe('Beneficiary Two')
        })

        test('admin can see ALL distributions', async () => {
            const entityId = testData.entityId
            const distributions = await runAsUser(
                testData.adminUserId!,
                async (sql) => {
                    return sql`
                    SELECT id, "beneficiaryId", amount
                    FROM public.distribution
                    WHERE "entityId" = ${entityId}
                `
                },
            )

            // Admin should see both distributions
            expect(distributions.length).toBe(2)
            const ids = distributions.map((d) => Number(d.beneficiaryId))
            expect(ids).toContain(testData.beneficiaryId1)
            expect(ids).toContain(testData.beneficiaryId2)
        })

        test('admin can see ALL HEMS requests', async () => {
            const entityId = testData.entityId
            const hemsRequests = await runAsUser(
                testData.adminUserId!,
                async (sql) => {
                    return sql`
                    SELECT id, "beneficiaryId", category
                    FROM public.hems_request
                    WHERE "entityId" = ${entityId}
                `
                },
            )

            // Admin should see both HEMS requests
            expect(hemsRequests.length).toBe(2)
            const ids = hemsRequests.map((h) => Number(h.beneficiaryId))
            expect(ids).toContain(testData.beneficiaryId1)
            expect(ids).toContain(testData.beneficiaryId2)
        })

        test('admin can see ALL beneficiary records', async () => {
            const entityId = testData.entityId
            const beneficiaries = await runAsUser(
                testData.adminUserId!,
                async (sql) => {
                    return sql`
                    SELECT id, "firstName", "lastName"
                    FROM public.beneficiary
                    WHERE "entityId" = ${entityId}
                    AND "firstName" = 'RLS Test'
                `
                },
            )

            // Admin should see both beneficiaries
            expect(beneficiaries.length).toBe(2)
            const ids = beneficiaries.map((b) => Number(b.id))
            expect(ids).toContain(testData.beneficiaryId1)
            expect(ids).toContain(testData.beneficiaryId2)
        })

        test('unauthenticated user sees NO distributions', async () => {
            const entityId = testData.entityId
            const distributions = await runUnauthenticated(async (sql) => {
                return sql`
                    SELECT id FROM public.distribution WHERE "entityId" = ${entityId}
                `
            })

            expect(distributions.length).toBe(0)
        })

        test('unauthenticated user sees NO HEMS requests', async () => {
            const entityId = testData.entityId
            const hemsRequests = await runUnauthenticated(async (sql) => {
                return sql`
                    SELECT id FROM public.hems_request WHERE "entityId" = ${entityId}
                `
            })

            expect(hemsRequests.length).toBe(0)
        })

        test('unauthenticated user sees NO beneficiary records', async () => {
            const entityId = testData.entityId
            const beneficiaries = await runUnauthenticated(async (sql) => {
                return sql`
                    SELECT id FROM public.beneficiary
                    WHERE "entityId" = ${entityId}
                    AND "firstName" = 'RLS Test'
                `
            })

            expect(beneficiaries.length).toBe(0)
        })
    })

    // =========================================================================
    // ADDITIONAL RLS-ENABLED TABLES
    // =========================================================================

    describe('RLS on All Protected Tables', () => {
        // These are the 28 tables with RLS enabled (11 original + 17 new)
        const rlsEnabledTables = [
            // Original 11 tables
            'bank_account',
            'beneficiary',
            'distribution',
            'entity',
            'hems_request',
            'homestead',
            'investment_account',
            'liability',
            'trust_accounting',
            'vehicle',
            'withdrawal_record',
            // 17 new tables (added in phase 53)
            'artwork',
            'rental_property',
            'insurance_policy',
            'personal_property',
            'trustee',
            'trustee_fee_schedule',
            'trustee_fee_entry',
            'liability_payment',
            'contact',
            'contact_association',
            'task',
            'document',
            'valuation',
            'transaction',
            'activity_log',
            'pending_inventory_item',
            'specific_bequest',
        ]

        test.each(
            rlsEnabledTables,
        )('RLS is enabled on %s table', async (tableName) => {
            const enabled = await isRlsEnabled(tableName)
            expect(enabled).toBe(true)
        })

        test('exactly 28 tables have RLS enabled', async () => {
            const client = getClient()
            const result = await client`
                SELECT COUNT(*)::int as count
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public'
                AND c.relkind = 'r'
                AND c.relrowsecurity = true
            `
            expect(result[0]?.count).toBe(28)
        })

        test('beneficiary cannot write to admin-only tables (entity)', async () => {
            let threw = false
            try {
                await runAsUser(testData.beneficiaryUserId1!, async (sql) => {
                    await sql`
                        INSERT INTO public.entity (name, "entityType", "trustType", status, "updatedAt")
                        VALUES ('Malicious Entity', 'TRUST', 'IRREVOCABLE', 'ACTIVE', NOW())
                    `
                })
            } catch {
                threw = true
            }
            expect(threw).toBe(true)
        })
    })
})
