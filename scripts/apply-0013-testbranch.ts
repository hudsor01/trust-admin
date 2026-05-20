/**
 * One-off: apply migration 0013 (KPI schema completeness) to the test-branch
 * DB so plan 26-02's tRPC tests pass. Uses postgres.js (transaction) per the
 * CLAUDE.md/MEMORY rule — getSql() (Neon HTTP) reports DDL as success even
 * when nothing persists. Idempotent: ADD COLUMN / CREATE INDEX use IF NOT
 * EXISTS; FK ADD CONSTRAINT is wrapped so a re-run after a partial apply
 * does not error.
 */
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

const sql = postgres(url, { max: 1 })

try {
    await sql.begin(async (tx) => {
        await tx`ALTER TABLE "liability" ADD COLUMN IF NOT EXISTS "bankAccountId" bigint`
        await tx`ALTER TABLE "liability" ADD COLUMN IF NOT EXISTS "investmentAccountId" bigint`
        await tx`ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "insured" boolean DEFAULT false NOT NULL`
        await tx`ALTER TABLE "specific_bequest" ADD COLUMN IF NOT EXISTS "estimatedValue" numeric(14, 2)`
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'liability_bank_account_id_fkey'
                ) THEN
                    ALTER TABLE "liability" ADD CONSTRAINT "liability_bank_account_id_fkey"
                        FOREIGN KEY ("bankAccountId") REFERENCES "public"."bank_account"("id")
                        ON DELETE set null ON UPDATE cascade;
                END IF;
            END $$
        `
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'liability_investment_account_id_fkey'
                ) THEN
                    ALTER TABLE "liability" ADD CONSTRAINT "liability_investment_account_id_fkey"
                        FOREIGN KEY ("investmentAccountId") REFERENCES "public"."investment_account"("id")
                        ON DELETE set null ON UPDATE cascade;
                END IF;
            END $$
        `
        await tx`CREATE INDEX IF NOT EXISTS "idx_liability_bank_account_id" ON "liability" USING btree ("bankAccountId")`
        await tx`CREATE INDEX IF NOT EXISTS "idx_liability_investment_account_id" ON "liability" USING btree ("investmentAccountId")`
    })

    const rows = await sql`
        SELECT table_name, column_name FROM information_schema.columns
        WHERE (table_name = 'specific_bequest' AND column_name = 'estimatedValue')
           OR (table_name = 'personal_property' AND column_name = 'insured')
           OR (table_name = 'liability' AND column_name IN ('bankAccountId', 'investmentAccountId'))
    `
    if (rows.length !== 4) {
        console.error('MISSING COLUMNS on test branch — got', rows)
        process.exit(1)
    }
    console.log(
        'OK — test branch has all 4 columns',
        rows.map((r) => `${r.table_name}.${r.column_name}`),
    )
} finally {
    await sql.end()
}
