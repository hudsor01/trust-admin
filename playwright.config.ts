import { defineConfig, devices } from '@playwright/test'

/**
 * E2E test config.
 * Run: bun run test:e2e
 * CI: requires NEXT_PUBLIC_APP_URL or defaults to localhost:3000
 */
export default defineConfig({
    testDir: './tests/e2e',
    testMatch: '**/*.e2e.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
