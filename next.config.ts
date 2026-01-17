import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

/**
 * VULN-010 FIX: Security headers configuration
 */
const securityHeaders = [
    {
        // Prevent MIME type sniffing
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        // Prevent clickjacking
        key: 'X-Frame-Options',
        value: 'DENY',
    },
    {
        // Disable XSS filter (modern browsers don't need it, can cause issues)
        key: 'X-XSS-Protection',
        value: '0',
    },
    {
        // Control referrer information
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        // Permissions Policy (formerly Feature-Policy)
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
]

// Add HSTS only in production
if (process.env.NODE_ENV === 'production') {
    securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
    })
}

const nextConfig: NextConfig = {
    // Temporarily disable React Strict Mode to avoid Radix UI + React 19 compatibility issue
    // See: https://github.com/radix-ui/primitives/issues/3675
    reactStrictMode: false,

    // Security headers for all routes
    async headers() {
        return [
            {
                // Apply to all routes
                source: '/:path*',
                headers: securityHeaders,
            },
        ]
    },
}

export default withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Only upload source maps in production when auth token is present
    sourcemaps: {
        disable:
            process.env.NODE_ENV !== 'production' ||
            !process.env.SENTRY_AUTH_TOKEN,
    },

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Prevents the build from failing if Sentry CLI is not configured
    silent: !process.env.SENTRY_AUTH_TOKEN,
})
