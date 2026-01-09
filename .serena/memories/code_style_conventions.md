# Code Style and Conventions

## Language
- TypeScript with strict mode
- Using Bun runtime APIs where possible

## Naming Conventions
- **Files**: kebab-case for components (e.g., `app-sidebar.tsx`)
- **Components**: PascalCase
- **Functions**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for true constants, camelCase for config objects
- **Types/Interfaces**: PascalCase

## TypeScript Patterns
- Use `interface` for object shapes
- Use `type` for unions, intersections, utilities
- Prefer type inference where clear
- Export types alongside implementations
- Use Zod for runtime validation with drizzle-zod integration

## React Patterns
- Functional components with hooks
- Custom hooks in `src/hooks/` with `use-` prefix
- Component co-location preferred
- Props types defined inline or as interfaces
- Use React 19 features

## Database Patterns
- **CRUD Factory Pattern**: `createCrud()` in `db/crud-factory.ts`
- **Relations**: Defined in `db/queries.ts` for complex joins
- **Schema**: Centralized in `db/schema.ts` using Drizzle ORM
- Query builders over raw SQL
- Use transactions for multi-step operations

## API Patterns
- **Route Factory Pattern**: `createRouteHandler()` in index.ts
- RESTful endpoints: GET /api/resource, POST /api/resource, etc.
- JSON responses using helper functions
- Consistent error handling with status codes

## Styling
- TailwindCSS utility classes
- CSS variables for theming in globals.css
- Component variants using class-variance-authority (cva)
- shadcn/ui component patterns

## File Organization
- Pages in `src/pages/`
- Reusable components in `src/components/`
- UI primitives in `src/components/ui/`
- Utilities in `src/lib/` and `src/utils/`
- Hooks in `src/hooks/`
- Database in `db/`
