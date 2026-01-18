import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export interface ResourceDialogProps<_T> {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    children: React.ReactNode
    onSubmit: () => void | Promise<void>
    submitLabel?: string
    isLoading?: boolean
}

/**
 * Generic dialog wrapper for resource create/edit forms
 *
 * @example
 * ```typescript
 * type Liability = {
 *   creditor: string
 *   amount: number
 * }
 *
 * const { isOpen, open, close, form, setForm, handleEdit, handleAdd, handleSave } =
 *   useResourceForm<Liability>({ creditor: "", amount: 0 })
 *
 * <ResourceDialog
 *   open={isOpen}
 *   onOpenChange={close}
 *   title="Add Liability"
 *   onSubmit={handleSave}
 * >
 *   <div className="space-y-4">
 *     <Input
 *       value={form.creditor}
 *       onChange={(e) => setForm({ ...form, creditor: e.target.value })}
 *     />
 *   </div>
 * </ResourceDialog>
 * ```
 */
export function ResourceDialog<T>({
    open,
    onOpenChange,
    title,
    children,
    onSubmit,
    submitLabel = 'Save',
    isLoading = false,
}: ResourceDialogProps<T>) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {children}
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            submitLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
