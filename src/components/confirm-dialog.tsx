/** Confirmation dialog for destructive actions, wrapping AlertDialog primitives. */
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
    open?: boolean
    onOpenChange?: (open: boolean) => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
    variant?: 'default' | 'destructive'
    /** Uncontrolled mode: renders a trigger element that opens the dialog on click. */
    trigger?: React.ReactNode
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

/** Manages open/close state; spread `dialogProps` onto `<ConfirmDialog>` and call `confirm()` to open. */
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
