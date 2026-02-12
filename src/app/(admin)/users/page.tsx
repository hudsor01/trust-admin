'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
    Ban,
    Eye,
    EyeOff,
    KeyRound,
    LogOut,
    MoreHorizontal,
    Pencil,
    Plus,
    Shield,
    Trash2,
    UserPlus,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

// =============================================================================
// Types
// =============================================================================

type NeonAuthUser = {
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

// =============================================================================
// Page Component
// =============================================================================

export default function UsersPage() {
    const utils = trpc.useUtils()

    // Owner check for gating CRUD controls
    const { data: ownerCheck } = trpc.userManagement.isOwner.useQuery()
    const isOwner = ownerCheck?.isOwner ?? false

    // Fetch entities for beneficiary queries
    const { data: entities = [] } = trpc.entity.list.useQuery()
    const defaultEntityId = entities[0]?.id

    // Fetch all users (owner-only, shows Neon Auth users enriched with app data)
    const {
        data: allUsers = [],
        isLoading: usersLoading,
        error: usersError,
    } = trpc.userManagement.listAllUsers.useQuery(undefined, {
        enabled: isOwner,
    })

    // Fallback: non-owner admins see provisioned users only
    const { data: provisionedUsers = [], isLoading: provisionedLoading } =
        trpc.userManagement.listProvisionedUsers.useQuery(undefined, {
            enabled: !isOwner,
        })

    // Fetch all beneficiaries for create dialog
    const { data: allBeneficiaries = [] } = trpc.beneficiary.list.useQuery(
        { entityId: defaultEntityId! },
        { enabled: !!defaultEntityId && isOwner },
    )

    // ==========================================================================
    // Dialog state
    // ==========================================================================
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [roleDialogOpen, setRoleDialogOpen] = useState(false)
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [banDialogOpen, setBanDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)

    // Selected user for actions
    const [selectedUser, setSelectedUser] = useState<NeonAuthUser | null>(null)

    // Create form state
    const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<
        string | null
    >(null)
    const [email, setEmail] = useState('')
    const [tempPassword, setTempPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Edit form state
    const [editName, setEditName] = useState('')
    const [editEmail, setEditEmail] = useState('')

    // Role form state
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user')

    // Reset password state
    const [newPassword, setNewPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)

    // Ban form state
    const [banReason, setBanReason] = useState('')

    // Success state for temp password
    const [createdCredentials, setCreatedCredentials] = useState<{
        email: string
        tempPassword: string
    } | null>(null)

    // ==========================================================================
    // Mutations
    // ==========================================================================
    const invalidateUsers = () => {
        utils.userManagement.listAllUsers.invalidate()
        utils.userManagement.listProvisionedUsers.invalidate()
    }

    const createUserMutation =
        trpc.userManagement.createBeneficiaryUser.useMutation({
            onSuccess: (_data, variables) => {
                invalidateUsers()
                setCreateDialogOpen(false)
                setCreatedCredentials({
                    email: variables.email,
                    tempPassword: variables.tempPassword,
                })
                setSelectedBeneficiaryId(null)
                setEmail('')
                setTempPassword('')
                setShowPassword(false)
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to create portal account')
            },
        })

    const updateUserMutation = trpc.userManagement.updateUser.useMutation({
        onSuccess: () => {
            invalidateUsers()
            setEditDialogOpen(false)
            setSelectedUser(null)
            toast.success('User updated')
        },
        onError: (err) => toast.error(err.message),
    })

    const setRoleMutation = trpc.userManagement.setUserRole.useMutation({
        onSuccess: () => {
            invalidateUsers()
            setRoleDialogOpen(false)
            setSelectedUser(null)
            toast.success('Role updated')
        },
        onError: (err) => toast.error(err.message),
    })

    const resetPasswordMutation =
        trpc.userManagement.resetUserPassword.useMutation({
            onSuccess: () => {
                setResetDialogOpen(false)
                setSelectedUser(null)
                setNewPassword('')
                setShowNewPassword(false)
                toast.success('Password reset successfully')
            },
            onError: (err) => toast.error(err.message),
        })

    const banUserMutation = trpc.userManagement.banUser.useMutation({
        onSuccess: () => {
            invalidateUsers()
            setBanDialogOpen(false)
            setSelectedUser(null)
            setBanReason('')
            toast.success('User banned')
        },
        onError: (err) => toast.error(err.message),
    })

    const unbanUserMutation = trpc.userManagement.unbanUser.useMutation({
        onSuccess: () => {
            invalidateUsers()
            toast.success('User unbanned')
        },
        onError: (err) => toast.error(err.message),
    })

    const removeUserMutation = trpc.userManagement.removeUser.useMutation({
        onSuccess: () => {
            invalidateUsers()
            setDeleteDialogOpen(false)
            setSelectedUser(null)
            toast.success('User deleted')
        },
        onError: (err) => toast.error(err.message),
    })

    const revokeSessionsMutation =
        trpc.userManagement.revokeUserSessions.useMutation({
            onSuccess: () => {
                setRevokeDialogOpen(false)
                setSelectedUser(null)
                toast.success('All sessions revoked')
            },
            onError: (err) => toast.error(err.message),
        })

    // ==========================================================================
    // Derived data
    // ==========================================================================
    const unlinkedBeneficiaries = useMemo(() => {
        const linkedIds = new Set(
            allUsers
                .map((u) => u.beneficiaryId)
                .filter((id): id is number => id !== null),
        )
        return allBeneficiaries.filter((b) => !linkedIds.has(b.id))
    }, [allUsers, allBeneficiaries])

    // ==========================================================================
    // Action handlers
    // ==========================================================================
    const handleBeneficiarySelect = (beneficiaryId: string) => {
        setSelectedBeneficiaryId(beneficiaryId)
        const ben = allBeneficiaries.find((b) => b.id === Number(beneficiaryId))
        setEmail(ben?.email ?? '')
    }

    const handleCreateSubmit = () => {
        if (!selectedBeneficiaryId || !email || tempPassword.length < 8) return
        createUserMutation.mutate({
            beneficiaryId: Number(selectedBeneficiaryId),
            email,
            tempPassword,
        })
    }

    const openEditDialog = (user: NeonAuthUser) => {
        setSelectedUser(user)
        setEditName(user.name ?? '')
        setEditEmail(user.email)
        setEditDialogOpen(true)
    }

    const openRoleDialog = (user: NeonAuthUser) => {
        setSelectedUser(user)
        setNewRole((user.neonRole as 'admin' | 'user') ?? 'user')
        setRoleDialogOpen(true)
    }

    const openResetDialog = (user: NeonAuthUser) => {
        setSelectedUser(user)
        setNewPassword('')
        setShowNewPassword(false)
        setResetDialogOpen(true)
    }

    const openBanDialog = (user: NeonAuthUser) => {
        setSelectedUser(user)
        setBanReason('')
        setBanDialogOpen(true)
    }

    const openDeleteDialog = (user: NeonAuthUser) => {
        setSelectedUser(user)
        setDeleteDialogOpen(true)
    }

    const openRevokeDialog = (user: NeonAuthUser) => {
        setSelectedUser(user)
        setRevokeDialogOpen(true)
    }

    const displayName = (user: NeonAuthUser | null) =>
        user?.name || user?.email || 'this user'

    // ==========================================================================
    // Table columns (full view for owner)
    // ==========================================================================
    const ownerColumns: ColumnDef<NeonAuthUser>[] = [
        {
            id: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Name" />
            ),
            cell: ({ row }) => (
                <span className="font-medium">
                    {row.original.name || (
                        <span className="text-muted-foreground">--</span>
                    )}
                </span>
            ),
            filterFn: (row, _columnId, filterValue) => {
                const name = (row.original.name ?? '').toLowerCase()
                return name.includes(filterValue.toLowerCase())
            },
        },
        {
            accessorKey: 'email',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Email" />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.email}</span>
            ),
        },
        {
            id: 'role',
            header: 'Role',
            cell: ({ row }) => {
                const role = row.original.neonRole
                return (
                    <Badge
                        variant={role === 'admin' ? 'default' : 'secondary'}
                        className="capitalize"
                    >
                        {role || 'user'}
                    </Badge>
                )
            },
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => {
                if (row.original.banned) {
                    return (
                        <Badge variant="destructive" className="gap-1">
                            <Ban className="h-3 w-3" />
                            Banned
                        </Badge>
                    )
                }
                return <Badge variant="outline">Active</Badge>
            },
        },
        {
            id: 'linkedBeneficiary',
            header: 'Linked Beneficiary',
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.beneficiaryName || (
                        <span className="text-muted-foreground">--</span>
                    )}
                </span>
            ),
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
                const user = row.original
                const isSelf = user.id === ownerCheck?.userId

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => openEditDialog(user)}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            {!isSelf && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() => openRoleDialog(user)}
                                    >
                                        <Shield className="mr-2 h-4 w-4" />
                                        Change Role
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => openResetDialog(user)}
                                    >
                                        <KeyRound className="mr-2 h-4 w-4" />
                                        Reset Password
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => openRevokeDialog(user)}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Revoke Sessions
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {user.banned ? (
                                        <DropdownMenuItem
                                            onClick={() =>
                                                unbanUserMutation.mutate({
                                                    userId: user.id,
                                                })
                                            }
                                        >
                                            <Ban className="mr-2 h-4 w-4" />
                                            Unban
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem
                                            onClick={() => openBanDialog(user)}
                                        >
                                            <Ban className="mr-2 h-4 w-4" />
                                            Ban
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => openDeleteDialog(user)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    // ==========================================================================
    // Read-only columns for non-owner admins
    // ==========================================================================
    const readOnlyColumns: ColumnDef<NeonAuthUser>[] = ownerColumns.filter(
        (c) => c.id !== 'actions',
    )

    // Adapt provisioned users to NeonAuthUser shape for non-owner view
    const readOnlyData: NeonAuthUser[] = useMemo(
        () =>
            provisionedUsers.map((u) => ({
                id: u.userId,
                name:
                    [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
                email: u.beneficiaryEmail ?? '',
                emailVerified: true,
                createdAt: u.createdAt ?? '',
                neonRole: 'user',
                banned: false,
                appRole: u.role,
                beneficiaryId: u.beneficiaryId,
                beneficiaryName:
                    [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
            })),
        [provisionedUsers],
    )

    const loading = isOwner ? usersLoading : provisionedLoading
    const tableData = isOwner ? (allUsers as NeonAuthUser[]) : readOnlyData
    const columns = isOwner ? ownerColumns : readOnlyColumns
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
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Portal Account
                    </Button>
                )}
            </div>

            {/* Non-owner info banner */}
            {!isOwner && !loading && (
                <div className="rounded-md border border-muted bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                    User management is restricted to the trust owner. You are
                    viewing provisioned accounts in read-only mode.
                </div>
            )}

            {/* Error state */}
            {usersError && isOwner && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    Failed to load users: {usersError.message}
                </div>
            )}

            {/* User List */}
            <Card>
                <CardContent className="pt-6">
                    <DataTable
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

            {/* ================================================================ */}
            {/* Create Portal Account Dialog                                     */}
            {/* ================================================================ */}
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
                            Provision a portal login for a beneficiary.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
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

            {/* ================================================================ */}
            {/* Created Credentials Dialog                                       */}
            {/* ================================================================ */}
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

            {/* ================================================================ */}
            {/* Edit User Dialog                                                 */}
            {/* ================================================================ */}
            <Dialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                    setEditDialogOpen(open)
                    if (!open) setSelectedUser(null)
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5" />
                            Edit User
                        </DialogTitle>
                        <DialogDescription>
                            Update details for {displayName(selectedUser)}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editName">Name</Label>
                            <Input
                                id="editName"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Full name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editEmail">Email</Label>
                            <Input
                                id="editEmail"
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setEditDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (!selectedUser) return
                                    updateUserMutation.mutate({
                                        userId: selectedUser.id,
                                        ...(editName !==
                                        (selectedUser.name ?? '')
                                            ? { name: editName }
                                            : {}),
                                        ...(editEmail !== selectedUser.email
                                            ? { email: editEmail }
                                            : {}),
                                    })
                                }}
                                disabled={
                                    updateUserMutation.isPending ||
                                    (editName === (selectedUser?.name ?? '') &&
                                        editEmail === selectedUser?.email)
                                }
                            >
                                {updateUserMutation.isPending
                                    ? 'Saving...'
                                    : 'Save'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ================================================================ */}
            {/* Change Role Dialog                                               */}
            {/* ================================================================ */}
            <Dialog
                open={roleDialogOpen}
                onOpenChange={(open) => {
                    setRoleDialogOpen(open)
                    if (!open) setSelectedUser(null)
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Change Role
                        </DialogTitle>
                        <DialogDescription>
                            Change role for {displayName(selectedUser)}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                                value={newRole}
                                onValueChange={(v) =>
                                    setNewRole(v as 'admin' | 'user')
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="user">
                                        User (Beneficiary)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setRoleDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (!selectedUser) return
                                    setRoleMutation.mutate({
                                        userId: selectedUser.id,
                                        role: newRole,
                                    })
                                }}
                                disabled={setRoleMutation.isPending}
                            >
                                {setRoleMutation.isPending
                                    ? 'Updating...'
                                    : 'Update Role'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ================================================================ */}
            {/* Reset Password Dialog                                            */}
            {/* ================================================================ */}
            <Dialog
                open={resetDialogOpen}
                onOpenChange={(open) => {
                    setResetDialogOpen(open)
                    if (!open) {
                        setSelectedUser(null)
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
                            Set a new password for {displayName(selectedUser)}.
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
                                onClick={() => {
                                    if (!selectedUser) return
                                    resetPasswordMutation.mutate({
                                        userId: selectedUser.id,
                                        newPassword,
                                    })
                                }}
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

            {/* ================================================================ */}
            {/* Ban User Dialog                                                  */}
            {/* ================================================================ */}
            <Dialog
                open={banDialogOpen}
                onOpenChange={(open) => {
                    setBanDialogOpen(open)
                    if (!open) {
                        setSelectedUser(null)
                        setBanReason('')
                    }
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ban className="h-5 w-5" />
                            Ban User
                        </DialogTitle>
                        <DialogDescription>
                            Ban {displayName(selectedUser)} from accessing the
                            application.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="banReason">Reason (optional)</Label>
                            <Input
                                id="banReason"
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Reason for ban..."
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setBanDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (!selectedUser) return
                                    banUserMutation.mutate({
                                        userId: selectedUser.id,
                                        banReason: banReason || undefined,
                                    })
                                }}
                                disabled={banUserMutation.isPending}
                            >
                                {banUserMutation.isPending
                                    ? 'Banning...'
                                    : 'Ban User'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ================================================================ */}
            {/* Delete Confirmation                                              */}
            {/* ================================================================ */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open)
                    if (!open) setSelectedUser(null)
                }}
                title="Delete User"
                description={`Are you sure you want to permanently delete ${displayName(selectedUser)}? This will remove them from both the application and Neon Auth. This action cannot be undone.`}
                confirmText="Delete"
                variant="destructive"
                isLoading={removeUserMutation.isPending}
                onConfirm={() => {
                    if (!selectedUser) return
                    removeUserMutation.mutate({ userId: selectedUser.id })
                }}
            />

            {/* ================================================================ */}
            {/* Revoke Sessions Confirmation                                     */}
            {/* ================================================================ */}
            <ConfirmDialog
                open={revokeDialogOpen}
                onOpenChange={(open) => {
                    setRevokeDialogOpen(open)
                    if (!open) setSelectedUser(null)
                }}
                title="Revoke All Sessions"
                description={`This will force ${displayName(selectedUser)} to log out from all devices. They will need to sign in again.`}
                confirmText="Revoke Sessions"
                isLoading={revokeSessionsMutation.isPending}
                onConfirm={() => {
                    if (!selectedUser) return
                    revokeSessionsMutation.mutate({ userId: selectedUser.id })
                }}
            />
        </div>
    )
}
