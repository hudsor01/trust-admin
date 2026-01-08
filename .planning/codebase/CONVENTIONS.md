# Coding Conventions

**Analysis Date:** 2026-01-08

## Naming Patterns

**Files:**
- kebab-case for all files: `editable-cells.tsx`, `crud-factory.ts`, `use-query.ts`
- Test files: `*.test.ts` alongside source or in `tests/` directory
- Pages: `PascalCase.tsx` in `src/pages/` (e.g., `Dashboard.tsx`, `Liabilities.tsx`)

**Functions:**
- camelCase for all functions: `calculateAge()`, `formatCurrency()`, `getWithdrawalStatus()`
- Async functions: no special prefix (rely on `async` keyword)
- Event handlers: `handleEventName` pattern (`handleSave`, `handleDelete`, `handleEdit`)

**Variables:**
- camelCase for variables: `currentBalance`, `entityId`, `selectedEntity`
- Constants: `UPPER_SNAKE_CASE` for static lists: `LIABILITY_TYPES`, `PAYMENT_METHODS`
- Database tables: camelCase: `trustAccounting`, `bankAccount`, `liabilityPayment`

**Types:**
- Interfaces: PascalCase, no `I` prefix: `Liability`, `UseQueryResult<T>`
- Type aliases: PascalCase: `CrudOperations<T>`, `EditableTextCellProps`
- Enums: PascalCase for name, values typically string literals: `'ACTIVE'`, `'MORTGAGE'`

**Hooks:**
- camelCase with `use` prefix: `useQuery()`, `useLiabilities()`, `useSession()`

## Code Style

**Formatting:**
- No Prettier or ESLint config files present
- Indentation: 2 spaces (consistent across all files)
- Quotes: Double quotes (`"`) throughout codebase
- Semicolons: Consistently used at statement ends
- Line length: No strict limit, pragmatic based on readability

**TypeScript:**
- Strict mode enabled (`tsconfig.json`): `"strict": true`
- No unchecked indexed access: `"noUncheckedIndexedAccess": true`
- Path alias: `@/*` maps to `./src/*`

## Import Organization

**Order:**
1. React imports: `import { useState, useEffect } from "react"`
2. External libraries: `import { Loader2 } from "lucide-react"`
3. Internal utilities/lib: `import { cn } from "@/lib/utils"`
4. Internal components: `import { Input } from "@/components/ui/input"`
5. Type imports: Inline with value imports (no separate type-only section)

**Grouping:**
- Blank lines between import groups
- No specific sorting within groups (not alphabetized)

**Path Aliases:**
- `@/` maps to `src/` (configured in `tsconfig.json` and `vite.config.ts`)

## Error Handling

**Patterns:**
- Throw errors at boundaries, catch at top level
- Custom `ApiError` class with typed error codes (`src/lib/api-error.ts`)
- API handlers use try/catch: `index.ts:908-911`
- React hooks catch and store errors: `src/hooks/use-query.ts:76-78`

**Error Types:**
- Validation errors: 400 with field-level details
- Not found: 404 with resource type
- Reference errors: 400 when foreign key invalid
- Server errors: 500 with generic message

**Async:**
- Use try/catch, not `.catch()` chains
- Errors logged to console in hooks: `console.error(err)`

## Logging

**Framework:**
- Console.log for informational output
- Console.error for exceptions
- No structured logging library (Pino, Winston, etc.)

**Patterns:**
- Log at boundaries (API entry, error handling)
- Minimal logging in utility functions
- Error context logged before throwing: `console.error(err)`

## Comments

**When to Comment:**
- Module-level docstrings explaining file purpose
- Function docstrings with JSDoc for complex functions
- Section dividers using `// =============================================================================`
- Inline comments for non-obvious logic (sparse, prefer self-documenting code)

**JSDoc/TSDoc:**
- Used for exported functions and public APIs
- Format: `@param`, `@returns`, `@example` tags
- Example: `db/crud-factory.ts` (lines 19-21)

**TODO Comments:**
- Format: `// TODO: description` (no username or issue number)
- Examples in `index.ts` (authentication bypass TODOs)

## Function Design

**Size:**
- Varies widely; large page components (800+ lines) common
- Factory functions kept small (<50 lines)
- No strict enforcement

**Parameters:**
- No strict limit on parameter count
- Object destructuring for options: `function create(data: Insert)`
- Optional parameters last

**Return Values:**
- Explicit return statements
- Promise<T> for async functions
- React components return JSX.Element

## Module Design

**Exports:**
- Named exports preferred: `export function ComponentName()`
- No default exports observed (except React pages implicitly)
- Barrel files: `src/hooks/index.ts` re-exports all hooks

**Component Structure:**
1. `"use client"` directive (React 19 server components)
2. Imports
3. Component-level types/interfaces
4. Constants
5. Component function
6. Export statement

**Barrel Files:**
- `src/hooks/index.ts` exports all query hooks
- Simplifies imports: `import { useLiabilities } from "@/hooks"`

---

*Convention analysis: 2026-01-08*
*Update when patterns change*
