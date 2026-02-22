# Phase 53: Beneficiary Data Isolation - Research Report

## 1. Current State

### RLS is ACTIVE in Production -- Contrary to CONTEXT.md

The existing `CONTEXT.md` states "NO RLS POLICIES ENFORCED" but this is **outdated**. Research reveals that RLS policies are already deployed and active in the database. Evidence:

1. **Drizzle-generated schema** (`drizzle/schema.ts`) contains `pgPolicy()` definitions on 11 tables, reflecting what is in the database.
2. **Test suite** (`tests/rls.test.ts`) verifies RLS is enabled on 11 tables and expects **33 total tables** with RLS enabled (line 955: `expect(result[0]?.count).toBe(33)`).
3. **Test scripts** (`scripts/test-rls-with-role.ts`, `scripts/debug-rls.ts`) actively test cross-beneficiary isolation using `SET ROLE authenticated` + `app.set_test_user()`.
4. **`scripts/add-owner-rls-policies.ts`** adds `neondb_owner` policies (needed because the database owner has `BYPASSRLS=true`).
5. **`db:push` is deprecated** with a warning: "db:push has RLS policy bugs. Use db:deploy instead."

### What Policies Exist (from `drizzle/schema.ts`)

**Tables with beneficiary-specific SELECT policies (4 tables):**

| Table | SELECT Policy (`USING` clause) |
|-------|-------------------------------|
| `distribution` | `app.is_admin() OR distribution."beneficiaryId" = app.get_user_beneficiary_id()` |
| `hems_request` | `app.is_admin() OR hems_request."beneficiaryId" = app.get_user_beneficiary_id()` |
| `beneficiary` | `app.is_admin() OR beneficiary.id = app.get_user_beneficiary_id()` |
| `withdrawal_record` | `app.is_admin() OR withdrawal_record."beneficiaryId" = app.get_user_beneficiary_id()` |

**Tables with admin-only SELECT policies (7 tables):**

| Table | SELECT Policy (`USING` clause) |
|-------|-------------------------------|
| `entity` | `app.is_admin()` |
| `homestead` | `app.is_admin()` |
| `trust_accounting` | `app.is_admin()` |
| `vehicle` | `app.is_admin()` |
| `bank_account` | `app.is_admin()` |
| `investment_account` | `app.is_admin()` |
| `liability` | `app.is_admin()` |

**All 11 tables also have INSERT/UPDATE/DELETE policies** for `authenticated` role with no `USING`/`WITH CHECK` clauses (effectively unrestricted for authenticated users).

**`user_profile` table has NO RLS policies** -- correct, as it would create a chicken-and-egg problem (the RLS helper functions query `user_profile` to resolve `beneficiaryId`).

### Database Helper Functions

The `app` schema contains 4 helper functions (verified by `tests/rls.test.ts`):

| Function | Purpose |
|----------|---------|
| `app.is_admin()` | Returns boolean: checks if current user has role `'admin'` in `user_profile` |
| `app.get_user_role()` | Returns user's role from `user_profile` |
| `app.get_user_beneficiary_id()` | Returns `beneficiary_id` from `user_profile` for current user |
| `app.user_entity_ids()` | Returns entity IDs the user has access to |

These functions resolve the user via one of two mechanisms:
- **Production:** `auth.user_id()` (set by `auth.jwt_session_init(token)`)
- **Testing:** `app.effective_user_id()` which checks `current_setting('app.test_user_id', true)` first, falling back to `auth.user_id()`

---

## 2. Findings per Research Question

### 2.1 Current RLS State

**`db/rls.ts`:** Contains example/reference patterns only. Defines `pgRole` for `admin`, `trustee`, `beneficiary_user`, `auditor` and example `pgPolicy` definitions. **None of these are linked to actual tables in `db/schema.ts`**. The file is purely documentation.

**No `enableRLS()` calls in `db/schema.ts`:** The Drizzle schema source code (`db/schema.ts`) does NOT call `.enableRLS()` on any table. However, RLS is enabled in the **actual database** (reflected in `drizzle/schema.ts` which is the generated/introspected schema).

**Migrations directory** (`db/migrations/`): Contains 3 SQL files for table renames, indexes, and vacuum optimization. No RLS-specific migrations. The RLS setup appears to have been applied via raw SQL scripts or console commands, then captured by `drizzle-kit generate`.

**`drizzle/0001_left_nico_minoru.sql`:** A Drizzle migration that drops and recreates indexes. Likely generated after the RLS policies were applied, as the `drizzle/schema.ts` includes the policies.

**Key finding:** RLS policies exist in the database and are tracked by Drizzle's generated schema, but are NOT declaratively defined in `db/schema.ts`. This means the source of truth for policies is the database itself, not the Drizzle source.

### 2.2 initJwtSession Implementation

**Location:** `/Users/richard/Developer/trust-admin/db/index.ts`, lines 141-144

```typescript
export async function initJwtSession(token: string): Promise<void> {
    const client = getClient()
    await client`SELECT auth.jwt_session_init(${token})`
}
```

**How it works:**
1. Uses `postgres.js` client (`getClient()`) -- NOT the neon HTTP driver
2. Calls `auth.jwt_session_init(token)` which is a Neon-managed PostgreSQL function
3. After this call, `auth.user_id()` returns the JWT's `sub` claim (user UUID)

**Called in tRPC context creation** (`src/server/trpc/index.ts`, line 57):
```typescript
await initJwtSession(session.session.token)
```

This is called on EVERY authenticated tRPC request before any queries run.

**Critical issue:** `initJwtSession` uses `getClient()` (postgres.js), but all Drizzle queries use `db` (neon HTTP driver). These are **different connections**. The session variable set on the postgres.js connection is NOT available to the neon HTTP driver connection. This means **RLS policies that depend on `auth.user_id()` may not work correctly with Drizzle's `db` instance**.

However, the helper functions use `app.effective_user_id()` which checks `app.test_user_id` first. In production, the `auth.user_id()` function (from pg_session_jwt extension) may work at the connection pool level differently than session variables. This needs verification.

### 2.3 Beneficiary-Facing Procedures

| Procedure | File | Guard | Filtering Method |
|-----------|------|-------|-----------------|
| `beneficiary.me` | `routers/beneficiary.ts:80` | `beneficiaryProcedure` | `getBeneficiaryById(ctx.user.beneficiaryId)` -- filters by ID from session |
| `hemsRequest.submit` | `routers/hemsRequest.ts:175` | `beneficiaryProcedure` | Validates `input.beneficiaryId === ctx.user.beneficiaryId` before insert |
| `hemsRequest.myRequests` | `routers/hemsRequest.ts:209` | `beneficiaryProcedure` | `WHERE beneficiaryId = ctx.user.beneficiaryId` |
| `distribution.myDistributions` | `routers/distribution.ts:86` | `beneficiaryProcedure` | `getDistributionsByBeneficiary(ctx.user.beneficiaryId)` |

**NOT exposed to beneficiaries:**

| Router | File | All procedures use |
|--------|------|--------------------|
| `withdrawalRecord` | `routers/withdrawalRecord.ts` | `adminProcedure` only -- no `beneficiaryProcedure` variant |
| `specificBequest` | (uses `createCrudRouter`) | `adminProcedure` only |
| `trustAccounting` | (uses `createCrudRouter`) | `adminProcedure` only |

### 2.4 userProfile Table and Schema

**Definition** (`db/schema.ts`, line 2187):

```typescript
export const userProfile = pgTable('user_profile', (t) => ({
    userId: t.text('user_id').primaryKey().notNull(),
    role: userRole().notNull().default('beneficiary'),
    beneficiaryId: bigint('beneficiary_id', { mode: 'number' }),
    createdAt: t.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: t.timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}))
```

Key facts:
- `userId` is `text` (UUID string from Neon Auth)
- `role` is `UserRole` enum: `'admin'` or `'beneficiary'`
- `beneficiaryId` is `bigint` (mode: `'number'` in JS) -- **nullable** (admins have `null`)
- Foreign key to `beneficiary.id` with `onDelete: 'set null'`
- **No RLS on user_profile** -- confirmed in `drizzle/schema.ts` (no `pgPolicy` entries)

Relationship: `userProfile.beneficiaryId` -> `beneficiary.id` (one-to-one or many-to-one)

### 2.5 Drizzle RLS Configuration

**`drizzle.config.ts`:**
```typescript
entities: {
    roles: {
        provider: 'neon',
    },
},
```

The `provider: 'neon'` setting tells Drizzle Kit that database roles are managed by Neon (not by Drizzle). This means:
- Drizzle will NOT create or drop the `authenticated` and `anonymous` roles
- These roles are expected to already exist (created by Neon)
- Drizzle CAN generate RLS policies via `pgPolicy()` in table definitions

**No `crudPolicy` or `authenticatedRole` imports in `db/schema.ts`:** The source schema does not use Drizzle's built-in RLS helpers from `drizzle-orm/neon`. The policies in the database were applied externally and captured in `drizzle/schema.ts`.

### 2.6 Table Inventory

#### Tables with Beneficiary-Filtered RLS (4 tables)

| Table Name | Column for Filtering | Column Type | DB Column Name |
|-----------|---------------------|-------------|----------------|
| `distribution` | `beneficiaryId` | `bigint` (number) | `"beneficiaryId"` (camelCase in DB) |
| `hems_request` | `beneficiaryId` | `bigint` (number) | `"beneficiaryId"` (camelCase in DB) |
| `beneficiary` | `id` | `bigint` (number) | `id` |
| `withdrawal_record` | `beneficiaryId` | `bigint` (number) | `"beneficiaryId"` (camelCase in DB) |

#### Tables with Admin-Only RLS (7 tables)

| Table Name | Filter Column | Reason |
|-----------|---------------|--------|
| `entity` | N/A (admin only) | Trust container -- sensitive |
| `homestead` | `entityId` | Asset -- admin only |
| `vehicle` | `entityId` | Asset -- admin only |
| `bank_account` | `entityId` | Financial -- sensitive |
| `investment_account` | `entityId` | Financial -- sensitive |
| `trust_accounting` | `entityId` | Reveals trust finances |
| `liability` | `entityId` | Debt details -- sensitive |

#### Tables WITHOUT RLS (not in `drizzle/schema.ts` policy list)

| Table Name | Has beneficiaryId? | Notes |
|-----------|-------------------|-------|
| `user_profile` | Yes (`beneficiary_id`) | Must NOT have RLS (chicken-and-egg) |
| `specific_bequest` | Yes (`beneficiaryId`) | Missing -- SHOULD have beneficiary filtering |
| `rental_property` | No | Asset -- should probably have admin-only |
| `insurance_policy` | No | Asset -- should probably have admin-only |
| `personal_property` | No | Asset -- should probably have admin-only |
| `artwork` | No | Asset -- should probably have admin-only |
| `trustee` | No | Should be admin-only |
| `trustee_fee_schedule` | No | Should be admin-only (fee details) |
| `trustee_fee_entry` | No | Should be admin-only (compensation) |
| `liability_payment` | No | Should be admin-only |
| `contact` | No | Professional contacts |
| `contact_association` | No | Contact-entity links |
| `task` | No | Admin tasks |
| `document` | No | File references |
| `valuation` | No | Asset valuations |
| `transaction` | No | Asset transactions |
| `activity_log` | No | Audit trail |
| `pending_inventory_item` | No | Public submission queue |
| `session` | No | Auth session (Neon managed) |
| `account` | No | Auth account (Neon managed) |
| `verification` | No | Auth verification (Neon managed) |
| `user` | No | Auth user (Neon managed) |

**The test suite expects 33 tables with RLS enabled**, but `drizzle/schema.ts` only shows policies on 11. The remaining 22 tables may have RLS enabled at the database level without policies (which would block ALL access), or have `neondb_owner` bypass policies. This needs verification.

### 2.7 Potential Issues

#### Issue 1: HTTP Driver vs postgres.js Session State

The most critical finding: `initJwtSession()` sets the session on the **postgres.js** client, but all Drizzle ORM queries run through the **neon HTTP driver** (`neon()`). These are entirely separate connections.

- `db` (Drizzle) -> `neon()` HTTP driver -> stateless HTTP requests
- `getClient()` (postgres.js) -> persistent TCP connection -> session state preserved

**Impact:** The `auth.user_id()` function relies on session state set by `jwt_session_init()`. Since each neon HTTP request is stateless, the session state from postgres.js does NOT carry over. This means **RLS policies checking `auth.user_id()` via the Drizzle `db` instance may see null/undefined user IDs**.

However, the app functions (`app.is_admin()`, `app.get_user_beneficiary_id()`) use `app.effective_user_id()` which checks `current_setting('app.test_user_id', true)` first. In production without the test user setting, this falls through to `auth.user_id()`. If `auth.user_id()` returns null on HTTP connections, ALL non-admin queries would return empty results.

**This suggests one of:**
1. The Neon HTTP driver somehow preserves JWT session state (unlikely for stateless HTTP)
2. The `neondb_owner` role has `BYPASSRLS=true` and bypasses policies entirely for production queries
3. RLS is enabled but not enforced for the connection role used by the app

The test scripts (`test-rls-with-role.ts`) explicitly use `SET ROLE authenticated` within transactions to test RLS, which confirms that `neondb_owner` bypasses RLS. Production Drizzle queries run as `neondb_owner`, meaning **RLS policies are not currently enforced for production queries via Drizzle**.

#### Issue 2: INSERT/UPDATE/DELETE Policies Are Unrestricted

All 11 tables with RLS have INSERT, UPDATE, and DELETE policies with no conditions:
```typescript
pgPolicy('crud-authenticated-policy-insert', {
    for: 'insert',
    to: ['authenticated'],
    // No withCheck clause!
})
```

This means any authenticated user (including beneficiaries) can INSERT, UPDATE, or DELETE rows in ALL 11 tables at the database level. The protection is solely application-level (tRPC `adminProcedure` guards).

#### Issue 3: No Raw SQL Queries in Application Code

Searching for `getClient()` or `getSql()` in `src/` returned no results. All application queries go through Drizzle `db`. Raw SQL is only used in:
- Test files
- Script files
- `db/time-travel.ts` (uses `getClient()`)
- `db/index.ts` (the `initJwtSession` function itself)

This is good -- there is no risk of application code bypassing Drizzle ORM.

#### Issue 4: The `neondb_owner` Bypass

The `scripts/add-owner-rls-policies.ts` script adds separate policies for `neondb_owner` that include beneficiary filtering:
```sql
USING (app.is_admin() OR distribution."beneficiaryId" = app.get_user_beneficiary_id())
```

But the `debug-rls.ts` script shows that `neondb_owner` sees all data when no test context is set, which confirms `BYPASSRLS=true` on that role.

### 2.8 Deployment/Migration Approach

**Schema changes are applied via:**
```json
"db:deploy": "drizzle-kit generate --config drizzle.config.ts && drizzle-kit migrate --config drizzle.config.ts"
"db:push": "WARNING: db:push has RLS policy bugs. Use db:deploy instead."
```

- `db:push` is explicitly warned against for RLS policy bugs
- `db:deploy` generates SQL migrations then runs them
- RLS policies CAN be applied via Drizzle migrations (they are tracked in `drizzle/schema.ts`)
- The existing policies appear to have been applied via raw SQL and then captured by `drizzle-kit generate`

**Migrations directory:** `drizzle/` (Drizzle Kit output) contains `0000_*.sql` and `0001_*.sql` plus `meta/` snapshots. Custom migrations live in `db/migrations/` (3 files for table renames, indexes, vacuum).

---

## 3. Table Inventory -- Complete RLS Status

### Currently Protected (RLS enabled + policies active)

| # | Table | SELECT Filter | INSERT/UPDATE/DELETE | Beneficiary Can See |
|---|-------|--------------|---------------------|-------------------|
| 1 | `distribution` | Admin OR own `beneficiaryId` | Unrestricted (authenticated) | Own rows only |
| 2 | `hems_request` | Admin OR own `beneficiaryId` | Unrestricted (authenticated) | Own rows only |
| 3 | `beneficiary` | Admin OR own `id` | Unrestricted (authenticated) | Own record only |
| 4 | `withdrawal_record` | Admin OR own `beneficiaryId` | Unrestricted (authenticated) | Own rows only |
| 5 | `entity` | Admin only | Unrestricted (authenticated) | Nothing |
| 6 | `homestead` | Admin only | Unrestricted (authenticated) | Nothing |
| 7 | `vehicle` | Admin only | Unrestricted (authenticated) | Nothing |
| 8 | `bank_account` | Admin only | Unrestricted (authenticated) | Nothing |
| 9 | `investment_account` | Admin only | Unrestricted (authenticated) | Nothing |
| 10 | `trust_accounting` | Admin only | Unrestricted (authenticated) | Nothing |
| 11 | `liability` | Admin only | Unrestricted (authenticated) | Nothing |

### Missing RLS (should be added)

| # | Table | Recommended Policy | Reason |
|---|-------|--------------------|--------|
| 12 | `specific_bequest` | Admin OR own `beneficiaryId` | Has `beneficiaryId` column -- beneficiary should see their bequests |
| 13 | `rental_property` | Admin only | Asset -- sensitive financial data |
| 14 | `insurance_policy` | Admin only | Asset -- sensitive |
| 15 | `personal_property` | Admin only | Asset |
| 16 | `artwork` | Admin only | Asset |
| 17 | `trustee` | Admin only | Trust administration |
| 18 | `trustee_fee_schedule` | Admin only | Compensation details -- sensitive |
| 19 | `trustee_fee_entry` | Admin only | Compensation details -- sensitive |
| 20 | `liability_payment` | Admin only | Debt payments -- sensitive |
| 21 | `contact` | Admin only | Professional contacts |
| 22 | `contact_association` | Admin only | Contact relationships |
| 23 | `task` | Admin only | Administrative tasks |
| 24 | `document` | Admin only | File references |
| 25 | `valuation` | Admin only | Asset valuations -- sensitive |
| 26 | `transaction` | Admin only | Asset transactions |
| 27 | `activity_log` | Admin only | Audit trail -- sensitive |
| 28 | `pending_inventory_item` | Admin only or public read | Public submission queue |

### Must NOT have RLS

| # | Table | Reason |
|---|-------|--------|
| - | `user_profile` | Helper functions query it to resolve roles -- would cause infinite recursion |
| - | `user` (auth) | Neon Auth managed |
| - | `session` (auth) | Neon Auth managed |
| - | `account` (auth) | Neon Auth managed |
| - | `verification` (auth) | Neon Auth managed |

---

## 4. Implementation Approach

### Recommended Strategy

Given the current state (RLS exists but is bypassed by `neondb_owner` in production), the implementation should follow this order:

#### Phase A: Harden Write Policies (High Priority)

The existing INSERT/UPDATE/DELETE policies have NO conditions, meaning any authenticated user could theoretically write to any table. Add `WITH CHECK` clauses:

For beneficiary-facing tables:
- INSERT: `WITH CHECK (beneficiaryId = app.get_user_beneficiary_id() OR app.is_admin())`
- UPDATE: `USING (same) WITH CHECK (same)`
- DELETE: `USING (app.is_admin())` -- beneficiaries should NOT delete

For admin-only tables:
- INSERT/UPDATE/DELETE: `USING (app.is_admin()) WITH CHECK (app.is_admin())`

#### Phase B: Add Missing Table Policies (Medium Priority)

Add RLS + policies to the 16 tables listed in "Missing RLS" above. Most should be simple admin-only policies. `specific_bequest` needs beneficiary filtering.

#### Phase C: Enforce RLS for Application Connection (Critical)

The biggest gap: production queries run as `neondb_owner` which has `BYPASSRLS=true`. Options:

1. **Use `SET ROLE authenticated`** before each request -- would require switching from stateless HTTP driver to session-aware connection
2. **Create a new database role** (e.g., `trust_admin_app`) without BYPASSRLS, grant it access to tables, use it as the connection role
3. **Use `FORCE ROW LEVEL SECURITY`** on tables -- forces RLS even for table owners (but not for roles with explicit BYPASSRLS)
4. **Switch to the `authenticated` role** in a session/transaction context for beneficiary requests only

**Option 2 is recommended** -- it provides the cleanest separation of concerns. The application connects as `trust_admin_app` (no BYPASSRLS), and RLS policies control access. Admin functions that need to bypass RLS can use `SET ROLE neondb_owner` within transactions.

However, this requires changing the connection pooling approach. The current neon HTTP driver is stateless and cannot maintain session state (role, JWT) across requests.

**Alternative pragmatic approach:** Keep application-level filtering as the primary defense, treat RLS as defense-in-depth, and only enforce RLS for the `authenticated` role (used in test/verification scenarios). This is the current effective state.

#### Phase D: Verify HTTP Driver Compatibility (Required Before C)

Before enforcing RLS in production, verify:
1. Can the neon HTTP driver set session variables per request?
2. Does `auth.jwt_session_init()` work with HTTP connections?
3. What role do HTTP connections use? Is it `neondb_owner` or `authenticated`?

---

## 5. Risks and Blockers

### Risk 1: Breaking Admin Queries (HIGH)
Enabling RLS enforcement without proper admin bypass would lock admins out of data. Every table needs an `app.is_admin() = true` escape hatch in its SELECT policy.

### Risk 2: HTTP Driver Session State (HIGH)
The neon HTTP driver (`neon()`) creates stateless connections. RLS policies that depend on `auth.user_id()` or session variables will not work unless:
- The HTTP driver supports per-request session initialization
- OR the app switches to a stateful connection model for beneficiary requests

### Risk 3: Performance Impact (MEDIUM)
Each RLS policy evaluation calls `app.get_user_beneficiary_id()`, which queries `user_profile`. For every row checked, this subquery executes. With `STABLE` function marking, PostgreSQL caches the result within a statement, but it adds overhead.

### Risk 4: `db:push` RLS Bugs (MEDIUM)
The `package.json` explicitly warns that `db:push` has RLS policy bugs. Schema changes must use `db:deploy` (generate + migrate). This means all policy changes must go through the migration pipeline.

### Risk 5: Drizzle Schema Drift (MEDIUM)
RLS policies exist in the database (`drizzle/schema.ts`) but NOT in the source schema (`db/schema.ts`). If someone runs `db:push` or `db:deploy` from `db/schema.ts`, it might drop the RLS policies. The policies should be either:
- Added to `db/schema.ts` using `pgPolicy()` in table definitions
- OR managed entirely via raw SQL migrations

### Risk 6: `specific_bequest` Table Missing Isolation (LOW)
This table has a `beneficiaryId` column but no RLS. If a beneficiary-facing endpoint is ever added, data would leak without RLS. Currently admin-only so low immediate risk.

### Risk 7: Unrestricted Write Policies (MEDIUM)
All INSERT/UPDATE/DELETE policies for `authenticated` role have no conditions. If a beneficiary could somehow invoke a direct database connection (not through tRPC), they could modify any row. Currently mitigated by tRPC `adminProcedure` guards.

---

## 6. Open Questions

### Must Confirm Before Implementation

1. **What role does the neon HTTP driver connect as?** Is it `neondb_owner`, `authenticated`, or another role? This determines whether RLS is enforced for production queries. Can verify with: `SELECT current_user, current_role` via the `db` (Drizzle) instance.

2. **Does `auth.jwt_session_init()` work with the HTTP driver?** The current code calls it on `getClient()` (postgres.js) but all queries use `db` (HTTP). If these are different sessions, the JWT context is lost for Drizzle queries.

3. **Can `neon()` HTTP connections set session variables?** If yes, `initJwtSession` could be modified to use the HTTP connection. If not, RLS enforcement requires a connection model change.

4. **What happens when `app.effective_user_id()` returns null?** In the beneficiary filtering policies, does `null = app.get_user_beneficiary_id()` evaluate to `false` (safe) or cause an error?

5. **Are the 33 RLS-enabled tables correct?** The test expects 33 but only 11 have policies in `drizzle/schema.ts`. Need to verify with: `SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relrowsecurity = true`.

6. **Should `db/schema.ts` be updated with `pgPolicy()` definitions?** Currently the source of truth is the database. Moving policies into `db/schema.ts` would allow Drizzle to manage them via migrations, but risks drift during the transition.

7. **What is the behavior of `FORCE ROW LEVEL SECURITY` on Neon?** Could this be used instead of switching connection roles? `ALTER TABLE distribution FORCE ROW LEVEL SECURITY` would enforce RLS even for table owners.

### Nice to Verify

8. **Test the `app.set_test_user()` / `app.clear_test_user()` functions** -- do they still work correctly with the current database version?

9. **Is the `authenticated` PostgreSQL role already created by Neon?** The policies reference it. The `drizzle.config.ts` `provider: 'neon'` setting suggests Neon manages role creation.

10. **What is the performance cost of `app.get_user_beneficiary_id()` per query?** Should it be marked `STABLE` and rely on PostgreSQL's intra-statement caching, or should a different approach (e.g., session variable) be used?
