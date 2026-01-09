# API Validation and Error Handling Design

**Date:** 2026-01-07
**Status:** Approved

## Overview

Integrate existing Zod validation schemas into the API route factory and add consistent error handling across all endpoints.

## Current State

- 22 CRUD resources go through `createRouteHandler()` in `index.ts`
- Validation schemas exist in `db/validation.ts` (using drizzle-zod) but aren't connected to API
- No error formatting - raw errors go to clients
- Missing schemas for: liability, liabilityPayment, hemsRequest, trusteeFeeSchedule, trusteeFeeEntry

## Architecture

```
Request → Route Factory → Validate (Zod) → Check References → CRUD → Response
                ↓              ↓                ↓
            Error Handler (formats all errors consistently)
```

## Error Response Format

All errors return:
```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "VALIDATION_ERROR | NOT_FOUND | REFERENCE_ERROR | CONFLICT | INTERNAL_ERROR",
    "details": {
      "fields": {
        "fieldName": "Field-specific error message"
      }
    }
  }
}
```

## Implementation Plan

### Phase 1: Add Missing Schemas (`db/validation.ts`)

Add schemas for 5 entities:

1. **Liability**
   - `creditor`: required, non-empty
   - `originalAmount`, `currentBalance`: positive numbers
   - `interestRate`: 0-100 if provided
   - `paymentDueDay`: 1-31 if provided

2. **LiabilityPayment**
   - `amount`: positive number
   - `paymentDate`: required
   - Insert only (no update - payments are immutable)

3. **HemsRequest**
   - `amountRequested`: positive number
   - `justification`: required, non-empty
   - `category`: valid HemsCategory enum

4. **TrusteeFeeSchedule**
   - `effectiveDate`: required
   - Fee percentages: 0-100 range
   - Insert only (hasUpdatedAt: false)

5. **TrusteeFeeEntry**
   - `periodStart`, `periodEnd`: required, periodEnd >= periodStart
   - `totalFee`: positive number

### Phase 2: Error Utilities (`src/lib/api-error.ts`)

New dedicated module (consistent with logger.ts, fee-calculator.ts pattern):

```typescript
// Error codes
type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "REFERENCE_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR"

// Custom error class
class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>
  )
}

// Format Zod errors to field-level details
function formatZodError(error: ZodError): { fields: Record<string, string> }

// Create consistent error response
function errorResponse(error: unknown): Response
```

### Phase 3: Route Factory Integration (`index.ts`)

**Extend RouteConfig:**
```typescript
interface RouteConfig {
  crud: CrudOperations<any>;
  name: string;
  filterParam?: string;
  customGetById?: (id: string) => Promise<unknown>;
  // NEW
  insertSchema?: ZodSchema;
  updateSchema?: ZodSchema;
  references?: { field: string; table: string; crud: CrudOperations<any> }[];
}
```

**Update handlers:**
- `handleCreate`: Validate with insertSchema, check references, then create
- `handleUpdate`: Validate with updateSchema, check references, then update
- Wrap all operations in try/catch using `errorResponse()`

**Update resource configuration:**
- Add schema references to all 22 resources
- Add reference definitions for FK relationships

### Phase 4: Custom Endpoints

Update custom endpoints to use same validation:
- `POST /api/liabilities/{id}/record-payment`
- `POST /api/hems-requests/{id}/approve`
- `POST /api/hems-requests/{id}/deny`
- `POST /api/tasks/reminders`

## Files Changed

| File | Change |
|------|--------|
| `db/validation.ts` | Add 5 missing entity schemas (~100 lines) |
| `src/lib/api-error.ts` | New file - error utilities (~80 lines) |
| `index.ts` | Integrate validation into route factory (~150 lines changed) |

## Files Unchanged

- `db/crud-factory.ts` - No changes needed
- `db/queries.ts` - No changes needed
- `db/schema.ts` - No changes needed

## Testing Strategy

1. Add validation test cases for each entity type
2. Test error response format consistency
3. Test reference validation (FK checks)
4. Verify existing functionality unchanged

## Success Criteria

- [ ] All CRUD endpoints validate input with Zod
- [ ] All custom endpoints validate input
- [ ] Error responses follow specified format
- [ ] Foreign key references validated before DB operations
- [ ] All existing tests pass
- [ ] No regressions in existing functionality
