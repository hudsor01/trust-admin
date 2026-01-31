# Phase 53: Beneficiary Data Isolation - Research Context

## Current State: NO RLS POLICIES ENFORCED

All beneficiary data isolation currently relies on **application-level WHERE clauses** in tRPC procedures. Zero RLS policies exist in the database.

- `db/rls.ts` exists with example patterns but nothing is active
- No migrations enable RLS on any tables
- No PostgreSQL policies exist

## How JWT Sessions Work

1. Neon Auth generates JWT with: `sub` (user UUID), `email`, `role`
2. `initJwtSession(token)` calls `auth.jwt_session_init(token)` in PostgreSQL
3. After init: `auth.user_id()` returns the user's UUID in SQL
4. **JWT does NOT contain `beneficiaryId`** — loaded separately from `userProfile` table

## Current Application-Level Filtering

### Beneficiary-Facing Procedures

| Procedure | File | Filtering Method |
|-----------|------|-----------------|
| `beneficiary.me` | `routers/beneficiary.ts:80` | `getBeneficiaryById(ctx.user.beneficiaryId)` |
| `hemsRequest.myRequests` | `routers/hemsRequest.ts:209` | `WHERE beneficiaryId = ctx.user.beneficiaryId` |
| `hemsRequest.submit` | `routers/hemsRequest.ts:175` | Validates `input.beneficiaryId === ctx.user.beneficiaryId` |
| `distribution.myDistributions` | `routers/distribution.ts:85` | `getDistributionsByBeneficiary(ctx.user.beneficiaryId)` |

### MISSING Beneficiary Access

| Table | Issue |
|-------|-------|
| `withdrawal_record` | Admin-only — no `beneficiaryProcedure` variant exists |
| `specific_bequest` | Not exposed to beneficiaries at all |

## Tables Needing RLS Policies

### Must Have (beneficiary-facing data)

| Table | Column | Policy Needed |
|-------|--------|--------------|
| `distribution` | `beneficiaryId` | SELECT: own rows only |
| `hems_request` | `beneficiaryId` | SELECT + INSERT: own rows only |
| `withdrawal_record` | `beneficiaryId` | SELECT: own rows only (if exposed) |
| `beneficiary` | `id` | SELECT: own record only |

### Should Have (sensitive, deny beneficiary access)

| Table | Reason |
|-------|--------|
| `trust_accounting` | Reveals trust finances |
| `liability` | Debt details |
| `trustee_fee_entry` | Trustee compensation |

## RLS Implementation Challenge: beneficiaryId Not in JWT

The JWT only contains `user_id` (UUID). RLS policies need to match against `beneficiaryId` (integer). Two approaches:

### Approach A: Helper Function (Recommended)

```sql
CREATE OR REPLACE FUNCTION auth.current_beneficiary_id()
RETURNS bigint AS $$
  SELECT beneficiary_id::bigint
  FROM user_profile
  WHERE user_id = auth.user_id()
  LIMIT 1
$$ LANGUAGE SQL SECURITY INVOKER STABLE;
```

Then use in policies:
```sql
CREATE POLICY distribution_beneficiary_select ON distribution
  FOR SELECT USING (
    beneficiary_id = auth.current_beneficiary_id()
    OR auth.user_id() IN (SELECT user_id FROM user_profile WHERE role = 'admin')
  );
```

### Approach B: Custom JWT Claims (Not Yet Supported)

Would require Neon Auth to support custom JWT claims to include `beneficiaryId`. Not available currently.

## Recommended RLS Policies

### 1. Distribution Table
```sql
ALTER TABLE distribution ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY distribution_admin ON distribution FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.user_id() AND role = 'admin'));

-- Beneficiaries: read own rows
CREATE POLICY distribution_beneficiary ON distribution FOR SELECT
  USING (beneficiary_id = auth.current_beneficiary_id());
```

### 2. HEMS Request Table
```sql
ALTER TABLE hems_request ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY hems_admin ON hems_request FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.user_id() AND role = 'admin'));

-- Beneficiaries: read + insert own rows
CREATE POLICY hems_beneficiary_select ON hems_request FOR SELECT
  USING (beneficiary_id = auth.current_beneficiary_id());

CREATE POLICY hems_beneficiary_insert ON hems_request FOR INSERT
  WITH CHECK (beneficiary_id = auth.current_beneficiary_id());
```

### 3. Beneficiary Table
```sql
ALTER TABLE beneficiary ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY beneficiary_admin ON beneficiary FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.user_id() AND role = 'admin'));

-- Beneficiaries: read own record
CREATE POLICY beneficiary_self ON beneficiary FOR SELECT
  USING (id = auth.current_beneficiary_id());
```

### 4. Sensitive Tables (deny beneficiary access)
```sql
ALTER TABLE trust_accounting ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounting_admin_only ON trust_accounting FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profile WHERE user_id = auth.user_id() AND role = 'admin'));

-- Same pattern for: liability, trustee_fee_entry, trustee_fee_schedule
```

## Security Gaps Without RLS

1. **Code bug risk:** If developer forgets WHERE clause → data leak
2. **Direct DB access:** Anyone with connection string sees all data
3. **No defense-in-depth:** Single layer of protection (application code)
4. **SQL injection risk:** If exploited, no row-level protection

## Implementation Notes

- RLS policies work alongside application-level WHERE clauses (defense-in-depth)
- Drizzle ORM queries pass through RLS transparently — no code changes needed
- Must ensure `user_profile` table is NOT behind RLS (chicken-and-egg problem)
- Test thoroughly: admin queries must still return all rows
- The `auth.current_beneficiary_id()` function adds one extra query per request
