import { describe, expect, test } from 'bun:test'

// Replicate the guard logic from the route handler
function checkE2ESecret(
    headerValue: string | null,
    envSecret: string | undefined,
): { authorized: boolean } {
    if (!envSecret || !headerValue || headerValue !== envSecret) {
        return { authorized: false }
    }
    return { authorized: true }
}

describe('E2E setup auth guard', () => {
    const VALID_SECRET = 'e2e-local-secret-do-not-use-in-prod'

    test('rejects when x-e2e-secret header is missing', () => {
        expect(checkE2ESecret(null, VALID_SECRET).authorized).toBe(false)
    })

    test('rejects when x-e2e-secret header is wrong', () => {
        expect(checkE2ESecret('wrong-secret', VALID_SECRET).authorized).toBe(
            false,
        )
    })

    test('rejects when x-e2e-secret header is empty', () => {
        expect(checkE2ESecret('', VALID_SECRET).authorized).toBe(false)
    })

    test('rejects when E2E_SETUP_SECRET env var is not set', () => {
        expect(checkE2ESecret(VALID_SECRET, undefined).authorized).toBe(false)
    })

    test('accepts when header matches env secret', () => {
        expect(
            checkE2ESecret(VALID_SECRET, VALID_SECRET).authorized,
        ).toBe(true)
    })
})
