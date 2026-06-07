/** RLS integration tests — verifies admin/beneficiary/unauthenticated data isolation at the database level. */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, sql } from 'drizzle-orm'
import { db, getClient, initJwtSession } from '@/db'
import {
    beneficiary,
    distribution,
    entity,
    hemsRequest,
    noteReceivable,
    receivablePayment,
    userProfile,
} from '@/db/schema'
import { isProductionDb } from './helpers/db-guard'

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const TEST_TIMEOUT = 30000

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

async function isRlsEnabled(tableName: string): Promise<boolean> {
    const client = getClient()
    const result = await client`
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = ${tableName} AND relnamespace = 'public'::regnamespace
    `
    return result[0]?.relrowsecurity === true
}

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

async function getCurrentAuthUserId(): Promise<string | null> {
    const client = getClient()
    try {
        const result = await client`SELECT auth.user_id() as user_id`
        return result[0]?.user_id ?? null
    } catch {
        return null
    }
}

async function resetJwtSession(): Promise<void> {
    const client = getClient()
    try {
        await client`SELECT set_config('request.jwt.claims', '', true)`
    } catch {
        // Session may not be initialized
    }
}

// =============================================================================
// TEST SETUP
// =============================================================================

describe.skipIf(isProductionDb)('Row-Level Security', () => {
    beforeAll(async () => {
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
            expect(userId).toBeNull()
        })
    })

    // =========================================================================
    // DATA ISOLATION TESTS (Application Level)
    // =========================================================================

    describe('Data Isolation - Application Level', () => {
        test('test data was created correctly', async () => {
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

            const allPolicies = [
                ...beneficiaryPolicies,
                ...distributionPolicies,
                ...hemsPolicies,
            ]
            const hasWithCheck = allPolicies.some((p) => p.with_check !== null)
            expect(hasWithCheck).toBe(true)
        })
    })

    // =========================================================================
    // CROSS-BENEFICIARY ISOLATION TESTS
    // Uses app.set_test_user() to simulate users; in production auth.user_id() is used instead.
    // =========================================================================

    /** neondb_owner has BYPASSRLS, so SET ROLE authenticated is required to test RLS policies */
    async function runAsUser<T>(
        userId: string,
        queryFn: (
            sql: typeof getClient extends () => infer R ? R : never,
        ) => Promise<T>,
    ): Promise<T> {
        const client = getClient()
        return client.begin(async (sql) => {
            await sql.unsafe('SET ROLE authenticated')
            await sql.unsafe('SET search_path TO public, app')
            await sql`SELECT app.set_test_user(${userId})`
            return queryFn(sql)
        })
    }

    async function runUnauthenticated<T>(
        queryFn: (
            sql: typeof getClient extends () => infer R ? R : never,
        ) => Promise<T>,
    ): Promise<T> {
        const client = getClient()
        return client.begin(async (sql) => {
            await sql.unsafe('SET ROLE authenticated')
            await sql.unsafe('SET search_path TO public, app')
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

            const userIdResult =
                await client`SELECT app.effective_user_id() as user_id`
            expect(userIdResult[0]?.user_id).toBe(testData.beneficiaryUserId1)

            const beneficiaryIdResult =
                await client`SELECT app.get_user_beneficiary_id() as beneficiary_id`
            expect(Number(beneficiaryIdResult[0]?.beneficiary_id)).toBe(
                testData.beneficiaryId1,
            )

            const isAdminResult =
                await client`SELECT app.is_admin() as is_admin`
            expect(isAdminResult[0]?.is_admin).toBe(false)

            await clearTestUser()
        })

        test('beneficiary 2 session returns correct user info', async () => {
            await setTestUser(testData.beneficiaryUserId2!)
            const client = getClient()

            const userIdResult =
                await client`SELECT app.effective_user_id() as user_id`
            expect(userIdResult[0]?.user_id).toBe(testData.beneficiaryUserId2)

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

            expect(distributions.length).toBe(1)
            expect(Number(distributions[0]?.beneficiaryId)).toBe(
                testData.beneficiaryId1,
            )
            expect(distributions[0]?.amount).toBe('1000.00')

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

            expect(distributions.length).toBe(1)
            expect(Number(distributions[0]?.beneficiaryId)).toBe(
                testData.beneficiaryId2,
            )
            expect(distributions[0]?.amount).toBe('2000.00')

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

            expect(hemsRequests.length).toBe(1)
            expect(Number(hemsRequests[0]?.beneficiaryId)).toBe(
                testData.beneficiaryId1,
            )
            expect(hemsRequests[0]?.category).toBe('HEALTH')

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

            expect(hemsRequests.length).toBe(1)
            expect(Number(hemsRequests[0]?.beneficiaryId)).toBe(
                testData.beneficiaryId2,
            )
            expect(hemsRequests[0]?.category).toBe('EDUCATION')

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
        // Core domain tables — 28 were the original coverage set. Auth /
        // session / user_profile tables were added when the 0000 baseline
        // was regenerated from a pg_dump of the live schema (their RLS was
        // provisioned by earlier hand-written migrations outside the
        // drizzle pipeline). All 34 public tables should have RLS on.
        const rlsEnabledTables = [
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
            'rental_property',
            'insurance_policy',
            'personal_property',
            'firearm',
            'trustee',
            'trustee_fee_schedule',
            'trustee_fee_entry',
            'liability_payment',
            'note_receivable',
            'receivable_payment',
            'contact',
            'contact_association',
            'task',
            'document',
            'valuation',
            'valuation_correction',
            'transaction',
            'activity_log',
            'specific_bequest',
            // Auth / session / profile tables — RLS required so a captured
            // access-code cookie can't query another user's session or
            // profile.
            'account',
            'session',
            'user',
            'user_profile',
            'verification',
            'password_reset_token',
        ]

        test.each(
            rlsEnabledTables,
        )('RLS is enabled on %s table', async (tableName) => {
            const enabled = await isRlsEnabled(tableName)
            expect(enabled).toBe(true)
        })

        test('every listed table matches the live RLS-enabled count', async () => {
            const client = getClient()
            const result = await client`
                SELECT COUNT(*)::int as count
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public'
                AND c.relkind = 'r'
                AND c.relrowsecurity = true
            `
            // Lock the invariant: the rlsEnabledTables list above must
            // enumerate every public table with RLS enabled. If this
            // assertion fires, either a new table was added without
            // being added to the list, or a table lost its RLS flag.
            expect(result[0]?.count).toBe(rlsEnabledTables.length)
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

        // Regression for the note_receivable / receivable_payment write-gate:
        // INSERT is rejected by the WITH CHECK (app.is_admin()) predicate.
        test('beneficiary cannot INSERT into note_receivable', async () => {
            let threw = false
            try {
                await runAsUser(testData.beneficiaryUserId1!, async (sql) => {
                    await sql`
                        INSERT INTO public.note_receivable
                          ("entityId", "receivableType", debtor, "noteType", "originalPrincipal", "currentBalance", status, "updatedAt")
                        VALUES (${testData.entityId!}, 'PROMISSORY_NOTE', 'Mallory', 'NON_NEGOTIABLE', '1000.00', '1000.00', 'ACTIVE', NOW())
                    `
                })
            } catch {
                threw = true
            }
            expect(threw).toBe(true)
        })

        // UPDATE/DELETE under RLS match zero rows (the USING predicate hides the
        // row) rather than throwing, so assert the row is untouched. Also covers
        // the receivable_payment INSERT gate against an owner-created note.
        test('beneficiary cannot UPDATE/DELETE note_receivable or INSERT receivable_payment', async () => {
            // Owner-create via `db` (BYPASSRLS, like the rest of the setup) so the
            // FK is satisfied and RLS is the only thing that can block the
            // beneficiary writes below.
            const [note] = await db
                .insert(noteReceivable)
                .values({
                    entityId: testData.entityId!,
                    receivableType: 'PROMISSORY_NOTE',
                    debtor: 'RLS Note',
                    noteType: 'NON_NEGOTIABLE',
                    originalPrincipal: '500.00',
                    currentBalance: '500.00',
                    status: 'ACTIVE',
                    updatedAt: new Date().toISOString(),
                })
                .returning()
            const noteId = note.id
            try {
                // UPDATE/DELETE under RLS match zero rows (no throw) — the row
                // must survive unchanged.
                await runAsUser(
                    testData.beneficiaryUserId1!,
                    (sql) =>
                        sql`UPDATE public.note_receivable SET "currentBalance" = '0.00' WHERE id = ${noteId}`,
                ).catch(() => {})
                await runAsUser(
                    testData.beneficiaryUserId1!,
                    (sql) =>
                        sql`DELETE FROM public.note_receivable WHERE id = ${noteId}`,
                ).catch(() => {})

                const after = await db.query.noteReceivable.findFirst({
                    where: eq(noteReceivable.id, noteId),
                })
                expect(after).toBeDefined() // not deleted
                expect(after!.currentBalance).toBe('500.00') // not updated

                let payThrew = false
                try {
                    await runAsUser(
                        testData.beneficiaryUserId1!,
                        (sql) =>
                            sql`
                            INSERT INTO public.receivable_payment ("receivableId", "paymentDate", amount)
                            VALUES (${noteId}, NOW(), '100.00')
                        `,
                    )
                } catch {
                    payThrew = true
                }
                expect(payThrew).toBe(true)
            } finally {
                await db
                    .delete(receivablePayment)
                    .where(eq(receivablePayment.receivableId, noteId))
                await db
                    .delete(noteReceivable)
                    .where(eq(noteReceivable.id, noteId))
            }
        })
    })
})
