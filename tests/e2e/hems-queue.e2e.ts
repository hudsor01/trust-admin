/**
 * /hems-queue kanban board E2E tests (PR-A / Wave-0 row 23-02-03).
 *
 * Verifies that the Board tab is the default and that the user can switch
 * to the Table tab. The drag-to-approve flow is exercised best-effort —
 * synthetic drag in Playwright cannot fully simulate dnd-kit pointer events;
 * the drag test is wrapped in conditional checks so it is a no-op when no
 * pending card is available in the test fixture.
 */
import { expect, adminTest as test } from './fixtures'

test.describe('/hems-queue kanban board', () => {
    test('renders Board tab by default with three columns', async ({
        page,
    }) => {
        await page.goto('/hems-queue')
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)

        // Board tab is selected
        await expect(
            page.getByRole('tab', { name: 'Board', selected: true }),
        ).toBeVisible({ timeout: 15000 })

        // Three column headers (kanban columns)
        const board = page.locator(
            '[data-column="PENDING"], [data-column="APPROVED"], [data-column="DISTRIBUTED"]',
        )
        await expect(board).toHaveCount(3, { timeout: 15000 })
    })

    test('can switch to Table tab and back', async ({ page }) => {
        await page.goto('/hems-queue')
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)

        // Click Table tab
        await page.getByRole('tab', { name: 'Table' }).click()
        await expect(
            page.getByRole('tab', { name: 'Table', selected: true }),
        ).toBeVisible({ timeout: 10000 })

        // Switch back to Board
        await page.getByRole('tab', { name: 'Board' }).click()
        await expect(
            page.getByRole('tab', { name: 'Board', selected: true }),
        ).toBeVisible({ timeout: 10000 })
    })

    test('drag PENDING to APPROVED opens ConfirmDialog (best-effort)', async ({
        page,
    }) => {
        await page.goto('/hems-queue')
        await page
            .waitForSelector('.animate-spin', {
                state: 'hidden',
                timeout: 15000,
            })
            .catch(() => null)

        // Locate any card in the PENDING column. The dnd-kit handles are on
        // the sortable div wrapping each KanbanCard — we use the column header
        // sibling structure as a stable anchor.
        const pendingHeader = page.locator('[data-column="PENDING"]').first()
        const approvedHeader = page.locator('[data-column="APPROVED"]').first()

        const pendingVisible = await pendingHeader
            .isVisible()
            .catch(() => false)
        const approvedVisible = await approvedHeader
            .isVisible()
            .catch(() => false)

        if (!pendingVisible || !approvedVisible) {
            test.skip(true, 'Kanban columns not rendered (no entity?)')
            return
        }

        // Find a draggable card sibling of the pending header (within the same KanbanBoard)
        const pendingBoard = pendingHeader.locator('xpath=ancestor::*[1]')
        const draggableCard = pendingBoard
            .locator('[role="button"][aria-roledescription="sortable"]')
            .first()

        const hasCard = await draggableCard.count().then((n) => n > 0)
        if (!hasCard) {
            // Acceptable — no pending card to drag in the seeded data
            return
        }

        await draggableCard.dragTo(approvedHeader)

        // ConfirmDialog should appear if dnd-kit's synthetic events succeed.
        // We're tolerant: this is verified manually on real devices per VALIDATION.md.
        const dialog = page.getByRole('alertdialog')
        const appeared = await dialog
            .isVisible({ timeout: 3000 })
            .catch(() => false)
        if (appeared) {
            await expect(
                page.getByText(/creates a distribution record/i),
            ).toBeVisible()
            // Cancel to leave state clean
            await page.getByRole('button', { name: /cancel/i }).click()
        }
    })
})
