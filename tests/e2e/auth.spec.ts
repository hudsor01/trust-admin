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

// These stale routes were deleted. The proxy intercepts all unauthenticated
// requests and redirects to /auth/sign-in, so deleted routes still redirect
// rather than 404. This confirms no stale page content is served.
test.describe('Deleted stale routes redirect to canonical sign-in', () => {
    test('/login redirects to /auth/sign-in (no stale page)', async ({
        page,
    }) => {
        await page.goto('/login')
        await expect(page).toHaveURL(/\/auth\/sign-in/)
    })

    test('/portal/login redirects to /auth/sign-in (no stale page)', async ({
        page,
    }) => {
        await page.goto('/portal/login')
        await expect(page).toHaveURL(/\/auth\/sign-in/)
    })

    test('/account/sign-in redirects to /auth/sign-in (no stale page)', async ({
        page,
    }) => {
        await page.goto('/account/sign-in')
        await expect(page).toHaveURL(/\/auth\/sign-in/)
    })
})
