'use client'

import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// PERF: Lazy load heavy chart components (recharts ~100KB gzipped)
// Charts are below the fold, so this reduces initial bundle significantly
const AssetAllocationChart = dynamic(
    () =>
        import('@/components/charts/asset-allocation-chart').then(
            (m) => m.AssetAllocationChart,
        ),
    {
        loading: () => (
            <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ),
        ssr: false,
    },
)

const NetWorthChart = dynamic(
    () =>
        import('@/components/charts/net-worth-chart').then(
            (m) => m.NetWorthChart,
        ),
    {
        loading: () => (
            <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ),
        ssr: false,
    },
)

interface AllocationDataItem {
    name: string
    value: number
    fill: string
    [key: string]: string | number
}

interface FinancialChartsProps {
    totalAssets: string
    totalLiabilities: string
    assetAllocationData: AllocationDataItem[]
}

export function FinancialCharts({
    totalAssets,
    totalLiabilities,
    assetAllocationData,
}: FinancialChartsProps) {
    return (
        <div className="@container">
            <div className="grid gap-6 @md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Net Worth</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <NetWorthChart
                            totalAssets={totalAssets}
                            totalLiabilities={totalLiabilities}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Asset Allocation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AssetAllocationChart data={assetAllocationData} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
