# Production Hardening Design

**Date:** 2026-02-19
**Branch:** `chore/codebase-cleanup`
**Scope:** Full production hardening — code quality, security, structure, tests

---

## Overview

The codebase is functionally complete with lint, TypeScript, and 153 unit tests all passing clean. This cleanup addresses four categories of production-readiness gaps:

1. **Code quality & config** — console.error cleanup, gitignore fixes, dev script fix, strict mode
2. **Security hardening** — Content-Security-Policy header (enforced immediately)
3. **Structural refactor** — split 9 god-page files into colocated `_components/` subfolders
4. **Error boundaries & test coverage** — per-route error.tsx + React Testing Library tests for extracted components

---

## Section 1: Code Quality & Config

### Console.error → logger
All `console.error` / `console.warn` calls in page files will be replaced with the existing `logger` from `src/lib/logger.ts`. The logger is already integrated with Sentry and supports structured module-based logging.

Affected files (26 calls total):
- `src/app/(admin)/accounting/page.tsx` (3 calls)
- `src/app/(admin)/trustees/page.tsx` (1 call)
- `src/app/(admin)/liabilities/page.tsx` (1 call)
- `src/app/(admin)/beneficiaries/page.tsx` (2 calls)
- `src/app/(admin)/dashboard/page.tsx` (3 calls)
- `src/app/(admin)/properties/page.tsx` (2 calls)
- `src/app/(admin)/accounts/page.tsx` (2 calls)
- `src/app/(admin)/vehicles/page.tsx` (2 calls)
- `src/app/(admin)/bequests/page.tsx` (2 calls)
- `src/components/editable-cells.tsx` (1 call)
- `src/hooks/use-editable-cell.ts` (1 call)
- `src/app/portal/_actions/submitHemsRequest.ts` (1 call)
- `src/app/forms/_actions/submitInventoryItem.ts` (1 call)
- `src/app/api/inventory/upload/route.ts` (1 call)
- `src/lib/uploadthing-server.ts` (1 call)

### Gitignore fixes
- Consolidate all dotenv entries to `.env*` — all env files (including `.env.example`) are private and must stay ignored
- The `docs/` directory is currently ignored, which hides the design docs being created here — remove from `.gitignore`

### Dev script
- Remove `--webpack` flag from `"dev"` script in `package.json` — this disables Turbopack (the Next.js 16 default). No functional change, just unlocks the faster bundler.

### React Strict Mode
- Re-enable `reactStrictMode: true` in `next.config.ts`
- The Radix UI + React 19 compatibility issue (radix-ui/primitives#3675) was resolved in Radix UI v1.1.x. Current deps are already on fixed versions.

---

## Section 2: Security Hardening

### Content-Security-Policy
Add a CSP header to `next.config.ts`, enforced immediately (not report-only).

Policy directives for this app:
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — required for Next.js runtime + Sentry
- `style-src 'self' 'unsafe-inline'` — required for Tailwind CSS
- `img-src 'self' data: blob: https://utfs.io https://*.ufs.sh`
- `font-src 'self'`
- `connect-src 'self' https://*.ingest.sentry.io https://*.neon.tech wss://*.neon.tech`
- `frame-ancestors 'none'` — stronger than X-Frame-Options: DENY
- `object-src 'none'`
- `base-uri 'self'`

### Proxy clarity
Enhance the comment block in `src/app/proxy.ts` to clearly distinguish UX-only cookie check from real auth. No code change — documentation only.

---

## Section 3: Structural Refactor

### Convention
Each large page gets a `_components/` subfolder colocated next to its `page.tsx`. The underscore prefix follows Next.js conventions for private folders (not route-accessible). `page.tsx` is reduced to entity setup, top-level state, and layout orchestration only.

### Pages to split

| Route | Current | After | Components to extract |
|-------|---------|-------|----------------------|
| `/liabilities` | 1,955 | ~250 | LiabilityTable, LiabilityDialog, PaymentDialog, PaymentHistorySheet |
| `/properties` | 1,916 | ~250 | HomesteadSection, RentalSection, PropertyDialog, ValuationSection |
| `/dashboard` | 1,355 | ~200 | TaskList, TaskDialog, AccountingSummary, NotesPanel |
| `/accounts` | 1,280 | ~200 | BankAccountTable, InvestmentAccountTable, AccountDialog |
| `/beneficiaries` | 1,206 | ~200 | BeneficiaryTable, DistributionDialog, DeathDialog, WithdrawalSection |
| `/accounting` | 1,186 | ~200 | AccountingLedger, ConversionDialog, ReportPanel, EntryDialog |
| `/users` | 1,087 | ~200 | UserTable, UserProvisionDialog, UserDetailSheet |
| `/hems` | 1,042 | ~200 | HemsHistoryTable, HemsDetailSheet, ApprovalDialog |
| `/vehicles` | 1,013 | ~200 | VehicleTable, VehicleDialog |

### Rule
`page.tsx` keeps:
- `trpc.entity.list.useQuery()` + `selectedEntity` state
- Top-level query calls
- Page layout (`<div className="...">`, headings)
- Imports of sub-components

Everything else (tables, dialogs, forms, sections) goes into `_components/`.

---

## Section 4: Error Boundaries & Test Coverage

### Per-route error.tsx
Add `error.tsx` to each of the 9 refactored page directories. These are Next.js error boundary files that catch rendering errors within that route segment specifically, allowing graceful degradation per section rather than taking down the entire admin layout.

The existing `src/app/(admin)/error.tsx` remains as the fallback for all other routes.

### React Testing Library tests
For each page refactor, add tests for the most critical extracted components — specifically those containing business logic (dialogs with validation, tables with sorting/filtering, forms). Pure display components are not tested individually.

Test files go in `tests/components/<page-name>/` mirroring the `_components/` structure.

Coverage target: key interactive components for all 9 pages.

---

## Implementation Order

1. Section 1 — Code quality & config (fast wins, no risk)
2. Section 2 — CSP header (isolated config change)
3. Section 3 — Page splitting (one page at a time, verify after each)
4. Section 4 — Error boundaries + tests (written alongside each split page)

---

## Non-Goals

- No database schema changes
- No new features
- No changes to auth logic beyond proxy.ts comment
- No E2E tests (out of scope for this pass)
- No CSS/design changes
