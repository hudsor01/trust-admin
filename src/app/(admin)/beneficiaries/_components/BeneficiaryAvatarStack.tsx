'use client'

import { AvatarStack } from '@/components/kibo-ui/avatar-stack'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface BeneficiaryAvatarStackProps {
    beneficiaries: Array<{ id: number; name: string }>
    max?: number
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
}

export function BeneficiaryAvatarStack({
    beneficiaries,
    max = 5,
}: BeneficiaryAvatarStackProps) {
    const visible = beneficiaries.slice(0, max)
    const overflow = beneficiaries.length - visible.length

    return (
        <div className="flex flex-col items-start gap-2">
            <AvatarStack size={32}>
                {visible.map((b) => (
                    <Avatar key={b.id} className="ring-2 ring-background">
                        <AvatarFallback className="text-xs">
                            {initials(b.name)}
                        </AvatarFallback>
                    </Avatar>
                ))}
                {overflow > 0 && (
                    <Avatar className="ring-2 ring-background">
                        <AvatarFallback className="text-xs bg-muted">
                            +{overflow}
                        </AvatarFallback>
                    </Avatar>
                )}
            </AvatarStack>
            <p className="text-sm text-muted-foreground">
                {beneficiaries.length}{' '}
                {beneficiaries.length === 1 ? 'beneficiary' : 'beneficiaries'}
            </p>
        </div>
    )
}
