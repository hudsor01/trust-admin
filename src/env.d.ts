/// <reference types="bun-types" />

/**
 * Type-safe environment variables for Trust Admin.
 * Bun automatically loads .env — no dotenv needed.
 */
declare module 'bun' {
    interface Env {
        // Required
        DATABASE_URL: string
        NEON_AUTH_BASE_URL: string
        ADMIN_EMAIL: string

        // Server
        NODE_ENV?: 'development' | 'production' | 'test'
        LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'

        // Optional features
        ANTHROPIC_API_KEY?: string
        INVENTORY_ACCESS_CODE?: string
        UPLOADTHING_TOKEN?: string

        // Sentry (optional)
        NEXT_PUBLIC_SENTRY_DSN?: string
        SENTRY_DSN?: string
        SENTRY_ORG?: string
        SENTRY_PROJECT?: string
        SENTRY_AUTH_TOKEN?: string
    }
}

export {}
