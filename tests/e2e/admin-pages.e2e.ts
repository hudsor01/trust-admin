import { expect, adminTest as test } from './fixtures'

/**
 * KPI strip render check across all 12 admin pages that gained a KpiStrip in
 * 23-03 (10 list pages + /liabilities + /beneficiaries + /dashboard).
 *
 * Asserts: PageHeader h1 visible, plus at least one card-shaped KPI element
 * below the heading. Loading spinner is awaited first to avoid flaky
 * empty-state assertions.
 *
 * Run: bun run test:e2e --project=admin --grep "KPI strip"
 */
const PAGES = [
    { path: '/dashboard', title: 'Dashboard' },
    { path: '/accounts', title: 'Accounts' },
    { path: '/assets', title: 'Assets' },
    { path: '/properties', title: 'Properties' },
    { path: '/vehicles', title: 'Vehicles' },
    { path: '/insurance', title: 'Insurance' },
    { path: '/trustees', title: 'Trustees' },
    { path: '/bequests', title: 'Bequests' },
    { path: '/personal-property', title: 'Personal property' },
    { path: '/contacts', title: 'Contacts' },
    { path: '/artwork', title: 'Artwork' },
    { path: '/liabilities', title: 'Liabilities' },
    { path: '/beneficiaries', title: 'Beneficiaries' },
] as const

test.describe('KPI strip render across list pages', () => {
    for (const p of PAGES) {
        test(`${p.path} renders PageHeader + KpiStrip cards`, async ({
            page,
        }) => {
            await page.goto(p.path)
            await page.waitForLoadState('networkidle')
            await page
                .waitForSelector('.animate-spin', {
                    state: 'hidden',
                    timeout: 15000,
                })
                .catch(() => null)

            // PageHeader renders an h1; /dashboard keeps TrustHeader so its
            // first heading may be h1 from that component instead.
            await expect(
                page.getByRole('heading', { level: 1 }).first(),
            ).toBeVisible({ timeout: 15000 })

            // KpiStrip renders SummaryCards (data-slot="card") in a grid.
            // First card must be visible. shadcn's Card sets data-slot="card"
            // — if the renderer changes, update this selector.
            const firstCard = page.locator('[data-slot="card"]').first()
            await expect(firstCard).toBeVisible({ timeout: 15000 })
        })
    }
})
