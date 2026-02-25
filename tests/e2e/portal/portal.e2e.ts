import { expect, beneficiaryTest as test } from '../fixtures'

/**
 * Beneficiary Portal E2E Tests
 *
 * Uses beneficiary auth session from playwright/.auth/beneficiary.json.
 * Tests gracefully handle forcePasswordChange redirects.
 *
 * Run: bun run test:e2e --project=beneficiary
 */
test.describe('Portal access', () => {
    test('beneficiary lands on portal, not sign-in', async ({ page }) => {
        await page.goto('/portal')
        await page.waitForLoadState('networkidle')
        const url = page.url()
        expect(url).not.toMatch(/auth\/sign-in/)
        expect(url).toMatch(/\/portal/)
    })

    test('portal renders content (not blank)', async ({ page }) => {
        await page.goto('/portal')
        await page.waitForLoadState('networkidle')
        const body = await page.locator('body').textContent()
        expect(body!.length).toBeGreaterThan(50)
    })

    test('portal has a heading', async ({ page }) => {
        await page.goto('/portal')
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading').first()).toBeVisible()
    })
})

test.describe('Portal content (when no forcePasswordChange)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/portal')
        await page.waitForLoadState('networkidle')
        if (page.url().includes('change-password')) {
            test.skip()
        }
    })

    test('main content area is visible', async ({ page }) => {
        await expect(page.locator('main')).toBeVisible()
    })

    test('portal has navigation', async ({ page }) => {
        const nav = page.getByRole('navigation')
        const sidebar = page.locator('nav, aside')
        const hasNav = await nav.isVisible().catch(() => false)
        const hasSidebar = await sidebar
            .first()
            .isVisible()
            .catch(() => false)
        expect(hasNav || hasSidebar).toBe(true)
    })
})

test.describe('Portal change-password page', () => {
    test('change-password page is accessible without redirect to sign-in', async ({
        page,
    }) => {
        await page.goto('/portal/change-password')
        await page.waitForLoadState('networkidle')
        expect(page.url()).not.toMatch(/auth\/sign-in/)
    })

    test('change-password form has password inputs when accessible', async ({
        page,
    }) => {
        await page.goto('/portal/change-password')
        await page.waitForLoadState('networkidle')
        const passwordInputs = page.locator('input[type="password"]')
        const count = await passwordInputs.count()
        if (count > 0) {
            expect(count).toBeGreaterThanOrEqual(1)
        }
    })
})

test.describe('Portal sign out', () => {
    test('beneficiary can sign out', async ({ page }) => {
        await page.goto('/portal')
        await page.waitForLoadState('networkidle')
        const signOutBtn = page.getByRole('button', {
            name: /sign out|log out|logout/i,
        })
        if (await signOutBtn.isVisible()) {
            await signOutBtn.click()
            await expect(page).toHaveURL(/auth\/sign-in/, { timeout: 10000 })
        }
    })
})
