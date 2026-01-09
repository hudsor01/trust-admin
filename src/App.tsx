import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "@/lib/auth-client"
import { exportTablesInContainer } from "@/lib/csv"
import { Loader2, ShieldAlert, Download } from "lucide-react"

// Page imports
import { Dashboard } from "./pages/Dashboard"
import { PortalLayout } from "./pages/portal"
import { Beneficiaries } from "./pages/Beneficiaries"
import { Contacts } from "./pages/Contacts"
import { Trustees } from "./pages/Trustees"
import { Accounting } from "./pages/Accounting"
import { Distributions } from "./pages/Distributions"
import { Bequests } from "./pages/Bequests"
import { Properties } from "./pages/Properties"
import { Accounts } from "./pages/Accounts"
import { Vehicles } from "./pages/Vehicles"
import { Liabilities } from "./pages/Liabilities"
import { Settings } from "./pages/Settings"
import { HemsQueue } from "./pages/HemsQueue"
import { DistributionWizard } from "./pages/DistributionWizard"
import { ActivityLog } from "./pages/ActivityLog"
import { AdminLogin } from "./pages/AdminLogin"

type SessionUser = {
  id: string
  name: string
  email: string
  role?: string
} | null

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

const validRoutes: Route[] = [
  "/",
  "/trustees",
  "/beneficiaries",
  "/contacts",
  "/hems",
  "/hems-queue",
  "/distribution-wizard",
  "/bequests",
  "/accounting",
  "/properties",
  "/accounts",
  "/vehicles",
  "/liabilities",
  "/activity-log",
  "/settings",
]

function getRouteFromHash(): Route {
  const hash = window.location.hash.slice(1) || "/"
  if (validRoutes.includes(hash as Route)) {
    return hash as Route
  }
  return "/"
}

const routeTitles: Record<Route, string> = {
  "/": "Dashboard",
  "/trustees": "Trustees",
  "/beneficiaries": "Beneficiaries",
  "/contacts": "Contacts",
  "/hems": "Distribution History",
  "/hems-queue": "Review Queue",
  "/distribution-wizard": "Income Distribution",
  "/bequests": "Specific Bequests",
  "/accounting": "Trust Accounting",
  "/properties": "Properties",
  "/accounts": "Accounts",
  "/vehicles": "Vehicles",
  "/liabilities": "Liabilities",
  "/activity-log": "Activity Log",
  "/settings": "Settings",
}

function isPortalRoute(): boolean {
  const hash = window.location.hash.slice(1) || "/"
  return hash.startsWith("/portal")
}

export function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>(getRouteFromHash)
  const [isPortal, setIsPortal] = useState(isPortalRoute)
  const { data: session, isPending } = useSession()

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(getRouteFromHash())
      setIsPortal(isPortalRoute())
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  // Render portal layout for /portal/* routes
  if (isPortal) {
    return <PortalLayout />
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // TEMPORARY DEVELOPMENT BYPASS: Authentication check commented out for development
  // TODO: RESTORE AUTHENTICATION BEFORE PRODUCTION DEPLOYMENT
  // ORIGINAL AUTHENTICATION CODE (COMMENTED OUT FOR DEVELOPMENT):
  // const user = session?.user as SessionUser | null
  //
  // if (!user) {
  //   return <AdminLogin onLoginSuccess={() => {}} />
  // }
  //
  // if (user.role !== "admin") {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-background p-6">
  //       <div className="max-w-lg w-full rounded-lg border bg-card p-6 text-center space-y-4">
  //         <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
  //           <ShieldAlert className="h-6 w-6 text-destructive" />
  //         </div>
  //         <div>
  //           <h2 className="text-xl font-semibold">Access restricted</h2>
  //           <p className="text-sm text-muted-foreground">
  //             This area is available to administrator accounts only.
  //           </p>
  //         </div>
  //         <Button
  //           variant="outline"
  //           onClick={async () => {
  //             await signOut()
  //           }}
  //         >
  //           Sign out
  //         </Button>
  //       </div>
  //     </div>
  //   )
  // }

  // TEMPORARY DEVELOPMENT CODE: Mock user data for development
  // This allows the dashboard to load during development without authentication
  console.log("[DEV MODE] Bypassing authentication in App.tsx")
  const user = {
    id: "dev-user-id",
    name: "Development User",
    email: "dev@example.com",
    role: "admin"
  } as SessionUser

  // Continue with the rest of the app logic
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full rounded-lg border bg-card p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Access restricted</h2>
            <p className="text-sm text-muted-foreground">
              This area is available to administrator accounts only.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut()
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  const navigate = (path: Route) => {
    window.location.hash = path
  }

  const renderPage = () => {
    switch (currentRoute) {
      case "/":
        return <Dashboard />
      case "/trustees":
        return <Trustees />
      case "/beneficiaries":
        return <Beneficiaries />
      case "/contacts":
        return <Contacts />
      case "/hems":
        return <Distributions />
      case "/hems-queue":
        return <HemsQueue />
      case "/distribution-wizard":
        return <DistributionWizard />
      case "/bequests":
        return <Bequests />
      case "/accounting":
        return <Accounting />
      case "/properties":
        return <Properties />
      case "/accounts":
        return <Accounts />
      case "/vehicles":
        return <Vehicles />
      case "/liabilities":
        return <Liabilities />
      case "/activity-log":
        return <ActivityLog />
      case "/settings":
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar currentRoute={currentRoute} onNavigate={navigate} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">{routeTitles[currentRoute]}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const main = document.querySelector("main")
                if (!main) return
                const baseName = routeTitles[currentRoute]
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "")
                exportTablesInContainer(main as HTMLElement, baseName || "export")
              }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {renderPage()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
