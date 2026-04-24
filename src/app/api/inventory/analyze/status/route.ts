export const dynamic = 'force-dynamic'

import * as Sentry from '@sentry/nextjs'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { inventoryAnalysisCache } from '@/db/schema'
import { hasInventoryAccess } from '@/lib/inventory-access'
import {
    fetchAgentSessionState,
    type InventoryAnalysisResult,
} from '@/lib/inventory-agent'
import { logger } from '@/lib/logger'

// Each poll runs fast: session.retrieve (1-2s) + optional event.list
// (1-3s) + optional messages.parse on the first-complete poll (10-30s).
// Well under 60s on Hobby.
export const maxDuration = 60

const StatusQuerySchema = z.object({
    analysisId: z.string().uuid(),
})

interface StatusRunningResponse {
    success: true
    status: 'running' | 'rescheduled'
    analysisId: string
    toolUses: string[]
}

interface StatusCompleteResponse {
    success: true
    status: 'complete'
    analysisId: string
    data: InventoryAnalysisResult
    toolUses: string[]
}

interface StatusFailedResponse {
    success: false
    status: 'failed'
    analysisId: string
    error: string
    toolUses: string[]
}

interface StatusErrorResponse {
    success: false
    error: string
}

type StatusResponse =
    | StatusRunningResponse
    | StatusCompleteResponse
    | StatusFailedResponse
    | StatusErrorResponse

export async function GET(
    request: NextRequest,
): Promise<NextResponse<StatusResponse>> {
    const tStart = Date.now()
    try {
        if (!(await hasInventoryAccess())) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 },
            )
        }

        const url = new URL(request.url)
        const parsed = StatusQuerySchema.safeParse({
            analysisId: url.searchParams.get('analysisId'),
        })
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: 'Missing or invalid analysisId' },
                { status: 400 },
            )
        }
        const { analysisId } = parsed.data

        const [row] = await db
            .select({
                id: inventoryAnalysisCache.id,
                sessionId: inventoryAnalysisCache.sessionId,
                analysisJson: inventoryAnalysisCache.analysisJson,
            })
            .from(inventoryAnalysisCache)
            .where(eq(inventoryAnalysisCache.id, analysisId))
            .limit(1)

        if (!row) {
            return NextResponse.json(
                { success: false, error: 'analysisId not found' },
                { status: 404 },
            )
        }

        // If the row already has the structured analysis, return it
        // directly — the first /status poll to land after the agent went
        // idle wrote it, subsequent polls should just read.
        if (row.analysisJson) {
            return NextResponse.json({
                success: true,
                status: 'complete',
                analysisId,
                data: row.analysisJson as InventoryAnalysisResult,
                toolUses: [],
            })
        }

        if (!row.sessionId) {
            // Shouldn't happen — analyze always sets sessionId — but if the
            // row somehow got orphaned, fail cleanly instead of hanging.
            return NextResponse.json({
                success: false,
                status: 'failed',
                analysisId,
                error: 'Cache row has no sessionId (orphaned)',
                toolUses: [],
            })
        }

        const state = await fetchAgentSessionState(row.sessionId)

        if (state.status === 'complete') {
            // Persist the extracted structured analysis so subsequent polls
            // (and the submit action) read it from the DB instead of
            // re-hitting Anthropic.
            try {
                await db
                    .update(inventoryAnalysisCache)
                    .set({ analysisJson: state.analysis })
                    .where(eq(inventoryAnalysisCache.id, analysisId))
            } catch (err) {
                logger.api.warn(
                    'inventory_analysis_cache update failed on status complete',
                    {
                        error:
                            err instanceof Error
                                ? err.message
                                : 'Unknown error',
                        analysisId,
                        sessionId: row.sessionId,
                    },
                )
            }

            logger.api.info('Managed agent analysis complete', {
                sessionId: row.sessionId,
                analysisId,
                proseChars: state.proseReport.length,
                toolUses: state.toolUses,
                toolUseCount: state.toolUses.length,
                pollDurationMs: Date.now() - tStart,
            })

            return NextResponse.json({
                success: true,
                status: 'complete',
                analysisId,
                data: state.analysis,
                toolUses: state.toolUses,
            })
        }

        if (state.status === 'failed') {
            logger.api.warn('Managed agent analysis failed', {
                sessionId: row.sessionId,
                analysisId,
                reason: state.reason,
                toolUses: state.toolUses,
            })
            return NextResponse.json({
                success: false,
                status: 'failed',
                analysisId,
                error: state.reason,
                toolUses: state.toolUses,
            })
        }

        // running or rescheduled → client keeps polling
        return NextResponse.json({
            success: true,
            status: state.status,
            analysisId,
            toolUses: state.toolUses,
        })
    } catch (error) {
        Sentry.captureException(error, {
            tags: { route: 'api/inventory/analyze/status' },
        })
        logger.api.error('Inventory analysis status check failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            durationMs: Date.now() - tStart,
        })
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        )
    }
}
