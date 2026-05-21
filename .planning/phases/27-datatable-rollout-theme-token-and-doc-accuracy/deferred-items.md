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

## 27-03 — Asset table rollout

- **Flaky tRPC integration tests (`EntityId Validation`, ~5s timeouts).** The
  standalone full `bun test` run (1016 tests) showed 3 `EntityId Validation`
  tRPC tests failing with ~5s timeouts — transient Neon test-branch DB
  connectivity flakes, the same infra issue documented for 27-01. Re-running
  `tests/trpc` in isolation: 166/166 pass. Not caused by 27-03 changes (all 9
  changed files are UI-only table components — `exportable`/`bulkActions` props,
  no tRPC or DB surface). The pre-commit hook's full-suite run on each of the 3
  task commits was clean. Out of scope per the executor scope boundary. No
  action taken.
