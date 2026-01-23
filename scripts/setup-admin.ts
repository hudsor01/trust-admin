/**
 * Setup Admin User Profile
 *
 * This script creates a user_profile record for an admin user after they've signed up via Neon Auth.
 *
 * Usage:
 *   bun run scripts/setup-admin.ts <email>
 *
 * Prerequisites:
 *   1. The user must have already signed up via /auth/sign-in
 *   2. DATABASE_URL environment variable must be set
 */

import { eq } from 'drizzle-orm'
import { db, getClient, userProfile } from '../db'

const emailArg = process.argv[2]

if (!emailArg) {
    console.error('Usage: bun run scripts/setup-admin.ts <email>')
    console.error('Example: bun run scripts/setup-admin.ts admin@example.com')
    process.exit(1)
}

const email: string = emailArg

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set')
    process.exit(1)
}

const client = getClient()

async function setupAdmin() {
    console.log(`Looking up user with email: ${email}`)

    // Find the user in neon_auth.user table using raw SQL
    const result =
        await client`SELECT id, email, name FROM neon_auth."user" WHERE email = ${email} LIMIT 1`

    if (!result || result.length === 0) {
        console.error(`No user found with email: ${email}`)
        console.error('')
        console.error(
            'Make sure the user has signed up via /auth/sign-in first.',
        )
        process.exit(1)
    }

    const neonUser = result[0] as { id: string; email: string; name: string }
    console.log(
        `Found user: ${neonUser.name || neonUser.email} (ID: ${neonUser.id})`,
    )

    // Check if profile already exists
    const existingProfile = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, neonUser.id))
        .limit(1)

    if (existingProfile.length > 0 && existingProfile[0]) {
        if (existingProfile[0].role === 'admin') {
            console.log('User already has admin profile')
            await client.end()
            process.exit(0)
        }

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

    console.log('')
    console.log('Admin setup complete!')
    console.log(`User ${email} now has admin access.`)

    await client.end()
}

setupAdmin().catch(async (error) => {
    console.error('Error setting up admin:', error)
    try {
        await client.end()
    } catch {
        // Ignore cleanup errors
    }
    process.exit(1)
})
