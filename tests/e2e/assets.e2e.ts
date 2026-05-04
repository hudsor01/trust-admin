import { expect, adminTest as test } from './fixtures'

/**
 * Asset & Related Pages E2E Tests
 *
 * Covers: Accounts, Properties, Vehicles, Trustees, Bequests
 * Assets use Neon Data API (PostgREST) rather than tRPC.
 *
 * Run: bun run test:e2e --project=admin --grep "Accounts|Properties|Vehicles|Trustees|Bequests"
 */
test.describe('Accounts page (/accounts)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/accounts')
        await page.waitForLoadState('networkidle')
        // Wait for page to finish loading (spinner disappears)
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/accounts/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: 15000,
        })
    })

    test('accounts table or empty state renders', async ({ page }) => {
        const table = page.getByRole('table')
        const empty = page.getByText(/no accounts|empty/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })

    test('add account button opens form/dialog', async ({ page }) => {
        const addBtn = page
            .getByRole('button', { name: /add|create|new account/i })
            .first()
        if (await addBtn.isVisible()) {
            await addBtn.click()
            const dialog = page.getByRole('dialog')
            const form = page.locator('form')
            const hasDialog = await dialog.isVisible().catch(() => false)
            const hasForm = await form.isVisible().catch(() => false)
            expect(hasDialog || hasForm).toBe(true)
            await page.keyboard.press('Escape')
        }
    })
})

test.describe('Properties page (/properties)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/properties')
        await page.waitForLoadState('networkidle')
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/properties/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: 15000,
        })
    })

    test('content renders', async ({ page }) => {
        const table = page.getByRole('table')
        const heading = page.getByRole('heading').first()
        const hasTable = await table.isVisible().catch(() => false)
        const hasHeading = await heading.isVisible().catch(() => false)
        expect(hasTable || hasHeading).toBe(true)
    })
})

test.describe('Vehicles page (/vehicles)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/vehicles')
        await page.waitForLoadState('networkidle')
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/vehicles/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: 15000,
        })
    })

    test('vehicles table or empty state renders', async ({ page }) => {
        const table = page.getByRole('table')
        const empty = page.getByText(/no vehicles|empty/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })
})

test.describe('Trustees page (/trustees)', () => {
    test('trustees page loads', async ({ page }) => {
        await page.goto('/trustees')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
        await expect(page.getByRole('heading').first()).toBeVisible()
    })
})

test.describe('Bequests page (/bequests)', () => {
    test('bequests page loads', async ({ page }) => {
        await page.goto('/bequests')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
        await expect(page.getByRole('heading').first()).toBeVisible()
    })
})

test.describe('Unified Assets page (/assets)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/assets')
        await page.waitForLoadState('networkidle')
        // The page fans out 7 parallel queries; wait for spinner to clear.
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/assets/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has the All Assets heading', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: /all assets/i }),
        ).toBeVisible({ timeout: 15000 })
    })

    test('table or empty state renders', async ({ page }) => {
        const table = page.getByRole('table')
        const empty = page.getByText(/no assets recorded/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })

    test('Category faceted filter trigger is visible', async ({ page }) => {
        // The faceted filter renders a Popover trigger button labeled "Category".
        // Don't open it (would require populated rows to be useful) — just
        // confirm the toolbar is present.
        const trigger = page.getByRole('button', { name: /category/i })
        const hasTrigger = await trigger
            .first()
            .isVisible()
            .catch(() => false)
        const empty = page.getByText(/no assets recorded/i)
        const hasEmpty = await empty.isVisible().catch(() => false)
        // If table is empty, toolbar may suppress filter; either path is valid.
        expect(hasTrigger || hasEmpty).toBe(true)
    })

    test('Name search input is present', async ({ page }) => {
        const search = page.getByPlaceholder(/search by name/i)
        const empty = page.getByText(/no assets recorded/i)
        const hasSearch = await search.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasSearch || hasEmpty).toBe(true)
    })

    test('row click navigates to per-type page (when rows exist)', async ({
        page,
    }) => {
        // Look for a data row in tbody (skips header). Skip when truly
        // empty — the existing "table or empty state renders" test above
        // covers the rendering invariant; this test's value is exercising
        // the navigation handler when there is something to click.
        const dataRow = page.locator('tbody tr').first()
        const rowCount = await page.locator('tbody tr').count()
        if (rowCount === 0) {
            test.skip()
            return
        }
        await expect(dataRow).toBeVisible({ timeout: 15000 })
        await dataRow.click()
        await expect(page).toHaveURL(
            /\/(vehicles|properties|accounts|personal-property|artwork|insurance)/,
            { timeout: 5000 },
        )
    })
})

test.describe('Sidebar Assets link (option B)', () => {
    test('Assets parent label navigates to /assets', async ({ page }) => {
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        // The parent SidebarMenuButton is a Link to /assets. Clicking the
        // label (not the chevron) should navigate.
        const assetsLink = page.getByRole('link', { name: /^assets$/i })
        await assetsLink.first().click()
        await expect(page).toHaveURL(/\/assets/)
    })
})
