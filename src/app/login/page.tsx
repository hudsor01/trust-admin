import { redirect } from 'next/navigation'

/**
 * Admin Login Page
 *
 * Redirects to the unified Neon Auth sign-in page.
 * Kept for backwards compatibility with existing links.
 */
export default function AdminLoginPage() {
    redirect('/auth/sign-in')
}
