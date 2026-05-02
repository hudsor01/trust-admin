/** Owner-only user CRUD via Neon Auth Admin API + userProfile linking. */
import * as Sentry from '@sentry/nextjs'
import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, getClient } from '@/db'
import { createActivityLog } from '@/db/queries'
import { beneficiary, entity, userProfile, userRole } from '@/db/schema'
import { reconcileBeneficiaryId } from '@/lib/auth/roles'
import { authServer } from '@/lib/auth/server'
import { env } from '@/lib/env'
import {
    createTRPCRouter,
    ownerProcedure,
    protectedProcedure,
    strictAdminProcedure,
} from '../init'

const OWNER_EMAIL = env.ADMIN_EMAIL

/**
 * Translate the Postgres 23505 (unique_violation) thrown by the partial
 * unique index on user_profile.beneficiary_id into a tRPC CONFLICT.
 *
 * The application-level preflight (SELECT ... WHERE beneficiary_id = ?)
 * is the friendly path; this catches the race where two concurrent calls
 * both pass that preflight and both try to write the same FK.
 */
function isBeneficiaryLinkUniqueViolation(err: unknown): boolean {
    return (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === '23505' &&
        'constraint' in err &&
        (err as { constraint?: string }).constraint ===
            'user_profile_beneficiary_id_uniq'
    )
}

export const userManagementRouter = createTRPCRouter({
    /** Used by frontend to gate user management CRUD controls. */
    isOwner: strictAdminProcedure.query(async ({ ctx }) => {
        return {
            isOwner: ctx.user.email === OWNER_EMAIL,
            userId: ctx.user.id,
        }
    }),

    /** List all Neon Auth users enriched with userProfile + beneficiary data. */
    listAllUsers: strictAdminProcedure.query(async () => {
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

        const [profiles, beneficiaries] = await Promise.all([
            db
                .select({
                    userId: userProfile.userId,
                    role: userProfile.role,
                    beneficiaryId: userProfile.beneficiaryId,
                })
                .from(userProfile),
            db
                .select({
                    id: beneficiary.id,
                    firstName: beneficiary.firstName,
                    lastName: beneficiary.lastName,
                })
                .from(beneficiary),
        ])

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

    /**
     * Create a portal account (Neon Auth user + user_profile).
     *
     * Beneficiary linkage is split out so creating a non-beneficiary user
     * (admin/trustee/arbiter) does NOT write a stale row to the beneficiary
     * table, and creating a beneficiary user can either:
     *   - link to an existing beneficiary record (linkToBeneficiaryId), or
     *   - create a new one in the primary trust entity (default).
     */
    createPortalAccount: ownerProcedure
        .input(
            z
                .object({
                    firstName: z.string().min(1),
                    lastName: z.string().min(1),
                    email: z.string().email(),
                    tempPassword: z.string().min(8),
                    role: z.enum(userRole.enumValues).default('beneficiary'),
                    linkToBeneficiaryId: z.coerce.number().int().optional(),
                })
                .refine(
                    (v) => v.role === 'beneficiary' || !v.linkToBeneficiaryId,
                    {
                        message:
                            'linkToBeneficiaryId only applies when role is beneficiary',
                        path: ['linkToBeneficiaryId'],
                    },
                ),
        )
        .mutation(async ({ input, ctx }) => {
            const fullName = `${input.firstName} ${input.lastName}`

            // Validate the link target up front so failures surface before
            // any auth-side state is mutated.
            let linkedBeneficiary: { id: number } | undefined
            if (input.linkToBeneficiaryId) {
                const [found] = await db
                    .select({ id: beneficiary.id })
                    .from(beneficiary)
                    .where(eq(beneficiary.id, input.linkToBeneficiaryId))
                    .limit(1)

                if (!found) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Beneficiary ${input.linkToBeneficiaryId} not found`,
                    })
                }

                // Reject double-binding the same beneficiary to multiple users.
                const [existingLink] = await db
                    .select({ userId: userProfile.userId })
                    .from(userProfile)
                    .where(eq(userProfile.beneficiaryId, found.id))
                    .limit(1)

                if (existingLink) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Beneficiary ${found.id} is already linked to another portal account`,
                    })
                }

                linkedBeneficiary = found
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
            // Track whether we created the auth user in this call so the
            // catch below can clean it up if the downstream tx fails. If
            // we reused an existing Neon Auth user (exactMatchUser path)
            // we leave it alone.
            let authUserCreatedHere = false

            const inputEmailLower = input.email.toLowerCase()
            const exactMatchUser = (existingUsers?.users ?? []).find(
                (u: { email: string }) =>
                    u.email.toLowerCase() === inputEmailLower,
            )

            if (exactMatchUser) {
                const [existingUserProfile] = await db
                    .select()
                    .from(userProfile)
                    .where(eq(userProfile.userId, exactMatchUser.id))
                    .limit(1)

                if (existingUserProfile) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Email already in use by an existing account',
                    })
                }

                createdUserId = exactMatchUser.id
            } else {
                const { data: newUser, error: createError } =
                    await authServer.admin.createUser({
                        email: input.email,
                        password: input.tempPassword,
                        name: fullName,
                        role: input.role === 'admin' ? 'admin' : 'user',
                    })

                if (createError || !newUser) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Failed to create auth user: ${createError?.message ?? 'Unknown error'}`,
                    })
                }

                createdUserId = newUser.user.id
                authUserCreatedHere = true
            }

            let resolvedBeneficiaryId: number | null = null

            // Everything from here through the tx covers the auth-cleanup
            // window: any throw before the tx commits leaves a stranded
            // Neon Auth user with no user_profile row. The `try` boundary
            // therefore starts at the emailVerified UPDATE — the first
            // awaitable after the auth user is created — not at the tx
            // alone (round-3 fix narrowed the window; round-4 closes it).
            try {
                // Required: Better Auth returns 403 on sign-in when emailVerified is false
                await getClient().unsafe(
                    `UPDATE neon_auth."user" SET "emailVerified" = true WHERE id = $1`,
                    [createdUserId],
                )

                // Resolve the primary entity inside the cleanup window so a
                // missing-entity throw also triggers the auth rollback.
                let primaryEntityId: number | null = null
                if (input.role === 'beneficiary' && !linkedBeneficiary) {
                    const [primaryEntity] = await db
                        .select({ id: entity.id })
                        .from(entity)
                        .orderBy(entity.id)
                        .limit(1)
                    if (!primaryEntity) {
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'No trust entity found',
                        })
                    }
                    primaryEntityId = primaryEntity.id
                }

                // Beneficiary insert + user_profile write share a transaction
                // so a profile-write failure (e.g. the partial unique index
                // firing on a race) rolls back any beneficiary row we just
                // created — otherwise the failing call leaves an orphan
                // beneficiary that resurfaces in the "linkable beneficiaries"
                // picker on the next dialog open.
                await getClient().begin(async (tx) => {
                    if (input.role === 'beneficiary') {
                        if (linkedBeneficiary) {
                            resolvedBeneficiaryId = linkedBeneficiary.id
                        } else {
                            const inserted = await tx<{ id: number }[]>`
                                INSERT INTO public.beneficiary
                                    ("entityId", "firstName", "lastName", relationship, email, "updatedAt")
                                VALUES
                                    (${primaryEntityId!}, ${input.firstName}, ${input.lastName},
                                     'Beneficiary', ${input.email}, ${new Date().toISOString()})
                                RETURNING id
                            `
                            resolvedBeneficiaryId = inserted[0]?.id ?? null
                        }
                    }

                    await tx`
                        INSERT INTO public.user_profile
                            (user_id, role, beneficiary_id, force_password_change)
                        VALUES
                            (${createdUserId}, ${input.role}::"UserRole",
                             ${resolvedBeneficiaryId}, ${true})
                        ON CONFLICT (user_id) DO UPDATE SET
                            role = EXCLUDED.role,
                            beneficiary_id = EXCLUDED.beneficiary_id,
                            force_password_change = EXCLUDED.force_password_change,
                            updated_at = now()
                    `
                })
            } catch (err) {
                // Compensate the auth-side write if the DB transaction
                // rolled back. Otherwise we'd leave a Neon Auth user with
                // emailVerified=true and no user_profile row, counting
                // toward the listAllUsers cap and confusing the next admin
                // to look at the page. Cleanup is best-effort — if it
                // fails (network, cascading auth issue), the original
                // error still wins.
                if (authUserCreatedHere) {
                    await authServer.admin
                        .removeUser({ userId: createdUserId })
                        .catch((cleanupErr) =>
                            Sentry.captureException(cleanupErr, {
                                tags: {
                                    subsystem: 'createPortalAccount-rollback',
                                    userId: createdUserId,
                                },
                            }),
                        )
                }
                if (isBeneficiaryLinkUniqueViolation(err)) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Beneficiary ${resolvedBeneficiaryId} was just linked to another portal account`,
                    })
                }
                throw err
            }

            await createActivityLog({
                tableName: 'user_profile',
                recordId: createdUserId,
                action: 'INSERT',
                changedBy: ctx.user.id,
                newValues: {
                    userId: createdUserId,
                    email: input.email,
                    name: fullName,
                    role: input.role,
                    beneficiaryId: resolvedBeneficiaryId,
                    linked: linkedBeneficiary
                        ? 'existing-beneficiary'
                        : input.role === 'beneficiary'
                          ? 'new-beneficiary'
                          : 'none',
                },
            })

            return {
                userId: createdUserId,
                email: input.email,
                role: input.role,
                beneficiaryId: resolvedBeneficiaryId,
            }
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

    /**
     * Sync both Neon Auth native role and user_profile app role.
     *
     * Native Neon Auth only knows 'admin' | 'user' — we mirror admin to
     * 'admin' and trustee/arbiter/beneficiary all to 'user' (the app role
     * stored in user_profile is the source of truth for tRPC + RLS).
     */
    setUserRole: ownerProcedure
        .input(
            z
                .object({
                    userId: z.string(),
                    role: z.enum(userRole.enumValues),
                    linkToBeneficiaryId: z.coerce.number().int().optional(),
                })
                .refine(
                    (v) =>
                        v.role === 'beneficiary' ||
                        v.linkToBeneficiaryId === undefined,
                    {
                        message:
                            'linkToBeneficiaryId only applies when role is beneficiary',
                        path: ['linkToBeneficiaryId'],
                    },
                ),
        )
        .mutation(async ({ input, ctx }) => {
            if (input.userId === ctx.user.id) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Cannot change your own role',
                })
            }

            // Validate the link target up front so failures surface before
            // the auth-side state is mutated.
            if (
                input.role === 'beneficiary' &&
                typeof input.linkToBeneficiaryId === 'number'
            ) {
                const [target] = await db
                    .select({ id: beneficiary.id })
                    .from(beneficiary)
                    .where(eq(beneficiary.id, input.linkToBeneficiaryId))
                    .limit(1)
                if (!target) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Beneficiary ${input.linkToBeneficiaryId} not found`,
                    })
                }
                const [otherLink] = await db
                    .select({ userId: userProfile.userId })
                    .from(userProfile)
                    .where(
                        eq(
                            userProfile.beneficiaryId,
                            input.linkToBeneficiaryId,
                        ),
                    )
                    .limit(1)
                if (otherLink && otherLink.userId !== input.userId) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Beneficiary ${input.linkToBeneficiaryId} is already linked to another portal account`,
                    })
                }
            }

            const neonRole = input.role === 'admin' ? 'admin' : 'user'

            const { error } = await authServer.admin.setRole({
                userId: input.userId,
                role: neonRole,
            })

            if (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Failed to set role: ${error.message}`,
                })
            }

            const [existing] = await db
                .select()
                .from(userProfile)
                .where(eq(userProfile.userId, input.userId))
                .limit(1)

            // For non-beneficiary roles, reconcileBeneficiaryId clears the
            // FK regardless of input. For beneficiary, the explicit link
            // wins; otherwise preserve whatever was there (matches the
            // existing reconcileBeneficiaryId rule).
            const beneficiaryIdForRow =
                input.role === 'beneficiary' &&
                typeof input.linkToBeneficiaryId === 'number'
                    ? input.linkToBeneficiaryId
                    : reconcileBeneficiaryId(
                          input.role,
                          existing?.beneficiaryId,
                      )

            try {
                if (existing) {
                    await db
                        .update(userProfile)
                        .set({
                            role: input.role,
                            beneficiaryId: beneficiaryIdForRow,
                            updatedAt: new Date(),
                        })
                        .where(eq(userProfile.userId, input.userId))
                } else {
                    await db.insert(userProfile).values({
                        userId: input.userId,
                        role: input.role,
                        beneficiaryId: beneficiaryIdForRow,
                        forcePasswordChange: false,
                    })
                }
            } catch (err) {
                if (isBeneficiaryLinkUniqueViolation(err)) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Beneficiary ${beneficiaryIdForRow} was just linked to another portal account`,
                    })
                }
                throw err
            }

            await createActivityLog({
                tableName: 'user',
                recordId: input.userId,
                action: 'UPDATE',
                changedBy: ctx.user.id,
                oldValues: existing
                    ? {
                          appRole: existing.role,
                          beneficiaryId: existing.beneficiaryId,
                      }
                    : undefined,
                newValues: {
                    neonRole,
                    appRole: input.role,
                    beneficiaryId: beneficiaryIdForRow,
                },
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
