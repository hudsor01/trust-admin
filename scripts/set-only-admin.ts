/**
 * Set Only Admin User
 *
 * Makes the specified email the ONLY admin user by:
 * 1. Demoting all existing admins to beneficiary role
 * 2. Promoting the specified user to admin
 *
 * Usage:
 *   bun run scripts/set-only-admin.ts
 */

import { eq } from 'drizzle-orm'
import { db, getClient, userProfile } from '../db'

const ADMIN_EMAIL = 'rhudsontspr@gmail.com'

const client = getClient()

async function setOnlyAdmin() {
    console.log(`Setting ${ADMIN_EMAIL} as the only admin user...\n`)

    // Step 1: Demote all existing admins to beneficiary
    const demoted = await db
        .update(userProfile)
        .set({ role: 'beneficiary', updatedAt: new Date() })
        .where(eq(userProfile.role, 'admin'))
        .returning()

    if (demoted.length > 0) {
        console.log(
            `Demoted ${demoted.length} existing admin(s) to beneficiary role`,
        )
    }

    // Step 2: Find the user in neon_auth.user table
    const result = await client`
        SELECT id, email, name
        FROM neon_auth."user"
        WHERE email = ${ADMIN_EMAIL}
        LIMIT 1
    `

    if (!result || result.length === 0) {
        console.error(`\nNo user found with email: ${ADMIN_EMAIL}`)
        console.error(
            'Make sure the user has signed up via /auth/sign-in first.',
        )
        await client.end()
        process.exit(1)
    }

    const neonUser = result[0] as { id: string; email: string; name: string }
    console.log(
        `Found user: ${neonUser.name || neonUser.email} (ID: ${neonUser.id})`,
    )

    // Step 3: Check if profile exists
    const existingProfile = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, neonUser.id))
        .limit(1)

    if (existingProfile.length > 0) {
        // Update existing profile to admin
        await db
            .update(userProfile)
            .set({ role: 'admin', updatedAt: new Date() })
            .where(eq(userProfile.userId, neonUser.id))

        console.log('Updated existing profile to admin role')
    } else {
        // Create new admin profile
        await db.insert(userProfile).values({
            userId: neonUser.id,
            role: 'admin',
            beneficiaryId: null,
        })

        console.log('Created new admin profile')
    }

    // Step 4: Verify the change
    const admins = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.role, 'admin'))

    console.log(`\nAdmin setup complete!`)
    console.log(`Total admin users: ${admins.length}`)
    console.log(`${ADMIN_EMAIL} is now the only admin.`)

    await client.end()
}

setOnlyAdmin().catch(async (error) => {
    console.error('Error setting admin:', error)
    try {
        await client.end()
    } catch {
        // Ignore cleanup errors
    }
    process.exit(1)
})
