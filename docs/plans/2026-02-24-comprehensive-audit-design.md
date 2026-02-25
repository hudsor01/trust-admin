# Design: v4.0 Comprehensive Audit & Remediation

**Date:** 2026-02-24
**Status:** Approved
**Milestone:** v4.0

---

## Goal

Run a single comprehensive audit of the entire application — automated where possible — that produces a root cause report for every broken interaction, then implement all fixes. When complete, the app is in a stable, production-ready state. This is a one-time quality event, not ongoing CI.

**Success criteria:** Audit runs once, produces a report, all issues are fixed, project is stable.

---

## Architecture: Three-Layer Approach

### Layer 1 — Static Analysis (Zero runtime, fast)

Catches issues without running the app:

- `bun run typecheck` — TypeScript compile errors across all files
- `bun run lint` — Biome lint violations (unused vars, style, imports)
- Schema vs tRPC vs UI contract alignment — cross-check that router procedure inputs/outputs match what forms send/display

### Layer 2 — Unit & Integration Tests (Bun test runner)

Tests individual procedures and components in isolation with a real test DB branch:

- **tRPC procedures:** Every router → CRUD happy path, auth guard enforcement, invalid input rejection
- **API routes:** `/api/auth/custom/forgot-password`, `/api/auth/custom/reset-password`, `/api/inventory/analyze`, `/api/inventory/upload` — test request/response contracts
- **Component rendering:** Key forms render without crash, inline editors toggle correctly
- **Auth flows:** Session propagation, `forcePasswordChange` redirect logic, role-based access (admin vs beneficiary)

Test DB: existing Neon branch `ep-gentle-salad-aef4mc4y` (`.env.test.local`)

### Layer 3 — Playwright E2E (Full browser, authenticated sessions)

Drives real browser sessions against `http://localhost:3000` (dev server):

- **Admin auth:** Sign in, sign out, wrong password, forgot password → reset password
- **Beneficiary auth:** Sign in as beneficiary, forced password change flow
- **Entity context:** Entity selector loads, queries gated on `selectedEntity`
- **All admin CRUD pages:** Each resource type — create, edit, delete, inline edit
- **Distribution workflows:** HEMS request submit → approve → mark paid
- **User management:** Create beneficiary account, change role, reset password, ban, delete
- **Beneficiary portal:** View shares, submit HEMS request, view distributions
- **Dialogs & confirmations:** Confirm dialogs appear before destructive actions
- **Error states:** 404 page, portal error boundary
- **Public inventory form:** Submit flow

---

## Exhaustive Coverage Map

### Authentication & Authorization

| Interaction | Layer |
|-------------|-------|
| Sign in with email/password (admin) | E2E |
| Sign in with email/password (beneficiary) | E2E |
| Sign in — wrong password → error message | E2E |
| Sign in — unverified account → 403 handling | Unit |
| Sign out | E2E |
| Forgot password form → submit email | E2E |
| Forgot password — unregistered email (no error leak) | E2E |
| Reset password — valid token | E2E |
| Reset password — expired token | Unit + E2E |
| Reset password — already used token | Unit |
| Forced password change redirect on beneficiary login | E2E |
| Change password form (portal) | E2E |
| Admin role guard on admin pages | E2E |
| Beneficiary role guard on portal | E2E |
| Owner email override → always admin | Unit |

### Dashboard & Global UI

| Interaction | Layer |
|-------------|-------|
| Dashboard page loads (entity selector, KPI tiles) | E2E |
| Entity selector populates from DB | E2E |
| Activity log table renders, pagination | E2E |
| Navigation sidebar links (all routes) | E2E |
| Sentry error boundary test | Unit |

### Assets — All 8 Types

For each: `homestead`, `rentalProperty`, `bankAccount`, `investmentAccount`, `vehicle`, `insurancePolicy`, `personalProperty`, `artwork`:

| Interaction | Layer |
|-------------|-------|
| List page loads, filtered by entityId | E2E |
| Create new asset (dialog form) | E2E |
| Edit asset (inline or dialog) | E2E |
| Delete asset (confirm dialog) | E2E |
| DOD value / transfer status updates | E2E |
| tRPC list/byId/create/update/delete procedures | Integration |
| entityId filter enforced | Integration |

### Liabilities

| Interaction | Layer |
|-------------|-------|
| List page loads | E2E |
| Create liability (form) | E2E |
| Edit liability | E2E |
| Delete liability (confirm) | E2E |
| Record payment → balance decreases → accounting entry created | E2E |
| Payment history table | E2E |
| Secured debt linking (homestead/rental/vehicle) | Integration |

### Trust Accounting

| Interaction | Layer |
|-------------|-------|
| Income/expense ledger renders | E2E |
| Create income entry | E2E |
| Create expense entry | E2E |
| Edit entry | E2E |
| Delete entry (confirm) | E2E |
| isPrincipal toggle | E2E |
| Income-to-principal transfer math (integer arithmetic) | Unit |

### Beneficiaries

| Interaction | Layer |
|-------------|-------|
| Beneficiary list page | E2E |
| Create beneficiary | E2E |
| Edit beneficiary (name, share %, distribution standard) | E2E |
| Delete beneficiary (confirm) | E2E |
| Share percent total validation | Unit |
| Inline field editing | E2E |

### Distributions & HEMS

| Interaction | Layer |
|-------------|-------|
| HEMS request list (admin view) | E2E |
| Approve HEMS request → auto-creates distribution, sets distributionId | E2E |
| Deny HEMS request | E2E |
| Distribution list | E2E |
| Create distribution manually | E2E |
| Mark distribution paid | E2E |
| tax1099Issued toggle | E2E |
| Beneficiary submits HEMS request (portal) | E2E |
| Beneficiary views own distributions (portal) | E2E |
| HEMS request fields: amountRequested, justification, category | Integration |

### Withdrawal Records

| Interaction | Layer |
|-------------|-------|
| Withdrawal record list | E2E |
| Create withdrawal record | E2E |
| Edit withdrawal record | E2E |
| Delete withdrawal record | E2E |

### User Management

| Interaction | Layer |
|-------------|-------|
| User list page loads | E2E |
| Create beneficiary user account | E2E |
| Edit user name | E2E |
| Edit user email | E2E |
| Change user role (admin ↔ user) | E2E |
| Reset user password | E2E |
| Ban user | E2E |
| Unban user | E2E |
| Revoke user sessions | E2E |
| Delete user (confirm) | E2E |
| Mark associated beneficiary as deceased + date of death | E2E |
| emailVerified = true enforcement for new accounts | Integration |

### Contacts

| Interaction | Layer |
|-------------|-------|
| Contact list | E2E |
| Create contact | E2E |
| Edit contact | E2E |
| Delete contact (confirm) | E2E |

### Inventory / AI Features

| Interaction | Layer |
|-------------|-------|
| Public inventory submission form | E2E |
| Pending inventory items list (admin) | E2E |
| Approve inventory item → creates asset | E2E |
| Reject inventory item | E2E |
| AI analysis route (`/api/inventory/analyze`) auth guard | Integration |

### Tasks / Activity

| Interaction | Layer |
|-------------|-------|
| Task list | E2E |
| Create task | E2E |
| Complete task | E2E |
| Delete task | E2E |
| Activity log pagination | E2E |

### Beneficiary Portal

| Interaction | Layer |
|-------------|-------|
| Portal home loads, shows share overview | E2E |
| View distributions page | E2E |
| Submit HEMS request | E2E |
| HEMS request status tracking | E2E |
| Change password page | E2E |
| forcePasswordChange guard redirects | E2E |
| x-pathname header prevents redirect loops | Unit |

### Error States & Edge Cases

| Interaction | Layer |
|-------------|-------|
| 404 page (`not-found.tsx`) | E2E |
| Portal error boundary | E2E |
| selectedEntity guard (queries disabled before entity loads) | Integration |
| Money field decimal enforcement (2 decimal places) | Unit |
| DOD future-date rejection | Unit |
| Enum type coercion (payment method, etc.) | Unit |
| Confirm dialogs appear before all destructive actions | E2E |

---

## Report Format

After audit runs, produce a single `docs/audit/2026-02-24-audit-report.md` containing:

1. **Static analysis results** — typecheck errors, lint violations
2. **Unit/integration failures** — procedure, expected vs actual
3. **E2E failures** — page, action, error message, screenshot path
4. **Root cause for each issue** — categorized (schema mismatch, auth bug, UI bug, etc.)
5. **Fix plan** — ordered by severity, with implementation approach per issue

---

## Implementation Strategy

### Phase 1 — Static + Unit/Integration Layer

1. Run `bun run typecheck` and `bun run lint`, capture all output
2. Audit existing test suite — identify gaps vs coverage map
3. Write missing unit tests (tRPC procedures, utility functions, API routes)
4. Write missing integration tests (procedure auth guards, DB interactions)
5. Fix all failures found

### Phase 2 — Playwright E2E Setup & Auth Infrastructure

1. Configure Playwright auth fixtures (admin session, beneficiary session stored in `playwright/.auth/`)
2. Write page object models for core pages
3. Wire up dev server startup in `playwright.config.ts`

### Phase 3 — E2E Test Coverage (by domain)

Execute in waves per domain: Auth → Dashboard → Assets → Liabilities → Accounting → Distributions → Users → Portal → Edge cases

### Phase 4 — Audit Report & Fix Implementation

1. Collect all failures across all layers
2. Generate root cause report
3. Implement fixes in priority order (security > correctness > UX)
4. Re-run full audit to verify clean pass

---

## Constraints

- No changes to production behavior during audit phases — fixes only after report
- Test DB is the existing Neon branch (`ep-gentle-salad-aef4mc4y`) — no schema drift allowed
- Playwright runs against `http://localhost:3000` (dev server with `.env`)
- E2E auth state stored in `playwright/.auth/` (gitignored)
- One-shot goal: after v4.0 completes, app passes all tests cleanly
