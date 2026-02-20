// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Enable when DSN is configured
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 10% of transactions for performance data
    tracesSampleRate: 0.1,

    // Replay 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
})
