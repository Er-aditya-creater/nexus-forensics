import { useState, useRef, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ANALYSIS_CATEGORIES = [
  { id: "facial", label: "Facial Integrity", icon: "⬡", desc: "GAN artifacts, blending seams, eye/lip anomalies" },
  { id: "lighting", label: "Lighting Coherence", icon: "◈", desc: "Shadow direction, ambient light consistency" },
  { id: "texture", label: "Texture Authenticity", icon: "▦", desc: "Skin texture, compression fingerprints, noise patterns" },
  { id: "background", label: "Background Consistency", icon: "◫", desc: "Edge blending, depth-of-field, perspective" },
  { id: "metadata", label: "Compression Artifacts", icon: "⊟", desc: "JPEG blocking, upscaling traces, re-encoding signs" },
  { id: "semantic", label: "Semantic Coherence", icon: "◎", desc: "Anatomical plausibility, object-scene consistency" },
];

const VERDICT_CONFIG = {
  AUTHENTIC: { color: "#10B981", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.2)", label: "Likely Authentic" },
  SUSPICIOUS: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.2)", label: "Suspicious — Review Needed" },
  MANIPULATED: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)", label: "Likely Manipulated" },
  SYNTHETIC: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)", label: "AI-Generated / Synthetic" },
};

const SYSTEM_PROMPT = `You are an expert digital forensics AI specializing in detecting manipulated, deepfake, and AI-generated images. Analyze the provided image across multiple forensic dimensions.

Return ONLY a valid JSON object (no markdown, no preamble) with this exact structure:
{
  "verdict": "AUTHENTIC" | "SUSPICIOUS" | "MANIPULATED" | "SYNTHETIC",
  "authenticity_score": <integer 0-100, where 100 = certainly authentic>,
  "confidence": <integer 0-100, confidence in your analysis>,
  "summary": "<2-3 sentence plain-English summary of your findings>",
  "categories": {
    "facial": { "score": <0-100>, "flags": ["<specific finding>", ...], "note": "<brief technical note>" },
    "lighting": { "score": <0-100>, "flags": ["<specific finding>", ...], "note": "<brief technical note>" },
    "texture": { "score": <0-100>, "flags": ["<specific finding>", ...], "note": "<brief technical note>" },
    "background": { "score": <0-100>, "flags": ["<specific finding>", ...], "note": "<brief technical note>" },
    "metadata": { "score": <0-100>, "flags": ["<specific finding>", ...], "note": "<brief technical note>" },
    "semantic": { "score": <0-100>, "flags": ["<specific finding>", ...], "note": "<brief technical note>" }
  },
  "key_indicators": ["<top finding 1>", "<top finding 2>", "<top finding 3>"],
  "recommended_action": "<what the viewer should do with this content>"
}

Score semantics: 100 = perfectly authentic on that dimension, 0 = clear manipulation.`;

function ScoreBar({ score, animated }) {
  const color = score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden", marginTop: "8px" }}>
      <div style={{
        position: "absolute", left: 0, top: 0, height: "100%",
        width: animated ? `${score}%` : 0,
        background: color, borderRadius: 99,
        boxShadow: `0 0 10px ${color}80`,
        transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)"
      }} />
    </div>
  );
}

function BigScoreRing({ score, verdict }) {
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.AUTHENTIC;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <svg width="160" height="160" style={{ transform: "rotate(-90deg)", filter: `drop-shadow(0 0 12px ${cfg.color}40)` }}>
          <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke={cfg.color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.4s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 42, fontWeight: 700, color: cfg.color, fontFamily: "monospace", textShadow: `0 0 20px ${cfg.color}80` }}>{score}</span>
          <span style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: "0.15em", marginTop: "-4px" }}>AUTH SCORE</span>
        </div>
      </div>
      <div style={{
        padding: "6px 18px", borderRadius: 99,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        fontSize: 14, fontWeight: 600, color: cfg.color,
        boxShadow: `0 0 15px ${cfg.bg}`
      }}>
        {cfg.label}
      </div>
    </div>
  );
}

function CategoryCard({ cat, data, animate }) {
  const [open, setOpen] = useState(false);
  const color = data.score >= 70 ? "#10B981" : data.score >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className="cat-card"
      style={{
        background: "rgba(17, 24, 39, 0.7)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        padding: "16px",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 18, color: "#60A5FA" }}>{cat.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#F3F4F6", flex: 1 }}>{cat.label}</span>
        <span style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 700, color: color, textShadow: `0 0 10px ${color}60` }}>
          {data.score}
        </span>
      </div>
      <ScoreBar score={data.score} animated={animate} />
      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", animation: "fadeIn 0.3s ease" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 12px", fontFamily: "monospace", lineHeight: 1.5 }}>{data.note}</p>
          {data.flags && data.flags.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.flags.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                  <span style={{ fontSize: 12, color: "#EF4444", marginTop: 2 }}>⯈</span>
                  <span style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScanOverlay({ active }) {
  if (!active) return null;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 10, borderRadius: "12px" }}>
      <div style={{
        position: "absolute", left: 0, right: 0, height: "15%",
        background: "linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.4))",
        borderBottom: "2px solid #3B82F6",
        boxShadow: "0 5px 15px rgba(59, 130, 246, 0.6)",
        animation: "cyberScan 2s ease-in-out infinite alternate"
      }} />
    </div>
  );
}

export default function FakeDetector() {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const fileRef = useRef();

  const LOADING_MSGS = [
    "Extracting Exif metadata...",
    "Scanning GAN facial geometry...",
    "Analyzing ambient light vectors...",
    "Checking skin texture noise...",
    "Inspecting JPEG compression blocks...",
    "Running semantic coherence check...",
    "Compiling forensic report...",
  ];

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      const base64 = e.target.result.split(",")[1];
      setImageBase64(base64);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  const analyze = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setAnimate(false);

    let msgIdx = 0;
    setLoadingMsg(LOADING_MSGS[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[msgIdx]);
    }, 1200);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const imagePart = { inlineData: { data: imageBase64, mimeType: imageMime } };
      const resultData = await model.generateContent([
        SYSTEM_PROMPT + "\n\nAnalyze this image and return the raw JSON object.", 
        imagePart
      ]);
      
      const text = resultData.response.text();
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      
      setResult(parsed);
      setTimeout(() => setAnimate(true), 100);

    } catch (err) {
      console.error("API Error:", err);
      setError(`Analysis failed: ${err.message}`); 
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    setAnimate(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#030712",
      color: "#F3F4F6",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "2rem 1rem"
    }}>
      <style>{`
        @keyframes cyberScan { 0% { top: -15%; } 100% { top: 100%; } }
        @keyframes pulseGlow { 0%, 100% { opacity: 1; filter: drop-shadow(0 0 5px #3B82F6); } 50% { opacity: 0.5; filter: none; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .cat-card:hover { border-color: rgba(96, 165, 250, 0.4) !important; transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        .cyber-btn { background: #1D4ED8; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 15px rgba(29, 78, 216, 0.4); }
        .cyber-btn:hover { background: #2563EB; box-shadow: 0 0 25px rgba(37, 99, 235, 0.6); transform: translateY(-1px); }
        .ghost-btn { background: rgba(255,255,255,0.05); color: #D1D5DB; border: 1px solid rgba(255,255,255,0.1); padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .ghost-btn:hover { background: rgba(255,255,255,0.1); color: white; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem" }}>
        
        {/* Header Section */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "10px", background: "linear-gradient(135deg, #1E3A8A, #3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)" }}>
              ⎈
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", background: "linear-gradient(to right, #F3F4F6, #9CA3AF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Nexus Forensics
            </h1>
            <span style={{ fontSize: 11, fontFamily: "monospace", background: "rgba(59, 130, 246, 0.15)", color: "#60A5FA", padding: "4px 10px", borderRadius: 99, border: "1px solid rgba(59, 130, 246, 0.3)" }}>v2.0 BETA</span>
          </div>
          <p style={{ margin: 0, fontSize: 16, color: "#9CA3AF", maxWidth: 600, marginInline: "auto", lineHeight: 1.6 }}>
            Upload media to detect GAN artifacts, deepfakes, and synthetic generation using our 6-dimensional forensic model.
          </p>
        </div>

        {/* Upload Zone */}
        {!image ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "#3B82F6" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "16px", padding: "4rem 2rem", textAlign: "center", cursor: "pointer",
              background: dragOver ? "rgba(59, 130, 246, 0.05)" : "rgba(17, 24, 39, 0.5)",
              transition: "all 0.2s ease", backdropFilter: "blur(10px)"
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16, color: dragOver ? "#3B82F6" : "#4B5563", transition: "color 0.2s" }}>⇪</div>
            <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600, color: "#E5E7EB" }}>Drop target image to initialize scan</p>
            <p style={{ margin: 0, fontSize: 14, color: "#6B7280" }}>High-resolution JPG, PNG, or WebP recommended</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 24, alignItems: "start" }}>

            {/* Left Column: Image & Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)",
                background: "#111827", position: "relative", boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
              }}>
                <img src={image} alt="Target" style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }} />
                <ScanOverlay active={loading} />
              </div>

              {loading && (
                <div style={{ padding: "16px", background: "rgba(17, 24, 39, 0.8)", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.3)", backdropFilter: "blur(10px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#60A5FA", animation: "pulseGlow 1.5s infinite" }} />
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: "#9CA3AF" }}>{loadingMsg}</span>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                {!loading && !result && (
                  <button onClick={analyze} className="cyber-btn" style={{ flex: 1 }}>Execute Scan ⯈</button>
                )}
                <button onClick={reset} className="ghost-btn" style={{ flex: result ? 1 : 0 }}>
                  {result ? "⟲ Reset & Upload New" : "Cancel"}
                </button>
              </div>
            </div>

            {/* Right Column: Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              
              {!result && !loading && (
                <div style={{ padding: "3rem 2rem", background: "rgba(17, 24, 39, 0.5)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <span style={{ fontSize: 32, color: "#374151", marginBottom: 16 }}>⌖</span>
                  <p style={{ margin: 0, fontSize: 15, color: "#9CA3AF" }}>System ready. Execute scan to generate forensic breakdown.</p>
                </div>
              )}

              {error && (
                <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#FCA5A5", fontSize: 14 }}>
                  ⚠️ {error}
                </div>
              )}

              {result && (
                <div style={{ animation: "fadeIn 0.5s ease" }}>
                  <div style={{ background: "linear-gradient(180deg, rgba(17, 24, 39, 0.9) 0%, rgba(17, 24, 39, 0.6) 100%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, backdropFilter: "blur(10px)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
                    <BigScoreRing score={animate ? result.authenticity_score : 0} verdict={result.verdict} />
                    
                    <div style={{ width: "100%", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <p style={{ margin: "0 0 16px", fontSize: 15, color: "#D1D5DB", lineHeight: 1.6 }}>{result.summary}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#6B7280", fontFamily: "monospace" }}>CONFIDENCE: <strong style={{ color: "#F3F4F6" }}>{result.confidence}%</strong></span>
                        <span style={{ color: "#6B7280", fontFamily: "monospace" }}>ENGINE: Gemini 2.5</span>
                      </div>
                    </div>
                  </div>

                  {result.key_indicators?.length > 0 && (
                    <div style={{ background: "rgba(17, 24, 39, 0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", marginTop: 16 }}>
                      <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#6B7280", letterSpacing: "0.1em" }}>CRITICAL ANOMALIES</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {result.key_indicators.map((ind, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <span style={{ fontSize: 14, color: "#F59E0B" }}>⯁</span>
                            <span style={{ fontSize: 14, color: "#E5E7EB", lineHeight: 1.5 }}>{ind}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.recommended_action && (
                    <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", marginTop: 16 }}>
                      <strong style={{ fontSize: 12, display: "block", marginBottom: 6, color: "#60A5FA", letterSpacing: "0.1em" }}>PROTOCOL RECOMMENDATION</strong>
                      <span style={{ fontSize: 14, color: "#BFDBFE", lineHeight: 1.5 }}>{result.recommended_action}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories Grid */}
        {result && result.categories && (
          <div style={{ marginTop: "2rem", animation: "fadeIn 0.6s ease 0.2s both" }}>
            <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.1em", textAlign: "center" }}>
              DIMENSIONAL TELEMETRY (CLICK TO EXPAND)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              {ANALYSIS_CATEGORIES.map(cat => (
                result.categories[cat.id] ? <CategoryCard key={cat.id} cat={cat} data={result.categories[cat.id]} animate={animate} /> : null
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}