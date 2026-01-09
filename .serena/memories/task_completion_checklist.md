# Task Completion Checklist

When completing a task, follow these steps:

## 1. Testing
```bash
# Run tests to ensure nothing broke
bun test
```

## 2. Database Changes
If schema was modified:
```bash
# Generate migration
bun run db:generate

# Review migration in drizzle/ folder

# Apply migration (if appropriate)
bun run db:migrate
```

## 3. Type Checking
TypeScript is checked automatically by Bun, but verify:
```bash
# Check if the app builds
bun run dev:api  # Check API builds
bun run dev:ui   # Check UI builds
```

## 4. Code Quality
- Ensure code follows project conventions
- No unused imports or variables
- Proper error handling
- Consistent formatting (TailwindCSS classes, etc.)

## 5. Git
```bash
# Check status
git status

# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "feat: description" # or fix:, refactor:, etc.
```

## Notes
- No separate linting/formatting tools configured (relies on editor)
- Tests are co-located with implementation or in tests/ directory
- Database migrations should be reviewed before applying to production
- Environment variables in .env (not committed)
