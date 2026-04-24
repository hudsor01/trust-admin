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

// HSTS in production only — breaks localhost without HTTPS
if (process.env.NODE_ENV === 'production') {
    securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
    })
}

const nextConfig: NextConfig = {
    // standalone required for the Dockerfile self-host path (emits a minimal
    // server.js + hand-picked node_modules under .next/standalone). Vercel
    // ignores this — the platform runs its own bundler — so it's harmless
    // there. Removing it would break `docker build`.
    output: 'standalone',
    reactStrictMode: true,

    // Don't leak "x-powered-by: Next.js" on every response.
    poweredByHeader: false,

    // React Compiler (via babel-plugin-react-compiler, stable in 16.2).
    // Auto-memoizes components so admin forms and data tables skip
    // unnecessary re-renders without manual useMemo / React.memo. Next.js
    // uses SWC to only apply the compiler to files that contain JSX or
    // hooks, so the build-time cost is small.
    reactCompiler: true,

    // sharp is on Next.js 16's default auto-externalize list
    // (server-external-packages.jsonc in the Next source), so an explicit
    // serverExternalPackages entry is redundant. Next's tracer also
    // auto-copies the right platform-conditional prebuilds.
    //
    // outputFileTracingIncludes narrowed to linux-x64 only — the prior
    // `./node_modules/@img/**/*` glob walked every prebuild (darwin,
    // win32, linux-arm, linux-arm64, linuxmusl-arm64, etc.) and each
    // traced file became a line in the Vercel build output ("million
    // chunks"). Both targets we actually ship to (Vercel serverless +
    // Dockerfile node:22-slim) are linux-x64, so the narrow glob is
    // strictly sufficient. The generic `sharp/**/*` still pulls the
    // platform-agnostic lib/ wrapper.
    outputFileTracingIncludes: {
        '/api/inventory/**': [
            './node_modules/sharp/**/*',
            './node_modules/@img/sharp-linux-x64/**/*',
            './node_modules/@img/sharp-libvips-linux-x64/**/*',
        ],
    },

    // Tree-shake barrel imports. Next's default list already covers
    // lucide-react and recharts, so those are omitted here. The Radix UI
    // primitives each ship many named exports and aren't in the default
    // list — keeping them explicit.
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

    // UploadThing storage domains
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

    // cacheComponents not enabled — tRPC + TanStack Query handles caching client-side.
    // Enabling it would require force-dynamic on every page or Suspense boundaries.

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

    // Source maps only in production — dev builds skip upload silently
    sourcemaps: {
        disable:
            process.env.NODE_ENV !== 'production' ||
            !process.env.SENTRY_AUTH_TOKEN,
    },

    bundleSizeOptimizations: {
        excludeDebugStatements: true,
    },
})
