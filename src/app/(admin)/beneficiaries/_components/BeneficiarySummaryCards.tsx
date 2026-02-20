'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/utils/formatters'

interface BeneficiarySummaryCardsProps {
    totalShares: string
    informedCount: number
    releaseSignedCount: number
    totalDistributed: string
    totalBeneficiaries: number
}

export function BeneficiarySummaryCards({
    totalShares,
    informedCount,
    releaseSignedCount,
    totalDistributed,
    totalBeneficiaries,
}: BeneficiarySummaryCardsProps) {
    return (
        <div className="@container">
            <div className="grid gap-4 @xs:grid-cols-2 @lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Total Shares
                        </p>
                        <p className="mt-2 text-2xl font-bold">
                            {totalShares}%
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Notified
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                            <p className="text-2xl font-bold">
                                {informedCount}/{totalBeneficiaries}
                            </p>
                            <Progress
                                value={
                                    totalBeneficiaries > 0
                                        ? (informedCount / totalBeneficiaries) *
                                          100
                                        : 0
                                }
                                className="w-20"
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Releases Signed
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                            <p className="text-2xl font-bold">
                                {releaseSignedCount}/{totalBeneficiaries}
                            </p>
                            <Progress
                                value={
                                    totalBeneficiaries > 0
                                        ? (releaseSignedCount /
                                              totalBeneficiaries) *
                                          100
                                        : 0
                                }
                                className="w-20 [&>div]:bg-success"
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Distributed
                        </p>
                        <p className="mt-2 text-2xl font-bold text-success">
                            {formatCurrency(totalDistributed)}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
