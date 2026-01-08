# Codebase Structure

**Analysis Date:** 2026-01-08

## Directory Layout

```
trust-admin/
├── index.ts                      # API server entry point (Bun.serve)
├── db/                           # Database layer
│   ├── schema.ts                 # 31 Drizzle tables + 40+ enums
│   ├── crud-factory.ts           # Generic CRUD generator
│   ├── queries.ts                # CRUD instances + custom queries
│   ├── relations.ts              # Drizzle relationships
│   ├── validation.ts             # Zod schemas for validation
│   ├── seed-hudson-trust.ts      # Hudson Trust demo data
│   ├── seed-dev.ts               # Development seed data
│   ├── helpers.ts                # generateId(), date utils
│   └── index.ts                  # PostgreSQL connection pool
├── src/                          # Frontend application
│   ├── main.tsx                  # React DOM mount point
│   ├── App.tsx                   # SPA router (hash-based)
│   ├── pages/                    # Page components (18 total)
│   ├── components/               # UI components
│   ├── hooks/                    # React hooks for data fetching
│   ├── lib/                      # Business logic, utilities, auth
│   ├── utils/                    # Formatters and helpers
│   └── styles/                   # Global CSS + Tailwind
├── tests/                        # Test files (3 files, 1130 lines)
├── drizzle/                      # Generated migrations (production only)
├── config/                       # PostgreSQL configuration
├── scripts/                      # Build and utility scripts
├── package.json                  # Bun dependencies
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
├── drizzle.config.ts             # Database schema configuration
├── docker-compose.yml            # Database + backup services
└── Dockerfile                    # Production container image
```

## Directory Purposes

**db/**
- Purpose: Database schema, ORM operations, validation
- Contains: Drizzle schema definitions, CRUD factories, Zod validators, seed scripts
- Key files: `schema.ts` (31 tables), `crud-factory.ts` (generic CRUD), `queries.ts` (22 resource CRUDs)
- Subdirectories: None (flat structure)

**src/**
- Purpose: Frontend React application
- Contains: Pages, components, hooks, utilities, business logic
- Key files: `main.tsx` (entry), `App.tsx` (router)
- Subdirectories: pages/, components/, hooks/, lib/, utils/, styles/

**src/pages/**
- Purpose: Top-level route components
- Contains: 14 admin pages + 4 portal pages (18 total)
- Key files: `Dashboard.tsx`, `Liabilities.tsx`, `Properties.tsx`, `Accounting.tsx`, `portal/Login.tsx`
- Subdirectories: `portal/` (beneficiary portal pages)

**src/components/**
- Purpose: Reusable UI components
- Contains: Application sidebar, editable cells, theme components
- Key files: `app-sidebar.tsx`, `editable-cells.tsx`
- Subdirectories: `ui/` (shadcn/ui components - 25+ files)

**src/hooks/**
- Purpose: Custom React hooks for data fetching
- Contains: 13 resource-specific query hooks + factory
- Key files: `use-query.ts` (hook factory), `index.ts` (exports)
- Subdirectories: None (flat structure)

**src/lib/**
- Purpose: Business logic, authentication, utilities
- Contains: Better Auth config, calculators, classification rules, formatters
- Key files: `auth.ts`, `auth-client.ts`, `distribution-calculator.ts`, `fee-calculator.ts`, `withdrawal-eligibility.ts`, `classification-rules.ts`
- Subdirectories: None (flat structure)

**src/utils/**
- Purpose: Pure utility functions
- Contains: Formatters for currency, dates, percentages
- Key files: `formatters.ts`
- Subdirectories: None

**tests/**
- Purpose: Test suite
- Contains: API integration tests, unit tests for formatters
- Key files: `api.test.ts` (987 lines), `formatters.test.ts` (133 lines), `setup.ts`
- Subdirectories: None (flat structure)

**drizzle/**
- Purpose: Generated SQL migrations (production deployments)
- Contains: Migration files created by `drizzle-kit generate`
- Note: Development uses `db:push` (schema sync without migrations)
- Subdirectories: None

**config/**
- Purpose: PostgreSQL server configuration
- Contains: `postgresql.conf`, `pg_hba.conf`
- Used by: Docker Compose PostgreSQL service

**scripts/**
- Purpose: Build and development utilities
- Contains: `start-dev.js` (concurrent dev servers), `check-port.js`, `seed-beneficiary-users.ts`
- Subdirectories: None

## Key File Locations

**Entry Points:**
- `index.ts` - API server (Bun.serve on port 5050)
- `src/main.tsx` - React application mount
- `src/App.tsx` - SPA router with hash-based routing

**Configuration:**
- `tsconfig.json` - TypeScript compiler options (strict mode, path alias `@/*`)
- `vite.config.ts` - Frontend build config (React plugin, Tailwind, dev proxy)
- `drizzle.config.ts` - Database schema location and dialect
- `docker-compose.yml` - PostgreSQL database and backup services
- `.env` - Environment variables (gitignored)
- `.env.example` - Environment variable template

**Core Logic:**
- `db/schema.ts` - Database schema (31 tables, 40+ enums)
- `db/crud-factory.ts` - Generic CRUD operation generator
- `db/queries.ts` - Instantiated CRUD operations for 22 resources
- `src/lib/` - Business logic (calculators, eligibility checks, classification rules)

**Testing:**
- `tests/api.test.ts` - Integration tests for API endpoints
- `tests/formatters.test.ts` - Unit tests for utility functions
- `tests/setup.ts` - Test configuration

**Documentation:**
- `CLAUDE.md` - Project context for Claude Code
- `README.md` - User-facing documentation
- `GETTING-STARTED.md` - Setup instructions

## Naming Conventions

**Files:**
- kebab-case.tsx for React components: `editable-cells.tsx`, `app-sidebar.tsx`
- kebab-case.ts for utilities: `use-query.ts`, `crud-factory.ts`, `auth-client.ts`
- PascalCase.tsx for pages: `Dashboard.tsx`, `Liabilities.tsx`, `Properties.tsx`

**Directories:**
- kebab-case for all directories: `src/pages`, `src/components`, `src/hooks`
- Singular names except for collections: `tests/`, `scripts/`, `drizzle/`

**Special Patterns:**
- `index.ts` for directory exports: `src/hooks/index.ts` re-exports all hooks
- `*.test.ts` for test files: `api.test.ts`, `formatters.test.ts`
- `seed-*.ts` for database seeding: `seed-hudson-trust.ts`, `seed-dev.ts`

## Where to Add New Code

**New Page:**
- Primary code: `src/pages/NewPage.tsx`
- Route: Add to `src/App.tsx` route definitions
- Sidebar: Add to `src/components/app-sidebar.tsx` navigation items

**New Database Table:**
- Schema: Add to `db/schema.ts`
- Relations: Add to `db/relations.ts`
- CRUD: Create in `db/queries.ts` using `createCrud(table, options)`
- Validation: Add Zod schemas to `db/validation.ts`
- API: Add resource to `index.ts` route factory configuration

**New API Endpoint (Custom Logic):**
- Definition: Add handler in `index.ts` (special routes section, lines 528-826)
- Tests: Add test cases to `tests/api.test.ts`

**New Component:**
- Implementation: `src/components/NewComponent.tsx`
- shadcn/ui component: `src/components/ui/new-component.tsx`
- Types: Define interfaces in component file or `src/lib/types.ts` (if shared)

**New Hook:**
- Implementation: `src/hooks/use-new-hook.ts`
- Export: Add to `src/hooks/index.ts`
- Pattern: Use `createQueryHook()` factory for CRUD resources

**New Utility:**
- Formatters: `src/utils/formatters.ts`
- Business logic: `src/lib/new-utility.ts`
- Tests: `tests/new-utility.test.ts`

## Special Directories

**drizzle/**
- Purpose: Generated SQL migration files
- Source: Created by `drizzle-kit generate` command
- Committed: Yes (for production deployments)
- Usage: Production uses `drizzle-kit migrate`, development uses `db:push`

**src/components/ui/**
- Purpose: shadcn/ui component library
- Source: Generated by shadcn CLI (`npx shadcn@latest add`)
- Committed: Yes (maintained in repository)
- Count: 25+ pre-built accessible components

**node_modules/**
- Purpose: Bun package dependencies
- Source: Created by `bun install`
- Committed: No (in .gitignore)

**coverage/**
- Purpose: Test coverage reports
- Source: Generated by `bun test --coverage`
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-01-08*
*Update when directory structure changes*
