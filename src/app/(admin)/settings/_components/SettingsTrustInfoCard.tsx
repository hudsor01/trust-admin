'use client'

import { PreferenceRow } from '@/components/preference-row'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Entity } from '@/db/schema'

interface SettingsTrustInfoCardProps {
    entity: Entity | undefined
    onUpdate: (data: Partial<Entity>) => void
}

/** Trust identity fields — name, EIN, governing law. */
export function SettingsTrustInfoCard({
    entity,
    onUpdate,
}: SettingsTrustInfoCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-semibold">
                    Trust info
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <PreferenceRow
                    title="Trust name"
                    description="Legal name as recorded on the trust document."
                >
                    <Input
                        key={`name-${entity?.id ?? 'none'}`}
                        defaultValue={entity?.name ?? ''}
                        onBlur={(e) => {
                            const next = e.target.value.trim()
                            if (next && next !== entity?.name) {
                                onUpdate({ name: next })
                            }
                        }}
                        className="w-full max-w-xs"
                        aria-label="Trust name"
                    />
                </PreferenceRow>
                <PreferenceRow
                    title="EIN"
                    description="Employer identification number assigned to the trust."
                >
                    <Input
                        key={`ein-${entity?.id ?? 'none'}`}
                        defaultValue={entity?.ein ?? ''}
                        onBlur={(e) => {
                            const next = e.target.value.trim() || null
                            if (next !== (entity?.ein ?? null)) {
                                onUpdate({ ein: next })
                            }
                        }}
                        className="w-full max-w-xs"
                        aria-label="EIN"
                    />
                </PreferenceRow>
                <PreferenceRow
                    title="Governing law"
                    description="Jurisdiction whose law governs trust administration."
                >
                    <Input
                        key={`law-${entity?.id ?? 'none'}`}
                        defaultValue={
                            entity?.governingLaw ?? 'Texas Property Code'
                        }
                        onBlur={(e) => {
                            const next = e.target.value.trim() || null
                            if (next !== (entity?.governingLaw ?? null)) {
                                onUpdate({ governingLaw: next })
                            }
                        }}
                        className="w-full max-w-xs"
                        aria-label="Governing law"
                    />
                </PreferenceRow>
            </CardContent>
        </Card>
    )
}
