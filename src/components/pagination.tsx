import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface PaginationProps {
    currentPage: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
    disabled?: boolean
}

/**
 * Pagination controls with prev/next buttons and page info
 *
 * @param currentPage - Current page number (1-indexed)
 * @param pageSize - Number of items per page
 * @param totalCount - Total number of items
 * @param onPageChange - Callback when page changes
 * @param disabled - Disable all buttons (during loading)
 *
 * @example
 * ```typescript
 * <Pagination
 *   currentPage={page}
 *   pageSize={20}
 *   totalCount={totalCount}
 *   onPageChange={(newPage) => setPage(newPage)}
 *   disabled={loading}
 * />
 * ```
 */
export function Pagination({
    currentPage,
    pageSize,
    totalCount,
    onPageChange,
    disabled = false,
}: PaginationProps) {
    const totalPages = Math.ceil(totalCount / pageSize)
    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalCount)

    const canGoPrevious = currentPage > 1
    const canGoNext = currentPage < totalPages

    return (
        <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
                Showing {startItem} to {endItem} of {totalCount} results
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canGoPrevious || disabled}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                </Button>
                <div className="text-sm">
                    Page {currentPage} of {totalPages}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canGoNext || disabled}
                >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
    )
}
