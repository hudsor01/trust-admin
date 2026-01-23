import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })

console.log('Testing with simplified policy...')

// Drop and recreate the owner_select policy with STRICT filtering
// Use (SELECT ...) pattern like the authenticated policies do
await client.unsafe(`DROP POLICY IF EXISTS owner_select ON distribution`)
await client.unsafe(`
    CREATE POLICY owner_select ON distribution
    FOR SELECT TO neondb_owner
    USING ((SELECT distribution."beneficiaryId" = app.get_user_beneficiary_id()))
`)

console.log(
    'Policy updated to: USING ((SELECT distribution."beneficiaryId" = app.get_user_beneficiary_id()))',
)

// Create test data
const [entity] = await client`
    INSERT INTO entity (name, "entityType", "trustType", status, "updatedAt")
    VALUES ('Strict Test Trust', 'TRUST', 'IRREVOCABLE', 'ACTIVE', NOW())
    RETURNING id
`
const entityId = entity.id

// Create beneficiaries
const [ben1] = await client`
    INSERT INTO beneficiary ("entityId", "firstName", "lastName", relationship, "sharePercent", "updatedAt")
    VALUES (${entityId}, 'Strict', 'Ben One', 'CHILD', '50.00', NOW())
    RETURNING id
`
const [ben2] = await client`
    INSERT INTO beneficiary ("entityId", "firstName", "lastName", relationship, "sharePercent", "updatedAt")
    VALUES (${entityId}, 'Strict', 'Ben Two', 'CHILD', '50.00', NOW())
    RETURNING id
`

// Create user profile
const userId = 'strict-test-user'
await client`
    INSERT INTO user_profile (user_id, role, beneficiary_id)
    VALUES (${userId}, 'beneficiary', ${ben1.id})
`

// Create distributions
await client`
    INSERT INTO distribution ("entityId", "beneficiaryId", "distributionType", amount, "paymentMethod", "distributionDate", "updatedAt")
    VALUES (${entityId}, ${ben1.id}, 'INCOME', '1000.00', 'CHECK', '2025-01-01', NOW())
`
await client`
    INSERT INTO distribution ("entityId", "beneficiaryId", "distributionType", amount, "paymentMethod", "distributionDate", "updatedAt")
    VALUES (${entityId}, ${ben2.id}, 'INCOME', '2000.00', 'CHECK', '2025-01-01', NOW())
`

console.log('Test data created. Ben1 ID:', ben1.id, ', Ben2 ID:', ben2.id)

// Set test user context
await client`SELECT app.set_test_user(${userId})`

// Verify context
const benId = await client`SELECT app.get_user_beneficiary_id() as ben_id`
console.log('\nget_user_beneficiary_id():', benId[0]?.ben_id)

// Query distributions
const dists =
    await client`SELECT id, "beneficiaryId" FROM distribution WHERE "entityId" = ${entityId}`
console.log('\nDistributions visible:', dists.length)
for (const d of dists) {
    console.log('  beneficiaryId:', d.beneficiaryId)
}

// Cleanup
await client`SELECT app.clear_test_user()`
await client`DELETE FROM distribution WHERE "entityId" = ${entityId}`
await client`DELETE FROM user_profile WHERE user_id = ${userId}`
await client`DELETE FROM beneficiary WHERE "entityId" = ${entityId}`
await client`DELETE FROM entity WHERE id = ${entityId}`

// Restore the original policy
await client.unsafe(`DROP POLICY IF EXISTS owner_select ON distribution`)
await client.unsafe(`
    CREATE POLICY owner_select ON distribution
    FOR SELECT TO neondb_owner
    USING (app.is_admin() OR distribution."beneficiaryId" = app.get_user_beneficiary_id())
`)

await client.end()
console.log('\nDone')
