---
name: trust-admin-developer
description: A skill to help develop the trust-admin project, providing guidance on architecture, database schema, API endpoints, and development workflows
---

# Trust Admin Developer Assistant

## Purpose
This skill helps developers work on the trust-admin project by providing detailed information about the codebase, architecture, database schema, API endpoints, and development workflows.

## When to Use This Skill
- When you need to understand the project architecture
- When you're working with the database schema and relationships
- When you need guidance on API endpoints and CRUD operations
- When you're implementing new features or fixing bugs
- When you need to understand the authentication system
- When you're working with specific modules like HEMS requests, trustee fees, or distributions

## Project Architecture Overview
The trust-admin project is a full-stack trust administration system built with:
- Backend: Bun.js with custom API server
- Frontend: React with Vite
- Database: PostgreSQL with Drizzle ORM
- Authentication: Better Auth with magic links
- UI: Radix UI components with Tailwind CSS

## Key Directories and Files
- `index.ts`: Main API server with route factory pattern
- `db/schema.ts`: Complete database schema with all tables and relationships
- `db/queries.ts`: Query functions with CRUD operations and custom queries
- `src/lib/auth.ts`: Authentication configuration
- `src/index.html`: Frontend entry point
- `docker-compose.yml`: Database and backup services
- `package.json`: Dependencies and scripts

## Development Commands
- `bun run dev` - Run both API and UI in development
- `bun run dev:api` - Run API server only (port 5050)
- `bun run dev:ui` - Run UI only (port 5173)
- `bun run db:migrate` - Apply database migrations
- `bun run db:studio` - Open Drizzle Studio
- `bun run test` - Run tests

## When Asked About
- Database schema: Refer to [SCHEMA.md](SCHEMA.md) for detailed information about table structures, relationships, and enums
- API development: Refer to [API.md](API.md) for complete endpoint documentation and route factory pattern
- Authentication: Explain the Better Auth setup and session management
- Frontend: Provide guidance on React components and UI patterns
- Testing: Suggest approaches for testing different parts of the application
- Deployment: Explain the Docker setup and backup procedures
- Troubleshooting: Provide debugging tips for common issues

## Code Patterns to Follow
- Use the route factory pattern for new CRUD endpoints
- Follow the existing query function structure in `db/queries.ts`
- Maintain consistency with existing enum values and data types
- Follow the existing error handling and response patterns
- Use proper TypeScript types and interfaces