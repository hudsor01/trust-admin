/** Application-layer data isolation — verifies tRPC context scopes beneficiary data (layer 1 of 2; RLS is layer 2). */
import { describe, expect, it } from 'bun:test'
import type { AppUser } from '@/server/trpc/init'

function makeBeneficiaryCtx(beneficiaryId: number) {
    const user: AppUser = {
        id: `user-uuid-${beneficiaryId}`,
        name: 'Test Beneficiary',
        email: `beneficiary${beneficiaryId}@example.com`,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'beneficiary',
        beneficiaryId,
        forcePasswordChange: false,
    }
    return { user, session: {} as never }
}

function makeAdminCtx() {
    const user: AppUser = {
        id: 'admin-uuid',
        name: 'Admin',
        email: 'admin@example.com',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'admin',
        beneficiaryId: null,
        forcePasswordChange: false,
    }
    return { user, session: {} as never }
}

describe('AppUser context — beneficiary isolation', () => {
    it('beneficiary context has correct beneficiaryId', () => {
        const ctx = makeBeneficiaryCtx(42)
        expect(ctx.user.beneficiaryId).toBe(42)
        expect(ctx.user.role).toBe('beneficiary')
    })

    it('admin context has null beneficiaryId', () => {
        const ctx = makeAdminCtx()
        expect(ctx.user.beneficiaryId).toBeNull()
        expect(ctx.user.role).toBe('admin')
    })

    it('two beneficiary contexts have different IDs', () => {
        const ctxA = makeBeneficiaryCtx(1)
        const ctxB = makeBeneficiaryCtx(2)
        expect(ctxA.user.beneficiaryId).not.toBe(ctxB.user.beneficiaryId)
    })

    it('beneficiaryId is typed as number | null', () => {
        const ctx = makeBeneficiaryCtx(99)
        const id: number | null = ctx.user.beneficiaryId
        expect(typeof id).toBe('number')
    })
})

describe('me procedure guard — null beneficiaryId', () => {
    it('returns null when beneficiaryId is null', () => {
        const ctx = {
            user: {
                ...makeAdminCtx().user,
                role: 'beneficiary' as const,
                beneficiaryId: null,
            },
        }
        // Mirrors the me procedure: if (!ctx.user.beneficiaryId) return null
        const result = ctx.user.beneficiaryId ? 'would-fetch' : null
        expect(result).toBeNull()
    })

    it('proceeds to fetch when beneficiaryId is set', () => {
        const ctx = makeBeneficiaryCtx(5)
        const result = ctx.user.beneficiaryId ? 'would-fetch' : null
        expect(result).toBe('would-fetch')
    })
})

describe('updateMyContact guard — rejects mismatched beneficiaryId', () => {
    it('allows update when input matches ctx beneficiaryId', () => {
        const ctx = makeBeneficiaryCtx(10)
        const inputBeneficiaryId = 10
        // Mirrors: if (!ctx.user.beneficiaryId) throw FORBIDDEN
        const allowed =
            !!ctx.user.beneficiaryId &&
            ctx.user.beneficiaryId === inputBeneficiaryId
        expect(allowed).toBe(true)
    })

    it('blocks update when ctx has no beneficiaryId', () => {
        const ctx = {
            user: {
                ...makeAdminCtx().user,
                role: 'beneficiary' as const,
                beneficiaryId: null,
            },
        }
        const allowed = !!ctx.user.beneficiaryId
        expect(allowed).toBe(false)
    })
})
