# v4.0 Critical Review — Consolidated Findings

56 raw findings from 4 parallel review agents, deduplicated and organized.

---

## CRITICAL — Security & Data Integrity

### S1. NEON_AUTH_COOKIE_SECRET declared optional — silent auth breakage
- `src/lib/env.ts:48` — `z.string().optional()`
- `src/lib/auth/server.ts:7` — uses `env.NEON_AUTH_COOKIE_SECRET!` (non-null assertion)
- If unset in a deployment, auth silently returns null for every session → infinite redirect loop
- **Fix:** Make required `z.string().min(1)`, remove `!` assertion

### S2. ADMIN_EMAIL read from raw process.env, not validated env module
- `src/server/trpc/init.ts:16` — `process.env.ADMIN_EMAIL ?? ''`
- Bypasses `env.ts` validation; if env var absent, falls back to empty string
- Owner procedure gate becomes bypassable for blank-email edge cases
- **Fix:** Import from `@/lib/env` instead of `process.env`

### S3. Password reset doesn't revoke existing sessions
- `src/app/api/auth/custom/reset-password/route.ts:54-60` — no `revokeUserSessions` call
- `src/server/trpc/routers/userManagement.ts:437-447` — same omission
- Stolen sessions remain valid after password change
- **Fix:** Call `authServer.admin.revokeUserSessions({ userId })` after each password change

### S4. activity_log INSERT RLS has no WITH CHECK — any auth user can forge audit records
- `db/schema.ts:302-305` — INSERT policy has no `withCheck`
- UPDATE and DELETE policies also unrestricted — audit log is mutable by beneficiaries
- **Fix:** Remove UPDATE/DELETE policies; restrict INSERT with `changedBy = auth.user_id()` check

### S5. reset-password route has no input validation — DoS via unbounded password length
- `src/app/api/auth/custom/reset-password/route.ts:11-17`
- No type check on `token`/`newPassword`, no length bounds
- 10MB password string causes scrypt DoS
- **Fix:** Validate types, enforce token=64 hex chars, cap password at 128 chars

### S6. /api/e2e/setup accessible on non-prod deployments, leaks credentials in response
- `src/app/api/e2e/setup/route.ts` — `NODE_ENV === 'production'` guard only
- Returns hardcoded credentials and internal IDs in response body
- **Fix:** Add pre-shared secret header requirement, strip response body

### S7. Inventory upload writes to public/ — broken on Vercel + unauthenticated static serving
- `src/app/api/inventory/upload/route.ts` — writes to `public/uploads/inventory/`
- Vercel has read-only filesystem → silent data loss
- `public/` served without auth → estate photos publicly accessible by URL
- **Fix:** Migrate to UploadThing (already configured in project)

### S8. /api/inventory proxy bypass + no base64 size limit on analyze route
- `src/proxy.ts:13` — `/api/inventory` in publicPaths skips cookie check
- `src/app/api/inventory/analyze/route.ts` — `ImageSchema.base64` has no `.max()`
- Memory amplification attack via 5x 50MB base64 images
- **Fix:** Remove from publicPaths; add `z.string().max(10_485_760)` to base64 field

### S9. INVENTORY_ACCESS_CODE — timing attack susceptible, no lockout
- `src/app/forms/_actions/verifyAccess.ts:32-33` — plain `===` comparison
- **Fix:** Use `timingSafeEqual`, add failed-attempt counter

---

## HIGH — Performance & Correctness

### P1. Dashboard summary fetches unbounded accounting entries
- `src/server/trpc/routers/dashboard.ts:44-47` — no `.limit()` on trustAccounting query
- Grows linearly with trust activity; all rows shipped to browser
- **Fix:** Use SQL `SUM` aggregation server-side (like `trustAccounting.totals` already does)

### P2. trustAccounting.list fetches 500 rows for client-side tab filtering
- `src/app/(admin)/accounting/_components/AccountingClient.tsx:40-41`
- `listPaginated` procedure exists but is unused; client filters into income/expense tabs
- **Fix:** Switch to `listPaginated` with server-side filtering

### P3. trustAccounting.create bypasses auto-classification business logic
- `src/server/trpc/routers/trustAccounting.ts:75-97`
- `.create` does raw insert; `.createEntry` auto-classifies `isPrincipal` per Texas Property Code
- Admin UI uses `.create` → manual entries skip isPrincipal classification
- **Fix:** Remove `.create`, have all paths use `.createEntry`

### P4. listAllUsers — 3 sequential DB queries instead of Promise.all
- `src/server/trpc/routers/userManagement.ts:58-75`
- `profiles` and `beneficiaries` fetches are independent but awaited sequentially
- **Fix:** Wrap in `Promise.all`

### P5. password_reset_token — no index on email, no expired token cleanup
- `db/schema.ts:2815-2825` — no index, no scheduled cleanup
- Unbounded table growth under repeated requests
- **Fix:** Add email index, add cleanup-on-insert, limit one unexpired token per email

### P6. entityId=1 hardcoded in 15 client components
- All admin client components: `const entityId = 1`
- `src/hooks/use-entity-filter.ts` — dead code (entity filter hook never imported)
- Bypasses the entity query pattern documented in CLAUDE.md
- **Fix:** Use entity from query cache; delete dead hook or wire it up

### P7. ~50 unused CRUD functions in db/queries.ts
- `db/queries.ts:230-880` — complete CRUD sets for every asset type, never imported
- Routers do inline Drizzle queries instead
- **Fix:** Delete orphaned exports

### P8. Two parallel date formatting layers
- `src/lib/date-utils.ts` — full date-fns suite, zero imports anywhere in src/
- `src/utils/formatters.ts` — different implementation used by 43 files
- `date-fns` dependency pulled in for nothing
- **Fix:** Delete `date-utils.ts`, remove `date-fns` dep if unused elsewhere

### P9. listProvisionedUsers @deprecated but actively called
- `src/server/trpc/routers/userManagement.ts:259` — marked deprecated
- `src/app/(admin)/users/page.tsx:10` — still prefetched
- `UsersClient.tsx:53-56` — actively used for non-owner admins
- Returns structurally different shape → `NeonAuthUser` type assertion unsound
- **Fix:** Complete migration to `listAllUsers`

### P10. removeUser non-atomic — can leave orphaned auth users
- `src/server/trpc/routers/userManagement.ts:549-576`
- Deletes profile first, then calls auth API; rollback uses `onConflictDoNothing`
- **Fix:** Reverse order (remove auth first, then profile) or make truly atomic

### P11. recalculateBeneficiaryShares — N sequential UPDATEs in transaction
- `db/queries.ts:1726-1733` — loop of individual UPDATE statements
- **Fix:** Use single bulk `UPDATE ... FROM (VALUES ...)` statement

### P12. recordLiabilityPayment parseFloat falsy coercion
- `db/queries.ts:1374-1381` — `parseFloat(x) || 0` treats `"0.00"` same as missing
- If `principalPortion` is null, balance silently unchanged
- **Fix:** Use `?? 0` instead of `|| 0`, handle null principalPortion explicitly

---

## MEDIUM — Feature Stubs & Incomplete UI

### F1. Three asset types have no admin UI or router
- `artwork` — schema complete, no router, no page
- `personalProperty` — schema complete, approved inventory items write here but no browse/edit
- `insurancePolicy` — schema complete, no router, no page
- Dashboard totalAssets calculation excludes all three → understates estate value

### F2. Portal shows no HEMS request history
- `hemsRequest.myRequests` endpoint exists but never called from portal
- Beneficiary submits request, sees "you'll receive notification" but has no way to check status
- **Fix:** Add HEMS request history section to portal page

### F3. Portal has no notification mechanism
- `HemsRequestForm.tsx:214` promises notification on decision
- No email webhook for HEMS approve/deny (only password reset uses n8n)
- **Fix:** Add n8n webhook call on HEMS status change

### F4. Beneficiary fields missing from UI — taxId, withdrawal ages, contingent status
- `taxId` — required for 1099 reporting, not in any form
- `withdrawalAge1/2`, `withdrawalPct1/2` — per-beneficiary values exist in DB but code uses hardcoded constants
- `hasSupplementalNeedsTrust`, `isContingent`, `isPrimary` — not exposed

### F5. Distribution tax compliance fields not editable
- `tax1099Issued`, `taxReported`, `supportingDocPath` — not in any UI
- Trust must track 1099 issuance; currently impossible

### F6. document and transaction tables — schema only, no implementation
- `document` table — file attachments for 8 asset types, fully defined
- `transaction` table — per-asset income/expense tracking
- Neither has router, UI, or any reference in src/

### F7. trusteeFeeSchedule and trusteeFeeEntry — schema only
- Complete fee calculation and payment tracking schema
- No router, no UI — trustee compensation entirely untracked

### F8. Trust accounting reconciliation fields unused
- `reconciled`, `reconciledDate`, `documentPath` — not in UI
- No reconciliation workflow exists

### F9. hemsRequest CANCELLED status unreachable
- Enum value exists, UI renders label for it
- No cancel mutation, no cancel button anywhere

### F10. Contact fields not exposed — licenseNo, barNo
- Attorney/CPA-specific fields in schema, not in ContactDialog or forms

### F11. contactAssociation — no create/list/delete API
- Table exists, delete cleanup works, but no way to create or list associations

### F12. pendingInventoryItem.approve — approvedById permanently null
- Schema has bigint FK, auth uses UUID — incompatible, hardcoded to null

---

## LOW — Code Quality & Cleanup

### Q1. `as unknown as` casts hide type errors at boundaries
- `src/app/api/auth/custom/forgot-password/route.ts:26`
- `src/app/api/auth/custom/reset-password/route.ts:45`
- `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx:78`

### Q2. Identity cast functions in type-utils.ts — no runtime validation
- `src/lib/type-utils.ts:89-135` — 12 `asEnum` functions that are just `value as Type`
- Invalid form values pass through, fail at DB layer with opaque errors

### Q3. itemCondition enum uses lowercase while all others use SCREAMING_SNAKE_CASE
- `db/schema.ts:234-239`

### Q4. Duplicate TxSql type definition
- `src/server/trpc/routers/contact.ts:10-14` and `db/queries.ts:14-18`

### Q5. DashboardClient unused computed totals
- Lines 243-246 compute `_totalBankAccounts` etc. — underscore-prefixed, never used

### Q6. DashboardClient unmemoized filter calls
- Lines 386-390 — two `.filter()` calls outside `useMemo`, run every render

### Q7. All update schemas allow empty updates via `.partial()`
- `db/validation.ts:372-409` — no `.refine()` requiring at least one field

### Q8. BeneficiariesClient manages 10+ state vars for dialog
- Should encapsulate dialog state inside BeneficiaryDialog component

### Q9. Dashboard redundant entity.byId query
- Already has entity.list prefetch; fires separate byId for entityId=1

### Q10. Users page prefetches both user lists unconditionally
- Server component prefetches listAllUsers even for non-owner admins

### Q11. Portal client-side session waterfall
- Portal page uses client useEffect redirect despite server layout guard
- beneficiary.me query gated on client session resolution → unnecessary waterfall

### Q12. console.error in auth routes bypasses structured logger
- `src/app/api/auth/custom/forgot-password/route.ts:64,74`
- `src/app/api/auth/custom/reset-password/route.ts:64`
- `src/app/api/trpc/[trpc]/route.ts:16`

### Q13. analyze route leaks raw exception messages in 500 response
- `src/app/api/inventory/analyze/route.ts:129-136`

### Q14. valuation.list — unbounded SELECT * with no filter
- `src/server/trpc/routers/valuation.ts:7-9`

### Q15. BeneficiariesClient redundant byId fetch after distribution creation
- Already invalidates list query; explicit fetch is second round-trip
