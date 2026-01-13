import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

// In development, API runs on port 5050, frontend on 5173
const API_URL = import.meta.env.DEV ? "http://localhost:5050" : window.location.origin

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [magicLinkClient()],
})

// Export convenience methods
export const { signIn, signOut, useSession, getSession } = authClient
