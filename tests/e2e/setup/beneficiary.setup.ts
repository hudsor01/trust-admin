import path from 'node:path'
import { test as setup } from '@playwright/test'
import {
    E2E_BENEFICIARY_EMAIL,
    E2E_BENEFICIARY_PASSWORD,
} from '../global-setup'

export const BENEFICIARY_AUTH_FILE = path.join(
    process.cwd(),
    'playwright/.auth/beneficiary.json',
)

setup('authenticate as beneficiary', async ({ page }) => {
    await page.goto('/auth/sign-in')
    await page.waitForSelector('form', { timeout: 10000 })

    await page.fill('input[type="email"]', E2E_BENEFICIARY_EMAIL)
    await page.fill('input[type="password"]', E2E_BENEFICIARY_PASSWORD)
    await page.click('button[type="submit"]')

    // Beneficiary lands on /portal (may redirect to /portal/change-password if forcePasswordChange)
    await page.waitForURL(/\/portal/, { timeout: 15000 })

    await page.context().storageState({ path: BENEFICIARY_AUTH_FILE })
    console.log('Beneficiary auth state saved to', BENEFICIARY_AUTH_FILE)
})
