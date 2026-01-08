# Architecture

**Analysis Date:** 2026-01-08

## Pattern Overview

**Overall:** Full-Stack Monolith with Layered Architecture and Factory Patterns

**Key Characteristics:**
- Single codebase for frontend and backend
- Bun HTTP server with route factory pattern (eliminates 80% of boilerplate)
- React SPA with hash-based routing
- PostgreSQL with Drizzle ORM
- Generic CRUD factory generates 22 resource endpoints from configuration

## Layers

**Presentation Layer:**
- Purpose: User interface and client-side logic
- Contains: React components, pages, hooks, UI components
- Location: `src/pages/*.tsx` (14 admin + 4 portal pages), `src/components/`, `src/hooks/`
- Depends on: API layer via fetch, lib utilities for formatting
- Used by: End users via browser
- Pattern: Component composition with hooks for data fetching

**API/Routing Layer:**
- Purpose: HTTP request handling and routing
- Contains: Bun.serve() server, route factory, CRUD handlers
- Location: `index.ts` (lines 121-917)
- Depends on: Business logic layer (queries, validation), database layer
- Used by: Presentation layer (React app), external clients
- Pattern: Route factory pattern generates endpoints from configuration object

**Business Logic Layer:**
- Purpose: Domain calculations and complex operations
- Contains: Distribution calculators, fee calculators, withdrawal eligibility, classification rules
- Location: `src/lib/distribution-calculator.ts`, `src/lib/fee-calculator.ts`, `src/lib/withdrawal-eligibility.ts`, `src/lib/classification-rules.ts`
- Depends on: Database queries for data retrieval
- Used by: API layer and presentation layer
- Pattern: Pure functions and stateless utilities

**Data Access Layer:**
- Purpose: Database operations and persistence
- Contains: CRUD factory, Drizzle ORM queries, schema definitions
- Location: `db/crud-factory.ts`, `db/queries.ts`, `db/schema.ts`
- Depends on: PostgreSQL database
- Used by: Business logic and API layers
- Pattern: Repository pattern via CRUD factory

## Data Flow

**HTTP Request Flow (CRUD Operations):**

1. User interacts with React component (e.g., edits liability in table)
2. Component calls hook method: `useLiabilities().update(id, data)`
3. Hook executes fetch: `PUT /api/liabilities/:id` with JSON body
4. Bun server receives request at `index.ts:461` (Bun.serve fetch handler)
5. CORS headers applied (`index.ts:467-472`)
6. Regex matcher identifies route: `/^\/api\/([a-z-]+)\/([^/]+)$/`
7. Route factory handler invoked (`index.ts:156-250`)
8. Request validation via Zod schema (`db/validation.ts`)
9. Reference validation if foreign keys exist (`index.ts:179-183`)
10. CRUD factory method called: `liabilityCrud.update(id, data)`
11. Drizzle ORM builds SQL query
12. PostgreSQL executes update
13. Returning clause provides updated record
14. JSON response sent to client
15. Hook updates local state with new data
16. React component re-renders with EditableCell showing new value

**Authentication Flow (Magic Link):**

1. User enters email in Portal Login (`src/pages/portal/Login.tsx`)
2. Client calls `signIn.magicLink({ email })` from Better Auth client
3. POST `/api/auth/magic-link/send` hits Better Auth handler
4. Better Auth generates token, stores in `verification` table
5. Resend API sends email with magic link (if configured)
6. User clicks link with token
7. GET `/api/auth/magic-link/verify?token=...` validates token
8. Better Auth creates session in `session` table
9. httpOnly cookie set with session ID
10. Client redirected to portal dashboard
11. `useSession()` hook detects authenticated state
12. Protected routes now accessible

**State Management:**
- React component state (useState, useEffect)
- Query hooks for server state (`src/hooks/use-query.ts`)
- No global state management (Redux, Zustand, etc.)
- Database as source of truth

## Key Abstractions

**Route Factory (`index.ts:121-250`):**
- Purpose: Eliminate repetitive CRUD route handlers
- Examples: Generates 5 endpoints per resource × 22 resources = 110 endpoints from single pattern
- Pattern: Configuration-driven route generation
- Configuration: `index.ts:264-445` (resource definitions)

**CRUD Factory (`db/crud-factory.ts`):**
- Purpose: Generate type-safe database operations for any table
- Examples: `vehicleCrud`, `liabilityCrud`, `beneficiaryCrud` created via `createCrud(table, options)`
- Pattern: Generic factory with TypeScript inference
- Operations: `getAll()`, `getById()`, `create()`, `update()`, `delete()`

**Query Hook Factory (`src/hooks/use-query.ts`):**
- Purpose: Create React hooks for data fetching with CRUD operations
- Examples: `useLiabilities()`, `useVehicles()`, `useBeneficiaries()`
- Pattern: Custom hook factory with useState + useEffect
- API: Returns `{ data, loading, error, refetch, create, update, remove }`

**Inline Editable Cells (`src/components/editable-cells.tsx`):**
- Purpose: Direct table cell editing without dialog forms
- Examples: `EditableCurrencyCell`, `EditableSelectCell`, `EditableDateCell`
- Pattern: Controlled input with blur-to-save
- Usage: Click cell → edit → blur to persist changes

**Form State Pattern (`src/lib/form-factory.ts`):**
- Purpose: Convert database records to form-compatible format
- Examples: `toDateInput()` converts ISO date to `YYYY-MM-DD` for input fields
- Pattern: Entity-to-form mapper utilities

## Entry Points

**API Server:**
- Location: `index.ts`
- Triggers: `bun run dev:api` or `bun run index.ts`
- Responsibilities: Start Bun.serve() on port 5050, register routes, handle requests
- Port: 5050

**Frontend SPA:**
- Location: `src/main.tsx`
- Triggers: `bun run dev:ui` (Vite dev server)
- Responsibilities: Mount React app to DOM, initialize routing
- Port: 5173 (development) → served from :5050 in production

**Development Scripts:**
- `bun run dev`: Concurrent API (5050) + UI (5173) dev servers
- `bun run db:push`: Sync database schema without migrations
- `bun run db:seed`: Populate database with Hudson Trust demo data

## Error Handling

**Strategy:** Centralized error responses at API layer, throw/catch at boundaries

**Patterns:**
- API endpoints use try/catch at handler level (`index.ts:909-911`)
- Custom `ApiError` class with typed error codes (`src/lib/api-error.ts`)
- Errors serialized to JSON: `{ error: { message, code, details } }`
- Client hooks catch errors, store in error state (`src/hooks/use-query.ts:76-78`)
- No global error boundary detected in React app

**Error Types:**
- Validation errors: 400 with field-level details
- Not found: 404 with resource type
- Reference errors: 400 when foreign key invalid
- Server errors: 500 with generic message

## Cross-Cutting Concerns

**Logging:**
- Console.log for normal output
- Console.error for exceptions
- No structured logging framework (Pino, Winston, etc.)

**Validation:**
- Zod schemas for runtime validation (`db/validation.ts`)
- Insert and update schemas for all 31 database tables
- Validation occurs at API boundary before database operations

**Authentication:**
- Better Auth middleware (implicit in library)
- Session validation via cookie-based sessions
- Portal endpoints filter by authenticated beneficiaryId
- Admin dashboard has NO authentication (intentional during development)

**Audit Trail:**
- Activity log table (`activityLog`) tracks all data changes
- Populated automatically (mechanism not visible in provided code)
- Includes: table name, record ID, action, old/new values, timestamp

---

*Architecture analysis: 2026-01-08*
*Update when major patterns change*
