# Phase 27 — Deferred Items

Items discovered during execution that are out of scope for the current plan.

## 27-01 — DataTable foundation and docs

- **Flaky tRPC integration test (`ECONNREFUSED`).** During the full `bun test`
  run (1016 tests), exactly one test failed with `error: ECONNREFUSED` — a
  transient connectivity failure against the Neon test-branch DB. Not caused by
  27-01 changes (the three changed source files — `data-table-select-column.tsx`,
  `csv-export.ts`, and the two `.planning/` docs — carry no DB surface).
  Re-running the changed test files + `data-table-extensions.test.tsx` in
  isolation: 32/32 pass. Out of scope per the executor scope boundary
  (pre-existing infrastructure flake in an unrelated file). No action taken.
