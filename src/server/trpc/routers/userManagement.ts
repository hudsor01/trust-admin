/** Owner-only user CRUD via Neon Auth Admin API + userProfile linking. */
import { TRPCError } from '@trpc/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, getClient } from '@/db'
import { createActivityLog } from '@/db/queries'
import { beneficiary, userProfile } from '@/db/schema'
import { authServer } from '@/lib/auth/server'
import { env } from '@/lib/env'
import {
    adminProcedure,
    createTRPCRouter,
    ownerProcedure,
    protectedProcedure,
} from '../init'

const OWNER_EMAIL = env.ADMIN_EMAIL

export const userManagementRouter = createTRPCRouter({
    /** Used by frontend to gate user management CRUD controls. */
    isOwner: adminProcedure.query(async ({ ctx }) => {
        return {
            isOwner: ctx.user.email === OWNER_EMAIL,
            userId: ctx.user.id,
        }
    }),

    /** List all Neon Auth users enriched with userProfile + beneficiary data. */
    listAllUsers: ownerProcedure.query(async () => {
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

        const neonUsers = (data?.users ?? []) as Array<{
            id: string
            name: string
            email: string
            emailVerified: boolean
            image?: string | null
            createdAt: Date
            updatedAt: Date
            role?: string | null
            banned?: boolean | null
            banReason?: string | null
            banExpires?: Date | null
        }>

        const profiles = await db
            .select({
                userId: userProfile.userId,
                role: userProfile.role,
                beneficiaryId: userProfile.beneficiaryId,
            })
            .from(userProfile)

        const beneficiaries = await db
            .select({
                id: beneficiary.id,
                firstName: beneficiary.firstName,
                lastName: beneficiary.lastName,
            })
            .from(beneficiary)

        const profileMap = new Map(profiles.map((p) => [p.userId, p]))
        const beneficiaryMap = new Map(beneficiaries.map((b) => [b.id, b]))

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

    /** Create a beneficiary portal account (Neon Auth user + userProfile link). */
    createBeneficiaryUser: ownerProcedure
        .input(
            z.object({
                beneficiaryId: z.number(),
                email: z.string().email(),
                tempPassword: z.string().min(8),
            }),
        )
        .mutation(async ({ input, ctx }) => {
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

            let createdUserId: string

            // listUsers searchValue may do partial/contains matching —
            // filter to exact email match to avoid false positives.
            // Case-insensitive: auth providers normalize to lowercase.
            const inputEmailLower = input.email.toLowerCase()
            const exactMatchUser = (existingUsers?.users ?? []).find(
                (u: { email: string }) =>
                    u.email.toLowerCase() === inputEmailLower,
            )

            if (exactMatchUser) {
                // Auth user exists — check if they already have a profile
                const [existingUserProfile] = await db
                    .select()
                    .from(userProfile)
                    .where(eq(userProfile.userId, exactMatchUser.id))
                    .limit(1)

                // Block if the profile belongs to an admin — creating a beneficiary
                // account would overwrite their role and revoke admin privileges
                if (
                    existingUserProfile &&
                    existingUserProfile.role === 'admin'
                ) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message:
                            'Email belongs to an admin account — remove admin role first',
                    })
                }

                // Block if the profile is already linked to a different beneficiary
                if (
                    existingUserProfile &&
                    existingUserProfile.beneficiaryId !== null &&
                    existingUserProfile.beneficiaryId !== input.beneficiaryId
                ) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Email already in use by another account',
                    })
                }

                // Reuse orphaned auth user (created previously but profile insert failed)
                createdUserId = exactMatchUser.id
            } else {
                // Native role is always "user"; app role "beneficiary" is set in userProfile
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

                createdUserId = newUser.user.id
            }

            // Required: Better Auth returns 403 on sign-in when emailVerified is false
            await getClient().unsafe(
                `UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = $1`,
                [createdUserId],
            )

            await db
                .insert(userProfile)
                .values({
                    userId: createdUserId,
                    role: 'beneficiary',
                    beneficiaryId: input.beneficiaryId,
                    forcePasswordChange: true,
                })
                .onConflictDoUpdate({
                    target: userProfile.userId,
                    set: {
                        role: 'beneficiary',
                        beneficiaryId: input.beneficiaryId,
                        forcePasswordChange: true,
                    },
                })

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

            return { userId: createdUserId, email: input.email }
        }),

    /** @deprecated Use listAllUsers instead. */
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

    /** Update user name or email via raw SQL (Neon Auth admin proxy returns 400). */
    updateUser: ownerProcedure
        .input(
            z.object({
                userId: z.string(),
                name: z.string().min(1).optional(),
                email: z.string().email().optional(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            // Changing owner email would revoke ownerProcedure access (matched by ADMIN_EMAIL)
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

            const pgClient = getClient()
            const result = await pgClient.unsafe(
                `UPDATE neon_auth."user" SET ${setClauses.join(', ')} WHERE "id" = $${params.length} RETURNING "id"`,
                params,
            )

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

    /** Sync both Neon Auth native role and userProfile app role. */
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

            // Only promote to admin in userProfile; demoting to 'user' preserves
            // existing app role to avoid granting unintended portal access.
            const [existing] = await db
                .select()
                .from(userProfile)
                .where(eq(userProfile.userId, input.userId))
                .limit(1)

            if (existing && input.role === 'admin') {
                await db
                    .update(userProfile)
                    .set({ role: 'admin', updatedAt: new Date() })
                    .where(eq(userProfile.userId, input.userId))
            }

            const appRole =
                input.role === 'admin' ? 'admin' : (existing?.role ?? 'user')

            await createActivityLog({
                tableName: 'user',
                recordId: input.userId,
                action: 'UPDATE',
                changedBy: ctx.user.id,
                newValues: { neonRole: input.role, appRole },
            })

            return { success: true }
        }),

    /** Reset password and set forcePasswordChange flag. */
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

            // Revoke sessions after password change
            const { error: revokeError } =
                await authServer.admin.revokeUserSessions({
                    userId: input.userId,
                })
            if (revokeError) {
                const Sentry = await import('@sentry/nextjs')
                Sentry.captureException(
                    new Error(
                        `Session revocation failed for user ${input.userId}`,
                    ),
                    { tags: { subsystem: 'session-revocation' } },
                )
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
     * Permanently remove a user's portal access (userProfile + Neon Auth).
     *
     * The linked `beneficiary` record is intentionally preserved — it is a
     * legal trust entity referenced by distributions, HEMS requests, and
     * accounting entries. Deleting the auth account revokes portal access
     * without destroying the beneficiary's historical trust records.
     *
     * To remove someone as a beneficiary entirely, do so on the Beneficiaries
     * page after first revoking their portal account here.
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

            const [deletedProfile] = await db
                .delete(userProfile)
                .where(eq(userProfile.userId, input.userId))
                .returning()

            const { error } = await authServer.admin.removeUser({
                userId: input.userId,
            })

            if (error) {
                // Restore profile to avoid orphaned auth user without a profile
                if (deletedProfile) {
                    await db
                        .insert(userProfile)
                        .values({
                            userId: deletedProfile.userId,
                            role: deletedProfile.role,
                            beneficiaryId: deletedProfile.beneficiaryId,
                            forcePasswordChange:
                                deletedProfile.forcePasswordChange,
                        })
                        .onConflictDoNothing()
                }
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to remove user from auth: ${error.message}`,
                })
            }

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

    /** Uses protectedProcedure (not beneficiaryProcedure) so it's callable during the forced password change flow. */
    clearForcePasswordChange: protectedProcedure.mutation(async ({ ctx }) => {
        await db
            .update(userProfile)
            .set({ forcePasswordChange: false, updatedAt: new Date() })
            .where(eq(userProfile.userId, ctx.user.id))

        return { success: true }
    }),

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
