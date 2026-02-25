import { expect, adminTest as test } from './fixtures'

/**
 * HEMS Requests E2E Tests
 *
 * HEMS = Health, Education, Maintenance, Support.
 * Flow: Beneficiary submits → Admin approves → auto-creates distribution.
 *
 * Run: bun run test:e2e --project=admin --grep "HEMS"
 */
test.describe('HEMS page', () => {
    test('hems page loads', async ({ page }) => {
        await page.goto('/hems')
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(/\/hems/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('hems page has heading', async ({ page }) => {
        await page.goto('/hems')
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('hems table or empty state renders', async ({ page }) => {
        await page.goto('/hems')
        await page.waitForLoadState('networkidle')
        const table = page.getByRole('table')
        const empty = page.getByText(/no requests|empty|no hems/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })
})

test.describe('HEMS Queue page', () => {
    test('hems-queue page loads', async ({ page }) => {
        await page.goto('/hems-queue')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
        await expect(page.getByRole('heading').first()).toBeVisible()
    })
})

test.describe('HEMS approval UI', () => {
    test('pending requests show approve/deny actions if any exist', async ({
        page,
    }) => {
        await page.goto('/hems')
        await page.waitForLoadState('networkidle')
        const pending = page.getByText(/pending/i).first()
        if (await pending.isVisible()) {
            const approveBtn = page
                .getByRole('button', { name: /approve/i })
                .first()
            const denyBtn = page.getByRole('button', { name: /deny/i }).first()
            const hasApprove = await approveBtn.isVisible().catch(() => false)
            const hasDeny = await denyBtn.isVisible().catch(() => false)
            expect(hasApprove || hasDeny).toBe(true)
        }
    })
})
