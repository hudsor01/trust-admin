// Sentry server-side init — runs on every Node.js request

import * as Sentry from '@sentry/nextjs'

// Prefer server-only SENTRY_DSN, but fall back to the public DSN so
// deploys that only set NEXT_PUBLIC_SENTRY_DSN in Vercel still capture
// server-side exceptions. Mirrors sentry.edge.config.ts.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
    dsn,
    enabled: !!dsn,

    // Low-traffic private app — capture all traces
    tracesSampleRate: 1.0,

    integrations: [
        Sentry.postgresIntegration(),
        // Traces AI SDK calls (requires experimental_telemetry.isEnabled per call)
        Sentry.vercelAIIntegration(),
    ],

    // Drop localhost events to prevent E2E/dev noise in production tracker.
    // Events without a request URL (background jobs) pass through intentionally.
    beforeSend(event) {
        const url = event.request?.url ?? event.tags?.url ?? ''
        if (
            typeof url === 'string' &&
            (url.includes('localhost') || url.includes('127.0.0.1'))
        ) {
            return null
        }
        return event
    },

    // Tag slow transactions (>1s) for dashboard filtering
    beforeSendTransaction(event) {
        const duration =
            event.timestamp && event.start_timestamp
                ? (event.timestamp - event.start_timestamp) * 1000
                : 0

        if (duration > 1000) {
            event.tags = { ...event.tags, slow_transaction: 'true' }
        }

        return event
    },

    debug: false,
})
