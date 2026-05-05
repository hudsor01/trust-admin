/** Input-validation tests for valuationCorrection.record. */
import { describe, expect, test } from 'bun:test'
import { TRPCError } from '@trpc/server'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { createAdminContext } from '../helpers/mock-context'

const createCaller = createCallerFactory(appRouter)
const caller = createCaller(createAdminContext())

const baseInput = {
    entityId: 1,
    itemName: 'Test Item',
    category: 'FURNITURE',
    aiEstimatedValue: '100.00',
    correctedValue: '120.00',
}

async function expectZodReject(input: typeof baseInput): Promise<void> {
    let threw = false
    try {
        await caller.valuationCorrection.record(input)
    } catch (err) {
        threw = true
        // tRPC wraps Zod errors as TRPCError with code BAD_REQUEST
        expect(err).toBeInstanceOf(TRPCError)
        expect((err as TRPCError).code).toBe('BAD_REQUEST')
    }
    expect(threw).toBe(true)
}

describe('valuationCorrection.record input validation', () => {
    test("rejects aiEstimatedValue 'abc' (parseFloat would NaN)", async () => {
        await expectZodReject({ ...baseInput, aiEstimatedValue: 'abc' })
    })

    test('rejects empty aiEstimatedValue', async () => {
        await expectZodReject({ ...baseInput, aiEstimatedValue: '' })
    })

    test("rejects 'NaN' literal", async () => {
        await expectZodReject({ ...baseInput, correctedValue: 'NaN' })
    })

    test('rejects scientific notation', async () => {
        await expectZodReject({ ...baseInput, aiEstimatedValue: '1e9' })
    })

    test('rejects leading +', async () => {
        await expectZodReject({ ...baseInput, correctedValue: '+5.0' })
    })

    test('rejects trailing decimal point', async () => {
        await expectZodReject({ ...baseInput, aiEstimatedValue: '5.' })
    })

    test('rejects decimal-only no leading digit', async () => {
        await expectZodReject({ ...baseInput, correctedValue: '.5' })
    })

    test('rejects whitespace', async () => {
        await expectZodReject({ ...baseInput, aiEstimatedValue: ' 5.00 ' })
    })

    test('rejects negatives (estate property values are non-negative)', async () => {
        await expectZodReject({ ...baseInput, aiEstimatedValue: '-100.00' })
    })

    test('rejects more than 2 decimal places (DB column is numeric(12,2))', async () => {
        await expectZodReject({ ...baseInput, correctedValue: '100.123' })
    })

    test('rejects values exceeding MAX_CURRENCY_VALUE', async () => {
        // MAX is 999_999_999_999.99; one trillion blows the bound + the
        // numeric(12,2) column.
        await expectZodReject({
            ...baseInput,
            aiEstimatedValue: '1000000000000.00',
        })
    })

    test('accepts integer form (no decimals)', async () => {
        // Sanity: the regex permits "100" without the .XX suffix. The
        // mutation likely throws downstream (no real DB in this suite) —
        // but it must NOT be a BAD_REQUEST from Zod with a "decimal" message.
        let zodRejected = false
        try {
            await caller.valuationCorrection.record({
                ...baseInput,
                aiEstimatedValue: '100',
                correctedValue: '120',
            })
        } catch (err) {
            if (
                err instanceof TRPCError &&
                err.code === 'BAD_REQUEST' &&
                /decimal/i.test(err.message)
            ) {
                zodRejected = true
            }
        }
        expect(zodRejected).toBe(false)
    })
})
