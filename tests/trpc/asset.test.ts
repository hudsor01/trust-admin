/** tRPC tests for the asset.listAll aggregator. */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import {
    bankAccount,
    entity,
    homestead,
    insurancePolicy,
    investmentAccount,
    personalProperty,
    rentalProperty,
    vehicle,
} from '@/db/schema'
import { createCallerFactory } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'
import { isProductionDb } from '../helpers/db-guard'
import { createAdminContext } from '../helpers/mock-context'

const TEST_TIMEOUT = 30000
const createCaller = createCallerFactory(appRouter)

function adminCaller() {
    return createCaller(
        createAdminContext({
            id: '997',
            name: 'Asset Aggregator Admin',
            email: 'asset-aggregator@test.com',
        }),
    )
}

const TS = Date.now().toString().slice(-8)

const ids = {
    entityId: null as number | null,
    vehicleId: null as number | null,
    homesteadId: null as number | null,
    rentalId: null as number | null,
    bankId: null as number | null,
    investmentId: null as number | null,
    artId: null as number | null,
    personalId: null as number | null,
    insuranceId: null as number | null,
}

describe.skipIf(isProductionDb)('asset.listAll aggregator', () => {
    beforeAll(async () => {
        const now = new Date().toISOString()

        const [e1] = await db
            .insert(entity)
            .values({
                name: `Asset Test Trust ${TS}`,
                entityType: 'TRUST',
                updatedAt: now,
            })
            .returning()
        ids.entityId = e1.id

        const [v] = await db
            .insert(vehicle)
            .values({
                entityId: e1.id,
                name: `Asset Test Vehicle ${TS}`,
                description: 'Black · VIN ABCDEFGH123456789',
                year: 2020,
                make: 'Ford',
                model: 'F-150',
                vin: `1ATEST${TS}A123`,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        ids.vehicleId = v.id

        const [h] = await db
            .insert(homestead)
            .values({
                entityId: e1.id,
                name: `Asset Test Home ${TS}`,
                description: 'Austin, TX',
                streetAddress: '1 Test St',
                city: 'Austin',
                state: 'TX',
                zip: '78701',
                propertyType: 'SINGLE_FAMILY',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                dodValue: '500000.00',
                updatedAt: now,
            })
            .returning()
        ids.homesteadId = h.id

        const [r] = await db
            .insert(rentalProperty)
            .values({
                entityId: e1.id,
                name: `Asset Test Rental ${TS}`,
                streetAddress: '2 Test St',
                city: 'Austin',
                state: 'TX',
                zip: '78702',
                propertyType: 'SINGLE_FAMILY',
                rentalStatus: 'RENTED',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        ids.rentalId = r.id

        const [b] = await db
            .insert(bankAccount)
            .values({
                entityId: e1.id,
                name: `Asset Test Bank ${TS}`,
                institution: 'TestBank',
                accountType: 'CHECKING',
                accountNumber: `BNK${TS}`,
                currentBalance: '1234.56',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        ids.bankId = b.id

        const [i] = await db
            .insert(investmentAccount)
            .values({
                entityId: e1.id,
                name: `Asset Test Invest ${TS}`,
                institution: 'TestBrokerage',
                accountType: 'BROKERAGE',
                accountNumber: `INV${TS}`,
                currentBalance: '99999.99',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        ids.investmentId = i.id

        const [art] = await db
            .insert(personalProperty)
            .values({
                entityId: e1.id,
                name: `Asset Test Painting ${TS}`,
                description: 'Test artwork',
                category: 'ART',
                aiSuggested: false,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        ids.artId = art.id

        const [pp] = await db
            .insert(personalProperty)
            .values({
                entityId: e1.id,
                name: `Asset Test Furniture ${TS}`,
                description: 'Test furniture',
                category: 'FURNITURE',
                aiSuggested: false,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()
        ids.personalId = pp.id

        const [ins] = await db
            .insert(insurancePolicy)
            .values({
                entityId: e1.id,
                name: `Asset Test Policy ${TS}`,
                policyType: 'PROPERTY',
                carrier: 'TestIns',
                policyNumber: `POL${TS}`,
                coverageAmount: '250000.00',
                status: 'ACTIVE',
                updatedAt: now,
            })
            .returning()
        ids.insuranceId = ins.id
    }, TEST_TIMEOUT)

    afterAll(async () => {
        if (ids.insuranceId)
            await db
                .delete(insurancePolicy)
                .where(eq(insurancePolicy.id, ids.insuranceId))
        if (ids.personalId || ids.artId)
            await db.delete(personalProperty).where(
                and(
                    eq(personalProperty.entityId, ids.entityId!),
                    inArray(
                        personalProperty.id,
                        [ids.artId, ids.personalId].filter(
                            (x): x is number => x !== null,
                        ),
                    ),
                ),
            )
        if (ids.investmentId)
            await db
                .delete(investmentAccount)
                .where(eq(investmentAccount.id, ids.investmentId))
        if (ids.bankId)
            await db.delete(bankAccount).where(eq(bankAccount.id, ids.bankId))
        if (ids.rentalId)
            await db
                .delete(rentalProperty)
                .where(eq(rentalProperty.id, ids.rentalId))
        if (ids.homesteadId)
            await db.delete(homestead).where(eq(homestead.id, ids.homesteadId))
        if (ids.vehicleId)
            await db.delete(vehicle).where(eq(vehicle.id, ids.vehicleId))
        if (ids.entityId)
            await db.delete(entity).where(eq(entity.id, ids.entityId))
    }, TEST_TIMEOUT)

    test('returns rows for every asset kind in the entity', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        const kinds = new Set(rows.map((r) => r.kind))
        expect(kinds.has('vehicle')).toBe(true)
        expect(kinds.has('homestead')).toBe(true)
        expect(kinds.has('rentalProperty')).toBe(true)
        expect(kinds.has('bankAccount')).toBe(true)
        expect(kinds.has('investmentAccount')).toBe(true)
        expect(kinds.has('personalProperty')).toBe(true)
        expect(kinds.has('insurancePolicy')).toBe(true)
    })

    test('passes through real `name` and `description` columns', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        const v = rows.find(
            (r) => r.kind === 'vehicle' && r.id === ids.vehicleId,
        )
        expect(v?.name).toBe(`Asset Test Vehicle ${TS}`)
        expect(v?.description).toBe('Black · VIN ABCDEFGH123456789')
    })

    test('surfaces transferStatus from the six transferable asset kinds', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        // All six transferable kinds were seeded with transferStatus 'PENDING'.
        const transferable: Array<[string, number | null]> = [
            ['vehicle', ids.vehicleId],
            ['homestead', ids.homesteadId],
            ['rentalProperty', ids.rentalId],
            ['bankAccount', ids.bankId],
            ['investmentAccount', ids.investmentId],
            ['personalProperty', ids.personalId],
        ]
        for (const [kind, id] of transferable) {
            const row = rows.find((r) => r.kind === kind && r.id === id)
            expect(row?.transferStatus).toBe('PENDING')
        }
    })

    test('insurancePolicy rows expose transferStatus as null (no such column)', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        const ins = rows.find(
            (r) => r.kind === 'insurancePolicy' && r.id === ids.insuranceId,
        )
        expect(ins?.transferStatus).toBeNull()
    })

    test('routes ART personalProperty rows to /artwork, others to /personal-property', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        const art = rows.find(
            (r) => r.kind === 'personalProperty' && r.id === ids.artId,
        )
        const pp = rows.find(
            (r) => r.kind === 'personalProperty' && r.id === ids.personalId,
        )
        expect(art?.href).toBe('/artwork')
        expect(pp?.href).toBe('/personal-property')
    })

    test('maps personalProperty.category enum to display label', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        const art = rows.find(
            (r) => r.kind === 'personalProperty' && r.id === ids.artId,
        )
        const pp = rows.find(
            (r) => r.kind === 'personalProperty' && r.id === ids.personalId,
        )
        expect(art?.category).toBe('Artwork')
        expect(pp?.category).toBe('Furniture')
    })

    test('bankAccount value falls back from currentBalance to dodValue', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        const b = rows.find(
            (r) => r.kind === 'bankAccount' && r.id === ids.bankId,
        )
        // Seeded with currentBalance "1234.56", no dodValue.
        expect(b?.value).toBe('1234.56')
    })

    test('insurancePolicy value comes from coverageAmount', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        const i = rows.find(
            (r) => r.kind === 'insurancePolicy' && r.id === ids.insuranceId,
        )
        expect(i?.value).toBe('250000.00')
    })

    test('non-personalProperty rows get type-name as category', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        expect(
            rows.find((r) => r.kind === 'vehicle' && r.id === ids.vehicleId)
                ?.category,
        ).toBe('Vehicle')
        expect(
            rows.find((r) => r.kind === 'homestead' && r.id === ids.homesteadId)
                ?.category,
        ).toBe('Homestead')
        expect(
            rows.find(
                (r) => r.kind === 'rentalProperty' && r.id === ids.rentalId,
            )?.category,
        ).toBe('Rental Property')
        expect(
            rows.find((r) => r.kind === 'bankAccount' && r.id === ids.bankId)
                ?.category,
        ).toBe('Bank Account')
        expect(
            rows.find(
                (r) =>
                    r.kind === 'investmentAccount' && r.id === ids.investmentId,
            )?.category,
        ).toBe('Investment')
        expect(
            rows.find(
                (r) => r.kind === 'insurancePolicy' && r.id === ids.insuranceId,
            )?.category,
        ).toBe('Insurance')
    })

    test('rows are sorted by updatedAt desc by default', async () => {
        const rows = await adminCaller().asset.listAll({
            entityId: ids.entityId!,
        })
        for (let i = 1; i < rows.length; i++) {
            expect(rows[i - 1].updatedAt >= rows[i].updatedAt).toBe(true)
        }
    })

    test('honors entityId — rows from another entity are filtered out', async () => {
        // Seed a second entity with one vehicle, then ensure asset.listAll
        // for the first entity does not surface it.
        const now = new Date().toISOString()
        const [other] = await db
            .insert(entity)
            .values({
                name: `Other Trust ${TS}`,
                entityType: 'TRUST',
                updatedAt: now,
            })
            .returning()
        const [v] = await db
            .insert(vehicle)
            .values({
                entityId: other.id,
                name: 'Should Not Appear',
                year: 2024,
                make: 'X',
                model: 'Y',
                vin: `9OTH${TS}A123Z`,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                updatedAt: now,
            })
            .returning()

        try {
            const rows = await adminCaller().asset.listAll({
                entityId: ids.entityId!,
            })
            // Disambiguate by (kind, id) — id sequences aren't shared
            // across asset tables, so a bankAccount and a vehicle could
            // legitimately share an id without colliding.
            expect(
                rows.find((r) => r.kind === 'vehicle' && r.id === v.id),
            ).toBeUndefined()
        } finally {
            await db.delete(vehicle).where(eq(vehicle.id, v.id))
            await db.delete(entity).where(eq(entity.id, other.id))
        }
    })
})
