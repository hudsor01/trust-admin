import postgres from 'postgres'

// Use a single connection (no pooling) to ensure session state is preserved
const client = postgres(process.env.DATABASE_URL!, { max: 1 })

console.log('=== RLS Debugging ===\n')

// Check current role
const role = await client`SELECT current_user, current_role`
console.log('Connection role:', role[0])

// Check FORCE RLS status
const forceStatus = await client`
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class WHERE relname IN ('distribution', 'hems_request', 'beneficiary')
`
console.log('\nFORCE RLS status:')
for (const t of forceStatus) {
    console.log(
        `  ${t.relname}: rls=${t.relrowsecurity}, force=${t.relforcerowsecurity}`,
    )
}

// Check what policies exist
const policies = await client`
    SELECT tablename, policyname, cmd, roles::text[]
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('distribution', 'hems_request', 'beneficiary')
`
console.log('\nPolicies:')
for (const p of policies) {
    console.log(
        `  ${p.tablename}.${p.policyname}: ${p.cmd} for ${(p.roles as string[]).join(',')}`,
    )
}

console.log('\n--- Test without context ---')
// Clear any existing test context first
await client`SELECT app.clear_test_user()`
const distNoCtx = await client`SELECT COUNT(*)::int as cnt FROM distribution`
console.log('Distributions visible (no context):', distNoCtx[0]?.cnt)

// First, find an actual beneficiary that exists in the database
// We need to bypass RLS to do this, so let's check what exists
console.log('\n--- Finding existing data (as admin) ---')
const testAdminId = 'debug-admin-' + Date.now()
await client`
    INSERT INTO user_profile (user_id, role, beneficiary_id)
    VALUES (${testAdminId}, 'admin', NULL)
`
await client`SELECT app.set_test_user(${testAdminId})`

// Check admin access
const adminDistCount =
    await client`SELECT COUNT(*)::int as cnt FROM distribution`
console.log('Distributions visible (as admin):', adminDistCount[0]?.cnt)

const adminBenCount = await client`SELECT COUNT(*)::int as cnt FROM beneficiary`
console.log('Beneficiaries visible (as admin):', adminBenCount[0]?.cnt)

// Get the first beneficiary ID that has distributions
const existingBen = await client`
    SELECT DISTINCT b.id, b."firstName", b."lastName"
    FROM beneficiary b
    JOIN distribution d ON d."beneficiaryId" = b.id
    LIMIT 2
`
console.log('Beneficiaries with distributions:', existingBen)

if (existingBen.length === 0) {
    console.log('No beneficiaries with distributions found!')
    await client`DELETE FROM user_profile WHERE user_id = ${testAdminId}`
    await client.end()
    process.exit(1)
}

const testBenId = existingBen[0]?.id
console.log('\nUsing beneficiary ID:', testBenId)

// Now test as that beneficiary
await client`SELECT app.clear_test_user()`
await client`DELETE FROM user_profile WHERE user_id = ${testAdminId}`

const testUserId = 'debug-ben-' + Date.now()
console.log('\n--- Creating test beneficiary user ---')
await client`
    INSERT INTO user_profile (user_id, role, beneficiary_id)
    VALUES (${testUserId}, 'beneficiary', ${testBenId})
`

// Set the test user context
await client`SELECT app.set_test_user(${testUserId})`

// Verify the context is set
const effectiveUser = await client`SELECT app.effective_user_id() as uid`
console.log('app.effective_user_id():', effectiveUser[0]?.uid)

const checkBenId = await client`SELECT app.get_user_beneficiary_id() as ben_id`
console.log('app.get_user_beneficiary_id():', checkBenId[0]?.ben_id)

const checkIsAdmin = await client`SELECT app.is_admin() as is_admin`
console.log('app.is_admin():', checkIsAdmin[0]?.is_admin)

// Query distribution as beneficiary
console.log('\n--- Query as beneficiary ---')
const distWithCtx = await client`SELECT id, "beneficiaryId" FROM distribution`
console.log('Distributions visible:', distWithCtx.length)
if (distWithCtx.length > 0) {
    console.log(
        '  beneficiaryIds:',
        distWithCtx.map((d) => d.beneficiaryId),
    )
}

// Query beneficiary table as beneficiary
const benWithCtx =
    await client`SELECT id, "firstName", "lastName" FROM beneficiary`
console.log('\nBeneficiaries visible:', benWithCtx.length)
if (benWithCtx.length > 0) {
    console.log(
        '  Records:',
        benWithCtx.map((b) => `${b.id}: ${b.firstName} ${b.lastName}`),
    )
}

// Clean up
await client`SELECT app.clear_test_user()`
await client`DELETE FROM user_profile WHERE user_id = ${testUserId}`

await client.end()
console.log('\nDone')
