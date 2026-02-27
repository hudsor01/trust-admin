import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-80 w-full rounded-lg" />
        </div>
    )
}
