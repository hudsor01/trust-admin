'use client'

/**
 * Neon Data API client
 *
 * PostgREST-compatible REST client for direct database access.
 * Handles JWT auth via Neon Auth, and bidirectional snake_case↔camelCase transforms.
 *
 * Usage:
 *   import { neonFetch } from '@/lib/neon-data-api'
 *   const rows = await neonFetch<Vehicle[]>('vehicle', 'GET', { params: { entity_id: 'eq.1' } })
 */

import { authClient } from '@/lib/auth/client'

// snake_case → camelCase
function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

// camelCase → snake_case
function camelToSnake(str: string): string {
    return str.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`)
}

function transformResponseKeys<T>(value: unknown): T {
    if (Array.isArray(value)) {
        return value.map(transformResponseKeys) as T
    }
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [
                snakeToCamel(k),
                transformResponseKeys(v),
            ]),
        ) as T
    }
    return value as T
}

function transformRequestBody(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(transformRequestBody)
    }
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [
                camelToSnake(k),
                transformRequestBody(v),
            ]),
        )
    }
    return value
}

async function getJwt(): Promise<string> {
    let result = await authClient.token()
    if (!result.data?.token) {
        // Retry once after brief delay to handle transient auth token issues
        await new Promise<void>((r) => setTimeout(r, 200))
        result = await authClient.token()
    }
    if (!result.data?.token)
        throw new Error('Not authenticated — no JWT token available')
    return result.data.token
}

export type QueryParams = Record<string, string>

/**
 * Low-level Data API fetch.
 *
 * @param table  - Table name (snake_case, e.g. 'bank_account')
 * @param method - HTTP method
 * @param options.params - PostgREST query params (e.g. { entity_id: 'eq.1' })
 * @param options.body   - Request body (camelCase — auto-converted to snake_case)
 */
export async function neonFetch<T>(
    table: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    options: { params?: QueryParams; body?: unknown } = {},
): Promise<T> {
    const DATA_API_URL = process.env.NEXT_PUBLIC_NEON_DATA_API_URL
    if (!DATA_API_URL) {
        throw new Error('NEXT_PUBLIC_NEON_DATA_API_URL is not set')
    }
    const token = await getJwt()
    const url = new URL(`${DATA_API_URL}/${table}`)

    if (options.params) {
        for (const [key, value] of Object.entries(options.params)) {
            url.searchParams.set(key, value)
        }
    }

    const isWrite = method !== 'GET'
    const response = await fetch(url.toString(), {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            ...(isWrite && { Prefer: 'return=representation' }),
        },
        body:
            isWrite && options.body !== undefined
                ? JSON.stringify(transformRequestBody(options.body))
                : undefined,
    })

    if (!response.ok) {
        const err = await response
            .json()
            .catch(() => ({ message: response.statusText }))
        throw new Error(
            (err as { message?: string }).message ?? `HTTP ${response.status}`,
        )
    }

    if (response.status === 204) return null as T

    const data: unknown = await response.json()
    return transformResponseKeys<T>(data)
}
