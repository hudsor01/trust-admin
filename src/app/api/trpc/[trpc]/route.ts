export const dynamic = 'force-dynamic'

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createContext } from '@/server/trpc/init'
import { appRouter } from '@/server/trpc/router'

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
