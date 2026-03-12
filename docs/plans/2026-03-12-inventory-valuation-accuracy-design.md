# Inventory Valuation Accuracy — Maximum Accuracy Design

**Date:** 2026-03-12
**Problem:** AI valuations are catastrophically low — a $20K painting valued at $100. The model defaults to generic low values instead of researching items properly.
**Goal:** Accuracy above all else. Cost and latency are irrelevant.

---

## Section 1: Model & Reasoning Upgrades

- **Upgrade to Opus 4.6** (`claude-opus-4-6`) for both primary and secondary analysis paths — best available vision model
- **Enable extended thinking** with adaptive thinking (Opus 4.6 auto-decides reasoning depth)
- **Enable interleaved thinking** (beta header `interleaved-thinking-2025-05-14`) — thinking blocks between tool calls so the model reasons after each web search
- **Add Think tool** — explicit pause-and-synthesize step after gathering search results, before producing final valuation JSON

## Section 2: System Prompt Rewrite

### Remove Conservative Bias
- Delete: "conservative, defensible valuations are preferred over optimistic guesses"
- Delete: "expect FMV to be 30-70% of original retail for most items"
- Add: "Your job is to find the TRUE fair market value. Undervaluing is just as wrong as overvaluing. A $20,000 painting valued at $100 is a catastrophic failure."

### Demand Exhaustive Identification
- "Before searching for prices, you MUST identify the maker/artist/brand. Read signatures, labels, stamps, hallmarks, maker's marks. If you can see text in the image, transcribe it exactly."
- "If you cannot identify the maker, say so with confidence: low. Do NOT default to a generic low value."

### Enforce Research Depth by Value Tier
- Mass-produced items: minimum 3 searches
- Handmade, signed, branded, or antique items: minimum 5 searches
- Art, jewelry, watches: minimum 6 searches, must check specialty sources

### Category-Specific Mandatory Search Sources
- **Art/paintings**: Artsy, Artnet, Heritage Auctions, MutualArt, LiveAuctioneers — MUST search artist by name
- **Furniture**: 1stDibs, Chairish, LiveAuctioneers
- **Jewelry/watches**: Worthy, Chrono24, The RealReal, auction results
- **Vehicles**: KBB, NADA, Bring a Trailer
- **General**: eBay sold listings, LiveAuctioneers

### Remove Hardcoded Condition Multipliers
- Delete the generic +10-20% / -15-60% condition adjustment table
- Replace with: "Adjust based on actual comparable condition differences found in search results"

### Lazy Default Prevention
- "If your estimated value is under $200 for ANY item that appears to be original art, antique furniture, jewelry, or a branded luxury good, you MUST explain why with specific evidence. 'Decorative' is not an explanation."

## Section 3: Few-Shot Examples & Feedback Loop

### Few-Shot Examples in System Prompt
Embed 3-5 examples showing correct analysis:

1. **"Don't be lazy" examples** — paintings/items that look generic but are valuable. Show the WRONG approach (lazy $100 default) and the RIGHT approach (read signature, research artist, find auction results).
2. **Correct output examples** — full JSON outputs for items across categories showing the calibration bar.

### Feedback Loop
- When admin corrects an AI valuation, store the correction: `{ aiValue, correctedValue, category, name }`
- On future analyses, inject recent corrections as context: "In previous valuations, you undervalued artwork by 200x. The admin corrected these."
- Storage: `valuation_correction` table or JSON field on `pendingInventoryItem`

## Section 4: Search & Fetch Tooling Upgrades

- **Upgrade web search** to `web_search_20260209` with dynamic filtering (requires beta header `code-execution-web-tools-2026-02-09`) — 24% cleaner results
- **Add `web_fetch` tool** (`web_fetch_20260209`) — fetch full auction listing pages when web search finds relevant URLs
- **Increase `max_uses`** from 10 to 20 for web search
- **Smarter agentic loop exit** — after model outputs JSON, validate `estimatedValue` is within `[valueRangeLow, valueRangeHigh]`; if not, send back for correction

## Section 5: Two-Model Consensus

Run two independent analyses in parallel for every item:

1. **Primary**: Opus 4.6 with extended thinking + web search + web fetch
2. **Secondary**: Sonnet 4.6 with extended thinking + web search + web fetch (same prompt, same tools)

### Consensus Logic (server-side)
- Values within 25%: average them, use higher confidence rating
- Values diverge 25-100%: return both to admin with "review recommended" flag
- Values diverge >100%: return both with warning "significant disagreement"

### UI Behavior
- **Agreement**: show single merged result with "consensus" badge
- **Disagreement**: show both results side-by-side, admin picks or enters own value

Both API calls fire simultaneously — latency is the slower of the two, not additive.

## Section 6: Validation & Output Quality

### Post-Analysis Validation (server-side)
1. **Range check**: `estimatedValue` must be between `valueRangeLow` and `valueRangeHigh`
2. **Rationale check**: `valuationRationale` must contain at least one dollar amount and one source name
3. **Lazy default detection**: if value < $200 and category is artwork/antiques/jewelry/watches/collectibles/furniture, flag and require justification
4. **Decimal format**: regex `^\d+\.\d{2}$` on all money fields

### Confidence Scoring Upgrade
- Add numeric `confidenceScore` (0-100) alongside the enum
- Based on: number of comparables found, recency of sales data, image quality, brand identification certainty
- Enables sorting/filtering items by reliability in admin UI

### DOD Context
- System prompt includes: "The trust grantor's date of death was December 28, 2025. Prefer comparable sales data from 2025-2026 when available."

### No Citations API (for now)
- Incompatible with structured JSON output
- `valuationRationale` with mandatory source references serves the practical purpose
- Two-pass citations approach deferred to future iteration if audit trail needed

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/inventory-analysis-enhanced.ts` | Rewrite system prompt, upgrade model to Opus 4.6, enable extended thinking + interleaved thinking, add think tool, add web_fetch tool, upgrade web_search version, increase max_uses, add post-analysis validation |
| `src/lib/inventory-analysis.ts` | Upgrade model, align system prompt with enhanced version |
| `src/app/api/inventory/analyze/route.ts` | Add two-model consensus orchestration, parallel execution, consensus logic, divergence handling |
| `src/app/forms/inventory/_components/InventoryForm.tsx` | Display consensus/divergence UI, show numeric confidence score, show both results when models disagree |
| `db/schema.ts` | Add `valuation_correction` table for feedback loop |
| `db/validation.ts` | Add Zod schema for valuation corrections |
| `tests/lib/inventory-analysis-enhanced.test.ts` | Update tests for new prompt, validation, consensus logic |
| `tests/api/inventory-analyze.test.ts` | Update API tests for consensus response shape |

## Non-Goals
- Citations API (incompatible with structured output)
- External API integrations (Heritage, Artsy, KBB) — web search covers these adequately
- Real-time price database RAG — web search is more practical given API landscape fragmentation
