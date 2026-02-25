import path from 'node:path'
import { test as setup } from '@playwright/test'

export const BENEFICIARY_AUTH_FILE = path.join(
    process.cwd(),
    'playwright/.auth/beneficiary.json',
)

setup('authenticate as beneficiary', async ({ page }) => {
    const email = process.env.TEST_BENEFICIARY_EMAIL
    const password = process.env.TEST_BENEFICIARY_PASSWORD
    if (!email || !password) {
        throw new Error(
            'TEST_BENEFICIARY_EMAIL and TEST_BENEFICIARY_PASSWORD must be set in .env',
        )
    }

    await page.goto('/auth/sign-in')
    await page.waitForSelector('form', { timeout: 10000 })

    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/portal/, { timeout: 15000 })

    await page.context().storageState({ path: BENEFICIARY_AUTH_FILE })
    console.log('Beneficiary auth state saved to', BENEFICIARY_AUTH_FILE)
})
