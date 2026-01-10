import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"
import { db } from "../../db"
import * as schema from "../../db/schema"
import { logger } from "./logger"

const log = logger.auth

// Resend is optional - server can run without it, but magic links won't work
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

if (!resend) {
  log.warn("RESEND_API_KEY not set - magic link emails will not be sent")
}

// Email sender - use Resend's test domain or your verified domain
const EMAIL_FROM = process.env.EMAIL_FROM || "Trust Admin <onboarding@resend.dev>"

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
      sendMagicLink: async ({ email, url, token }, request) => {
        log.info("Sending magic link", { email })

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
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
