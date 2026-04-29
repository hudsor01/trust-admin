import type { InferInsertModel } from 'drizzle-orm'
import { db } from './index'
import {
    beneficiary,
    entity,
    homestead,
    specificBequest,
    task,
    trustee,
} from './schema'

type NewBeneficiary = InferInsertModel<typeof beneficiary>

const GRANTOR_DOD = '2025-12-28T14:53:00.000Z' // Richard Hudson's date of death (2:53 PM CST)
const TRUST_DATE = '2024-09-18T00:00:00.000Z' // Trust execution date

async function seed() {
    console.log('Seeding Hudson Living Trust data...')

    // 1. Create the Trust Entity
    const [createdEntity] = await db
        .insert(entity)
        .values({
            name: 'The Hudson Living Trust',
            entityType: 'TRUST',
            trustType: 'IRREVOCABLE', // Became irrevocable upon death
            grantorName: 'Richard Hudson',
            decedent: 'Richard Hudson',
            dod: GRANTOR_DOD,
            originalDate: TRUST_DATE,
            governingLaw: 'Texas',
            stateOfFormation: 'Texas',
            hasNoContestClause: true,
            hasSpendthriftProvision: true,
            status: 'ACTIVE',
            notes: 'Prepared by Livens & Reed, PLLC. Grantor deceased 12/28/2024.',
            updatedAt: new Date().toISOString(),
        })
        .returning()
    if (!createdEntity) throw new Error('Failed to create trust entity')
    const trustId = createdEntity.id
    console.log('Created trust entity:', trustId)

    // 2. Create Beneficiaries - Per Section 7.01 Division of Remaining Trust Property
    // Import types from schema
    type RelationshipTypeEnum = import('./schema').RelationshipTypeEnum
    const beneficiaries: {
        name: string
        type: RelationshipTypeEnum
        relationship: string
        share: number
        parent?: string
    }[] = [
        // Children (biological)
        {
            name: 'Richard Wayne Hudson Jr.',
            type: 'CHILD',
            relationship: 'Son',
            share: 8.5,
        },
        {
            name: 'Ashley Leighann Govea',
            type: 'CHILD',
            relationship: 'Daughter',
            share: 4.5,
        },
        {
            name: "Wendy Kaye'ann Hilton",
            type: 'CHILD',
            relationship: 'Daughter',
            share: 4.5,
        },
        // Stepchildren
        {
            name: 'Ricky Thomas Brown',
            type: 'STEPCHILD',
            relationship: 'Stepson',
            share: 4.5,
        },
        {
            name: 'Timothy John Brown Jr.',
            type: 'STEPCHILD',
            relationship: 'Stepson',
            share: 4.5,
        },
        {
            name: 'Alicia Marie Douglas',
            type: 'STEPCHILD',
            relationship: 'Stepdaughter',
            share: 4.5,
        },
        // Other beneficiaries
        {
            name: 'Luis Fernando',
            type: 'OTHER',
            relationship: 'Son-in-law',
            share: 15.0,
        },
        {
            name: 'Lois Marie Greer',
            type: 'OTHER',
            relationship: 'Friend',
            share: 5.0,
        },
        // Grandchildren - Ricky's children (Brown)
        {
            name: 'Emily Brown',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: 'Ricky Thomas Brown',
        },
        {
            name: 'Kaitlyn Brown',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: 'Ricky Thomas Brown',
        },
        {
            name: 'Samantha Brown',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: 'Ricky Thomas Brown',
        },
        {
            name: 'Jacob Brown',
            type: 'GRANDCHILD',
            relationship: 'Grandson',
            share: 4.0,
            parent: 'Ricky Thomas Brown',
        },
        // Grandchildren - Alicia's children (Douglas)
        {
            name: 'Shelby Douglas',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: 'Alicia Marie Douglas',
        },
        {
            name: 'Charleigh Douglas',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: 'Alicia Marie Douglas',
        },
        // Grandchildren - Ashley's children (Govea)
        {
            name: 'Dominque Govea',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: 'Ashley Leighann Govea',
        },
        {
            name: 'Alondra Govea',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: 'Ashley Leighann Govea',
        },
        {
            name: 'Isabella Govea',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: 'Ashley Leighann Govea',
        },
        // Grandchildren - Wendy's children (Hilton)
        {
            name: 'Landry Hilton',
            type: 'GRANDCHILD',
            relationship: 'Grandson',
            share: 4.5,
            parent: "Wendy Kaye'ann Hilton",
        },
        {
            name: 'Lively Hilton',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            parent: "Wendy Kaye'ann Hilton",
        },
    ]

    const beneficiaryIds: Record<string, number> = {}

    // Insert non-grandchildren first
    for (const b of beneficiaries.filter((b) => b.type !== 'GRANDCHILD')) {
        const nameParts = b.name.split(' ')
        const firstName = nameParts[0] ?? b.name
        const lastName = nameParts.slice(1).join(' ') || firstName

        const insertData: Omit<NewBeneficiary, 'id'> = {
            entityId: trustId,
            firstName,
            lastName,
            relationship: b.relationship,
            relationshipType: b.type,
            sharePercent: b.share.toString(),
            distributionStandard: 'HEMS',
            isPrimary: true,
            isContingent: false,
            informed: false,
            releaseSigned: false,
            updatedAt: new Date().toISOString(),
        }
        const [created] = await db
            .insert(beneficiary)
            .values(insertData)
            .returning()
        if (!created) throw new Error(`Failed to create beneficiary: ${b.name}`)
        beneficiaryIds[b.name] = created.id
    }

    // Insert grandchildren with parent references
    for (const b of beneficiaries.filter((b) => b.type === 'GRANDCHILD')) {
        const nameParts = b.name.split(' ')
        const firstName = nameParts[0] ?? b.name
        const lastName = nameParts.slice(1).join(' ') || firstName
        const parentId = b.parent ? (beneficiaryIds[b.parent] ?? null) : null

        // Grandchildren get HEMS distributions PLUS age-based withdrawal rights
        // Per Sections 7.10-7.20: HEMS for living expenses + 50% at 25, 50% at 30
        const insertData: Omit<NewBeneficiary, 'id'> = {
            entityId: trustId,
            firstName,
            lastName,
            relationship: b.relationship,
            relationshipType: 'GRANDCHILD',
            parentId,
            sharePercent: b.share.toString(),
            distributionStandard: 'HEMS_PLUS_WITHDRAWAL',
            withdrawalAge1: 25,
            withdrawalPct1: 50,
            withdrawalAge2: 30,
            withdrawalPct2: 50,
            isPrimary: true,
            isContingent: false,
            informed: false,
            releaseSigned: false,
            hasSupplementalNeedsTrust: false,
            updatedAt: new Date().toISOString(),
        }
        const [created] = await db
            .insert(beneficiary)
            .values(insertData)
            .returning()
        if (!created) throw new Error(`Failed to create beneficiary: ${b.name}`)
        beneficiaryIds[b.name] = created.id
    }
    console.log('Created', Object.keys(beneficiaryIds).length, 'beneficiaries')

    // 3. Withdrawal Records - Created when DOBs are added via UI
    // Grandchildren have age-based withdrawals (50% at 25, 50% at 30) but DOBs not in trust document
    console.log(
        'Withdrawal records: add DOBs via UI to calculate eligibility dates',
    )

    // 4. Create Trustees
    await db.insert(trustee).values([
        {
            entityId: trustId,
            name: 'Richard Wayne Hudson Jr.',
            status: 'ACTIVE',
            order: 1,
            isCo: true,
            startDate: GRANTOR_DOD,
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            name: 'Rick Brown',
            status: 'ACTIVE',
            order: 1,
            isCo: true,
            startDate: GRANTOR_DOD,
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            name: 'Ashley Leighann Govea',
            status: 'ARBITER',
            order: 2,
            isCo: false,
            updatedAt: new Date().toISOString(),
        },
    ])
    console.log('Created trustees')

    // 5. Specific Bequests - Per Section 6.01 (Tangible Personal Property)
    await db.insert(specificBequest).values({
        entityId: trustId,
        description: 'Dog named Bandit',
        category: 'PET',
        beneficiaryId: null,
        recipientName: 'Freddie Edwards',
        notes: 'Per Tangible Personal Property Memorandum',
        dateDistributed: null,
        updatedAt: new Date().toISOString(),
    })
    console.log('Created specific bequest: Dog Bandit → Freddie Edwards')

    // 6. Create Homestead Property
    await db.insert(homestead).values({
        entityId: trustId,
        streetAddress: '1301 Cherry Hill Ln',
        city: 'Lewisville',
        state: 'Texas',
        zip: '75067',
        county: 'Denton',
        propertyType: 'SINGLE_FAMILY',
        status: 'ACTIVE',
        transferStatus: 'PENDING',
        notes: "Grantor's primary residence - homestead property",
        updatedAt: new Date().toISOString(),
    })
    console.log('Created homestead: 1301 Cherry Hill Ln, Lewisville, TX 75067')

    // 7. Create Mandatory Post-Death Tasks for Texas
    const _now = new Date()
    const dod = new Date(GRANTOR_DOD)

    const tasks = [
        // IMMEDIATE (within days)
        {
            title: 'Obtain certified death certificates (10+ copies)',
            category: 'ADMINISTRATIVE',
            days: 3,
            priority: 1,
        },
        {
            title: 'Secure all physical assets (home, vehicles, valuables)',
            category: 'INVENTORY',
            days: 1,
            priority: 1,
        },
        {
            title: 'Locate original trust document and amendments',
            category: 'LEGAL',
            days: 3,
            priority: 1,
        },
        {
            title: 'Notify co-trustee Rick Brown',
            category: 'ADMINISTRATIVE',
            days: 1,
            priority: 1,
        },
        {
            title: 'Change locks on real property if needed',
            category: 'ADMINISTRATIVE',
            days: 3,
            priority: 2,
        },

        // WITHIN 2 WEEKS
        {
            title: "Notify all 19 beneficiaries of grantor's death",
            category: 'BENEFICIARY',
            days: 14,
            priority: 1,
        },
        {
            title: 'Open trust bank account for administration',
            category: 'FINANCIAL',
            days: 14,
            priority: 1,
        },
        {
            title: 'Apply for EIN for irrevocable trust (IRS Form SS-4)',
            category: 'FINANCIAL',
            days: 14,
            priority: 1,
        },
        {
            title: 'Notify Social Security Administration',
            category: 'ADMINISTRATIVE',
            days: 14,
            priority: 2,
        },
        {
            title: 'Forward mail to successor trustee address',
            category: 'ADMINISTRATIVE',
            days: 7,
            priority: 2,
        },
        {
            title: 'Cancel credit cards and subscriptions',
            category: 'ADMINISTRATIVE',
            days: 14,
            priority: 3,
        },

        // WITHIN 30 DAYS
        {
            title: 'Complete asset inventory with descriptions',
            category: 'INVENTORY',
            days: 30,
            priority: 1,
        },
        {
            title: 'Obtain date-of-death valuations - bank accounts',
            category: 'FINANCIAL',
            days: 30,
            priority: 1,
        },
        {
            title: 'Obtain date-of-death valuations - investment accounts',
            category: 'FINANCIAL',
            days: 30,
            priority: 1,
        },
        {
            title: 'Obtain date-of-death valuations - real property appraisals',
            category: 'FINANCIAL',
            days: 30,
            priority: 1,
        },
        {
            title: 'Obtain date-of-death valuations - vehicles (KBB/NADA)',
            category: 'FINANCIAL',
            days: 30,
            priority: 2,
        },
        {
            title: 'Notify financial institutions of death (with death cert)',
            category: 'FINANCIAL',
            days: 30,
            priority: 1,
        },
        {
            title: 'Review and pay outstanding bills',
            category: 'FINANCIAL',
            days: 30,
            priority: 2,
        },
        {
            title: 'Notify insurance companies',
            category: 'ADMINISTRATIVE',
            days: 30,
            priority: 2,
        },

        // TEXAS SPECIFIC - REAL PROPERTY
        {
            title: 'File Affidavit of Death with county clerk - homestead',
            category: 'LEGAL',
            days: 60,
            priority: 1,
        },
        {
            title: 'File Affidavit of Death with county clerk - rental properties',
            category: 'LEGAL',
            days: 60,
            priority: 1,
        },
        {
            title: 'Update property insurance to trust name',
            category: 'ADMINISTRATIVE',
            days: 30,
            priority: 2,
        },

        // TAX DEADLINES
        {
            title: 'File final Form 1040 for decedent (due April 15, 2025)',
            category: 'FINANCIAL',
            days: 108,
            priority: 1,
        },
        {
            title: 'File Form 1041 Trust Income Tax Return (due April 15, 2025)',
            category: 'FINANCIAL',
            days: 108,
            priority: 1,
        },
        {
            title: 'Determine if Form 706 Estate Tax Return required',
            category: 'FINANCIAL',
            days: 90,
            priority: 1,
        },

        // ONGOING ADMINISTRATION
        {
            title: 'Set up trust accounting system',
            category: 'FINANCIAL',
            days: 30,
            priority: 1,
        },
        {
            title: 'Document all trustee decisions and communications',
            category: 'ADMINISTRATIVE',
            days: 7,
            priority: 2,
        },
        {
            title: 'Review trust for specific bequests (e.g., dog Bandit)',
            category: 'BENEFICIARY',
            days: 14,
            priority: 2,
        },
        {
            title: 'Calculate step-up basis for all assets',
            category: 'FINANCIAL',
            days: 60,
            priority: 1,
        },
        {
            title: 'Prepare beneficiary notification letters',
            category: 'BENEFICIARY',
            days: 30,
            priority: 2,
        },
    ]

    let sortOrder = 0
    for (const t of tasks) {
        const dueDate = new Date(dod)
        dueDate.setDate(dueDate.getDate() + t.days)

        await db.insert(task).values({
            title: t.title,
            category: t.category,
            completed: false,
            dueDate: dueDate.toISOString(),
            sortOrder: sortOrder++,
            notes: `Priority: ${t.priority} - Due ${t.days} days after death`,
            updatedAt: new Date().toISOString(),
        })
    }
    console.log('Created', tasks.length, 'mandatory tasks')

    console.log('\nSeed complete.')
    console.log('Trust ID:', trustId)
    console.log('Date of Death:', GRANTOR_DOD)
    process.exit(0)
}

seed().catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
})
