/**
 * tRPC tests for the noteReceivable router — the asset-side mirror of liability.
 * Covers CRUD + entity scoping, the cross-entity beneficiary FK guard, insert
 * validation, the repayment flow (principal/interest split → trust_accounting
 * INCOME entries per Tex. Prop. Code §116.163, balance reduction, PAID_OFF
 * transition), and dashboard.summary integration.
 *
 * Runs against the test branch DB (skips when DATABASE_URL is production).
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import {
    bankAccount,
    beneficiary,
    entity,
    noteReceivable,
    receivablePayment,
    trustAccounting,
} from '@/db/schema'
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
            id: '950',
            name: 'Receivable Test Admin',
            email: 'receivable-admin@test.com',
        }),
    )
}

// ============================================================
// CRUD + entity scoping + beneficiary FK guard + validation
// ============================================================

const ids = {
    entityA: null as number | null,
    entityB: null as number | null,
    bankA: null as number | null,
    benA: null as number | null,
    benB: null as number | null,
    inB: null as number | null,
}

describe.skipIf(isProductionDb)('noteReceivable CRUD', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()

        const [eA] = await db
            .insert(entity)
            .values({
                name: `Receivable Entity A ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.entityA = eA.id

        const [eB] = await db
            .insert(entity)
            .values({
                name: `Receivable Entity B ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.entityB = eB.id

        const [bA] = await db
            .insert(bankAccount)
            .values({
                entityId: eA.id,
                name: `Receivable Bank A ${TS}`,
                institution: 'TestBank',
                accountType: 'CHECKING',
                accountNumber: `RBNKA${TS}`,
                currentBalance: '5000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.bankA = bA.id

        const [benArow] = await db
            .insert(beneficiary)
            .values({
                entityId: eA.id,
                firstName: 'Recv',
                lastName: `BenA${TS}`,
                email: `recv-bena-${TS}@example.com`,
                relationship: 'CHILD',
                sharePercent: '50.00',
                updatedAt: now,
            })
            .returning()
        ids.benA = benArow.id

        const [benBrow] = await db
            .insert(beneficiary)
            .values({
                entityId: eB.id,
                firstName: 'Recv',
                lastName: `BenB${TS}`,
                email: `recv-benb-${TS}@example.com`,
                relationship: 'CHILD',
                sharePercent: '50.00',
                updatedAt: now,
            })
            .returning()
        ids.benB = benBrow.id

        // A receivable in entity B — must never appear in A's list.
        const [inB] = await db
            .insert(noteReceivable)
            .values({
                entityId: eB.id,
                receivableType: 'PROMISSORY_NOTE',
                debtor: `Other Entity Debtor ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '1000.00',
                currentBalance: '1000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.inB = inB.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        for (const e of [ids.entityA, ids.entityB]) {
            if (!e) continue
            // payments → receivables (reverse FK), then beneficiaries/bank/entity
            const recs = await db
                .select({ id: noteReceivable.id })
                .from(noteReceivable)
                .where(eq(noteReceivable.entityId, e))
            for (const r of recs) {
                await db
                    .delete(receivablePayment)
                    .where(eq(receivablePayment.receivableId, r.id))
            }
            await db
                .delete(noteReceivable)
                .where(eq(noteReceivable.entityId, e))
            await db.delete(beneficiary).where(eq(beneficiary.entityId, e))
            await db.delete(bankAccount).where(eq(bankAccount.entityId, e))
            await db.delete(entity).where(eq(entity.id, e))
        }
    }, TEST_TIMEOUT)

    test(
        'create inserts a receivable with the supplied fields and defaults',
        async () => {
            const caller = adminCaller()
            const created = await caller.noteReceivable.create({
                entityId: ids.entityA!,
                receivableType: 'PROMISSORY_NOTE',
                debtor: `Acme Borrower ${TS}`,
                debtorAddress: '123 Main St, Dallas, TX',
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '25000.00',
                currentBalance: '25000.00',
                interestRate: '0.050',
                dueDate: '2025-01-01T00:00:00.000Z',
                status: 'ACTIVE',
            })
            expect(created.id).toBeGreaterThan(0)
            expect(created.debtor).toBe(`Acme Borrower ${TS}`)
            expect(created.currentBalance).toBe('25000.00')
            expect(created.noteType).toBe('NON_NEGOTIABLE')
            // allocationClass defaults to PRINCIPAL (note principal is a principal asset)
            expect(created.allocationClass).toBe('PRINCIPAL')
        },
        TEST_TIMEOUT,
    )

    test(
        'list returns only the entity’s receivables (entity scoping)',
        async () => {
            const caller = adminCaller()
            const rows = await caller.noteReceivable.list({
                entityId: ids.entityA!,
            })
            expect(Array.isArray(rows)).toBe(true)
            expect(rows.every((r) => r.entityId === ids.entityA)).toBe(true)
            expect(rows.some((r) => r.id === ids.inB)).toBe(false)
        },
        TEST_TIMEOUT,
    )

    test(
        'byId returns undefined for a row in another entity',
        async () => {
            const caller = adminCaller()
            const row = await caller.noteReceivable.byId({
                id: ids.inB!,
                entityId: ids.entityA!,
            })
            expect(row).toBeFalsy()
        },
        TEST_TIMEOUT,
    )

    test(
        'create links a beneficiary belonging to the same entity',
        async () => {
            const caller = adminCaller()
            const created = await caller.noteReceivable.create({
                entityId: ids.entityA!,
                receivableType: 'ADVANCE',
                debtor: `Beneficiary Debtor ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '8000.00',
                currentBalance: '8000.00',
                beneficiaryId: ids.benA!,
                status: 'ACTIVE',
            })
            expect(created.beneficiaryId).toBe(ids.benA!)
        },
        TEST_TIMEOUT,
    )

    test(
        'create rejects a cross-entity beneficiary FK with BAD_REQUEST',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.noteReceivable.create({
                    entityId: ids.entityA!,
                    receivableType: 'ADVANCE',
                    debtor: `Cross Entity Ben ${TS}`,
                    noteType: 'NON_NEGOTIABLE',
                    originalPrincipal: '8000.00',
                    currentBalance: '8000.00',
                    beneficiaryId: ids.benB!,
                    status: 'ACTIVE',
                }),
            ).rejects.toThrow(/does not belong to this entity/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'update modifies a receivable scoped to its entity',
        async () => {
            const caller = adminCaller()
            const created = await caller.noteReceivable.create({
                entityId: ids.entityA!,
                receivableType: 'PERSONAL_LOAN',
                debtor: `Update Target ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '4000.00',
                currentBalance: '4000.00',
                status: 'ACTIVE',
            })
            const updated = await caller.noteReceivable.update({
                id: created.id,
                entityId: ids.entityA!,
                data: { currentBalance: '3500.00', status: 'PAST_DUE' },
            })
            expect(updated.currentBalance).toBe('3500.00')
            expect(updated.status).toBe('PAST_DUE')
        },
        TEST_TIMEOUT,
    )

    test(
        'update against the wrong entity throws NOT_FOUND',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.noteReceivable.update({
                    id: ids.inB!,
                    entityId: ids.entityA!,
                    data: { currentBalance: '1.00' },
                }),
            ).rejects.toThrow(/not found/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'update rejects setting a cross-entity beneficiary FK',
        async () => {
            const caller = adminCaller()
            const created = await caller.noteReceivable.create({
                entityId: ids.entityA!,
                receivableType: 'PERSONAL_LOAN',
                debtor: `Update Ben Guard ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '2000.00',
                currentBalance: '2000.00',
                status: 'ACTIVE',
            })
            await expect(
                caller.noteReceivable.update({
                    id: created.id,
                    entityId: ids.entityA!,
                    data: { beneficiaryId: ids.benB! },
                }),
            ).rejects.toThrow(/does not belong to this entity/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'delete removes a receivable; wrong entity throws NOT_FOUND',
        async () => {
            const caller = adminCaller()
            const created = await caller.noteReceivable.create({
                entityId: ids.entityA!,
                receivableType: 'OTHER',
                debtor: `Delete Target ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '500.00',
                currentBalance: '500.00',
                status: 'ACTIVE',
            })
            await expect(
                caller.noteReceivable.delete({
                    id: created.id,
                    entityId: ids.entityB!,
                }),
            ).rejects.toThrow(/not found/i)
            const deleted = await caller.noteReceivable.delete({
                id: created.id,
                entityId: ids.entityA!,
            })
            expect(deleted.id).toBe(created.id)
        },
        TEST_TIMEOUT,
    )

    test(
        'create rejects non-positive originalPrincipal (validation)',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.noteReceivable.create({
                    entityId: ids.entityA!,
                    receivableType: 'PROMISSORY_NOTE',
                    debtor: `Bad Principal ${TS}`,
                    noteType: 'NON_NEGOTIABLE',
                    originalPrincipal: '0',
                    currentBalance: '0',
                    status: 'ACTIVE',
                }),
            ).rejects.toThrow(/positive/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'create rejects negative currentBalance (validation)',
        async () => {
            const caller = adminCaller()
            await expect(
                caller.noteReceivable.create({
                    entityId: ids.entityA!,
                    receivableType: 'PROMISSORY_NOTE',
                    debtor: `Bad Balance ${TS}`,
                    noteType: 'NON_NEGOTIABLE',
                    originalPrincipal: '100.00',
                    currentBalance: '-5.00',
                    status: 'ACTIVE',
                }),
            ).rejects.toThrow(/non-negative/i)
        },
        TEST_TIMEOUT,
    )
})

// ============================================================
// Repayment flow — balance reduction + trust_accounting INCOME
// split (interest -> income, principal -> principal). §116.163
// ============================================================

const pay = {
    entityId: null as number | null,
    otherEntityId: null as number | null,
    bankId: null as number | null,
    otherBankId: null as number | null,
    interestBearingId: null as number | null,
    nonInterestId: null as number | null,
    payoffId: null as number | null,
    otherReceivableId: null as number | null,
}

describe.skipIf(isProductionDb)('noteReceivable.recordPayment', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()

        const [e1] = await db
            .insert(entity)
            .values({
                name: `Recv Pay Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        pay.entityId = e1.id

        const [e2] = await db
            .insert(entity)
            .values({
                name: `Recv Pay Other Entity ${TS}`,
                entityType: 'TRUST',
                trustType: 'IRREVOCABLE',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        pay.otherEntityId = e2.id

        const [b1] = await db
            .insert(bankAccount)
            .values({
                entityId: e1.id,
                name: `Recv Pay Bank ${TS}`,
                institution: 'TestBank',
                accountType: 'CHECKING',
                accountNumber: `RPB${TS}`,
                currentBalance: '0.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        pay.bankId = b1.id

        const [b2] = await db
            .insert(bankAccount)
            .values({
                entityId: e2.id,
                name: `Recv Pay Other Bank ${TS}`,
                institution: 'TestBank',
                accountType: 'CHECKING',
                accountNumber: `RPOB${TS}`,
                currentBalance: '0.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        pay.otherBankId = b2.id

        const [interestBearing] = await db
            .insert(noteReceivable)
            .values({
                entityId: e1.id,
                receivableType: 'PROMISSORY_NOTE',
                debtor: `Interest Debtor ${TS}`,
                noteType: 'NEGOTIABLE',
                originalPrincipal: '10000.00',
                currentBalance: '10000.00',
                interestRate: '0.050',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        pay.interestBearingId = interestBearing.id

        const [nonInterest] = await db
            .insert(noteReceivable)
            .values({
                entityId: e1.id,
                receivableType: 'PERSONAL_LOAN',
                debtor: `NonInterest Debtor ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '5000.00',
                currentBalance: '5000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        pay.nonInterestId = nonInterest.id

        const [payoff] = await db
            .insert(noteReceivable)
            .values({
                entityId: e1.id,
                receivableType: 'PERSONAL_LOAN',
                debtor: `Payoff Debtor ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '2000.00',
                currentBalance: '2000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        pay.payoffId = payoff.id

        const [otherRecv] = await db
            .insert(noteReceivable)
            .values({
                entityId: e2.id,
                receivableType: 'PERSONAL_LOAN',
                debtor: `Other Entity Recv ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '3000.00',
                currentBalance: '3000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        pay.otherReceivableId = otherRecv.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        for (const e of [pay.entityId, pay.otherEntityId]) {
            if (!e) continue
            await db
                .delete(trustAccounting)
                .where(eq(trustAccounting.entityId, e))
            const recs = await db
                .select({ id: noteReceivable.id })
                .from(noteReceivable)
                .where(eq(noteReceivable.entityId, e))
            for (const r of recs) {
                await db
                    .delete(receivablePayment)
                    .where(eq(receivablePayment.receivableId, r.id))
            }
            await db
                .delete(noteReceivable)
                .where(eq(noteReceivable.entityId, e))
            await db.delete(bankAccount).where(eq(bankAccount.entityId, e))
            await db.delete(entity).where(eq(entity.id, e))
        }
    }, TEST_TIMEOUT)

    test(
        'explicit split reduces balance by principal and posts two INCOME entries',
        async () => {
            const caller = adminCaller()
            const today = new Date().toISOString().split('T')[0]!

            const result = await caller.noteReceivable.recordPayment({
                entityId: pay.entityId!,
                receivableId: pay.interestBearingId!,
                bankAccountId: pay.bankId!,
                amount: '1000.00',
                principalPortion: '800.00',
                interestPortion: '200.00',
                paymentDate: today,
                paymentMethod: 'CHECK',
            })

            // Balance reduced by the principal portion only: 10000 - 800 = 9200
            expect(result.receivable.currentBalance).toBe('9200.00')
            expect(result.accountingEntries.length).toBe(2)

            const entries = await caller.trustAccounting.list({
                entityId: pay.entityId!,
            })
            const mine = entries.filter(
                (e) =>
                    e.sourceAssetType === 'NOTE_RECEIVABLE' &&
                    e.sourceAssetId === pay.interestBearingId,
            )
            const interest = mine.find((e) => e.incomeType === 'INTEREST')
            const principal = mine.find((e) => e.incomeType === 'SALE_PROCEEDS')

            expect(interest).toBeDefined()
            expect(interest!.entryType).toBe('INCOME')
            expect(interest!.amount).toBe('200.00')
            // Interest is income, NOT principal
            expect(interest!.isPrincipal).toBe(false)
            expect(interest!.bankAccountId).toBe(pay.bankId)

            expect(principal).toBeDefined()
            expect(principal!.entryType).toBe('INCOME')
            // principalFromDeposit = amount - interest = 1000 - 200 = 800
            expect(principal!.amount).toBe('800.00')
            // Returned principal is a principal receipt
            expect(principal!.isPrincipal).toBe(true)
        },
        TEST_TIMEOUT,
    )

    test(
        'non-interest payment treats the whole amount as principal (one INCOME entry)',
        async () => {
            const caller = adminCaller()
            const today = new Date().toISOString().split('T')[0]!

            const result = await caller.noteReceivable.recordPayment({
                entityId: pay.entityId!,
                receivableId: pay.nonInterestId!,
                bankAccountId: pay.bankId!,
                amount: '1000.00',
                paymentDate: today,
                paymentMethod: 'ACH',
            })

            // No interest → whole amount reduces principal: 5000 - 1000 = 4000
            expect(result.receivable.currentBalance).toBe('4000.00')
            expect(result.accountingEntries.length).toBe(1)

            const entries = await caller.trustAccounting.list({
                entityId: pay.entityId!,
            })
            const mine = entries.filter(
                (e) =>
                    e.sourceAssetType === 'NOTE_RECEIVABLE' &&
                    e.sourceAssetId === pay.nonInterestId,
            )
            expect(mine.length).toBe(1)
            expect(mine[0]!.entryType).toBe('INCOME')
            expect(mine[0]!.amount).toBe('1000.00')
            expect(mine[0]!.isPrincipal).toBe(true)
            expect(mine[0]!.incomeType).toBe('SALE_PROCEEDS')
            // No INTEREST entry was created
            expect(mine.some((e) => e.incomeType === 'INTEREST')).toBe(false)
        },
        TEST_TIMEOUT,
    )

    test(
        'paying the full balance marks the receivable PAID_OFF at zero',
        async () => {
            const caller = adminCaller()
            const today = new Date().toISOString().split('T')[0]!

            const result = await caller.noteReceivable.recordPayment({
                entityId: pay.entityId!,
                receivableId: pay.payoffId!,
                bankAccountId: pay.bankId!,
                amount: '2000.00',
                principalPortion: '2000.00',
                paymentDate: today,
                paymentMethod: 'WIRE',
            })

            expect(result.receivable.currentBalance).toBe('0.00')
            expect(result.receivable.status).toBe('PAID_OFF')
        },
        TEST_TIMEOUT,
    )

    test(
        'rejects a bank account that does not belong to the entity',
        async () => {
            const caller = adminCaller()
            const today = new Date().toISOString().split('T')[0]!
            await expect(
                caller.noteReceivable.recordPayment({
                    entityId: pay.entityId!,
                    receivableId: pay.interestBearingId!,
                    bankAccountId: pay.otherBankId!,
                    amount: '100.00',
                    paymentDate: today,
                    paymentMethod: 'CHECK',
                }),
            ).rejects.toThrow(/does not belong to this entity/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'rejects a receivable that does not belong to the entity',
        async () => {
            const caller = adminCaller()
            const today = new Date().toISOString().split('T')[0]!
            await expect(
                caller.noteReceivable.recordPayment({
                    entityId: pay.entityId!,
                    receivableId: pay.otherReceivableId!,
                    bankAccountId: pay.bankId!,
                    amount: '100.00',
                    paymentDate: today,
                    paymentMethod: 'CHECK',
                }),
            ).rejects.toThrow(/not found/i)
        },
        TEST_TIMEOUT,
    )

    test(
        'getPayments returns recorded payments newest-first',
        async () => {
            const caller = adminCaller()
            const payments = await caller.noteReceivable.getPayments({
                receivableId: pay.interestBearingId!,
                entityId: pay.entityId!,
            })
            expect(payments.length).toBeGreaterThanOrEqual(1)
            expect(payments[0]!.amount).toBe('1000.00')
        },
        TEST_TIMEOUT,
    )
})

// ============================================================
// Dashboard integration — receivables are returned by summary
// ============================================================

const dash = {
    entityId: null as number | null,
    receivableId: null as number | null,
}

describe.skipIf(isProductionDb)(
    'dashboard.summary includes receivables',
    () => {
        beforeAll(async () => {
            const now = new Date().toISOString()
            const [e1] = await db
                .insert(entity)
                .values({
                    name: `Recv Dash Entity ${TS}`,
                    entityType: 'TRUST',
                    trustType: 'IRREVOCABLE',
                    status: 'ACTIVE',
                    updatedAt: now,
                })
                .returning()
            dash.entityId = e1.id

            const [r] = await db
                .insert(noteReceivable)
                .values({
                    entityId: e1.id,
                    receivableType: 'PROMISSORY_NOTE',
                    debtor: `Dash Debtor ${TS}`,
                    noteType: 'NON_NEGOTIABLE',
                    originalPrincipal: '42000.00',
                    currentBalance: '42000.00',
                    status: 'ACTIVE',
                    updatedAt: now,
                })
                .returning()
            dash.receivableId = r.id
        }, TEST_TIMEOUT)

        afterAll(async () => {
            if (dash.entityId) {
                await db
                    .delete(noteReceivable)
                    .where(eq(noteReceivable.entityId, dash.entityId))
                await db.delete(entity).where(eq(entity.id, dash.entityId))
            }
        }, TEST_TIMEOUT)

        test(
            'summary returns the entity’s note receivables',
            async () => {
                const caller = adminCaller()
                const summary = await caller.dashboard.summary({
                    entityId: dash.entityId!,
                })
                expect(Array.isArray(summary.noteReceivables)).toBe(true)
                const mine = summary.noteReceivables.find(
                    (r) => r.id === dash.receivableId,
                )
                expect(mine).toBeDefined()
                expect(mine!.currentBalance).toBe('42000.00')
            },
            TEST_TIMEOUT,
        )
    },
)
