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
    {
        // Content Security Policy (supersedes X-Frame-Options via frame-ancestors)
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://utfs.io https://*.ufs.sh",
            "font-src 'self'",
            "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.neon.tech wss://*.neon.tech",
            'worker-src blob:',
            "frame-ancestors 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
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
    reactStrictMode: true,

    // Native Node.js packages that should not be bundled by the serverless bundler
    serverExternalPackages: ['sharp'],

    // PERF: Enable experimental optimizations for better tree-shaking
    experimental: {
        // Automatically tree-shake imports from these packages
        // This significantly reduces bundle size for component libraries
        optimizePackageImports: [
            'lucide-react',
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
            'recharts',
            'date-fns',
        ],
    },

    // Allow images from UploadThing storage
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

    // NOTE: cacheComponents is NOT enabled because this app uses tRPC with client-side
    // data fetching. Enabling cacheComponents requires either:
    // 1. Adding `export const dynamic = 'force-dynamic'` to all pages, or
    // 2. Wrapping data-fetching components in Suspense boundaries
    // The current architecture benefits more from TanStack Query's client-side caching
    // (tuned in trpc-provider.tsx) than server-side "use cache" directives.
    //
    // Custom cacheLife profiles for future use if server-side caching is adopted:
    // financial: { stale: 30, revalidate: 60, expire: 300 }      // 30s/1m/5m
    // reference: { stale: 300, revalidate: 600, expire: 3600 }   // 5m/10m/1h
    // config: { stale: 600, revalidate: 3600, expire: 86400 }    // 10m/1h/1d

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
    bundleSizeOptimizations: {
        excludeDebugStatements: true,
    },
})
