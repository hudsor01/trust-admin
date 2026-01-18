'use client'

/**
 * Bulk Entry Table Component
 *
 * Spreadsheet-style bulk entry table for rapidly entering multiple liabilities at once.
 * Features:
 * - Tab through cells, Enter to add rows
 * - Paste from Excel/Google Sheets
 * - Per-row validation with inline error display
 * - Type-aware column visibility
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    enumToOptions,
    LIABILITY_TYPE_VALUES,
    type LiabilityType,
} from '@/lib/type-utils'
import { cn } from '@/lib/utils'

// Derive options from schema enums (single source of truth)
const LIABILITY_TYPES = enumToOptions(LIABILITY_TYPE_VALUES)

// Row schema matching liability requirements
const bulkLiabilityRowSchema = z.object({
    liabilityType: z.enum(LIABILITY_TYPE_VALUES),
    creditor: z.string().min(1, 'Required'),
    currentBalance: z
        .string()
        .min(1, 'Required')
        .regex(/^[\d,]+\.?\d*$/, 'Invalid amount'),
    interestRate: z.string().optional(),
    monthlyPayment: z.string().optional(),
    // Loan term fields (mortgage/loan only)
    loanTermMonths: z.string().optional(),
    escrowMonthly: z.string().optional(),
})

const bulkEntrySchema = z.object({
    liabilities: z.array(bulkLiabilityRowSchema).min(1),
})

export type BulkLiabilityRow = z.infer<typeof bulkLiabilityRowSchema>
type BulkEntryForm = z.infer<typeof bulkEntrySchema>

// Revolving credit types don't have fixed terms
const isRevolvingType = (type: string) => type === 'CREDIT_CARD'

// Loan types have amortization-specific fields
const hasLoanTermFields = (type: string) =>
    type === 'MORTGAGE' || type === 'LOAN'

function createEmptyRow(): BulkLiabilityRow {
    return {
        liabilityType: 'MORTGAGE',
        creditor: '',
        currentBalance: '',
        interestRate: '',
        monthlyPayment: '',
        loanTermMonths: '',
        escrowMonthly: '',
    }
}

// Map common type strings to enum values for paste handling
function mapPastedType(type: string | undefined): LiabilityType | null {
    if (!type) return null
    const lower = type.toLowerCase().trim()
    if (lower.includes('mortgage')) return 'MORTGAGE'
    if (lower.includes('loan') && !lower.includes('card')) return 'LOAN'
    if (lower.includes('credit') || lower.includes('card')) return 'CREDIT_CARD'
    if (lower.includes('tax')) return 'TAX_OWED'
    if (lower.includes('payable')) return 'ACCOUNTS_PAYABLE'
    if (lower.includes('judgment') || lower.includes('legal'))
        return 'LEGAL_JUDGMENT'
    return 'OTHER'
}

interface BulkEntryTableProps {
    onSave: (rows: BulkLiabilityRow[]) => Promise<void>
    onCancel: () => void
    isLoading?: boolean
}

export function BulkEntryTable({
    onSave,
    onCancel,
    isLoading,
}: BulkEntryTableProps) {
    const tableRef = useRef<HTMLTableElement>(null)
    const [pendingFocusRow, setPendingFocusRow] = useState<number | null>(null)

    const form = useForm<BulkEntryForm>({
        resolver: zodResolver(bulkEntrySchema),
        mode: 'onBlur',
        defaultValues: {
            liabilities: [createEmptyRow()],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'liabilities',
    })

    // Watch first row's type to control column visibility for all rows
    const firstRowType = useWatch({
        control: form.control,
        name: 'liabilities.0.liabilityType',
    })

    const showLoanTermFields = hasLoanTermFields(firstRowType || 'MORTGAGE')
    const isRevolving = isRevolvingType(firstRowType || 'MORTGAGE')

    // Column count for keyboard navigation (depends on loan term fields)
    const colCount = useMemo(
        () => (showLoanTermFields ? 7 : 5),
        [showLoanTermFields],
    )

    // Focus a specific cell by row and column
    const focusCell = useCallback(
        (row: number, col: number) => {
            if (row < 0 || row >= fields.length) return
            const cell = tableRef.current?.querySelector(
                `[data-row="${row}"][data-col="${col}"]`,
            )
            const input = cell?.querySelector(
                'input',
            ) as HTMLInputElement | null
            if (input) {
                input.focus()
                input.select()
            }
        },
        [fields.length],
    )

    // Focus new row after render
    useEffect(() => {
        if (pendingFocusRow !== null && pendingFocusRow < fields.length) {
            // Focus creditor column (col 1, skip type dropdown)
            focusCell(pendingFocusRow, 1)
            setPendingFocusRow(null)
        }
    }, [fields.length, pendingFocusRow, focusCell])

    // Keyboard navigation handler
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
            if (e.key === 'Tab' && !e.shiftKey && colIdx === colCount - 1) {
                // Tab on last column - move to first editable column of next row
                e.preventDefault()
                if (rowIdx === fields.length - 1) {
                    // Last row - add new row and focus it
                    append(createEmptyRow())
                    setPendingFocusRow(fields.length)
                } else {
                    focusCell(rowIdx + 1, 1)
                }
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (rowIdx === fields.length - 1) {
                    append(createEmptyRow())
                    setPendingFocusRow(fields.length)
                } else {
                    focusCell(rowIdx + 1, colIdx)
                }
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                focusCell(rowIdx + 1, colIdx)
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault()
                focusCell(rowIdx - 1, colIdx)
            }
        },
        [fields.length, colCount, append, focusCell],
    )

    // Clipboard paste handler
    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            const text = e.clipboardData.getData('text/plain')
            if (!text) return

            // Excel/Sheets use tab for columns, newline for rows
            const rows = text
                .split('\n')
                .filter((row) => row.trim())
                .map((row) => row.split('\t'))

            if (rows.length === 0) return

            // Only prevent default if we have valid tabular data
            if (rows.some((row) => row.length > 1)) {
                e.preventDefault()

                // Map pasted data to liability rows
                // Assumes column order: Type, Creditor, Balance, Rate, Payment
                let addedCount = 0
                for (const [type, creditor, balance, rate, payment] of rows) {
                    const liabilityType = mapPastedType(type) || 'OTHER'
                    if (creditor?.trim() || balance?.trim()) {
                        append({
                            liabilityType,
                            creditor: creditor?.trim() || '',
                            currentBalance:
                                balance?.replace(/[$,]/g, '').trim() || '',
                            interestRate: rate?.replace(/%/g, '').trim() || '',
                            monthlyPayment:
                                payment?.replace(/[$,]/g, '').trim() || '',
                            loanTermMonths: '',
                            escrowMonthly: '',
                        })
                        addedCount++
                    }
                }

                if (addedCount > 0) {
                    toast.success(`Pasted ${addedCount} rows`)
                }
            }
        },
        [append],
    )

    // Add row with focus
    const addRowWithFocus = useCallback(() => {
        append(createEmptyRow())
        setPendingFocusRow(fields.length)
    }, [append, fields.length])

    const handleSubmit = form.handleSubmit(async (data) => {
        await onSave(data.liabilities)
    })

    return (
        <div className="space-y-4">
            <div
                className="overflow-x-auto border rounded-lg"
                onPaste={handlePaste}
            >
                <table ref={tableRef} className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium w-32">
                                Type
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                                Creditor *
                            </th>
                            <th className="px-3 py-2 text-right font-medium w-32">
                                Balance *
                            </th>
                            <th className="px-3 py-2 text-right font-medium w-24">
                                {isRevolving ? 'APR (%)' : 'Rate (%)'}
                            </th>
                            <th className="px-3 py-2 text-right font-medium w-32">
                                {isRevolving
                                    ? 'Min Payment'
                                    : 'Monthly Payment'}
                            </th>
                            {showLoanTermFields && (
                                <>
                                    <th className="px-3 py-2 text-right font-medium w-24">
                                        Term (mo)
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium w-28">
                                        Escrow
                                    </th>
                                </>
                            )}
                            <th className="px-3 py-2 w-10" />
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => (
                            <BulkEntryRow
                                key={field.id}
                                index={index}
                                form={form}
                                onRemove={() => remove(index)}
                                showLoanTermFields={showLoanTermFields}
                                isRevolving={isRevolving}
                                onKeyDown={handleKeyDown}
                                canRemove={fields.length > 1}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between">
                <Button variant="outline" onClick={addRowWithFocus}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        Save All ({fields.length})
                    </Button>
                </div>
            </div>
        </div>
    )
}

// =============================================================================
// BULK ENTRY ROW COMPONENT
// =============================================================================

interface BulkEntryRowProps {
    index: number
    // biome-ignore lint/suspicious/noExplicitAny: React Hook Form complex generics
    form: any
    onRemove: () => void
    showLoanTermFields: boolean
    isRevolving: boolean
    onKeyDown: (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => void
    canRemove: boolean
}

function BulkEntryRow({
    index,
    form,
    onRemove,
    showLoanTermFields,
    isRevolving,
    onKeyDown,
    canRemove,
}: BulkEntryRowProps) {
    const {
        register,
        formState: { errors },
        setValue,
        watch,
    } = form
    const rowErrors = errors.liabilities?.[index]
    const liabilityType = watch(`liabilities.${index}.liabilityType`)

    return (
        <tr className="border-t hover:bg-muted/30">
            {/* Type column */}
            <td className="px-1 py-1" data-row={index} data-col={0}>
                <Select
                    value={liabilityType}
                    onValueChange={(v) =>
                        setValue(`liabilities.${index}.liabilityType`, v)
                    }
                >
                    <SelectTrigger className="h-8 text-xs border-0 shadow-none focus:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LIABILITY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>

            {/* Creditor column */}
            <td className="px-1 py-1" data-row={index} data-col={1}>
                <Input
                    {...register(`liabilities.${index}.creditor`)}
                    className={cn(
                        'h-8 text-xs border-0 shadow-none focus:ring-1',
                        rowErrors?.creditor && 'ring-1 ring-destructive',
                    )}
                    placeholder="Creditor name"
                    onKeyDown={(e) => onKeyDown(e, index, 1)}
                />
            </td>

            {/* Balance column */}
            <td className="px-1 py-1" data-row={index} data-col={2}>
                <Input
                    {...register(`liabilities.${index}.currentBalance`)}
                    className={cn(
                        'h-8 text-xs text-right border-0 shadow-none focus:ring-1',
                        rowErrors?.currentBalance && 'ring-1 ring-destructive',
                    )}
                    placeholder="0.00"
                    onKeyDown={(e) => onKeyDown(e, index, 2)}
                />
            </td>

            {/* Rate column */}
            <td className="px-1 py-1" data-row={index} data-col={3}>
                <Input
                    {...register(`liabilities.${index}.interestRate`)}
                    className="h-8 text-xs text-right border-0 shadow-none focus:ring-1"
                    placeholder={isRevolving ? '24.99' : '4.5'}
                    onKeyDown={(e) => onKeyDown(e, index, 3)}
                />
            </td>

            {/* Monthly Payment column */}
            <td className="px-1 py-1" data-row={index} data-col={4}>
                <Input
                    {...register(`liabilities.${index}.monthlyPayment`)}
                    className="h-8 text-xs text-right border-0 shadow-none focus:ring-1"
                    placeholder="0.00"
                    onKeyDown={(e) => onKeyDown(e, index, 4)}
                />
            </td>

            {/* Loan term columns (conditional) */}
            {showLoanTermFields && (
                <>
                    <td className="px-1 py-1" data-row={index} data-col={5}>
                        <Input
                            {...register(`liabilities.${index}.loanTermMonths`)}
                            className="h-8 text-xs text-right border-0 shadow-none focus:ring-1"
                            placeholder="360"
                            onKeyDown={(e) => onKeyDown(e, index, 5)}
                        />
                    </td>
                    <td className="px-1 py-1" data-row={index} data-col={6}>
                        <Input
                            {...register(`liabilities.${index}.escrowMonthly`)}
                            className="h-8 text-xs text-right border-0 shadow-none focus:ring-1"
                            placeholder="0.00"
                            onKeyDown={(e) => onKeyDown(e, index, 6)}
                        />
                    </td>
                </>
            )}

            {/* Delete button column */}
            <td className="px-1 py-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={onRemove}
                    disabled={!canRemove}
                    type="button"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </td>
        </tr>
    )
}
