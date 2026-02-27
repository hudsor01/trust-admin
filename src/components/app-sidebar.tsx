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
import { trpc } from '@/lib/trpc'

const entityId = 1

export function AppSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const utils = trpc.useUtils()
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

    const prefetch = {
        dashboard: () => {
            utils.dashboard.summary.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        trustees: () => utils.entity.list.prefetch(),
        beneficiaries: () => {
            utils.beneficiary.listWithDistributions.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        contacts: () => utils.contact.list.prefetch(),
        users: () => utils.userManagement.listAllUsers.prefetch(),
        hemsQueue: () => {
            utils.hemsRequest.listWithBeneficiary.prefetch({ entityId })
            utils.beneficiary.list.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        hems: () => {
            utils.hemsRequest.listWithBeneficiary.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        bequests: () => {
            utils.beneficiary.list.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        accounting: () => {
            utils.trustAccounting.list.prefetch({ entityId })
            utils.bankAccount.list.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        properties: () => {
            utils.homestead.list.prefetch({ entityId })
            utils.rentalProperty.list.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        accounts: () => {
            utils.bankAccount.list.prefetch({ entityId })
            utils.investmentAccount.list.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        vehicles: () => {
            utils.vehicle.list.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        liabilities: () => {
            utils.liability.list.prefetch({ entityId })
            utils.bankAccount.list.prefetch({ entityId })
            utils.entity.list.prefetch()
        },
        activityLog: () => utils.activityLog.list.prefetch({}),
    }

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

            <SidebarContent role="navigation">
                {/* Dashboard */}
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/dashboard'}
                                tooltip="Dashboard"
                            >
                                <Link
                                    href="/dashboard"
                                    onMouseEnter={prefetch.dashboard}
                                >
                                    <span>Dashboard</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {/* Administration */}
                <SidebarGroup>
                    <SidebarGroupLabel>Administration</SidebarGroupLabel>
                    <SidebarMenu className="pl-2">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === '/trustees'}
                                tooltip="Trustees"
                            >
                                <Link
                                    href="/trustees"
                                    onMouseEnter={prefetch.trustees}
                                >
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
                                <Link
                                    href="/beneficiaries"
                                    onMouseEnter={prefetch.beneficiaries}
                                >
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
                                <Link
                                    href="/contacts"
                                    onMouseEnter={prefetch.contacts}
                                >
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
                                <Link
                                    href="/users"
                                    onMouseEnter={prefetch.users}
                                >
                                    <span>Users</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* Distributions submenu */}
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
                                                <Link
                                                    href="/hems-queue"
                                                    onMouseEnter={
                                                        prefetch.hemsQueue
                                                    }
                                                >
                                                    <span>Review Queue</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={pathname === '/hems'}
                                            >
                                                <Link
                                                    href="/hems"
                                                    onMouseEnter={prefetch.hems}
                                                >
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
                                                <Link
                                                    href="/bequests"
                                                    onMouseEnter={
                                                        prefetch.bequests
                                                    }
                                                >
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
                                <Link
                                    href="/accounting"
                                    onMouseEnter={prefetch.accounting}
                                >
                                    <span>Trust Accounting</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {/* Assets submenu */}
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
                                                <Link
                                                    href="/properties"
                                                    onMouseEnter={
                                                        prefetch.properties
                                                    }
                                                >
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
                                                <Link
                                                    href="/accounts"
                                                    onMouseEnter={
                                                        prefetch.accounts
                                                    }
                                                >
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
                                                <Link
                                                    href="/vehicles"
                                                    onMouseEnter={
                                                        prefetch.vehicles
                                                    }
                                                >
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
                                <Link
                                    href="/liabilities"
                                    onMouseEnter={prefetch.liabilities}
                                >
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
                                <Link
                                    href="/activity-log"
                                    onMouseEnter={prefetch.activityLog}
                                >
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
                                router.push('/auth/sign-in')
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
