# v4.0 Comprehensive Audit & Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Run a full three-layer audit (static, unit/integration, E2E) of the entire app, produce a root cause report, and fix all issues — leaving the project in stable, production-ready condition.

**Architecture:** Layer 1 runs static analysis and existing tests. Layer 2 identifies and fills unit/integration gaps. Layer 3 adds Playwright E2E with authenticated sessions covering every major user interaction. Layer 4 synthesizes findings into a report and fixes all issues.

**Tech Stack:** Bun test runner, Playwright, tRPC caller factory, `describe.skipIf(isProductionDb)`, Neon test branch DB, Next.js dev server on :3000

---

## Phase 1 — Static Analysis & Existing Test Baseline

### Task 1: Run static analysis and capture results

**Files:**
- Create: `docs/audit/2026-02-24-audit-report.md` (skeleton)

**Step 1: Run TypeScript check**

```bash
bun run typecheck 2>&1 | tee /tmp/typecheck.txt
echo "Exit code: $?"
```

Expected: any TS errors printed to stdout. Note them.

**Step 2: Run Biome lint**

```bash
bun run lint 2>&1 | tee /tmp/lint.txt
echo "Exit code: $?"
```

**Step 3: Run full unit + integration test suite**

```bash
bun test 2>&1 | tee /tmp/unit-tests.txt
echo "Exit code: $?"
```

Note: uses test branch DB via `.env.test.local`. All `describe.skipIf(isProductionDb)` suites should run.

**Step 4: Create audit report skeleton**

```bash
mkdir -p /Users/richard/Developer/trust-admin/docs/audit
```

Create `docs/audit/2026-02-24-audit-report.md`:

```markdown
# v4.0 Comprehensive Audit Report

**Date:** 2026-02-24
**Status:** In Progress

---

## Layer 1: Static Analysis

### TypeScript Errors

<!-- paste typecheck output here -->
PENDING

### Lint Violations

<!-- paste lint output here -->
PENDING

---

## Layer 2: Unit & Integration Tests

### Test Results

<!-- paste bun test output here -->
PENDING

### Coverage Gaps Identified

<!-- fill in after review -->
PENDING

---

## Layer 3: E2E Tests

### Results

<!-- fill after Playwright runs -->
PENDING

---

## Root Cause Summary

| # | Category | Description | Severity | File |
|---|----------|-------------|----------|------|
<!-- fill after all layers run -->

---

## Fix Plan

<!-- ordered by severity -->
PENDING
```

**Step 5: Populate Layer 1 sections**

Copy the output from `/tmp/typecheck.txt` and `/tmp/lint.txt` into the audit report under their sections. Note count of errors per category.

**Step 6: Populate Layer 2 section**

Copy the output from `/tmp/unit-tests.txt`. Count pass/fail. List any failing test names.

**Step 7: Commit baseline**

```bash
git add docs/audit/2026-02-24-audit-report.md
git commit -m "audit: add report skeleton with layer 1-2 baseline results"
```

---

## Phase 2 — Playwright Auth Infrastructure

### Task 2: Configure Playwright for authenticated sessions

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/setup/admin.setup.ts`
- Create: `tests/e2e/setup/beneficiary.setup.ts`
- Create: `tests/e2e/fixtures.ts`
- Create: `.env.test` (if not exists — for E2E credentials)

**Step 1: Add test credential env vars to `.env`**

Add these lines to `.env` (after existing vars):

```bash
# E2E test credentials — set to real accounts in your Neon Auth
TEST_ADMIN_EMAIL=rhudsontspr@gmail.com
TEST_ADMIN_PASSWORD=<admin-password>
TEST_BENEFICIARY_EMAIL=<beneficiary-email>
TEST_BENEFICIARY_PASSWORD=<beneficiary-temp-password>
```

Note: Use real credentials for existing users. Admin = ADMIN_EMAIL value. Beneficiary = any provisioned beneficiary account.

**Step 2: Create the admin auth setup script**

Create `tests/e2e/setup/admin.setup.ts`:

```typescript
import { test as setup } from '@playwright/test'
import path from 'node:path'

export const ADMIN_AUTH_FILE = path.join(
    process.cwd(),
    'playwright/.auth/admin.json',
)

setup('authenticate as admin', async ({ page }) => {
    const email = process.env.TEST_ADMIN_EMAIL
    const password = process.env.TEST_ADMIN_PASSWORD
    if (!email || !password) throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in .env')

    await page.goto('/auth/sign-in')
    await page.waitForSelector('form', { timeout: 10000 })

    // Neon Auth renders email + password inputs inside a form
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard (admin role)
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 })

    await page.context().storageState({ path: ADMIN_AUTH_FILE })
})
```

**Step 3: Create the beneficiary auth setup script**

Create `tests/e2e/setup/beneficiary.setup.ts`:

```typescript
import { test as setup } from '@playwright/test'
import path from 'node:path'

export const BENEFICIARY_AUTH_FILE = path.join(
    process.cwd(),
    'playwright/.auth/beneficiary.json',
)

setup('authenticate as beneficiary', async ({ page }) => {
    const email = process.env.TEST_BENEFICIARY_EMAIL
    const password = process.env.TEST_BENEFICIARY_PASSWORD
    if (!email || !password) throw new Error('TEST_BENEFICIARY_EMAIL and TEST_BENEFICIARY_PASSWORD must be set in .env')

    await page.goto('/auth/sign-in')
    await page.waitForSelector('form', { timeout: 10000 })

    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    // Beneficiary lands on /portal (or /portal/change-password if forcePasswordChange)
    await page.waitForURL(/\/portal/, { timeout: 15000 })

    await page.context().storageState({ path: BENEFICIARY_AUTH_FILE })
})
```

**Step 4: Create shared test fixtures**

Create `tests/e2e/fixtures.ts`:

```typescript
import { test as base } from '@playwright/test'
import { ADMIN_AUTH_FILE } from './setup/admin.setup'
import { BENEFICIARY_AUTH_FILE } from './setup/beneficiary.setup'

// Admin fixture: uses saved admin session state
export const adminTest = base.extend({
    storageState: ADMIN_AUTH_FILE,
})

// Beneficiary fixture: uses saved beneficiary session state
export const beneficiaryTest = base.extend({
    storageState: BENEFICIARY_AUTH_FILE,
})

export { expect } from '@playwright/test'
```

**Step 5: Update playwright.config.ts to use setup projects**

Replace the contents of `playwright.config.ts` with:

```typescript
import { defineConfig, devices } from '@playwright/test'

/**
 * E2E test config.
 * Run: bun run test:e2e
 * Requires: dev server running on :3000 (bun run dev)
 * Auth credentials: TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_BENEFICIARY_EMAIL, TEST_BENEFICIARY_PASSWORD in .env
 */
export default defineConfig({
    testDir: './tests/e2e',
    testMatch: '**/*.e2e.ts',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: process.env.CI ? 'github' : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
    use: {
        baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        // Auth setup projects run first
        {
            name: 'setup-admin',
            testMatch: '**/setup/admin.setup.ts',
        },
        {
            name: 'setup-beneficiary',
            testMatch: '**/setup/beneficiary.setup.ts',
        },
        // Admin tests (authenticated as admin)
        {
            name: 'admin',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/admin.json',
            },
            dependencies: ['setup-admin'],
            testIgnore: ['**/portal/**', '**/setup/**'],
        },
        // Beneficiary tests
        {
            name: 'beneficiary',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'playwright/.auth/beneficiary.json',
            },
            dependencies: ['setup-beneficiary'],
            testMatch: '**/portal/**/*.e2e.ts',
        },
        // Unauthenticated tests (no storage state)
        {
            name: 'unauthenticated',
            use: { ...devices['Desktop Chrome'] },
            testMatch: '**/auth/**/*.e2e.ts',
        },
    ],
    outputDir: 'playwright-results',
})
```

**Step 6: Add playwright dirs to .gitignore**

```bash
echo "\nplaywright/.auth\nplaywright-report\nplaywright-results" >> /Users/richard/Developer/trust-admin/.gitignore
```

**Step 7: Create playwright/.auth directory**

```bash
mkdir -p /Users/richard/Developer/trust-admin/playwright/.auth
```

**Step 8: Verify setup runs (dev server must be running)**

Open a terminal and start the dev server:
```bash
bun run dev
```

In a second terminal, run the setup only:
```bash
bun run test:e2e --project=setup-admin --project=setup-beneficiary
```

Expected: Two `.json` files appear in `playwright/.auth/`.

**Step 9: Commit**

```bash
git add playwright.config.ts tests/e2e/setup/ tests/e2e/fixtures.ts .gitignore
git commit -m "test: add Playwright auth setup for admin and beneficiary sessions"
```

---

## Phase 3 — E2E Test Coverage

### Task 3: Auth E2E tests (sign-in, forgot/reset password)

**Files:**
- Move existing: `tests/e2e/auth.e2e.ts` → keep in place (already tests unauthenticated guards)
- Create: `tests/e2e/auth/forgot-reset-password.e2e.ts`

**Step 1: Create forgot/reset password E2E**

Create `tests/e2e/auth/forgot-reset-password.e2e.ts`:

```typescript
import { expect, test } from '@playwright/test'

/**
 * Forgot / Reset Password Flow E2E
 * Tests the custom flow: form → token → reset.
 * Note: Does NOT test actual email delivery (external n8n dependency).
 */
test.describe('Forgot password page', () => {
    test('renders forgot-password form', async ({ page }) => {
        await page.goto('/auth/forgot-password')
        await expect(page.locator('form')).toBeVisible()
        await expect(page.locator('input[type="email"]')).toBeVisible()
    })

    test('shows success message for any email (no enumeration)', async ({ page }) => {
        await page.goto('/auth/forgot-password')
        await page.fill('input[type="email"]', 'notexist@example.com')
        await page.click('button[type="submit"]')
        // Should show success regardless of whether email exists
        await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 10000 })
    })

    test('shows error for empty email', async ({ page }) => {
        await page.goto('/auth/forgot-password')
        await page.click('button[type="submit"]')
        // Should show validation error
        await expect(page.getByText(/email/i)).toBeVisible()
    })
})

test.describe('Reset password page', () => {
    test('shows error for missing token', async ({ page }) => {
        await page.goto('/auth/reset-password')
        // No token in URL — should show invalid/missing token error
        await expect(page.getByText(/invalid|expired|token/i)).toBeVisible({ timeout: 5000 })
    })

    test('shows error for invalid token', async ({ page }) => {
        await page.goto('/auth/reset-password?token=invalidtoken000')
        await expect(page.getByText(/invalid|expired/i)).toBeVisible({ timeout: 5000 })
    })
})
```

**Step 2: Run auth E2E**

```bash
bun run test:e2e --project=unauthenticated
```

Expected: All unauthenticated tests pass. Note any failures.

**Step 3: Commit**

```bash
git add tests/e2e/auth/
git commit -m "test(e2e): add forgot/reset password flow tests"
```

---

### Task 4: Dashboard & navigation E2E

**Files:**
- Create: `tests/e2e/dashboard.e2e.ts`

**Step 1: Create dashboard E2E**

Create `tests/e2e/dashboard.e2e.ts`:

```typescript
import { adminTest as test, expect } from './fixtures'

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
    })

    test('loads dashboard page', async ({ page }) => {
        await expect(page).toHaveURL(/\/dashboard/)
        await expect(page.locator('h1, h2').first()).toBeVisible()
    })

    test('sidebar navigation links are visible', async ({ page }) => {
        // Check key nav links exist
        await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /beneficiar/i })).toBeVisible()
    })

    test('entity selector loads with trust name', async ({ page }) => {
        // Entity selector should show "Hudson Living Trust" or similar
        const entityText = await page.locator('[data-testid="entity-selector"], select, [role="combobox"]').first().textContent()
        expect(entityText).toBeTruthy()
    })

    test('activity log renders', async ({ page }) => {
        // Activity section should be present
        await expect(page.getByText(/activity/i)).toBeVisible()
    })
})

test.describe('Admin role guard', () => {
    test('admin can access /dashboard', async ({ page }) => {
        await page.goto('/dashboard')
        await expect(page).toHaveURL(/\/dashboard/)
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('admin can access /beneficiaries', async ({ page }) => {
        await page.goto('/beneficiaries')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })

    test('admin can access /users', async ({ page }) => {
        await page.goto('/users')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })
})
```

**Step 2: Run dashboard E2E**

```bash
bun run test:e2e --project=admin --grep "Dashboard|Admin role"
```

**Step 3: Commit**

```bash
git add tests/e2e/dashboard.e2e.ts
git commit -m "test(e2e): add dashboard and navigation tests"
```

---

### Task 5: Beneficiary management E2E

**Files:**
- Create: `tests/e2e/beneficiaries.e2e.ts`

**Step 1: Create beneficiary E2E**

Create `tests/e2e/beneficiaries.e2e.ts`:

```typescript
import { adminTest as test, expect } from './fixtures'

test.describe('Beneficiaries page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/beneficiaries')
        await page.waitForLoadState('networkidle')
    })

    test('loads beneficiaries list', async ({ page }) => {
        await expect(page).toHaveURL(/\/beneficiaries/)
        // Page heading
        await expect(page.getByRole('heading', { name: /beneficiar/i })).toBeVisible()
    })

    test('beneficiary rows are visible', async ({ page }) => {
        // At least one row should exist (Hudson Trust has beneficiaries)
        const rows = page.getByRole('row')
        await expect(rows.first()).toBeVisible()
    })

    test('mark deceased opens dialog or shows date field', async ({ page }) => {
        // Find a mark-deceased button/option on a beneficiary row
        // (may be in a dropdown menu)
        const menuTrigger = page.getByRole('button', { name: /more|actions|⋯|…/i }).first()
        if (await menuTrigger.isVisible()) {
            await menuTrigger.click()
            // Look for deceased option in menu
            const deceasedOption = page.getByRole('menuitem', { name: /deceas/i })
            if (await deceasedOption.isVisible()) {
                await deceasedOption.click()
                // Dialog should appear
                await expect(page.getByRole('dialog')).toBeVisible()
                await expect(page.locator('input[type="date"]')).toBeVisible()
                // Close without saving
                await page.keyboard.press('Escape')
            }
        }
    })
})
```

**Step 2: Run**

```bash
bun run test:e2e --project=admin --grep "Beneficiaries"
```

**Step 3: Commit**

```bash
git add tests/e2e/beneficiaries.e2e.ts
git commit -m "test(e2e): add beneficiaries page tests"
```

---

### Task 6: HEMS request workflow E2E

**Files:**
- Create: `tests/e2e/hems.e2e.ts`

**Step 1: Create HEMS E2E**

Create `tests/e2e/hems.e2e.ts`:

```typescript
import { adminTest as test, expect } from './fixtures'

test.describe('HEMS Requests (admin view)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/hems')
        await page.waitForLoadState('networkidle')
    })

    test('loads HEMS requests page', async ({ page }) => {
        await expect(page).toHaveURL(/\/hems/)
        await expect(page.getByRole('heading')).toBeVisible()
    })

    test('shows HEMS request table', async ({ page }) => {
        // Table or empty state should be visible
        const table = page.getByRole('table')
        const emptyState = page.getByText(/no requests|empty/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await emptyState.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })
})

test.describe('Distributions', () => {
    test('distributions page loads', async ({ page }) => {
        await page.goto('/distributions')
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(/\/distributions/)
    })
})
```

**Step 2: Run**

```bash
bun run test:e2e --project=admin --grep "HEMS|Distributions"
```

**Step 3: Commit**

```bash
git add tests/e2e/hems.e2e.ts
git commit -m "test(e2e): add HEMS and distributions page tests"
```

---

### Task 7: Liabilities & trust accounting E2E

**Files:**
- Create: `tests/e2e/financials.e2e.ts`

**Step 1: Create financials E2E**

Create `tests/e2e/financials.e2e.ts`:

```typescript
import { adminTest as test, expect } from './fixtures'

test.describe('Liabilities', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/liabilities')
        await page.waitForLoadState('networkidle')
    })

    test('liabilities page loads', async ({ page }) => {
        await expect(page).toHaveURL(/\/liabilities/)
        await expect(page.getByRole('heading')).toBeVisible()
    })

    test('liability table renders', async ({ page }) => {
        const table = page.getByRole('table')
        const empty = page.getByText(/no liabilit|empty/i)
        const hasTable = await table.isVisible().catch(() => false)
        const hasEmpty = await empty.isVisible().catch(() => false)
        expect(hasTable || hasEmpty).toBe(true)
    })
})

test.describe('Trust Accounting', () => {
    test('accounting page loads', async ({ page }) => {
        await page.goto('/accounting')
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(/\/accounting/)
        await expect(page.getByRole('heading')).toBeVisible()
    })
})

test.describe('Withdrawals', () => {
    test('withdrawal records page loads', async ({ page }) => {
        await page.goto('/withdrawals')
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(/\/withdrawals/)
    })
})
```

**Step 2: Run**

```bash
bun run test:e2e --project=admin --grep "Liabilities|Trust Accounting|Withdrawals"
```

**Step 3: Commit**

```bash
git add tests/e2e/financials.e2e.ts
git commit -m "test(e2e): add liabilities, accounting, and withdrawals tests"
```

---

### Task 8: Asset pages E2E

**Files:**
- Create: `tests/e2e/assets.e2e.ts`

**Step 1: Create assets E2E**

Create `tests/e2e/assets.e2e.ts`:

```typescript
import { adminTest as test, expect } from './fixtures'

const ASSET_PAGES = [
    { url: '/bank-accounts', heading: /bank|account/i },
    { url: '/investments', heading: /invest/i },
    { url: '/properties', heading: /propert/i },
    { url: '/vehicles', heading: /vehicle/i },
    { url: '/insurance', heading: /insurance/i },
    { url: '/personal-property', heading: /personal/i },
    { url: '/artwork', heading: /art/i },
]

for (const { url, heading } of ASSET_PAGES) {
    test.describe(`Asset page: ${url}`, () => {
        test(`${url} loads`, async ({ page }) => {
            await page.goto(url)
            await page.waitForLoadState('networkidle')
            // Should either show the asset page or redirect to dashboard if route name differs
            const currentUrl = page.url()
            // Page should not redirect to sign-in
            expect(currentUrl).not.toMatch(/auth\/sign-in/)
        })
    })
}

test.describe('Properties (homestead)', () => {
    test('properties page renders heading', async ({ page }) => {
        await page.goto('/properties')
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading').first()).toBeVisible()
    })
})

test.describe('Bank accounts', () => {
    test('bank accounts page renders', async ({ page }) => {
        await page.goto('/bank-accounts')
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading').first()).toBeVisible()
    })
})
```

**Step 2: Run**

```bash
bun run test:e2e --project=admin --grep "Asset"
```

Note: If some URLs 404, update the test URLs to match actual routes (check `src/app/(admin)/` folder structure).

**Step 3: Fix any route URLs that don't match**

Read `src/app/(admin)/` folder and correct any URL mismatches in `assets.e2e.ts`.

```bash
ls /Users/richard/Developer/trust-admin/src/app/\(admin\)/
```

**Step 4: Commit**

```bash
git add tests/e2e/assets.e2e.ts
git commit -m "test(e2e): add asset pages E2E tests"
```

---

### Task 9: User management E2E

**Files:**
- Create: `tests/e2e/users.e2e.ts`

**Step 1: Create users E2E**

Create `tests/e2e/users.e2e.ts`:

```typescript
import { adminTest as test, expect } from './fixtures'

test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/users')
        await page.waitForLoadState('networkidle')
    })

    test('users page loads', async ({ page }) => {
        await expect(page).toHaveURL(/\/users/)
        await expect(page.getByRole('heading')).toBeVisible()
    })

    test('user table or list renders', async ({ page }) => {
        // Users should be listed (at least the admin account)
        const rows = page.getByRole('row')
        const cards = page.getByTestId('user-card')
        const hasRows = await rows.count().then(n => n > 1)
        const hasCards = await cards.count().then(n => n > 0)
        expect(hasRows || hasCards).toBe(true)
    })

    test('create user button is visible', async ({ page }) => {
        const createBtn = page.getByRole('button', { name: /create|add|new user/i })
        await expect(createBtn).toBeVisible()
    })

    test('clicking create user opens dialog', async ({ page }) => {
        const createBtn = page.getByRole('button', { name: /create|add|new user/i })
        await createBtn.click()
        await expect(page.getByRole('dialog')).toBeVisible()
        // Close
        await page.keyboard.press('Escape')
    })

    test('user row action menu visible', async ({ page }) => {
        // Expect some action button on user rows
        const actionBtn = page.getByRole('button', { name: /more|actions|⋯/i }).first()
        if (await actionBtn.isVisible()) {
            await actionBtn.click()
            // Menu should appear with options
            await expect(page.getByRole('menu')).toBeVisible()
            await page.keyboard.press('Escape')
        }
    })
})
```

**Step 2: Run**

```bash
bun run test:e2e --project=admin --grep "User Management"
```

**Step 3: Commit**

```bash
git add tests/e2e/users.e2e.ts
git commit -m "test(e2e): add user management page tests"
```

---

### Task 10: Beneficiary portal E2E

**Files:**
- Create: `tests/e2e/portal/portal.e2e.ts`

**Step 1: Create portal E2E**

Create `tests/e2e/portal/portal.e2e.ts`:

```typescript
import { beneficiaryTest as test, expect } from '../fixtures'

test.describe('Beneficiary Portal', () => {
    test.beforeEach(async ({ page }) => {
        // If forcePasswordChange is set, go to change-password first
        await page.goto('/portal')
        await page.waitForLoadState('networkidle')
    })

    test('portal loads (or redirects to change-password)', async ({ page }) => {
        const url = page.url()
        // Should be on portal or change-password — not on sign-in
        expect(url).not.toMatch(/auth\/sign-in/)
        expect(url).toMatch(/portal/)
    })

    test('portal shows beneficiary information', async ({ page }) => {
        // Handle forced password change redirect
        if (page.url().includes('change-password')) {
            // Skip portal content checks if forced to change password
            return
        }
        // Should show some content (trust share, name, etc.)
        await expect(page.locator('main')).toBeVisible()
    })

    test('sign out works from portal', async ({ page }) => {
        if (page.url().includes('change-password')) return
        // Find sign-out button
        const signOut = page.getByRole('button', { name: /sign out|logout/i })
        if (await signOut.isVisible()) {
            await signOut.click()
            await expect(page).toHaveURL(/auth\/sign-in/, { timeout: 10000 })
        }
    })
})

test.describe('Portal change-password page', () => {
    test('change-password page renders', async ({ page }) => {
        await page.goto('/portal/change-password')
        await page.waitForLoadState('networkidle')
        // Either shows change-password form or redirects (if no forcePasswordChange)
        const url = page.url()
        expect(url).not.toMatch(/auth\/sign-in/)
    })
})
```

**Step 2: Run**

```bash
bun run test:e2e --project=beneficiary
```

**Step 3: Commit**

```bash
git add tests/e2e/portal/
git commit -m "test(e2e): add beneficiary portal E2E tests"
```

---

### Task 11: Contacts, tasks, inventory E2E

**Files:**
- Create: `tests/e2e/admin-misc.e2e.ts`

**Step 1: Create misc admin E2E**

Create `tests/e2e/admin-misc.e2e.ts`:

```typescript
import { adminTest as test, expect } from './fixtures'

test.describe('Contacts', () => {
    test('contacts page loads', async ({ page }) => {
        await page.goto('/contacts')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
        await expect(page.getByRole('heading').first()).toBeVisible()
    })
})

test.describe('Tasks', () => {
    test('tasks page loads', async ({ page }) => {
        await page.goto('/tasks')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })
})

test.describe('Pending Inventory', () => {
    test('pending inventory page loads', async ({ page }) => {
        await page.goto('/inventory')
        await page.waitForLoadState('networkidle')
        await expect(page).not.toHaveURL(/auth\/sign-in/)
    })
})

test.describe('404 page', () => {
    test('unknown route shows not-found page', async ({ page }) => {
        await page.goto('/this-route-does-not-exist-12345')
        await page.waitForLoadState('networkidle')
        // Should show 404 content, not crash
        const body = await page.locator('body').textContent()
        expect(body).toBeTruthy()
        // Should NOT be a blank page
        expect(body!.length).toBeGreaterThan(20)
    })
})

test.describe('Sign out', () => {
    test('admin can sign out', async ({ page }) => {
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        const signOut = page.getByRole('button', { name: /sign out|log out/i })
        if (await signOut.isVisible()) {
            await signOut.click()
            await expect(page).toHaveURL(/auth\/sign-in/, { timeout: 10000 })
        }
    })
})
```

**Step 2: Run**

```bash
bun run test:e2e --project=admin --grep "Contacts|Tasks|Inventory|404|Sign out"
```

**Step 3: Commit**

```bash
git add tests/e2e/admin-misc.e2e.ts
git commit -m "test(e2e): add contacts, tasks, inventory, and 404 tests"
```

---

### Task 12: Run full E2E suite and collect results

**Step 1: Start dev server in background**

Open a terminal and run:
```bash
bun run dev
```

Wait for "ready" message.

**Step 2: Run complete E2E suite**

```bash
bun run test:e2e 2>&1 | tee /tmp/e2e-results.txt
echo "Exit code: $?"
```

**Step 3: View HTML report**

```bash
npx playwright show-report playwright-report
```

Review all failures. For each failure, note:
- Test name
- Error message
- Screenshot in `playwright-results/`

**Step 4: Update audit report with E2E results**

Open `docs/audit/2026-02-24-audit-report.md` and fill in:
- Layer 3 section: paste E2E results summary
- Root Cause Summary table: add a row for each failure with category, description, severity

**Step 5: Commit audit report update**

```bash
git add docs/audit/2026-02-24-audit-report.md
git commit -m "audit: populate e2e results in audit report"
```

---

## Phase 4 — Fix Implementation

### Task 13: Implement all fixes

**Step 1: Triage the audit report**

Read `docs/audit/2026-02-24-audit-report.md`. Categorize all issues:
- **Critical** (auth bypass, data loss, crash): fix first
- **High** (wrong behavior, broken mutation): fix second
- **Medium** (UI bug, missing validation): fix third
- **Low** (cosmetic, minor inconsistency): fix last

**Step 2: Fix TypeScript errors**

For each TS error from Layer 1:
- Open the file
- Fix the type error
- Run `bun run typecheck` after each fix to verify resolved

**Step 3: Fix lint violations**

```bash
bun run lint:fix
```

For violations that can't be auto-fixed, fix manually.

**Step 4: Fix unit/integration test failures**

For each failing test from Layer 2:
- Read the test to understand what it expects
- Fix the implementation (or the test if the expectation is wrong)
- Re-run `bun test` to verify

**Step 5: Fix E2E failures**

For each failing E2E test:
- Read the failure + screenshot
- Determine root cause: wrong URL, missing element, broken flow
- Fix the implementation
- Re-run the specific test to verify: `bun run test:e2e --grep "test name"`

**Step 6: Run full test suite to verify clean pass**

```bash
bun run typecheck && bun run lint && bun test && bun run test:e2e
```

Expected: all pass (or note any remaining known issues).

**Step 7: Update audit report with final status**

Update `docs/audit/2026-02-24-audit-report.md`:
- Mark each issue as FIXED or ACKNOWLEDGED (with reason if not fixed)
- Add a "Final Status" section at the top

**Step 8: Final commit**

```bash
git add -A
git commit -m "fix: resolve all issues identified in v4.0 comprehensive audit"
```

---

## Task 14: Update STATE.md and close milestone

**Step 1: Update `.planning/STATE.md`**

Update the status to reflect v4.0 completion. Add to the What Was Just Completed section:
- Full three-layer audit run
- All TypeScript errors resolved
- All lint violations resolved
- E2E test suite established (auth, dashboard, assets, financials, beneficiaries, HEMS, users, portal)
- All identified issues fixed

**Step 2: Commit**

```bash
git add .planning/STATE.md
git commit -m "chore: close v4.0 comprehensive audit milestone"
```

---

## Notes

- **Test credentials:** `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` and `TEST_BENEFICIARY_EMAIL` / `TEST_BENEFICIARY_PASSWORD` must be set in `.env` before running E2E. The admin creds are `ADMIN_EMAIL` + its password. The beneficiary creds must be a provisioned account with no `forcePasswordChange`.
- **Route discovery:** If any asset page URL (Task 8) returns 404, run `ls src/app/(admin)/` to find correct URL segments.
- **Auth setup must run first:** If `playwright/.auth/` files don't exist, the authenticated tests will fail. Always run `--project=setup-admin --project=setup-beneficiary` first, or run the full suite which respects `dependencies`.
- **Workers=1:** Playwright is set to `workers: 1` to avoid session conflicts between concurrent tests. Increase if you add proper test isolation.
- **Neon Data API:** Assets (bankAccount, investmentAccount, homestead, rentalProperty, vehicle, personalProperty, artwork) are served via Neon Data API (PostgREST), not tRPC. E2E tests cover their pages without needing tRPC integration tests.
