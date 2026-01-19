# Phase 27: Bulk Entry Mode - Research

**Researched:** 2026-01-17
**Domain:** React spreadsheet-like editable table for bulk data entry
**Confidence:** HIGH

<research_summary>
## Summary

Researched approaches for building a spreadsheet-like bulk entry interface in React. The project already uses TanStack Table v8.21.3 and react-hook-form v7.71.1, which are the right tools for this task.

The standard approach is to extend TanStack Table's `defaultColumn` pattern with custom editable cells, add react-hook-form's `useFieldArray` for multi-row state management with per-row validation, and implement clipboard paste handling via native browser APIs.

Key finding: Don't add a new library (AG Grid, Handsontable, ReactGrid). TanStack Table with custom keyboard navigation achieves the same result at ~15KB vs 298KB+ for full-featured grid libraries, and leverages existing project patterns.

**Primary recommendation:** Extend existing TanStack Table + react-hook-form stack. Add custom keyboard navigation hook, clipboard paste handler, and dynamic column visibility based on liability type.
</research_summary>

<standard_stack>
## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | Table structure, row/column state | Headless, flexible, already in project |
| react-hook-form | 7.71.1 | Form state, validation | useFieldArray handles dynamic rows |
| zod | 4.3.5 | Schema validation | Already integrated with form schemas |

### Supporting (No New Installs Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hookform/resolvers | 5.2.2 | Zod integration | Schema-based validation |
| sonner | 2.0.7 | Toast notifications | Error/success feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom keyboard nav | ReactGrid (77KB) | ReactGrid has built-in shortcuts, but adds 77KB for feature we can implement in ~100 lines |
| Custom paste handler | Handsontable (200KB+) | Handsontable is full spreadsheet, massive overkill for bulk entry |
| TanStack Table | AG Grid (298KB) | AG Grid is enterprise-grade but overkill; needs license for advanced features |

**Installation:**
```bash
# No new dependencies needed - stack is already installed
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── bulk-entry-table.tsx     # Main editable table component
│   └── bulk-entry-row.tsx       # Individual row with cells
├── hooks/
│   ├── use-keyboard-navigation.ts  # Tab, Enter, Arrow key handling
│   └── use-clipboard-paste.ts      # Parse Excel/Sheets data
└── lib/
    └── liability-columns.ts      # Dynamic column config by type
```

### Pattern 1: TanStack Table with useFieldArray Integration
**What:** Combine TanStack Table for rendering with react-hook-form useFieldArray for form state
**When to use:** Any multi-row editable table
**Example:**
```typescript
// Source: TanStack Table docs + react-hook-form docs
import { useFieldArray, useForm } from 'react-hook-form'
import { useReactTable, getCoreRowModel } from '@tanstack/react-table'

function BulkEntryTable() {
  const form = useForm<{ liabilities: LiabilityRow[] }>({
    defaultValues: { liabilities: [createEmptyRow()] }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'liabilities'
  })

  // TanStack Table uses field array as data source
  const table = useReactTable({
    data: fields,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      // Expose form methods to cell renderers
      register: form.register,
      errors: form.formState.errors,
      addRow: () => append(createEmptyRow()),
    }
  })
}
```

### Pattern 2: Editable Cell with Form Registration
**What:** Cell renderer that registers input with react-hook-form
**When to use:** Each editable cell in the table
**Example:**
```typescript
// Source: TanStack Table editable-data example + react-hook-form
const columns = [
  {
    accessorKey: 'creditor',
    header: 'Creditor',
    cell: ({ row, table }) => {
      const index = row.index
      const { register, errors } = table.options.meta!

      return (
        <div>
          <Input
            {...register(`liabilities.${index}.creditor`, { required: 'Required' })}
            className={errors.liabilities?.[index]?.creditor ? 'border-red-500' : ''}
          />
          {errors.liabilities?.[index]?.creditor && (
            <span className="text-xs text-red-500">
              {errors.liabilities[index].creditor.message}
            </span>
          )}
        </div>
      )
    }
  }
]
```

### Pattern 3: Dynamic Column Visibility by Type
**What:** Show/hide columns based on liability type selection
**When to use:** Type-aware fields like loan terms (mortgages) vs APR (credit cards)
**Example:**
```typescript
// Source: Project Phase 26 patterns
import { hasLoanTermFields, isRevolvingType } from '@/lib/liability-helpers'

const columns = useMemo(() => {
  const baseColumns = [typeColumn, creditorColumn, currentBalanceColumn]

  // Watch first row's type to determine column visibility
  const firstRowType = watch('liabilities.0.liabilityType')

  if (hasLoanTermFields(firstRowType)) {
    return [...baseColumns, loanTermColumn, interestRateColumn, escrowColumn]
  }
  if (isRevolvingType(firstRowType)) {
    return [...baseColumns, aprColumn, creditLimitColumn]
  }
  return baseColumns
}, [watch('liabilities.0.liabilityType')])
```

### Anti-Patterns to Avoid
- **Mixing controlled/uncontrolled inputs:** Use react-hook-form's `register` everywhere, not mix of state and register
- **Re-rendering entire table on each keystroke:** Use `watch` sparingly, prefer `useWatch` for specific fields
- **Not using `field.id` as key:** useFieldArray generates unique IDs, use them to prevent re-render issues
- **Blocking paste with preventDefault:** Let paste event propagate, handle data in `onPaste`
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-row form state | Custom useState arrays | react-hook-form useFieldArray | Handles append/remove/swap, integrates with validation |
| Table rendering | Custom div grid | TanStack Table | Handles column ordering, sorting, proper accessibility |
| Keyboard navigation | Raw keydown handlers | Custom hook with ref management | Encapsulate focus logic, reuse across tables |
| Clipboard parsing | Complex regex | Split by \n and \t | Excel/Sheets use tab-separated values, simple split works |
| Per-row validation | Custom error tracking | useFieldArray + Zod | errors.liabilities[index] gives row-level errors |

**Key insight:** The spreadsheet UX (Tab navigation, Enter for new row, paste from Excel) can be achieved with ~150 lines of custom code on top of existing TanStack Table + react-hook-form. Adding a 200KB+ spreadsheet library would provide marginal benefit for significantly increased bundle size.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Keyboard Event Propagation Issues
**What goes wrong:** Tab/Enter events get swallowed or double-fire
**Why it happens:** Multiple event listeners, stopPropagation conflicts
**How to avoid:** Use single keyboard handler at table level, not per-cell
**Warning signs:** Focus jumps unexpectedly, Enter adds two rows

### Pitfall 2: useFieldArray Re-render Cascade
**What goes wrong:** Table re-renders on every keystroke, feels sluggish
**Why it happens:** `watch()` at top level triggers full re-render
**How to avoid:** Use `useWatch({ name: 'liabilities.0.type' })` for specific fields
**Warning signs:** Typing lag, React DevTools shows many re-renders

### Pitfall 3: Lost Focus on Append
**What goes wrong:** After pressing Enter to add row, focus goes to first cell not new row
**Why it happens:** New row renders, but focus isn't programmatically set
**How to avoid:** Track "pendingFocus" row index, use useEffect to focus after render
**Warning signs:** User has to click or tab to get to new row

### Pitfall 4: Clipboard Paste Column Mismatch
**What goes wrong:** Pasted data ends up in wrong columns
**Why it happens:** Excel column order doesn't match table column order
**How to avoid:** Paste to visible columns in order, OR show paste preview dialog
**Warning signs:** Creditor name appears in amount field

### Pitfall 5: Validation Flickers on Type Change
**What goes wrong:** Changing liability type shows/hides fields, validation errors flash
**Why it happens:** Fields get unregistered/re-registered on column visibility change
**How to avoid:** Keep all fields registered, just hide UI; OR use `shouldUnregister: false`
**Warning signs:** Red borders flash, validation state resets
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official sources:

### Keyboard Navigation Hook
```typescript
// Source: Pattern from GitHub TanStack/table discussions/2752
import { useCallback, useRef } from 'react'

export function useKeyboardNavigation(rowCount: number, colCount: number) {
  const tableRef = useRef<HTMLTableElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    const target = e.target as HTMLInputElement

    if (e.key === 'Tab' && !e.shiftKey && colIdx === colCount - 1) {
      // Tab on last column - move to first column of next row
      e.preventDefault()
      focusCell(rowIdx + 1, 0)
    }

    if (e.key === 'Enter' && rowIdx === rowCount - 1) {
      // Enter on last row - add new row (handled by parent)
      e.preventDefault()
      // Parent component handles append via meta.addRow()
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusCell(rowIdx + 1, colIdx)
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusCell(rowIdx - 1, colIdx)
    }
  }, [rowCount, colCount])

  const focusCell = (row: number, col: number) => {
    if (row < 0 || row >= rowCount) return
    const input = tableRef.current?.querySelector(
      `[data-row="${row}"][data-col="${col}"] input`
    ) as HTMLInputElement | null
    input?.focus()
    input?.select()
  }

  return { tableRef, handleKeyDown, focusCell }
}
```

### Clipboard Paste Handler
```typescript
// Source: Pattern from SheetClip library, simplified
export function useClipboardPaste(
  onPaste: (rows: string[][]) => void
) {
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text) return

    // Excel/Sheets use tab for columns, newline for rows
    const rows = text
      .split('\n')
      .filter(row => row.trim()) // Remove empty rows
      .map(row => row.split('\t'))

    if (rows.length > 0) {
      e.preventDefault()
      onPaste(rows)
    }
  }, [onPaste])

  return { handlePaste }
}

// Usage in component
const { handlePaste } = useClipboardPaste((rows) => {
  rows.forEach(([creditor, amount, type]) => {
    append({
      creditor: creditor || '',
      currentBalance: amount || '',
      liabilityType: type || 'OTHER',
    })
  })
})

// Attach to table container
<div onPaste={handlePaste}>
  <Table>...</Table>
</div>
```

### Row-Level Validation with Zod
```typescript
// Source: react-hook-form docs + zod patterns
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const liabilityRowSchema = z.object({
  creditor: z.string().min(1, 'Creditor is required'),
  currentBalance: z.string().regex(/^\d+\.?\d*$/, 'Must be a valid amount'),
  liabilityType: z.enum(['MORTGAGE', 'LOAN', 'CREDIT_CARD', 'TAX_OWED', 'OTHER']),
  // Optional fields based on type
  interestRate: z.string().optional(),
  loanTermMonths: z.number().optional(),
})

const bulkEntrySchema = z.object({
  liabilities: z.array(liabilityRowSchema).min(1, 'Add at least one liability'),
})

const form = useForm<z.infer<typeof bulkEntrySchema>>({
  resolver: zodResolver(bulkEntrySchema),
  mode: 'onBlur', // Validate on blur for per-cell feedback
  defaultValues: { liabilities: [createEmptyRow()] },
})

// Access row-level errors
const rowErrors = form.formState.errors.liabilities?.[rowIndex]
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Heavyweight grid libs for simple tables | TanStack Table + custom | 2023+ | 10x smaller bundle, same UX |
| Custom form state for arrays | react-hook-form useFieldArray | 2021+ | Built-in validation, better DX |
| Manual focus management | data-attributes + querySelector | Standard | Simpler than complex ref arrays |

**New tools/patterns to consider:**
- **React 19.2 useOptimistic:** Could enable instant visual feedback on row save before mutation completes
- **useFormStatus:** For submit button states in Server Actions (if moving to that pattern)

**Deprecated/outdated:**
- **react-datasheet:** Last updated 2021, not maintained for React 18+
- **Manual onChange + state arrays:** useFieldArray handles this better with less code
</sota_updates>

<open_questions>
## Open Questions

Things that couldn't be fully resolved:

1. **Column visibility sync across rows**
   - What we know: Phase 26 uses type-aware conditional fields in single-row forms
   - What's unclear: Should ALL rows adapt to first row's type, or each row independently?
   - Recommendation: Start with first-row-controls-all for simplicity, can add per-row toggle later

2. **Paste column mapping**
   - What we know: Excel uses tab-separated values in clipboard
   - What's unclear: Should paste assume specific column order, or show a mapping dialog?
   - Recommendation: Assume order matches visible columns; future enhancement could add mapping
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- /websites/tanstack_table - Editable data example, defaultColumn pattern
- /websites/reactgrid_4_0 - Keyboard shortcuts reference (for patterns)
- react-hook-form.com/docs/usefieldarray - Official useFieldArray docs
- https://tanstack.com/table/latest/docs/framework/react/examples/editable-data

### Secondary (MEDIUM confidence)
- [TanStack Table vs AG Grid Comparison](https://www.simple-table.com/blog/tanstack-table-vs-ag-grid-comparison) - Bundle size analysis
- [React Data Grid Bundle Size Comparison 2025](https://www.simple-table.com/blog/react-data-grid-bundle-size-comparison) - Performance impact
- [GitHub TanStack/table keyboard navigation discussion](https://github.com/TanStack/table/discussions/2752) - Community patterns
- [GitHub TanStack/table row-level submission discussion](https://github.com/TanStack/table/discussions/5426) - RHF integration

### Tertiary (LOW confidence - needs validation)
- SheetClip pattern (conceptual, library is minimal)
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: TanStack Table v8 + react-hook-form v7
- Ecosystem: Clipboard APIs, keyboard navigation patterns
- Patterns: useFieldArray, editable cells, dynamic columns
- Pitfalls: Re-renders, focus management, validation timing

**Confidence breakdown:**
- Standard stack: HIGH - Already installed, documented patterns
- Architecture: HIGH - Combines official TanStack + RHF patterns
- Pitfalls: HIGH - Common issues documented in GitHub discussions
- Code examples: HIGH - From official docs with minor adaptation

**Research date:** 2026-01-17
**Valid until:** 2026-02-17 (30 days - TanStack/RHF ecosystem stable)
</metadata>

---

*Phase: 27-bulk-entry-mode*
*Research completed: 2026-01-17*
*Ready for planning: yes*
