// Client-side instrumentation for Next.js
// This file initializes Sentry on the client

import * as Sentry from '@sentry/nextjs'
import './sentry.client.config'

// Required for Sentry to instrument Next.js navigation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
