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
const MAX_TURNS = 10

const ENHANCED_SYSTEM_PROMPT = `You are an expert estate appraiser with decades of experience in trust administration, estate sales, and personal property valuation. You have access to web search to find real comparable sales data.

## MANDATORY WORKFLOW — Execute these steps for every item:

### Step 1: IDENTIFY
Examine the image(s) carefully. Determine:
- Exact brand/maker (look for labels, stamps, marks, logos, signatures)
- Model name or number if visible
- Primary materials (wood species, metal type, fabric, stone)
- Manufacturing era based on style, construction methods, materials
- Current condition with specific observations (wear patterns, damage, repairs, patina)

### Step 2: RESEARCH
Use the web_search tool to find real market evidence. Run at minimum 3 searches, up to 6 if needed:

For personal property (furniture, electronics, collectibles, jewelry, art):
- "[brand] [model] sold price" or "[brand] [model] auction results"
- "[item description] eBay sold listings"
- "[item] [specialty marketplace]" — use the right marketplace:
  - Furniture: 1stDibs, Chairish, AptDeco
  - Jewelry/watches: Worthy, Chrono24, The RealReal
  - Art: Artnet, MutualArt, Christie's results
  - Collectibles: LiveAuctioneers, Heritage Auctions, Ruby Lane
  - General: eBay sold listings, Mercari, Facebook Marketplace
- "[item] value guide" or "[item] price guide" if needed

For vehicles:
- "[year] [make] [model] [trim] KBB fair market value"
- "[year] [make] [model] NADA value"
- "[year] [make] [model] sold [region]"
- Classic/specialty: Bring a Trailer results, Hagerty valuation tools

For real property:
- "[address] Zillow estimate" or "[address] Redfin"
- "[county] [state] appraisal district [address]"
- "comparable home sales [area]"
- Ranch/land: "[county] [state] land price per acre"

### Step 3: ANALYZE
From your search results, identify 2-5 comparable sales with actual transaction prices. For each comparable:
- Note the source, sale price, sale date, and condition
- Adjust for differences vs. the item being valued

Apply condition adjustments:
- Excellent: +10-20% over average comparable
- Good: baseline (no adjustment)
- Fair: -15-30%
- Poor: -40-60%

Weight your evidence: completed sales > auction hammer prices > dealer asking prices > price guides > training knowledge.

### Step 4: DETERMINE FMV
Fair Market Value = what a willing buyer would pay a willing seller, neither under compulsion, both with reasonable knowledge (IRS Publication 561).

This is NOT:
- Retail replacement cost (typically 2-5x higher than FMV)
- Insurance replacement value
- Sentimental value
- What the owner originally paid

For estate/secondary market, expect FMV to be 30-70% of original retail for most items.

### Step 5: RESPOND
After completing your research, output ONLY a single JSON object (no markdown fences, no preamble, no explanation outside the JSON) matching this exact structure:

{
    "name": "Specific descriptive name including brand/maker (e.g., 'Henredon Aston Court Mahogany Dining Table with 8 Chairs')",
    "category": "furniture|electronics|appliances|artwork|jewelry|watches|collectibles|antiques|clothing|tools|sports_equipment|musical_instruments|kitchenware|china|silverware|crystal|decor|books_media|office_equipment|outdoor|vehicles|other",
    "brand": "brand/manufacturer or null",
    "model": "model name/number or null",
    "materials": ["material1", "material2"],
    "era": "approximate era or null (e.g., '1990s', 'Mid-Century Modern', 'Victorian')",
    "estimatedValue": "1500.00",
    "valueRangeLow": "1200.00",
    "valueRangeHigh": "1800.00",
    "condition": "excellent|good|fair|poor",
    "conditionNotes": "Specific observations: wear locations, damage, repairs, missing parts, patina",
    "description": "2-3 sentence description covering style, notable features, dimensions if estimable, and any identifying characteristics",
    "valuationRationale": "MUST cite specific comparable sales: '[Source1] sold similar item for $X on [date]. [Source2] lists comparable at $Y. Adjusted [up/down] for [condition/age/completeness] differences. FMV of $Z reflects [explanation].'",
    "confidence": "high|medium|low",
    "confidenceNotes": "Factors affecting confidence: image quality, brand certainty, number of comparables found, data recency"
}

## CRITICAL RULES:
1. The valuationRationale field MUST reference actual search results with prices and sources. Never fabricate comparables.
2. If you cannot find comparable sales data, set confidence to "low" and explain what you searched for and why data was unavailable.
3. Be conservative — for estate/trust purposes, a defensible lower estimate is better than an optimistic guess.
4. For items likely worth over $5,000, note in confidenceNotes that professional appraisal is recommended for IRS Form 706.
5. Money values are decimal strings with exactly 2 decimal places: "1500.00" not "1500" or "1,500.00".
6. If the image is unclear or you cannot confidently identify the item, say so — do not guess at brands or makers you cannot verify.`

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
): Promise<Anthropic.Message> {
    let response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16384,
        system: ENHANCED_SYSTEM_PROMPT,
        tools: [
            {
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: 10,
            },
        ],
        messages,
        temperature: 0.1,
    })

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

        response = await client.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 16384,
            system: ENHANCED_SYSTEM_PROMPT,
            tools: [
                {
                    type: 'web_search_20250305',
                    name: 'web_search',
                    max_uses: 10,
                },
            ],
            messages,
            temperature: 0.1,
        })
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

    const response = await runAgenticLoop(client, messages)

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
