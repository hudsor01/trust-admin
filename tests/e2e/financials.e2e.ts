import { expect, adminTest as test } from './fixtures'

/**
 * Financial Pages E2E Tests
 *
 * Covers: Liabilities (/liabilities), Trust Accounting (/accounting)
 *
 * Run: bun run test:e2e --project=admin --grep "Liabilit|Accounting"
 */
test.describe('Liabilities page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/liabilities')
        await page.waitForLoadState('networkidle')
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/liabilities/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: 15000,
        })
    })

    test('table or empty state renders', async ({ page }) => {
        const table = page.getByRole('table')
        const empty = page.getByText(/no liabilit|empty/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })

    test('add/create button opens dialog', async ({ page }) => {
        const addBtn = page
            .getByRole('button', { name: /add|create|new liabilit/i })
            .first()
        if (await addBtn.isVisible()) {
            await addBtn.click()
            await expect(page.getByRole('dialog')).toBeVisible()
            await page.keyboard.press('Escape')
        }
    })

    test('record payment option accessible when liabilities exist', async ({
        page,
    }) => {
        const rows = await page.getByRole('row').count()
        if (rows > 1) {
            const payBtn = page
                .getByRole('button', { name: /payment|pay/i })
                .first()
            const menuBtn = page
                .getByRole('button', { name: /more|actions|⋯/i })
                .first()
            const hasPay = await payBtn.isVisible().catch(() => false)
            const hasMenu = await menuBtn.isVisible().catch(() => false)
            expect(hasPay || hasMenu).toBe(true)
        }
    })
})

test.describe('Trust Accounting page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/accounting')
        await page.waitForLoadState('networkidle')
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/accounting/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('entries table or empty state renders', async ({ page }) => {
        const table = page.getByRole('table')
        const empty = page.getByText(/no entries|empty|no income|no expense/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })

    test('add entry button opens dialog', async ({ page }) => {
        const addBtn = page
            .getByRole('button', {
                name: /add|create|new entry|income|expense/i,
            })
            .first()
        if (await addBtn.isVisible()) {
            await addBtn.click()
            await expect(page.getByRole('dialog')).toBeVisible()
            await page.keyboard.press('Escape')
        }
    })
})
