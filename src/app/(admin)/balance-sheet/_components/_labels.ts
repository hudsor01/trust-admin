import type { BalanceSheetCategory } from '@/server/trpc/routers/balanceSheet'

// Category enum → display label (CSV + table badge).
export const CATEGORY_LABELS: Record<BalanceSheetCategory, string> = {
    ASSET: 'Asset',
    RECEIVABLE: 'Receivable',
    LIABILITY: 'Liability',
}

// Badge variant per category. Liabilities are debts → destructive (red) so
// the one negative side of the ledger reads at a glance; assets and
// receivables are positive holdings.
export const CATEGORY_BADGE_VARIANT: Record<
    BalanceSheetCategory,
    'default' | 'secondary' | 'destructive'
> = {
    ASSET: 'default',
    RECEIVABLE: 'secondary',
    LIABILITY: 'destructive',
}
