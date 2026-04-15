
// import { useState, useEffect } from "react";
// import "./CODSync.css";

// const API = "https://api.examly.io";
// import headerFooterTxt      from "../../public/templates/format_code_snippet_header_footer.txt?raw";
// import codeStubTxt          from "../../public/templates/format_code_stub.txt?raw";
// import multiLanguageTxt     from "../../public/templates/format_multi_language.txt?raw";
// import snippetWithStubTxt   from "../../public/templates/format_snippet_with_stub.txt?raw";
// import snippetStubWlBlTxt   from "../../public/templates/format_snippet_stub_whitelist_blacklist.txt?raw";

// // ─── Then update FORMAT_TEMPLATES to use the imported strings ────────────────
// const FORMAT_TEMPLATES = [
//   {
//     id: "header-footer",
//     icon: "📎",
//     label: "Code Snippet",
//     sub: "Header + Footer",
//     color: "#6366f1",
//     colorDim: "rgba(99,102,241,0.08)",
//     colorBorder: "rgba(99,102,241,0.2)",
//     filename: "format_code_snippet_header_footer.txt",
//     content: headerFooterTxt,
//   },
//   {
//     id: "code-stub",
//     icon: "✏️",
//     label: "Code Stub",
//     sub: "Buggy starter code",
//     color: "#10b981",
//     colorDim: "rgba(16,185,129,0.08)",
//     colorBorder: "rgba(16,185,129,0.2)",
//     filename: "format_code_stub.txt",
//     content: codeStubTxt,
//   },
//   {
//     id: "multi-language",
//     icon: "🌐",
//     label: "Multi Language",
//     sub: "C,Java,C++,Python,...",
//     color: "#f59e0b",
//     colorDim: "rgba(245,158,11,0.08)",
//     colorBorder: "rgba(245,158,11,0.2)",
//     filename: "format_multi_language.txt",
//     content: multiLanguageTxt,
//   },
//   {
//     id: "snippet-stub",
//     icon: "🔧",
//     label: "Snippet + Stub",
//     sub: "Header · Footer · Buggy body",
//     color: "#8b5cf6",
//     colorDim: "rgba(139,92,246,0.08)",
//     colorBorder: "rgba(139,92,246,0.2)",
//     filename: "format_snippet_with_stub.txt",
//     content: snippetWithStubTxt,
//   },
//   {
//     id: "snippet-stub-wl-bl",
//     icon: "🛡️",
//     label: "Snippet + Stub + WL/BL",
//     sub: "Header · Footer · Stub · Whitelist · Blacklist",
//     color: "#ef4444",
//     colorDim: "rgba(239,68,68,0.08)",
//     colorBorder: "rgba(239,68,68,0.2)",
//     filename: "format_snippet_stub_whitelist_blacklist.txt",
//     content: snippetStubWlBlTxt,
//   },
// ];

// // ─── FORMAT SELECTOR ──────────────────────────────────────────────────────────
// function FormatSelector() {
//   const [downloading, setDownloading] = useState(null);

//   const handleDownload = (fmt) => {
//     setDownloading(fmt.id);
//     const blob = new Blob([fmt.content], { type: "text/plain" });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a");
//     a.href = url; a.download = fmt.filename;
//     document.body.appendChild(a); a.click();
//     document.body.removeChild(a); URL.revokeObjectURL(url);
//     setTimeout(() => setDownloading(null), 1200);
//   };

//   return (
//     <div style={{
//       background: "#f8f9fc",
//       border: "1.5px solid #e4e7f0",
//       borderRadius: 16,
//       padding: "18px 20px",
//       marginBottom: 18,
//     }}>
//       {/* Header */}
//       <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
//         <div style={{
//           width: 28, height: 28,
//           background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
//           borderRadius: 8,
//           display: "flex", alignItems: "center", justifyContent: "center",
//           fontSize: 14, flexShrink: 0,
//         }}>📋</div>
//         <div>
//           <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
//            Sample Format Templates
//           </div>
//           <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginTop: 1 }}>
//             Select a format to download its template .txt file
//           </div>
//         </div>
//       </div>

//       {/* Cards grid */}
//       <div style={{
//         display: "grid",
//         gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
//         gap: 10,
//       }}>
//         {FORMAT_TEMPLATES.map(fmt => {
//           const isDl = downloading === fmt.id;
//           return (
//             <button
//               key={fmt.id}
//               onClick={() => handleDownload(fmt)}
//               style={{
//                 background: isDl ? fmt.colorDim : "#ffffff",
//                 border: `1.5px solid ${isDl ? fmt.color : "#e4e7f0"}`,
//                 borderRadius: 12,
//                 padding: "13px 14px",
//                 cursor: "pointer",
//                 textAlign: "left",
//                 transition: "all 0.2s ease",
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: 6,
//                 position: "relative",
//                 overflow: "hidden",
//                 boxShadow: isDl
//                   ? `0 4px 14px ${fmt.colorBorder}`
//                   : "0 1px 3px rgba(0,0,0,0.06)",
//               }}
//               onMouseEnter={e => {
//                 if (!isDl) {
//                   e.currentTarget.style.border = `1.5px solid ${fmt.color}`;
//                   e.currentTarget.style.background = fmt.colorDim;
//                   e.currentTarget.style.transform = "translateY(-2px)";
//                   e.currentTarget.style.boxShadow = `0 6px 18px ${fmt.colorBorder}`;
//                 }
//               }}
//               onMouseLeave={e => {
//                 if (!isDl) {
//                   e.currentTarget.style.border = "1.5px solid #e4e7f0";
//                   e.currentTarget.style.background = "#ffffff";
//                   e.currentTarget.style.transform = "translateY(0)";
//                   e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
//                 }
//               }}
//             >
//               <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: fmt.color, borderRadius: "12px 0 0 12px" }} />
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingLeft: 6 }}>
//                 <span style={{ fontSize: 20 }}>{fmt.icon}</span>
//                 <span style={{
//                   fontSize: 10, fontWeight: 800,
//                   color: isDl ? fmt.color : "#9ca3af",
//                   background: isDl ? fmt.colorDim : "#f3f4f6",
//                   border: `1px solid ${isDl ? fmt.colorBorder : "transparent"}`,
//                   padding: "2px 7px", borderRadius: 20,
//                   transition: "all 0.2s",
//                   fontFamily: "monospace",
//                 }}>
//                   {isDl ? "✓ saved" : "↓ .txt"}
//                 </span>
//               </div>
//               <div style={{ paddingLeft: 6 }}>
//                 <div style={{ fontSize: 12.5, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
//                   {fmt.label}
//                 </div>
//                 <div style={{ fontSize: 10.5, fontWeight: 600, color: fmt.color, marginTop: 2, lineHeight: 1.3 }}>
//                   {fmt.sub}
//                 </div>
//               </div>
//             </button>
//           );
//         })}
//       </div>

//       {/* Footer hint */}
//       <div style={{
//         marginTop: 12, padding: "8px 12px",
//         background: "rgba(99,102,241,0.06)",
//         border: "1px solid rgba(99,102,241,0.15)",
//         borderRadius: 8, fontSize: 11, color: "#6366f1", fontWeight: 600,
//         display: "flex", alignItems: "center", gap: 6,
//       }}>
//         <span>💡</span>
//         <span>Each template includes format rules, field guide and a working example question.</span>
//       </div>
//     </div>
//   );
// }

// // ─── PARSER ───────────────────────────────────────────────────────────────────
// function parseQuestions(raw) {
//   const errors = [];
//   const questions = [];

//   const blocks = raw
//     .split(/---QUESTION---/i)
//     .map(b => b.split(/---END---/i)[0])
//     .filter(b => b.trim().length > 0);

//   if (blocks.length === 0) {
//     errors.push("No ---QUESTION--- blocks found. Check the format.");
//     return { questions, errors };
//   }

//   const HEADER_RE = /^(TITLE|DIFFICULTY|LANGUAGE|TAGS|DESCRIPTION|INPUT_FORMAT|OUTPUT_FORMAT|CONSTRAINTS|CODE_STUB\[[^\]]+\]|SOLUTION\[[^\]]+\]|HEADER\[[^\]]+\]|FOOTER\[[^\]]+\]|WHITELIST\[[^\]]+\]|BLACKLIST\[[^\]]+\]|TESTCASE|SAMPLE_IO)\s*:/i;

//   blocks.forEach((block, bi) => {
//     const qNum = bi + 1;
//     const qErrors = [];
//     const lines = block.split("\n");
//     const segments = {};
//     let currentKey = null;
//     let currentLines = [];

//     const flushCurrent = () => {
//       if (currentKey !== null) segments[currentKey] = currentLines.join("\n").trim();
//     };

//     lines.forEach(line => {
//       const m = line.match(/^([A-Z_]+(?:\[[^\]]+\])?)\s*:\s*(.*)/i);
//       if (m && HEADER_RE.test(line)) {
//         flushCurrent();
//         const bracketM = m[1].match(/^([A-Z_]+)\[([^\]]+)\]$/i);
//         currentKey = bracketM
//           ? bracketM[1].toUpperCase() + "[" + bracketM[2] + "]"
//           : m[1].toUpperCase();
//         currentLines = m[2].trim() ? [m[2].trim()] : [];
//         return;
//       }
//       if (currentKey !== null) currentLines.push(line);
//     });
//     flushCurrent();

//     const get = k => segments[k.toUpperCase()] || null;
//     const getLangMap = prefix => {
//       const result = {};
//       Object.keys(segments).forEach(k => {
//         const m = k.match(new RegExp(`^${prefix}\\[(.+)\\]$`, "i"));
//         if (m) result[m[1]] = segments[k];
//       });
//       return result;
//     };
//     const unescape = s => s.replace(/\\n/g, "\n");

//     const getTestcases = () => {
//       const allLines = [];
//       lines.forEach(line => {
//         if (/^TESTCASE\s*:/i.test(line))
//           allLines.push(line.replace(/^TESTCASE\s*:\s*/i, "").trim());
//       });
//       return allLines.filter(l => l.length > 0).map(val => {
//         const parts = val.split("|").map(p => p.trim());
//         const rawOut = unescape(parts[1] || "");
//         const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
//         return {
//           input: unescape(parts[0] || ""), output,
//           difficulty: parts[2]?.trim() || "Medium",
//           score: parseInt(parts[3]) || 30,
//           memBytes: "512", timeBytes: 200,
//           timeLimit: null, outputLimit: null, memoryLimit: null,
//         };
//       });
//     };

//     const getSampleIO = () => {
//       const allLines = [];
//       lines.forEach(line => {
//         if (/^SAMPLE_IO\s*:/i.test(line))
//           allLines.push(line.replace(/^SAMPLE_IO\s*:\s*/i, "").trim());
//       });
//       return allLines.filter(l => l.length > 0).map(val => {
//         const parts = val.split("|").map(p => p.trim());
//         const rawOut = unescape(parts[1] || "");
//         const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
//         return {
//           input: unescape(parts[0] || ""), output,
//           memBytes: "512", timeBytes: 200,
//           sample: "Yes", difficulty: " - ", score: " - ",
//           timeLimit: null, outputLimit: null, memoryLimit: null,
//         };
//       });
//     };

//     const title       = get("TITLE");
//     const difficulty  = get("DIFFICULTY");
//     const langRaw     = get("LANGUAGE");
//     const tagsRaw     = get("TAGS");
//     const description = get("DESCRIPTION");
//     const inputFmt    = get("INPUT_FORMAT");
//     const outputFmt   = get("OUTPUT_FORMAT");
//     const constraints = get("CONSTRAINTS");
//     const codeStubs   = getLangMap("CODE_STUB");
//     const solutions   = getLangMap("SOLUTION");
//     const headers     = getLangMap("HEADER");
//     const footers     = getLangMap("FOOTER");
//     const whitelists  = getLangMap("WHITELIST");
//     const blacklists  = getLangMap("BLACKLIST");
//     const testcases   = getTestcases();
//     const sampleIO    = getSampleIO();

//     if (!title)       qErrors.push(`Q${qNum}: Missing TITLE`);
//     if (!difficulty || !["Easy","Medium","Hard"].includes(difficulty))
//       qErrors.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard`);
//     if (!langRaw)     qErrors.push(`Q${qNum}: Missing LANGUAGE`);
//     if (!description) qErrors.push(`Q${qNum}: Missing DESCRIPTION`);
//     if (!inputFmt)    qErrors.push(`Q${qNum}: Missing INPUT_FORMAT`);
//     if (!outputFmt)   qErrors.push(`Q${qNum}: Missing OUTPUT_FORMAT`);
//     if (testcases.length === 0) qErrors.push(`Q${qNum}: No TESTCASE lines found`);
//     if (Object.keys(solutions).length === 0)
//       qErrors.push(`Q${qNum}: No SOLUTION[Language] block found`);

//     if (qErrors.length > 0) errors.push(...qErrors);
//     else questions.push({
//       title, difficulty,
//       languages: langRaw.split(",").map(l => l.trim()).filter(Boolean),
//       tags: tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [""],
//       description, inputFmt, outputFmt,
//       constraints: constraints || "",
//       codeStubs, solutions, headers, footers, whitelists, blacklists,
//       testcases, sampleIO,
//     });
//   });

//   return { questions, errors };
// }

// // ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────
// function buildPayload(q, batchConfig, qbId, userId) {
//   const wrapHtml = text => {
//     if (!text) return "";
//     if (/^<(p|ul|ol|div|h[1-6]|br|b|strong|em|span|table)\b/i.test(text.trim())) return text;
//     const esc = s => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
//     return text.split(/\n\n+/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
//   };

//   const anySnippet = q.languages.some(lang => !!(q.headers?.[lang] || q.footers?.[lang]));

//   const solutionArray = q.languages.map(lang => {
//     const header = q.headers?.[lang] || null;
//     const footer = q.footers?.[lang] || null;
//     const parseList = raw => {
//       if (!raw?.trim()) return [];
//       return raw.split(",").map(v => v.trim()).filter(Boolean).map(v => ({ list: [v] }));
//     };
//     return {
//       language: lang, codeStub: q.codeStubs[lang] || "",
//       hasSnippet: anySnippet,
//       ...(header ? { header } : {}),
//       ...(footer ? { footer } : {}),
//       ...(parseList(q.whitelists?.[lang]).length ? { whitelist: parseList(q.whitelists?.[lang]) } : {}),
//       ...(parseList(q.blacklists?.[lang]).length ? { blacklist: parseList(q.blacklists?.[lang]) } : {}),
//       solutiondata: q.solutions[lang] ? [{
//         solution: q.solutions[lang], solutionbest: true,
//         isSolutionExp: false, solutionExp: null, solutionDebug: null,
//       }] : [],
//       hideHeader: false, hideFooter: false,
//     };
//   });

//   return {
//     question_type: "programming",
//     question_data: wrapHtml(q.description),
//     question_editor_type: 1,
//     multilanguage: q.languages,
//     inputformat: wrapHtml(q.inputFmt),
//     outputformat: wrapHtml(q.outputFmt),
//     enablecustominput: true,
//     line_token_evaluation: false,
//     codeconstraints: wrapHtml(q.constraints),
//     timelimit: null, memorylimit: null, codesize: null,
//     setLimit: false, enable_api: false, outputLimit: null,
//     subject_id: batchConfig.subject_id || null,
//     blooms_taxonomy: null, course_outcome: null, program_outcome: null,
//     hint: [],
//     manual_difficulty: batchConfig.manual_difficulty || q.difficulty,
//     solution: solutionArray,
//     testcases: q.testcases,
//     topic_id: batchConfig.topic_id || null,
//     sub_topic_id: batchConfig.sub_topic_id || null,
//     linked_concepts: "",
//     tags: q.tags,
//     sample_io: JSON.stringify(q.sampleIO),
//     question_media: [],
//     pcm_combination_ids: batchConfig.pcm_combination_id ? [batchConfig.pcm_combination_id] : [],
//     qb_id: qbId,
//     createdBy: userId,
//   };
// }

// // ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// export default function CODSyncPlatform({ platform, onBack }) {

//   // ── Auth ──────────────────────────────────────────────────────────────────
//   const [token, setToken] = useState(() => {
//     try { return localStorage.getItem(platform.tokenKey) || ""; } catch { return ""; }
//   });
//   const [ui, setUI] = useState(() =>
//     localStorage.getItem(platform.tokenKey) ? "batch-config" : "welcome"
//   );
//   const [tokenInput, setTokenInput] = useState("");

//   // ── Batch Config ──────────────────────────────────────────────────────────
//   const [batchConfig, setBatchConfig] = useState({
//     topic_id: "", sub_topic_id: "", subject_id: "",
//     pcm_combination_id: "", manual_difficulty: "Medium",
//   });
//   const [bcLoading, setBcLoading]         = useState(false);
//   const [allSubjects, setAllSubjects]     = useState([]);
//   const [allTopics, setAllTopics]         = useState([]);
//   const [allSubTopics, setAllSubTopics]   = useState([]);
//   const [subTopicSearch, setSubTopicSearch]   = useState("");
//   const [subTopicFocused, setSubTopicFocused] = useState(false);
//   const [selSubject, setSelSubject]   = useState(null);
//   const [selTopic, setSelTopic]       = useState(null);
//   const [selSubTopic, setSelSubTopic] = useState(null);
//   const [pcmValues, setPcmValues] = useState([]);
//   const [pcmCombos, setPcmCombos] = useState([]);
//   const [pcmLevels, setPcmLevels] = useState([]);
//   const [pcmSubjectSel, setPcmSubjectSel]       = useState(null);
//   const [pcmTopicSel, setPcmTopicSel]           = useState(null);
//   const [pcmLevelSel, setPcmLevelSel]           = useState(null);
//   const [pcmSubjectSearch, setPcmSubjectSearch] = useState("");
//   const [pcmTopicSearch, setPcmTopicSearch]     = useState("");

//   // ── QB Step ───────────────────────────────────────────────────────────────
//   const [qbMode, setQbMode] = useState("create");
//   const [qbName, setQbName]               = useState("");
//   const [qbCode, setQbCode]               = useState("");
//   const [qbDescription, setQbDescription] = useState("");
//   const [selectedDepts, setSelectedDepts] = useState([]);
//   const [deptSearch, setDeptSearch]       = useState("");
//   const [qbSearchTerm, setQbSearchTerm]       = useState("");
//   const [qbSearchResults, setQbSearchResults] = useState([]);
//   const [activeQB, setActiveQB] = useState(null);

//   // ── Upload ────────────────────────────────────────────────────────────────
//   const [pasteInput, setPasteInput]           = useState("");
//   const [parsedQuestions, setParsedQuestions] = useState([]);
//   const [previewIndex, setPreviewIndex]       = useState(0);
//   const [showPreview, setShowPreview]         = useState(false);
//   const [isLoading, setIsLoading]             = useState(false);
//   const [uploadProgress, setUploadProgress]   = useState({ current: 0, total: 0 });
//   const [uploadResults, setUploadResults]     = useState(null);

//   // ── UI helpers ────────────────────────────────────────────────────────────
//   const [alert, setAlert]         = useState(null);
//   const [overlay, setOverlay]     = useState(false);
//   const [overlayText, setOverlayText] = useState("");

//   const BATCH_SIZE = 3;
//   const sleep = ms => new Promise(r => setTimeout(r, ms));

//   const showAlert = (msg, type = "warning") => {
//     setAlert({ msg, type });
//     setTimeout(() => setAlert(null), 5000);
//   };
//   const showOverlay = msg => { setOverlayText(msg); setOverlay(true); };
//   const hideOverlay = () => setOverlay(false);
//   const getHeaders  = () => ({ "Content-Type": "application/json", Authorization: token });

//   const filteredDepts = (platform.bdIdOptions || []).filter(d =>
//     d.label.toLowerCase().includes(deptSearch.toLowerCase())
//   );

//   // ── Platform badge ────────────────────────────────────────────────────────
//   const PlatformBadge = () => (
//     <span style={{
//       display: "inline-flex", alignItems: "center", gap: 6,
//       background: `${platform.color}12`,
//       border: `1px solid ${platform.color}30`,
//       borderRadius: 12, padding: "3px 12px",
//       fontSize: 12, fontWeight: 700,
//       color: platform.color, marginBottom: 6,
//     }}>
//       {platform.icon} {platform.label}
//     </span>
//   );

//   // ── Load batch config ─────────────────────────────────────────────────────
//   useEffect(() => {
//     if (token && allSubjects.length === 0) loadBcData(token);
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [token]);

//   const loadBcData = async tok => {
//     if (allSubjects.length > 0) return;
//     setBcLoading(true);
//     const h = { "Content-Type": "application/json", Authorization: tok };
//     try {
//       const [subRes, pcmValRes, pcmComboRes] = await Promise.all([
//         fetch(`${API}/api/questiondomain/getallsubjects`, { headers: h }),
//         fetch(`${API}/api/pcm/getallpcmvalues`,           { headers: h }),
//         fetch(`${API}/api/pcm/getallpcmcombinations`,     { headers: h }),
//       ]);
//       const subData      = await subRes.json();
//       const pcmValData   = await pcmValRes.json();
//       const pcmComboData = await pcmComboRes.json();

//       if (subData?.statusCode === 200) {
//         setAllSubjects(subData.data.subject || []);
//         setAllTopics(subData.data.topic || []);
//         setAllSubTopics((subData.data.sub_topic || []).map(st => ({
//           ...st,
//           name: st.name || st.sub_topic_name || st.subtopic_name || st.label || "(unnamed)",
//         })));
//       }
//       if (pcmValData?.success) {
//         setPcmValues(pcmValData.data  || []);
//         setPcmLevels(pcmValData.level || []);
//       }
//       if (pcmComboData?.success) setPcmCombos(pcmComboData.data || []);
//     } catch (err) {
//       showAlert("Failed to load config data: " + err.message, "danger");
//     } finally {
//       setBcLoading(false);
//     }
//   };

//   // ── Auth handlers ─────────────────────────────────────────────────────────
//   const saveToken = () => {
//     if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
//     const tok = tokenInput.trim();
//     try {
//       localStorage.setItem(platform.tokenKey, tok);
//       setToken(tok); setTokenInput("");
//       setUI("batch-config");
//       showAlert("Token saved! Loading config data...", "success");
//       loadBcData(tok);
//     } catch (err) { showAlert("Failed: " + err.message, "danger"); }
//   };

//   const clearToken = () => {
//     try { localStorage.removeItem(platform.tokenKey); } catch {}
//     setToken(""); setUI("welcome"); resetAll();
//     showAlert("Logged out", "danger");
//   };

//   // ── Reset helpers ─────────────────────────────────────────────────────────
//   const resetAll = () => {
//     setBatchConfig({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"", manual_difficulty:"Medium" });
//     setSelSubject(null); setSelTopic(null); setSelSubTopic(null);
//     setPcmSubjectSel(null); setPcmTopicSel(null); setPcmLevelSel(null);
//     setSubTopicSearch(""); setPcmSubjectSearch(""); setPcmTopicSearch("");
//     resetQBStep(); resetUpload();
//   };

//   const resetQBStep = () => {
//     setQbMode("create");
//     setQbName(""); setQbCode(""); setQbDescription("");
//     setSelectedDepts([]); setDeptSearch("");
//     setQbSearchTerm(""); setQbSearchResults([]);
//     setActiveQB(null);
//   };

//   const resetUpload = () => {
//     setPasteInput(""); setParsedQuestions([]); setUploadResults(null);
//     setUploadProgress({ current: 0, total: 0 });
//     setShowPreview(false); setPreviewIndex(0);
//   };

//   // ── QB: Create ────────────────────────────────────────────────────────────
//   const createQB = async () => {
//     if (!qbName.trim()) { showAlert("QB Name is required", "danger"); return; }
//     if (selectedDepts.length === 0) { showAlert("Select at least one department", "danger"); return; }
//     showOverlay("🔨 Creating Question Bank...");
//     try {
//       const res = await fetch(`${API}/api/questionbank/create`, {
//         method: "POST", headers: getHeaders(),
//         body: JSON.stringify({
//           qb_name: qbName, qb_code: qbCode || null,
//           qb_description: qbDescription || null,
//           tags: [], b_d_id: selectedDepts,
//           departmentChanged: true,
//           visibility: "Within Department",
//           price: 0, mainDepartmentUser: true,
//         }),
//       });
//       const result = await res.json();
//       if (result.statusCode === 200 && result.data.success) {
//         const qbData = result.data.data.data;
//         setActiveQB({ qb_id: qbData.qb_id, qb_name: qbData.qb_name, createdBy: qbData.createdBy });
//         hideOverlay();
//         showAlert("✅ Question Bank created!", "success");
//         setUI("upload");
//       } else throw new Error(result.data?.message || "Failed to create QB");
//     } catch (err) { hideOverlay(); showAlert("Error creating QB: " + err.message, "danger"); }
//   };

//   // ── QB: Search ────────────────────────────────────────────────────────────
//   const searchQBs = async () => {
//     if (!qbSearchTerm.trim()) { showAlert("Enter a search term", "warning"); return; }
//     showOverlay("🔍 Searching...");
//     try {
//       const res = await fetch(`${API}/api/questionbanks/all`, {
//         method: "POST", headers: getHeaders(),
//         body: JSON.stringify({
//           department_id: platform.departmentIds,
//           limit: 50, mainDepartmentUser: true, page: 1, search: qbSearchTerm,
//         }),
//       });
//       const data = await res.json();
//       const qbs  = data?.questionbanks || [];
//       setQbSearchResults(qbs);
//       hideOverlay();
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

//   // ── Parse ─────────────────────────────────────────────────────────────────
//   const handleParse = () => {
//     if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
//     const { questions, errors } = parseQuestions(pasteInput);
//     if (errors.length > 0) {
//       const preview = errors.slice(0, 6).join("\n");
//       const more = errors.length > 6 ? `\n...and ${errors.length - 6} more` : "";
//       showAlert(`❌ ${errors.length} error(s):\n\n${preview}${more}`, "danger");
//       if (questions.length > 0) setParsedQuestions(questions);
//       return;
//     }
//     setParsedQuestions(questions);
//     showAlert(`✅ Parsed ${questions.length} question(s)!`, "success");
//   };

//   // ── Upload ────────────────────────────────────────────────────────────────
//   const uploadQuestions = async () => {
//     if (parsedQuestions.length === 0) { showAlert("Parse first", "warning"); return; }
//     if (!activeQB) { showAlert("No QB selected", "danger"); return; }

//     setIsLoading(true);
//     showOverlay("🔄 Starting upload...");
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
//             const payload = buildPayload(q, batchConfig, activeQB.qb_id, userId);
//             const res     = await fetch(`${API}/api/programming_question/create`, {
//               method: "POST", headers: getHeaders(), body: JSON.stringify(payload),
//             });
//             const data = await res.json();
//             if (data.success) {
//               results.success++;
//               results.ids.push({ index: gi + 1, title: q.title, q_id: data.q_id });
//             } else throw new Error(data.message || "Upload failed");
//           } catch (err) {
//             results.failed++;
//             results.errors.push({ index: gi + 1, title: q.title, error: err.message });
//           }
//         }));

//         if (i + BATCH_SIZE < parsedQuestions.length) await sleep(400);
//       }

//       setUploadProgress({ current: parsedQuestions.length, total: parsedQuestions.length });
//       setUploadResults(results);
//       hideOverlay();
//       if (results.failed === 0) showAlert(`🎉 All ${results.success} uploaded!`, "success");
//       else showAlert(`⚠️ ${results.success} uploaded, ${results.failed} failed`, "warning");
//       setUI("results");
//     } catch (err) {
//       hideOverlay(); showAlert("Upload error: " + err.message, "danger");
//     } finally { setIsLoading(false); }
//   };

//   const startNewUpload = () => { resetUpload(); setUI("upload"); };
//   const currentQ = parsedQuestions[previewIndex];

//   // ─── RENDER ───────────────────────────────────────────────────────────────
//   return (
//     <div className="cod-uploader-container">

//       {/* Overlay */}
//       {overlay && (
//         <div className="cod-overlay">
//           <div className="cod-overlay-content">
//             <div className="cod-spinner"></div>
//             <div className="cod-overlay-text">{overlayText}</div>
//           </div>
//         </div>
//       )}

//       {/* Alert */}
//       {alert && (
//         <div className={`cod-alert cod-alert-${alert.type}`}>
//           <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>{alert.msg}</pre>
//         </div>
//       )}

//       {/* ── Preview Modal ── */}
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
//                 {currentQ.languages.map(l => <span key={l} className="cod-preview-lang">💻 {l}</span>)}
//                 {currentQ.tags.filter(t => t).map(t => <span key={t} className="cod-preview-tag">🏷️ {t}</span>)}
//               </div>
//               <div className="cod-preview-section">
//                 <h4>Title</h4>
//                 <p className="cod-preview-title-text">{currentQ.title}</p>
//               </div>
//               <div className="cod-preview-section">
//                 <h4>Description</h4>
//                 <div className="cod-preview-html" dangerouslySetInnerHTML={{ __html: currentQ.description }} />
//               </div>
//               <div className="cod-preview-2col">
//                 <div className="cod-preview-section"><h4>Input Format</h4><p>{currentQ.inputFmt}</p></div>
//                 <div className="cod-preview-section"><h4>Output Format</h4><p>{currentQ.outputFmt}</p></div>
//               </div>
//               {currentQ.constraints && (
//                 <div className="cod-preview-section"><h4>Constraints</h4><p>{currentQ.constraints}</p></div>
//               )}
//               {currentQ.languages.map(lang => (
//                 <div key={lang} className="cod-preview-lang-block">
//                   <div className="cod-preview-lang-header">
//                     <span className="cod-lang-pill">{lang}</span>
//                     {(currentQ.headers?.[lang] || currentQ.footers?.[lang]) && <span className="cod-snippet-badge">📎 Header/Footer</span>}
//                     {currentQ.whitelists?.[lang] && <span className="cod-wl-badge">✅ WL: {currentQ.whitelists[lang]}</span>}
//                     {currentQ.blacklists?.[lang] && <span className="cod-bl-badge">🚫 BL: {currentQ.blacklists[lang]}</span>}
//                   </div>
//                   {currentQ.headers?.[lang]   && <div className="cod-preview-section"><h4>Header</h4><pre className="cod-preview-code"><code>{currentQ.headers[lang]}</code></pre></div>}
//                   {currentQ.codeStubs[lang]   && <div className="cod-preview-section"><h4>Code Stub</h4><pre className="cod-preview-code"><code>{currentQ.codeStubs[lang]}</code></pre></div>}
//                   {currentQ.footers?.[lang]   && <div className="cod-preview-section"><h4>Footer</h4><pre className="cod-preview-code"><code>{currentQ.footers[lang]}</code></pre></div>}
//                   {currentQ.solutions[lang]   && <div className="cod-preview-section"><h4>Solution</h4><pre className="cod-preview-code"><code>{currentQ.solutions[lang]}</code></pre></div>}
//                 </div>
//               ))}
//               <div className="cod-preview-section">
//                 <h4>Test Cases ({currentQ.testcases.length}) + Sample I/O ({currentQ.sampleIO.length})</h4>
//                 <div className="cod-tc-grid">
//                   {currentQ.testcases.slice(0, 5).map((tc, i) => (
//                     <div key={i} className="cod-tc-row">
//                       <span className="cod-tc-badge">TC{i+1} · {tc.difficulty} · {tc.score}pts</span>
//                       <span className="cod-tc-io">In: <code>{tc.input}</code></span>
//                       <span className="cod-tc-io">Out: <code>{tc.output.trim()}</code></span>
//                     </div>
//                   ))}
//                   {currentQ.testcases.length > 5 && <div className="cod-tc-more">+{currentQ.testcases.length - 5} more</div>}
//                   {currentQ.sampleIO.map((s, i) => (
//                     <div key={`s${i}`} className="cod-tc-row cod-tc-sample">
//                       <span className="cod-tc-badge cod-tc-badge-sample">Sample {i+1}</span>
//                       <span className="cod-tc-io">In: <code>{s.input}</code></span>
//                       <span className="cod-tc-io">Out: <code>{s.output.trim()}</code></span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//             <div className="cod-preview-modal-footer">
//               <button onClick={() => setPreviewIndex(p => Math.max(0, p-1))} disabled={previewIndex === 0} className="cod-button cod-button-secondary cod-button-small">← Prev</button>
//               <span className="cod-preview-counter">{previewIndex+1} / {parsedQuestions.length}</span>
//               <button onClick={() => setPreviewIndex(p => Math.min(parsedQuestions.length-1, p+1))} disabled={previewIndex === parsedQuestions.length-1} className="cod-button cod-button-secondary cod-button-small">Next →</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ══════════════════════════════════════
//           WELCOME
//       ══════════════════════════════════════ */}
//       {ui === "welcome" && (
//         <div className="cod-welcome">
//           <div style={{ marginBottom: 16 }}><PlatformBadge /></div>
//           <div className="cod-welcome-icon">⚡</div>
//           <h2 className="cod-welcome-title">COD Sync</h2>
//           <p className="cod-welcome-subtitle">Bulk upload AI-generated coding questions to question banks</p>
//           <textarea
//             value={tokenInput} onChange={e => setTokenInput(e.target.value)}
//             placeholder="Paste your Authorization token here..."
//             className="cod-token-input"
//           />
//           <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
//             <button onClick={saveToken} className="cod-button cod-button-primary">Save Token & Continue</button>
//             <button onClick={onBack}    className="cod-button cod-button-secondary">← Back</button>
//           </div>
//           <p className="cod-token-hint">💡 Token saved separately per platform</p>
//         </div>
//       )}

//       {/* ══════════════════════════════════════
//           BATCH CONFIG
//       ══════════════════════════════════════ */}
//       {ui === "batch-config" && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div>
//               <PlatformBadge />
//               <h3 className="cod-title">⚙️ Batch Configuration</h3>
//               <p className="cod-subtitle">Select Subject → Topic → Sub Topic → PCM Combination</p>
//             </div>
//             <div className="cod-header-actions">
//               {bcLoading && <span className="cod-bc-loading">⏳ Loading...</span>}
//               <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">← Platforms</button>
//               <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>

//           {bcLoading && (
//             <div className="cod-bc-autoload">
//               <div className="cod-bc-autoload-spinner"></div>
//               <span>Loading subjects & PCM data...</span>
//             </div>
//           )}

//           {allSubjects.length > 0 && (
//             <>
//               <div className="cod-bc-data-info">
//                 <span>📋 {allSubjects.length} subjects</span><span>·</span>
//                 <span>🗂 {allTopics.length} topics</span><span>·</span>
//                 <span>📌 {allSubTopics.length} sub topics</span><span>·</span>
//                 <span>🔗 {pcmCombos.length} PCM combos</span>
//                 <button
//                   onClick={() => {
//                     setBatchConfig({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"", manual_difficulty:"Medium" });
//                     setSelSubject(null); setSelTopic(null); setSelSubTopic(null);
//                     setPcmSubjectSel(null); setPcmTopicSel(null); setPcmLevelSel(null);
//                     setSubTopicSearch(""); setPcmSubjectSearch(""); setPcmTopicSearch("");
//                   }}
//                   className="cod-button cod-button-secondary cod-button-small"
//                 >↺ Reset</button>
//               </div>

//               <div className="cod-bc-sections">
//                 {/* Sub Topic unified search */}
//                 <div className="cod-bc-panel">
//                   <div className="cod-bc-panel-title">🔍 Search Sub Topic / Topic / Subject <span className="cod-required">*</span></div>
//                   <input
//                     type="text" value={subTopicSearch}
//                     onChange={e => setSubTopicSearch(e.target.value)}
//                     placeholder="Search by sub topic, topic, or subject name..."
//                     className="cod-input cod-search-input"
//                     autoFocus
//                     onFocus={() => setSubTopicFocused(true)}
//                     onBlur={() => setTimeout(() => setSubTopicFocused(false), 200)}
//                   />
//                   {(subTopicSearch.trim().length > 0 || subTopicFocused) && allSubTopics.length > 0 && (
//                     <div className="cod-bc-list cod-bc-subtopic-list">
//                       {(() => {
//                         const term = subTopicSearch.toLowerCase().trim();
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
//                           : enriched
//                         ).slice(0, 50);

//                         if (filtered.length === 0)
//                           return <div className="cod-bc-empty" style={{border:"none"}}>No results for "{subTopicSearch}"</div>;

//                         return filtered.map(({ st, stId, topic, subject }) => (
//                           <div key={stId}
//                             className={`cod-bc-item cod-bc-subtopic-item ${selSubTopic?.sub_topic_id === stId ? "selected" : ""}`}
//                             onClick={() => {
//                               setSelSubTopic({ ...st, sub_topic_id: stId });
//                               setSelTopic(topic || null);
//                               setSelSubject(subject || null);
//                               setSubTopicSearch(st.name);
//                               setBatchConfig(p => ({
//                                 ...p, sub_topic_id: stId,
//                                 topic_id:   topic?.topic_id     || p.topic_id,
//                                 subject_id: subject?.subject_id || p.subject_id,
//                               }));
//                             }}
//                           >
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
//                           <span className="cod-bc-resolved-val">{row.val || <em style={{color:"#f59e0b"}}>not found</em>}</span>
//                           <code className="cod-bc-resolved-id">{(row.id||"").slice(0,8)}{row.id?"…":""}</code>
//                         </div>
//                       ))}
//                       <button
//                         onClick={() => {
//                           setSelSubTopic(null); setSelTopic(null); setSelSubject(null);
//                           setSubTopicSearch("");
//                           setBatchConfig(p => ({ ...p, sub_topic_id:"", topic_id:"", subject_id:"" }));
//                         }}
//                         className="cod-bc-clear-sel"
//                       >✕ Clear</button>
//                     </div>
//                   )}
//                 </div>

//                 {/* PCM */}
//                 <div className="cod-bc-panel cod-bc-panel-pcm">
//                   <div className="cod-bc-panel-title">
//                     4. PCM Combination <span className="cod-required">*</span>
//                     {batchConfig.pcm_combination_id && (
//                       <span className="cod-bc-selected-name cod-bc-selected-pcm">
//                         {(() => {
//                           const combo = pcmCombos.find(c => c.id === batchConfig.pcm_combination_id);
//                           if (!combo) return batchConfig.pcm_combination_id.slice(0,8) + "…";
//                           const subj  = pcmValues.find(s => s.pcm_subject_id === combo.pcm_subject_id);
//                           const topic = subj?.pcm_topic?.find(t => t.value === combo.pcm_topic_id);
//                           const level = pcmLevels.find(l => l.value === combo.pcm_level_id);
//                           return `${subj?.name||"?"} › ${topic?.label||"?"} › ${level?.label||"?"}`;
//                         })()}
//                       </span>
//                     )}
//                   </div>
//                   <div className="cod-pcm-selectors">
//                     <div className="cod-pcm-col">
//                       <label className="cod-label">PCM Subject</label>
//                       <input type="text" value={pcmSubjectSearch}
//                         onChange={e => { setPcmSubjectSearch(e.target.value); setPcmTopicSel(null); setPcmLevelSel(null); }}
//                         placeholder="🔍 Search..." className="cod-input" />
//                       <div className="cod-bc-list">
//                         {pcmValues.filter(s => s.name.toLowerCase().includes(pcmSubjectSearch.toLowerCase())).map(s => (
//                           <div key={s.pcm_subject_id}
//                             className={`cod-bc-item ${pcmSubjectSel?.pcm_subject_id === s.pcm_subject_id ? "selected" : ""}`}
//                             onClick={() => { setPcmSubjectSel(s); setPcmTopicSel(null); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id:"" })); }}>
//                             {s.name}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                     <div className="cod-pcm-col">
//                       <label className="cod-label">PCM Topic</label>
//                       {!pcmSubjectSel
//                         ? <div className="cod-bc-empty">Select PCM subject first</div>
//                         : <>
//                             <input type="text" value={pcmTopicSearch} onChange={e => setPcmTopicSearch(e.target.value)} placeholder="🔍 Search..." className="cod-input" />
//                             <div className="cod-bc-list">
//                               {(pcmSubjectSel.pcm_topic || []).filter(t => t.label.toLowerCase().includes(pcmTopicSearch.toLowerCase())).map(t => (
//                                 <div key={t.value}
//                                   className={`cod-bc-item ${pcmTopicSel?.value === t.value ? "selected" : ""}`}
//                                   onClick={() => { setPcmTopicSel(t); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id:"" })); }}>
//                                   {t.label}
//                                 </div>
//                               ))}
//                             </div>
//                           </>
//                       }
//                     </div>
//                     <div className="cod-pcm-col">
//                       <label className="cod-label">Level</label>
//                       {!pcmTopicSel
//                         ? <div className="cod-bc-empty">Select PCM topic first</div>
//                         : <div className="cod-bc-list">
//                             {pcmLevels.map(l => {
//                               const exists = pcmCombos.some(c =>
//                                 c.pcm_subject_id === pcmSubjectSel?.pcm_subject_id &&
//                                 c.pcm_topic_id   === pcmTopicSel?.value &&
//                                 c.pcm_level_id   === l.value
//                               );
//                               return (
//                                 <div key={l.value}
//                                   className={`cod-bc-item ${!exists ? "cod-bc-item-disabled" : ""} ${pcmLevelSel?.value === l.value ? "selected" : ""}`}
//                                   onClick={() => {
//                                     if (!exists) return;
//                                     setPcmLevelSel(l);
//                                     const combo = pcmCombos.find(c =>
//                                       c.pcm_subject_id === pcmSubjectSel.pcm_subject_id &&
//                                       c.pcm_topic_id   === pcmTopicSel.value &&
//                                       c.pcm_level_id   === l.value
//                                     );
//                                     if (combo) {
//                                       setBatchConfig(p => ({ ...p, pcm_combination_id: combo.id }));
//                                       showAlert(`✅ PCM: ${pcmSubjectSel.name} › ${pcmTopicSel.label} › ${l.label}`, "success");
//                                     }
//                                   }}>
//                                   {l.label}
//                                   {!exists && <span className="cod-bc-no-combo"> (no combo)</span>}
//                                 </div>
//                               );
//                             })}
//                           </div>
//                       }
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Summary */}
//               {batchConfig.subject_id && batchConfig.topic_id && batchConfig.sub_topic_id && batchConfig.pcm_combination_id && (
//                 <div className="cod-bc-summary">
//                   {[
//                     { label: "Subject",   val: selSubject?.name,  id: batchConfig.subject_id },
//                     { label: "Topic",     val: selTopic?.name,    id: batchConfig.topic_id },
//                     { label: "Sub Topic", val: selSubTopic?.name, id: batchConfig.sub_topic_id },
//                     { label: "PCM Combo", val: `${pcmSubjectSel?.name} › ${pcmTopicSel?.label} › ${pcmLevelSel?.label}`, id: batchConfig.pcm_combination_id },
//                   ].map(row => (
//                     <div key={row.label} className="cod-bc-summary-row">
//                       <span className="cod-bc-summary-label">{row.label}</span>
//                       <span className="cod-bc-summary-val">{row.val}</span>
//                       <code className="cod-bc-summary-id">{row.id?.slice(0,8)}…</code>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </>
//           )}

//           {/* Difficulty */}
//           <div className="cod-difficulty-selector">
//             <label className="cod-label">Manual Difficulty <span className="cod-required">*</span></label>
//             <div className="cod-diff-buttons">
//               {["Easy","Medium","Hard"].map(d => (
//                 <button key={d} type="button"
//                   onClick={() => setBatchConfig(p => ({ ...p, manual_difficulty: d }))}
//                   className={`cod-diff-btn cod-diff-btn-${d.toLowerCase()} ${batchConfig.manual_difficulty === d ? "active" : ""}`}>
//                   {d}
//                 </button>
//               ))}
//             </div>
//             <p className="cod-diff-note">Sets the question-level difficulty sent to the API.</p>
//           </div>

//           <button
//             onClick={() => {
//               if (!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id)
//                 { showAlert("Select Subject, Topic and Sub Topic", "danger"); return; }
//               if (!batchConfig.pcm_combination_id)
//                 { showAlert("Select a PCM Combination", "danger"); return; }
//               setUI("qb-select");
//             }}
//             disabled={!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id || !batchConfig.pcm_combination_id}
//             className={`cod-button cod-button-primary ${(!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id || !batchConfig.pcm_combination_id) ? "cod-button-disabled" : ""}`}
//           >
//             Next → Select Question Bank
//           </button>
//         </div>
//       )}

//       {/* ══════════════════════════════════════
//           QB SELECT (Create or Search)
//       ══════════════════════════════════════ */}
//       {ui === "qb-select" && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div>
//               <PlatformBadge />
//               <h3 className="cod-title">📚 Question Bank</h3>
//               <p className="cod-subtitle">Create a new QB or select an existing one</p>
//             </div>
//             <div className="cod-header-actions">
//               <button onClick={() => setUI("batch-config")} className="cod-button cod-button-secondary cod-button-small">← Back</button>
//               <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">← Platforms</button>
//               <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>

//           {/* Mode toggle */}
//           <div style={{ display:"flex", gap:8, marginBottom:24, padding:4, background:"#f1f3f5", borderRadius:12 }}>
//             {[
//               { key:"create", label:"➕ Create New QB" },
//               { key:"search", label:"🔍 Search Existing QB" },
//             ].map(m => (
//               <button key={m.key} onClick={() => { setQbMode(m.key); setQbSearchResults([]); }}
//                 style={{
//                   flex:1, padding:"12px 20px",
//                   background: qbMode === m.key ? "white" : "transparent",
//                   border:"none", borderRadius:10,
//                   color: qbMode === m.key ? platform.color : "#868e96",
//                   fontSize:14, fontWeight:700, cursor:"pointer",
//                   boxShadow: qbMode === m.key ? "0 2px 10px rgba(0,0,0,0.10)" : "none",
//                   transition:"all 0.2s",
//                 }}
//               >{m.label}</button>
//             ))}
//           </div>

//           {/* ── Create ── */}
//           {qbMode === "create" && (
//             <div>
//               <div className="cod-form-group">
//                 <label className="cod-label">Question Bank Name <span className="cod-required">*</span></label>
//                 <input type="text" value={qbName} onChange={e => setQbName(e.target.value)}
//                   placeholder="Enter QB name..." className="cod-input" />
//               </div>
//               <div className="cod-form-group">
//                 <label className="cod-label">QB Code <span style={{ fontWeight:500, textTransform:"none", letterSpacing:0, color:"#9ca3af" }}>(optional)</span></label>
//                 <input type="text" value={qbCode} onChange={e => setQbCode(e.target.value)}
//                   placeholder="Enter QB code..." className="cod-input" />
//               </div>
//               <div className="cod-form-group">
//                 <label className="cod-label">Description <span style={{ fontWeight:500, textTransform:"none", letterSpacing:0, color:"#9ca3af" }}>(optional)</span></label>
//                 <textarea value={qbDescription} onChange={e => setQbDescription(e.target.value)}
//                   placeholder="Enter description..." className="cod-input"
//                   rows={2} style={{ resize:"vertical", minHeight:60 }} />
//               </div>
//               <div className="cod-form-group">
//                 <label className="cod-label">Department <span className="cod-required">*</span></label>
//                 <input type="text" value={deptSearch} onChange={e => setDeptSearch(e.target.value)}
//                   placeholder="🔍 Search department..." className="cod-input cod-search-input" />
//                 <div className="cod-bc-list" style={{ marginTop:8 }}>
//                   {filteredDepts.slice(0, 10).map((dept, idx) => {
//                     const isSel = selectedDepts.some(d => d.value === dept.value);
//                     return (
//                       <div key={idx}
//                         className={`cod-bc-item ${isSel ? "selected" : ""}`}
//                         style={{ display:"flex", alignItems:"center", gap:10 }}
//                         onClick={() => setSelectedDepts(prev =>
//                           isSel ? prev.filter(d => d.value !== dept.value) : [...prev, dept]
//                         )}
//                       >
//                         <input type="checkbox" checked={isSel} onChange={() => {}} style={{ width:15, height:15, flexShrink:0 }} />
//                         <span>{dept.label}</span>
//                       </div>
//                     );
//                   })}
//                   {filteredDepts.length === 0 && <div className="cod-bc-empty">No departments found</div>}
//                   {filteredDepts.length > 10 && (
//                     <div style={{ padding:"8px 12px", fontSize:12, color:"#9ca3af" }}>
//                       +{filteredDepts.length - 10} more — keep typing to filter
//                     </div>
//                   )}
//                 </div>
//                 {/* Selected dept chips */}
//                 {selectedDepts.length > 0 && (
//                   <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
//                     {selectedDepts.map(dept => (
//                       <div key={dept.value} style={{
//                         display:"inline-flex", alignItems:"center", gap:6,
//                         background:`${platform.color}12`,
//                         border:`1px solid ${platform.color}30`,
//                         borderRadius:20, padding:"4px 10px",
//                         fontSize:12, fontWeight:700, color:platform.color,
//                       }}>
//                         <span>{dept.label}</span>
//                         <button onClick={() => setSelectedDepts(prev => prev.filter(d => d.value !== dept.value))}
//                           style={{ background:"none", border:"none", cursor:"pointer", color:platform.color, fontSize:14, padding:0, lineHeight:1 }}>
//                           ×
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//               <button
//                 onClick={createQB}
//                 disabled={!qbName.trim() || selectedDepts.length === 0}
//                 className={`cod-button cod-button-success ${(!qbName.trim() || selectedDepts.length === 0) ? "cod-button-disabled" : ""}`}
//               >
//                 🔨 Create Question Bank & Continue
//               </button>
//             </div>
//           )}

//           {/* ── Search ── */}
//           {qbMode === "search" && (
//             <div>
//               {activeQB && (
//                 <div className="cod-selected-qb-banner">
//                   <span className="cod-selected-qb-icon">✅</span>
//                   <div style={{ flex:1 }}>
//                     <div className="cod-selected-qb-name">{activeQB.qb_name}</div>
//                     <div className="cod-selected-qb-id">{activeQB.qb_id}</div>
//                   </div>
//                   <button onClick={() => setUI("upload")} className="cod-button cod-button-success cod-button-small">Continue →</button>
//                 </div>
//               )}
//               <div className="cod-search-row">
//                 <input type="text" value={qbSearchTerm}
//                   onChange={e => setQbSearchTerm(e.target.value)}
//                   onKeyDown={e => e.key === "Enter" && searchQBs()}
//                   placeholder="Search question bank by name..." className="cod-input" />
//                 <button onClick={searchQBs} disabled={!qbSearchTerm.trim()}
//                   className={`cod-button cod-button-primary cod-button-small ${!qbSearchTerm.trim() ? "cod-button-disabled" : ""}`}>
//                   🔍 Search
//                 </button>
//               </div>
//               {qbSearchResults.length > 0 && (
//                 <div className="cod-qb-results">
//                   <div className="cod-results-title">{qbSearchResults.length} result(s)</div>
//                   <div className="cod-qb-list">
//                     {qbSearchResults.map((qb, i) => (
//                       <div key={i} className="cod-qb-item">
//                         <div className="cod-qb-info">
//                           <div className="cod-qb-name">{qb.qb_name}</div>
//                           <div className="cod-qb-meta">
//                             <span>{qb.questionCount || 0} questions</span>
//                             <span>•</span>
//                             <span className="cod-qb-id-pill">{qb.qb_id.slice(0,8)}…</span>
//                           </div>
//                         </div>
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

//       {/* ══════════════════════════════════════
//           UPLOAD
//       ══════════════════════════════════════ */}
//       {ui === "upload" && activeQB && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div>
//               <PlatformBadge />
//               <h3 className="cod-title">⚡ COD Sync — Paste & Upload</h3>
//               <p className="cod-subtitle">
//                 📚 <strong>{activeQB.qb_name}</strong>
//                 <span className="cod-qb-id-inline"> · {activeQB.qb_id.slice(0,8)}…</span>
//               </p>
//             </div>
//             <div className="cod-header-actions">
//               <button onClick={() => setUI("qb-select")} className="cod-button cod-button-secondary cod-button-small">← QB</button>
//               <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">← Platforms</button>
//               <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>

//           {/* Format selector — replaces old <details> */}
//           <FormatSelector />

//           {/* Paste area */}
//           <div className="cod-paste-area">
//             <div className="cod-paste-header">
//               <label className="cod-label">
//                 Paste AI output here
//                 {pasteInput && (
//                   <span className="cod-label-count">
//                     &nbsp;·&nbsp;{(pasteInput.match(/---QUESTION---/gi)||[]).length} block(s) detected
//                   </span>
//                 )}
//               </label>
//               {pasteInput && (
//                 <button onClick={() => { setPasteInput(""); setParsedQuestions([]); }}
//                   className="cod-button cod-button-secondary cod-button-small">🗑 Clear</button>
//               )}
//             </div>
//             <textarea value={pasteInput} onChange={e => setPasteInput(e.target.value)}
//               placeholder={"Paste the ---QUESTION--- ... ---END--- block(s) from AI here.\nMultiple questions supported."}
//               className="cod-paste-textarea" spellCheck={false} />
//           </div>

//           <button onClick={handleParse} disabled={!pasteInput.trim()}
//             className={`cod-button cod-button-primary ${!pasteInput.trim() ? "cod-button-disabled" : ""}`}>
//             🔍 Parse & Validate
//           </button>

//           {/* Parsed list */}
//           {parsedQuestions.length > 0 && (
//             <div className="cod-parsed-section">
//               <div className="cod-parsed-header">
//                 <h4 className="cod-parsed-title">✅ {parsedQuestions.length} question(s) ready</h4>
//                 <button onClick={() => { setPreviewIndex(0); setShowPreview(true); }}
//                   className="cod-button cod-button-info cod-button-small">👁 Preview All</button>
//               </div>
//               <div className="cod-parsed-list">
//                 {parsedQuestions.map((q, i) => (
//                   <div key={i} className="cod-parsed-item">
//                     <span className="cod-parsed-num">Q{i+1}</span>
//                     <span className="cod-parsed-qtitle">{q.title}</span>
//                     <span className="cod-parsed-langs">
//                       {q.languages.map(l => <span key={l} className="cod-lang-pill">{l}</span>)}
//                     </span>
//                     <span className={`cod-diff-pill cod-diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
//                     <span className="cod-parsed-tc">{q.testcases.length} TCs</span>
//                   </div>
//                 ))}
//               </div>
//               <button onClick={uploadQuestions} disabled={isLoading}
//                 className={`cod-button cod-button-success ${isLoading ? "cod-button-disabled" : ""}`}>
//                 {isLoading
//                   ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}…`
//                   : `🚀 Upload ${parsedQuestions.length} Question(s) → "${activeQB.qb_name}"`}
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ══════════════════════════════════════
//           RESULTS
//       ══════════════════════════════════════ */}
//       {ui === "results" && uploadResults && (
//         <div className="cod-card">
//           <div className="cod-result-section">
//             <div className="cod-result-icon">{uploadResults.failed === 0 ? "🎉" : "⚠️"}</div>
//             <h3 className="cod-result-title">Upload Complete</h3>

//             <div className="cod-result-stats">
//               <div className="cod-stat-card cod-stat-info">
//                 <div className="cod-stat-icon">📊</div>
//                 <div className="cod-stat-content">
//                   <div className="cod-stat-value">{uploadResults.total}</div>
//                   <div className="cod-stat-label">Total</div>
//                 </div>
//               </div>
//               <div className="cod-stat-card cod-stat-success">
//                 <div className="cod-stat-icon">✅</div>
//                 <div className="cod-stat-content">
//                   <div className="cod-stat-value">{uploadResults.success}</div>
//                   <div className="cod-stat-label">Uploaded</div>
//                 </div>
//               </div>
//               {uploadResults.failed > 0 && (
//                 <div className="cod-stat-card cod-stat-error">
//                   <div className="cod-stat-icon">❌</div>
//                   <div className="cod-stat-content">
//                     <div className="cod-stat-value">{uploadResults.failed}</div>
//                     <div className="cod-stat-label">Failed</div>
//                   </div>
//                 </div>
//               )}
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
//               <button onClick={() => { resetAll(); setUI("batch-config"); }} className="cod-button cod-button-secondary">⚙️ New Batch</button>
//               <button onClick={onBack}                                       className="cod-button cod-button-secondary">← Platforms</button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

//correct above

// CODSyncPlatform.jsx  — updated with Single-file / Multi-file mode toggle
// Imports the multifile helpers from CODSyncMultifile.jsx
// All original single-file logic is untouched.

import { useState, useEffect } from "react";
import "./CODSync.css";
import {
  QuestionTypePill,
  MultifileUploadSection,
  parseMultifileQuestions,   // exported but unused here directly
  buildMultifilePayload,     // exported but unused here directly
  MULTIFILE_LANGUAGES,       // exported for reference
} from "./CODSyncMultifile";

const API = "https://api.examly.io";
import headerFooterTxt      from "../../public/templates/format_code_snippet_header_footer.txt?raw";
import codeStubTxt          from "../../public/templates/format_code_stub.txt?raw";
import multiLanguageTxt     from "../../public/templates/format_multi_language.txt?raw";
import snippetWithStubTxt   from "../../public/templates/format_snippet_with_stub.txt?raw";
import snippetStubWlBlTxt   from "../../public/templates/format_snippet_stub_whitelist_blacklist.txt?raw";

const FORMAT_TEMPLATES = [
  {
    id: "header-footer",
    icon: "📎",
    label: "Code Snippet",
    sub: "Header + Footer",
    color: "#6366f1",
    colorDim: "rgba(99,102,241,0.08)",
    colorBorder: "rgba(99,102,241,0.2)",
    filename: "format_code_snippet_header_footer.txt",
    content: headerFooterTxt,
  },
  {
    id: "code-stub",
    icon: "✏️",
    label: "Code Stub",
    sub: "Buggy starter code",
    color: "#10b981",
    colorDim: "rgba(16,185,129,0.08)",
    colorBorder: "rgba(16,185,129,0.2)",
    filename: "format_code_stub.txt",
    content: codeStubTxt,
  },
  {
    id: "multi-language",
    icon: "🌐",
    label: "Multi Language",
    sub: "C,Java,C++,Python,...",
    color: "#f59e0b",
    colorDim: "rgba(245,158,11,0.08)",
    colorBorder: "rgba(245,158,11,0.2)",
    filename: "format_multi_language.txt",
    content: multiLanguageTxt,
  },
  {
    id: "snippet-stub",
    icon: "🔧",
    label: "Snippet + Stub",
    sub: "Header · Footer · Buggy body",
    color: "#8b5cf6",
    colorDim: "rgba(139,92,246,0.08)",
    colorBorder: "rgba(139,92,246,0.2)",
    filename: "format_snippet_with_stub.txt",
    content: snippetWithStubTxt,
  },
  {
    id: "snippet-stub-wl-bl",
    icon: "🛡️",
    label: "Snippet + Stub + WL/BL",
    sub: "Header · Footer · Stub · Whitelist · Blacklist",
    color: "#ef4444",
    colorDim: "rgba(239,68,68,0.08)",
    colorBorder: "rgba(239,68,68,0.2)",
    filename: "format_snippet_stub_whitelist_blacklist.txt",
    content: snippetStubWlBlTxt,
  },
];

// ─── FORMAT SELECTOR (single-file) ───────────────────────────────────────────
function FormatSelector() {
  const [downloading, setDownloading] = useState(null);

  const handleDownload = (fmt) => {
    setDownloading(fmt.id);
    const blob = new Blob([fmt.content], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = fmt.filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setTimeout(() => setDownloading(null), 1200);
  };

  return (
    <div style={{
      background: "#f8f9fc",
      border: "1.5px solid #e4e7f0",
      borderRadius: 16,
      padding: "18px 20px",
      marginBottom: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0,
        }}>📋</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
            Sample Format Templates
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginTop: 1 }}>
            Select a format to download its template .txt file
          </div>
        </div>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
        gap: 10,
      }}>
        {FORMAT_TEMPLATES.map(fmt => {
          const isDl = downloading === fmt.id;
          return (
            <button
              key={fmt.id}
              onClick={() => handleDownload(fmt)}
              style={{
                background: isDl ? fmt.colorDim : "#ffffff",
                border: `1.5px solid ${isDl ? fmt.color : "#e4e7f0"}`,
                borderRadius: 12, padding: "13px 14px",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.2s ease",
                display: "flex", flexDirection: "column", gap: 6,
                position: "relative", overflow: "hidden",
                boxShadow: isDl ? `0 4px 14px ${fmt.colorBorder}` : "0 1px 3px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={e => {
                if (!isDl) {
                  e.currentTarget.style.border = `1.5px solid ${fmt.color}`;
                  e.currentTarget.style.background = fmt.colorDim;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 6px 18px ${fmt.colorBorder}`;
                }
              }}
              onMouseLeave={e => {
                if (!isDl) {
                  e.currentTarget.style.border = "1.5px solid #e4e7f0";
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
                }
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: fmt.color, borderRadius: "12px 0 0 12px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingLeft: 6 }}>
                <span style={{ fontSize: 20 }}>{fmt.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  color: isDl ? fmt.color : "#9ca3af",
                  background: isDl ? fmt.colorDim : "#f3f4f6",
                  border: `1px solid ${isDl ? fmt.colorBorder : "transparent"}`,
                  padding: "2px 7px", borderRadius: 20,
                  transition: "all 0.2s",
                  fontFamily: "monospace",
                }}>
                  {isDl ? "✓ saved" : "↓ .txt"}
                </span>
              </div>
              <div style={{ paddingLeft: 6 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
                  {fmt.label}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: fmt.color, marginTop: 2, lineHeight: 1.3 }}>
                  {fmt.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{
        marginTop: 12, padding: "8px 12px",
        background: "rgba(99,102,241,0.06)",
        border: "1px solid rgba(99,102,241,0.15)",
        borderRadius: 8, fontSize: 11, color: "#6366f1", fontWeight: 600,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span>💡</span>
        <span>Each template includes format rules, field guide and a working example question.</span>
      </div>
    </div>
  );
}

// ─── PARSER (single-file — unchanged) ────────────────────────────────────────
function parseQuestions(raw) {
  const errors = [];
  const questions = [];

  const blocks = raw
    .split(/---QUESTION---/i)
    .map(b => b.split(/---END---/i)[0])
    .filter(b => b.trim().length > 0);

  if (blocks.length === 0) {
    errors.push("No ---QUESTION--- blocks found. Check the format.");
    return { questions, errors };
  }

  const HEADER_RE = /^(TITLE|DIFFICULTY|LANGUAGE|TAGS|DESCRIPTION|INPUT_FORMAT|OUTPUT_FORMAT|CONSTRAINTS|CODE_STUB\[[^\]]+\]|SOLUTION\[[^\]]+\]|HEADER\[[^\]]+\]|FOOTER\[[^\]]+\]|WHITELIST\[[^\]]+\]|BLACKLIST\[[^\]]+\]|TESTCASE|SAMPLE_IO)\s*:/i;

  blocks.forEach((block, bi) => {
    const qNum = bi + 1;
    const qErrors = [];
    const lines = block.split("\n");
    const segments = {};
    let currentKey = null;
    let currentLines = [];

    const flushCurrent = () => {
      if (currentKey !== null) segments[currentKey] = currentLines.join("\n").trim();
    };

    lines.forEach(line => {
      const m = line.match(/^([A-Z_]+(?:\[[^\]]+\])?)\s*:\s*(.*)/i);
      if (m && HEADER_RE.test(line)) {
        flushCurrent();
        const bracketM = m[1].match(/^([A-Z_]+)\[([^\]]+)\]$/i);
        currentKey = bracketM
          ? bracketM[1].toUpperCase() + "[" + bracketM[2] + "]"
          : m[1].toUpperCase();
        currentLines = m[2].trim() ? [m[2].trim()] : [];
        return;
      }
      if (currentKey !== null) currentLines.push(line);
    });
    flushCurrent();

    const get = k => segments[k.toUpperCase()] || null;
    const getLangMap = prefix => {
      const result = {};
      Object.keys(segments).forEach(k => {
        const m = k.match(new RegExp(`^${prefix}\\[(.+)\\]$`, "i"));
        if (m) result[m[1]] = segments[k];
      });
      return result;
    };
    const unescape = s => s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

    const getTestcases = () => {
      const allLines = [];
      lines.forEach(line => {
        if (/^TESTCASE\s*:/i.test(line))
          allLines.push(line.replace(/^TESTCASE\s*:\s*/i, "").trim());
      });
      return allLines.filter(l => l.length > 0).map(val => {
        const parts = val.split("|").map(p => p.trim());
        const rawOut = unescape(parts[1] || "");
        const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
        return {
          input: unescape(parts[0] || ""), output,
          difficulty: parts[2]?.trim() || "Medium",
          score: parseInt(parts[3]) || 30,
          memBytes: "512", timeBytes: 200,
          timeLimit: null, outputLimit: null, memoryLimit: null,
        };
      });
    };

    const getSampleIO = () => {
      const allLines = [];
      lines.forEach(line => {
        if (/^SAMPLE_IO\s*:/i.test(line))
          allLines.push(line.replace(/^SAMPLE_IO\s*:\s*/i, "").trim());
      });
      return allLines.filter(l => l.length > 0).map(val => {
        const parts = val.split("|").map(p => p.trim());
        const rawOut = unescape(parts[1] || "");
        const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
        return {
          input: unescape(parts[0] || ""), output,
          memBytes: "512", timeBytes: 200,
          sample: "Yes", difficulty: " - ", score: " - ",
          timeLimit: null, outputLimit: null, memoryLimit: null,
        };
      });
    };

    const title       = get("TITLE");
    const difficulty  = get("DIFFICULTY");
    const langRaw     = get("LANGUAGE");
    const tagsRaw     = get("TAGS");
    const description = get("DESCRIPTION");
    const inputFmt    = get("INPUT_FORMAT");
    const outputFmt   = get("OUTPUT_FORMAT");
    const constraints = get("CONSTRAINTS");
    const codeStubs   = getLangMap("CODE_STUB");
    const solutions   = getLangMap("SOLUTION");
    const headers     = getLangMap("HEADER");
    const footers     = getLangMap("FOOTER");
    const whitelists  = getLangMap("WHITELIST");
    const blacklists  = getLangMap("BLACKLIST");
    const testcases   = getTestcases();
    const sampleIO    = getSampleIO();

    if (!title)       qErrors.push(`Q${qNum}: Missing TITLE`);
    if (!difficulty || !["Easy","Medium","Hard"].includes(difficulty))
      qErrors.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard`);
    if (!langRaw)     qErrors.push(`Q${qNum}: Missing LANGUAGE`);
    if (!description) qErrors.push(`Q${qNum}: Missing DESCRIPTION`);
    if (!inputFmt)    qErrors.push(`Q${qNum}: Missing INPUT_FORMAT`);
    if (!outputFmt)   qErrors.push(`Q${qNum}: Missing OUTPUT_FORMAT`);
    if (testcases.length === 0) qErrors.push(`Q${qNum}: No TESTCASE lines found`);
    if (Object.keys(solutions).length === 0)
      qErrors.push(`Q${qNum}: No SOLUTION[Language] block found`);

    if (qErrors.length > 0) errors.push(...qErrors);
    else questions.push({
      title, difficulty,
      languages: langRaw.split(",").map(l => l.trim()).filter(Boolean),
      tags: tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [""],
      description, inputFmt, outputFmt,
      constraints: constraints || "",
      codeStubs, solutions, headers, footers, whitelists, blacklists,
      testcases, sampleIO,
    });
  });

  return { questions, errors };
}

// ─── SINGLE-FILE PAYLOAD BUILDER (unchanged) ──────────────────────────────────
function buildPayload(q, batchConfig, qbId, userId) {
  const wrapHtml = text => {
    if (!text) return "";
    if (/^<(p|ul|ol|div|h[1-6]|br|b|strong|em|span|table)\b/i.test(text.trim())) return text;
    const esc = s => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return text.split(/\n\n+/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  };

  const anySnippet = q.languages.some(lang => !!(q.headers?.[lang] || q.footers?.[lang]));

  const solutionArray = q.languages.map(lang => {
    const header = q.headers?.[lang] || null;
    const footer = q.footers?.[lang] || null;
    const parseList = raw => {
      if (!raw?.trim()) return [];
      return raw.split(",").map(v => v.trim()).filter(Boolean).map(v => ({ list: [v] }));
    };
    return {
      language: lang, codeStub: q.codeStubs[lang] || "",
      hasSnippet: anySnippet,
      ...(header ? { header } : {}),
      ...(footer ? { footer } : {}),
      ...(parseList(q.whitelists?.[lang]).length ? { whitelist: parseList(q.whitelists?.[lang]) } : {}),
      ...(parseList(q.blacklists?.[lang]).length ? { blacklist: parseList(q.blacklists?.[lang]) } : {}),
      solutiondata: q.solutions[lang] ? [{
        solution: q.solutions[lang], solutionbest: true,
        isSolutionExp: false, solutionExp: null, solutionDebug: null,
      }] : [],
      hideHeader: false, hideFooter: false,
    };
  });

  return {
    question_type: "programming",
    question_data: wrapHtml(q.description),
    question_editor_type: 1,
    multilanguage: q.languages,
    inputformat: wrapHtml(q.inputFmt),
    outputformat: wrapHtml(q.outputFmt),
    enablecustominput: true,
    line_token_evaluation: false,
    codeconstraints: wrapHtml(q.constraints),
    timelimit: null, memorylimit: null, codesize: null,
    setLimit: false, enable_api: false, outputLimit: null,
    subject_id: batchConfig.subject_id || null,
    blooms_taxonomy: null, course_outcome: null, program_outcome: null,
    hint: [],
    manual_difficulty: batchConfig.manual_difficulty || q.difficulty,
    solution: solutionArray,
    testcases: q.testcases,
    topic_id: batchConfig.topic_id || null,
    sub_topic_id: batchConfig.sub_topic_id || null,
    linked_concepts: "",
    tags: q.tags,
    sample_io: JSON.stringify(q.sampleIO),
    question_media: [],
    pcm_combination_ids: batchConfig.pcm_combination_id ? [batchConfig.pcm_combination_id] : [],
    qb_id: qbId,
    createdBy: userId,
  };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CODSyncPlatform({ platform, onBack }) {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(platform.tokenKey) || ""; } catch { return ""; }
  });
  const [ui, setUI] = useState(() =>
    localStorage.getItem(platform.tokenKey) ? "batch-config" : "welcome"
  );
  const [tokenInput, setTokenInput] = useState("");

  // ── Batch Config ──────────────────────────────────────────────────────────
  const [batchConfig, setBatchConfig] = useState({
    topic_id: "", sub_topic_id: "", subject_id: "",
    pcm_combination_id: "", manual_difficulty: "Medium",
  });
  const [bcLoading, setBcLoading]         = useState(false);
  const [allSubjects, setAllSubjects]     = useState([]);
  const [allTopics, setAllTopics]         = useState([]);
  const [allSubTopics, setAllSubTopics]   = useState([]);
  const [subTopicSearch, setSubTopicSearch]   = useState("");
  const [subTopicFocused, setSubTopicFocused] = useState(false);
  const [selSubject, setSelSubject]   = useState(null);
  const [selTopic, setSelTopic]       = useState(null);
  const [selSubTopic, setSelSubTopic] = useState(null);
  const [pcmValues, setPcmValues] = useState([]);
  const [pcmCombos, setPcmCombos] = useState([]);
  const [pcmLevels, setPcmLevels] = useState([]);
  const [pcmSubjectSel, setPcmSubjectSel]       = useState(null);
  const [pcmTopicSel, setPcmTopicSel]           = useState(null);
  const [pcmLevelSel, setPcmLevelSel]           = useState(null);
  const [pcmSubjectSearch, setPcmSubjectSearch] = useState("");
  const [pcmTopicSearch, setPcmTopicSearch]     = useState("");

  // ── QB Step ───────────────────────────────────────────────────────────────
  const [qbMode, setQbMode] = useState("create");
  const [qbName, setQbName]               = useState("");
  const [qbCode, setQbCode]               = useState("");
  const [qbDescription, setQbDescription] = useState("");
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [deptSearch, setDeptSearch]       = useState("");
  const [qbSearchTerm, setQbSearchTerm]       = useState("");
  const [qbSearchResults, setQbSearchResults] = useState([]);
  const [activeQB, setActiveQB] = useState(null);

  // ── Upload (single-file) ──────────────────────────────────────────────────
  const [pasteInput, setPasteInput]           = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [previewIndex, setPreviewIndex]       = useState(0);
  const [showPreview, setShowPreview]         = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [uploadProgress, setUploadProgress]   = useState({ current: 0, total: 0 });
  const [uploadResults, setUploadResults]     = useState(null);

  // ── Question type mode toggle ─────────────────────────────────────────────
  const [questionTypeMode, setQuestionTypeMode] = useState("single"); // "single" | "multifile"

  // ── UI helpers ────────────────────────────────────────────────────────────
  const [alert, setAlert]         = useState(null);
  const [overlay, setOverlay]     = useState(false);
  const [overlayText, setOverlayText] = useState("");

  const BATCH_SIZE = 3;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const showAlert = (msg, type = "warning") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 5000);
  };
  const showOverlay = msg => { setOverlayText(msg); setOverlay(true); };
  const hideOverlay = () => setOverlay(false);
  const getHeaders  = () => ({ "Content-Type": "application/json", Authorization: token });

  const filteredDepts = (platform.bdIdOptions || []).filter(d =>
    d.label.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const PlatformBadge = () => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: `${platform.color}12`,
      border: `1px solid ${platform.color}30`,
      borderRadius: 12, padding: "3px 12px",
      fontSize: 12, fontWeight: 700,
      color: platform.color, marginBottom: 6,
    }}>
      {platform.icon} {platform.label}
    </span>
  );

  // ── Load batch config ─────────────────────────────────────────────────────
  useEffect(() => {
    if (token && allSubjects.length === 0) loadBcData(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadBcData = async tok => {
    if (allSubjects.length > 0) return;
    setBcLoading(true);
    const h = { "Content-Type": "application/json", Authorization: tok };
    try {
      const [subRes, pcmValRes, pcmComboRes] = await Promise.all([
        fetch(`${API}/api/questiondomain/getallsubjects`, { headers: h }),
        fetch(`${API}/api/pcm/getallpcmvalues`,           { headers: h }),
        fetch(`${API}/api/pcm/getallpcmcombinations`,     { headers: h }),
      ]);
      const subData      = await subRes.json();
      const pcmValData   = await pcmValRes.json();
      const pcmComboData = await pcmComboRes.json();

      if (subData?.statusCode === 200) {
        setAllSubjects(subData.data.subject || []);
        setAllTopics(subData.data.topic || []);
        setAllSubTopics((subData.data.sub_topic || []).map(st => ({
          ...st,
          name: st.name || st.sub_topic_name || st.subtopic_name || st.label || "(unnamed)",
        })));
      }
      if (pcmValData?.success) {
        setPcmValues(pcmValData.data  || []);
        setPcmLevels(pcmValData.level || []);
      }
      if (pcmComboData?.success) setPcmCombos(pcmComboData.data || []);
    } catch (err) {
      showAlert("Failed to load config data: " + err.message, "danger");
    } finally {
      setBcLoading(false);
    }
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const saveToken = () => {
    if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
    const tok = tokenInput.trim();
    try {
      localStorage.setItem(platform.tokenKey, tok);
      setToken(tok); setTokenInput("");
      setUI("batch-config");
      showAlert("Token saved! Loading config data...", "success");
      loadBcData(tok);
    } catch (err) { showAlert("Failed: " + err.message, "danger"); }
  };

  const clearToken = () => {
    try { localStorage.removeItem(platform.tokenKey); } catch {}
    setToken(""); setUI("welcome"); resetAll();
    showAlert("Logged out", "danger");
  };

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetAll = () => {
    setBatchConfig({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"", manual_difficulty:"Medium" });
    setSelSubject(null); setSelTopic(null); setSelSubTopic(null);
    setPcmSubjectSel(null); setPcmTopicSel(null); setPcmLevelSel(null);
    setSubTopicSearch(""); setPcmSubjectSearch(""); setPcmTopicSearch("");
    resetQBStep(); resetUpload();
  };

  const resetQBStep = () => {
    setQbMode("create");
    setQbName(""); setQbCode(""); setQbDescription("");
    setSelectedDepts([]); setDeptSearch("");
    setQbSearchTerm(""); setQbSearchResults([]);
    setActiveQB(null);
  };

  const resetUpload = () => {
    setPasteInput(""); setParsedQuestions([]); setUploadResults(null);
    setUploadProgress({ current: 0, total: 0 });
    setShowPreview(false); setPreviewIndex(0);
  };

  // ── QB: Create ────────────────────────────────────────────────────────────
  const createQB = async () => {
    if (!qbName.trim()) { showAlert("QB Name is required", "danger"); return; }
    if (selectedDepts.length === 0) { showAlert("Select at least one department", "danger"); return; }
    showOverlay("🔨 Creating Question Bank...");
    try {
      const res = await fetch(`${API}/api/questionbank/create`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({
          qb_name: qbName, qb_code: qbCode || null,
          qb_description: qbDescription || null,
          tags: [], b_d_id: selectedDepts,
          departmentChanged: true,
          visibility: "Within Department",
          price: 0, mainDepartmentUser: true,
        }),
      });
      const result = await res.json();
      if (result.statusCode === 200 && result.data.success) {
        const qbData = result.data.data.data;
        setActiveQB({ qb_id: qbData.qb_id, qb_name: qbData.qb_name, createdBy: qbData.createdBy });
        hideOverlay();
        showAlert("✅ Question Bank created!", "success");
        setUI("upload");
      } else throw new Error(result.data?.message || "Failed to create QB");
    } catch (err) { hideOverlay(); showAlert("Error creating QB: " + err.message, "danger"); }
  };

  // ── QB: Search ────────────────────────────────────────────────────────────
  const searchQBs = async () => {
    if (!qbSearchTerm.trim()) { showAlert("Enter a search term", "warning"); return; }
    showOverlay("🔍 Searching...");
    try {
      const res = await fetch(`${API}/api/questionbanks/all`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({
          department_id: platform.departmentIds,
          limit: 50, mainDepartmentUser: true, page: 1, search: qbSearchTerm,
        }),
      });
      const data = await res.json();
      const qbs  = data?.questionbanks || [];
      setQbSearchResults(qbs);
      hideOverlay();
      if (qbs.length === 0) showAlert("No QBs found", "warning");
      else showAlert(`Found ${qbs.length} QB(s)`, "success");
    } catch (err) { hideOverlay(); showAlert("Search error: " + err.message, "danger"); }
  };

  const selectQB = qb => {
    setActiveQB({ qb_id: qb.qb_id, qb_name: qb.qb_name, createdBy: qb.user_id || "system" });
    setQbSearchResults([]);
    showAlert(`QB selected: ${qb.qb_name}`, "success");
    setUI("upload");
  };

  // ── Parse (single-file) ───────────────────────────────────────────────────
  const handleParse = () => {
    if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
    const { questions, errors } = parseQuestions(pasteInput);
    if (errors.length > 0) {
      const preview = errors.slice(0, 6).join("\n");
      const more = errors.length > 6 ? `\n...and ${errors.length - 6} more` : "";
      showAlert(`❌ ${errors.length} error(s):\n\n${preview}${more}`, "danger");
      if (questions.length > 0) setParsedQuestions(questions);
      return;
    }
    setParsedQuestions(questions);
    showAlert(`✅ Parsed ${questions.length} question(s)!`, "success");
  };

  // ── Upload (single-file) ──────────────────────────────────────────────────
  const uploadQuestions = async () => {
    if (parsedQuestions.length === 0) { showAlert("Parse first", "warning"); return; }
    if (!activeQB) { showAlert("No QB selected", "danger"); return; }

    setIsLoading(true);
    showOverlay("🔄 Starting upload...");
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
            const payload = buildPayload(q, batchConfig, activeQB.qb_id, userId);
            const res     = await fetch(`${API}/api/programming_question/create`, {
              method: "POST", headers: getHeaders(), body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
              results.success++;
              results.ids.push({ index: gi + 1, title: q.title, q_id: data.q_id });
            } else throw new Error(data.message || "Upload failed");
          } catch (err) {
            results.failed++;
            results.errors.push({ index: gi + 1, title: q.title, error: err.message });
          }
        }));

        if (i + BATCH_SIZE < parsedQuestions.length) await sleep(400);
      }

      setUploadProgress({ current: parsedQuestions.length, total: parsedQuestions.length });
      setUploadResults(results);
      hideOverlay();
      if (results.failed === 0) showAlert(`🎉 All ${results.success} uploaded!`, "success");
      else showAlert(`⚠️ ${results.success} uploaded, ${results.failed} failed`, "warning");
      setUI("results");
    } catch (err) {
      hideOverlay(); showAlert("Upload error: " + err.message, "danger");
    } finally { setIsLoading(false); }
  };

  const startNewUpload = () => { resetUpload(); setUI("upload"); };
  const currentQ = parsedQuestions[previewIndex];

  // ── Multifile results handler ─────────────────────────────────────────────
  const handleMultifileResults = results => {
    setUploadResults(results);
    setUI("results");
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

      {/* ── Single-file Preview Modal ── */}
      {showPreview && currentQ && questionTypeMode === "single" && (
        <div className="cod-preview-modal" onClick={() => setShowPreview(false)}>
          <div className="cod-preview-modal-content" onClick={e => e.stopPropagation()}>
            <div className="cod-preview-modal-header">
              <h3>Preview — Q{previewIndex + 1} of {parsedQuestions.length}</h3>
              <button className="cod-preview-close" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="cod-preview-modal-body">
              <div className="cod-preview-meta">
                <span className="cod-preview-difficulty">{currentQ.difficulty}</span>
                {currentQ.languages.map(l => <span key={l} className="cod-preview-lang">💻 {l}</span>)}
                {currentQ.tags.filter(t => t).map(t => <span key={t} className="cod-preview-tag">🏷️ {t}</span>)}
              </div>
              <div className="cod-preview-section">
                <h4>Title</h4>
                <p className="cod-preview-title-text">{currentQ.title}</p>
              </div>
              <div className="cod-preview-section">
                <h4>Description</h4>
                <div className="cod-preview-html" dangerouslySetInnerHTML={{ __html: currentQ.description }} />
              </div>
              <div className="cod-preview-2col">
                <div className="cod-preview-section"><h4>Input Format</h4><p>{currentQ.inputFmt}</p></div>
                <div className="cod-preview-section"><h4>Output Format</h4><p>{currentQ.outputFmt}</p></div>
              </div>
              {currentQ.constraints && (
                <div className="cod-preview-section"><h4>Constraints</h4><p>{currentQ.constraints}</p></div>
              )}
              {currentQ.languages.map(lang => (
                <div key={lang} className="cod-preview-lang-block">
                  <div className="cod-preview-lang-header">
                    <span className="cod-lang-pill">{lang}</span>
                    {(currentQ.headers?.[lang] || currentQ.footers?.[lang]) && <span className="cod-snippet-badge">📎 Header/Footer</span>}
                    {currentQ.whitelists?.[lang] && <span className="cod-wl-badge">✅ WL: {currentQ.whitelists[lang]}</span>}
                    {currentQ.blacklists?.[lang] && <span className="cod-bl-badge">🚫 BL: {currentQ.blacklists[lang]}</span>}
                  </div>
                  {currentQ.headers?.[lang]   && <div className="cod-preview-section"><h4>Header</h4><pre className="cod-preview-code"><code>{currentQ.headers[lang]}</code></pre></div>}
                  {currentQ.codeStubs[lang]   && <div className="cod-preview-section"><h4>Code Stub</h4><pre className="cod-preview-code"><code>{currentQ.codeStubs[lang]}</code></pre></div>}
                  {currentQ.footers?.[lang]   && <div className="cod-preview-section"><h4>Footer</h4><pre className="cod-preview-code"><code>{currentQ.footers[lang]}</code></pre></div>}
                  {currentQ.solutions[lang]   && <div className="cod-preview-section"><h4>Solution</h4><pre className="cod-preview-code"><code>{currentQ.solutions[lang]}</code></pre></div>}
                </div>
              ))}
              <div className="cod-preview-section">
                <h4>Test Cases ({currentQ.testcases.length}) + Sample I/O ({currentQ.sampleIO.length})</h4>
                <div className="cod-tc-grid">
                  {currentQ.testcases.slice(0, 5).map((tc, i) => (
                    <div key={i} className="cod-tc-row">
                      <span className="cod-tc-badge">TC{i+1} · {tc.difficulty} · {tc.score}pts</span>
                      <span className="cod-tc-io">In: <code>{tc.input}</code></span>
                      <span className="cod-tc-io">Out: <code>{tc.output.trim()}</code></span>
                    </div>
                  ))}
                  {currentQ.testcases.length > 5 && <div className="cod-tc-more">+{currentQ.testcases.length - 5} more</div>}
                  {currentQ.sampleIO.map((s, i) => (
                    <div key={`s${i}`} className="cod-tc-row cod-tc-sample">
                      <span className="cod-tc-badge cod-tc-badge-sample">Sample {i+1}</span>
                      <span className="cod-tc-io">In: <code>{s.input}</code></span>
                      <span className="cod-tc-io">Out: <code>{s.output.trim()}</code></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="cod-preview-modal-footer">
              <button onClick={() => setPreviewIndex(p => Math.max(0, p-1))} disabled={previewIndex === 0} className="cod-button cod-button-secondary cod-button-small">← Prev</button>
              <span className="cod-preview-counter">{previewIndex+1} / {parsedQuestions.length}</span>
              <button onClick={() => setPreviewIndex(p => Math.min(parsedQuestions.length-1, p+1))} disabled={previewIndex === parsedQuestions.length-1} className="cod-button cod-button-secondary cod-button-small">Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ WELCOME ══════════════════════════════════════ */}
      {ui === "welcome" && (
        <div className="cod-welcome">
          <div style={{ marginBottom: 16 }}><PlatformBadge /></div>
          <div className="cod-welcome-icon">⚡</div>
          <h2 className="cod-welcome-title">COD Sync</h2>
          <p className="cod-welcome-subtitle">Bulk upload AI-generated coding questions to question banks</p>
          <textarea
            value={tokenInput} onChange={e => setTokenInput(e.target.value)}
            placeholder="Paste your Authorization token here..."
            className="cod-token-input"
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={saveToken} className="cod-button cod-button-primary">Save Token & Continue</button>
            <button onClick={onBack}    className="cod-button cod-button-secondary">← Back</button>
          </div>
          <p className="cod-token-hint">💡 Token saved separately per platform</p>
        </div>
      )}

      {/* ══════════════════════════════════════ BATCH CONFIG ══════════════════════════════════════ */}
      {ui === "batch-config" && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <PlatformBadge />
              <h3 className="cod-title">⚙️ Batch Configuration</h3>
              <p className="cod-subtitle">Select Subject → Topic → Sub Topic → PCM Combination</p>
            </div>
            <div className="cod-header-actions">
              {bcLoading && <span className="cod-bc-loading">⏳ Loading...</span>}
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">← Platforms</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          {bcLoading && (
            <div className="cod-bc-autoload">
              <div className="cod-bc-autoload-spinner"></div>
              <span>Loading subjects & PCM data...</span>
            </div>
          )}

          {allSubjects.length > 0 && (
            <>
              <div className="cod-bc-data-info">
                <span>📋 {allSubjects.length} subjects</span><span>·</span>
                <span>🗂 {allTopics.length} topics</span><span>·</span>
                <span>📌 {allSubTopics.length} sub topics</span><span>·</span>
                <span>🔗 {pcmCombos.length} PCM combos</span>
                <button
                  onClick={() => {
                    setBatchConfig({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"", manual_difficulty:"Medium" });
                    setSelSubject(null); setSelTopic(null); setSelSubTopic(null);
                    setPcmSubjectSel(null); setPcmTopicSel(null); setPcmLevelSel(null);
                    setSubTopicSearch(""); setPcmSubjectSearch(""); setPcmTopicSearch("");
                  }}
                  className="cod-button cod-button-secondary cod-button-small"
                >↺ Reset</button>
              </div>

              <div className="cod-bc-sections">
                {/* Sub Topic unified search */}
                <div className="cod-bc-panel">
                  <div className="cod-bc-panel-title">🔍 Search Sub Topic / Topic / Subject <span className="cod-required">*</span></div>
                  <input
                    type="text" value={subTopicSearch}
                    onChange={e => setSubTopicSearch(e.target.value)}
                    placeholder="Search by sub topic, topic, or subject name..."
                    className="cod-input cod-search-input"
                    autoFocus
                    onFocus={() => setSubTopicFocused(true)}
                    onBlur={() => setTimeout(() => setSubTopicFocused(false), 200)}
                  />
                  {(subTopicSearch.trim().length > 0 || subTopicFocused) && allSubTopics.length > 0 && (
                    <div className="cod-bc-list cod-bc-subtopic-list">
                      {(() => {
                        const term = subTopicSearch.toLowerCase().trim();
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
                          : enriched
                        ).slice(0, 50);

                        if (filtered.length === 0)
                          return <div className="cod-bc-empty" style={{border:"none"}}>No results for "{subTopicSearch}"</div>;

                        return filtered.map(({ st, stId, topic, subject }) => (
                          <div key={stId}
                            className={`cod-bc-item cod-bc-subtopic-item ${selSubTopic?.sub_topic_id === stId ? "selected" : ""}`}
                            onClick={() => {
                              setSelSubTopic({ ...st, sub_topic_id: stId });
                              setSelTopic(topic || null);
                              setSelSubject(subject || null);
                              setSubTopicSearch(st.name);
                              setBatchConfig(p => ({
                                ...p, sub_topic_id: stId,
                                topic_id:   topic?.topic_id     || p.topic_id,
                                subject_id: subject?.subject_id || p.subject_id,
                              }));
                            }}
                          >
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
                          <span className="cod-bc-resolved-val">{row.val || <em style={{color:"#f59e0b"}}>not found</em>}</span>
                          <code className="cod-bc-resolved-id">{(row.id||"").slice(0,8)}{row.id?"…":""}</code>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setSelSubTopic(null); setSelTopic(null); setSelSubject(null);
                          setSubTopicSearch("");
                          setBatchConfig(p => ({ ...p, sub_topic_id:"", topic_id:"", subject_id:"" }));
                        }}
                        className="cod-bc-clear-sel"
                      >✕ Clear</button>
                    </div>
                  )}
                </div>

                {/* PCM */}
                <div className="cod-bc-panel cod-bc-panel-pcm">
                  <div className="cod-bc-panel-title">
                    4. PCM Combination <span className="cod-required">*</span>
                    {batchConfig.pcm_combination_id && (
                      <span className="cod-bc-selected-name cod-bc-selected-pcm">
                        {(() => {
                          const combo = pcmCombos.find(c => c.id === batchConfig.pcm_combination_id);
                          if (!combo) return batchConfig.pcm_combination_id.slice(0,8) + "…";
                          const subj  = pcmValues.find(s => s.pcm_subject_id === combo.pcm_subject_id);
                          const topic = subj?.pcm_topic?.find(t => t.value === combo.pcm_topic_id);
                          const level = pcmLevels.find(l => l.value === combo.pcm_level_id);
                          return `${subj?.name||"?"} › ${topic?.label||"?"} › ${level?.label||"?"}`;
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="cod-pcm-selectors">
                    <div className="cod-pcm-col">
                      <label className="cod-label">PCM Subject</label>
                      <input type="text" value={pcmSubjectSearch}
                        onChange={e => { setPcmSubjectSearch(e.target.value); setPcmTopicSel(null); setPcmLevelSel(null); }}
                        placeholder="🔍 Search..." className="cod-input" />
                      <div className="cod-bc-list">
                        {pcmValues.filter(s => s.name.toLowerCase().includes(pcmSubjectSearch.toLowerCase())).map(s => (
                          <div key={s.pcm_subject_id}
                            className={`cod-bc-item ${pcmSubjectSel?.pcm_subject_id === s.pcm_subject_id ? "selected" : ""}`}
                            onClick={() => { setPcmSubjectSel(s); setPcmTopicSel(null); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id:"" })); }}>
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="cod-pcm-col">
                      <label className="cod-label">PCM Topic</label>
                      {!pcmSubjectSel
                        ? <div className="cod-bc-empty">Select PCM subject first</div>
                        : <>
                            <input type="text" value={pcmTopicSearch} onChange={e => setPcmTopicSearch(e.target.value)} placeholder="🔍 Search..." className="cod-input" />
                            <div className="cod-bc-list">
                              {(pcmSubjectSel.pcm_topic || []).filter(t => t.label.toLowerCase().includes(pcmTopicSearch.toLowerCase())).map(t => (
                                <div key={t.value}
                                  className={`cod-bc-item ${pcmTopicSel?.value === t.value ? "selected" : ""}`}
                                  onClick={() => { setPcmTopicSel(t); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id:"" })); }}>
                                  {t.label}
                                </div>
                              ))}
                            </div>
                          </>
                      }
                    </div>
                    <div className="cod-pcm-col">
                      <label className="cod-label">Level</label>
                      {!pcmTopicSel
                        ? <div className="cod-bc-empty">Select PCM topic first</div>
                        : <div className="cod-bc-list">
                            {pcmLevels.map(l => {
                              const exists = pcmCombos.some(c =>
                                c.pcm_subject_id === pcmSubjectSel?.pcm_subject_id &&
                                c.pcm_topic_id   === pcmTopicSel?.value &&
                                c.pcm_level_id   === l.value
                              );
                              return (
                                <div key={l.value}
                                  className={`cod-bc-item ${!exists ? "cod-bc-item-disabled" : ""} ${pcmLevelSel?.value === l.value ? "selected" : ""}`}
                                  onClick={() => {
                                    if (!exists) return;
                                    setPcmLevelSel(l);
                                    const combo = pcmCombos.find(c =>
                                      c.pcm_subject_id === pcmSubjectSel.pcm_subject_id &&
                                      c.pcm_topic_id   === pcmTopicSel.value &&
                                      c.pcm_level_id   === l.value
                                    );
                                    if (combo) {
                                      setBatchConfig(p => ({ ...p, pcm_combination_id: combo.id }));
                                      showAlert(`✅ PCM: ${pcmSubjectSel.name} › ${pcmTopicSel.label} › ${l.label}`, "success");
                                    }
                                  }}>
                                  {l.label}
                                  {!exists && <span className="cod-bc-no-combo"> (no combo)</span>}
                                </div>
                              );
                            })}
                          </div>
                      }
                    </div>
                  </div>
                </div>
              </div>

              {batchConfig.subject_id && batchConfig.topic_id && batchConfig.sub_topic_id && batchConfig.pcm_combination_id && (
                <div className="cod-bc-summary">
                  {[
                    { label: "Subject",   val: selSubject?.name,  id: batchConfig.subject_id },
                    { label: "Topic",     val: selTopic?.name,    id: batchConfig.topic_id },
                    { label: "Sub Topic", val: selSubTopic?.name, id: batchConfig.sub_topic_id },
                    { label: "PCM Combo", val: `${pcmSubjectSel?.name} › ${pcmTopicSel?.label} › ${pcmLevelSel?.label}`, id: batchConfig.pcm_combination_id },
                  ].map(row => (
                    <div key={row.label} className="cod-bc-summary-row">
                      <span className="cod-bc-summary-label">{row.label}</span>
                      <span className="cod-bc-summary-val">{row.val}</span>
                      <code className="cod-bc-summary-id">{row.id?.slice(0,8)}…</code>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="cod-difficulty-selector">
            <label className="cod-label">Manual Difficulty <span className="cod-required">*</span></label>
            <div className="cod-diff-buttons">
              {["Easy","Medium","Hard"].map(d => (
                <button key={d} type="button"
                  onClick={() => setBatchConfig(p => ({ ...p, manual_difficulty: d }))}
                  className={`cod-diff-btn cod-diff-btn-${d.toLowerCase()} ${batchConfig.manual_difficulty === d ? "active" : ""}`}>
                  {d}
                </button>
              ))}
            </div>
            <p className="cod-diff-note">Sets the question-level difficulty sent to the API.</p>
          </div>

          <button
            onClick={() => {
              if (!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id)
                { showAlert("Select Subject, Topic and Sub Topic", "danger"); return; }
              if (!batchConfig.pcm_combination_id)
                { showAlert("Select a PCM Combination", "danger"); return; }
              setUI("qb-select");
            }}
            disabled={!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id || !batchConfig.pcm_combination_id}
            className={`cod-button cod-button-primary ${(!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id || !batchConfig.pcm_combination_id) ? "cod-button-disabled" : ""}`}
          >
            Next → Select Question Bank
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════ QB SELECT ══════════════════════════════════════ */}
      {ui === "qb-select" && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <PlatformBadge />
              <h3 className="cod-title">📚 Question Bank</h3>
              <p className="cod-subtitle">Create a new QB or select an existing one</p>
            </div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("batch-config")} className="cod-button cod-button-secondary cod-button-small">← Back</button>
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">← Platforms</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          <div style={{ display:"flex", gap:8, marginBottom:24, padding:4, background:"#f1f3f5", borderRadius:12 }}>
            {[
              { key:"create", label:"➕ Create New QB" },
              { key:"search", label:"🔍 Search Existing QB" },
            ].map(m => (
              <button key={m.key} onClick={() => { setQbMode(m.key); setQbSearchResults([]); }}
                style={{
                  flex:1, padding:"12px 20px",
                  background: qbMode === m.key ? "white" : "transparent",
                  border:"none", borderRadius:10,
                  color: qbMode === m.key ? platform.color : "#868e96",
                  fontSize:14, fontWeight:700, cursor:"pointer",
                  boxShadow: qbMode === m.key ? "0 2px 10px rgba(0,0,0,0.10)" : "none",
                  transition:"all 0.2s",
                }}
              >{m.label}</button>
            ))}
          </div>

          {qbMode === "create" && (
            <div>
              <div className="cod-form-group">
                <label className="cod-label">Question Bank Name <span className="cod-required">*</span></label>
                <input type="text" value={qbName} onChange={e => setQbName(e.target.value)}
                  placeholder="Enter QB name..." className="cod-input" />
              </div>
              <div className="cod-form-group">
                <label className="cod-label">QB Code <span style={{ fontWeight:500, textTransform:"none", letterSpacing:0, color:"#9ca3af" }}>(optional)</span></label>
                <input type="text" value={qbCode} onChange={e => setQbCode(e.target.value)}
                  placeholder="Enter QB code..." className="cod-input" />
              </div>
              <div className="cod-form-group">
                <label className="cod-label">Description <span style={{ fontWeight:500, textTransform:"none", letterSpacing:0, color:"#9ca3af" }}>(optional)</span></label>
                <textarea value={qbDescription} onChange={e => setQbDescription(e.target.value)}
                  placeholder="Enter description..." className="cod-input"
                  rows={2} style={{ resize:"vertical", minHeight:60 }} />
              </div>
              <div className="cod-form-group">
                <label className="cod-label">Department <span className="cod-required">*</span></label>
                <input type="text" value={deptSearch} onChange={e => setDeptSearch(e.target.value)}
                  placeholder="🔍 Search department..." className="cod-input cod-search-input" />
                <div className="cod-bc-list" style={{ marginTop:8 }}>
                  {filteredDepts.slice(0, 10).map((dept, idx) => {
                    const isSel = selectedDepts.some(d => d.value === dept.value);
                    return (
                      <div key={idx}
                        className={`cod-bc-item ${isSel ? "selected" : ""}`}
                        style={{ display:"flex", alignItems:"center", gap:10 }}
                        onClick={() => setSelectedDepts(prev =>
                          isSel ? prev.filter(d => d.value !== dept.value) : [...prev, dept]
                        )}
                      >
                        <input type="checkbox" checked={isSel} onChange={() => {}} style={{ width:15, height:15, flexShrink:0 }} />
                        <span>{dept.label}</span>
                      </div>
                    );
                  })}
                  {filteredDepts.length === 0 && <div className="cod-bc-empty">No departments found</div>}
                  {filteredDepts.length > 10 && (
                    <div style={{ padding:"8px 12px", fontSize:12, color:"#9ca3af" }}>
                      +{filteredDepts.length - 10} more — keep typing to filter
                    </div>
                  )}
                </div>
                {selectedDepts.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
                    {selectedDepts.map(dept => (
                      <div key={dept.value} style={{
                        display:"inline-flex", alignItems:"center", gap:6,
                        background:`${platform.color}12`,
                        border:`1px solid ${platform.color}30`,
                        borderRadius:20, padding:"4px 10px",
                        fontSize:12, fontWeight:700, color:platform.color,
                      }}>
                        <span>{dept.label}</span>
                        <button onClick={() => setSelectedDepts(prev => prev.filter(d => d.value !== dept.value))}
                          style={{ background:"none", border:"none", cursor:"pointer", color:platform.color, fontSize:14, padding:0, lineHeight:1 }}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={createQB}
                disabled={!qbName.trim() || selectedDepts.length === 0}
                className={`cod-button cod-button-success ${(!qbName.trim() || selectedDepts.length === 0) ? "cod-button-disabled" : ""}`}
              >
                🔨 Create Question Bank & Continue
              </button>
            </div>
          )}

          {qbMode === "search" && (
            <div>
              {activeQB && (
                <div className="cod-selected-qb-banner">
                  <span className="cod-selected-qb-icon">✅</span>
                  <div style={{ flex:1 }}>
                    <div className="cod-selected-qb-name">{activeQB.qb_name}</div>
                    <div className="cod-selected-qb-id">{activeQB.qb_id}</div>
                  </div>
                  <button onClick={() => setUI("upload")} className="cod-button cod-button-success cod-button-small">Continue →</button>
                </div>
              )}
              <div className="cod-search-row">
                <input type="text" value={qbSearchTerm}
                  onChange={e => setQbSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchQBs()}
                  placeholder="Search question bank by name..." className="cod-input" />
                <button onClick={searchQBs} disabled={!qbSearchTerm.trim()}
                  className={`cod-button cod-button-primary cod-button-small ${!qbSearchTerm.trim() ? "cod-button-disabled" : ""}`}>
                  🔍 Search
                </button>
              </div>
              {qbSearchResults.length > 0 && (
                <div className="cod-qb-results">
                  <div className="cod-results-title">{qbSearchResults.length} result(s)</div>
                  <div className="cod-qb-list">
                    {qbSearchResults.map((qb, i) => (
                      <div key={i} className="cod-qb-item">
                        <div className="cod-qb-info">
                          <div className="cod-qb-name">{qb.qb_name}</div>
                          <div className="cod-qb-meta">
                            <span>{qb.questionCount || 0} questions</span>
                            <span>•</span>
                            <span className="cod-qb-id-pill">{qb.qb_id.slice(0,8)}…</span>
                          </div>
                        </div>
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

      {/* ══════════════════════════════════════ UPLOAD ══════════════════════════════════════ */}
      {ui === "upload" && activeQB && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <PlatformBadge />
              <h3 className="cod-title">⚡ COD Sync — Paste & Upload</h3>
              <p className="cod-subtitle">
                📚 <strong>{activeQB.qb_name}</strong>
                <span className="cod-qb-id-inline"> · {activeQB.qb_id.slice(0,8)}…</span>
              </p>
            </div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("qb-select")} className="cod-button cod-button-secondary cod-button-small">← QB</button>
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">← Platforms</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          {/* ── Question Type Mode Toggle ── */}
          <QuestionTypePill mode={questionTypeMode} onChange={mode => {
            setQuestionTypeMode(mode);
            resetUpload(); // clear parse state on switch
          }} />

          {/* ── SINGLE FILE mode ── */}
          {questionTypeMode === "single" && (
            <>
              <FormatSelector />

              <div className="cod-paste-area">
                <div className="cod-paste-header">
                  <label className="cod-label">
                    Paste AI output here
                    {pasteInput && (
                      <span className="cod-label-count">
                        &nbsp;·&nbsp;{(pasteInput.match(/---QUESTION---/gi)||[]).length} block(s) detected
                      </span>
                    )}
                  </label>
                  {pasteInput && (
                    <button onClick={() => { setPasteInput(""); setParsedQuestions([]); }}
                      className="cod-button cod-button-secondary cod-button-small">🗑 Clear</button>
                  )}
                </div>
                <textarea value={pasteInput} onChange={e => setPasteInput(e.target.value)}
                  placeholder={"Paste the ---QUESTION--- ... ---END--- block(s) from AI here.\nMultiple questions supported."}
                  className="cod-paste-textarea" spellCheck={false} />
              </div>

              <button onClick={handleParse} disabled={!pasteInput.trim()}
                className={`cod-button cod-button-primary ${!pasteInput.trim() ? "cod-button-disabled" : ""}`}>
                🔍 Parse & Validate
              </button>

              {parsedQuestions.length > 0 && (
                <div className="cod-parsed-section">
                  <div className="cod-parsed-header">
                    <h4 className="cod-parsed-title">✅ {parsedQuestions.length} question(s) ready</h4>
                    <button onClick={() => { setPreviewIndex(0); setShowPreview(true); }}
                      className="cod-button cod-button-info cod-button-small">👁 Preview All</button>
                  </div>
                  <div className="cod-parsed-list">
                    {parsedQuestions.map((q, i) => (
                      <div key={i} className="cod-parsed-item">
                        <span className="cod-parsed-num">Q{i+1}</span>
                        <span className="cod-parsed-qtitle">{q.title}</span>
                        <span className="cod-parsed-langs">
                          {q.languages.map(l => <span key={l} className="cod-lang-pill">{l}</span>)}
                        </span>
                        <span className={`cod-diff-pill cod-diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                        <span className="cod-parsed-tc">{q.testcases.length} TCs</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={uploadQuestions} disabled={isLoading}
                    className={`cod-button cod-button-success ${isLoading ? "cod-button-disabled" : ""}`}>
                    {isLoading
                      ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}…`
                      : `🚀 Upload ${parsedQuestions.length} Question(s) → "${activeQB.qb_name}"`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── MULTIFILE mode ── */}
          {questionTypeMode === "multifile" && (
            <MultifileUploadSection
              activeQB={activeQB}
              batchConfig={batchConfig}
              token={token}
              showAlert={showAlert}
              onResults={handleMultifileResults}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ RESULTS ══════════════════════════════════════ */}
      {ui === "results" && uploadResults && (
        <div className="cod-card">
          <div className="cod-result-section">
            <div className="cod-result-icon">{uploadResults.failed === 0 ? "🎉" : "⚠️"}</div>
            <h3 className="cod-result-title">Upload Complete</h3>

            <div className="cod-result-stats">
              <div className="cod-stat-card cod-stat-info">
                <div className="cod-stat-icon">📊</div>
                <div className="cod-stat-content">
                  <div className="cod-stat-value">{uploadResults.total}</div>
                  <div className="cod-stat-label">Total</div>
                </div>
              </div>
              <div className="cod-stat-card cod-stat-success">
                <div className="cod-stat-icon">✅</div>
                <div className="cod-stat-content">
                  <div className="cod-stat-value">{uploadResults.success}</div>
                  <div className="cod-stat-label">Uploaded</div>
                </div>
              </div>
              {uploadResults.failed > 0 && (
                <div className="cod-stat-card cod-stat-error">
                  <div className="cod-stat-icon">❌</div>
                  <div className="cod-stat-content">
                    <div className="cod-stat-value">{uploadResults.failed}</div>
                    <div className="cod-stat-label">Failed</div>
                  </div>
                </div>
              )}
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
              <button onClick={() => { resetAll(); setUI("batch-config"); }} className="cod-button cod-button-secondary">⚙️ New Batch</button>
              <button onClick={onBack}                                       className="cod-button cod-button-secondary">← Platforms</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}