// Sentry instrumentation — imports config per runtime

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config')
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
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
    // Skip dev — Sentry would reject events without a configured DSN anyway
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
