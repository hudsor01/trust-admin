import { generateObject } from 'ai'
import { createOllama } from 'ollama-ai-provider-v2'
import { z } from 'zod'

/**
 * Inventory Analysis using Vercel AI SDK with local Ollama Vision Models
 *
 * Uses Qwen3-VL:8b via Ollama to analyze photos of personal property items
 * for trust inventory purposes. Leverages AI SDK's native structured output
 * with Zod schemas for type-safe responses.
 */

// DB enum values from schema.ts
type DbCategory =
    | 'JEWELRY'
    | 'ART'
    | 'COLLECTIBLES'
    | 'ELECTRONICS'
    | 'FURNITURE'
    | 'OTHER'

/**
 * Maps AI-suggested category to database enum value
 */
export function mapToDbCategory(aiCategory: string): DbCategory {
    const normalized = aiCategory.toLowerCase().trim()

    const mapping: Record<string, DbCategory> = {
        furniture: 'FURNITURE',
        electronics: 'ELECTRONICS',
        appliances: 'ELECTRONICS',
        artwork: 'ART',
        decor: 'ART',
        jewelry: 'JEWELRY',
        collectibles: 'COLLECTIBLES',
        clothing: 'OTHER',
        tools: 'OTHER',
        sports_equipment: 'OTHER',
        musical_instruments: 'COLLECTIBLES',
        kitchenware: 'OTHER',
        books_media: 'COLLECTIBLES',
        office_equipment: 'ELECTRONICS',
        outdoor: 'OTHER',
        vehicles: 'OTHER',
        other: 'OTHER',
    }

    return mapping[normalized] || 'OTHER'
}

/**
 * Zod schema for AI analysis response
 * Used by AI SDK's generateObject for type-safe structured output
 */
export const InventoryAnalysisSchema = z.object({
    name: z
        .string()
        .describe(
            'Descriptive name for the item (e.g., "Mahogany Dining Table")',
        ),
    category: z
        .enum([
            'furniture',
            'electronics',
            'appliances',
            'artwork',
            'jewelry',
            'collectibles',
            'clothing',
            'tools',
            'sports_equipment',
            'musical_instruments',
            'kitchenware',
            'decor',
            'books_media',
            'office_equipment',
            'outdoor',
            'vehicles',
            'other',
        ])
        .describe('Item category'),
    estimatedValue: z
        .string()
        .describe(
            'Fair market value estimate as decimal string (e.g., "150.00")',
        ),
    condition: z
        .enum(['excellent', 'good', 'fair', 'poor'])
        .describe('Physical condition assessment'),
    description: z.string().describe('1-2 sentence description of the item'),
    confidence: z
        .enum(['high', 'medium', 'low'])
        .describe('Model confidence in the analysis'),
})

export type InventoryAnalysis = z.infer<typeof InventoryAnalysisSchema>

/**
 * Response type with DB-mapped category
 */
export interface InventoryAnalysisResult extends InventoryAnalysis {
    dbCategory: DbCategory
    rawCategory: string
}

/**
 * Domain-specific system prompt for trust inventory analysis
 *
 * Establishes the model as a trust inventory specialist focused on:
 * - Fair market value (not retail/replacement cost)
 * - Accurate categorization with examples
 * - Flagging uncertainty rather than hallucinating
 */
export const INVENTORY_ANALYSIS_SYSTEM_PROMPT = `You are a trust inventory specialist helping to catalog personal property for estate administration.

Your role is to analyze photos of items and provide:
1. A descriptive name for the item
2. An appropriate category
3. Fair market value estimate (what it would sell for today, NOT retail or replacement cost)
4. Condition assessment
5. Brief description

IMPORTANT GUIDELINES:

**Fair Market Value:**
- Estimate what the item would realistically sell for at estate sale or secondary market
- Consider age, condition, brand, and current demand
- Do NOT use retail prices - used items typically sell for 20-40% of retail
- For antiques/collectibles, consider collector market value
- When uncertain, provide a conservative estimate

**Categories (choose one):**
- furniture: Tables, chairs, sofas, beds, cabinets, desks
- electronics: TVs, computers, phones, audio equipment, cameras
- appliances: Kitchen appliances, washers, dryers, vacuums
- artwork: Paintings, sculptures, prints, photographs (as art)
- jewelry: Rings, necklaces, watches, brooches, precious metals
- collectibles: Coins, stamps, memorabilia, vintage items, figurines
- clothing: Designer items, furs, vintage clothing (only if notable value)
- tools: Power tools, hand tools, workshop equipment
- sports_equipment: Golf clubs, bicycles, exercise equipment
- musical_instruments: Pianos, guitars, violins, etc.
- kitchenware: Cookware, china, silverware, crystal
- decor: Rugs, lamps, mirrors, decorative objects
- books_media: Rare books, vinyl records, media collections
- office_equipment: Printers, filing cabinets, office furniture
- outdoor: Patio furniture, grills, lawn equipment
- vehicles: Cars, boats, motorcycles, recreational vehicles
- other: Items not fitting above categories

**Condition Assessment:**
- excellent: Like new, minimal wear, fully functional
- good: Normal wear, fully functional, well-maintained
- fair: Noticeable wear, functional but showing age
- poor: Significant wear, may need repair, cosmetic damage

**Confidence:**
- high: Clear image, recognizable item, confident in all assessments
- medium: Some uncertainty in value or details
- low: Poor image quality, unusual item, or significant uncertainty

When you cannot determine something reliably, set confidence to "low" rather than guessing.`

/**
 * Analyzes an inventory image using Ollama vision model via Vercel AI SDK
 *
 * @param imageBase64 - Base64 encoded image data (without data URL prefix)
 * @param mimeType - Image MIME type (e.g., "image/jpeg")
 * @param ollamaUrl - Ollama server URL (defaults to localhost:11434)
 * @returns Parsed and validated inventory analysis with DB category mapping
 */
export async function analyzeInventoryImage(
    imageBase64: string,
    mimeType: string,
    ollamaUrl: string = 'http://127.0.0.1:11434',
): Promise<InventoryAnalysisResult> {
    // Create Ollama provider pointing to local server
    const ollama = createOllama({
        baseURL: `${ollamaUrl}/api`,
    })

    // Use AI SDK's generateObject for native structured output with Zod
    const { object } = await generateObject({
        model: ollama('qwen3-vl:8b'),
        schema: InventoryAnalysisSchema,
        system: INVENTORY_ANALYSIS_SYSTEM_PROMPT,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Analyze this image of a personal property item for trust inventory purposes.',
                    },
                    {
                        type: 'file',
                        data: `data:${mimeType};base64,${imageBase64}`,
                        mediaType: mimeType,
                    },
                ],
            },
        ],
        temperature: 0.1, // Low temperature for consistent output
    })

    // Map to DB category
    return {
        ...object,
        rawCategory: object.category,
        dbCategory: mapToDbCategory(object.category),
    }
}
