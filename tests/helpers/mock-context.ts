/** Typed mock tRPC contexts for caller factory — no real auth session needed in tests. */
import type { AppUser, Context } from '@/server/trpc/init'

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
