import { describe, expect, test } from 'bun:test'
import { buildCsvText } from '@/lib/csv'

/** CSV serialization — escape rules, BOM, line endings, formula-injection
 *  mitigation, numeric typing preservation. Covers `buildCsvText` (pure).
 *  The `exportRowsToCsv` wrapper just hands the result to Blob+anchor and
 *  is exercised end-to-end via manual verification in the assets page. */

const stripBom = (s: string) => s.replace(/^﻿/, '')

describe('buildCsvText', () => {
    test('emits BOM, CRLF line endings, header row first', () => {
        const out = buildCsvText(
            ['A', 'B'],
            [
                ['1', '2'],
                ['3', '4'],
            ],
        )
        expect(out.startsWith('﻿')).toBe(true)
        expect(stripBom(out)).toBe('A,B\r\n1,2\r\n3,4')
    })

    test('quotes cells containing commas, double-quotes, newlines, carriage returns', () => {
        const out = stripBom(
            buildCsvText(
                ['Field'],
                [
                    ['has, comma'],
                    ['has "quotes"'],
                    ['has\nnewline'],
                    ['has\rcarriage'],
                ],
            ),
        )
        expect(out).toContain('"has, comma"')
        expect(out).toContain('"has ""quotes"""')
        expect(out).toContain('"has\nnewline"')
        // \r in the middle of the string triggers quoting but NOT the
        // formula-injection prefix (that only checks the first char).
        expect(out).toContain('"has\rcarriage"')
    })

    test('renders null and undefined as empty cells', () => {
        const out = stripBom(
            buildCsvText(['A', 'B', 'C'], [[null, undefined, 'x']]),
        )
        expect(out).toBe('A,B,C\r\n,,x')
    })

    test('numeric values stringify without quotes (preserves Excel numeric typing)', () => {
        const out = stripBom(
            buildCsvText(
                ['ID', 'Value'],
                [
                    [1, 12500],
                    [2, 0],
                ],
            ),
        )
        expect(out).toBe('ID,Value\r\n1,12500\r\n2,0')
    })

    test('numeric strings (Postgres numerics like "12500.00") pass through unquoted', () => {
        const out = stripBom(
            buildCsvText(['Value'], [['12500.00'], ['0.50'], ['']]),
        )
        expect(out).toBe('Value\r\n12500.00\r\n0.50\r\n')
    })

    test('mitigates formula injection — prefixes apostrophe to leading =+-@\\t\\r', () => {
        const out = stripBom(
            buildCsvText(
                ['Cell'],
                [
                    ['=cmd|"/c calc"!A1'],
                    ['+1+1'],
                    ['-1-1'],
                    ['@SUM(A1:A2)'],
                    ['\tfoo'],
                ],
            ),
        )
        // All five rows start with ' after the apostrophe prefix; the first
        // also has internal "" escaping and surrounding quotes (because of
        // the comma).
        expect(out).toContain('"\'=cmd|""/c calc""!A1"')
        expect(out).toContain("'+1+1")
        expect(out).toContain("'-1-1")
        expect(out).toContain("'@SUM(A1:A2)")
        expect(out).toContain("'\tfoo")
    })

    test('formula injection also applied to header cells', () => {
        const out = stripBom(buildCsvText(['=Injected'], [['ok']]))
        expect(out.startsWith("'=Injected")).toBe(true)
    })

    test('Infinity and NaN render as empty', () => {
        const out = stripBom(
            buildCsvText(['x'], [[Infinity], [-Infinity], [NaN]]),
        )
        expect(out).toBe('x\r\n\r\n\r\n')
    })
})
