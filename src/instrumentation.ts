/** Fail fast on missing env vars at startup instead of cryptic runtime errors */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { validateEnvironment } = await import('./lib/env')
        validateEnvironment()
    }
}
