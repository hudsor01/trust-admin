/**
 * tRPC tests for liability router — the batched payoffProjections query
 * (PR-B / 23-03) and the account-linkage cross-entity FK guard + getLinked
 * query (26-02).
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { bankAccount, entity, investmentAccount, liability } from '@/db/schema'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import { createAdminContext } from '../helpers/mock-context'

const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)
const TS = Date.now().toString().slice(-8)

function adminCaller() {
    return createCaller(
        createAdminContext({
            id: '901',
            name: 'Payoff Projections Test Admin',
            email: 'payoff-admin@test.com',
        }),
    )
}

const ids = {
    e1: null as number | null,
    e2: null as number | null,
    amortizing: null as number | null,
    revolving: null as number | null,
    noRate: null as number | null,
    noPayment: null as number | null,
    withLoanStart: null as number | null,
    inE2: null as number | null,
}

describe.skipIf(isProductionDb)('liability.payoffProjections', () => {
    beforeAll(async () => {
        const [e1] = await db
            .insert(entity)
            .values({
                name: `Payoff Test Entity 1 ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.e1 = e1.id

        const [e2] = await db
            .insert(entity)
            .values({
                name: `Payoff Test Entity 2 ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.e2 = e2.id

        // Fully-specified amortizing liability
        const [amortizing] = await db
            .insert(liability)
            .values({
                entityId: e1.id,
                liabilityType: 'MORTGAGE',
                creditor: `Amortizing Lender ${TS}`,
                originalAmount: '200000.00',
                currentBalance: '180000.00',
                interestRate: '0.065',
                monthlyPayment: '1264.14',
                loanTermMonths: 360,
                isRevolvingCredit: false,
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.amortizing = amortizing.id

        // Revolving credit (CREDIT_CARD) — should project null
        const [revolving] = await db
            .insert(liability)
            .values({
                entityId: e1.id,
                liabilityType: 'CREDIT_CARD',
                creditor: `Revolving CC ${TS}`,
                originalAmount: '5000.00',
                currentBalance: '4500.00',
                interestRate: '19.990',
                monthlyPayment: '150.00',
                isRevolvingCredit: true,
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.revolving = revolving.id

        // Missing interestRate — should project null
        const [noRate] = await db
            .insert(liability)
            .values({
                entityId: e1.id,
                liabilityType: 'LOAN',
                creditor: `No Rate Lender ${TS}`,
                originalAmount: '10000.00',
                currentBalance: '9500.00',
                monthlyPayment: '200.00',
                isRevolvingCredit: false,
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.noRate = noRate.id

        // Missing monthlyPayment — should project null
        const [noPayment] = await db
            .insert(liability)
            .values({
                entityId: e1.id,
                liabilityType: 'LOAN',
                creditor: `No Payment Lender ${TS}`,
                originalAmount: '8000.00',
                currentBalance: '7500.00',
                interestRate: '0.055',
                isRevolvingCredit: false,
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.noPayment = noPayment.id

        // Liability with explicit loanStartDate — verifies startDate fallback
        const [withLoanStart] = await db
            .insert(liability)
            .values({
                entityId: e1.id,
                liabilityType: 'LOAN',
                creditor: `Loan Start Lender ${TS}`,
                originalAmount: '15000.00',
                currentBalance: '12000.00',
                interestRate: '0.050',
                monthlyPayment: '300.00',
                loanStartDate: '2024-01-15T00:00:00.000Z',
                isRevolvingCredit: false,
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.withLoanStart = withLoanStart.id

        // Liability in OTHER entity — should NOT appear in e1's query
        const [inE2] = await db
            .insert(liability)
            .values({
                entityId: e2.id,
                liabilityType: 'LOAN',
                creditor: `Other Entity Lender ${TS}`,
                originalAmount: '5000.00',
                currentBalance: '4500.00',
                interestRate: '0.045',
                monthlyPayment: '100.00',
                isRevolvingCredit: false,
                status: 'ACTIVE',
                updatedAt: new Date().toISOString(),
            })
            .returning()
        ids.inE2 = inE2.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        if (ids.e1) {
            await db.delete(liability).where(eq(liability.entityId, ids.e1))
        }
        if (ids.e2) {
            await db.delete(liability).where(eq(liability.entityId, ids.e2))
        }
        if (ids.e1) await db.delete(entity).where(eq(entity.id, ids.e1))
        if (ids.e2) await db.delete(entity).where(eq(entity.id, ids.e2))
    }, TEST_TIMEOUT)

    test(
        'returns one entry per liability for the entity',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: ids.e1!,
            })
            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBe(5)
            const returnedIds = result.map((r) => r.id).sort((a, b) => a - b)
            const expected = [
                ids.amortizing,
                ids.revolving,
                ids.noRate,
                ids.noPayment,
                ids.withLoanStart,
            ]
                .filter((x): x is number => x !== null)
                .sort((a, b) => a - b)
            expect(returnedIds).toEqual(expected)
        },
        TEST_TIMEOUT,
    )

    test(
        'returns projection: null for revolving credit',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: ids.e1!,
            })
            const revolving = result.find((r) => r.id === ids.revolving)
            expect(revolving).toBeDefined()
            expect(revolving?.projection).toBeNull()
        },
        TEST_TIMEOUT,
    )

    test(
        'returns projection: null when interestRate is missing',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: ids.e1!,
            })
            const noRate = result.find((r) => r.id === ids.noRate)
            expect(noRate).toBeDefined()
            expect(noRate?.projection).toBeNull()
        },
        TEST_TIMEOUT,
    )

    test(
        'returns projection: null when monthlyPayment is missing',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: ids.e1!,
            })
            const noPayment = result.find((r) => r.id === ids.noPayment)
            expect(noPayment).toBeDefined()
            expect(noPayment?.projection).toBeNull()
        },
        TEST_TIMEOUT,
    )

    test(
        'returns a valid projection for amortizing liability',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: ids.e1!,
            })
            const valid = result.find((r) => r.id === ids.amortizing)
            expect(valid).toBeDefined()
            expect(valid?.projection).not.toBeNull()
            expect(typeof valid?.projection?.payoffDate).toBe('string')
            expect(typeof valid?.projection?.monthsRemaining).toBe('number')
            expect(valid?.projection?.monthsRemaining).toBeGreaterThan(0)
        },
        TEST_TIMEOUT,
    )

    test(
        'returns startDate = loanStartDate when present',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: ids.e1!,
            })
            const withLoanStart = result.find((r) => r.id === ids.withLoanStart)
            expect(withLoanStart).toBeDefined()
            expect(withLoanStart?.startDate).toBeTruthy()
            // loanStartDate fixture is '2024-01-15...'
            const startStr =
                typeof withLoanStart?.startDate === 'string'
                    ? withLoanStart?.startDate
                    : (
                          withLoanStart?.startDate as Date | undefined
                      )?.toISOString()
            expect(startStr).toMatch(/^2024-01-15/)
        },
        TEST_TIMEOUT,
    )

    test(
        'startDate falls back to createdAt when loanStartDate is null',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: ids.e1!,
            })
            const amortizing = result.find((r) => r.id === ids.amortizing)
            // amortizing fixture has no loanStartDate, so startDate === createdAt (truthy)
            expect(amortizing?.startDate).toBeTruthy()
        },
        TEST_TIMEOUT,
    )

    test(
        'scopes results by entityId — does not leak rows from other entities',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: ids.e1!,
            })
            expect(result.some((r) => r.id === ids.inE2)).toBe(false)
        },
        TEST_TIMEOUT,
    )

    test(
        'returns empty array for entity with no liabilities',
        async () => {
            const caller = adminCaller()
            const result = await caller.liability.payoffProjections({
                entityId: 999999999,
            })
            expect(result).toEqual([])
        },
        TEST_TIMEOUT,
    )
})

// ============================================================
// Liability ↔ account linkage — cross-entity FK guard + getLinked (26-02)
// ============================================================

const LTS = `${Date.now().toString().slice(-8)}L`

const linkIds = {
    entityA: null as number | null,
    entityB: null as number | null,
    bankA: null as number | null,
    investmentA: null as number | null,
    bankB: null as number | null,
}

describe.skipIf(isProductionDb)('liability account linkage', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()

        const [eA] = await db
            .insert(entity)
            .values({
                name: `Linkage Entity A ${LTS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        linkIds.entityA = eA.id

        const [eB] = await db
            .insert(entity)
            .values({
                name: `Linkage Entity B ${LTS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        linkIds.entityB = eB.id

        const [bA] = await db
            .insert(bankAccount)
            .values({
                entityId: eA.id,
                name: `Linkage Bank A ${LTS}`,
                institution: 'TestBank',
                accountType: 'CHECKING',
                accountNumber: `BNKA${LTS}`,
                currentBalance: '5000.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        linkIds.bankA = bA.id

        const [iA] = await db
            .insert(investmentAccount)
            .values({
                entityId: eA.id,
                name: `Linkage Invest A ${LTS}`,
                institution: 'TestBrokerage',
                accountType: 'BROKERAGE',
                accountNumber: `INVA${LTS}`,
                currentBalance: '25000.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        linkIds.investmentA = iA.id

        const [bB] = await db
            .insert(bankAccount)
            .values({
                entityId: eB.id,
                name: `Linkage Bank B ${LTS}`,
                institution: 'TestBank',
                accountType: 'CHECKING',
                accountNumber: `BNKB${LTS}`,
                currentBalance: '7500.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        linkIds.bankB = bB.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        // Delete by entityId to catch any auto-created rows.
        if (linkIds.entityA) {
            await db
                .delete(liability)
                .where(eq(liability.entityId, linkIds.entityA))
            await db
                .delete(bankAccount)
                .where(eq(bankAccount.entityId, linkIds.entityA))
            await db
                .delete(investmentAccount)
                .where(eq(investmentAccount.entityId, linkIds.entityA))
        }
        if (linkIds.entityB) {
            await db
                .delete(liability)
                .where(eq(liability.entityId, linkIds.entityB))
            await db
                .delete(bankAccount)
                .where(eq(bankAccount.entityId, linkIds.entityB))
        }
        if (linkIds.entityA)
            await db.delete(entity).where(eq(entity.id, linkIds.entityA))
        if (linkIds.entityB)
            await db.delete(entity).where(eq(entity.id, linkIds.entityB))
    }, TEST_TIMEOUT)

    test(
        'create links bank account belonging to the same entity',
        async () => {
            const caller = adminCaller()
            const created = await caller.liability.create({
                entityId: linkIds.entityA!,
                liabilityType: 'LOAN',
                creditor: `Same-Entity Bank Loan ${LTS}`,
                originalAmount: '10000.00',
                currentBalance: '9000.00',
                isRevolvingCredit: false,
                status: 'ACTIVE',
                bankAccountId: linkIds.bankA!,
            })
            expect(created.bankAccountId).toBe(linkIds.bankA!)
        },
        TEST_TIMEOUT,
    )

    test(
        'create rejects cross-entity bank account FK with BAD_REQUEST',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.liability.create({
                    entityId: linkIds.entityA!,
                    liabilityType: 'LOAN',
                    creditor: `Cross-Entity Bank Loan ${LTS}`,
                    originalAmount: '10000.00',
                    currentBalance: '9000.00',
                    isRevolvingCredit: false,
                    status: 'ACTIVE',
                    bankAccountId: linkIds.bankB!,
                }),
            ).rejects.toThrow(/does not belong to this entity/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'create links investment account belonging to the same entity',
        async () => {
            const caller = adminCaller()
            const created = await caller.liability.create({
                entityId: linkIds.entityA!,
                liabilityType: 'LOAN',
                creditor: `Same-Entity Investment Loan ${LTS}`,
                originalAmount: '20000.00',
                currentBalance: '18000.00',
                isRevolvingCredit: false,
                status: 'ACTIVE',
                investmentAccountId: linkIds.investmentA!,
            })
            expect(created.investmentAccountId).toBe(linkIds.investmentA!)
        },
        TEST_TIMEOUT,
    )

    test(
        'update rejects setting a cross-entity bank account FK with BAD_REQUEST',
        async () => {
            const caller = adminCaller()
            const created = await caller.liability.create({
                entityId: linkIds.entityA!,
                liabilityType: 'LOAN',
                creditor: `Update Target Loan ${LTS}`,
                originalAmount: '5000.00',
                currentBalance: '4500.00',
                isRevolvingCredit: false,
                status: 'ACTIVE',
            })
            await expect(
                caller.liability.update({
                    id: created.id,
                    entityId: linkIds.entityA!,
                    data: { bankAccountId: linkIds.bankB! },
                }),
            ).rejects.toThrow(/does not belong to this entity/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'getLinked returns only liabilities linked to the given bank account',
        async () => {
            const caller = adminCaller()
            const linked = await caller.liability.create({
                entityId: linkIds.entityA!,
                liabilityType: 'LOAN',
                creditor: `getLinked Match ${LTS}`,
                originalAmount: '3000.00',
                currentBalance: '2800.00',
                isRevolvingCredit: false,
                status: 'ACTIVE',
                bankAccountId: linkIds.bankA!,
            })
            const unlinked = await caller.liability.create({
                entityId: linkIds.entityA!,
                liabilityType: 'LOAN',
                creditor: `getLinked NonMatch ${LTS}`,
                originalAmount: '4000.00',
                currentBalance: '3800.00',
                isRevolvingCredit: false,
                status: 'ACTIVE',
            })

            const result = await caller.liability.getLinked({
                entityId: linkIds.entityA!,
                bankAccountId: linkIds.bankA!,
            })
            const resultIds = result.map((r) => r.id)
            expect(resultIds).toContain(linked.id)
            expect(resultIds).not.toContain(unlinked.id)
            for (const row of result) {
                expect(row.bankAccountId).toBe(linkIds.bankA!)
                expect(row.entityId).toBe(linkIds.entityA!)
            }
        },
        TEST_TIMEOUT,
    )
})
