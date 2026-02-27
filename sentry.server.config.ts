// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Enable when DSN is configured (production, or dev for testing)
    enabled: !!process.env.SENTRY_DSN,

    // 100% — low-traffic private app, capture everything
    tracesSampleRate: 1.0,

    // Integrations for enhanced monitoring
    integrations: [
        // PostgreSQL query tracing (auto-instruments pg driver)
        Sentry.postgresIntegration(),
        // Vercel AI SDK tracing — tracks Claude calls, latency, token usage
        // Requires experimental_telemetry.isEnabled: true per generateObject/generateText call
        Sentry.vercelAIIntegration(),
    ],

    // Capture slow database queries (over 500ms)
    // This helps identify N+1 queries and missing indexes
    beforeSendTransaction(event) {
        // Tag slow transactions for easy filtering
        const duration =
            event.timestamp && event.start_timestamp
                ? (event.timestamp - event.start_timestamp) * 1000
                : 0

        if (duration > 1000) {
            event.tags = { ...event.tags, slow_transaction: 'true' }
        }

        return event
    },

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
})
