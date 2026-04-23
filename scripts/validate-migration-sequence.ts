/**
 * Applies every drizzle/*.sql migration in journal order against the
 * DATABASE_URL, confirming idempotent re-application. For the C1
 * fresh-branch migrate fix: the 0000 baseline should cover all schema
 * state, and subsequent migrations should apply as no-ops or via
 * IF NOT EXISTS guards.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

const drizzleDir = join(import.meta.dir, '..', 'drizzle')
const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

console.log(`Applying ${files.length} migrations in order:`)
for (const f of files) console.log(' -', f)

const sql = postgres(url, { max: 1, onnotice: () => {} })
let totalStatements = 0
let failures = 0

for (const f of files) {
    const text = readFileSync(join(drizzleDir, f), 'utf8')
    const statements = text
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .filter(
            (s) => !s.split('\n').every((l) => l.startsWith('--') || !l.trim()),
        )
    console.log(`\n[${f}] ${statements.length} statements`)
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]!
        totalStatements++
        try {
            await sql.unsafe(stmt)
        } catch (err) {
            failures++
            const head = stmt.split('\n').slice(0, 2).join(' ').slice(0, 120)
            console.error(
                `  FAIL [${head}]:`,
                err instanceof Error ? err.message : err,
            )
            if (failures > 10) {
                console.error('Too many failures, aborting')
                await sql.end()
                process.exit(2)
            }
        }
    }
}

await sql.end()
console.log(
    failures === 0
        ? `\nOK — ${totalStatements} statements applied idempotently across ${files.length} migrations`
        : `\nFAIL — ${failures} of ${totalStatements} statements errored`,
)
process.exit(failures === 0 ? 0 : 2)
