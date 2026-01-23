// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// Note: This is the recommended file for Next.js 15+ (replaces sentry.client.config.ts)
// See: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client

import * as Sentry from '@sentry/nextjs'

// Required for Next.js navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

// Module-level flag to prevent replay re-initialization during HMR
// See: https://github.com/getsentry/sentry-javascript/discussions/8414
let replayInitialized = false

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Enable when DSN is configured (production, or dev for testing)
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Adjust sample rate in production (1.0 = 100% of events)
    tracesSampleRate: 0.1,

    // Capture 10% of sessions for replay
    replaysSessionSampleRate: 0.1,

    // Capture 100% of error sessions for replay
    replaysOnErrorSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Integrations for browser performance monitoring
    integrations: [
        // Track browser performance metrics (LCP, FID, CLS)
        // Note: browserTracingIntegration auto-instruments navigation, XHR, and fetch
        Sentry.browserTracingIntegration(),

        // Track long animation frames for jank detection
        Sentry.browserProfilingIntegration(),
    ],

    // Tag slow client-side operations
    beforeSendTransaction(event) {
        const duration =
            event.timestamp && event.start_timestamp
                ? (event.timestamp - event.start_timestamp) * 1000
                : 0

        if (duration > 3000) {
            event.tags = { ...event.tags, slow_page_load: 'true' }
        }

        return event
    },
})

// Add replay integration separately with its own guard
// This prevents the "Multiple Sentry Session Replay instances are not supported" error
if (!replayInitialized && typeof window !== 'undefined') {
    const client = Sentry.getClient()
    if (client) {
        replayInitialized = true
        client.addIntegration(
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        )
    }
}
