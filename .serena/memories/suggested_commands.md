# Suggested Commands for Trust Admin

## Development
```bash
# Install dependencies
bun install

# Run dev (both API + UI concurrently)
bun run dev

# Run API only (with hot reload)
bun run dev:api

# Run UI only (Vite)
bun run dev:ui

# Run API server
bun index.ts
bun --hot index.ts  # with hot reload
```

## Testing
```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

## Database
```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Push schema changes
bun run db:push

# Pull schema from DB
bun run db:pull

# Open Drizzle Studio
bun run db:studio

# Seed database
bun run db:seed           # Production seed (Hudson Trust)
bun run db:seed:dev       # Development seed
bun run db:seed:reset     # Reset database
```

## System Commands (Darwin/macOS)
Standard Unix commands work:
- `ls`, `cd`, `pwd`
- `grep`, `find`
- `git` for version control
