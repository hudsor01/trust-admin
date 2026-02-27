-- ============================================
-- PostgreSQL 17 Advanced Indexes
-- BRIN indexes for append-only tables
-- GIN indexes for JSONB columns
-- ============================================

-- BRIN (Block Range INdex) for append-only audit tables
-- BRIN indexes are much smaller (~1% of table size) and ideal for sequential data
-- pages_per_range=128 means each index entry covers 128 pages (1MB)

-- ActivityLog: Audit trail, always append-only with createdAt
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_created_at_brin
  ON "ActivityLog" USING BRIN (created_at)
  WITH (pages_per_range = 128);

-- TrustAccounting: Accounting entries, mostly append-only with accountingDate
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trust_accounting_created_at_brin
  ON "TrustAccounting" USING BRIN (created_at)
  WITH (pages_per_range = 128);

-- GIN (Generalized Inverted Index) for JSONB columns
-- GIN indexes enable fast queries on JSONB content
-- Particularly useful for audit trail queries looking for specific changed fields

-- ActivityLog JSONB columns for change tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_old_values_gin
  ON "ActivityLog" USING GIN (old_values);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_new_values_gin
  ON "ActivityLog" USING GIN (new_values);

-- ============================================
-- PostgreSQL 17 Parallel Index Build Settings
-- Enable parallel workers for faster index creation
-- ============================================

-- These settings improve index build performance on PostgreSQL 17
-- They're applied during index creation and do not affect runtime queries

-- Enable parallel index builds (PostgreSQL 17 has improved parallel GIN)
SET max_parallel_maintenance_workers = 4;
SET maintenance_work_mem = '256MB';

-- ============================================
-- Index Statistics
-- ============================================

-- After creating indexes, gather statistics for query planner
ANALYZE "ActivityLog";
ANALYZE "TrustAccounting";

-- ============================================
-- Verification Queries
-- ============================================

-- Check BRIN index sizes (should be ~1% of table size)
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
--   pg_size_pretty(pg_relation_size(tablename::regclass)) as table_size
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE '%_brin';

-- Check GIN index usage
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as scans,
--   idx_tup_read as tuples_read
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE '%_gin'
-- ORDER BY idx_scan DESC;
