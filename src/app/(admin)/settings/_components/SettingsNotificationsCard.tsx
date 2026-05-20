'use client'

import { PreferenceRow } from '@/components/preference-row'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

/**
 * Notification preferences card.
 *
 * The full notification delivery system is FUTURE work (tracked outside this
 * phase). These switches are disabled placeholders so the section reads as a
 * complete card while the backend lands later — no preferences are persisted.
 */
export function SettingsNotificationsCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-semibold">
                    Notifications
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <PreferenceRow
                    title="HEMS request alerts"
                    description="Email a trustee when a beneficiary submits a new HEMS request. Delivery system is not yet wired."
                >
                    <Switch
                        disabled
                        aria-label="HEMS request alerts (coming soon)"
                    />
                </PreferenceRow>
                <PreferenceRow
                    title="Distribution reminders"
                    description="Periodic reminder for pending distributions awaiting payout. Delivery system is not yet wired."
                >
                    <Switch
                        disabled
                        aria-label="Distribution reminders (coming soon)"
                    />
                </PreferenceRow>
            </CardContent>
        </Card>
    )
}
