import { useState, useRef, useEffect, useCallback } from "react";

const WASTE_DB = {
  plastic: {
    color: "#1D9E75", bg: "#E1F5EE", dark: "#085041",
    icon: "♻️", points: 10,
    decomposition: "450–1000 years",
    tips: "Rinse before recycling. Remove caps.",
    examples: ["bottle", "bag", "cup", "straw", "container"],
  },
  organic: {
    color: "#639922", bg: "#EAF3DE", dark: "#173404",
    icon: "🌿", points: 5,
    decomposition: "2 weeks – 6 months",
    tips: "Compost it! Great for garden soil.",
    examples: ["apple", "banana", "food", "vegetable", "fruit", "leaf"],
  },
  metal: {
    color: "#185FA5", bg: "#E6F1FB", dark: "#042C53",
    icon: "🔩", points: 8,
    decomposition: "50–500 years",
    tips: "Clean metal is 100% recyclable forever.",
    examples: ["can", "tin", "foil", "nail", "wire", "key"],
  },
  ewaste: {
    color: "#7F77DD", bg: "#EEEDFE", dark: "#26215C",
    icon: "💻", points: 15,
    decomposition: "100–1000+ years",
    tips: "Never dump. Toxic chemicals inside.",
    examples: ["phone", "laptop", "battery", "charger", "cable", "circuit"],
  },
  paper: {
    color: "#BA7517", bg: "#FAEEDA", dark: "#412402",
    icon: "📄", points: 3,
    decomposition: "2–6 weeks",
    tips: "Keep dry. Wet paper can't be recycled.",
    examples: ["newspaper", "cardboard", "book", "notebook", "magazine"],
  },
  general: {
    color: "#5F5E5A", bg: "#F1EFE8", dark: "#2C2C2A",
    icon: "🗑️", points: 1,
    decomposition: "Unknown / varies",
    tips: "Check if any part is recyclable.",
    examples: ["misc", "other", "mixed"],
  },
};

const COCO_MAP = {
  bottle: "plastic", "wine glass": "plastic", cup: "plastic",
  fork: "metal", knife: "metal", spoon: "metal", bowl: "metal",
  banana: "organic", apple: "organic", sandwich: "organic",
  orange: "organic", broccoli: "organic", carrot: "organic",
  "hot dog": "organic", pizza: "organic", donut: "organic", cake: "organic",
  laptop: "ewaste", "cell phone": "ewaste", "remote control": "ewaste",
  keyboard: "ewaste", mouse: "ewaste", tv: "ewaste",
  book: "paper", scissors: "metal", backpack: "plastic",
  chair: "general", couch: "general", bed: "general",
  clock: "ewaste", vase: "general", "teddy bear": "general",
  toothbrush: "plastic",
};

// ── Gemini API (FREE) ─────────────────────────────────────────────────────────
// Get your free key at: https://aistudio.google.com/apikey
const GEMINI_API_KEY = "AIzaSyCO9o9O89CX_eCsqMUj7vhRkxiBM8pmS_I";
const GEMINI_URL =`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

const API_SYSTEM = `You are an expert waste classification AI. When given an image or description, identify ALL waste items visible.
For each item, respond in valid JSON only (no markdown, no explanation):
{
  "items": [
    {
      "label": "item name",
      "wasteType": "plastic|organic|metal|ewaste|paper|general",
      "confidence": 0-100,
      "reason": "one sentence explanation",
      "recyclable": true
    }
  ],
  "summary": "brief overall scene description"
}`;

async function callGeminiAPI(parts) {
  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: API_SYSTEM },
            ...parts
          ]
        }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.1 }
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    try {
      const clean = text.replace(/```json|```/g, "").trim();
      return JSON.parse(clean);
    } catch {
      return { items: [], summary: text };
    }
  } catch (err) {
    console.error("Gemini error:", err);
    return { items: [], summary: "Error: " + err.message };
  }
}

// Text-only query
async function callGeminiText(prompt) {
  return callGeminiAPI([{ text: prompt }]);
}

// Image + text query
async function callGeminiImage(b64, mime, prompt) {
  return callGeminiAPI([
    { inline_data: { mime_type: mime, data: b64 } },
    { text: prompt }
  ]);
}

// ── Components ────────────────────────────────────────────────────────────────
function WasteCard({ item, animate }) {
  const wt = WASTE_DB[item.wasteType] || WASTE_DB.general;
  return (
    <div style={{
      background: wt.bg, border: `1.5px solid ${wt.color}40`,
      borderRadius: 14, padding: "14px 16px", marginBottom: 10,
      transform: animate ? "translateY(0)" : "translateY(20px)",
      opacity: animate ? 1 : 0,
      transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{wt.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: wt.dark, textTransform: "capitalize" }}>{item.label}</div>
          <div style={{ fontSize: 12, color: wt.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.wasteType}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: wt.color }}>+{wt.points}</div>
          <div style={{ fontSize: 11, color: wt.dark + "99" }}>pts</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: wt.dark + "cc", marginBottom: 4 }}>{item.reason}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        <span style={{ fontSize: 11, background: wt.color + "20", color: wt.color, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
          ⏱ {wt.decomposition}
        </span>
        <span style={{ fontSize: 11, background: item.recyclable ? "#E1F5EE" : "#FCEBEB", color: item.recyclable ? "#0F6E56" : "#A32D2D", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
          {item.recyclable ? "✓ Recyclable" : "✗ Non-recyclable"}
        </span>
        <span style={{ fontSize: 11, background: "#F1EFE8", color: "#5F5E5A", padding: "2px 8px", borderRadius: 20 }}>
          {item.confidence}% confident
        </span>
      </div>
    </div>
  );
}

function Spinner({ color = "#1D9E75", bg = "#E1F5EE" }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{
        display: "inline-block", width: 40, height: 40,
        border: `3px solid ${bg}`, borderTopColor: color,
        borderRadius: "50%", animation: "spin 0.8s linear infinite"
      }} />
      <div style={{ marginTop: 10, color: "#5F5E5A", fontSize: 14 }}>Analyzing…</div>
    </div>
  );
}

function PhotoMode({ onLog }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [animated, setAnimated] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = e.target.result.split(",")[1];
      const mime = file.type || "image/jpeg";
      setPreview(e.target.result);
      setLoading(true); setResults(null); setAnimated(false);
      try {
        const res = await callGeminiImage(b64, mime, "Analyze this image and classify all waste items you see. Be thorough.");
        setResults(res);
        setTimeout(() => setAnimated(true), 100);
        if (res.items) res.items.forEach(item => onLog({ ...item, ts: Date.now() }));
      } catch {
        setResults({ items: [], summary: "Error analyzing image. Please try again." });
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div
        onClick={() => fileRef.current.click()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={e => e.preventDefault()}
        style={{
          border: "2px dashed #B4B2A9", borderRadius: 16, padding: "32px 20px",
          textAlign: "center", cursor: "pointer", marginBottom: 16,
          background: preview ? "transparent" : "#F8F7F4", transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#1D9E75"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#B4B2A9"}
      >
        {preview
          ? <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, objectFit: "contain" }} />
          : <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#2C2C2A", marginBottom: 4 }}>Drop or click to upload</div>
            <div style={{ fontSize: 13, color: "#888780" }}>JPG, PNG, WebP supported</div>
          </>}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      </div>
      {loading && <Spinner />}
      {results && <>
        {results.summary && <div style={{ fontSize: 13, color: "#5F5E5A", marginBottom: 12, padding: "10px 14px", background: "#F1EFE8", borderRadius: 10 }}>{results.summary}</div>}
        {results.items?.length > 0
          ? results.items.map((item, i) => <WasteCard key={i} item={item} animate={animated} />)
          : !loading && <div style={{ textAlign: "center", padding: 20, color: "#888780" }}>No waste items detected.</div>}
      </>}
    </div>
  );
}

function VoiceMode({ onLog }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState(null);
  const [animated, setAnimated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setError("Voice not supported. Try Chrome."); return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR(); rec.lang = "en-US"; rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => setTranscript(Array.from(e.results).map(r => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); setError("Mic error. Allow mic access."); };
    recRef.current = rec; rec.start();
  };

  const stopAndAnalyze = async () => {
    if (recRef.current) recRef.current.stop();
    if (!transcript.trim()) return;
    setLoading(true); setResults(null);
    try {
      const res = await callGeminiText(`User described waste verbally: "${transcript}". Classify and analyze the waste items mentioned.`);
      setResults(res);
      setTimeout(() => setAnimated(true), 100);
      if (res.items) {
        res.items.forEach(item => onLog({ ...item, ts: Date.now() }));
        if (res.items[0]) {
          const wt = WASTE_DB[res.items[0].wasteType] || WASTE_DB.general;
          const utter = new SpeechSynthesisUtterance(`Detected ${res.items[0].label}. It is ${res.items[0].wasteType} waste. ${wt.tips}`);
          utter.rate = 0.9;
          window.speechSynthesis.speak(utter);
        }
      }
    } catch { setResults({ items: [], summary: "Error. Please try again." }); }
    setLoading(false);
  };

  return (
    <div>
      {error && <div style={{ background: "#FCEBEB", color: "#A32D2D", padding: "10px 14px", borderRadius: 10, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      <div style={{ textAlign: "center", padding: "32px 20px", background: "#F8F7F4", borderRadius: 16, marginBottom: 16 }}>
        <button
          onClick={listening ? stopAndAnalyze : startListening}
          style={{
            width: 80, height: 80, borderRadius: "50%", border: "none",
            background: listening ? "#E24B4A" : "#1D9E75", cursor: "pointer",
            fontSize: 32, transition: "all 0.2s",
            boxShadow: listening ? "0 0 0 12px #E24B4A30" : "none",
            animation: listening ? "pulse 1s ease infinite" : "none",
          }}
        >{listening ? "⏹" : "🎤"}</button>
        <div style={{ marginTop: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#2C2C2A" }}>
          {listening ? "Listening… tap to analyze" : "Tap to speak"}
        </div>
        <div style={{ fontSize: 12, color: "#888780", marginTop: 4 }}>
          Say: "I have a plastic bottle and some banana peels"
        </div>
      </div>
      {transcript && <div style={{ background: "#EEEDFE", borderRadius: 12, padding: "12px 16px", marginBottom: 12, fontSize: 14, color: "#3C3489", fontStyle: "italic" }}>🗣 "{transcript}"</div>}
      {!listening && transcript && !loading && !results && (
        <button onClick={stopAndAnalyze} style={{ width: "100%", padding: "12px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          Analyze Transcript →
        </button>
      )}
      {loading && <Spinner color="#7F77DD" bg="#EEEDFE" />}
      {results?.items?.map((item, i) => <WasteCard key={i} item={item} animate={animated} />)}
    </div>
  );
}

function CameraMode({ onLog }) {
  const videoRef = useRef(); const canvasRef = useRef();
  const [stream, setStream] = useState(null);
  const [results, setResults] = useState(null);
  const [animated, setAnimated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snap, setSnap] = useState(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(s); videoRef.current.srcObject = s;
    } catch { alert("Camera access denied. Please allow camera permission."); }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setResults(null); setSnap(null);
  };

  const captureAndAnalyze = async () => {
    const canvas = canvasRef.current; const video = videoRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const b64 = dataUrl.split(",")[1];
    setSnap(dataUrl); setLoading(true); setResults(null);
    try {
      const res = await callGeminiImage(b64, "image/jpeg", "Analyze this real-time camera frame. Identify and classify all waste items visible. Be specific.");
      setResults(res);
      setTimeout(() => setAnimated(true), 100);
      if (res.items) {
        res.items.forEach(item => onLog({ ...item, ts: Date.now() }));
        if (res.items[0]) {
          const wt = WASTE_DB[res.items[0].wasteType] || WASTE_DB.general;
          const utter = new SpeechSynthesisUtterance(`Detected ${res.items[0].label}. ${res.items[0].wasteType} waste. ${wt.tips}`);
          utter.rate = 0.9;
          window.speechSynthesis.speak(utter);
        }
      }
    } catch { setResults({ items: [], summary: "Error analyzing frame." }); }
    setLoading(false);
  };

  useEffect(() => () => stream?.getTracks().forEach(t => t.stop()), [stream]);

  return (
    <div>
      <div style={{ background: "#000", borderRadius: 16, overflow: "hidden", marginBottom: 12, minHeight: stream ? "auto" : 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!stream && !snap && <div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 40, marginBottom: 8 }}>📹</div><div style={{ color: "#888780", fontSize: 14 }}>Camera not active</div></div>}
        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: stream ? "block" : "none", borderRadius: 16 }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {snap && !stream && <img src={snap} alt="captured" style={{ width: "100%", borderRadius: 16 }} />}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {!stream
          ? <button onClick={startCamera} style={{ flex: 1, padding: "12px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>📹 Start Camera</button>
          : <>
            <button onClick={captureAndAnalyze} disabled={loading} style={{ flex: 2, padding: "12px", background: loading ? "#B4B2A9" : "#7F77DD", color: "#fff", border: "none", borderRadius: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer" }}>
              {loading ? "Analyzing…" : "📸 Capture & Analyze"}
            </button>
            <button onClick={stopCamera} style={{ flex: 1, padding: "12px", background: "#F1EFE8", color: "#5F5E5A", border: "none", borderRadius: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Stop</button>
          </>}
      </div>
      {loading && <Spinner color="#7F77DD" bg="#EEEDFE" />}
      {results?.items?.map((item, i) => <WasteCard key={i} item={item} animate={animated} />)}
      {results?.summary && <div style={{ fontSize: 13, color: "#5F5E5A", marginTop: 8, padding: "10px 14px", background: "#F1EFE8", borderRadius: 10 }}>{results.summary}</div>}
    </div>
  );
}

function HistoryMode({ logs, clearLogs }) {
  if (!logs.length) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#888780" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No scans yet</div>
      <div style={{ fontSize: 13 }}>Start scanning waste to build your history</div>
    </div>
  );
  const dist = Object.entries([...logs].reduce((acc, l) => { acc[l.wasteType] = (acc[l.wasteType] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...dist.map(d => d[1]), 1);
  const total = logs.reduce((s, l) => s + (WASTE_DB[l.wasteType]?.points || 1), 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[{ label: "Eco Score", value: total, color: "#1D9E75" }, { label: "Items Scanned", value: logs.length, color: "#185FA5" }].map(m => (
          <div key={m.label} style={{ background: "#F1EFE8", borderRadius: 12, padding: "14px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 12, color: "#888780" }}>{m.label}</div>
          </div>
        ))}
      </div>
      {dist.map(([type, count]) => { const wt = WASTE_DB[type] || WASTE_DB.general; return (
        <div key={type} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, fontSize: 12 }}>
            <span style={{ color: "#2C2C2A", fontWeight: 500 }}>{wt.icon} {type}</span>
            <span style={{ color: "#888780" }}>{count}</span>
          </div>
          <div style={{ height: 6, background: "#E0DDD5", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: wt.color, borderRadius: 4, transition: "width 0.6s ease" }} />
          </div>
        </div>
      ); })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid #E8E6DF" }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#2C2C2A" }}>{logs.length} items logged</div>
        <button onClick={clearLogs} style={{ fontSize: 12, color: "#E24B4A", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Clear all</button>
      </div>
      {[...logs].reverse().map((log, i) => { const wt = WASTE_DB[log.wasteType] || WASTE_DB.general; return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: wt.bg, borderRadius: 10, marginBottom: 6, border: `1px solid ${wt.color}25` }}>
          <span style={{ fontSize: 18 }}>{wt.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: wt.dark }}>{log.label}</div>
            <div style={{ fontSize: 11, color: wt.color }}>{log.wasteType} · {new Date(log.ts).toLocaleTimeString()}</div>
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: wt.color }}>+{wt.points}</div>
        </div>
      ); })}
    </div>
  );
}

const MODES = [
  { id: "photo", label: "Photo", icon: "🖼️", desc: "Upload image" },
  { id: "voice", label: "Voice", icon: "🎤", desc: "Speak waste" },
  { id: "camera", label: "Camera", icon: "📹", desc: "Live scan" },
  { id: "history", label: "History", icon: "📋", desc: "View logs" },
];

export default function App() {
  const [activeMode, setActiveMode] = useState("photo");
  const [logs, setLogs] = useState([]);
  const addLog = useCallback((item) => setLogs(prev => [...prev, item]), []);
  const totalScore = logs.reduce((s, l) => s + (WASTE_DB[l.wasteType]?.points || 1), 0);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", minHeight: "100vh", background: "linear-gradient(135deg, #F8FBF7 0%, #F0F7EC 100%)", paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 8px #E24B4A20; } 50% { box-shadow: 0 0 0 18px #E24B4A10; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #B4B2A9; border-radius: 4px; }
      `}</style>

      <div style={{ background: "#fff", borderBottom: "1px solid #E8E6DF", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "#1D9E75", letterSpacing: "-0.5px" }}>♻ WasteSense AI</div>
          <div style={{ fontSize: 11, color: "#888780", letterSpacing: "0.05em", textTransform: "uppercase" }}>Smart Waste Segregation System</div>
        </div>
        <div style={{ background: "#E1F5EE", border: "none", borderRadius: 12, padding: "8px 14px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "#1D9E75", lineHeight: 1 }}>{totalScore}</span>
          <span style={{ fontSize: 10, color: "#0F6E56", fontWeight: 600 }}>ECO PTS</span>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, margin: "16px 0" }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setActiveMode(m.id)}
              style={{ padding: "12px 4px", border: activeMode === m.id ? "2px solid #1D9E75" : "1.5px solid #E8E6DF", borderRadius: 14, background: activeMode === m.id ? "#E1F5EE" : "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
              <div style={{ fontSize: 20, marginBottom: 3 }}>{m.icon}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: activeMode === m.id ? "#0F6E56" : "#2C2C2A" }}>{m.label}</div>
              <div style={{ fontSize: 10, color: "#888780" }}>{m.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
          {Object.entries(WASTE_DB).map(([type, wt]) => (
            <div key={type} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, background: wt.bg, border: `1px solid ${wt.color}40`, borderRadius: 20, padding: "4px 10px" }}>
              <span style={{ fontSize: 13 }}>{wt.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: wt.dark, textTransform: "capitalize" }}>{type}</span>
              <span style={{ fontSize: 10, color: wt.color }}>+{wt.points}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E8E6DF", padding: "20px 16px", minHeight: 200 }}>
          {activeMode === "photo" && <PhotoMode onLog={addLog} />}
          {activeMode === "voice" && <VoiceMode onLog={addLog} />}
          {activeMode === "camera" && <CameraMode onLog={addLog} />}
          {activeMode === "history" && <HistoryMode logs={logs} clearLogs={() => setLogs([])} />}
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "🌍", title: "Why segregate?", text: "Reduces landfill by 70% and cuts CO₂ by 1.1B tons/year" },
            { icon: "📱", title: "How it works", text: "AI analyzes your waste and tells you exactly how to dispose it" },
          ].map(c => (
            <div key={c.title} style={{ background: "#F8F7F4", borderRadius: 14, padding: "14px 12px" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#2C2C2A", marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "#888780", lineHeight: 1.5 }}>{c.text}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#B4B2A9" }}>
        
        </div>
      </div>
    </div>
  );
}