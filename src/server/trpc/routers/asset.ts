import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
    bankAccount,
    homestead,
    insurancePolicy,
    investmentAccount,
    personalProperty,
    rentalProperty,
    vehicle,
} from '@/db/schema'
import { adminProcedure, createTRPCRouter } from '../init'

// One unified row for the /assets table. Every per-type record is mapped
// into this envelope server-side so the client renders one column set
// regardless of which underlying table the row came from. Pattern adapted
// from PayloadCMS's FolderOrDocument view (a `kind` discriminator + a
// shallow common-fields envelope). `name` and `description` are real
// columns on every asset table, so the envelope passes them through
// directly — no per-type derivation.
export type AssetKind =
    | 'vehicle'
    | 'homestead'
    | 'rentalProperty'
    | 'bankAccount'
    | 'investmentAccount'
    | 'personalProperty'
    | 'insurancePolicy'

export interface AssetRow {
    id: number
    kind: AssetKind
    name: string
    description: string | null
    /** Human-facing category. Type-name for non-personalProperty rows;
     *  personalProperty rows surface their own subcategory enum. */
    category: string
    /** Best-effort monetary value (stringified Postgres numeric — client
     *  formats). Sourced per kind:
     *    vehicle/homestead/rentalProperty/personalProperty → dodValue
     *    bankAccount/investmentAccount → currentBalance ?? dodValue
     *    insurancePolicy → coverageAmount
     *  May be null on any kind when the source column is unset. */
    value: string | null
    /** Per-row status. Different asset tables use different status enums
     *  (recordStatus vs rentalStatus), so values are heterogeneous — e.g.
     *  ACTIVE / CLOSED / RENTED / SOLD all coexist in this column. The
     *  client groups them via the faceted Status filter. */
    status: string
    /** Per-type detail/edit route. Row-click target. */
    href: string
    updatedAt: string
}

// personalPropertyCategory enum → display label for the Category column.
// Keep keys aligned with the enum in db/schema.ts; missing keys fall back
// to 'Other'. Note: enum value is COLLECTIBLES (plural).
const PERSONAL_PROPERTY_CATEGORY_LABELS: Record<string, string> = {
    JEWELRY: 'Jewelry',
    ART: 'Artwork',
    COLLECTIBLES: 'Collectibles',
    ELECTRONICS: 'Electronics',
    FURNITURE: 'Furniture',
    OTHER: 'Other',
}

const personalPropertyCategoryLabel = (cat: string | null): string =>
    PERSONAL_PROPERTY_CATEGORY_LABELS[cat ?? 'OTHER'] ?? 'Other'

export const assetRouter = createTRPCRouter({
    listAll: adminProcedure
        .input(z.object({ entityId: z.coerce.number() }))
        .query(async ({ input }): Promise<AssetRow[]> => {
            const { entityId } = input

            // Fan out the seven asset tables in parallel. Each query is
            // entityId-scoped so RLS still applies.
            const [
                vehicles,
                homesteads,
                rentals,
                banks,
                investments,
                personal,
                insurance,
            ] = await Promise.all([
                db.select().from(vehicle).where(eq(vehicle.entityId, entityId)),
                db
                    .select()
                    .from(homestead)
                    .where(eq(homestead.entityId, entityId)),
                db
                    .select()
                    .from(rentalProperty)
                    .where(eq(rentalProperty.entityId, entityId)),
                db
                    .select()
                    .from(bankAccount)
                    .where(eq(bankAccount.entityId, entityId)),
                db
                    .select()
                    .from(investmentAccount)
                    .where(eq(investmentAccount.entityId, entityId)),
                db
                    .select()
                    .from(personalProperty)
                    .where(eq(personalProperty.entityId, entityId)),
                db
                    .select()
                    .from(insurancePolicy)
                    .where(eq(insurancePolicy.entityId, entityId)),
            ])

            // Per-type mappers. name/description are real columns; the
            // mappers only set the type-specific fields (kind, category,
            // value, href) and pass name/description through.
            const rows: AssetRow[] = []

            for (const v of vehicles) {
                rows.push({
                    id: v.id,
                    kind: 'vehicle',
                    name: v.name,
                    description: v.description,
                    category: 'Vehicle',
                    value: v.dodValue,
                    status: v.status,
                    href: '/vehicles',
                    updatedAt: v.updatedAt,
                })
            }

            for (const h of homesteads) {
                rows.push({
                    id: h.id,
                    kind: 'homestead',
                    name: h.name,
                    description: h.description,
                    category: 'Homestead',
                    value: h.dodValue,
                    status: h.status,
                    href: '/properties',
                    updatedAt: h.updatedAt,
                })
            }

            for (const r of rentals) {
                rows.push({
                    id: r.id,
                    kind: 'rentalProperty',
                    name: r.name,
                    description: r.description,
                    category: 'Rental Property',
                    value: r.dodValue,
                    status: r.status,
                    href: '/properties',
                    updatedAt: r.updatedAt,
                })
            }

            for (const b of banks) {
                rows.push({
                    id: b.id,
                    kind: 'bankAccount',
                    name: b.name,
                    description: b.description,
                    category: 'Bank Account',
                    value: b.currentBalance ?? b.dodValue,
                    status: b.status,
                    href: '/accounts',
                    updatedAt: b.updatedAt,
                })
            }

            for (const i of investments) {
                rows.push({
                    id: i.id,
                    kind: 'investmentAccount',
                    name: i.name,
                    description: i.description,
                    category: 'Investment',
                    value: i.currentBalance ?? i.dodValue,
                    status: i.status,
                    href: '/accounts',
                    updatedAt: i.updatedAt,
                })
            }

            for (const p of personal) {
                // Artwork is just personalProperty filtered by category=ART;
                // route the row click to the right admin page so the user
                // lands where edits actually happen.
                const isArt = p.category === 'ART'
                rows.push({
                    id: p.id,
                    kind: 'personalProperty',
                    name: p.name,
                    description: p.description,
                    category: personalPropertyCategoryLabel(p.category),
                    value: p.dodValue,
                    status: p.status,
                    href: isArt ? '/artwork' : '/personal-property',
                    updatedAt: p.updatedAt,
                })
            }

            for (const ins of insurance) {
                rows.push({
                    id: ins.id,
                    kind: 'insurancePolicy',
                    name: ins.name,
                    description: ins.description,
                    category: 'Insurance',
                    value: ins.coverageAmount,
                    status: ins.status,
                    href: '/insurance',
                    updatedAt: ins.updatedAt,
                })
            }

            // Newest first by default; the client can resort.
            rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

            return rows
        }),
})
