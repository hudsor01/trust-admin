# Phase 41: Hook Extraction - Research

**Researched:** 2026-01-18
**Domain:** React hooks, tRPC mutations, component extraction
**Confidence:** HIGH

<research_summary>
## Summary

Researched patterns for extracting reusable hooks from the existing codebase. The current implementation has significant duplication: 6 editable cell components share identical state logic (~300 lines duplicated), 15+ admin pages repeat the same mutation setup pattern (~400 lines), and two login pages are nearly identical (~175 lines each).

The standard approach is straightforward React custom hook extraction - no external libraries needed. The patterns are well-documented in React docs and tRPC discussions.

**Primary recommendation:** Extract a single `useEditableCell` hook handling editing/saving state, create `useCrudMutations` accepting a tRPC router for auto-invalidation, and consolidate login pages into a configurable `<LoginPage>` component.
</research_summary>

<standard_stack>
## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2 | Hooks, state management | Built-in custom hooks pattern |
| @trpc/react-query | v11 | Mutation hooks | useMutation with auto-types |
| @tanstack/react-query | v5 | Query/mutation state | Invalidation patterns |

### Supporting (No New Dependencies)
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Custom hooks | Extract reusable stateful logic | 3+ components share same state pattern |
| Wrapper hooks | Encapsulate mutation + invalidation | Every mutation needs same onSuccess |
| Component composition | Share UI structure | Pages differ only by props |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom hook | Render props | More complex, React 16 pattern, hooks preferred |
| Custom hook | HOC | Pre-hooks pattern, hooks are simpler |
| Component composition | Slots/children | More flexible but more complex API |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── use-editable-cell.ts      # NEW: Extracted editing state logic
│   ├── use-crud-mutations.ts     # NEW: Wrapper for CRUD mutations
│   └── use-entity-filter.ts      # Existing
├── components/
│   ├── editable-cells.tsx        # MODIFIED: Uses useEditableCell
│   └── login-page.tsx            # NEW: Shared login component
└── app/
    ├── login/page.tsx            # MODIFIED: Uses <LoginPage>
    └── portal/login/page.tsx     # MODIFIED: Uses <LoginPage>
```

### Pattern 1: useEditableCell Hook
**What:** Extracts editing, saving, and keyboard handling state into reusable hook
**When to use:** Any inline-editable cell component
**Example:**
```typescript
// Source: React docs custom hooks pattern
interface UseEditableCellOptions<T> {
  value: T
  onSave: (value: T) => Promise<unknown>
  formatForEdit?: (value: T) => string
  parseFromEdit?: (value: string) => T
}

interface UseEditableCellReturn {
  editing: boolean
  editValue: string
  saving: boolean
  startEditing: () => void
  cancelEditing: () => void
  handleChange: (value: string) => void
  handleSave: () => Promise<void>
  handleKeyDown: (e: React.KeyboardEvent) => void
}

export function useEditableCell<T>(options: UseEditableCellOptions<T>): UseEditableCellReturn {
  const { value, onSave, formatForEdit, parseFromEdit } = options
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const startEditing = useCallback(() => {
    setEditValue(formatForEdit ? formatForEdit(value) : String(value ?? ''))
    setEditing(true)
  }, [value, formatForEdit])

  const cancelEditing = useCallback(() => setEditing(false), [])
  const handleChange = useCallback((v: string) => setEditValue(v), [])

  const handleSave = useCallback(async () => {
    const parsed = parseFromEdit ? parseFromEdit(editValue) : editValue as T
    if (parsed === value) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(parsed)
      setEditing(false)
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }, [editValue, value, onSave, parseFromEdit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') cancelEditing()
  }, [handleSave, cancelEditing])

  return { editing, editValue, saving, startEditing, cancelEditing, handleChange, handleSave, handleKeyDown }
}
```

### Pattern 2: useCrudMutations Hook
**What:** Wraps tRPC CRUD mutations with auto-invalidation
**When to use:** Any page with standard create/update/delete operations
**Example:**
```typescript
// Source: tRPC GitHub discussions #3220
type CrudRouter<T> = {
  create: { useMutation: () => ReturnType<typeof useMutation> }
  update: { useMutation: () => ReturnType<typeof useMutation> }
  delete: { useMutation: () => ReturnType<typeof useMutation> }
  list: { invalidate: (input?: { entityId?: number }) => void }
}

interface UseCrudMutationsOptions {
  entityId?: number
  onCreateSuccess?: () => void
  onUpdateSuccess?: () => void
  onDeleteSuccess?: () => void
}

export function useCrudMutations<T>(
  router: CrudRouter<T>,
  utils: { [key: string]: { list: { invalidate: (input?: { entityId?: number }) => void } } },
  routerKey: string,
  options?: UseCrudMutationsOptions
) {
  const { entityId, onCreateSuccess, onUpdateSuccess, onDeleteSuccess } = options ?? {}

  const invalidate = useCallback(() => {
    utils[routerKey].list.invalidate(entityId ? { entityId } : undefined)
  }, [utils, routerKey, entityId])

  const createMutation = router.create.useMutation({
    onSuccess: () => { invalidate(); onCreateSuccess?.() }
  })

  const updateMutation = router.update.useMutation({
    onSuccess: () => { invalidate(); onUpdateSuccess?.() }
  })

  const deleteMutation = router.delete.useMutation({
    onSuccess: () => { invalidate(); onDeleteSuccess?.() }
  })

  return { createMutation, updateMutation, deleteMutation }
}
```

### Pattern 3: Configurable LoginPage Component
**What:** Single component accepting configuration props
**When to use:** Multiple pages share same structure, differ by props
**Example:**
```typescript
// Source: React composition patterns
interface LoginPageProps {
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  redirectPath: string
  callbackURL: string
  emailPlaceholder?: string
}

export function LoginPage({
  title,
  description = 'Enter your email to receive a secure login link',
  icon: Icon,
  redirectPath,
  callbackURL,
  emailPlaceholder = 'your@email.com'
}: LoginPageProps) {
  // ... shared implementation
}

// Usage in admin login
<LoginPage
  title="Admin Login"
  icon={Shield}
  redirectPath="/dashboard"
  callbackURL="/dashboard"
  emailPlaceholder="admin@example.com"
/>

// Usage in portal login
<LoginPage
  title="Beneficiary Portal"
  icon={Mail}
  redirectPath="/portal"
  callbackURL="/portal"
/>
```

### Anti-Patterns to Avoid
- **Over-abstracting hooks:** Don't create hooks for single-use patterns
- **Losing type safety:** Ensure generics preserve tRPC types
- **Breaking optimistic updates:** Hook must work with useOptimistic (Phase 36 work)
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State management | Custom observable | React useState/useReducer | Built-in, battle-tested |
| Mutation caching | Manual cache | TanStack Query | Already handles invalidation |
| Form state | Custom form hook | useResourceForm (existing) | Already built in Phase 10 |
| Keyboard handling | Custom event system | Native onKeyDown | Simple, works everywhere |

**Key insight:** This phase is about extraction, not invention. All patterns already exist in the codebase or React/tRPC docs. The goal is to DRY up existing code, not create new abstractions.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Breaking Optimistic Updates
**What goes wrong:** Extracted hook doesn't work with useOptimistic from Phase 36
**Why it happens:** Hook returns wrong state shape or timing
**How to avoid:** Test with HEMS approval and task toggle (existing useOptimistic usage)
**Warning signs:** UI flickers or optimistic state reverts incorrectly

### Pitfall 2: Losing TypeScript Types
**What goes wrong:** useCrudMutations loses router-specific types
**Why it happens:** Generic constraints too loose
**How to avoid:** Use `typeof trpc.specificBequest` pattern for type inference
**Warning signs:** `any` types appearing, autocomplete stops working

### Pitfall 3: Stale Closures in Callbacks
**What goes wrong:** handleSave uses old value after rapid edits
**Why it happens:** Missing dependencies in useCallback
**How to avoid:** Include all dependencies, use functional updates
**Warning signs:** Wrong values saved after quick edits

### Pitfall 4: Over-Extraction
**What goes wrong:** Hook API becomes complex to support all 6 cell types
**Why it happens:** Trying to handle every case in one hook
**How to avoid:** Core hook handles common state, cell components handle formatting
**Warning signs:** Hook has 10+ parameters
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from the current codebase:

### Current Duplicated Pattern (editable-cells.tsx)
```typescript
// Lines 33-52 - repeated 6 times with slight variations
const [editing, setEditing] = useState(false)
const [editValue, setEditValue] = useState(value || '')
const [saving, setSaving] = useState(false)

const handleSave = async () => {
    if (editValue === (value || '')) {
        setEditing(false)
        return
    }
    setSaving(true)
    try {
        await onSave(editValue || null)
        setEditing(false)
    } catch (e) {
        console.error('Save failed:', e)
    } finally {
        setSaving(false)
    }
}
```

### Current Duplicated Pattern (admin pages)
```typescript
// From bequests/page.tsx lines 73-81 - repeated 15+ times
const createBequestMutation = trpc.specificBequest.create.useMutation({
    onSuccess: () => utils.specificBequest.list.invalidate(),
})
const updateBequestMutation = trpc.specificBequest.update.useMutation({
    onSuccess: () => utils.specificBequest.list.invalidate(),
})
const deleteBequestMutation = trpc.specificBequest.delete.useMutation({
    onSuccess: () => utils.specificBequest.list.invalidate(),
})
```

### Current Duplicated Pattern (login pages)
```typescript
// Nearly identical in login/page.tsx and portal/login/page.tsx
// Only differences: title, icon, redirectPath, callbackURL
// ~175 lines each, ~350 total duplicated
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HOC patterns | Custom hooks | 2019 (React 16.8) | Hooks are standard |
| Render props | Custom hooks | 2019 | Simpler API surface |
| useCallback everywhere | Selective memoization | 2023 | Only when needed |
| Manual invalidation | TanStack Query patterns | 2022+ | Centralized cache control |

**New tools/patterns to consider:**
- **React 19 `use`:** Could simplify async state, but hooks still standard for sync state
- **TanStack Query v5:** Already in use, invalidation patterns unchanged

**Deprecated/outdated:**
- **Class components:** Hooks are the standard
- **Redux for local state:** useState/useReducer sufficient for component state
</sota_updates>

<open_questions>
## Open Questions

1. **useCrudMutations type inference**
   - What we know: Generic router types work with tRPC
   - What's unclear: Best way to infer list invalidation signature from router
   - Recommendation: Start with explicit routerKey, refine types during implementation

2. **EditableSelectCell complexity**
   - What we know: Select has different state pattern (no editValue string)
   - What's unclear: Whether to include in useEditableCell or keep separate
   - Recommendation: Create core hook for text-based cells, extend or create variant for select
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [React Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) - Official React docs on extraction patterns
- [tRPC useMutation](https://trpc.io/docs/client/react/useMutation) - Official tRPC mutation docs
- [TanStack Query Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) - Official invalidation patterns

### Secondary (MEDIUM confidence)
- [tRPC Reusable Mutations Discussion](https://github.com/trpc/trpc/discussions/3220) - Community pattern for mutation wrappers
- [TkDodo Automatic Invalidation](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations) - Global invalidation patterns
- [React Design Patterns 2025](https://www.telerik.com/blogs/react-design-patterns-best-practices) - Modern hook patterns

### Tertiary (Codebase analysis)
- `src/components/editable-cells.tsx` - 480 lines, 6 components, duplicated state logic
- `src/app/(admin)/*/page.tsx` - 15+ pages with repeated mutation setup
- `src/app/login/page.tsx` + `src/app/portal/login/page.tsx` - 350 lines nearly identical
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: React 19 hooks, tRPC v11, TanStack Query v5
- Ecosystem: No new libraries needed
- Patterns: Custom hook extraction, component composition
- Pitfalls: Type safety, stale closures, over-extraction

**Confidence breakdown:**
- Standard stack: HIGH - already in project, patterns documented
- Architecture: HIGH - straightforward React patterns
- Pitfalls: HIGH - common issues, well-documented
- Code examples: HIGH - from actual codebase

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - patterns are stable)
</metadata>

---

*Phase: 41-hook-extraction*
*Research completed: 2026-01-18*
*Ready for planning: yes*
