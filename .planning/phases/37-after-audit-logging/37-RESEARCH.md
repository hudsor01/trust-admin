# Phase 37: after() for Audit Logging - Research

**Researched:** 2026-01-18
**Domain:** Next.js after() API for non-blocking background tasks
**Confidence:** HIGH

<research_summary>
## Summary

Researched the Next.js `after()` API for moving audit logging to post-response background execution. The API is stable in Next.js 15+/16+ and designed exactly for this use case - logging, analytics, and cleanup tasks that shouldn't block the user's response.

Key finding: `after()` is simple to use - import from `next/server`, wrap async work in callback. The main consideration is that request APIs (cookies, headers) work in Route Handlers and Server Actions but NOT in Server Components. Since tRPC runs through Route Handlers, this isn't a limitation.

**Primary recommendation:** Convert `recordAuthEvent()` in `src/lib/auth-events.ts` to use `after()`. The pattern is straightforward: move the `db.insert()` call inside an `after()` callback. No need for retry logic or error queues - fire-and-forget is acceptable per user requirements.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next/server | 16.1+ | `after()` API | Built-in Next.js, no dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | No additional libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| after() | Background job queue (BullMQ) | Overkill for simple logging, adds infrastructure |
| after() | Database triggers | Less flexible, harder to maintain |
| after() | Separate logging service | More complexity, network calls |

**Installation:**
```bash
# No installation needed - built into Next.js 15+
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── audit.ts          # NEW: Audit logging utilities with after()
│   └── auth-events.ts    # UPDATE: Use audit.ts utilities
└── server/
    └── trpc/
        └── routers/      # Future: Could add audit logging to mutations
```

### Pattern 1: Simple after() Wrapper for Logging
**What:** Wrap existing logging function in after() callback
**When to use:** Converting existing synchronous logging to non-blocking
**Example:**
```typescript
// Source: Next.js 16.1 docs
import { after } from 'next/server'
import { db } from '@/db'
import { activityLog } from '@/db/schema'

export async function recordAuthEvent(
  action: string,
  userId: string | null,
  details: object
): Promise<void> {
  // Schedule logging after response is sent
  after(async () => {
    try {
      await db.insert(activityLog).values({
        tableName: 'session',
        recordId: userId || 'anonymous',
        action,
        changedBy: userId || 'system',
        newValues: details,
      })
    } catch (error) {
      // Log error but don't throw - fire-and-forget
      console.error('Audit log failed:', error)
    }
  })
}
```

### Pattern 2: Utility Function with after()
**What:** Create reusable audit function that encapsulates after()
**When to use:** When audit logging is needed in multiple places
**Example:**
```typescript
// src/lib/audit.ts
import { after } from 'next/server'
import { db } from '@/db'
import { activityLog } from '@/db/schema'
import { logger } from './logger'

interface AuditEntry {
  tableName: string
  recordId: string
  action: string
  changedBy: string
  oldValues?: object | null
  newValues?: object | null
  ipAddress?: string
}

/**
 * Schedule audit log entry to be written after response
 * Fire-and-forget - errors logged but not thrown
 */
export function auditAfter(entry: AuditEntry): void {
  after(async () => {
    try {
      await db.insert(activityLog).values(entry)
    } catch (error) {
      logger.db.error('Audit log failed', { entry, error })
    }
  })
}
```

### Anti-Patterns to Avoid
- **Expecting return values from after():** The callback runs after the response, so you can't get results back
- **Using after() in Server Components with request APIs:** cookies() and headers() don't work in Server Component after() callbacks
- **Adding retry logic:** Adds complexity - if logging is critical, use a proper queue system instead
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background tasks | Custom async queue | `after()` | Built-in, handles edge cases |
| Post-response execution | setTimeout/setImmediate | `after()` | after() integrates with Next.js lifecycle |
| Retry logic | Custom retry wrapper | Nothing (or BullMQ) | Fire-and-forget is fine; if critical, use proper job queue |

**Key insight:** `after()` is specifically designed for this use case. Don't try to build a custom solution - the Next.js team has handled the lifecycle integration, error boundaries, and edge cases.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Using Request APIs in Server Component after()
**What goes wrong:** Trying to access cookies() or headers() in after() callback from Server Component
**Why it happens:** React's rendering lifecycle makes request context unavailable in Server Components after render
**How to avoid:** Only use request APIs in after() callbacks from Route Handlers and Server Actions
**Warning signs:** Runtime error about request APIs not being available

### Pitfall 2: Expecting Synchronous Behavior
**What goes wrong:** Code after the after() call expects the callback to have completed
**Why it happens:** Misunderstanding that after() schedules work for later
**How to avoid:** Remember after() is fire-and-forget - no waiting, no return values
**Warning signs:** Tests that check audit logs immediately after calling the function

### Pitfall 3: Not Handling Errors in Callback
**What goes wrong:** Unhandled promise rejection in after() callback
**Why it happens:** Forgetting try/catch in async callback
**How to avoid:** Always wrap callback body in try/catch, log errors
**Warning signs:** Uncaught promise rejection warnings in logs
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official Next.js documentation:

### Basic after() Usage in Route Handler
```typescript
// Source: Next.js 16.1 docs - after() API reference
import { after } from 'next/server'
import { cookies, headers } from 'next/headers'

export async function POST(request: Request) {
  // Perform mutation
  const result = await doMutation()

  // Schedule logging - won't block response
  after(async () => {
    const userAgent = (await headers()).get('user-agent') || 'unknown'
    const sessionCookie = (await cookies()).get('session-id')?.value || 'anonymous'

    await logUserAction({ sessionCookie, userAgent })
  })

  return Response.json({ status: 'success' })
}
```

### Nested after() Calls
```typescript
// Source: Next.js 16.1 docs
import { after } from 'next/server'

// Can create utility functions that use after() internally
function scheduleAnalytics(event: string) {
  after(() => {
    // after() can be nested
    trackEvent(event)
  })
}
```

### after() with Error Handling
```typescript
// Recommended pattern for this project
import { after } from 'next/server'
import { logger } from '@/lib/logger'

export function auditAfter(entry: AuditEntry): void {
  after(async () => {
    try {
      await db.insert(activityLog).values(entry)
    } catch (error) {
      // Don't throw - just log
      logger.db.error('Audit log write failed', {
        entry,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Synchronous logging blocking response | after() for non-blocking | Next.js 15+ (2024) | Faster response times |
| Custom background workers | after() for simple tasks | Next.js 15+ (2024) | Less infrastructure |

**New tools/patterns to consider:**
- **after() nesting:** Can compose audit utilities that wrap after() internally
- **React cache() with after():** Can deduplicate function calls inside after()

**Deprecated/outdated:**
- **Manual setTimeout for post-response work:** Use after() instead - it integrates with Next.js properly
</sota_updates>

<open_questions>
## Open Questions

None - the after() API is well-documented and the use case is straightforward.

The only decision is scope: start with auth-events.ts only, or add audit logging to CRUD mutations too. The user's context suggests starting with auth-events.ts is sufficient for this phase.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- Context7: /vercel/next.js/v16.1.1 - after() API reference and examples
- 26-RESEARCH.md - Prior research on Next.js 16 features including after()

### Secondary (MEDIUM confidence)
- None needed - official docs were comprehensive

### Tertiary (LOW confidence - needs validation)
- None
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Next.js after() API
- Ecosystem: No additional libraries needed
- Patterns: Fire-and-forget logging, utility wrapper pattern
- Pitfalls: Request API availability, error handling

**Confidence breakdown:**
- Standard stack: HIGH - built into Next.js, no dependencies
- Architecture: HIGH - patterns from official docs
- Pitfalls: HIGH - documented in official docs
- Code examples: HIGH - from Context7/Next.js 16.1 docs

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable API)
</metadata>

---

*Phase: 37-after-audit-logging*
*Research completed: 2026-01-18*
*Ready for planning: yes*
