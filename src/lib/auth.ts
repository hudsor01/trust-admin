import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"
import { db } from "../../db"
import * as schema from "../../db/schema"
import { recordSignIn } from "./auth-events"
import { logger } from "./logger"

const log = logger.auth

// Resend is optional - server can run without it, but magic links won't work
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

if (!resend) {
  log.warn("RESEND_API_KEY not set - magic link emails will not be sent")
}

// Email sender - use Resend's test domain or your verified domain
const EMAIL_FROM = process.env.EMAIL_FROM || "Trust Admin <onboarding@resend.dev>"

// In-memory rate limiter (upgrade to Redis for multi-instance)
interface RateLimitEntry {
  attempts: number[]
  lastAttempt: number
}

const magicLinkRateLimits = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    const hourAgo = now - 60 * 60 * 1000

    for (const [email, entry] of magicLinkRateLimits.entries()) {
      if (entry.lastAttempt < hourAgo) {
        magicLinkRateLimits.delete(email)
      }
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
  const hourAgo = now - 60 * 60 * 1000

  const entry = magicLinkRateLimits.get(email) || { attempts: [], lastAttempt: 0 }

  // Filter recent attempts (last hour)
  entry.attempts = entry.attempts.filter((t) => t > hourAgo)

  if (entry.attempts.length >= 5) {
    const oldestAttempt = Math.min(...entry.attempts)
    const minutesUntilReset = Math.ceil((oldestAttempt + 60 * 60 * 1000 - now) / 60000)

    log.warn("Magic link rate limit exceeded", { email, attempts: entry.attempts.length })
    throw new Error(
      `Too many magic link requests. Please try again in ${minutesUntilReset} minute(s).`,
    )
  }

  // Record attempt
  entry.attempts.push(now)
  entry.lastAttempt = now
  magicLinkRateLimits.set(email, entry)
}

export const auth = betterAuth({
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [
    "http://localhost:5173",
    "http://localhost:5050",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
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
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "beneficiary",
        input: false,
      },
      beneficiaryId: {
        type: "string",
        input: false,
      },
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token: _token }, _request) => {
        log.info("Sending magic link", { email })

        // Check rate limit BEFORE sending email
        checkMagicLinkRateLimit(email)

        // Development mode: log link to console instead of sending email
        // This works even if RESEND_API_KEY is set, to avoid domain verification issues
        if (process.env.NODE_ENV === "development") {
          console.log(`\n${"=".repeat(80)}`)
          console.log("🔐 MAGIC LINK FOR:", email)
          console.log("📧 Click this link to sign in:")
          console.log(url)
          console.log(`${"=".repeat(80)}\n`)
          log.info("Development mode - magic link logged to console (not sent via email)")
          return // Success - link logged to console
        }

        // Production mode: require Resend
        if (!resend) {
          log.error("Cannot send magic link - RESEND_API_KEY not configured")
          throw new Error("Email service not configured. Please set RESEND_API_KEY.")
        }

        try {
          const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: "Your Login Link - Trust Admin Portal",
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

          log.info("Magic link sent successfully", { email, messageId: data?.id })
        } catch (err) {
          const error = err as Error
          log.error("Email send failed", {
            email,
            error: error.message,
          })
          throw new Error(`Failed to send magic link email: ${error.message}`)
        }
      },
      expiresIn: 60 * 10, // 10 minutes
    }),
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
          const ip =
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown"
          const userAgent = request.headers.get("user-agent") || "unknown"

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
  role: "admin" | "beneficiary"
  beneficiaryId?: string
}

// Type guards
export function isAdmin(user: AppUser): boolean {
  return user.role === "admin"
}

export function isBeneficiary(user: AppUser): user is AppUser & { beneficiaryId: string } {
  return user.role === "beneficiary" && !!user.beneficiaryId
}
