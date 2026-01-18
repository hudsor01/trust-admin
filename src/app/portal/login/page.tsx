'use client'

/**
 * Portal Login Page
 *
 * Magic link authentication for beneficiaries.
 */

import { Mail } from 'lucide-react'
import { LoginPage } from '@/components/login-page'

export default function PortalLoginPage() {
    return (
        <LoginPage
            title="Beneficiary Portal"
            icon={Mail}
            redirectPath="/portal"
            callbackURL="/portal"
        />
    )
}
