'use client'

import { ChevronRight, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth/client'

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [distributionsOpen, setDistributionsOpen] = useState(true)
    const [assetsOpen, setAssetsOpen] = useState(true)

    const isInDistributions = ['/hems', '/hems-queue', '/bequests'].includes(
        pathname,
    )
    const isInAssets = [
        '/properties',
        '/accounts',
        '/vehicles',
        '/inventory-queue',
    ].includes(pathname)

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-foreground text-background font-semibold text-sm">
                                TA
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                    Trust Admin
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    Estate Administration
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Dashboard */}
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/dashboard'}
                                tooltip="Dashboard"
                            >
                                <Link href="/dashboard">
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {/* Administration - flat list of people */}
                <SidebarGroup>
                    <SidebarGroupLabel>Administration</SidebarGroupLabel>
                    <SidebarMenu className="pl-2">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/trustees'}
                                tooltip="Trustees"
                            >
                                <Link href="/trustees">
                                    <span>Trustees</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/beneficiaries'}
                                tooltip="Beneficiaries"
                            >
                                <Link href="/beneficiaries">
                                    <span>Beneficiaries</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/contacts'}
                                tooltip="Contacts"
                            >
                                <Link href="/contacts">
                                    <span>Contacts</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/users'}
                                tooltip="Users"
                            >
                                <Link href="/users">
                                    <span>Users</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* Distributions - collapsed submenu for distribution actions */}
                        <Collapsible
                            open={distributionsOpen}
                            onOpenChange={setDistributionsOpen}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip="Distributions"
                                        isActive={
                                            isInDistributions &&
                                            !distributionsOpen
                                        }
                                    >
                                        <span>Distributions</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={
                                                    pathname === '/hems-queue'
                                                }
                                            >
                                                <Link href="/hems-queue">
                                                    <span>Review Queue</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={pathname === '/hems'}
                                            >
                                                <Link href="/hems">
                                                    <span>
                                                        Distribution History
                                                    </span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={
                                                    pathname === '/bequests'
                                                }
                                            >
                                                <Link href="/bequests">
                                                    <span>
                                                        Specific Bequests
                                                    </span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    </SidebarMenu>
                </SidebarGroup>

                {/* Financial */}
                <SidebarGroup>
                    <SidebarGroupLabel>Financial</SidebarGroupLabel>
                    <SidebarMenu className="pl-2">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/accounting'}
                                tooltip="Trust Accounting"
                            >
                                <Link href="/accounting">
                                    <span>Trust Accounting</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* Assets */}
                        <Collapsible
                            open={assetsOpen}
                            onOpenChange={setAssetsOpen}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip="Assets"
                                        isActive={isInAssets && !assetsOpen}
                                    >
                                        <span>Assets</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={
                                                    pathname === '/properties'
                                                }
                                            >
                                                <Link href="/properties">
                                                    <span>Properties</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={
                                                    pathname === '/accounts'
                                                }
                                            >
                                                <Link href="/accounts">
                                                    <span>Accounts</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={
                                                    pathname === '/vehicles'
                                                }
                                            >
                                                <Link href="/vehicles">
                                                    <span>Vehicles</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={
                                                    pathname ===
                                                    '/inventory-queue'
                                                }
                                            >
                                                <Link href="/inventory-queue">
                                                    <span>Inventory Queue</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/liabilities'}
                                tooltip="Liabilities"
                            >
                                <Link href="/liabilities">
                                    <span>Liabilities</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/activity-log'}
                                tooltip="Activity Log"
                            >
                                <Link href="/activity-log">
                                    <span>Activity Log</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            isActive={pathname === '/settings'}
                            tooltip="Settings"
                        >
                            <Link href="/settings">
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Sign Out"
                            onClick={async () => {
                                await authClient.signOut()
                                router.push('/login')
                            }}
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
