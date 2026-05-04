-- Add `name` (NOT NULL) + `description` (nullable) to every asset table
-- so the unified /assets page reads from real columns and per-type pages
-- can surface a user-customizable label for every asset.
--
-- Pattern: ADD COLUMN nullable → UPDATE backfill from existing fields →
-- ALTER COLUMN SET NOT NULL. A direct ADD COLUMN ... NOT NULL would fail
-- on any pre-existing row. Backfill is deterministic and uses only NOT
-- NULL source columns so no row is left without a usable label.
--
-- NB: this codebase uses camelCase column names in Postgres (not the
-- usual snake_case). Drizzle's auto-generated migration referenced
-- "street_address", "account_name", etc. which don't exist — every
-- column reference below is the actual quoted camelCase identifier.

-- ── vehicle ────────────────────────────────────────────────────────────
ALTER TABLE "vehicle" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "vehicle"
   SET "name" = TRIM(CONCAT_WS(' ', "year"::text, "make", "model"))
 WHERE "name" IS NULL;--> statement-breakpoint
UPDATE "vehicle"
   SET "description" = CONCAT_WS(' · ', NULLIF("color", ''), 'VIN ' || "vin")
 WHERE "description" IS NULL;--> statement-breakpoint
ALTER TABLE "vehicle" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint

-- ── homestead ──────────────────────────────────────────────────────────
ALTER TABLE "homestead" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "homestead" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "homestead"
   SET "name" = "streetAddress"
 WHERE "name" IS NULL;--> statement-breakpoint
UPDATE "homestead"
   SET "description" = "city" || ', ' || "state" || ' ' || "zip"
 WHERE "description" IS NULL;--> statement-breakpoint
ALTER TABLE "homestead" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint

-- ── rental_property (already has `name`; only `description` is new) ────
ALTER TABLE "rental_property" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "rental_property"
   SET "description" = "streetAddress" || ', ' || "city" || ', ' || "state" || ' ' || "zip"
 WHERE "description" IS NULL;--> statement-breakpoint

-- ── bank_account ───────────────────────────────────────────────────────
ALTER TABLE "bank_account" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "bank_account" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "bank_account"
   SET "name" = COALESCE(NULLIF("accountName", ''), "institution")
 WHERE "name" IS NULL;--> statement-breakpoint
UPDATE "bank_account"
   SET "description" = "institution" || ' · ' || "accountType"
 WHERE "description" IS NULL;--> statement-breakpoint
ALTER TABLE "bank_account" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint

-- ── investment_account ─────────────────────────────────────────────────
ALTER TABLE "investment_account" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "investment_account" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "investment_account"
   SET "name" = COALESCE(NULLIF("accountName", ''), "institution")
 WHERE "name" IS NULL;--> statement-breakpoint
UPDATE "investment_account"
   SET "description" = "institution" || ' · ' || "accountType"
 WHERE "description" IS NULL;--> statement-breakpoint
ALTER TABLE "investment_account" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint

-- ── insurance_policy ───────────────────────────────────────────────────
ALTER TABLE "insurance_policy" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "insurance_policy" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "insurance_policy"
   SET "name" = "policyType" || ' - ' || "carrier"
 WHERE "name" IS NULL;--> statement-breakpoint
UPDATE "insurance_policy"
   SET "description" = 'Policy ' || "policyNumber"
 WHERE "description" IS NULL;--> statement-breakpoint
ALTER TABLE "insurance_policy" ALTER COLUMN "name" SET NOT NULL;
