//done
// src/pages/BlankSyncPlatform.jsx
// Fill-in-the-blanks bulk uploader — same shell/flow as CODSync/FileSync.
// Flow: token -> QB select -> Batch Configuration -> Paste & Upload -> Results

import { useState, useEffect } from "react";
import "./CODSync.css"; // reuse the cod-* shell classes (same folder: src/pages)

const API = "https://api.examly.io";

const DIFFICULTIES  = ["Easy", "Medium", "Hard"];
const BLOOMS_LEVELS = ["Knowledge", "Comprehension", "Application", "Analysis", "Synthesis", "Evaluation"];

// UI label (as shown in the platform's own Bloom's dropdown) → backend value sent to the API.
const BLOOMS_UI = [
  { label: "Evaluate",   value: "Evaluation" },
  { label: "Create",     value: "Synthesis" },
  { label: "Analyse",    value: "Analysis" },
  { label: "Apply",      value: "Application" },
  { label: "Understand", value: "Comprehension" },
  { label: "Remember",   value: "Knowledge" },
];

// ─── HTML HELPERS ─────────────────────────────────────────────────────────────
const esc = s => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Paragraph-wrap plain text (blank-line separated); pass through if already HTML.
function wrapHtml(text) {
  if (!text) return "";
  const t = text.trim();
  if (/^<(p|ul|ol|div|h[1-6]|br|b|strong|em|span|table)\b/i.test(t)) return t.replace(/>\s+</g, "><");
  return t.split(/\n\n+/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

// Each line of the solution becomes its own <p>; blank lines become <p><br></p>.
// This matches the platform's own captured answer_explanation.best_sol format exactly.
function linesToHtml(text) {
  if (!text) return "";
  return text.split(/\r?\n/).map(line =>
    line.trim() === "" ? "<p><br></p>" : `<p>${esc(line)}</p>`
  ).join("");
}

const truthy = s => /^(yes|true|1)$/i.test((s || "").trim());

// ─── PARSER ───────────────────────────────────────────────────────────────────
function parseFillupQuestions(raw) {
  const errors = [], warnings = [], questions = [];

  const blocks = raw
    .split(/---QUESTION---/i)
    .map(b => b.split(/---END---/i)[0])
    .filter(b => b.trim().length > 0);

  if (blocks.length === 0) {
    errors.push("No ---QUESTION--- blocks found. Check the format.");
    return { questions, errors, warnings };
  }

  const HEADER_RE = /^(TITLE|DIFFICULTY|BLOOMS|TAGS|MODE|CASE_SENSITIVE|DESCRIPTION|CODE|SOLUTION|ANSWER)\s*:/i;

  blocks.forEach((block, bi) => {
    const qNum = bi + 1;
    const qErr = [];
    const qWarn = [];
    const lines = block.split("\n");
    const seg = {};
    let key = null, buf = [];

    const flush = () => { if (key !== null) seg[key] = buf.join("\n").trim(); };

    lines.forEach(line => {
      const m = line.match(/^([A-Z_]+)\s*:\s*(.*)/i);
      if (m && HEADER_RE.test(line)) {
        flush();
        key = m[1].toUpperCase();
        buf = m[2].trim() ? [m[2].trim()] : [];
        return;
      }
      if (key !== null) buf.push(line);
    });
    flush();

    const get = k => seg[k.toUpperCase()] || null;

    // ── ANSWER lines: scanned directly (repeatable, one blank per line) ──
    const getAnswers = () => {
      const raw = [];
      lines.forEach(line => {
        if (/^ANSWER\s*:/i.test(line))
          raw.push(line.replace(/^ANSWER\s*:\s*/i, "").trim());
      });
      return raw.filter(l => l.length > 0).map((val, idx) => {
        // primary | other_answers(comma-sep) | splitweight | do_not_split | partial
        const parts = val.split("|").map(p => p.trim());
        const primary       = parts[0] || "";
        const otherAnswers  = (parts[1] || "").split(",").map(a => a.trim()).filter(Boolean);
        const weightRaw     = (parts[2] || "").trim();
        const doNotSplit    = truthy(parts[3]);
        const partial       = truthy(parts[4]);
        if (!primary) qWarn.push(`Q${qNum} Answer ${idx + 1}: empty primary answer`);
        return { primary, otherAnswers, weightRaw, doNotSplit, partial };
      });
    };

    const title       = get("TITLE");
    // DIFFICULTY is optional — omit it to inherit the Batch Config default.
    // (BLOOMS already worked this way; this brings DIFFICULTY in line with it.)
    const difficultyRaw = get("DIFFICULTY");
    const difficulty  = difficultyRaw; // may be null — resolved against batch default at payload time
    const blooms      = get("BLOOMS") || null;
    const tagsRaw     = get("TAGS");
    const modeRaw     = (get("MODE") || "text").toLowerCase();
    const mode        = modeRaw === "code" ? "code" : "text";
    const caseSens    = truthy(get("CASE_SENSITIVE"));
    const description = get("DESCRIPTION");
    const code         = get("CODE");
    const solution      = get("SOLUTION");
    const answers      = getAnswers();

    // ── Validation ──
    if (!title)       qErr.push(`Q${qNum}: Missing TITLE`);
    if (difficultyRaw && !DIFFICULTIES.includes(difficultyRaw))
      qErr.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard (got "${difficultyRaw}")`);
    if (!description) qErr.push(`Q${qNum}: Missing DESCRIPTION`);
    if (answers.length === 0) qErr.push(`Q${qNum}: No ANSWER lines found (need at least one blank)`);

    if (blooms && !BLOOMS_LEVELS.includes(blooms))
      qWarn.push(`Q${qNum}: BLOOMS "${blooms}" is not a standard Bloom's level`);

    if (mode === "code" && !code) qErr.push(`Q${qNum}: MODE is "code" but CODE block is missing`);
    if (mode === "code" && !solution) qWarn.push(`Q${qNum}: No SOLUTION provided — answer explanation will be empty`);
    if (mode === "text" && (code || solution))
      qWarn.push(`Q${qNum}: MODE is "text" — CODE/SOLUTION block will be ignored`);

    // Cross-check blank markers (___) in the visible question text vs ANSWER count
    const markerSource = mode === "code" ? `${description || ""}\n${code || ""}` : (description || "");
    const markerCount  = (markerSource.match(/_{3,}/g) || []).length;
    if (markerCount > 0 && markerCount !== answers.length) {
      qWarn.push(`Q${qNum}: Found ${markerCount} blank marker(s) ("___") but ${answers.length} ANSWER line(s) provided — counts should match.`);
    }

    if (qErr.length > 0) { errors.push(...qErr); if (qWarn.length) warnings.push(...qWarn); return; }
    if (qWarn.length > 0) warnings.push(...qWarn);

    // ── Splitweight resolution: explicit if any given, else even auto-split summing to 100 ──
    const anyWeightGiven = answers.some(a => a.weightRaw !== "");
    let weights;
    if (anyWeightGiven) {
      weights = answers.map(a => parseInt(a.weightRaw) || 0);
    } else {
      const n = answers.length;
      const base = Math.floor(100 / n);
      weights = answers.map(() => base);
      weights[weights.length - 1] += 100 - base * n; // remainder to last blank
    }

    // ── Single-blank questions: "do not split" is forced on — there's nothing to split across ──
    const finalAnswers = answers.map((a, i) => ({ ...a, weight: weights[i] }));
    if (finalAnswers.length === 1) finalAnswers[0].doNotSplit = true;

    questions.push({
      title, difficulty, blooms,
      tags: tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [""],
      mode, caseSensitive: caseSens,
      description, code: code || "", solution: solution || "",
      answers: finalAnswers,
    });
  });

  return { questions, errors, warnings };
}

// ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────
function buildFillupPayload(q, batchConfig, qbId, userId) {
  const isCode = q.mode === "code";

  const questionData = isCode
    ? wrapHtml(q.description) + "$$$examly" + q.code
    : wrapHtml(q.description);

  const answerExplanation = (isCode && q.solution)
    ? { args: [linesToHtml(q.solution)], best_sol: linesToHtml(q.solution) }
    : { args: [] };

  return {
    question_type: "fillup_single_correct",
    question_data: questionData,
    question_editor_type: isCode ? 3 : 1,
    answer: {
      fillups_answers: q.answers.map(a => ({
        args: a.primary,
        splitweight: a.weight,
        do_not_split_bool: a.doNotSplit,
        other_answers: a.otherAnswers.map(v => ({ value: v, weightage: 100 })),
        other_answer_partial: a.partial,
      })),
    },
    subject_id: batchConfig.subject_id || null,
    topic_id: batchConfig.topic_id || null,
    sub_topic_id: batchConfig.sub_topic_id || null,
    blooms_taxonomy: q.blooms || batchConfig.blooms || null,
    course_outcome: null,
    program_outcome: null,
    hint: [],
    answer_explanation: answerExplanation,
    manual_difficulty: q.difficulty || batchConfig.manual_difficulty,
    linked_concepts: "",
    tags: q.tags.length ? q.tags : [""],
    case_sensitive: !!q.caseSensitive,
    blanks: q.answers.length,
    question_media: [],
    qb_id: qbId,
    createdBy: userId,
  };
}

// ─── SAMPLE FORMATS (for the copy button) ─────────────────────────────────────
// DIFFICULTY and BLOOMS are optional — they inherit the Batch Config default.
// Only add these lines to a question when it needs to override that default.
const SAMPLE_TEXT = `---QUESTION---
TITLE: Reference Variables
TAGS: java, basics
MODE: text
CASE_SENSITIVE: no
DESCRIPTION:
<p>__________ variables are aliases to existing variables.</p>
ANSWER: Reference | | | no | no
---END---
---QUESTION---
TITLE: Filtering Rows with WHERE
TAGS: sql, clauses
MODE: text
CASE_SENSITIVE: no
DESCRIPTION:
<p><strong>SELECT *<br>FROM Student<br>WHERE age &gt; 18;</strong></p>
<p>From the above code snippet, the clause used to filter students whose age is greater than 18 is __________.</p>
ANSWER: WHERE | | | no | no
---END---
---QUESTION---
TITLE: VPN Function
TAGS: networks, security
MODE: text
CASE_SENSITIVE: no
DESCRIPTION:
<p>A __________ creates a secure, encrypted connection over a public network, allowing users to access a private network remotely as if directly connected. (Enter the abbreviation only, e.g., DNS — not the full form)</p>
ANSWER: VPN | Virtual Private Network |  | no | no
---END---`;

const SAMPLE_CODE = `---QUESTION---
TITLE: Abstract Class Usage
TAGS: java, oop, abstract-class
MODE: code
CASE_SENSITIVE: no
DESCRIPTION:
<p>Fill in the blanks to define and use an abstract class.</p>
<p>Output:</p>
<p>Abstract class called</p>
CODE:
abstract class Vehicle {
    abstract void move();
}

class Car extends ________ {
    void ________() {
        System.out.println("Abstract class called");
    }
}

public class Main {
    public static void main(String[] args) {
        Vehicle v = new Car();
        v.move();
    }
}
SOLUTION:
abstract class Vehicle {
    abstract void move();
}

class Car extends Vehicle{
    void move() {
        System.out.println("Abstract class called");
    }
}

public class Main {
    public static void main(String[] args) {
        Vehicle v = new Car();
        v.move();
    }
}

ANSWER: Vehicle | | 50 | yes | no
ANSWER: move | | 50 | yes | no
---END---`;

// ─── FORMAT GUIDE CARD (text / code tabs) ─────────────────────────────────────
function FormatGuideCard() {
  const [tab, setTab] = useState("text"); // 'text' | 'code'
  const [copied, setCopied] = useState(false);
  const active = tab === "code" ? SAMPLE_CODE : SAMPLE_TEXT;

  const handleCopy = () => {
    navigator.clipboard.writeText(active).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div style={{ background:"#f8f9fc", border:"1.5px solid #e4e7f0", borderRadius:16, padding:"18px 20px", marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ width:28, height:28, background:"linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>✏️</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Fill-in-the-Blank Format Guide</div>
          <div style={{ fontSize:11, color:"#9ca3af", fontWeight:500, marginTop:1 }}>One <code style={{ background:"#f3f4f6", padding:"1px 5px", borderRadius:4, fontSize:10 }}>ANSWER:</code> line per blank, in order</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {[{ k:"text", label:"📝 Text Editor" }, { k:"code", label:"💻 Code Editor" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            border: `1.5px solid ${tab===t.k ? "#6366f1" : "#e4e7f0"}`,
            background: tab===t.k ? "rgba(99,102,241,0.08)" : "white",
            color: tab===t.k ? "#6366f1" : "#6b7280",
            borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 8, fontSize: 11, color: "#4338ca", fontWeight: 500 }}>
        💡 <code>DIFFICULTY</code> and <code>BLOOMS</code> are optional — they inherit the defaults set in Batch Configuration unless a question overrides them.
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {[
          { icon:"🔤", title:"Blank markers", desc:'Write blanks as "________" directly in DESCRIPTION (and CODE for code mode)' },
          { icon:"🧩", title:"ANSWER line", desc:"primary | other answers | weight | do-not-split | partial-credit" },
          { icon:"⚖️", title:"Auto split weight", desc:"Leave weight blank on every ANSWER to auto-split evenly to 100" },
          { icon:"💻", title:"Code mode only", desc:"CODE + optional SOLUTION blocks are used only when MODE: code" },
        ].map((item,i) => (
          <div key={i} style={{ background:"white", border:"1px solid #e4e7f0", borderRadius:10, padding:"10px 12px", display:"flex", gap:8, alignItems:"flex-start" }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:"#111827" }}>{item.title}</div>
              <div style={{ fontSize:10.5, color:"#6b7280", marginTop:2 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ position:"relative" }}>
        <pre style={{
          background:"#0f172a", color:"#e2e8f0", borderRadius:10, padding:"14px 16px",
          fontSize:11, lineHeight:1.6, overflowX:"auto", margin:0, maxHeight:360, overflowY:"auto",
          fontFamily:"'Fira Code', 'Cascadia Code', monospace",
        }}><code>{active}</code></pre>
        <button onClick={handleCopy} style={{
          position:"absolute", top:10, right:10,
          background: copied ? "#10b981" : "rgba(255,255,255,0.1)",
          border:"1px solid rgba(255,255,255,0.2)", borderRadius:7, padding:"5px 12px",
          color:"white", fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s",
        }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
      </div>
    </div>
  );
}

// ─── INLINE ERROR / WARNING PANEL ─────────────────────────────────────────────
function ParseErrorsPanel({ errors, warnings, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { setDismissed(false); }, [errors, warnings]);
  if (dismissed) return null;
  if (!errors.length && !warnings.length) return null;

  return (
    <div style={{ marginTop:12 }}>
      {errors.length > 0 && (
        <div style={{ border:"1.5px solid #fca5a5", borderRadius:12, overflow:"hidden", background:"#fff8f8", marginBottom: warnings.length ? 10 : 0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#fef2f2", borderBottom:"1px solid #fecaca" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#991b1b" }}>❌ {errors.length} parse error{errors.length>1?"s":""} found</span>
            <button onClick={() => { setDismissed(true); onDismiss?.(); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#9ca3af", lineHeight:1 }}>×</button>
          </div>
          <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:6 }}>
            {errors.map((err,i) => (
              <div key={i} style={{ display:"flex", gap:8, padding:"8px 10px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, fontSize:12 }}>
                <span style={{ color:"#dc2626", fontWeight:800 }}>✗</span>
                <span style={{ color:"#7f1d1d", fontFamily:"monospace", lineHeight:1.5 }}>{err}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div style={{ border:"1.5px solid #fde68a", borderRadius:12, overflow:"hidden", background:"#fffbeb" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#fefce8", borderBottom:"1px solid #fde68a" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#92400e" }}>⚠️ {warnings.length} warning{warnings.length>1?"s":""}</span>
            {!errors.length && <button onClick={() => { setDismissed(true); onDismiss?.(); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#9ca3af", lineHeight:1 }}>×</button>}
          </div>
          <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:6 }}>
            {warnings.map((w,i) => (
              <div key={i} style={{ display:"flex", gap:8, padding:"8px 10px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, fontSize:12 }}>
                <span style={{ color:"#d97706", fontWeight:800 }}>⚠</span>
                <span style={{ color:"#78350f", fontFamily:"monospace", lineHeight:1.5 }}>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function BlankSyncPlatform({ platform, onBack }) {
  // Auth
  const [token, setToken]           = useState(() => { try { return localStorage.getItem(platform.tokenKey) || ""; } catch { return ""; } });
  const [ui, setUI]                 = useState(() => localStorage.getItem(platform.tokenKey) ? "qb-select" : "welcome");
  const [tokenInput, setTokenInput] = useState("");

  // Batch Config (no PCM — not used by fillup questions)
  const [batchConfig, setBatchConfig]         = useState({ subject_id:"", topic_id:"", sub_topic_id:"", blooms:"Comprehension", manual_difficulty:"Medium" });
  const [bcLoading, setBcLoading]             = useState(false);
  const [allSubjects, setAllSubjects]         = useState([]);
  const [allTopics, setAllTopics]             = useState([]);
  const [allSubTopics, setAllSubTopics]       = useState([]);
  const [subTopicSearch, setSubTopicSearch]   = useState("");
  const [subTopicFocused, setSubTopicFocused] = useState(false);
  const [selSubject, setSelSubject]           = useState(null);
  const [selTopic, setSelTopic]               = useState(null);
  const [selSubTopic, setSelSubTopic]         = useState(null);
  const [bloomsSearch, setBloomsSearch]       = useState("");
  const [bloomsFocused, setBloomsFocused]     = useState(false);

  // QB Step
  const [qbMode, setQbMode]                   = useState("create");
  const [qbName, setQbName]                   = useState("");
  const [qbCode, setQbCode]                   = useState("");
  const [qbDescription, setQbDescription]     = useState("");
  const [selectedDepts, setSelectedDepts]     = useState([]);
  const [deptSearch, setDeptSearch]           = useState("");
  const [qbSearchTerm, setQbSearchTerm]       = useState("");
  const [qbSearchResults, setQbSearchResults] = useState([]);
  const [activeQB, setActiveQB]               = useState(null);

  // Upload
  const [pasteInput, setPasteInput]           = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parseErrors, setParseErrors]         = useState([]);
  const [parseWarnings, setParseWarnings]     = useState([]);
  const [previewIndex, setPreviewIndex]       = useState(0);
  const [showPreview, setShowPreview]         = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [uploadProgress, setUploadProgress]   = useState({ current: 0, total: 0 });
  const [uploadResults, setUploadResults]     = useState(null);

  // UI helpers
  const [alert, setAlert]             = useState(null);
  const [overlay, setOverlay]         = useState(false);
  const [overlayText, setOverlayText] = useState("");

  const BATCH_SIZE = 3;
  const sleep      = ms => new Promise(r => setTimeout(r, ms));

  const showAlert   = (msg, type = "warning") => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 7000); };
  const showOverlay = msg => { setOverlayText(msg); setOverlay(true); };
  const hideOverlay = () => setOverlay(false);
  const getHeaders  = () => ({ "Content-Type": "application/json", Authorization: token });
  const filteredDepts = (platform.bdIdOptions || []).filter(d => d.label.toLowerCase().includes(deptSearch.toLowerCase()));

  const PlatformBadge = () => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:`${platform.color}12`, border:`1px solid ${platform.color}30`, borderRadius:12, padding:"3px 12px", fontSize:12, fontWeight:700, color:platform.color, marginBottom:6 }}>
      {platform.icon} {platform.label}
    </span>
  );

  useEffect(() => { if (token && allSubjects.length === 0) loadBcData(token); }, [token]);

  const loadBcData = async tok => {
    if (allSubjects.length > 0) return;
    setBcLoading(true);
    const h = { "Content-Type": "application/json", Authorization: tok };
    try {
      const subRes  = await fetch(`${API}/api/questiondomain/getallsubjects`, { headers: h });
      const subData = await subRes.json();
      if (subData?.statusCode === 200) {
        setAllSubjects(subData.data.subject || []);
        setAllTopics(subData.data.topic || []);
        setAllSubTopics((subData.data.sub_topic || []).map(st => ({ ...st, name: st.name || st.sub_topic_name || st.subtopic_name || st.label || "(unnamed)" })));
      }
    } catch (err) { showAlert("Failed to load config data: " + err.message, "danger"); }
    finally { setBcLoading(false); }
  };

  const saveToken = () => {
    if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
    const tok = tokenInput.trim();
    try {
      localStorage.setItem(platform.tokenKey, tok);
      setToken(tok); setTokenInput(""); setUI("qb-select");
      showAlert("Token saved! Loading config data...", "success");
      loadBcData(tok);
    } catch (err) { showAlert("Failed: " + err.message, "danger"); }
  };

  const clearToken = () => {
    try { localStorage.removeItem(platform.tokenKey); } catch {}
    setToken(""); setUI("welcome"); resetAll();
    showAlert("Logged out", "danger");
  };

  const resetAll = () => {
    setBatchConfig({ subject_id:"", topic_id:"", sub_topic_id:"", blooms:"Comprehension", manual_difficulty:"Medium" });
    setSelSubject(null); setSelTopic(null); setSelSubTopic(null); setSubTopicSearch("");
    setBloomsSearch(""); setBloomsFocused(false);
    resetQBStep(); resetUpload();
  };

  const resetQBStep = () => {
    setQbMode("create"); setQbName(""); setQbCode(""); setQbDescription("");
    setSelectedDepts([]); setDeptSearch(""); setQbSearchTerm(""); setQbSearchResults([]); setActiveQB(null);
  };

  const resetUpload = () => {
    setPasteInput(""); setParsedQuestions([]); setParseErrors([]); setParseWarnings([]);
    setUploadResults(null); setUploadProgress({ current: 0, total: 0 });
    setShowPreview(false); setPreviewIndex(0);
  };

  const createQB = async () => {
    if (!qbName.trim())             { showAlert("QB Name is required", "danger"); return; }
    if (selectedDepts.length === 0) { showAlert("Select at least one department", "danger"); return; }
    showOverlay("🔨 Creating Question Bank...");
    try {
      const res = await fetch(`${API}/api/questionbank/create`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({ qb_name: qbName, qb_code: qbCode || null, qb_description: qbDescription || null, tags: [], b_d_id: selectedDepts, departmentChanged: true, visibility: "Within Department", price: 0, mainDepartmentUser: true }),
      });
      const result = await res.json();
      if (result.statusCode === 200 && result.data.success) {
        const qbData = result.data.data.data;
        setActiveQB({ qb_id: qbData.qb_id, qb_name: qbData.qb_name, createdBy: qbData.createdBy });
        hideOverlay(); showAlert("✅ Question Bank created!", "success"); setUI("batch-config");
      } else throw new Error(result.data?.message || "Failed to create QB");
    } catch (err) { hideOverlay(); showAlert("Error creating QB: " + err.message, "danger"); }
  };

  const searchQBs = async () => {
    if (!qbSearchTerm.trim()) { showAlert("Enter a search term", "warning"); return; }
    showOverlay("🔍 Searching...");
    try {
      const res  = await fetch(`${API}/api/questionbanks/all`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ department_id: platform.departmentIds, limit: 50, mainDepartmentUser: true, page: 1, search: qbSearchTerm }) });
      const data = await res.json();
      const qbs  = data?.questionbanks || [];
      setQbSearchResults(qbs); hideOverlay();
      if (qbs.length === 0) showAlert("No QBs found", "warning");
      else showAlert(`Found ${qbs.length} QB(s)`, "success");
    } catch (err) { hideOverlay(); showAlert("Search error: " + err.message, "danger"); }
  };

  const selectQB = qb => {
    setActiveQB({ qb_id: qb.qb_id, qb_name: qb.qb_name, createdBy: qb.user_id || "system" });
    setQbSearchResults([]);
    showAlert(`QB selected: ${qb.qb_name}`, "success");
    setUI("batch-config");
  };

  const handleParse = () => {
    if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
    const { questions, errors, warnings } = parseFillupQuestions(pasteInput);
    setParseErrors(errors);
    setParseWarnings(warnings);
    setParsedQuestions(questions);

    if (errors.length > 0) return; // shown inline
    if (warnings.length > 0) showAlert(`✅ Parsed ${questions.length} question(s) with ${warnings.length} warning(s).`, "warning");
    else showAlert(`✅ Parsed ${questions.length} question(s)! Ready to upload.`, "success");
  };

  const uploadQuestions = async () => {
    if (parsedQuestions.length === 0) { showAlert("Parse first", "warning"); return; }
    if (!activeQB)                    { showAlert("No QB selected", "danger"); return; }

    setIsLoading(true); showOverlay("🔄 Starting upload...");
    const results = { total: parsedQuestions.length, success: 0, failed: 0, errors: [], ids: [] };

    try {
      const userId = activeQB.createdBy || "system";
      for (let i = 0; i < parsedQuestions.length; i += BATCH_SIZE) {
        const batch  = parsedQuestions.slice(i, i + BATCH_SIZE);
        const bNum   = Math.floor(i / BATCH_SIZE) + 1;
        const bTotal = Math.ceil(parsedQuestions.length / BATCH_SIZE);
        showOverlay(`📦 Batch ${bNum}/${bTotal}...`);
        setUploadProgress({ current: i, total: parsedQuestions.length });

        await Promise.all(batch.map(async (q, idx) => {
          const gi = i + idx;
          try {
            const payload = buildFillupPayload(q, batchConfig, activeQB.qb_id, userId);
            const res     = await fetch(`${API}/api/fillups_question/create`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
            const data    = await res.json();
            if (data.success) { results.success++; results.ids.push({ index: gi + 1, title: q.title, q_id: data.q_id }); }
            else throw new Error(data.message || "Upload failed");
          } catch (err) { results.failed++; results.errors.push({ index: gi + 1, title: q.title, error: err.message }); }
        }));

        if (i + BATCH_SIZE < parsedQuestions.length) await sleep(400);
      }

      setUploadProgress({ current: parsedQuestions.length, total: parsedQuestions.length });
      setUploadResults(results); hideOverlay();
      if (results.failed === 0) showAlert(`🎉 All ${results.success} uploaded!`, "success");
      else showAlert(`⚠️ ${results.success} uploaded, ${results.failed} failed`, "warning");
      setUI("results");
    } catch (err) { hideOverlay(); showAlert("Upload error: " + err.message, "danger"); }
    finally { setIsLoading(false); }
  };

  const startNewUpload = () => { resetUpload(); setUI("upload"); };
  const currentQ       = parsedQuestions[previewIndex];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="cod-uploader-container">

      {overlay && (
        <div className="cod-overlay">
          <div className="cod-overlay-content">
            <div className="cod-spinner"></div>
            <div className="cod-overlay-text">{overlayText}</div>
          </div>
        </div>
      )}

      {alert && (
        <div className={`cod-alert cod-alert-${alert.type}`}>
          <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>{alert.msg}</pre>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && currentQ && (
        <div className="cod-preview-modal" onClick={() => setShowPreview(false)}>
          <div className="cod-preview-modal-content" onClick={e => e.stopPropagation()}>
            <div className="cod-preview-modal-header">
              <h3>Preview — Q{previewIndex + 1} of {parsedQuestions.length}</h3>
              <button className="cod-preview-close" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="cod-preview-modal-body">
              <div className="cod-preview-meta">
                <span className="cod-preview-difficulty">{currentQ.difficulty || batchConfig.manual_difficulty}</span>
                <span className="cod-preview-lang">{currentQ.mode === "code" ? "💻 Code Editor" : "📝 Text Editor"}</span>
                <span className="cod-preview-lang">🧠 {currentQ.blooms || batchConfig.blooms}</span>
                <span className="cod-preview-lang">🧩 {currentQ.answers.length} blank(s)</span>
                {currentQ.caseSensitive && <span className="cod-preview-lang">🔠 case-sensitive</span>}
                {currentQ.tags.filter(t => t).map(t => <span key={t} className="cod-preview-tag">🏷️ {t}</span>)}
              </div>
              <div className="cod-preview-section"><h4>Title</h4><p className="cod-preview-title-text">{currentQ.title}</p></div>
              <div className="cod-preview-section">
                <h4>Question (rendered)</h4>
                <div className="cod-preview-html" dangerouslySetInnerHTML={{ __html: wrapHtml(currentQ.description) }} />
              </div>
              {currentQ.mode === "code" && currentQ.code && (
                <div className="cod-preview-section">
                  <h4>Code</h4>
                  <pre className="cod-preview-code"><code>{currentQ.code}</code></pre>
                </div>
              )}
              {currentQ.mode === "code" && currentQ.solution && (
                <div className="cod-preview-section">
                  <h4>Solution</h4>
                  <pre className="cod-preview-code"><code>{currentQ.solution}</code></pre>
                </div>
              )}
              <div className="cod-preview-section">
                <h4>Answers ({currentQ.answers.length})</h4>
                <div className="cod-tc-grid">
                  {currentQ.answers.map((a, i) => (
                    <div key={i} className="cod-tc-row">
                      <span className="cod-tc-badge">Blank {i + 1} · {a.weight}pts</span>
                      <span className="cod-tc-io">Answer: <code>{a.primary}</code></span>
                      {a.otherAnswers.length > 0 && <span className="cod-tc-io">Also accepts: <code>{a.otherAnswers.join(", ")}</code></span>}
                      {a.doNotSplit && <span className="cod-tc-io">🔒 exact match required</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="cod-preview-modal-footer">
              <button onClick={() => setPreviewIndex(p => Math.max(0, p - 1))} disabled={previewIndex === 0} className="cod-button cod-button-secondary cod-button-small">← Prev</button>
              <span className="cod-preview-counter">{previewIndex + 1} / {parsedQuestions.length}</span>
              <button onClick={() => setPreviewIndex(p => Math.min(parsedQuestions.length - 1, p + 1))} disabled={previewIndex === parsedQuestions.length - 1} className="cod-button cod-button-secondary cod-button-small">Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ WELCOME ══ */}
      {ui === "welcome" && (
        <div className="cod-welcome">
          <div style={{ marginBottom: 16 }}><PlatformBadge /></div>
          <div className="cod-welcome-icon">✏️</div>
          <h2 className="cod-welcome-title">BlankSync</h2>
          <p className="cod-welcome-subtitle">Bulk upload fill-in-the-blank questions to question banks</p>
          <textarea value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Paste your Authorization token here..." className="cod-token-input" />
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={saveToken} className="cod-button cod-button-primary">Save Token & Continue</button>
            <button onClick={onBack}    className="cod-button cod-button-secondary">🏠 Home</button>
          </div>
          <p className="cod-token-hint">💡 Token saved separately for this tool</p>
        </div>
      )}

      {/* ══ QB SELECT ══ */}
      {ui === "qb-select" && (
        <div className="cod-card">
          <div className="cod-header">
            <div><PlatformBadge /><h3 className="cod-title">📚 Question Bank</h3><p className="cod-subtitle">Create a new QB or select an existing one</p></div>
            <div className="cod-header-actions">
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">🏠 Home</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, padding: 4, background: "#f1f3f5", borderRadius: 12 }}>
            {[{ key: "create", label: "➕ Create New QB" }, { key: "search", label: "🔍 Search Existing QB" }].map(m => (
              <button key={m.key} onClick={() => { setQbMode(m.key); setQbSearchResults([]); }} style={{ flex: 1, padding: "12px 20px", background: qbMode === m.key ? "white" : "transparent", border: "none", borderRadius: 10, color: qbMode === m.key ? platform.color : "#868e96", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: qbMode === m.key ? "0 2px 10px rgba(0,0,0,0.10)" : "none", transition: "all 0.2s" }}>{m.label}</button>
            ))}
          </div>

          {qbMode === "create" && (
            <div>
              <div className="cod-form-group"><label className="cod-label">Question Bank Name <span className="cod-required">*</span></label><input type="text" value={qbName} onChange={e => setQbName(e.target.value)} placeholder="Enter QB name..." className="cod-input" /></div>
              <div className="cod-form-group"><label className="cod-label">QB Code <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#9ca3af" }}>(optional)</span></label><input type="text" value={qbCode} onChange={e => setQbCode(e.target.value)} placeholder="Enter QB code..." className="cod-input" /></div>
              <div className="cod-form-group"><label className="cod-label">Description <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#9ca3af" }}>(optional)</span></label><textarea value={qbDescription} onChange={e => setQbDescription(e.target.value)} placeholder="Enter description..." className="cod-input" rows={2} style={{ resize: "vertical", minHeight: 60 }} /></div>
              <div className="cod-form-group">
                <label className="cod-label">Department <span className="cod-required">*</span></label>
                <input type="text" value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="🔍 Search department..." className="cod-input cod-search-input" />
                <div className="cod-bc-list" style={{ marginTop: 8 }}>
                  {filteredDepts.slice(0, 10).map((dept, idx) => {
                    const isSel = selectedDepts.some(d => d.value === dept.value);
                    return (
                      <div key={idx} className={`cod-bc-item ${isSel ? "selected" : ""}`} style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={() => setSelectedDepts(prev => isSel ? prev.filter(d => d.value !== dept.value) : [...prev, dept])}>
                        <input type="checkbox" checked={isSel} onChange={() => {}} style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span>{dept.label}</span>
                      </div>
                    );
                  })}
                  {filteredDepts.length === 0 && <div className="cod-bc-empty">No departments found</div>}
                  {filteredDepts.length > 10  && <div style={{ padding: "8px 12px", fontSize: 12, color: "#9ca3af" }}>+{filteredDepts.length - 10} more — keep typing to filter</div>}
                </div>
                {selectedDepts.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {selectedDepts.map(dept => (
                      <div key={dept.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${platform.color}12`, border: `1px solid ${platform.color}30`, borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: platform.color }}>
                        <span>{dept.label}</span>
                        <button onClick={() => setSelectedDepts(prev => prev.filter(d => d.value !== dept.value))} style={{ background: "none", border: "none", cursor: "pointer", color: platform.color, fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={createQB} disabled={!qbName.trim() || selectedDepts.length === 0} className={`cod-button cod-button-success ${(!qbName.trim() || selectedDepts.length === 0) ? "cod-button-disabled" : ""}`}>🔨 Create Question Bank & Continue</button>
            </div>
          )}

          {qbMode === "search" && (
            <div>
              {activeQB && (
                <div className="cod-selected-qb-banner">
                  <span className="cod-selected-qb-icon">✅</span>
                  <div style={{ flex: 1 }}><div className="cod-selected-qb-name">{activeQB.qb_name}</div><div className="cod-selected-qb-id">{activeQB.qb_id}</div></div>
                  <button onClick={() => setUI("batch-config")} className="cod-button cod-button-success cod-button-small">Continue →</button>
                </div>
              )}
              <div className="cod-search-row">
                <input type="text" value={qbSearchTerm} onChange={e => setQbSearchTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && searchQBs()} placeholder="Search question bank by name..." className="cod-input" />
                <button onClick={searchQBs} disabled={!qbSearchTerm.trim()} className={`cod-button cod-button-primary cod-button-small ${!qbSearchTerm.trim() ? "cod-button-disabled" : ""}`}>🔍 Search</button>
              </div>
              {qbSearchResults.length > 0 && (
                <div className="cod-qb-results">
                  <div className="cod-results-title">{qbSearchResults.length} result(s)</div>
                  <div className="cod-qb-list">
                    {qbSearchResults.map((qb, i) => (
                      <div key={i} className="cod-qb-item">
                        <div className="cod-qb-info"><div className="cod-qb-name">{qb.qb_name}</div><div className="cod-qb-meta"><span>{qb.questionCount || 0} questions</span><span>•</span><span className="cod-qb-id-pill">{qb.qb_id.slice(0, 8)}…</span></div></div>
                        <button onClick={() => selectQB(qb)} className="cod-button cod-button-success cod-button-small">✓ Select</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ BATCH CONFIG ══ */}
      {ui === "batch-config" && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <PlatformBadge />
              <h3 className="cod-title">⚙️ Configuration</h3>
              <p className="cod-subtitle">Select Subject → Topic → Sub Topic, then set defaults</p>
            </div>
            <div className="cod-header-actions">
              {bcLoading && <span className="cod-bc-loading">⏳ Loading...</span>}
              <button onClick={() => setUI("qb-select")} className="cod-button cod-button-secondary cod-button-small">← QB</button>
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">🏠 Home</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          {activeQB && (
            <p className="cod-subtitle" style={{ marginTop: -8, marginBottom: 16 }}>
              📚 <strong>{activeQB.qb_name}</strong><span className="cod-qb-id-inline"> · {activeQB.qb_id.slice(0, 8)}…</span>
            </p>
          )}

          {bcLoading && <div className="cod-bc-autoload"><div className="cod-bc-autoload-spinner"></div><span>Loading subjects...</span></div>}

          {allSubjects.length > 0 && (
            <>
              <div className="cod-bc-data-info">
                <span>📋 {allSubjects.length} subjects</span><span>·</span>
                <span>🗂 {allTopics.length} topics</span><span>·</span>
                <span>📌 {allSubTopics.length} sub topics</span>
                <button onClick={() => { setBatchConfig(p => ({ ...p, subject_id: "", topic_id: "", sub_topic_id: "" })); setSelSubject(null); setSelTopic(null); setSelSubTopic(null); setSubTopicSearch(""); }} className="cod-button cod-button-secondary cod-button-small">↺ Reset</button>
              </div>

              <div className="cod-bc-sections">
                <div className="cod-bc-panel">
                  <div className="cod-bc-panel-title">🔍 Search Sub Topic / Topic / Subject <span className="cod-required">*</span></div>
                  <input type="text" value={subTopicSearch} onChange={e => setSubTopicSearch(e.target.value)} placeholder="Search by sub topic, topic, or subject name..." className="cod-input cod-search-input" autoFocus onFocus={() => setSubTopicFocused(true)} onBlur={() => setTimeout(() => setSubTopicFocused(false), 300)} />
                  {(subTopicSearch.trim().length > 0 || subTopicFocused) && allSubTopics.length > 0 && (
                    <div className="cod-bc-list cod-bc-subtopic-list">
                      {(() => {
                        const term     = subTopicSearch.toLowerCase().trim();
                        const enriched = allSubTopics.map(st => {
                          const stId    = st.sub_topic_id || st.id;
                          const topic   = allTopics.find(t => t.topic_id === (st.topic_id || st.topicId));
                          const subject = allSubjects.find(s => s.subject_id === (topic?.subject_id || topic?.subjectId));
                          return { st, stId, topic, subject };
                        });
                        const filtered = (term
                          ? enriched.filter(({ st, topic, subject }) =>
                              st.name.toLowerCase().includes(term) ||
                              topic?.name.toLowerCase().includes(term) ||
                              subject?.name.toLowerCase().includes(term))
                          : enriched).slice(0, 50);
                        if (filtered.length === 0) return <div className="cod-bc-empty" style={{ border: "none" }}>No results for "{subTopicSearch}"</div>;
                        return filtered.map(({ st, stId, topic, subject }) => (
                          <div key={stId} className={`cod-bc-item cod-bc-subtopic-item ${selSubTopic?.sub_topic_id === stId ? "selected" : ""}`}
                            onMouseDown={e => {
                              e.preventDefault();
                              setSelSubTopic({ ...st, sub_topic_id: stId });
                              setSelTopic(topic || null);
                              setSelSubject(subject || null);
                              setSubTopicSearch(st.name);
                              setSubTopicFocused(false);
                              setBatchConfig(p => ({ ...p, sub_topic_id: stId, topic_id: topic?.topic_id || p.topic_id, subject_id: subject?.subject_id || p.subject_id }));
                            }}>
                            <span className="cod-st-name">{st.name}</span>
                            <span className="cod-st-breadcrumb">
                              {topic   && <span className="cod-st-topic">{topic.name}</span>}
                              {subject && <span className="cod-st-subject">{subject.name}</span>}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  {selSubTopic && (
                    <div className="cod-bc-resolved">
                      {[
                        { label: "Sub Topic", val: selSubTopic.name, id: selSubTopic.sub_topic_id },
                        { label: "Topic",     val: selTopic?.name,   id: selTopic?.topic_id },
                        { label: "Subject",   val: selSubject?.name, id: selSubject?.subject_id },
                      ].map(row => (
                        <div key={row.label} className="cod-bc-resolved-row">
                          <span className="cod-bc-resolved-label">{row.label}</span>
                          <span className="cod-bc-resolved-val">{row.val || <em style={{ color: "#f59e0b" }}>not found</em>}</span>
                          <code className="cod-bc-resolved-id">{(row.id || "").slice(0, 8)}{row.id ? "…" : ""}</code>
                        </div>
                      ))}
                      <button onClick={() => { setSelSubTopic(null); setSelTopic(null); setSelSubject(null); setSubTopicSearch(""); setBatchConfig(p => ({ ...p, sub_topic_id: "", topic_id: "", subject_id: "" })); }} className="cod-bc-clear-sel">✕ Clear</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloom's default — searchable dropdown, matches the platform's own Bloom's picker */}
              <div className="cod-bc-panel">
                <div className="cod-bc-panel-title">🧠 Default Bloom's Taxonomy <span className="cod-required">*</span></div>
                <input
                  type="text"
                  value={bloomsSearch}
                  onChange={e => setBloomsSearch(e.target.value)}
                  placeholder="Search Bloom's level..."
                  className="cod-input cod-search-input"
                  onFocus={() => setBloomsFocused(true)}
                  onBlur={() => setTimeout(() => setBloomsFocused(false), 300)}
                />
                {(bloomsSearch.trim().length > 0 || bloomsFocused) && (
                  <div className="cod-bc-list cod-bc-subtopic-list">
                    {(() => {
                      const term     = bloomsSearch.toLowerCase().trim();
                      const filtered = BLOOMS_UI.filter(b => b.label.toLowerCase().includes(term));
                      if (filtered.length === 0) return <div className="cod-bc-empty" style={{ border: "none" }}>No results for "{bloomsSearch}"</div>;
                      return filtered.map(b => (
                        <div
                          key={b.value}
                          className={`cod-bc-item ${batchConfig.blooms === b.value ? "selected" : ""}`}
                          onMouseDown={e => {
                            e.preventDefault();
                            setBatchConfig(p => ({ ...p, blooms: b.value }));
                            setBloomsSearch("");
                            setBloomsFocused(false);
                          }}
                        >
                          <span className="cod-st-name">{b.label}</span>
                          <span className="cod-st-breadcrumb"><span className="cod-st-subject">{b.value}</span></span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                <div className="cod-bc-resolved">
                  <div className="cod-bc-resolved-row">
                    <span className="cod-bc-resolved-label">Selected</span>
                    <span className="cod-bc-resolved-val">{BLOOMS_UI.find(b => b.value === batchConfig.blooms)?.label || "—"}</span>
                    <code className="cod-bc-resolved-id">{batchConfig.blooms}</code>
                  </div>
                </div>
                <p className="cod-diff-note">Used when a question doesn't specify its own BLOOMS line.</p>
              </div>
            </>
          )}

          {/* Difficulty default */}
          <div className="cod-difficulty-selector">
            <label className="cod-label">Default Difficulty <span className="cod-required">*</span></label>
            <div className="cod-diff-buttons">
              {DIFFICULTIES.map(d => (
                <button key={d} type="button" onClick={() => setBatchConfig(p => ({ ...p, manual_difficulty: d }))} className={`cod-diff-btn cod-diff-btn-${d.toLowerCase()} ${batchConfig.manual_difficulty === d ? "active" : ""}`}>{d}</button>
              ))}
            </div>
            <p className="cod-diff-note">Used when a question doesn't specify its own DIFFICULTY line.</p>
          </div>

          <button
            onClick={() => {
              if (!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id) { showAlert("Select Subject, Topic and Sub Topic", "danger"); return; }
              setUI("upload");
            }}
            disabled={!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id}
            className={`cod-button cod-button-primary ${(!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id) ? "cod-button-disabled" : ""}`}
          >
            Next → Paste & Upload
          </button>
        </div>
      )}

      {/* ══ UPLOAD ══ */}
      {ui === "upload" && activeQB && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <PlatformBadge />
              <h3 className="cod-title">✏️ BlankSync — Paste & Upload</h3>
              <p className="cod-subtitle">📚 <strong>{activeQB.qb_name}</strong><span className="cod-qb-id-inline"> · {activeQB.qb_id.slice(0, 8)}…</span></p>
            </div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("batch-config")} className="cod-button cod-button-secondary cod-button-small">← Config</button>
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">🏠 Home</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          <FormatGuideCard />

          <div className="cod-paste-area">
            <div className="cod-paste-header">
              <label className="cod-label">
                Paste structured format here
                {pasteInput && <span className="cod-label-count">&nbsp;·&nbsp;{(pasteInput.match(/---QUESTION---/gi) || []).length} block(s) detected</span>}
              </label>
              {pasteInput && (
                <button onClick={() => { setPasteInput(""); setParsedQuestions([]); setParseErrors([]); setParseWarnings([]); }} className="cod-button cod-button-secondary cod-button-small">🗑 Clear</button>
              )}
            </div>
            <textarea
              value={pasteInput}
              onChange={e => setPasteInput(e.target.value)}
              placeholder={"Paste the ---QUESTION--- ... ---END--- block(s) here.\nMultiple questions supported."}
              className="cod-paste-textarea"
              spellCheck={false}
            />
          </div>

          <button onClick={handleParse} disabled={!pasteInput.trim()} className={`cod-button cod-button-primary ${!pasteInput.trim() ? "cod-button-disabled" : ""}`}>
            🔍 Parse
          </button>

          <ParseErrorsPanel
            errors={parseErrors}
            warnings={parseWarnings}
            onDismiss={() => { setParseErrors([]); setParseWarnings([]); }}
          />

          {parsedQuestions.length > 0 && (
            <div className="cod-parsed-section">
              <div className="cod-parsed-header">
                <h4 className="cod-parsed-title">✅ {parsedQuestions.length} question(s) ready</h4>
                <button onClick={() => { setPreviewIndex(0); setShowPreview(true); }} className="cod-button cod-button-info cod-button-small">👁 Preview All</button>
              </div>

              <div className="cod-parsed-list">
                {parsedQuestions.map((q, i) => {
                  const effDiff = q.difficulty || batchConfig.manual_difficulty;
                  return (
                  <div key={i} className="cod-parsed-item">
                    <span className="cod-parsed-num">Q{i + 1}</span>
                    <span className="cod-parsed-qtitle">{q.title}</span>
                    <span className="cod-lang-pill">{q.mode === "code" ? "💻 code" : "📝 text"}</span>
                    <span className={`cod-diff-pill cod-diff-${effDiff.toLowerCase()}`}>{effDiff}</span>
                    <span className="cod-lang-pill">🧠 {q.blooms || batchConfig.blooms}</span>
                    <span className="cod-parsed-tc">{q.answers.length} blank(s)</span>
                  </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  onClick={uploadQuestions}
                  disabled={isLoading}
                  className={`cod-button cod-button-success ${isLoading ? "cod-button-disabled" : ""}`}
                >
                  {isLoading
                    ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}…`
                    : `🚀 Upload ${parsedQuestions.length} Question(s) → "${activeQB.qb_name}"`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ RESULTS ══ */}
      {ui === "results" && uploadResults && (
        <div className="cod-card">
          <div className="cod-result-section">
            <div className="cod-result-icon">{uploadResults.failed === 0 ? "🎉" : "⚠️"}</div>
            <h3 className="cod-result-title">Upload Complete</h3>
            <div className="cod-result-stats">
              <div className="cod-stat-card cod-stat-info"><div className="cod-stat-icon">📊</div><div className="cod-stat-content"><div className="cod-stat-value">{uploadResults.total}</div><div className="cod-stat-label">Total</div></div></div>
              <div className="cod-stat-card cod-stat-success"><div className="cod-stat-icon">✅</div><div className="cod-stat-content"><div className="cod-stat-value">{uploadResults.success}</div><div className="cod-stat-label">Uploaded</div></div></div>
              {uploadResults.failed > 0 && <div className="cod-stat-card cod-stat-error"><div className="cod-stat-icon">❌</div><div className="cod-stat-content"><div className="cod-stat-value">{uploadResults.failed}</div><div className="cod-stat-label">Failed</div></div></div>}
            </div>
            {uploadResults.ids.length > 0 && (
              <div className="cod-ids-section">
                <h4 className="cod-ids-title">✅ Created Question IDs</h4>
                <div className="cod-ids-list">
                  {uploadResults.ids.map((item, i) => (
                    <div key={i} className="cod-id-item">
                      <span className="cod-id-num">Q{item.index}</span>
                      <span className="cod-id-title">{item.title}</span>
                      <code className="cod-id-value">{item.q_id}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {uploadResults.errors.length > 0 && (
              <div className="cod-errors-section">
                <h4 className="cod-errors-title">⚠️ Failed Questions</h4>
                <div className="cod-errors-list">
                  {uploadResults.errors.map((err, i) => (
                    <div key={i} className="cod-error-item">
                      <span className="cod-error-index">Q{err.index}</span>
                      <div className="cod-error-details">
                        <div className="cod-error-question">{err.title}</div>
                        <div className="cod-error-message">{err.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="cod-result-actions">
              <button onClick={startNewUpload}                               className="cod-button cod-button-primary">✏️ Upload More</button>
              <button onClick={() => { resetUpload(); setUI("qb-select"); }} className="cod-button cod-button-secondary">📚 Change QB</button>
              <button onClick={() => { resetAll(); setUI("qb-select"); }}    className="cod-button cod-button-secondary">⚙️ New Batch</button>
              <button onClick={onBack}                                       className="cod-button cod-button-secondary">🏠 Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}