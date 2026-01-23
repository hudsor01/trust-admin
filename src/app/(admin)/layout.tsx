import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { CommandPalette } from '@/components/command-palette'
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { authServer } from '@/lib/auth'
import { db, userProfile } from '../../../db'

/**
 * Admin Layout
 *
 * Server Component that protects all admin routes.
 * Redirects to login if not authenticated or not an admin.
 */
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session } = await authServer.getSession()

    // Redirect to login if not authenticated
    if (!session?.user) {
        redirect('/auth/sign-in')
    }

    // Fetch user profile to get role
    const [profile] = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, session.user.id))
        .limit(1)

    // Check for admin role
    if (profile?.role !== 'admin') {
        // Non-admin users go to portal
        redirect('/portal')
    }

    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-14 items-center gap-4 border-b px-6">
                        <SidebarTrigger />
                        <div className="flex-1" />
                        <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground sm:flex">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </header>
                    <main className="flex-1 overflow-auto p-6">{children}</main>
                </SidebarInset>
                <CommandPalette />
            </SidebarProvider>
        </TooltipProvider>
    )
}
