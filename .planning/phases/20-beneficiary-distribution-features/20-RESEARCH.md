# Phase 20: beneficiary-distribution-features - Research

**Researched:** 2026-03-09
**Domain:** Beneficiary portal HEMS history, admin beneficiary tax fields, distribution tax compliance, HEMS cancellation
**Confidence:** HIGH

## Summary

Phase 20 adds four feature requirements to the existing beneficiary/distribution/HEMS infrastructure. The codebase already has all schema tables, tRPC routers, query functions, and RLS policies in place. This phase is exclusively about wiring new UI and adding new tRPC procedures to existing infrastructure -- no new tables, no schema changes, no new libraries.

The four requirements break into two natural groups: (1) beneficiary portal enhancements (FEAT-05: HEMS request history on portal, FEAT-08: beneficiary cancel of PENDING requests) and (2) admin-side enhancements (FEAT-06: edit beneficiary taxId/withdrawal fields, FEAT-07: distribution tax-reported/1099-issued toggles, FEAT-08: admin cancel of any-status requests).

**Primary recommendation:** Implement as two plans -- portal-side changes (FEAT-05, FEAT-08 beneficiary cancel) and admin-side changes (FEAT-06, FEAT-07, FEAT-08 admin cancel). All work uses existing patterns and components. No new dependencies needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FEAT-05 | Beneficiary portal shows HEMS request history with status tracking | Portal already has `beneficiary.me` query with distributions; needs `hemsRequest.myRequests` tRPC call (already exists) wired into PortalClient |
| FEAT-06 | Admin can edit beneficiary tax fields (taxId) and per-beneficiary withdrawal ages/percentages | Schema already has `taxId`, `withdrawalAge1`, `withdrawalPct1`, `withdrawalAge2`, `withdrawalPct2` columns; `updateBeneficiarySchema` accepts them; BeneficiaryDialogContent needs editable fields |
| FEAT-07 | Admin can mark distributions as tax-reported and toggle 1099-issued | Schema already has `taxReported` (bool) and `tax1099Issued` (bool) on distribution table; `updateDistributionSchema` accepts them; BeneficiaryDialogContent distribution table needs toggle columns |
| FEAT-08 | HEMS requests can be cancelled (admin: any status, beneficiary: PENDING only) | Schema has CANCELLED in HemsRequestStatus enum; admin cancel via new `hemsRequest.cancel` adminProcedure; beneficiary cancel via new `hemsRequest.cancelMy` beneficiaryProcedure using server action pattern |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tRPC v11 | 11.x | API procedures | Existing router pattern for all features |
| Drizzle ORM | latest | DB queries | Schema, validation, queries all in place |
| React 19 | 19.x | UI components | Portal and admin pages |
| shadcn/ui | latest | Component library | Badge, Button, Table, Dialog, Card all in use |
| Zod | latest | Input validation | Schema validation for all mutations |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | latest | Toast notifications | Mutation success/error feedback |
| lucide-react | latest | Icons | Status indicators, action buttons |
| @tanstack/react-table | latest | Data tables | DataTable component for HEMS history |
| @tanstack/react-query | latest | Query cache | Invalidation after mutations |

### Alternatives Considered

None -- this phase uses 100% existing infrastructure.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Approach per Requirement

#### FEAT-05: Portal HEMS History

The `hemsRequest.myRequests` procedure already exists on `beneficiaryProcedure`. It returns up to 50 requests ordered by `desc(createdAt)` for the current user's `beneficiaryId`. The portal `PortalClient.tsx` currently does NOT call this procedure. Wire it in and render a HEMS request history card below the existing Distribution History card.

**Key existing code:**
- Router: `hemsRequest.myRequests` (line 327-337 of hemsRequest.ts) -- returns requests filtered by `ctx.user.beneficiaryId`
- Portal: `PortalClient.tsx` -- needs new tRPC query + new card section
- Status enum: `PENDING | APPROVED | DENIED | DISTRIBUTED | CANCELLED` (already defined in schema)
- Status badge styling: `STATUS_VARIANTS` in `src/lib/constants.ts`

#### FEAT-06: Admin Edit Beneficiary Tax/Withdrawal Fields

The `beneficiary` table already has these columns:
- `taxId` (text, nullable)
- `withdrawalAge1` (integer, nullable)
- `withdrawalPct1` (integer, nullable)
- `withdrawalAge2` (integer, nullable)
- `withdrawalPct2` (integer, nullable)

The `updateBeneficiarySchema` (Zod) accepts all of these via `insertBeneficiarySchema.partial()`. The admin `BeneficiaryDialogContent.tsx` needs editable fields for these. Use the existing `EditableTextCell` pattern for taxId and new number input fields for withdrawal ages/percentages.

**Important:** The BeneficiaryDialogContent currently hardcodes `WITHDRAWAL_AGE_50_PERCENT = 25` and `WITHDRAWAL_AGE_100_PERCENT = 30` in `types.ts`. These should be replaced with the actual per-beneficiary `withdrawalAge1`/`withdrawalAge2` values from the DB when present (falling back to the hardcoded defaults).

**taxId security:** Tax IDs (SSN/TIN) are sensitive PII. Display should be masked (show only last 4 digits). The field is text type -- no format validation in schema. Add basic format validation (9 digits, optionally with dashes) on the frontend.

#### FEAT-07: Distribution Tax Compliance Toggles

The `distribution` table already has:
- `taxReported` (boolean, default false, NOT NULL)
- `tax1099Issued` (boolean, default false, NOT NULL)

The `updateDistributionSchema` accepts these. The admin `BeneficiaryDialogContent.tsx` distribution history table currently shows Date, Amount, Type, Method. Add taxReported and tax1099Issued as toggle columns using Checkbox or Switch components.

#### FEAT-08: HEMS Request Cancellation

**Admin cancel (any status):** Add `hemsRequest.cancel` as an `adminProcedure`. Can cancel requests in any status. If the request was APPROVED and has a linked `distributionId`, the cancel should NOT delete the distribution (it already happened) -- just mark the HEMS request as CANCELLED with a note.

**Beneficiary cancel (PENDING only):** Add `hemsRequest.cancelMy` as a `beneficiaryProcedure`. Restricts to own requests that are still PENDING.

**RLS consideration:** The hems_request table's RLS policies only allow INSERT/UPDATE for `is_admin()` (not beneficiaries). For beneficiary cancel, two approaches:
1. Use a server action (like `submitHemsRequest.ts`) which runs as `neondb_owner` (BYPASSRLS) -- proven pattern
2. Add an RLS UPDATE policy for beneficiaries on their own PENDING requests

**Recommendation:** Use approach 1 (server action) for beneficiary cancel. This is the established pattern -- `submitHemsRequest.ts` already uses a server action that bypasses RLS for beneficiary writes. Adding RLS policies requires manual SQL migration and Drizzle cannot manage them (documented in STATE.md). The server action does its own auth check (session + profile lookup + beneficiaryId match), so security is maintained at the application layer.

### Project Structure (files to create/modify)

```
src/
├── app/
│   ├── portal/
│   │   ├── _components/
│   │   │   ├── PortalClient.tsx          # MODIFY: add HEMS history section + cancel button
│   │   │   └── HemsHistoryCard.tsx       # NEW: HEMS request history card with status badges
│   │   └── _actions/
│   │       └── cancelHemsRequest.ts      # NEW: server action for beneficiary cancel
│   └── (admin)/
│       ├── beneficiaries/
│       │   └── _components/
│       │       ├── BeneficiaryDialogContent.tsx  # MODIFY: add tax fields, withdrawal age editing, distribution tax toggles
│       │       └── types.ts              # MODIFY: use per-beneficiary withdrawal ages
│       └── hems-queue/
│           └── _components/
│               └── HemsQueueClient.tsx    # MODIFY: add cancel button for admin
├── server/
│   └── trpc/
│       └── routers/
│           ├── hemsRequest.ts            # MODIFY: add cancel + cancelMy procedures
│           └── distribution.ts           # MODIFY (if needed): tax toggle procedure
```

### Anti-Patterns to Avoid

- **Do not create a separate distributions page for admin.** The distribution history is embedded in BeneficiaryDialogContent. Keep it there -- adding inline toggles is simpler and maintains the existing UX pattern.
- **Do not add new RLS policies for beneficiary cancel.** RLS migrations are manual SQL, not managed by Drizzle, and add deployment risk. Server actions are the proven pattern for beneficiary writes.
- **Do not mask taxId in the database.** Store full value, mask only in display. Masking at storage breaks tax reporting.
- **Do not allow beneficiary cancel to cascade to linked distributions.** Once a distribution is created (on APPROVE), it exists independently. Cancel on the HEMS side is just a status change.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status badges | Custom status styling | `STATUS_VARIANTS` from `src/lib/constants.ts` + `Badge` | Already handles PENDING/APPROVED/DENIED/DISTRIBUTED/CANCELLED |
| Editable cells | Custom inline edit | `EditableTextCell` from `src/components/editable-cells.tsx` | Established pattern on beneficiary table |
| Confirm dialogs | window.confirm() | `ConfirmDialog` from `src/components/confirm-dialog.tsx` | v4.0 standard (Phase 19 established) |
| Money formatting | Manual string manipulation | `formatCurrency` from `src/utils/formatters` | Handles null/undefined safely |
| Date formatting | Manual date parsing | `formatDate` from `src/utils/formatters` | Consistent ISO string handling |
| Data tables | Custom table rendering | `DataTable` from `src/components/ui/data-table` | Column defs, sorting, search, pagination built in |

## Common Pitfalls

### Pitfall 1: RLS Blocks Beneficiary HEMS Updates
**What goes wrong:** Using tRPC `beneficiaryProcedure` to update hems_request fails because RLS UPDATE policy requires `is_admin()`.
**Why it happens:** hems_request RLS was designed to restrict mutations to admin. The beneficiary submit uses a server action (BYPASSRLS), not tRPC.
**How to avoid:** Use a server action for beneficiary cancel (same pattern as `submitHemsRequest.ts`). Authenticate via `authServer.getSession()`, verify beneficiaryId ownership via `userProfile` lookup.
**Warning signs:** TRPCError or database permission denied on UPDATE.

### Pitfall 2: Hardcoded Withdrawal Ages
**What goes wrong:** BeneficiaryDialogContent and types.ts hardcode `WITHDRAWAL_AGE_50_PERCENT = 25` and `WITHDRAWAL_AGE_100_PERCENT = 30`. If per-beneficiary values are edited (FEAT-06), the UI still shows hardcoded ages.
**Why it happens:** The constants were set before per-beneficiary withdrawal ages were editable.
**How to avoid:** Use `beneficiary.withdrawalAge1 ?? 25` and `beneficiary.withdrawalAge2 ?? 30` as fallbacks. Update `calculateEligibility()` to accept these values.
**Warning signs:** Edited withdrawal ages don't change the eligibility display.

### Pitfall 3: Cancel of APPROVED Request with Distribution Link
**What goes wrong:** Admin cancels an APPROVED request that already auto-created a distribution. If cancel deletes or modifies the distribution, accounting becomes inconsistent.
**Why it happens:** The HEMS approve flow auto-creates a distribution record and sets `hemsRequest.distributionId`.
**How to avoid:** Cancel only updates `hemsRequest.status` to CANCELLED. The linked distribution remains unchanged. Add a note or reviewNotes explaining the cancellation. Do NOT delete or modify the distribution.
**Warning signs:** Distribution totals change after HEMS cancel, or orphaned distribution records.

### Pitfall 4: Missing Query Invalidation
**What goes wrong:** After a cancel mutation, the UI shows stale data.
**Why it happens:** tRPC query cache is not invalidated after the new cancel mutations.
**How to avoid:** On admin cancel: invalidate `hemsRequest.listWithBeneficiary`. On beneficiary cancel: use server action that returns success, then call `router.refresh()` or manually refetch `beneficiary.me` / `hemsRequest.myRequests`.
**Warning signs:** UI still shows PENDING status after cancel completes.

### Pitfall 5: taxId Field Sensitivity
**What goes wrong:** Full SSN/TIN displayed in plain text on screen.
**Why it happens:** Treating taxId like any other text field.
**How to avoid:** Display masked (e.g., `***-**-1234`). Full value shown only in edit mode or behind a "reveal" toggle. Consider type="password" with a show/hide button.
**Warning signs:** Visible SSN on screen, potential compliance issue.

### Pitfall 6: Server Action vs tRPC for Cancel
**What goes wrong:** Building beneficiary cancel as tRPC procedure but forgetting RLS blocks it.
**Why it happens:** Other beneficiary operations (me, myRequests, updateMyContact) work on tRPC because they use SELECT (RLS allows beneficiary SELECT on own rows) or UPDATE on the beneficiary table (which has different RLS).
**How to avoid:** hemsRequest UPDATE is admin-only in RLS. Use server action pattern. See `src/app/portal/_actions/submitHemsRequest.ts` for the exact pattern.
**Warning signs:** 403 or permission denied errors in beneficiary portal.

## Code Examples

### Example 1: Existing myRequests Procedure (already implemented)
```typescript
// Source: src/server/trpc/routers/hemsRequest.ts, line 327
myRequests: beneficiaryProcedure.query(async ({ ctx }) => {
    if (!ctx.user.beneficiaryId) {
        return []
    }
    return db
        .select()
        .from(hemsRequest)
        .where(eq(hemsRequest.beneficiaryId, ctx.user.beneficiaryId))
        .orderBy(desc(hemsRequest.createdAt))
        .limit(50)
}),
```

### Example 2: Admin Cancel Procedure (to be created)
```typescript
// Pattern: follows deny procedure structure
cancel: adminProcedure
    .input(
        z.object({
            id: z.coerce.number(),
            entityId: z.coerce.number(),
            reviewNotes: z.string().optional(),
        }),
    )
    .mutation(async ({ input }) => {
        const existing = await db.query.hemsRequest.findFirst({
            where: and(
                eq(hemsRequest.id, input.id),
                eq(hemsRequest.entityId, input.entityId),
            ),
        })
        if (!existing)
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Request not found in this entity',
            })

        const [updated] = await db
            .update(hemsRequest)
            .set({
                status: 'CANCELLED',
                reviewNotes: input.reviewNotes ?? `Cancelled by admin`,
                reviewedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .where(
                and(
                    eq(hemsRequest.id, input.id),
                    eq(hemsRequest.entityId, input.entityId),
                ),
            )
            .returning()
        if (!updated)
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to cancel request',
            })
        return updated
    }),
```

### Example 3: Beneficiary Cancel Server Action (to be created)
```typescript
// Pattern: follows submitHemsRequest.ts
'use server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { hemsRequest, userProfile } from '@/db/schema'
import { authServer } from '@/lib/auth'

const schema = z.object({
    requestId: z.coerce.number().positive(),
})

export type CancelHemsState = { error: string | null; success: boolean }

export async function cancelHemsRequest(
    _prevState: CancelHemsState,
    formData: FormData,
): Promise<CancelHemsState> {
    const { data: session } = await authServer.getSession()
    if (!session?.user) {
        return { error: 'You must be logged in.', success: false }
    }

    const [profile] = await db
        .select({ beneficiaryId: userProfile.beneficiaryId })
        .from(userProfile)
        .where(eq(userProfile.userId, session.user.id))
        .limit(1)

    if (!profile?.beneficiaryId) {
        return { error: 'No beneficiary profile found.', success: false }
    }

    const parsed = schema.safeParse({ requestId: formData.get('requestId') })
    if (!parsed.success) {
        return { error: 'Invalid request.', success: false }
    }

    const [updated] = await db
        .update(hemsRequest)
        .set({
            status: 'CANCELLED',
            updatedAt: new Date().toISOString(),
        })
        .where(
            and(
                eq(hemsRequest.id, parsed.data.requestId),
                eq(hemsRequest.beneficiaryId, profile.beneficiaryId),
                eq(hemsRequest.status, 'PENDING'),
            ),
        )
        .returning()

    if (!updated) {
        return { error: 'Request not found or no longer pending.', success: false }
    }

    return { error: null, success: true }
}
```

### Example 4: Distribution Tax Toggle (in BeneficiaryDialogContent)
```typescript
// Pattern: inline update using existing updateBeneficiary pattern but for distributions
const toggleTaxReported = trpc.distribution.update.useMutation({
    onSuccess: () => {
        utils.beneficiary.listWithDistributions.invalidate()
    },
})

// In distribution table row:
<Switch
    checked={dist.taxReported}
    onCheckedChange={(checked) =>
        toggleTaxReported.mutate({
            id: dist.id,
            entityId,
            data: { taxReported: checked },
        })
    }
/>
```

### Example 5: Editable taxId with Masking
```typescript
// Pattern: masked display, reveal on edit
const maskedTaxId = beneficiary.taxId
    ? `***-**-${beneficiary.taxId.replace(/\D/g, '').slice(-4)}`
    : null

<EditableTextCell
    value={beneficiary.taxId}
    displayValue={maskedTaxId}
    onSave={async (val) => {
        await updateBeneficiary(beneficiary.id, { taxId: val })
        setSelectedBeneficiary({ ...beneficiary, taxId: val })
    }}
    placeholder="Add Tax ID"
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Portal has no HEMS history | Portal shows distribution history only | v3.0 | Beneficiaries can't see their request status |
| Hardcoded withdrawal ages | Per-beneficiary configurable ages | This phase | Trustees can set custom withdrawal schedules |
| No cancel workflow | CANCELLED enum exists but unused | Schema design | Status enum ready, no procedure to trigger it |
| No tax compliance UI | taxReported/tax1099Issued columns unused | Schema design | Fields exist in DB but no admin controls |

**Currently unused schema features that this phase activates:**
- `hemsRequest.status = 'CANCELLED'` -- defined in enum, never set by any procedure
- `beneficiary.taxId` -- column exists, no admin UI to edit
- `beneficiary.withdrawalAge1/Pct1/Age2/Pct2` -- columns exist, BeneficiaryDialogContent uses hardcoded constants instead
- `distribution.taxReported` / `distribution.tax1099Issued` -- columns exist with defaults, no admin toggle

## Open Questions

1. **EditableTextCell displayValue prop**
   - What we know: `EditableTextCell` accepts `value` and `onSave`. Need to verify if it also supports a `displayValue` prop for masked taxId display.
   - What's unclear: Whether the component needs modification to support masked display.
   - Recommendation: Check the component source. If no `displayValue` prop exists, either add one or create a dedicated `MaskedEditableCell` for taxId. This is a small UI concern, not a blocker.

2. **Distribution update needs entityId**
   - What we know: `distribution.update` requires `{ id, entityId, data }`. The BeneficiaryDialogContent currently receives `beneficiary` which has `entityId`. The distribution rows within the dialog do not carry entityId independently.
   - What's unclear: Whether distribution rows returned by `getBeneficiariesWithDistributions` include `entityId`.
   - Recommendation: Check the Drizzle relation query. If distributions in the join don't include entityId, pass `beneficiary.entityId` to the toggle mutation. Likely works since distributions always belong to the same entity as their beneficiary.

3. **Admin cancel of DISTRIBUTED requests**
   - What we know: The requirement says "admin: any status". DISTRIBUTED means the money has already been paid.
   - What's unclear: Whether cancelling a DISTRIBUTED request has any financial implications.
   - Recommendation: Allow cancel of any status (per requirement), but the linked distribution record remains untouched. Add a confirmation dialog warning that the distribution has already been processed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) + Playwright |
| Config file | package.json scripts, playwright.config.ts |
| Quick run command | `bun test tests/trpc/business-logic.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FEAT-05 | Portal shows HEMS history | E2E | `bun run test:e2e --project=beneficiary --grep "HEMS history"` | No -- Wave 0 |
| FEAT-06 | Admin edits beneficiary tax fields | unit | `bun test tests/trpc/business-logic.test.ts` | Partial -- needs new tests |
| FEAT-07 | Admin toggles distribution tax fields | unit | `bun test tests/trpc/business-logic.test.ts` | Partial -- needs new tests |
| FEAT-08 | HEMS cancel (admin + beneficiary) | unit | `bun test tests/trpc/business-logic.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test tests/trpc/business-logic.test.ts`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/trpc/business-logic.test.ts` -- add HEMS cancel test cases (admin cancel any status, beneficiary cancel PENDING only, beneficiary cancel non-PENDING fails)
- [ ] `tests/trpc/business-logic.test.ts` -- add distribution taxReported/tax1099Issued toggle tests
- [ ] `tests/trpc/business-logic.test.ts` -- add beneficiary taxId/withdrawal field update tests

*(Existing test file covers HEMS create/approve/deny and distribution CRUD, so new tests extend the existing describe blocks)*

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `db/schema.ts` -- beneficiary, distribution, hemsRequest table definitions
- Codebase inspection: `db/validation.ts` -- insert/update Zod schemas for all three tables
- Codebase inspection: `src/server/trpc/routers/hemsRequest.ts` -- existing procedures including myRequests
- Codebase inspection: `src/server/trpc/routers/distribution.ts` -- existing update procedure accepts tax fields
- Codebase inspection: `src/server/trpc/routers/beneficiary.ts` -- existing update procedure accepts all fields
- Codebase inspection: `db/migrations/add-rls-policies.sql` -- RLS policies for hems_request (admin-only INSERT/UPDATE)
- Codebase inspection: `src/app/portal/_actions/submitHemsRequest.ts` -- server action BYPASSRLS pattern
- Codebase inspection: `src/app/portal/_components/PortalClient.tsx` -- current portal UI
- Codebase inspection: `src/app/(admin)/beneficiaries/_components/BeneficiaryDialogContent.tsx` -- current admin UI
- Codebase inspection: `src/app/(admin)/hems-queue/_components/HemsQueueClient.tsx` -- current HEMS queue UI

### Secondary (MEDIUM confidence)
- CLAUDE.md project documentation -- auth patterns, RLS documentation, HEMS request flow

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use, no new dependencies
- Architecture: HIGH -- all schema columns exist, all tRPC router patterns established, server action pattern proven
- Pitfalls: HIGH -- RLS constraint verified by reading actual SQL policies, BYPASSRLS server action pattern verified in existing code

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- internal codebase, no external API changes)
