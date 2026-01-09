# Trust Administration System (trust-admin) - Development Context

## Project Overview

The **trust-admin** project is a comprehensive trust administration system designed to manage trusts, beneficiaries, assets, distributions, and other trust-related operations. It's a full-stack application built with modern web technologies to provide a complete solution for trust administrators.

### Key Features
- **Entity Management**: Track trusts, LLCs, corporations, and other legal entities
- **Beneficiary Management**: Manage beneficiaries with their relationships, shares, and distribution standards
- **Asset Management**: Track various asset types including vehicles, real estate, bank/investment accounts, personal property, and artwork
- **Distribution Tracking**: Record and manage distributions to beneficiaries
- **Valuation Management**: Track asset valuations over time
- **HEMS Request Workflow**: Handle Health, Education, Maintenance, and Support requests with approval processes
- **Trustee Fee Management**: Calculate and track trustee fees based on schedules
- **Liability Management**: Track trust liabilities and payment history
- **Task Management**: Create and track administrative tasks with due dates and reminders
- **Document Management**: Link documents to assets and entities
- **Contact Management**: Maintain contact information for attorneys, accountants, property managers, etc.
- **Automated Reminders**: Email notifications for upcoming task due dates

### Technology Stack
- **Runtime**: Bun.js (fast JavaScript/TypeScript runtime)
- **Backend**: Custom Bun.js API server with route factory pattern
- **Frontend**: React with Vite build system
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Better Auth with magic link emails
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with custom animations
- **Email**: Resend for transactional emails
- **Containerization**: Docker and Docker Compose for database and backup services

## Building and Running

### Prerequisites
- Bun.js (v1.3.4 or later)
- Docker and Docker Compose
- Node.js (for development tools)

### Initial Setup
```bash
# Clone and navigate to project directory
cd /Users/richard/Developer/trust-admin

# Install dependencies
bun install

# Copy environment variables example and configure
cp .env.example .env
# Edit .env with your specific configuration
```

### Running the Application
```bash
# Method 1: Run both API and UI in development mode
bun run dev

# Method 2: Run API and UI separately
bun run dev:api  # Runs on port 5050
bun run dev:ui   # Runs on port 5173, proxies API requests to port 5050

# Method 3: Run only the API server
bun run index.ts
```

### Database Setup
```bash
# Start PostgreSQL container
docker compose up -d

# Run database migrations (first time only)
bun run db:migrate

# Seed the database with initial data (optional)
bun run db:seed

# Open Drizzle Studio for database management
bun run studio
```

### Environment Variables
Key environment variables to configure:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` - Database credentials
- `DATABASE_URL` - Connection string for PostgreSQL
- `RESEND_API_KEY` - API key for sending emails
- `EMAIL_FROM` - Sender email address (optional, defaults to Resend test domain)

### Development Commands
```bash
# Run tests
bun run test
bun run test:watch    # Watch mode
bun run test:coverage # Coverage report

# Database operations
bun run db:generate   # Generate migration files
bun run db:migrate    # Apply migrations
bun run db:push       # Push schema changes to DB
bun run db:pull       # Pull schema from DB
bun run db:studio     # Open Drizzle Studio
bun run db:seed       # Seed production data
bun run db:seed:dev   # Seed development data
bun run db:seed:reset # Reset database

# Build for production
bun run build
```

## Development Conventions

### Code Structure
- `src/` - Frontend React components and client-side code
- `db/` - Database schema, migrations, and query functions
- `index.ts` - Main API server entry point
- `config/` - Configuration files
- `init-scripts/` - PostgreSQL initialization scripts
- `scripts/` - Utility scripts
- `secrets/` - Sensitive configuration (not in version control)
- `tests/` - Test files

### API Design
- RESTful API endpoints following the pattern `/api/{resource}`
- Generic CRUD operations using a route factory pattern
- Custom endpoints for complex business logic
- CORS configured for development (frontend on 5173, API on 5050)

### Database Schema
- PostgreSQL with Drizzle ORM
- Comprehensive schema supporting trust administration workflows
- Foreign key relationships between entities
- Enum types for consistent data validation
- Activity logging for audit trails

### Authentication
- Better Auth with magic link emails (no passwords)
- Role-based access (admin, beneficiary)
- Session management with 7-day expiration
- Beneficiary-specific portal access

### Testing
- Bun test framework for unit and integration tests
- Test coverage reporting available
- Mock services for external dependencies

### Security Considerations
- Secure PostgreSQL configuration with SCRAM-SHA-256 authentication
- Data checksums enabled for corruption detection
- Docker container security hardening
- Environment variables for sensitive configuration
- Input validation through Zod schemas

### Naming Conventions
- TypeScript/JavaScript: camelCase for variables and functions
- Database: snake_case for table and column names
- Components: PascalCase for React components
- Enums: PascalCase with underscore separators

### Architecture Patterns
- Route factory pattern to eliminate duplicate CRUD handlers
- Separation of concerns between API, database, and UI layers
- Type-safe database operations with Drizzle ORM
- Component-based UI architecture with React
- Modular authentication with Better Auth