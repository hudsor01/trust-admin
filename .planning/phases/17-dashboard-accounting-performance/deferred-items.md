# Deferred Items - Phase 17

## Pre-existing Test Failures

**Discovered during:** 17-01 commit attempt
**Scope:** Out of scope (pre-existing, not caused by any phase 17 changes)

40 test failures in `tests/api/inventory-analyze.test.ts` and related inventory analysis tests. These failures:
- Exist on the clean HEAD (verified by stashing all changes)
- Are related to the `inventory-analysis-enhanced` test suite and `POST /api/inventory/analyze` route tests
- Block the lefthook pre-commit hook from succeeding on ANY commit
- Were present before phase 17 execution began

**Impact:** Commits during 17-01 execution could not pass the pre-commit hook. The task code was committed in a prior session (faaf7e4).

**Recommended fix:** Investigate `src/lib/inventory-analysis.ts` changes since the tests last passed, or update the test mocks to match current API shape.
