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
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/accounts/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible()
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
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/properties/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible()
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
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/vehicles/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible()
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
