---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Production Hardening & Completeness
status: executing
stopped_at: Phase 23 plan 03-liabilities-beneficiaries-kpi-rollout complete (commits 396e5e3+5b4a6fa+53e9cc4+4226daf)
last_updated: "2026-05-20T00:55:00.372Z"
last_activity: 2026-05-20
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 24
  completed_plans: 21
  percent: 88
---

# State: Trust Admin

## Current Position

Milestone: v4.0 Production Hardening & Completeness
Phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp — EXECUTING
Plan: 3 of 4 (Wave 1 complete — PR-1 foundation shipped on feat/23-01-foundation)
Status: Ready to execute
Last activity: 2026-05-20

Progress: [█████████░] 88%

## Accumulated Context

### Key Decisions

- **userProfile.role is source of truth for tRPC authorization** (not Neon Auth native role)
- **ADMIN_EMAIL env var overrides role** -- owner email always gets admin regardless of DB state
- Neon Auth native role ("admin"/"user") used only by layout guards for routing
- RLS via `initJwtSession()` already implemented
- **Hybrid driver approach:** neon() HTTP for Drizzle, postgres.js for raw SQL
- **Two-step provisioning:** authServer.admin.createUser() -> set emailVerified=true via raw SQL -> upsert userProfile
- **emailVerified MUST be set to true** for admin-created users or sign-in returns 403
- **Neon Auth updateUser() returns 400** -- use raw SQL against neon_auth."user" instead
- **neon_auth."user" uses camelCase columns** ("emailVerified", "updatedAt", "createdAt")
- **Single login page** at /auth/sign-in with AuthView redirectTo="/"
- **Neon Auth cookie** is `__Secure-neon-auth.session_token`
- **proxy.ts at src/proxy.ts** -- Next.js 16 proxy convention
- **forcePasswordChange flag** in user_profile -- set to true when admin creates beneficiary account
- **Forgot password** uses custom flow (n8n webhook) -- Neon Auth email not used
- [v4.0] Phase structure derived from 45-finding critical review; security-first ordering
- [v4.0] Phases 16/17/18 can run in parallel after Phase 15 (no cross-dependencies)
- [v4.0] E2E setup route gated with x-e2e-secret header check against E2E_SETUP_SECRET env var (fail-closed)
- [v4.0] E2E setup response stripped to email-only -- no userId or beneficiaryId leaked
- [v4.0] Cookie secret uses z.string().trim().min(32) -- app refuses to start without valid secret
- [v4.0] ADMIN_EMAIL centralized via validated env module -- no process.env.ADMIN_EMAIL in src/server/
- [v4.0] Session revocation after password changes is best-effort (Sentry on failure, no user-facing error)
- [v4.0] Reset-password API returns generic 'Invalid input' on validation failure (no schema detail leaks)
- [v4.0] In-memory Map for IP lockout -- sufficient for single Vercel instance; no Redis needed at current scale
- [v4.0] Upload route response key changed from 'paths' to 'urls' for UploadThing migration
- [v4.0] activity_log immutable: no UPDATE/DELETE RLS, INSERT enforces changedBy = own user ID
- [v4.0] No FORCE ROW LEVEL SECURITY on activity_log -- neondb_owner must bypass for system audit
- [v4.0] RLS migration SQL applied manually (not db:push) due to Drizzle bugs with RLS policies
- [v4.0] /api/inventory removed from proxy publicPaths -- defense-in-depth with route-level auth
- [v4.0] 10MB base64 limit per image on analyze route (~7.5MB raw after base64 decoding)
- [v4.0] Portal prefetch: useSession() kept for display name only, beneficiary.me.useQuery() unconditional (layout validates auth)
- [v4.0] Portal page.tsx no dynamic export needed -- parent layout already has force-dynamic
- [v4.0] Accounting listPaginated uses entryType filter + offset/limit (page size 50, limit 1-100)
- [v4.0] Tab badge counts from totals query entryCount, not array lengths -- accurate across all pages
- [v4.0] DataTable client-side pagination disabled for accounting; custom Previous/Next controls used
- [v4.0] Dashboard totals via SQL SUM (summaryTotals procedure) -- not client-side sumStrings over all rows
- [v4.0] Dashboard accounting entries bounded to 10 per type (recentAccountingEntries) -- no unbounded fetches
- [v4.0] listAllUsers changed from ownerProcedure to adminProcedure -- read-only data safe for all admins; non-owner admins see same data without mutation controls
- [v4.0] Nullish coalescing (??) for money string fallbacks -- principalPortion="0.00" is a valid value, not falsy
- [v4.0] Bulk UPDATE with CASE/WHEN via tx.unsafe() for beneficiary share redistribution -- safe because values are DB integers and computed decimals
- [v4.0] requireAtLeastOneField() Zod .refine() on all 26 update schemas -- prevents silent no-op UPDATEs from empty payloads
- [v4.0] Password reset token dedup: invalidate existing (set usedAt) before insert, cleanup expired > 24h
- [v4.0] Asset router pattern: replicate vehicle.ts exactly (adminProcedure, entityId filter, updatedAt on write, NOT_FOUND on missing)
- [v4.0] Sidebar asset links ordered: Properties, Accounts, Vehicles, Artwork, Personal Property, Insurance, Inventory Queue
- [v4.0] Insurance policies use coverageAmount (not dodValue) as primary value metric in dashboard totals
- [v4.0] Insurance table uses ACTIVE/EXPIRED/CANCELLED status subset (not SOLD/TRANSFERRED/DISPOSED)
- [v4.0] Beneficiary cancel uses direct async function (not useActionState) -- button click not form submit
- [v4.0] HEMS status badge mapping defined locally in HemsHistoryCard -- global STATUS_VARIANTS lacks HEMS statuses
- [v4.0] Tax ID masking via helper text below field -- EditableTextCell has no displayValue prop; full value visible only in admin edit mode
- [v4.0] HEMS cancel button on all non-CANCELLED statuses with contextual warning for processed (APPROVED/DISTRIBUTED) requests
- [v4.0] Distribution tax toggles use Switch component with inline tRPC mutation to distribution.update
- [v4.0] Accounting reconciliation uses opacity-60 on description/category/flags cells (DataTable lacks rowClassName)
- [v4.0] Conditional form fields via formInstance.Subscribe selector pattern for role-dependent professional fields
- [v4.0] Nullable FK Select dropdowns use "none" sentinel value mapped to null in onValueChange
- [v4.0] Trustee edit reuses create dialog via shared editingId state pattern
- [v4.0] validateEnum<T> generic for runtime enum validation -- throws descriptive Error on invalid input
- [v4.0] Dialog components own internal form state (distribution, deceased) -- parent passes minimal props
- [v4.0] Entity cache pattern: trpc.entity.list.useQuery() + entities?.[0]?.id replaces hardcoded entityId=1 in all 17 admin clients
- [v4.0] Query guard { enabled: !!entityId } on all entity-dependent queries; entityId! non-null assertion for mutation payloads
- [v4.0] Structured logging (logger.auth/logger.api) replaces console.error in API routes; generic 500 errors prevent message leaks
- [v4.0] TxSql type defined once in db/index.ts -- imported by db/queries.ts and contact.ts (no duplicate definitions)
- [v4.0] Internal CRUD helpers in db/queries.ts made private -- only exported via CRUD object aggregations
- [v4.0] date-fns removed (unused) -- date-utils.ts had zero imports across codebase
- [Phase 23] components.json registries block uses @kibo-ui + @diceui only -- Origin UI excluded per UI-SPEC rev 1 safety gate (date-range covered by calendar mode='range', switch already present)
- [Phase 23] Kbd hand-rolled at src/components/ui/kbd.tsx (UI-SPEC §14 verbatim) -- @diceui/kbd returns HTTP 404
- [Phase 23] shadcn-official context-menu installed in PR-1 (not PR-B) -- prefetched as @kibo-ui/gantt regDep for PR-C
- [Phase 23] SummaryCard delta colors use text-success / text-destructive tokens (NOT text-green-600 / text-red-600) per UI-SPEC §Color
- [Phase 23] SummaryCard value uses font-semibold tabular-nums (NOT font-bold) per UI-SPEC §Typography Display
- [Phase 23] SummaryCard exports accessory?: ReactNode prop -- top-3 right-3 absolute slot for sparklines / status badges
- [Phase 23] KpiStripItem.invertDelta convention: caller marks 'down is good' (liabilities, expenses); zero treated as positive in both modes
- [Phase 23] KpiStrip sparkline uses inline recharts <LineChart> stroke=var(--primary) with isAnimationActive=false to avoid React Compiler bailout from reconciliation churn
- [Phase 23] PageHeader composition (h1 + breadcrumb + actions) lives in src/components/ (NOT src/components/ui/) -- app-specific composition vs generic primitive

### Auth API Patterns That Work

```typescript
// Create user
const { user: newUser } = await authServer.admin.createUser({ email, name, password, role: 'user' })

// Set emailVerified (must do for admin-created users)
await getSql().query(`UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = $1`, [userId])

// Upsert user_profile
await db.insert(userProfile).values({...}).onConflictDoUpdate({
    target: userProfile.userId,
    set: { role, beneficiaryId, forcePasswordChange, updatedAt: new Date() }
})

// Update user record
await getSql().query(`UPDATE neon_auth."user" SET "updatedAt" = $1 WHERE id = $2`, [new Date(), userId])

// List users
const { users } = await authServer.admin.listUsers({ query: { limit: 100, offset: 0 } })

// Forgot password -- direct SQL lookup (NOT listUsers)
const rows = await sql`SELECT id, name, email FROM neon_auth."user" WHERE lower(email) = lower(${email}) LIMIT 1`
```

### Blockers/Concerns

- ~~SEC-07 (UploadThing migration) requires verifying UploadThing config is still active and token valid~~ DONE in 16-02
- ~~CORR-04 (deprecated API migration) may affect Users page behavior for non-owner admins~~ DONE in 18-02

## Roadmap Evolution

- 2026-01-23: v1.0 shipped -- Neon Platform Integration (phases 1-6)
- 2026-01-22: v2.0 shipped -- Public Inventory Form (phases 7-8)
- 2026-02-22: v3.0 shipped -- Email/Password Auth Migration (phases 9-14)
- 2026-02-24: Forgot-password flow built outside GSD (unplanned)
- 2026-03-08: v4.0 roadmap created -- Production Hardening & Completeness (phases 15-22)
- 2026-05-19: Phase 23 added -- Shadcn registry adoption and dashboard UX revamp (full revamp per approved plan at ~/.claude/plans/yes-i-would-live-bright-pumpkin.md; 5 sub-PRs covering registry foundation, headline page redesigns, and DataTable/settings polish)

## Session Continuity

Last session: 2026-05-20T00:54:47.587Z
Stopped at: Phase 23 plan 03-liabilities-beneficiaries-kpi-rollout complete (commits 396e5e3+5b4a6fa+53e9cc4+4226daf)
Resume file: None

**Planned Phase:** 23 (Shadcn registry adoption and dashboard UX revamp) — 5 plans — 2026-05-19T22:28:15.607Z

**Phase 23 progress:**

- [x] 23-01-foundation (Wave 1 / PR-1) — registries wired, 6 primitives + Kbd installed, SummaryCard patched, PageHeader + KpiStrip built, 12 Wave-0 tests passing — 2026-05-19
- [ ] 23-02-hems-kanban-and-activity-log (Wave 2 / PR-2)
- [x] 23-03-liabilities-beneficiaries-kpi-rollout (Wave 2 / PR-B) — payoffProjections batched query, Kibo gantt + avatar-stack installed, LiabilityKpiStrip/Gantt/DebtToEquityDonut, BeneficiaryShareDonuts/AvatarStack/WithdrawalMilestoneGantt, KpiStrip + PageHeader on 11 admin pages, 16 Wave-0 tests, 938 unit tests passing — 2026-05-20 (commits 396e5e3, 5b4a6fa, 53e9cc4, 4226daf on feat/23-03-liabilities-beneficiaries-kpi-rollout)
- [ ] 23-04-datatable-and-settings-polish (Wave 4 / PR-4)
- [ ] 23-05-asset-wizard (DEFERRED)
