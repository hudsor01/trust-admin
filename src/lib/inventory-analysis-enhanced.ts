import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import {
    type CompressedImage,
    compressImage,
    type InventoryAnalysisResult,
    InventoryAnalysisSchema,
    type InventoryImage,
    mapToDbCategory,
} from './inventory-analysis'

const log = logger.create('InventoryEnhanced')

/** Maximum agentic turns (each turn may include multiple server-side searches). */
const MAX_TURNS = 15

const ENHANCED_SYSTEM_PROMPT = `You are an expert estate appraiser with decades of experience in trust administration, estate sales, and personal property valuation. You have access to web search to find real comparable sales data.

CONTEXT: You are valuing items for the Hudson Living Trust (Texas Irrevocable Trust). The grantor's date of death was December 28, 2025. Prefer comparable sales data from 2025-2026 when available.

## YOUR #1 RULE: ACCURACY IS EVERYTHING

Your job is to find the TRUE fair market value. Undervaluing is just as wrong as overvaluing.

A $20,000 painting valued at $100 is a CATASTROPHIC FAILURE. A $50 mass-produced print valued at $5,000 is equally wrong. Both directions matter.

DO NOT be "conservative." DO NOT default to low values when uncertain. Instead, DO MORE RESEARCH until you are confident.

## MANDATORY WORKFLOW — Execute these steps for every item:

### Step 1: IDENTIFY (Critical — spend time here)
Examine the image(s) with extreme care. This is the most important step:
- READ every piece of text visible: signatures, labels, stamps, hallmarks, maker's marks, model numbers, serial numbers. Transcribe them exactly.
- Determine exact brand/maker from visible evidence
- Identify primary materials (wood species, metal type, fabric, stone, medium for art)
- Date the manufacturing era based on style, construction methods, materials
- Assess condition with specific observations

If you can see a signature on a painting, you MUST transcribe it and search for that artist. If you can see a brand label, you MUST search for that brand. NEVER skip identification.

### Step 2: RESEARCH (Exhaustive — this is where value accuracy comes from)
Use the web_search tool to find real market evidence.

**Minimum search requirements by item type:**
- Mass-produced items (IKEA, Target, commodity goods): 3 searches minimum
- Branded/designer items (name-brand furniture, electronics): 4 searches minimum
- Handmade, signed, or antique items: 5 searches minimum
- Art, jewelry, watches, fine antiques: 6 searches minimum — you MUST check specialty sources

**MANDATORY search strategies by category:**

For ART and PAINTINGS:
- You MUST search for the artist by name: "[artist name] paintings sold auction"
- "[artist name] artnet price database"
- "[artist name] Heritage Auctions results"
- "[artist name] [medium] auction results [year range]"
- If you find the artist sells at auction, use THOSE prices — not generic "decorative art" values

For FURNITURE:
- "[brand/maker] [piece type] sold price"
- "[brand] [model] 1stDibs" or "[brand] [model] Chairish"
- "[piece description] LiveAuctioneers results"
- "[piece type] [style period] auction results"

For JEWELRY and WATCHES:
- Look for hallmarks, karat stamps, maker's marks in images
- "[brand] [model] Chrono24 sold" for watches
- "[brand] [piece type] auction results"
- "[brand] [model] The RealReal sold price"

For VEHICLES:
- "[year] [make] [model] [trim] KBB fair market value"
- "[year] [make] [model] NADA value"
- "[year] [make] [model] sold listings [region]"

For GENERAL items:
- "[item] eBay sold listings [year]"
- "[brand] [model] sold price"
- "[item description] estate sale results"

### Step 3: ANALYZE
From your research, identify 2-5 comparable sales with actual transaction prices. For each:
- Note the source, sale price, sale date, and condition
- Adjust for differences vs. the item being valued
- Weight evidence: completed auction sales > eBay sold listings > dealer asking prices > price guides > training knowledge

### Step 4: DETERMINE FMV
Fair Market Value = what a willing buyer would pay a willing seller, neither under compulsion, both with reasonable knowledge (IRS Publication 561).

This is NOT retail replacement cost, insurance value, sentimental value, or original purchase price.

### Step 5: SELF-VERIFY
Before outputting your final answer, verify:
1. Did I actually identify the maker/artist/brand, or am I guessing?
2. Did I find real comparable sales with actual prices?
3. Is my estimated value supported by the evidence I found?
4. If this is art, did I search for the artist by name?
5. Is my value range reasonable (high should be at least 1.2x low)?
6. Does my confidenceScore match my actual evidence quality?

### Step 6: RESPOND
Output ONLY a single JSON object (no markdown fences, no preamble) matching this structure:

{
    "name": "Specific descriptive name including brand/maker",
    "category": "furniture|electronics|appliances|artwork|jewelry|watches|collectibles|antiques|clothing|tools|sports_equipment|musical_instruments|kitchenware|china|silverware|crystal|decor|books_media|office_equipment|outdoor|vehicles|other",
    "brand": "brand/manufacturer or null",
    "model": "model name/number or null",
    "materials": ["material1", "material2"],
    "era": "approximate era or null",
    "estimatedValue": "1500.00",
    "valueRangeLow": "1200.00",
    "valueRangeHigh": "1800.00",
    "condition": "excellent|good|fair|poor",
    "conditionNotes": "Specific observations about condition",
    "description": "2-3 sentence description",
    "valuationRationale": "MUST cite specific comparable sales with prices, sources, and dates",
    "confidence": "high|medium|low",
    "confidenceNotes": "What factors affect confidence",
    "confidenceScore": 75
}

## CRITICAL RULES:
1. The valuationRationale MUST reference actual search results with prices and sources. Never fabricate comparables.
2. If you cannot find comparable sales, set confidence to "low", confidenceScore below 30, and explain what you searched for.
3. For items likely worth over $5,000, note that professional appraisal is recommended.
4. Money values are decimal strings with exactly 2 decimal places: "1500.00" not "1500".
5. If you cannot identify the maker, say so — do NOT default to a generic low value. Set confidence to "low" instead.
6. If your estimated value is under $200 for original art, antique furniture, jewelry, or branded luxury goods, you MUST explain why with specific evidence. "Decorative" or "reproduction" requires evidence.
7. confidenceScore: 80-100 = multiple comparable sales found, strong identification; 50-79 = some evidence but gaps; 20-49 = limited evidence; 0-19 = near-guessing

<examples>
<example>
<description>Painting that looks generic but is actually by a known artist</description>
<wrong_approach>Sees a landscape painting. Does not read the signature. Outputs: "Decorative landscape painting, $75-150"</wrong_approach>
<right_approach>Reads signature in lower right: "R.B. McGrew". Searches "R Brownell McGrew paintings auction results". Finds Heritage Auctions sold similar McGrew oils for $18,000-$45,000. Searches "R Brownell McGrew artnet price database". Confirms artist with established auction history. Outputs FMV: $22,000 with cited auction results.</right_approach>
</example>

<example>
<description>Antique furniture with maker's mark</description>
<wrong_approach>Sees a wooden desk. Outputs: "Wooden desk, $200-400"</wrong_approach>
<right_approach>Examines image carefully, finds brass plate reading "Stickley" on drawer. Searches "Stickley Mission Oak desk auction results". Finds 1stDibs listings at $3,500-$8,000. Searches LiveAuctioneers for realized prices. Finds comparable Stickley desks sold at $2,800-$4,500 at auction. Outputs FMV: $3,200 with specific comparable citations.</right_approach>
</example>

<example>
<description>Truly mass-produced low-value item</description>
<approach>Identifies IKEA KALLAX shelf unit from visible label. Searches "IKEA KALLAX shelf used price". Finds eBay sold listings at $25-$60. Facebook Marketplace listings at $30-$50. Outputs FMV: $35.00 with confidence: high, confidenceScore: 85 — low value IS correct here because evidence supports it.</approach>
</example>
</examples>`

function createClient(): Anthropic {
    if (!env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured')
    }
    return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
}

/**
 * Extract the last JSON object from an array of text blocks.
 * Searches from the last block backward since the final JSON is at the end.
 */
function extractJson(
    textBlocks: Anthropic.TextBlock[],
): InventoryAnalysisResult {
    let jsonData: string | null = null

    for (let i = textBlocks.length - 1; i >= 0; i--) {
        const block = textBlocks[i]
        if (!block) continue
        const match = block.text.match(/\{[\s\S]*\}/)
        if (match) {
            jsonData = match[0]
            break
        }
    }

    if (!jsonData) {
        const rawPreview = textBlocks
            .map((b) => b.text)
            .join('\n')
            .slice(0, 500)
        throw new Error(
            `No structured valuation data in response. Raw: ${rawPreview}`,
        )
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(jsonData)
    } catch (e) {
        throw new Error(
            `Invalid JSON in response: ${(e as Error).message}. Raw: ${jsonData.slice(0, 500)}`,
        )
    }

    const validated = InventoryAnalysisSchema.parse(parsed)

    return {
        ...validated,
        rawCategory: validated.category,
        dbCategory: mapToDbCategory(validated.category),
    }
}

/**
 * Run the agentic message loop until the model finishes or hits MAX_TURNS.
 *
 * Server-side tools (web_search) are executed by the API automatically.
 * If stop_reason is 'end_turn', the model is done. If 'max_tokens', we
 * continue the conversation so the model can finish its JSON output.
 */
async function runAgenticLoop(
    client: Anthropic,
    messages: Anthropic.MessageParam[],
    systemPrompt: string = ENHANCED_SYSTEM_PROMPT,
): Promise<Anthropic.Message> {
    let response = await client.messages.create(
        {
            model: 'claude-opus-4-6',
            max_tokens: 16384,
            temperature: 1,
            thinking: { type: 'enabled', budget_tokens: 10000 },
            system: systemPrompt,
            tools: [
                {
                    type: 'web_search_20250305',
                    name: 'web_search',
                    max_uses: 20,
                },
            ],
            messages,
        },
        {
            headers: {
                'anthropic-beta': 'interleaved-thinking-2025-05-14',
            },
        },
    )

    let turns = 0

    while (response.stop_reason !== 'end_turn' && turns < MAX_TURNS) {
        turns++
        log.info(`Agentic turn ${turns}, stop_reason: ${response.stop_reason}`)

        // Append the assistant's partial response to continue the conversation
        messages = [
            ...messages,
            { role: 'assistant', content: response.content },
        ]

        if (response.stop_reason === 'max_tokens') {
            // Model ran out of tokens mid-response — ask it to continue
            messages = [
                ...messages,
                {
                    role: 'user',
                    content:
                        'Continue your response. Output the complete JSON object.',
                },
            ]
        }

        response = await client.messages.create(
            {
                model: 'claude-opus-4-6',
                max_tokens: 16384,
                temperature: 1,
                thinking: { type: 'enabled', budget_tokens: 10000 },
                system: systemPrompt,
                tools: [
                    {
                        type: 'web_search_20250305',
                        name: 'web_search',
                        max_uses: 20,
                    },
                ],
                messages,
            },
            {
                headers: {
                    'anthropic-beta': 'interleaved-thinking-2025-05-14',
                },
            },
        )
    }

    if (turns >= MAX_TURNS) {
        log.warn(`Hit MAX_TURNS (${MAX_TURNS}), returning partial response`)
    }

    return response
}

/**
 * Enhanced inventory analysis: Opus vision + web search for comparable sales.
 *
 * Uses the Anthropic messages API directly with the web_search server-side tool.
 * The model identifies items from photos, searches for real comparable sales data,
 * and synthesizes an evidence-backed FMV estimate in a single agentic loop.
 *
 * Typical latency: 30-90 seconds per item.
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

    const userPrompt =
        images.length === 1
            ? 'Analyze this personal property item for trust inventory purposes. Follow your full workflow: identify the item from the image, search the web for comparable sales data, then provide an accurate fair market valuation with cited evidence.'
            : `Analyze these ${images.length} images of the SAME personal property item for trust inventory purposes. The images show different angles, labels, or details. Follow your full workflow: identify the item, search for comparable sales, then provide an evidence-backed fair market valuation.`

    const messages: Anthropic.MessageParam[] = [
        {
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: userPrompt }],
        },
    ]

    const systemPrompt = feedbackContext
        ? ENHANCED_SYSTEM_PROMPT + feedbackContext
        : ENHANCED_SYSTEM_PROMPT

    const response = await runAgenticLoop(client, messages, systemPrompt)

    const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text',
    )

    if (textBlocks.length === 0) {
        throw new Error('No text response from analysis model')
    }

    const analysis = extractJson(textBlocks)

    log.info('Enhanced analysis complete', {
        name: analysis.name,
        fmv: analysis.estimatedValue,
        confidence: analysis.confidence,
    })

    return { analysis, compressedImages }
}

/**
 * Text-only valuation with web search (no images).
 *
 * For items described verbally — vehicles, real property, items not physically
 * present, or bulk entry from a written inventory list.
 */
/**
 * Run the agentic loop using Sonnet 4.6 as a secondary model for consensus.
 * Identical to runAgenticLoop except uses claude-sonnet-4-6 and logs with "Secondary" prefix.
 */
async function runSecondaryAgenticLoop(
    client: Anthropic,
    messages: Anthropic.MessageParam[],
    systemPrompt: string = ENHANCED_SYSTEM_PROMPT,
): Promise<Anthropic.Message> {
    let response = await client.messages.create(
        {
            model: 'claude-sonnet-4-6',
            max_tokens: 16384,
            temperature: 1,
            thinking: { type: 'enabled', budget_tokens: 8000 },
            system: systemPrompt,
            tools: [
                {
                    type: 'web_search_20250305',
                    name: 'web_search',
                    max_uses: 20,
                },
            ],
            messages,
        },
        {
            headers: {
                'anthropic-beta': 'interleaved-thinking-2025-05-14',
            },
        },
    )

    let turns = 0

    while (response.stop_reason !== 'end_turn' && turns < MAX_TURNS) {
        turns++
        log.info(
            `Secondary agentic turn ${turns}, stop_reason: ${response.stop_reason}`,
        )

        messages = [
            ...messages,
            { role: 'assistant', content: response.content },
        ]

        if (response.stop_reason === 'max_tokens') {
            messages = [
                ...messages,
                {
                    role: 'user',
                    content:
                        'Continue your response. Output the complete JSON object.',
                },
            ]
        }

        response = await client.messages.create(
            {
                model: 'claude-sonnet-4-6',
                max_tokens: 16384,
                temperature: 1,
                thinking: { type: 'enabled', budget_tokens: 8000 },
                system: systemPrompt,
                tools: [
                    {
                        type: 'web_search_20250305',
                        name: 'web_search',
                        max_uses: 20,
                    },
                ],
                messages,
            },
            {
                headers: {
                    'anthropic-beta': 'interleaved-thinking-2025-05-14',
                },
            },
        )
    }

    if (turns >= MAX_TURNS) {
        log.warn(
            `Secondary hit MAX_TURNS (${MAX_TURNS}), returning partial response`,
        )
    }

    return response
}

/**
 * Secondary analysis using Sonnet 4.6 for two-model consensus.
 *
 * Accepts pre-compressed images (avoids double-compressing) and runs the
 * secondary agentic loop with Sonnet 4.6 instead of Opus 4.6.
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

    const userPrompt =
        images.length === 1
            ? 'Analyze this personal property item for trust inventory purposes. Follow your full workflow: identify the item from the image, search the web for comparable sales data, then provide an accurate fair market valuation with cited evidence.'
            : `Analyze these ${images.length} images of the SAME personal property item for trust inventory purposes. The images show different angles, labels, or details. Follow your full workflow: identify the item, search for comparable sales, then provide an evidence-backed fair market valuation.`

    const messages: Anthropic.MessageParam[] = [
        {
            role: 'user',
            content: [...imageBlocks, { type: 'text', text: userPrompt }],
        },
    ]

    const systemPrompt = feedbackContext
        ? ENHANCED_SYSTEM_PROMPT + feedbackContext
        : ENHANCED_SYSTEM_PROMPT

    const response = await runSecondaryAgenticLoop(
        client,
        messages,
        systemPrompt,
    )

    const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text',
    )

    if (textBlocks.length === 0) {
        throw new Error('No text response from secondary analysis model')
    }

    const analysis = extractJson(textBlocks)

    log.info('Secondary analysis complete', {
        name: analysis.name,
        fmv: analysis.estimatedValue,
        confidence: analysis.confidence,
    })

    return analysis
}

export async function valueItemByDescription(
    description: string,
    additionalContext?: {
        brand?: string
        model?: string
        year?: string
        condition?: 'excellent' | 'good' | 'fair' | 'poor'
    },
): Promise<InventoryAnalysisResult> {
    const client = createClient()

    const contextParts = [
        `Item description: ${description}`,
        additionalContext?.brand && `Brand: ${additionalContext.brand}`,
        additionalContext?.model && `Model: ${additionalContext.model}`,
        additionalContext?.year && `Year/Era: ${additionalContext.year}`,
        additionalContext?.condition &&
            `Condition: ${additionalContext.condition}`,
    ].filter(Boolean)

    const messages: Anthropic.MessageParam[] = [
        {
            role: 'user',
            content: contextParts.join('\n'),
        },
    ]

    const response = await runAgenticLoop(client, messages)

    const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text',
    )

    const analysis = extractJson(textBlocks)

    log.info('Description-based valuation complete', {
        name: analysis.name,
        fmv: analysis.estimatedValue,
        confidence: analysis.confidence,
    })

    return analysis
}

// ---------------------------------------------------------------------------
// Post-analysis validation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Correction feedback loop
// ---------------------------------------------------------------------------

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
