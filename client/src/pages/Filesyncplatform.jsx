// import { useState, useEffect } from "react";
// import "./CODSync.css"; // reuse the cod-* shell classes (same folder: src/pages)
// import apiConfig from "../apiConfig";

// const API = "https://api.examly.io";

// // Point this at your own AI server (the one running server.js with the LLM queue).
// // Falls back to localhost for dev. Set VITE_SERVER_URL in your .env for prod.

// const BLOOMS_LEVELS = ["Knowledge", "Comprehension", "Application", "Analysis", "Synthesis", "Evaluation"];
// const DIFFICULTIES  = ["Easy", "Medium", "Hard"];

// // ─── HTML HELPERS ─────────────────────────────────────────────────────────────
// const esc    = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// const inline  = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

// // Convert plain text (with blank-line paragraphs, "- " bullets, **bold**) into clean HTML.
// // If the input already looks like HTML, it is passed through untouched.
// function textToHtml(text) {
//   if (!text) return "";
//   const t = text.trim();
//   if (/^<(p|ul|ol|div|h[1-6]|strong|table)\b/i.test(t)) return t;

//   const lines = t.split("\n");
//   const out = [];
//   let listBuf = [];
//   let paraBuf = [];

//   const flushList = () => {
//     if (listBuf.length) {
//       out.push("<ul>" + listBuf.map(li => `<li>${inline(li)}</li>`).join("") + "</ul>");
//       listBuf = [];
//     }
//   };
//   const flushPara = () => {
//     if (paraBuf.length) {
//       out.push(`<p>${paraBuf.map(inline).join("<br>")}</p>`);
//       paraBuf = [];
//     }
//   };

//   for (const raw of lines) {
//     const line   = raw.replace(/\s+$/, "");
//     const bullet = line.match(/^\s*[-*•]\s+(.*)/);
//     if (bullet) { flushPara(); listBuf.push(bullet[1]); continue; }
//     if (line.trim() === "") { flushPara(); flushList(); continue; }
//     flushList();
//     paraBuf.push(line);
//   }
//   flushPara(); flushList();
//   return out.join("");
// }

// const parseBool = v => /^(yes|true|1|mandatory|required)$/i.test((v || "").trim());

// // ─── PARSER ───────────────────────────────────────────────────────────────────
// function parseFileQuestions(raw) {
//   const errors = [], warnings = [], questions = [];

//   const blocks = raw
//     .split(/---QUESTION---/i)
//     .map(b => b.split(/---END---/i)[0])
//     .filter(b => b.trim().length > 0);

//   if (blocks.length === 0) {
//     errors.push("No ---QUESTION--- blocks found. Check the format.");
//     return { questions, errors, warnings };
//   }

//   const HEADER_RE = /^(TITLE|DIFFICULTY|BLOOMS|TAGS|FILE_SIZE|FILE_TYPES|FILE_MANDATORY|DESCRIPTION)\s*:/i;

//   blocks.forEach((block, bi) => {
//     const qNum = bi + 1;
//     const qErr = [];
//     const lines = block.split("\n");
//     const seg = {};
//     let key = null, buf = [];

//     const flush = () => { if (key !== null) seg[key] = buf.join("\n").trim(); };

//     lines.forEach(line => {
//       const m = line.match(/^([A-Z_]+)\s*:\s*(.*)/i);
//       if (m && HEADER_RE.test(line)) {
//         flush();
//         key = m[1].toUpperCase();
//         buf = m[2].trim() ? [m[2].trim()] : [];
//         return;
//       }
//       if (key !== null) buf.push(line);
//     });
//     flush();

//     const get = k => seg[k.toUpperCase()] || null;

//     const title       = get("TITLE");
//     const difficulty  = get("DIFFICULTY") || "Medium";
//     const blooms      = get("BLOOMS") || null;
//     const tags        = get("TAGS") ? get("TAGS").split(",").map(t => t.trim()).filter(Boolean) : [];
//     const fileSize    = parseInt(get("FILE_SIZE")) || 50;
//     const fileTypes   = (get("FILE_TYPES") || ".pdf")
//       .split(",")
//       .map(t => { t = t.trim(); return t ? (t.startsWith(".") ? t.toLowerCase() : "." + t.toLowerCase()) : ""; })
//       .filter(Boolean);
//     const fileMandatory = get("FILE_MANDATORY") ? parseBool(get("FILE_MANDATORY")) : true;
//     const description   = get("DESCRIPTION");

//     if (!title)       qErr.push(`Q${qNum}: Missing TITLE`);
//     if (!DIFFICULTIES.includes(difficulty))
//       qErr.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard (got "${difficulty}")`);
//     if (!description) qErr.push(`Q${qNum}: Missing DESCRIPTION`);

//     if (blooms && !BLOOMS_LEVELS.includes(blooms))
//       warnings.push(`Q${qNum}: BLOOMS "${blooms}" is not a standard Bloom's level`);
//     if (!get("FILE_SIZE")) warnings.push(`Q${qNum}: FILE_SIZE missing — defaulting to 50 MB`);
//     if (!get("FILE_TYPES")) warnings.push(`Q${qNum}: FILE_TYPES missing — defaulting to .pdf`);

//     if (qErr.length > 0) { errors.push(...qErr); return; }

//     questions.push({ title, difficulty, blooms, tags, fileSize, fileTypes, fileMandatory, description });
//   });

//   return { questions, errors, warnings };
// }

// // ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────
// function buildFilePayload(q, batchConfig, qbId, userId) {
//   return {
//     question_type:        "file_upload_questions",
//     question_data:        textToHtml(q.description),
//     question_editor_type: 1,
//     subject_id:           batchConfig.subject_id || null,
//     topic_id:             batchConfig.topic_id || null,
//     sub_topic_id:         batchConfig.sub_topic_id || null,
//     blooms_taxonomy:      q.blooms || batchConfig.blooms || null,
//     course_outcome:       null,
//     program_outcome:      null,
//     file_count_and_size: [
//       {
//         fileSize:             q.fileSize,        // number (MB)
//         type:                 q.fileTypes,       // [".pdf", ...]
//         q_filecountMandatory: q.fileMandatory,   // bool
//       },
//     ],
//     hint:            [],
//     manual_difficulty: q.difficulty || batchConfig.manual_difficulty,
//     linked_concepts: "",
//     tags:            q.tags.length ? q.tags : [""],
//     question_media:  [],
//     qb_id:           qbId,
//     createdBy:       userId,
//   };
// }

// // ─── SAMPLE FORMAT (for the copy button) ──────────────────────────────────────
// const SAMPLE_FORMAT = `---QUESTION---
// TITLE: Mobile Forensics Essay
// DIFFICULTY: Medium
// BLOOMS: Comprehension
// TAGS: forensics, mobile
// FILE_SIZE: 50
// FILE_TYPES: .pdf
// FILE_MANDATORY: Yes
// DESCRIPTION:
// Problem Statement:

// Mobile devices have become one of the most significant sources of digital evidence in modern forensic investigations. Write a structured essay that explores the scope of mobile forensics and the types of evidence that can be recovered.

// Your essay must cover the following:

// - Call logs — what they contain and their investigative value
// - SMS and MMS messages — storage locations and recovery potential
// - Contacts — on-device vs SIM-stored contacts
// - Application data — social media, messaging apps, location history
// - EXIF metadata — what it is, where it is stored, what it reveals

// **Note: Upload the file in PDF format, and ensure that it does not exceed 50 MB in size.**
// ---END---`;

// // ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// export default function FileSyncPlatform({ platform, onBack }) {
//   // Auth
//   const [token, setToken]           = useState(() => { try { return localStorage.getItem(platform.tokenKey) || ""; } catch { return ""; } });
//   const [ui, setUI]                 = useState(() => localStorage.getItem(platform.tokenKey) ? "batch-config" : "welcome");
//   const [tokenInput, setTokenInput] = useState("");

//   // Batch Config (no PCM for file-upload questions)
//   const [batchConfig, setBatchConfig]         = useState({ subject_id: "", topic_id: "", sub_topic_id: "", blooms: "Comprehension", manual_difficulty: "Medium" });
//   const [bcLoading, setBcLoading]             = useState(false);
//   const [allSubjects, setAllSubjects]         = useState([]);
//   const [allTopics, setAllTopics]             = useState([]);
//   const [allSubTopics, setAllSubTopics]       = useState([]);
//   const [subTopicSearch, setSubTopicSearch]   = useState("");
//   const [subTopicFocused, setSubTopicFocused] = useState(false);
//   const [selSubject, setSelSubject]           = useState(null);
//   const [selTopic, setSelTopic]               = useState(null);
//   const [selSubTopic, setSelSubTopic]         = useState(null);

//   // QB Step
//   const [qbMode, setQbMode]                   = useState("create");
//   const [qbName, setQbName]                   = useState("");
//   const [qbCode, setQbCode]                   = useState("");
//   const [qbDescription, setQbDescription]     = useState("");
//   const [selectedDepts, setSelectedDepts]     = useState([]);
//   const [deptSearch, setDeptSearch]           = useState("");
//   const [qbSearchTerm, setQbSearchTerm]       = useState("");
//   const [qbSearchResults, setQbSearchResults] = useState([]);
//   const [activeQB, setActiveQB]               = useState(null);

//   // Input (format vs AI)
//   const [inputMode, setInputMode]             = useState("format"); // "format" | "ai"
//   const [rawInput, setRawInput]               = useState("");
//   const [aiLoading, setAiLoading]             = useState(false);

//   const [pasteInput, setPasteInput]           = useState("");
//   const [parsedQuestions, setParsedQuestions] = useState([]);
//   const [parseErrors, setParseErrors]         = useState([]);
//   const [parseWarnings, setParseWarnings]     = useState([]);
//   const [previewIndex, setPreviewIndex]       = useState(0);
//   const [showPreview, setShowPreview]         = useState(false);

//   const [isLoading, setIsLoading]             = useState(false);
//   const [uploadProgress, setUploadProgress]   = useState({ current: 0, total: 0 });
//   const [uploadResults, setUploadResults]     = useState(null);

//   // UI helpers
//   const [alert, setAlert]             = useState(null);
//   const [overlay, setOverlay]         = useState(false);
//   const [overlayText, setOverlayText] = useState("");

//   const BATCH_SIZE = 3;
//   const sleep      = ms => new Promise(r => setTimeout(r, ms));

//   const showAlert   = (msg, type = "warning") => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 7000); };
//   const showOverlay = msg => { setOverlayText(msg); setOverlay(true); };
//   const hideOverlay = () => setOverlay(false);
//   const getHeaders  = () => ({ "Content-Type": "application/json", Authorization: token });
//   const filteredDepts = (platform.bdIdOptions || []).filter(d => d.label.toLowerCase().includes(deptSearch.toLowerCase()));

//   const PlatformBadge = () => (
//     <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${platform.color}12`, border: `1px solid ${platform.color}30`, borderRadius: 12, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: platform.color, marginBottom: 6 }}>
//       {platform.icon} {platform.label}
//     </span>
//   );

//   useEffect(() => { if (token && allSubjects.length === 0) loadBcData(token); }, [token]);

//   const loadBcData = async tok => {
//     if (allSubjects.length > 0) return;
//     setBcLoading(true);
//     const h = { "Content-Type": "application/json", Authorization: tok };
//     try {
//       const subRes  = await fetch(`${API}/api/questiondomain/getallsubjects`, { headers: h });
//       const subData = await subRes.json();
//       if (subData?.statusCode === 200) {
//         setAllSubjects(subData.data.subject || []);
//         setAllTopics(subData.data.topic || []);
//         setAllSubTopics((subData.data.sub_topic || []).map(st => ({ ...st, name: st.name || st.sub_topic_name || st.subtopic_name || st.label || "(unnamed)" })));
//       }
//     } catch (err) { showAlert("Failed to load config data: " + err.message, "danger"); }
//     finally { setBcLoading(false); }
//   };

//   const saveToken = () => {
//     if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
//     const tok = tokenInput.trim();
//     try {
//       localStorage.setItem(platform.tokenKey, tok);
//       setToken(tok); setTokenInput(""); setUI("batch-config");
//       showAlert("Token saved! Loading config data...", "success");
//       loadBcData(tok);
//     } catch (err) { showAlert("Failed: " + err.message, "danger"); }
//   };

//   const clearToken = () => {
//     try { localStorage.removeItem(platform.tokenKey); } catch {}
//     setToken(""); setUI("welcome"); resetAll();
//     showAlert("Logged out", "danger");
//   };

//   const resetAll = () => {
//     setBatchConfig({ subject_id: "", topic_id: "", sub_topic_id: "", blooms: "Comprehension", manual_difficulty: "Medium" });
//     setSelSubject(null); setSelTopic(null); setSelSubTopic(null); setSubTopicSearch("");
//     resetQBStep(); resetUpload();
//   };

//   const resetQBStep = () => {
//     setQbMode("create"); setQbName(""); setQbCode(""); setQbDescription("");
//     setSelectedDepts([]); setDeptSearch(""); setQbSearchTerm(""); setQbSearchResults([]); setActiveQB(null);
//   };

//   const resetUpload = () => {
//     setInputMode("format"); setRawInput("");
//     setPasteInput(""); setParsedQuestions([]); setParseErrors([]); setParseWarnings([]);
//     setUploadResults(null); setUploadProgress({ current: 0, total: 0 });
//     setShowPreview(false); setPreviewIndex(0);
//   };

//   const createQB = async () => {
//     if (!qbName.trim())             { showAlert("QB Name is required", "danger"); return; }
//     if (selectedDepts.length === 0) { showAlert("Select at least one department", "danger"); return; }
//     showOverlay("🔨 Creating Question Bank...");
//     try {
//       const res = await fetch(`${API}/api/questionbank/create`, {
//         method: "POST", headers: getHeaders(),
//         body: JSON.stringify({ qb_name: qbName, qb_code: qbCode || null, qb_description: qbDescription || null, tags: [], b_d_id: selectedDepts, departmentChanged: true, visibility: "Within Department", price: 0, mainDepartmentUser: true }),
//       });
//       const result = await res.json();
//       if (result.statusCode === 200 && result.data.success) {
//         const qbData = result.data.data.data;
//         setActiveQB({ qb_id: qbData.qb_id, qb_name: qbData.qb_name, createdBy: qbData.createdBy });
//         hideOverlay(); showAlert("✅ Question Bank created!", "success"); setUI("upload");
//       } else throw new Error(result.data?.message || "Failed to create QB");
//     } catch (err) { hideOverlay(); showAlert("Error creating QB: " + err.message, "danger"); }
//   };

//   const searchQBs = async () => {
//     if (!qbSearchTerm.trim()) { showAlert("Enter a search term", "warning"); return; }
//     showOverlay("🔍 Searching...");
//     try {
//       const res  = await fetch(`${API}/api/questionbanks/all`, { method: "POST", headers: getHeaders(), body: JSON.stringify({ department_id: platform.departmentIds, limit: 50, mainDepartmentUser: true, page: 1, search: qbSearchTerm }) });
//       const data = await res.json();
//       const qbs  = data?.questionbanks || [];
//       setQbSearchResults(qbs); hideOverlay();
//       if (qbs.length === 0) showAlert("No QBs found", "warning");
//       else showAlert(`Found ${qbs.length} QB(s)`, "success");
//     } catch (err) { hideOverlay(); showAlert("Search error: " + err.message, "danger"); }
//   };

//   const selectQB = qb => {
//     setActiveQB({ qb_id: qb.qb_id, qb_name: qb.qb_name, createdBy: qb.user_id || "system" });
//     setQbSearchResults([]);
//     showAlert(`QB selected: ${qb.qb_name}`, "success");
//     setUI("upload");
//   };

//   // ── AI Reformat: raw content → structured ---QUESTION--- format ──
//   const reformatWithAI = async () => {
//     if (!rawInput.trim()) { showAlert("Paste some raw content first", "warning"); return; }
//     setAiLoading(true); showOverlay("✨ Reformatting with AI...");
//     try {
//       const res = await fetch(apiConfig.FILE_REFORMAT, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ raw: rawInput, defaultDifficulty: batchConfig.manual_difficulty, defaultBlooms: batchConfig.blooms }),
//       });
//       const data = await res.json();
//       if (data.success && data.formatted) {
//         setPasteInput(data.formatted);
//         hideOverlay();
//         showAlert("✅ Reformatted — review the format below, then Parse.", "success");
//       } else throw new Error(data.error || "Reformat failed");
//     } catch (err) { hideOverlay(); showAlert("AI reformat error: " + err.message, "danger"); }
//     finally { setAiLoading(false); }
//   };

//   const handleParse = () => {
//     if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
//     const { questions, errors, warnings } = parseFileQuestions(pasteInput);
//     setParseErrors(errors);
//     setParseWarnings(warnings);
//     setParsedQuestions(questions);

//     if (errors.length > 0) return; // shown inline
//     if (warnings.length > 0) showAlert(`✅ Parsed ${questions.length} question(s) with ${warnings.length} warning(s).`, "warning");
//     else showAlert(`✅ Parsed ${questions.length} question(s)! Ready to upload.`, "success");
//   };

//   const uploadQuestions = async () => {
//     if (parsedQuestions.length === 0) { showAlert("Parse first", "warning"); return; }
//     if (!activeQB)                    { showAlert("No QB selected", "danger"); return; }

//     setIsLoading(true); showOverlay("🔄 Starting upload...");
//     const results = { total: parsedQuestions.length, success: 0, failed: 0, errors: [], ids: [] };

//     try {
//       const userId = activeQB.createdBy || "system";
//       for (let i = 0; i < parsedQuestions.length; i += BATCH_SIZE) {
//         const batch  = parsedQuestions.slice(i, i + BATCH_SIZE);
//         const bNum   = Math.floor(i / BATCH_SIZE) + 1;
//         const bTotal = Math.ceil(parsedQuestions.length / BATCH_SIZE);
//         showOverlay(`📦 Batch ${bNum}/${bTotal}...`);
//         setUploadProgress({ current: i, total: parsedQuestions.length });

//         await Promise.all(batch.map(async (q, idx) => {
//           const gi = i + idx;
//           try {
//             const payload = buildFilePayload(q, batchConfig, activeQB.qb_id, userId);
//             const res     = await fetch(`${API}/api/file_upload_questions/create`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
//             const data    = await res.json();
//             if (data.success) { results.success++; results.ids.push({ index: gi + 1, title: q.title, q_id: data.q_id }); }
//             else throw new Error(data.message || "Upload failed");
//           } catch (err) { results.failed++; results.errors.push({ index: gi + 1, title: q.title, error: err.message }); }
//         }));

//         if (i + BATCH_SIZE < parsedQuestions.length) await sleep(400);
//       }

//       setUploadProgress({ current: parsedQuestions.length, total: parsedQuestions.length });
//       setUploadResults(results); hideOverlay();
//       if (results.failed === 0) showAlert(`🎉 All ${results.success} uploaded!`, "success");
//       else showAlert(`⚠️ ${results.success} uploaded, ${results.failed} failed`, "warning");
//       setUI("results");
//     } catch (err) { hideOverlay(); showAlert("Upload error: " + err.message, "danger"); }
//     finally { setIsLoading(false); }
//   };

//   const startNewUpload = () => { resetUpload(); setUI("upload"); };
//   const currentQ       = parsedQuestions[previewIndex];

//   const copySample = () => {
//     navigator.clipboard.writeText(SAMPLE_FORMAT).then(
//       () => showAlert("📋 Sample format copied to clipboard", "success"),
//       () => showAlert("Copy failed — select the sample manually", "danger")
//     );
//   };

//   // ─── RENDER ───────────────────────────────────────────────────────────────
//   return (
//     <div className="cod-uploader-container">

//       {overlay && (
//         <div className="cod-overlay">
//           <div className="cod-overlay-content">
//             <div className="cod-spinner"></div>
//             <div className="cod-overlay-text">{overlayText}</div>
//           </div>
//         </div>
//       )}

//       {alert && (
//         <div className={`cod-alert cod-alert-${alert.type}`}>
//           <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>{alert.msg}</pre>
//         </div>
//       )}

//       {/* Preview Modal */}
//       {showPreview && currentQ && (
//         <div className="cod-preview-modal" onClick={() => setShowPreview(false)}>
//           <div className="cod-preview-modal-content" onClick={e => e.stopPropagation()}>
//             <div className="cod-preview-modal-header">
//               <h3>Preview — Q{previewIndex + 1} of {parsedQuestions.length}</h3>
//               <button className="cod-preview-close" onClick={() => setShowPreview(false)}>×</button>
//             </div>
//             <div className="cod-preview-modal-body">
//               <div className="cod-preview-meta">
//                 <span className="cod-preview-difficulty">{currentQ.difficulty}</span>
//                 {currentQ.blooms && <span className="cod-preview-lang">🧠 {currentQ.blooms}</span>}
//                 <span className="cod-preview-lang">📎 {currentQ.fileTypes.join(", ")} · ≤{currentQ.fileSize}MB · {currentQ.fileMandatory ? "mandatory" : "optional"}</span>
//                 {currentQ.tags.filter(t => t).map(t => <span key={t} className="cod-preview-tag">🏷️ {t}</span>)}
//               </div>
//               <div className="cod-preview-section"><h4>Title</h4><p className="cod-preview-title-text">{currentQ.title}</p></div>
//               <div className="cod-preview-section">
//                 <h4>Question Data (rendered)</h4>
//                 <div className="cod-preview-html" dangerouslySetInnerHTML={{ __html: textToHtml(currentQ.description) }} />
//               </div>
//             </div>
//             <div className="cod-preview-modal-footer">
//               <button onClick={() => setPreviewIndex(p => Math.max(0, p - 1))} disabled={previewIndex === 0} className="cod-button cod-button-secondary cod-button-small">← Prev</button>
//               <span className="cod-preview-counter">{previewIndex + 1} / {parsedQuestions.length}</span>
//               <button onClick={() => setPreviewIndex(p => Math.min(parsedQuestions.length - 1, p + 1))} disabled={previewIndex === parsedQuestions.length - 1} className="cod-button cod-button-secondary cod-button-small">Next →</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ══ WELCOME ══ */}
//       {ui === "welcome" && (
//         <div className="cod-welcome">
//           <div style={{ marginBottom: 16 }}><PlatformBadge /></div>
//           <div className="cod-welcome-icon">📎</div>
//           <h2 className="cod-welcome-title">FileSync</h2>
//           <p className="cod-welcome-subtitle">Bulk upload file-upload questions to University question banks</p>
//           <textarea value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Paste your Authorization token here..." className="cod-token-input" />
//           <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
//             <button onClick={saveToken} className="cod-button cod-button-primary">Save Token & Continue</button>
//             <button onClick={onBack}    className="cod-button cod-button-secondary">🏠 Home</button>
//           </div>
//           <p className="cod-token-hint">💡 Token saved separately for this tool</p>
//         </div>
//       )}

//       {/* ══ BATCH CONFIG ══ */}
//       {ui === "batch-config" && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div>
//               <PlatformBadge />
//               <h3 className="cod-title">⚙️ Configuration</h3>
//               <p className="cod-subtitle">Select Subject → Topic → Sub Topic, then set defaults</p>
//             </div>
//             <div className="cod-header-actions">
//               {bcLoading && <span className="cod-bc-loading">⏳ Loading...</span>}
//               <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">🏠 Home</button>
//               <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>

//           {bcLoading && <div className="cod-bc-autoload"><div className="cod-bc-autoload-spinner"></div><span>Loading subjects...</span></div>}

//           {allSubjects.length > 0 && (
//             <>
//               <div className="cod-bc-data-info">
//                 <span>📋 {allSubjects.length} subjects</span><span>·</span>
//                 <span>🗂 {allTopics.length} topics</span><span>·</span>
//                 <span>📌 {allSubTopics.length} sub topics</span>
//                 <button onClick={() => { setBatchConfig(p => ({ ...p, subject_id: "", topic_id: "", sub_topic_id: "" })); setSelSubject(null); setSelTopic(null); setSelSubTopic(null); setSubTopicSearch(""); }} className="cod-button cod-button-secondary cod-button-small">↺ Reset</button>
//               </div>

//               <div className="cod-bc-sections">
//                 <div className="cod-bc-panel">
//                   <div className="cod-bc-panel-title">🔍 Search Sub Topic / Topic / Subject <span className="cod-required">*</span></div>
//                   <input type="text" value={subTopicSearch} onChange={e => setSubTopicSearch(e.target.value)} placeholder="Search by sub topic, topic, or subject name..." className="cod-input cod-search-input" autoFocus onFocus={() => setSubTopicFocused(true)} onBlur={() => setTimeout(() => setSubTopicFocused(false), 300)} />
//                   {(subTopicSearch.trim().length > 0 || subTopicFocused) && allSubTopics.length > 0 && (
//                     <div className="cod-bc-list cod-bc-subtopic-list">
//                       {(() => {
//                         const term     = subTopicSearch.toLowerCase().trim();
//                         const enriched = allSubTopics.map(st => {
//                           const stId    = st.sub_topic_id || st.id;
//                           const topic   = allTopics.find(t => t.topic_id === (st.topic_id || st.topicId));
//                           const subject = allSubjects.find(s => s.subject_id === (topic?.subject_id || topic?.subjectId));
//                           return { st, stId, topic, subject };
//                         });
//                         const filtered = (term
//                           ? enriched.filter(({ st, topic, subject }) =>
//                               st.name.toLowerCase().includes(term) ||
//                               topic?.name.toLowerCase().includes(term) ||
//                               subject?.name.toLowerCase().includes(term))
//                           : enriched).slice(0, 50);
//                         if (filtered.length === 0) return <div className="cod-bc-empty" style={{ border: "none" }}>No results for "{subTopicSearch}"</div>;
//                         return filtered.map(({ st, stId, topic, subject }) => (
//                           <div key={stId} className={`cod-bc-item cod-bc-subtopic-item ${selSubTopic?.sub_topic_id === stId ? "selected" : ""}`}
//                             onMouseDown={e => {
//                               e.preventDefault();
//                               setSelSubTopic({ ...st, sub_topic_id: stId });
//                               setSelTopic(topic || null);
//                               setSelSubject(subject || null);
//                               setSubTopicSearch(st.name);
//                               setSubTopicFocused(false);
//                               setBatchConfig(p => ({ ...p, sub_topic_id: stId, topic_id: topic?.topic_id || p.topic_id, subject_id: subject?.subject_id || p.subject_id }));
//                             }}>
//                             <span className="cod-st-name">{st.name}</span>
//                             <span className="cod-st-breadcrumb">
//                               {topic   && <span className="cod-st-topic">{topic.name}</span>}
//                               {subject && <span className="cod-st-subject">{subject.name}</span>}
//                             </span>
//                           </div>
//                         ));
//                       })()}
//                     </div>
//                   )}
//                   {selSubTopic && (
//                     <div className="cod-bc-resolved">
//                       {[
//                         { label: "Sub Topic", val: selSubTopic.name, id: selSubTopic.sub_topic_id },
//                         { label: "Topic",     val: selTopic?.name,   id: selTopic?.topic_id },
//                         { label: "Subject",   val: selSubject?.name, id: selSubject?.subject_id },
//                       ].map(row => (
//                         <div key={row.label} className="cod-bc-resolved-row">
//                           <span className="cod-bc-resolved-label">{row.label}</span>
//                           <span className="cod-bc-resolved-val">{row.val || <em style={{ color: "#f59e0b" }}>not found</em>}</span>
//                           <code className="cod-bc-resolved-id">{(row.id || "").slice(0, 8)}{row.id ? "…" : ""}</code>
//                         </div>
//                       ))}
//                       <button onClick={() => { setSelSubTopic(null); setSelTopic(null); setSelSubject(null); setSubTopicSearch(""); setBatchConfig(p => ({ ...p, sub_topic_id: "", topic_id: "", subject_id: "" })); }} className="cod-bc-clear-sel">✕ Clear</button>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Bloom's default */}
//               <div className="cod-difficulty-selector">
//                 <label className="cod-label">Default Bloom's Taxonomy <span className="cod-required">*</span></label>
//                 <div className="cod-diff-buttons" style={{ flexWrap: "wrap" }}>
//                   {BLOOMS_LEVELS.map(b => (
//                     <button key={b} type="button" onClick={() => setBatchConfig(p => ({ ...p, blooms: b }))} className={`cod-diff-btn ${batchConfig.blooms === b ? "active" : ""}`}>{b}</button>
//                   ))}
//                 </div>
//                 <p className="cod-diff-note">Used when a question doesn't specify its own BLOOMS line.</p>
//               </div>
//             </>
//           )}

//           {/* Difficulty default */}
//           <div className="cod-difficulty-selector">
//             <label className="cod-label">Default Difficulty <span className="cod-required">*</span></label>
//             <div className="cod-diff-buttons">
//               {DIFFICULTIES.map(d => (
//                 <button key={d} type="button" onClick={() => setBatchConfig(p => ({ ...p, manual_difficulty: d }))} className={`cod-diff-btn cod-diff-btn-${d.toLowerCase()} ${batchConfig.manual_difficulty === d ? "active" : ""}`}>{d}</button>
//               ))}
//             </div>
//             <p className="cod-diff-note">Used when a question doesn't specify its own DIFFICULTY line.</p>
//           </div>

//           <button
//             onClick={() => {
//               if (!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id) { showAlert("Select Subject, Topic and Sub Topic", "danger"); return; }
//               setUI("qb-select");
//             }}
//             disabled={!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id}
//             className={`cod-button cod-button-primary ${(!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id) ? "cod-button-disabled" : ""}`}
//           >
//             Next → Select Question Bank
//           </button>
//         </div>
//       )}

//       {/* ══ QB SELECT ══ */}
//       {ui === "qb-select" && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div><PlatformBadge /><h3 className="cod-title">📚 Question Bank</h3><p className="cod-subtitle">Create a new QB or select an existing one</p></div>
//             <div className="cod-header-actions">
//               <button onClick={() => setUI("batch-config")} className="cod-button cod-button-secondary cod-button-small">← Back</button>
//               <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">🏠 Home</button>
//               <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>
//           <div style={{ display: "flex", gap: 8, marginBottom: 24, padding: 4, background: "#f1f3f5", borderRadius: 12 }}>
//             {[{ key: "create", label: "➕ Create New QB" }, { key: "search", label: "🔍 Search Existing QB" }].map(m => (
//               <button key={m.key} onClick={() => { setQbMode(m.key); setQbSearchResults([]); }} style={{ flex: 1, padding: "12px 20px", background: qbMode === m.key ? "white" : "transparent", border: "none", borderRadius: 10, color: qbMode === m.key ? platform.color : "#868e96", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: qbMode === m.key ? "0 2px 10px rgba(0,0,0,0.10)" : "none", transition: "all 0.2s" }}>{m.label}</button>
//             ))}
//           </div>

//           {qbMode === "create" && (
//             <div>
//               <div className="cod-form-group"><label className="cod-label">Question Bank Name <span className="cod-required">*</span></label><input type="text" value={qbName} onChange={e => setQbName(e.target.value)} placeholder="Enter QB name..." className="cod-input" /></div>
//               <div className="cod-form-group"><label className="cod-label">QB Code <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#9ca3af" }}>(optional)</span></label><input type="text" value={qbCode} onChange={e => setQbCode(e.target.value)} placeholder="Enter QB code..." className="cod-input" /></div>
//               <div className="cod-form-group"><label className="cod-label">Description <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#9ca3af" }}>(optional)</span></label><textarea value={qbDescription} onChange={e => setQbDescription(e.target.value)} placeholder="Enter description..." className="cod-input" rows={2} style={{ resize: "vertical", minHeight: 60 }} /></div>
//               <div className="cod-form-group">
//                 <label className="cod-label">Department <span className="cod-required">*</span></label>
//                 <input type="text" value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="🔍 Search department..." className="cod-input cod-search-input" />
//                 <div className="cod-bc-list" style={{ marginTop: 8 }}>
//                   {filteredDepts.slice(0, 10).map((dept, idx) => {
//                     const isSel = selectedDepts.some(d => d.value === dept.value);
//                     return (
//                       <div key={idx} className={`cod-bc-item ${isSel ? "selected" : ""}`} style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={() => setSelectedDepts(prev => isSel ? prev.filter(d => d.value !== dept.value) : [...prev, dept])}>
//                         <input type="checkbox" checked={isSel} onChange={() => {}} style={{ width: 15, height: 15, flexShrink: 0 }} />
//                         <span>{dept.label}</span>
//                       </div>
//                     );
//                   })}
//                   {filteredDepts.length === 0 && <div className="cod-bc-empty">No departments found</div>}
//                   {filteredDepts.length > 10  && <div style={{ padding: "8px 12px", fontSize: 12, color: "#9ca3af" }}>+{filteredDepts.length - 10} more — keep typing to filter</div>}
//                 </div>
//                 {selectedDepts.length > 0 && (
//                   <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
//                     {selectedDepts.map(dept => (
//                       <div key={dept.value} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${platform.color}12`, border: `1px solid ${platform.color}30`, borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: platform.color }}>
//                         <span>{dept.label}</span>
//                         <button onClick={() => setSelectedDepts(prev => prev.filter(d => d.value !== dept.value))} style={{ background: "none", border: "none", cursor: "pointer", color: platform.color, fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//               <button onClick={createQB} disabled={!qbName.trim() || selectedDepts.length === 0} className={`cod-button cod-button-success ${(!qbName.trim() || selectedDepts.length === 0) ? "cod-button-disabled" : ""}`}>🔨 Create Question Bank & Continue</button>
//             </div>
//           )}

//           {qbMode === "search" && (
//             <div>
//               {activeQB && (
//                 <div className="cod-selected-qb-banner">
//                   <span className="cod-selected-qb-icon">✅</span>
//                   <div style={{ flex: 1 }}><div className="cod-selected-qb-name">{activeQB.qb_name}</div><div className="cod-selected-qb-id">{activeQB.qb_id}</div></div>
//                   <button onClick={() => setUI("upload")} className="cod-button cod-button-success cod-button-small">Continue →</button>
//                 </div>
//               )}
//               <div className="cod-search-row">
//                 <input type="text" value={qbSearchTerm} onChange={e => setQbSearchTerm(e.target.value)} onKeyDown={e => e.key === "Enter" && searchQBs()} placeholder="Search question bank by name..." className="cod-input" />
//                 <button onClick={searchQBs} disabled={!qbSearchTerm.trim()} className={`cod-button cod-button-primary cod-button-small ${!qbSearchTerm.trim() ? "cod-button-disabled" : ""}`}>🔍 Search</button>
//               </div>
//               {qbSearchResults.length > 0 && (
//                 <div className="cod-qb-results">
//                   <div className="cod-results-title">{qbSearchResults.length} result(s)</div>
//                   <div className="cod-qb-list">
//                     {qbSearchResults.map((qb, i) => (
//                       <div key={i} className="cod-qb-item">
//                         <div className="cod-qb-info"><div className="cod-qb-name">{qb.qb_name}</div><div className="cod-qb-meta"><span>{qb.questionCount || 0} questions</span><span>•</span><span className="cod-qb-id-pill">{qb.qb_id.slice(0, 8)}…</span></div></div>
//                         <button onClick={() => selectQB(qb)} className="cod-button cod-button-success cod-button-small">✓ Select</button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       )}

//       {/* ══ UPLOAD ══ */}
//       {ui === "upload" && activeQB && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div>
//               <PlatformBadge />
//               <h3 className="cod-title">📎 FileSync — Paste & Upload</h3>
//               <p className="cod-subtitle">📚 <strong>{activeQB.qb_name}</strong><span className="cod-qb-id-inline"> · {activeQB.qb_id.slice(0, 8)}…</span></p>
//             </div>
//             <div className="cod-header-actions">
//               <button onClick={() => setUI("qb-select")} className="cod-button cod-button-secondary cod-button-small">← QB</button>
//               <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">🏠 Home</button>
//               <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>

//           {/* Input-mode pill */}
//           <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: 4, background: "#f1f3f5", borderRadius: 12 }}>
//             {[{ key: "format", label: "📋 Paste Format" }, { key: "ai", label: "✨ AI Reformat" }].map(m => (
//               <button key={m.key} onClick={() => setInputMode(m.key)} style={{ flex: 1, padding: "10px 18px", background: inputMode === m.key ? "white" : "transparent", border: "none", borderRadius: 10, color: inputMode === m.key ? platform.color : "#868e96", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: inputMode === m.key ? "0 2px 10px rgba(0,0,0,0.10)" : "none", transition: "all 0.2s" }}>{m.label}</button>
//             ))}
//           </div>

//           {/* AI mode: raw input + reformat */}
//           {inputMode === "ai" && (
//             <div style={{ background: "#f8f9fc", border: "1.5px solid #e4e7f0", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
//               <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
//                 <span>✨</span> Paste raw / messy content — AI turns it into the structured format below.
//               </div>
//               <textarea
//                 value={rawInput}
//                 onChange={e => setRawInput(e.target.value)}
//                 placeholder={"Paste an unstructured problem statement, brief, or even a rough draft here.\nAI will produce a clean ---QUESTION--- block with proper HTML, bullet lists, and an upload note."}
//                 className="cod-paste-textarea"
//                 spellCheck={false}
//                 style={{ minHeight: 140 }}
//               />
//               <button onClick={reformatWithAI} disabled={aiLoading || !rawInput.trim()} className={`cod-button cod-button-primary ${(aiLoading || !rawInput.trim()) ? "cod-button-disabled" : ""}`} style={{ marginTop: 10 }}>
//                 {aiLoading ? "✨ Reformatting…" : "✨ Reformat with AI"}
//               </button>
//             </div>
//           )}

//           {/* Format helper */}
//           <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(121,80,242,0.06)", border: "1px solid rgba(121,80,242,0.2)", borderRadius: 10, fontSize: 12, color: "#5b3ec7", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
//             <span>💡 Format: <code>TITLE · DIFFICULTY · BLOOMS · TAGS · FILE_SIZE · FILE_TYPES · FILE_MANDATORY · DESCRIPTION</code></span>
//             <button onClick={copySample} className="cod-button cod-button-secondary cod-button-small">📋 Copy sample</button>
//           </div>

//           <div className="cod-paste-area">
//             <div className="cod-paste-header">
//               <label className="cod-label">
//                 {inputMode === "ai" ? "Structured format (AI output — editable)" : "Paste structured format here"}
//                 {pasteInput && <span className="cod-label-count">&nbsp;·&nbsp;{(pasteInput.match(/---QUESTION---/gi) || []).length} block(s) detected</span>}
//               </label>
//               {pasteInput && (
//                 <button onClick={() => { setPasteInput(""); setParsedQuestions([]); setParseErrors([]); setParseWarnings([]); }} className="cod-button cod-button-secondary cod-button-small">🗑 Clear</button>
//               )}
//             </div>
//             <textarea
//               value={pasteInput}
//               onChange={e => setPasteInput(e.target.value)}
//               placeholder={"Paste the ---QUESTION--- ... ---END--- block(s) here.\nMultiple questions supported."}
//               className="cod-paste-textarea"
//               spellCheck={false}
//             />
//           </div>

//           <button onClick={handleParse} disabled={!pasteInput.trim()} className={`cod-button cod-button-primary ${!pasteInput.trim() ? "cod-button-disabled" : ""}`}>
//             🔍 Parse
//           </button>

//           {/* Inline errors */}
//           {parseErrors.length > 0 && (
//             <div style={{ marginTop: 12, border: "1.5px solid #fca5a5", borderRadius: 12, overflow: "hidden", background: "#fff8f8" }}>
//               <div style={{ padding: "10px 14px", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: 13, fontWeight: 700, color: "#991b1b" }}>
//                 ❌ {parseErrors.length} parse error{parseErrors.length > 1 ? "s" : ""} found
//               </div>
//               <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
//                 {parseErrors.map((err, i) => (
//                   <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12 }}>
//                     <span style={{ color: "#dc2626", fontWeight: 800 }}>✗</span>
//                     <span style={{ color: "#7f1d1d", fontFamily: "monospace", lineHeight: 1.5 }}>{err}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//           {parseWarnings.length > 0 && (
//             <div style={{ marginTop: 12, border: "1.5px solid #fde68a", borderRadius: 12, overflow: "hidden", background: "#fffbeb" }}>
//               <div style={{ padding: "10px 14px", background: "#fefce8", borderBottom: "1px solid #fde68a", fontSize: 13, fontWeight: 700, color: "#92400e" }}>
//                 ⚠️ {parseWarnings.length} warning{parseWarnings.length > 1 ? "s" : ""}
//               </div>
//               <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
//                 {parseWarnings.map((w, i) => (
//                   <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12 }}>
//                     <span style={{ color: "#d97706", fontWeight: 800 }}>⚠</span>
//                     <span style={{ color: "#78350f", fontFamily: "monospace", lineHeight: 1.5 }}>{w}</span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Parsed list + upload */}
//           {parsedQuestions.length > 0 && (
//             <div className="cod-parsed-section">
//               <div className="cod-parsed-header">
//                 <h4 className="cod-parsed-title">
//                   ✅ {parsedQuestions.length} question(s) ready
//                   {parseErrors.length > 0 && (
//                     <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "2px 8px", marginLeft: 8 }}>
//                       {parseErrors.length} block(s) had errors — skipped
//                     </span>
//                   )}
//                 </h4>
//                 <button onClick={() => { setPreviewIndex(0); setShowPreview(true); }} className="cod-button cod-button-info cod-button-small">👁 Preview All</button>
//               </div>

//               <div className="cod-parsed-list">
//                 {parsedQuestions.map((q, i) => (
//                   <div key={i} className="cod-parsed-item">
//                     <span className="cod-parsed-num">Q{i + 1}</span>
//                     <span className="cod-parsed-qtitle">{q.title}</span>
//                     <span className={`cod-diff-pill cod-diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
//                     {q.blooms && <span className="cod-lang-pill">🧠 {q.blooms}</span>}
//                     <span className="cod-parsed-tc">{q.fileTypes.join(",")} · ≤{q.fileSize}MB</span>
//                     <span style={{ fontSize: 10, fontWeight: 700, background: q.fileMandatory ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${q.fileMandatory ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`, color: q.fileMandatory ? "#10b981" : "#f59e0b", padding: "2px 8px", borderRadius: 20 }}>
//                       {q.fileMandatory ? "mandatory" : "optional"}
//                     </span>
//                   </div>
//                 ))}
//               </div>

//               <div style={{ marginTop: 16 }}>
//                 <button
//                   onClick={uploadQuestions}
//                   disabled={isLoading}
//                   className={`cod-button cod-button-success ${isLoading ? "cod-button-disabled" : ""}`}
//                 >
//                   {isLoading
//                     ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}…`
//                     : `🚀 Upload ${parsedQuestions.length} Question(s) → "${activeQB.qb_name}"`}
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ══ RESULTS ══ */}
//       {ui === "results" && uploadResults && (
//         <div className="cod-card">
//           <div className="cod-result-section">
//             <div className="cod-result-icon">{uploadResults.failed === 0 ? "🎉" : "⚠️"}</div>
//             <h3 className="cod-result-title">Upload Complete</h3>
//             <div className="cod-result-stats">
//               <div className="cod-stat-card cod-stat-info"><div className="cod-stat-icon">📊</div><div className="cod-stat-content"><div className="cod-stat-value">{uploadResults.total}</div><div className="cod-stat-label">Total</div></div></div>
//               <div className="cod-stat-card cod-stat-success"><div className="cod-stat-icon">✅</div><div className="cod-stat-content"><div className="cod-stat-value">{uploadResults.success}</div><div className="cod-stat-label">Uploaded</div></div></div>
//               {uploadResults.failed > 0 && <div className="cod-stat-card cod-stat-error"><div className="cod-stat-icon">❌</div><div className="cod-stat-content"><div className="cod-stat-value">{uploadResults.failed}</div><div className="cod-stat-label">Failed</div></div></div>}
//             </div>
//             {uploadResults.ids.length > 0 && (
//               <div className="cod-ids-section">
//                 <h4 className="cod-ids-title">✅ Created Question IDs</h4>
//                 <div className="cod-ids-list">
//                   {uploadResults.ids.map((item, i) => (
//                     <div key={i} className="cod-id-item">
//                       <span className="cod-id-num">Q{item.index}</span>
//                       <span className="cod-id-title">{item.title}</span>
//                       <code className="cod-id-value">{item.q_id}</code>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//             {uploadResults.errors.length > 0 && (
//               <div className="cod-errors-section">
//                 <h4 className="cod-errors-title">⚠️ Failed Questions</h4>
//                 <div className="cod-errors-list">
//                   {uploadResults.errors.map((err, i) => (
//                     <div key={i} className="cod-error-item">
//                       <span className="cod-error-index">Q{err.index}</span>
//                       <div className="cod-error-details">
//                         <div className="cod-error-question">{err.title}</div>
//                         <div className="cod-error-message">{err.error}</div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//             <div className="cod-result-actions">
//               <button onClick={startNewUpload}                               className="cod-button cod-button-primary">⚡ Upload More</button>
//               <button onClick={() => { resetUpload(); setUI("qb-select"); }} className="cod-button cod-button-secondary">📚 Change QB</button>
//               <button onClick={() => { resetAll(); setUI("batch-config"); }} className="cod-button cod-button-secondary">⚙️ New Config</button>
//               <button onClick={onBack}                                       className="cod-button cod-button-secondary">🏠 Home</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


import { useState, useEffect } from "react";
import "./CODSync.css"; // reuse the cod-* shell classes (same folder: src/pages)
import apiConfig from "../apiConfig";

const API = "https://api.examly.io";

// Point this at your own AI server (the one running server.js with the LLM queue).
// Falls back to localhost for dev. Set VITE_SERVER_URL in your .env for prod.

const BLOOMS_LEVELS = ["Knowledge", "Comprehension", "Application", "Analysis", "Synthesis", "Evaluation"];
const DIFFICULTIES  = ["Easy", "Medium", "Hard"];

// UI label (as shown in the platform's own Bloom's dropdown) → backend value sent to the API.
// Order matches the platform dropdown: Evaluate at top, Remember at bottom.
const BLOOMS_UI = [
  { label: "Evaluate",   value: "Evaluation" },
  { label: "Create",     value: "Synthesis" },
  { label: "Analyse",    value: "Analysis" },
  { label: "Apply",      value: "Application" },
  { label: "Understand", value: "Comprehension" },
  { label: "Remember",   value: "Knowledge" },
];

// Fixed, manually-selectable list of allowed file extensions (matches the platform's
// "Allowed file formats" dropdown). Chosen once for the whole batch in the File Settings step.
const FILE_TYPE_OPTIONS = [
  ".csv", ".gif", ".jpg", ".jpeg", ".xml", ".xlsx", ".xlsm", ".xls", ".xlt",
  ".mp4", ".ods", ".ots", ".txt", ".pdf", ".ppt", ".pptx", ".html", ".htm",
  ".wmv", ".doc", ".docx", ".zip", ".tar.gz", ".tar", ".java", ".c", ".cpp",
  ".python", ".js", ".sh", ".png",
];

// ─── HTML HELPERS ─────────────────────────────────────────────────────────────
const esc    = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline  = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

// Convert plain text (with blank-line paragraphs, "- " bullets, **bold**) into clean HTML.
// If the input already looks like HTML, it is passed through untouched.
function textToHtml(text) {
  if (!text) return "";
  const t = text.trim();
  if (/^<(p|ul|ol|div|h[1-6]|strong|table)\b/i.test(t)) return t;

  const lines = t.split("\n");
  const out = [];
  let listBuf = [];
  let paraBuf = [];

  const flushList = () => {
    if (listBuf.length) {
      out.push("<ul>" + listBuf.map(li => `<li>${inline(li)}</li>`).join("") + "</ul>");
      listBuf = [];
    }
  };
  const flushPara = () => {
    if (paraBuf.length) {
      out.push(`<p>${paraBuf.map(inline).join("<br>")}</p>`);
      paraBuf = [];
    }
  };

  for (const raw of lines) {
    const line   = raw.replace(/\s+$/, "");
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    if (bullet) { flushPara(); listBuf.push(bullet[1]); continue; }
    if (line.trim() === "") { flushPara(); flushList(); continue; }
    flushList();
    paraBuf.push(line);
  }
  flushPara(); flushList();
  return out.join("");
}

// ─── PARSER ───────────────────────────────────────────────────────────────────
function parseFileQuestions(raw) {
  const errors = [], warnings = [], questions = [];

  const blocks = raw
    .split(/---QUESTION---/i)
    .map(b => b.split(/---END---/i)[0])
    .filter(b => b.trim().length > 0);

  if (blocks.length === 0) {
    errors.push("No ---QUESTION--- blocks found. Check the format.");
    return { questions, errors, warnings };
  }

  const HEADER_RE = /^(TITLE|DIFFICULTY|BLOOMS|TAGS|DESCRIPTION)\s*:/i;

  blocks.forEach((block, bi) => {
    const qNum = bi + 1;
    const qErr = [];
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

    const title       = get("TITLE");
    const difficulty  = get("DIFFICULTY") || "Medium";
    const blooms      = get("BLOOMS") || null;
    const tags        = get("TAGS") ? get("TAGS").split(",").map(t => t.trim()).filter(Boolean) : [];
    const description = get("DESCRIPTION");

    if (!title)       qErr.push(`Q${qNum}: Missing TITLE`);
    if (!DIFFICULTIES.includes(difficulty))
      qErr.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard (got "${difficulty}")`);
    if (!description) qErr.push(`Q${qNum}: Missing DESCRIPTION`);

    if (blooms && !BLOOMS_LEVELS.includes(blooms))
      warnings.push(`Q${qNum}: BLOOMS "${blooms}" is not a standard Bloom's level`);

    if (qErr.length > 0) { errors.push(...qErr); return; }

    questions.push({ title, difficulty, blooms, tags, description });
  });

  return { questions, errors, warnings };
}

// ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────
function buildFilePayload(q, batchConfig, fileSettings, qbId, userId) {
  return {
    question_type:        "file_upload_questions",
    question_data:        textToHtml(q.description),
    question_editor_type: 1,
    subject_id:           batchConfig.subject_id || null,
    topic_id:             batchConfig.topic_id || null,
    sub_topic_id:         batchConfig.sub_topic_id || null,
    blooms_taxonomy:      q.blooms || batchConfig.blooms || null,
    course_outcome:       null,
    program_outcome:      null,
    file_count_and_size: [
      {
        fileSize:             fileSettings.size,       // number (MB) — set once for the whole batch
        type:                 fileSettings.types,      // [".pdf", ...] — set once for the whole batch
        q_filecountMandatory: fileSettings.mandatory,  // bool — set once for the whole batch
      },
    ],
    hint:            [],
    manual_difficulty: q.difficulty || batchConfig.manual_difficulty,
    linked_concepts: "",
    tags:            q.tags.length ? q.tags : [""],
    question_media:  [],
    qb_id:           qbId,
    createdBy:       userId,
  };
}

// ─── SAMPLE FORMAT (for the copy button) ──────────────────────────────────────
const SAMPLE_FORMAT = `---QUESTION---
TITLE: Mobile Forensics Essay
TAGS: forensics, mobile
DESCRIPTION:
Problem Statement:

Mobile devices have become one of the most significant sources of digital evidence in modern forensic investigations. Write a structured essay that explores the scope of mobile forensics and the types of evidence that can be recovered.

Your essay must cover the following:

- Call logs — what they contain and their investigative value
- SMS and MMS messages — storage locations and recovery potential
- Contacts — on-device vs SIM-stored contacts
- Application data — social media, messaging apps, location history
- EXIF metadata — what it is, where it is stored, what it reveals

**Note: Upload the file in PDF format, and ensure that it does not exceed 50 MB in size.**
---END---`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function FileSyncPlatform({ platform, onBack }) {
  // Auth
  const [token, setToken]           = useState(() => { try { return localStorage.getItem(platform.tokenKey) || ""; } catch { return ""; } });
  const [ui, setUI]                 = useState(() => localStorage.getItem(platform.tokenKey) ? "qb-select" : "welcome");
  const [tokenInput, setTokenInput] = useState("");

  // Batch Config (no PCM for file-upload questions)
  const [batchConfig, setBatchConfig]         = useState({ subject_id: "", topic_id: "", sub_topic_id: "", blooms: "Comprehension", manual_difficulty: "Medium" });
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

  // File Settings (chosen once, manually, for the whole batch)
  const [fileSettings, setFileSettings] = useState({ types: [".pdf"], size: 50, mandatory: true });
  const toggleFileType = ext => setFileSettings(p => ({ ...p, types: p.types.includes(ext) ? p.types.filter(t => t !== ext) : [...p.types, ext] }));
  const resetFileSettings = () => setFileSettings({ types: [".pdf"], size: 50, mandatory: true });

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

  // Input (format vs AI)
  const [inputMode, setInputMode]             = useState("format"); // "format" | "ai"
  const [rawInput, setRawInput]               = useState("");
  const [aiLoading, setAiLoading]             = useState(false);

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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${platform.color}12`, border: `1px solid ${platform.color}30`, borderRadius: 12, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: platform.color, marginBottom: 6 }}>
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
    setBatchConfig({ subject_id: "", topic_id: "", sub_topic_id: "", blooms: "Comprehension", manual_difficulty: "Medium" });
    setSelSubject(null); setSelTopic(null); setSelSubTopic(null); setSubTopicSearch("");
    setBloomsSearch(""); setBloomsFocused(false);
    resetFileSettings();
    resetQBStep(); resetUpload();
  };

  const resetQBStep = () => {
    setQbMode("create"); setQbName(""); setQbCode(""); setQbDescription("");
    setSelectedDepts([]); setDeptSearch(""); setQbSearchTerm(""); setQbSearchResults([]); setActiveQB(null);
  };

  const resetUpload = () => {
    setInputMode("format"); setRawInput("");
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

  // ── AI Reformat: raw content → structured ---QUESTION--- format ──
  const reformatWithAI = async () => {
    if (!rawInput.trim()) { showAlert("Paste some raw content first", "warning"); return; }
    setAiLoading(true); showOverlay("✨ Reformatting with AI...");
    try {
      const res = await fetch(apiConfig.FILE_REFORMAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: rawInput, defaultDifficulty: batchConfig.manual_difficulty, defaultBlooms: batchConfig.blooms }),
      });
      const data = await res.json();
      if (data.success && data.formatted) {
        setPasteInput(data.formatted);
        hideOverlay();
        showAlert("✅ Reformatted — review the format below, then Parse.", "success");
      } else throw new Error(data.error || "Reformat failed");
    } catch (err) { hideOverlay(); showAlert("AI reformat error: " + err.message, "danger"); }
    finally { setAiLoading(false); }
  };

  const handleParse = () => {
    if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
    const { questions, errors, warnings } = parseFileQuestions(pasteInput);
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
            const payload = buildFilePayload(q, batchConfig, fileSettings, activeQB.qb_id, userId);
            const res     = await fetch(`${API}/api/file_upload_questions/create`, { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) });
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

  const copySample = () => {
    navigator.clipboard.writeText(SAMPLE_FORMAT).then(
      () => showAlert("📋 Sample format copied to clipboard", "success"),
      () => showAlert("Copy failed — select the sample manually", "danger")
    );
  };

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
                <span className="cod-preview-difficulty">{currentQ.difficulty}</span>
                {currentQ.blooms && <span className="cod-preview-lang">🧠 {currentQ.blooms}</span>}
                <span className="cod-preview-lang">📎 {fileSettings.types.join(", ")} · ≤{fileSettings.size}MB · {fileSettings.mandatory ? "mandatory" : "optional"}</span>
                {currentQ.tags.filter(t => t).map(t => <span key={t} className="cod-preview-tag">🏷️ {t}</span>)}
              </div>
              <div className="cod-preview-section"><h4>Title</h4><p className="cod-preview-title-text">{currentQ.title}</p></div>
              <div className="cod-preview-section">
                <h4>Question Data (rendered)</h4>
                <div className="cod-preview-html" dangerouslySetInnerHTML={{ __html: textToHtml(currentQ.description) }} />
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
          <div className="cod-welcome-icon">📎</div>
          <h2 className="cod-welcome-title">FileSync</h2>
          <p className="cod-welcome-subtitle">Bulk upload file-upload questions to University question banks</p>
          <textarea value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Paste your Authorization token here..." className="cod-token-input" />
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={saveToken} className="cod-button cod-button-primary">Save Token & Continue</button>
            <button onClick={onBack}    className="cod-button cod-button-secondary">🏠 Home</button>
          </div>
          <p className="cod-token-hint">💡 Token saved separately for this tool</p>
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
              <button onClick={() => setUI("qb-select")} className="cod-button cod-button-secondary cod-button-small">← Back</button>
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
                <p className="cod-diff-note">Used when a question doesn't specify its own BLOOMS line. Shown as its Bloom's-wheel label, sent to the API as its backend value.</p>
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
              setUI("file-settings");
            }}
            disabled={!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id}
            className={`cod-button cod-button-primary ${(!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id) ? "cod-button-disabled" : ""}`}
          >
            Next → File Settings
          </button>
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

      {/* ══ FILE SETTINGS ══ */}
      {ui === "file-settings" && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <PlatformBadge />
              <h3 className="cod-title">📎 File Settings</h3>
              <p className="cod-subtitle">Choose allowed file types, max size, and whether upload is mandatory — applies to every question in this batch</p>
            </div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("batch-config")} className="cod-button cod-button-secondary cod-button-small">← Back</button>
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">🏠 Home</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          <div className="cod-form-group">
            <label className="cod-label">Allowed File Types <span className="cod-required">*</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FILE_TYPE_OPTIONS.map(ext => {
                const isSel = fileSettings.types.includes(ext);
                return (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => toggleFileType(ext)}
                    className={`cod-diff-btn ${isSel ? "active" : ""}`}
                    style={{ fontFamily: "monospace", padding: "6px 12px" }}
                  >
                    {ext}
                  </button>
                );
              })}
            </div>
            <p className="cod-diff-note">{fileSettings.types.length} type(s) selected{fileSettings.types.length > 0 ? `: ${fileSettings.types.join(", ")}` : ""}</p>
          </div>

          <div className="cod-form-group">
            <label className="cod-label">Max File Size (MB) <span className="cod-required">*</span></label>
            <input
              type="number"
              min="1"
              value={fileSettings.size}
              onChange={e => setFileSettings(p => ({ ...p, size: e.target.value === "" ? "" : parseInt(e.target.value) || "" }))}
              className="cod-input"
              style={{ maxWidth: 160 }}
            />
          </div>

          <div className="cod-form-group">
            <label className="cod-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textTransform: "none", letterSpacing: 0 }}>
              <input
                type="checkbox"
                checked={fileSettings.mandatory}
                onChange={e => setFileSettings(p => ({ ...p, mandatory: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              File Upload Mandatory
            </label>
          </div>

          <button
            onClick={() => {
              if (fileSettings.types.length === 0) { showAlert("Select at least one file type", "danger"); return; }
              if (!fileSettings.size || fileSettings.size <= 0) { showAlert("Enter a valid max file size", "danger"); return; }
              setUI("upload");
            }}
            disabled={fileSettings.types.length === 0 || !fileSettings.size}
            className={`cod-button cod-button-primary ${(fileSettings.types.length === 0 || !fileSettings.size) ? "cod-button-disabled" : ""}`}
          >
            Next → Paste Questions
          </button>
        </div>
      )}

      {/* ══ UPLOAD ══ */}
      {ui === "upload" && activeQB && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <PlatformBadge />
              <h3 className="cod-title">📎 FileSync — Paste & Upload</h3>
              <p className="cod-subtitle">📚 <strong>{activeQB.qb_name}</strong><span className="cod-qb-id-inline"> · {activeQB.qb_id.slice(0, 8)}…</span></p>
              <p className="cod-subtitle">📎 {fileSettings.types.join(", ")} · ≤{fileSettings.size}MB · {fileSettings.mandatory ? "mandatory" : "optional"}</p>
            </div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("file-settings")} className="cod-button cod-button-secondary cod-button-small">← Files</button>
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">🏠 Home</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          {/* Input-mode pill */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: 4, background: "#f1f3f5", borderRadius: 12 }}>
            {[{ key: "format", label: "📋 Paste Format" }, { key: "ai", label: "✨ AI Reformat" }].map(m => (
              <button key={m.key} onClick={() => setInputMode(m.key)} style={{ flex: 1, padding: "10px 18px", background: inputMode === m.key ? "white" : "transparent", border: "none", borderRadius: 10, color: inputMode === m.key ? platform.color : "#868e96", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: inputMode === m.key ? "0 2px 10px rgba(0,0,0,0.10)" : "none", transition: "all 0.2s" }}>{m.label}</button>
            ))}
          </div>

          {/* AI mode: raw input + reformat */}
          {inputMode === "ai" && (
            <div style={{ background: "#f8f9fc", border: "1.5px solid #e4e7f0", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✨</span> Paste raw / messy content — AI turns it into the structured format below.
              </div>
              <textarea
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                placeholder={"Paste an unstructured problem statement, brief, or even a rough draft here.\nAI will produce a clean ---QUESTION--- block with proper HTML, bullet lists, and an upload note."}
                className="cod-paste-textarea"
                spellCheck={false}
                style={{ minHeight: 140 }}
              />
              <button onClick={reformatWithAI} disabled={aiLoading || !rawInput.trim()} className={`cod-button cod-button-primary ${(aiLoading || !rawInput.trim()) ? "cod-button-disabled" : ""}`} style={{ marginTop: 10 }}>
                {aiLoading ? "✨ Reformatting…" : "✨ Reformat with AI"}
              </button>
            </div>
          )}

          {/* Format helper */}
          <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(121,80,242,0.06)", border: "1px solid rgba(121,80,242,0.2)", borderRadius: 10, fontSize: 12, color: "#5b3ec7", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span>💡 Format: <code>TITLE · DIFFICULTY · BLOOMS · TAGS · DESCRIPTION</code> (file type/size/mandatory are set once above, for the whole batch)</span>
            <button onClick={copySample} className="cod-button cod-button-secondary cod-button-small">📋 Copy sample</button>
          </div>

          <div className="cod-paste-area">
            <div className="cod-paste-header">
              <label className="cod-label">
                {inputMode === "ai" ? "Structured format (AI output — editable)" : "Paste structured format here"}
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

          {/* Inline errors */}
          {parseErrors.length > 0 && (
            <div style={{ marginTop: 12, border: "1.5px solid #fca5a5", borderRadius: 12, overflow: "hidden", background: "#fff8f8" }}>
              <div style={{ padding: "10px 14px", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: 13, fontWeight: 700, color: "#991b1b" }}>
                ❌ {parseErrors.length} parse error{parseErrors.length > 1 ? "s" : ""} found
              </div>
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {parseErrors.map((err, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: "#dc2626", fontWeight: 800 }}>✗</span>
                    <span style={{ color: "#7f1d1d", fontFamily: "monospace", lineHeight: 1.5 }}>{err}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {parseWarnings.length > 0 && (
            <div style={{ marginTop: 12, border: "1.5px solid #fde68a", borderRadius: 12, overflow: "hidden", background: "#fffbeb" }}>
              <div style={{ padding: "10px 14px", background: "#fefce8", borderBottom: "1px solid #fde68a", fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                ⚠️ {parseWarnings.length} warning{parseWarnings.length > 1 ? "s" : ""}
              </div>
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {parseWarnings.map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: "#d97706", fontWeight: 800 }}>⚠</span>
                    <span style={{ color: "#78350f", fontFamily: "monospace", lineHeight: 1.5 }}>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parsed list + upload */}
          {parsedQuestions.length > 0 && (
            <div className="cod-parsed-section">
              <div className="cod-parsed-header">
                <h4 className="cod-parsed-title">
                  ✅ {parsedQuestions.length} question(s) ready
                  {parseErrors.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "2px 8px", marginLeft: 8 }}>
                      {parseErrors.length} block(s) had errors — skipped
                    </span>
                  )}
                </h4>
                <button onClick={() => { setPreviewIndex(0); setShowPreview(true); }} className="cod-button cod-button-info cod-button-small">👁 Preview All</button>
              </div>

              <div className="cod-parsed-list">
                {parsedQuestions.map((q, i) => (
                  <div key={i} className="cod-parsed-item">
                    <span className="cod-parsed-num">Q{i + 1}</span>
                    <span className="cod-parsed-qtitle">{q.title}</span>
                    <span className={`cod-diff-pill cod-diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                    {q.blooms && <span className="cod-lang-pill">🧠 {q.blooms}</span>}
                  </div>
                ))}
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
              <button onClick={startNewUpload}                               className="cod-button cod-button-primary">⚡ Upload More</button>
              <button onClick={() => { resetUpload(); setUI("qb-select"); }} className="cod-button cod-button-secondary">📚 Change QB</button>
              <button onClick={() => { resetAll(); setUI("batch-config"); }} className="cod-button cod-button-secondary">⚙️ New Config</button>
              <button onClick={onBack}                                       className="cod-button cod-button-secondary">🏠 Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}