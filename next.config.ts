import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

/** Security headers applied to all routes */
const securityHeaders = [
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        // Disabled — modern browsers handle XSS natively; the filter causes false positives
        key: 'X-XSS-Protection',
        value: '0',
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    {
        // frame-ancestors 'none' supersedes X-Frame-Options
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            // static.cloudflareinsights.com — beacon script for Cloudflare
            // Web Analytics, auto-injected at the CF edge for trust.thehudsonfam.com.
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://utfs.io https://*.ufs.sh",
            "font-src 'self'",
            // cloudflareinsights.com — beacon POSTs analytics events back here.
            "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.neon.tech wss://*.neon.tech https://cloudflareinsights.com",
            'worker-src blob:',
            "frame-ancestors 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
    },
]

// HSTS in production only — breaks localhost without HTTPS
if (process.env.NODE_ENV === 'production') {
    securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
    })
}

const nextConfig: NextConfig = {
    reactStrictMode: true,

    // Don't leak "x-powered-by: Next.js" on every response.
    poweredByHeader: false,
    reactCompiler: true,
    outputFileTracingIncludes: {
        '/api/inventory/**': [
            './node_modules/sharp/**/*',
            './node_modules/@img/sharp-linux-x64/**/*',
            './node_modules/@img/sharp-libvips-linux-x64/**/*',
        ],
    },
    experimental: {
        optimizePackageImports: [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
        ],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'utfs.io',
            },
            {
                protocol: 'https',
                hostname: '*.ufs.sh',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ]
    },
}

export default withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    telemetry: false,
    sourcemaps: {
        disable:
            process.env.NODE_ENV !== 'production' ||
            !process.env.SENTRY_AUTH_TOKEN,
    },

    bundleSizeOptimizations: {
        excludeDebugStatements: true,
    },
})
