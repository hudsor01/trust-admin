import path from 'node:path'
import { test as setup } from '@playwright/test'
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from '../global-setup'

export const ADMIN_AUTH_FILE = path.join(
    process.cwd(),
    'playwright/.auth/admin.json',
)

setup('authenticate as admin', async ({ page }) => {
    await page.goto('/auth/sign-in')
    await page.waitForSelector('form', { timeout: 10000 })

    await page.fill('input[type="email"]', E2E_ADMIN_EMAIL)
    await page.fill('input[type="password"]', E2E_ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 })

    await page.context().storageState({ path: ADMIN_AUTH_FILE })
    console.log('Admin auth state saved to', ADMIN_AUTH_FILE)
})
