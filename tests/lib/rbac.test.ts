import { describe, expect, test } from 'bun:test'
import { isUserRole } from '@/db/schema'
import {
    type AppRole,
    isAdmin,
    isBeneficiary,
    isTrustAdmin,
    TRUST_ADMIN_ROLES,
} from '@/lib/auth/roles'

describe('TRUST_ADMIN_ROLES', () => {
    test('contains exactly admin, trustee, arbiter (in that order)', () => {
        expect([...TRUST_ADMIN_ROLES]).toEqual(['admin', 'trustee', 'arbiter'])
    })
})

describe('isTrustAdmin', () => {
    test.each([
        ['admin'],
        ['trustee'],
        ['arbiter'],
    ] as const)('returns true for %s', (role) => {
        expect(isTrustAdmin({ role: role as AppRole })).toBe(true)
    })

    test.each([
        ['beneficiary'],
        ['user'],
    ] as const)('returns false for %s', (role) => {
        expect(isTrustAdmin({ role: role as AppRole })).toBe(false)
    })
})

describe('isAdmin (strict)', () => {
    test('returns true only for literal admin role', () => {
        expect(isAdmin({ role: 'admin' })).toBe(true)
        expect(isAdmin({ role: 'trustee' })).toBe(false)
        expect(isAdmin({ role: 'arbiter' })).toBe(false)
        expect(isAdmin({ role: 'beneficiary' })).toBe(false)
        expect(isAdmin({ role: 'user' })).toBe(false)
    })
})

describe('isBeneficiary', () => {
    test('requires role beneficiary AND a beneficiaryId', () => {
        expect(isBeneficiary({ role: 'beneficiary', beneficiaryId: 1 })).toBe(
            true,
        )
        expect(
            isBeneficiary({ role: 'beneficiary', beneficiaryId: null }),
        ).toBe(false)
        expect(isBeneficiary({ role: 'beneficiary' })).toBe(false)
        expect(isBeneficiary({ role: 'admin' })).toBe(false)
        expect(isBeneficiary({ role: 'trustee' })).toBe(false)
    })
})

describe('isUserRole', () => {
    test.each([
        ['admin'],
        ['trustee'],
        ['arbiter'],
        ['beneficiary'],
    ])('accepts %s', (role) => {
        expect(isUserRole(role)).toBe(true)
    })

    test.each([
        ['user'],
        ['owner'],
        [''],
        [null],
        [undefined],
        [42],
    ])('rejects %p', (value) => {
        expect(isUserRole(value)).toBe(false)
    })
})
