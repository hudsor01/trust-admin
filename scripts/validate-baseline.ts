import { readFileSync } from 'node:fs'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

const baselineSql = readFileSync(process.argv[2], 'utf8')

// Split on drizzle's statement breakpoint, drop comment-only chunks
const statements = baselineSql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !s.split('\n').every((l) => l.startsWith('--') || !l.trim()))

console.log(`Validating ${statements.length} statements against existing DB`)

const sql = postgres(url, { max: 1, onnotice: () => {} })
let failures = 0
for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]!
    const head = stmt.split('\n').slice(0, 2).join(' ').slice(0, 100)
    try {
        await sql.unsafe(stmt)
    } catch (err) {
        failures++
        console.error(
            `FAIL #${i} [${head}]:`,
            err instanceof Error ? err.message : err,
        )
        if (failures > 10) {
            console.error('Too many failures, aborting')
            break
        }
    }
}
await sql.end()
console.log(
    failures === 0
        ? `OK — ${statements.length} statements applied idempotently`
        : `FAIL — ${failures} of ${statements.length} statements errored`,
)
process.exit(failures === 0 ? 0 : 2)
