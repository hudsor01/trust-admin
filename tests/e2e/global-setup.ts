/**
 * Playwright Global Setup
 *
 * Creates dedicated E2E test accounts before any tests run by calling
 * the dev-only /api/e2e/setup endpoint on the running Next.js server.
 */

export const E2E_ADMIN_EMAIL = 'e2e-admin@e2e.local'
export const E2E_ADMIN_PASSWORD = 'E2eTest@2026!'
export const E2E_BENEFICIARY_EMAIL = 'e2e-ben@e2e.local'
export const E2E_BENEFICIARY_PASSWORD = 'E2eTest@2026!'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export default async function globalSetup() {
    console.log('\n[E2E Setup] Provisioning test accounts via', BASE_URL)

    const res = await fetch(`${BASE_URL}/api/e2e/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
        const body = await res.text()
        throw new Error(
            `[E2E Setup] /api/e2e/setup failed (${res.status}): ${body}`,
        )
    }

    const data = await res.json()
    console.log(`[E2E Setup] Admin: ${data.admin.email} (${data.admin.userId})`)
    console.log(
        `[E2E Setup] Beneficiary: ${data.beneficiary.email} (beneficiary #${data.beneficiary.beneficiaryId})`,
    )
    console.log('[E2E Setup] Done.\n')
}
