# 41-03 Summary: useCrudMutations Hook

**Status:** Complete
**Duration:** Single session
**Commits:**
- `b7651dd` feat(41-03): create useCrudMutations hook
- `dd2e9ff` refactor(41-03): migrate pilot pages to useCrudMutations

## What Was Done

### Task 1: Created useCrudMutations Hook
Created `src/hooks/use-crud-mutations.ts` (48 lines) with:
- Generic hook accepting any tRPC router key
- Returns `{ create, update, delete }` mutations
- Auto-invalidates list query on success
- Uses `biome-ignore` and `@ts-expect-error` for dynamic router access

```typescript
export function useCrudMutations<K extends keyof typeof trpc & string>(
    routerKey: K,
) {
    const utils = trpc.useUtils()
    const router = trpc[routerKey] as any
    const invalidate = () => utils[routerKey].list.invalidate()

    return {
        create: router.create.useMutation({ onSuccess: invalidate }),
        update: router.update.useMutation({ onSuccess: invalidate }),
        delete: router.delete.useMutation({ onSuccess: invalidate }),
    }
}
```

### Task 2: Migrated 3 Pilot Pages
- **contacts/page.tsx:** 807 → 797 lines (-10 lines)
- **bequests/page.tsx:** 645 → 637 lines (-8 lines)
- **vehicles/page.tsx:** 1017 → 1007 lines (-10 lines)

Used aliased destructuring for minimal code changes:
```typescript
const {
    create: createContactMutation,
    update: updateContactMutation,
    delete: deleteContactMutation,
} = useCrudMutations('contact')
```

### Task 3: Verification
- TypeScript check: Pass
- Lint: Pass
- Build: Pass

## Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Hook | 0 lines | 48 lines | +48 lines |
| contacts/page.tsx | 807 lines | 797 lines | -10 lines |
| bequests/page.tsx | 645 lines | 637 lines | -8 lines |
| vehicles/page.tsx | 1017 lines | 1007 lines | -10 lines |
| **Net** | 2469 lines | 2489 lines | +20 lines |

**Note:** This is a pilot migration. The hook adds 48 lines but removes only ~28 lines across 3 pages. The real savings come when applied to all 13+ admin pages with the same pattern (~10 lines saved per page = ~130 total lines saved).

## Pattern Standardized

Each page previously had:
```typescript
const utils = trpc.useUtils()
const createMutation = trpc.router.create.useMutation({
    onSuccess: () => utils.router.list.invalidate(),
})
const updateMutation = trpc.router.update.useMutation({
    onSuccess: () => utils.router.list.invalidate(),
})
const deleteMutation = trpc.router.delete.useMutation({
    onSuccess: () => utils.router.list.invalidate(),
})
```

Now replaced with:
```typescript
const { create, update, delete } = useCrudMutations('router')
```

## Future Work

Remaining pages that could use this hook (not in scope for this plan):
- accounts/page.tsx
- properties/page.tsx
- liabilities/page.tsx
- beneficiaries/page.tsx
- trustees/page.tsx
- hems/page.tsx
- hems-queue/page.tsx
- activity-log/page.tsx
- accounting/page.tsx
- settings/page.tsx

## Issues Encountered

None. Straightforward implementation.

---

*Phase: 41-hook-extraction*
*Plan: 03*
*Completed: 2026-01-18*
