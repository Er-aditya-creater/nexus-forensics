# Nexus Forensics — Design Document

**Version**: 1.0  
**Status**: Active Development  
**Last Updated**: April 2026  
**Project**: Nexus Forensics  
**AI Model**: Google Gemini 2.5 Flash

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [System Architecture](#2-system-architecture)
3. [AI Design & Prompt Engineering](#3-ai-design--prompt-engineering)
4. [Detection Methodology](#4-detection-methodology)
5. [Data Flow](#5-data-flow)
6. [UI/UX Design Decisions](#6-uiux-design-decisions)
7. [Scoring & Verdict Logic](#7-scoring--verdict-logic)
8. [Security & Privacy Design](#8-security--privacy-design)
9. [Evaluation Framework](#9-evaluation-framework)
10. [Extension Architecture](#10-extension-architecture)
11. [Known Failure Modes](#11-known-failure-modes)
12. [Design Alternatives Considered](#12-design-alternatives-considered)

---

## 1. Product Vision

### The Problem

The proliferation of AI-generated and manipulated media has created an epistemic crisis. Tools to create convincing deepfakes are now consumer-grade (Midjourney, Stable Diffusion, FaceSwap); tools to detect them are not. Existing detection solutions suffer from at least one of the following:

- **Inaccessibility**: Require ML expertise to run (Python environments, GPU, model downloads)
- **Opacity**: Return a binary label or single percentage with no explanation
- **Narrowness**: Only work on portrait-style deepfakes — miss edited photos, synthetic backgrounds, or composite scenes
- **Brittleness**: Tied to specific GAN architectures, fail on diffusion-model output
- **Privacy risk**: Require uploading images to a third-party cloud server

### Our Position

Nexus Forensics builds an **explainable, accessible, privacy-first, multi-signal forensic analysis tool** that:
1. Works on any image — not just portrait deepfakes
2. Explains *why* something is suspicious, not just *that* it is
3. Requires zero technical setup — runs in any modern browser
4. Never stores or logs user images (pure client-side)
5. Produces structured output compatible with downstream moderation pipelines

### Target Users

| User Type | Primary Need | How Nexus Forensics Serves Them |
|---|---|---|
| Journalists / fact-checkers | Rapid initial triage of submitted images | Fast verdict + key indicators before expensive expert review |
| Social media content moderators | Scale review queues | JSON output compatible with automation pipelines |
| General public | Verify suspicious content before sharing | Plain-English verdict and recommended action |
| Security researchers | Benchmarking and evaluation | Structured per-dimension scores, fully auditable output |
| Content creators | Protect their work from misrepresentation | Confirm authenticity of their own images |

---

## 2. System Architecture

### Current Architecture (v1 — Pure Client-Side)

```
┌──────────────────────────────────────────────────────────────┐
│                          Browser                             │
│                                                              │
│  ┌──────────────┐   ┌────────────────┐   ┌───────────────┐  │
│  │  File Upload  │──▶│ Base64 Encoder │──▶│  API Request  │  │
│  │  (DnD/Click) │   │  (FileReader)  │   │    Builder    │  │
│  └──────────────┘   └────────────────┘   └──────┬────────┘  │
│                                                  │           │
│  ┌───────────────────────────────────────────────▼───────┐   │
│  │                   React State Machine                  │   │
│  │   idle → uploaded → analyzing → result / error        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS (JSON + base64 image)
                           ▼
              ┌────────────────────────┐
              │  Google Gemini API     │
              │  gemini-2.5-flash      │
              │  (multimodal vision)   │
              └────────────┬───────────┘
                           │ Structured JSON response
                           ▼
              ┌────────────────────────┐
              │  Client JSON Parser    │
              │  → Result Renderer     │
              └────────────────────────┘
```

### Target Architecture (v2 — With Backend Orchestration)

```
Browser (React UI — Nexus Forensics)
          │
          ▼
  Backend API (Node / FastAPI)
    ├── Rate limiting & abuse prevention
    ├── Image preprocessing (resize, normalize, format validation)
    ├── Prompt versioning & A/B testing infrastructure
    ├── Result caching (perceptual hash — avoid re-analyzing identical images)
    ├── Audit log (enterprise / compliance tier)
    └── Multi-model ensemble orchestration
              │
              ├──▶ Google Gemini 2.5 Flash     [primary: semantic + visual reasoning]
              ├──▶ Gemini 1.5 Pro              [fallback: high-complexity edge cases]
              ├──▶ HuggingFace / local model   [supplementary: frequency-domain GAN detector]
              └──▶ C2PA credential verifier    [provenance chain check]
```

The v2 architecture introduces **ensemble detection**: Gemini handles semantic reasoning and explainability; a specialized open-source model (e.g., CNNDetection, UniversalFakeDetect) handles low-level frequency-domain artifacts that may not be visible to a multimodal vision model; a C2PA verifier checks content credentials where available. Results are merged with a weighted confidence model.

---

## 3. AI Design & Prompt Engineering

### Model Choice: Google Gemini 2.5 Flash

Gemini 2.5 Flash was selected as the primary inference model for the following reasons:

| Criterion | Gemini 2.5 Flash | Gemini 1.5 Pro | GPT-4o |
|---|---|---|---|
| Vision quality | Excellent | Excellent | Excellent |
| Instruction following (JSON output) | Excellent | Excellent | Good |
| Technical reasoning depth | Excellent | Excellent | Good |
| Latency | Low (~3–5s) | Medium (~6–10s) | Medium |
| Cost per analysis | Low | Higher | Higher |
| Structured output reliability | High | High | Medium |
| Privacy / data residency options | Google Cloud | Google Cloud | OpenAI |

Flash-tier provides the best latency-to-quality tradeoff for real-time analysis. Pro-tier is reserved as a fallback for ambiguous edge cases in v2.

### System Prompt Design Principles

The forensic system prompt is engineered around five core principles:

**1. Expert persona framing**
Framing Gemini as an "expert digital forensics AI" significantly improves technical precision and reduces generic image description responses. Without this framing, models tend to describe the image content rather than analyze anomalies.

**2. Strict schema enforcement**
The prompt specifies an exact JSON schema and explicitly forbids markdown fences and preamble text. A fallback strip-and-parse step handles rare non-compliance from streaming responses.

**3. Dimension separation**
Each forensic dimension is named with a specific, bounded technical scope. Keeping them distinct prevents the model from conflating — for example — lighting artifacts with texture artifacts, a common failure mode in early prompt iterations.

**4. Score semantics**
The prompt explicitly defines score direction: 100 = certainly authentic, 0 = clear manipulation. Without explicit definition, models sometimes invert this convention, causing inversion bugs in the UI rendering.

**5. Graceful degradation**
The prompt instructs the model to "adapt analysis accordingly" for non-photographic content (screenshots, documents, illustrations, infographics) rather than failing out or returning irrelevant face-detection results.

### JSON Schema (v1)

```json
{
  "verdict": "AUTHENTIC | SUSPICIOUS | MANIPULATED | SYNTHETIC",
  "authenticity_score": "<integer 0–100>",
  "confidence": "<integer 0–100>",
  "summary": "<2–3 sentence plain-English summary>",
  "categories": {
    "<dimension_id>": {
      "score": "<integer 0–100>",
      "flags": ["<specific finding>", "..."],
      "note": "<brief technical note>"
    }
  },
  "key_indicators": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "recommended_action": "<what the viewer should do with this content>"
}
```

### Prompt Evolution Log

| Version | Change | Reason |
|---|---|---|
| v0.1 | Initial prompt, free-form response | Baseline |
| v0.2 | Added JSON schema requirement | Free-form responses unparseable reliably at scale |
| v0.3 | Added per-dimension `flags` array | Single `note` field too vague for actionable output |
| v0.4 | Added `recommended_action` field | Users didn't know what to do with results |
| v0.5 | Added graceful degradation instruction | Non-photo images were causing unhelpful responses |
| v1.0 | Added `confidence` field; score direction made explicit | UI inversion bugs; confidence useful for triage weighting |

---

## 4. Detection Methodology

### Signal Categories and Rationale

The six dimensions were selected by mapping the failure modes of the most common synthetic media generation pipelines onto detectable visual signals:

| Dimension | GAN Failure | Diffusion Failure | Manual Edit Failure |
|---|---|---|---|
| Facial Integrity | ✓✓ (boundary artifacts) | ✓ (anatomy errors) | ✓ (blending seams) |
| Lighting Coherence | ✓ (independent lighting per region) | ✓✓ (no global lighting model) | ✓✓ (cut-paste lighting mismatch) |
| Texture Authenticity | ✓✓ (mode collapse, repetition) | ✓ (over-smoothing) | ✗ (usually preserved) |
| Background Consistency | ✓ (background collapse / repetition) | ✓ (subject-BG mismatch) | ✓✓ (copy-paste edge artifacts) |
| Compression Artifacts | ✓ (re-encoding traces) | ✓ (upscale artifacts) | ✓✓ (dual-compression signatures) |
| Semantic Coherence | ✓ (hand/finger generation errors) | ✓✓ (physical implausibility) | ✗ (usually preserved) |

✓✓ = Primary signal for that generation method  
✓ = Secondary signal  
✗ = Weak or absent signal

### Multi-Signal Aggregation

In v1, Gemini performs implicit aggregation as part of its holistic reasoning. The authenticity score is not a mechanical average of dimension scores — the model is instructed to weight signals by their reliability for the specific image type and content.

In v2, explicit aggregation will be implemented with a weighted formula:

```
overall_score = weighted_average([
  facial_score      × 0.25,
  lighting_score    × 0.20,
  texture_score     × 0.20,
  background_score  × 0.15,
  metadata_score    × 0.10,
  semantic_score    × 0.10
]) + ensemble_adjustment
```

`ensemble_adjustment` is a bounded delta (±15 points maximum) from specialized model outputs, preventing the ensemble from fully overriding Gemini's semantic judgment while still incorporating frequency-domain signal.

---

## 5. Data Flow

### Image Processing Pipeline

```
User selects or drops file
          │
          ▼
MIME type validation (must be image/*)
File size check (warn if > 10MB)
          │
          ▼
FileReader.readAsDataURL()
          │
          ▼
Split at comma → base64 string extracted
MIME type captured from File.type
          │
          ▼
State: { previewURL, imageBase64, imageMime }
          │
          ▼  [user clicks Analyze]
          │
fetch("https://generativelanguage.googleapis.com/...", {
  body: {
    model: "gemini-2.5-flash",
    systemInstruction: FORENSIC_SYSTEM_PROMPT,
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: "Perform comprehensive forensic analysis..." }
      ]
    }]
  }
})
          │
          ▼
Response text extracted from candidates[0]
          │
          ▼
Strip ```json fences → JSON.parse()
          │
          ▼
State: result object
          │
          ▼
Render pipeline:
  BigScoreRing (animates in over 1.2s)
  → CategoryCards (expandable, color-coded)
  → KeyIndicators (top 3 findings)
  → RecommendedAction (info banner)
```

### State Machine

```
IDLE
  │  file selected / dropped
  ▼
UPLOADED  (preview shown, Analyze button active)
  │  user clicks Analyze
  ▼
ANALYZING  (scan overlay active, loading messages rotate, dot animation)
  │  API success
  ├──▶  RESULT  (score ring animates, cards rendered)
  │  API / parse error
  └──▶  ERROR   (error banner, retry available)

From RESULT or ERROR:
  │  user clicks "Analyze New Image"
  └──▶  IDLE
```

---

## 6. UI/UX Design Decisions

### Philosophy: Cyber-Forensics Aesthetic

The visual language deliberately adopts a dark, cyber-forensics aesthetic — not generic consumer-app rounded-everything design. The dark theme with neon accent colors (cyan, amber, red), glassmorphism card surfaces, and glowing SVG animations signals technical credibility while remaining approachable.

The goal: users should feel like they're operating a professional forensic instrument, not filling out a form.

### Key Design Choices

**Dark theme as default**
Most forensic and security tools use dark themes. Dark themes also reduce eye strain for extended analysis sessions and make color-coded status signals (green / amber / red) more vivid and immediately readable.

**Glassmorphism card surfaces**
Semi-transparent cards with blur backdrops create visual depth without heavy shadows. This distinguishes category cards from the background without introducing hard boundaries that would make the UI feel dated.

**Neon accent colors**
Cyan (`#00ffff`) as the primary brand accent references the aesthetics of terminal-style forensic software. Amber and red are used strictly for warning and danger signals respectively — preserving their semantic meaning.

**Scan line overlay animation**
The animated scan line on the image preview directly ties the loading state to the subject being analyzed. This reinforces that something real is happening to *this specific image*, not a generic background process.

### Score Animation

The authenticity score ring animates from 0 to the result value over 1.2 seconds using cubic-bezier easing. This creates a moment of anticipation that makes users watch the score settle — improving comprehension of the result vs. a static number appearing instantly. The 100ms delay after render ensures the CSS transition fires correctly after DOM paint.

### Progressive Disclosure via Expandable Cards

Dimension cards show only the score bar and label by default. Technical flags and the forensic note are revealed on click. This decision reflects two distinct user types:

- **Casual users** (general public, content creators): want the overall verdict and key indicators quickly — technical detail is noise
- **Power users** (journalists, researchers, moderators): want every flag and note — expandable cards let them drill in without cluttering the default view

Showing all details by default overwhelms the interface and buries the verdict that most users are looking for.

### Color Semantics

| Score | Color | Convention |
|---|---|---|
| 70–100 | Green | Safe / authentic / proceed |
| 40–69 | Amber | Caution / verify / suspicious |
| 0–39 | Red | Danger / manipulated / do not share |

These map to universal traffic-light conventions — no legend needed.

---

## 7. Scoring & Verdict Logic

### Authenticity Score (0–100)

The authenticity score represents the model's overall assessment of manipulation probability:
- **Not** a mechanical average of dimension scores
- **Yes** a holistic judgment that weights dimensions by relevance to the specific image type
- Designed to be comparable across image types (portraits, landscapes, documents, screenshots)

### Verdict Determination (v1 — Model-Holistic)

In v1, Gemini determines the verdict label from its own holistic reasoning, not mechanically from the score threshold. This allows nuance: a score of 45 might be `SUSPICIOUS` under uncertainty, but `MANIPULATED` if one dimension catastrophically fails with high confidence.

### Verdict Determination (v2 — Hybrid Rule + Model)

```python
def determine_verdict(score, confidence, dimension_scores):
    min_dim = min(dimension_scores.values())

    if min_dim < 20 and confidence > 70:
        return "MANIPULATED"   # One dimension catastrophically failed
    elif score < 30:
        return "SYNTHETIC"     # Uniformly low across all dimensions
    elif score < 50:
        return "MANIPULATED"
    elif score < 70 or confidence < 50:
        return "SUSPICIOUS"
    else:
        return "AUTHENTIC"
```

`ensemble_adjustment` from specialized models can shift `score` before this function is evaluated, bounded to ±15 to prevent overriding Gemini's semantic judgment.

### Confidence Score

Confidence represents the clarity of the anomaly signal, not the verdict's correctness:
- High confidence + bad verdict → act promptly; signals are overt
- Low confidence + bad verdict → seek second opinion; signals are subtle or ambiguous

---

## 8. Security & Privacy Design

### Image Handling

- Images are encoded client-side via `FileReader` — they never touch any Nexus Forensics server
- Images are transmitted to Google's Gemini API over HTTPS for inference
- No images are stored, cached, or logged by Nexus Forensics
- The base64 string lives in React state and is garbage-collected when the component unmounts or the user resets

### API Key Handling

In development: stored in `.env` as `VITE_GEMINI_API_KEY`. This key is bundled into the client-side JS by Vite, which means it is **visible in the browser bundle**. This is acceptable for local development and hackathon demos only.

In production deployments: the API key must be stored server-side and analysis requests proxied through a backend endpoint. Exposing a Gemini API key client-side in production risks key theft and unauthorized billing.

### Abuse Prevention (v2)

- Rate limiting: max 20 analyses per IP per hour
- File size hard cap: 10MB (prevents token exhaustion attacks on the API)
- MIME type validation: strictly validate both the `File.type` and file header magic bytes
- Google's Gemini API applies its own content safety filters as a secondary layer

---

## 9. Evaluation Framework

### Ground Truth Dataset

| Category | Source | Count |
|---|---|---|
| Confirmed authentic | Wikimedia Commons CC0 licensed photos | 500 |
| GAN-generated faces | ThisPersonDoesNotExist archives | 200 |
| Diffusion-generated | Stable Diffusion 3, FLUX, Midjourney | 200 |
| Manipulated (spliced) | FaceForensics++ dataset | 200 |
| Heavily compressed authentic | Original images re-JPEG'd 5× | 100 |

### Metrics

- **Binary accuracy** — (TP + TN) / total for authentic vs. not-authentic classification
- **4-class macro F1** — for the full AUTHENTIC / SUSPICIOUS / MANIPULATED / SYNTHETIC verdict system
- **False Positive Rate** — proportion of authentic images incorrectly flagged; minimizing this is critical for user trust
- **Dimension calibration** — correlation between per-dimension scores and known ground-truth anomalies for each category

### Target Performance (v1)

| Metric | Target |
|---|---|
| Binary accuracy | > 80% |
| False positive rate | < 15% |
| 4-class macro F1 | > 0.65 |

These targets are deliberately conservative for v1. Over-claiming accuracy destroys trust more quickly than under-claiming it.

---

## 10. Extension Architecture

### Browser Extension (Planned — v2)

Enables right-click analysis of any image on any webpage without leaving the browser.

```
Nexus Forensics Extension (MV3)
         │
         ├── manifest.json
         │     Context menu: "Analyze with Nexus Forensics"
         │
         ├── background.js (service worker)
         │     ├── Context menu registration
         │     ├── Image fetch via background (bypasses CORS)
         │     └── Gemini API call handler
         │
         ├── content.js
         │     ├── Captures image URL from right-click target
         │     └── Injects results overlay into page DOM
         │
         └── popup/ (React, same component base)
               ├── Manual URL / upload input
               └── Recent analysis history (local IndexedDB)
```

Key engineering challenge: cross-origin image access. The extension must fetch the image via the service worker (which is not subject to same-origin restrictions) before encoding and sending to Gemini.

### WhatsApp / Telegram Bot (Planned — v2)

```
User sends image to @NexusForensicsBot
          │
          ▼
Webhook receives image_id / file_id
          │
          ▼
Bot downloads image from Telegram/WhatsApp CDN
          │
          ▼
Base64 encode → Gemini API analysis
          │
          ▼
Bot replies with formatted verdict:

🔴 MANIPULATED (23/100 — High Confidence)
━━━━━━━━━━━━━━━━━━━━━━━━
Likely AI-generated face. Lighting inconsistencies
detected across 3 forensic dimensions. Facial boundary
artifacts consistent with GAN output.

⚠️ Do not share. Cross-reference with original source.
```

---

## 11. Known Failure Modes

### False Positives (authentic images incorrectly flagged)

| Cause | Why It Happens | Mitigation |
|---|---|---|
| Heavy JPEG re-compression | Legitimate compression artifacts mimic re-encoding traces | Require confidence > 60% before flagging |
| Old / scanned photos | Film grain and poor scan quality mimic noise anomalies | Date-aware prompting cue in v2 |
| Artistic / color-graded photos | Intentional grading misread as manipulation | User-declared context field in v2 |
| Screenshots and UI captures | Rendering artifacts and sub-pixel AA misread as anomalies | Content-type detection, dedicated screenshot prompt |
| Heavily watermarked images | Watermark blending misread as compositing | Explicit watermark detection flag |

### False Negatives (fakes not detected)

| Cause | Why It Happens | Mitigation |
|---|---|---|
| High-quality diffusion outputs | Near-photorealistic, no visible artifacts | Ensemble with frequency-domain specialist model |
| Carefully lit face-swaps | Matched lighting removes obvious seams | Frequency-domain analysis in v2 ensemble |
| Adversarially optimized fakes | Crafted specifically to avoid vision model flags | Robustness testing, model updates, ensemble diversity |
| Low-resolution or heavily downsized fakes | Artifacts compressed below visibility threshold | Minimum resolution warning; upscaling preprocessing |
| Text-to-image of real-looking stock scenes | No face, no anatomy — mainly lighting + texture signals | Weight texture and lighting higher for non-face images |

---

## 12. Design Alternatives Considered

### Alternative 1: Six Separate Gemini API Calls (One Per Dimension)

Instead of one comprehensive prompt, make 6 parallel API calls with dimension-specific prompts.

**Rejected**: 6× the cost and latency (6 × ~4s ≈ 24s total, even with parallelization). The single-call structured prompt achieves equivalent dimension separation at 1× cost with lower latency.

### Alternative 2: Local Open-Source Deepfake Detector (ONNX / WebAssembly)

Run a dedicated GAN detector (UniversalFakeDetect, CNNDetection) client-side without any API.

**Rejected for v1**: Model weights are 100–500MB — unacceptable for a web app initial load. No natural language explanation capability — just a probability score. Planned as a supplementary frequency-domain signal in the v2 ensemble alongside Gemini.

### Alternative 3: Binary Classification Only (Authentic / Fake)

Return only a two-class verdict with no dimensional breakdown.

**Rejected**: The dimensional breakdown is the primary differentiating feature. A single score makes Nexus Forensics indistinguishable from dozens of existing tools. Explainability is what makes this useful for journalists and professional moderators who need to justify decisions.

### Alternative 4: Probability Language Instead of Score

Display "73% chance of being authentic" instead of "73/100 authenticity score."

**Rejected**: Probability language implies calibrated statistical validity (i.e., that 73% of images with this score are authentic) — a guarantee we cannot make. A labeled score is more epistemically honest: it's a signal, not a measurement.

### Alternative 5: Light Theme UI

Standard white-background, dark-text interface.

**Rejected**: The cyber-forensics dark aesthetic is a deliberate product decision. It signals technical credibility, makes color-coded status signals more vivid, and differentiates Nexus Forensics from generic SaaS tools. The dark theme is core to the brand identity.

### Alternative 6: GPT-4o as Primary Model

Use OpenAI's GPT-4o instead of Google Gemini 2.5 Flash.

**Rejected**: Gemini 2.5 Flash offers comparable vision quality at lower latency and cost. Gemini's instruction-following for strict JSON output is more reliable in testing. Google AI Studio also provides a frictionless free tier for development and evaluation.

---

*This document is a living design specification. All major architectural decisions and their rationale should be recorded here — not just in commit messages or ticket comments.*
