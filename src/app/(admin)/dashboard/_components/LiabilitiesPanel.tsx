'use client'

import Link from 'next/link'
import { LiabilityProgressCard } from '@/components/liability-progress-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Liability } from '@/db/schema'
import { subtractMoney } from '@/lib/money'
import { formatCurrency } from '@/utils/formatters'

interface LiabilitiesPanelProps {
    activeLiabilities: Liability[]
    totalLiabilities: string
    totalOriginalLiabilities: string
    liabilityPayoffPercent: number
}

export function LiabilitiesPanel({
    activeLiabilities,
    totalLiabilities,
    totalOriginalLiabilities,
    liabilityPayoffPercent,
}: LiabilitiesPanelProps) {
    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="@container">
                <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                Total Owed
                            </p>
                            <p className="text-2xl font-semibold mb-1">
                                {formatCurrency(totalLiabilities)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {activeLiabilities.length} active{' '}
                                {activeLiabilities.length === 1
                                    ? 'liability'
                                    : 'liabilities'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                Original Total
                            </p>
                            <p className="text-2xl font-semibold mb-1">
                                {formatCurrency(totalOriginalLiabilities)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Combined original amounts
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                Overall Progress
                            </p>
                            <div className="flex items-center gap-3">
                                <Progress
                                    value={liabilityPayoffPercent}
                                    className="h-2 flex-1"
                                />
                                <span className="text-lg font-semibold">
                                    {liabilityPayoffPercent}%
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                paid off
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                                Amount Paid
                            </p>
                            <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-1">
                                {formatCurrency(
                                    subtractMoney(
                                        totalOriginalLiabilities,
                                        totalLiabilities,
                                    ),
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                since inception
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Liability List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="font-medium mb-1">
                            Liability Payoff Progress
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Track progress toward paying off trust liabilities
                        </p>
                    </div>
                    <Link href="/liabilities">
                        <Button variant="outline" size="sm">
                            View All
                        </Button>
                    </Link>
                </div>

                {activeLiabilities.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">
                                No active liabilities. All debts have been paid
                                off.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="divide-y py-2">
                            {activeLiabilities.slice(0, 5).map((liability) => (
                                <LiabilityProgressCard
                                    key={liability.id}
                                    liability={liability}
                                    compact
                                />
                            ))}
                        </CardContent>
                        {activeLiabilities.length > 5 && (
                            <div className="px-6 py-3 border-t bg-muted/30">
                                <Link
                                    href="/liabilities"
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    +{activeLiabilities.length - 5} more{' '}
                                    {activeLiabilities.length - 5 === 1
                                        ? 'liability'
                                        : 'liabilities'}
                                </Link>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    )
}
