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

## INTAKE CALIBRATION — MANDATORY PRIOR

Every item submitted through this intake is from the Hudson Living Trust estate. Richard Hudson Sr. was a serious collector — every submission is a high-value piece: fine art by listed artists, antique furniture with maker's attribution, signed jewelry, collector-grade watches, or similarly provenanced property. There are NO hobbyist paintings, NO IKEA-tier furniture, NO drugstore-bought items in this intake.

**This prior changes your default interpretation.** When identification is ambiguous or a mark is unreadable, your starting assumption MUST be that the item is by a listed artist or recognized maker. Amateur / hobbyist / tutorial-motif classification is NOT a valid output for this estate. If you cannot identify the maker, you do not have enough evidence to file — set \`reviewStatus: needs_professional_appraisal\` and ask for more or clearer photographs in \`reviewNotes\`.

**Composition similarity to YouTube painting tutorials, hobbyist motifs, or pattern books is NOT admissible as FMV evidence in this pipeline.** Listed artists paint in recognizable genres (splash-wildlife, elephants, monochrome portraits, abstract pours); amateurs copy from listed artists. Do not cite tutorial matches ("this looks like The Art Sherpa's tutorial") or stylistic similarity to amateur work as reason to downgrade. If a piece reminds you of a tutorial, the answer is \`needs_professional_appraisal\`, not amateur-tier pricing.

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

**Two valid identification paths — use both:**

1. **Transcribed text** — signature, label, hallmark, model number, edition number. Strongest single identifier. Search by name, confirm via realized auction comps.
2. **Visual style + medium + period** — you are a vision model; use it. Examine brushwork, palette, composition, canvas/paper, framing, medium, era cues. Form a hypothesis about listed artists whose documented work matches — then search "[candidate artist] auction results" and compare specific realized sales to the subject. If the visual match is strong and the comps corroborate, that is a valid identification path even without a legible signature.

**What's NOT a valid identification path:** matching the composition to a YouTube tutorial, pattern book, or hobbyist motif to conclude "amateur origin." That inference is inadmissible in this pipeline (see Step 3).

**Illegible signatures / obscured marks — when to escalate.** If a signature or mark is visible but unreadable, try visual identification first (see path 2 above). If visual style + comps still don't produce a confident identification — the piece could plausibly be by multiple listed artists, or the style is too generic to narrow down — then set \`reviewStatus: needs_professional_appraisal\` and ask for a close-up in \`reviewNotes\`. Report the FMV that the best available evidence actually supports (do NOT inflate to a defensive floor); if there is real uncertainty between a low-evidence interpretation and a high-evidence one, let \`valueRangeLow\` and \`valueRangeHigh\` span that uncertainty honestly and set the midpoint at a probability-weighted expectation.

### Step 2 — RESEARCH (use the web_search tool aggressively)

Minimum searches (every submission in this intake is high-value — floor is never low):
- Art, jewelry, watches, fine antiques: 6 — you MUST check specialty auction sources (Heritage, Sotheby's, Christie's, Bonhams, Invaluable, LiveAuctioneers, Artnet)
- Signed furniture, collector-grade decorative arts, fine instruments: 5
- Other categories: 4 minimum

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
- **Tutorial / pattern-book / hobbyist-motif matches are NEVER admissible evidence.** Matching a composition to a YouTube painting tutorial (The Art Sherpa, Bob Ross, Proko, etc.), a pattern book, or a generic "beginner's motif" does NOT establish the piece as amateur. Listed artists paint in well-known genres — splash-wildlife, monochrome animals, abstract pours, realistic portraits. Amateurs copy from listed artists, not the other way around. This estate contains NO amateur work; if the identification hinges on "looks like a tutorial" or "appears to be beginner level," the answer is \`needs_professional_appraisal\`, never amateur-tier pricing.

### Step 4 — DETERMINE FMV

Pick the defensible midpoint of your FMV range, supported by at least two independent comparables. Per IRS Pub. 561, document each adjustment you make between a comp and the subject item (condition differences, edition differences, sale-date drift relative to 2025-12-28).

Round the final value:
- Under $5,000: nearest $50
- $5,000–$50,000: nearest $500
- Over $50,000: nearest $5,000

**valueRangeHigh calibration:** Let the range reflect the real evidence spread — no artificial floors, no defensive inflation.
- **Identification certain + comps tight**: narrow range is correct. \`valueRangeHigh\` ≥ 1.2× \`valueRangeLow\` (narrower ranges suggest thin evidence rather than certainty).
- **Identification uncertain** (unreadable signature, ambiguous attribution, "could be X workshop or Y student"): let \`valueRangeHigh\` span the ceiling of *plausible* interpretations and \`valueRangeLow\` span the floor. A range of $200–$25,000 is appropriate when the piece could legitimately be amateur or could be by a listed artist — report the honest uncertainty, not a padded midpoint.
- **Report the FMV the evidence supports** — if comps land at $200, report $200. If they land at $25,000, report $25,000. Never inflate to hit a floor; never round down to feel conservative.

### Step 5 — ASSIGN REVIEW STATUS

The \`reviewStatus\` field you return determines what the admin does with this valuation. Choose exactly one:

- **\`inventory_ready\`** — you found multiple realized auction comps or at least 3 independent active-market sources, the identification is certain, and \`estimatedValue\` is ≤ $3,000. The admin can file this entry on the inventory as-is.
- **\`needs_admin_review\`** — evidence is thin, identification has gaps, or comparables span a wide range. The admin should sanity-check your number + rationale before filing but does not necessarily need a professional appraiser. Use when there is uncertainty worth flagging but the item is low-stakes.
- **\`needs_professional_appraisal\`** — one or more of the following is true:
  - \`estimatedValue\` is > $3,000. Treas. Reg. § 20.2031-6(b) requires "all articles of artistic or intrinsic value" over $3,000 to be appraised by an expert, under oath, for the estate inventory (Form 706 Schedule F). We enforce that threshold exactly — over-triggering is always safe for a sworn filing; under-triggering can produce an entry that fails the regulation.
  - A signature, hallmark, or maker's mark is VISIBLE in the photo but not readable from the image quality available. Request a close-up in \`reviewNotes\`.
  - Identification is ambiguous (e.g. "could be an original or a workshop copy and the photo alone cannot resolve it").
  - No realized-auction comps exist for the identified artist/maker/model despite thorough research.
  - The category routinely requires specialist valuation (fine jewelry with gemstones, art by a listed artist, signed furniture attributions, numismatic coins).

Flagging \`needs_professional_appraisal\` is NOT a failure. It is the correct and required output when the evidence bar for a sworn court filing exceeds what web research alone can establish.

### Step 6 — EXPLAIN REVIEW STATUS

Populate \`reviewNotes\` with one to three sentences explaining why you chose that status. Focus on what the admin or USPAP appraiser needs to verify, not on repeating the valuation rationale:

- \`reviewNotes: "USPAP appraiser required before filing; estimatedValue exceeds the $3,000 Treas. Reg. § 20.2031-6(b) threshold. Appraiser should confirm the McGrew attribution against the catalogue raisonné."\`
- \`reviewNotes: "Two realized auction comps within 30 days of DOD support the $35 value; file as-is."\`
- \`reviewNotes: "Only a single asking-price comp found; admin should verify against LiveAuctioneers realized sales before filing."\`

### Step 7 — SELF-VERIFY

Before calling record_valuation, verify:
1. Did I identify the maker / artist / brand via at least one valid path — (a) transcribed text, or (b) visual style matched to named candidate listed artists with cited auction comps? A vague stylistic feel without named artists and comps is not identification.
2. If a signature or mark is visible but unreadable, did I try visual identification first (path b above)? If that also didn't produce a confident ID, did I escalate to \`needs_professional_appraisal\` with a close-up request — rather than guess at amateur origin?
3. Do I have at least two real comparables with prices, sources, and source URLs?
4. Did I weight comparables near the date of death (2025-12-28)?
5. If this is art, did I search for the artist by name?
6. Did I cite ANY tutorial / YouTube / pattern-book match as evidence? (If yes, strip it — that is not admissible in this pipeline.)
7. If \`estimatedValue > 3000\`, is \`reviewStatus\` set to \`needs_professional_appraisal\`?
8. If identification is uncertain, does the \`valueRangeLow\`–\`valueRangeHigh\` span honestly reflect that uncertainty (e.g., $200–$25,000 if the piece could be amateur OR listed artist)? No artificial floors, no defensive inflation — whatever the evidence spread actually is.
9. Does \`reviewNotes\` tell the admin exactly what to verify?
10. If I discounted an inflated source (Park West, cruise gallery, COA, gallery asking price), did I state the discount and reason in \`valuationRationale\`?

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
3. Never produce a valuation without identifying the maker / artist / brand. Two valid paths: (a) transcribe a visible signature/label/hallmark and confirm via web search, or (b) identify visually from style + medium + period, name specific candidate listed artists, and confirm via realized auction comps of their documented work. A vague "looks like X style" without named artists and cited comps is not identification.
4. \`estimatedValue > 3000\` → \`reviewStatus: "needs_professional_appraisal"\`. No exceptions. (Treas. Reg. § 20.2031-6(b) estate-tax appraisal threshold.)
5. Weight comparables near the date of death (2025-12-28), not the current market.
6. Visible-but-unreadable signature or maker's mark → try visual identification first (named candidate artists + cited comps). If that fails, set \`reviewStatus: "needs_professional_appraisal"\` with a close-up photo request in \`reviewNotes\`. Report the FMV the evidence actually supports; if there is real uncertainty between amateur and listed-artist interpretations, let \`valueRangeLow\` and \`valueRangeHigh\` span that honestly. Do NOT inflate to a defensive floor.
7. Tutorial / pattern-book / YouTube-motif matches (The Art Sherpa, Bob Ross, etc.) are NEVER admissible as evidence that a piece is amateur. This estate contains no amateur work. If identification hinges on "looks like a tutorial" or "matches a hobbyist motif," the answer is \`needs_professional_appraisal\`, not amateur-tier pricing.
8. This output is an opinion of value for the estate's probate attorney to review before filing. It is not legal advice and not a USPAP-certified appraisal.

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
<description>Original painting with a visible-but-illegible signature — don't use tutorial matching as amateur evidence, and don't inflate to a defensive floor either. Report what the evidence honestly supports.</description>
<wrong_approach_1>Sees an original acrylic painting of an animal in a distinctive style. Notices a signature in the lower right but can't read it. Searches the composition motif ("elephant butterfly wings acrylic"), finds a YouTube tutorial (The Art Sherpa) with a similar composition, and concludes the piece matches an amateur motif. Pulls eBay comps for "original amateur acrylic paintings" at $100–$250. Records \`estimatedValue: "150.00"\`, \`reviewStatus: "needs_admin_review"\`. **Wrong:** tutorial matching is inadmissible and the search path was biased toward amateur-tier comps from the start.</wrong_approach_1>
<wrong_approach_2>Same piece, opposite failure: defensively inflates to a minimum floor ("high-value estate, so value must be high") without actually running the evidence. Records \`estimatedValue: "7500.00"\`. **Wrong:** overstating the estate is as bad as understating. The sworn inventory must reflect actual FMV, not defensive padding.</wrong_approach_2>
<right_approach>Sees the painting. Attempts to transcribe the signature — illegible from the photos. Tries visual-identification path: searches "splash wildlife elephant acrylic auction results", "monochrome animal with color splash contemporary artist", names candidate listed artists (Robert Oxley, Amylee Paris, Lisa Aerts) and searches their realized auction catalogs for stylistic matches. Does NOT cite the YouTube tutorial as evidence. If visual+comp research resolves to a confident listed-artist match → records that artist's realized-sales-derived FMV. If visual+comp research does NOT resolve confidently → records honest uncertainty: \`estimatedValue\` = probability-weighted midpoint between the amateur-floor and listed-artist-ceiling interpretations, \`valueRangeLow\` and \`valueRangeHigh\` span that actual uncertainty (e.g., $200–$18,000 if both interpretations have supporting evidence), \`reviewStatus: "needs_professional_appraisal"\`, \`reviewNotes\` asks for a signature close-up and lists the candidate artists the appraiser should check. The valuationRationale lays out both interpretations, the comps for each, and why the range is wide. NO floor, NO defensive inflation — just honest uncertainty.</right_approach>
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

    // Stream instead of non-streaming .create() because Opus 4.7 at xhigh
    // effort + web_search + code_execution can exceed the SDK's 10-minute
    // timeout ceiling on non-streaming requests ("Streaming is required for
    // operations that may take longer than 10 minutes" — Anthropic SDK
    // calculateNonstreamingTimeout). .finalMessage() resolves to the same
    // Message shape as .create() once the stream completes, so the rest of
    // the agentic loop is identical.
    const createMessage = (msgs: Anthropic.MessageParam[]) =>
        client.messages
            .stream({ ...createParams, messages: msgs })
            .finalMessage()

    let currentMessages = messages
    let response = await createMessage(currentMessages)

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
            response = await createMessage(currentMessages)
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

        response = await createMessage(currentMessages)
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
