# API Validation and Error Handling

This document describes the validation rules and error handling for all Trust Admin API endpoints.

## Error Response Format

All API errors return a consistent JSON format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {
      "fields": {
        "fieldName": "Field-specific error message"
      }
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body failed Zod schema validation |
| `NOT_FOUND` | 404 | Resource does not exist |
| `REFERENCE_ERROR` | 400 | Foreign key reference does not exist |
| `CONFLICT` | 409 | Unique constraint violation |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions or modifying immutable resource |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Entity Validation Rules

### Entity (`/api/entities`)

| Field | Type | Validation |
|-------|------|------------|
| `name` | string | **Required**, 1-255 characters |
| `entityType` | enum | `TRUST`, `ESTATE`, `INDIVIDUAL`, `BUSINESS` |
| `ein` | string | Optional, format: `XX-XXXXXXX` |
| `governingLaw` | string | Optional, max 100 characters |

### Beneficiary (`/api/beneficiaries`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `firstName` | string | **Required**, 1-100 characters |
| `lastName` | string | **Required**, 1-100 characters |
| `email` | string | Optional, valid email format |
| `phone` | string | Optional, digits and `+-() ` allowed |
| `sharePercent` | decimal | Optional, 0-100 |
| `taxId` | string | Optional, format: `XXX-XX-XXXX` |
| `zip` | string | Optional, format: `XXXXX` or `XXXXX-XXXX` |

### Contact (`/api/contacts`)

| Field | Type | Validation |
|-------|------|------------|
| `name` | string | **Required**, non-empty |
| `email` | string | Optional, valid email format |
| `phone` | string | Optional, digits and `+-() ` allowed |
| `zip` | string | Optional, format: `XXXXX` or `XXXXX-XXXX` |

### Task (`/api/tasks`)

| Field | Type | Validation |
|-------|------|------------|
| `title` | string | **Required**, 1-500 characters |
| `category` | enum | `ACCOUNTING`, `COMPLIANCE`, `DISTRIBUTION`, `LEGAL`, `TAX`, `OTHER` |

---

## Asset Validation Rules

### Vehicle (`/api/vehicles`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `year` | integer | **Required**, 1900 to current year + 1 |
| `make` | string | **Required** |
| `model` | string | **Required** |
| `vin` | string | **Required**, exactly 17 characters |
| `mileage` | integer | Optional, >= 0 |

### Homestead (`/api/homesteads`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `streetAddress` | string | **Required**, non-empty |
| `city` | string | **Required**, non-empty |
| `state` | string | **Required**, exactly 2 characters |
| `zip` | string | **Required**, format: `XXXXX` or `XXXXX-XXXX` |
| `yearBuilt` | integer | Optional, 1800 to current year |
| `squareFeet` | integer | Optional, >= 0 |
| `bedrooms` | integer | Optional, 0-50 |

### Rental Property (`/api/rental-properties`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `name` | string | **Required**, non-empty |
| `streetAddress` | string | **Required**, non-empty |
| `city` | string | **Required**, non-empty |
| `state` | string | **Required**, exactly 2 characters |
| `zip` | string | **Required**, format: `XXXXX` or `XXXXX-XXXX` |
| `units` | integer | **Required**, >= 1 |

### Bank Account (`/api/bank-accounts`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `institution` | string | **Required**, non-empty |
| `accountNumber` | string | **Required**, min 4 characters |
| `routingNumber` | string | Optional, exactly 9 digits |

### Investment Account (`/api/investment-accounts`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `institution` | string | **Required**, non-empty |
| `accountNumber` | string | **Required**, min 4 characters |

### Insurance Policy (`/api/insurance-policies`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `carrier` | string | **Required**, non-empty |
| `policyNumber` | string | **Required**, non-empty |

### Personal Property (`/api/personal-property`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `name` | string | **Required**, non-empty |

### Artwork (`/api/artwork`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `title` | string | **Required**, non-empty |

---

## Financial Validation Rules

### Liability (`/api/liabilities`)

Texas Property Code 113.152(5) compliance.

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `creditor` | string | **Required**, non-empty |
| `liabilityType` | enum | `MORTGAGE`, `LOAN`, `CREDIT_CARD`, `TAX_OWED`, `OTHER` |
| `originalAmount` | decimal | **Required**, > 0 |
| `currentBalance` | decimal | **Required**, >= 0 |
| `interestRate` | decimal | Optional, 0-100 |
| `paymentDueDay` | integer | Optional, 1-31 |

### Liability Payment (`/api/liability-payments`)

**IMMUTABLE**: Payments cannot be updated (PUT returns 403 Forbidden). Delete is allowed for corrections.

| Field | Type | Validation |
|-------|------|------------|
| `liabilityId` | string | **Required**, must reference existing liability |
| `amount` | decimal | **Required**, > 0 |
| `paymentDate` | date | **Required** |
| `principalPortion` | decimal | Optional, >= 0 |
| `interestPortion` | decimal | Optional, >= 0 |
| `escrowPortion` | decimal | Optional, >= 0 |

### Record Payment (`POST /api/liabilities/{id}/record-payment`)

Custom endpoint that creates payment, updates liability balance, and creates trust accounting expense.

| Field | Type | Validation |
|-------|------|------------|
| `amount` | decimal | **Required**, > 0 |
| `paymentDate` | date | **Required** |
| `principalPortion` | decimal | Optional |
| `interestPortion` | decimal | Optional |
| `escrowPortion` | decimal | Optional |

### Distribution (`/api/distributions`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `beneficiaryId` | string | **Required**, must reference existing beneficiary |
| `amount` | decimal | **Required**, > 0 |
| `distributionType` | enum | `HEMS`, `DISCRETIONARY`, `MANDATORY`, `SPECIFIC_BEQUEST` |

### Valuation (`/api/valuations`)

| Field | Type | Validation |
|-------|------|------------|
| `assetType` | string | **Required** |
| `assetId` | string | **Required** |
| `value` | decimal | **Required**, >= 0 |
| `valuationType` | enum | `APPRAISAL`, `STATEMENT`, `MARKET_ESTIMATE`, `TAX_ASSESSED` |

---

## Trust Accounting Validation Rules

### Trust Accounting Entry (`/api/trust-accounting`)

Principal vs Income classification per Texas Property Code 116.152.

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `entryType` | enum | **Required**, `INCOME` or `EXPENSE` |
| `description` | string | **Required**, non-empty |
| `amount` | decimal | **Required**, != 0 |
| `isPrincipal` | boolean | Optional, default false |
| `accountingDate` | date | **Required** |

### Transaction (`/api/transactions`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `category` | string | **Required**, non-empty |
| `amount` | decimal | **Required**, != 0 |
| `allocationClass` | enum | `PRINCIPAL`, `INCOME` |

---

## HEMS Request Validation Rules

### HEMS Request (`/api/hems-requests`)

Health, Education, Maintenance, Support distribution requests.

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `beneficiaryId` | string | **Required**, must reference existing beneficiary |
| `amountRequested` | decimal | **Required**, > 0 |
| `justification` | string | **Required**, non-empty |
| `category` | enum | `HEALTH`, `EDUCATION`, `MAINTENANCE`, `SUPPORT` |

### Approve HEMS Request (`POST /api/hems-requests/{id}/approve`)

| Field | Type | Validation |
|-------|------|------------|
| `approvedAmount` | decimal | Optional, >= 0 if provided |
| `reviewNotes` | string | Optional |

### Deny HEMS Request (`POST /api/hems-requests/{id}/deny`)

| Field | Type | Validation |
|-------|------|------------|
| `reviewNotes` | string | Optional |

---

## Trustee Fee Validation Rules

### Trustee (`/api/trustees`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `name` | string | **Required**, non-empty |
| `order` | integer | **Required**, >= 1 |
| `status` | enum | `CURRENT`, `SUCCESSOR`, `RESIGNED`, `REMOVED` |

### Trustee Fee Schedule (`/api/trustee-fee-schedules`)

**IMMUTABLE**: Fee schedules cannot be updated (PUT returns 403 Forbidden). Delete is allowed.

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `trusteeId` | string | **Required**, must reference existing trustee |
| `effectiveDate` | date | **Required** |
| `executorFeePercent` | decimal | Optional, 0-100 |
| `annualAssetPercent` | decimal | Optional, 0-100 |
| `incomePercent` | decimal | Optional, 0-100 |
| `hourlyRate` | decimal | Optional, >= 0 |

### Trustee Fee Entry (`/api/trustee-fee-entries`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `trusteeId` | string | **Required**, must reference existing trustee |
| `scheduleId` | string | **Required**, must reference existing fee schedule |
| `totalFee` | decimal | **Required**, >= 0 |
| `assetFee` | decimal | Optional, >= 0 |
| `incomeFee` | decimal | Optional, >= 0 |
| `hourlyFee` | decimal | Optional, >= 0 |
| `executorFee` | decimal | Optional, >= 0 |
| `hoursWorked` | decimal | Optional, >= 0 |
| `periodStart` | date | **Required** |
| `periodEnd` | date | **Required** |

---

## Other Validation Rules

### Specific Bequest (`/api/specific-bequests`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `beneficiaryId` | string | Optional, must reference existing beneficiary if provided |
| `description` | string | **Required**, non-empty |

### Withdrawal Record (`/api/withdrawal-records`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `beneficiaryId` | string | **Required**, must reference existing beneficiary |
| `withdrawalType` | string | **Required**, non-empty |

### Document (`/api/documents`)

| Field | Type | Validation |
|-------|------|------------|
| `entityId` | string | **Required**, must reference existing entity |
| `name` | string | **Required**, non-empty |
| `filePath` | string | **Required**, non-empty |

### Activity Log (`/api/activity-logs`)

**FULLY IMMUTABLE**: Activity logs cannot be updated or deleted (PUT and DELETE return 403 Forbidden). This ensures audit trail integrity.

| Field | Type | Validation |
|-------|------|------------|
| `tableName` | string | **Required** |
| `recordId` | string | **Required** |
| `action` | enum | **Required**, `CREATE`, `UPDATE`, `DELETE` |
| `oldValues` | object | Optional |
| `newValues` | object | Optional |
| `changedBy` | string | Default: `system` |
| `ipAddress` | string | Optional |

---

## Immutable Resources

Some resources are immutable and cannot be modified after creation:

| Resource | PUT (Update) | DELETE | Reason |
|----------|--------------|--------|--------|
| `liability-payments` | 403 Forbidden | Allowed | Financial records should not be modified |
| `trustee-fee-schedules` | 403 Forbidden | Allowed | Historical fee rates preserved |
| `activity-logs` | 403 Forbidden | 403 Forbidden | Audit trail integrity |

---

## Foreign Key Reference Validation

The API validates that foreign key references exist before creating or updating records:

| Resource | Reference Fields |
|----------|-----------------|
| Beneficiary | `entityId` |
| Vehicle | `entityId` |
| Homestead | `entityId` |
| Rental Property | `entityId` |
| Bank Account | `entityId` |
| Investment Account | `entityId` |
| Personal Property | `entityId` |
| Artwork | `entityId` |
| Liability | `entityId` |
| Liability Payment | `liabilityId` |
| Distribution | `entityId`, `beneficiaryId` |
| HEMS Request | `entityId`, `beneficiaryId` |
| Specific Bequest | `entityId`, `beneficiaryId` |
| Withdrawal Record | `entityId`, `beneficiaryId` |
| Trustee | `entityId` |
| Trustee Fee Schedule | `entityId`, `trusteeId` |
| Trustee Fee Entry | `entityId`, `trusteeId`, `scheduleId` |
| Trust Accounting | `entityId` |

---

## Example Error Responses

### Validation Error (Missing Required Field)

```http
POST /api/entities
Content-Type: application/json

{"entityType": "TRUST"}
```

```json
{
  "error": {
    "message": "Validation failed: Name is required",
    "code": "VALIDATION_ERROR",
    "details": {
      "fields": {
        "name": "Name is required"
      }
    }
  }
}
```

### Validation Error (Invalid Format)

```http
POST /api/entities
Content-Type: application/json

{"name": "Test Trust", "ein": "invalid"}
```

```json
{
  "error": {
    "message": "Validation failed: EIN must be in format XX-XXXXXXX",
    "code": "VALIDATION_ERROR",
    "details": {
      "fields": {
        "ein": "EIN must be in format XX-XXXXXXX"
      }
    }
  }
}
```

### Reference Error (FK Not Found)

```http
POST /api/vehicles
Content-Type: application/json

{"entityId": "nonexistent-id", "year": 2024, "make": "Toyota", "model": "Camry", "vin": "12345678901234567"}
```

```json
{
  "error": {
    "message": "Referenced entity not found",
    "code": "REFERENCE_ERROR",
    "details": {
      "fields": {
        "entityId": "entity not found"
      }
    }
  }
}
```

### Not Found Error

```http
GET /api/entities/nonexistent-id
```

```json
{
  "error": {
    "message": "Entity with id 'nonexistent-id' not found",
    "code": "NOT_FOUND"
  }
}
```

---

## Implementation Details

### Schema Source

All validation schemas are generated from the Drizzle ORM schema using `drizzle-zod`:

- **File**: `db/validation.ts`
- **Pattern**: `createInsertSchema()`, `createUpdateSchema()`, `createSelectSchema()`
- **Customization**: Additional refinements added for business rules

### Error Handling

- **File**: `src/lib/api-error.ts`
- **Classes**: `ApiError` with factory methods
- **Functions**: `formatZodError()`, `errorResponse()`, `validateWithSchema()`, `validateReference()`

### Route Integration

- **File**: `index.ts`
- **Pattern**: Route factory with `RouteConfig` interface
- **Validation**: Applied in `createRouteHandler()` for all CRUD operations
