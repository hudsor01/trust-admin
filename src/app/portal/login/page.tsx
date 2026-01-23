import { redirect } from 'next/navigation'

/**
 * Portal Login Page
 *
 * Redirects to the unified Neon Auth sign-in page.
 * Kept for backwards compatibility with existing links.
 */
export default function PortalLoginPage() {
    redirect('/auth/sign-in')
}
