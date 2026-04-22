import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { z } from 'zod'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const log = logger.create('InventoryAnalysis')

// ============================================================================
// Image compression
// ============================================================================
//
// Opus 4.7 accepts images up to 2576px / 3.75MP on the long edge
// (docs.claude.com: "What's new in Claude Opus 4.7" — high-resolution image
// support). Older limit was 1568px. Client-side compression caps at 2576px
// to preserve signature / hallmark / edition-number detail; server-side
// compression here trims to a ~2MB byte budget to stay under Vercel's body
// limits and UploadThing storage target, without re-downsampling below the
// client's 2576px cap.

const TARGET_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 2576

export interface InventoryImage {
    base64: string
    mimeType: string
}

export interface CompressedImage {
    base64: string
    mimeType: string
}

/** Compress an image to fit within the 2MB target via progressive quality reduction. */
export async function compressImage(
    base64Data: string,
    mimeType: string,
): Promise<CompressedImage> {
    const buffer = Buffer.from(base64Data, 'base64')
    const originalSize = buffer.length

    if (originalSize <= TARGET_IMAGE_SIZE_BYTES) {
        return { base64: base64Data, mimeType }
    }

    const metadata = await sharp(buffer).metadata()
    const { width = 4000, height = 3000 } = metadata

    // Area scales with square of dimensions; sqrt gives linear scale factor
    const sizeRatio = originalSize / TARGET_IMAGE_SIZE_BYTES
    const scaleFactor = Math.min(1, 1 / Math.sqrt(sizeRatio * 1.2))

    const newWidth = Math.round(width * scaleFactor)
    const newHeight = Math.round(height * scaleFactor)

    // Byte-driven scaleFactor already keeps images well under 2576 in
    // practice; this floor is defense-in-depth for unusual inputs (e.g.
    // very low-entropy images where the JPEG stays huge even at 0% quality).
    const finalWidth = Math.min(newWidth, MAX_IMAGE_DIMENSION)
    const finalHeight = Math.min(newHeight, MAX_IMAGE_DIMENSION)

    let quality = 85
    let compressedBuffer: Buffer
    let attempts = 0
    const maxAttempts = 5

    do {
        compressedBuffer = await sharp(buffer)
            .resize(finalWidth, finalHeight, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer()

        attempts++
        if (
            compressedBuffer.length > TARGET_IMAGE_SIZE_BYTES &&
            attempts < maxAttempts
        ) {
            quality -= 10
        }
    } while (
        compressedBuffer.length > TARGET_IMAGE_SIZE_BYTES &&
        attempts < maxAttempts
    )

    return {
        base64: compressedBuffer.toString('base64'),
        mimeType: 'image/jpeg', // Always JPEG after compression
    }
}

// ============================================================================
// Types + Zod schema
// ============================================================================

type DbCategory =
    | 'JEWELRY'
    | 'ART'
    | 'COLLECTIBLES'
    | 'ELECTRONICS'
    | 'FURNITURE'
    | 'OTHER'

const CATEGORIES = [
    'furniture',
    'electronics',
    'appliances',
    'artwork',
    'jewelry',
    'watches',
    'collectibles',
    'antiques',
    'clothing',
    'tools',
    'sports_equipment',
    'musical_instruments',
    'kitchenware',
    'china',
    'silverware',
    'crystal',
    'decor',
    'books_media',
    'office_equipment',
    'outdoor',
    'vehicles',
    'other',
] as const

/** Maps AI-suggested category to the DB enum value. */
export function mapToDbCategory(aiCategory: string): DbCategory {
    const normalized = aiCategory.toLowerCase().trim()

    const mapping: Record<string, DbCategory> = {
        furniture: 'FURNITURE',
        electronics: 'ELECTRONICS',
        appliances: 'ELECTRONICS',
        artwork: 'ART',
        decor: 'ART',
        jewelry: 'JEWELRY',
        watches: 'JEWELRY',
        collectibles: 'COLLECTIBLES',
        antiques: 'COLLECTIBLES',
        clothing: 'OTHER',
        tools: 'OTHER',
        sports_equipment: 'OTHER',
        musical_instruments: 'COLLECTIBLES',
        kitchenware: 'OTHER',
        china: 'COLLECTIBLES',
        silverware: 'COLLECTIBLES',
        crystal: 'COLLECTIBLES',
        books_media: 'COLLECTIBLES',
        office_equipment: 'ELECTRONICS',
        outdoor: 'OTHER',
        vehicles: 'OTHER',
        other: 'OTHER',
    }

    return mapping[normalized] || 'OTHER'
}

export const InventoryAnalysisSchema = z.object({
    name: z.string(),
    category: z.enum(CATEGORIES),
    brand: z.string().nullable(),
    model: z.string().nullable(),
    materials: z.array(z.string()),
    era: z.string().nullable(),
    estimatedValue: z.string(),
    valueRangeLow: z.string(),
    valueRangeHigh: z.string(),
    condition: z.enum(['excellent', 'good', 'fair', 'poor']),
    conditionNotes: z.string(),
    description: z.string(),
    valuationRationale: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    confidenceNotes: z.string(),
    confidenceScore: z.number().min(0).max(100),
})

export type InventoryAnalysis = z.infer<typeof InventoryAnalysisSchema>

/** Analysis result with DB-mapped category. */
export interface InventoryAnalysisResult extends InventoryAnalysis {
    dbCategory: DbCategory
    rawCategory: string
}

// ============================================================================
// System prompt
// ============================================================================
//
// Grounded in IRS Publication 561 (fair market value rules), Treas. Reg.
// § 20.2031-1(b), and Texas Estates Code § 309.051. Sources referenced
// during drafting:
//   - https://www.irs.gov/publications/p561
//   - https://platform.claude.com/docs/en/build-with-claude/effort
//   - https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7

export const SYSTEM_PROMPT = `You are an estate inventory appraiser helping a personal representative produce defensible Fair Market Value (FMV) determinations for his late father's estate.

## CASE CONTEXT

- Decedent: Richard Hudson Sr., date of death 2025-12-28
- Estate: Hudson Living Trust, Texas independent administration, case PR-2026-00281-A
- User: Richard Hudson Jr. — the son, serving as personal representative / executor
- Purpose: Every value you return is entered on the Inventory, Appraisement, and List of Claims required by Tex. Est. Code § 309.051 — a sworn filing with the probate court, due within 90 days of the personal representative's qualification
- Review: The estate's probate attorney reviews the inventory before it is filed

This is a court document sworn under oath, not a casual estimate. The number you return is the number that gets inventoried.

## WHY ACCURACY CUTS BOTH WAYS

Undervaluing is just as wrong as overvaluing:

- A $20,000 painting valued at $100 is a catastrophic failure. The heir loses tens of thousands in step-up basis (IRC § 1014). If he later sells, he pays capital gains on the real appreciation. The sworn inventory is also wrong.
- A $50 mass-produced print valued at $5,000 is equally wrong — the executor swears to a false value.

Do not be "conservative." Do not default to low values when uncertain. Do more research until you are confident.

## FAIR MARKET VALUE — THE LEGAL STANDARD

FMV = the price a willing buyer would pay a willing seller, both with reasonable knowledge, neither under compulsion (Treas. Reg. § 20.2031-1(b); IRS Pub. 561).

FMV is NOT:
- Insurance or replacement value (IRS Pub. 561 example: "This insured value does not reflect what a willing buyer and willing seller would pay.")
- Gallery retail or dealer asking price (IRS Pub. 561 example: books purchased for $10,000 were valued at $10,000, not the $30,000 "retail" the promoter claimed)
- A Certificate of Authenticity's "appraised value" from the issuing dealer
- Original purchase price
- Sentimental value

FMV is the **date-of-death value** — as of 2025-12-28 — not today's value. Weight comparable sales close to that date (IRS Pub. 561: temporal proximity is a factor in comparable selection).

## MANDATORY WORKFLOW

### Step 1 — IDENTIFY (vision-first; the highest-leverage step)

Read every piece of text visible in the image(s): signatures, labels, stamps, hallmarks, maker's marks, model numbers, edition numbers, serial numbers. Transcribe exactly.

Identify: brand / maker, medium / materials, era, condition, and any edition designation (AP, HC, EA, numbered, open edition).

If a painting shows a legible signature, you MUST transcribe it and search for that artist by name. If an item has a brand label or hallmark, search for that brand. Never skip identification.

### Step 2 — RESEARCH (use the web_search tool aggressively)

Minimum searches by item type:
- Mass-produced (IKEA, Target, commodity): 3
- Branded / designer: 4
- Handmade, signed, antique: 5
- Art, jewelry, watches, fine antiques: 6 — you MUST check specialty auction sources

Evidence hierarchy (weight in this order — this mirrors IRS Pub. 561's "least-adjustment comparable" preference):

1. Realized auction prices — Invaluable, LiveAuctioneers, Heritage, Sotheby's, Christie's, Bonhams, MutualArt, Artprice, Artnet
2. Sold listings on eBay / 1stDibs / Chairish / The RealReal
3. Active gallery asking prices (discount by ~40% for FMV; retail is not FMV)
4. Training knowledge — only when searches turn up nothing

Category-specific search templates:

- ART: "[artist name] auction results", "[artist name] Artnet price database", "[artist name] Heritage Auctions", "[artist name] [medium] auction results"
- FURNITURE: "[brand] [piece] sold price", "[brand] [model] 1stDibs", "[piece] LiveAuctioneers results"
- JEWELRY / WATCHES: "[brand] [model] Chrono24 sold", "[brand] auction results", "[brand] The RealReal sold price"
- VEHICLES: "[year] [make] [model] KBB fair market value", "[year] [make] [model] NADA value", "[year] [make] [model] sold listings"

### Step 3 — APPLY SKEPTICISM FILTERS (IRS Pub. 561 compliant)

Discount these sources and explain each discount in valuationRationale:

- **Cruise-ship and tourist-gallery dealers** (Park West Gallery, Vista Fine Art, Wyland Galleries, etc.) issue "appraisals" that reflect their own retail replacement price, not FMV. Documented secondary-market resale is typically 20–40% of the COA value, sometimes lower. **Never** use the COA appraisal number as FMV.
- **Limited-edition multiples** (giclées, dye-sublimation on aluminum, lithographs, sculptographs) almost never appreciate. Treat "investment grade" claims from sellers as marketing.
- **Single-source asking prices** (one eBay listing, one gallery) are weak evidence. Triangulate across at least three sources before relying on them.
- **AP, HC, EA designations** carry small premiums (~10–20%) over numbered editions of the same work, not multiples.

### Step 4 — DETERMINE FMV

Pick the defensible midpoint of your FMV range, supported by at least two independent comparables. Per IRS Pub. 561, document each adjustment you make between a comp and the subject item (condition differences, edition differences, sale-date drift relative to 2025-12-28).

Round the final value:
- Under $5,000: nearest $50
- $5,000–$50,000: nearest $500
- Over $50,000: nearest $5,000

valueRangeHigh should be ≥ 1.2× valueRangeLow — narrower ranges suggest thin evidence, not certainty.

### Step 5 — ESCALATION CHECK

If the item is potentially worth over $5,000 and comparable sales are thin or contested, set \`confidence: "low"\` and state in \`confidenceNotes\` that a USPAP-certified appraiser is recommended before the inventory is filed. Flagging this correctly IS the job — it is not a failure. IRS Form 8283 requires a qualified appraisal for donated items over $5,000, and the same defensibility bar is appropriate for high-value estate inventory entries.

### Step 6 — SELF-VERIFY

Before recording the valuation, verify:
1. Did I identify the maker / artist / brand from the image, or am I guessing?
2. Do I have at least two real comparables with prices, sources, and dates?
3. Did I weight comparables near the date of death (2025-12-28)?
4. If this is art, did I search for the artist by name?
5. If evidence suggests > $5,000 FMV with thin comps, did I recommend a USPAP appraiser in \`confidenceNotes\`?
6. Does \`confidenceScore\` match my actual evidence quality?
7. If I discounted an inflated source (Park West, cruise gallery, COA, gallery asking price), did I state the discount and reason in \`valuationRationale\`?

### Step 7 — RECORD

Call the \`record_valuation\` tool exactly once when your research is complete. The tool call IS the output — do not prefix it with prose summaries. The structured input you pass becomes the inventory entry.

## TONE RULES

- Lead with facts. No hedging language ("seems," "appears to be," "I think," "maybe").
- No emojis, no corporate jargon, no excessive validation, no apologies.
- If the user is wrong about a valuation (e.g., "the COA says $3,500 so use that"), correct it directly: explain why COA ≠ FMV per IRS Pub. 561.
- If identification is ambiguous or comparables are thin, say so in \`confidenceNotes\` and set \`confidence: "low"\`. Do not invent a number to be helpful.

## HARD RULES

1. Never use a Park West / cruise-gallery / tourist-gallery COA "appraisal" as FMV.
2. Never produce a valuation without at least one realized auction comparable OR three independent active-market sources.
3. Never produce a valuation without identifying the maker / artist / brand from the image when one is visible.
4. For items likely over $5,000 FMV, recommend a USPAP appraiser in \`confidenceNotes\`.
5. Weight comparables near the date of death (2025-12-28), not the current market.
6. This output is an opinion of value for the estate's probate attorney to review before filing. It is not legal advice and not a USPAP-certified appraisal.

<examples>
<example>
<description>Painting that looks generic but is actually by a known artist</description>
<wrong_approach>Sees a landscape painting. Does not read the signature. Records FMV: "Decorative landscape painting, $75"</wrong_approach>
<right_approach>Reads signature in lower right: "R.B. McGrew". Searches "R Brownell McGrew paintings auction results". Finds Heritage Auctions sold similar McGrew oils for $18,000–$45,000 in 2024–2025. Searches Artnet to confirm auction history. Weights the late-2025 sales near DOD. Records FMV: $22,000 with cited auction URLs, \`confidenceScore: 82\`, \`confidenceNotes: "USPAP appraiser recommended before filing given individual value > $5,000."\`</right_approach>
</example>

<example>
<description>Antique furniture with maker's mark</description>
<wrong_approach>Sees a wooden desk. Records: "Wooden desk, $200–400"</wrong_approach>
<right_approach>Examines image carefully, finds brass plate reading "Stickley" on a drawer. Searches "Stickley Mission Oak desk auction results". Finds 1stDibs asking at $3,500–$8,000 (discounted as asking prices). Searches LiveAuctioneers for realized prices — comparable Stickley desks hammered at $2,800–$4,500 at auction in late 2025. Records FMV: $3,200 with specific auction citations.</right_approach>
</example>

<example>
<description>Truly mass-produced low-value item</description>
<approach>Identifies IKEA KALLAX shelf unit from visible label. Searches "IKEA KALLAX shelf used price". Finds eBay sold listings at $25–$60, Facebook Marketplace at $30–$50. Records FMV: $35, \`confidence: "high"\`, \`confidenceScore: 85\` — low value IS correct here because evidence supports it.</approach>
</example>

<example>
<description>Park West cruise-ship art with a $3,500 COA</description>
<wrong_approach>User provides a Park West COA stating appraised value $3,500. Records FMV: $3,500.</wrong_approach>
<right_approach>Identifies the artist and edition from the image and COA text. Searches the artist's name on LiveAuctioneers and eBay sold listings. Finds secondary-market resales of similar Park West editions at $150–$400. Records FMV: $275 with \`valuationRationale\` noting: "Park West COA appraisal of $3,500 is retail replacement value, not FMV (IRS Pub. 561 — 'insured value does not reflect what a willing buyer and willing seller would pay'). Secondary-market resale comps on LiveAuctioneers (3 sales, 2024–2025) and eBay sold listings support $150–$400 FMV range."</right_approach>
</example>
</examples>`

// ============================================================================
// Correction feedback loop
// ============================================================================

export interface CorrectionFeedback {
    itemName: string
    category: string
    aiEstimatedValue: string
    correctedValue: string
}

/** Builds a feedback context string from recent admin corrections. */
export function buildFeedbackContext(
    corrections: CorrectionFeedback[],
): string {
    if (corrections.length === 0) return ''

    const examples = corrections
        .map(
            (c) =>
                `- "${c.itemName}" (${c.category}): AI valued at $${c.aiEstimatedValue}, admin corrected to $${c.correctedValue}`,
        )
        .join('\n')

    return `\n\n## PREVIOUS CORRECTION FEEDBACK\nThe admin has corrected these recent valuations. Learn from these corrections:\n${examples}\n\nAdjust your approach to avoid repeating these errors.`
}

// ============================================================================
// Agentic analysis loop
// ============================================================================
//
// Pattern: Opus 4.7 researches via web_search (server-side, dynamic filtering
// via code_execution per docs) and records the final valuation by calling a
// client-side `record_valuation` tool. We extract the tool's input as the
// structured result. This is Anthropic's documented pattern for "deep
// reasoning + reliable structured output":
//
//   https://platform.claude.com/docs/en/build-with-claude/structured-outputs
//   https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
//
// max_tokens: 64000 matches docs.claude.com effort guidance for xhigh:
//   "When running Claude Opus 4.7 at xhigh or max effort, set a large
//    max_tokens so the model has room to think and act across subagents
//    and tool calls. Starting at 64k tokens and tuning from there is a
//    reasonable default."

/** Maximum agentic turns. Handles pause_turn (server-side tool loop) + max_tokens continuations. */
const MAX_TURNS = 15

/**
 * Per-model output cap. Opus 4.7 allows up to 128k; Sonnet 4.6 caps at 64k
 * exactly, so we leave a 4k safety margin under the Sonnet ceiling to avoid
 * off-by-one rejection at the boundary. Both values comfortably fit the
 * "starting at 64k tokens" docs guidance for xhigh/high effort.
 */
const MAX_TOKENS_OPUS = 64000
const MAX_TOKENS_SONNET = 60000

function createClient(): Anthropic {
    if (!env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured')
    }
    return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
}

/** Build user + system prompt for image-based analysis. */
function buildAnalysisPrompts(
    imageCount: number,
    feedbackContext?: string,
): { userPrompt: string; systemPrompt: string } {
    const userPrompt =
        imageCount === 1
            ? 'Analyze this personal property item for the Hudson estate inventory. Follow the full workflow: identify the item from the image, search the web for comparable sales data near the date of death (2025-12-28), then call record_valuation with the evidence-backed FMV.'
            : `Analyze these ${imageCount} images of the SAME personal property item for the Hudson estate inventory. The images show different angles, labels, or details. Follow the full workflow: identify the item, search for comparable sales near the date of death (2025-12-28), then call record_valuation with the evidence-backed FMV.`

    const systemPrompt = feedbackContext
        ? SYSTEM_PROMPT + feedbackContext
        : SYSTEM_PROMPT

    return { userPrompt, systemPrompt }
}

const RECORD_VALUATION_TOOL_NAME = 'record_valuation'

/**
 * Client-side tool Claude calls exactly once to emit the final structured
 * valuation. `strict: true` constrains the input to our JSON schema — the
 * received `tool_use.input` is guaranteed to match the shape below.
 */
const recordValuationTool: Anthropic.Tool = {
    name: RECORD_VALUATION_TOOL_NAME,
    description:
        'Call this tool exactly once when your research is complete and you are ready to record the final valuation. The tool input IS the inventory entry — do not also write a prose summary. The call terminates the analysis.',
    input_schema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description:
                    'Specific descriptive name including brand/maker if identifiable (e.g. "Henredon Mahogany Dining Table", "Rolex Submariner Watch")',
            },
            category: {
                type: 'string',
                enum: [...CATEGORIES],
                description: 'Primary item category',
            },
            brand: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
                description: 'Brand, manufacturer, or maker if identifiable',
            },
            model: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
                description: 'Model name/number if visible or identifiable',
            },
            materials: {
                type: 'array',
                items: { type: 'string' },
                description:
                    'Primary materials (e.g. ["solid mahogany", "brass hardware"])',
            },
            era: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
                description:
                    'Approximate era or date of manufacture (e.g. "1960s", "Victorian era", "Contemporary")',
            },
            estimatedValue: {
                type: 'string',
                description:
                    'FMV as decimal string, date-of-death weighted (2025-12-28). NOT retail, insurance, or COA value. Round per Step 4. Example: "3200.00"',
            },
            valueRangeLow: {
                type: 'string',
                description: 'Conservative low estimate',
            },
            valueRangeHigh: {
                type: 'string',
                description:
                    'Optimistic high estimate. Should be >= 1.2x valueRangeLow',
            },
            condition: {
                type: 'string',
                enum: ['excellent', 'good', 'fair', 'poor'],
                description: 'Physical condition assessment',
            },
            conditionNotes: {
                type: 'string',
                description:
                    'Specific condition observations (wear, damage, repairs, patina)',
            },
            description: {
                type: 'string',
                description: 'Detailed 2-3 sentence description of the item',
            },
            valuationRationale: {
                type: 'string',
                description:
                    'MUST cite at least two actual comparable sales with price, date, and source URL. If inflated sources were discounted (COA, gallery asking, cruise-line certificate), state the discount and reason. Note date-of-death weighting.',
            },
            confidence: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'Model confidence in identification and valuation',
            },
            confidenceNotes: {
                type: 'string',
                description:
                    'What factors affect confidence. If > $5k FMV with thin comps, state "USPAP appraiser recommended before filing".',
            },
            confidenceScore: {
                type: 'number',
                description:
                    '0-100. 80-100 = multiple realized comps + strong ID; 50-79 = some evidence with gaps; 20-49 = limited; 0-19 = near-guessing',
            },
        },
        required: [
            'name',
            'category',
            'brand',
            'model',
            'materials',
            'era',
            'estimatedValue',
            'valueRangeLow',
            'valueRangeHigh',
            'condition',
            'conditionNotes',
            'description',
            'valuationRationale',
            'confidence',
            'confidenceNotes',
            'confidenceScore',
        ],
        additionalProperties: false,
    },
    strict: true,
}

interface AgenticLoopOptions {
    model?: string
    /**
     * Thinking depth + overall token spend. Not every value works on every
     * model — the API returns 400 for mismatches. Allowed pairings:
     *   - Opus 4.7     → low | medium | high | xhigh | max   (xhigh only here)
     *   - Opus 4.6/4.5 → low | medium | high | max
     *   - Sonnet 4.6   → low | medium | high                 (no xhigh, no max)
     *   - Sonnet 4.5 / Haiku → effort not supported (omit)
     * `xhigh` is the best setting for agentic work on Opus 4.7; `high` is
     * the recommended minimum for intelligence-sensitive work generally.
     */
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
    logPrefix?: string
}

/**
 * Run the agentic loop until Claude calls record_valuation (or hits MAX_TURNS).
 *
 * Terminal states:
 *   - tool_use stop_reason with record_valuation in content → success
 *   - pause_turn → server-side tool loop hit iteration limit; resume
 *   - max_tokens → output truncated; send continue prompt
 *   - end_turn without record_valuation → failure (model finished prose only)
 */
async function runAgenticLoop(
    client: Anthropic,
    messages: Anthropic.MessageParam[],
    systemPrompt: string,
    options: AgenticLoopOptions = {},
): Promise<InventoryAnalysisResult> {
    const {
        model = 'claude-opus-4-7',
        effort = 'xhigh',
        logPrefix = 'Agentic',
    } = options

    // Sonnet 4.6's output ceiling is 64k exactly; Opus 4.7's is 128k. Pick
    // the cap by model prefix so the same loop can serve both without
    // tripping Sonnet at the boundary.
    const maxTokens = model.startsWith('claude-opus')
        ? MAX_TOKENS_OPUS
        : MAX_TOKENS_SONNET

    // Opus 4.7 breaking changes: adaptive thinking only (budget_tokens
    // returns 400); no temperature/top_p/top_k (also 400). Effort replaces
    // the fixed-budget thinking control.
    const createParams = {
        model,
        max_tokens: maxTokens,
        thinking: { type: 'adaptive' as const },
        output_config: { effort },
        system: systemPrompt,
        tools: [
            // web_search_20260209 has dynamic filtering — docs say this is
            // especially effective for "literature review and citation
            // verification" and "response grounding and verification",
            // i.e. appraisal. Dynamic filtering requires code_execution
            // to be enabled on the workspace; if it is not, the API 400s
            // on requests that include code_execution_20260120. To verify
            // before shipping:
            //
            //   curl https://api.anthropic.com/v1/messages \
            //     -H "x-api-key: $ANTHROPIC_API_KEY" \
            //     -H "anthropic-version: 2023-06-01" \
            //     -d '{"model":"claude-opus-4-7","max_tokens":512,
            //          "messages":[{"role":"user","content":"ping"}],
            //          "tools":[{"type":"code_execution_20260120",
            //                    "name":"code_execution"}]}'
            {
                type: 'web_search_20260209' as const,
                name: 'web_search' as const,
                max_uses: 20,
            },
            {
                type: 'code_execution_20260120' as const,
                name: 'code_execution' as const,
            },
            recordValuationTool,
        ] as Anthropic.ToolUnion[],
    }

    let currentMessages = messages
    let response = await client.messages.create({
        ...createParams,
        messages: currentMessages,
    })

    let turns = 0

    while (turns < MAX_TURNS) {
        // Handle max_tokens FIRST. A truncated record_valuation tool_use block
        // looks structurally valid but has partial input — running it through
        // InventoryAnalysisSchema.parse would throw a confusing Zod error
        // instead of triggering the continuation nudge. Always check the
        // truncation signal before trusting content.
        if (response.stop_reason === 'max_tokens') {
            turns++
            log.info(
                `${logPrefix} turn ${turns}, stop_reason: max_tokens (nudging continuation)`,
            )
            currentMessages = [
                ...currentMessages,
                { role: 'assistant', content: response.content },
                {
                    role: 'user',
                    content:
                        'Continue your analysis. Call record_valuation when ready.',
                },
            ]
            response = await client.messages.create({
                ...createParams,
                messages: currentMessages,
            })
            continue
        }

        // Refusal: the model declined to answer (streaming classifier
        // intervened or policy block). Resuming would likely re-refuse
        // indefinitely — throw immediately with a clear message.
        if (response.stop_reason === 'refusal') {
            throw new Error(
                `${logPrefix}: model refused to produce a valuation (stop_reason: refusal)`,
            )
        }

        // Success: Claude called record_valuation — extract and return.
        const recordCall = response.content.find(
            (b): b is Anthropic.ToolUseBlock =>
                b.type === 'tool_use' && b.name === RECORD_VALUATION_TOOL_NAME,
        )
        if (recordCall) {
            const validated = InventoryAnalysisSchema.parse(recordCall.input)
            log.info(`${logPrefix} completed`, {
                continuationTurns: turns,
                name: validated.name,
                fmv: validated.estimatedValue,
                confidence: validated.confidence,
            })
            return {
                ...validated,
                rawCategory: validated.category,
                dbCategory: mapToDbCategory(validated.category),
            }
        }

        // Model finished without calling the recording tool — failure.
        if (response.stop_reason === 'end_turn') {
            throw new Error(
                `${logPrefix}: model ended turn without calling ${RECORD_VALUATION_TOOL_NAME}`,
            )
        }

        turns++
        log.info(
            `${logPrefix} turn ${turns}, stop_reason: ${response.stop_reason}`,
        )

        // pause_turn (server-side tool loop limit) and any other non-terminal
        // stop_reason re-send with the assistant's content appended; the API
        // resumes automatically.
        currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
        ]

        response = await client.messages.create({
            ...createParams,
            messages: currentMessages,
        })
    }

    throw new Error(
        `${logPrefix}: hit MAX_TURNS (${MAX_TURNS}) without record_valuation call`,
    )
}

/**
 * Primary estate-inventory analysis: Opus 4.7 with xhigh effort, adaptive
 * thinking, web_search + dynamic filtering. Typical latency: 1-5 minutes.
 */
export async function analyzeWithMarketResearch(
    images: InventoryImage[],
    feedbackContext?: string,
): Promise<{
    analysis: InventoryAnalysisResult
    compressedImages: CompressedImage[]
}> {
    if (images.length === 0) {
        throw new Error('At least one image is required')
    }

    const client = createClient()

    const compressedImages = await Promise.all(
        images.map((img) => compressImage(img.base64, img.mimeType)),
    )

    const imageBlocks: Anthropic.ImageBlockParam[] = compressedImages.map(
        (img) => ({
            type: 'image',
            source: {
                type: 'base64',
                media_type: img.mimeType as
                    | 'image/jpeg'
                    | 'image/png'
                    | 'image/gif'
                    | 'image/webp',
                data: img.base64,
            },
        }),
    )

    const { userPrompt, systemPrompt } = buildAnalysisPrompts(
        images.length,
        feedbackContext,
    )

    const messages: Anthropic.MessageParam[] = [
        {
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: userPrompt }],
        },
    ]

    const analysis = await runAgenticLoop(client, messages, systemPrompt)

    return { analysis, compressedImages }
}

/**
 * Secondary analysis for two-model consensus. Sonnet 4.6 with high effort.
 * Accepts pre-compressed images to avoid double-compression.
 */
export async function analyzeWithMarketResearchSecondary(
    images: InventoryImage[],
    compressedImages: CompressedImage[],
    feedbackContext?: string,
): Promise<InventoryAnalysisResult> {
    if (compressedImages.length === 0) {
        throw new Error('At least one compressed image is required')
    }

    const client = createClient()

    const imageBlocks: Anthropic.ImageBlockParam[] = compressedImages.map(
        (img) => ({
            type: 'image',
            source: {
                type: 'base64',
                media_type: img.mimeType as
                    | 'image/jpeg'
                    | 'image/png'
                    | 'image/gif'
                    | 'image/webp',
                data: img.base64,
            },
        }),
    )

    const { userPrompt, systemPrompt } = buildAnalysisPrompts(
        images.length,
        feedbackContext,
    )

    const messages: Anthropic.MessageParam[] = [
        {
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: userPrompt }],
        },
    ]

    return runAgenticLoop(client, messages, systemPrompt, {
        model: 'claude-sonnet-4-6',
        effort: 'high',
        logPrefix: 'Secondary',
    })
}

// ============================================================================
// Post-analysis validation
// ============================================================================

const HIGH_VALUE_CATEGORIES = new Set([
    'artwork',
    'jewelry',
    'watches',
    'antiques',
    'collectibles',
    'furniture',
])

export interface ValidationResult {
    valid: boolean
    warnings: string[]
}

/** Post-analysis validation to catch lazy defaults and obvious errors. */
export function validateAnalysis(analysis: {
    estimatedValue: string
    valueRangeLow: string
    valueRangeHigh: string
    category: string
    valuationRationale: string
}): ValidationResult {
    const warnings: string[] = []
    const value = parseFloat(analysis.estimatedValue)
    const low = parseFloat(analysis.valueRangeLow)
    const high = parseFloat(analysis.valueRangeHigh)

    if (value < low || value > high) {
        warnings.push('estimatedValue outside range')
    }

    if (value < 200 && HIGH_VALUE_CATEGORIES.has(analysis.category)) {
        warnings.push('suspiciously low for category')
    }

    if (!/\$[\d,]+/.test(analysis.valuationRationale)) {
        warnings.push('rationale lacks specific prices')
    }

    return { valid: warnings.length === 0, warnings }
}
