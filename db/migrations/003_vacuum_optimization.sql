-- ============================================
-- PostgreSQL 17 VACUUM Optimization
-- Improved autovacuum efficiency for trust-admin tables
-- ============================================

-- APPEND-ONLY AUDIT TABLES
-- More aggressive autovacuum for ActivityLog (high-write, append-only)
-- PostgreSQL 17 has improved parallel VACUUM performance
ALTER TABLE "ActivityLog"
  SET (
    autovacuum_vacuum_scale_factor = 0.05,  -- Trigger VACUUM at 5% dead tuples (was 20%)
    autovacuum_vacuum_cost_delay = 10,      -- Reduce delay for faster cleanup
    parallel_workers = 4                    -- PostgreSQL 17 parallel VACUUM
  );

-- TrustAccounting - append-only, grows over time
ALTER TABLE "TrustAccounting"
  SET (
    autovacuum_vacuum_scale_factor = 0.1,   -- Trigger at 10% dead tuples
    autovacuum_vacuum_cost_delay = 10,
    parallel_workers = 4
  );

-- HIGH-WRITE TRANSACTIONAL TABLES
-- LiabilityPayment - frequent updates to payment status
ALTER TABLE "LiabilityPayment"
  SET (
    fillfactor = 90,                        -- Leave 10% free space for HOT updates
    autovacuum_vacuum_scale_factor = 0.1,
    parallel_workers = 2
  );

-- Distribution - moderate write volume with updates
ALTER TABLE "Distribution"
  SET (
    fillfactor = 90,
    autovacuum_vacuum_scale_factor = 0.15,
    parallel_workers = 2
  );

-- Liability - updated frequently with balance changes
ALTER TABLE "Liability"
  SET (
    fillfactor = 90,
    autovacuum_vacuum_scale_factor = 0.1,
    parallel_workers = 2
  );

-- MODERATE-WRITE TABLES
-- Entity - infrequent updates but important
ALTER TABLE "Entity"
  SET (
    autovacuum_vacuum_scale_factor = 0.2,
    parallel_workers = 2
  );

-- Beneficiary - occasional updates
ALTER TABLE "Beneficiary"
  SET (
    autovacuum_vacuum_scale_factor = 0.2,
    parallel_workers = 2
  );

-- ============================================
-- PostgreSQL 17 Parallel VACUUM Settings
-- ============================================

-- Note: These are session-level settings. For permanent changes,
-- they should be set in postgresql.conf or via Neon project settings.

-- Enable parallel maintenance operations (VACUUM, CREATE INDEX)
-- SET max_parallel_maintenance_workers = 4;

-- Increase memory available for VACUUM
-- SET maintenance_work_mem = '256MB';

-- ============================================
-- VACUUM MONITORING QUERIES
-- ============================================

-- Check autovacuum activity (uncomment to run)
-- SELECT
--   schemaname,
--   relname as tablename,
--   last_autovacuum,
--   last_autoanalyze,
--   autovacuum_count,
--   autoanalyze_count,
--   n_dead_tup,
--   n_live_tup,
--   ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) as dead_pct
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'public'
-- ORDER BY n_dead_tup DESC;

-- Check table bloat (uncomment to run)
-- SELECT
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
--   pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- ANALYZE TABLES
-- Refresh statistics for query planner
-- ============================================

ANALYZE "ActivityLog";
ANALYZE "TrustAccounting";
ANALYZE "LiabilityPayment";
ANALYZE "Distribution";
ANALYZE "Liability";
ANALYZE "Entity";
ANALYZE "Beneficiary";

-- ============================================
-- EXPLANATION
-- ============================================

-- autovacuum_vacuum_scale_factor:
--   - Default is 0.2 (20% dead tuples triggers VACUUM)
--   - Lower values = more frequent VACUUM = less bloat
--   - Append-only tables benefit from aggressive settings (0.05-0.1)

-- fillfactor:
--   - Default is 100 (no free space reserved)
--   - 90 = 10% free space for HOT (Heap-Only Tuple) updates
--   - HOT updates avoid index updates, improving performance

-- parallel_workers:
--   - PostgreSQL 17 improved parallel VACUUM efficiency
--   - More workers = faster VACUUM on large tables
--   - Cost: more CPU/memory during VACUUM

-- autovacuum_vacuum_cost_delay:
--   - Default is 20ms delay between VACUUM operations
--   - Lower = faster VACUUM but more I/O impact
--   - For append-only tables, lower delay is safe
