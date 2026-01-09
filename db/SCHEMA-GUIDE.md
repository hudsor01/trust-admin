# Drizzle ORM Schema Guide

Comprehensive guide for PostgreSQL schema design based on official Drizzle ORM documentation.

## Table of Contents

- [Column Types](#column-types)
- [Relations](#relations)
- [Validation with Zod](#validation-with-zod)
- [Seeding Data](#seeding-data)
- [PostgreSQL Extensions](#postgresql-extensions)
- [Row-Level Security](#row-level-security)
- [Schema Organization](#schema-organization)
- [Helpers](#helpers)

---

## Column Types

### Primary Keys

```typescript
// Option 1: Text with UUID default (compatible with existing schema)
import { textId } from "./helpers";
id: textId()

// Option 2: Native UUID (preferred for new tables)
import { uuidId } from "./helpers";
id: uuidId()

// Option 3: Auto-increment (for sequential IDs)
import { serial, bigserial } from "drizzle-orm/pg-core";
id: serial().primaryKey()        // 4-byte integer
id: bigserial({ mode: "number" }).primaryKey()  // 8-byte for large tables
```

### Numeric Types

```typescript
// Financial amounts - ALWAYS use numeric for money
amount: numeric({ precision: 14, scale: 2 })  // Up to $999,999,999,999.99

// Percentages
percent: numeric({ precision: 5, scale: 2 })  // 0.00 to 100.00

// Integers
year: integer()           // 4-byte signed integer
units: smallint()         // 2-byte for small ranges
population: bigint({ mode: "number" })  // 8-byte for large numbers

// Floating point (avoid for financial data)
latitude: doublePrecision()
rating: real()
```

### Text Types

```typescript
// Variable length (preferred)
name: text()                      // Unlimited
description: text()

// Fixed length constraints
state: varchar({ length: 2 })     // State codes
ein: varchar({ length: 10 })      // Tax IDs
vin: varchar({ length: 17 })      // Vehicle IDs

// With enum type inference
role: text({ enum: ["admin", "user", "guest"] })
```

### Temporal Types

```typescript
// Timestamps
createdAt: timestamp({ precision: 3, mode: "string" })
  .default(sql`CURRENT_TIMESTAMP`)
  .notNull()

// With timezone (recommended for user-facing dates)
eventDate: timestamp({ precision: 3, mode: "string", withTimezone: true })

// Date only
dob: date({ mode: "string" })

// Time only
openTime: time()
```

### JSON/JSONB

```typescript
// JSONB is preferred (faster queries, indexable)
metadata: jsonb()

// With type safety using .$type<T>()
type UserPrefs = { theme: "light" | "dark"; notifications: boolean };
preferences: jsonb().$type<UserPrefs>()
```

### Enums

```typescript
// Define enum
export const statusEnum = pgEnum("status", ["active", "inactive", "pending"]);

// Use in table
status: statusEnum().default("pending").notNull()
```

---

## Relations

Relations enable querying related data without manual joins.

### Defining Relations

```typescript
import { relations } from "drizzle-orm/relations";

export const entityRelations = relations(entity, ({ one, many }) => ({
  // One-to-many: entity has many vehicles
  vehicles: many(vehicle),

  // Self-referential: entity has parent entity
  parentEntity: one(entity, {
    fields: [entity.parentEntityId],
    references: [entity.id],
    relationName: "entity_parent"
  }),

  // Inverse of self-referential
  childEntities: many(entity, {
    relationName: "entity_parent"
  }),
}));

export const vehicleRelations = relations(vehicle, ({ one, many }) => ({
  // Many-to-one: vehicle belongs to entity
  entity: one(entity, {
    fields: [vehicle.entityId],
    references: [entity.id]
  }),

  // One-to-many: vehicle has many valuations
  valuations: many(valuation),
}));
```

### Querying with Relations

```typescript
// Fetch entity with all related data
const result = await db.query.entity.findFirst({
  where: eq(entity.id, entityId),
  with: {
    vehicles: true,
    beneficiaries: true,
    trustees: {
      with: {
        contact: true
      }
    }
  }
});
```

---

## Validation with Zod

Use `drizzle-zod` for type-safe validation schemas.

### Installation

```bash
bun add drizzle-zod zod
```

### Creating Schemas

```typescript
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

// Insert schema - for creating new records
export const insertEntitySchema = createInsertSchema(entity, {
  // Add custom refinements
  name: (schema) => schema.min(1, "Name is required").max(255),
  ein: (schema) => schema.regex(/^\d{2}-\d{7}$/, "Invalid EIN format").optional(),
});

// Select schema - for validating fetched data
export const selectEntitySchema = createSelectSchema(entity);

// Update schema - all fields optional
export const updateEntitySchema = createUpdateSchema(entity);

// Type exports
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type SelectEntity = z.infer<typeof selectEntitySchema>;
```

### Using Validation

```typescript
import { insertEntitySchema } from "./validation";

// In API handler
const data = await req.json();
const validated = insertEntitySchema.parse(data); // Throws on invalid
const entity = await db.insert(entity).values(validated).returning();
```

---

## Seeding Data

Use `drizzle-seed` for deterministic fake data generation.

### Installation

```bash
bun add drizzle-seed
```

### Basic Seeding

```typescript
import { seed, reset } from "drizzle-seed";
import { db } from "./index";
import * as schema from "./schema";

// Reset tables (cascading delete)
await reset(db, schema);

// Seed with default count (10 rows per table)
await seed(db, schema);

// Seed with custom count and deterministic seed
await seed(db, schema, { count: 100, seed: 42 });
```

### Refined Seeding

```typescript
await seed(db, schema, { count: 50, seed: 42 }).refine((f) => ({
  entity: {
    columns: {
      name: f.companyName(),
      governingLaw: f.valuesFromArray({ values: ["Texas", "California", "New York"] }),
    },
    count: 10,
  },
  beneficiary: {
    columns: {
      firstName: f.firstName(),
      lastName: f.lastName(),
      email: f.email(),
      phone: f.phoneNumber({ template: "(###) ###-####" }),
    },
    count: 50,
  },
}));
```

### Available Generators

| Generator | Description |
|-----------|-------------|
| `f.uuid()` | UUID v4 |
| `f.firstName()`, `f.lastName()`, `f.fullName()` | Names |
| `f.email()` | Email addresses |
| `f.phoneNumber({ template })` | Phone numbers |
| `f.streetAddress()`, `f.city()`, `f.state()`, `f.postcode()` | Addresses |
| `f.companyName()` | Company names |
| `f.int({ minValue, maxValue })` | Integers |
| `f.number({ minValue, maxValue, precision })` | Decimals |
| `f.boolean()` | Booleans |
| `f.date({ minDate, maxDate })` | Dates |
| `f.loremIpsum({ sentencesCount })` | Lorem ipsum text |
| `f.valuesFromArray({ values })` | Pick from array |
| `f.weightedRandom([{ weight, value }])` | Weighted distribution |

---

## PostgreSQL Extensions

Extensions are installed on the database server, not through Drizzle.

### Common Extensions

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigram similarity search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Case-insensitive text
CREATE EXTENSION IF NOT EXISTS "citext";

-- Vector similarity (AI embeddings)
CREATE EXTENSION IF NOT EXISTS vector;
```

### Using Extensions in Schema

```typescript
// UUID with database-generated default (requires uuid-ossp)
import { sql } from "drizzle-orm";
id: uuid().primaryKey().default(sql`uuid_generate_v4()`)

// Or use Drizzle's built-in (no extension needed)
id: uuid().primaryKey().defaultRandom()

// Vector column (requires pg_vector)
import { vector } from "drizzle-orm/pg-core";
embedding: vector({ dimensions: 1536 })
```

See `db/extensions.ts` for more examples.

---

## Row-Level Security

RLS enables fine-grained access control at the database level.

### Enabling RLS

```typescript
// Method 1: enableRLS() on existing table
export const entity = pgTable("Entity", {
  // columns...
}).enableRLS();

// Method 2: pgTable.withRLS()
export const entity = pgTable.withRLS("Entity", {
  // columns...
});
```

### Defining Policies

```typescript
import { pgPolicy, pgRole } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Define role
export const trusteeRole = pgRole("trustee");

// Define policy
export const trusteeAccessPolicy = pgPolicy("trustee_access", {
  as: "permissive",
  for: "select",
  to: trusteeRole,
  using: sql`
    EXISTS (
      SELECT 1 FROM "Trustee" t
      WHERE t."entityId" = "Entity".id
      AND t."userId" = current_setting('app.user_id')::uuid
    )
  `,
});

// Link policy to table
trusteeAccessPolicy.link(entity);
```

### Supabase/Neon Integration

```typescript
// Supabase
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

// Neon
import { authenticatedRole, authUid } from "drizzle-orm/neon";
```

See `db/rls.ts` for complete patterns.

---

## Schema Organization

### Single Schema (Current)

All tables in the default `public` schema:

```typescript
export const entity = pgTable("Entity", { /* ... */ });
```

### Named Schemas

For multi-tenant or logical separation:

```typescript
import { pgSchema } from "drizzle-orm/pg-core";

// Create schema
export const trustSchema = pgSchema("trust");

// Tables in schema
export const entity = trustSchema.table("Entity", { /* ... */ });

// Queries will use: SELECT * FROM "trust"."Entity"
```

### Multiple Files

Split schema across files:

```
db/
├── schema/
│   ├── index.ts      # Re-exports all
│   ├── entity.ts     # Entity table
│   ├── beneficiary.ts
│   └── ...
├── relations.ts
└── index.ts
```

---

## Helpers

Import from `db/helpers.ts`:

```typescript
import { textId, uuidId, timestamps, generateId } from "./helpers";

export const myTable = pgTable("MyTable", {
  id: textId(),                    // Text PK with UUID default
  // or: id: uuidId(),             // Native UUID PK
  name: text().notNull(),
  ...timestamps(),                 // createdAt + updatedAt
});
```

---

## Quick Reference

### npm Scripts

```bash
bun run db:generate     # Generate migrations
bun run db:migrate      # Run migrations
bun run db:push         # Push schema changes (dev)
bun run db:pull         # Pull schema from DB
bun run db:studio       # Open Drizzle Studio
bun run db:seed         # Seed Hudson Trust data
bun run db:seed:dev     # Seed dev data (drizzle-seed)
bun run db:seed:reset   # Reset all tables
```

### File Structure

```
db/
├── index.ts           # Database connection
├── schema.ts          # Table definitions
├── relations.ts       # Relation definitions
├── queries.ts         # Query functions
├── validation.ts      # Zod schemas
├── helpers.ts         # Schema helpers
├── extensions.ts      # PostgreSQL extensions
├── rls.ts             # Row-level security
├── seed-hudson-trust.ts  # Production seed
├── seed-dev.ts        # Development seed
└── SCHEMA-GUIDE.md    # This file
```

### Key Imports

```typescript
// Schema definition
import { pgTable, pgEnum, text, integer, numeric, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Relations
import { relations } from "drizzle-orm/relations";

// Validation
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";

// Seeding
import { seed, reset } from "drizzle-seed";

// RLS (when needed)
import { pgPolicy, pgRole } from "drizzle-orm/pg-core";
```

---

## Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Column Types](https://orm.drizzle.team/docs/column-types/pg)
- [Relations](https://orm.drizzle.team/docs/relations-v2)
- [Zod Integration](https://orm.drizzle.team/docs/zod)
- [Seeding](https://orm.drizzle.team/docs/seed-overview)
- [RLS](https://orm.drizzle.team/docs/rls)
- [Extensions](https://orm.drizzle.team/docs/extensions/pg)
