# Phase 18: Deferred Items

## Pre-existing Build Error

**File:** `src/app/forms/_actions/verifyAccess.ts`
**Issue:** "Server Actions must be async functions" -- 4 exported functions (constantTimeCompare, checkLockout, recordFailure, resetFailures) are not async but are in a Server Actions file.
**Impact:** `bun run build` fails. This is a pre-existing issue from phase 16 (commit 98b370f), not caused by phase 18 changes.
**Fix:** Either make functions async or move non-server-action utility functions to a separate file that is not treated as Server Actions.

## Pre-existing Biome Formatting Issues

**Files:** `tests/lib/proxy-paths.test.ts`, `tests/lib/validation.test.ts`, `tests/trpc/business-logic.test.ts`
**Issue:** Biome formatter/linter reports formatting differences in these test files.
**Impact:** Pre-commit hook (`bun run lint`) fails for the entire project even when these files are not being modified.
