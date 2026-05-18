# Browser Test — Assets CSV Export

You are a browser-driving agent. Your job is to verify the **Export CSV** feature on the `/assets` page of the trust-admin app. Follow these steps in order. Report PASS or FAIL for each numbered check. If a check fails, capture the page state (URL, visible text near the failure, console errors) before moving on.

## Environment

- App URL: ask the user. Likely `http://localhost:3000` (dev) or `https://trust.thehudsonfam.com` (production).
- Sign-in credentials: ask the user. Do not invent or reuse credentials from any other context. Use SSO/passwordless if offered.
- After sign-in, root routes by role. `/dashboard` → admin/trustee/arbiter (good). `/portal` → beneficiary (insufficient — sign out, ask the user for an admin account; beneficiaries cannot see `/assets`).

## Deploy-freshness precondition (do this FIRST)

The CSV-export feature was fixed in `main` at commit `4e9457c` (PR #77, merged 2026-05-18). If you're testing production, the deployed bundle must include that commit; otherwise you'll re-hit the previous regressions.

0. Before running any other check, after signing in, navigate to `/assets`. If you can, run this in the browser console:
   ```js
   document.querySelector('[data-export-csv-version]')?.dataset.exportCsvVersion
       || (document.body.innerText.includes('Export CSV') ? 'button-present' : 'button-absent')
   ```
   You should see either `button-present` (the export button exists in the rendered DOM) or `button-absent`. If `button-absent`, STOP and report: "Export CSV feature not deployed — testing blocked." Do not attempt later checks.

## Setup checks

1. The page title should read **All Assets**. A subtitle below mentions vehicles, properties, accounts, insurance, personal property, and artwork.
2. A search input with placeholder "Search by name…" is present.
3. The toolbar above the table has three faceted filters in this order: **Type**, **Category**, **Status**.
4. **The "Export CSV" button** is the fourth toolbar item, immediately after the Status filter. It shows a download icon and the text "Export CSV".

## Loading / empty-state behavior

5. Reload the page. While the table is still loading you may see a skeleton — the toolbar (including the Export CSV button) may not be visible at all during this phase. **That's acceptable.** What must NOT happen: a clickable Export CSV button rendered while rows haven't loaded yet. (If the button is visible during loading, it must be disabled.)
6. **REGRESSION-PRONE — was FAILURE #7 in prior run.** With rows loaded, type a string into the search box that matches zero rows (e.g. `NonexistentXYZ`). The table should show "No results" or similar. The Export CSV button should **become disabled** (greyed out, non-clickable). Clear the search; the button re-enables.

## Unfiltered export

7. Clear all filters and the search. Note the table's row count — call this `N`.
8. Click **Export CSV**. The file downloads. Filename matches `hudson-trust-assets-YYYY-MM-DD.csv`, where `YYYY-MM-DD` is today's date **in your local timezone** (e.g. clicking at 22:00 Central does NOT produce tomorrow's UTC date). **REGRESSION-PRONE — was a separate gap in prior run.**
9. Open the downloaded file in a raw-text viewer (NOT a spreadsheet). First line must be exactly:
   ```
   ID,Name,Description,Type,Category,Value,Status,Updated
   ```
   The very first byte sequence must be the UTF-8 BOM (`EF BB BF`). A leading "" glyph or invisible character before `ID` indicates the BOM is present and correct.
10. Count data lines after the header. Must equal `N`. A trailing blank line is acceptable.

## Filtered export — REGRESSION-PRONE (was FAILURE #13 in prior run)

11. Open the **Type** filter and select only **Vehicle**. The table now shows only vehicle rows — call this count `V`.
12. Click **Export CSV** again. Open the new file.
    - It contains exactly `V` data rows after the header. **Not** all rows.
    - Every row's `Type` column reads exactly `Vehicle`. No other asset types appear.
    - If the file contains more than `V` rows, that is the same regression as PR #77 — flag it explicitly.
13. Clear the filter. The button behavior is unchanged.

## Search-narrowing export — REGRESSION-PRONE (was FAILURE #15 in prior run)

14. Type a substring in "Search by name…" that matches a small number of rows (try `GMC` or another name fragment). Note the visible row count — call this `S`.
15. Click **Export CSV**. The downloaded file contains exactly `S` data rows after the header. **Not** all rows. If it does contain all rows, that is the prior regression returning — flag it explicitly.
16. Clear the search.

## Sort-preservation export — REGRESSION-PRONE (was FAILURE #17 in prior run)

17. Click the **Value** column header to sort. (Depending on the column-header implementation this may be a single click on the header text, or it may open a dropdown menu with sort options — try both. End with the table sorted **descending by Value**.)
18. Capture the table's visible order of the first 5 rows (by name or ID) for comparison.
19. Click **Export CSV**. The data rows in the downloaded file must appear in the SAME order as the table. If they appear in the default (ID descending or load order) instead, that is the prior regression — flag it explicitly.

## Spreadsheet correctness

20. Open the most recent CSV in Excel, Numbers, or Google Sheets. Special characters (e.g. `é`, `″`, `François`) render correctly. If you see `Ã©` instead of `é`, the BOM was lost or the file was decoded as Latin-1 — FAIL.
21. Confirm numeric typing on the **Value** column: in a blank cell, enter `=SUM(F2:F999)`. The result is a number greater than 0. If it returns `0`, `#VALUE!`, or an error, numeric typing is broken — FAIL.

## Console & network hygiene

22. The browser dev-tools Console contains no red errors related to CSV export, blob URLs, or download anchors. (Unrelated 404s on static assets are acceptable; an existing React minified error #418 hydration warning is acceptable and tracked separately.)
23. The Network tab shows NO requests fired by clicking Export CSV — the export is fully client-side. An XHR/fetch on click is a FAIL.

## Out of scope

Do not attempt:
- CSV-injection / formula-injection probing (requires DB seeding via Drizzle Studio; covered by unit tests in `tests/lib/csv.test.ts`).
- Testing other admin pages (`/contacts`, `/accounting`, etc.). Only `/assets` uses the new data-based export path.

## Reporting

Output a single summary block at the end:

```
PASS/FAIL: <overall>
Checks: <pass-count>/23
Deploy precondition (step 0): <button-present | button-absent>
Failures: <list of failed step numbers with one-sentence reason each, or "none">
Regression checks (steps 6, 8, 12, 15, 19): <PASS | FAIL — list which>
Filename observed: <exact filename of the unfiltered download>
Row counts: N=<unfiltered> V=<vehicle-only> S=<search-narrowed>
```
