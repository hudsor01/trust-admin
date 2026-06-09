import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { liability, noteReceivable } from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../init'
import { listAssetRows } from './asset'

// A single consolidated row spanning all three sides of the trust's
// financial position: things it OWNS (assets), things owed TO it
// (receivables), and things it OWES (liabilities). Every source record is
// flattened into this one envelope so the /balance-sheet page renders one
// table and exports one CSV. `amount` is always the positive magnitude
// (stringified Postgres numeric); the sign convention for net worth lives
// in the client/KPI layer, not here.
export type BalanceSheetCategory = 'ASSET' | 'RECEIVABLE' | 'LIABILITY'

export interface BalanceSheetRow {
    /** Source-table primary key (not unique across categories — the same
     *  numeric id can appear under ASSET and LIABILITY. Safe because the
     *  table keys rows by index, not id, and no per-row state is enabled). */
    id: number
    category: BalanceSheetCategory
    /** Sub-type label: asset category (Vehicle, Bank Account, …),
     *  liabilityType, or receivableType — title-cased. */
    type: string
    /** Counterparty / name: asset name, liability creditor, receivable
     *  debtor. */
    party: string
    description: string | null
    /** Positive magnitude as a Postgres numeric string. Null when the
     *  source value column is unset. */
    amount: string | null
    status: string
    /** Row-click target — the detail page for that record. */
    href: string
    updatedAt: string
}

// SCREAMING_SNAKE enum value → "Title Case" label. MORTGAGE → Mortgage,
// AUTO_LOAN → Auto Loan, PROMISSORY_NOTE → Promissory Note.
function titleCaseEnum(value: string): string {
    return value
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ')
}

export const balanceSheetRouter = createTRPCRouter({
    // Every asset + receivable + liability for the entity, flattened into one
    // sortable/exportable row set. Newest-updated first.
    listAll: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }): Promise<BalanceSheetRow[]> => {
            const { entityId } = input

            const [assets, receivables, liabilities] = await Promise.all([
                listAssetRows(entityId),
                db
                    .select()
                    .from(noteReceivable)
                    .where(eq(noteReceivable.entityId, entityId)),
                db
                    .select()
                    .from(liability)
                    .where(eq(liability.entityId, entityId)),
            ])

            const rows: BalanceSheetRow[] = []

            for (const a of assets) {
                // Insurance carries no balance-sheet value here. `asset.listAll`
                // maps an insurance policy's value to `coverageAmount` (face /
                // policy limit), but face value is NEVER a going-concern asset:
                // an owned life policy is carried at cash surrender value net of
                // loans (FASB ASC 325-30 / ASC 274 estimated current value;
                // AICPA TIS 2240.06), and a P&C coverage limit is not an asset
                // at all. We don't track cash surrender value, so insurance
                // contributes $0 to Net Worth — surfacing `coverageAmount` would
                // overstate it. (A death benefit payable to the trust belongs in
                // the Receivables lane at face until collected, not here. The
                // /assets "DOD total" may still show face value — that is the
                // separate IRC §2042 estate-tax basis, a different standard.)
                const isInsurance = a.kind === 'insurancePolicy'
                rows.push({
                    id: a.id,
                    category: 'ASSET',
                    type: a.category,
                    party: a.name,
                    description: a.description,
                    amount: isInsurance ? null : a.value,
                    status: a.status,
                    href: a.href,
                    updatedAt: a.updatedAt,
                })
            }

            for (const r of receivables) {
                rows.push({
                    id: r.id,
                    category: 'RECEIVABLE',
                    type: titleCaseEnum(r.receivableType),
                    party: r.debtor,
                    description: r.description,
                    amount: r.currentBalance,
                    status: r.status,
                    href: '/receivables',
                    updatedAt: r.updatedAt,
                })
            }

            for (const l of liabilities) {
                rows.push({
                    id: l.id,
                    category: 'LIABILITY',
                    type: titleCaseEnum(l.liabilityType),
                    party: l.creditor,
                    description: l.description,
                    amount: l.currentBalance,
                    status: l.status,
                    href: '/liabilities',
                    updatedAt: l.updatedAt,
                })
            }

            rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

            return rows
        }),
})
