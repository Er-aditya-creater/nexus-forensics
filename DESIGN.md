# Nexus Forensics - System Architecture & Design

**Document Version:** 1.0  
**Date:** April 2026  
**Status:** Complete Design Specification  

---

## 1. Executive Summary

**Nexus Forensics** is a pure client-side React web application that empowers users to detect AI-generated images, manipulated media, and deepfakes with forensic-grade analysis.

The application leverages **Google Gemini 2.5 Flash** (multimodal) as its core intelligence engine. It delivers a highly visual, professional-grade forensic report by analyzing an uploaded image across six carefully engineered analytical dimensions.

Key highlights:
- 100% client-side processing (no backend server required)
- Real-time streaming response from Gemini
- Modern cyber-forensics dark UI with glassmorphism and animated elements
- Strict JSON schema enforcement to minimize hallucinations
- Zero data retention — images never leave the user's browser except when sent directly to Google's API

---

## 2. Objectives

### Functional Objectives
- Allow users to upload images (JPG, PNG, WebP) via drag-and-drop or file picker
- Perform multimodal forensic analysis using Gemini 2.5 Flash
- Return a structured, easy-to-understand forensic report with:
  - Overall authenticity score (0–100)
  - Six-dimensional breakdown with confidence scores and detailed explanations
  - Visual indicators (color-coded rings, flags, and severity levels)
- Provide real-time streaming of the AI analysis
- Support responsive design optimized for both desktop and tablet

### Non-Functional Objectives
- **Performance**: Fast Vite builds, minimal bundle size, smooth animations
- **UX**: Intuitive, professional, cyberpunk-inspired forensics theme
- **Privacy**: Complete zero-retention architecture
- **Reliability**: Robust error handling, input validation, and graceful degradation
- **Maintainability**: Clean component architecture and well-documented code

---

## 3. Technology Stack

### Core Framework
- **React 18** (with concurrent features)
- **Vite** (build tool + dev server with HMR)

### Styling & UI
- **Global CSS** with CSS Variables for theming
- **Inline styles** + CSS Modules (where needed for scoped styles)
- **Glassmorphism** effects (backdrop-filter, semi-transparent backgrounds)
- **SVG animations** (stroke-dasharray, glowing effects, progress rings)
- **CSS Keyframes** for loading states and score reveal animations
- **Dark Mode** cyber-forensics theme (deep blacks, neon accents: cyan, magenta, electric blue, purple)

### AI Integration
- **Google Gemini 2.5 Flash** via official `@google/generative-ai` SDK
- Multimodal input (text + inline image data)

### State Management
- **React Hooks** only:
  - `useState` – UI state, analysis results, loading status
  - `useRef` – file input reference, abort controller
  - `useCallback` – memoized handlers for performance
  - `useEffect` – side effects and cleanup

### Utilities
- Native Browser APIs: `FileReader`, `URL.createObjectURL`, `navigator.clipboard`
- MIME type validation
- Base64 conversion
- JSON parsing with sanitization

---

## 4. Project Structure

```bash
nexus-forensics/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/                  # Static images, icons, SVGs
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── MainContainer.tsx
│   │   ├── upload/
│   │   │   ├── UploadZone.tsx          # Drag & drop + file picker
│   │   │   └── PreviewCard.tsx
│   │   ├── analysis/
│   │   │   ├── BigScoreRing.tsx        # Animated overall score
│   │   │   ├── CategoryCard.tsx        # Accordion-style dimension cards
│   │   │   ├── DimensionFlag.tsx
│   │   │   └── AnalysisReport.tsx
│   │   ├── common/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   └── CopyButton.tsx
│   │   └── ui/
│   │       └── NeonButton.tsx
│   ├── hooks/
│   │   └── useGeminiAnalysis.ts        # Custom hook for AI calls
│   ├── lib/
│   │   ├── prompts.ts                  # System + user prompt templates
│   │   ├── utils.ts                    # Base64 conversion, sanitization
│   │   └── validation.ts               # File type/size validation
│   ├── types/
│   │   └── index.ts                    # TypeScript interfaces
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                       # Global styles + CSS variables
├── .env.example
├── vite.config.ts
├── tsconfig.json
└── package.json


## 5. Data Flow & Execution Pipeline
1. User Uploads Image
2. MIME Type & Size Validation
3. FileReader → Base64
4. Construct Forensic System Prompt
5. Gemini 2.5 Flash Multimodal Request
6. Streaming Response
7. Sanitize & Parse JSON
8. Update State with Analysis Result
9. Render BigScoreRing + Category Cards

### Detailed Steps

**Media Ingestion**
* Drag-and-drop zone or hidden file input (`accept="image/jpeg,image/png,image/webp"`)
* File validation: type, size (< 10MB recommended for Gemini)

**Client-Side Preprocessing**
* `FileReader.readAsDataURL()` → Base64 string
* Optional: compress image client-side if too large (future enhancement)

**Prompt Engineering**
* Strict system prompt defining:
  * Role: "You are a world-class digital forensics expert..."
  * Exact 6 analytical dimensions
  * Required JSON schema (see section 7)
  * Rules against hallucination and speculation

**Inference**
* Use `GoogleGenerativeAI` client
* `model.generateContent([systemPrompt, {inlineData: {data: base64, mimeType}}])`
* Enable streaming for real-time feel

**Response Handling**
* Accumulate streamed text
* Strip markdown code fences (```json)
* `JSON.parse()` with error fallback
* Validate schema using TypeScript types

**Dynamic Rendering**
* Overall score → animated SVG ring (`stroke-dasharray`)
* Six `CategoryCard` components with severity color coding
* Expandable accordions for detailed reasoning


## 6. Analytical Dimensions

The system forces analysis across these six forensic vectors:

| Dimension | Key Artifacts Detected | Visual Indicators |
| :--- | :--- | :--- |
| **Facial Integrity** | GAN boundaries, blending seams, eye/lip asymmetry, unnatural symmetry | Red flags on faces |
| **Lighting Coherence** | Shadow direction mismatch, light temperature inconsistency | Inconsistent highlights/shadows |
| **Texture Authenticity** | Over-smoothed skin, missing pores, AI noise patterns, plastic look | Texture anomalies |
| **Background Consistency** | Warped perspective, depth-of-field errors, garbled text | Background distortions |
| **Compression Artifacts** | Upscaling traces, JPEG blocking, re-encoding fingerprints | Compression signatures |
| **Semantic Coherence** | Anatomical errors (extra fingers, wrong limbs), object-scene mismatch | Logical impossibilities |

Each dimension returns:
* `score`: 0–100 (authenticity)
* `verdict`: "Authentic" / "Suspicious" / "Likely AI-Generated"
* `confidence`: 0–100
* `explanation`: Detailed forensic reasoning
* `key_findings`: Array of bullet points

## 7. JSON Response Schema (Enforced via Prompt)

```typescript
interface ForensicAnalysis {
  overallAuthenticityScore: number;     // 0-100
  overallVerdict: "Authentic" | "Suspicious" | "Likely AI-Generated" | "Inconclusive";
  confidenceLevel: number;              // 0-100
  dimensions: {
    facialIntegrity: DimensionResult;
    lightingCoherence: DimensionResult;
    textureAuthenticity: DimensionResult;
    backgroundConsistency: DimensionResult;
    compressionArtifacts: DimensionResult;
    semanticCoherence: DimensionResult;
  };
  summary: string;
  recommendations?: string[];
}

interface DimensionResult {
  score: number;
  verdict: "Authentic" | "Suspicious" | "Likely Manipulated";
  confidence: number;
  explanation: string;
  keyFindings: string[];
}