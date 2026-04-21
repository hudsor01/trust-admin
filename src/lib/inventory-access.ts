import { cookies, headers } from 'next/headers'
import { env } from '@/lib/env'

export const ACCESS_COOKIE_NAME = 'inventory_access'
export const ACCESS_COOKIE_VALUE = 'granted'

// 24h — legitimate users re-enter the access code once per day. Short enough
// that a captured cookie's blast radius is bounded without being annoying.
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24

/**
 * Gate check used by both the form's server components and
 * /api/inventory/analyze. Fails closed in production when the
 * INVENTORY_ACCESS_CODE env var is unset so a missing deploy env
 * doesn't silently open the endpoint to the whole internet.
 */
export async function hasInventoryAccess(): Promise<boolean> {
    if (!env.INVENTORY_ACCESS_CODE) {
        // Dev / test convenience: no code configured → allow everyone.
        // Production: fail closed.
        return env.NODE_ENV !== 'production'
    }

    const cookieStore = await cookies()
    const accessCookie = cookieStore.get(ACCESS_COOKIE_NAME)
    return accessCookie?.value === ACCESS_COOKIE_VALUE
}

/**
 * First value of x-forwarded-for; falls back to 'unknown'.
 *
 * NOTE: This assumes deployment behind a trusted proxy that overwrites
 * x-forwarded-for (Vercel does). Behind any proxy that preserves the
 * client-sent value, this header is spoofable and the rate limit below
 * would be trivially bypassable per "IP".
 */
export async function getClientIP(): Promise<string> {
    const hdrs = await headers()
    return hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

// --- Per-IP rate limit for /api/inventory/analyze ---
//
// /api/inventory/analyze runs two Claude models (Opus + Sonnet) with extended
// thinking and web search per request — 2–5 minutes, several dollars of
// inference. Cookie auth alone doesn't bound cost if a cookie leaks; this
// rate limit does.
//
// This is a cost guard, not a hard security bound. The Map lives in one
// serverless instance, so the effective ceiling is N_instances × 20/hour.
// Acceptable for a household-scale app. Move to Vercel KV / Upstash if this
// ever needs to be a true global quota. The Map also grows unbounded (one
// entry per unique IP, never swept) — negligible at current scale.

const ANALYZE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const ANALYZE_MAX_PER_WINDOW = 20

type AnalyzeRecord = { count: number; windowStart: number }
const analyzeHits = new Map<string, AnalyzeRecord>()

export interface AnalyzeRateLimitResult {
    allowed: boolean
    retryAfterSeconds?: number
}

export function checkAnalyzeRateLimit(ip: string): AnalyzeRateLimitResult {
    const now = Date.now()
    const record = analyzeHits.get(ip)

    if (!record || now - record.windowStart >= ANALYZE_WINDOW_MS) {
        analyzeHits.set(ip, { count: 1, windowStart: now })
        return { allowed: true }
    }

    if (record.count >= ANALYZE_MAX_PER_WINDOW) {
        const retryAfterSeconds = Math.ceil(
            (record.windowStart + ANALYZE_WINDOW_MS - now) / 1000,
        )
        return { allowed: false, retryAfterSeconds }
    }

    record.count += 1
    return { allowed: true }
}
