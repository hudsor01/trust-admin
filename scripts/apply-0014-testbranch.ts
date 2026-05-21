/**
 * One-off: apply migration 0014 (firearm asset class + document/valuation
 * firearmId FKs) to the test-branch DB so Phase 29's firearm-router tests pass.
 * Uses postgres.js (transaction) per CLAUDE.md/MEMORY: getSql() (Neon HTTP)
 * reports DDL as success even when nothing persists. Idempotent: CREATE TYPE,
 * CREATE TABLE, ADD COLUMN, CREATE INDEX, ADD CONSTRAINT, CREATE POLICY all
 * guarded so a re-run after a partial apply does not error.
 */
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
}

// Defense-in-depth (IN-01): this script applies DDL and must only ever touch a
// Neon test branch, never production. Mirror tests/helpers/db-guard.ts — a
// pooled URL with no branch ref ("/br-") is production. ALLOW_PRODUCTION_DB
// is the explicit, deliberate escape hatch.
const isProductionDb =
    url.includes('-pooler.') &&
    !url.includes('/br-') &&
    !process.env.ALLOW_PRODUCTION_DB
if (isProductionDb) {
    console.error(
        'Refusing to run: DATABASE_URL points at the production database. ' +
            'Use a Neon test-branch URL (.env.test.local), or set ' +
            'ALLOW_PRODUCTION_DB=1 to override deliberately.',
    )
    process.exit(1)
}

const sql = postgres(url, { max: 1 })

try {
    await sql.begin(async (tx) => {
        // 5 new enums — DO $$ EXCEPTION guard so re-runs don't error.
        await tx`
            DO $$ BEGIN
                CREATE TYPE "public"."FirearmType" AS ENUM(
                    'PISTOL', 'REVOLVER', 'RIFLE', 'SHOTGUN',
                    'SUPPRESSOR', 'SBR', 'SBS', 'MACHINE_GUN',
                    'AOW', 'DESTRUCTIVE_DEVICE', 'OTHER'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$
        `
        await tx`
            DO $$ BEGIN
                CREATE TYPE "public"."NfaClass" AS ENUM(
                    'SUPPRESSOR', 'SBR', 'SBS',
                    'MACHINE_GUN', 'AOW', 'DESTRUCTIVE_DEVICE'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$
        `
        await tx`
            DO $$ BEGIN
                CREATE TYPE "public"."AtfFormType" AS ENUM('FORM_1', 'FORM_4', 'FORM_5');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$
        `
        await tx`
            DO $$ BEGIN
                CREATE TYPE "public"."FirearmCondition" AS ENUM(
                    'POOR', 'FAIR', 'GOOD', 'VERY_GOOD', 'EXCELLENT', 'NEW'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$
        `
        await tx`
            DO $$ BEGIN
                CREATE TYPE "public"."NfaTransferStatus" AS ENUM(
                    'NOT_FILED', 'FILED', 'APPROVED'
                );
            EXCEPTION WHEN duplicate_object THEN null;
            END $$
        `

        // firearm table — IF NOT EXISTS keeps re-runs idempotent.
        await tx`
            CREATE TABLE IF NOT EXISTS "firearm" (
                "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (
                    sequence name "firearm_id_seq" INCREMENT BY 1
                    MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1
                ),
                "entityId" bigint NOT NULL,
                "name" text NOT NULL,
                "description" text,
                "make" text NOT NULL,
                "model" text NOT NULL,
                "serialNumber" text NOT NULL,
                "firearmType" "FirearmType" NOT NULL,
                "caliber" text,
                "barrelLength" numeric(6, 2),
                "isNfa" boolean DEFAULT false NOT NULL,
                "nfaClass" "NfaClass",
                "atfFormType" "AtfFormType",
                "atfControlNumber" text,
                "taxStampDate" timestamp(3) with time zone,
                "nfrtrSerial" text,
                "nfaRegistered" boolean,
                "nfaTransferStatus" "NfaTransferStatus",
                "acquisitionDate" timestamp(3) with time zone,
                "acquisitionCost" numeric(12, 2),
                "dodValue" numeric(14, 2),
                "dodValueDate" timestamp(3) with time zone,
                "dodValueType" "ValuationType",
                "condition" "FirearmCondition" DEFAULT 'GOOD' NOT NULL,
                "action" text,
                "status" "RecordStatus" DEFAULT 'ACTIVE' NOT NULL,
                "transferStatus" "TransferStatus" DEFAULT 'PENDING' NOT NULL,
                "location" text,
                "insured" boolean DEFAULT false NOT NULL,
                "notes" text,
                "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
                "updatedAt" timestamp(3) with time zone NOT NULL,
                CONSTRAINT "firearm_nfa_class_required_check" CHECK (
                    ("firearm"."isNfa" = false OR "firearm"."nfaClass" IS NOT NULL)
                )
            )
        `
        await tx`ALTER TABLE "firearm" ENABLE ROW LEVEL SECURITY`

        // document.firearmId / valuation.firearmId polymorphic FKs.
        await tx`ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "firearmId" bigint`
        await tx`ALTER TABLE "valuation" ADD COLUMN IF NOT EXISTS "firearmId" bigint`

        // FK constraints — DO $$ IF NOT EXISTS guards.
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'firearm_entity_id_fkey'
                ) THEN
                    ALTER TABLE "firearm" ADD CONSTRAINT "firearm_entity_id_fkey"
                        FOREIGN KEY ("entityId") REFERENCES "public"."entity"("id")
                        ON DELETE restrict ON UPDATE cascade;
                END IF;
            END $$
        `
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'document_firearm_id_fkey'
                ) THEN
                    ALTER TABLE "document" ADD CONSTRAINT "document_firearm_id_fkey"
                        FOREIGN KEY ("firearmId") REFERENCES "public"."firearm"("id")
                        ON DELETE set null ON UPDATE cascade;
                END IF;
            END $$
        `
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'valuation_firearm_id_fkey'
                ) THEN
                    ALTER TABLE "valuation" ADD CONSTRAINT "valuation_firearm_id_fkey"
                        FOREIGN KEY ("firearmId") REFERENCES "public"."firearm"("id")
                        ON DELETE set null ON UPDATE cascade;
                END IF;
            END $$
        `

        // CHECK constraints — DROP + ADD pair (8→9 / 6→7 FK terms).
        await tx`ALTER TABLE "document" DROP CONSTRAINT IF EXISTS "document_single_owner_check"`
        await tx`
            ALTER TABLE "document" ADD CONSTRAINT "document_single_owner_check" CHECK ((
                (CASE WHEN "document"."entityId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."homesteadId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."rentalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."bankAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."investmentAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."insurancePolicyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."personalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "document"."firearmId" IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            ))
        `
        await tx`ALTER TABLE "valuation" DROP CONSTRAINT IF EXISTS "valuation_single_asset_check"`
        await tx`
            ALTER TABLE "valuation" ADD CONSTRAINT "valuation_single_asset_check" CHECK ((
                (CASE WHEN "valuation"."vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."homesteadId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."rentalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."bankAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."investmentAccountId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."personalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
                 CASE WHEN "valuation"."firearmId" IS NOT NULL THEN 1 ELSE 0 END
                ) = 1
            ))
        `

        // Indexes — CREATE INDEX IF NOT EXISTS is natively idempotent.
        await tx`CREATE UNIQUE INDEX IF NOT EXISTS "firearm_serial_number_key" ON "firearm" USING btree ("serialNumber" text_ops)`
        await tx`CREATE INDEX IF NOT EXISTS "idx_firearm_entity_id" ON "firearm" USING btree ("entityId")`
        await tx`CREATE INDEX IF NOT EXISTS "idx_firearm_status" ON "firearm" USING btree ("status")`
        await tx`CREATE INDEX IF NOT EXISTS "idx_document_firearm_id" ON "document" USING btree ("firearmId")`
        await tx`CREATE INDEX IF NOT EXISTS "idx_valuation_firearm_id" ON "valuation" USING btree ("firearmId")`

        // RLS policies — DO $$ IF NOT EXISTS guards (CREATE POLICY has no IF NOT EXISTS).
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'firearm' AND policyname = 'crud-authenticated-policy-select'
                ) THEN
                    CREATE POLICY "crud-authenticated-policy-select" ON "firearm"
                        AS PERMISSIVE FOR SELECT TO "authenticated"
                        USING (( SELECT app.is_admin() AS is_admin));
                END IF;
            END $$
        `
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'firearm' AND policyname = 'crud-authenticated-policy-insert'
                ) THEN
                    CREATE POLICY "crud-authenticated-policy-insert" ON "firearm"
                        AS PERMISSIVE FOR INSERT TO "authenticated";
                END IF;
            END $$
        `
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'firearm' AND policyname = 'crud-authenticated-policy-update'
                ) THEN
                    CREATE POLICY "crud-authenticated-policy-update" ON "firearm"
                        AS PERMISSIVE FOR UPDATE TO "authenticated";
                END IF;
            END $$
        `
        await tx`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies
                    WHERE tablename = 'firearm' AND policyname = 'crud-authenticated-policy-delete'
                ) THEN
                    CREATE POLICY "crud-authenticated-policy-delete" ON "firearm"
                        AS PERMISSIVE FOR DELETE TO "authenticated";
                END IF;
            END $$
        `
    })

    // Verification — confirm key DDL landed.
    const cols = await sql`
        SELECT table_name, column_name FROM information_schema.columns
        WHERE (table_name = 'firearm' AND column_name IN ('serialNumber', 'nfaClass', 'nfaTransferStatus', 'condition', 'acquisitionCost'))
           OR (table_name = 'document' AND column_name = 'firearmId')
           OR (table_name = 'valuation' AND column_name = 'firearmId')
    `
    if (cols.length !== 7) {
        console.error('MISSING COLUMNS on test branch — got', cols)
        process.exit(1)
    }
    const rls =
        await sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'firearm'`
    if (!rls[0]?.relrowsecurity) {
        console.error('RLS not enabled on firearm — got', rls)
        process.exit(1)
    }
    const policies =
        await sql`SELECT policyname FROM pg_policies WHERE tablename = 'firearm'`
    if (policies.length !== 4) {
        console.error('Expected 4 RLS policies on firearm — got', policies)
        process.exit(1)
    }
    console.log(
        'OK — test branch synced: 7 columns +',
        `RLS=${rls[0].relrowsecurity}, 4 policies`,
    )
} finally {
    await sql.end()
}
