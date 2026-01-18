import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { CommandPalette } from '@/components/command-palette'
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { auth } from '@/lib/auth'

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
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })

    // Redirect to login if not authenticated
    if (!session?.user) {
        redirect('/login')
    }

    // Check for admin role
    const user = session.user as { role?: string }
    if (user.role !== 'admin') {
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
