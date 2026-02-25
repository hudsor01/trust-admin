import { defineConfig, devices } from '@playwright/test'

/**
 * E2E test config.
 * Run: bun run test:e2e
 * Requires: dev server running on :3000 (bun run dev)
 * Auth credentials: TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD,
 *   TEST_BENEFICIARY_EMAIL, TEST_BENEFICIARY_PASSWORD in .env
 */
export default defineConfig({
    globalSetup: './tests/e2e/global-setup.ts',
    testDir: './tests/e2e',
    testMatch: '**/*.e2e.ts',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: process.env.CI
        ? 'github'
        : [
              ['list'],
              ['html', { outputFolder: 'playwright-report', open: 'never' }],
          ],
    use: {
        baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'setup-admin',
            testMatch: '**/setup/admin.setup.ts',
        },
        {
            name: 'setup-beneficiary',
            testMatch: '**/setup/beneficiary.setup.ts',
        },
        {
            name: 'admin',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/admin.json',
            },
            dependencies: ['setup-admin'],
            // Ignore portal, setup, and auth flow tests (auth tests need unauthenticated context)
            testIgnore: [
                '**/portal/**',
                '**/setup/**',
                '**/auth/**',
                'auth.e2e.ts',
            ],
        },
        {
            name: 'beneficiary',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/beneficiary.json',
            },
            dependencies: ['setup-beneficiary'],
            testMatch: '**/portal/**/*.e2e.ts',
        },
        {
            name: 'unauthenticated',
            use: { ...devices['Desktop Chrome'] },
            testMatch: ['**/auth/**/*.e2e.ts', 'auth.e2e.ts'],
        },
    ],
    outputDir: 'playwright-results',
})
