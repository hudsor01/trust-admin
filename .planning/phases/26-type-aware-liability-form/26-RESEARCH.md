# Phase 26: Type-Aware Liability Form - Research

**Researched:** 2026-01-17
**Domain:** React conditional forms with animations and real-time calculations
**Confidence:** HIGH

<research_summary>
## Summary

Researched three areas for the type-aware liability form: field transition animations, real-time calculation feedback, and validation UX patterns.

Key finding: **React 19.2 (via Next.js 16) provides native solutions** that eliminate third-party dependencies:
1. **`<ViewTransition>`** - Native enter/exit animations for conditional fields
2. **`useDeferredValue`** - Built-in debouncing for real-time calculations
3. **TanStack Form validators** - Inline validation as user types

**Primary recommendation:** Use React 19.2's `<ViewTransition>` for field animations (zero dependencies, native browser performance), `useDeferredValue` + `useMemo` for calculations, and TanStack Form's `validators.onChange` for validation UX.

**Note:** The `<Activity>` component is NOT for this use case—it's for background tabs/routes that preserve state, not for animating form fields.
</research_summary>

<standard_stack>
## Standard Stack

### Already Available (No Installation Needed)
| Feature | Source | Purpose | Status |
|---------|--------|---------|--------|
| `<ViewTransition>` | React 19.2 (Next.js 16) | Enter/exit animations | ✅ Built-in |
| `useDeferredValue` | React 19.2 | Debounce calculations | ✅ Built-in |
| `startTransition` | React 19.2 | Trigger ViewTransitions | ✅ Built-in |
| @tanstack/react-form | (transitive) | Form state management | ✅ In use |
| Tailwind CSS | 4.x | Styling | ✅ In use |

### No New Dependencies Required
React 19.2's `<ViewTransition>` eliminates the need for:
- @headlessui/react (Transition component)
- framer-motion (AnimatePresence)
- react-transition-group

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ViewTransition | @headlessui/react | Extra dependency, but works with sync state changes |
| ViewTransition | framer-motion | More powerful but ~30KB, overkill for form fields |
| useDeferredValue | use-debounce | Extra dependency, useDeferredValue is smarter |

**Critical Constraint:** ViewTransition only triggers for **async updates** (startTransition, useDeferredValue, Suspense). Must wrap type change in `startTransition()`.
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Field Transition with React 19.2 ViewTransition

**What:** Animate form fields in/out when liability type changes
**When to use:** Any conditional field rendering that should feel smooth

```tsx
import { ViewTransition, startTransition } from 'react'

// Step 1: Wrap type change in startTransition (REQUIRED for ViewTransition to trigger)
const handleTypeChange = (newType: string) => {
  startTransition(() => {
    field.handleChange(newType)
  })
}

// Step 2: Wrap conditional fields in ViewTransition
{hasLoanTermFields(liabilityType) && (
  <ViewTransition enter="slide-fade-in" exit="slide-fade-out">
    <div className="grid grid-cols-3 gap-4 mt-4">
      {/* Loan term fields */}
    </div>
  </ViewTransition>
)}
```

```css
/* globals.css - View Transition animations */
::view-transition-new(.slide-fade-in) {
  animation: slide-fade-in 200ms ease-out;
}
::view-transition-old(.slide-fade-out) {
  animation: slide-fade-out 150ms ease-in;
}
@keyframes slide-fade-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slide-fade-out {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
}
```

**Why this pattern:**
- Zero dependencies - built into React 19.2 (Next.js 16)
- Native browser performance (CSS animations, not JS)
- Uses browser's View Transitions API under the hood

**Critical:** The `startTransition` wrapper is REQUIRED. Without it, state changes are synchronous and ViewTransition won't trigger.

### Pattern 1b: Fallback with Headless UI (if ViewTransition issues arise)

If ViewTransition proves problematic, fallback to @headlessui/react:

```bash
bun add @headlessui/react
```

```tsx
import { Transition } from "@headlessui/react"

<Transition
  show={hasLoanTermFields(liabilityType)}
  enter="transition-all duration-200 ease-out"
  enterFrom="opacity-0 max-h-0 overflow-hidden"
  enterTo="opacity-100 max-h-96"
  leave="transition-all duration-150 ease-in"
  leaveFrom="opacity-100 max-h-96"
  leaveTo="opacity-0 max-h-0 overflow-hidden"
>
  <div className="grid grid-cols-3 gap-4 mt-4">
    {/* Loan term fields */}
  </div>
</Transition>
```

**When to use fallback:** If startTransition interferes with form state updates or causes unexpected behavior.

### Pattern 2: Real-Time Calculation with useDeferredValue

**What:** Show "Your monthly payment would be $X" as user types, without blocking input
**When to use:** Expensive calculations that shouldn't lag the UI

```tsx
import { useDeferredValue, useMemo } from 'react'
import { calculateMonthlyPayment } from '@/lib/amortization'

function LiabilityForm() {
  // Get current form values
  const principal = formInstance.useStore(s => s.values.originalAmount)
  const rate = formInstance.useStore(s => s.values.interestRate)
  const term = formInstance.useStore(s => s.values.loanTermMonths)

  // Defer the calculation inputs (React handles "debouncing" intelligently)
  const deferredPrincipal = useDeferredValue(principal)
  const deferredRate = useDeferredValue(rate)
  const deferredTerm = useDeferredValue(term)

  // Calculate only when deferred values settle
  const calculatedPayment = useMemo(() => {
    if (!deferredPrincipal || !deferredRate || !deferredTerm) return null
    const rateDecimal = (parseFloat(deferredRate) / 100).toString()
    return calculateMonthlyPayment(deferredPrincipal, rateDecimal, parseInt(deferredTerm))
  }, [deferredPrincipal, deferredRate, deferredTerm])

  return (
    <>
      {/* Form fields... */}
      {calculatedPayment && (
        <div className="text-sm text-muted-foreground mt-2">
          Estimated monthly payment: <strong>{formatCurrency(calculatedPayment)}</strong>
        </div>
      )}
    </>
  )
}
```

**Why useDeferredValue for this use case:**
- Built into React 18+ (no extra dependency)
- React intelligently schedules updates (not arbitrary delay)
- Interruptible - if user keeps typing, calculation restarts
- Works with Concurrent Features
- **Ideal for UI calculations** - React defers rendering, not the value itself

**When to use `use-debounce` instead:**
- URL parameter updates (Next.js App Router search params)
- API calls (reduce server requests)
- Any case where you need a **specific delay time**

For Phase 26 (payment calculation display), useDeferredValue is correct because we're deferring expensive **rendering**, not making API calls.

### Pattern 3: TanStack Form Validation Display

**What:** Show validation errors inline as user types
**When to use:** Better UX than only showing errors on submit

TanStack Form already supports this via the `onChangeValidate` option:

```tsx
const formInstance = useForm({
  defaultValues: initialData,
  onSubmit: async ({ value }) => { /* ... */ },
})

// In field definition, add validators:
<formInstance.Field
  name="originalAmount"
  validators={{
    onChange: ({ value }) => {
      if (!value || parseFloat(value) <= 0) {
        return 'Amount must be greater than 0'
      }
      return undefined
    }
  }}
>
  {(field) => (
    <div className="space-y-2">
      <Label>Original Amount *</Label>
      <Input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        className={field.state.meta.errors?.length ? 'border-destructive' : ''}
      />
      {field.state.meta.errors?.[0] && (
        <p className="text-sm text-destructive">
          {field.state.meta.errors[0]}
        </p>
      )}
    </div>
  )}
</formInstance.Field>
```

**Note:** The current useResourceForm hook doesn't pass validators. May need to extend it or use formInstance directly with validators.

### Anti-Patterns to Avoid

- **setTimeout for debouncing:** Use useDeferredValue instead - it's smarter about scheduling
- **CSS-only animations for conditional fields:** Can't animate unmount, fields just pop out
- **Recalculating on every keystroke without memoization:** Will cause lag on complex calculations
- **Validation only on submit:** Poor UX, user doesn't know about errors until they try to save
- **ViewTransition without startTransition:** Animations won't trigger for synchronous state changes
- **Using `<Activity>` for animated fields:** Activity is for background content preservation, not animations
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mount/unmount animations | CSS transitions alone | React 19.2 ViewTransition | CSS can't animate elements leaving the DOM |
| Input debouncing | Custom setTimeout logic | useDeferredValue | React's built-in solution is smarter about scheduling |
| Form state | Custom useState per field | TanStack Form (already using) | Handles validation, dirty tracking, etc. |
| Background UI preservation | display:none hacks | `<Activity>` (different use case) | Activity preserves state + cleans Effects |

**Key insight:** React 19.2 eliminates animation library dependencies. ViewTransition uses the native browser View Transitions API for smooth, performant animations without JavaScript animation loops.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Animation Height with "auto"
**What goes wrong:** CSS can't animate to `height: auto`
**Why it happens:** Browser doesn't know final height before render
**How to avoid:** Use `max-height` with a value larger than content will ever be (e.g., `max-h-96`)
**Warning signs:** Fields appear instantly instead of expanding

### Pitfall 2: useDeferredValue Without memo
**What goes wrong:** Component re-renders anyway, defeating the purpose
**Why it happens:** useDeferredValue defers the VALUE, but if the component re-renders, calculation runs
**How to avoid:** Wrap expensive calculations in `useMemo` keyed to deferred values
**Warning signs:** Calculation still runs on every keystroke

### Pitfall 3: ViewTransition Without startTransition
**What goes wrong:** Animation doesn't trigger, fields just appear/disappear instantly
**Why it happens:** ViewTransition only activates for async updates (startTransition, useDeferredValue, Suspense)
**How to avoid:** Wrap the state change in `startTransition(() => { field.handleChange(newValue) })`
**Warning signs:** Form works but no animations, no console errors

### Pitfall 4: ViewTransition CSS Classes Not Applied
**What goes wrong:** ViewTransition triggers but animation doesn't look right
**Why it happens:** CSS must use `::view-transition-old()` and `::view-transition-new()` pseudo-selectors
**How to avoid:** Define animations in globals.css with proper view-transition pseudo-selectors
**Warning signs:** Elements flash or cross-fade but don't slide/transform as expected

### Pitfall 5: Validation Flicker on First Render
**What goes wrong:** Error messages flash on mount before user types anything
**Why it happens:** onChange validation runs immediately with empty/default values
**How to avoid:** Check `field.state.meta.isTouched` before showing errors, or use `onBlur` validation
**Warning signs:** Red error borders on page load
</common_pitfalls>

<code_examples>
## Code Examples

### Complete Field Group with React 19.2 ViewTransition
```tsx
// Source: React 19.2 ViewTransition docs
import { ViewTransition, startTransition } from 'react'

// Step 1: Type selector with startTransition wrapper
<formInstance.Field name="liabilityType">
  {(field) => (
    <Select
      value={field.state.value}
      onValueChange={(v) => {
        // CRITICAL: Wrap in startTransition for ViewTransition to work
        startTransition(() => {
          field.handleChange(v)
        })
      }}
    >
      {/* SelectTrigger, SelectContent, SelectItems */}
    </Select>
  )}
</formInstance.Field>

// Step 2: Wrap conditional fields in ViewTransition
<formInstance.Subscribe<string>
  selector={(state) => state.values.liabilityType}
>
  {(liabilityType) => (
    <>
      {hasLoanTermFields(liabilityType) && (
        <ViewTransition enter="field-enter" exit="field-exit">
          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* loanTermMonths, loanStartDate, escrowMonthly fields */}
          </div>
        </ViewTransition>
      )}
    </>
  )}
</formInstance.Subscribe>
```

```css
/* globals.css - Add these view transition animations */
::view-transition-new(.field-enter) {
  animation: field-enter 200ms ease-out;
}
::view-transition-old(.field-exit) {
  animation: field-exit 150ms ease-in;
}
@keyframes field-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 200px;
  }
}
@keyframes field-exit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}
```

### Payment Preview Component
```tsx
// Real-time calculation display
function PaymentPreview({ formInstance }: { formInstance: FormApi }) {
  const principal = formInstance.useStore(s => s.values.originalAmount)
  const rate = formInstance.useStore(s => s.values.interestRate)
  const term = formInstance.useStore(s => s.values.loanTermMonths)
  const liabilityType = formInstance.useStore(s => s.values.liabilityType)

  // Don't show for credit cards
  if (isRevolvingType(liabilityType)) return null

  // Defer inputs for smooth typing
  const deferredPrincipal = useDeferredValue(principal)
  const deferredRate = useDeferredValue(rate)
  const deferredTerm = useDeferredValue(term)

  const payment = useMemo(() => {
    if (!deferredPrincipal || !deferredRate || !deferredTerm) return null
    const p = parseFloat(deferredPrincipal)
    const r = parseFloat(deferredRate) / 100
    const t = parseInt(deferredTerm)
    if (isNaN(p) || isNaN(r) || isNaN(t) || p <= 0 || t <= 0) return null
    return calculateMonthlyPayment(deferredPrincipal, r.toString(), t)
  }, [deferredPrincipal, deferredRate, deferredTerm])

  if (!payment) return null

  return (
    <div className="rounded-lg bg-muted/50 p-3 mt-4">
      <div className="text-sm text-muted-foreground">
        Estimated Monthly Payment (P&I)
      </div>
      <div className="text-lg font-semibold">
        {formatCurrency(payment)}
      </div>
    </div>
  )
}
```

### Inline Validation Example
```tsx
// Field with onChange validation, showing errors only after touched
<formInstance.Field
  name="interestRate"
  validators={{
    onChange: ({ value }) => {
      const num = parseFloat(value)
      if (isNaN(num)) return 'Must be a number'
      if (num < 0 || num > 100) return 'Rate must be between 0 and 100'
      return undefined
    }
  }}
>
  {(field) => (
    <div className="space-y-2">
      <Label htmlFor="interest-rate">Interest Rate (%)</Label>
      <Input
        id="interest-rate"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        className={field.state.meta.isTouched && field.state.meta.errors?.length
          ? 'border-destructive focus-visible:ring-destructive'
          : ''}
      />
      {field.state.meta.isTouched && field.state.meta.errors?.[0] && (
        <p className="text-sm text-destructive">
          {field.state.meta.errors[0]}
        </p>
      )}
    </div>
  )}
</formInstance.Field>
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion / @headlessui/react | React 19.2 `<ViewTransition>` | React 19.2 (Oct 2025) | Zero dependencies, native browser API |
| useDebounce custom hook | useDeferredValue | React 18 (2022) | Built-in, smarter scheduling |
| display:none with state hacks | React 19.2 `<Activity>` | React 19.2 (Oct 2025) | Preserves state, cleans Effects |
| Validation on submit only | Real-time with onChange | TanStack Form v1 | Better UX standard |

**React 19.2 Features (via Next.js 16):**
- **`<ViewTransition>`:** Native enter/exit/update/share animations using browser View Transitions API
- **`<Activity>`:** Hide UI with `display:none` while preserving state and properly cleaning up Effects (NOT for animation)
- **`useEffectEvent()`:** Extract non-reactive logic from Effects cleanly

**Key constraint:** ViewTransition only triggers for async updates. Wrap state changes in `startTransition()`.

**Deprecated/outdated:**
- **@headlessui/react Transition:** Now unnecessary for Next.js 16 projects
- **framer-motion for basic transitions:** ViewTransition handles simple enter/exit
- **react-transition-group:** Legacy, replaced by ViewTransition
- **Manual setTimeout debouncing:** useDeferredValue handles this better
</sota_updates>

<open_questions>
## Open Questions

1. **ViewTransition vs Headless UI Transition?**
   - What we know: ViewTransition is built-in, requires startTransition wrapper
   - What's unclear: Will wrapping form state changes in startTransition cause any issues?
   - Recommendation: **Try ViewTransition first** (zero dependencies). Fall back to @headlessui/react if startTransition causes form state issues.
   - Risk mitigation: Test thoroughly with rapid type switching

2. **Extend useResourceForm or use formInstance directly?**
   - What we know: Current hook doesn't support field-level validators
   - What's unclear: Whether to modify the hook or just pass validators at the Field level
   - Recommendation: Pass validators at Field level for now (simpler, no hook changes)

3. **useDeferredValue vs use-debounce for calculations?**
   - What we know: useDeferredValue defers rendering, use-debounce delays the value
   - Decision: **useDeferredValue** - we're deferring UI calculations, not API calls
   - Note: If we later add server-side validation, use-debounce would be better for that
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [React ViewTransition docs](https://react.dev/reference/react/ViewTransition) - Official React 19.2 documentation
- [React Activity docs](https://react.dev/reference/react/Activity) - Official React 19.2 documentation
- [React Labs: View Transitions, Activity, and more](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more) - Feature announcement
- [React useDeferredValue docs](https://react.dev/reference/react/useDeferredValue) - Official React documentation

### Secondary (MEDIUM confidence)
- [Chrome View Transitions 2025 update](https://developer.chrome.com/blog/view-transitions-in-2025) - Browser support details
- Context7 /tailwindlabs/tailwindcss.com - Transition component patterns (fallback reference)
- [use-debounce npm](https://www.npmjs.com/package/use-debounce) - Alternative for URL params/API calls

### Tertiary (Verified with codebase)
- Existing liabilities page (`src/app/(admin)/liabilities/page.tsx`) - Current conditional field patterns
- useResourceForm hook (`src/hooks/use-resource-form.ts`) - TanStack Form integration
- Next.js 16 in package.json - Confirms React 19.2 availability
</sources>

<project_wide_features>
## Project-Wide React 19.2 / Next.js 16 Features

Beyond Phase 26, here are features from the comprehensive documentation review that could benefit trust-admin:

### React 19.2 Features

#### 1. `useOptimistic` - Optimistic UI Updates
**What:** Show immediate UI feedback while async operations complete in background
**Use cases in trust-admin:**
- Payment recording (show balance decrease immediately)
- HEMS request approval (show status change immediately)
- Task completion (check mark appears instantly)

```tsx
import { useOptimistic } from 'react'

function PaymentButton({ liability, onPayment }) {
  const [optimisticBalance, setOptimisticBalance] = useOptimistic(
    liability.currentBalance,
    (current, payment) => (parseFloat(current) - parseFloat(payment)).toFixed(2)
  )

  async function handlePayment(amount: string) {
    setOptimisticBalance(amount) // Instant UI update
    await onPayment(amount)       // Actual mutation
    // On error, optimistic state automatically reverts
  }

  return <span>{formatCurrency(optimisticBalance)}</span>
}
```

#### 2. `useActionState` - Form Action State Management
**What:** Handle Server Action results with built-in pending state
**Use cases:** HEMS request submission, distribution creation

```tsx
import { useActionState } from 'react'

async function submitHemsRequest(prevState, formData) {
  'use server'
  const result = await createHemsRequest(formData)
  return result.success ? { success: true } : { error: result.message }
}

function HemsRequestForm() {
  const [state, formAction, isPending] = useActionState(submitHemsRequest, null)

  return (
    <form action={formAction}>
      {/* fields */}
      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit Request'}
      </button>
      {state?.error && <p className="text-destructive">{state.error}</p>}
    </form>
  )
}
```

#### 3. `ref` as Prop (No More forwardRef)
**What:** Function components can receive `ref` as a regular prop
**Impact:** Simplifies component authoring, especially for UI primitives

```tsx
// Before (React 18)
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />
})

// After (React 19.2)
function Input({ ref, ...props }: Props & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}
```

#### 4. `use` Hook - Read Promises and Context
**What:** Read values from Promises or Context inside components
**Use cases:** Simpler data loading patterns, context consumption

```tsx
import { use, Suspense } from 'react'

function BeneficiaryCard({ beneficiaryPromise }) {
  const beneficiary = use(beneficiaryPromise) // Suspends until resolved
  return <div>{beneficiary.name}</div>
}

// Usage
<Suspense fallback={<Skeleton />}>
  <BeneficiaryCard beneficiaryPromise={fetchBeneficiary(id)} />
</Suspense>
```

### Next.js 16 Features

#### 1. `after()` - Post-Response Tasks
**What:** Schedule tasks to run after response is sent to client
**Use cases in trust-admin:**
- Audit logging (activityLog entries)
- Analytics tracking
- Cache warming
- Email notifications

```tsx
import { after } from 'next/server'

export async function POST(request: Request) {
  const payment = await recordPayment(data)

  after(async () => {
    // Runs after response sent - doesn't slow down user
    await createActivityLog({
      action: 'PAYMENT_RECORDED',
      entityId: payment.entityId,
      details: { amount: payment.amount }
    })
  })

  return Response.json(payment)
}
```

#### 2. `cacheLife()` - Cache Profiles
**What:** Predefined cache duration profiles for data fetching
**Profiles:** `seconds`, `minutes`, `hours`, `days`, `weeks`, `max`

```tsx
import { cacheLife } from 'next/cache'

async function getBeneficiaryList() {
  'use cache'
  cacheLife('minutes') // Revalidate every few minutes
  return db.query.beneficiary.findMany()
}

async function getEntityConfig() {
  'use cache'
  cacheLife('days') // Rarely changes
  return db.query.entity.findFirst()
}
```

Custom profiles in `next.config.ts`:
```tsx
const nextConfig = {
  cacheComponents: true,
  cacheLife: {
    financial: {
      stale: 60,        // 1 minute
      revalidate: 300,  // 5 minutes
      expire: 3600,     // 1 hour
    },
  },
}
```

#### 3. `cacheTag()` + `revalidateTag()` - Tag-Based Invalidation
**What:** Tag cached data and invalidate by tag
**Use cases:** Invalidate all beneficiary data when one changes

```tsx
import { cacheTag, revalidateTag } from 'next/cache'

async function getBeneficiaries(entityId: string) {
  'use cache'
  cacheTag(`beneficiaries-${entityId}`)
  return db.query.beneficiary.findMany({ where: eq(beneficiary.entityId, entityId) })
}

// On mutation
async function updateBeneficiary(id: string, data: UpdateData) {
  const result = await db.update(beneficiary).set(data).where(eq(beneficiary.id, id))
  revalidateTag(`beneficiaries-${result.entityId}`) // Invalidate cache
  return result
}
```

#### 4. `connection()` - Force Dynamic Rendering
**What:** Explicitly opt into dynamic rendering when needed
**Use cases:** Pages that must always show fresh data

```tsx
import { connection } from 'next/server'

export default async function DashboardPage() {
  await connection() // Force dynamic - no caching
  const data = await getDashboardData()
  return <Dashboard data={data} />
}
```

#### 5. Next.js `Form` Component - Progressive Enhancement
**What:** Enhanced form with navigation on submit
**Benefit:** Works even with JavaScript disabled

```tsx
import Form from 'next/form'

// Navigates to /search?q=... on submit
<Form action="/search">
  <input name="q" />
  <button type="submit">Search</button>
</Form>

// Works with Server Actions too
<Form action={serverAction}>
  <input name="title" />
  <button type="submit">Create</button>
</Form>
```

### TanStack Form Patterns

#### Async Validation with Debouncing
```tsx
<form.Field
  name="email"
  validators={{
    onChange: ({ value }) => !value.includes('@') ? 'Invalid email' : undefined,
    onChangeAsyncDebounceMs: 500, // Wait 500ms before async validation
    onChangeAsync: async ({ value }) => {
      const exists = await checkEmailExists(value)
      return exists ? 'Email already in use' : undefined
    },
  }}
>
  {(field) => (
    <>
      <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
      {field.state.meta.isValidating && <span>Checking...</span>}
      {field.state.meta.errors?.[0] && <span className="text-destructive">{field.state.meta.errors[0]}</span>}
    </>
  )}
</form.Field>
```

### Feature Applicability Matrix

| Feature | Phase 26 | Broader Project | Priority |
|---------|----------|-----------------|----------|
| ViewTransition | ✅ Field animations | Route transitions | HIGH |
| useDeferredValue | ✅ Payment calc | Search/filter | HIGH |
| useOptimistic | - | Payment recording, approvals | MEDIUM |
| after() | - | Audit logging | MEDIUM |
| cacheLife/cacheTag | - | Data caching strategy | LOW (future) |
| useActionState | - | Form submissions | MEDIUM |
| Form component | - | Progressive enhancement | LOW |

### Implementation Order Recommendation

**For Phase 26:**
1. ViewTransition + startTransition (field animations)
2. useDeferredValue + useMemo (payment preview)
3. TanStack Form validators (inline validation)

**For v6.0 React 19.2 Platform Optimizations (Phases 36-40):**
- Phase 36: `useOptimistic` - Add to payment recording, HEMS approval, task completion
- Phase 37: `after()` - Move audit logging to post-response
- Phase 38: `cacheLife` - Configure cache profiles for data types
- Phase 39: `cacheTag` - Smart cache invalidation on mutations
- Phase 40: `useActionState` - Progressive enhancement for forms

See ROADMAP.md for full v6.0 milestone details.
</project_wide_features>

<metadata>
## Metadata

**Research scope:**
- Core technology: React 19.2 ViewTransition, TanStack Form
- Ecosystem: useDeferredValue, startTransition, View Transitions API
- Project-wide: useOptimistic, useActionState, after(), cacheLife, cacheTag
- Patterns: Conditional field rendering, real-time calculations, optimistic updates
- Pitfalls: startTransition requirement, view-transition CSS, validation timing

**Confidence breakdown:**
- Animation patterns: HIGH - React 19.2 docs are clear, native browser API
- Calculation debouncing: HIGH - useDeferredValue well-documented, built-in
- Validation UX: HIGH - TanStack Form docs + existing codebase patterns
- Code examples: HIGH - Derived from official React docs + adapted to codebase
- Project-wide features: HIGH - Official docs + Context7 verification

**Research date:** 2026-01-17
**Valid until:** 2026-02-17 (30 days - React 19.2/Next.js 16 APIs stable)
</metadata>

---

*Phase: 26-type-aware-liability-form*
*Research completed: 2026-01-17*
*Ready for planning: yes*
