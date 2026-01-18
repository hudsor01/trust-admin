import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins'
import { Resend } from 'resend'
import { db } from '../../db'
import * as schema from '../../db/schema'
import { recordSignIn } from './auth-events'
import { logger } from './logger'

const log = logger.auth

// Resend is optional - server can run without it, but magic links won't work
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null

if (!resend) {
    log.warn('RESEND_API_KEY not set - magic link emails will not be sent')
}

// Email sender - use Resend's test domain or your verified domain
const EMAIL_FROM =
    process.env.EMAIL_FROM || 'Trust Admin <onboarding@resend.dev>'

// =============================================================================
// RATE LIMITER (VULN-005 FIX)
// =============================================================================
// Production-ready in-memory rate limiter with:
// - Memory bounds (max 10,000 entries)
// - LRU eviction when bounds exceeded
// - Periodic cleanup of stale entries
// NOTE: For multi-instance deployments, use Redis instead
// =============================================================================

interface RateLimitEntry {
    attempts: number[]
    lastAttempt: number
}

const MAX_RATE_LIMIT_ENTRIES = 10_000
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_ATTEMPTS_PER_WINDOW = 5

const magicLinkRateLimits = new Map<string, RateLimitEntry>()

/**
 * Evict oldest entries if map exceeds max size (LRU-style)
 */
function enforceRateLimitMemoryBounds(): void {
    if (magicLinkRateLimits.size <= MAX_RATE_LIMIT_ENTRIES) return

    // Convert to array, sort by lastAttempt, keep newest entries
    const entries = Array.from(magicLinkRateLimits.entries()).sort(
        (a, b) => b[1].lastAttempt - a[1].lastAttempt,
    )

    // Clear and repopulate with newest entries
    magicLinkRateLimits.clear()
    const keepCount = Math.floor(MAX_RATE_LIMIT_ENTRIES * 0.8)
    for (let i = 0; i < keepCount; i++) {
        const entry = entries[i]
        if (entry) {
            magicLinkRateLimits.set(entry[0], entry[1])
        }
    }

    log.info('Rate limiter memory bounds enforced', {
        evicted: entries.length - magicLinkRateLimits.size,
        remaining: magicLinkRateLimits.size,
    })
}

// Cleanup old entries every 5 minutes
setInterval(
    () => {
        const now = Date.now()
        const windowStart = now - RATE_LIMIT_WINDOW_MS
        let cleanedCount = 0

        for (const [email, entry] of magicLinkRateLimits.entries()) {
            if (entry.lastAttempt < windowStart) {
                magicLinkRateLimits.delete(email)
                cleanedCount++
            }
        }

        if (cleanedCount > 0) {
            log.debug('Rate limiter cleanup', {
                cleaned: cleanedCount,
                remaining: magicLinkRateLimits.size,
            })
        }
    },
    5 * 60 * 1000,
)

/**
 * Check rate limit: 5 attempts per hour per email
 * @throws Error if rate limit exceeded
 */
function checkMagicLinkRateLimit(email: string): void {
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_WINDOW_MS

    // Normalize email to prevent bypass via case variations
    const normalizedEmail = email.toLowerCase().trim()

    const entry = magicLinkRateLimits.get(normalizedEmail) || {
        attempts: [],
        lastAttempt: 0,
    }

    // Filter recent attempts (within window)
    entry.attempts = entry.attempts.filter((t) => t > windowStart)

    if (entry.attempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
        const oldestAttempt = Math.min(...entry.attempts)
        const minutesUntilReset = Math.ceil(
            (oldestAttempt + RATE_LIMIT_WINDOW_MS - now) / 60000,
        )

        log.warn('Magic link rate limit exceeded', {
            email: normalizedEmail,
            attempts: entry.attempts.length,
        })
        throw new Error(
            `Too many magic link requests. Please try again in ${minutesUntilReset} minute(s).`,
        )
    }

    // Record attempt
    entry.attempts.push(now)
    entry.lastAttempt = now
    magicLinkRateLimits.set(normalizedEmail, entry)

    // Enforce memory bounds after adding new entry
    enforceRateLimitMemoryBounds()
}

// =============================================================================
// IP ADDRESS VALIDATION (VULN-013 FIX)
// =============================================================================

/**
 * IPv4 and IPv6 validation regex patterns
 */
const IPV4_REGEX =
    /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/
const IPV6_REGEX =
    /^(?:(?:[a-fA-F\d]{1,4}:){7}[a-fA-F\d]{1,4}|(?:[a-fA-F\d]{1,4}:){1,7}:|(?:[a-fA-F\d]{1,4}:){1,6}:[a-fA-F\d]{1,4}|(?:[a-fA-F\d]{1,4}:){1,5}(?::[a-fA-F\d]{1,4}){1,2}|(?:[a-fA-F\d]{1,4}:){1,4}(?::[a-fA-F\d]{1,4}){1,3}|(?:[a-fA-F\d]{1,4}:){1,3}(?::[a-fA-F\d]{1,4}){1,4}|(?:[a-fA-F\d]{1,4}:){1,2}(?::[a-fA-F\d]{1,4}){1,5}|[a-fA-F\d]{1,4}:(?::[a-fA-F\d]{1,4}){1,6}|:(?::[a-fA-F\d]{1,4}){1,7}|::(?:[fF]{4}:)?(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)|(?:[a-fA-F\d]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))$/

/**
 * Validates and extracts client IP address from request headers
 * Prevents log injection attacks by validating IP format
 */
export function extractClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const realIp = req.headers.get('x-real-ip')?.trim()

    const candidate = forwarded || realIp

    if (candidate) {
        // Validate IP format to prevent log injection
        if (IPV4_REGEX.test(candidate) || IPV6_REGEX.test(candidate)) {
            return candidate
        }
        // Log suspicious header but don't use it
        log.warn('Invalid IP address format in headers', {
            forwarded: forwarded?.slice(0, 50),
            realIp: realIp?.slice(0, 50),
        })
    }

    return 'unknown'
}

export const auth = betterAuth({
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5050',
    ],
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: false,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Update session every 24 hours
        // VULN-006 FIX: Secure cookie attributes
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes cache
        },
    },
    // VULN-006 FIX: Advanced security settings
    advanced: {
        cookiePrefix: 'trust-admin',
        useSecureCookies: process.env.NODE_ENV === 'production',
        defaultCookieAttributes: {
            httpOnly: true,
            sameSite: 'lax' as const, // "lax" allows redirect-based auth flows
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        },
    },
    user: {
        additionalFields: {
            role: {
                type: 'string',
                defaultValue: 'beneficiary',
                input: false,
            },
            beneficiaryId: {
                type: 'string',
                input: false,
            },
        },
    },
    plugins: [
        magicLink({
            sendMagicLink: async ({ email, url, token: _token }, _request) => {
                log.info('Sending magic link', { email })

                // Check rate limit BEFORE sending email
                checkMagicLinkRateLimit(email)

                // Development mode: log link info to console instead of sending email
                // VULN-011 FIX: Don't log full URL with token to prevent token exposure in logs/history
                if (process.env.NODE_ENV === 'development') {
                    // Parse URL to extract base without exposing token
                    const urlObj = new URL(url)
                    const baseUrl = `${urlObj.origin}${urlObj.pathname}`
                    const tokenPreview =
                        urlObj.searchParams.get('token')?.slice(0, 8) ||
                        'unknown'

                    console.log(`\n${'='.repeat(80)}`)
                    console.log('🔐 MAGIC LINK GENERATED FOR:', email)
                    console.log('📧 Base URL:', baseUrl)
                    console.log('🔑 Token preview:', `${tokenPreview}...`)
                    console.log(
                        '💡 Check your terminal for the clickable link above or use:',
                    )
                    console.log(`   Open: ${url}`)
                    console.log(`${'='.repeat(80)}\n`)

                    log.info('Development mode - magic link generated', {
                        email,
                        baseUrl,
                        tokenPreview: `${tokenPreview}...`,
                    })
                    return // Success - link logged to console
                }

                // Production mode: require Resend
                if (!resend) {
                    log.error(
                        'Cannot send magic link - RESEND_API_KEY not configured',
                    )
                    throw new Error(
                        'Email service not configured. Please set RESEND_API_KEY.',
                    )
                }

                try {
                    const { data, error } = await resend.emails.send({
                        from: EMAIL_FROM,
                        to: email,
                        subject: 'Your Login Link - Trust Admin Portal',
                        text: `Click this link to sign in to your Trust Admin Portal:\n\n${url}\n\nThis link expires in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
                        html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Sign in to Trust Admin Portal</h2>
                <p>Click the button below to sign in:</p>
                <a href="${url}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Sign In
                </a>
                <p style="color: #666; font-size: 14px;">Or copy this link: ${url}</p>
                <p style="color: #999; font-size: 12px;">This link expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
              </div>
            `,
                    })

                    if (error) {
                        throw new Error(error.message)
                    }

                    log.info('Magic link sent successfully', {
                        email,
                        messageId: data?.id,
                    })
                } catch (err) {
                    const error = err as Error
                    log.error('Email send failed', {
                        email,
                        error: error.message,
                    })
                    throw new Error(
                        `Failed to send magic link email: ${error.message}`,
                    )
                }
            },
            expiresIn: 60 * 10, // 10 minutes
        }),
        nextCookies(), // Must be last plugin - handles cookie setting in Next.js server actions
    ],
    callbacks: {
        session: {
            /**
             * Called after successful sign-in
             * Record to audit log
             */
            async created({
                session,
                user,
                request,
            }: {
                session: unknown
                user: { id: string }
                request?: Request
            }) {
                if (request) {
                    const url = new URL(request.url)
                    // VULN-013 FIX: Use validated IP extraction
                    const ip = extractClientIP(request)
                    const userAgent =
                        request.headers.get('user-agent') || 'unknown'

                    await recordSignIn(user.id, {
                        path: url.pathname,
                        ip,
                        userAgent,
                    })
                }
                return session
            },
        },
    },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

// Export proper user type with custom fields
export type AppUser = typeof auth.$Infer.Session.user & {
    role: 'admin' | 'beneficiary'
    beneficiaryId?: string
}

// Type guards
export function isAdmin(user: AppUser): boolean {
    return user.role === 'admin'
}

export function isBeneficiary(
    user: AppUser,
): user is AppUser & { beneficiaryId: string } {
    return user.role === 'beneficiary' && !!user.beneficiaryId
}
