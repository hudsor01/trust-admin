/**
 * Sentry Error Reporting Configuration
 * 
 * Initializes Sentry for frontend error tracking with session replay
 * and performance monitoring. Only active when SENTRY_DSN is configured.
 */
import * as Sentry from "@sentry/react"

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn("SENTRY_DSN not set - error reporting disabled")
    return
  }

  const environment = import.meta.env.MODE || "development"
  const isProduction = environment === "production"

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment,
    
    // Performance Monitoring
    tracesSampleRate: isProduction ? 0.2 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask text content
        blockAllMedia: true, // Privacy: block images/video
      }),
    ],
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove user email from events (privacy)
      if (event.user) {
        delete event.user.email
      }
      return event
    },
  })
  
  console.log(`✅ Sentry initialized for ${environment}`)
}
