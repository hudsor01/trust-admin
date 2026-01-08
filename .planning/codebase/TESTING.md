# Testing Patterns

**Analysis Date:** 2026-01-08

## Test Framework

**Runner:**
- Bun Test (built-in) - Native test runner with TypeScript support
- Config: `bunfig.toml` in project root

**Assertion Library:**
- Bun built-in `expect` - Chai-like assertions
- Matchers: `toBe`, `toEqual`, `toBeDefined`, `toThrow`

**Run Commands:**
```bash
bun test                              # Run all tests
bun test --watch                      # Watch mode
bun test --coverage                   # Coverage report
```

## Test File Organization

**Location:**
- `tests/` directory at project root (separate from source)
- No co-located tests with source files

**Naming:**
- `*.test.ts` for all test files
- No distinction between unit/integration in filename

**Structure:**
```
tests/
  api.test.ts           # Integration tests (987 lines)
  formatters.test.ts    # Unit tests (133 lines)
  setup.ts              # Test configuration (11 lines)
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, test, expect, beforeAll } from "bun:test"

describe("Module Name", () => {
  beforeAll(async () => {
    // Setup (e.g., check server availability)
  })

  describe("functionName", () => {
    test("should handle valid input", () => {
      // arrange
      const input = createTestData()

      // act
      const result = functionName(input)

      // assert
      expect(result).toBe(expectedValue)
    })

    test("should return em dash for null", () => {
      expect(functionName(null)).toBe("—")
    })
  })
})
```

**Patterns:**
- Use `beforeAll` for one-time setup (not `beforeEach`)
- Explicit arrange/act/assert comments in complex tests
- One focus per test (but multiple `expect` calls OK)
- Clear test names in past tense: "formats valid date string"

## Mocking

**Framework:**
- None - No mocking library used
- Tests use real server when available (integration tests)

**Patterns:**
- Integration tests check server availability before running
- No module mocking detected
- No service mocking (tests hit real API endpoints)

**What NOT to Mock:**
- Real server endpoints (tests actually call API)
- Database (tests use development database)

## Fixtures and Factories

**Test Data:**
```typescript
// API tests fetch real entities before running
let testEntityId: string

beforeAll(async () => {
  // Fetch real data from API
  const entities = await fetch(`${BASE_URL}/api/entities`).then(r => r.json())
  testEntityId = entities[0]?.id
})

// Tests use actual IDs
test("...", async () => {
  const response = await fetch(`${BASE_URL}/api/entities/${testEntityId}`)
  // ...
})
```

**Location:**
- No separate fixtures directory
- Test data fetched from API in `beforeAll` hooks
- Relies on database seeding: `bun run db:seed`

## Coverage

**Requirements:**
- No enforced coverage target
- Coverage tracked for awareness
- Focus on critical paths (formatters, API validation)

**Configuration:**
- Bun coverage (built-in)
- Config: `bunfig.toml` has `coverage = true`
- Timeout: 5000ms per test

**View Coverage:**
```bash
bun test --coverage
```

## Test Types

**Unit Tests:**
- Test single function in isolation
- No external dependencies
- Fast: each test <100ms
- Example: `tests/formatters.test.ts` (32 test cases)

**Integration Tests:**
- Test full API request/response cycle
- Requires running server on `localhost:5050`
- Tests use real database
- Example: `tests/api.test.ts` (~70 test cases)
- Graceful skip if server unavailable:
  ```typescript
  let serverAvailable = false
  beforeAll(async () => {
    try {
      const response = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) })
      serverAvailable = response.ok
    } catch {
      serverAvailable = false
      console.log("⚠️  Server not running - skipping API integration tests")
    }
  })

  test("...", async () => {
    if (!serverAvailable) return  // Skip test
    // ... test code
  })
  ```

**E2E Tests:**
- Not implemented
- No browser automation (Playwright, Cypress, etc.)

## Common Patterns

**Async Testing:**
```typescript
test("should handle async operation", async () => {
  const response = await fetch(`${BASE_URL}/api/entities`)
  expect(response.status).toBe(200)

  const data = await response.json()
  expect(Array.isArray(data)).toBe(true)
})
```

**Error Testing:**
```typescript
test("should return 404 for non-existent entity", async () => {
  const response = await fetch(`${BASE_URL}/api/entities/00000000-0000-0000-0000-000000000000`)
  expect(response.status).toBe(404)
})
```

**Validation Testing:**
```typescript
test("should validate EIN format", async () => {
  const response = await fetch(`${BASE_URL}/api/entities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ein: "invalid" })
  })

  expect(response.status).toBe(400)
  const data = await response.json()
  expect(data.error.code).toBe("VALIDATION_ERROR")
  expect(data.error.details?.fields?.ein).toBeDefined()
})
```

**Snapshot Testing:**
- Not used in this codebase
- Prefer explicit assertions

## Test Coverage Areas

**Unit Tests (`formatters.test.ts`):**
- `formatCurrency()` - 8 test cases
- `formatDate()` - 7 test cases
- `formatPercentage()` - 5 test cases
- `formatPhoneNumber()` - 6 test cases
- `calculateAge()` - 6 test cases

**Integration Tests (`api.test.ts`):**
- Health check endpoint
- 22 CRUD resource endpoints (GET list, GET by ID, POST, PUT, DELETE)
- Format validation (EIN, email, VIN, zip, routing number, state code)
- Range validation (percentage 0-100, mileage >= 0, day 1-31)
- Reference validation (entityId, beneficiaryId foreign keys)
- Trust accounting rules (amount != 0, description required)
- HEMS request rules (amountRequested > 0, justification required)
- Immutability (activityLog cannot be modified/deleted)
- Payment record immutability

**Missing Tests:**
- Liability payment recording workflow
- HEMS request approval/denial workflow
- Trustee fee calculations
- Principal vs Income allocation logic
- Distribution wizard multi-step process
- Authentication flows
- File upload/download

---

*Testing analysis: 2026-01-08*
*Update when test patterns change*
