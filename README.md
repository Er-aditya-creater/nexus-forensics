# Nexus Forensics

![Nexus Forensics Banner](https://via.placeholder.com/800x200/0a0a0f/00ffff?text=NEXUS+FORENSICS)

## Overview

**Nexus Forensics** is a powerful client-side React application designed to detect AI-generated images, deepfakes, and manipulated media using advanced forensic analysis powered by **Google Gemini 2.5 Flash**.

In an era where synthetic media is becoming increasingly indistinguishable from reality, Nexus Forensics provides users with a transparent, forensic-grade breakdown of image authenticity. It analyzes uploaded images across six critical dimensions and delivers an easy-to-understand overall authenticity score with detailed explanations.

Built as a **pure client-side** tool with zero data retention, it ensures complete user privacy while offering professional-level insights typically found only in specialized forensics software.

**Perfect for**: Journalists, content creators, fact-checkers, security researchers, and anyone concerned about the authenticity of digital media.

---

## Features

* **Multimodal Forensic Analysis**  
  Powered by Google Gemini 2.5 Flash, the app performs deep visual and semantic analysis on any uploaded image in real-time.

* **Six-Dimensional Forensic Breakdown**  
  Detailed scoring and explanations across:
  - Facial Integrity
  - Lighting Coherence
  - Texture Authenticity
  - Background Consistency
  - Compression Artifacts
  - Semantic Coherence

* **Animated Authenticity Score Ring**  
  A beautiful, dynamic SVG-based score ring that visually represents the overall authenticity percentage with smooth animations and color-coded indicators.

* **Interactive Forensic Report**  
  Expandable category cards with confidence levels, verdicts, key findings, and plain-English explanations. Suspicious elements are highlighted with neon warning accents.

* **Privacy-First Architecture**  
  100% client-side processing. Images are never stored on any server — they are sent directly from your browser to Google's Gemini API and then discarded.

* **Modern Cyber-Forensics UI**  
  Sleek dark theme with glassmorphism effects, neon accents, glowing animations, and professional forensic-inspired design.

---

## Technical Prerequisites

To run this project locally, ensure you have the following installed:

* **Node.js:** v18.0.0 or higher
* **npm:** v9.0.0 or higher
* A valid **Google Gemini API Key** (get one from [Google AI Studio](https://aistudio.google.com/))

---

## Local Setup & Installation

### 1. Clone the repository

```bash
**1. Clone the repository**
\`\`\`bash
git clone https://github.com/your-username/nexus-forensics.git
cd nexus-forensics
\`\`\`

**2. Install project dependencies**
\`\`\`bash
npm install
\`\`\`

**3. Configure Environment Variables**
Create a \`.env\` file in the root directory of the project and insert your Gemini API key:
\`\`\`env
VITE_GEMINI_API_KEY=your_actual_api_key_here
\`\`\`

**4. Start the Development Server**
\`\`\`bash
npm run dev
\`\`\`
The application will be available at \`http://localhost:5173\`.

## Usage Instructions

1. **Upload an Image**
   * Drag and drop an image (JPG, PNG, or WebP) into the upload zone, or click to open the file picker.
   * Supported formats: JPEG, PNG, WebP (max recommended size: 10MB).

2. **Wait for Analysis**
   * The app will automatically start processing the image using Gemini 2.5 Flash.
   * You will see a real-time streaming animation as the forensic analysis loads.

3. **Review the Overall Score**
   * A large animated `BigScoreRing` displays the overall authenticity score (0–100).
   * Color coding helps quickly interpret the result:
     * **Green:** Likely authentic
     * **Yellow/Orange:** Suspicious
     * **Red:** Likely AI-generated or heavily manipulated

4. **Explore Dimensional Analysis**
   * Scroll down to view the six forensic categories.
   * Click on any card to expand and see:
     * Dimension-specific score
     * Verdict (Authentic / Suspicious / Likely Manipulated)
     * Confidence percentage
     * Detailed explanation
     * Key forensic findings (bullet points)

5. **Understand the Recommendations**
   * At the bottom, review the AI-generated summary and any suggested actions (e.g., "Cross-reference with original source", "Check metadata", etc.).

6. **Analyze Another Image**
   * Click the **Analyze New Image** button to clear results and upload a different photo.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.