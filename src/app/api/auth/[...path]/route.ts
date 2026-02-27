/** Proxies all /api/auth/* requests to the Neon Auth service. */
export const dynamic = 'force-dynamic'

import { authServer } from '@/lib/auth/server'

export const { GET, POST } = authServer.handler()
