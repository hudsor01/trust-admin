import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { BetaManagedAgentsSessionEvent } from '@anthropic-ai/sdk/resources/beta/sessions/events'
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

const EXTRACTION_SYSTEM = `You are converting a free-text estate valuation report into a strict JSON object for downstream database storage. Do not change any numbers or facts — extract them as stated in the report.

CRITICAL NUMERIC FORMAT: estimatedValue, valueRangeLow, and valueRangeHigh MUST be plain decimal strings with NO currency symbols, NO thousands separators, NO text. Correct: "800.00", "550", "1075.50". Wrong: "$800", "1,075", "$550–$1,075", "approximately 800". If the report gives a range (e.g. "$550–$1,075") pick the midpoint for estimatedValue and the range endpoints for valueRangeLow/valueRangeHigh. If a number is not stated, use "0".

If a field is not stated in the report, use an empty string for text fields, an empty array for materials, "fair" for condition, "manual_review" for reviewStatus. Keep the original valuation's full prose in valuationRationale.`

function getClient(): Anthropic {
    if (!env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured')
    }
    return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
}

function requireAgentConfig(): { agentId: string; environmentId: string } {
    if (!env.ANTHROPIC_AGENT_ID || !env.ANTHROPIC_AGENT_ENVIRONMENT_ID) {
        throw new Error(
            'ANTHROPIC_AGENT_ID / ANTHROPIC_AGENT_ENVIRONMENT_ID not configured — set both to enable the managed-agent valuation path',
        )
    }
    return {
        agentId: env.ANTHROPIC_AGENT_ID,
        environmentId: env.ANTHROPIC_AGENT_ENVIRONMENT_ID,
    }
}

/**
 * Phase 1 of the async analyze pattern. Creates a Managed Agent session,
 * posts the user.message event with the compressed images, returns
 * immediately once the agent has accepted the input. Does NOT wait for
 * the agent to finish — that happens on Anthropic's side and the client
 * polls /api/inventory/analyze/status to drain the result.
 *
 * Runs in <10s on the happy path (session create + event send), well
 * under any serverless function cap.
 */
export async function startAgentSession(images: InventoryImage[]): Promise<{
    sessionId: string
    compressedImages: CompressedImage[]
}> {
    const { agentId, environmentId } = requireAgentConfig()
    const client = getClient()

    const compressedImages = await Promise.all(
        images.map((img) => compressImage(img.base64, img.mimeType)),
    )

    // Vault IDs attach the agent's MCP credentials (currently the
    // Airtable token used to log every valuation to "Estate Valuations" →
    // "Valuations"). Required at session create time — without them the
    // agent runs but every MCP write call returns an auth error and the
    // record never persists. Comma-separated env var so we can attach
    // multiple vaults later (e.g. a second integration) without a code
    // change.
    const vaultIds = (env.ANTHROPIC_AGENT_VAULT_IDS ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)

    const session = await client.beta.sessions.create(
        {
            environment_id: environmentId,
            agent: { type: 'agent', id: agentId },
            title: `Estate valuation — ${new Date().toISOString()}`,
            ...(vaultIds.length > 0 ? { vault_ids: vaultIds } : {}),
        },
        { headers: { 'anthropic-beta': MANAGED_AGENTS_BETA } },
    )
    const sessionId = session.id

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

    return { sessionId, compressedImages }
}

/**
 * Phase 2 of the async analyze pattern. Called by the /status route each
 * time the client polls. Retrieves session state from Anthropic.
 *
 * - If the session is still running: returns { status: 'running', toolUses }
 *   so the client can render progress.
 * - If the session is idle (agent finished): fetches all events, extracts
 *   agent.message text + toolUses, runs the structured-extraction pass
 *   against the prose, archives the session, returns the analysis.
 * - If the session terminated with an error: returns { status: 'failed' }.
 *
 * Each individual call runs in <30s worst case (the extraction step is
 * the slowest part, and it only fires once per session).
 */
export async function fetchAgentSessionState(sessionId: string): Promise<
    | {
          status: 'running' | 'rescheduled'
          toolUses: string[]
      }
    | {
          status: 'complete'
          analysis: InventoryAnalysisResult
          proseReport: string
          toolUses: string[]
      }
    | {
          status: 'failed'
          reason: string
          toolUses: string[]
      }
> {
    const client = getClient()

    const session = await client.beta.sessions.retrieve(sessionId, undefined, {
        headers: { 'anthropic-beta': MANAGED_AGENTS_BETA },
    })

    // Possible status values (managed-agents-2026-04-01): idle, running,
    // rescheduling, terminated. An idle session has finished its turn.
    if (session.status === 'running') {
        return { status: 'running', toolUses: await collectToolUses(sessionId) }
    }
    if (session.status === 'rescheduling') {
        return {
            status: 'rescheduled',
            toolUses: await collectToolUses(sessionId),
        }
    }

    // idle or terminated → drain every event to harvest the prose AND any
    // diagnostic signals we'll need if there's no prose to extract.
    const payload = await collectSessionPayload(sessionId)
    const { text, toolUses } = payload

    if (session.status === 'terminated') {
        return {
            status: 'failed',
            reason: buildFailureReason(
                'Managed agent session terminated',
                payload,
            ),
            toolUses,
        }
    }

    if (!text.trim()) {
        return {
            status: 'failed',
            reason: buildNoTextReason(payload),
            toolUses,
        }
    }

    const analysis = await extractStructuredAnalysis(client, text)

    // Archive is non-fatal: the session result is already in our hands.
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

    return {
        status: 'complete',
        analysis,
        proseReport: text,
        toolUses,
    }
}

async function collectToolUses(sessionId: string): Promise<string[]> {
    const client = getClient()
    const toolUses: string[] = []
    // Cursor-paginated — page through all events to capture tool history
    // up to this poll. Lightweight because each event is <1KB.
    const events = await client.beta.sessions.events.list(
        sessionId,
        undefined,
        { headers: { 'anthropic-beta': MANAGED_AGENTS_BETA } },
    )
    for await (const event of events) {
        const label = toolUseLabel(event)
        if (label !== null) toolUses.push(label)
    }
    return toolUses
}

// Three distinct tool-use event types in the SDK union: agent.tool_use
// (built-in tools like web_search, code_execution), agent.mcp_tool_use
// (e.g. the Airtable writer attached via vault credentials), and
// agent.custom_tool_use (client-provided custom tools). MCP gets a
// `mcp:<server>.<tool>` prefix so triage can distinguish a failing
// MCP call from a built-in.
function toolUseLabel(event: BetaManagedAgentsSessionEvent): string | null {
    if (event.type === 'agent.tool_use') return event.name
    if (event.type === 'agent.mcp_tool_use') {
        return `mcp:${event.mcp_server_name}.${event.name}`
    }
    if (event.type === 'agent.custom_tool_use') return `custom:${event.name}`
    return null
}

interface SessionPayload {
    text: string
    toolUses: string[]
    agentMessageCount: number
    errors: Array<{ type: string; message: string }>
    lastIdleStopReason:
        | 'end_turn'
        | 'requires_action'
        | 'retries_exhausted'
        | null
}

async function collectSessionPayload(
    sessionId: string,
): Promise<SessionPayload> {
    const client = getClient()
    const textParts: string[] = []
    const toolUses: string[] = []
    const errors: Array<{ type: string; message: string }> = []
    let agentMessageCount = 0
    let lastIdleStopReason: SessionPayload['lastIdleStopReason'] = null
    const events = await client.beta.sessions.events.list(
        sessionId,
        undefined,
        { headers: { 'anthropic-beta': MANAGED_AGENTS_BETA } },
    )
    for await (const event of events) {
        if (event.type === 'agent.message') {
            agentMessageCount += 1
            for (const block of event.content) {
                if (block.type === 'text') textParts.push(block.text)
            }
            continue
        }
        if (event.type === 'session.error') {
            errors.push({
                type: event.error.type,
                message: event.error.message,
            })
            continue
        }
        if (event.type === 'session.status_idle') {
            lastIdleStopReason = event.stop_reason.type
            continue
        }
        const label = toolUseLabel(event)
        if (label !== null) toolUses.push(label)
    }
    return {
        text: textParts.join('\n').trim(),
        toolUses,
        agentMessageCount,
        errors,
        lastIdleStopReason,
    }
}

function buildFailureReason(
    base: string,
    { errors, lastIdleStopReason, agentMessageCount, toolUses }: SessionPayload,
): string {
    const parts: string[] = [base]
    if (errors.length > 0) {
        parts.push(
            `errors: ${errors
                .map((e) => `${e.type}: ${e.message}`)
                .join('; ')}`,
        )
    }
    if (lastIdleStopReason && lastIdleStopReason !== 'end_turn') {
        parts.push(`stop_reason: ${lastIdleStopReason}`)
    }
    parts.push(`agent.message events: ${agentMessageCount}`)
    parts.push(`tool uses: ${toolUses.length}`)
    return parts.join(' | ')
}

// Surface the most actionable signal we have so the UI / Sentry breadcrumb
// names the root cause instead of a generic "no text". Priority: explicit
// session.error → blocking requires_action → retries_exhausted → no
// agent.message at all → agent.message present but text blocks empty.
function buildNoTextReason(payload: SessionPayload): string {
    const { errors, lastIdleStopReason, agentMessageCount, toolUses } = payload
    if (errors.length > 0) {
        // When an error coexists with a non-end_turn stop_reason, the
        // stop_reason tells triage whether the error was retried and
        // ultimately terminal (retries_exhausted) or recoverable.
        const stopSuffix =
            lastIdleStopReason && lastIdleStopReason !== 'end_turn'
                ? ` (stop_reason: ${lastIdleStopReason})`
                : ''
        return `Managed agent emitted session.error: ${errors
            .map((e) => `${e.type}: ${e.message}`)
            .join('; ')}${stopSuffix}`
    }
    if (lastIdleStopReason === 'requires_action') {
        return 'Managed agent paused waiting for user input (requires_action) — no agent.message before pause. The session expects a tool_confirmation or custom_tool_result event that the inventory pipeline does not send.'
    }
    if (lastIdleStopReason === 'retries_exhausted') {
        return 'Managed agent exhausted its retry budget (max_iterations hit or repeated errors). Inspect agent config or recent session.error events.'
    }
    if (agentMessageCount === 0) {
        return `Managed agent finished its turn without emitting any agent.message events (${toolUses.length} tool uses observed${
            toolUses.length > 0 ? `: ${toolUses.join(', ')}` : ''
        }).`
    }
    return `Managed agent emitted ${agentMessageCount} agent.message event(s) but every text block was empty.`
}

function buildUserPrompt(imageCount: number): string {
    return `Analyze the ${imageCount} attached photo${imageCount === 1 ? '' : 's'} of an estate item and produce a full fair-market valuation following your research protocol. Identify the item (artist/maker if applicable, medium, materials, era/date, dimensions), research 3+ comparable sales, and give a defensible value range. If a frame is present, value it separately and include it in the total.`
}

async function extractStructuredAnalysis(
    client: Anthropic,
    prose: string,
): Promise<InventoryAnalysisResult> {
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

    const sanitized = sanitizeNumericFields(parsed)
    const validated = InventoryAnalysisSchema.parse(sanitized)
    return {
        ...validated,
        dbCategory: mapToDbCategory(validated.category),
        rawCategory: validated.category,
    }
}

function sanitizeNumericFields(parsed: unknown): unknown {
    if (!parsed || typeof parsed !== 'object') return parsed
    const obj = parsed as Record<string, unknown>
    const NUMERIC_FIELDS = [
        'estimatedValue',
        'valueRangeLow',
        'valueRangeHigh',
    ] as const
    const cleaned: Record<string, unknown> = { ...obj }
    for (const field of NUMERIC_FIELDS) {
        const raw = obj[field]
        cleaned[field] =
            typeof raw === 'string'
                ? toBareDecimal(raw, field === 'valueRangeHigh' ? 'max' : 'min')
                : raw
    }
    return cleaned
}

function toBareDecimal(raw: string, pick: 'min' | 'max'): string {
    const normalized = raw.replace(/,/g, '')
    const matches = normalized.match(/\d+(?:\.\d+)?/g)
    if (!matches || matches.length === 0) return '0'
    const numbers = matches
        .map((s) => parseFloat(s))
        .filter((n) => !Number.isNaN(n))
    if (numbers.length === 0) return '0'
    if (numbers.length === 1) return numbers[0]!.toString()
    return (
        pick === 'max' ? Math.max(...numbers) : Math.min(...numbers)
    ).toString()
}

export function isManagedAgentConfigured(): boolean {
    return !!(
        env.ANTHROPIC_API_KEY &&
        env.ANTHROPIC_AGENT_ID &&
        env.ANTHROPIC_AGENT_ENVIRONMENT_ID
    )
}

export const _testables = {
    buildUserPrompt,
    EXTRACTION_SYSTEM,
    sanitizeNumericFields,
    toBareDecimal,
    buildFailureReason,
    buildNoTextReason,
    toolUseLabel,
}

export type { InventoryAnalysisResult }
