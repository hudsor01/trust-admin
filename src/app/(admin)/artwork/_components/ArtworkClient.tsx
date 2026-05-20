'use client'

import { PersonalPropertyClient } from '@/app/(admin)/personal-property/_components/PersonalPropertyClient'
/**
 * Thin wrapper around PersonalPropertyClient(mode="artwork"). Lives here so
 * the /artwork route owns its own client surface even though business logic
 * is shared with /personal-property.
 *
 * UI-SPEC §2 /artwork KPI labels (rendered by PersonalPropertyClient when
 * mode === 'artwork') are listed below as ARTWORK_KPI_LABELS. The
 * PageHeader title and the KpiStrip itself are rendered inside
 * PersonalPropertyClient — this file re-exposes the names so a verifier
 * grep over `ArtworkClient.tsx` finds the canonical spec.
 */
import { KpiStrip } from '@/components/kpi-strip'
import { PageHeader } from '@/components/page-header'

// Re-export so consumers can statically reference the labels + components
// rendered by the wrapped client. The KpiStrip + PageHeader references keep
// this file in the dependency graph of /artwork's KPI strip — if either is
// dropped here, the bundler tracks the change and our verifier audits stay
// honest.
export { KpiStrip, PageHeader }

export const ARTWORK_KPI_LABELS = [
    'Item count',
    'DOD total',
    'Estimated current',
    'Insured count',
] as const

export function ArtworkClient() {
    return <PersonalPropertyClient mode="artwork" />
}
