import { describe, expect, it } from 'bun:test'
import { insertFirearmSchema, updateFirearmSchema } from '@/db/validation'

// Minimal valid input — all required fields, no NFA flag.
const validBase = {
    entityId: 1,
    name: 'Grantor Model 700',
    make: 'Remington',
    model: '700',
    serialNumber: 'A123456',
    firearmType: 'RIFLE' as const,
}

describe('insertFirearmSchema', () => {
    it('accepts a valid firearm with all required fields', () => {
        const result = insertFirearmSchema.safeParse(validBase)
        expect(result.success).toBe(true)
    })

    it('rejects missing name', () => {
        const { name: _name, ...rest } = validBase
        const result = insertFirearmSchema.safeParse(rest)
        expect(result.success).toBe(false)
    })

    it('rejects missing make', () => {
        const { make: _make, ...rest } = validBase
        const result = insertFirearmSchema.safeParse(rest)
        expect(result.success).toBe(false)
    })

    it('rejects missing model', () => {
        const { model: _model, ...rest } = validBase
        const result = insertFirearmSchema.safeParse(rest)
        expect(result.success).toBe(false)
    })

    it('rejects missing serialNumber', () => {
        const { serialNumber: _sn, ...rest } = validBase
        const result = insertFirearmSchema.safeParse(rest)
        expect(result.success).toBe(false)
    })

    it('rejects serialNumber containing characters outside [A-Za-z0-9-]', () => {
        const result = insertFirearmSchema.safeParse({
            ...validBase,
            serialNumber: 'A123_456',
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            const messages = result.error.issues.map((i) => i.message)
            expect(
                messages.some((m) =>
                    m.includes('only letters, numbers, and hyphens'),
                ),
            ).toBe(true)
        }
    })

    it('rejects serialNumber longer than 50 characters', () => {
        const result = insertFirearmSchema.safeParse({
            ...validBase,
            serialNumber: 'A'.repeat(51),
        })
        expect(result.success).toBe(false)
    })

    it('rejects isNfa=true with null nfaClass (NFA-conditional refine)', () => {
        const result = insertFirearmSchema.safeParse({
            ...validBase,
            isNfa: true,
            nfaClass: null,
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            // Path targets the conditional field.
            expect(
                result.error.issues.some((i) => i.path[0] === 'nfaClass'),
            ).toBe(true)
        }
    })

    it('accepts isNfa=true with nfaClass set', () => {
        const result = insertFirearmSchema.safeParse({
            ...validBase,
            firearmType: 'SUPPRESSOR',
            isNfa: true,
            nfaClass: 'SUPPRESSOR',
        })
        expect(result.success).toBe(true)
    })

    it('accepts isNfa=false with null nfaClass', () => {
        const result = insertFirearmSchema.safeParse({
            ...validBase,
            isNfa: false,
            nfaClass: null,
        })
        expect(result.success).toBe(true)
    })

    it('rejects negative dodValue', () => {
        const result = insertFirearmSchema.safeParse({
            ...validBase,
            dodValue: '-100.00',
        })
        expect(result.success).toBe(false)
    })

    it('rejects negative acquisitionCost', () => {
        const result = insertFirearmSchema.safeParse({
            ...validBase,
            acquisitionCost: '-500.00',
        })
        expect(result.success).toBe(false)
    })
})

describe('updateFirearmSchema — requireAtLeastOneField', () => {
    it('rejects empty object {}', () => {
        const result = updateFirearmSchema.safeParse({})
        expect(result.success).toBe(false)
        if (!result.success) {
            const messages = result.error.issues.map((i) => i.message)
            expect(messages.some((m) => m.includes('at least one field'))).toBe(
                true,
            )
        }
    })

    it('accepts a single-field patch { name: "Test Firearm" }', () => {
        const result = updateFirearmSchema.safeParse({ name: 'Test Firearm' })
        expect(result.success).toBe(true)
    })
})
