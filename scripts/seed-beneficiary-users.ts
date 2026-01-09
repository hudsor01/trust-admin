/**
 * Seed Beneficiary Users
 *
 * Creates user accounts for all beneficiaries with email addresses.
 * Uses magic link authentication - no passwords needed.
 *
 * Usage: bun scripts/seed-beneficiary-users.ts
 */

import { db } from "../db"
import { beneficiary, user, account } from "../db/schema"
import { generateId } from "../db/helpers"
import { eq } from "drizzle-orm"

async function seedBeneficiaryUsers() {
  console.log("Seeding beneficiary users for magic link authentication...")
  console.log("")

  // Get all beneficiaries with email addresses
  const beneficiaries = await db
    .select()
    .from(beneficiary)

  const beneficiariesWithEmail = beneficiaries.filter(b => b.email)

  console.log(`Found ${beneficiariesWithEmail.length} beneficiaries with email addresses`)
  console.log("")

  let created = 0
  let skipped = 0
  let errors = 0

  for (const ben of beneficiariesWithEmail) {
    if (!ben.email) continue

    // Check if user already exists with this email
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, ben.email))
      .limit(1)

    if (existingUser.length > 0) {
      console.log(`  [SKIP] ${ben.firstName} ${ben.lastName} - user already exists`)
      skipped++
      continue
    }

    try {
      const userId = generateId()
      const now = new Date()

      // Create user directly in database
      await db.insert(user).values({
        id: userId,
        name: `${ben.firstName} ${ben.lastName}`,
        email: ben.email,
        emailVerified: true, // Magic link verifies email on first login
        role: "beneficiary",
        beneficiaryId: ben.id,
        createdAt: now,
        updatedAt: now,
      })

      // Create magic link account (no password field needed)
      await db.insert(account).values({
        id: generateId(),
        accountId: ben.email,
        providerId: "magic-link",
        userId: userId,
        createdAt: now,
        updatedAt: now,
      })

      console.log(`  [CREATE] ${ben.firstName} ${ben.lastName} (${ben.email})`)
      created++
    } catch (err) {
      console.log(`  [ERROR] ${ben.firstName} ${ben.lastName} - ${err instanceof Error ? err.message : "Unknown error"}`)
      errors++
    }
  }

  console.log("")
  console.log("=== Summary ===")
  console.log(`Created: ${created}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
  console.log("")

  if (created > 0) {
    console.log("Beneficiaries can now log in at: /portal")
    console.log("They will receive a magic link via email to sign in.")
  }

  process.exit(0)
}

seedBeneficiaryUsers().catch((error) => {
  console.error("Error seeding beneficiary users:", error)
  process.exit(1)
})
