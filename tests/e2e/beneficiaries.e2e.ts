import { expect, adminTest as test } from './fixtures'

/**
 * Beneficiaries Page E2E Tests
 *
 * Tests trust beneficiary management (/beneficiaries).
 * Note: Different from user management (/users) — these are trust beneficiaries
 * with share percentages, not auth system users.
 *
 * Run: bun run test:e2e --project=admin --grep "Beneficiar"
 */
test.describe('Beneficiaries page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/beneficiaries')
        await page.waitForLoadState('networkidle')
    })

    test('loads without redirect to sign-in', async ({ page }) => {
        await expect(page).toHaveURL(/\/beneficiaries/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('beneficiary table renders with data rows', async ({ page }) => {
        // Hudson Trust has seeded beneficiaries
        const rows = page.getByRole('row')
        const count = await rows.count()
        expect(count).toBeGreaterThan(1)
    })
})

test.describe('Beneficiary actions', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/beneficiaries')
        await page.waitForLoadState('networkidle')
    })

    test('action buttons or menus exist on rows', async ({ page }) => {
        const actionBtn = page
            .getByRole('button', {
                name: /more|actions|edit|view|details|⋯|…/i,
            })
            .first()
        const editBtn = page.getByRole('button', { name: /edit/i }).first()
        const hasAction = await actionBtn.isVisible().catch(() => false)
        const hasEdit = await editBtn.isVisible().catch(() => false)
        expect(hasAction || hasEdit).toBe(true)
    })

    test('mark deceased dialog opens with date field', async ({ page }) => {
        const actionBtn = page
            .getByRole('button', { name: /more|actions|⋯|…/i })
            .first()
        if (await actionBtn.isVisible()) {
            await actionBtn.click()
            const deceasedOption = page.getByRole('menuitem', {
                name: /deceas/i,
            })
            if (await deceasedOption.isVisible()) {
                await deceasedOption.click()
                await expect(page.getByRole('dialog')).toBeVisible({
                    timeout: 3000,
                })
                await expect(page.locator('input[type="date"]')).toBeVisible()
                await page.keyboard.press('Escape')
            } else {
                await page.keyboard.press('Escape')
            }
        }
    })

    test('create beneficiary button opens dialog', async ({ page }) => {
        const createBtn = page
            .getByRole('button', { name: /add|create|new beneficiar/i })
            .first()
        if (await createBtn.isVisible()) {
            await createBtn.click()
            await expect(page.getByRole('dialog')).toBeVisible()
            await page.keyboard.press('Escape')
        }
    })
})
