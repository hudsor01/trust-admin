-- Creates `valuation_correction`. The table has been declared in
-- db/schema.ts since 2026-02 but no CREATE TABLE migration was emitted —
-- the live DB has nothing while the snapshot claimed otherwise. See
-- PR #58 for full context.
--
-- Idempotent: CREATE TABLE / INDEX use IF NOT EXISTS, and each CREATE
-- POLICY is preceded by DROP POLICY IF EXISTS (Postgres does not support
-- IF NOT EXISTS on CREATE POLICY directly).
--
-- camelCase column identifiers match this codebase's Postgres convention.

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
ALTER TABLE "valuation_correction" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Admin-only — 4-policy shape matching valuation, activity_log, and the
-- other admin-only domain tables in db/migrations/add-rls-policies.sql.
-- neondb_owner already has BYPASSRLS so it doesn't need its own owner_*
-- policies; including them only adds inert always-true rows to
-- pg_policies and diverges from the dominant pattern.
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "valuation_correction";
--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "valuation_correction"
    AS PERMISSIVE FOR SELECT TO authenticated
    USING ((SELECT app.is_admin() AS is_admin));
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "valuation_correction";
--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "valuation_correction"
    AS PERMISSIVE FOR INSERT TO authenticated
    WITH CHECK ((SELECT app.is_admin() AS is_admin));
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "valuation_correction";
--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "valuation_correction"
    AS PERMISSIVE FOR UPDATE TO authenticated
    USING ((SELECT app.is_admin() AS is_admin))
    WITH CHECK ((SELECT app.is_admin() AS is_admin));
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "valuation_correction";
--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "valuation_correction"
    AS PERMISSIVE FOR DELETE TO authenticated
    USING ((SELECT app.is_admin() AS is_admin));
--> statement-breakpoint
-- Drop the inert owner_* policies if a previous attempt of this migration
-- created them. neondb_owner has BYPASSRLS; explicit owner policies
-- diverged from the canonical admin-only pattern.
DROP POLICY IF EXISTS "owner_select" ON "valuation_correction";
--> statement-breakpoint
DROP POLICY IF EXISTS "owner_insert" ON "valuation_correction";
--> statement-breakpoint
DROP POLICY IF EXISTS "owner_update" ON "valuation_correction";
--> statement-breakpoint
DROP POLICY IF EXISTS "owner_delete" ON "valuation_correction";
