/** Unit tests for src/lib/inventory-agent.ts — the sanitizer that keeps
 * extractor-emitted currency-formatted strings from reaching the database
 * (and the form's dinero.js renderer, which NaNs on any non-digit). */

import { describe, expect, test } from 'bun:test'
import { _testables } from '@/lib/inventory-agent'

const {
    sanitizeNumericFields,
    toBareDecimal,
    buildFailureReason,
    buildNoTextReason,
    toolUseLabel,
} = _testables

const emptyPayload = {
    text: '',
    toolUses: [],
    agentMessageCount: 0,
    errors: [],
    lastIdleStopReason: null as
        | 'end_turn'
        | 'requires_action'
        | 'retries_exhausted'
        | null,
}

describe('toBareDecimal', () => {
    test('strips dollar sign prefix (the exact 2026-04-23 field-test bug)', () => {
        expect(toBareDecimal('$800', 'min')).toBe('800')
        expect(toBareDecimal('$550', 'min')).toBe('550')
        expect(toBareDecimal('$1075', 'max')).toBe('1075')
    })

    test('strips thousands separators', () => {
        expect(toBareDecimal('$1,075', 'min')).toBe('1075')
        expect(toBareDecimal('12,345.67', 'min')).toBe('12345.67')
    })

    test('preserves plain decimals untouched', () => {
        expect(toBareDecimal('800.00', 'min')).toBe('800')
        expect(toBareDecimal('1075.5', 'max')).toBe('1075.5')
    })

    test('range string → picks min for valueRangeLow, max for valueRangeHigh', () => {
        expect(toBareDecimal('$550–$1,075', 'min')).toBe('550')
        expect(toBareDecimal('$550–$1,075', 'max')).toBe('1075')
        expect(toBareDecimal('450-900', 'min')).toBe('450')
        expect(toBareDecimal('450-900', 'max')).toBe('900')
    })

    test('prose with prefix text still extracts the number', () => {
        expect(toBareDecimal('approximately 800', 'min')).toBe('800')
        expect(toBareDecimal('about $1,234.50 total', 'min')).toBe('1234.5')
    })

    test('unparseable → "0" rather than throwing', () => {
        expect(toBareDecimal('unknown', 'min')).toBe('0')
        expect(toBareDecimal('', 'min')).toBe('0')
        expect(toBareDecimal('—', 'max')).toBe('0')
    })
})

describe('sanitizeNumericFields', () => {
    test('cleans estimatedValue / valueRangeLow / valueRangeHigh in a parsed object', () => {
        const input = {
            name: 'Yanke Doodle II',
            category: 'artwork',
            estimatedValue: '$800',
            valueRangeLow: '$550',
            valueRangeHigh: '$1,075',
            reviewStatus: 'needs_professional_appraisal',
            valuationRationale: 'prose body here',
        }
        const out = sanitizeNumericFields(input) as Record<string, unknown>
        expect(out.estimatedValue).toBe('800')
        expect(out.valueRangeLow).toBe('550')
        expect(out.valueRangeHigh).toBe('1075')
        // Non-numeric fields left alone
        expect(out.name).toBe('Yanke Doodle II')
        expect(out.category).toBe('artwork')
        expect(out.valuationRationale).toBe('prose body here')
    })

    test('picks endpoints correctly when a single field holds a range', () => {
        const input = {
            estimatedValue: '$550–$1,075',
            valueRangeLow: '$550–$1,075',
            valueRangeHigh: '$550–$1,075',
        }
        const out = sanitizeNumericFields(input) as Record<string, unknown>
        // estimatedValue falls through to the 'min' branch — the prompt
        // says to pick the midpoint, but if the model ignores that and
        // hands us a range, min is the safer persist (undervalue beats
        // overvalue for defensibility).
        expect(out.estimatedValue).toBe('550')
        expect(out.valueRangeLow).toBe('550')
        expect(out.valueRangeHigh).toBe('1075')
    })

    test('non-object input passes through unchanged', () => {
        expect(sanitizeNumericFields(null)).toBe(null)
        expect(sanitizeNumericFields('not an object')).toBe('not an object')
        expect(sanitizeNumericFields(undefined)).toBe(undefined)
    })
})

describe('buildNoTextReason', () => {
    test('session.error wins as the primary signal but appends stop_reason as secondary', () => {
        const reason = buildNoTextReason({
            ...emptyPayload,
            agentMessageCount: 2,
            lastIdleStopReason: 'retries_exhausted',
            errors: [
                {
                    type: 'mcp_authentication_failed_error',
                    message: 'Airtable token rejected',
                },
            ],
        })
        expect(reason).toContain('mcp_authentication_failed_error')
        expect(reason).toContain('Airtable token rejected')
        // stop_reason: retries_exhausted is appended so triage knows the
        // error was retried until terminal (vs recoverable).
        expect(reason).toContain('stop_reason: retries_exhausted')
    })

    test('session.error with end_turn stop_reason omits the suffix', () => {
        const reason = buildNoTextReason({
            ...emptyPayload,
            lastIdleStopReason: 'end_turn',
            errors: [{ type: 'unknown_error', message: 'transient' }],
        })
        expect(reason).toContain('unknown_error')
        expect(reason).not.toContain('stop_reason')
    })

    test('requires_action surfaces the blocking-input case distinctly', () => {
        const reason = buildNoTextReason({
            ...emptyPayload,
            lastIdleStopReason: 'requires_action',
        })
        expect(reason).toContain('requires_action')
        expect(reason).toContain('tool_confirmation')
    })

    test('retries_exhausted surfaces the iteration-budget case distinctly', () => {
        const reason = buildNoTextReason({
            ...emptyPayload,
            lastIdleStopReason: 'retries_exhausted',
        })
        expect(reason).toContain('retry budget')
    })

    test('zero agent.message events lists the tool calls observed', () => {
        const reason = buildNoTextReason({
            ...emptyPayload,
            toolUses: ['web_search', 'code_execution'],
        })
        expect(reason).toContain('without emitting any agent.message')
        expect(reason).toContain('web_search')
        expect(reason).toContain('code_execution')
    })

    test('agent.message present but all text blocks empty', () => {
        const reason = buildNoTextReason({
            ...emptyPayload,
            agentMessageCount: 3,
        })
        expect(reason).toContain('3 agent.message event(s)')
        expect(reason).toContain('every text block was empty')
    })
})

describe('toolUseLabel', () => {
    // toolUseLabel is typed against the full SDK discriminated union; the
    // tests only need the discriminating fields, so cast partial objects.
    // biome-ignore lint/suspicious/noExplicitAny: narrow surface for tests
    const asEvent = (e: object) => e as any

    test('built-in tool returns bare name', () => {
        expect(
            toolUseLabel(
                asEvent({ type: 'agent.tool_use', name: 'web_search' }),
            ),
        ).toBe('web_search')
    })

    test('MCP tool returns mcp:<server>.<name> so triage can spot it', () => {
        // The Airtable writer is the canonical case — the diagnostic
        // pipeline that depends on this counter exists specifically to
        // surface MCP failures (CLAUDE.md "Inventory agent silent fail").
        expect(
            toolUseLabel(
                asEvent({
                    type: 'agent.mcp_tool_use',
                    name: 'create_record',
                    mcp_server_name: 'airtable',
                }),
            ),
        ).toBe('mcp:airtable.create_record')
    })

    test('custom tool gets a custom: prefix', () => {
        expect(
            toolUseLabel(
                asEvent({ type: 'agent.custom_tool_use', name: 'lookup' }),
            ),
        ).toBe('custom:lookup')
    })

    test('non-tool events return null (filtered out)', () => {
        expect(toolUseLabel(asEvent({ type: 'agent.message' }))).toBe(null)
        expect(toolUseLabel(asEvent({ type: 'session.status_idle' }))).toBe(
            null,
        )
        expect(toolUseLabel(asEvent({ type: 'span.model_request_end' }))).toBe(
            null,
        )
    })
})

describe('buildFailureReason', () => {
    test('appends errors, stop_reason, and counters to the base reason', () => {
        const reason = buildFailureReason('Managed agent session terminated', {
            ...emptyPayload,
            agentMessageCount: 1,
            toolUses: ['web_search'],
            lastIdleStopReason: 'retries_exhausted',
            errors: [{ type: 'billing_error', message: 'Spend limit reached' }],
        })
        expect(reason).toContain('Managed agent session terminated')
        expect(reason).toContain('billing_error: Spend limit reached')
        expect(reason).toContain('stop_reason: retries_exhausted')
        expect(reason).toContain('agent.message events: 1')
        expect(reason).toContain('tool uses: 1')
    })

    test('omits stop_reason line when end_turn (not informative)', () => {
        const reason = buildFailureReason('Managed agent session terminated', {
            ...emptyPayload,
            lastIdleStopReason: 'end_turn',
        })
        expect(reason).not.toContain('stop_reason')
    })
})
