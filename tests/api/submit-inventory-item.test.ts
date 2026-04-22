/** Tests for submitInventoryItem — trust-boundary behavior on review status */

import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('../../src/lib/inventory-access', () => ({
    hasInventoryAccess: () => Promise.resolve(true),
}))

// Mock applyReviewStatusOverrides explicitly so this test is self-contained
// regardless of other test files in the run (bun's mock.module state can
// leak across files). We assert what the SERVER ACTION does with the result
// — not re-verify the override math, which is covered by
// tests/lib/inventory-analysis.test.ts.
const mockApplyReviewStatusOverrides = mock(
    (analysis: Record<string, unknown>) => ({
        analysis,
        overrideReasons: [] as string[],
    }),
)
const mockMapToDbCategory = mock((_c: string) => 'OTHER' as const)
mock.module('../../src/lib/inventory-analysis', () => ({
    applyReviewStatusOverrides: mockApplyReviewStatusOverrides,
    mapToDbCategory: mockMapToDbCategory,
}))

// Capture the values passed to db.insert().values() so we can assert the
// server re-derived reviewStatus / aiServerOverrideReasons rather than
// using whatever the client sent.
let capturedInsertValues: Record<string, unknown> | null = null
const mockReturning = mock(() => Promise.resolve([{ id: 123 }]))
const mockValues = mock((v: Record<string, unknown>) => {
    capturedInsertValues = v
    return { returning: mockReturning }
})
const mockInsert = mock(() => ({ values: mockValues }))

mock.module('../../db', () => ({
    db: { insert: mockInsert },
}))

mock.module('../../db/schema', () => ({
    pendingInventoryItem: { _: 'mocked-table' },
}))

const { submitInventoryItem } = await import(
    '../../src/app/forms/_actions/submitInventoryItem'
)

function buildFormData(fields: Record<string, string | undefined>): FormData {
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) fd.append(k, v)
    }
    return fd
}

describe('submitInventoryItem server action', () => {
    beforeEach(() => {
        capturedInsertValues = null
        mockInsert.mockClear()
        mockValues.mockClear()
        mockReturning.mockClear()
        mockReturning.mockImplementation(() => Promise.resolve([{ id: 123 }]))
        mockApplyReviewStatusOverrides.mockClear()
        // Default: passthrough (no overrides fired)
        mockApplyReviewStatusOverrides.mockImplementation((analysis) => ({
            analysis,
            overrideReasons: [],
        }))
    })

    test('uses applyReviewStatusOverrides output, not client-sent aiServerOverrideReasons', async () => {
        // Client submits with a forged-empty aiServerOverrideReasons AND a
        // claimed inventory_ready. The server's override function returns
        // needs_professional_appraisal + a reason. The persisted row MUST
        // reflect the server's output, not the client's claim.
        mockApplyReviewStatusOverrides.mockImplementationOnce((analysis) => ({
            analysis: {
                ...(analysis as Record<string, unknown>),
                reviewStatus: 'needs_professional_appraisal',
            },
            overrideReasons: [
                'Server override: estimatedValue exceeds $3,000.',
            ],
        }))

        const fd = buildFormData({
            name: 'Painting',
            category: 'ART',
            condition: 'good',
            estimatedValue: '8500.00',
            valueRangeLow: '7000.00',
            valueRangeHigh: '10000.00',
            aiReviewStatus: 'inventory_ready',
            aiSuggested: 'true',
            aiValuationRationale: 'comps: https://example.com/a',
            // Client tries to hide the override evidence:
            aiServerOverrideReasons: 'ignored — do not trust client',
        })
        const result = await submitInventoryItem({ success: false }, fd)

        expect(result.success).toBe(true)
        expect(capturedInsertValues).not.toBeNull()
        expect(capturedInsertValues?.aiConfidence).toBe(
            'needs_professional_appraisal',
        )
        // Server-rendered reasons, NOT the client-supplied string
        expect(capturedInsertValues?.aiServerOverrideReasons).toBe(
            'Server override: estimatedValue exceeds $3,000.',
        )
    })

    test('non-AI submission skips applyReviewStatusOverrides and leaves AI fields null', async () => {
        const fd = buildFormData({
            name: 'Garage shelving',
            category: 'OTHER',
            condition: 'good',
            estimatedValue: '100.00',
            aiSuggested: 'false',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(mockApplyReviewStatusOverrides).not.toHaveBeenCalled()
        expect(capturedInsertValues?.aiConfidence).toBeNull()
        expect(capturedInsertValues?.aiServerOverrideReasons).toBeNull()
    })

    test('AI submission with no overrides stores reviewStatus but null reasons', async () => {
        const fd = buildFormData({
            name: 'IKEA shelf',
            category: 'FURNITURE',
            condition: 'good',
            estimatedValue: '35.00',
            valueRangeLow: '25.00',
            valueRangeHigh: '60.00',
            aiReviewStatus: 'inventory_ready',
            aiSuggested: 'true',
            aiValuationRationale:
                'https://ebay.com/a $35, https://facebook.com/b $40',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(mockApplyReviewStatusOverrides).toHaveBeenCalledTimes(1)
        expect(capturedInsertValues?.aiConfidence).toBe('inventory_ready')
        expect(capturedInsertValues?.aiServerOverrideReasons).toBeNull()
    })
})
