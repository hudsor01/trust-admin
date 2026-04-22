/**
 * One-off migration helper for PR #35: adds
 * `pending_inventory_item.aiServerOverrideReasons` if missing. Applied
 * to both the dev/prod DB (via default DATABASE_URL) and the test branch
 * DB (via NODE_ENV=test which loads .env.test.local). Safe to re-run.
 */
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

const sql = postgres(url, { max: 1, onnotice: () => {} })
try {
    await sql`ALTER TABLE pending_inventory_item ADD COLUMN IF NOT EXISTS "aiServerOverrideReasons" text`
    console.log(
        'OK: aiServerOverrideReasons column ensured on pending_inventory_item',
    )
} catch (err) {
    console.error('FAIL:', err)
    process.exit(2)
} finally {
    await sql.end()
}
