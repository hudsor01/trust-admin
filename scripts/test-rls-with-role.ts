import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })

// Reset any lingering role from previous runs (Neon connection pooling)
await client.unsafe('RESET ROLE')

console.log('Testing RLS with SET ROLE authenticated...')
console.log(
    '(neondb_owner has BYPASSRLS=true, so we must switch to authenticated role)\n',
)

// Create test data (as neondb_owner - has full access)
const [entity] = await client`
    INSERT INTO entity (name, "entityType", "trustType", status, "updatedAt")
    VALUES ('Role Test Trust', 'TRUST', 'IRREVOCABLE', 'ACTIVE', NOW())
    RETURNING id
`
const entityId = entity.id

const [ben1] = await client`
    INSERT INTO beneficiary ("entityId", "firstName", "lastName", relationship, "sharePercent", "updatedAt")
    VALUES (${entityId}, 'Role', 'Ben One', 'CHILD', '50.00', NOW())
    RETURNING id
`
const [ben2] = await client`
    INSERT INTO beneficiary ("entityId", "firstName", "lastName", relationship, "sharePercent", "updatedAt")
    VALUES (${entityId}, 'Role', 'Ben Two', 'CHILD', '50.00', NOW())
    RETURNING id
`

const userId1 = 'role-test-user-1'
const userId2 = 'role-test-user-2'
await client`
    INSERT INTO user_profile (user_id, role, beneficiary_id)
    VALUES (${userId1}, 'beneficiary', ${ben1.id})
`
await client`
    INSERT INTO user_profile (user_id, role, beneficiary_id)
    VALUES (${userId2}, 'beneficiary', ${ben2.id})
`

await client`
    INSERT INTO distribution ("entityId", "beneficiaryId", "distributionType", amount, "paymentMethod", "distributionDate", "updatedAt")
    VALUES (${entityId}, ${ben1.id}, 'INCOME', '1000.00', 'CHECK', '2025-01-01', NOW())
`
await client`
    INSERT INTO distribution ("entityId", "beneficiaryId", "distributionType", amount, "paymentMethod", "distributionDate", "updatedAt")
    VALUES (${entityId}, ${ben2.id}, 'INCOME', '2000.00', 'CHECK', '2025-01-01', NOW())
`

console.log('Test data created:')
console.log(`  Ben1 ID: ${ben1.id} (user: ${userId1})`)
console.log(`  Ben2 ID: ${ben2.id} (user: ${userId2})`)

// Test as user 1 (should only see ben1's distribution)
console.log('\n--- Test as User 1 (Ben1) ---')
await client.begin(async (sql) => {
    // Switch to authenticated role (no BYPASSRLS)
    await sql.unsafe('SET ROLE authenticated')

    // Ensure search_path includes public
    await sql.unsafe('SET search_path TO public, app')

    // Set user context
    await sql`SELECT app.set_test_user(${userId1})`

    // Verify context
    const benId = await sql`SELECT app.get_user_beneficiary_id() as ben_id`
    console.log(`get_user_beneficiary_id(): ${benId[0]?.ben_id}`)

    // Query distributions - should only see ben1's
    const dists =
        await sql`SELECT id, "beneficiaryId", amount FROM public.distribution WHERE "entityId" = ${entityId}`
    console.log(`Distributions visible: ${dists.length}`)
    for (const d of dists) {
        console.log(`  beneficiaryId: ${d.beneficiaryId}, amount: ${d.amount}`)
    }

    if (dists.length === 1 && dists[0].beneficiaryId === ben1.id) {
        console.log('✓ PASS: User 1 only sees their own distribution')
    } else {
        console.log('✗ FAIL: User 1 can see other distributions!')
    }
})

// Test as user 2 (should only see ben2's distribution)
console.log('\n--- Test as User 2 (Ben2) ---')
await client.begin(async (sql) => {
    await sql.unsafe('SET ROLE authenticated')
    await sql.unsafe('SET search_path TO public, app')
    await sql`SELECT app.set_test_user(${userId2})`

    const benId = await sql`SELECT app.get_user_beneficiary_id() as ben_id`
    console.log(`get_user_beneficiary_id(): ${benId[0]?.ben_id}`)

    const dists =
        await sql`SELECT id, "beneficiaryId", amount FROM public.distribution WHERE "entityId" = ${entityId}`
    console.log(`Distributions visible: ${dists.length}`)
    for (const d of dists) {
        console.log(`  beneficiaryId: ${d.beneficiaryId}, amount: ${d.amount}`)
    }

    if (dists.length === 1 && dists[0].beneficiaryId === ben2.id) {
        console.log('✓ PASS: User 2 only sees their own distribution')
    } else {
        console.log('✗ FAIL: User 2 can see other distributions!')
    }
})

// Test cross-access attempt (user 1 trying to access ben2's data directly)
console.log('\n--- Test Cross-Access: User 1 trying to access Ben2 data ---')
await client.begin(async (sql) => {
    await sql.unsafe('SET ROLE authenticated')
    await sql.unsafe('SET search_path TO public, app')
    await sql`SELECT app.set_test_user(${userId1})`

    // Try to directly query ben2's distribution
    const dists =
        await sql`SELECT id, "beneficiaryId", amount FROM public.distribution WHERE "beneficiaryId" = ${ben2.id}`
    console.log(`Distributions matching ben2 query: ${dists.length}`)

    if (dists.length === 0) {
        console.log(
            '✓ PASS: User 1 cannot access Ben2 data even with direct query',
        )
    } else {
        console.log('✗ FAIL: User 1 can access Ben2 data!')
    }
})

// Cleanup (as neondb_owner - need to reset role first)
console.log('\n--- Cleanup ---')
await client.unsafe('RESET ROLE')
await client`SELECT app.clear_test_user()`
await client`DELETE FROM distribution WHERE "entityId" = ${entityId}`
await client`DELETE FROM user_profile WHERE user_id IN (${userId1}, ${userId2})`
await client`DELETE FROM beneficiary WHERE "entityId" = ${entityId}`
await client`DELETE FROM entity WHERE id = ${entityId}`

await client.end()
console.log('Done')
