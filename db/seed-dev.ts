/**
 * Development Seed using drizzle-seed
 *
 * Generates deterministic fake data for development and testing.
 * Uses a seedable pRNG for reproducible data across runs.
 *
 * @see https://orm.drizzle.team/docs/seed-overview
 *
 * Usage:
 *   bun run db:seed:dev           # Seed with default count
 *   bun run db:seed:dev -- 100    # Seed with custom count
 */
import { reset, seed } from "drizzle-seed"
import { db } from "./index"
import * as schema from "./schema"

const SEED_NUMBER = 42 // Deterministic seed for reproducible data
const DEFAULT_COUNT = 10

async function seedDev() {
  const count = parseInt(process.argv[2] || String(DEFAULT_COUNT), 10)
  console.log(`Seeding development database with ${count} records per table...`)
  console.log(`   Using seed: ${SEED_NUMBER} (deterministic)`)

  // Reset tables before seeding (clears existing data)
  console.log("\nResetting tables...")
  await reset(db, schema)

  // Seed with refinements for realistic data
  console.log("\nGenerating data...")

  await seed(db, schema, { count, seed: SEED_NUMBER }).refine((f) => ({
    // Entity - Trust/LLC/Corporation
    entity: {
      columns: {
        id: f.uuid(),
        name: f.companyName(),
        entityType: f.valuesFromArray({
          values: ["TRUST", "LLC", "CORPORATION", "PARTNERSHIP"],
          isUnique: false,
        }),
        trustType: f.valuesFromArray({
          values: ["REVOCABLE", "IRREVOCABLE"],
          isUnique: false,
        }),
        grantorName: f.fullName(),
        governingLaw: f.valuesFromArray({
          values: ["Texas", "California", "New York", "Florida", "Delaware"],
          isUnique: false,
        }),
        stateOfFormation: f.state(),
        status: f.valuesFromArray({
          values: ["ACTIVE", "DISSOLVED", "PENDING"],
          isUnique: false,
        }),
      },
      count,
    },

    // Beneficiaries
    beneficiary: {
      columns: {
        id: f.uuid(),
        firstName: f.firstName(),
        lastName: f.lastName(),
        relationship: f.valuesFromArray({
          values: ["Son", "Daughter", "Spouse", "Grandson", "Granddaughter", "Sibling", "Friend"],
          isUnique: false,
        }),
        relationshipType: f.valuesFromArray({
          values: ["CHILD", "STEPCHILD", "GRANDCHILD", "OTHER"],
          isUnique: false,
        }),
        email: f.email(),
        phone: f.phoneNumber({ template: "(###) ###-####" }),
        streetAddress: f.streetAddress(),
        city: f.city(),
        state: f.state(),
        zip: f.postcode(),
        sharePercent: f.number({ minValue: 1, maxValue: 25, precision: 100 }),
        distributionStandard: f.valuesFromArray({
          values: ["HEMS", "BROADER", "WITHDRAWAL_ONLY"],
          isUnique: false,
        }),
      },
      count: count * 2, // More beneficiaries than entities
    },

    // Vehicles
    vehicle: {
      columns: {
        id: f.uuid(),
        year: f.int({ minValue: 2015, maxValue: 2024 }),
        make: f.valuesFromArray({
          values: ["Toyota", "Ford", "Honda", "Chevrolet", "BMW", "Mercedes", "Tesla", "Lexus"],
          isUnique: false,
        }),
        model: f.valuesFromArray({
          values: ["Camry", "F-150", "Accord", "Silverado", "3 Series", "E-Class", "Model 3", "RX"],
          isUnique: false,
        }),
        vin: f.string({ isUnique: true }),
        color: f.valuesFromArray({
          values: ["Black", "White", "Silver", "Red", "Blue", "Gray"],
          isUnique: false,
        }),
        mileage: f.int({ minValue: 1000, maxValue: 150000 }),
        acquisitionCost: f.number({ minValue: 15000, maxValue: 80000, precision: 100 }),
        dodValue: f.number({ minValue: 10000, maxValue: 70000, precision: 100 }),
      },
      count: Math.ceil(count / 2),
    },

    // Homesteads
    homestead: {
      columns: {
        id: f.uuid(),
        streetAddress: f.streetAddress(),
        city: f.city(),
        state: f.state(),
        zip: f.postcode(),
        county: f.city(), // Using city as proxy for county
        propertyType: f.valuesFromArray({
          values: ["SINGLE_FAMILY", "CONDO", "TOWNHOUSE"],
          isUnique: false,
        }),
        yearBuilt: f.int({ minValue: 1960, maxValue: 2023 }),
        squareFeet: f.int({ minValue: 1200, maxValue: 5000 }),
        bedrooms: f.int({ minValue: 2, maxValue: 6 }),
        bathrooms: f.number({ minValue: 1.5, maxValue: 4.5, precision: 10 }),
        acquisitionCost: f.number({ minValue: 150000, maxValue: 800000, precision: 100 }),
        dodValue: f.number({ minValue: 200000, maxValue: 1000000, precision: 100 }),
      },
      count: Math.ceil(count / 3),
    },

    // Rental Properties
    rentalProperty: {
      columns: {
        id: f.uuid(),
        name: f.companyName(),
        streetAddress: f.streetAddress(),
        city: f.city(),
        state: f.state(),
        zip: f.postcode(),
        propertyType: f.valuesFromArray({
          values: ["SINGLE_FAMILY", "MULTI_FAMILY", "CONDO", "COMMERCIAL"],
          isUnique: false,
        }),
        units: f.int({ minValue: 1, maxValue: 8 }),
        squareFeet: f.int({ minValue: 800, maxValue: 10000 }),
        monthlyRent: f.number({ minValue: 1000, maxValue: 5000, precision: 100 }),
        rentalStatus: f.valuesFromArray({
          values: ["RENTED", "VACANT", "UNDER_RENOVATION", "LISTED"],
          isUnique: false,
        }),
      },
      count: Math.ceil(count / 2),
    },

    // Bank Accounts
    bankAccount: {
      columns: {
        id: f.uuid(),
        institution: f.valuesFromArray({
          values: ["Chase", "Bank of America", "Wells Fargo", "Citibank", "Capital One", "USAA"],
          isUnique: false,
        }),
        accountType: f.valuesFromArray({
          values: ["CHECKING", "SAVINGS", "CD", "MONEY_MARKET"],
          isUnique: false,
        }),
        accountName: f.valuesFromArray({
          values: ["Primary Checking", "Emergency Fund", "Operating Account", "Reserve Fund"],
          isUnique: false,
        }),
        accountNumber: f.string({ isUnique: true }),
        routingNumber: f.string(),
        dodValue: f.number({ minValue: 5000, maxValue: 500000, precision: 100 }),
      },
      count,
    },

    // Investment Accounts
    investmentAccount: {
      columns: {
        id: f.uuid(),
        institution: f.valuesFromArray({
          values: [
            "Fidelity",
            "Vanguard",
            "Charles Schwab",
            "TD Ameritrade",
            "E*TRADE",
            "Merrill Lynch",
          ],
          isUnique: false,
        }),
        accountType: f.valuesFromArray({
          values: ["BROKERAGE", "IRA_TRADITIONAL", "IRA_ROTH", "K401"],
          isUnique: false,
        }),
        accountName: f.valuesFromArray({
          values: ["Retirement Fund", "Growth Portfolio", "Income Portfolio", "Education Fund"],
          isUnique: false,
        }),
        accountNumber: f.string({ isUnique: true }),
        dodValue: f.number({ minValue: 50000, maxValue: 2000000, precision: 100 }),
        costBasis: f.number({ minValue: 30000, maxValue: 1500000, precision: 100 }),
      },
      count,
    },

    // Tasks
    task: {
      columns: {
        id: f.uuid(),
        title: f.loremIpsum({ sentencesCount: 1 }),
        category: f.valuesFromArray({
          values: ["INVENTORY", "FINANCIAL", "BENEFICIARY", "LEGAL", "ADMINISTRATIVE", "OTHER"],
          isUnique: false,
        }),
        completed: f.boolean(),
        dueDate: f.date({ minDate: "2024-01-01", maxDate: "2025-12-31" }),
        sortOrder: f.int({ minValue: 0, maxValue: 100 }),
      },
      count: count * 3,
    },

    // Contacts
    contact: {
      columns: {
        id: f.uuid(),
        name: f.fullName(),
        company: f.companyName(),
        role: f.valuesFromArray({
          values: ["ATTORNEY", "ACCOUNTANT", "FINANCIAL_ADVISOR", "PROPERTY_MANAGER", "BANKER"],
          isUnique: false,
        }),
        email: f.email(),
        phone: f.phoneNumber({ template: "(###) ###-####" }),
        streetAddress: f.streetAddress(),
        city: f.city(),
        state: f.state(),
        zip: f.postcode(),
      },
      count,
    },

    // Trustees
    trustee: {
      columns: {
        id: f.uuid(),
        name: f.fullName(),
        status: f.valuesFromArray({
          values: ["CURRENT", "SUCCESSOR", "RESIGNED"],
          isUnique: false,
        }),
        order: f.int({ minValue: 1, maxValue: 3 }),
        isCo: f.boolean(),
      },
      count: Math.ceil(count / 2),
    },

    // Personal Property
    personalProperty: {
      columns: {
        id: f.uuid(),
        name: f.loremIpsum({ sentencesCount: 1 }),
        description: f.loremIpsum({ sentencesCount: 2 }),
        category: f.valuesFromArray({
          values: ["JEWELRY", "ART", "COLLECTIBLES", "FURNITURE", "ELECTRONICS"],
          isUnique: false,
        }),
        location: f.city(),
        acquisitionCost: f.number({ minValue: 100, maxValue: 50000, precision: 100 }),
        dodValue: f.number({ minValue: 50, maxValue: 75000, precision: 100 }),
      },
      count,
    },

    // Artwork
    artwork: {
      columns: {
        id: f.uuid(),
        title: f.loremIpsum({ sentencesCount: 1 }),
        artist: f.fullName(),
        medium: f.valuesFromArray({
          values: [
            "Oil on Canvas",
            "Watercolor",
            "Acrylic",
            "Bronze Sculpture",
            "Photography",
            "Mixed Media",
          ],
          isUnique: false,
        }),
        dimensions: f.valuesFromArray({
          values: ["24x36", "18x24", "30x40", "12x16", "48x60"],
          isUnique: false,
        }),
        location: f.city(),
        acquisitionCost: f.number({ minValue: 500, maxValue: 100000, precision: 100 }),
        dodValue: f.number({ minValue: 300, maxValue: 150000, precision: 100 }),
      },
      count: Math.ceil(count / 2),
    },
  }))

  console.log("\nDevelopment seed complete.")
  console.log(`   Entities: ${count}`)
  console.log(`   Beneficiaries: ${count * 2}`)
  console.log(`   Tasks: ${count * 3}`)
  console.log(`   Financial accounts: ${count * 2}`)
  console.log(`   Properties: ${Math.ceil(count / 2) + Math.ceil(count / 3)}`)

  process.exit(0)
}

seedDev().catch((err) => {
  console.error("Dev seed failed:", err)
  process.exit(1)
})
