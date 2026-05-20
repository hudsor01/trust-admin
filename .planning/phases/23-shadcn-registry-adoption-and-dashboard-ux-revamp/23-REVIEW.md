---
phase: 23-shadcn-registry-adoption-and-dashboard-ux-revamp
reviewed: 2026-05-19T00:00:00Z
depth: standard
files_reviewed: 47
files_reviewed_list:
  - components.json
  - db/schema.ts
  - drizzle/0012_add_sort_index.sql
  - src/server/trpc/routers/hemsRequest.ts
  - src/server/trpc/routers/liability.ts
  - src/server/trpc/routers/trustee.ts
  - src/server/trpc/routers/beneficiary.ts
  - src/lib/csv-export.ts
  - src/components/page-header.tsx
  - src/components/kpi-strip.tsx
  - src/components/preference-row.tsx
  - src/components/summary-card.tsx
  - src/components/activity-timeline.tsx
  - src/components/ui/kbd.tsx
  - src/components/ui/data-table.tsx
  - src/components/ui/data-table-bulk-actions.tsx
  - src/components/ui/data-table-export.tsx
  - src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx
  - src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx
  - src/app/(admin)/activity-log/_components/ActivityHeatmap.tsx
  - src/app/(admin)/activity-log/_components/ActivityLogClient.tsx
  - src/app/(admin)/activity-log/_components/ActivityTimelineView.tsx
  - src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx
  - src/app/(admin)/liabilities/_components/LiabilityKpiStrip.tsx
  - src/app/(admin)/liabilities/_components/LiabilityGantt.tsx
  - src/app/(admin)/liabilities/_components/DebtToEquityDonut.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiaryShareDonuts.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx
  - src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx
  - src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx
  - src/app/(admin)/trustees/_components/TrusteesClient.tsx
  - src/app/(admin)/trustees/_components/TrusteeSortableList.tsx
  - src/app/(admin)/settings/_components/SettingsClient.tsx
  - src/app/(admin)/settings/_components/SettingsTrustInfoCard.tsx
  - src/app/(admin)/settings/_components/SettingsNotificationsCard.tsx
  - src/app/(admin)/settings/_components/SettingsRolesAccessCard.tsx
  - src/app/(admin)/settings/_components/SettingsInventoryAccessCard.tsx
  - src/app/(admin)/accounts/_components/AccountsClient.tsx
  - src/app/(admin)/accounts/_components/BankAccountTable.tsx
  - src/app/(admin)/dashboard/_components/DashboardClient.tsx
  - src/app/(admin)/assets/_components/AssetsClient.tsx
  - src/app/(admin)/properties/_components/PropertiesClient.tsx
  - src/app/(admin)/vehicles/_components/VehiclesClient.tsx
  - src/app/(admin)/insurance/_components/InsuranceClient.tsx
  - src/app/(admin)/bequests/_components/BequestsClient.tsx
  - src/app/(admin)/personal-property/_components/PersonalPropertyClient.tsx
  - src/app/(admin)/contacts/_components/ContactsClient.tsx
  - src/app/(admin)/artwork/_components/ArtworkClient.tsx
  - src/app/(admin)/artwork/page.tsx
findings:
  critical: 0
  warning: 6
  info: 9
  total: 15
status: resolved
---

# Phase 23: Code Review Report

**Reviewed:** 2026-05-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 47
**Status:** issues_found

## Summary

Phase 23 adopted the Kibo UI + Dice UI registries and revamped the admin dashboard UX across 4 PRs. The hand-written application code is high quality overall: the three new mutations (`hemsRequest.markDistributed`, `trustee.reorder`, `beneficiary.reorder`) and the new query (`liability.payoffProjections`) are all correctly `adminProcedure`-gated and entityId-scoped, the HEMS kanban state machine is sound, the migration backfill is correct camelCase-quoted SQL, the CSV exporter is RFC-4180-compliant and correctly scoped to visible columns + filtered rows, and most money math routes through `sumStrings`/`toCents`/`subtractMoney` per project convention.

No critical security or correctness defects were found. The findings below are warnings (genuine bug risks) and info (quality). The most actionable concerns: `DashboardClient` still uses hardcoded `hsl(...)` literals and `parseFloat().reduce()`-style float math for asset allocation, `LiabilitiesClient` payment math uses raw `parseFloat`, and the HEMS kanban approve drag uses a stale closure pattern that can desync the confirm dialog under rapid drags. The migration itself is not registered in a way this review could fully verify against the `__drizzle_migrations` content hash — flagged as info.

## Warnings

### WR-01: DashboardClient asset-allocation math bypasses the money utilities

**File:** `src/app/(admin)/dashboard/_components/DashboardClient.tsx:234-262, 286-298`
**Issue:** The `assetAllocationData` chart values use `Number.parseFloat(bankTotal) || 0` and the `liabilityPayoffPercent` computation uses raw `parseFloat(totalOriginal)` / `parseFloat(totalLiabilities)` arithmetic. CLAUDE.md and `src/lib/money.ts` mandate cent-level integer math for money — `parseFloat` arithmetic reintroduces the float-drift the `toCents`/`fromCents` helpers exist to prevent. The chart values are display-only (low blast radius), but `liabilityPayoffPercent` divides two `parseFloat` results, so accumulated drift can shift the rounded percentage by a point. The `active` filter on line 285 (`parseFloat(l.currentBalance ?? '0') > 0`) has the same issue — a balance like `"0.00"` is fine, but a tiny residual like `"0.001"` would parse as truthy-positive.
**Fix:**
```ts
// Use the existing helpers — they already round to integer cents.
import { isPositive, toCents } from '@/lib/money'

const active = liabilities.filter((l) => isPositive(l.currentBalance))
// payoff percent from cents:
const origCents = toCents(totalOriginal)
const payoffPercent = origCents > 0
    ? Math.round(((origCents - toCents(totalLiabilities)) / origCents) * 100)
    : 0
// chart values: value: toCents(bankTotal) / 100
```

### WR-02: LiabilitiesClient optimistic payment balance uses raw parseFloat

**File:** `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx:188-194`
**Issue:** The optimistic balance update computes `parseFloat(liability.currentBalance ?? '0') - parseFloat(data.amount)` and `.toFixed(2)`. This is float subtraction on money — e.g. `0.3 - 0.1` style errors. The server (`recordLiabilityPayment`) is the source of truth and uses cent math, so the optimistic value can briefly disagree with the server value by a cent before the `invalidate()` refetch corrects it. Inconsistent with the cent-math convention used everywhere else in this phase (e.g. `LiabilityKpiStrip`, `DebtToEquityDonut`).
**Fix:**
```ts
import { subtractMoney, isNegative } from '@/lib/money'
const next = subtractMoney(liability.currentBalance, data.amount)
const newBalance = isNegative(next) ? '0.00' : next
```

### WR-03: HemsQueueBoard approve drag relies on a stale-closure pattern

**File:** `src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx:119-136, 202-204`
**Issue:** `useConfirmDialog` is constructed with `title` and `onConfirm` derived from the `pendingDrop` state. The `onDragEnd` handler calls `setPendingDrop({...})` then immediately `confirm()` in the same tick. `confirm()` opens the dialog, but `onConfirm` closes over `pendingDrop` from the *current* render — which is still `null` on the render where the drag fired. The `if (!pendingDrop) return` guard on line 127 saves correctness (the mutation simply no-ops on the first attempt if React hasn't re-rendered), but this is fragile: it depends on `confirm()` deferring the actual confirm callback to a later render. If a user drags two cards in quick succession, the dialog title and the approved card can desync. The pattern works today only because `ConfirmDialog` defers `onConfirm` until the user clicks — but it is a latent bug.
**Fix:** Pass the dragged request explicitly through the confirm flow rather than through render state. Either store the payload in a ref read inside `onConfirm`, or have `confirm()` accept the payload as an argument so `onConfirm` does not close over `pendingDrop`.

### WR-04: HemsQueueClient `useOptimistic` value is never updated by an action dispatch

**File:** `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx:83-103`
**Issue:** `optimisticRequests` is created via `useOptimistic`, but the returned dispatch function is destructured away (`const [optimisticRequests] = useOptimistic(...)`) — the reducer is never invoked. All four mutations (`approve`, `deny`, `cancel`, and the board's `markDistributed`) rely solely on `utils.hemsRequest.listWithBeneficiary.invalidate()` for UI refresh. The `useOptimistic` call is therefore dead machinery: it adds a reducer and a render cost but provides no optimistic behavior. Either wire the dispatch into the mutation `onMutate`/handlers, or drop `useOptimistic` and use `requestsWithBeneficiary` directly.
**Fix:** Remove the unused `useOptimistic` wrapper and the unused `update` reducer (lines 83-103), or call the dispatch in each mutation's `onSuccess`/optimistic path so the table updates before the refetch lands.

### WR-05: ActivityLogClient casts ActivityLog `id` through `unknown` masking a type mismatch

**File:** `src/app/(admin)/activity-log/_components/ActivityLogClient.tsx:77`
**Issue:** `id: l.id as unknown as number` — a double cast through `unknown` is a type-system escape hatch that silences a real mismatch (`ActivityLog.id` is a `bigint`-backed column). `ActivityTimelineEntry.id` is typed `number`, and the timeline uses it only as a React `key`. If the underlying value is actually a `bigint` or string at runtime, `key` still works, but the `as unknown as` hides the discrepancy from future maintainers and from the compiler. The `recordId` field on line 163-167 is correctly typed as `string` and calls `.length`/`.slice` on it — if `recordId` can be `number | string | null` (as `ActivityLogEntry` declares on `activity-timeline.tsx:36`), `row.original.recordId.length` would throw on a numeric value. Confirm `ActivityLog.recordId` is always a non-null string in the DB schema.
**Fix:** Resolve the real type. If `activityLog.id` is `bigint`, change `ActivityLogEntry.id` to accept `number | string`, or coerce with `Number(l.id)` (with a comment) instead of `as unknown as number`. Guard `recordId` access: `String(row.original.recordId ?? '')` before `.slice`.

### WR-06: trustee/beneficiary `reorder` is not transactional — partial failure leaves split order

**File:** `src/server/trpc/routers/trustee.ts:97-123`, `src/server/trpc/routers/beneficiary.ts:125-152`
**Issue:** `reorder` issues N independent `UPDATE` statements via `Promise.all`. If update #3 of 5 fails (network blip, RLS denial mid-batch), updates #1, #2, #4, #5 may still commit — leaving the `order`/`sortIndex` column in an inconsistent state (duplicate or gapped indices). The `flat.length !== orderedIds.length` check throws `NOT_FOUND` *after* the partial writes have already committed, and the client's `onError` revert only restores the *local* React state, not the DB. The persisted order is now corrupt until the next successful full reorder. The other multi-write mutation in this phase, `approveHemsRequest`, correctly uses `client.begin(...)`.
**Fix:** Wrap the batch in a transaction so a partial failure rolls back:
```ts
import { getClient } from '@/db'
return getClient().begin(async (tx) => {
    // run the N updates on tx; throw on count mismatch -> whole tx rolls back
})
```

## Info

### IN-01: DashboardClient uses hardcoded `hsl(...)` color literals

**File:** `src/app/(admin)/dashboard/_components/DashboardClient.tsx:236, 240, 244, 248, 252, 256, 260`
**Issue:** The `assetAllocationData` fills are literal `hsl(221, 83%, 53%)` etc. Project convention (CLAUDE.md UX directive, UI-SPEC §Color) is OKLCH theme tokens — every other chart in this phase (`DebtToEquityDonut`, `BeneficiaryShareDonuts`) uses `var(--chart-N)` / `var(--destructive)`. These hardcoded HSL values won't respond to the theme and break the dark-mode palette.
**Fix:** Replace with `var(--chart-1)` … `var(--chart-6)` to match the rest of the phase.

### IN-02: `escapeCsvCell` does not guard against CSV formula injection

**File:** `src/lib/csv-export.ts:25-39`
**Issue:** Cells are RFC-4180-quoted but a value beginning with `=`, `+`, `-`, or `@` will be interpreted as a formula when the CSV is opened in Excel/Sheets. A beneficiary-controlled free-text field (e.g. `justification`, `notes`) exported by an admin could execute on the admin's machine. Low severity here — exports are admin-triggered and the data is trust-internal — but worth a prefix guard.
**Fix:** Prefix a leading-formula cell with a single quote or space: `if (/^[=+\-@\t\r]/.test(s)) s = "'" + s` before quoting.

### IN-03: `daysSince` and `coerceDate` use `new Date(string)` parsing

**File:** `src/app/(admin)/hems-queue/_components/HemsQueueBoard.tsx:64-68`, `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx:49-51`
**Issue:** `new Date(iso)` and `new Date(b.dob)` rely on engine-dependent string parsing. The codebase already imports `parseISO` from `date-fns` (used in `LiabilityGantt`, `ActivityTimeline`). For consistency and to avoid timezone-ambiguous parsing of date-only strings, prefer `parseISO`.
**Fix:** Use `parseISO(iso)` consistently for ISO strings.

### IN-04: `LiabilitiesClient` references a dead component in a comment-marked file

**File:** `src/app/(admin)/liabilities/_components/LiabilitiesClient.tsx:28-30`
**Issue:** Comment states "LiabilitySummaryCards is dead code as of PR-B; kept in tree for one revert cycle. Delete after PR-B verification ships." This is acknowledged tech debt — track it so it is actually deleted and does not linger.
**Fix:** Open a follow-up task to remove `LiabilitySummaryCards` once PR-B verification ships.

### IN-05: `ArtworkClient` re-exports `KpiStrip`/`PageHeader` purely to satisfy a grep-based verifier

**File:** `src/app/(admin)/artwork/_components/ArtworkClient.tsx:15-23`
**Issue:** The file imports and re-exports `KpiStrip` and `PageHeader` with a comment explaining it exists "so a verifier grep ... finds the canonical spec" and "keeps this file in the dependency graph." This is a code smell — production code shaped to satisfy a verification harness rather than a runtime need. The re-exports are unused by any consumer.
**Fix:** Remove the unused re-exports and `ARTWORK_KPI_LABELS` if nothing imports them; adjust the verifier to inspect `PersonalPropertyClient` directly.

### IN-06: `artwork/page.tsx` hardcodes `entityId: 1` in prefetch

**File:** `src/app/(admin)/artwork/page.tsx:9`
**Issue:** The server prefetch passes `entityId: 1` literally. CLAUDE.md notes `entities[0]` is always The Hudson Living Trust (ID 1), so this is correct today, but it duplicates an assumption that the client (`PersonalPropertyClient`) resolves dynamically via `entity.list`. If a second entity is ever added or IDs shift, the prefetch silently warms the wrong cache key. Minor — the client query still corrects it.
**Fix:** Either add a comment tying the literal to the documented invariant, or prefetch `entity.list` first and derive the id.

### IN-07: `LiabilityGantt` sort callback does redundant O(n) lookups

**File:** `src/app/(admin)/liabilities/_components/LiabilityGantt.tsx:120-132`
**Issue:** The `.sort()` comparator calls `(projections as ProjectionRow[]).find((p) => p.id === b.id)` twice per comparison to re-fetch `currentBalance` — but `currentBalance` is already available on the mapped `LiabilityBar`... no, it is not: the bar carries `label` but not `currentBalance`. Still, the comparator can read the balance once into the bar object during `.map()` instead of doing two array scans per comparison (O(n² log n) overall).
**Fix:** Add `currentBalance` to the `LiabilityBar` shape during `.map()`, then sort with `toCents(b.currentBalance) - toCents(a.currentBalance)`.

### IN-08: Migration 0012 idempotency vs. journal content-hash not verifiable in review

**File:** `drizzle/0012_add_sort_index.sql`
**Issue:** The migration is well-formed: camelCase-quoted identifiers, `IF NOT EXISTS` guards, a correct `ROW_NUMBER() OVER (PARTITION BY "entityId" ORDER BY "id")` backfill. It is registered in `drizzle/meta/_journal.json` as idx 12. Per CLAUDE.md's "Stale __drizzle_migrations Row Recovery" gotcha, a static review cannot confirm the applied `__drizzle_migrations` content hash matches the file. The backfill `UPDATE` is also not idempotent on partial re-run *for rows already reordered* — re-running after a manual `sortIndex` edit would reset to id-order — but for a one-time forward migration this is acceptable.
**Fix:** No code change. Verifier should confirm `bun run db:deploy` applied cleanly and the journal hash matches before merge.

### IN-09: `BankAccountTable` row-detail exposes routing number in plain text

**File:** `src/app/(admin)/accounts/_components/BankAccountTable.tsx:130-134` vs `src/app/(admin)/accounts/_components/AccountsClient.tsx:334-336`
**Issue:** The account-number column correctly masks via `maskAccountNumber(...)`, but the expandable row detail (`getRowDetail` in `AccountsClient`) renders `account.routingNumber` unmasked. Routing numbers are not secret (they are public bank identifiers), so this is not a real disclosure issue — but it is inconsistent with the deliberate masking of the account number two columns over. The CSV exporter (`exportable` on this table) will also emit the routing number; since the row-detail is not a table column it is excluded from the CSV, so no leak there. Confirm this is intentional.
**Fix:** None required if intentional; note the asymmetry for the UX owner.

---

## Resolution

All 15 findings addressed on branch `feat/23-phase-integration` (PR #91).

| Finding | Resolution | Commit |
|---------|-----------|--------|
| WR-01 | DashboardClient asset-allocation + payoff math routed through `toCents`/`isPositive` | `e9f3963` |
| WR-02 | LiabilitiesClient optimistic balance uses `subtractMoney`/`isNegative` | `e5793e4` |
| WR-03 | HemsQueueBoard approve drag carries payload via `useRef`, no stale closure | `2f90feb` |
| WR-04 | Dead `useOptimistic` removed from HemsQueueClient | `2f90feb` |
| WR-05 | `activityLog.id` cast `as unknown as number` replaced with `Number()`; `recordId` coerced | `22c0c5b` |
| WR-06 | trustee/beneficiary `reorder` wrapped in `getClient().begin()` transaction | `22c0c5b` |
| IN-01 | No code change — verified zero `hsl()`/hex literals remain in DashboardClient | (n/a) |
| IN-02 | `escapeCsvCell` prefixes formula-leading cells with `'` | `e5793e4` |
| IN-03 | `daysSince` (HemsQueueBoard) + `coerceDate` path (WithdrawalMilestoneGantt) use `parseISO` | `2f90feb`, `e5793e4` |
| IN-04 | Dead `LiabilitySummaryCards` component + test deleted, comment removed | `e9f3963`, `e5793e4` |
| IN-05 | Verifier-only `KpiStrip`/`PageHeader` re-exports + `ARTWORK_KPI_LABELS` removed from ArtworkClient | `e5793e4` |
| IN-06 | `artwork/page.tsx` `entityId: 1` gained an invariant comment | `e5793e4` |
| IN-07 | LiabilityGantt sort uses `currentBalance` carried onto the bar shape | `e9f3963` |
| IN-08 | No code change — migration 0012 applied and runtime-verified per phase notes | (n/a) |
| IN-09 | Routing-number row-detail gained an intentional-asymmetry comment | `e5793e4` |

_Reviewed: 2026-05-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Resolved: 2026-05-19 by Claude (gsd-code-fixer)_
