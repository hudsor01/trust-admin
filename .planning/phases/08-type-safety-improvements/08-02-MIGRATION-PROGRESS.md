# TanStack Query Migration Progress

## Completed (11 commits)

### Query Hooks Created (All 21 resources)
- Simple: contacts, beneficiaries, trustees
- Assets: entities, vehicles, bank-accounts, investment-accounts, homesteads, rental-properties, artwork, personal-property
- Liabilities: liabilities, liability-payments
- Trust Management: specific-bequests, trust-accounting, withdrawal-records, hems-requests, distributions
- Administration: trustee-fee-schedules, trustee-fee-entries, activity-logs

### Refactored to queryOptions Pattern
All 21 query hooks now use `queryOptions` for better type inference and reusability.

### Pages Migrated (9 pages)
1. ✅ **Contacts.tsx** - Simple page, no filtering
2. ✅ **Beneficiaries.tsx** - Entity filtering, complex with distributions
3. ✅ **Trustees.tsx** - Entity filtering with succession order
4. ✅ **Vehicles.tsx** - Entity filtering (already done)
5. ✅ **Accounts.tsx** - Dual resources (bank + investment accounts)
6. ✅ **Liabilities.tsx** - Entity filtering with payment recording
7. ✅ **Properties.tsx** - Dual resources (homesteads + rental properties)
8. ✅ **Accounting.tsx** - Trust accounting entries, simplified by removing fetch functions
9. ✅ **Distributions.tsx** - HEMS requests and withdrawals with complex workflows

## Migration Pattern

### Import Changes
```typescript
// OLD
import { useResources, type Resource } from "@/hooks"

// NEW
import {
  useResources,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  type Resource
} from "@/hooks/resources/queries"
```

### Hook Usage Changes
```typescript
// OLD
const { data, loading, create, update, remove } = useResources()

// NEW
const { data = [], isLoading } = useResources()
const createMutation = useCreateResource()
const updateMutation = useUpdateResource()
const deleteMutation = useDeleteResource()
```

### Mutation Calls
```typescript
// OLD
await create(payload)
await update(id, data)
await remove(id)

// NEW
await createMutation.mutateAsync(payload)
await updateMutation.mutateAsync({ id, data })
await deleteMutation.mutateAsync(id)
```

## Remaining Work

### Pages to Migrate (6 pages)
- **Complex** (6): Dashboard.tsx, HemsQueue.tsx, Bequests.tsx, ActivityLog.tsx, Settings.tsx, DistributionWizard.tsx

### Cleanup
- Remove old `src/hooks/use-query.ts`
- Update `src/hooks/index.ts` exports (if exists)
- Remove unused hook factory functions

### Testing
- Manual testing of all CRUD operations
- Verify toast notifications work
- Verify entity/beneficiary/liability filtering
- Verify validation error messages

## Key Insights

1. **queryOptions is essential** - Provides better type inference and SSR support
2. **Entity filtering is common** - Most resources filter by entityId
3. **Wrapper functions needed** - Some child components expect old API signature
4. **Mutation signatures differ** - Update takes `{ id, data }`, create takes just `data`, delete takes just `id`
5. **Toast notifications built-in** - New hooks handle error/success toasts automatically

## Commands Used

```bash
# Bulk import updates
sed -i '' 's/from "@\/hooks"/from "@\/hooks\/resources\/queries"/g' src/pages/*.tsx

# Bulk mutation replacements
sed -i '' 's/await update(id, {/await updateMutation.mutateAsync({ id, data: {/g' file.tsx
sed -i '' 's/} }/} })/g' file.tsx  # Fix closing braces

# Commit pattern
git add src/pages/PageName.tsx
git commit -m "feat(08-02): migrate PageName to TanStack Query hooks"
```

## Next Steps

1. Finish Liabilities.tsx and Properties.tsx (filtered pages)
2. Migrate complex pages (Accounting, Distributions, Dashboard, etc.)
3. Remove old hook files
4. Update exports
5. Full manual testing
6. Write final migration summary

---

**Status**: In Progress (9/15 pages migrated, 60% complete)
