/**
 * Confirm Dialog Component
 *
 * A reusable confirmation dialog for destructive actions.
 * Wraps AlertDialog primitives for common use cases.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Delete Beneficiary"
 *   description="This action cannot be undone."
 *   onConfirm={handleDelete}
 *   variant="destructive"
 * />
 * ```
 */
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog'
import { buttonVariants } from './ui/button'

interface ConfirmDialogProps {
    /** Dialog open state (controlled) */
    open?: boolean
    /** Callback when open state changes */
    onOpenChange?: (open: boolean) => void
    /** Dialog title */
    title: string
    /** Dialog description */
    description: string
    /** Text for the confirm button */
    confirmText?: string
    /** Text for the cancel button */
    cancelText?: string
    /** Callback when user confirms */
    onConfirm: () => void | Promise<void>
    /** Callback when user cancels */
    onCancel?: () => void
    /** Button variant for confirm action */
    variant?: 'default' | 'destructive'
    /** Optional trigger element (if not using controlled open state) */
    trigger?: React.ReactNode
    /** Whether the confirm action is loading */
    isLoading?: boolean
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'default',
    trigger,
    isLoading = false,
}: ConfirmDialogProps) {
    const [internalLoading, setInternalLoading] = useState(false)
    const loading = isLoading || internalLoading

    const handleConfirm = async () => {
        try {
            setInternalLoading(true)
            await onConfirm()
            onOpenChange?.(false)
        } finally {
            setInternalLoading(false)
        }
    }

    const handleCancel = () => {
        onCancel?.()
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger && (
                <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            )}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={loading}
                        className={cn(
                            variant === 'destructive' &&
                                buttonVariants({ variant: 'destructive' }),
                        )}
                    >
                        {loading ? 'Please wait...' : confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

/**
 * Hook for managing confirm dialog state
 *
 * @example
 * ```tsx
 * const { dialogProps, confirm, isOpen } = useConfirmDialog({
 *   title: 'Delete Item',
 *   description: 'Are you sure?',
 *   onConfirm: async () => { await deleteItem() },
 * })
 *
 * return (
 *   <>
 *     <Button onClick={confirm}>Delete</Button>
 *     <ConfirmDialog {...dialogProps} />
 *   </>
 * )
 * ```
 */
export function useConfirmDialog(
    config: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>,
) {
    const [open, setOpen] = useState(false)

    return {
        dialogProps: {
            ...config,
            open,
            onOpenChange: setOpen,
        },
        confirm: () => setOpen(true),
        isOpen: open,
        close: () => setOpen(false),
    }
}

/**
 * Delete confirmation dialog preset
 *
 * Pre-configured for delete operations with destructive styling.
 */
export function DeleteConfirmDialog({
    itemName,
    onConfirm,
    ...props
}: {
    itemName: string
    onConfirm: () => void | Promise<void>
} & Partial<Omit<ConfirmDialogProps, 'title' | 'description' | 'onConfirm'>>) {
    return (
        <ConfirmDialog
            title={`Delete ${itemName}`}
            description={`Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`}
            confirmText="Delete"
            variant="destructive"
            onConfirm={onConfirm}
            {...props}
        />
    )
}
