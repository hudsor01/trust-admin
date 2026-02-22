/**
 * Add neondb_owner bypass policies to all 17 newly-RLS-protected tables.
 *
 * Background:
 * - neondb_owner has BYPASSRLS=true, so it can see all data without explicit policies.
 * - However, tests that use SET ROLE authenticated + app.set_test_user() need these
 *   owner policies for seed/cleanup operations that still run as neondb_owner.
 * - This script is idempotent: it drops existing owner_* policies before recreating them.
 *
 * Tables covered (17 new + restoring 5 tables that had owner_* policies dropped by db:push):
 * - 17 new admin-only tables
 * - entity, beneficiary, distribution, hems_request, user_profile (had owner_* in original migration)
 *
 * Run: bun scripts/add-owner-rls-policies.ts
 */

import { getClient } from '../db/index.ts'

const client = getClient()

// All 17 new tables that got RLS in phase 53
const newAdminOnlyTables = [
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
]

// specific_bequest has beneficiary-filtered SELECT — owner still gets full access for setup
const specificBequestTable = 'specific_bequest'

// Tables that already had owner_* policies in the original migration but were dropped by db:push
const restoredTables = [
    'entity',
    'beneficiary',
    'distribution',
    'hems_request',
    'user_profile',
]

async function dropOwnerPolicies(tableName: string): Promise<void> {
    const policyNames = [
        'owner_select',
        'owner_insert',
        'owner_update',
        'owner_delete',
    ]
    for (const policy of policyNames) {
        await client.unsafe(
            `DROP POLICY IF EXISTS "${policy}" ON "${tableName}" CASCADE`,
        )
    }
}

async function addOwnerPoliciesForAdminTable(tableName: string): Promise<void> {
    await dropOwnerPolicies(tableName)
    await client.unsafe(
        `CREATE POLICY owner_select ON "${tableName}" AS PERMISSIVE FOR SELECT TO neondb_owner USING (true)`,
    )
    await client.unsafe(
        `CREATE POLICY owner_insert ON "${tableName}" AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true)`,
    )
    await client.unsafe(
        `CREATE POLICY owner_update ON "${tableName}" AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true)`,
    )
    await client.unsafe(
        `CREATE POLICY owner_delete ON "${tableName}" AS PERMISSIVE FOR DELETE TO neondb_owner USING (true)`,
    )
    console.log(`✓ Added owner policies to ${tableName}`)
}

async function addUserProfileOwnerPolicies(): Promise<void> {
    await dropOwnerPolicies('user_profile')
    // user_profile owner policies: all access
    await client.unsafe(
        `CREATE POLICY owner_select ON "user_profile" AS PERMISSIVE FOR SELECT TO neondb_owner USING (true)`,
    )
    await client.unsafe(
        `CREATE POLICY owner_insert ON "user_profile" AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true)`,
    )
    await client.unsafe(
        `CREATE POLICY owner_update ON "user_profile" AS PERMISSIVE FOR UPDATE TO neondb_owner USING (true) WITH CHECK (true)`,
    )
    await client.unsafe(
        `CREATE POLICY owner_delete ON "user_profile" AS PERMISSIVE FOR DELETE TO neondb_owner USING (true)`,
    )
    console.log('✓ Added owner policies to user_profile')
}

// Main execution
console.log('Adding neondb_owner bypass policies...\n')

// Add policies to all 17 new admin-only tables
for (const table of newAdminOnlyTables) {
    await addOwnerPoliciesForAdminTable(table)
}

// specific_bequest: owner gets full access (for test setup)
await addOwnerPoliciesForAdminTable(specificBequestTable)

// Restore owner policies to tables that had them in original migration
// (they were dropped by db:push when we added the new pgPolicy definitions)
for (const table of restoredTables) {
    if (table === 'user_profile') {
        await addUserProfileOwnerPolicies()
    } else {
        await addOwnerPoliciesForAdminTable(table)
    }
}

// Verify count
const result = await client`
    SELECT COUNT(*)::int as count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND roles::text = '{neondb_owner}'
    AND policyname LIKE 'owner_%'
`
console.log(`\nTotal neondb_owner policies: ${result[0].count}`)
console.log('Done!')
process.exit(0)
