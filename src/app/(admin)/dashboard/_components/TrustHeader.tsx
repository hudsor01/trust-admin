'use client'

import { Circle } from 'lucide-react'
import { formatDate } from '@/utils/formatters'

interface Entity {
    name: string
    trustType: string | null
    grantorName: string | null
    dod: string | null
}

interface TrustHeaderProps {
    entity: Entity
}

export function TrustHeader({ entity }: TrustHeaderProps) {
    return (
        <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-1">
                {entity.name}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
                {entity.trustType === 'IRREVOCABLE'
                    ? 'Irrevocable'
                    : 'Revocable'}{' '}
                · Texas · Established Sep 18, 2024
            </p>
            <div className="flex gap-8">
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                        Grantor
                    </p>
                    <p className="text-sm">{entity.grantorName || '—'}</p>
                </div>
                {entity.dod && (
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                            Date of Death
                        </p>
                        <p className="text-sm">{formatDate(entity.dod)}</p>
                    </div>
                )}
                <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                        Status
                    </p>
                    <div className="flex items-center gap-2">
                        <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                        <span className="text-sm">Active Administration</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
