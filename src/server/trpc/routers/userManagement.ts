/**
 * User Management tRPC Router
 *
 * Owner-only procedures for managing all user accounts.
 * Uses Neon Auth Admin plugin for user CRUD and Better Auth admin APIs.
 * Uses userProfile table to link Neon Auth users to beneficiary records.
 *
 * Access: All mutation procedures require the trust owner (ownerProcedure).
 * Read-only isOwner check uses adminProcedure so any admin can query it.
 */
import { TRPCError } from '@trpc/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { OWNER_EMAIL } from '@/lib/constants'
import { db, getSql } from '../../../../db'
import { createActivityLog } from '../../../../db/queries'
import { beneficiary, userProfile } from '../../../../db/schema'
import { authServer } from '../../../lib/auth/server'
import { adminProcedure, createTRPCRouter, ownerProcedure } from '../index'

export const userManagementRouter = createTRPCRouter({
    /**
     * Check if current user is the trust owner.
     * Used by the frontend to gate CRUD controls.
     */
    isOwner: adminProcedure.query(async ({ ctx }) => {
        return {
            isOwner: ctx.user.email === OWNER_EMAIL,
            userId: ctx.user.id,
        }
    }),

    /**
     * List ALL users from Neon Auth, enriched with userProfile data.
     * Shows both admin and beneficiary users.
     */
    listAllUsers: ownerProcedure.query(async () => {
        // 1. Fetch all users from Neon Auth
        const { data, error } = await authServer.admin.listUsers({
            query: {
                limit: 100,
                sortBy: 'createdAt',
                sortDirection: 'desc',
            },
        })

        if (error) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to list users: ${error.message}`,
            })
        }

        const neonUsers = data?.users ?? []

        // 2. Fetch all userProfiles for enrichment
        const profiles = await db
            .select({
                userId: userProfile.userId,
                role: userProfile.role,
                beneficiaryId: userProfile.beneficiaryId,
            })
            .from(userProfile)

        // 3. Fetch all beneficiaries for name resolution
        const beneficiaries = await db
            .select({
                id: beneficiary.id,
                firstName: beneficiary.firstName,
                lastName: beneficiary.lastName,
            })
            .from(beneficiary)

        // 4. Build lookup maps
        const profileMap = new Map(profiles.map((p) => [p.userId, p]))
        const beneficiaryMap = new Map(beneficiaries.map((b) => [b.id, b]))

        // 5. Merge and return
        return neonUsers.map((u) => {
            const profile = profileMap.get(u.id)
            const ben = profile?.beneficiaryId
                ? beneficiaryMap.get(profile.beneficiaryId)
                : null

            return {
                id: u.id,
                name: u.name,
                email: u.email,
                emailVerified: u.emailVerified,
                image: u.image,
                createdAt: u.createdAt,
                neonRole: u.role,
                banned: u.banned ?? false,
                banReason: u.banReason ?? null,
                banExpires: u.banExpires ?? null,
                appRole: profile?.role ?? null,
                beneficiaryId: profile?.beneficiaryId ?? null,
                beneficiaryName: ben
                    ? `${ben.firstName} ${ben.lastName}`
                    : null,
            }
        })
    }),

    /**
     * Create a beneficiary portal account
     *
     * 1. Validates beneficiary exists and has no existing account
     * 2. Checks email is not already in use
     * 3. Creates Neon Auth user with "user" native role
     * 4. Creates userProfile with "beneficiary" app role
     * 5. Logs activity for audit trail
     */
    createBeneficiaryUser: ownerProcedure
        .input(
            z.object({
                beneficiaryId: z.number(),
                email: z.string().email(),
                tempPassword: z.string().min(8),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            // 1. Verify beneficiary exists
            const [ben] = await db
                .select()
                .from(beneficiary)
                .where(eq(beneficiary.id, input.beneficiaryId))
                .limit(1)

            if (!ben) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Beneficiary not found',
                })
            }

            // 2. Check no existing userProfile for this beneficiary
            const [existingProfile] = await db
                .select()
                .from(userProfile)
                .where(eq(userProfile.beneficiaryId, input.beneficiaryId))
                .limit(1)

            if (existingProfile) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Beneficiary already has a portal account',
                })
            }

            // 3. Check if email is already taken by another Neon Auth user
            const { data: existingUsers, error: listError } =
                await authServer.admin.listUsers({
                    query: {
                        searchValue: input.email,
                        searchField: 'email',
                    },
                })

            if (listError) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to check existing users: ${listError.message}`,
                })
            }

            if (existingUsers?.users && existingUsers.users.length > 0) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Email already in use',
                })
            }

            // 4. Create Neon Auth user — native role is always "user"
            const { data: newUser, error: createError } =
                await authServer.admin.createUser({
                    email: input.email,
                    password: input.tempPassword,
                    name: `${ben.firstName} ${ben.lastName}`,
                    role: 'user',
                })

            if (createError || !newUser) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to create auth user: ${createError?.message ?? 'Unknown error'}`,
                })
            }

            const createdUserId = newUser.user.id

            // 5. Create userProfile linking to beneficiary
            await db.insert(userProfile).values({
                userId: createdUserId,
                role: 'beneficiary',
                beneficiaryId: input.beneficiaryId,
                forcePasswordChange: true,
            })

            // 6. Log activity
            await createActivityLog({
                tableName: 'user_profile',
                recordId: createdUserId,
                action: 'INSERT',
                changedBy: ctx.user.id,
                newValues: {
                    userId: createdUserId,
                    email: input.email,
                    beneficiaryId: input.beneficiaryId,
                    role: 'beneficiary',
                },
            })

            // Return userId and email — never return the password
            return { userId: createdUserId, email: input.email }
        }),

    /**
     * List provisioned users with linked beneficiary info (legacy).
     * Kept for backward compatibility. Prefer listAllUsers.
     */
    listProvisionedUsers: adminProcedure.query(async () => {
        const results = await db
            .select({
                userId: userProfile.userId,
                role: userProfile.role,
                beneficiaryId: userProfile.beneficiaryId,
                createdAt: userProfile.createdAt,
                firstName: beneficiary.firstName,
                lastName: beneficiary.lastName,
                beneficiaryEmail: beneficiary.email,
            })
            .from(userProfile)
            .leftJoin(
                beneficiary,
                eq(userProfile.beneficiaryId, beneficiary.id),
            )
            .orderBy(desc(userProfile.createdAt))

        return results
    }),

    /**
     * Update user name or email via Neon Auth Admin API
     */
    updateUser: ownerProcedure
        .input(
            z.object({
                userId: z.string(),
                name: z.string().min(1).optional(),
                email: z.string().email().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            // Block owner from changing their own email (would lock out of ownerProcedure)
            if (input.userId === ctx.user.id && input.email) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message:
                        'Cannot change your own email — this would revoke owner access',
                })
            }

            const fields: Partial<{ name: string; email: string }> = {}
            if (input.name) fields.name = input.name
            if (input.email) fields.email = input.email

            if (Object.keys(fields).length === 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'No fields to update',
                })
            }

            // Update neon_auth."user" directly via raw SQL.
            // Neon Auth stores users in the neon_auth schema, not public.user.
            // The admin API proxy (authServer.admin.updateUser) returns 400.
            const sql = getSql()
            const now = new Date().toISOString()
            const setClauses: string[] = []
            const params: (string | null)[] = []

            if (fields.name) {
                params.push(fields.name)
                setClauses.push(`"name" = $${params.length}`)
            }
            if (fields.email) {
                params.push(fields.email)
                setClauses.push(`"email" = $${params.length}`)
            }
            params.push(now)
            setClauses.push(`"updatedAt" = $${params.length}`)
            params.push(input.userId)

            const result = (await sql.query(
                `UPDATE neon_auth."user" SET ${setClauses.join(', ')} WHERE "id" = $${params.length} RETURNING "id"`,
                params,
            )) as Record<string, unknown>[]

            if (result.length === 0) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found',
                })
            }

            await createActivityLog({
                tableName: 'user',
                recordId: input.userId,
                action: 'UPDATE',
                changedBy: ctx.user.id,
                newValues: fields,
            })

            return { success: true }
        }),

    /**
     * Change Neon Auth native role AND userProfile app role
     */
    setUserRole: ownerProcedure
        .input(
            z.object({
                userId: z.string(),
                role: z.enum(['admin', 'user']),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (input.userId === ctx.user.id) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Cannot change your own role',
                })
            }

            // 1. Set Neon Auth native role
            const { error } = await authServer.admin.setRole({
                userId: input.userId,
                role: input.role,
            })

            if (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to set role: ${error.message}`,
                })
            }

            // 2. Update userProfile app role if profile exists
            const appRole = input.role === 'admin' ? 'admin' : 'beneficiary'
            const [existing] = await db
                .select()
                .from(userProfile)
                .where(eq(userProfile.userId, input.userId))
                .limit(1)

            if (existing) {
                await db
                    .update(userProfile)
                    .set({
                        role: appRole as 'admin' | 'beneficiary',
                        updatedAt: new Date(),
                    })
                    .where(eq(userProfile.userId, input.userId))
            }

            await createActivityLog({
                tableName: 'user',
                recordId: input.userId,
                action: 'UPDATE',
                changedBy: ctx.user.id,
                newValues: { neonRole: input.role, appRole },
            })

            return { success: true }
        }),

    /**
     * Reset a user's password via Neon Auth Admin API
     */
    resetUserPassword: ownerProcedure
        .input(
            z.object({
                userId: z.string(),
                newPassword: z.string().min(8),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (input.userId === ctx.user.id) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Cannot reset your own password from this page',
                })
            }

            // Verify user exists before calling external auth API
            const [profile] = await db
                .select()
                .from(userProfile)
                .where(eq(userProfile.userId, input.userId))
                .limit(1)

            if (!profile) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User profile not found',
                })
            }

            const { error } = await authServer.admin.setUserPassword({
                userId: input.userId,
                newPassword: input.newPassword,
            })

            if (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to reset password: ${error.message}`,
                })
            }

            await db
                .update(userProfile)
                .set({ forcePasswordChange: true, updatedAt: new Date() })
                .where(eq(userProfile.userId, input.userId))

            await createActivityLog({
                tableName: 'user',
                recordId: input.userId,
                action: 'UPDATE',
                changedBy: ctx.user.id,
                newValues: { passwordReset: true },
            })

            return { success: true }
        }),

    /**
     * Ban a user (temporarily restrict access)
     */
    banUser: ownerProcedure
        .input(
            z.object({
                userId: z.string(),
                banReason: z.string().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (input.userId === ctx.user.id) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Cannot ban yourself',
                })
            }

            const { error } = await authServer.admin.banUser({
                userId: input.userId,
                banReason: input.banReason,
            })

            if (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to ban user: ${error.message}`,
                })
            }

            await createActivityLog({
                tableName: 'user',
                recordId: input.userId,
                action: 'UPDATE',
                changedBy: ctx.user.id,
                newValues: { banned: true, banReason: input.banReason },
            })

            return { success: true }
        }),

    /**
     * Unban a user (lift access restriction)
     */
    unbanUser: ownerProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const { error } = await authServer.admin.unbanUser({
                userId: input.userId,
            })

            if (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to unban user: ${error.message}`,
                })
            }

            await createActivityLog({
                tableName: 'user',
                recordId: input.userId,
                action: 'UPDATE',
                changedBy: ctx.user.id,
                newValues: { banned: false },
            })

            return { success: true }
        }),

    /**
     * Permanently delete a user from both userProfile and Neon Auth
     */
    removeUser: ownerProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (input.userId === ctx.user.id) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Cannot delete yourself',
                })
            }

            // 1. Remove from Neon Auth first
            const { error } = await authServer.admin.removeUser({
                userId: input.userId,
            })

            if (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to remove user: ${error.message}`,
                })
            }

            // 2. Delete userProfile if it exists
            const [deletedProfile] = await db
                .delete(userProfile)
                .where(eq(userProfile.userId, input.userId))
                .returning()

            await createActivityLog({
                tableName: 'user',
                recordId: input.userId,
                action: 'DELETE',
                changedBy: ctx.user.id,
                oldValues: deletedProfile
                    ? {
                          appRole: deletedProfile.role,
                          beneficiaryId: deletedProfile.beneficiaryId,
                      }
                    : {},
            })

            return { success: true }
        }),

    /**
     * Revoke all active sessions for a user (force logout)
     */
    revokeUserSessions: ownerProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const { error } = await authServer.admin.revokeUserSessions({
                userId: input.userId,
            })

            if (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to revoke sessions: ${error.message}`,
                })
            }

            await createActivityLog({
                tableName: 'session',
                recordId: input.userId,
                action: 'DELETE',
                changedBy: ctx.user.id,
                newValues: { action: 'revoke_all_sessions' },
            })

            return { success: true }
        }),
})
