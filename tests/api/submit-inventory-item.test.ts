/** Tests for submitInventoryItem — trust-boundary on reviewStatus via cached analysis */

import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('../../src/lib/inventory-access', () => ({
    hasInventoryAccess: () => Promise.resolve(true),
}))

// Explicit pass-through mock. In a multi-file bun test run, sibling test
// files (e.g. tests/api/inventory-analyze.test.ts) also register
// mock.module('../../src/lib/inventory-analysis', …), and bun's module
// cache means the last writer wins for the whole process. Rather than
// rely on file ordering, this test explicitly provides the functions
// submitInventoryItem needs AND captures what was passed in.
const mockApplyReviewStatusOverrides = mock(
    (analysis: Record<string, unknown>) => ({
        analysis,
        overrideReasons: [] as string[],
    }),
)
const mockMapToDbCategory = mock((_c: string) => 'OTHER' as const)
// Permissive schema mock so submit action treats the cached JSON as valid.
const mockSchemaParse = mock((input: unknown) => ({
    success: true,
    data: input as Record<string, unknown>,
}))
mock.module('../../src/lib/inventory-analysis', () => ({
    applyReviewStatusOverrides: mockApplyReviewStatusOverrides,
    mapToDbCategory: mockMapToDbCategory,
    InventoryAnalysisSchema: { safeParse: mockSchemaParse },
}))

// Capture the values passed to db.insert().values() so we can assert the
// server re-derived reviewStatus / aiServerOverrideReasons from the cached
// analysis, NOT from the client form data.
let capturedInsertValues: Record<string, unknown> | null = null
const mockReturning = mock(() => Promise.resolve([{ id: 123 }]))
const mockValues = mock((v: Record<string, unknown>) => {
    capturedInsertValues = v
    return { returning: mockReturning }
})
const mockInsert = mock(() => ({ values: mockValues }))

let cachedAnalysis: unknown = null
const mockLimit = mock(() =>
    Promise.resolve(
        cachedAnalysis !== null ? [{ analysisJson: cachedAnalysis }] : [],
    ),
)
const mockWhere = mock(() => ({ limit: mockLimit }))
const mockFrom = mock(() => ({ where: mockWhere }))
const mockSelect = mock(() => ({ from: mockFrom }))

mock.module('../../db', () => ({
    db: { insert: mockInsert, select: mockSelect },
}))

mock.module('../../db/schema', () => ({
    pendingInventoryItem: { _: 'mocked-pending-item' },
    inventoryAnalysisCache: {
        id: 'mocked-id',
        analysisJson: 'mocked-analysis-json',
        expiresAt: 'mocked-expires-at',
    },
}))

mock.module('drizzle-orm', () => ({
    and: () => 'and',
    eq: () => 'eq',
    gt: () => 'gt',
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

function freshCachedAnalysis(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Painting',
        category: 'artwork',
        brand: null,
        model: null,
        materials: [],
        era: null,
        estimatedValue: '22000.00',
        valueRangeLow: '18000.00',
        valueRangeHigh: '30000.00',
        condition: 'good',
        conditionNotes: '',
        description: '',
        valuationRationale: 'https://heritage.com/a; https://artnet.com/b',
        reviewStatus: 'needs_professional_appraisal',
        reviewNotes: '',
        ...overrides,
    }
}

describe('submitInventoryItem server action — cached-analysis trust boundary', () => {
    beforeEach(() => {
        capturedInsertValues = null
        cachedAnalysis = null
        mockInsert.mockClear()
        mockValues.mockClear()
        mockReturning.mockClear()
        mockReturning.mockImplementation(() => Promise.resolve([{ id: 123 }]))
        mockSelect.mockClear()
        mockFrom.mockClear()
        mockWhere.mockClear()
        mockLimit.mockClear()
        mockApplyReviewStatusOverrides.mockClear()
        mockApplyReviewStatusOverrides.mockImplementation((analysis) => ({
            analysis,
            overrideReasons: [],
        }))
        mockSchemaParse.mockClear()
        mockSchemaParse.mockImplementation((input) => ({
            success: true,
            data: input,
        }))
    })

    test('passes CACHED (not client-submitted) values to applyReviewStatusOverrides', async () => {
        // The critical wiring-level assertion: the function is called with
        // cached analysis fields, NOT the client-submitted form fields.
        // This is what closes the DOM-tampering trust boundary.
        const cached = freshCachedAnalysis({
            estimatedValue: '22000.00',
            valueRangeLow: '18000.00',
            valueRangeHigh: '30000.00',
            valuationRationale:
                'Heritage https://heritage.com/a; Artnet https://artnet.com/b',
            reviewStatus: 'needs_professional_appraisal',
        })
        cachedAnalysis = cached

        // Make the mock simulate the real function's behavior for this test:
        // escalate + emit an override reason.
        mockApplyReviewStatusOverrides.mockImplementationOnce((analysis) => ({
            analysis: {
                ...(analysis as Record<string, unknown>),
                reviewStatus: 'needs_professional_appraisal',
            },
            overrideReasons: [
                'Server override: estimatedValue $22,000 exceeds $3,000.',
            ],
        }))

        const fd = buildFormData({
            name: 'Cheap print',
            category: 'ART',
            condition: 'good',
            // Client attempts to submit much lower values
            estimatedValue: '500.00',
            valueRangeLow: '400.00',
            valueRangeHigh: '600.00',
            aiReviewStatus: 'inventory_ready',
            aiValuationRationale:
                'https://example.com/a and https://example.com/b',
            analysisId: '11111111-2222-4333-8444-555555555555',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)

        // The override function was called with CACHED fields, not client-form fields
        expect(mockApplyReviewStatusOverrides).toHaveBeenCalledTimes(1)
        const [arg] = mockApplyReviewStatusOverrides.mock.calls[0] ?? []
        const argRec = arg as Record<string, unknown>
        expect(argRec.estimatedValue).toBe('22000.00')
        expect(argRec.valueRangeLow).toBe('18000.00')
        expect(argRec.valueRangeHigh).toBe('30000.00')
        expect(argRec.valuationRationale).toContain('heritage.com')
        // NOT the tampered client-form values
        expect(argRec.estimatedValue).not.toBe('500.00')
        expect(argRec.valuationRationale).not.toContain('example.com')

        // Row persisted with server-derived status + reasons
        expect(capturedInsertValues?.aiConfidence).toBe(
            'needs_professional_appraisal',
        )
        expect(capturedInsertValues?.aiServerOverrideReasons).toMatch(
            /exceeds \$3,000/,
        )
        // Form-supplied display values still flow through for admin visibility
        expect(capturedInsertValues?.name).toBe('Cheap print')
        expect(capturedInsertValues?.estimatedValue).toBe('500.00')
    })

    test('clean cached analysis yields the status the override function returns', async () => {
        cachedAnalysis = freshCachedAnalysis({
            estimatedValue: '35.00',
            valueRangeLow: '25.00',
            valueRangeHigh: '60.00',
            reviewStatus: 'inventory_ready',
        })
        const fd = buildFormData({
            name: 'IKEA KALLAX',
            category: 'FURNITURE',
            condition: 'good',
            estimatedValue: '35.00',
            analysisId: '22222222-3333-4444-8555-666666666666',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(capturedInsertValues?.aiConfidence).toBe('inventory_ready')
        expect(capturedInsertValues?.aiServerOverrideReasons).toBeNull()
        expect(capturedInsertValues?.aiSuggested).toBe(true)
    })

    test('missing analysisId → row stored as non-AI (no false inventory_ready)', async () => {
        const fd = buildFormData({
            name: 'Manual entry',
            category: 'OTHER',
            condition: 'good',
            estimatedValue: '100.00',
            aiReviewStatus: 'inventory_ready',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(mockApplyReviewStatusOverrides).not.toHaveBeenCalled()
        expect(capturedInsertValues?.aiConfidence).toBeNull()
        expect(capturedInsertValues?.aiServerOverrideReasons).toBeNull()
        expect(capturedInsertValues?.aiSuggested).toBe(false)
    })

    test('stale / expired analysisId → treated as non-AI', async () => {
        cachedAnalysis = null
        const fd = buildFormData({
            name: 'Expired cache test',
            category: 'ART',
            condition: 'good',
            estimatedValue: '100.00',
            analysisId: '33333333-4444-4555-8666-777777777777',
            aiReviewStatus: 'inventory_ready',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(mockApplyReviewStatusOverrides).not.toHaveBeenCalled()
        expect(capturedInsertValues?.aiConfidence).toBeNull()
        expect(capturedInsertValues?.aiServerOverrideReasons).toBeNull()
    })

    test('cached analysis failing schema validation → treated as non-AI', async () => {
        cachedAnalysis = { some: 'garbage' }
        mockSchemaParse.mockImplementationOnce(() => ({
            success: false,
            data: null,
        }))
        const fd = buildFormData({
            name: 'Malformed cache',
            category: 'OTHER',
            condition: 'good',
            estimatedValue: '100.00',
            analysisId: '44444444-5555-4666-8777-888888888888',
            aiReviewStatus: 'inventory_ready',
        })
        const result = await submitInventoryItem({ success: false }, fd)
        expect(result.success).toBe(true)
        expect(mockApplyReviewStatusOverrides).not.toHaveBeenCalled()
        expect(capturedInsertValues?.aiConfidence).toBeNull()
    })
})
