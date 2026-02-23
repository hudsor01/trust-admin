/**
 * Mock tRPC Context Helpers for Tests
 *
 * Provides properly typed mock contexts for tRPC caller factory,
 * eliminating the need for `as any` casts on the session object.
 *
 * The Context type from createContext() includes a `session` field whose type
 * comes from authServer.getSession().data. In tests, we don't have a real
 * auth session, so we construct a minimal mock that satisfies the Context type.
 */
import type { AppUser, Context } from '@/server/trpc/init'

/**
 * Minimal mock session shape that satisfies Context['session'].
 * In production, this comes from authServer.getSession() which returns
 * a complex Better Auth session type. For tests, we only need the fields
 * that tRPC procedures actually access.
 */
interface MockSessionUser {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    createdAt: Date
    updatedAt: Date
    role: string
}

interface MockSession {
    user: MockSessionUser
    session: { token: string }
}

/**
 * Create a properly typed admin Context for tRPC callers.
 *
 * @param overrides - Optional overrides for the user fields
 */
export function createAdminContext(overrides?: {
    id?: string
    name?: string
    email?: string
}): Context {
    const id = overrides?.id ?? 'test-admin'
    const name = overrides?.name ?? 'Test Admin'
    const email = overrides?.email ?? 'admin@test.com'

    const mockSession: MockSession = {
        user: {
            id,
            name,
            email,
            emailVerified: true,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: 'admin',
        },
        session: { token: 'fake-token' },
    }

    const user: AppUser = {
        id,
        name,
        email,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'admin',
        beneficiaryId: null,
        forcePasswordChange: false,
    }

    return {
        session: mockSession as Context['session'],
        user,
    }
}

/**
 * Create a properly typed beneficiary Context for tRPC callers.
 *
 * @param beneficiaryId - The beneficiary ID to link to (null if unlinked)
 * @param overrides - Optional overrides for the user fields
 */
export function createBeneficiaryContext(
    beneficiaryId: number | null,
    overrides?: {
        id?: string
        name?: string
        email?: string
    },
): Context {
    const id = overrides?.id ?? 'test-beneficiary'
    const name = overrides?.name ?? 'Test Beneficiary'
    const email = overrides?.email ?? 'beneficiary@test.com'

    const mockSession: MockSession = {
        user: {
            id,
            name,
            email,
            emailVerified: true,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: 'beneficiary',
        },
        session: { token: 'fake-token' },
    }

    const user: AppUser = {
        id,
        name,
        email,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'beneficiary',
        beneficiaryId,
        forcePasswordChange: false,
    }

    return {
        session: mockSession as Context['session'],
        user,
    }
}
