/**
 * Simulates applying the full migration sequence to a fresh DB by
 * creating a temporary database on the same Neon endpoint, applying all
 * migrations, verifying the table count matches dev, and dropping it.
 *
 * Requires CREATEDB privileges on the DATABASE_URL user.
 */
import { randomBytes } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

const targetDbName = `trust_bootstrap_test_${randomBytes(4).toString('hex')}`
console.log(`Creating fresh target DB: ${targetDbName}`)

// Connect to postgres using the default DB (neondb) to issue CREATE DATABASE
const parsedUrl = new URL(url)
parsedUrl.pathname = '/neondb'
const adminSql = postgres(parsedUrl.toString(), { max: 1, onnotice: () => {} })

try {
    await adminSql.unsafe(`CREATE DATABASE "${targetDbName}"`)
} catch (err) {
    console.error('CREATE DATABASE failed:', err)
    await adminSql.end()
    process.exit(2)
}
await adminSql.end()

// Now connect to the fresh DB
parsedUrl.pathname = `/${targetDbName}`
const freshSql = postgres(parsedUrl.toString(), { max: 1, onnotice: () => {} })

try {
    const drizzleDir = join(import.meta.dir, '..', 'drizzle')
    const files = readdirSync(drizzleDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()

    let fails = 0
    for (const f of files) {
        const text = readFileSync(join(drizzleDir, f), 'utf8')
        const statements = text
            .split('--> statement-breakpoint')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .filter(
                (s) =>
                    !s
                        .split('\n')
                        .every((l) => l.startsWith('--') || !l.trim()),
            )
        console.log(`[${f}] ${statements.length} statements`)
        for (let i = 0; i < statements.length; i++) {
            try {
                await freshSql.unsafe(statements[i]!)
            } catch (err) {
                fails++
                const head = statements[i]!.split('\n')
                    .slice(0, 2)
                    .join(' ')
                    .slice(0, 120)
                console.error(
                    `  FAIL [${head}]:`,
                    err instanceof Error ? err.message : err,
                )
                if (fails > 10) throw new Error('too many failures')
            }
        }
    }

    // Sanity check: count public tables
    const tables = await freshSql`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `
    console.log(`\nFresh DB has ${tables.length} public tables:`)
    for (const t of tables) console.log(' -', t.tablename)

    if (fails === 0 && tables.length >= 35) {
        console.log(`\nOK — fresh DB bootstraps cleanly`)
    } else {
        console.log(
            `\nFAIL — ${fails} errors, ${tables.length} tables (expected >=35)`,
        )
        process.exitCode = 2
    }
} finally {
    await freshSql.end({ timeout: 2 })

    parsedUrl.pathname = '/neondb'
    const dropSql = postgres(parsedUrl.toString(), {
        max: 1,
        onnotice: () => {},
    })
    try {
        // WITH (FORCE) terminates any lingering connections to the target
        // DB (Postgres 13+). Without it, Neon's pooler sometimes keeps the
        // session alive for a few seconds past .end() and DROP DATABASE
        // 55006-errors with "is being accessed by other users".
        await dropSql.unsafe(
            `DROP DATABASE IF EXISTS "${targetDbName}" WITH (FORCE)`,
        )
        console.log(`\nDropped ${targetDbName}`)
    } catch (err) {
        console.error(`Failed to drop ${targetDbName}:`, err)
    }
    await dropSql.end()
}
