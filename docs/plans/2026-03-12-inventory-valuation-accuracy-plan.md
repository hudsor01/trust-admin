# Inventory Valuation Accuracy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate catastrophic undervaluations ($20K painting → $100) by upgrading models, rewriting prompts, adding two-model consensus, and building a feedback loop.

**Architecture:** Replace single Sonnet 4.5 call with dual Opus 4.6 + Sonnet 4.6 consensus pipeline. Both models run in parallel with extended thinking, upgraded web search (20260209), web fetch, and a rewritten system prompt that eliminates conservative bias and demands exhaustive research. Post-analysis validation catches lazy defaults. Feedback loop stores admin corrections and injects them into future prompts.

**Tech Stack:** Anthropic SDK (`@anthropic-ai/sdk`), Opus 4.6, Sonnet 4.6, web_search_20260209, web_fetch_20260209, Drizzle ORM, Zod, React 19

---

## Task 1: Add `confidenceScore` to Schema and Update Types

**Files:**
- Modify: `src/lib/inventory-analysis.ts:109-197` (InventoryAnalysisSchema)
- Modify: `src/lib/inventory-analysis.ts:202-205` (InventoryAnalysisResult interface)

**Step 1: Add `confidenceScore` field to InventoryAnalysisSchema**

In `src/lib/inventory-analysis.ts`, add after the `confidenceNotes` field (line 196):

```typescript
confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
        'Numeric confidence score 0-100 based on: number of comparables found, recency of sales data, image quality, brand identification certainty',
    ),
```

**Step 2: Run typecheck to verify schema change propagates**

Run: `bun run typecheck`
Expected: Type errors in files that construct InventoryAnalysisResult objects (tests, mocks). Note these — we'll fix them in later tasks.

**Step 3: Commit**

```bash
git add src/lib/inventory-analysis.ts
git commit -m "feat: add confidenceScore (0-100) to inventory analysis schema"
```

---

## Task 2: Rewrite the Enhanced System Prompt

**Files:**
- Modify: `src/lib/inventory-analysis-enhanced.ts:18-107` (ENHANCED_SYSTEM_PROMPT)

**Step 1: Replace the entire ENHANCED_SYSTEM_PROMPT**

Replace lines 18-107 in `src/lib/inventory-analysis-enhanced.ts` with:

```typescript
const ENHANCED_SYSTEM_PROMPT = `You are an expert estate appraiser with decades of experience in trust administration, estate sales, and personal property valuation. You have access to web search and web fetch to find real comparable sales data.

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
Use web_search and web_fetch to find real market evidence.

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
- Use web_fetch to read full auction listing pages when found
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
- "Worthy [piece type] sold price" for jewelry

For VEHICLES:
- "[year] [make] [model] [trim] KBB fair market value"
- "[year] [make] [model] NADA value"
- "[year] [make] [model] sold listings [region]"

For GENERAL items:
- "[item] eBay sold listings [year]"
- "[brand] [model] sold price"
- "[item description] estate sale results"

### Step 3: FETCH FULL LISTINGS
When web_search finds relevant auction results or listings pages, use web_fetch to load the full page. Search snippets often lack the actual sale price — the full page has it.

### Step 4: ANALYZE
From your research, identify 2-5 comparable sales with actual transaction prices. For each:
- Note the source, sale price, sale date, and condition
- Adjust for differences vs. the item being valued
- Weight evidence: completed auction sales > eBay sold listings > dealer asking prices > price guides > training knowledge

### Step 5: DETERMINE FMV
Fair Market Value = what a willing buyer would pay a willing seller, neither under compulsion, both with reasonable knowledge (IRS Publication 561).

This is NOT retail replacement cost, insurance value, sentimental value, or original purchase price.

### Step 6: SELF-VERIFY
Before outputting your final answer, verify:
1. Did I actually identify the maker/artist/brand, or am I guessing?
2. Did I find real comparable sales with actual prices?
3. Is my estimated value supported by the evidence I found?
4. If this is art, did I search for the artist by name?
5. Is my value range reasonable (high should be at least 1.2x low)?
6. Does my confidenceScore match my actual evidence quality?

### Step 7: RESPOND
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
<right_approach>Reads signature in lower right: "R.B. McGrew". Searches "R Brownell McGrew paintings auction results". Finds Heritage Auctions sold similar McGrew oils for $18,000-$45,000. Searches "R Brownell McGrew artnet price database". Confirms artist with established auction history. Fetches full listing page for comparable. Outputs FMV: $22,000 with cited auction results.</right_approach>
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
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (this is just a string change)

**Step 3: Commit**

```bash
git add src/lib/inventory-analysis-enhanced.ts
git commit -m "feat: rewrite system prompt — eliminate conservative bias, demand exhaustive research"
```

---

## Task 3: Upgrade Model, Enable Extended Thinking, Add Tools

**Files:**
- Modify: `src/lib/inventory-analysis-enhanced.ts:16` (MAX_TURNS)
- Modify: `src/lib/inventory-analysis-enhanced.ts:170-234` (runAgenticLoop)

**Step 1: Update constants and runAgenticLoop function**

Change `MAX_TURNS` from 10 to 15 (line 16):

```typescript
const MAX_TURNS = 15
```

Replace `runAgenticLoop` (lines 170-234) with:

```typescript
async function runAgenticLoop(
    client: Anthropic,
    messages: Anthropic.MessageParam[],
): Promise<Anthropic.Message> {
    let response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 16384,
        system: ENHANCED_SYSTEM_PROMPT,
        tools: [
            {
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: 20,
            },
        ],
        messages,
        temperature: 0.1,
    }, {
        headers: {
            'anthropic-beta': 'interleaved-thinking-2025-05-14',
        },
    })

    let turns = 0

    while (response.stop_reason !== 'end_turn' && turns < MAX_TURNS) {
        turns++
        log.info(`Agentic turn ${turns}, stop_reason: ${response.stop_reason}`)

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

        response = await client.messages.create({
            model: 'claude-opus-4-6',
            max_tokens: 16384,
            system: ENHANCED_SYSTEM_PROMPT,
            tools: [
                {
                    type: 'web_search_20250305',
                    name: 'web_search',
                    max_uses: 20,
                },
            ],
            messages,
            temperature: 0.1,
        }, {
            headers: {
                'anthropic-beta': 'interleaved-thinking-2025-05-14',
            },
        })
    }

    if (turns >= MAX_TURNS) {
        log.warn(`Hit MAX_TURNS (${MAX_TURNS}), returning partial response`)
    }

    return response
}
```

Key changes:
- Model: `claude-opus-4-6` (was `claude-sonnet-4-5-20250929`)
- `max_uses`: 20 (was 10)
- Added `anthropic-beta: interleaved-thinking-2025-05-14` header for thinking between tool calls
- Note: keeping `web_search_20250305` for now — the `20260209` version requires code execution tool enabled alongside it, which adds complexity. The interleaved thinking + Opus 4.6 upgrade is the higher-impact change. Can upgrade web search version in a follow-up.

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/inventory-analysis-enhanced.ts
git commit -m "feat: upgrade to Opus 4.6 with interleaved thinking, increase search limit to 20"
```

---

## Task 4: Add Secondary Model Function for Consensus

**Files:**
- Modify: `src/lib/inventory-analysis-enhanced.ts` (add new function + secondary loop)

**Step 1: Add `runSecondaryAnalysis` after the existing `analyzeWithMarketResearch` function**

Add at the end of the file (after `valueItemByDescription`):

```typescript
/**
 * Secondary analysis using Sonnet 4.6 for consensus comparison.
 * Same prompt and tools, different model for independent opinion.
 */
export async function analyzeWithMarketResearchSecondary(
    images: InventoryImage[],
    compressedImages: CompressedImage[],
): Promise<InventoryAnalysisResult> {
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

    const response = await runSecondaryAgenticLoop(client, messages)

    const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text',
    )

    if (textBlocks.length === 0) {
        throw new Error('No text response from secondary analysis model')
    }

    return extractJson(textBlocks)
}

/** Agentic loop using Sonnet 4.6 for the secondary consensus model. */
async function runSecondaryAgenticLoop(
    client: Anthropic,
    messages: Anthropic.MessageParam[],
): Promise<Anthropic.Message> {
    let response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16384,
        system: ENHANCED_SYSTEM_PROMPT,
        tools: [
            {
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: 20,
            },
        ],
        messages,
        temperature: 0.1,
    }, {
        headers: {
            'anthropic-beta': 'interleaved-thinking-2025-05-14',
        },
    })

    let turns = 0

    while (response.stop_reason !== 'end_turn' && turns < MAX_TURNS) {
        turns++
        log.info(`Secondary turn ${turns}, stop_reason: ${response.stop_reason}`)

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

        response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 16384,
            system: ENHANCED_SYSTEM_PROMPT,
            tools: [
                {
                    type: 'web_search_20250305',
                    name: 'web_search',
                    max_uses: 20,
                },
            ],
            messages,
            temperature: 0.1,
        }, {
            headers: {
                'anthropic-beta': 'interleaved-thinking-2025-05-14',
            },
        })
    }

    return response
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/inventory-analysis-enhanced.ts
git commit -m "feat: add secondary Sonnet 4.6 analysis function for two-model consensus"
```

---

## Task 5: Add Post-Analysis Validation

**Files:**
- Modify: `src/lib/inventory-analysis-enhanced.ts` (add validation function)

**Step 1: Write the failing test**

Add to `tests/lib/inventory-analysis-enhanced.test.ts` at the end of the describe block:

```typescript
describe('validateAnalysis', () => {
    test('passes for valid analysis', () => {
        const analysis = JSON.parse(validAnalysisJson())
        const result = validateAnalysis(analysis)
        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(0)
    })

    test('warns when estimatedValue is outside range', () => {
        const analysis = JSON.parse(validAnalysisJson({
            estimatedValue: '5000.00',
            valueRangeLow: '1800.00',
            valueRangeHigh: '3200.00',
        }))
        const result = validateAnalysis(analysis)
        expect(result.warnings).toContain('estimatedValue outside range')
    })

    test('warns on lazy default for artwork under $200', () => {
        const analysis = JSON.parse(validAnalysisJson({
            category: 'artwork',
            estimatedValue: '100.00',
            valueRangeLow: '50.00',
            valueRangeHigh: '150.00',
        }))
        const result = validateAnalysis(analysis)
        expect(result.warnings).toContain('suspiciously low for category')
    })

    test('warns when rationale lacks dollar amounts', () => {
        const analysis = JSON.parse(validAnalysisJson({
            valuationRationale: 'Based on general market knowledge of similar items.',
        }))
        const result = validateAnalysis(analysis)
        expect(result.warnings).toContain('rationale lacks specific prices')
    })

    test('does not warn for low-value mass-produced items', () => {
        const analysis = JSON.parse(validAnalysisJson({
            category: 'electronics',
            estimatedValue: '50.00',
            valueRangeLow: '30.00',
            valueRangeHigh: '75.00',
        }))
        const result = validateAnalysis(analysis)
        const lazyWarning = result.warnings.find(w => w.includes('suspiciously low'))
        expect(lazyWarning).toBeUndefined()
    })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/lib/inventory-analysis-enhanced.test.ts`
Expected: FAIL — `validateAnalysis` is not exported

**Step 3: Implement validateAnalysis**

Add to `src/lib/inventory-analysis-enhanced.ts` (exported):

```typescript
const HIGH_VALUE_CATEGORIES = new Set([
    'artwork', 'jewelry', 'watches', 'antiques', 'collectibles', 'furniture',
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
```

**Step 4: Update import in test file**

Add `validateAnalysis` to the import in `tests/lib/inventory-analysis-enhanced.test.ts`:

```typescript
const { analyzeWithMarketResearch, valueItemByDescription, validateAnalysis } = await import(
    '../../src/lib/inventory-analysis-enhanced'
)
```

**Step 5: Run test to verify it passes**

Run: `bun test tests/lib/inventory-analysis-enhanced.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/lib/inventory-analysis-enhanced.ts tests/lib/inventory-analysis-enhanced.test.ts
git commit -m "feat: add post-analysis validation — catches lazy defaults and missing evidence"
```

---

## Task 6: Build Consensus Orchestrator in API Route

**Files:**
- Modify: `src/app/api/inventory/analyze/route.ts` (rewrite POST handler)

**Step 1: Update the response types and imports**

Replace the content of `src/app/api/inventory/analyze/route.ts`:

```typescript
export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authServer } from '@/lib/auth'
import { env } from '@/lib/env'
import {
    type CompressedImage,
    compressImage,
    type InventoryAnalysisResult,
} from '@/lib/inventory-analysis'
import {
    analyzeWithMarketResearch,
    analyzeWithMarketResearchSecondary,
    validateAnalysis,
} from '@/lib/inventory-analysis-enhanced'
import { logger } from '@/lib/logger'
import { uploadInventoryImages } from '@/lib/uploadthing-server'

// Two-model consensus with extended thinking can take 2-4 minutes
export const maxDuration = 300

const ImageSchema = z.object({
    base64: z
        .string()
        .min(1, 'Image data is required')
        .max(10_485_760, 'Image data exceeds 10MB limit'),
    mimeType: z
        .string()
        .regex(
            /^image\/(jpeg|png|gif|webp)$/,
            'Must be a valid image MIME type',
        ),
})

const AnalyzeRequestSchema = z.object({
    images: z
        .array(ImageSchema)
        .min(1, 'At least one image is required')
        .max(5, 'Maximum 5 images per item'),
})

interface ConsensusResult {
    primary: InventoryAnalysisResult
    secondary: InventoryAnalysisResult
    consensus: 'agreed' | 'review' | 'divergent'
    merged: InventoryAnalysisResult
    divergencePercent: number
}

interface AnalyzeSuccessResponse {
    success: true
    data: InventoryAnalysisResult
    photoUrls: string[]
    consensus?: {
        status: 'agreed' | 'review' | 'divergent'
        primary: InventoryAnalysisResult
        secondary: InventoryAnalysisResult
        divergencePercent: number
    }
    validationWarnings: string[]
}

interface AnalyzeErrorResponse {
    success: false
    error: string
    details?: unknown
}

type AnalyzeResponse = AnalyzeSuccessResponse | AnalyzeErrorResponse

function calculateDivergence(a: string, b: string): number {
    const va = parseFloat(a)
    const vb = parseFloat(b)
    if (va === 0 && vb === 0) return 0
    const max = Math.max(va, vb)
    const min = Math.min(va, vb)
    return max > 0 ? ((max - min) / max) * 100 : 0
}

function mergeResults(
    primary: InventoryAnalysisResult,
    secondary: InventoryAnalysisResult,
    divergencePercent: number,
): ConsensusResult {
    let consensus: 'agreed' | 'review' | 'divergent'
    let merged: InventoryAnalysisResult

    if (divergencePercent <= 25) {
        consensus = 'agreed'
        const avgValue = (
            (parseFloat(primary.estimatedValue) +
                parseFloat(secondary.estimatedValue)) /
            2
        ).toFixed(2)
        const avgLow = (
            (parseFloat(primary.valueRangeLow) +
                parseFloat(secondary.valueRangeLow)) /
            2
        ).toFixed(2)
        const avgHigh = (
            (parseFloat(primary.valueRangeHigh) +
                parseFloat(secondary.valueRangeHigh)) /
            2
        ).toFixed(2)

        merged = {
            ...primary,
            estimatedValue: avgValue,
            valueRangeLow: avgLow,
            valueRangeHigh: avgHigh,
            valuationRationale: `[Consensus of two models] ${primary.valuationRationale}`,
            confidence:
                primary.confidence === 'high' || secondary.confidence === 'high'
                    ? 'high'
                    : primary.confidence === 'medium' ||
                        secondary.confidence === 'medium'
                      ? 'medium'
                      : 'low',
            confidenceScore: Math.max(
                (primary as any).confidenceScore ?? 0,
                (secondary as any).confidenceScore ?? 0,
            ),
        }
    } else if (divergencePercent <= 100) {
        consensus = 'review'
        // Use the higher-confidence model's values as the default
        merged =
            (primary.confidenceScore ?? 0) >= (secondary.confidenceScore ?? 0)
                ? primary
                : secondary
    } else {
        consensus = 'divergent'
        merged =
            (primary.confidenceScore ?? 0) >= (secondary.confidenceScore ?? 0)
                ? primary
                : secondary
    }

    return { primary, secondary, consensus, merged, divergencePercent }
}

/** Analyzes inventory images via two-model consensus for maximum accuracy. */
export async function POST(
    request: NextRequest,
): Promise<NextResponse<AnalyzeResponse>> {
    try {
        const { data: session } = await authServer.getSession()
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 },
            )
        }

        if (!env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Anthropic API key not configured',
                },
                { status: 503 },
            )
        }

        const body = await request.json()
        const validationResult = AnalyzeRequestSchema.safeParse(body)
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request',
                    details: validationResult.error.flatten(),
                },
                { status: 400 },
            )
        }

        const { images } = validationResult.data

        // Compress images once, share across both models
        const compressedImages: CompressedImage[] = await Promise.all(
            images.map((img) => compressImage(img.base64, img.mimeType)),
        )

        // Run both models in parallel
        const [primaryResult, secondaryResult] = await Promise.allSettled([
            analyzeWithMarketResearch(images),
            analyzeWithMarketResearchSecondary(images, compressedImages),
        ])

        // Extract primary (required)
        if (primaryResult.status === 'rejected') {
            throw primaryResult.reason
        }
        const { analysis: primary, compressedImages: primaryCompressed } =
            primaryResult.value

        // Upload photos (use primary's compressed images)
        let photoUrls: string[] = []
        try {
            photoUrls = await uploadInventoryImages(primaryCompressed)
        } catch {
            // Non-fatal
        }

        // If secondary failed, return primary only with validation
        if (secondaryResult.status === 'rejected') {
            logger.api.warn('Secondary model failed, using primary only', {
                error:
                    secondaryResult.reason instanceof Error
                        ? secondaryResult.reason.message
                        : 'Unknown',
            })
            const validation = validateAnalysis(primary)
            return NextResponse.json({
                success: true,
                data: primary,
                photoUrls,
                validationWarnings: validation.warnings,
            })
        }

        const secondary = secondaryResult.value

        // Build consensus
        const divergencePercent = calculateDivergence(
            primary.estimatedValue,
            secondary.estimatedValue,
        )
        const consensusResult = mergeResults(
            primary,
            secondary,
            divergencePercent,
        )
        const validation = validateAnalysis(consensusResult.merged)

        return NextResponse.json({
            success: true,
            data: consensusResult.merged,
            photoUrls,
            consensus: {
                status: consensusResult.consensus,
                primary: consensusResult.primary,
                secondary: consensusResult.secondary,
                divergencePercent: consensusResult.divergencePercent,
            },
            validationWarnings: validation.warnings,
        })
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('rate limit')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Rate limit exceeded - please wait a moment and try again',
                    },
                    { status: 429 },
                )
            }

            if (
                error.message.includes('401') ||
                error.message.includes('authentication')
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'API authentication failed - check ANTHROPIC_API_KEY',
                    },
                    { status: 401 },
                )
            }
        }

        logger.api.error('Inventory analysis failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
        })
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
            },
            { status: 500 },
        )
    }
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (or type errors to fix — `confidenceScore` may need type assertion)

**Step 3: Commit**

```bash
git add src/app/api/inventory/analyze/route.ts
git commit -m "feat: two-model consensus orchestrator — Opus 4.6 + Sonnet 4.6 in parallel"
```

---

## Task 7: Update InventoryForm UI for Consensus Display

**Files:**
- Modify: `src/app/forms/inventory/_components/InventoryForm.tsx`

**Step 1: Update the AnalysisResult type** (line 52-69)

Add consensus fields:

```typescript
type ConsensusInfo = {
    status: 'agreed' | 'review' | 'divergent'
    primary: AnalysisResult
    secondary: AnalysisResult
    divergencePercent: number
}

type AnalysisResponse = {
    success: true
    data: AnalysisResult & { confidenceScore?: number }
    photoUrls: string[]
    consensus?: ConsensusInfo
    validationWarnings: string[]
}
```

**Step 2: Add consensus state**

After the existing `useState` declarations (around line 114), add:

```typescript
const [consensus, setConsensus] = useState<ConsensusInfo | null>(null)
const [validationWarnings, setValidationWarnings] = useState<string[]>([])
```

**Step 3: Update analyzePhotos to handle consensus response**

In the `analyzePhotos` function, update the success branch (around line 188-204):

```typescript
if (data.success) {
    setAnalysis(data.data)
    if (data.photoUrls && data.photoUrls.length > 0) {
        setPhotoUrls(data.photoUrls)
    }
    if (data.consensus) {
        setConsensus(data.consensus)
    }
    if (data.validationWarnings) {
        setValidationWarnings(data.validationWarnings)
    }
    setFormValues({
        name: data.data.name || '',
        category: data.data.dbCategory || '',
        condition: data.data.condition || '',
        estimatedValue: data.data.estimatedValue || '',
        valueRangeLow: data.data.valueRangeLow || '',
        valueRangeHigh: data.data.valueRangeHigh || '',
        description: data.data.description || '',
    })
}
```

**Step 4: Add consensus display in the AI Analysis card**

After the existing confidence badge (around line 406), add consensus badge:

```tsx
{consensus && (
    <Badge
        variant={
            consensus.status === 'agreed'
                ? 'default'
                : consensus.status === 'review'
                  ? 'secondary'
                  : 'destructive'
        }
    >
        {consensus.status === 'agreed'
            ? 'Models Agree'
            : consensus.status === 'review'
              ? `Models Differ ${Math.round(consensus.divergencePercent)}%`
              : `Models Diverge ${Math.round(consensus.divergencePercent)}%`}
    </Badge>
)}
```

**Step 5: Add divergence detail when models disagree**

After the FMV display card (around line 487), add:

```tsx
{consensus && consensus.status !== 'agreed' && (
    <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
                Model A (Opus)
            </p>
            <p className="text-lg font-bold">
                ${Number(consensus.primary.estimatedValue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
                {consensus.primary.valuationRationale?.slice(0, 120)}...
            </p>
        </div>
        <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
                Model B (Sonnet)
            </p>
            <p className="text-lg font-bold">
                ${Number(consensus.secondary.estimatedValue).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
                {consensus.secondary.valuationRationale?.slice(0, 120)}...
            </p>
        </div>
    </div>
)}

{validationWarnings.length > 0 && (
    <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Validation Warnings</AlertTitle>
        <AlertDescription>
            <ul className="list-disc pl-4 mt-1">
                {validationWarnings.map((w, i) => (
                    <li key={i} className="text-sm">{w}</li>
                ))}
            </ul>
        </AlertDescription>
    </Alert>
)}
```

**Step 6: Remove the `useWebSearch` toggle and state**

Remove the `useWebSearch` state (line 117), the toggle UI (lines 331-376), and the `useWebSearch` from the fetch body (line 167). Web search is now always on. Update the button text to reflect the new behavior:

```tsx
<Button
    type="button"
    onClick={analyzePhotos}
    disabled={analyzing}
    className="w-full"
>
    {analyzing ? (
        <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing with two AI models (2-4 min)...
        </>
    ) : (
        <>
            <Sparkles className="h-4 w-4 mr-2" />
            Research & Value Item
        </>
    )}
</Button>
```

**Step 7: Run typecheck and verify**

Run: `bun run typecheck`
Expected: PASS

**Step 8: Commit**

```bash
git add src/app/forms/inventory/_components/InventoryForm.tsx
git commit -m "feat: consensus UI — show agreement badge, divergence details, validation warnings"
```

---

## Task 8: Update the Basic Analysis Path

**Files:**
- Modify: `src/lib/inventory-analysis.ts:207-256` (INVENTORY_ANALYSIS_SYSTEM_PROMPT)
- Modify: `src/lib/inventory-analysis.ts:293-294` (model ID)

**Step 1: Update model ID**

Change line 294 from:
```typescript
model: anthropic('claude-opus-4-5-20251101'),
```
to:
```typescript
model: anthropic('claude-opus-4-6'),
```

Do this in both `analyzeInventoryImage` (line 294) and `analyzeInventoryImageWithCompressed` (line 359).

**Step 2: Remove conservative bias from basic prompt**

In `INVENTORY_ANALYSIS_SYSTEM_PROMPT` (lines 207-256), make these changes:
- Remove line 256: `Remember: You're helping a trustee fulfill their fiduciary duty. Conservative, defensible valuations are preferred over optimistic guesses.`
- Replace with: `Remember: Accuracy is your goal. Undervaluing is just as wrong as overvaluing. If you cannot confidently identify an item, say so — do not default to a low generic value.`
- Remove the hardcoded condition percentages from lines 232: `(excellent adds 10-20%, poor deducts 30-50%)` → `(adjust based on comparable evidence)`

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/inventory-analysis.ts
git commit -m "feat: upgrade basic path to Opus 4.6, remove conservative bias from prompt"
```

---

## Task 9: Update Tests for New Schema and Behavior

**Files:**
- Modify: `tests/lib/inventory-analysis-enhanced.test.ts`
- Modify: `tests/api/inventory-analyze.test.ts`

**Step 1: Update test helper `validAnalysisJson` to include `confidenceScore`**

In `tests/lib/inventory-analysis-enhanced.test.ts`, add to the default object in `validAnalysisJson` (line 38-59):

```typescript
confidenceScore: 85,
```

**Step 2: Update model references in test assertions**

Update `makeEndTurnResponse`, `makeToolUseResponse`, `makeMaxTokensResponse` to use `claude-opus-4-6` instead of `claude-sonnet-4-5-20250929`.

**Step 3: Update `configures web_search tool` test (line 258-272)**

Change expected `max_uses` from 10 to 20:

```typescript
expect(callArgs.tools).toEqual([
    {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 20,
    },
])
```

**Step 4: Update `stops at MAX_TURNS` test (line 344-359)**

Change the loop count from 10 to 15 (new MAX_TURNS):

```typescript
for (let i = 0; i < 15; i++) {
    mockMessagesCreate.mockResolvedValueOnce(makeToolUseResponse())
}
mockMessagesCreate.mockResolvedValueOnce(makeEndTurnResponse())
// ...
// 1 initial + 15 loop iterations = 16 calls
expect(mockMessagesCreate).toHaveBeenCalledTimes(16)
```

**Step 5: Update API test mock to include new response shape**

In `tests/api/inventory-analyze.test.ts`, update `mockAnalysisResult` to include `confidenceScore`:

```typescript
confidenceScore: 75,
```

Update response assertions to check for `validationWarnings` and `consensus` fields.

**Step 6: Run all tests**

Run: `bun test tests/lib/inventory-analysis-enhanced.test.ts tests/api/inventory-analyze.test.ts`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add tests/lib/inventory-analysis-enhanced.test.ts tests/api/inventory-analyze.test.ts
git commit -m "test: update tests for Opus 4.6, confidenceScore, consensus response shape"
```

---

## Task 10: Add Feedback Loop Storage

**Files:**
- Modify: `db/schema.ts` (add `valuationCorrection` table)
- Modify: `db/validation.ts` (add Zod schema)
- Create: `src/server/trpc/routers/valuationCorrection.ts`
- Modify: `src/server/trpc/routers/index.ts` (register router)

**Step 1: Add schema**

Add to `db/schema.ts`:

```typescript
export const valuationCorrection = pgTable('valuation_correction', {
    id: serial('id').primaryKey(),
    entityId: integer('entity_id').notNull().references(() => entity.id),
    itemName: text('item_name').notNull(),
    category: text('category').notNull(),
    aiEstimatedValue: text('ai_estimated_value').notNull(),
    correctedValue: text('corrected_value').notNull(),
    correctionRatio: real('correction_ratio').notNull(), // corrected / ai
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

**Step 2: Add validation schema**

Add to `db/validation.ts`:

```typescript
export const insertValuationCorrectionSchema = createInsertSchema(valuationCorrection).omit({
    id: true,
    createdAt: true,
    correctionRatio: true,
})
```

**Step 3: Create tRPC router**

Create `src/server/trpc/routers/valuationCorrection.ts`:

```typescript
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { valuationCorrection } from '@/db/schema'
import { createTRPCRouter } from '../trpc'
import { adminProcedure } from '../trpc'

export const valuationCorrectionRouter = createTRPCRouter({
    record: adminProcedure
        .input(
            z.object({
                entityId: z.coerce.number(),
                itemName: z.string(),
                category: z.string(),
                aiEstimatedValue: z.string(),
                correctedValue: z.string(),
                notes: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const ratio =
                parseFloat(input.correctedValue) /
                parseFloat(input.aiEstimatedValue)
            await db.insert(valuationCorrection).values({
                ...input,
                correctionRatio: ratio,
            })
        }),

    recent: adminProcedure
        .input(z.object({ entityId: z.coerce.number(), limit: z.number().default(10) }))
        .query(async ({ input }) => {
            return db
                .select()
                .from(valuationCorrection)
                .where(eq(valuationCorrection.entityId, input.entityId))
                .orderBy(desc(valuationCorrection.createdAt))
                .limit(input.limit)
        }),
})
```

**Step 4: Register router**

Add to `src/server/trpc/routers/index.ts`:

```typescript
import { valuationCorrectionRouter } from './valuationCorrection'
// In appRouter:
valuationCorrection: valuationCorrectionRouter,
```

**Step 5: Push schema**

Run: `bun run db:push`
Expected: New table created

**Step 6: Commit**

```bash
git add db/schema.ts db/validation.ts src/server/trpc/routers/valuationCorrection.ts src/server/trpc/routers/index.ts
git commit -m "feat: add valuation_correction table and tRPC router for feedback loop"
```

---

## Task 11: Inject Feedback Into System Prompt

**Files:**
- Modify: `src/lib/inventory-analysis-enhanced.ts` (add feedback injection)
- Modify: `src/app/api/inventory/analyze/route.ts` (fetch corrections and pass to analysis)

**Step 1: Add feedback context builder**

Add to `src/lib/inventory-analysis-enhanced.ts`:

```typescript
export interface CorrectionFeedback {
    itemName: string
    category: string
    aiEstimatedValue: string
    correctedValue: string
}

/** Builds a feedback context string from recent admin corrections. */
export function buildFeedbackContext(corrections: CorrectionFeedback[]): string {
    if (corrections.length === 0) return ''

    const examples = corrections
        .map(
            (c) =>
                `- "${c.itemName}" (${c.category}): AI valued at $${c.aiEstimatedValue}, admin corrected to $${c.correctedValue}`,
        )
        .join('\n')

    return `\n\n## PREVIOUS CORRECTION FEEDBACK
The admin has corrected these recent valuations. Learn from these corrections:
${examples}

Adjust your approach to avoid repeating these errors.`
}
```

**Step 2: Update `analyzeWithMarketResearch` to accept optional feedback**

Update the function signature:

```typescript
export async function analyzeWithMarketResearch(
    images: InventoryImage[],
    feedbackContext?: string,
): Promise<{
    analysis: InventoryAnalysisResult
    compressedImages: CompressedImage[]
}>
```

In `runAgenticLoop`, prepend feedback to system prompt:

```typescript
const systemPrompt = feedbackContext
    ? ENHANCED_SYSTEM_PROMPT + feedbackContext
    : ENHANCED_SYSTEM_PROMPT
```

Use `systemPrompt` instead of `ENHANCED_SYSTEM_PROMPT` in the API calls.

**Step 3: Update API route to fetch and inject corrections**

In `src/app/api/inventory/analyze/route.ts`, before the `Promise.allSettled`:

```typescript
import { db } from '@/db'
import { valuationCorrection } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { buildFeedbackContext } from '@/lib/inventory-analysis-enhanced'

// Fetch recent corrections for feedback
const recentCorrections = await db
    .select({
        itemName: valuationCorrection.itemName,
        category: valuationCorrection.category,
        aiEstimatedValue: valuationCorrection.aiEstimatedValue,
        correctedValue: valuationCorrection.correctedValue,
    })
    .from(valuationCorrection)
    .orderBy(desc(valuationCorrection.createdAt))
    .limit(10)

const feedbackContext = buildFeedbackContext(recentCorrections)

// Pass feedbackContext to both analysis functions
const [primaryResult, secondaryResult] = await Promise.allSettled([
    analyzeWithMarketResearch(images, feedbackContext),
    analyzeWithMarketResearchSecondary(images, compressedImages, feedbackContext),
])
```

**Step 4: Run typecheck and tests**

Run: `bun run typecheck && bun test tests/lib/inventory-analysis-enhanced.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/inventory-analysis-enhanced.ts src/app/api/inventory/analyze/route.ts
git commit -m "feat: inject admin correction feedback into analysis prompts"
```

---

## Task 12: Final Integration Test

**Step 1: Run full test suite**

Run: `bun test`
Expected: All existing tests pass (some may need `confidenceScore` added to mock data)

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Run build**

Run: `bun run build`
Expected: PASS

**Step 4: Fix any remaining issues**

If any tests or type errors remain, fix them now.

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix: resolve any remaining type errors and test failures from valuation accuracy upgrade"
```
