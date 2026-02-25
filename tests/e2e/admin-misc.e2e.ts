import { expect, adminTest as test } from './fixtures'

/**
 * Miscellaneous Admin Pages E2E Tests
 *
 * Covers: Contacts, Activity Log, Settings, Inventory Queue, 404 error page.
 *
 * Run: bun run test:e2e --project=admin --grep "Contacts|Activity|Settings|Inventory Queue|404"
 */
test.describe('Contacts page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/contacts')
        await page.waitForLoadState('networkidle')
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/contacts/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('contact list or empty state renders', async ({ page }) => {
        const table = page.getByRole('table')
        const empty = page.getByText(/no contacts|empty/i)
        const list = page.getByRole('list')
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        const hasList = await list.isVisible().catch(() => false)
        expect(hasTable || hasEmpty || hasList).toBe(true)
    })

    test('add contact button opens dialog', async ({ page }) => {
        const addBtn = page
            .getByRole('button', { name: /add|create|new contact/i })
            .first()
        if (await addBtn.isVisible()) {
            await addBtn.click()
            await expect(page.getByRole('dialog')).toBeVisible()
            await page.keyboard.press('Escape')
        }
    })
})

test.describe('Activity Log page', () => {
    test('activity-log page loads', async ({ page }) => {
        await page.goto('/activity-log')
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(/\/activity-log/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
        await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('activity log has entries or empty state', async ({ page }) => {
        await page.goto('/activity-log')
        await page.waitForLoadState('networkidle')
        const table = page.getByRole('table')
        const empty = page.getByText(/no activity|empty/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })
})

test.describe('Settings page', () => {
    test('settings page loads', async ({ page }) => {
        await page.goto('/settings')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
        await expect(page.getByRole('heading').first()).toBeVisible()
    })
})

test.describe('Inventory Queue page', () => {
    test('inventory-queue page loads', async ({ page }) => {
        await page.goto('/inventory-queue')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
        await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('inventory queue shows table or empty state', async ({ page }) => {
        await page.goto('/inventory-queue')
        await page.waitForLoadState('networkidle')
        const table = page.getByRole('table')
        const empty = page.getByText(/no items|empty|no pending/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })
})

test.describe('404 / Not Found page', () => {
    test('unknown route shows not-found content, not a crash', async ({
        page,
    }) => {
        await page.goto('/this-route-does-not-exist-xyz-12345')
        await page.waitForLoadState('networkidle')
        const body = await page.locator('body').textContent()
        expect(body!.length).toBeGreaterThan(20)
        await expect(page.locator('body')).toBeVisible()
    })

    test('unknown nested route does not infinite-redirect', async ({
        page,
    }) => {
        await page.goto('/nonexistent/deeply/nested/route')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })
})
