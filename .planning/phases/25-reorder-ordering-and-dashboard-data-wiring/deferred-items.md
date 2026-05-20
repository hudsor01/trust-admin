# Deferred Items — Phase 25

Out-of-scope discoveries logged during plan 25-01 execution.
Not fixed (scope boundary: only auto-fix issues directly caused by the task).

## DEF-25-01 — `next build --webpack` fails on e2e route type

- **Discovered during:** Task 5 (`bun run build:analyze`)
- **File:** `src/app/api/e2e/setup/route.ts`
- **Symptom:** Webpack production build aborts with
  `Type error: Route "src/app/api/e2e/setup/route.ts" does not match the
  required types of a Next.js Route.`
- **Root cause:** The route module exports non-route values
  (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_BENEFICIARY_EMAIL`,
  `E2E_BENEFICIARY_PASSWORD`) alongside its `POST` handler. Next.js 16's
  webpack route-type validator rejects any export from a `route.ts` that
  is not a recognized route export (`GET`/`POST`/`dynamic`/etc.).
- **Why pre-existing / out of scope:** The default `bun run build`
  (Turbopack) does not run this validation, so the project builds and
  ships fine. Last touched in commit `1dcaf61` — unrelated to phase 25.
  Task 5 only modified `next.config.ts` and `package.json`.
- **Impact:** `bun run build:analyze` (now `next build --webpack`) emits
  the three bundle-analyzer HTML reports successfully, then exits 1 on
  this type error. The analyzer reports ARE produced (the failure is
  after report generation).
- **Suggested fix (future phase):** Move the `E2E_*` constants out of
  `route.ts` into a sibling module (e.g. `e2e-constants.ts`) and import
  them where needed — mirrors the existing `auth-paths.ts` extraction
  pattern noted in MEMORY.md.
