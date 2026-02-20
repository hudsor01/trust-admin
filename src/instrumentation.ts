/**
 * Next.js Instrumentation
 *
 * Runs once at server startup. Validates required environment variables
 * and fails fast if anything is missing, rather than cryptic runtime errors.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { validateEnvironment } = await import('./lib/env')
        validateEnvironment()
    }
}
