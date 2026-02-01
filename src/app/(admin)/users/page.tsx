'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Eye, EyeOff, KeyRound, Plus, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc'
import { formatDate } from '@/utils/formatters'

type ProvisionedUser = {
    userId: string
    role: string | null
    beneficiaryId: number | null
    createdAt: string | null
    firstName: string | null
    lastName: string | null
    beneficiaryEmail: string | null
}

export default function UsersPage() {
    const utils = trpc.useUtils()

    // Fetch provisioned users
    const { data: provisionedUsers = [], isLoading: usersLoading } =
        trpc.userManagement.listProvisionedUsers.useQuery()

    // Fetch all beneficiaries (no entity filter — users are global)
    const { data: allBeneficiaries = [], isLoading: beneficiariesLoading } =
        trpc.beneficiary.list.useQuery()

    // Dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [resetUserId, setResetUserId] = useState<string | null>(null)
    const [resetUserName, setResetUserName] = useState('')

    // Create form state
    const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<
        string | null
    >(null)
    const [email, setEmail] = useState('')
    const [tempPassword, setTempPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Reset form state
    const [newPassword, setNewPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)

    // Success state for showing the temp password once
    const [createdCredentials, setCreatedCredentials] = useState<{
        email: string
        tempPassword: string
    } | null>(null)

    // Mutations
    const createUserMutation =
        trpc.userManagement.createBeneficiaryUser.useMutation({
            onSuccess: (_data, variables) => {
                utils.userManagement.listProvisionedUsers.invalidate()
                setCreateDialogOpen(false)
                // Show credentials in a success dialog
                setCreatedCredentials({
                    email: variables.email,
                    tempPassword: variables.tempPassword,
                })
                // Reset form
                setSelectedBeneficiaryId(null)
                setEmail('')
                setTempPassword('')
                setShowPassword(false)
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to create portal account')
            },
        })

    const resetPasswordMutation =
        trpc.userManagement.resetUserPassword.useMutation({
            onSuccess: () => {
                setResetDialogOpen(false)
                setResetUserId(null)
                setResetUserName('')
                setNewPassword('')
                setShowNewPassword(false)
                toast.success('Password reset successfully')
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to reset password')
            },
        })

    // Beneficiaries that don't have accounts yet
    const unlinkedBeneficiaries = useMemo(() => {
        const linkedIds = new Set(
            provisionedUsers
                .map((u) => u.beneficiaryId)
                .filter((id): id is number => id !== null),
        )
        return allBeneficiaries.filter((b) => !linkedIds.has(b.id))
    }, [provisionedUsers, allBeneficiaries])

    // Pre-fill email when beneficiary is selected
    const handleBeneficiarySelect = (beneficiaryId: string) => {
        setSelectedBeneficiaryId(beneficiaryId)
        const ben = allBeneficiaries.find((b) => b.id === Number(beneficiaryId))
        if (ben?.email) {
            setEmail(ben.email)
        } else {
            setEmail('')
        }
    }

    const handleCreateSubmit = () => {
        if (!selectedBeneficiaryId || !email || tempPassword.length < 8) return
        createUserMutation.mutate({
            beneficiaryId: Number(selectedBeneficiaryId),
            email,
            tempPassword,
        })
    }

    const handleResetSubmit = () => {
        if (!resetUserId || newPassword.length < 8) return
        resetPasswordMutation.mutate({
            userId: resetUserId,
            newPassword,
        })
    }

    const openResetDialog = (userId: string, name: string) => {
        setResetUserId(userId)
        setResetUserName(name)
        setNewPassword('')
        setShowNewPassword(false)
        setResetDialogOpen(true)
    }

    const loading = usersLoading || beneficiariesLoading

    const columns: ColumnDef<ProvisionedUser>[] = [
        {
            accessorKey: 'userId',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="User ID" />
            ),
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {row.original.userId.slice(0, 8)}...
                </span>
            ),
        },
        {
            id: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            cell: ({ row }) => {
                const { firstName, lastName } = row.original
                if (!firstName && !lastName)
                    return <span className="text-muted-foreground">—</span>
                return (
                    <span className="font-medium">
                        {firstName} {lastName}
                    </span>
                )
            },
            filterFn: (row, _columnId, filterValue) => {
                const fullName =
                    `${row.original.firstName ?? ''} ${row.original.lastName ?? ''}`.toLowerCase()
                return fullName.includes(filterValue.toLowerCase())
            },
        },
        {
            accessorKey: 'beneficiaryEmail',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Email" />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.beneficiaryEmail || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'role',
            header: 'Role',
            cell: ({ row }) => (
                <Badge variant="secondary" className="capitalize">
                    {row.original.role || 'user'}
                </Badge>
            ),
        },
        {
            id: 'linkedBeneficiary',
            header: 'Linked Beneficiary',
            cell: ({ row }) => {
                const { firstName, lastName, beneficiaryId } = row.original
                if (!beneficiaryId)
                    return <span className="text-muted-foreground">—</span>
                return (
                    <span className="text-sm">
                        {firstName} {lastName}
                    </span>
                )
            },
        },
        {
            accessorKey: 'createdAt',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Created" />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.original.createdAt)}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const displayName =
                    [row.original.firstName, row.original.lastName]
                        .filter(Boolean)
                        .join(' ') || 'this user'
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() =>
                            openResetDialog(row.original.userId, displayName)
                        }
                    >
                        <KeyRound className="h-3.5 w-3.5" />
                        Reset Password
                    </Button>
                )
            },
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-balance">
                        Users
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {provisionedUsers.length} provisioned portal account
                        {provisionedUsers.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Portal Account
                </Button>
            </div>

            {/* User List */}
            <Card>
                <CardContent className="pt-6">
                    <DataTable
                        data={provisionedUsers as ProvisionedUser[]}
                        columns={columns}
                        searchKey="name"
                        searchPlaceholder="Filter by name..."
                        isLoading={loading}
                        emptyMessage="No portal accounts provisioned yet"
                        enableColumnVisibility={true}
                        enablePagination={true}
                    />
                </CardContent>
            </Card>

            {/* Create Portal Account Dialog */}
            <Dialog
                open={createDialogOpen}
                onOpenChange={(open) => {
                    setCreateDialogOpen(open)
                    if (!open) {
                        setSelectedBeneficiaryId(null)
                        setEmail('')
                        setTempPassword('')
                        setShowPassword(false)
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Create Portal Account
                        </DialogTitle>
                        <DialogDescription>
                            Provision a portal login for a beneficiary. They
                            will use these credentials to access their
                            beneficiary portal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Beneficiary Select */}
                        <div className="space-y-2">
                            <Label htmlFor="beneficiary">Beneficiary</Label>
                            <Select
                                value={selectedBeneficiaryId ?? ''}
                                onValueChange={handleBeneficiarySelect}
                            >
                                <SelectTrigger id="beneficiary">
                                    <SelectValue placeholder="Select a beneficiary..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {unlinkedBeneficiaries.map((b) => (
                                        <SelectItem
                                            key={b.id}
                                            value={String(b.id)}
                                        >
                                            {b.firstName} {b.lastName}
                                            {b.email ? ` (${b.email})` : ''}
                                        </SelectItem>
                                    ))}
                                    {unlinkedBeneficiaries.length === 0 && (
                                        <SelectItem value="none" disabled>
                                            All beneficiaries have accounts
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="beneficiary@example.com"
                            />
                        </div>

                        {/* Temporary Password */}
                        <div className="space-y-2">
                            <Label htmlFor="tempPassword">
                                Temporary Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="tempPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={tempPassword}
                                    onChange={(e) =>
                                        setTempPassword(e.target.value)
                                    }
                                    placeholder="Min 8 characters"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            {tempPassword.length > 0 &&
                                tempPassword.length < 8 && (
                                    <p className="text-xs text-destructive">
                                        Password must be at least 8 characters
                                    </p>
                                )}
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setCreateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateSubmit}
                                disabled={
                                    !selectedBeneficiaryId ||
                                    !email ||
                                    tempPassword.length < 8 ||
                                    createUserMutation.isPending
                                }
                            >
                                {createUserMutation.isPending
                                    ? 'Creating...'
                                    : 'Create Account'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Created Credentials Dialog (shown once after successful creation) */}
            <Dialog
                open={!!createdCredentials}
                onOpenChange={(open) => {
                    if (!open) setCreatedCredentials(null)
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-success">
                            Account Created Successfully
                        </DialogTitle>
                        <DialogDescription>
                            Share these credentials with the beneficiary. The
                            temporary password will not be shown again.
                        </DialogDescription>
                    </DialogHeader>
                    {createdCredentials && (
                        <div className="space-y-4">
                            <div className="rounded-md border bg-muted/50 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Email
                                        </p>
                                        <p className="mt-1 font-mono text-sm">
                                            {createdCredentials.email}
                                        </p>
                                    </div>
                                    <CopyButton
                                        value={createdCredentials.email}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Temporary Password
                                        </p>
                                        <p className="mt-1 font-mono text-sm">
                                            {createdCredentials.tempPassword}
                                        </p>
                                    </div>
                                    <CopyButton
                                        value={createdCredentials.tempPassword}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Remind the beneficiary to change their password
                                after first login.
                            </p>
                            <div className="flex justify-end">
                                <Button
                                    onClick={() => setCreatedCredentials(null)}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog
                open={resetDialogOpen}
                onOpenChange={(open) => {
                    setResetDialogOpen(open)
                    if (!open) {
                        setResetUserId(null)
                        setResetUserName('')
                        setNewPassword('')
                        setShowNewPassword(false)
                    }
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5" />
                            Reset Password
                        </DialogTitle>
                        <DialogDescription>
                            Set a new password for {resetUserName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                    placeholder="Min 8 characters"
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() =>
                                        setShowNewPassword(!showNewPassword)
                                    }
                                >
                                    {showNewPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            {newPassword.length > 0 &&
                                newPassword.length < 8 && (
                                    <p className="text-xs text-destructive">
                                        Password must be at least 8 characters
                                    </p>
                                )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setResetDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleResetSubmit}
                                disabled={
                                    newPassword.length < 8 ||
                                    resetPasswordMutation.isPending
                                }
                            >
                                {resetPasswordMutation.isPending
                                    ? 'Resetting...'
                                    : 'Reset Password'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
