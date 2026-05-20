-- Adds beneficiary.sortIndex + composite indexes on both beneficiary and trustee.
--
-- Per CLAUDE.md "Postgres Column Naming Convention" gotcha: every column
-- identifier in quotes uses camelCase ("sortIndex", "entityId", "order").
-- drizzle-kit emitted the ADD COLUMN + CREATE INDEX statements with the
-- correct camelCase already (the new column is declared as
-- t.integer('sortIndex') so the generator did not snake_case it) — the
-- ROW_NUMBER backfill below is hand-added so existing list order is
-- preserved.
--
-- Idempotent: ADD COLUMN / CREATE INDEX use IF NOT EXISTS so a re-run after
-- a partial failure does not error.

ALTER TABLE "beneficiary"
    ADD COLUMN IF NOT EXISTS "sortIndex" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Backfill: assign sortIndex in id-order within each entity so the existing
-- list order is preserved (0-based per entity partition).
UPDATE "beneficiary" b
   SET "sortIndex" = sub.rn - 1
  FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "entityId" ORDER BY "id") AS rn
      FROM "beneficiary"
  ) sub
 WHERE b."id" = sub."id";
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_beneficiary_entity_sort"
    ON "beneficiary" USING btree ("entityId", "sortIndex");
--> statement-breakpoint

-- Composite index on the existing trustee.order column (no schema change to
-- the trustee table — the `order` integer column already exists).
CREATE INDEX IF NOT EXISTS "idx_trustee_entity_order"
    ON "trustee" USING btree ("entityId", "order");
