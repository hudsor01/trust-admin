import path from 'node:path'
import { test as setup } from '@playwright/test'

export const ADMIN_AUTH_FILE = path.join(
    process.cwd(),
    'playwright/.auth/admin.json',
)

setup('authenticate as admin', async ({ page }) => {
    const email = process.env.TEST_ADMIN_EMAIL
    const password = process.env.TEST_ADMIN_PASSWORD
    if (!email || !password) {
        throw new Error(
            'TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in .env',
        )
    }

    await page.goto('/auth/sign-in')
    await page.waitForSelector('form', { timeout: 10000 })

    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 })

    await page.context().storageState({ path: ADMIN_AUTH_FILE })
    console.log('Admin auth state saved to', ADMIN_AUTH_FILE)
})
