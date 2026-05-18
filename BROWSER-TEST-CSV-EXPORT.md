# Browser Test — Assets CSV Export

You are a browser-driving agent. Your job is to verify the **Export CSV** feature on the `/assets` page of the trust-admin app. Follow these steps exactly. Report PASS or FAIL for each numbered check, and if any check fails, capture the page state (URL, visible text near the failure, console errors) before moving on.

## Environment

- App URL: ask the user. Likely `http://localhost:3000` (if they're running `bun run dev`) or `https://trust.thehudsonfam.com` (production).
- Sign-in credentials: ask the user. Do not invent or reuse credentials from any other context. Use SSO/passwordless if offered.
- After sign-in you will be redirected. If you land on `/dashboard`, you're signed in as admin/trustee/arbiter — good. If you land on `/portal`, you are signed in as a beneficiary — sign out and ask the user for an admin account; beneficiaries cannot see `/assets`.

## Setup checks

1. Open the app URL. If a sign-in form appears, sign in. After sign-in, navigate to `/assets`.
2. The page title should read **All Assets**. A subtitle below it should mention vehicles, properties, accounts, insurance, personal property, and artwork.
3. A search input labeled "Search by name…" should be present.
4. A toolbar should be visible above the table with three faceted filters in this order: **Type**, **Category**, **Status**.
5. **The "Export CSV" button** should be the fourth toolbar item, immediately after the Status filter. It should show a download icon and the text "Export CSV".

## Disabled-state check

6. Reload the page. While the table is still loading (you may see a skeleton or spinner), the Export CSV button should be **disabled** (greyed out, non-clickable). Once rows appear, it should become **enabled**.
7. Open the Type filter and de-select every option, so the table renders zero rows. The Export CSV button should re-disable. Re-select at least one option to restore rows.

## Unfiltered export check

8. Make sure no filters are active (clear them all). Note the number of rows visible in the table — call this `N`.
9. Click **Export CSV**. The browser should immediately download a file. The filename should match the pattern `hudson-trust-assets-YYYY-MM-DD.csv`, where `YYYY-MM-DD` is today's UTC date.
10. Open the downloaded file in a text viewer (do **not** open in Excel for this check — you want the raw bytes). The first line should be exactly:
    ```
    ID,Name,Description,Type,Category,Value,Status,Updated
    ```
    The very first character of the file should be a UTF-8 BOM (byte sequence `EF BB BF`). If your viewer shows an invisible character or a "" glyph before `ID`, that's the BOM — that is correct.
11. Count the lines after the header. There should be exactly `N` lines (one per row, no trailing blank line is required but is acceptable).

## Filtered export check

12. Apply a single filter: open the **Type** filter and select only **Vehicle**. The table should now show only vehicle rows — call this count `V`.
13. Click **Export CSV** again. The new file should contain exactly `V` rows after the header. Every row's `Type` column should read `Vehicle`. The other asset types must not appear.
14. Clear filters. The button label and behavior should be unchanged.

## Search-narrowing check

15. Type a substring into the "Search by name…" box that matches at least one asset. The table should filter live. Click Export CSV — the downloaded file should contain only the rows the search narrowed the table to.
16. Clear the search.

## Sort-preservation check

17. Click the **Value** column header to sort by value ascending. Click again to sort descending. Click Export CSV — the rows in the downloaded file should appear in the same order as the table (descending Value).

## Spreadsheet-correctness check

18. Open the most recently downloaded CSV in Excel, Numbers, or Google Sheets. Special characters (e.g. accented letters in an asset name) should render correctly — if you see `Ã©` instead of `é`, the BOM was lost or the file is being decoded as Latin-1. That is a FAIL.
19. Click the column header for the **Value** column. The spreadsheet should treat it as numeric — try `=SUM(F2:F999)` in a blank cell. If it returns a number greater than zero, numeric typing is preserved (PASS). If it returns `0`, `#VALUE!`, or an error, that is a FAIL.

## Console & network check

20. Throughout all of the above, the browser dev-tools Console should remain free of red errors related to CSV export, blob URLs, or download anchors. (Unrelated 404s on static assets are fine.)
21. The Network tab should not show any requests fired by clicking Export CSV — the export is entirely client-side. If you see an XHR/fetch on click, that is a FAIL (it would mean the data was re-fetched, which is not the intended design).

## Out of scope

Do **not** attempt:
- CSV-injection / formula-injection probing (requires seeding a malicious string into the database via Drizzle Studio; covered by unit tests instead).
- Testing on the other admin pages (`/contacts`, `/accounting`, etc.). Only `/assets` has the new data-based export.

## Reporting

When done, output a single summary block:

```
PASS/FAIL: <overall>
Checks: <pass-count>/21
Failures: <list of failed step numbers and one-sentence reason each, or "none">
Filename observed: <exact filename of the unfiltered download>
Row count (unfiltered): N=<number>
Row count (Vehicle only): V=<number>
```
