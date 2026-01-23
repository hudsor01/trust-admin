import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { authServer } from '@/lib/auth'
import { db, userProfile } from '../../db'

/**
 * Root page - auth gateway
 *
 * Server Component that checks authentication and redirects appropriately:
 * - Admin users → /dashboard (admin dashboard)
 * - Beneficiary users → /portal (beneficiary portal)
 * - Unauthenticated → shows login options
 *
 * Best practices applied:
 * - Server-side auth check (no client JS for redirects)
 * - Minimal bundle (no "use client" directive)
 * - Proper Next.js redirect() for authenticated users
 */
export default async function RootPage() {
    const { data: session } = await authServer.getSession()

    // Redirect authenticated users to their appropriate dashboard
    if (session?.user) {
        // Fetch user profile to get role
        const [profile] = await db
            .select()
            .from(userProfile)
            .where(eq(userProfile.userId, session.user.id))
            .limit(1)

        if (profile?.role === 'admin') {
            redirect('/dashboard')
        }
        redirect('/portal')
    }

    // Unauthenticated: show login options
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <main className="w-full max-w-md space-y-8 px-4 text-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Trust Admin
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Hudson Living Trust Administration Portal
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        href="/auth/sign-in"
                        className="block w-full rounded-lg bg-primary px-4 py-3 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        Admin Login
                    </Link>

                    <Link
                        href="/auth/sign-in"
                        className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-center font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        Beneficiary Portal
                    </Link>
                </div>

                <p className="text-xs text-muted-foreground">
                    Secure access to trust administration and beneficiary
                    services
                </p>
            </main>
        </div>
    )
}
