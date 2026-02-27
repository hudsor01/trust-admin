import { expect, adminTest as test } from './fixtures'

/**
 * Dashboard & Navigation E2E Tests
 * Run: bun run test:e2e --project=admin --grep "Dashboard"
 */
test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        // Wait for data to load (spinner disappears, content renders)
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)
    })

    test('loads without redirect to sign-in', async ({ page }) => {
        await expect(page).toHaveURL(/\/dashboard/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('page has a heading', async ({ page }) => {
        await expect(page.getByRole('heading').first()).toBeVisible({
            timeout: 15000,
        })
    })

    test('sidebar navigation is visible', async ({ page }) => {
        await expect(page.getByRole('navigation')).toBeVisible({
            timeout: 15000,
        })
    })

    test('beneficiaries nav link exists', async ({ page }) => {
        await expect(
            page.getByRole('link', { name: /beneficiar/i }).first(),
        ).toBeVisible()
    })

    test('activity section is present', async ({ page }) => {
        await expect(page.getByText(/activity/i).first()).toBeVisible()
    })
})

test.describe('Admin role guard', () => {
    const protectedRoutes = [
        '/dashboard',
        '/beneficiaries',
        '/users',
        '/liabilities',
        '/accounting',
        '/contacts',
        '/properties',
        '/vehicles',
        '/accounts',
    ]

    for (const route of protectedRoutes) {
        test(`admin can access ${route}`, async ({ page }) => {
            await page.goto(route)
            await page.waitForLoadState('networkidle')
            await expect(page).not.toHaveURL(/auth\/sign-in/)
        })
    }
})

test.describe('Sign out', () => {
    test('sign out button navigates to sign-in', async ({ page }) => {
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        const signOutBtn = page.getByRole('button', {
            name: /sign out|log out|logout/i,
        })
        if (await signOutBtn.isVisible()) {
            await signOutBtn.click()
            await expect(page).toHaveURL(/auth\/sign-in/, { timeout: 10000 })
        } else {
            const userMenu = page
                .getByRole('button', { name: /user|account|avatar|menu/i })
                .first()
            if (await userMenu.isVisible()) {
                await userMenu.click()
                const signOut = page.getByRole('menuitem', {
                    name: /sign out|log out/i,
                })
                if (await signOut.isVisible()) {
                    await signOut.click()
                    await expect(page).toHaveURL(/auth\/sign-in/, {
                        timeout: 10000,
                    })
                }
            }
        }
    })
})
