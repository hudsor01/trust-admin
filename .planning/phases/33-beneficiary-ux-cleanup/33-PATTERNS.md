# Phase 33: beneficiary-ux-cleanup — Pattern Map

**Mapped:** 2026-05-22
**Files analyzed:** 7 (3 delete, 1 router edit, 1 test delete, 1 component edit, 1 utility edit)
**Analogs found:** 5 / 7 (delete targets need no analog; patterns extracted from the files themselves)

---

## File Classification

| File | Action | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx` | DELETE | component | display-only | — | n/a — delete |
| `src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx` | DELETE | component | event-driven (drag) | — | n/a — delete |
| `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx` | DELETE | component | transform | — | n/a — delete |
| `tests/trpc/beneficiary-reorder.test.ts` | DELETE | test | — | — | n/a — delete |
| `src/components/kpi-strip.tsx` | EDIT | utility-component | request-response | `src/components/confirm-dialog.tsx` (cn import) | partial — cn pattern only |
| `src/server/trpc/routers/beneficiary.ts` | EDIT (delete lines 111-156) | router | CRUD | self — reorder block is clearly delimited | exact |
| `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` | EDIT | component (page client) | CRUD + transform | `src/app/(admin)/contacts/_components/ContactsClient.tsx` | role-match |

---

## Pattern Assignments

### DELETE targets (D-01, D-02, D-03, D-05)

No pattern extraction needed. Files are completely removed. Planner tasks: `rm` the three component files and the test file. The executor does not need to read them before deleting — they have already been read and confirmed as dead code above.

Files to delete verbatim:
- `src/app/(admin)/beneficiaries/_components/BeneficiaryAvatarStack.tsx`
- `src/app/(admin)/beneficiaries/_components/BeneficiarySortableList.tsx`
- `src/app/(admin)/beneficiaries/_components/WithdrawalMilestoneGantt.tsx`
- `tests/trpc/beneficiary-reorder.test.ts`

---

### `src/components/kpi-strip.tsx` (D-17 — skeleton + grid fix)

**Edit scope:** lines 19–40 (the entire `KpiStrip` function body up to the loaded-state wrapper).

**Current skeleton block (lines 19–33) — the part being changed:**
```typescript
export function KpiStrip({ data, isLoading = false }: KpiStripProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SummaryCard
                        key={`kpi-skeleton-${i}`}
                        title=""
                        value=""
                        isLoading
                    />
                ))}
            </div>
        )
    }
```

**Current loaded-state wrapper (line 40):**
```typescript
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

**Required after edit (Option A from UI-SPEC):**
```typescript
import { cn } from '@/lib/utils'   // ADD to imports — canonical path

export function KpiStrip({ data, isLoading = false }: KpiStripProps) {
    if (isLoading) {
        return (
            <div
                className={cn(
                    "grid grid-cols-1 md:grid-cols-2 gap-4",
                    data.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
                )}
            >
                {Array.from({ length: data.length }).map((_, i) => (
                    <SummaryCard
                        key={`kpi-skeleton-${i}`}
                        title=""
                        value=""
                        isLoading
                    />
                ))}
            </div>
        )
    }

    // ... (empty-state guard unchanged) ...

    return (
        <div
            className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-4",
                data.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
            )}
        >
```

**cn import pattern** — from `src/components/confirm-dialog.tsx` line 5 (and 5+ other `src/components/` files):
```typescript
import { cn } from '@/lib/utils'
```

**Scope:** `KpiStripItem` type and `KpiStripProps` interface are untouched. No public prop changes. The only callers affected by the grid class change are those passing `data.length === 5`, which is only the Beneficiaries page after D-11 lands.

---

### `src/server/trpc/routers/beneficiary.ts` (D-04 — delete reorder procedure)

**Analog:** the file itself. The block is clearly delimited by a jsdoc sentinel and the trailing `me:` procedure that follows it.

**Block to delete — lines 111–156 (inclusive):**
```typescript
    /**
     * Persist a new display order for beneficiaries. Writes the new
     * `sortIndex` integer column (added by migration 0012) to the position
     * of each id in `orderedIds`.
     * ...
     */
    reorder: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                orderedIds: z.array(z.coerce.number()),
            }),
        )
        .mutation(async ({ input }) => {
            const now = new Date().toISOString()
            return getClient().begin(async (_tx) => {
                const tx = _tx as TxSql
                const updated: unknown[] = []
                for (const [idx, id] of input.orderedIds.entries()) {
                    const [row] = await tx`
                        UPDATE beneficiary
                        SET "sortIndex" = ${idx}, "updatedAt" = ${now}
                        WHERE id = ${id} AND "entityId" = ${input.entityId}
                        RETURNING *
                    `
                    if (row) updated.push(row)
                }
                if (updated.length !== input.orderedIds.length) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message:
                            'One or more beneficiaries not found in this entity',
                    })
                }
                return updated
            })
        }),
```

**Before anchor (line 110):** closing `}),` of the `delete` procedure.
**After anchor (line 158):** `me: beneficiaryProcedure.query(async ({ ctx }) => {`

**Scope fence:** The `getClient` and `TxSql` imports at line 4 may become unused after this deletion — verify after edit. If `getClient` and `TxSql` are imported only for `reorder`, remove them from the import line. If other procedures still use them, leave the import line intact. Check the remainder of the router for `getClient(` or `TxSql` usage before deciding.

---

### `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` (D-06..D-11)

**Analog:** `src/app/(admin)/contacts/_components/ContactsClient.tsx` (same page-client role: tRPC queries → useMemo derivations → KpiStripItem[] array → `<KpiStrip data={kpiData} isLoading={...} />`).

The file has already been read in full (300 lines). All line references below are exact.

#### D-06 — Remove 3 dead imports (lines 15, 18, 21)

Lines to remove:
```typescript
import { BeneficiaryAvatarStack } from './BeneficiaryAvatarStack'  // line 15
import { BeneficiarySortableList } from './BeneficiarySortableList'  // line 18
import { WithdrawalMilestoneGantt } from './WithdrawalMilestoneGantt'  // line 21
```

`UserPlus` at line 3 remains — still used by the Add Beneficiary button.

#### D-07 — Remove entityDetail query (lines 43–46 + jsdoc comment lines 42–43)

Lines to remove:
```typescript
    // Entity dod for WithdrawalMilestoneGantt reference point when a
    // beneficiary has no dob on file.
    const { data: entityDetail } = trpc.entity.byId.useQuery(entityId!, {
        enabled: !!entityId,
    })
```

After removal, `Card`, `CardContent`, `CardHeader`, `CardTitle` imports from `@/components/ui/card` (line 9) may become unused — they are only referenced in the SortableList Card wrapper (lines 235–256, to be removed at D-09). Remove the card import line too if no other JSX in the surviving file uses it.

#### D-08 — Remove avatarItems and milestoneItems useMemo blocks (lines 167–188)

Lines to remove:
```typescript
    const avatarItems = useMemo(
        () =>
            beneficiaries.map((b) => ({
                id: b.id,
                name: `${b.firstName} ${b.lastName}`.trim(),
            })),
        [beneficiaries],
    )

    const milestoneItems = useMemo(
        () =>
            beneficiaries.map((b) => ({
                id: b.id,
                name: `${b.firstName} ${b.lastName}`.trim(),
                dob: b.dob,
                withdrawalAge1: b.withdrawalAge1,
                withdrawalPct1: b.withdrawalPct1,
                withdrawalAge2: b.withdrawalAge2,
                withdrawalPct2: b.withdrawalPct2,
            })),
        [beneficiaries],
    )
```

Keep: `totalDistributed` (lines 118–126), `totalShares` (lines 128–131), `totalDistributedYtd` (lines 135–148), `pendingHemsCount` (lines 150–153), `donutItems` (lines 155–165).

#### D-09 — Remove 3 JSX blocks

**Block 1 — avatar/sidekick grid (lines 218–227):**
```tsx
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1">
                    <BeneficiaryAvatarStack beneficiaries={avatarItems} />
                </div>
                <div className="md:col-span-2 text-sm text-muted-foreground">
                    {beneficiaries.length} beneficiaries ·{' '}
                    {formatCurrency(totalDistributed)} distributed lifetime ·{' '}
                    {formatCurrency(totalDistributedYtd)} YTD
                </div>
            </div>
```

**Block 2 — Display Order Card (lines 234–256):**
```tsx
            {!loading && beneficiaries.length > 1 && entityId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Display Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-3 text-sm text-muted-foreground">
                            Drag to reorder how beneficiaries are listed
                            throughout the app.
                        </p>
                        <BeneficiarySortableList
                            beneficiaries={beneficiaries.map((b) => ({
                                id: b.id,
                                firstName: b.firstName,
                                lastName: b.lastName,
                                relationship: b.relationship,
                                sortIndex: b.sortIndex ?? 0,
                            }))}
                            entityId={entityId}
                        />
                    </CardContent>
                </Card>
            )}
```

**Block 3 — WithdrawalMilestoneGantt element (lines 258–262):**
```tsx
            <WithdrawalMilestoneGantt
                beneficiaries={milestoneItems}
                entityDod={entityDetail?.dod ?? null}
                isLoading={loading}
            />
```

#### D-10 — Rewrite PageHeader description (line 204)

Current:
```tsx
                description="Trust beneficiaries with share allocations and withdrawal milestones."
```
Replace with:
```tsx
                description="Trust beneficiaries with share allocations and distribution history."
```

#### D-11 — Add 5th KPI + reorder kpiData array (lines 190–198)

Current `kpiData` array (lines 190–198):
```typescript
    const kpiData: KpiStripItem[] = [
        { label: 'Beneficiary count', value: beneficiaries.length },
        { label: 'Total share %', value: `${totalShares}%` },
        {
            label: 'Distributions YTD',
            value: formatCurrency(totalDistributedYtd),
        },
        { label: 'Pending HEMS', value: pendingHemsCount },
    ]
```

Replace with (insert "Lifetime distributions" at position 3, shift "Distributions YTD" to position 4):
```typescript
    const kpiData: KpiStripItem[] = [
        { label: 'Beneficiary count', value: beneficiaries.length },
        { label: 'Total share %', value: `${totalShares}%` },
        { label: 'Lifetime distributions', value: formatCurrency(totalDistributed) },
        { label: 'Distributions YTD', value: formatCurrency(totalDistributedYtd) },
        { label: 'Pending HEMS', value: pendingHemsCount },
    ]
```

`totalDistributed` is already computed at lines 118–126 — no new query or useMemo.

**Analog pattern — kpiData array from `src/app/(admin)/contacts/_components/ContactsClient.tsx` lines 128–133:**
```typescript
    const kpiData: KpiStripItem[] = [
        { label: 'Contact count', value: contacts.length },
        { label: 'Attorneys', value: attorneysCount },
        { label: 'CPAs', value: cpasCount },
        { label: 'Other professionals', value: otherProfCount },
    ]
```

---

## Shared Patterns

### cn import (applies to kpi-strip.tsx D-17)

**Source:** `src/components/confirm-dialog.tsx` line 5 (and `bulk-entry-table.tsx`, `activity-timeline.tsx`, `editable-cells.tsx`, `liability-progress-card.tsx`)
```typescript
import { cn } from '@/lib/utils'
```
This is the canonical form in all `src/components/` files.

### Conditional grid-column class (applies to kpi-strip.tsx D-17)

No existing analog in the project — this is a new pattern introduced by D-17. The required shape is:
```typescript
className={cn(
    "grid grid-cols-1 md:grid-cols-2 gap-4",
    data.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
)}
```
Applied to both the skeleton wrapper and the loaded-state wrapper so they always match. `lg:grid-cols-5` is a valid Tailwind v4 utility — no safelist addition required.

### KpiStrip usage contract (applies to BeneficiariesClient.tsx D-11)

**Source:** `src/app/(admin)/contacts/_components/ContactsClient.tsx` lines 128–133, 166
```typescript
const kpiData: KpiStripItem[] = [
    { label: '...', value: ... },
    ...
]
// in JSX:
<KpiStrip data={kpiData} isLoading={isLoading} />
```
No prop changes needed — `KpiStrip` already accepts an arbitrary-length `data` array.

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| (none) | — | All targets either self-document their edit boundary or have a clear sibling analog |

---

## Execution Order (D-13, locked)

Per CONTEXT.md D-13 — planner MUST sequence tasks in this order:

1. **Task 1:** Edit `src/components/kpi-strip.tsx` (D-17 skeleton fix) — must precede BeneficiariesClient edit
2. **Task 2:** Edit `src/app/(admin)/beneficiaries/_components/BeneficiariesClient.tsx` (D-06..D-11 combined)
3. **Task 3:** Delete `BeneficiaryAvatarStack.tsx`, `BeneficiarySortableList.tsx`, `WithdrawalMilestoneGantt.tsx`
4. **Task 4:** Edit `src/server/trpc/routers/beneficiary.ts` + delete `tests/trpc/beneficiary-reorder.test.ts`
5. **Task 5:** `bun run typecheck` + `bun run lint` gate + admin UAT checklist

Tasks 3 and 4 may be collapsed into a single commit if the planner prefers; they have no ordering dependency on each other (component deletes and router edit are independent).

---

## Metadata

**Analog search scope:** `src/app/(admin)/`, `src/components/`, `src/server/trpc/routers/`, `tests/trpc/`
**Files read:** 10 (CONTEXT.md, UI-SPEC.md, BeneficiariesClient.tsx, kpi-strip.tsx, beneficiary.ts router, BeneficiaryAvatarStack.tsx, BeneficiarySortableList.tsx, WithdrawalMilestoneGantt.tsx, beneficiary-reorder.test.ts, ContactsClient.tsx partial, Phase 32 plan partial)
**Pattern extraction date:** 2026-05-22
