import { db } from "./db"
import { sql } from "drizzle-orm"
import { activityLog, trustAccounting } from "./db/schema"
import { gte } from "drizzle-orm"

console.log("=" .repeat(80))
console.log("INDEX USAGE VERIFICATION WITH EXPLAIN ANALYZE")
console.log("=".repeat(80))

// Test 1: BRIN index on ActivityLog.createdAt
console.log("\n📊 Test 1: BRIN Index on ActivityLog.createdAt")
console.log("-".repeat(80))
console.log("Query: SELECT * FROM ActivityLog WHERE createdAt >= '2024-01-01' LIMIT 10")

const test1 = await db.execute(sql`
  EXPLAIN ANALYZE
  SELECT * FROM "ActivityLog"
  WHERE "createdAt" >= '2024-01-01'
  LIMIT 10;
`)

const test1Rows = Array.isArray(test1) ? test1 : test1.rows || []
console.log("\nQuery Plan:")
test1Rows.forEach((row: any) => {
  const plan = row["QUERY PLAN"] || row.query_plan
  if (plan) {
    console.log(plan)
  }
})

// Test 2: GIN index on ActivityLog JSONB columns
console.log("\n\n📊 Test 2: GIN Index on ActivityLog.oldValues JSONB")
console.log("-".repeat(80))
console.log("Query: SELECT * FROM ActivityLog WHERE oldValues @> '{\"status\": \"ACTIVE\"}'")

const test2 = await db.execute(sql`
  EXPLAIN ANALYZE
  SELECT * FROM "ActivityLog"
  WHERE "oldValues" @> '{"status": "ACTIVE"}'::jsonb
  LIMIT 10;
`)

const test2Rows = Array.isArray(test2) ? test2 : test2.rows || []
console.log("\nQuery Plan:")
test2Rows.forEach((row: any) => {
  const plan = row["QUERY PLAN"] || row.query_plan
  if (plan) {
    console.log(plan)
  }
})

// Test 3: BRIN index on TrustAccounting.createdAt
console.log("\n\n📊 Test 3: BRIN Index on TrustAccounting.createdAt")
console.log("-".repeat(80))
console.log("Query: SELECT * FROM TrustAccounting WHERE createdAt >= NOW() - INTERVAL '30 days'")

const test3 = await db.execute(sql`
  EXPLAIN ANALYZE
  SELECT * FROM "TrustAccounting"
  WHERE "createdAt" >= NOW() - INTERVAL '30 days'
  LIMIT 10;
`)

const test3Rows = Array.isArray(test3) ? test3 : test3.rows || []
console.log("\nQuery Plan:")
test3Rows.forEach((row: any) => {
  const plan = row["QUERY PLAN"] || row.query_plan
  if (plan) {
    console.log(plan)
  }
})

// Test 4: Regular B-tree index for comparison
console.log("\n\n📊 Test 4: B-tree Index on ActivityLog.action (for comparison)")
console.log("-".repeat(80))
console.log("Query: SELECT * FROM ActivityLog WHERE action = 'UPDATE'")

const test4 = await db.execute(sql`
  EXPLAIN ANALYZE
  SELECT * FROM "ActivityLog"
  WHERE "action" = 'UPDATE'
  LIMIT 10;
`)

const test4Rows = Array.isArray(test4) ? test4 : test4.rows || []
console.log("\nQuery Plan:")
test4Rows.forEach((row: any) => {
  const plan = row["QUERY PLAN"] || row.query_plan
  if (plan) {
    console.log(plan)
  }
})

console.log("\n\n" + "=".repeat(80))
console.log("INTERPRETATION GUIDE")
console.log("=".repeat(80))
console.log(`
✅ BRIN Index Usage:
   - Look for "Bitmap Index Scan using idx_*_brin"
   - BRIN indexes are best for large, sequentially inserted tables
   - Expect 10-100x smaller index size vs B-tree
   - May show "Seq Scan" if table is small (< 1000 rows) - this is normal

✅ GIN Index Usage:
   - Look for "Bitmap Index Scan using idx_*_gin"
   - GIN indexes enable fast JSONB queries (@>, ?, ?&, ?| operators)
   - Essential for audit trail queries searching specific field changes

✅ B-tree Index Usage:
   - Look for "Index Scan using idx_*" or "Bitmap Index Scan"
   - Most common index type, good for equality and range queries
   - Used for foreign keys, status filters, date ranges

⚠️  Sequential Scan:
   - Means no index was used (full table scan)
   - Acceptable for small tables (< 1000 rows)
   - For large tables, indicates missing or unused index
`)

console.log("✅ Index usage verification complete!")
process.exit(0)
