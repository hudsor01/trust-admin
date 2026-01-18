/**
 * tRPC Client
 *
 * Sets up tRPC client with React Query integration.
 * Use `trpc` in components for type-safe API calls.
 */
'use client'

import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/trpc/router'

/**
 * tRPC React client
 *
 * Usage:
 *   const { data } = trpc.entity.list.useQuery()
 *   const mutation = trpc.liability.create.useMutation()
 */
export const trpc = createTRPCReact<AppRouter>()
