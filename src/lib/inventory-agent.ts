import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { env } from '@/lib/env'
import {
    type CompressedImage,
    compressImage,
    type InventoryAnalysisResult,
    InventoryAnalysisSchema,
    type InventoryImage,
    mapToDbCategory,
} from '@/lib/inventory-analysis'
import { logger } from '@/lib/logger'

const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01'

/**
 * Minimal extraction schema. The Managed Agent returns prose + markdown;
 * we re-parse that prose with Opus + a JSON schema to populate the fields
 * the admin queue and personal_property columns need. Everything beyond the
 * bare minimum stays in `valuationRationale` (the prose itself).
 *
 * We use the same InventoryAnalysisSchema the rest of the app expects so
 * downstream code (cache → submit → personal_property columns) is unchanged.
 */
const EXTRACTION_SYSTEM = `You are converting a free-text estate valuation report into a strict JSON object for downstream database storage. Do not change any numbers or facts — extract them verbatim from the report. If a field is not stated in the report, use an empty string for text fields, an empty array for materials, "fair" for condition, "manual_review" for reviewStatus. Keep the original valuation's full prose in valuationRationale.`

/**
 * Runs a single valuation through the Managed Agent (session lifecycle:
 * create → send user.message with images → stream until status_idle →
 * archive), then extracts a structured InventoryAnalysis record from the
 * agent's prose. Returns the analysis shape the rest of the pipeline
 * already understands.
 *
 * The legacy /src/lib/inventory-analysis.ts path (direct Opus + record_valuation
 * tool) remains available but is no longer wired into /api/inventory/analyze —
 * kept so its util exports (compressImage, mapCategory, the schema, tests)
 * continue to resolve.
 */
export async function analyzeViaManagedAgent(
    images: InventoryImage[],
): Promise<{
    analysis: InventoryAnalysisResult
    compressedImages: CompressedImage[]
    proseReport: string
    sessionId: string
}> {
    if (!env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured')
    }
    if (!env.ANTHROPIC_AGENT_ID || !env.ANTHROPIC_AGENT_ENVIRONMENT_ID) {
        throw new Error(
            'ANTHROPIC_AGENT_ID / ANTHROPIC_AGENT_ENVIRONMENT_ID not configured — set both to enable the managed-agent valuation path',
        )
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

    // Compress images before sending — the 10MB raw cap in the route schema
    // would choke the 2MB-per-block ceiling on Anthropic's image blocks.
    const compressedImages = await Promise.all(
        images.map((img) => compressImage(img.base64, img.mimeType)),
    )

    const session = await client.beta.sessions.create(
        {
            environment_id: env.ANTHROPIC_AGENT_ENVIRONMENT_ID,
            agent: { type: 'agent', id: env.ANTHROPIC_AGENT_ID },
            title: `Estate valuation — ${new Date().toISOString()}`,
        },
        { headers: { 'anthropic-beta': MANAGED_AGENTS_BETA } },
    )
    const sessionId = session.id

    try {
        await client.beta.sessions.events.send(
            sessionId,
            {
                events: [
                    {
                        type: 'user.message',
                        content: [
                            {
                                type: 'text',
                                text: buildUserPrompt(compressedImages.length),
                            },
                            ...compressedImages.map((img) => ({
                                type: 'image' as const,
                                source: {
                                    type: 'base64' as const,
                                    media_type: img.mimeType as
                                        | 'image/jpeg'
                                        | 'image/png'
                                        | 'image/gif'
                                        | 'image/webp',
                                    data: img.base64,
                                },
                            })),
                        ],
                    },
                ],
            },
            { headers: { 'anthropic-beta': MANAGED_AGENTS_BETA } },
        )

        const stream = await client.beta.sessions.events.stream(
            sessionId,
            undefined,
            { headers: { 'anthropic-beta': MANAGED_AGENTS_BETA } },
        )

        const collected: string[] = []
        let ended = false
        for await (const event of stream) {
            if (event.type === 'agent.message') {
                for (const block of event.content) {
                    if (block.type === 'text') collected.push(block.text)
                }
            } else if (event.type === 'session.status_idle') {
                ended = true
                break
            } else if (event.type === 'session.status_terminated') {
                throw new Error(
                    `Managed agent session terminated: ${JSON.stringify(
                        event,
                    ).slice(0, 500)}`,
                )
            }
        }
        if (!ended) {
            throw new Error(
                'Managed agent stream closed without session.status_idle',
            )
        }

        const proseReport = collected.join('\n').trim()
        if (!proseReport) {
            throw new Error(
                'Managed agent returned an empty response — no text blocks in agent.message events',
            )
        }

        const analysis = await extractStructuredAnalysis(client, proseReport)

        return {
            analysis,
            compressedImages,
            proseReport,
            sessionId,
        }
    } finally {
        try {
            await client.beta.sessions.archive(
                sessionId,
                {},
                { headers: { 'anthropic-beta': MANAGED_AGENTS_BETA } },
            )
        } catch (err) {
            logger.api.warn('Managed agent session archive failed', {
                sessionId,
                error: err instanceof Error ? err.message : 'Unknown error',
            })
        }
    }
}

function buildUserPrompt(imageCount: number): string {
    return `Analyze the ${imageCount} attached photo${imageCount === 1 ? '' : 's'} of an estate item and produce a full fair-market valuation following your research protocol. Identify the item (artist/maker if applicable, medium, materials, era/date, dimensions), research 3+ comparable sales, and give a defensible value range. If a frame is present, value it separately and include it in the total.`
}

async function extractStructuredAnalysis(
    client: Anthropic,
    prose: string,
): Promise<InventoryAnalysisResult> {
    // Opus-parse the agent's prose into the InventoryAnalysisSchema. Using
    // a schema with only the fields we persist keeps this a tiny, cheap call.
    const extracted = await client.messages.parse({
        model: 'claude-opus-4-7',
        max_tokens: 8000,
        system: EXTRACTION_SYSTEM,
        messages: [
            {
                role: 'user',
                content: `Here is the valuation report. Extract it into the provided schema. Put the full prose (including citations and reasoning) in the valuationRationale field.\n\n<report>\n${prose}\n</report>`,
            },
        ],
        output_config: {
            format: zodOutputFormat(InventoryAnalysisSchema),
        },
    })

    const parsed = extracted.parsed_output
    if (!parsed) {
        throw new Error(
            'Structured extraction failed — messages.parse returned no parsed_output',
        )
    }

    // Validate one more time so a malformed parse (e.g. category outside
    // the enum) throws a concrete Zod error rather than propagating garbage.
    const validated = InventoryAnalysisSchema.parse(parsed)
    return {
        ...validated,
        dbCategory: mapToDbCategory(validated.category),
        rawCategory: validated.category,
    }
}

// Exported for tests and for the analyze route to know whether the managed
// agent path is configured (so it can return a clean 503 if not).
export function isManagedAgentConfigured(): boolean {
    return !!(
        env.ANTHROPIC_API_KEY &&
        env.ANTHROPIC_AGENT_ID &&
        env.ANTHROPIC_AGENT_ENVIRONMENT_ID
    )
}

export const _testables = { buildUserPrompt, EXTRACTION_SYSTEM }

// Re-export for clarity at call sites that don't want to import from the
// legacy file.
export type { InventoryAnalysisResult }

// Zod is imported for side-effects (schema compilation) but the module also
// uses it at the type level. Mark as referenced to keep noUnusedLocals quiet.
z
