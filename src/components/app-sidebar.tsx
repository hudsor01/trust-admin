"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"

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
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type Route =
  | "/"
  | "/trustees"
  | "/beneficiaries"
  | "/contacts"
  | "/hems"
  | "/hems-queue"
  | "/distribution-wizard"
  | "/bequests"
  | "/accounting"
  | "/properties"
  | "/accounts"
  | "/vehicles"
  | "/liabilities"
  | "/activity-log"
  | "/settings"

interface AppSidebarProps {
  currentRoute: Route
  onNavigate: (route: Route) => void
}

export function AppSidebar({ currentRoute, onNavigate }: AppSidebarProps) {
  const [distributionsOpen, setDistributionsOpen] = useState(true)
  const [assetsOpen, setAssetsOpen] = useState(true)

  const isInDistributions = ["/hems", "/hems-queue", "/distribution-wizard", "/bequests"].includes(currentRoute)
  const isInAssets = ["/properties", "/accounts", "/vehicles"].includes(currentRoute)

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
                <span className="truncate font-semibold">Trust Admin</span>
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
                onClick={() => onNavigate("/")}
                isActive={currentRoute === "/"}
                tooltip="Dashboard"
              >
                <span>Dashboard</span>
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
                onClick={() => onNavigate("/trustees")}
                isActive={currentRoute === "/trustees"}
                tooltip="Trustees"
              >
                <span>Trustees</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onNavigate("/beneficiaries")}
                isActive={currentRoute === "/beneficiaries"}
                tooltip="Beneficiaries"
              >
                <span>Beneficiaries</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onNavigate("/contacts")}
                isActive={currentRoute === "/contacts"}
                tooltip="Contacts"
              >
                <span>Contacts</span>
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
                    isActive={isInDistributions && !distributionsOpen}
                  >
                    <span>Distributions</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => onNavigate("/hems-queue")}
                        isActive={currentRoute === "/hems-queue"}
                      >
                        <span>Review Queue</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => onNavigate("/distribution-wizard")}
                        isActive={currentRoute === "/distribution-wizard"}
                      >
                        <span>Income Distribution</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => onNavigate("/hems")}
                        isActive={currentRoute === "/hems"}
                      >
                        <span>Distribution History</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => onNavigate("/bequests")}
                        isActive={currentRoute === "/bequests"}
                      >
                        <span>Specific Bequests</span>
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
                onClick={() => onNavigate("/accounting")}
                isActive={currentRoute === "/accounting"}
                tooltip="Trust Accounting"
              >
                <span>Trust Accounting</span>
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
                        onClick={() => onNavigate("/properties")}
                        isActive={currentRoute === "/properties"}
                      >
                        <span>Properties</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => onNavigate("/accounts")}
                        isActive={currentRoute === "/accounts"}
                      >
                        <span>Accounts</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        onClick={() => onNavigate("/vehicles")}
                        isActive={currentRoute === "/vehicles"}
                      >
                        <span>Vehicles</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onNavigate("/liabilities")}
                isActive={currentRoute === "/liabilities"}
                tooltip="Liabilities"
              >
                <span>Liabilities</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onNavigate("/activity-log")}
                isActive={currentRoute === "/activity-log"}
                tooltip="Activity Log"
              >
                <span>Activity Log</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onNavigate("/settings")}
              isActive={currentRoute === "/settings"}
              tooltip="Settings"
            >
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
