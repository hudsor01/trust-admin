import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!)

console.log('Adding RLS policies for neondb_owner...')

// Tables that need policies (all RLS-enabled tables used in tests)
const tables = [
    'distribution',
    'hems_request',
    'beneficiary',
    'entity',
    'user_profile',
]

// For each table, create CRUD policies for neondb_owner
for (const table of tables) {
    console.log(`\nTable: ${table}`)

    // DROP existing owner policies
    for (const cmd of ['select', 'insert', 'update', 'delete']) {
        await client.unsafe(`DROP POLICY IF EXISTS owner_${cmd} ON ${table}`)
    }

    // Determine the SELECT policy based on table
    let selectUsing: string
    if (table === 'distribution' || table === 'hems_request') {
        selectUsing = `app.is_admin() OR "${table}"."beneficiaryId" = app.get_user_beneficiary_id()`
    } else if (table === 'beneficiary') {
        selectUsing = `app.is_admin() OR beneficiary.id = app.get_user_beneficiary_id()`
    } else {
        // For entity and user_profile, allow all for owner (needed for test setup)
        selectUsing = 'true'
    }

    // SELECT policy with RLS filtering
    await client.unsafe(`
        CREATE POLICY owner_select ON ${table}
        FOR SELECT TO neondb_owner
        USING (${selectUsing})
    `)
    console.log(`  ✓ SELECT`)

    // INSERT policy - allow all for owner (needed for test setup)
    await client.unsafe(`
        CREATE POLICY owner_insert ON ${table}
        FOR INSERT TO neondb_owner
        WITH CHECK (true)
    `)
    console.log(`  ✓ INSERT`)

    // UPDATE policy - allow all for owner
    await client.unsafe(`
        CREATE POLICY owner_update ON ${table}
        FOR UPDATE TO neondb_owner
        USING (true)
        WITH CHECK (true)
    `)
    console.log(`  ✓ UPDATE`)

    // DELETE policy - allow all for owner
    await client.unsafe(`
        CREATE POLICY owner_delete ON ${table}
        FOR DELETE TO neondb_owner
        USING (true)
    `)
    console.log(`  ✓ DELETE`)
}

console.log('\n\nVerifying SELECT policies...')
const policies = await client`
    SELECT tablename, policyname, cmd, qual::text
    FROM pg_policies
    WHERE schemaname = 'public' AND policyname = 'owner_select'
`
for (const p of policies) {
    const qual = p.qual as string
    console.log(`  ${p.tablename}: ${qual.substring(0, 60)}...`)
}

await client.end()
console.log('\nDone')
