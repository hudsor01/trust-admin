/**
 * Next.js scans for `instrumentation.ts` at BOTH `/` and `/src` and the last
 * match wins (next/dist/build/index.js). When `src/` exists, this file
 * shadows any root `instrumentation.ts` — putting Sentry's `register()` here
 * is therefore mandatory; the root file would silently never run.
 */

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { validateEnvironment } = await import('./lib/env')
        validateEnvironment()
        await import('../sentry.server.config')
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('../sentry.edge.config')
    }
}

export const onRequestError = async (
    error: Error,
    request: {
        method: string
        url: string
        headers: Record<string, string>
    },
    context: {
        routerKind: 'Pages Router' | 'App Router'
        routePath: string
        routeType: 'render' | 'route' | 'action' | 'middleware'
        renderSource?:
            | 'react-server-components'
            | 'react-server-components-payload'
        revalidateReason?: 'on-demand' | 'stale' | undefined
        renderType?: 'dynamic' | 'dynamic-resume' | undefined
    },
) => {
    if (process.env.NODE_ENV !== 'production') {
        return
    }

    const { captureException } = await import('@sentry/nextjs')

    captureException(error, {
        tags: {
            routerKind: context.routerKind,
            routePath: context.routePath,
            routeType: context.routeType,
        },
        extra: {
            method: request.method,
            url: request.url,
            renderSource: context.renderSource,
            revalidateReason: context.revalidateReason,
            renderType: context.renderType,
        },
    })
}
