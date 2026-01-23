/**
 * Comprehensive seed script for trust-admin
 * Populates ALL tables with realistic test data
 * Run with: bun run db/seed-comprehensive.ts
 *
 * @ts-nocheck - This is a development seed script. Runtime validation
 * is handled by the database and Drizzle ORM.
 */
// @ts-nocheck

import { sql } from 'drizzle-orm'
import { db } from './index'
import {
    activityLog,
    artwork,
    bankAccount,
    beneficiary,
    contact,
    contactAssociation,
    distribution,
    document,
    entity,
    hemsRequest,
    homestead,
    insurancePolicy,
    investmentAccount,
    liability,
    liabilityPayment,
    pendingInventoryItem,
    personalProperty,
    rentalProperty,
    specificBequest,
    task,
    transaction,
    trustAccounting,
    trustee,
    trusteeFeeEntry,
    trusteeFeeSchedule,
    valuation,
    vehicle,
    withdrawalRecord,
} from './schema'

const GRANTOR_DOD = '2025-12-28T14:53:00.000Z'
const TRUST_DATE = '2024-09-18T00:00:00.000Z'

async function seedComprehensive() {
    console.log('🌱 Starting comprehensive seed...\n')

    // Clear all existing data
    console.log('Clearing existing data...')
    await db.execute(sql`
        TRUNCATE TABLE
            activity_log, pending_inventory_item, valuation, document, task,
            trustee_fee_entry, trustee_fee_schedule, trustee,
            withdrawal_record, distribution, hems_request,
            transaction, trust_accounting, specific_bequest,
            artwork, personal_property,
            liability_payment, liability,
            insurance_policy, vehicle,
            investment_account, bank_account,
            rental_property, homestead,
            beneficiary, contact_association, contact, entity
        RESTART IDENTITY CASCADE
    `)
    console.log('  ✓ Database cleared\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. ENTITY (Trust)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating entity...')
    const [trustEntity] = await db
        .insert(entity)
        .values({
            name: 'The Hudson Living Trust',
            entityType: 'TRUST',
            trustType: 'IRREVOCABLE',
            grantorName: 'Richard Hudson',
            decedent: 'Richard Hudson',
            dod: GRANTOR_DOD,
            originalDate: TRUST_DATE,
            governingLaw: 'Texas',
            stateOfFormation: 'Texas',
            hasNoContestClause: true,
            hasSpendthriftProvision: true,
            status: 'ACTIVE',
            ownershipPercent: '100.00',
            notes: 'Prepared by Livens & Reed, PLLC. Grantor deceased 12/28/2025.',
            updatedAt: new Date().toISOString(),
        })
        .returning()

    if (!trustEntity) throw new Error('Failed to create trust entity')
    const trustId = trustEntity.id
    console.log(`  ✓ Trust entity created (ID: ${trustId})\n`)

    // Create sub-entities (LLCs owned by trust)
    const [hudsonRealEstate] = await db
        .insert(entity)
        .values({
            name: 'Hudson Real Estate LLC',
            entityType: 'LLC',
            parentEntityId: trustId,
            ownershipPercent: '100.00',
            dodValue: '450000.00',
            dodValueDate: GRANTOR_DOD,
            stateOfFormation: 'Texas',
            governingLaw: 'Texas',
            status: 'ACTIVE',
            notes: 'Rental property holding company',
            updatedAt: new Date().toISOString(),
        })
        .returning()

    const [rollTheDice] = await db
        .insert(entity)
        .values({
            name: 'Roll the Dice LLC',
            entityType: 'LLC',
            parentEntityId: trustId,
            ownershipPercent: '100.00',
            dodValue: '75000.00',
            dodValueDate: GRANTOR_DOD,
            stateOfFormation: 'Texas',
            governingLaw: 'Texas',
            status: 'ACTIVE',
            notes: 'Entertainment/gaming business',
            updatedAt: new Date().toISOString(),
        })
        .returning()

    const [rwhMaterial] = await db
        .insert(entity)
        .values({
            name: 'RWH Material Handlers LLC',
            entityType: 'LLC',
            parentEntityId: trustId,
            ownershipPercent: '100.00',
            dodValue: '125000.00',
            dodValueDate: GRANTOR_DOD,
            stateOfFormation: 'Texas',
            governingLaw: 'Texas',
            status: 'ACTIVE',
            notes: 'Equipment/materials business',
            updatedAt: new Date().toISOString(),
        })
        .returning()

    const [aaaRecycling] = await db
        .insert(entity)
        .values({
            name: 'AAA Recycling Inc.',
            entityType: 'CORPORATION', // S-Corp for tax purposes
            parentEntityId: trustId,
            ownershipPercent: '35.00',
            dodValue: '87500.00',
            dodValueDate: GRANTOR_DOD,
            stateOfFormation: 'Texas',
            governingLaw: 'Texas',
            status: 'ACTIVE',
            notes: 'S-Corp election - 35% ownership stake (partial)',
            updatedAt: new Date().toISOString(),
        })
        .returning()

    console.log(`  ✓ Created 4 sub-entities (LLCs/S-Corp)\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. CONTACTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating contacts...')
    const contacts = await db
        .insert(contact)
        .values([
            {
                name: 'Jennifer Livens',
                role: 'ATTORNEY',
                company: 'Livens & Reed, PLLC',
                email: 'jlivens@livensreed.com',
                phone: '(972) 555-0100',
                address: '2000 McKinney Ave, Suite 1500, Dallas, TX 75201',
                notes: 'Primary estate planning attorney - drafted trust',
                isPrimary: true,
                updatedAt: new Date().toISOString(),
            },
            {
                name: 'Michael Chen, CPA',
                role: 'ACCOUNTANT',
                company: 'Chen & Associates',
                email: 'mchen@chenassociates.com',
                phone: '(214) 555-0200',
                address: '500 N Akard St, Suite 3000, Dallas, TX 75201',
                notes: 'Trust tax return preparation',
                isPrimary: true,
                updatedAt: new Date().toISOString(),
            },
            {
                name: 'Sarah Martinez',
                role: 'FINANCIAL_ADVISOR',
                company: 'Fidelity Investments',
                email: 'sarah.martinez@fidelity.com',
                phone: '(800) 555-0300',
                notes: 'Investment account manager',
                isPrimary: true,
                updatedAt: new Date().toISOString(),
            },
            {
                name: 'Robert Thompson',
                role: 'INSURANCE_AGENT',
                company: 'State Farm Insurance',
                email: 'robert.thompson@statefarm.com',
                phone: '(469) 555-0400',
                notes: 'Property and life insurance',
                isPrimary: false,
                updatedAt: new Date().toISOString(),
            },
            {
                name: 'Lisa Park',
                role: 'REAL_ESTATE_AGENT',
                company: 'Keller Williams Realty',
                email: 'lisa.park@kw.com',
                phone: '(972) 555-0500',
                notes: 'Rental property management assistance',
                isPrimary: false,
                updatedAt: new Date().toISOString(),
            },
            {
                name: 'Dr. James Wilson',
                role: 'OTHER',
                company: 'Southlake Appraisals',
                email: 'jwilson@southlakeappraisals.com',
                phone: '(817) 555-0600',
                notes: 'Real estate appraiser for DOD valuations',
                isPrimary: false,
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()

    // Create contact associations
    await db.insert(contactAssociation).values(
        contacts.map((c) => ({
            contactId: c.id,
            entityId: trustId,
            updatedAt: new Date().toISOString(),
        })),
    )
    console.log(`  ✓ Created ${contacts.length} contacts\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. BENEFICIARIES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating beneficiaries...')
    type BeneficiaryDef = {
        firstName: string
        lastName: string
        type: 'CHILD' | 'STEPCHILD' | 'GRANDCHILD' | 'OTHER'
        relationship: string
        share: number
        dob?: string
        parentName?: string
        hasWithdrawal?: boolean
    }

    const beneficiaryDefs: BeneficiaryDef[] = [
        // Children
        {
            firstName: 'Richard',
            lastName: 'Hudson Jr.',
            type: 'CHILD',
            relationship: 'Son',
            share: 8.5,
            dob: '1985-03-15',
        },
        {
            firstName: 'Ashley',
            lastName: 'Govea',
            type: 'CHILD',
            relationship: 'Daughter',
            share: 4.5,
            dob: '1988-07-22',
        },
        {
            firstName: 'Wendy',
            lastName: 'Hilton',
            type: 'CHILD',
            relationship: 'Daughter',
            share: 4.5,
            dob: '1990-11-08',
        },
        // Stepchildren
        {
            firstName: 'Ricky',
            lastName: 'Brown',
            type: 'STEPCHILD',
            relationship: 'Stepson',
            share: 4.5,
            dob: '1982-01-30',
        },
        {
            firstName: 'Timothy',
            lastName: 'Brown Jr.',
            type: 'STEPCHILD',
            relationship: 'Stepson',
            share: 4.5,
            dob: '1984-05-18',
        },
        {
            firstName: 'Alicia',
            lastName: 'Douglas',
            type: 'STEPCHILD',
            relationship: 'Stepdaughter',
            share: 4.5,
            dob: '1986-09-25',
        },
        // Other
        {
            firstName: 'Luis',
            lastName: 'Fernando',
            type: 'OTHER',
            relationship: 'Son-in-law',
            share: 15.0,
            dob: '1980-12-10',
        },
        {
            firstName: 'Lois',
            lastName: 'Greer',
            type: 'OTHER',
            relationship: 'Friend',
            share: 5.0,
            dob: '1955-04-02',
        },
        // Grandchildren (with withdrawal rights)
        {
            firstName: 'Emily',
            lastName: 'Brown',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2005-02-14',
            parentName: 'Ricky Brown',
            hasWithdrawal: true,
        },
        {
            firstName: 'Kaitlyn',
            lastName: 'Brown',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2007-08-20',
            parentName: 'Ricky Brown',
            hasWithdrawal: true,
        },
        {
            firstName: 'Samantha',
            lastName: 'Brown',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2010-03-11',
            parentName: 'Ricky Brown',
            hasWithdrawal: true,
        },
        {
            firstName: 'Jacob',
            lastName: 'Brown',
            type: 'GRANDCHILD',
            relationship: 'Grandson',
            share: 4.0,
            dob: '2012-06-30',
            parentName: 'Ricky Brown',
            hasWithdrawal: true,
        },
        {
            firstName: 'Shelby',
            lastName: 'Douglas',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2008-11-05',
            parentName: 'Alicia Douglas',
            hasWithdrawal: true,
        },
        {
            firstName: 'Charleigh',
            lastName: 'Douglas',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2011-04-17',
            parentName: 'Alicia Douglas',
            hasWithdrawal: true,
        },
        {
            firstName: 'Dominique',
            lastName: 'Govea',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2006-09-28',
            parentName: 'Ashley Govea',
            hasWithdrawal: true,
        },
        {
            firstName: 'Alondra',
            lastName: 'Govea',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2009-01-15',
            parentName: 'Ashley Govea',
            hasWithdrawal: true,
        },
        {
            firstName: 'Isabella',
            lastName: 'Govea',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2013-07-04',
            parentName: 'Ashley Govea',
            hasWithdrawal: true,
        },
        {
            firstName: 'Landry',
            lastName: 'Hilton',
            type: 'GRANDCHILD',
            relationship: 'Grandson',
            share: 4.5,
            dob: '2014-10-22',
            parentName: 'Wendy Hilton',
            hasWithdrawal: true,
        },
        {
            firstName: 'Lively',
            lastName: 'Hilton',
            type: 'GRANDCHILD',
            relationship: 'Granddaughter',
            share: 4.5,
            dob: '2017-02-08',
            parentName: 'Wendy Hilton',
            hasWithdrawal: true,
        },
    ]

    const beneficiaryMap: Record<string, number> = {}

    // Insert non-grandchildren first
    for (const b of beneficiaryDefs.filter((d) => d.type !== 'GRANDCHILD')) {
        const [created] = await db
            .insert(beneficiary)
            .values({
                entityId: trustId,
                firstName: b.firstName,
                lastName: b.lastName,
                dateOfBirth: b.dob ? new Date(b.dob).toISOString() : null,
                relationship: b.relationship,
                relationshipType: b.type,
                sharePercent: b.share.toString(),
                distributionStandard: 'HEMS',
                isPrimary: true,
                isContingent: false,
                informed: true,
                releaseSigned: false,
                email: `${b.firstName.toLowerCase()}.${b.lastName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
                updatedAt: new Date().toISOString(),
            })
            .returning()
        if (created) beneficiaryMap[`${b.firstName} ${b.lastName}`] = created.id
    }

    // Insert grandchildren with parent references
    for (const b of beneficiaryDefs.filter((d) => d.type === 'GRANDCHILD')) {
        const parentId = b.parentName ? beneficiaryMap[b.parentName] : null
        const [created] = await db
            .insert(beneficiary)
            .values({
                entityId: trustId,
                firstName: b.firstName,
                lastName: b.lastName,
                dateOfBirth: b.dob ? new Date(b.dob).toISOString() : null,
                relationship: b.relationship,
                relationshipType: 'GRANDCHILD',
                parentId: parentId ?? null,
                sharePercent: b.share.toString(),
                distributionStandard: b.hasWithdrawal
                    ? 'HEMS_PLUS_WITHDRAWAL'
                    : 'HEMS',
                withdrawalAge1: b.hasWithdrawal ? 25 : null,
                withdrawalPct1: b.hasWithdrawal ? 50 : null,
                withdrawalAge2: b.hasWithdrawal ? 30 : null,
                withdrawalPct2: b.hasWithdrawal ? 50 : null,
                isPrimary: true,
                isContingent: false,
                informed: true,
                releaseSigned: false,
                email: `${b.firstName.toLowerCase()}.${b.lastName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
                hasSupplementalNeedsTrust: false,
                updatedAt: new Date().toISOString(),
            })
            .returning()
        if (created) beneficiaryMap[`${b.firstName} ${b.lastName}`] = created.id
    }
    console.log(
        `  ✓ Created ${Object.keys(beneficiaryMap).length} beneficiaries\n`,
    )

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. TRUSTEES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating trustees...')
    const [richardTrustee] = await db
        .insert(trustee)
        .values({
            entityId: trustId,
            name: 'Richard Wayne Hudson Jr.',
            status: 'ACTIVE',
            order: 1,
            isCo: true,
            startDate: GRANTOR_DOD,
            email: 'richard.hudson.jr@example.com',
            phone: '(214) 555-1001',
            updatedAt: new Date().toISOString(),
        })
        .returning()

    const [rickyTrustee] = await db
        .insert(trustee)
        .values({
            entityId: trustId,
            name: 'Ricky Thomas Brown',
            status: 'ACTIVE',
            order: 1,
            isCo: true,
            startDate: GRANTOR_DOD,
            email: 'ricky.brown@example.com',
            phone: '(972) 555-1002',
            coTrusteeId: richardTrustee?.id,
            updatedAt: new Date().toISOString(),
        })
        .returning()

    // Update Richard's co-trustee reference
    if (richardTrustee && rickyTrustee) {
        await db
            .update(trustee)
            .set({ coTrusteeId: rickyTrustee.id })
            .where(({ id }, { eq }) => eq(id, richardTrustee.id))
    }

    await db.insert(trustee).values({
        entityId: trustId,
        name: 'Ashley Leighann Govea',
        status: 'SUCCESSOR',
        order: 2,
        isCo: false,
        email: 'ashley.govea@example.com',
        phone: '(469) 555-1003',
        updatedAt: new Date().toISOString(),
    })
    console.log('  ✓ Created 3 trustees\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. TRUSTEE FEE SCHEDULE
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating trustee fee schedule...')
    await db.insert(trusteeFeeSchedule).values({
        entityId: trustId,
        trusteeId: richardTrustee?.id ?? 0,
        executorFeePercent: '5.00',
        annualAssetPercent: '1.00',
        incomePercent: '8.00',
        hourlyRate: '150.00',
        effectiveDate: GRANTOR_DOD,
        notes: 'Standard Texas trustee fee structure',
    })
    console.log('  ✓ Created trustee fee schedule\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. BANK ACCOUNTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating bank accounts...')
    const bankAccounts = await db
        .insert(bankAccount)
        .values([
            {
                entityId: trustId,
                institution: 'Chase Bank',
                accountType: 'CHECKING',
                accountNumber: '****4521',
                currentBalance: '45678.92',
                dodValue: '42350.15',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'COMPLETE',
                notes: 'Primary operating account',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                institution: 'Chase Bank',
                accountType: 'SAVINGS',
                accountNumber: '****7890',
                currentBalance: '125000.00',
                dodValue: '123500.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'COMPLETE',
                notes: 'Emergency reserve fund',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                institution: 'Bank of America',
                accountType: 'CHECKING',
                accountNumber: '****3456',
                currentBalance: '8750.33',
                dodValue: '8750.33',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Secondary checking',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                institution: 'Ally Bank',
                accountType: 'MONEY_MARKET',
                accountNumber: '****9012',
                currentBalance: '75000.00',
                dodValue: '74500.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'COMPLETE',
                notes: 'High-yield savings',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                institution: 'Capital One',
                accountType: 'CD',
                accountNumber: '****5678',
                currentBalance: '50000.00',
                dodValue: '50000.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                maturityDate: '2026-06-15T00:00:00.000Z',
                interestRate: '4.50',
                notes: '12-month CD @ 4.5% APY',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(`  ✓ Created ${bankAccounts.length} bank accounts\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. INVESTMENT ACCOUNTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating investment accounts...')
    const investmentAccounts = await db
        .insert(investmentAccount)
        .values([
            {
                entityId: trustId,
                institution: 'Fidelity Investments',
                accountType: 'BROKERAGE',
                accountNumber: '****1234',
                currentBalance: '485000.00',
                dodValue: '478500.00',
                dodValueDate: GRANTOR_DOD,
                costBasis: '325000.00',
                status: 'ACTIVE',
                transferStatus: 'COMPLETE',
                notes: 'Main investment portfolio - diversified',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                institution: 'Vanguard',
                accountType: 'IRA',
                accountNumber: '****5678',
                currentBalance: '235000.00',
                dodValue: '232000.00',
                dodValueDate: GRANTOR_DOD,
                costBasis: '180000.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Traditional IRA - inherited',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                institution: 'Charles Schwab',
                accountType: 'ROTH_IRA',
                accountNumber: '****9012',
                currentBalance: '125000.00',
                dodValue: '122500.00',
                dodValueDate: GRANTOR_DOD,
                costBasis: '95000.00',
                status: 'ACTIVE',
                transferStatus: 'COMPLETE',
                notes: 'Roth IRA - tax-free growth',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                institution: 'Edward Jones',
                accountType: 'ANNUITY',
                accountNumber: '****3456',
                currentBalance: '150000.00',
                dodValue: '148000.00',
                dodValueDate: GRANTOR_DOD,
                costBasis: '125000.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Fixed annuity - guaranteed income',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(
        `  ✓ Created ${investmentAccounts.length} investment accounts\n`,
    )

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. HOMESTEAD & RENTAL PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating properties...')
    const [homesteadProp] = await db
        .insert(homestead)
        .values({
            entityId: trustId,
            streetAddress: '1301 Cherry Hill Ln',
            city: 'Lewisville',
            state: 'Texas',
            zip: '75067',
            county: 'Denton',
            propertyType: 'SINGLE_FAMILY',
            yearBuilt: 1998,
            squareFeet: 2850,
            bedrooms: 4,
            bathrooms: '3.5',
            lotSize: '0.35',
            dodValue: '425000.00',
            dodValueDate: GRANTOR_DOD,
            currentValue: '435000.00',
            status: 'ACTIVE',
            transferStatus: 'PENDING',
            dodAffidavitFiled: false,
            notes: "Grantor's primary residence - homestead property",
            updatedAt: new Date().toISOString(),
        })
        .returning()

    const rentalProperties = await db
        .insert(rentalProperty)
        .values([
            {
                entityId: hudsonRealEstate?.id ?? trustId,
                name: 'Oak Valley Rental',
                streetAddress: '2501 Oak Valley Dr',
                city: 'Flower Mound',
                state: 'Texas',
                zip: '75028',
                county: 'Denton',
                propertyType: 'SINGLE_FAMILY',
                yearBuilt: 2005,
                squareFeet: 1850,
                lotSizeAcres: '0.25',
                dodValue: '325000.00',
                dodValueDate: GRANTOR_DOD,
                monthlyRent: '2200.00',
                rentalStatus: 'RENTED',
                leaseStart: '2025-06-01T00:00:00.000Z',
                leaseEnd: '2026-05-31T00:00:00.000Z',
                status: 'ACTIVE',
                transferStatus: 'COMPLETE',
                notes: 'Rental property - 3BR/2BA, long-term tenant',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: hudsonRealEstate?.id ?? trustId,
                name: 'South Padre Condo',
                streetAddress: '789 Beachfront Ave Unit 304',
                city: 'South Padre Island',
                state: 'Texas',
                zip: '78597',
                county: 'Cameron',
                propertyType: 'CONDO',
                yearBuilt: 2010,
                squareFeet: 1200,
                dodValue: '275000.00',
                dodValueDate: GRANTOR_DOD,
                monthlyRent: '3500.00',
                rentalStatus: 'RENTED',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Timeshare/vacation rental - 2BR/2BA, seasonal income',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: hudsonRealEstate?.id ?? trustId,
                name: 'Carrollton Warehouse',
                streetAddress: '456 Industrial Blvd',
                city: 'Carrollton',
                state: 'Texas',
                zip: '75006',
                county: 'Dallas',
                propertyType: 'COMMERCIAL',
                yearBuilt: 1995,
                squareFeet: 5000,
                dodValue: '550000.00',
                dodValueDate: GRANTOR_DOD,
                monthlyRent: '4500.00',
                rentalStatus: 'RENTED',
                status: 'ACTIVE',
                transferStatus: 'COMPLETE',
                notes: 'Commercial warehouse - 5-year lease',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(
        `  ✓ Created 1 homestead + ${rentalProperties.length} rental properties\n`,
    )

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. VEHICLES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating vehicles...')
    const vehicles = await db
        .insert(vehicle)
        .values([
            {
                entityId: trustId,
                year: 2022,
                make: 'Ford',
                model: 'F-150 Lariat',
                vin: '1FTFW1E85NFA12345',
                color: 'Oxford White',
                mileage: 28500,
                dodValue: '48500.00',
                dodValueDate: GRANTOR_DOD,
                currentValue: '46000.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Primary vehicle - excellent condition',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                year: 2020,
                make: 'Toyota',
                model: 'Camry XSE',
                vin: '4T1BF1FK5LU123456',
                color: 'Midnight Black',
                mileage: 42000,
                dodValue: '24500.00',
                dodValueDate: GRANTOR_DOD,
                currentValue: '23000.00',
                status: 'ACTIVE',
                transferStatus: 'COMPLETE',
                notes: 'Secondary vehicle',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: rwhMaterial?.id ?? trustId,
                year: 2018,
                make: 'Chevrolet',
                model: 'Silverado 2500HD',
                vin: '1GC1KVEY5JF234567',
                color: 'Summit White',
                mileage: 95000,
                dodValue: '32000.00',
                dodValueDate: GRANTOR_DOD,
                currentValue: '30500.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Work truck - RWH Material Handlers LLC',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                year: 1969,
                make: 'Chevrolet',
                model: 'Camaro SS',
                vin: '124379N567890',
                color: 'Hugger Orange',
                mileage: 78000,
                dodValue: '85000.00',
                dodValueDate: GRANTOR_DOD,
                currentValue: '87500.00',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Classic car - garage kept, original numbers matching',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(`  ✓ Created ${vehicles.length} vehicles\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. INSURANCE POLICIES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating insurance policies...')
    const insurancePolicies = await db
        .insert(insurancePolicy)
        .values([
            {
                entityId: trustId,
                policyType: 'LIFE',
                carrier: 'Northwestern Mutual',
                policyNumber: 'NWM-12345678',
                coverageAmount: '500000.00',
                cashValue: '45000.00',
                beneficiaryDesignation: 'The Hudson Living Trust',
                dodValue: '500000.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                notes: 'Whole life policy - death benefit payable to trust',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                policyType: 'LIFE',
                carrier: 'Prudential',
                policyNumber: 'PRU-87654321',
                coverageAmount: '250000.00',
                beneficiaryDesignation: 'The Hudson Living Trust',
                dodValue: '250000.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                notes: 'Term life policy - 20 year term',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                policyType: 'PROPERTY',
                carrier: 'State Farm',
                policyNumber: 'SF-HO-456789',
                coverageAmount: '450000.00',
                premium: '2400.00',
                status: 'ACTIVE',
                notes: 'Homestead property coverage',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                policyType: 'AUTO',
                carrier: 'State Farm',
                policyNumber: 'SF-AUTO-123456',
                coverageAmount: '500000.00',
                premium: '1800.00',
                status: 'ACTIVE',
                notes: 'Auto policy - all vehicles',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                policyType: 'UMBRELLA',
                carrier: 'State Farm',
                policyNumber: 'SF-UMB-789012',
                coverageAmount: '2000000.00',
                premium: '600.00',
                status: 'ACTIVE',
                notes: 'Personal umbrella liability',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(`  ✓ Created ${insurancePolicies.length} insurance policies\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 11. LIABILITIES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating liabilities...')
    const liabilities = await db
        .insert(liability)
        .values([
            {
                entityId: trustId,
                liabilityType: 'MORTGAGE',
                creditor: 'Wells Fargo Home Mortgage',
                originalAmount: '320000.00',
                currentBalance: '245678.92',
                interestRate: '3.75',
                monthlyPayment: '1482.35',
                paymentDueDay: 1,
                loanTerm: 360,
                originationDate: '2019-03-15T00:00:00.000Z',
                maturityDate: '2049-03-15T00:00:00.000Z',
                homesteadId: homesteadProp?.id,
                status: 'ACTIVE',
                allocationClass: 'PRINCIPAL',
                notes: 'Primary mortgage on homestead',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                liabilityType: 'LOAN',
                creditor: 'Capital One Auto Finance',
                originalAmount: '45000.00',
                currentBalance: '18750.00',
                interestRate: '4.99',
                monthlyPayment: '845.22',
                paymentDueDay: 15,
                loanTerm: 60,
                originationDate: '2022-06-01T00:00:00.000Z',
                maturityDate: '2027-06-01T00:00:00.000Z',
                vehicleId: vehicles[0]?.id,
                status: 'ACTIVE',
                allocationClass: 'PRINCIPAL',
                notes: 'Auto loan - F-150',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                liabilityType: 'CREDIT_CARD',
                creditor: 'Chase Sapphire Reserve',
                originalAmount: '15000.00',
                currentBalance: '4250.33',
                interestRate: '24.99',
                monthlyPayment: '250.00',
                paymentDueDay: 25,
                status: 'ACTIVE',
                allocationClass: 'INCOME',
                notes: 'Credit card - revolving balance',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                liabilityType: 'CREDIT_CARD',
                creditor: 'American Express Platinum',
                originalAmount: '10000.00',
                currentBalance: '0.00',
                interestRate: '0.00',
                paymentDueDay: 10,
                status: 'ACTIVE',
                allocationClass: 'INCOME',
                notes: 'Charge card - paid in full monthly',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                liabilityType: 'TAX_OWED',
                creditor: 'IRS',
                originalAmount: '12500.00',
                currentBalance: '12500.00',
                status: 'ACTIVE',
                allocationClass: 'PRINCIPAL',
                notes: 'Final tax liability estimate - 2025',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                liabilityType: 'ACCOUNTS_PAYABLE',
                creditor: 'Memorial Hospital',
                originalAmount: '8750.00',
                currentBalance: '8750.00',
                status: 'ACTIVE',
                allocationClass: 'PRINCIPAL',
                notes: 'Final medical expenses',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(`  ✓ Created ${liabilities.length} liabilities\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 12. LIABILITY PAYMENTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating liability payments...')
    const mortgageId = liabilities[0]?.id
    const autoLoanId = liabilities[1]?.id
    const creditCardId = liabilities[2]?.id

    if (mortgageId && autoLoanId && creditCardId && bankAccounts[0]) {
        await db.insert(liabilityPayment).values([
            // Mortgage payments
            {
                liabilityId: mortgageId,
                paymentDate: '2025-12-01T00:00:00.000Z',
                amount: '1482.35',
                principalPortion: '720.15',
                interestPortion: '762.20',
                paymentMethod: 'ACH',
                bankAccountId: bankAccounts[0].id,
                confirmationNumber: 'WF-DEC2025-001',
                allocationClass: 'PRINCIPAL',
                notes: 'December 2025 payment',
                updatedAt: new Date().toISOString(),
            },
            {
                liabilityId: mortgageId,
                paymentDate: '2026-01-01T00:00:00.000Z',
                amount: '1482.35',
                principalPortion: '722.40',
                interestPortion: '759.95',
                paymentMethod: 'ACH',
                bankAccountId: bankAccounts[0].id,
                confirmationNumber: 'WF-JAN2026-001',
                allocationClass: 'PRINCIPAL',
                notes: 'January 2026 payment',
                updatedAt: new Date().toISOString(),
            },
            // Auto loan payments
            {
                liabilityId: autoLoanId,
                paymentDate: '2025-12-15T00:00:00.000Z',
                amount: '845.22',
                principalPortion: '767.12',
                interestPortion: '78.10',
                paymentMethod: 'ACH',
                bankAccountId: bankAccounts[0].id,
                confirmationNumber: 'CO-DEC2025-001',
                allocationClass: 'PRINCIPAL',
                notes: 'December 2025 payment',
                updatedAt: new Date().toISOString(),
            },
            {
                liabilityId: autoLoanId,
                paymentDate: '2026-01-15T00:00:00.000Z',
                amount: '845.22',
                principalPortion: '770.30',
                interestPortion: '74.92',
                paymentMethod: 'ACH',
                bankAccountId: bankAccounts[0].id,
                confirmationNumber: 'CO-JAN2026-001',
                allocationClass: 'PRINCIPAL',
                notes: 'January 2026 payment',
                updatedAt: new Date().toISOString(),
            },
            // Credit card payments
            {
                liabilityId: creditCardId,
                paymentDate: '2025-12-25T00:00:00.000Z',
                amount: '500.00',
                paymentMethod: 'ACH',
                bankAccountId: bankAccounts[0].id,
                confirmationNumber: 'CH-DEC2025-001',
                allocationClass: 'INCOME',
                notes: 'December 2025 payment - extra principal',
                updatedAt: new Date().toISOString(),
            },
            {
                liabilityId: creditCardId,
                paymentDate: '2026-01-25T00:00:00.000Z',
                amount: '250.00',
                paymentMethod: 'ACH',
                bankAccountId: bankAccounts[0].id,
                confirmationNumber: 'CH-JAN2026-001',
                allocationClass: 'INCOME',
                notes: 'January 2026 payment',
                updatedAt: new Date().toISOString(),
            },
        ])
    }
    console.log('  ✓ Created 6 liability payments\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 13. PERSONAL PROPERTY
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating personal property...')
    const personalProperties = await db
        .insert(personalProperty)
        .values([
            {
                entityId: trustId,
                name: 'Rolex Submariner Watch',
                category: 'JEWELRY',
                location: 'Safe deposit box - Chase Bank',
                dodValue: '12500.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Serial: 12345678 - purchased 2015',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                name: 'Diamond Engagement Ring (1.5ct)',
                category: 'JEWELRY',
                location: 'Safe deposit box - Chase Bank',
                dodValue: '8500.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: "Late wife's ring - sentimental value",
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                name: 'Antique Grandfather Clock',
                category: 'COLLECTIBLES',
                location: 'Living room - 1301 Cherry Hill Ln',
                dodValue: '4500.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Howard Miller - circa 1920',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                name: 'Gun Collection (12 firearms)',
                category: 'COLLECTIBLES',
                location: 'Gun safe - master bedroom',
                dodValue: '18500.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Includes 2 antique Colts - requires FFL transfer',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                name: 'Living Room Furniture Set',
                category: 'FURNITURE',
                location: 'Living room - 1301 Cherry Hill Ln',
                dodValue: '6500.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Leather sofa, loveseat, 2 recliners, coffee table',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                name: '75" Samsung QLED TV',
                category: 'ELECTRONICS',
                location: 'Living room - 1301 Cherry Hill Ln',
                dodValue: '1800.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Model QN75Q80C - purchased 2024',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                name: 'Tools & Workshop Equipment',
                category: 'OTHER',
                location: 'Garage - 1301 Cherry Hill Ln',
                dodValue: '8500.00',
                dodValueDate: GRANTOR_DOD,
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Includes table saw, drill press, hand tools, workbench',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(
        `  ✓ Created ${personalProperties.length} personal property items\n`,
    )

    // ═══════════════════════════════════════════════════════════════════════════
    // 14. ARTWORK
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating artwork...')
    const artworks = await db
        .insert(artwork)
        .values([
            {
                entityId: trustId,
                title: 'Texas Bluebonnets at Sunset',
                artist: 'Julian Onderdonk',
                medium: 'Oil on canvas',
                dimensions: '24" x 36"',
                yearCreated: 1915,
                provenance: 'Purchased at Heritage Auctions 2018',
                dodValue: '45000.00',
                dodValueDate: GRANTOR_DOD,
                currentValue: '48000.00',
                location: 'Living room - 1301 Cherry Hill Ln',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Authenticated by Onderdonk expert Dr. William Reaves',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                title: 'Bronze Horse Sculpture',
                artist: 'Frederic Remington',
                medium: 'Bronze',
                dimensions: '18" x 24" x 12"',
                yearCreated: 1895,
                provenance: 'Family heirloom - grandfather',
                dodValue: '125000.00',
                dodValueDate: GRANTOR_DOD,
                currentValue: '130000.00',
                location: 'Study - 1301 Cherry Hill Ln',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Cast #7 of 25 - "The Bronco Buster"',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                title: 'Abstract Composition #7',
                artist: 'Local Artist - Maria Santos',
                medium: 'Acrylic on canvas',
                dimensions: '48" x 60"',
                yearCreated: 2020,
                provenance: 'Purchased directly from artist',
                dodValue: '3500.00',
                dodValueDate: GRANTOR_DOD,
                currentValue: '3500.00',
                location: 'Dining room - 1301 Cherry Hill Ln',
                status: 'ACTIVE',
                transferStatus: 'PENDING',
                notes: 'Contemporary piece',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(`  ✓ Created ${artworks.length} artwork items\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 15. SPECIFIC BEQUESTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating specific bequests...')
    await db.insert(specificBequest).values([
        {
            entityId: trustId,
            description: 'Dog named Bandit',
            category: 'PET',
            recipientName: 'Freddie Edwards',
            notes: 'Per Tangible Personal Property Memorandum',
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            description: 'Rolex Submariner Watch',
            category: 'JEWELRY',
            beneficiaryId: beneficiaryMap['Richard Hudson Jr.'],
            notes: 'To oldest son',
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            description: '1969 Chevrolet Camaro SS',
            category: 'VEHICLE',
            beneficiaryId: beneficiaryMap['Ricky Brown'],
            notes: 'Per grantor verbal instructions',
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            description: 'Gun Collection',
            category: 'COLLECTIBLES',
            beneficiaryId: beneficiaryMap['Timothy Brown Jr.'],
            notes: 'Requires FFL transfer - coordinate with beneficiary',
            updatedAt: new Date().toISOString(),
        },
    ])
    console.log('  ✓ Created 4 specific bequests\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 16. TRUST ACCOUNTING ENTRIES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating trust accounting entries...')
    if (bankAccounts[0]) {
        await db.insert(trustAccounting).values([
            // Income entries
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-05T00:00:00.000Z',
                entryType: 'INCOME',
                incomeType: 'RENT',
                amount: '2200.00',
                isPrincipal: false,
                description: 'January rent - 2501 Oak Valley Dr',
                sourceAssetType: 'rentalProperty',
                sourceAssetId: rentalProperties[0]?.id?.toString(),
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-05T00:00:00.000Z',
                entryType: 'INCOME',
                incomeType: 'RENT',
                amount: '3500.00',
                isPrincipal: false,
                description: 'January rent - South Padre condo',
                sourceAssetType: 'rentalProperty',
                sourceAssetId: rentalProperties[1]?.id?.toString(),
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-05T00:00:00.000Z',
                entryType: 'INCOME',
                incomeType: 'RENT',
                amount: '4500.00',
                isPrincipal: false,
                description: 'January rent - Commercial warehouse',
                sourceAssetType: 'rentalProperty',
                sourceAssetId: rentalProperties[2]?.id?.toString(),
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-15T00:00:00.000Z',
                entryType: 'INCOME',
                incomeType: 'DIVIDEND',
                amount: '1250.00',
                isPrincipal: false,
                description: 'Q4 2025 dividends - Fidelity',
                sourceAssetType: 'investmentAccount',
                sourceAssetId: investmentAccounts[0]?.id?.toString(),
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-15T00:00:00.000Z',
                entryType: 'INCOME',
                incomeType: 'INTEREST',
                amount: '187.50',
                isPrincipal: false,
                description: 'January interest - Capital One CD',
                sourceAssetType: 'bankAccount',
                sourceAssetId: bankAccounts[4]?.id?.toString(),
                updatedAt: new Date().toISOString(),
            },
            // Expense entries
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-10T00:00:00.000Z',
                entryType: 'EXPENSE',
                expenseType: 'TAX',
                amount: '875.00',
                isPrincipal: true,
                description: 'Q1 2026 property tax - homestead',
                sourceAssetType: 'homestead',
                sourceAssetId: homesteadProp?.id?.toString(),
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-10T00:00:00.000Z',
                entryType: 'EXPENSE',
                expenseType: 'INSURANCE',
                amount: '200.00',
                isPrincipal: false,
                description: 'January homeowners insurance',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-15T00:00:00.000Z',
                entryType: 'EXPENSE',
                expenseType: 'LEGAL',
                amount: '1500.00',
                isPrincipal: true,
                description: 'Estate settlement legal fees - Livens & Reed',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                bankAccountId: bankAccounts[0].id,
                accountingDate: '2026-01-20T00:00:00.000Z',
                entryType: 'EXPENSE',
                expenseType: 'PROFESSIONAL_FEE',
                amount: '750.00',
                isPrincipal: true,
                description: 'Tax preparation - Chen & Associates',
                updatedAt: new Date().toISOString(),
            },
        ])
    }
    console.log('  ✓ Created 9 trust accounting entries\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 17. HEMS REQUESTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating HEMS requests...')
    const rickyBeneficiaryId = beneficiaryMap['Ricky Brown']
    const ashleyBeneficiaryId = beneficiaryMap['Ashley Govea']
    const emilyBeneficiaryId = beneficiaryMap['Emily Brown']

    const hemsRequests = await db
        .insert(hemsRequest)
        .values([
            {
                entityId: trustId,
                beneficiaryId: rickyBeneficiaryId!,
                createdAt: '2026-01-10T00:00:00.000Z',
                category: 'HEALTH',
                amountRequested: '5000.00',
                justification: 'Dental work - root canal and crown needed',
                status: 'APPROVED',
                approvedAmount: '5000.00',
                reviewedBy: 'Richard Wayne Hudson Jr.',
                reviewedAt: '2026-01-12T00:00:00.000Z',
                reviewNotes: 'Approved - necessary medical expense',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                beneficiaryId: ashleyBeneficiaryId!,
                createdAt: '2026-01-15T00:00:00.000Z',
                category: 'EDUCATION',
                amountRequested: '12500.00',
                justification: 'Spring semester tuition - daughter Isabella',
                status: 'PENDING',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                beneficiaryId: emilyBeneficiaryId!,
                createdAt: '2026-01-08T00:00:00.000Z',
                category: 'MAINTENANCE',
                amountRequested: '2500.00',
                justification: 'Car repair - transmission issue',
                status: 'APPROVED',
                approvedAmount: '2500.00',
                reviewedBy: 'Ricky Thomas Brown',
                reviewedAt: '2026-01-09T00:00:00.000Z',
                reviewNotes: 'Approved - necessary transportation',
                updatedAt: new Date().toISOString(),
            },
            {
                entityId: trustId,
                beneficiaryId: rickyBeneficiaryId!,
                createdAt: '2026-01-18T00:00:00.000Z',
                category: 'SUPPORT',
                amountRequested: '50000.00',
                justification: 'Down payment assistance for home purchase',
                status: 'DENIED',
                reviewedBy: 'Richard Wayne Hudson Jr.',
                reviewedAt: '2026-01-19T00:00:00.000Z',
                reviewNotes:
                    'Denied - not within HEMS standard for support. Consider age-based withdrawal if eligible.',
                updatedAt: new Date().toISOString(),
            },
        ])
        .returning()
    console.log(`  ✓ Created ${hemsRequests.length} HEMS requests\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 18. DISTRIBUTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating distributions...')
    await db.insert(distribution).values([
        {
            entityId: trustId,
            beneficiaryId: rickyBeneficiaryId!,
            distributionDate: '2026-01-12T00:00:00.000Z',
            amount: '5000.00',
            distributionType: 'INCOME',
            hemsRequestId: hemsRequests[0]?.id,
            paymentMethod: 'CHECK',
            checkNumber: '1001',
            memo: 'HEMS distribution - dental expenses',
            tax1099Issued: false,
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            beneficiaryId: emilyBeneficiaryId!,
            distributionDate: '2026-01-09T00:00:00.000Z',
            amount: '2500.00',
            distributionType: 'INCOME',
            hemsRequestId: hemsRequests[2]?.id,
            paymentMethod: 'ACH',
            memo: 'HEMS distribution - car repair',
            tax1099Issued: false,
            updatedAt: new Date().toISOString(),
        },
    ])
    console.log('  ✓ Created 2 distributions\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 19. WITHDRAWAL RECORDS (for grandchildren with age-based rights)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating withdrawal records...')
    // Emily Brown is 20 (DOB 2005-02-14), will be eligible at 25 in 2030
    if (emilyBeneficiaryId) {
        await db.insert(withdrawalRecord).values({
            entityId: trustId,
            beneficiaryId: emilyBeneficiaryId,
            withdrawalType: 'AGE_25',
            eligibleDate: '2030-02-14T00:00:00.000Z',
            eligibleAmount: '0.00', // Will be calculated when eligible
            withdrawnAmount: '0.00',
            remainingAmount: '0.00',
            status: 'NOT_YET_ELIGIBLE',
            notes: '50% at age 25 - not yet eligible',
            updatedAt: new Date().toISOString(),
        })
    }
    console.log('  ✓ Created 1 withdrawal record\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 20. TRUSTEE FEE ENTRIES
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating trustee fee entries...')
    await db.insert(trusteeFeeEntry).values([
        {
            entityId: trustId,
            trusteeId: richardTrustee?.id ?? 0,
            periodStart: '2026-01-01T00:00:00.000Z',
            periodEnd: '2026-03-31T00:00:00.000Z',
            assetFee: '2500.00',
            assetBasis: '5000000.00',
            incomeFee: '0.00',
            incomeBasis: '0.00',
            hoursWorked: '10.00',
            hourlyFee: '500.00',
            totalFee: '3000.00',
            status: 'ACCRUED',
            notes: 'Q1 2026 trustee fee accrual',
            updatedAt: new Date().toISOString(),
        },
    ])
    console.log('  ✓ Created 1 trustee fee entry\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 21. TASKS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating tasks...')
    const dod = new Date(GRANTOR_DOD)
    const tasks = [
        {
            title: 'Obtain certified death certificates (10+ copies)',
            category: 'ADMINISTRATIVE',
            days: 3,
            priority: 1,
            completed: true,
        },
        {
            title: 'Secure all physical assets',
            category: 'INVENTORY',
            days: 1,
            priority: 1,
            completed: true,
        },
        {
            title: 'Locate original trust document',
            category: 'LEGAL',
            days: 3,
            priority: 1,
            completed: true,
        },
        {
            title: 'Notify co-trustee Ricky Thomas Brown',
            category: 'ADMINISTRATIVE',
            days: 1,
            priority: 1,
            completed: true,
        },
        {
            title: 'Notify all 19 beneficiaries',
            category: 'BENEFICIARY',
            days: 14,
            priority: 1,
            completed: true,
        },
        {
            title: 'Open trust bank account for administration',
            category: 'FINANCIAL',
            days: 14,
            priority: 1,
            completed: true,
        },
        {
            title: 'Apply for EIN for irrevocable trust',
            category: 'FINANCIAL',
            days: 14,
            priority: 1,
            completed: true,
        },
        {
            title: 'Complete asset inventory',
            category: 'INVENTORY',
            days: 30,
            priority: 1,
            completed: false,
        },
        {
            title: 'Obtain DOD valuations - bank accounts',
            category: 'FINANCIAL',
            days: 30,
            priority: 1,
            completed: true,
        },
        {
            title: 'Obtain DOD valuations - investments',
            category: 'FINANCIAL',
            days: 30,
            priority: 1,
            completed: true,
        },
        {
            title: 'Obtain DOD valuations - real property',
            category: 'FINANCIAL',
            days: 30,
            priority: 1,
            completed: false,
        },
        {
            title: 'Obtain DOD valuations - vehicles',
            category: 'FINANCIAL',
            days: 30,
            priority: 2,
            completed: true,
        },
        {
            title: 'File Affidavit of Death - homestead',
            category: 'LEGAL',
            days: 60,
            priority: 1,
            completed: false,
        },
        {
            title: 'File Affidavit of Death - rental properties',
            category: 'LEGAL',
            days: 60,
            priority: 1,
            completed: false,
        },
        {
            title: 'File final Form 1040 for decedent',
            category: 'FINANCIAL',
            days: 108,
            priority: 1,
            completed: false,
        },
        {
            title: 'File Form 1041 Trust Income Tax Return',
            category: 'FINANCIAL',
            days: 108,
            priority: 1,
            completed: false,
        },
        {
            title: 'Determine if Form 706 required',
            category: 'FINANCIAL',
            days: 90,
            priority: 1,
            completed: false,
        },
        {
            title: 'Transfer vehicle titles to trust',
            category: 'LEGAL',
            days: 60,
            priority: 2,
            completed: false,
        },
        {
            title: 'Update property insurance policies',
            category: 'ADMINISTRATIVE',
            days: 30,
            priority: 2,
            completed: true,
        },
        {
            title: 'Review and pay outstanding bills',
            category: 'FINANCIAL',
            days: 30,
            priority: 2,
            completed: true,
        },
    ]

    let sortOrder = 0
    for (const t of tasks) {
        const dueDate = new Date(dod)
        dueDate.setDate(dueDate.getDate() + t.days)
        await db.insert(task).values({
            title: t.title,
            category: t.category,
            completed: t.completed,
            dueDate: dueDate.toISOString(),
            sortOrder: sortOrder++,
            notes: `Priority: ${t.priority}`,
            updatedAt: new Date().toISOString(),
        })
    }
    console.log(`  ✓ Created ${tasks.length} tasks\n`)

    // ═══════════════════════════════════════════════════════════════════════════
    // 22. DOCUMENTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating documents...')
    await db.insert(document).values([
        {
            entityId: trustId,
            name: 'The Hudson Living Trust - Original Document',
            documentType: 'LEGAL',
            filePath: '/documents/hudson-living-trust-2024.pdf',
            documentDate: '2024-09-18T00:00:00.000Z',
            notes: 'Original trust document - Livens & Reed, PLLC',
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            name: 'Death Certificate - Richard Hudson',
            documentType: 'LEGAL',
            filePath: '/documents/death-certificate-richard-hudson.pdf',
            documentDate: GRANTOR_DOD,
            notes: 'Certified copy from Denton County',
            updatedAt: new Date().toISOString(),
        },
        {
            homesteadId: homesteadProp?.id,
            name: 'Homestead Deed',
            documentType: 'DEED',
            filePath: '/documents/homestead-deed-cherry-hill.pdf',
            documentDate: '2019-03-15T00:00:00.000Z',
            notes: 'Warranty deed - 1301 Cherry Hill Ln',
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            name: 'EIN Confirmation Letter',
            documentType: 'OTHER',
            filePath: '/documents/ein-confirmation-ss4.pdf',
            documentDate: '2026-01-05T00:00:00.000Z',
            notes: 'IRS EIN assignment for irrevocable trust',
            updatedAt: new Date().toISOString(),
        },
    ])
    console.log('  ✓ Created 4 documents\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 23. VALUATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating valuations...')
    await db.insert(valuation).values([
        {
            entityId: trustId,
            homesteadId: homesteadProp?.id,
            valuationDate: GRANTOR_DOD,
            value: '425000.00',
            valuationType: 'APPRAISAL',
            appraiser: 'Southlake Appraisals - Dr. James Wilson',
            notes: 'DOD appraisal for step-up basis',
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            rentalPropertyId: rentalProperties[0]?.id,
            valuationDate: GRANTOR_DOD,
            value: '325000.00',
            valuationType: 'APPRAISAL',
            appraiser: 'Southlake Appraisals - Dr. James Wilson',
            notes: 'DOD appraisal - Oak Valley rental',
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            vehicleId: vehicles[3]?.id,
            valuationDate: GRANTOR_DOD,
            value: '85000.00',
            valuationType: 'APPRAISAL',
            appraiser: 'Classic Car Appraisals of Texas',
            notes: 'DOD appraisal - 1969 Camaro SS',
            updatedAt: new Date().toISOString(),
        },
    ])
    console.log('  ✓ Created 3 valuations\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 24. TRANSACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating transactions...')
    await db.insert(transaction).values([
        {
            bankAccountId: bankAccounts[0]?.id,
            transactionDate: '2026-01-05T00:00:00.000Z',
            transactionType: 'INCOME',
            category: 'Rental Income',
            amount: '10200.00',
            description: 'January rental income deposits',
            updatedAt: new Date().toISOString(),
        },
        {
            bankAccountId: bankAccounts[0]?.id,
            transactionDate: '2026-01-10T00:00:00.000Z',
            transactionType: 'EXPENSE',
            category: 'Property Expenses',
            amount: '1075.00',
            description: 'Property tax + insurance',
            updatedAt: new Date().toISOString(),
        },
    ])
    console.log('  ✓ Created 2 transactions\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 25. PENDING INVENTORY ITEMS (for inventory queue testing)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating pending inventory items...')
    await db.insert(pendingInventoryItem).values([
        {
            entityId: trustId,
            name: 'Vintage Record Collection',
            description:
                'Approximately 500 vinyl records from 1960s-1980s, mostly rock and jazz. Located in garage shelving.',
            category: 'COLLECTIBLES',
            estimatedValue: '2500.00',
            valueRangeLow: '2000.00',
            valueRangeHigh: '3500.00',
            condition: 'good',
            photoPath1: 'https://example.com/records1.jpg',
            photoPath2: 'https://example.com/records2.jpg',
            status: 'PENDING',
            submitterName: 'Estate Assistant',
            submitterEmail: 'assistant@example.com',
            updatedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            name: 'Power Tools Set',
            description:
                'DeWalt cordless drill, circular saw, impact driver, 2 batteries, charger. Located in workshop.',
            category: 'OTHER',
            estimatedValue: '450.00',
            valueRangeLow: '350.00',
            valueRangeHigh: '550.00',
            condition: 'excellent',
            photoPath1: 'https://example.com/tools1.jpg',
            status: 'PENDING',
            submitterName: 'Estate Assistant',
            submitterEmail: 'assistant@example.com',
            updatedAt: new Date().toISOString(),
        },
    ])
    console.log('  ✓ Created 2 pending inventory items\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // 26. ACTIVITY LOG (sample entries)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('Creating activity log entries...')
    await db.insert(activityLog).values([
        {
            entityId: trustId,
            tableName: 'entity',
            recordId: trustId.toString(),
            action: 'INSERT',
            changes: JSON.stringify({
                name: 'The Hudson Living Trust',
                entityType: 'TRUST',
            }),
            performedBy: 'system',
            performedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            tableName: 'beneficiary',
            recordId: beneficiaryMap['Richard Hudson Jr.']?.toString() ?? '0',
            action: 'UPDATE',
            changes: JSON.stringify({ informed: { from: false, to: true } }),
            performedBy: 'admin',
            performedAt: new Date().toISOString(),
        },
        {
            entityId: trustId,
            tableName: 'hemsRequest',
            recordId: hemsRequests[0]?.id?.toString() ?? '0',
            action: 'UPDATE',
            changes: JSON.stringify({
                status: { from: 'PENDING', to: 'APPROVED' },
            }),
            performedBy: 'Richard Wayne Hudson Jr.',
            performedAt: new Date().toISOString(),
        },
    ])
    console.log('  ✓ Created 3 activity log entries\n')

    // ═══════════════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(
        '═══════════════════════════════════════════════════════════════',
    )
    console.log('🎉 Comprehensive seed complete!')
    console.log(
        '═══════════════════════════════════════════════════════════════',
    )
    console.log(`
Trust ID: ${trustId}
Date of Death: ${GRANTOR_DOD}

Created:
  • 5 entities (1 trust + 4 LLCs/S-Corp)
  • ${contacts.length} contacts
  • ${Object.keys(beneficiaryMap).length} beneficiaries
  • 3 trustees
  • 1 trustee fee schedule
  • ${bankAccounts.length} bank accounts
  • ${investmentAccounts.length} investment accounts
  • 1 homestead + ${rentalProperties.length} rental properties
  • ${vehicles.length} vehicles
  • ${insurancePolicies.length} insurance policies
  • ${liabilities.length} liabilities + 6 payments
  • ${personalProperties.length} personal property items
  • ${artworks.length} artwork items
  • 4 specific bequests
  • 9 trust accounting entries
  • ${hemsRequests.length} HEMS requests + 2 distributions
  • 1 withdrawal record
  • 1 trustee fee entry
  • ${tasks.length} tasks
  • 4 documents
  • 3 valuations
  • 2 transactions
  • 2 pending inventory items
  • 3 activity log entries
`)

    process.exit(0)
}

seedComprehensive().catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
})
