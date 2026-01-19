import { z } from 'zod'

/**
 * Environment variable validation using Zod
 *
 * This module ensures all required environment variables are set before the server starts.
 * It provides clear error messages showing which variables are missing or invalid.
 *
 * Production deployment REQUIRES these variables to be set.
 * Development can use defaults for most optional fields.
 */

const envSchema = z.object({
    // Database (required)
    DATABASE_URL: z
        .string()
        .url('DATABASE_URL must be a valid PostgreSQL connection string'),

    // Server
    PORT: z.string().default('5050'),
    NODE_ENV: z
        .enum(['development', 'production', 'test'])
        .default('development'),

    // Authentication (required for production)
    // Generate with: openssl rand -base64 32
    BETTER_AUTH_SECRET: z
        .string()
        .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters')
        .optional(),

    // Email (optional - server runs without email in development)
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),

    // URLs (required for production, defaults for development)
    FRONTEND_URL: z.string().url().optional(),
    API_URL: z.string().url().optional(),

    // CORS & Trusted Origins (comma-separated lists)
    // Example: "https://app.example.com,https://admin.example.com"
    TRUSTED_ORIGINS: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),

    // Local AI (Ollama) - for inventory image analysis
    // Default: http://127.0.0.1:11434
    OLLAMA_URL: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates environment variables at application startup
 *
 * Exits the process with code 1 if validation fails, showing detailed error messages
 * Returns validated environment object if successful
 */
export function validateEnvironment(): Env {
    const result = envSchema.safeParse(process.env)

    if (!result.success) {
        console.error(`\n${'='.repeat(80)}`)
        console.error('❌ ENVIRONMENT VALIDATION FAILED')
        console.error('='.repeat(80))
        console.error(
            '\nThe following environment variables are missing or invalid:\n',
        )

        const formatted = result.error.format()
        Object.entries(formatted).forEach(([key, value]) => {
            if (key !== '_errors' && value && typeof value === 'object') {
                const errors = (value as { _errors?: string[] })._errors
                if (errors && errors.length > 0) {
                    console.error(`  ${key}:`)
                    errors.forEach((err: string) =>
                        console.error(`    - ${err}`),
                    )
                }
            }
        })

        console.error(`\n${'='.repeat(80)}`)
        console.error(
            'Please set the required environment variables and try again.',
        )
        console.error('See .env.example for a template.')
        console.error(`${'='.repeat(80)}\n`)

        process.exit(1)
    }

    return result.data
}

/**
 * Production-specific validation
 *
 * Warns about missing optional variables that are recommended for production
 */
export function validateProductionEnvironment(env: Env): void {
    if (env.NODE_ENV !== 'production') {
        return
    }

    const warnings: string[] = []

    if (!env.BETTER_AUTH_SECRET) {
        warnings.push(
            'BETTER_AUTH_SECRET not set - sessions may not persist across restarts',
        )
    }

    if (!env.RESEND_API_KEY) {
        warnings.push(
            'RESEND_API_KEY not set - magic link emails will not be sent',
        )
    }

    if (!env.FRONTEND_URL || !env.API_URL) {
        warnings.push(
            'FRONTEND_URL and/or API_URL not set - may cause CORS issues',
        )
    }

    if (!env.TRUSTED_ORIGINS) {
        warnings.push(
            'TRUSTED_ORIGINS not set - authentication may fail in production',
        )
    }

    if (!env.ALLOWED_ORIGINS) {
        warnings.push('ALLOWED_ORIGINS not set - CORS may not work correctly')
    }

    if (warnings.length > 0) {
        console.warn(`\n${'='.repeat(80)}`)
        console.warn('⚠️  PRODUCTION ENVIRONMENT WARNINGS')
        console.warn('='.repeat(80))
        console.warn(
            '\nThe following optional variables are recommended for production:\n',
        )
        warnings.forEach((warning) => console.warn(`  - ${warning}`))
        console.warn(`\n${'='.repeat(80)}\n`)
    }
}
