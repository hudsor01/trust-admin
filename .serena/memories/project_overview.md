# Trust Admin - Project Overview

## Purpose
Trust Admin is a comprehensive trust management application for tracking beneficiaries, assets, distributions, HEMS requests, and trustee fees. It provides both an admin interface and a beneficiary portal.

## Tech Stack
- **Runtime**: Bun (v1.3.4+)
- **Frontend**: React 19 + Vite + TailwindCSS 4
- **Backend**: Bun native server (index.ts) with REST API
- **Database**: PostgreSQL with Drizzle ORM (v0.45.1)
- **Authentication**: better-auth (v1.4.10)
- **UI Components**: Radix UI + shadcn/ui patterns
- **Styling**: TailwindCSS 4.1.18 with CSS variables
- **Data Tables**: TanStack Table v8
- **Email**: Resend
- **Validation**: Zod v4

## Architecture
- Monolithic frontend + backend in single repo
- API routes in index.ts using route factory pattern
- Database layer: db/schema.ts, db/queries.ts, db/crud-factory.ts
- Frontend: src/pages/, src/components/, src/hooks/
- Two entry points: Admin UI and Beneficiary Portal

## Key Features
- Entity and beneficiary management
- Asset tracking (vehicles, properties, accounts, artwork, personal property)
- Distribution wizard and tracking
- HEMS request queue and approval workflow
- Trustee fee schedules
- Specific bequests
- Activity logging
- Accounting entries and liabilities
