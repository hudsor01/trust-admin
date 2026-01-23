/// <reference types="bun-types" />

/**
 * Type-safe environment variables for Trust Admin
 * Bun automatically loads .env files, so no dotenv package is needed.
 * Access via process.env.VAR_NAME or Bun.env.VAR_NAME
 */
declare module 'bun' {
    interface Env {
        // Database
        DATABASE_URL: string

        // Server
        PORT?: string
        NODE_ENV?: 'development' | 'production' | 'test'

        // Authentication (Neon Auth)
        NEON_AUTH_BASE_URL?: string // Required: Neon Auth service URL (auto-set by Neon)

        // Email (Optional - for magic links)
        RESEND_API_KEY?: string
        EMAIL_FROM?: string

        // URLs
        FRONTEND_URL?: string
        API_URL?: string
        TRUSTED_ORIGINS?: string // comma-separated
        ALLOWED_ORIGINS?: string // comma-separated for CORS

        // Monitoring
        LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
    }
}

export {}
