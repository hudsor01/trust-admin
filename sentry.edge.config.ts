// Sentry edge runtime init — proxy, edge routes

import * as Sentry from '@sentry/nextjs'

// Edge runtime lacks server env vars — fall back to NEXT_PUBLIC_* (inlined at build)
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
    dsn,

    enabled: !!dsn,
    tracesSampleRate: 1.0,

    beforeSend(event) {
        const url = event.request?.url ?? ''
        if (url.includes('localhost') || url.includes('127.0.0.1')) return null
        return event
    },

    debug: false,
})
