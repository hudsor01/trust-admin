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

    // Drop request-originated events from localhost — prevents E2E test runs
    // and local dev from polluting the production error tracker.
    // Events with no request URL (background jobs, cron errors, queue workers)
    // intentionally pass through: they are server-side events, not localhost
    // web requests, and should always be captured regardless of origin.
    beforeSend(event) {
        const url = event.request?.url ?? event.tags?.url
        if (
            typeof url === 'string' &&
            (url.includes('localhost') || url.includes('127.0.0.1'))
        ) {
            return null
        }
        return event
    },

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
