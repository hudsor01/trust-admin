'use client'

import { PreferenceRow } from '@/components/preference-row'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Inventory access card.
 *
 * The public inventory submission form at `/forms` is gated by the
 * INVENTORY_ACCESS_CODE env var; password-reset email delivery routes through
 * the n8n webhook. Both values live in the deployment environment, not the
 * database — this card surfaces operational guidance without exposing secrets.
 */
export function SettingsInventoryAccessCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-semibold">
                    Inventory access
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <PreferenceRow
                    title="Inventory access code"
                    description="The public inventory form at /forms is gated by INVENTORY_ACCESS_CODE. Rotate it in the deployment environment (Vercel) — never commit the value."
                >
                    <span className="text-sm text-muted-foreground">
                        Managed in environment
                    </span>
                </PreferenceRow>
                <PreferenceRow
                    title="Password reset webhook"
                    description="Forgot-password emails are delivered via the n8n webhook configured in N8N_PASSWORD_RESET_WEBHOOK_URL."
                >
                    <span className="text-sm text-muted-foreground">
                        Managed in environment
                    </span>
                </PreferenceRow>
            </CardContent>
        </Card>
    )
}
