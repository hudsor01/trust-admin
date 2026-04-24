-- Supports the async analyze pattern: /api/inventory/analyze kicks off a
-- managed agent session and returns a cache row UUID immediately; the
-- /status endpoint fills in the analysisJson once the agent finishes.
--
-- 1. Make analysis_json nullable (it's written async, not at insert time).
-- 2. Add session_id column so the status endpoint can resolve session ->
--    cache row without the client needing to hold both IDs.
-- 3. Index session_id for the status-endpoint lookup.
--
-- Idempotent so re-running is safe.

ALTER TABLE "inventory_analysis_cache"
    ALTER COLUMN "analysisJson" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_analysis_cache"
    ADD COLUMN IF NOT EXISTS "sessionId" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_analysis_cache_session_id"
    ON "inventory_analysis_cache" USING btree ("sessionId");
