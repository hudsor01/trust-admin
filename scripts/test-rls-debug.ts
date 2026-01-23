import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })

console.log('Deep debugging RLS policy evaluation...')

// First, check the exact state of the current_setting within the policy context
// by using a debug function

// Create a debug function that logs when called
await client.unsafe(`
    CREATE OR REPLACE FUNCTION debug_rls_check(row_ben_id bigint)
    RETURNS boolean
    LANGUAGE plpgsql
    AS $$
    DECLARE
        test_user text;
        user_ben_id bigint;
        result boolean;
    BEGIN
        test_user := current_setting('app.test_user_id', true);
        user_ben_id := app.get_user_beneficiary_id();
        result := (row_ben_id = user_ben_id);

        RAISE NOTICE 'debug_rls_check: row_ben_id=%, test_user=%, user_ben_id=%, result=%',
            row_ben_id, test_user, user_ben_id, result;

        RETURN result;
    END;
    $$;
`)
console.log('Created debug_rls_check function')

// Create a policy that uses this debug function
await client.unsafe(`DROP POLICY IF EXISTS owner_select ON distribution`)
await client.unsafe(`
    CREATE POLICY owner_select ON distribution
    FOR SELECT TO neondb_owner
    USING (debug_rls_check(distribution."beneficiaryId"))
`)
console.log('Policy uses debug_rls_check')

// Create test data
const [entity] = await client`
    INSERT INTO entity (name, "entityType", "trustType", status, "updatedAt")
    VALUES ('Debug Test Trust', 'TRUST', 'IRREVOCABLE', 'ACTIVE', NOW())
    RETURNING id
`
const entityId = entity.id

const [ben1] = await client`
    INSERT INTO beneficiary ("entityId", "firstName", "lastName", relationship, "sharePercent", "updatedAt")
    VALUES (${entityId}, 'Debug', 'Ben One', 'CHILD', '50.00', NOW())
    RETURNING id
`
const [ben2] = await client`
    INSERT INTO beneficiary ("entityId", "firstName", "lastName", relationship, "sharePercent", "updatedAt")
    VALUES (${entityId}, 'Debug', 'Ben Two', 'CHILD', '50.00', NOW())
    RETURNING id
`

const userId = 'debug-test-user'
await client`
    INSERT INTO user_profile (user_id, role, beneficiary_id)
    VALUES (${userId}, 'beneficiary', ${ben1.id})
`

await client`
    INSERT INTO distribution ("entityId", "beneficiaryId", "distributionType", amount, "paymentMethod", "distributionDate", "updatedAt")
    VALUES (${entityId}, ${ben1.id}, 'INCOME', '1000.00', 'CHECK', '2025-01-01', NOW())
`
await client`
    INSERT INTO distribution ("entityId", "beneficiaryId", "distributionType", amount, "paymentMethod", "distributionDate", "updatedAt")
    VALUES (${entityId}, ${ben2.id}, 'INCOME', '2000.00', 'CHECK', '2025-01-01', NOW())
`

console.log('\nTest data: Ben1 ID:', ben1.id, ', Ben2 ID:', ben2.id)

// Set test user context
await client`SELECT app.set_test_user(${userId})`

// Before query, check the setting
const setting =
    await client`SELECT current_setting('app.test_user_id', true) as val`
console.log('current_setting before query:', setting[0]?.val)

// Query - the debug function should log info for each row evaluated
console.log('\nQuerying (check server logs for debug output)...')
const dists =
    await client`SELECT id, "beneficiaryId" FROM distribution WHERE "entityId" = ${entityId}`
console.log('Distributions visible:', dists.length)
for (const d of dists) {
    console.log('  beneficiaryId:', d.beneficiaryId)
}

// Cleanup
await client`SELECT app.clear_test_user()`
await client`DELETE FROM distribution WHERE "entityId" = ${entityId}`
await client`DELETE FROM user_profile WHERE user_id = ${userId}`
await client`DELETE FROM beneficiary WHERE "entityId" = ${entityId}`
await client`DELETE FROM entity WHERE id = ${entityId}`

// Restore original policy
await client.unsafe(`DROP POLICY IF EXISTS owner_select ON distribution`)
await client.unsafe(`
    CREATE POLICY owner_select ON distribution
    FOR SELECT TO neondb_owner
    USING (app.is_admin() OR distribution."beneficiaryId" = app.get_user_beneficiary_id())
`)

// Drop debug function
await client.unsafe(`DROP FUNCTION IF EXISTS debug_rls_check`)

await client.end()
console.log('\nDone')
