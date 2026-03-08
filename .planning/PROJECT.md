# Project: Trust Admin

## What This Is

A trust administration application for managing the **Hudson Living Trust**, a Texas Irrevocable Trust. The grantor (Richard Hudson) died 2024-12-28, making this an **estate settlement** followed by **ongoing trust administration**.

**Two user types:**
- **Admin (Trustee):** Manages all trust assets, liabilities, accounting, and distributions
- **Beneficiary:** Views their share, submits HEMS requests through a portal

## Core Value

Secure, auditable trust administration with role-based access control and Texas Property Code compliance.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Next.js 16 (App Router)
- **API:** tRPC v11
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Drizzle ORM
- **Auth:** Neon Auth (managed Better Auth)
- **Deployment:** Vercel

## Current State

- 24 tRPC routers for all resources
- Admin auth + beneficiary portal (email/password)
- Payment recording with auto-accounting
- HEMS workflow (request → approve → distribute)
- RLS policies with JWT session initialization
- Activity log audit trail
- Custom forgot/reset password flow via n8n webhook
- Admin user provisioning with forced password change

## Current Milestone: v4.0 Production Hardening & Completeness

**Goal:** Systematically address security vulnerabilities, performance bottlenecks, architecture debt, incomplete features, and code quality issues identified in comprehensive critical review.

**Target areas:**
- Security & data integrity fixes (auth, RLS, input validation, session management)
- Performance optimization (unbounded queries, sequential calls, client-side filtering)
- Correctness fixes (auto-classification, payment math, deprecated API migration)
- Feature completeness (missing asset UIs, portal HEMS history, tax compliance fields)
- Dead code removal & code quality (unused functions, duplicate layers, type safety)

**Audit:** `.planning/v4-critical-review.md` (45 findings across 4 severity tiers)
