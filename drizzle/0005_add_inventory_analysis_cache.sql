-- Adds inventory_analysis_cache table to server-persist Opus 4.7 analyze
-- output so submitInventoryItem can re-derive reviewStatus overrides on
-- the authoritative AI output instead of client-submitted form fields.
-- 24h TTL matches the access-code cookie lifetime. Hand-authored because
-- the repo's pre-existing migrations don't include baseline DDL (see
-- commit b841768 for context).
CREATE TABLE IF NOT EXISTS "inventory_analysis_cache" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "analysisJson" jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) with time zone DEFAULT (CURRENT_TIMESTAMP + interval '24 hours') NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_analysis_cache_expires_at"
    ON "inventory_analysis_cache" USING btree ("expiresAt");
