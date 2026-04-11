# Nexus Forensics

![Nexus Forensics Banner](https://via.placeholder.com/800x200/0a0a0f/00ffff?text=NEXUS+FORENSICS)

> A forensic-grade, client-side React application for detecting AI-generated images, deepfakes, and manipulated media — powered by Google Gemini 2.5 Flash.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [How It Works](#how-it-works)
5. [Detection Dimensions](#detection-dimensions)
6. [Verdict System](#verdict-system)
7. [Usage Guide](#usage-guide)
8. [Limitations & Responsible Use](#limitations--responsible-use)
9. [Roadmap](#roadmap)
10. [Contributing](#contributing)
11. [License](#license)

---

## Overview

**Nexus Forensics** is a powerful client-side React application designed to detect AI-generated images, deepfakes, and manipulated media using advanced forensic analysis powered by **Google Gemini 2.5 Flash**.

In an era where synthetic media is becoming increasingly indistinguishable from reality, Nexus Forensics provides users with a transparent, forensic-grade breakdown of image authenticity. It analyzes uploaded images across six critical dimensions and delivers an easy-to-understand overall authenticity score with detailed explanations.

Built as a **pure client-side** tool with zero data retention, it ensures complete user privacy while offering professional-level insights typically found only in specialized forensics software.

**Perfect for**: Journalists, content creators, fact-checkers, security researchers, and anyone concerned about the authenticity of digital media.

### Problem Statement

Deepfakes, AI-generated images, and digitally manipulated media are proliferating at scale. Existing detection tools are either:
- Too technical (command-line GAN detectors with no UI)
- Too opaque (single score with no explanation)
- Too narrow (only work on faces, not general media)
- Too slow (cloud upload pipelines with long queues)

Nexus Forensics solves all four problems with an explainable, accessible, privacy-preserving, multi-signal approach that runs entirely in the browser.

---

## Features

- **Multimodal Forensic Analysis** — powered by Google Gemini 2.5 Flash for deep visual and semantic analysis in real-time
- **Six-Dimensional Forensic Breakdown** — independent scoring and explanations across Facial Integrity, Lighting Coherence, Texture Authenticity, Background Consistency, Compression Artifacts, and Semantic Coherence
- **Animated Authenticity Score Ring** — dynamic SVG-based ring with smooth animations and color-coded indicators (green / amber / red)
- **Interactive Forensic Report** — expandable category cards with confidence levels, verdicts, key findings, and plain-English explanations; suspicious elements highlighted with neon warning accents
- **Real-Time Streaming Animation** — live feedback as Gemini processes the image
- **Privacy-First Architecture** — 100% client-side; images are sent directly from your browser to Google's Gemini API and never stored by this application
- **Modern Cyber-Forensics UI** — sleek dark theme with glassmorphism effects, neon accents, glowing animations, and a professional forensic-inspired aesthetic
- **Drag-and-Drop Upload** — supports JPG, PNG, WebP (up to 10MB)
- **Structured JSON Output** — auditable, loggable, and pipeline-ready for downstream content moderation

---

## Getting Started

### Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- A valid **Google Gemini API Key** — get one free from [Google AI Studio](https://aistudio.google.com/)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Er-aditya-creater/nexus-forensics.git
cd nexus-forensics
```

**2. Install project dependencies**
```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file in the project root:
```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

**4. Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## How It Works

```
User uploads image (JPG / PNG / WebP)
              │
              ▼
   FileReader encodes image to base64
   entirely within the browser
              │
              ▼
   Sent to Google Gemini 2.5 Flash API
   with structured forensic system prompt
              │
              ▼
   Gemini performs multimodal analysis
   across 6 forensic dimensions simultaneously
              │
              ▼
   Structured JSON response parsed client-side
              │
              ▼
   Results rendered:
   Score Ring → Category Cards → Key Indicators → Verdict
```

### The Forensic Prompt Architecture

The Gemini system prompt is engineered to:
1. Frame the model as a domain-specific digital forensics expert
2. Force structured JSON output with a strict, versioned schema
3. Require per-dimension scores AND specific textual flags per anomaly
4. Adapt gracefully to non-photographic content (documents, screenshots, artwork)
5. Produce a plain-English "recommended action" — not just a label
6. Separate *detection* (what anomalies exist) from *verdict* (overall manipulation probability), mirroring how professional forensic analysts work

---

## Detection Dimensions

### 1. Facial Integrity (`facial`)
Inspects GAN-generated boundary artifacts around face regions, unnatural eye reflections, asymmetrical features, lip blending seams, and hair edge quality. Most deepfakes exhibit their strongest signals here first.

### 2. Lighting Coherence (`lighting`)
Checks that shadow directions are consistent across all objects in the scene, that ambient light color temperature matches across regions, and that specular highlights on faces are consistent with the apparent environment.

### 3. Texture Authenticity (`texture`)
Analyzes skin texture for over-smoothing (a hallmark of diffusion model outputs), noise pattern consistency across the frame, JPEG compression fingerprints, and the presence or absence of natural micro-detail (pores, fine hair).

### 4. Background Consistency (`background`)
Evaluates edge blending between foreground subjects and background elements, depth-of-field coherence, perspective alignment across the scene, and whether background objects are physically and contextually plausible.

### 5. Compression Artifacts (`metadata`)
Looks for re-encoding traces (JPEG blocking inconsistent with the claimed quality level), upscaling artifacts, inconsistent noise floors across image regions, and double-compression signatures common in spliced composites.

### 6. Semantic Coherence (`semantic`)
Checks anatomical plausibility (correct finger count, proportional limbs, realistic ear placement), object-scene consistency, and whether the overall spatial composition makes physical sense.

---

## Verdict System

| Verdict | Meaning | Typical Score Range |
|---|---|---|
| `AUTHENTIC` | No significant manipulation signals detected | 70–100 |
| `SUSPICIOUS` | Anomalies present; human review recommended | 40–69 |
| `MANIPULATED` | Clear evidence of editing, splicing, or compositing | 15–39 |
| `SYNTHETIC` | Image is AI-generated or a deepfake | 0–14 |

Each verdict is accompanied by:
- A **confidence percentage** — how certain Gemini is in its assessment
- A **plain-English summary** paragraph
- Up to 3 **key indicator** bullets (the top findings that drove the verdict)
- A **recommended action** (concrete guidance on what to do with this content)

---

## Usage Guide

### 1. Upload an Image

Drag and drop an image (JPG, PNG, or WebP) into the upload zone, or click to open the file picker. Maximum recommended size: **10MB**.

### 2. Wait for Analysis

The app automatically starts processing using Gemini 2.5 Flash. A real-time streaming animation provides feedback while the forensic analysis loads. Typical analysis time: 3–8 seconds depending on image complexity.

### 3. Review the Overall Score

A large animated `BigScoreRing` displays the overall authenticity score (0–100):
- **Green (70–100)**: Likely authentic
- **Amber (40–69)**: Suspicious — verify before sharing
- **Red (0–39)**: Likely AI-generated or heavily manipulated

### 4. Explore Dimensional Analysis

Click on any of the six forensic category cards to expand and see:
- Dimension-specific score (0–100)
- Verdict for that dimension (Authentic / Suspicious / Likely Manipulated)
- Confidence percentage
- Detailed plain-English explanation
- Key forensic findings as bullet points

### 5. Read the Recommendations

Review the AI-generated summary and suggested actions (e.g., "Cross-reference with original source", "Check metadata independently", "Do not share without further verification").

### 6. Analyze Another Image

Click **Analyze New Image** to clear results and upload a different photo.

---

## Limitations & Responsible Use

### Technical Limitations

- **General-purpose vision model, not a specialized detector** — Nexus Forensics uses Gemini 2.5 Flash with forensic prompting, not a binary classifier trained on a curated deepfake dataset. It will not outperform dedicated GAN detectors on their specific attack types.
- **Image-only in v1** — video analysis requires frame-level extraction and temporal consistency checks, not yet implemented.
- **No provenance data** — the tool cannot access EXIF metadata, C2PA content credentials, or blockchain provenance records. Analysis is pixel-level visual reasoning only.
- **Adversarial robustness** — sophisticated actors can optimize synthetic media to avoid triggering vision model anomaly detection.
- **Heavy JPEG compression** — legitimate re-compression can produce artifacts misread as manipulation. Low-confidence results should be treated with extra skepticism.

### Responsible Use Guidelines

This tool is intended as **decision support**, not a definitive judgment. Do not:
- Use a single analysis result as the sole basis for any legal, editorial, or professional decision
- Publish verdicts publicly without disclosing that AI analysis was used
- Apply results to accuse, demean, or harm individuals without corroborating evidence from independent sources

Always combine Nexus Forensics output with human expert review for high-stakes decisions.

### Privacy

Images are encoded client-side via the browser's `FileReader` API and transmitted directly to Google's Gemini API over HTTPS. They are never stored, logged, or retained by Nexus Forensics. Review [Google's Gemini API privacy policy](https://ai.google.dev/gemini-api/terms) for details on how Google handles API data.

---

## Roadmap

### Near-term
- [ ] PDF and screenshot-specific analysis mode
- [ ] Batch analysis (multiple images in one session)
- [ ] Export forensic report as PDF
- [ ] Analysis history / session log with local storage

### Medium-term
- [ ] Video frame extraction and temporal consistency analysis
- [ ] C2PA content credential verification integration
- [ ] EXIF metadata parsing and cross-referencing with visual analysis
- [ ] Browser extension (Chrome / Firefox) for right-click image analysis

### Long-term
- [ ] WhatsApp / Telegram bot integration for instant media verification
- [ ] REST API endpoint for content moderation pipeline integration
- [ ] Multi-model ensemble (Gemini + specialized open-source detectors like CNNDetection or UniversalFakeDetect)
- [ ] Fine-tuned detection profiles for specific generation methods and regional deepfake patterns

---

## Contributing

Contributions are welcome. Please open an issue first to discuss major changes before submitting a pull request.

Areas most needing help:
- Improving the forensic system prompt for edge cases (old photos, artwork, infographics)
- Adding video frame extraction and temporal analysis
- Building the browser extension wrapper
- Curating and maintaining an evaluation dataset for benchmarking

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

*Nexus Forensics is a decision-support tool, not a substitute for professional digital forensics. Analysis results are probabilistic and should always be corroborated by human review in high-stakes contexts.*
