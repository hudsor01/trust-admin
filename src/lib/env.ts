import { z } from 'zod'

/**
 * Environment variable validation for Trust Admin.
 * Validated at startup — missing required vars exit the process immediately.
 */

const envSchema = z.object({
    // Database (required)
    DATABASE_URL: z
        .string()
        .url('DATABASE_URL must be a valid PostgreSQL connection string'),

    // Neon Auth (required)
    NEON_AUTH_BASE_URL: z
        .string()
        .url('NEON_AUTH_BASE_URL must be a valid URL'),

    // Trust owner — always gets admin role regardless of DB state
    ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email address'),

    // Server
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),

    // Logging
    LOG_LEVEL: z
        .enum(['debug', 'info', 'warn', 'error'])
        .default('info'),

    // AI — inventory image analysis (optional)
    ANTHROPIC_API_KEY: z.string().optional(),

    // Inventory form passphrase (optional)
    INVENTORY_ACCESS_CODE: z.string().optional(),

    // File uploads (optional)
    UPLOADTHING_TOKEN: z.string().optional(),

    // Error monitoring (optional)
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnvironment(): Env {
    const result = envSchema.safeParse(process.env)

    if (!result.success) {
        console.error('\n' + '='.repeat(80))
        console.error('❌ ENVIRONMENT VALIDATION FAILED')
        console.error('='.repeat(80))
        console.error('\nMissing or invalid environment variables:\n')

        const formatted = result.error.format()
        for (const [key, value] of Object.entries(formatted)) {
            if (key !== '_errors' && value && typeof value === 'object') {
                const errors = (value as { _errors?: string[] })._errors
                if (errors && errors.length > 0) {
                    console.error(`  ${key}:`)
                    for (const err of errors) console.error(`    - ${err}`)
                }
            }
        }

        console.error('\nSee .env.example for required variables.')
        console.error('='.repeat(80) + '\n')
        process.exit(1)
    }

    return result.data
}
