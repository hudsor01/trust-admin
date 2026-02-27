'use client'

import { FileText, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AccountingHeaderProps {
    generatingReport: boolean
    onGenerateReport: () => void
    onAddEntry: () => void
}

export function AccountingHeader({
    generatingReport,
    onGenerateReport,
    onAddEntry,
}: AccountingHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight text-balance">
                    Trust Accounting
                </h2>
                <p className="text-sm text-muted-foreground">
                    Texas Property Code § 113.152 compliant accounting
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    onClick={onGenerateReport}
                    disabled={generatingReport}
                >
                    {generatingReport ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileText className="mr-2 h-4 w-4" />
                    )}
                    Export Report
                </Button>
                <Button onClick={onAddEntry}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Entry
                </Button>
            </div>
        </div>
    )
}
