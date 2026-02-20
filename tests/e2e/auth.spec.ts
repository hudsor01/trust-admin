/**
 * E2E Auth Guard Tests
 *
 * Verify that unauthenticated users are redirected to sign-in,
 * and that stale routes that were deleted return 404.
 *
 * Run: bun run test:e2e
 * Requires: app running at NEXT_PUBLIC_APP_URL (default: http://localhost:3000)
 */
import { expect, test } from '@playwright/test'

test.describe('Unauthenticated route guards', () => {
    test('/ redirects to /auth/sign-in when not logged in', async ({
        page,
    }) => {
        await page.goto('/')
        await expect(page).toHaveURL(/\/auth\/sign-in/)
    })

    test('/dashboard redirects to /auth/sign-in when not logged in', async ({
        page,
    }) => {
        await page.goto('/dashboard')
        await expect(page).toHaveURL(/\/auth\/sign-in/)
    })

    test('/portal redirects to /auth/sign-in when not logged in', async ({
        page,
    }) => {
        await page.goto('/portal')
        await expect(page).toHaveURL(/\/auth\/sign-in/)
    })

    test('/beneficiaries redirects to /auth/sign-in when not logged in', async ({
        page,
    }) => {
        await page.goto('/beneficiaries')
        await expect(page).toHaveURL(/\/auth\/sign-in/)
    })
})

test.describe('Sign-in page', () => {
    test('loads /auth/sign-in successfully', async ({ page }) => {
        await page.goto('/auth/sign-in')
        await expect(page).toHaveURL(/\/auth\/sign-in/)
        // Neon Auth renders a form element
        await expect(page.locator('form').first()).toBeVisible()
    })
})

test.describe('Deleted stale routes return 404', () => {
    test('/login returns 404', async ({ page }) => {
        const response = await page.goto('/login')
        expect(response?.status()).toBe(404)
    })

    test('/portal/login returns 404', async ({ page }) => {
        const response = await page.goto('/portal/login')
        expect(response?.status()).toBe(404)
    })

    test('/account/sign-in returns 404', async ({ page }) => {
        const response = await page.goto('/account/sign-in')
        expect(response?.status()).toBe(404)
    })
})
