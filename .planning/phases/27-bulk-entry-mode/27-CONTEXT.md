# Phase 27: Bulk Entry Mode - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<vision>
## How This Should Work

A spreadsheet-style inline table on the liabilities page for rapid entry of multiple liabilities at once. Think Excel-in-the-browser — you can tab through cells, press Enter to add a new row, and get immediate validation feedback per-row.

When entering data, the table adapts based on liability type. Select "Mortgage" and the relevant columns (loan term, interest rate, escrow) appear. Select "Credit Card" and different columns show (APR, credit limit). This mirrors the type-aware form behavior from Phase 26, but in a multi-row table format.

The primary use case is initial inventory — setting up the trust's liabilities for the first time. A user might have 5-10 liabilities to enter from bank statements and want to get them all in quickly without opening/closing dialogs repeatedly.

</vision>

<essential>
## What Must Be Nailed

- **Speed of entry** — Tab-tab-tab through cells, Enter adds new row, minimal clicks. Optimized for getting data in fast.
- **Immediate validation** — See errors/warnings per-cell as I type so I can fix issues before saving the batch.
- **Type-aware columns** — When liability type changes, relevant columns appear/disappear (matching Phase 26 field logic).

</essential>

<boundaries>
## What's Out of Scope

- CSV import/export — Paste from clipboard is enough for now. File upload deferred to future enhancement.
- Complex paste parsing — Basic clipboard paste, not intelligent column mapping from arbitrary spreadsheet formats.

</boundaries>

<specifics>
## Specific Ideas

- Spreadsheet keyboard navigation: Tab moves right, Shift+Tab moves left, Enter adds row or moves down
- Type column as dropdown matching existing LiabilityType enum
- Row-by-row validation with inline error indicators (red cell borders, error messages)
- "Save All" button to commit the batch
- Reuse `hasLoanTermFields()` and `isRevolvingType()` helpers from Phase 26 for column visibility

</specifics>

<notes>
## Additional Context

This follows Phase 26's type-aware form enhancements. The same conditional field logic applies, but rendered as table columns instead of form sections.

Existing liabilities page already has the single-liability dialog. Bulk entry is an alternative mode for initial setup, not a replacement.

</notes>

---

*Phase: 27-bulk-entry-mode*
*Context gathered: 2026-01-17*
