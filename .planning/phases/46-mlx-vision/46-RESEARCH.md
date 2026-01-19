# Phase 46: MLX Vision Integration - Research

**Researched:** 2026-01-18
**Domain:** Apple MLX framework for vision-language model inference on Apple Silicon
**Confidence:** HIGH

<research_summary>
## Summary

Researched the MLX ecosystem for building a local vision-language model inference endpoint that can analyze photos of physical property items (furniture, electronics, etc.) and suggest name, category, and estimated value.

The standard approach uses **MLX-VLM** with **Qwen2.5-VL** models, served via either the built-in FastAPI server or the more production-ready **mlx-openai-server**. Both provide OpenAI-compatible APIs that the Next.js app can call via HTTP.

Key finding: Don't hand-roll model loading, image preprocessing, or tokenization. MLX-VLM handles all of this. The main architectural decision is choosing between the simple mlx_vlm.server (good for development) vs mlx-openai-server (better queue management and multimodal support).

**Primary recommendation:** Use mlx-vlm server with Qwen2.5-VL-3B-Instruct-8bit for balance of quality and memory. Run as a sidecar process alongside your existing mlx-lm setup (port 8000 for text, port 8080 for vision), call from Next.js API routes via OpenAI SDK.

**Existing infrastructure:** You already have mlx-lm with Qwen3 models on port 8000. For vision, add mlx-vlm on port 8080.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mlx | 0.30.x | Array framework for Apple Silicon ML | Apple's official ML framework, optimized for unified memory |
| mlx-vlm | 0.1.x | Vision-language model inference | Primary VLM library for MLX, supports all major models |
| mlx-openai-server | 0.2.x | OpenAI-compatible HTTP API | Better queue management than mlx-lm server, multimodal support |

### Models (from mlx-community on Hugging Face)
| Model | Size | Memory | Use Case |
|-------|------|--------|----------|
| Qwen2.5-VL-3B-Instruct-8bit | ~6GB | ~8GB RAM | Best balance for development Mac |
| Qwen2.5-VL-3B-Instruct-4bit | ~3GB | ~5GB RAM | Lower memory, slightly less quality |
| Qwen2.5-VL-7B-Instruct-4bit | ~4GB | ~8GB RAM | Better quality, similar memory to 3B-8bit |
| Qwen2.5-VL-7B-Instruct-8bit | ~8GB | ~12GB RAM | Higher quality, needs more RAM |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| openai (Python) | 1.x | Client library | Testing the inference server |
| @ai-sdk/openai (JS) | latest | Vercel AI SDK | Calling from Next.js API routes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mlx-openai-server | mlx_vlm.server | mlx_vlm.server simpler but lacks queue management |
| mlx-openai-server | vllm-mlx | vllm-mlx has continuous batching but more complex setup |
| Qwen2.5-VL | LLaVA | Qwen2.5-VL better at object detection and structured output |
| Local MLX | Ollama | Ollama easier but less optimized for Apple Silicon than MLX |

**Installation:**
```bash
# Add mlx-vlm to your existing MLX environment
pip install mlx-vlm

# Download model (happens automatically on first use, or pre-download)
python -c "from mlx_vlm import load; load('mlx-community/Qwen2.5-VL-3B-Instruct-8bit')"
```

**Your existing setup (from ~/.local/bin/mlx-server):**
- mlx-lm server on port 8000 (text-only Qwen3 models)
- Speculative decoding with Qwen3-0.6B draft model
- Models: Qwen3-4B, Qwen3-8B, Qwen3-14B (all text-only)

**What's needed for Phase 46:**
- Install mlx-vlm package
- Download Qwen2.5-VL vision model
- Create mlx-vision-server script (similar to existing mlx-server, port 8080)
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
│               └── analyze/route.ts   # Calls MLX server
├── scripts/
│   └── mlx-server.py                  # Server startup script
└── .env.local
    MLX_SERVER_URL=http://127.0.0.1:8080
```

### Pattern 1: Sidecar Process Architecture
**What:** Run MLX server as separate process, Next.js calls via HTTP
**When to use:** Always - Node.js cannot run MLX directly (Python/Metal required)
**Why:** Clean separation, Next.js stays fast, MLX server can be restarted independently

```
┌─────────────────┐         HTTP POST         ┌──────────────────┐
│   Next.js App   │ ─────────────────────────>│  MLX Server      │
│   (Port 3000)   │   /v1/chat/completions    │  (Port 8080)     │
│                 │<─────────────────────────-│                  │
│   API Route     │       JSON response       │  Qwen2.5-VL      │
└─────────────────┘                           └──────────────────┘
```

**Example Next.js API route:**
```typescript
// src/app/api/inventory/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const mlx = new OpenAI({
  baseURL: process.env.MLX_SERVER_URL ?? 'http://127.0.0.1:8080/v1',
  apiKey: 'not-needed-for-local', // MLX server ignores this
})

export async function POST(request: NextRequest) {
  const { imageBase64, mimeType } = await request.json()

  const response = await mlx.chat.completions.create({
    model: 'default', // Uses whatever model the server loaded
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64}` }
        },
        {
          type: 'text',
          text: `Analyze this household item for a trust inventory. Respond in JSON:
{
  "name": "specific item name",
  "category": "one of: furniture, electronics, appliances, artwork, jewelry, collectibles, clothing, tools, sports_equipment, musical_instruments, other",
  "estimatedValue": "dollar amount as string, e.g. '150.00'",
  "condition": "one of: excellent, good, fair, poor",
  "description": "brief description for inventory records"
}`
        }
      ]
    }],
    max_tokens: 500,
    temperature: 0.1, // Low temp for consistent JSON
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  // Parse and validate JSON response
  return NextResponse.json(JSON.parse(content))
}
```

### Pattern 2: Server Startup Script
**What:** Python script to start MLX server with correct model
**When to use:** Development and local deployment

```python
#!/usr/bin/env python3
# scripts/mlx-server.py
"""Start MLX vision server for inventory analysis."""

import subprocess
import sys

MODEL = "mlx-community/Qwen2.5-VL-3B-Instruct-8bit"
PORT = 8080

def main():
    cmd = [
        sys.executable, "-m", "mlx_openai_server",
        "--model", MODEL,
        "--model-type", "multimodal",
        "--port", str(PORT),
        "--host", "127.0.0.1",
    ]
    print(f"Starting MLX server with {MODEL} on port {PORT}...")
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
```

### Pattern 3: Structured Output via Prompting
**What:** Get consistent JSON from VLM via careful prompt engineering
**When to use:** When you need structured data (item categorization)

```python
# Prompt pattern for consistent JSON output
INVENTORY_ANALYSIS_PROMPT = """Analyze this household item for a trust property inventory.

You must respond with ONLY a valid JSON object, no other text:
{
  "name": "specific descriptive name of the item",
  "category": "exactly one of: furniture, electronics, appliances, artwork, jewelry, collectibles, clothing, tools, sports_equipment, musical_instruments, kitchenware, decor, books_media, office_equipment, outdoor, vehicles, other",
  "estimatedValue": "estimated fair market value in USD as a string (e.g., '250.00')",
  "condition": "exactly one of: excellent, good, fair, poor",
  "description": "1-2 sentence description suitable for inventory records",
  "brand": "brand name if visible, otherwise null",
  "material": "primary material if identifiable (wood, metal, fabric, etc.), otherwise null"
}"""
```

### Anti-Patterns to Avoid
- **Running MLX in Node.js:** MLX is Python/Metal only. Use HTTP to communicate.
- **Loading model per request:** Model loading takes 5-30 seconds. Keep server running.
- **Using bf16 models on low-memory Macs:** Use 4-bit or 8-bit quantized models.
- **Parsing VLM output without validation:** Always validate JSON, VLMs can hallucinate format.
- **Sending full-resolution images:** Resize to ~1024px max dimension before sending.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model loading | Custom PyTorch loading | mlx_vlm.load() | Handles quantization, memory mapping, MLX conversion |
| Image preprocessing | PIL resize/normalize | Model's processor | Each model has specific preprocessing requirements |
| Tokenization | Custom tokenizer | Model's processor | VLM tokenizers handle text+image interleaving |
| HTTP server | Flask/FastAPI from scratch | mlx-openai-server | Request queuing, OpenAI compatibility, error handling |
| Model selection | Evaluate all models | Start with Qwen2.5-VL-3B-8bit | Best documented, most stable on MLX-VLM |
| Chat template | Manual prompt formatting | apply_chat_template() | Models require specific formats for best results |

**Key insight:** Vision-language models have complex preprocessing pipelines. The mlx-vlm library abstracts this entirely - you provide an image path/URL/base64 and text, it handles resizing, tokenization, and interleaving. Custom preprocessing leads to quality degradation or crashes.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Excessive Memory Allocation
**What goes wrong:** Model attempts to allocate 50+ GB, crashes on 32GB Mac
**Why it happens:** Large images, wrong model variant, or memory leak in certain MLX versions
**How to avoid:**
- Use 4-bit or 8-bit quantized models, not bf16
- Resize images to max 1024px dimension before sending
- Use mlx >= 0.27.0 (fixes bfloat16 kernel issue)
- Monitor memory: `mlx.core.metal.get_active_memory()`
**Warning signs:** Slow first inference, swap usage increasing, system becoming unresponsive

### Pitfall 2: Model Version Incompatibility
**What goes wrong:** "Qwen2-VL does not work with mlx==0.22.0" type errors
**Why it happens:** MLX and mlx-vlm versions must be compatible
**How to avoid:**
- Pin versions in requirements.txt: `mlx>=0.27.0,<1.0` and `mlx-vlm>=0.1.20`
- Test model loading before deploying
- Check mlx-vlm GitHub issues for known incompatibilities
**Warning signs:** Import errors, shape mismatch errors, missing kernel errors

### Pitfall 3: Inconsistent JSON Output
**What goes wrong:** VLM returns partial JSON, markdown-wrapped JSON, or prose
**Why it happens:** VLMs are trained for conversation, not structured output
**How to avoid:**
- Use low temperature (0.1-0.3) for structured output
- Include "respond with ONLY valid JSON" in prompt
- Add JSON schema in prompt
- Always wrap JSON.parse() in try/catch with fallback
**Warning signs:** Intermittent parse errors, responses starting with "Here's the..."

### Pitfall 4: Slow Cold Start
**What goes wrong:** First request takes 30+ seconds
**Why it happens:** Model loading, compilation, memory allocation all happen on first inference
**How to avoid:**
- Start server before accepting requests
- Use a health check endpoint that warms the model
- Consider keeping server running (not serverless)
**Warning signs:** Timeouts on first request, fast subsequent requests

### Pitfall 5: Bounding Box Coordinate Shift (Qwen2.5-VL)
**What goes wrong:** Object detection coordinates are shifted, especially on y-axis
**Why it happens:** Known issue with some Qwen2.5-VL quantized variants
**How to avoid:**
- For coordinate tasks, use Qwen2.5-VL-3B-Instruct-bf16 if memory allows
- Or use Qwen2.5-VL-3B-Instruct-8bit (more stable than 4bit/6bit for coordinates)
- For categorization (no coordinates needed), any quantization works fine
**Warning signs:** Bounding boxes appearing in wrong locations
</common_pitfalls>

<code_examples>
## Code Examples

### Basic MLX-VLM Python Usage
```python
# Source: mlx-vlm documentation
from mlx_vlm import load, generate
from mlx_vlm.prompt_utils import apply_chat_template
from mlx_vlm.utils import load_config

# Load model (downloads automatically if not cached)
model_path = "mlx-community/Qwen2.5-VL-3B-Instruct-8bit"
model, processor = load(model_path)
config = load_config(model_path)

# Analyze an image
image_path = "photo_of_chair.jpg"
prompt = "What is this item? Describe it briefly."

formatted_prompt = apply_chat_template(
    processor, config, prompt, num_images=1
)

output = generate(
    model, processor, formatted_prompt,
    [image_path],
    max_tokens=200,
    temperature=0.3,
    verbose=False
)
print(output)
```

### Starting mlx-openai-server
```bash
# Basic startup
python -m mlx_openai_server \
  --model mlx-community/Qwen2.5-VL-3B-Instruct-8bit \
  --model-type multimodal \
  --port 8080

# With more options
python -m mlx_openai_server \
  --model mlx-community/Qwen2.5-VL-3B-Instruct-8bit \
  --model-type multimodal \
  --port 8080 \
  --host 127.0.0.1 \
  --max-concurrency 1 \
  --context-length 4096
```

### Calling from Next.js with OpenAI SDK
```typescript
// Source: OpenAI SDK pattern, verified with mlx-openai-server
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'http://127.0.0.1:8080/v1',
  apiKey: 'local', // Required by SDK but ignored by local server
})

async function analyzeImage(imageBase64: string): Promise<{
  name: string
  category: string
  estimatedValue: string
}> {
  const response = await client.chat.completions.create({
    model: 'default',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`
          }
        },
        {
          type: 'text',
          text: 'Analyze this item. Return JSON: {"name": "...", "category": "...", "estimatedValue": "..."}'
        }
      ]
    }],
    max_tokens: 300,
    temperature: 0.2,
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  return JSON.parse(content)
}
```

### Health Check / Warmup Pattern
```python
# scripts/warmup-server.py
"""Warm up MLX server with a test inference."""
import requests
import base64
from pathlib import Path

def warmup(server_url: str = "http://127.0.0.1:8080"):
    # Create a tiny test image (1x1 pixel)
    test_image_b64 = base64.b64encode(
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
    ).decode()

    response = requests.post(
        f"{server_url}/v1/chat/completions",
        json={
            "model": "default",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{test_image_b64}"}},
                    {"type": "text", "text": "Say 'ready'"}
                ]
            }],
            "max_tokens": 10
        }
    )
    response.raise_for_status()
    print("Server warmed up and ready!")

if __name__ == "__main__":
    warmup()
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Qwen2-VL | Qwen2.5-VL | Late 2024 | Better object detection, structured output |
| LLaVA-1.5 | Qwen2.5-VL / Qwen3-VL | 2025 | Qwen family now leads VLM benchmarks |
| mlx_vlm.server | mlx-openai-server | 2025 | Better queue management, production features |
| Manual MLX setup | WWDC25 native integration | June 2025 | MLX now official Apple framework with Swift API |

**New tools/patterns to consider:**
- **Qwen3-VL (October 2025):** Latest Qwen vision model, even better quality but check mlx-vlm support
- **M5 Neural Accelerators:** 4x speedup on M5 chips with macOS 26.2+, automatic with MLX
- **vllm-mlx:** If you need continuous batching for multiple concurrent users

**Deprecated/outdated:**
- **LLaVA-1.5:** Superseded by Qwen2.5-VL for most tasks
- **mlx-lm for vision:** Use mlx-vlm instead (mlx-lm is text-only)
- **Manual model downloading:** mlx-vlm auto-downloads from Hugging Face
</sota_updates>

<open_questions>
## Open Questions

1. **Model size for trust-admin context**
   - What we know: 3B-8bit works well, 7B better quality, 32GB+ Mac can run 7B
   - What's unclear: Which Mac will run this in production?
   - Recommendation: Default to 3B-8bit, make model configurable via env var

2. **Value estimation accuracy**
   - What we know: VLMs can identify items and give rough estimates
   - What's unclear: How accurate are estimates for trust inventory purposes?
   - Recommendation: Use AI suggestion as starting point, always allow manual override

3. **Server lifecycle management**
   - What we know: Server should stay running (cold start is slow)
   - What's unclear: How to integrate with Next.js dev workflow
   - Recommendation: Separate terminal window for dev, PM2/launchd for production
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [MLX GitHub Repository](https://github.com/ml-explore/mlx) - Official Apple MLX framework
- [MLX-VLM GitHub](https://github.com/Blaizzy/mlx-vlm) - Vision-language model library
- [mlx-openai-server GitHub](https://github.com/cubist38/mlx-openai-server) - Production server
- [Apple MLX WWDC25](https://developer.apple.com/videos/play/wwdc2025/298/) - Official Apple documentation
- [mlx-community on Hugging Face](https://huggingface.co/mlx-community) - Model repository

### Secondary (MEDIUM confidence)
- [Vision AI on Apple Silicon Guide](https://dzone.com/articles/vision-ai-apple-silicon-guide-mlx-vlm) - Tutorial verified against docs
- [MLX-VLM Issues #123, #182, #192](https://github.com/Blaizzy/mlx-vlm/issues) - Known issues and workarounds
- [Production-Grade Local LLM Inference paper](https://arxiv.org/abs/2511.05502) - MLX benchmarks

### Tertiary (LOW confidence - needs validation)
- Value estimation accuracy for household items - no benchmark found, test empirically
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: MLX framework for Apple Silicon
- Ecosystem: mlx-vlm, mlx-openai-server, Qwen2.5-VL models
- Patterns: Sidecar process, OpenAI-compatible API, structured output prompting
- Pitfalls: Memory allocation, version compatibility, JSON parsing

**Confidence breakdown:**
- Standard stack: HIGH - verified with official repos and WWDC25
- Architecture: HIGH - sidecar pattern is established, tested
- Pitfalls: HIGH - documented in GitHub issues, verified
- Code examples: HIGH - from official docs and tested patterns

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - MLX ecosystem actively evolving)
</metadata>

---

*Phase: 46-mlx-vision*
*Research completed: 2026-01-18*
*Ready for planning: yes*
