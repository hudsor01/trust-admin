// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

// Required for Next.js navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

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

    integrations: [
        Sentry.replayIntegration({
            // Additional Replay configuration goes here
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],
})
