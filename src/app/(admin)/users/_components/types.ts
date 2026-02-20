export type NeonAuthUser = {
    id: string
    name: string | null
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: string
    neonRole: string | null
    banned: boolean
    banReason?: string | null
    banExpires?: string | null
    appRole: string | null
    beneficiaryId: number | null
    beneficiaryName: string | null
}
