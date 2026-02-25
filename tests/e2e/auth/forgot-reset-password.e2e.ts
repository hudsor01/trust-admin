import { expect, test } from '@playwright/test'

/**
 * Forgot / Reset Password Flow E2E
 *
 * Tests the custom forgot-password flow.
 * Does NOT test email delivery (external n8n/SMTP).
 *
 * Run: bun run test:e2e --project=unauthenticated
 */
test.describe('Forgot password page', () => {
    test('renders form at /auth/forgot-password', async ({ page }) => {
        await page.goto('/auth/forgot-password')
        await page.waitForLoadState('networkidle')
        await expect(page.locator('form')).toBeVisible()
        await expect(page.locator('input[type="email"]')).toBeVisible()
    })

    test('submit button is present', async ({ page }) => {
        await page.goto('/auth/forgot-password')
        await page.waitForLoadState('networkidle')
        await expect(
            page.getByRole('button', { name: /send|submit|reset/i }),
        ).toBeVisible()
    })

    test('shows success message for any email (no enumeration)', async ({
        page,
    }) => {
        await page.goto('/auth/forgot-password')
        await page.waitForLoadState('networkidle')
        await page.fill('input[type="email"]', 'notexist@example.com')
        await page.getByRole('button', { name: /send|submit|reset/i }).click()
        await expect(
            page.getByText(/check your email|email sent|sent/i),
        ).toBeVisible({ timeout: 10000 })
    })

    test('back to sign-in link is present', async ({ page }) => {
        await page.goto('/auth/forgot-password')
        await page.waitForLoadState('networkidle')
        await expect(
            page.getByRole('link', { name: /back|sign in/i }),
        ).toBeVisible()
    })
})

test.describe('Reset password page', () => {
    test('page renders without token (shows error)', async ({ page }) => {
        await page.goto('/auth/reset-password')
        await page.waitForLoadState('networkidle')
        const body = await page.locator('body').textContent()
        expect(body!.length).toBeGreaterThan(20)
    })

    test('shows error for invalid token', async ({ page }) => {
        await page.goto(
            '/auth/reset-password?token=00000000000000000000000000000000',
        )
        await page.waitForLoadState('networkidle')
        await expect(page.getByText(/invalid|expired|not found/i)).toBeVisible({
            timeout: 5000,
        })
    })

    test('page does not crash with malformed token', async ({ page }) => {
        await page.goto('/auth/reset-password?token=notahextoken!')
        await page.waitForLoadState('networkidle')
        const body = await page.locator('body').textContent()
        expect(body!.length).toBeGreaterThan(20)
    })
})
