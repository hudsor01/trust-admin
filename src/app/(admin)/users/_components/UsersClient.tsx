'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
    Ban,
    KeyRound,
    LogOut,
    MoreHorizontal,
    Pencil,
    Shield,
    Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { userRole } from '@/db/schema'
import { trpc } from '@/lib/trpc'
import { formatDate } from '@/utils/formatters'
import { BanUserDialog } from './BanUserDialog'
import { type AppRoleOption, ChangeRoleDialog } from './ChangeRoleDialog'
import { CreatedCredentialsDialog } from './CreatedCredentialsDialog'
import { CreatePortalAccountDialog } from './CreatePortalAccountDialog'
import { EditUserDialog } from './EditUserDialog'
import { ResetPasswordDialog } from './ResetPasswordDialog'
import type { NeonAuthUser } from './types'
import { UsersTable } from './UsersTable'

export function UsersClient() {
    const utils = trpc.useUtils()

    const { data: ownerCheck } = trpc.userManagement.isOwner.useQuery()
    const isOwner = ownerCheck?.isOwner ?? false

    const {
        data: allUsers = [],
        isLoading: usersLoading,
        error: usersError,
    } = trpc.userManagement.listAllUsers.useQuery()

    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [roleDialogOpen, setRoleDialogOpen] = useState(false)
    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [banDialogOpen, setBanDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)

    const [selectedUser, setSelectedUser] = useState<NeonAuthUser | null>(null)

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [tempPassword, setTempPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const [editName, setEditName] = useState('')
    const [editEmail, setEditEmail] = useState('')

    const [newRole, setNewRole] = useState<AppRoleOption>('beneficiary')

    const [newPassword, setNewPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)

    const [banReason, setBanReason] = useState('')

    const [createdCredentials, setCreatedCredentials] = useState<{
        email: string
        tempPassword: string
    } | null>(null)

    const invalidateUsers = () => {
        utils.userManagement.listAllUsers.invalidate()
    }

    const createUserMutation =
        trpc.userManagement.createPortalAccount.useMutation({
            onSuccess: (_data, variables) => {
                invalidateUsers()
                setCreateDialogOpen(false)
                setCreatedCredentials({
                    email: variables.email,
                    tempPassword: variables.tempPassword,
                })
                setFirstName('')
                setLastName('')
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
            toast.success('Portal account deleted')
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

    const handleCreateSubmit = () => {
        if (
            !firstName.trim() ||
            !lastName.trim() ||
            !email ||
            tempPassword.length < 8
        )
            return
        createUserMutation.mutate({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
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
        const current = user.appRole ?? 'beneficiary'
        // Validate against the live pgEnum so a future role added to schema.ts
        // is automatically accepted here without touching this file.
        const isAssignable = (
            userRole.enumValues as readonly string[]
        ).includes(current)
        setNewRole(isAssignable ? (current as AppRoleOption) : 'beneficiary')
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
                const role = row.original.appRole ?? 'user'
                // admin = filled (highest privilege), trustee/arbiter = outlined
                // (trust admin without user mgmt), beneficiary/user = muted.
                const variant: 'default' | 'outline' | 'secondary' =
                    role === 'admin'
                        ? 'default'
                        : role === 'trustee' || role === 'arbiter'
                          ? 'outline'
                          : 'secondary'
                return (
                    <Badge variant={variant} className="capitalize">
                        {role}
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

    const readOnlyColumns: ColumnDef<NeonAuthUser>[] = ownerColumns.filter(
        (c) => c.id !== 'actions',
    )

    const loading = usersLoading
    const tableData = allUsers as NeonAuthUser[]
    const columns = isOwner ? ownerColumns : readOnlyColumns

    return (
        <div className="space-y-6">
            <UsersTable
                isOwner={isOwner}
                loading={loading}
                tableData={tableData}
                columns={columns}
                usersError={usersError}
                onCreateClick={() => setCreateDialogOpen(true)}
            />

            <CreatePortalAccountDialog
                open={createDialogOpen}
                onOpenChange={(open) => {
                    setCreateDialogOpen(open)
                    if (!open) {
                        setFirstName('')
                        setLastName('')
                        setEmail('')
                        setTempPassword('')
                        setShowPassword(false)
                    }
                }}
                firstName={firstName}
                lastName={lastName}
                email={email}
                tempPassword={tempPassword}
                showPassword={showPassword}
                isPending={createUserMutation.isPending}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
                onEmailChange={setEmail}
                onTempPasswordChange={setTempPassword}
                onShowPasswordToggle={() => setShowPassword((p) => !p)}
                onSubmit={handleCreateSubmit}
            />

            <CreatedCredentialsDialog
                credentials={createdCredentials}
                onClose={() => setCreatedCredentials(null)}
            />

            <EditUserDialog
                open={editDialogOpen}
                onOpenChange={(open) => {
                    setEditDialogOpen(open)
                    if (!open) setSelectedUser(null)
                }}
                selectedUser={selectedUser}
                editName={editName}
                editEmail={editEmail}
                isPending={updateUserMutation.isPending}
                onNameChange={setEditName}
                onEmailChange={setEditEmail}
                onSave={() => {
                    if (!selectedUser) return
                    updateUserMutation.mutate({
                        userId: selectedUser.id,
                        ...(editName !== (selectedUser.name ?? '')
                            ? { name: editName }
                            : {}),
                        ...(editEmail !== selectedUser.email
                            ? { email: editEmail }
                            : {}),
                    })
                }}
            />

            <ChangeRoleDialog
                open={roleDialogOpen}
                onOpenChange={(open) => {
                    setRoleDialogOpen(open)
                    if (!open) setSelectedUser(null)
                }}
                selectedUser={selectedUser}
                newRole={newRole}
                isPending={setRoleMutation.isPending}
                onRoleChange={setNewRole}
                onSave={() => {
                    if (!selectedUser) return
                    setRoleMutation.mutate({
                        userId: selectedUser.id,
                        role: newRole,
                    })
                }}
            />

            <ResetPasswordDialog
                open={resetDialogOpen}
                onOpenChange={(open) => {
                    setResetDialogOpen(open)
                    if (!open) {
                        setSelectedUser(null)
                        setNewPassword('')
                        setShowNewPassword(false)
                    }
                }}
                selectedUser={selectedUser}
                newPassword={newPassword}
                showNewPassword={showNewPassword}
                isPending={resetPasswordMutation.isPending}
                onPasswordChange={setNewPassword}
                onShowPasswordToggle={() => setShowNewPassword((p) => !p)}
                onSave={() => {
                    if (!selectedUser) return
                    resetPasswordMutation.mutate({
                        userId: selectedUser.id,
                        newPassword,
                    })
                }}
            />

            <BanUserDialog
                open={banDialogOpen}
                onOpenChange={(open) => {
                    setBanDialogOpen(open)
                    if (!open) {
                        setSelectedUser(null)
                        setBanReason('')
                    }
                }}
                selectedUser={selectedUser}
                banReason={banReason}
                isPending={banUserMutation.isPending}
                onBanReasonChange={setBanReason}
                onBan={() => {
                    if (!selectedUser) return
                    banUserMutation.mutate({
                        userId: selectedUser.id,
                        banReason: banReason || undefined,
                    })
                }}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open)
                    if (!open) setSelectedUser(null)
                }}
                title="Delete Portal Account"
                description={`This will permanently remove ${displayName(selectedUser)}'s login credentials and portal access. Their beneficiary record and trust history (distributions, HEMS requests) are preserved in the trust records. This action cannot be undone.`}
                confirmText="Delete"
                variant="destructive"
                isLoading={removeUserMutation.isPending}
                onConfirm={() => {
                    if (!selectedUser) return
                    removeUserMutation.mutate({ userId: selectedUser.id })
                }}
            />

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
