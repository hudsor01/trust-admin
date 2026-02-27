// Sentry browser-side init — loaded on every page

import * as Sentry from '@sentry/nextjs'

Sentry.init({
    // NEXT_PUBLIC_* vars are inlined at build time — must be set before `next build`
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Low-traffic private app — capture all traces
    tracesSampleRate: 1.0,

    // Same-origin only — enables distributed tracing across client/server
    tracePropagationTargets: [
        'localhost',
        /^https:\/\/trust\.thehudsonfam\.com/,
    ],

    // PII protection: mask text and block media (beneficiary names, financial data)
    integrations: [
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Drop localhost events to prevent E2E/dev noise in production tracker
    beforeSend(event) {
        if (
            typeof window !== 'undefined' &&
            window.location.hostname === 'localhost'
        ) {
            return null
        }
        return event
    },

    // Tag slow navigations + drop localhost transactions
    beforeSendTransaction(event) {
        if (event.measurements?.frames_slow?.value) {
            event.tags = { ...event.tags, slow_transaction: 'true' }
        }
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
