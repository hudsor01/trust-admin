import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

/**
 * Environment variable validation for Trust Admin.
 *
 * Uses @t3-oss/env-nextjs to enforce the server/client boundary:
 * - `server`: only accessible server-side (never bundled to client)
 * - `client`: must be prefixed NEXT_PUBLIC_*, safe to expose to browser
 *
 * Validated at build time and at runtime startup.
 * Accessing an undefined required var throws immediately with a clear error.
 *
 * .trim() is applied before every format validator (.url(), .email()) to strip
 * trailing newlines that Vercel silently injects when env vars are copy-pasted.
 *
 * optionalUrl() — coerces empty strings to undefined before URL validation so
 * that GitHub Actions secrets (which evaluate to "" when unset) don't cause
 * "Invalid URL" build failures for optional vars.
 */
const optionalUrl = () =>
    z.preprocess(
        (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
        z.string().trim().url().optional(),
    )
export const env = createEnv({
    server: {
        // Database (required)
        DATABASE_URL: z
            .string()
            .trim()
            .url('DATABASE_URL must be a valid PostgreSQL connection string'),

        // Neon Auth (required)
        NEON_AUTH_BASE_URL: z
            .string()
            .trim()
            .url('NEON_AUTH_BASE_URL must be a valid URL'),

        // Trust owner — always gets admin role regardless of DB state.
        // Required at build time: set ADMIN_EMAIL in GitHub Actions secrets.
        ADMIN_EMAIL: z
            .string()
            .trim()
            .email('ADMIN_EMAIL must be a valid email address'),

        // Server runtime
        NODE_ENV: z
            .enum(['development', 'production', 'test'])
            .default('development'),

        // Logging
        LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

        // AI — inventory image analysis (optional)
        ANTHROPIC_API_KEY: z.string().optional(),

        // Inventory form passphrase (optional)
        INVENTORY_ACCESS_CODE: z.string().optional(),

        // File uploads (optional)
        UPLOADTHING_TOKEN: z.string().optional(),

        // Error monitoring (optional)
        SENTRY_DSN: optionalUrl(),
        SENTRY_ORG: z.string().optional(),
        SENTRY_PROJECT: z.string().optional(),
        SENTRY_AUTH_TOKEN: z.string().optional(),

        // Neon Auth cookie signing (optional)
        NEON_AUTH_COOKIE_SECRET: z.string().optional(),

        // n8n webhook for password reset emails
        N8N_PASSWORD_RESET_WEBHOOK_URL: optionalUrl(),
    },

    client: {
        // Error monitoring — public DSN safe to expose
        NEXT_PUBLIC_SENTRY_DSN: optionalUrl(),

        // Neon Data API (PostgREST endpoint, optional)
        NEXT_PUBLIC_NEON_DATA_API_URL: optionalUrl(),

        // App URL (used by NeonAuthUIProvider)
        NEXT_PUBLIC_APP_URL: optionalUrl(),
    },

    // Next.js requires explicit mapping of NEXT_PUBLIC_ vars for runtime access
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

    // Skip validation during CI builds where env vars are injected at runtime
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,

    // Force server-side mode so happy-dom (used in Bun component tests) doesn't
    // trick @t3-oss/env-core into thinking we're in a browser. Without this,
    // GlobalRegistrator.register() creates window and makes isServer=false,
    // causing every server var access to throw "Attempted to access server-side
    // environment variable on the client".
    isServer: true,
})

// Shim for instrumentation.ts — createEnv validates at module import time,
// so calling this confirms validation has already succeeded.
export function validateEnvironment(): void {
    void env.DATABASE_URL
}
