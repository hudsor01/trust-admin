import { describe, expect, mock, test } from 'bun:test'

/**
 * Locks in alignment between verifyAccessCode and hasInventoryAccess
 * for the env-unset case. If verifyAccessCode grants + sets the cookie
 * but hasInventoryAccess still fails-closed (because NODE_ENV is
 * production), the user infinite-loops on the gate after every
 * successful submit. Production must fail closed in BOTH paths.
 *
 * Lives in its own file because bun:test mock.module bindings are
 * resolved at import time and can't be overridden mid-suite — the
 * sibling verify-access.test.ts mocks INVENTORY_ACCESS_CODE: 'testcode'.
 */

const mockCookieStore = {
    get: mock(() => null),
    set: mock(() => {}),
}
const mockHeaders = new Headers({ 'x-forwarded-for': '1.2.3.4' })

mock.module('next/headers', () => ({
    cookies: () => Promise.resolve(mockCookieStore),
    headers: () => Promise.resolve(mockHeaders),
}))

mock.module('../../src/lib/env', () => ({
    env: {
        INVENTORY_ACCESS_CODE: undefined,
        NODE_ENV: 'production',
    },
}))

const { verifyAccessCode } = await import(
    '../../src/app/forms/_actions/verifyAccess'
)
const { hasInventoryAccess } = await import('../../src/lib/inventory-access')

describe('env-unset alignment (production)', () => {
    test('verifyAccessCode fails closed when INVENTORY_ACCESS_CODE is unset', async () => {
        mockCookieStore.set.mockReset()

        const formData = new FormData()
        formData.set('accessCode', 'anything')

        const result = await verifyAccessCode({ success: false }, formData)

        expect(result.success).toBe(false)
        expect(result.error).toBe(
            'Inventory submissions are not currently configured',
        )
        // Cookie must NOT be set — that's what causes the loop
        expect(mockCookieStore.set).not.toHaveBeenCalled()
    })

    test('hasInventoryAccess fails closed when INVENTORY_ACCESS_CODE is unset', async () => {
        const result = await hasInventoryAccess()
        expect(result).toBe(false)
    })

    test('verifyAccessCode and hasInventoryAccess agree (no loop possible)', async () => {
        mockCookieStore.set.mockReset()

        const formData = new FormData()
        formData.set('accessCode', 'anything')

        const verify = await verifyAccessCode({ success: false }, formData)
        const has = await hasInventoryAccess()

        // Both paths must return "no access" so the page can never enter
        // the state where a successful submit is followed by a re-render
        // that still shows the gate.
        expect(verify.success).toBe(false)
        expect(has).toBe(false)
        expect(mockCookieStore.set).not.toHaveBeenCalled()
    })
})
