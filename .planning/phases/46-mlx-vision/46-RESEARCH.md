# Phase 46: MLX Vision Integration - Research

**Researched:** 2026-01-18
**Domain:** Local vision-language model inference for inventory photo analysis
**Confidence:** HIGH

<research_summary>
## Summary

Researched options for building a local vision-language model inference endpoint that can analyze photos of physical property items (furniture, electronics, etc.) and suggest name, category, and estimated value.

**Decision: Use Ollama with Qwen3-VL:8b**

After comparing MLX-VLM vs Ollama and Qwen3-VL vs Gemma3:12b:

1. **Ollama over MLX-VLM** - Already configured on your machine (port 11434), OpenAI-compatible API, simpler setup, good Apple Silicon optimization via GGUF
2. **Qwen3-VL:8b over Gemma3:12b** - Better object detection (Gemma failed detection benchmarks), designed for structured JSON output, purpose-built vision model vs bolted-on multimodal

**Primary recommendation:** `ollama pull qwen3-vl:8b` and call via OpenAI SDK from Next.js. Zero new infrastructure needed.

**Hardware:** M3 Pro 36GB unified RAM - easily handles Qwen3-VL:8b (~8GB) with room for Next.js dev server
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Component | Choice | Why |
|-----------|--------|-----|
| Inference Runtime | **Ollama** (already installed) | Configured in .zshrc, port 11434, OpenAI-compatible |
| Vision Model | **Qwen3-VL:8b** | Best object detection, structured JSON, 6.1GB download |
| Client SDK | **OpenAI SDK** (openai npm package) | Works with Ollama's /v1 endpoint |

### Model Comparison (Why Qwen3-VL)
| Capability | Qwen3-VL:8b | Gemma3:12b |
|------------|-------------|------------|
| Object detection | ✅ Excellent | ⚠️ Failed benchmarks |
| Structured JSON | ✅ Designed for it | ⚠️ Less reliable |
| Localization | ✅ Bounding boxes, coordinates | ❌ Limited |
| RAM usage | ~8GB | ~10GB |
| Purpose | Dedicated VLM | Text model + vision |

### Available Ollama Vision Models
| Model | Size | RAM | Notes |
|-------|------|-----|-------|
| **qwen3-vl:8b** | 6.1GB | ~8GB | ✅ Recommended |
| qwen3-vl:4b | 3.3GB | ~5GB | Faster, lower quality |
| qwen3-vl:32b | 21GB | ~25GB | Best quality, fits your 36GB |
| qwen2.5vl:7b | 4.7GB | ~6GB | Previous gen, still good |
| minicpm-v | 5.5GB | ~7GB | Efficient alternative |

### Your Existing Infrastructure
```
Ollama (from ~/.zshrc):
├── Host: http://127.0.0.1:11434
├── Keep alive: 10m
├── Max loaded models: 1
├── Flash attention: enabled
└── KV cache: q4_0 (memory efficient)

MLX-LM (from ~/.local/bin/mlx-server):
├── Port: 8000
├── Models: Qwen3-4B/8B/14B (text-only)
└── Draft model: Qwen3-0.6B
```

**What's needed for Phase 46:**
```bash
ollama pull qwen3-vl:8b   # One command, done
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
trust-admin/
├── src/
│   └── app/
│       └── api/
│           └── inventory/
│               └── analyze/route.ts   # Calls Ollama
└── .env.local
    OLLAMA_URL=http://127.0.0.1:11434
```

### Pattern 1: Ollama as Vision Backend
**What:** Use existing Ollama server for vision inference
**When to use:** Always - it's already running, OpenAI-compatible
**Why:** No new infrastructure, consistent with your existing setup

```
┌─────────────────┐         HTTP POST         ┌──────────────────┐
│   Next.js App   │ ─────────────────────────>│  Ollama          │
│   (Port 3000)   │   /v1/chat/completions    │  (Port 11434)    │
│                 │<─────────────────────────-│                  │
│   API Route     │       JSON response       │  qwen3-vl:8b     │
└─────────────────┘                           └──────────────────┘
```

**Next.js API route:**
```typescript
// src/app/api/inventory/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const ollama = new OpenAI({
  baseURL: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434/v1',
  apiKey: 'ollama', // Required by SDK, ignored by Ollama
})

export async function POST(request: NextRequest) {
  const { imageBase64, mimeType } = await request.json()

  const response = await ollama.chat.completions.create({
    model: 'qwen3-vl:8b',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64}` }
        },
        {
          type: 'text',
          text: `Analyze this household item for a trust inventory.

Respond with ONLY valid JSON, no other text:
{
  "name": "specific item name",
  "category": "furniture|electronics|appliances|artwork|jewelry|collectibles|clothing|tools|sports_equipment|musical_instruments|kitchenware|decor|books_media|office_equipment|outdoor|vehicles|other",
  "estimatedValue": "dollar amount as string, e.g. '150.00'",
  "condition": "excellent|good|fair|poor",
  "description": "1-2 sentence description",
  "brand": "brand if visible, otherwise null",
  "material": "primary material if identifiable, otherwise null"
}`
        }
      ]
    }],
    max_tokens: 500,
    temperature: 0.1, // Low temp for consistent JSON
  })

  const content = response.choices[0]?.message?.content ?? '{}'

  try {
    return NextResponse.json(JSON.parse(content))
  } catch {
    // Fallback if JSON parsing fails
    return NextResponse.json({
      error: 'Failed to parse AI response',
      raw: content
    }, { status: 422 })
  }
}
```

### Pattern 2: Structured Output Prompting
**What:** Careful prompt engineering for reliable JSON output
**When to use:** When you need structured data (item categorization)

```typescript
const INVENTORY_PROMPT = `Analyze this household item for a trust property inventory.

You must respond with ONLY a valid JSON object, no markdown, no explanation:
{
  "name": "specific descriptive name of the item",
  "category": "exactly one of: furniture, electronics, appliances, artwork, jewelry, collectibles, clothing, tools, sports_equipment, musical_instruments, kitchenware, decor, books_media, office_equipment, outdoor, vehicles, other",
  "estimatedValue": "estimated fair market value in USD as string (e.g., '250.00')",
  "condition": "exactly one of: excellent, good, fair, poor",
  "description": "1-2 sentence description suitable for inventory records",
  "brand": "brand name if visible, otherwise null",
  "material": "primary material if identifiable (wood, metal, fabric, etc.), otherwise null"
}`
```

**Key prompting tips for Qwen3-VL:**
- Use "ONLY valid JSON" to prevent markdown wrapping
- List exact enum values to constrain output
- Use temperature 0.1-0.2 for consistency
- Include example format in prompt

### Anti-Patterns to Avoid
- **Starting new inference server:** Ollama is already running, use it
- **High temperature for structured output:** Use 0.1-0.2, not default 0.7
- **Trusting JSON output blindly:** Always wrap in try/catch
- **Sending huge images:** Resize to ~1024px max before base64 encoding
- **Loading model per request:** Ollama keeps model loaded (OLLAMA_KEEP_ALIVE=10m)
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Inference server | FastAPI + MLX | Ollama | Already running, battle-tested |
| Model management | Manual downloads | `ollama pull` | Handles GGUF, quantization, updates |
| OpenAI compatibility | Custom endpoints | Ollama /v1 API | Full OpenAI SDK support |
| Image preprocessing | PIL resize/encode | Client-side resize + base64 | Model handles the rest |
| JSON parsing | Regex extraction | JSON.parse + try/catch | VLMs output clean JSON with right prompts |
| Model selection | Benchmark testing | Qwen3-VL:8b | Already researched, best for this task |

**Key insight:** Your infrastructure is already set up. Ollama handles model loading, memory management, and API serving. Just pull the model and call it.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Inconsistent JSON Output
**What goes wrong:** VLM returns markdown-wrapped JSON or prose instead of pure JSON
**Why it happens:** Default prompts don't constrain output format
**How to avoid:**
- Include "ONLY valid JSON, no other text" in prompt
- Use temperature 0.1-0.2
- Always wrap JSON.parse in try/catch with fallback
**Warning signs:** Responses starting with "Here's the..." or containing ```json

### Pitfall 2: Model Not Loaded (Cold Start)
**What goes wrong:** First request times out or is very slow
**Why it happens:** Ollama loads model on first request (~10-30 seconds)
**How to avoid:**
- Your OLLAMA_KEEP_ALIVE=10m keeps model loaded
- For fresh starts, make a warmup request
- Consider increasing KEEP_ALIVE for dev sessions
**Warning signs:** First request takes 30+ seconds, subsequent requests fast

### Pitfall 3: Out of Memory with Large Images
**What goes wrong:** Ollama crashes or system slows down
**Why it happens:** High-res images consume GPU memory during processing
**How to avoid:**
- Resize images to max 1024px dimension before sending
- Your 36GB RAM is plenty, but don't send 4K images
**Warning signs:** System fan spinning up, swap usage increasing

### Pitfall 4: Value Estimation Hallucination
**What goes wrong:** AI gives wildly inaccurate values ($50 for antique, $5000 for IKEA)
**Why it happens:** VLMs aren't trained on pricing data, they guess
**How to avoid:**
- Treat AI values as suggestions only
- Always allow manual override in UI
- Consider adding "confidence" field to prompt
**Warning signs:** Values that seem off by 10x or more

### Pitfall 5: Wrong Model Loaded
**What goes wrong:** Text-only responses, no image understanding
**Why it happens:** Ollama might load a different model if qwen3-vl not specified
**How to avoid:**
- Always specify `model: 'qwen3-vl:8b'` in API calls
- Verify with `ollama list` that vision model is pulled
**Warning signs:** Response doesn't reference image content at all
</common_pitfalls>

<code_examples>
## Code Examples

### Pull the Model (One-Time Setup)
```bash
# Just this one command
ollama pull qwen3-vl:8b

# Verify it's available
ollama list | grep qwen3-vl
```

### Test from Command Line
```bash
# Quick test with a local image
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-vl:8b",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "image_url", "image_url": {"url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Eames_Lounge_Chair.jpg/440px-Eames_Lounge_Chair.jpg"}},
        {"type": "text", "text": "What is this furniture item? Estimate its value."}
      ]
    }]
  }'
```

### Next.js API Route (Full Implementation)
```typescript
// src/app/api/inventory/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'

const ollama = new OpenAI({
  baseURL: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434/v1',
  apiKey: 'ollama',
})

const AnalysisSchema = z.object({
  name: z.string(),
  category: z.enum([
    'furniture', 'electronics', 'appliances', 'artwork', 'jewelry',
    'collectibles', 'clothing', 'tools', 'sports_equipment',
    'musical_instruments', 'kitchenware', 'decor', 'books_media',
    'office_equipment', 'outdoor', 'vehicles', 'other'
  ]),
  estimatedValue: z.string(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  description: z.string(),
  brand: z.string().nullable(),
  material: z.string().nullable(),
})

export async function POST(request: NextRequest) {
  const { imageBase64, mimeType } = await request.json()

  const response = await ollama.chat.completions.create({
    model: 'qwen3-vl:8b',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64}` }
        },
        {
          type: 'text',
          text: `Analyze this household item for a trust inventory.

Respond with ONLY valid JSON:
{
  "name": "item name",
  "category": "furniture|electronics|appliances|artwork|jewelry|collectibles|clothing|tools|sports_equipment|musical_instruments|kitchenware|decor|books_media|office_equipment|outdoor|vehicles|other",
  "estimatedValue": "123.00",
  "condition": "excellent|good|fair|poor",
  "description": "brief description",
  "brand": "brand or null",
  "material": "material or null"
}`
        }
      ]
    }],
    max_tokens: 500,
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(content)
    const validated = AnalysisSchema.parse(parsed)
    return NextResponse.json(validated)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to parse AI response',
      raw: content
    }, { status: 422 })
  }
}
```

### Client-Side Image Resize Before Upload
```typescript
// Resize image to max 1024px before sending
async function resizeImage(file: File, maxDim = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim
          width = maxDim
        } else {
          width = (width / height) * maxDim
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1])
    }
    img.src = URL.createObjectURL(file)
  })
}
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Qwen2.5-VL | **Qwen3-VL** | Oct 2025 | Better detection, spatial reasoning |
| mlx-vlm setup | **Ollama** | 2025 | Simpler, already configured |
| Gemma 3 for vision | **Qwen3-VL** | 2025 | Qwen wins on object detection |
| Custom servers | Ollama /v1 API | 2024+ | OpenAI SDK compatibility |

**Qwen3-VL advantages (Oct 2025 release):**
- Visual agent capabilities (GUI operation)
- 256K native context (expandable to 1M)
- Better structured output (JSON, coordinates)
- Available in Ollama: 2B, 4B, 8B, 30B, 32B, 235B sizes

**Why not Gemma 3:**
- Failed object detection in Roboflow benchmarks (6/7, missed detection)
- Vision is bolted-on, not native like Qwen3-VL
- Less reliable for structured JSON output
</sota_updates>

<open_questions>
## Open Questions

1. **Value estimation accuracy**
   - What we know: VLMs give rough estimates, not appraisal-quality
   - Recommendation: AI suggestion as starting point, always allow manual override
   - Future: Could fine-tune on furniture pricing data if needed

2. **Batch processing**
   - What we know: Ollama processes one request at a time (your config: OLLAMA_NUM_PARALLEL=1)
   - What's unclear: Performance with multiple items uploaded at once
   - Recommendation: Queue requests, show progress, process sequentially

3. **Categories list**
   - What we know: personalProperty table has `category` enum in schema
   - What's unclear: Should AI categories match DB enum exactly?
   - Recommendation: Map AI categories to DB enum, allow "other" fallback
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [Ollama Qwen3-VL](https://ollama.com/library/qwen3-vl) - Model availability, sizes
- [Qwen3-VL Blog](https://ollama.com/blog/qwen3-vl) - Capabilities, benchmarks
- [Clarifai VLM Benchmarks](https://www.clarifai.com/blog/benchmarking-best-open-source-vision-language-models) - Gemma vs Qwen comparison
- [Roboflow Gemma 3 Analysis](https://blog.roboflow.com/gemma-3/) - Object detection failure

### Secondary (MEDIUM confidence)
- [LLM-Stats Comparison](https://llm-stats.com/models/compare/gemma-3-12b-it-vs-qwen3-vl-8b-instruct) - Head-to-head benchmarks
- Your ~/.zshrc - Ollama configuration already optimized

### Decisions Made
- Ollama over MLX-VLM: Already configured, simpler
- Qwen3-VL over Gemma3: Better object detection, structured output
- 8B size: Good balance for 36GB RAM, quality sufficient for inventory
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Ollama with Qwen3-VL
- Alternatives evaluated: MLX-VLM, Gemma3:12b
- Patterns: OpenAI SDK, structured prompting, image resize
- Pitfalls: JSON parsing, cold start, value hallucination

**Confidence breakdown:**
- Stack choice: HIGH - Ollama already working, Qwen3-VL benchmarked
- Architecture: HIGH - OpenAI SDK pattern well-established
- Pitfalls: HIGH - Common issues documented
- Code examples: HIGH - Tested patterns

**Hardware context:**
- Machine: M3 Pro, 36GB unified RAM
- Ollama config: Port 11434, 10m keep-alive, flash attention
- Model fit: Qwen3-VL:8b uses ~8GB, plenty of headroom

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days)
</metadata>

---

*Phase: 46-mlx-vision*
*Research completed: 2026-01-18*
*Ready for planning: yes*
