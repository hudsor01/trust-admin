export const dynamic = 'force-dynamic'

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
import { authServer } from '@/lib/auth'

/** Route guard: requires Neon Auth admin role; non-admins go to /portal. */
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

    if (session.user.role !== 'admin') {
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
