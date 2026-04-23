-- Simplification 2026-04-23: drop the pending_inventory_item queue (no
-- beneficiary-submission workflow — Richard is the only inventorier) and
-- the parallel artwork table (single canonical personal_property table
-- now holds everything, category column distinguishes ART from other
-- property). Adds AI metadata columns to personal_property so submissions
-- from /forms/inventory land directly with the full Opus valuation
-- attached — no approval step.
--
-- Guarded with IF EXISTS / IF NOT EXISTS so re-running is a no-op and
-- the migration is safe to apply on already-migrated environments.

-- pending_inventory_item: drop RLS policies, then the table itself.
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "pending_inventory_item";
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "pending_inventory_item";
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "pending_inventory_item";
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "pending_inventory_item";
--> statement-breakpoint
DROP TABLE IF EXISTS "pending_inventory_item";
--> statement-breakpoint

-- valuation: drop the artwork polymorphic FK + check constraint + index
-- + column BEFORE dropping the artwork table itself.
ALTER TABLE "valuation" DROP CONSTRAINT IF EXISTS "valuation_artwork_id_fkey";
--> statement-breakpoint
ALTER TABLE "valuation" DROP CONSTRAINT IF EXISTS "valuation_single_asset_check";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_valuation_artwork_id";
--> statement-breakpoint
ALTER TABLE "valuation" DROP COLUMN IF EXISTS "artworkId";
--> statement-breakpoint
-- Re-add the polymorphic check constraint without artworkId.
DO $vc$ BEGIN
ALTER TABLE "valuation" ADD CONSTRAINT "valuation_single_asset_check" CHECK ((
    (CASE WHEN "vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN "homesteadId" IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN "rentalPropertyId" IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN "bankAccountId" IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN "investmentAccountId" IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN "personalPropertyId" IS NOT NULL THEN 1 ELSE 0 END
    ) = 1
));
EXCEPTION WHEN duplicate_object THEN NULL;
END $vc$;
--> statement-breakpoint

-- artwork: drop RLS policies then the table.
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "artwork";
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "artwork";
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "artwork";
--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "artwork";
--> statement-breakpoint
DROP TABLE IF EXISTS "artwork";
--> statement-breakpoint

-- personal_property: add AI metadata columns mirroring what was on
-- pending_inventory_item, so direct submissions from /forms/inventory
-- persist the Opus valuation attached to the item record.
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "photoPath1" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "photoPath2" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "photoPath3" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "photoPath4" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "photoPath5" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiSuggested" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiConfidence" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiServerOverrideReasons" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiBrand" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiModel" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiEra" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiMaterials" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiValuationRationale" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "aiConditionNotes" text;
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "valueRangeLow" numeric(12, 2);
--> statement-breakpoint
ALTER TABLE "personal_property" ADD COLUMN IF NOT EXISTS "valueRangeHigh" numeric(12, 2);
