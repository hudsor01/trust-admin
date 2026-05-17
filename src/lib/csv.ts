function normalizeText(value: string | null | undefined): string {
    if (!value) return ''
    return value.replace(/\s+/g, ' ').trim()
}

// CSV Injection (OWASP "Formula Injection") — when a cell value starts with
// =, +, -, @, \t, or \r, Excel/Numbers/Sheets parse it as a formula. Prefix
// with ' so it renders as literal text instead of executing.
const FORMULA_LEAD = /^[=+\-@\t\r]/
function escapeFormula(value: string): string {
    return FORMULA_LEAD.test(value) ? `'${value}` : value
}

function escapeCsvValue(value: string): string {
    if (value.includes('"')) {
        value = value.replace(/"/g, '""')
    }
    if (/[\n\r,"]/.test(value)) {
        return `"${value}"`
    }
    return value
}

function buildCsv(rows: string[][]): string {
    return rows
        .map((row) => row.map((cell) => escapeCsvValue(cell)).join(','))
        .join('\r\n')
}

function downloadCsv(filename: string, rows: string[][]) {
    const csv = buildCsv(rows)
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

function getHeaderCells(table: HTMLTableElement): HTMLTableCellElement[] {
    const headerRow = table.tHead?.rows?.[0]
    if (!headerRow) return []
    return Array.from(headerRow.cells)
}

function shouldSkipColumn(
    headerText: string,
    cell: HTMLTableCellElement,
): boolean {
    if (cell.hasAttribute('data-csv-skip')) return true
    if (!headerText) return true
    const normalized = headerText.toLowerCase()
    return normalized.includes('actions') || normalized.includes('details')
}

export function exportTableToCsv(table: HTMLTableElement, filename: string) {
    const headerCells = getHeaderCells(table)
    const columnIndexes: number[] = []
    const headers: string[] = []

    headerCells.forEach((cell, index) => {
        const headerText = normalizeText(cell.textContent)
        if (!shouldSkipColumn(headerText, cell)) {
            columnIndexes.push(index)
            headers.push(headerText)
        }
    })

    const rows: string[][] = []
    if (headers.length > 0) {
        rows.push(headers)
    }

    const bodyRows = Array.from(table.tBodies).flatMap((body) =>
        Array.from(body.rows),
    )
    bodyRows.forEach((row) => {
        const cells = Array.from(row.cells)
        const values = columnIndexes.map((index) =>
            normalizeText(cells[index]?.textContent),
        )
        if (values.some((value) => value.length > 0)) {
            rows.push(values)
        }
    })

    if (rows.length > 0) {
        downloadCsv(filename, rows)
    }
}

export function exportTablesInContainer(
    container: HTMLElement,
    baseName: string,
) {
    const tables = Array.from(
        container.querySelectorAll('table'),
    ) as HTMLTableElement[]
    if (!tables.length) return 0

    if (tables.length === 1) {
        exportTableToCsv(tables[0]!, `${baseName}.csv`)
        return 1
    }

    tables.forEach((table, index) => {
        const nameHint = normalizeText(table.getAttribute('data-csv-name'))
        const filename = nameHint
            ? `${baseName}-${nameHint}.csv`
            : `${baseName}-table-${index + 1}.csv`
        exportTableToCsv(table, filename)
    })

    return tables.length
}

// Coerces a cell to a CSV-safe string. null/undefined → empty. Numbers
// stringify naturally (preserves Excel's numeric typing). Anything else
// is run through String(), then formula-escaped.
function coerceCell(value: unknown): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number')
        return Number.isFinite(value) ? String(value) : ''
    return escapeFormula(String(value))
}

/**
 * Pure serialization — builds the CSV text (including UTF-8 BOM and
 * CRLF line endings) without touching the DOM. Exported separately so it
 * can be unit-tested without a browser shim.
 */
export function buildCsvText(
    headers: string[],
    rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
    const allRows: string[][] = [
        headers.map((h) => escapeFormula(String(h))),
        ...rows.map((row) => row.map(coerceCell)),
    ]
    return `﻿${buildCsv(allRows)}`
}

/**
 * Build a CSV from headers + data rows and trigger a browser download.
 * Use this when you have the underlying data (not a rendered DOM table) —
 * preserves Excel's numeric typing on numeric cells and mitigates CSV
 * injection. For DOM-table scrapes, see `exportTablesInContainer`.
 */
export function exportRowsToCsv(
    headers: string[],
    rows: ReadonlyArray<ReadonlyArray<unknown>>,
    filename: string,
): void {
    const csv = buildCsvText(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}
