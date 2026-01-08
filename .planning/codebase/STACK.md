# Technology Stack

**Analysis Date:** 2026-01-08

## Languages

**Primary:**
- TypeScript 5.x - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Build scripts, configuration (`scripts/*.js`)
- SQL - Database schema migrations (`drizzle/`)

## Runtime

**Environment:**
- Bun 1.x (latest) - JavaScript runtime with built-in TypeScript support
- Node.js API compatible

**Package Manager:**
- Bun (`bun install`, `bun run`)
- Lockfile: `bun.lock` present

## Frameworks

**Core:**
- React 19.2.3 - UI framework (`package.json`)
- Vite 7.3.0 - Frontend build tool and dev server (`vite.config.ts`)
- Bun.serve() - Native HTTP server for API (no Express/Fastify) (`index.ts`)

**Testing:**
- Bun Test (built-in) - Native test runner with coverage support

**Build/Dev:**
- TypeScript 5.x - Type checking and compilation
- Vite 7.3.0 - Hot module reload, bundling, dev proxy

## Key Dependencies

**Critical:**
- Better Auth 1.4.10 - Authentication with magic link plugin (`src/lib/auth.ts`)
- Drizzle ORM 0.45.1 - Type-safe database ORM (`db/crud-factory.ts`, `db/queries.ts`)
- Drizzle-Kit 0.31.8 - Schema migrations and management (`drizzle.config.ts`)
- Resend 6.6.0 - Transactional email for magic links (`src/lib/auth.ts`)
- Zod 4.3.5 - Runtime validation and type safety (`db/validation.ts`)

**Infrastructure:**
- postgres 3.4.8 (postgres-js) - PostgreSQL connection pooling (`db/index.ts`)
- pg 8.16.3 - PostgreSQL driver types
- React Router (hash-based) - Client-side SPA routing (`src/App.tsx`)

**UI Components:**
- Radix UI (11 packages) - Unstyled accessible components (`package.json`)
- shadcn/ui - Pre-built component library built on Radix (`src/components/ui/`)
- TailwindCSS 4.1.18 - Utility-first CSS framework (`vite.config.ts`)
- TanStack React Table 8.21.3 - Headless table library
- Lucide React 0.562.0 - Icon library

**Utilities:**
- date-fns 4.1.0 - Date formatting and manipulation
- clsx 2.1.1 + tailwind-merge 3.4.0 - Conditional CSS class utilities
- class-variance-authority 0.7.1 - CSS variant composition

## Configuration

**Environment:**
- `.env` files (`.env.example` provided as template)
- Key variables: `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `BETTER_AUTH_SECRET`

**Build:**
- `vite.config.ts` - Vite configuration with React and Tailwind plugins
- `tsconfig.json` - TypeScript compiler options (strict mode enabled)
- `drizzle.config.ts` - Database schema and migration config

## Platform Requirements

**Development:**
- Any platform with Bun support (macOS, Linux, Windows via WSL)
- Docker for local PostgreSQL database
- No additional build tools required (Bun handles everything)

**Production:**
- Docker container (multi-stage build from `oven/bun:1` base)
- PostgreSQL 18 database
- Memory: 512MB minimum for API, 2GB for database
- Port 5050 for API server

---

*Stack analysis: 2026-01-08*
*Update after major dependency changes*
