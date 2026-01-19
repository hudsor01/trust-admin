# Phase 30 Research: nuqs URL State Management

**Research Date:** 2026-01-16
**Sources:** Official nuqs documentation, Next.js Conf 2025, GitHub, Medium articles

---

## Executive Summary

nuqs is the recommended solution for type-safe URL state management in Next.js App Router applications. It's used by Sentry, Supabase, Vercel, and Clerk. The library is only ~6KB gzipped and provides a React.useState-like API that syncs with the URL.

---

## 1. Library Overview

**What it does:**
- Replaces `useState` with `useQueryState` that syncs to URL search params
- Type-safe parsing with built-in parsers (string, integer, boolean, etc.)
- Supports both client and server components
- Shallow routing by default (no server re-render)

**Version requirements:**
- nuqs v2 requires Next.js >=14.2.0
- Our stack: Next.js 16.1 (fully compatible)

**Bundle size:** ~6KB gzipped

---

## 2. Setup for Next.js App Router

### Installation

```bash
bun add nuqs
```

### Adapter Setup (Required)

Wrap the root layout with `NuqsAdapter`:

```tsx
// src/app/layout.tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { type ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}
```

---

## 3. Client Component Usage

### Basic useQueryState

```tsx
'use client'
import { useQueryState, parseAsString } from 'nuqs'

function EntityFilter() {
  const [entityId, setEntityId] = useQueryState(
    'entity',
    parseAsString.withDefault('')
  )

  // entityId is now synced to URL: ?entity=xxx
  return (
    <Select value={entityId} onValueChange={setEntityId}>
      {/* ... */}
    </Select>
  )
}
```

### Multiple Params with useQueryStates

```tsx
'use client'
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs'

function Filters() {
  const [filters, setFilters] = useQueryStates({
    entity: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
    sort: parseAsString.withDefault('name')
  })

  // Access: filters.entity, filters.page, filters.sort
  // Update: setFilters({ page: 2 }) - batches updates
}
```

---

## 4. Available Parsers

| Parser | Type | Notes |
|--------|------|-------|
| `parseAsString` | `string` | Default for text values |
| `parseAsInteger` | `number` | Uses parseInt(val, 10) |
| `parseAsFloat` | `number` | Uses parseFloat |
| `parseAsBoolean` | `boolean` | 'true'/'false' strings |
| `parseAsIsoDate` | `Date` | YYYY-MM-DD format |
| `parseAsIsoDateTime` | `Date` | Full ISO 8601 |
| `parseAsJson<T>` | `T` | JSON serialization |
| `parseAsArrayOf(parser)` | `T[]` | Comma-separated arrays |
| `parseAsStringLiteral` | union | Type-safe literals |
| `parseAsStringEnum` | enum | TypeScript enum values |

---

## 5. Options & Configuration

### withDefault(value)

Sets a default value when param is missing:

```tsx
parseAsString.withDefault('')  // Empty string if ?entity not present
```

**Behavior:** When state equals default, the param is **removed** from URL (cleaner URLs).

### withOptions(opts)

```tsx
parseAsString.withOptions({
  shallow: false,     // Trigger server re-render (RSC)
  history: 'push',    // Push to history (default: 'replace')
  throttleMs: 300,    // Debounce updates
  clearOnDefault: true // Remove param when value equals default
})
```

### React Transitions Integration

```tsx
const [isLoading, startTransition] = useTransition()
const [entityId, setEntityId] = useQueryState(
  'entity',
  parseAsString.withOptions({
    startTransition,
    shallow: false
  })
)
// isLoading will be true while server re-renders
```

---

## 6. Server-Side Access

### createSearchParamsCache

For type-safe access in Server Components:

```tsx
// lib/search-params.ts
import { createSearchParamsCache, parseAsString } from 'nuqs/server'

export const searchParamsCache = createSearchParamsCache({
  entity: parseAsString.withDefault('')
})
```

```tsx
// app/(admin)/page.tsx (Server Component)
import { searchParamsCache } from '@/lib/search-params'

export default async function Page({
  searchParams
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const { entity } = await searchParamsCache.parse(searchParams)
  // entity is typed as string
}
```

---

## 7. Current Codebase Pattern to Replace

### Before (useState)

```tsx
// Current pattern in 9 admin pages
const [selectedEntityOverride, setSelectedEntity] = useState<string | undefined>(undefined)
const selectedEntity = selectedEntityOverride ?? entities[0]?.id
```

**Problems:**
1. State lost on page refresh
2. Can't share URLs with entity selection
3. Back button doesn't preserve selection
4. No server-side access to selection

### After (nuqs)

```tsx
// New pattern with nuqs
const [selectedEntity, setSelectedEntity] = useQueryState(
  'entity',
  parseAsString.withDefault('')
)
// Auto-defaults to first entity if empty
const effectiveEntity = selectedEntity || entities[0]?.id
```

**Benefits:**
1. State persists in URL (?entity=xxx)
2. Shareable links
3. Back/forward navigation works
4. Could be accessed server-side if needed

---

## 8. Migration Strategy for trust-admin

### Step 1: Install and Setup Adapter

```bash
bun add nuqs
```

Update `src/app/layout.tsx` to wrap with `NuqsAdapter`.

### Step 2: Create Custom Hook

```tsx
// src/hooks/use-entity-filter.ts
'use client'
import { useQueryState, parseAsString } from 'nuqs'

export function useEntityFilter(defaultEntityId?: string) {
  const [entityId, setEntityId] = useQueryState(
    'entity',
    parseAsString.withDefault('')
  )

  // Return effective entity (from URL or default)
  const effectiveEntityId = entityId || defaultEntityId

  return [effectiveEntityId, setEntityId] as const
}
```

### Step 3: Update 9 Admin Pages

Files to update:
1. `src/app/(admin)/beneficiaries/page.tsx`
2. `src/app/(admin)/trustees/page.tsx`
3. `src/app/(admin)/vehicles/page.tsx`
4. `src/app/(admin)/bequests/page.tsx`
5. `src/app/(admin)/settings/page.tsx`
6. `src/app/(admin)/liabilities/page.tsx`
7. `src/app/(admin)/properties/page.tsx`
8. `src/app/(admin)/accounts/page.tsx`
9. `src/app/(admin)/accounting/page.tsx`

### Step 4: Test Scenarios

- [ ] URL updates when entity changes
- [ ] Page refresh preserves selection
- [ ] Back button restores previous selection
- [ ] Direct URL access works (?entity=xxx)
- [ ] Default selection when no URL param

---

## 9. Edge Cases & Gotchas

### 1. Entity ID Validation

URL could have invalid entity ID. Handle gracefully:

```tsx
const effectiveEntity = entities.find(e => e.id === entityId)?.id
  ?? entities[0]?.id
```

### 2. First Load Race Condition

Entities may not be loaded when nuqs initializes. The derived state pattern handles this:

```tsx
const effectiveEntity = entityId || entities[0]?.id
```

### 3. Clearing the Filter

Setting to empty string removes param from URL:

```tsx
setEntityId('')  // URL becomes /trustees (no ?entity param)
```

### 4. Multiple Tabs

Each tab maintains its own URL state - this is the expected behavior.

---

## 10. Testing Plan

| Test Case | Expected Behavior |
|-----------|-------------------|
| Select entity | URL updates to `?entity={id}` |
| Refresh page | Entity selection preserved |
| Back button | Returns to previous entity |
| Forward button | Restores forward entity |
| Share URL | Recipient sees same entity |
| Invalid entity ID in URL | Falls back to first entity |
| No entities loaded | Shows loading state |
| Clear selection | URL param removed |

---

## References

- [nuqs Official Documentation](https://nuqs.dev)
- [GitHub Repository](https://github.com/47ng/nuqs)
- [Next.js Conf 2025 Session](https://nextjs.org/conf/session/type-safe-url-state-in-nextjs-with-nuqs)
- [React Advanced 2025 Coverage](https://www.infoq.com/news/2025/12/nuqs-react-advanced/)
- [Managing search parameters in Next.js with nuqs](https://blog.logrocket.com/managing-search-parameters-next-js-nuqs/)
