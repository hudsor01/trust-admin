// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

// Edge runtime can only access NEXT_PUBLIC_* vars that are inlined at build time.
// Fall back to NEXT_PUBLIC_SENTRY_DSN if the server-side SENTRY_DSN is unavailable.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
    dsn,

    // Only enable when DSN is configured
    enabled: !!dsn,

    // 100% — low-traffic private app, capture everything
    tracesSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
})
