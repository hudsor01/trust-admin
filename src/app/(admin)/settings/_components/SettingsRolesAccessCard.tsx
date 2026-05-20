'use client'

import { PreferenceRow } from '@/components/preference-row'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Roles & access card.
 *
 * Read-only view of the privilege model. The owner email always resolves to
 * admin regardless of the user_profile.role row; trustee/arbiter are mirrored
 * as native `user` in Neon Auth (see CLAUDE.md Auth section). User CRUD lives
 * on the dedicated /users page — this card is informational only.
 */
export function SettingsRolesAccessCard() {
    const roles: Array<{
        role: string
        trustAdmin: boolean
        userMgmt: boolean
    }> = [
        { role: 'Admin', trustAdmin: true, userMgmt: true },
        { role: 'Trustee', trustAdmin: true, userMgmt: false },
        { role: 'Arbiter', trustAdmin: true, userMgmt: false },
        { role: 'Beneficiary', trustAdmin: false, userMgmt: false },
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-semibold">
                    Roles & access
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {roles.map((r) => (
                    <PreferenceRow
                        key={r.role}
                        title={r.role}
                        description={
                            r.trustAdmin
                                ? 'Full trust administration access.'
                                : 'Portal access to own beneficiary record only.'
                        }
                    >
                        <div className="flex items-center gap-2">
                            {r.trustAdmin && (
                                <Badge variant="secondary">Trust admin</Badge>
                            )}
                            {r.userMgmt && (
                                <Badge variant="secondary">
                                    User management
                                </Badge>
                            )}
                            {!r.trustAdmin && !r.userMgmt && (
                                <Badge variant="outline">Portal only</Badge>
                            )}
                        </div>
                    </PreferenceRow>
                ))}
            </CardContent>
        </Card>
    )
}
