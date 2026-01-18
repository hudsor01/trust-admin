// Next.js instrumentation file
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Server-side Sentry initialization
        await import('./sentry.server.config')
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        // Edge runtime Sentry initialization
        await import('./sentry.edge.config')
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
    // Only capture errors in production
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
