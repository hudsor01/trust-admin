# Trust Admin API Endpoints Reference

## Generic CRUD Endpoints

The API uses a route factory pattern to provide consistent CRUD operations across all entities:

### Entities
- `GET /api/entities` - List all entities
- `POST /api/entities` - Create a new entity
- `GET /api/entities/{id}` - Get a specific entity
- `PUT /api/entities/{id}` - Update a specific entity
- `DELETE /api/entities/{id}` - Delete a specific entity

### Beneficiaries
- `GET /api/beneficiaries` - List all beneficiaries
- `POST /api/beneficiaries` - Create a new beneficiary
- `GET /api/beneficiaries/{id}` - Get a specific beneficiary
- `PUT /api/beneficiaries/{id}` - Update a specific beneficiary
- `DELETE /api/beneficiaries/{id}` - Delete a specific beneficiary

### Assets
#### Vehicles
- `GET /api/vehicles?entityId={entityId}` - List vehicles for an entity
- `POST /api/vehicles` - Create a new vehicle
- `GET /api/vehicles/{id}` - Get a specific vehicle
- `PUT /api/vehicles/{id}` - Update a specific vehicle
- `DELETE /api/vehicles/{id}` - Delete a specific vehicle

#### Homesteads
- `GET /api/homesteads?entityId={entityId}` - List homesteads for an entity
- `POST /api/homesteads` - Create a new homestead
- `GET /api/homesteads/{id}` - Get a specific homestead
- `PUT /api/homesteads/{id}` - Update a specific homestead
- `DELETE /api/homesteads/{id}` - Delete a specific homestead

#### Rental Properties
- `GET /api/rental-properties?entityId={entityId}` - List rental properties for an entity
- `POST /api/rental-properties` - Create a new rental property
- `GET /api/rental-properties/{id}` - Get a specific rental property
- `PUT /api/rental-properties/{id}` - Update a specific rental property
- `DELETE /api/rental-properties/{id}` - Delete a specific rental property

#### Bank Accounts
- `GET /api/bank-accounts?entityId={entityId}` - List bank accounts for an entity
- `POST /api/bank-accounts` - Create a new bank account
- `GET /api/bank-accounts/{id}` - Get a specific bank account
- `PUT /api/bank-accounts/{id}` - Update a specific bank account
- `DELETE /api/bank-accounts/{id}` - Delete a specific bank account

#### Investment Accounts
- `GET /api/investment-accounts?entityId={entityId}` - List investment accounts for an entity
- `POST /api/investment-accounts` - Create a new investment account
- `GET /api/investment-accounts/{id}` - Get a specific investment account
- `PUT /api/investment-accounts/{id}` - Update a specific investment account
- `DELETE /api/investment-accounts/{id}` - Delete a specific investment account

#### Personal Property
- `GET /api/personal-property?entityId={entityId}` - List personal property for an entity
- `POST /api/personal-property` - Create new personal property
- `GET /api/personal-property/{id}` - Get specific personal property
- `PUT /api/personal-property/{id}` - Update specific personal property
- `DELETE /api/personal-property/{id}` - Delete specific personal property

#### Artwork
- `GET /api/artwork?entityId={entityId}` - List artwork for an entity
- `POST /api/artwork` - Create new artwork
- `GET /api/artwork/{id}` - Get specific artwork
- `PUT /api/artwork/{id}` - Update specific artwork
- `DELETE /api/artwork/{id}` - Delete specific artwork

### Distributions
- `GET /api/distributions` - List all distributions with relations
- `POST /api/distributions` - Create a new distribution
- `GET /api/distributions/{id}` - Get a specific distribution
- `PUT /api/distributions/{id}` - Update a specific distribution
- `DELETE /api/distributions/{id}` - Delete a specific distribution

### Valuations
- `POST /api/valuations` - Create a new valuation
- `GET /api/valuations/{assetType}/{assetId}` - Get valuations for a specific asset

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/{id}` - Get a specific task
- `PUT /api/tasks/{id}` - Update a specific task
- `DELETE /api/tasks/{id}` - Delete a specific task

### Trustees
- `GET /api/trustees?entityId={entityId}` - List trustees for an entity
- `POST /api/trustees` - Create a new trustee
- `GET /api/trustees/{id}` - Get a specific trustee
- `PUT /api/trustees/{id}` - Update a specific trustee
- `DELETE /api/trustees/{id}` - Delete a specific trustee

### HEMS Requests
- `GET /api/hems-requests` - List all HEMS requests
- `POST /api/hems-requests` - Create a new HEMS request
- `GET /api/hems-requests/{id}` - Get a specific HEMS request
- `PUT /api/hems-requests/{id}` - Update a specific HEMS request
- `DELETE /api/hems-requests/{id}` - Delete a specific HEMS request
- `GET /api/hems-requests/pending` - Get pending HEMS requests
- `POST /api/hems-requests/{id}/approve` - Approve a HEMS request
- `POST /api/hems-requests/{id}/deny` - Deny a HEMS request

### Liabilities
- `GET /api/liabilities?entityId={entityId}` - List liabilities for an entity
- `POST /api/liabilities` - Create a new liability
- `GET /api/liabilities/{id}` - Get a specific liability
- `PUT /api/liabilities/{id}` - Update a specific liability
- `DELETE /api/liabilities/{id}` - Delete a specific liability

### Liability Payments
- `POST /api/liabilities/{id}/record-payment` - Record a payment on a liability
- `GET /api/liabilities/{id}/payments` - Get payment history for a liability

### Trustee Fees
- `GET /api/trustee-fee-entries?entityId={entityId}` - Get fee entries with schedule info
- `GET /api/trustee-fee-schedules?entityId={entityId}` - List fee schedules for an entity
- `POST /api/trustee-fee-schedules` - Create a new fee schedule
- `GET /api/trustee-fee-schedules/{id}` - Get a specific fee schedule
- `PUT /api/trustee-fee-schedules/{id}` - Update a specific fee schedule
- `DELETE /api/trustee-fee-schedules/{id}` - Delete a specific fee schedule

## Special Endpoints

### Authentication
- `POST /api/auth/session` - Session management (handled by Better Auth)
- `POST /api/auth/signin` - Sign in (handled by Better Auth)
- `GET /api/portal/me` - Get authenticated user info for portal

### Task Reminders
- `POST /api/tasks/reminders` - Send task reminder emails to trustees

### Health Check
- `GET /health` - Health check endpoint

## Route Factory Pattern
The API uses a route factory pattern defined in `index.ts` that automatically generates consistent CRUD operations for each resource. New endpoints can be added by:
1. Adding the resource to the `resources` object in `index.ts`
2. Ensuring the corresponding CRUD operations exist in `db/queries.ts`
3. Defining the schema in `db/schema.ts`

## Error Handling
All API endpoints return consistent error responses:
- 404: Resource not found
- 400: Bad request (validation error)
- 500: Internal server error
- 401: Unauthorized (for protected endpoints)
- 403: Forbidden (insufficient permissions)