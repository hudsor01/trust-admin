/**
 * tRPC HTTP Handler
 *
 * Handles all tRPC requests via Next.js App Router.
 * Endpoint: /api/trpc/*
 */

// Always dynamic — never pre-rendered at build time (requires auth + request context)
export const dynamic = 'force-dynamic'

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createContext } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'

/**
 * Handle tRPC requests
 */
const handler = (req: Request) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: () => createContext({ headers: req.headers }),
        onError:
            process.env.NODE_ENV === 'development'
                ? ({ path, error }) => {
                      console.error(
                          `❌ tRPC failed on ${path ?? '<no-path>'}:`,
                          error,
                      )
                  }
                : undefined,
    })

export { handler as GET, handler as POST }
