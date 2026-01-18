'use client'

/**
 * Admin Login Page
 *
 * Magic link authentication for admin users.
 */

import { Shield } from 'lucide-react'
import { LoginPage } from '@/components/login-page'

export default function AdminLoginPage() {
    return (
        <LoginPage
            title="Admin Login"
            icon={Shield}
            redirectPath="/dashboard"
            callbackURL="/dashboard"
            emailPlaceholder="admin@example.com"
        />
    )
}
