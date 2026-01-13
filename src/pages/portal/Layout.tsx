import { Loader2, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "@/lib/auth-client"
import { PortalDashboard } from "./Dashboard"
import { PortalLogin } from "./Login"

export function PortalLayout() {
  const { data: session, isPending } = useSession()

  // Loading state
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not logged in - show login
  if (!session?.user) {
    return <PortalLogin onLoginSuccess={() => {}} />
  }

  // Dashboard view with header
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm">
              TA
            </div>
            <div>
              <h1 className="font-semibold">Beneficiary Portal</h1>
              <p className="text-xs text-muted-foreground">Trust Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{session?.user?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <PortalDashboard />
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Trust Administration Portal
        </div>
      </footer>
    </div>
  )
}
