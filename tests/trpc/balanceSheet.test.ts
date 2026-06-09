/** tRPC tests for the balanceSheet.listAll aggregator (assets + receivables + liabilities). */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { bankAccount, entity, liability, noteReceivable } from '@/db/schema'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import { createAdminContext } from '../helpers/mock-context'

const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)

function adminCaller() {
    return createCaller(
        createAdminContext({
            id: '996',
            name: 'Balance Sheet Admin',
            email: 'balance-sheet@test.com',
        }),
    )
}

const TS = Date.now().toString().slice(-8)

const ids = {
    entityId: null as number | null,
    bankId: null as number | null,
    receivableId: null as number | null,
    liabilityId: null as number | null,
}

describe.skipIf(isProductionDb)('balanceSheet.listAll aggregator', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()

        const [e1] = await db
            .insert(entity)
            .values({
                name: `Balance Sheet Trust ${TS}`,
                entityType: 'TRUST',
                updatedAt: now,
            })
            .returning()
        ids.entityId = e1.id

        const [b] = await db
            .insert(bankAccount)
            .values({
                entityId: e1.id,
                name: `BS Bank ${TS}`,
                institution: 'TestBank',
                accountType: 'CHECKING',
                accountNumber: `BSBNK${TS}`,
                currentBalance: '10000.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        ids.bankId = b.id

        const [r] = await db
            .insert(noteReceivable)
            .values({
                entityId: e1.id,
                receivableType: 'PROMISSORY_NOTE',
                debtor: `BS Debtor ${TS}`,
                noteType: 'NON_NEGOTIABLE',
                originalPrincipal: '5000.00',
                currentBalance: '4200.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.receivableId = r.id

        const [l] = await db
            .insert(liability)
            .values({
                entityId: e1.id,
                liabilityType: 'LOAN',
                creditor: `BS Creditor ${TS}`,
                originalAmount: '50000.00',
                currentBalance: '32000.00',
                allocationClass: 'PRINCIPAL',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.liabilityId = l.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        if (ids.liabilityId)
            await db.delete(liability).where(eq(liability.id, ids.liabilityId))
        if (ids.receivableId)
            await db
                .delete(noteReceivable)
                .where(eq(noteReceivable.id, ids.receivableId))
        if (ids.bankId)
            await db.delete(bankAccount).where(eq(bankAccount.id, ids.bankId))
        if (ids.entityId)
            await db.delete(entity).where(eq(entity.id, ids.entityId))
    }, TEST_TIMEOUT)

    test('returns rows for all three categories', async () => {
        const rows = await adminCaller().balanceSheet.listAll({
            entityId: ids.entityId!,
        })
        const categories = new Set(rows.map((r) => r.category))
        expect(categories.has('ASSET')).toBe(true)
        expect(categories.has('RECEIVABLE')).toBe(true)
        expect(categories.has('LIABILITY')).toBe(true)
    })

    test('asset row maps name→party, value→amount, category→type', async () => {
        const rows = await adminCaller().balanceSheet.listAll({
            entityId: ids.entityId!,
        })
        const bank = rows.find(
            (r) => r.category === 'ASSET' && r.id === ids.bankId,
        )
        expect(bank?.party).toBe(`BS Bank ${TS}`)
        expect(bank?.amount).toBe('10000.00')
        expect(bank?.type).toBe('Bank Account')
        expect(bank?.href).toBe('/accounts')
    })

    test('receivable row maps debtor→party, currentBalance→amount, title-cased type', async () => {
        const rows = await adminCaller().balanceSheet.listAll({
            entityId: ids.entityId!,
        })
        const rec = rows.find(
            (r) => r.category === 'RECEIVABLE' && r.id === ids.receivableId,
        )
        expect(rec?.party).toBe(`BS Debtor ${TS}`)
        expect(rec?.amount).toBe('4200.00')
        expect(rec?.type).toBe('Promissory Note')
        expect(rec?.href).toBe('/receivables')
        expect(rec?.rowKey).toBe(`receivable:${ids.receivableId}`)
    })

    test('liability row maps creditor→party, currentBalance→amount, title-cased type', async () => {
        const rows = await adminCaller().balanceSheet.listAll({
            entityId: ids.entityId!,
        })
        const liab = rows.find(
            (r) => r.category === 'LIABILITY' && r.id === ids.liabilityId,
        )
        expect(liab?.party).toBe(`BS Creditor ${TS}`)
        expect(liab?.amount).toBe('32000.00')
        expect(liab?.type).toBe('Loan')
        expect(liab?.href).toBe('/liabilities')
    })

    test('rowKey is namespaced so ids never collide across categories', async () => {
        const rows = await adminCaller().balanceSheet.listAll({
            entityId: ids.entityId!,
        })
        const keys = rows.map((r) => r.rowKey)
        expect(new Set(keys).size).toBe(keys.length)
    })

    test('rows are sorted by updatedAt desc by default', async () => {
        const rows = await adminCaller().balanceSheet.listAll({
            entityId: ids.entityId!,
        })
        for (let i = 1; i < rows.length; i++) {
            expect(rows[i - 1].updatedAt >= rows[i].updatedAt).toBe(true)
        }
    })

    test('honors entityId — another entity rows are filtered out', async () => {
        const now = new Date().toISOString()
        const [other] = await db
            .insert(entity)
            .values({
                name: `BS Other Trust ${TS}`,
                entityType: 'TRUST',
                updatedAt: now,
            })
            .returning()
        const [l] = await db
            .insert(liability)
            .values({
                entityId: other.id,
                liabilityType: 'LOAN',
                creditor: 'Should Not Appear',
                originalAmount: '1.00',
                currentBalance: '1.00',
                allocationClass: 'PRINCIPAL',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        try {
            const rows = await adminCaller().balanceSheet.listAll({
                entityId: ids.entityId!,
            })
            expect(
                rows.find((r) => r.category === 'LIABILITY' && r.id === l.id),
            ).toBeUndefined()
        } finally {
            await db.delete(liability).where(eq(liability.id, l.id))
            await db.delete(entity).where(eq(entity.id, other.id))
        }
    })
})
