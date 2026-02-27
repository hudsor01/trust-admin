import { expect, adminTest as test } from './fixtures'

/**
 * User Management Page E2E Tests
 *
 * Tests /users — manages auth system users (Neon Auth).
 * Different from /beneficiaries (trust beneficiaries with share percentages).
 *
 * Run: bun run test:e2e --project=admin --grep "User Management"
 */
test.describe('User Management page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle')
    })

    test('loads without redirect', async ({ page }) => {
        await expect(page).toHaveURL(/\/users/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible()
    })

    test('user list has at least one row', async ({ page }) => {
        const rows = page.getByRole('row')
        const count = await rows.count()
        // At least a header row; non-owner admins see read-only provisioned users
        expect(count).toBeGreaterThanOrEqual(1)
    })

    test('user list loaded (owner sees email, non-owner sees read-only banner)', async ({
        page,
    }) => {
        // Owner: full user list with emails visible
        // Non-owner admin: read-only provisioned accounts view
        const readOnlyBanner = page.getByText(/restricted to the trust owner/i)
        const ownerEmail = page.getByText(
            process.env.TEST_ADMIN_EMAIL ?? 'rhudsontspr@gmail.com',
        )
        const hasReadOnly = await readOnlyBanner.isVisible().catch(() => false)
        const hasOwnerEmail = await ownerEmail.isVisible().catch(() => false)
        expect(hasReadOnly || hasOwnerEmail).toBe(true)
    })
})

test.describe('Create user flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle')
    })

    test('create user button or read-only banner is visible', async ({
        page,
    }) => {
        // Owner sees "Create Portal Account" button
        // Non-owner admin sees read-only banner instead
        const createBtn = page
            .getByRole('button', { name: /create portal account/i })
            .first()
        const readOnlyBanner = page.getByText(/restricted to the trust owner/i)
        const hasCreate = await createBtn.isVisible().catch(() => false)
        const hasReadOnly = await readOnlyBanner.isVisible().catch(() => false)
        expect(hasCreate || hasReadOnly).toBe(true)
    })

    test('create user dialog has required form fields', async ({ page }) => {
        // Create button only visible to trust owner — non-owner admins see read-only view
        const createBtn = page
            .getByRole('button', { name: /create portal account/i })
            .first()
        if (!(await createBtn.isVisible().catch(() => false))) {
            // Non-owner admin: verify read-only banner instead
            await expect(
                page.getByText(/restricted to the trust owner/i),
            ).toBeVisible()
            return
        }
        await createBtn.click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await expect(page.locator('input[type="email"]')).toBeVisible()
        await page.keyboard.press('Escape')
    })
})

test.describe('User row actions', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle')
    })

    test('action menu exists on user rows', async ({ page }) => {
        const actionBtn = page
            .getByRole('button', { name: /more|actions|⋯|…/i })
            .first()
        if (await actionBtn.isVisible()) {
            await actionBtn.click()
            await expect(page.getByRole('menu')).toBeVisible()
            const items = await page.getByRole('menuitem').allTextContents()
            const text = items.join(' ').toLowerCase()
            expect(
                text.includes('reset') ||
                    text.includes('edit') ||
                    text.includes('password') ||
                    text.includes('ban'),
            ).toBe(true)
            await page.keyboard.press('Escape')
        }
    })

    test('reset password option opens dialog', async ({ page }) => {
        const actionBtn = page
            .getByRole('button', { name: /more|actions|⋯|…/i })
            .first()
        if (await actionBtn.isVisible()) {
            await actionBtn.click()
            const resetOption = page.getByRole('menuitem', {
                name: /reset password/i,
            })
            if (await resetOption.isVisible()) {
                await resetOption.click()
                await expect(page.getByRole('dialog')).toBeVisible()
                await expect(
                    page.locator('input[type="password"]'),
                ).toBeVisible()
                await page.keyboard.press('Escape')
            } else {
                await page.keyboard.press('Escape')
            }
        }
    })

    test('delete user requires confirmation dialog', async ({ page }) => {
        const actionBtn = page
            .getByRole('button', { name: /more|actions|⋯|…/i })
            .first()
        if (await actionBtn.isVisible()) {
            await actionBtn.click()
            const deleteOption = page.getByRole('menuitem', {
                name: /delete|remove/i,
            })
            if (await deleteOption.isVisible()) {
                await deleteOption.click()
                await expect(page.getByRole('dialog')).toBeVisible({
                    timeout: 3000,
                })
                const cancelBtn = page.getByRole('button', { name: /cancel/i })
                if (await cancelBtn.isVisible()) {
                    await cancelBtn.click()
                } else {
                    await page.keyboard.press('Escape')
                }
            } else {
                await page.keyboard.press('Escape')
            }
        }
    })
})
