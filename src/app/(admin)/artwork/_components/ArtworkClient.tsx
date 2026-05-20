'use client'

/**
 * Thin wrapper around PersonalPropertyClient(mode="artwork"). Lives here so
 * the /artwork route owns its own client surface even though business logic
 * — including the PageHeader title and KpiStrip — is rendered inside
 * PersonalPropertyClient when `mode === 'artwork'`.
 */
import { PersonalPropertyClient } from '@/app/(admin)/personal-property/_components/PersonalPropertyClient'

export function ArtworkClient() {
    return <PersonalPropertyClient mode="artwork" />
}
