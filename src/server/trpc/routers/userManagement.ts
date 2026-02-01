/**
 * User Management tRPC Router
 *
 * Admin procedures for provisioning beneficiary portal accounts.
 * Uses Neon Auth Admin plugin for user creation and password management.
 * Uses userProfile table to link Neon Auth users to beneficiary records.
 *
 * Two-step provisioning:
 * 1. Create Neon Auth user via authServer.admin.createUser()
 * 2. Insert userProfile record linking userId to beneficiaryId
 *
 * Note: Neon Auth native role is always "user" for beneficiaries.
 * App-level role ("beneficiary") lives in userProfile.role.
 */
import { TRPCError } from '@trpc/server'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../../db'
import { createActivityLog } from '../../../../db/queries'
import { beneficiary, userProfile } from '../../../../db/schema'
import { authServer } from '../../../lib/auth/server'
import { adminProcedure, createTRPCRouter } from '../index'

export const userManagementRouter = createTRPCRouter({
    /**
     * Create a beneficiary portal account
     *
     * 1. Validates beneficiary exists and has no existing account
     * 2. Checks email is not already in use
     * 3. Creates Neon Auth user with "user" native role
     * 4. Creates userProfile with "beneficiary" app role
     * 5. Logs activity for audit trail
     */
    createBeneficiaryUser: adminProcedure
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
     * List all provisioned users with linked beneficiary info
     *
     * Left joins userProfile with beneficiary to show:
     * - userProfile fields (userId, role, beneficiaryId, createdAt)
     * - beneficiary fields (firstName, lastName, email)
     *
     * Note: We don't query neon_auth.user directly — userProfile is
     * the source of truth for app-level users.
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
     * Reset a user's password via Neon Auth Admin API
     *
     * Requires admin session cookies (auto-forwarded by Neon Auth
     * when called from route handler context).
     */
    resetUserPassword: adminProcedure
        .input(
            z.object({
                userId: z.string(),
                newPassword: z.string().min(8),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            // 1. Verify userProfile exists for this userId
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

            // 2. Call Neon Auth Admin API to reset password
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

            // 3. Log activity
            await createActivityLog({
                tableName: 'user_profile',
                recordId: input.userId,
                action: 'UPDATE',
                changedBy: ctx.user.id,
                newValues: { passwordReset: true },
            })

            return { success: true }
        }),
})
