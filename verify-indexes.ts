import { sql } from "drizzle-orm"
import { db } from "./db"

interface BrinIndexRow {
  schemaname: string
  tablename: string
  indexname: string
  index_size: string
  table_size: string
  size_percent: number
}

interface GinIndexRow {
  schemaname: string
  tablename: string
  indexname: string
  index_size: string
  scans: number
  tuples_read: number
  tuples_fetched: number
}

interface CountRow {
  total_count: number
  total_size: string
}

interface TypeRow {
  index_type: string
  count: number
  total_size: string
}

interface QueryResult<T> {
  rows: T[]
}

console.log("=".repeat(80))
console.log("INDEX VERIFICATION - BRIN & GIN INDEXES")
console.log("=".repeat(80))

// Check BRIN indexes
console.log("\n📊 BRIN Indexes (Block Range Indexes for sequential data)")
console.log("-".repeat(80))

const brinIndexes = await db.execute(sql`
  SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    ROUND(100.0 * pg_relation_size(indexrelid) / NULLIF(pg_relation_size(relid), 0), 2) as size_percent
  FROM pg_stat_user_indexes
  WHERE indexrelname LIKE '%_brin'
    AND schemaname = 'public'
  ORDER BY pg_relation_size(indexrelid) DESC;
`)

const brinResult = brinIndexes as unknown as QueryResult<BrinIndexRow>
const brinRows = Array.isArray(brinIndexes) ? brinIndexes : brinResult.rows || []

if (brinRows.length > 0) {
  brinRows.forEach((row) => {
    console.log(`✅ ${row.indexname}`)
    console.log(`   Table: ${row.tablename}`)
    console.log(`   Index Size: ${row.index_size}`)
    console.log(`   Table Size: ${row.table_size}`)
    console.log(`   Size Ratio: ${row.size_percent}% (BRIN should be ~1-2%)`)
    console.log()
  })
} else {
  console.log("⚠️  No BRIN indexes found")
}

// Check GIN indexes
console.log("\n📊 GIN Indexes (Generalized Inverted Indexes for JSONB)")
console.log("-".repeat(80))

const ginIndexes = await db.execute(sql`
  SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
  FROM pg_stat_user_indexes
  WHERE indexrelname LIKE '%_gin'
    AND schemaname = 'public'
  ORDER BY pg_relation_size(indexrelid) DESC;
`)

const ginResult = ginIndexes as unknown as QueryResult<GinIndexRow>
const ginRows = Array.isArray(ginIndexes) ? ginIndexes : ginResult.rows || []

if (ginRows.length > 0) {
  ginRows.forEach((row) => {
    console.log(`✅ ${row.indexname}`)
    console.log(`   Table: ${row.tablename}`)
    console.log(`   Index Size: ${row.index_size}`)
    console.log(`   Scans: ${row.scans || 0} (usage count)`)
    console.log()
  })
} else {
  console.log("⚠️  No GIN indexes found")
}

// Summary of all indexes
console.log("\n📈 INDEX SUMMARY")
console.log("=".repeat(80))

const totalIndexes = await db.execute(sql`
  SELECT
    COUNT(*) as total_count,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_size
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public';
`)

const totalResult = totalIndexes as unknown as QueryResult<CountRow>
const summary = Array.isArray(totalIndexes)
  ? (totalIndexes[0] as unknown as CountRow)
  : totalResult.rows?.[0] || (totalIndexes[0] as unknown as CountRow)

console.log(`Total indexes: ${summary?.total_count || "unknown"}`)
console.log(`Total index size: ${summary?.total_size || "unknown"}`)

// Count by index type
const byType = await db.execute(sql`
  SELECT
    am.amname as index_type,
    COUNT(*) as count,
    pg_size_pretty(SUM(pg_relation_size(i.indexrelid))) as total_size
  FROM pg_stat_user_indexes i
  JOIN pg_class c ON c.oid = i.indexrelid
  JOIN pg_am am ON c.relam = am.oid
  WHERE i.schemaname = 'public'
  GROUP BY am.amname
  ORDER BY COUNT(*) DESC;
`)

const typeResult = byType as unknown as QueryResult<TypeRow>
const typeRows = Array.isArray(byType) ? byType : typeResult.rows || []

console.log("\nBy type:")
typeRows.forEach((row) => {
  console.log(`  ${row.index_type}: ${row.count} indexes (${row.total_size})`)
})

console.log("\n✅ Index verification complete!")
process.exit(0)
