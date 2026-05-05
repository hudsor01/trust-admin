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
})
