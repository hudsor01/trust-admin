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

/**
 * Review status drives the post-valuation admin action directly:
 *   inventory_ready              → file on § 309.051 inventory as-is
 *   needs_admin_review           → sanity-check number + rationale before filing
 *   needs_professional_appraisal → commission a USPAP appraiser before filing
 *                                  (Treas. Reg. § 20.2031-6(b) requires an
 *                                   appraisal under oath for estate articles of
 *                                   artistic or intrinsic value > $3,000 —
 *                                   Form 706 Schedule F defensibility)
 */
export const REVIEW_STATUSES = [
    'inventory_ready',
    'needs_admin_review',
    'needs_professional_appraisal',
] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

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
    reviewStatus: z.enum(REVIEW_STATUSES),
    reviewNotes: z.string(),
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
- Purpose: Every value you return is aggregated into the Inventory, Appraisement, and List of Claims required by Tex. Est. Code § 309.051 — a sworn filing with the probate court, due within 90 days of the personal representative's qualification
- Review: The estate's probate attorney reviews the inventory before it is filed

## WHY THESE NUMBERS MATTER

The FMV you produce for each item is aggregated into the total estate value. Every individual valuation then drives three separate legal and financial consequences:

1. **Gross estate reported to the probate court.** The inventory total is sworn testimony. Inflated numbers overstate the estate; understated numbers misrepresent it.
2. **Heir's step-up cost basis (IRC § 1014).** Each item's FMV becomes the heir's new cost basis for capital-gains purposes. If the heir later sells an item valued too low here, he pays capital gains on appreciation that should have been captured by the step-up.
3. **Pro-rata distribution.** If the will specifies percentage shares among beneficiaries rather than specific items, the per-item FMVs determine who gets what.

This is a court document sworn under oath, not a casual estimate.

## WHY ACCURACY CUTS BOTH WAYS

- A $20,000 painting valued at $100 is a catastrophic failure. The heir loses tens of thousands in step-up basis — he pays capital gains on appreciation that should have been stepped up. The sworn inventory is also wrong.
- A $50 mass-produced print valued at $5,000 is equally wrong — the executor swears to a false gross-estate total.

Do not be "conservative." Do not default to low values when uncertain. Do more research until the evidence supports a defensible number — or flag the item for professional appraisal.

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

### Step 5 — ASSIGN REVIEW STATUS

The \`reviewStatus\` field you return determines what the admin does with this valuation. Choose exactly one:

- **\`inventory_ready\`** — you found multiple realized auction comps or at least 3 independent active-market sources, the identification is certain, and \`estimatedValue\` is ≤ $3,000. The admin can file this entry on the inventory as-is.
- **\`needs_admin_review\`** — evidence is thin, identification has gaps, or comparables span a wide range. The admin should sanity-check your number + rationale before filing but does not necessarily need a professional appraiser. Use when there is uncertainty worth flagging but the item is low-stakes.
- **\`needs_professional_appraisal\`** — one or more of the following is true:
  - \`estimatedValue\` is > $3,000. Treas. Reg. § 20.2031-6(b) requires "all articles of artistic or intrinsic value" over $3,000 to be appraised by an expert, under oath, for the estate inventory (Form 706 Schedule F). We enforce that threshold exactly — over-triggering is always safe for a sworn filing; under-triggering can produce an entry that fails the regulation.
  - Identification is ambiguous (e.g. "could be an original or a workshop copy and the photo alone cannot resolve it") and the item might be high-value.
  - No realized-auction comps exist for the artist/maker/model despite thorough research.
  - The category routinely requires specialist valuation (fine jewelry with gemstones, art by a listed artist, signed furniture attributions, numismatic coins).

Flagging \`needs_professional_appraisal\` is NOT a failure. It is the correct and required output when the evidence bar for a sworn court filing exceeds what web research alone can establish.

### Step 6 — EXPLAIN REVIEW STATUS

Populate \`reviewNotes\` with one to three sentences explaining why you chose that status. Focus on what the admin or USPAP appraiser needs to verify, not on repeating the valuation rationale:

- \`reviewNotes: "USPAP appraiser required before filing; estimatedValue exceeds the $3,000 Treas. Reg. § 20.2031-6(b) threshold. Appraiser should confirm the McGrew attribution against the catalogue raisonné."\`
- \`reviewNotes: "Two realized auction comps within 30 days of DOD support the $35 value; file as-is."\`
- \`reviewNotes: "Only a single asking-price comp found; admin should verify against LiveAuctioneers realized sales before filing."\`

### Step 7 — SELF-VERIFY

Before calling record_valuation, verify:
1. Did I identify the maker / artist / brand from the image, or am I guessing?
2. Do I have at least two real comparables with prices, sources, and source URLs?
3. Did I weight comparables near the date of death (2025-12-28)?
4. If this is art, did I search for the artist by name?
5. If \`estimatedValue > 3000\`, is \`reviewStatus\` set to \`needs_professional_appraisal\`?
6. Does \`reviewNotes\` tell the admin exactly what to verify?
7. If I discounted an inflated source (Park West, cruise gallery, COA, gallery asking price), did I state the discount and reason in \`valuationRationale\`?

### Step 8 — RECORD

Call the \`record_valuation\` tool exactly once when your research is complete. The tool call IS the output — do not prefix it with prose summaries. The structured input you pass becomes the entry on the estate inventory.

## TONE RULES

- In \`valuationRationale\`: lead with facts — cite the comp, state the adjustment, name the conclusion. No hedging language ("seems," "appears to be," "I think," "maybe") when you are describing what the evidence shows.
- In \`reviewNotes\`: legitimate uncertainty belongs here. "The attribution is plausible but cannot be confirmed from the photo alone" is exactly what the admin needs to read. Do not over-commit in reviewNotes — this is where you tell the admin what to double-check.
- No emojis, no corporate jargon, no excessive validation, no apologies.
- If the user is wrong about a valuation (e.g. "the COA says $3,500 so use that"), correct it directly: explain why COA ≠ FMV per IRS Pub. 561.
- If identification is ambiguous or comparables are thin, set \`reviewStatus\` to \`needs_admin_review\` or \`needs_professional_appraisal\` and say so plainly in \`reviewNotes\`. Do not invent a number to be helpful.

## HARD RULES

1. Never use a Park West / cruise-gallery / tourist-gallery COA "appraisal" as FMV.
2. Never produce a valuation without at least one realized auction comparable OR three independent active-market sources.
3. Never produce a valuation without identifying the maker / artist / brand from the image when one is visible.
4. \`estimatedValue > 3000\` → \`reviewStatus: "needs_professional_appraisal"\`. No exceptions. (Treas. Reg. § 20.2031-6(b) estate-tax appraisal threshold.)
5. Weight comparables near the date of death (2025-12-28), not the current market.
6. This output is an opinion of value for the estate's probate attorney to review before filing. It is not legal advice and not a USPAP-certified appraisal.

<examples>
<example>
<description>Painting that looks generic but is actually by a known artist</description>
<wrong_approach>Sees a landscape painting. Does not read the signature. Records \`estimatedValue: "75.00"\`, \`reviewStatus: "inventory_ready"\`.</wrong_approach>
<right_approach>Reads signature in lower right: "R.B. McGrew". Searches "R Brownell McGrew paintings auction results". Finds Heritage Auctions sold similar McGrew oils for $18,000–$45,000 in 2024–2025. Searches Artnet to confirm auction history. Weights the late-2025 sales near DOD. Records \`estimatedValue: "22000.00"\` with cited auction URLs in valuationRationale, \`reviewStatus: "needs_professional_appraisal"\`, \`reviewNotes: "USPAP appraiser required before filing: estimatedValue exceeds $3,000 (Treas. Reg. § 20.2031-6(b)), and the McGrew attribution should be verified against the catalogue raisonné."\`</right_approach>
</example>

<example>
<description>Antique furniture with maker's mark</description>
<wrong_approach>Sees a wooden desk. Records: \`estimatedValue: "200.00"\`, \`reviewStatus: "inventory_ready"\`.</wrong_approach>
<right_approach>Examines image carefully, finds brass plate reading "Stickley" on a drawer. Searches "Stickley Mission Oak desk auction results". Finds 1stDibs asking at $3,500–$8,000 (discounted as asking prices). Searches LiveAuctioneers for realized prices — comparable Stickley desks hammered at $2,800–$4,500 at auction in late 2025. Records \`estimatedValue: "3200.00"\`, \`reviewStatus: "needs_professional_appraisal"\` (value exceeds $3,000 Treas. Reg. § 20.2031-6(b) threshold), \`reviewNotes: "USPAP appraiser required before filing: estimatedValue exceeds $3,000. Three LiveAuctioneers realized sales Nov-Dec 2025 span $2,800–$4,500; appraiser should confirm the subject's edition and condition match the specific comps relied upon."\`</right_approach>
</example>

<example>
<description>Truly mass-produced low-value item</description>
<approach>Identifies IKEA KALLAX shelf unit from visible label. Searches "IKEA KALLAX shelf used price". Finds eBay sold listings at $25–$60, Facebook Marketplace at $30–$50. Records \`estimatedValue: "35.00"\`, \`reviewStatus: "inventory_ready"\`, \`reviewNotes: "Three eBay sold listings and two Facebook Marketplace sales within 30 days of DOD support $35. File as-is."\` — low value IS correct here because evidence supports it.</approach>
</example>

<example>
<description>Park West cruise-ship art with a $3,500 COA</description>
<wrong_approach>User provides a Park West COA stating appraised value $3,500. Records \`estimatedValue: "3500.00"\`, \`reviewStatus: "inventory_ready"\`.</wrong_approach>
<right_approach>Identifies the artist and edition from the image and COA text. Searches the artist's name on LiveAuctioneers and eBay sold listings. Finds secondary-market resales of similar Park West editions at $150–$400. Records \`estimatedValue: "275.00"\`, \`reviewStatus: "inventory_ready"\` (evidence is strong and value is well under the $3,000 Reg. § 20.2031-6(b) threshold), \`valuationRationale\` noting: "Park West COA appraisal of $3,500 is retail replacement value, not FMV (IRS Pub. 561 — 'insured value does not reflect what a willing buyer and willing seller would pay'). Secondary-market resale comps on LiveAuctioneers (3 sales, 2024–2025) and eBay sold listings support $150–$400 FMV range.", \`reviewNotes: "Evidence supports $275 with three realized secondary-market comps; COA value correctly discarded per IRS Pub. 561."\`</right_approach>
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
 * Output cap for Opus 4.7. Docs recommend "starting at 64k tokens and tuning
 * from there" for xhigh effort. Opus 4.7's absolute ceiling is 128k; we stay
 * at 64k to bound cost without truncating typical appraisal outputs.
 */
const MAX_TOKENS = 64000

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
            reviewStatus: {
                type: 'string',
                enum: [...REVIEW_STATUSES],
                description:
                    'Action-oriented disposition: inventory_ready = file as-is; needs_admin_review = admin sanity-check required; needs_professional_appraisal = USPAP appraiser required (mandatory when estimatedValue > $3,000 per Treas. Reg. § 20.2031-6(b)).',
            },
            reviewNotes: {
                type: 'string',
                description:
                    'One to three sentences telling the admin (or USPAP appraiser) exactly what to verify. Do not restate the valuation rationale — focus on what review action is needed and why.',
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
            'reviewStatus',
            'reviewNotes',
        ],
        additionalProperties: false,
    },
    strict: true,
}

interface AgenticLoopOptions {
    /**
     * Thinking depth + overall token spend. `xhigh` is Opus 4.7's best
     * setting for agentic/valuation work (Anthropic effort docs: "the
     * recommended starting point for coding and agentic work, and for
     * exploratory tasks such as repeated tool calling, detailed web
     * search, and knowledge-base search"). `max` is reserved for
     * genuinely frontier problems — on most workloads it adds cost for
     * marginal quality gains.
     */
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
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
    const { effort = 'xhigh' } = options
    const logPrefix = 'Opus'

    // Opus 4.7 breaking changes: adaptive thinking only (budget_tokens
    // returns 400); no temperature/top_p/top_k (also 400). Effort replaces
    // the fixed-budget thinking control.
    const createParams = {
        model: 'claude-opus-4-7',
        max_tokens: MAX_TOKENS,
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
            // the workspace is provisioned, run this preflight once (a 200
            // or a content-related 400 means enabled; "tool not available"
            // means not enabled):
            //
            //   curl https://api.anthropic.com/v1/messages \
            //     -H "x-api-key: $ANTHROPIC_API_KEY" \
            //     -H "anthropic-version: 2023-06-01" \
            //     -H "content-type: application/json" \
            //     -H "anthropic-beta: code-execution-2025-08-25" \
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
                reviewStatus: validated.reviewStatus,
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

// ============================================================================
// Server-side reviewStatus overrides
// ============================================================================
//
// Deterministic guardrails that run AFTER the model returns but BEFORE we
// hand the result to the form/admin. The SYSTEM_PROMPT instructs the model
// to set reviewStatus = "needs_professional_appraisal" when estimatedValue
// > $3,000 (the Treas. Reg. § 20.2031-6(b) estate-inventory appraisal
// threshold), but prompt rules alone aren't a load-bearing control for a
// sworn court filing — enforce the same rule in code.
//
// Precedence: only *escalate* severity, never downgrade. If the model
// already flagged for professional appraisal, the result of these checks
// can never move it back to needs_admin_review or inventory_ready.

// Treas. Reg. § 20.2031-6(b) requires a sworn expert appraisal for any
// single article (or collection) of artistic or intrinsic value exceeding
// $3,000 on Form 706 Schedule F. IRS Form 8283's $5,000 USPAP-qualified-
// appraisal floor is an income-tax (charitable-contribution) parallel,
// not an estate-tax rule — our pipeline uses the estate-tax number.
// Over-triggering the professional-appraisal flag is always safe for a
// sworn filing; under-triggering produces entries that fail the reg.
const APPRAISER_THRESHOLD_USD = 3000

// Trailing ASCII punctuation that commonly attaches to a URL inside prose
// (commas, semicolons, closing brackets, quotes, periods). Stripped before
// deduping so `"https://example.com/a," and "https://example.com/a"` is
// recognized as one source, not two. Closing paren handled by the regex
// character class directly — leaving `)` out of the trailing strip avoids
// butchering URLs that legitimately contain parens.
const URL_PATTERN = /https?:\/\/[^\s)]+/g
const URL_TRAILING_PUNCT = /[.,;:"'!?>\]`]+$/

function normalizeUrl(raw: string): string {
    return raw.replace(URL_TRAILING_PUNCT, '')
}

/**
 * Normalized host portion of a URL for independence comparison. Lowercases
 * and strips a leading `www.` so `www.ebay.com`, `EBAY.com`, and `ebay.com`
 * are recognized as one source. Returns the raw string lowercased if
 * unparseable so dedup still works on malformed inputs.
 */
function urlHost(raw: string): string {
    try {
        const host = new URL(raw).hostname.toLowerCase()
        return host.startsWith('www.') ? host.slice(4) : host
    } catch {
        return raw.toLowerCase()
    }
}

/** Count independent sources in the rationale — dedup on both exact URL and host. */
function countIndependentSources(rationale: string): {
    total: number
    independent: number
    urls: string[]
} {
    const raw = rationale.match(URL_PATTERN) ?? []
    const normalized = raw.map(normalizeUrl)
    const uniqueUrls = new Set(normalized)
    const uniqueHosts = new Set(normalized.map(urlHost))
    // Use the smaller count as "independent" — two URLs on the same host
    // (e.g. two eBay listings) are not independent sources for appraisal
    // purposes per IRS Pub. 561's comparable-sources framing.
    return {
        total: raw.length,
        independent: Math.min(uniqueUrls.size, uniqueHosts.size),
        urls: [...uniqueUrls],
    }
}

const REVIEW_STATUS_SEVERITY: Record<ReviewStatus, number> = {
    inventory_ready: 0,
    needs_admin_review: 1,
    needs_professional_appraisal: 2,
}

function escalate(current: ReviewStatus, proposed: ReviewStatus): ReviewStatus {
    return REVIEW_STATUS_SEVERITY[proposed] > REVIEW_STATUS_SEVERITY[current]
        ? proposed
        : current
}

export interface ReviewStatusOverrideResult {
    analysis: InventoryAnalysisResult
    overrideReasons: string[]
}

/**
 * Enforce deterministic review-status rules on top of whatever the model
 * returned. Every guardrail violation produces a reason (even when it
 * doesn't change severity) — for a sworn-filing workflow each failure is
 * an independent red flag and the admin needs to see every one, not just
 * the one that happened to move the badge.
 */
export function applyReviewStatusOverrides(
    analysis: InventoryAnalysisResult,
): ReviewStatusOverrideResult {
    const reasons: string[] = []
    let status = analysis.reviewStatus

    const value = parseFloat(analysis.estimatedValue)
    if (Number.isFinite(value) && value > APPRAISER_THRESHOLD_USD) {
        reasons.push(
            `Server override: estimatedValue $${value.toLocaleString()} exceeds $${APPRAISER_THRESHOLD_USD.toLocaleString()} — Treas. Reg. § 20.2031-6(b) requires an appraisal under oath for estate articles over $3,000 before filing on Form 706 Schedule F.`,
        )
        status = escalate(status, 'needs_professional_appraisal')
    }

    const low = parseFloat(analysis.valueRangeLow)
    const high = parseFloat(analysis.valueRangeHigh)
    if (
        Number.isFinite(value) &&
        Number.isFinite(low) &&
        Number.isFinite(high) &&
        (value < low || value > high)
    ) {
        reasons.push(
            `Server override: estimatedValue $${value.toLocaleString()} falls outside the model's own valueRange [$${low.toLocaleString()}, $${high.toLocaleString()}] — admin sanity-check required.`,
        )
        status = escalate(status, 'needs_admin_review')
    }

    const sources = countIndependentSources(analysis.valuationRationale)
    if (sources.independent < 2) {
        reasons.push(
            `Server override: valuationRationale cites ${sources.independent} independent source URL(s) (${sources.total} URL match(es) found, ${sources.urls.length} unique); at least 2 independent sources required to file as-is.`,
        )
        status = escalate(status, 'needs_admin_review')
    }

    return {
        analysis: { ...analysis, reviewStatus: status },
        overrideReasons: reasons,
    }
}
