import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Environment variable validation via @t3-oss/env-nextjs.
 * .trim() strips trailing newlines that Vercel silently injects on paste.
 * optionalUrl() coerces "" to undefined so unset GitHub Actions secrets
 * don't cause "Invalid URL" build failures.
 */
const optionalUrl = () =>
    z.preprocess(
        (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
        z.string().trim().url().optional(),
    )
export const env = createEnv({
    server: {
        DATABASE_URL: z
            .string()
            .trim()
            .url('DATABASE_URL must be a valid PostgreSQL connection string'),

        NEON_AUTH_BASE_URL: z
            .string()
            .trim()
            .url('NEON_AUTH_BASE_URL must be a valid URL'),

        // Always gets admin role regardless of DB state
        ADMIN_EMAIL: z
            .string()
            .trim()
            .email('ADMIN_EMAIL must be a valid email address'),

        NODE_ENV: z
            .enum(['development', 'production', 'test'])
            .default('development'),

        LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

        ANTHROPIC_API_KEY: z.string().optional(),
        INVENTORY_ACCESS_CODE: z.string().optional(),
        UPLOADTHING_TOKEN: z.string().optional(),

        SENTRY_DSN: optionalUrl(),
        SENTRY_ORG: z.string().optional(),
        SENTRY_PROJECT: z.string().optional(),
        SENTRY_AUTH_TOKEN: z.string().optional(),

        NEON_AUTH_COOKIE_SECRET: z.string().optional(),
        N8N_PASSWORD_RESET_WEBHOOK_URL: optionalUrl(),
    },

    client: {
        NEXT_PUBLIC_SENTRY_DSN: optionalUrl(),
        NEXT_PUBLIC_NEON_DATA_API_URL: optionalUrl(),
        NEXT_PUBLIC_APP_URL: optionalUrl(),
    },

    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
        NODE_ENV: process.env.NODE_ENV,
        LOG_LEVEL: process.env.LOG_LEVEL,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        INVENTORY_ACCESS_CODE: process.env.INVENTORY_ACCESS_CODE,
        UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
        SENTRY_DSN: process.env.SENTRY_DSN,
        SENTRY_ORG: process.env.SENTRY_ORG,
        SENTRY_PROJECT: process.env.SENTRY_PROJECT,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
        NEON_AUTH_COOKIE_SECRET: process.env.NEON_AUTH_COOKIE_SECRET,
        N8N_PASSWORD_RESET_WEBHOOK_URL:
            process.env.N8N_PASSWORD_RESET_WEBHOOK_URL,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
        NEXT_PUBLIC_NEON_DATA_API_URL:
            process.env.NEXT_PUBLIC_NEON_DATA_API_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },

    skipValidation: !!process.env.SKIP_ENV_VALIDATION,

    // Force server-side: happy-dom in tests creates `window`, which tricks
    // @t3-oss/env-core into client mode and blocks server var access
    isServer: true,
})

// Shim for instrumentation.ts: triggers module-level createEnv validation.
export function validateEnvironment(): void {
    void env.DATABASE_URL
}
