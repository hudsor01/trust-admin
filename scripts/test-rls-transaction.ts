import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })

console.log('Testing RLS with explicit transaction...')

// Create test data (outside transaction)
const [entity] = await client`
    INSERT INTO entity (name, "entityType", "trustType", status, "updatedAt")
    VALUES ('TX Test Trust', 'TRUST', 'IRREVOCABLE', 'ACTIVE', NOW())
    RETURNING id
`
const entityId = entity.id

const [ben1] = await client`
    INSERT INTO beneficiary ("entityId", "firstName", "lastName", relationship, "sharePercent", "updatedAt")
    VALUES (${entityId}, 'TX', 'Ben One', 'CHILD', '50.00', NOW())
    RETURNING id
`
const [ben2] = await client`
    INSERT INTO beneficiary ("entityId", "firstName", "lastName", relationship, "sharePercent", "updatedAt")
    VALUES (${entityId}, 'TX', 'Ben Two', 'CHILD', '50.00', NOW())
    RETURNING id
`

const userId = 'tx-test-user'
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

console.log('Test data: Ben1 ID:', ben1.id, ', Ben2 ID:', ben2.id)

// Update policy to use simpler condition
await client.unsafe(`DROP POLICY IF EXISTS owner_select ON distribution`)
await client.unsafe(`
    CREATE POLICY owner_select ON distribution
    FOR SELECT TO neondb_owner
    USING (distribution."beneficiaryId" = app.get_user_beneficiary_id())
`)

// Run test within a single transaction to ensure same session
console.log('\n--- Testing within explicit transaction ---')

await client.begin(async (sql) => {
    // Set user context within transaction
    await sql`SELECT app.set_test_user(${userId})`

    // Verify within transaction
    const setting =
        await sql`SELECT current_setting('app.test_user_id', true) as val`
    console.log('test_user_id in tx:', setting[0]?.val)

    const benId = await sql`SELECT app.get_user_beneficiary_id() as ben_id`
    console.log('get_user_beneficiary_id in tx:', benId[0]?.ben_id)

    // Query distributions within same transaction
    const dists =
        await sql`SELECT id, "beneficiaryId" FROM distribution WHERE "entityId" = ${entityId}`
    console.log('\nDistributions visible:', dists.length)
    for (const d of dists) {
        console.log('  beneficiaryId:', d.beneficiaryId)
    }
})

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

await client.end()
console.log('\nDone')
