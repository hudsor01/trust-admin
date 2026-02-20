'use client'

import { FileText, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface Entity {
    id: number
    name: string
}

interface AccountingHeaderProps {
    entities: Entity[]
    selectedEntity: number | undefined
    generatingReport: boolean
    onEntityChange: (newEntityId: string) => void
    onGenerateReport: () => void
    onAddEntry: () => void
}

export function AccountingHeader({
    entities,
    selectedEntity,
    generatingReport,
    onEntityChange,
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
                <Select
                    value={selectedEntity?.toString() ?? ''}
                    onValueChange={onEntityChange}
                >
                    <SelectTrigger className="w-62.5">
                        <SelectValue placeholder="Select Trust" />
                    </SelectTrigger>
                    <SelectContent>
                        {entities.map((e) => (
                            <SelectItem key={e.id} value={e.id.toString()}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    onClick={onGenerateReport}
                    disabled={generatingReport || !selectedEntity}
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
