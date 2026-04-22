---
name: asset-valuator
description: >
  Research-backed fair market value (FMV) estimation for estate and trust assets.
  Use this skill whenever the user asks about the value, worth, or price of ANY item
  for trust, estate, probate, or inventory purposes. Triggers include: valuation requests
  for personal property (furniture, jewelry, art, collectibles, electronics), vehicles,
  real estate, financial accounts, or any tangible asset. Also use when the user submits
  an inventory form, describes an item to value, asks "what is this worth", "how much is
  this valued at", "FMV of", "appraise", "estate value", or any variation of requesting
  a price or valuation. Use this skill even if the user just names an item and asks for
  its value without explicitly saying "valuation" — the intent is the same. This skill
  uses web search to find real comparable sales data, not just training knowledge.
---

# Asset Valuator

Provide accurate, evidence-based fair market value (FMV) estimates for trust and estate assets by researching real market data online.

## Why This Skill Exists

Estate trustees have a fiduciary duty to report accurate asset values. FMV for IRS purposes is defined as: **the price at which the property would change hands between a willing buyer and a willing seller, neither being under any compulsion to buy or sell, and both having reasonable knowledge of relevant facts** (IRS Publication 561).

Training data alone produces ballpark estimates. This skill closes the gap by searching for actual comparable sales, auction results, dealer listings, and market reports to produce defensible valuations with cited evidence.

## How It Provides Value

### The Problem with Training-Data-Only Valuations

Without real market data, Claude's valuations suffer from two systematic biases:

1. **Overvaluation of commodity items.** Training data skews toward retail replacement cost. A La-Z-Boy recliner retailing at $1,200 has an estate/secondary FMV of $75-150. Without search evidence, the model splits the difference around $400-600 — 3-4x too high.

2. **Undervaluation of niche collectibles.** Training data doesn't capture current collector demand. A specific Noritake pattern from the 1960s might command $15-25/piece on Replacements.com, making a full 12-place setting worth $500-800. Without search, the model defaults to "china sets don't sell well" and values it at $50-100.

### How Web Search Fixes This

The research loop injects real transaction data into the model's context before it commits to a number:

- **eBay sold listings** show actual completed sales at secondary market prices
- **Auction house results** (LiveAuctioneers, Heritage, Christie's) provide dated hammer prices
- **Dealer platforms** (1stDibs, Chairish, Ruby Lane) show asking prices that can be discounted for FMV
- **Vehicle databases** (KBB, NADA) provide standardized book values
- **County appraisal districts** provide tax-assessed values for real property

With 2-5 real comparable sales in context, the model does what a human appraiser does: identifies the closest matches, adjusts for condition differences, and triangulates a defensible FMV. The `valuationRationale` field cites specific sources with prices and dates — evidence a probate court will accept.

### Cost Tradeoff

| Mode | Cost/Item | Latency | Evidence |
|---|---|---|---|
| Fast (training data) | $0.02-0.05 | 5-15s | None — model's best guess |
| Research (web search) | $0.08-0.25 | 30-90s | Cited comparable sales |

For a 200-item estate: $16-50 total (research) vs $4-10 (fast). Research is worth it for anything over ~$500 or subject to IRS scrutiny. Fast is fine for bulk commodity items.

## Core Workflow

For every valuation request, follow these steps in order:

### 1. Identify the Item

Extract as much detail as possible from the user's description or photos:
- **What**: Exact name, brand/maker, model, material, dimensions
- **When**: Year of manufacture, era, generation
- **Condition**: Excellent / Good / Fair / Poor (use definitions below)
- **Provenance**: Any ownership history, documentation, certificates

If the user provides a photo, describe what you see before searching. If critical details are missing (brand, model, year), ask before searching — a "mahogany dining table" search is far less useful than "Henredon Aston Court dining table."

### 2. Research Comparable Sales

Run **3-6 targeted web searches** to find real market evidence. Search strategy by asset type:

**Personal Property (furniture, electronics, collectibles, jewelry, art):**
- Search 1: `"[brand] [model]" sold price` or `"[brand] [model]" auction results`
- Search 2: `"[item description]" eBay sold` or `"[item]" estate sale price`
- Search 3: `"[item]" [specialty marketplace] price` (1stDibs, Chairish, Ruby Lane, LiveAuctioneers, etc.)
- Search 4 (if needed): `"[item]" value guide` or `"[item]" price guide [year]`

**Vehicles:**
- Search 1: `[year] [make] [model] [trim] KBB value`
- Search 2: `[year] [make] [model] NADA value`
- Search 3: `[year] [make] [model] sold price [region]`
- For classic/specialty: `[year] [make] [model] Bring a Trailer results` or Hagerty valuation

**Real Property (houses, land, ranch):**
- Search 1: `[address] Zillow` or `[address] Redfin estimate`
- Search 2: `[county] [state] property tax assessment [address]`
- Search 3: `comparable home sales [neighborhood/area] [year]`
- Search 4: `[county] appraisal district property search`
- For ranch/land: `[county] [state] land price per acre [year]`

**Financial Accounts (bank, investment, insurance):**
- These use statement balances, not market estimates. The valuation type is STATEMENT_BALANCE.
- Search only if the user needs current market value for securities (stock price, fund NAV).

After searching, **fetch full pages** for the most relevant results — search snippets rarely contain enough pricing detail.

### 3. Synthesize and Value

Analyze the comparable sales data and determine FMV:

- **Identify 2-5 comparable sales** with actual transaction prices (sold listings, auction hammer prices). Asking prices are less reliable but acceptable when sold data is scarce.
- **Adjust for condition**: Excellent (+10-20% over average), Good (baseline), Fair (-15-30%), Poor (-40-60%)
- **Adjust for market timing**: Sales from 6+ months ago may not reflect current demand. Note if the market is trending up or down.
- **Weight evidence**: Prioritize sold prices > auction results > dealer asking prices > price guides > your estimate

### 4. Present the Valuation

Structure every valuation response with these elements:

**Item Identification**
- Full descriptive name (include brand/maker if known)
- Category, materials, era/year
- Condition assessment with specific observations

**Fair Market Value**
- **FMV estimate**: Single best estimate as a decimal string (e.g., "1500.00")
- **Value range**: Low and high bounds reflecting market uncertainty
- **Valuation type**: MARKET_ESTIMATE (for research-based) or APPRAISAL (if referencing a professional appraisal)

**Evidence & Rationale**
- List each comparable sale found: source, price, date, condition notes
- Explain adjustments made (condition, age, regional market)
- State confidence level: high / medium / low
- Note if professional appraisal is recommended (always recommend for items over $5,000, jewelry, fine art, real estate)

## Condition Definitions

| Rating | Description | Value Impact |
|---|---|---|
| Excellent | Like new, minimal wear, fully functional, no repairs needed | +10-20% |
| Good | Normal age-appropriate wear, fully functional, well-maintained | Baseline |
| Fair | Noticeable wear, functional but showing age, may need minor repairs | -15-30% |
| Poor | Significant wear/damage, may need restoration | -40-60% |

## Valuation Type Mapping

These map directly to the trust-admin database `ValuationType` enum:

| Type | When to Use |
|---|---|
| MARKET_ESTIMATE | Web-researched FMV (most common output of this skill) |
| APPRAISAL | Referencing a professional appraisal document |
| TAX_ASSESSED | County tax assessment value (real property) |
| STATEMENT_BALANCE | Bank/investment account balance from statement |
| PURCHASE_PRICE | Original purchase price (use only if no better data) |
| BOOK_VALUE | Depreciated book value (vehicles via KBB/NADA) |
| SELF_ASSESSED | Owner's estimate with no supporting evidence |

## Category Mapping

Map items to these database categories:

| DB Category | Items |
|---|---|
| FURNITURE | Tables, chairs, sofas, beds, dressers, cabinets, desks |
| ELECTRONICS | TVs, computers, appliances, audio equipment, cameras |
| JEWELRY | Rings, watches, necklaces, bracelets, precious metals/stones |
| ART | Paintings, sculptures, prints, photography, decorative art |
| COLLECTIBLES | Antiques, coins, stamps, figurines, china, crystal, silverware, musical instruments |
| OTHER | Tools, clothing, sports equipment, outdoor gear, kitchenware |

## Output Format for API Integration

When providing valuations that will feed into the trust-admin system, structure the data to match these schemas:

**For inventory items (pendingInventoryItem / personalProperty):**
```
name:               Specific descriptive name with brand/maker
category:           One of: JEWELRY | ART | COLLECTIBLES | ELECTRONICS | FURNITURE | OTHER
description:        2-3 sentence description with notable features
estimatedValue:     FMV as decimal string, e.g. "1500.00"
valueRangeLow:      Conservative low estimate, e.g. "1200.00"
valueRangeHigh:     Optimistic high estimate, e.g. "1800.00"
condition:          excellent | good | fair | poor
conditionNotes:     Specific condition observations
valuationRationale: How value was determined — comparable sales, market data, sources
confidence:         high | medium | low
confidenceNotes:    What affects confidence — image quality, item rarity, data availability
```

**For the valuation table (cross-asset):**
```
valuationDate:  ISO timestamp of when valuation was performed
value:          FMV as decimal string
valuationType:  MARKET_ESTIMATE (or appropriate type from mapping above)
source:         Comma-separated list of sources used (e.g., "eBay sold listings, 1stDibs, LiveAuctioneers")
notes:          Valuation rationale and comparable sales summary
```

## Implementation

The skill's logic is implemented in `src/lib/inventory-analysis.ts`. It uses `@anthropic-ai/sdk` directly (not the AI SDK) because the `web_search_20260209` server-side tool with dynamic filtering requires the native Anthropic client. Key components:

- **`analyzeWithMarketResearch(images)`** — Photo-based valuation. Agentic loop runs Claude Opus 4.7 at `xhigh` effort with adaptive thinking, `web_search_20260209` (dynamic filtering), `code_execution_20260120`, and a strict `record_valuation` client tool for structured output. Up to `MAX_TURNS` (15) continuations.
- **`applyReviewStatusOverrides(analysis)`** — Deterministic server-side guardrails applied after the model returns. Escalates `reviewStatus` when `estimatedValue > $3,000` (Treas. Reg. § 20.2031-6(b)), when `estimatedValue` falls outside the model's own range, or when the rationale cites fewer than two independent source URLs.
- **Route handler** (`src/app/api/inventory/analyze/route.ts`) — Access-cookie gated, per-IP rate-limited, runs analysis + override guardrails.
- **Submission form** (`InventoryForm.tsx`) — Single analyze button; no fast/research toggle.

## Special Considerations

**Date-of-Death (DOD) Valuation**: For estate tax purposes, assets are valued as of the date of death. When the user specifies a DOD date, search for sales data from that time period specifically, not current market prices. The alternate valuation date is 6 months after DOD.

**Texas-Specific**: The Hudson Living Trust is governed by Texas law. For real property, use the county appraisal district (CAD) records as one data point. Texas has no state income tax, but property tax assessments are public and useful for real estate FMV cross-referencing.

**Items Under $500**: For low-value household goods, a brief 1-2 search approach is sufficient. Don't over-research a $30 lamp.

**Items Over $5,000**: Always recommend professional appraisal. Provide your research-based estimate as a reference point, but flag that a certified appraiser's report will be needed for IRS Form 706 if the total estate exceeds the filing threshold.

**Grouped Items**: Some items are more efficiently valued as a lot (e.g., "complete set of Noritake china, 12 place settings" rather than pricing each plate). Group when it makes sense and note the grouping.
