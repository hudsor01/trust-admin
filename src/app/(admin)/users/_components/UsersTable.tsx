'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import type { NeonAuthUser } from './types'

type UsersTableProps = {
    isOwner: boolean
    loading: boolean
    tableData: NeonAuthUser[]
    columns: ColumnDef<NeonAuthUser>[]
    usersError: { message: string } | null
    onCreateClick: () => void
}

export function UsersTable({
    isOwner,
    loading,
    tableData,
    columns,
    usersError,
    onCreateClick,
}: UsersTableProps) {
    const userCount = tableData.length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Users
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {userCount} user{userCount !== 1 ? 's' : ''}
                    </p>
                </div>
                {isOwner && (
                    <Button onClick={onCreateClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Portal Account
                    </Button>
                )}
            </div>

            {/* Non-owner info banner — visible once the page has settled
                (load complete or errored). Suppress during initial load so
                the banner doesn't flash before we know the user's role.
                Show on error too because Neon Auth's admin proxy can
                reject non-owner admin calls — without this, the page would
                render nothing actionable for those users. */}
            {!isOwner && (!loading || usersError) && (
                <div className="rounded-md border border-muted bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                    User management is restricted to the trust owner. You are
                    viewing provisioned accounts in read-only mode.
                </div>
            )}

            {/* Error state — owner sees the actual error; non-owners get
                the banner above instead. */}
            {usersError && isOwner && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    Failed to load users: {usersError.message}
                </div>
            )}

            {/* User List */}
            <Card>
                <CardContent className="pt-6">
                    <DataTable
                        tableId="users"
                        data={tableData}
                        columns={columns}
                        searchKey="name"
                        searchPlaceholder="Filter by name..."
                        isLoading={loading}
                        emptyMessage="No users found"
                        enableColumnVisibility={true}
                        enablePagination={true}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
