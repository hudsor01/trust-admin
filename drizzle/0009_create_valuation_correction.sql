-- Creates the `valuation_correction` table that the inventory analyze
-- route queries for the admin-correction feedback loop fed to Opus.
--
-- The table has been declared in db/schema.ts since 2026-02 but no
-- CREATE TABLE migration was ever emitted — the drizzle-kit generate
-- output got hand-edited away during an earlier migration cycle, so the
-- snapshot in drizzle/meta/ claims the table exists while the live DB
-- has nothing. Result: Sentry TRUST-ADMIN-Y fires on every analyze call
-- because the route's `SELECT FROM valuation_correction` errors with
-- `relation "valuation_correction" does not exist`. The route swallows
-- the error and continues with empty feedback (non-blocking), but Opus
-- runs without its designed admin-correction feedback loop.
--
-- IF NOT EXISTS on every statement so re-running is a no-op. RLS
-- policies match the canonical 8-policy pattern used by every other
-- domain table (see db/migrations/add-rls-policies.sql).
--
-- NB: column names are camelCase to match this codebase's Postgres
-- convention — Drizzle's auto-generated DDL would have emitted
-- snake_case identifiers, which don't match the schema definitions.

CREATE TABLE IF NOT EXISTS "valuation_correction" (
    "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "entityId" bigint NOT NULL,
    "itemName" text NOT NULL,
    "category" text NOT NULL,
    "aiEstimatedValue" text NOT NULL,
    "correctedValue" text NOT NULL,
    "correctionRatio" real NOT NULL,
    "notes" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "valuation_correction_entity_id_fkey"
        FOREIGN KEY ("entityId") REFERENCES "entity"("id")
        ON UPDATE CASCADE ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_valuation_correction_entity_id"
    ON "valuation_correction" USING btree ("entityId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_valuation_correction_category"
    ON "valuation_correction" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_valuation_correction_created_at"
    ON "valuation_correction" USING btree ("createdAt" DESC);
--> statement-breakpoint
ALTER TABLE "valuation_correction" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "valuation_correction"
    AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT app.is_admin() AS is_admin));
--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "valuation_correction"
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT app.is_admin() AS is_admin));
--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "valuation_correction"
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING ((SELECT app.is_admin() AS is_admin))
    WITH CHECK ((SELECT app.is_admin() AS is_admin));
--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "valuation_correction"
    AS PERMISSIVE FOR DELETE TO authenticated
    USING ((SELECT app.is_admin() AS is_admin));
--> statement-breakpoint
CREATE POLICY "owner_select" ON "valuation_correction"
    AS PERMISSIVE FOR SELECT TO neondb_owner USING (true);
--> statement-breakpoint
CREATE POLICY "owner_insert" ON "valuation_correction"
    AS PERMISSIVE FOR INSERT TO neondb_owner WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "owner_update" ON "valuation_correction"
    AS PERMISSIVE FOR UPDATE TO neondb_owner
    USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "owner_delete" ON "valuation_correction"
    AS PERMISSIVE FOR DELETE TO neondb_owner USING (true);
