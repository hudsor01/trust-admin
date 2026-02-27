// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Enable when DSN is configured
    // Note: NEXT_PUBLIC_SENTRY_DSN is inlined at build time — must be set before building
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 100% — low-traffic private app, capture everything
    tracesSampleRate: 1.0,

    // Propagate trace headers to same-origin API routes (enables distributed tracing)
    tracePropagationTargets: [
        'localhost',
        /^https:\/\/trust\.thehudsonfam\.com/,
    ],

    // Replay integration — required for replaysSessionSampleRate/replaysOnErrorSampleRate to work
    // maskAllText + blockAllMedia: protect PII (beneficiary names, financial data)
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],

    // Replay 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Drop all events from localhost — prevents E2E test runs and local dev
    // from polluting the production error tracker with false "escalating" alerts
    beforeSend(event) {
        if (
            typeof window !== 'undefined' &&
            window.location.hostname === 'localhost'
        ) {
            return null
        }
        return event
    },

    // Tag slow client-side navigations for easy filtering in Sentry dashboard
    beforeSendTransaction(event) {
        if (event.measurements?.frames_slow?.value) {
            event.tags = { ...event.tags, slow_transaction: 'true' }
        }
        // Drop localhost transactions too
        if (
            typeof window !== 'undefined' &&
            window.location.hostname === 'localhost'
        ) {
            return null
        }
        return event
    },

    debug: false,
})
