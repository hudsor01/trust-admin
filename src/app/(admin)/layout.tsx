export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { CommandPalette } from '@/components/command-palette'
import { AppErrorBoundary } from '@/components/error-boundary'
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getPublicDb } from '@/db'
import { userProfile } from '@/db/schema'
import { type AppRole, authServer, isTrustAdmin } from '@/lib/auth'
import { env } from '@/lib/env'

/**
 * Route guard: requires a trust-administrative role (admin, trustee, or
 * arbiter) per user_profile. Beneficiaries go to /portal.
 *
 * Reads user_profile (not session.user.role) because Neon Auth's native
 * role only knows 'admin' | 'user' — the app's trustee/arbiter roles are
 * mirrored as 'user' in Neon Auth and only distinguishable via user_profile.
 */
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    let session: Awaited<ReturnType<typeof authServer.getSession>>['data']
    try {
        const result = await authServer.getSession()
        session = result.data
    } catch {
        redirect('/auth/sign-in')
    }

    if (!session?.user) {
        redirect('/auth/sign-in')
    }

    const role = await resolveAppRole(session.user.id, session.user.email)

    if (!isTrustAdmin({ role })) {
        redirect('/portal')
    }

    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar role={role} />
                <SidebarInset>
                    <header className="flex h-14 items-center gap-4 border-b px-6">
                        <SidebarTrigger />
                        <div className="flex-1" />
                        <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground sm:flex">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </header>
                    <main className="flex-1 overflow-auto p-6">
                        <AppErrorBoundary
                            title="Admin Error"
                            description="An error occurred in the admin interface. Please try again or contact support if the issue persists."
                        >
                            {children}
                        </AppErrorBoundary>
                    </main>
                </SidebarInset>
                <CommandPalette />
            </SidebarProvider>
        </TooltipProvider>
    )
}

async function resolveAppRole(
    userId: string,
    email: string | null | undefined,
): Promise<AppRole> {
    if (email === env.ADMIN_EMAIL) return 'admin'

    const publicDb = getPublicDb()
    const [profile] = await publicDb
        .select({ role: userProfile.role })
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .limit(1)

    return profile?.role ?? 'user'
}
