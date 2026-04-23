/**
 * One-off migration applier for drizzle/0006_drop_pending_and_artwork.sql.
 * Idempotent — guarded with IF EXISTS / IF NOT EXISTS.
 */
import { readFileSync } from 'node:fs'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

const sqlText = readFileSync(
    '/Users/richard/Developer/trust-admin/drizzle/0006_drop_pending_and_artwork.sql',
    'utf8',
)

const statements = sqlText
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !s.split('\n').every((l) => l.startsWith('--') || !l.trim()))

const sql = postgres(url, { max: 1, onnotice: () => {} })
let failures = 0
for (let i = 0; i < statements.length; i++) {
    try {
        await sql.unsafe(statements[i]!)
    } catch (err) {
        failures++
        const head = statements[i]!.split('\n')
            .slice(0, 2)
            .join(' ')
            .slice(0, 100)
        console.error(
            `FAIL [${head}]:`,
            err instanceof Error ? err.message : err,
        )
    }
}
await sql.end()
console.log(
    failures === 0
        ? `OK — ${statements.length} statements applied`
        : `FAIL — ${failures} of ${statements.length} errored`,
)
process.exit(failures === 0 ? 0 : 2)
