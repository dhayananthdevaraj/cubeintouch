
// import { useState, useEffect } from "react";
// import "./CODSync.css";
// import { DEPARTMENT_IDS } from "../config";

// const API = "https://api.examly.io";

// // ─── PARSER ──────────────────────────────────────────────────────────────────
// // Parses Claude's structured paste format into question objects.
// //
// // FORMAT (one block):
// //   ---QUESTION---
// //   TITLE: ...
// //   DIFFICULTY: Easy | Medium | Hard
// //   LANGUAGE: Java, Python
// //   TAGS: tag1, tag2
// //
// //   DESCRIPTION:
// //   <multiline HTML or plain text>
// //
// //   INPUT_FORMAT:
// //   <multiline>
// //
// //   OUTPUT_FORMAT:
// //   <multiline>
// //
// //   CONSTRAINTS:
// //   <multiline>
// //
// //   CODE_STUB[Java]:
// //   <multiline code>
// //
// //   SOLUTION[Java]:
// //   <multiline code>
// //
// //   TESTCASE: <input> | <output> | <difficulty> | <score>
// //   SAMPLE_IO: <input> | <output>
// //   ---END---
// //
// // Multiple ---QUESTION--- ... ---END--- blocks supported in one paste.

// function parseQuestions(raw) {
//   const errors = [];
//   const questions = [];

//   // Split into individual question blocks
//   const blocks = raw
//     .split(/---QUESTION---/i)
//     .map(b => b.split(/---END---/i)[0])
//     .filter(b => b.trim().length > 0);

//   if (blocks.length === 0) {
//     errors.push("No ---QUESTION--- blocks found. Check the format.");
//     return { questions, errors };
//   }

//   // Known multiline section keys (order matters for boundary detection)
//   const SECTION_KEYS = [
//     "DESCRIPTION", "INPUT_FORMAT", "OUTPUT_FORMAT", "CONSTRAINTS",
//   ];
//   // Regex that matches any section header line (including CODE_STUB[Lang], SOLUTION[Lang])
//   const HEADER_RE = /^(TITLE|DIFFICULTY|LANGUAGE|TAGS|DESCRIPTION|INPUT_FORMAT|OUTPUT_FORMAT|CONSTRAINTS|CODE_STUB\[[^\]]+\]|SOLUTION\[[^\]]+\]|HEADER\[[^\]]+\]|FOOTER\[[^\]]+\]|WHITELIST\[[^\]]+\]|BLACKLIST\[[^\]]+\]|TESTCASE|SAMPLE_IO)\s*:/i;

//   blocks.forEach((block, bi) => {
//     const qNum = bi + 1;
//     const qErrors = [];

//     // ── Line-by-line segment builder ──────────────────────────────────────
//     // Walk lines; when we hit a header, start collecting content for that key.
//     // Content ends when the next header starts.
//     const lines = block.split("\n");

//     const segments = {};   // key → raw string content
//     let currentKey = null;
//     let currentLines = [];

//     const flushCurrent = () => {
//       if (currentKey !== null) {
//         segments[currentKey] = currentLines.join("\n").trim();
//       }
//     };

//     lines.forEach(line => {
//       const m = line.match(/^([A-Z_]+(?:\[[^\]]+\])?)\s*:\s*(.*)/i);
//       if (m) {
//         const rawKey = m[1].toUpperCase();
//         const rest   = m[2]; // text after the colon on the same line

//         // Check if this is a known header
//         const isSectionHeader = HEADER_RE.test(line);
//         if (isSectionHeader) {
//           flushCurrent();
//           // Preserve original bracket content case (e.g. CODE_STUB[Java] not CODE_STUB[JAVA])
//           const bracketM = m[1].match(/^([A-Z_]+)\[([^\]]+)\]$/i);
//           currentKey = bracketM
//             ? bracketM[1].toUpperCase() + "[" + bracketM[2] + "]"
//             : rawKey;
//           currentLines = rest.trim() ? [rest.trim()] : [];
//           return;
//         }
//       }
//       // Not a header — append to current section
//       if (currentKey !== null) {
//         currentLines.push(line);
//       }
//     });
//     flushCurrent();

//     // ── Helpers ───────────────────────────────────────────────────────────
//     const get = (key) => segments[key.toUpperCase()] || null;

//     // Collect all CODE_STUB[Lang] and SOLUTION[Lang] entries
//     const getLangMap = (prefix) => {
//       const result = {};
//       Object.keys(segments).forEach(k => {
//         const m = k.match(new RegExp(`^${prefix}\\[(.+)\\]$`, "i"));
//         if (m) result[m[1]] = segments[k];
//       });
//       return result;
//     };

//     // TESTCASE lines (stored as a single segment, split by newline)
//     const getTestcases = () => {
//       const raw = get("TESTCASE") || "";
//       // Also catch inline TESTCASE: lines that landed in segments
//       const allLines = [];
//       // Walk original lines for all TESTCASE: entries
//       lines.forEach(line => {
//         if (/^TESTCASE\s*:/i.test(line)) {
//           allLines.push(line.replace(/^TESTCASE\s*:\s*/i, "").trim());
//         }
//       });
//       // Convert literal \n sequences to real newlines (multi-line inputs like "3 3\n1 2 3")
//       const unescape = (s) => s.replace(/\\n/g, "\n");

//       return allLines
//         .filter(l => l.length > 0)
//         .map(val => {
//           const parts = val.split("|").map(p => p.trim());
//           const rawOut = unescape(parts[1] || "");
//           // Ensure output ends with exactly one \n
//           const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
//           return {
//             input:       unescape(parts[0] || ""),
//             output,
//             difficulty:  parts[2]?.trim() || "Medium",
//             score:       parseInt(parts[3]) || 30,
//             memBytes:    "512",
//             timeBytes:   200,
//             timeLimit:   null,
//             outputLimit: null,
//             memoryLimit: null,
//           };
//         });
//     };

//     const getSampleIO = () => {
//       const allLines = [];
//       lines.forEach(line => {
//         if (/^SAMPLE_IO\s*:/i.test(line)) {
//           allLines.push(line.replace(/^SAMPLE_IO\s*:\s*/i, "").trim());
//         }
//       });

//       const unescape = (s) => s.replace(/\\n/g, "\n");

//       return allLines
//         .filter(l => l.length > 0)
//         .map(val => {
//           const parts = val.split("|").map(p => p.trim());
//           const rawOut = unescape(parts[1] || "");
//           const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
//           return {
//             input:       unescape(parts[0] || ""),
//             output,
//             memBytes:    "512",
//             timeBytes:   200,
//             sample:      "Yes",
//             difficulty:  " - ",
//             score:       " - ",
//             timeLimit:   null,
//             outputLimit: null,
//             memoryLimit: null,
//           };
//         });
//     };

//     // ── Extract ───────────────────────────────────────────────────────────
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
//     const headers     = getLangMap("HEADER");      // optional per-language header
//     const footers     = getLangMap("FOOTER");      // optional per-language footer
//     // WHITELIST/BLACKLIST: single-line comma-separated values per language
//     const whitelists  = getLangMap("WHITELIST");   // e.g. "java, util"
//     const blacklists  = getLangMap("BLACKLIST");   // e.g. "While, goto"
//     const testcases   = getTestcases();
//     const sampleIO    = getSampleIO();

//     // ── Validate ──────────────────────────────────────────────────────────
//     if (!title)
//       qErrors.push(`Q${qNum}: Missing TITLE`);
//     if (!difficulty || !["Easy","Medium","Hard"].includes(difficulty))
//       qErrors.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard (got: "${difficulty}")`);
//     if (!langRaw)
//       qErrors.push(`Q${qNum}: Missing LANGUAGE`);
//     if (!description)
//       qErrors.push(`Q${qNum}: Missing DESCRIPTION`);
//     if (!inputFmt)
//       qErrors.push(`Q${qNum}: Missing INPUT_FORMAT`);
//     if (!outputFmt)
//       qErrors.push(`Q${qNum}: Missing OUTPUT_FORMAT`);
//     if (testcases.length === 0)
//       qErrors.push(`Q${qNum}: No TESTCASE lines found`);
//     if (Object.keys(codeStubs).length === 0)
//       qErrors.push(`Q${qNum}: No CODE_STUB[Language] block found`);
//     if (Object.keys(solutions).length === 0)
//       qErrors.push(`Q${qNum}: No SOLUTION[Language] block found`);

//     if (qErrors.length > 0) {
//       errors.push(...qErrors);
//     } else {
//       questions.push({
//         title,
//         difficulty,
//         languages:   langRaw.split(",").map(l => l.trim()).filter(Boolean),
//         tags:        tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [""],
//         description,
//         inputFmt,
//         outputFmt,
//         constraints: constraints || "",
//         codeStubs,
//         solutions,
//         headers,
//         footers,
//         whitelists,
//         blacklists,
//         testcases,
//         sampleIO,
//       });
//     }
//   });

//   return { questions, errors };
// }

// // ─── PAYLOAD BUILDER ─────────────────────────────────────────────────────────

// function buildPayload(q, batchConfig, qbId, userId) {
//   const wrapHtml = (text) => {
//     if (!text) return "";
//     // If already proper HTML (starts with a real tag like <p>, <ul>, <div> etc.) pass through.
//     // Otherwise treat as plain text — escape < and > so placeholders like
//     // <i>, <sum>, <row_number> are not stripped by the browser as unknown tags.
//     if (/^<(p|ul|ol|div|h[1-6]|br|b|strong|em|span|table)\b/i.test(text.trim())) {
//       return text;
//     }
//     const escAngle = (s) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
//     return text
//       .split(/\n\n+/)
//       .map(para => `<p>${escAngle(para).replace(/\n/g, "<br>")}</p>`)
//       .join("");
//   };

//   const solutionArray = q.languages.map(lang => {
//     const header    = q.headers?.[lang]    || null;
//     const footer    = q.footers?.[lang]    || null;
//     const hasSnippet = !!(header || footer);

//     // Parse whitelist/blacklist: "java, util" → [{list:["java"]},{list:["util"]}]
//     const parseList = (raw) => {
//       if (!raw || !raw.trim()) return [];
//       return raw.split(",").map(v => v.trim()).filter(Boolean).map(v => ({ list: [v] }));
//     };
//     const whitelist = parseList(q.whitelists?.[lang]);
//     const blacklist = parseList(q.blacklists?.[lang]);

//     return {
//       language:   lang,
//       codeStub:   q.codeStubs[lang] || "",
//       hasSnippet,
//       ...(header     ? { header }     : {}),
//       ...(footer     ? { footer }     : {}),
//       ...(whitelist.length ? { whitelist } : {}),
//       ...(blacklist.length ? { blacklist } : {}),
//       solutiondata: q.solutions[lang]
//         ? [{
//             solution:      q.solutions[lang],
//             solutionbest:  true,
//             isSolutionExp: false,
//             solutionExp:   null,
//             solutionDebug: null,
//           }]
//         : [],
//       hideHeader: false,
//       hideFooter: false,
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
//     timelimit: null,
//     memorylimit: null,
//     codesize: null,
//     setLimit: false,
//     enable_api: false,
//     outputLimit: null,
//     subject_id: batchConfig.subject_id || null,
//     blooms_taxonomy: null,
//     course_outcome: null,
//     program_outcome: null,
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
//     pcm_combination_ids: batchConfig.pcm_combination_id
//       ? [batchConfig.pcm_combination_id]
//       : [],  // should always have value — validated as required in batch config
//     qb_id: qbId,
//     createdBy: userId,
//   };
// }

// // ─── COMPONENT ───────────────────────────────────────────────────────────────

// export default function CODSync() {
//   const [token, setToken] = useState(() => {
//     try { return localStorage.getItem("examly_token") || ""; } catch { return ""; }
//   });
//   const [ui, setUI] = useState(() =>
//     localStorage.getItem("examly_token") ? "batch-config" : "welcome"
//   );
//   const [tokenInput, setTokenInput] = useState("");

//   const [batchConfig, setBatchConfig] = useState({
//     topic_id: "",
//     sub_topic_id: "",
//     subject_id: "",
//     pcm_combination_id: "",
//     manual_difficulty: "Medium",
//   });

//   // ── Batch Config API state ──
//   const [bcLoading, setBcLoading] = useState(false);
//   // Subjects from /api/questiondomain/getallsubjects
//   const [allSubjects, setAllSubjects] = useState([]);   // [{subject_id, name}]
//   const [allTopics, setAllTopics]     = useState([]);   // [{topic_id, subject_id, name}]
//   const [allSubTopics, setAllSubTopics] = useState([]); // [{topic_id, sub_topic_id, name}]
//   const [subjectSearch, setSubjectSearch] = useState("");
//   const [topicSearch,   setTopicSearch]   = useState("");
//   const [subTopicSearch, setSubTopicSearch] = useState("");
//   const [subTopicFocused, setSubTopicFocused] = useState(false);
//   // Selected display names
//   const [selSubject,  setSelSubject]  = useState(null); // {subject_id, name}
//   const [selTopic,    setSelTopic]    = useState(null); // {topic_id, name}
//   const [selSubTopic, setSelSubTopic] = useState(null); // {sub_topic_id, name}
//   // PCM state
//   const [pcmValues,  setPcmValues]  = useState([]); // [{pcm_subject_id, name, pcm_topic:[{value,label}]}]
//   const [pcmCombos,  setPcmCombos]  = useState([]); // [{id, pcm_subject_id, pcm_topic_id, pcm_level_id}]
//   const [pcmLevels,  setPcmLevels]  = useState([]); // [{label, value}]
//   const [pcmSubjectSel, setPcmSubjectSel] = useState(null);
//   const [pcmTopicSel,   setPcmTopicSel]   = useState(null);
//   const [pcmLevelSel,   setPcmLevelSel]   = useState(null);
//   const [pcmSubjectSearch, setPcmSubjectSearch] = useState("");
//   const [pcmTopicSearch,   setPcmTopicSearch]   = useState("");

//   const [qbSearchTerm, setQbSearchTerm] = useState("");
//   const [qbSearchResults, setQbSearchResults] = useState([]);
//   const [selectedQB, setSelectedQB] = useState(null);

//   const [pasteInput, setPasteInput] = useState("");
//   const [parsedQuestions, setParsedQuestions] = useState([]);
//   const [previewIndex, setPreviewIndex] = useState(0);
//   const [showPreview, setShowPreview] = useState(false);

//   const [isLoading, setIsLoading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
//   const [uploadResults, setUploadResults] = useState(null);

//   const [alert, setAlert] = useState(null);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");

//   const BATCH_SIZE = 3;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));

//   const showAlert = (msg, type = "warning") => {
//     setAlert({ msg, type });
//     setTimeout(() => setAlert(null), 5000);
//   };
//   const showOverlay = (msg) => { setOverlayText(msg); setOverlay(true); };
//   const hideOverlay = () => setOverlay(false);

//   const headers = { "Content-Type": "application/json", Authorization: token };

//   // Auto-load on mount if token exists
//   useEffect(() => {
//     if (token && allSubjects.length === 0) {
//       loadBcData(token);
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [token]);

//   // ── Load all batch config data (called on token save + on mount if token exists) ──
//   const loadBcData = async (tok) => {
//     if (allSubjects.length > 0) return; // already loaded
//     setBcLoading(true);
//     const authHeaders = { "Content-Type": "application/json", Authorization: tok };
//     try {
//       const [subRes, pcmValRes, pcmComboRes] = await Promise.all([
//         fetch(`${API}/api/questiondomain/getallsubjects`, { headers: authHeaders }),
//         fetch(`${API}/api/pcm/getallpcmvalues`,           { headers: authHeaders }),
//         fetch(`${API}/api/pcm/getallpcmcombinations`,     { headers: authHeaders }),
//       ]);
//       const subData      = await subRes.json();
//       const pcmValData   = await pcmValRes.json();
//       const pcmComboData = await pcmComboRes.json();

//       if (subData?.statusCode === 200) {
//         const subjects  = subData.data.subject  || [];
//         const topics    = subData.data.topic    || [];
//         const rawSubs   = subData.data.sub_topic || [];
//         const subTopics = rawSubs.map(st => ({
//           ...st,
//           name: st.name || st.sub_topic_name || st.subtopic_name || st.label || "(unnamed)",
//         }));
//         setAllSubjects(subjects);
//         setAllTopics(topics);
//         setAllSubTopics(subTopics);
//       }
//       if (pcmValData?.success) {
//         setPcmValues(pcmValData.data  || []);
//         setPcmLevels(pcmValData.level || []);
//       }
//       if (pcmComboData?.success) {
//         setPcmCombos(pcmComboData.data || []);
//       }
//     } catch (err) {
//       showAlert("Failed to load config data: " + err.message, "danger");
//     } finally {
//       setBcLoading(false);
//     }
//   };

//   // Auto-load when token already exists (returning user)
//   const saveToken = () => {
//     if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
//     try {
//       const tok = tokenInput.trim();
//       localStorage.setItem("examly_token", tok);
//       setToken(tok);
//       setTokenInput("");
//       setUI("batch-config");
//       showAlert("Token saved! Loading config data...", "success");
//       loadBcData(tok);
//     } catch (err) { showAlert("Failed: " + err.message, "danger"); }
//   };

//   const clearToken = () => {
//     try { localStorage.removeItem("examly_token"); } catch {}
//     setToken(""); setUI("welcome"); resetAll();
//     showAlert("Logged out", "danger");
//   };

//   const resetAll = () => {
//     setBatchConfig({ topic_id: "", sub_topic_id: "", subject_id: "", pcm_combination_id: "", manual_difficulty: "Medium" });
//     setQbSearchTerm(""); setQbSearchResults([]); setSelectedQB(null);
//     setPasteInput(""); setParsedQuestions([]); setUploadResults(null);
//     setShowPreview(false); setPreviewIndex(0);
//   };

//   const searchQBs = async () => {
//     if (!qbSearchTerm.trim()) { showAlert("Enter a search term", "warning"); return; }
//     showOverlay("🔍 Searching...");
//     try {
//       const res = await fetch(`${API}/api/questionbanks/all`, {
//         method: "POST", headers,
//         body: JSON.stringify({ department_id: DEPARTMENT_IDS, limit: 50, mainDepartmentUser: true, page: 1, search: qbSearchTerm })
//       });
//       const data = await res.json();
//       const qbs = data?.questionbanks || [];
//       setQbSearchResults(qbs);
//       hideOverlay();
//       if (qbs.length === 0) showAlert("No QBs found", "warning");
//       else showAlert(`Found ${qbs.length} QB(s)`, "success");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Search error: " + err.message, "danger");
//     }
//   };

//   const selectQB = (qb) => {
//     setSelectedQB(qb);
//     setQbSearchResults([]);
//     showAlert(`QB selected: ${qb.qb_name}`, "success");
//   };

//   const handleParse = () => {
//     if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
//     const { questions, errors } = parseQuestions(pasteInput);

//     if (errors.length > 0) {
//       const preview = errors.slice(0, 6).join("\n");
//       const more = errors.length > 6 ? `\n...and ${errors.length - 6} more` : "";
//       showAlert(`❌ ${errors.length} error(s):\n\n${preview}${more}`, "danger");
//       console.error("Parse errors:", errors);
//       if (questions.length > 0) {
//         setParsedQuestions(questions);
//       }
//       return;
//     }

//     setParsedQuestions(questions);
//     showAlert(`✅ Parsed ${questions.length} question(s)!`, "success");
//   };

//   const uploadQuestions = async () => {
//     if (parsedQuestions.length === 0) { showAlert("Parse first", "warning"); return; }
//     if (!selectedQB) { showAlert("Select a QB first", "danger"); return; }

//     setIsLoading(true);
//     showOverlay("🔄 Starting upload...");

//     const results = { total: parsedQuestions.length, success: 0, failed: 0, errors: [], ids: [] };

//     try {
//       const userId = selectedQB.user_id || "system";

//       for (let i = 0; i < parsedQuestions.length; i += BATCH_SIZE) {
//         const batch = parsedQuestions.slice(i, i + BATCH_SIZE);
//         const bNum = Math.floor(i / BATCH_SIZE) + 1;
//         const bTotal = Math.ceil(parsedQuestions.length / BATCH_SIZE);
//         showOverlay(`📦 Batch ${bNum}/${bTotal}...`);
//         setUploadProgress({ current: i, total: parsedQuestions.length });

//         await Promise.all(batch.map(async (q, idx) => {
//           const gi = i + idx;
//           try {
//             const payload = buildPayload(q, batchConfig, selectedQB.qb_id, userId);
//             const res = await fetch(`${API}/api/programming_question/create`, {
//               method: "POST", headers,
//               body: JSON.stringify(payload),
//             });
//             const data = await res.json();
//             if (data.success) {
//               results.success++;
//               results.ids.push({ index: gi + 1, title: q.title, q_id: data.q_id });
//             } else {
//               throw new Error(data.message || "Upload failed");
//             }
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
//       if (results.failed === 0)
//         showAlert(`🎉 All ${results.success} uploaded!`, "success");
//       else
//         showAlert(`⚠️ ${results.success} uploaded, ${results.failed} failed`, "warning");
//       setUI("results");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Upload error: " + err.message, "danger");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const startNewUpload = () => {
//     setPasteInput(""); setParsedQuestions([]); setUploadResults(null);
//     setUploadProgress({ current: 0, total: 0 });
//     setShowPreview(false); setPreviewIndex(0);
//     setUI("upload");
//   };

//   const currentQ = parsedQuestions[previewIndex];

//   // ─── RENDER ───────────────────────────────────────────────────────────────

//   const downloadSampleFormat = () => {
//     const txt = `━━━ COD SYNC — PASTE FORMAT REFERENCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// REQUIRED FIELDS
//   TITLE:         One line — question title
//   DIFFICULTY:    Easy | Medium | Hard
//   LANGUAGE:      Comma-separated — Java, Python, C, C++   (varies per question)
//   TAGS:          Comma-separated — strings, loops, recursion
//   DESCRIPTION:   Multiline — use HTML (see DESCRIPTION FORMAT section below)
//   INPUT_FORMAT:  Multiline — plain text or HTML
//   OUTPUT_FORMAT: Multiline — plain text or HTML
//   TESTCASE:      One per line → input | output | difficulty | score
//   SAMPLE_IO:     One per line → input | output

// OPTIONAL FIELDS  (omit entirely if not needed)
//   CONSTRAINTS:      Multiline — plain text or HTML
//   HEADER[Lang]:     Multiline — code prepended before stub  (hasSnippet → true)
//   FOOTER[Lang]:     Multiline — code appended after stub    (hasSnippet → true)
//   CODE_STUB[Lang]:  Multiline — editable body shown to student
//   SOLUTION[Lang]:   Multiline — full correct solution
//   WHITELIST[Lang]:  Comma-separated — e.g.  java, util
//   BLACKLIST[Lang]:  Comma-separated — e.g.  While, goto

// RULES
//   • [Lang] = exact language name: [Java] [Python] [C] [C++]
//   • Repeat HEADER/FOOTER/CODE_STUB/SOLUTION/WHITELIST/BLACKLIST per language
//   • TESTCASE / SAMPLE_IO — each on ONE line, pipe-separated
//   • Multi-line input/output — use \n as separator:
//       e.g.  3 3\n10 20 30\n5 5 5      means:  3 3 / 10 20 30 / 5 5 5
//   • manual_difficulty set ONCE for the batch in Batch Configuration screen

// ━━━ DESCRIPTION FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Always start DESCRIPTION with a bold + underline "Problem Statement" heading.

// DESCRIPTION:
// <p><strong><u>Problem Statement</u></strong></p>
// <p><br></p>
// <p>Your problem description here. Use <b>bold</b> for key terms.</p>
// <p><br></p>
// <p>The system must satisfy the following conditions:</p>
// <ul>
//   <li>Condition one.</li>
//   <li>Condition two.</li>
//   <li>Condition three.</li>
// </ul>
// <p><br></p>
// <p>However, the provided code contains certain issues and may not execute correctly.
// Your task is to identify and fix the bugs so that the program runs successfully.</p>

// HTML tags allowed in DESCRIPTION / INPUT_FORMAT / OUTPUT_FORMAT / CONSTRAINTS:
//   <p>...</p>              paragraph
//   <p><br></p>             blank line spacer
//   <b>...</b>              bold
//   <strong>...</strong>    bold
//   <u>...</u>              underline
//   <em>...</em>            italic
//   <ul><li>...</li></ul>   bullet list
//   <ol><li>...</li></ol>   numbered list

// IMPORTANT: If your text contains < or > as literal characters
// (e.g.  Row <i>: <sum>)  write them as plain text — the tool auto-escapes them.
// Only use < > inside actual HTML tags listed above.

// ━━━ TEMPLATE — COPY THIS BLOCK AND FILL IN ━━━━━━━━━━━━━━━━━━━━━━━━

// ---QUESTION---
// TITLE: 
// DIFFICULTY: Medium
// LANGUAGE: Java
// TAGS: 

// DESCRIPTION:
// <p><strong><u>Problem Statement</u></strong></p>
// <p><br></p>
// <p>Describe the real-world context and problem here.</p>
// <p><br></p>
// <p>The system must satisfy the following conditions:</p>
// <ul>
//   <li>Condition one with <b>key term</b>.</li>
//   <li>Condition two.</li>
// </ul>
// <p><br></p>
// <p>However, the provided code contains certain issues and may not execute correctly.
// Your task is to identify and fix the bugs so that the program runs successfully.</p>

// INPUT_FORMAT:
// Describe input format here.

// OUTPUT_FORMAT:
// Describe output format here.

// CONSTRAINTS:
// Describe constraints here. e.g. 1 ≤ N ≤ 100

// HEADER[Java]:
// import java.util.Scanner;
// public class Main {
//     public static void main(String[] args) {

// FOOTER[Java]:
//     }
// }

// CODE_STUB[Java]:
//         // buggy code here

// SOLUTION[Java]:
// import java.util.Scanner;
// public class Main {
//     public static void main(String[] args) {
//         // correct solution here
//     }
// }

// TESTCASE: input1 | output1 | Easy | 25
// TESTCASE: input2 | output2 | Medium | 25
// TESTCASE: input3 | output3 | Hard | 25
// TESTCASE: input4 | output4 | Hard | 25

// SAMPLE_IO: input1 | output1
// SAMPLE_IO: input2 | output2
// ---END---

// ━━━ FULL EXAMPLE (Java + Python, multi-line input) ━━━━━━━━━━━━━━━━

// ---QUESTION---
// TITLE: Validate Product Code
// DIFFICULTY: Medium
// LANGUAGE: Java, Python
// TAGS: strings, validation, debugging

// DESCRIPTION:
// <p><strong><u>Problem Statement</u></strong></p>
// <p><br></p>
// <p>A product code verification system is being developed for an e-commerce warehouse.
// Each product must follow a strict format before it is accepted into inventory.</p>
// <p><br></p>
// <p>A valid product code must satisfy all of the following conditions:</p>
// <ul>
//   <li>The product code must start with <b>"PRD"</b>.</li>
//   <li>The product code must end with <b>"X"</b>.</li>
//   <li>The total length must be exactly <b>8 characters</b>.</li>
// </ul>
// <p><br></p>
// <p>However, the provided code contains certain issues and may not execute correctly.
// Your task is to identify and fix the bugs so that the program runs successfully.</p>

// INPUT_FORMAT:
// A single line containing the product code string.

// OUTPUT_FORMAT:
// Print Valid Product Code or Invalid Product Code.

// CONSTRAINTS:
// 1 ≤ length of code ≤ 20. Uppercase letters and digits only.

// HEADER[Java]:
// import java.util.Scanner;
// public class Main {
//     public static void main(String[] args) {

// FOOTER[Java]:
//     }
// }

// WHITELIST[Java]: java, util
// BLACKLIST[Java]: While, goto

// CODE_STUB[Java]:
//         Scanner sc = new Scanner(System.in)
//         String code = sc.nextLine();
//         if(code.length() >= 8 && code.startsWith("PRD") & code.endsWith("X")){
//             System.out.println("Valid Product Code");
//         } else {
//             System.out.println("Invalid Product Code");
//         }

// SOLUTION[Java]:
// import java.util.Scanner;
// public class Main {
//     public static void main(String[] args) {
//         Scanner sc = new Scanner(System.in);
//         String code = sc.nextLine();
//         if(code.length() == 8 && code.startsWith("PRD") && code.endsWith("X")){
//             System.out.println("Valid Product Code");
//         } else {
//             System.out.println("Invalid Product Code");
//         }
//     }
// }

// CODE_STUB[Python]:
// code = input()
// if len(code) >= 8 and code.startswith("PRD") and code.endswith("X"):
//     print("Valid Product Code")
// else:
//     print("Invalid Product Code")

// SOLUTION[Python]:
// code = input()
// if len(code) == 8 and code.startswith("PRD") and code.endswith("X"):
//     print("Valid Product Code")
// else:
//     print("Invalid Product Code")

// TESTCASE: PRD5678X | Valid Product Code | Easy | 20
// TESTCASE: PRD12345 | Invalid Product Code | Medium | 20
// TESTCASE: ABC1234X | Invalid Product Code | Easy | 20
// TESTCASE: PRD12X | Invalid Product Code | Medium | 20
// TESTCASE: PRDXXXXXX | Invalid Product Code | Hard | 10
// TESTCASE: PRD1234XX | Invalid Product Code | Hard | 10

// SAMPLE_IO: PRD1234X | Valid Product Code
// SAMPLE_IO: PRD12X | Invalid Product Code
// SAMPLE_IO: ABC1234X | Invalid Product Code
// ---END---

// ━━━ EXAMPLE WITH MULTI-LINE INPUT (C language, grid problem) ━━━━━━

// ---QUESTION---
// TITLE: Warehouse Grid Stock Checker
// DIFFICULTY: Medium
// LANGUAGE: C
// TAGS: 2d array, loops, debugging

// DESCRIPTION:
// <p><strong><u>Problem Statement</u></strong></p>
// <p><br></p>
// <p>A smart warehouse is structured as a 2D grid of <b>R rows</b> and <b>C columns</b>.</p>
// <p>Find the <b>total stock in each row</b> and the <b>row with maximum total stock</b>.</p>
// <p><br></p>
// <p>However, the provided code contains certain issues and may not execute correctly.
// Your task is to identify and fix the bugs so that the program runs successfully.</p>

// INPUT_FORMAT:
// The first line contains R and C. The next R lines each contain C integers.

// OUTPUT_FORMAT:
// Print R lines: Row i: sum
// Then: Max Stock Row: row_number

// CONSTRAINTS:
// 1 ≤ R, C ≤ 10
// 0 ≤ stock value ≤ 500

// CODE_STUB[C]:
// #include <stdio.h>
// int main() {
//     // buggy code
//     return 0;
// }

// SOLUTION[C]:
// #include <stdio.h>
// int main() {
//     // correct solution
//     return 0;
// }

// TESTCASE: 3 3\n10 20 30\n5 5 5\n100 200 300 | Row 1: 60\nRow 2: 15\nRow 3: 600\nMax Stock Row: 3 | Hard | 25
// TESTCASE: 2 4\n50 60 70 80\n10 20 30 40 | Row 1: 260\nRow 2: 100\nMax Stock Row: 1 | Hard | 25

// SAMPLE_IO: 3 3\n10 20 30\n5 5 5\n100 200 300 | Row 1: 60\nRow 2: 15\nRow 3: 600\nMax Stock Row: 3
// ---END---
// `;
//     const blob = new Blob([txt], { type: "text/plain" });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a");
//     a.href     = url;
//     a.download = "CODSync_PasteFormat.txt";
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//     showAlert("📥 Sample format downloaded!", "success");
//   };

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
//           <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
//             {alert.msg}
//           </pre>
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
//                 {currentQ.languages.map(l => (
//                   <span key={l} className="cod-preview-lang">💻 {l}</span>
//                 ))}
//                 {currentQ.tags.filter(t => t).map(t => (
//                   <span key={t} className="cod-preview-tag">🏷️ {t}</span>
//                 ))}
//               </div>

//               <div className="cod-preview-section">
//                 <h4>Title</h4>
//                 <p className="cod-preview-title-text">{currentQ.title}</p>
//               </div>
//               <div className="cod-preview-section">
//                 <h4>Description</h4>
//                 <div className="cod-preview-html"
//                   dangerouslySetInnerHTML={{ __html: currentQ.description }} />
//               </div>
//               <div className="cod-preview-2col">
//                 <div className="cod-preview-section">
//                   <h4>Input Format</h4>
//                   <p>{currentQ.inputFmt}</p>
//                 </div>
//                 <div className="cod-preview-section">
//                   <h4>Output Format</h4>
//                   <p>{currentQ.outputFmt}</p>
//                 </div>
//               </div>
//               {currentQ.constraints && (
//                 <div className="cod-preview-section">
//                   <h4>Constraints</h4>
//                   <p>{currentQ.constraints}</p>
//                 </div>
//               )}
//               {currentQ.languages.map(lang => (
//                 <div key={lang} className="cod-preview-lang-block">
//                   <div className="cod-preview-lang-header">
//                     <span className="cod-lang-pill">{lang}</span>
//                     {(currentQ.headers?.[lang] || currentQ.footers?.[lang]) && (
//                       <span className="cod-snippet-badge">📎 Header/Footer</span>
//                     )}
//                     {currentQ.whitelists?.[lang] && (
//                       <span className="cod-wl-badge">✅ WL: {currentQ.whitelists[lang]}</span>
//                     )}
//                     {currentQ.blacklists?.[lang] && (
//                       <span className="cod-bl-badge">🚫 BL: {currentQ.blacklists[lang]}</span>
//                     )}
//                   </div>
//                   {currentQ.headers?.[lang] && (
//                     <div className="cod-preview-section">
//                       <h4>Header</h4>
//                       <pre className="cod-preview-code"><code>{currentQ.headers[lang]}</code></pre>
//                     </div>
//                   )}
//                   {currentQ.codeStubs[lang] && (
//                     <div className="cod-preview-section">
//                       <h4>Code Stub</h4>
//                       <pre className="cod-preview-code"><code>{currentQ.codeStubs[lang]}</code></pre>
//                     </div>
//                   )}
//                   {currentQ.footers?.[lang] && (
//                     <div className="cod-preview-section">
//                       <h4>Footer</h4>
//                       <pre className="cod-preview-code"><code>{currentQ.footers[lang]}</code></pre>
//                     </div>
//                   )}
//                   {currentQ.solutions[lang] && (
//                     <div className="cod-preview-section">
//                       <h4>Solution</h4>
//                       <pre className="cod-preview-code"><code>{currentQ.solutions[lang]}</code></pre>
//                     </div>
//                   )}
//                 </div>
//               ))}
//               <div className="cod-preview-section">
//                 <h4>
//                   Test Cases ({currentQ.testcases.length}) + Sample I/O ({currentQ.sampleIO.length})
//                 </h4>
//                 <div className="cod-tc-grid">
//                   {currentQ.testcases.slice(0, 5).map((tc, i) => (
//                     <div key={i} className="cod-tc-row">
//                       <span className="cod-tc-badge">TC{i + 1} · {tc.difficulty} · {tc.score}pts</span>
//                       <span className="cod-tc-io">In: <code>{tc.input}</code></span>
//                       <span className="cod-tc-io">Out: <code>{tc.output.trim()}</code></span>
//                     </div>
//                   ))}
//                   {currentQ.testcases.length > 5 && (
//                     <div className="cod-tc-more">+{currentQ.testcases.length - 5} more hidden TCs</div>
//                   )}
//                   {currentQ.sampleIO.map((s, i) => (
//                     <div key={`s${i}`} className="cod-tc-row cod-tc-sample">
//                       <span className="cod-tc-badge cod-tc-badge-sample">Sample {i + 1}</span>
//                       <span className="cod-tc-io">In: <code>{s.input}</code></span>
//                       <span className="cod-tc-io">Out: <code>{s.output.trim()}</code></span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//             <div className="cod-preview-modal-footer">
//               <button
//                 onClick={() => setPreviewIndex(p => Math.max(0, p - 1))}
//                 disabled={previewIndex === 0}
//                 className="cod-button cod-button-secondary cod-button-small"
//               >← Prev</button>
//               <span className="cod-preview-counter">
//                 {previewIndex + 1} / {parsedQuestions.length}
//               </span>
//               <button
//                 onClick={() => setPreviewIndex(p => Math.min(parsedQuestions.length - 1, p + 1))}
//                 disabled={previewIndex === parsedQuestions.length - 1}
//                 className="cod-button cod-button-secondary cod-button-small"
//               >Next →</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── WELCOME ── */}
//       {ui === "welcome" && (
//         <div className="cod-welcome">
//           <div className="cod-welcome-icon">⚡</div>
//           <h2 className="cod-welcome-title">COD Sync</h2>
//           <p className="cod-welcome-subtitle">
//             Paste Claude-generated coding questions — bulk upload to question banks
//           </p>
//           <textarea
//             value={tokenInput}
//             onChange={e => setTokenInput(e.target.value)}
//             placeholder="Paste your Authorization token here..."
//             className="cod-token-input"
//           />
//           <button onClick={saveToken} className="cod-button cod-button-primary">
//             Save Token & Continue
//           </button>
//           <p className="cod-token-hint">💡 Token saved locally for future sessions</p>
//         </div>
//       )}

//       {/* ── BATCH CONFIG ── */}
//       {ui === "batch-config" && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div>
//               <h3 className="cod-title">⚙️ Batch Configuration</h3>
//               <p className="cod-subtitle">Select Subject → Topic → Sub Topic → PCM Combination</p>
//             </div>
//             <div className="cod-header-actions">
//               {bcLoading && <span className="cod-bc-loading">⏳ Loading...</span>}
//               <button onClick={clearToken}
//                 className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>

//           {/* Loading state */}
//           {bcLoading && (
//             <div className="cod-bc-autoload">
//               <div className="cod-bc-autoload-spinner"></div>
//               <span>Loading subjects & PCM data...</span>
//             </div>
//           )}

//           {allSubjects.length > 0 && (
//             <div className="cod-bc-data-info">
//               <span>📋 {allSubjects.length} subjects</span>
//               <span>·</span>
//               <span>🗂 {allTopics.length} topics</span>
//               <span>·</span>
//               <span>📌 {allSubTopics.length} sub topics</span>
//               <span>·</span>
//               <span>🔗 {pcmCombos.length} PCM combos</span>
//               <button
//                 onClick={() => {
//                   setBatchConfig({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"" });
//                   setSelSubject(null); setSelTopic(null); setSelSubTopic(null);
//                   setPcmSubjectSel(null); setPcmTopicSel(null); setPcmLevelSel(null);
//                   setSubjectSearch(""); setTopicSearch(""); setSubTopicSearch("");
//                   setPcmSubjectSearch(""); setPcmTopicSearch("");
//                 }}
//                 className="cod-button cod-button-secondary cod-button-small"
//               >↺ Reset</button>
//             </div>
//           )}

//           {allSubjects.length > 0 && (
//             <div className="cod-bc-sections">

//               {/* ── Unified search: Sub Topic / Topic / Subject ── */}
//               <div className="cod-bc-panel">
//                 <div className="cod-bc-panel-title">
//                   🔍 Search Sub Topic / Topic / Subject <span className="cod-required">*</span>
//                 </div>
//                 <input
//                   type="text"
//                   value={subTopicSearch}
//                   onChange={e => { setSubTopicSearch(e.target.value); }}
//                   placeholder="Search by sub topic, topic, or subject name..."
//                   className="cod-input cod-search-input cod-st-input"
//                   autoFocus
//                   onFocus={() => setSubTopicFocused(true)}
//                   onBlur={() => setTimeout(() => setSubTopicFocused(false), 200)}
//                 />

//                 {/* Results list */}
//                 {(subTopicSearch.trim().length > 0 || subTopicFocused) && allSubTopics.length > 0 && (
//                   <div className="cod-bc-list cod-bc-subtopic-list">
//                     {(() => {
//                       const term = subTopicSearch.toLowerCase().trim();

//                       // Build enriched list with topic + subject resolved
//                       const enriched = allSubTopics.map(st => {
//                         const stId   = st.sub_topic_id || st.id;
//                         const topic   = allTopics.find(t => t.topic_id === (st.topic_id || st.topicId));
//                         const subject = allSubjects.find(s => s.subject_id === (topic?.subject_id || topic?.subjectId));
//                         return { st, stId, topic, subject };
//                       });

//                       // Search across sub topic name, topic name, subject name
//                       const filtered = (term
//                         ? enriched.filter(({ st, topic, subject }) =>
//                             st.name.toLowerCase().includes(term) ||
//                             topic?.name.toLowerCase().includes(term) ||
//                             subject?.name.toLowerCase().includes(term)
//                           )
//                         : enriched
//                       ).slice(0, 50);

//                       if (filtered.length === 0) {
//                         return (
//                           <div className="cod-bc-empty" style={{border:"none"}}>
//                             No results for "{subTopicSearch}"
//                           </div>
//                         );
//                       }

//                       return filtered.map(({ st, stId, topic, subject }) => {
//                         const isSelected = selSubTopic?.sub_topic_id === stId;
//                         // Highlight which part matched
//                         const matchedTopic   = term && topic?.name.toLowerCase().includes(term) && !st.name.toLowerCase().includes(term);
//                         const matchedSubject = term && subject?.name.toLowerCase().includes(term) && !st.name.toLowerCase().includes(term) && !topic?.name.toLowerCase().includes(term);
//                         return (
//                           <div
//                             key={stId}
//                             className={`cod-bc-item cod-bc-subtopic-item ${isSelected ? "selected" : ""}`}
//                             onClick={() => {
//                               setSelSubTopic({ ...st, sub_topic_id: stId });
//                               setSelTopic(topic || null);
//                               setSelSubject(subject || null);
//                               setSubTopicSearch(st.name);
//                               setBatchConfig(p => ({
//                                 ...p,
//                                 sub_topic_id: stId,
//                                 topic_id:     topic?.topic_id     || p.topic_id,
//                                 subject_id:   subject?.subject_id || p.subject_id,
//                               }));
//                             }}
//                           >
//                             {/* Sub Topic → Topic → Subject */}
//                             <span className={`cod-st-name ${matchedTopic || matchedSubject ? "cod-st-dim" : ""}`}>
//                               {st.name}
//                             </span>
//                             <span className="cod-st-breadcrumb">
//                               {topic && (
//                                 <span className={`cod-st-topic ${matchedTopic ? "cod-st-match" : ""}`}>
//                                   {topic.name}
//                                 </span>
//                               )}
//                               {subject && (
//                                 <span className={`cod-st-subject ${matchedSubject ? "cod-st-match" : ""}`}>
//                                   {subject.name}
//                                 </span>
//                               )}
//                             </span>
//                           </div>
//                         );
//                       });
//                     })()}
//                   </div>
//                 )}

//                 {/* Selected — show resolved chain */}
//                 {selSubTopic && (
//                   <div className="cod-bc-resolved">
//                     <div className="cod-bc-resolved-row">
//                       <span className="cod-bc-resolved-label">Sub Topic</span>
//                       <span className="cod-bc-resolved-val">{selSubTopic.name}</span>
//                       <code className="cod-bc-resolved-id">{(selSubTopic.sub_topic_id||"").slice(0,8)}…</code>
//                     </div>
//                     <div className="cod-bc-resolved-row">
//                       <span className="cod-bc-resolved-label">Topic</span>
//                       <span className="cod-bc-resolved-val">{selTopic?.name || <em style={{color:"var(--cod-amber)"}}>not found</em>}</span>
//                       <code className="cod-bc-resolved-id">{(selTopic?.topic_id||"").slice(0,8)}{selTopic ? "…" : ""}</code>
//                     </div>
//                     <div className="cod-bc-resolved-row">
//                       <span className="cod-bc-resolved-label">Subject</span>
//                       <span className="cod-bc-resolved-val">{selSubject?.name || <em style={{color:"var(--cod-amber)"}}>not found</em>}</span>
//                       <code className="cod-bc-resolved-id">{(selSubject?.subject_id||"").slice(0,8)}{selSubject ? "…" : ""}</code>
//                     </div>
//                     <button
//                       onClick={() => {
//                         setSelSubTopic(null); setSelTopic(null); setSelSubject(null);
//                         setSubTopicSearch("");
//                         setBatchConfig(p => ({ ...p, sub_topic_id:"", topic_id:"", subject_id:"" }));
//                       }}
//                       className="cod-bc-clear-sel"
//                     >✕ Clear</button>
//                   </div>
//                 )}
//               </div>

//               {/* ── Section 4: PCM Combination ── */}
//               <div className="cod-bc-panel cod-bc-panel-pcm">
//                 <div className="cod-bc-panel-title">
//                   4. PCM Combination <span className="cod-required">*</span>
//                   {batchConfig.pcm_combination_id && (
//                     <span className="cod-bc-selected-name cod-bc-selected-pcm">
//                       {(() => {
//                         const combo = pcmCombos.find(c => c.id === batchConfig.pcm_combination_id);
//                         if (!combo) return batchConfig.pcm_combination_id.slice(0,8) + "…";
//                         const subj  = pcmValues.find(s => s.pcm_subject_id === combo.pcm_subject_id);
//                         const topic = subj?.pcm_topic?.find(t => t.value === combo.pcm_topic_id);
//                         const level = pcmLevels.find(l => l.value === combo.pcm_level_id);
//                         return `${subj?.name || "?"} › ${topic?.label || "?"} › ${level?.label || "?"}`;
//                       })()}
//                     </span>
//                   )}
//                 </div>

//                 <div className="cod-pcm-selectors">
//                   {/* PCM Subject */}
//                   <div className="cod-pcm-col">
//                     <label className="cod-label">PCM Subject</label>
//                     <input
//                       type="text"
//                       value={pcmSubjectSearch}
//                       onChange={e => { setPcmSubjectSearch(e.target.value); setPcmTopicSel(null); setPcmLevelSel(null); }}
//                       placeholder="🔍 Search..."
//                       className="cod-input"
//                     />
//                     <div className="cod-bc-list">
//                       {pcmValues
//                         .filter(s => s.name.toLowerCase().includes(pcmSubjectSearch.toLowerCase()))
//                         .map(s => (
//                           <div
//                             key={s.pcm_subject_id}
//                             className={`cod-bc-item ${pcmSubjectSel?.pcm_subject_id === s.pcm_subject_id ? "selected" : ""}`}
//                             onClick={() => { setPcmSubjectSel(s); setPcmTopicSel(null); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id: "" })); }}
//                           >
//                             {s.name}
//                           </div>
//                         ))}
//                     </div>
//                   </div>

//                   {/* PCM Topic */}
//                   <div className="cod-pcm-col">
//                     <label className="cod-label">PCM Topic</label>
//                     {!pcmSubjectSel
//                       ? <div className="cod-bc-empty">Select PCM subject first</div>
//                       : <>
//                         <input
//                           type="text"
//                           value={pcmTopicSearch}
//                           onChange={e => setPcmTopicSearch(e.target.value)}
//                           placeholder="🔍 Search..."
//                           className="cod-input"
//                         />
//                         <div className="cod-bc-list">
//                           {(pcmSubjectSel.pcm_topic || [])
//                             .filter(t => t.label.toLowerCase().includes(pcmTopicSearch.toLowerCase()))
//                             .map(t => (
//                               <div
//                                 key={t.value}
//                                 className={`cod-bc-item ${pcmTopicSel?.value === t.value ? "selected" : ""}`}
//                                 onClick={() => { setPcmTopicSel(t); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id: "" })); }}
//                               >
//                                 {t.label}
//                               </div>
//                             ))}
//                         </div>
//                       </>
//                     }
//                   </div>

//                   {/* PCM Level */}
//                   <div className="cod-pcm-col">
//                     <label className="cod-label">Level</label>
//                     {!pcmTopicSel
//                       ? <div className="cod-bc-empty">Select PCM topic first</div>
//                       : <div className="cod-bc-list">
//                           {pcmLevels.map(l => {
//                             // Check if this combo actually exists
//                             const exists = pcmCombos.some(c =>
//                               c.pcm_subject_id === pcmSubjectSel?.pcm_subject_id &&
//                               c.pcm_topic_id   === pcmTopicSel?.value &&
//                               c.pcm_level_id   === l.value
//                             );
//                             return (
//                               <div
//                                 key={l.value}
//                                 className={`cod-bc-item ${!exists ? "cod-bc-item-disabled" : ""} ${pcmLevelSel?.value === l.value ? "selected" : ""}`}
//                                 onClick={() => {
//                                   if (!exists) return;
//                                   setPcmLevelSel(l);
//                                   // Find the combo id
//                                   const combo = pcmCombos.find(c =>
//                                     c.pcm_subject_id === pcmSubjectSel.pcm_subject_id &&
//                                     c.pcm_topic_id   === pcmTopicSel.value &&
//                                     c.pcm_level_id   === l.value
//                                   );
//                                   if (combo) {
//                                     setBatchConfig(p => ({ ...p, pcm_combination_id: combo.id }));
//                                     showAlert(`✅ PCM: ${pcmSubjectSel.name} › ${pcmTopicSel.label} › ${l.label}`, "success");
//                                   }
//                                 }}
//                               >
//                                 {l.label}
//                                 {!exists && <span className="cod-bc-no-combo"> (no combo)</span>}
//                               </div>
//                             );
//                           })}
//                         </div>
//                     }
//                   </div>
//                 </div>
//               </div>

//             </div>
//           )}

//           {/* Summary + Next */}
//           {batchConfig.subject_id && batchConfig.topic_id && batchConfig.sub_topic_id && batchConfig.pcm_combination_id && (
//             <div className="cod-bc-summary">
//               <div className="cod-bc-summary-row">
//                 <span className="cod-bc-summary-label">Subject</span>
//                 <span className="cod-bc-summary-val">{selSubject?.name}</span>
//                 <code className="cod-bc-summary-id">{batchConfig.subject_id.slice(0,8)}…</code>
//               </div>
//               <div className="cod-bc-summary-row">
//                 <span className="cod-bc-summary-label">Topic</span>
//                 <span className="cod-bc-summary-val">{selTopic?.name}</span>
//                 <code className="cod-bc-summary-id">{batchConfig.topic_id.slice(0,8)}…</code>
//               </div>
//               <div className="cod-bc-summary-row">
//                 <span className="cod-bc-summary-label">Sub Topic</span>
//                 <span className="cod-bc-summary-val">{selSubTopic?.name}</span>
//                 <code className="cod-bc-summary-id">{batchConfig.sub_topic_id.slice(0,8)}…</code>
//               </div>
//               <div className="cod-bc-summary-row">
//                 <span className="cod-bc-summary-label">PCM Combo</span>
//                 <span className="cod-bc-summary-val">
//                   {pcmSubjectSel?.name} › {pcmTopicSel?.label} › {pcmLevelSel?.label}
//                 </span>
//                 <code className="cod-bc-summary-id">{batchConfig.pcm_combination_id.slice(0,8)}…</code>
//               </div>
//             </div>
//           )}

//           {/* Manual Difficulty selector */}
//           <div className="cod-difficulty-selector">
//             <label className="cod-label">Manual Difficulty <span className="cod-required">*</span></label>
//             <div className="cod-diff-buttons">
//               {["Easy", "Medium", "Hard"].map(d => (
//                 <button
//                   key={d}
//                   type="button"
//                   onClick={() => setBatchConfig(p => ({ ...p, manual_difficulty: d }))}
//                   className={`cod-diff-btn cod-diff-btn-${d.toLowerCase()} ${batchConfig.manual_difficulty === d ? "active" : ""}`}
//                 >
//                   {d}
//                 </button>
//               ))}
//             </div>
//             <p className="cod-diff-note">This sets the question-level difficulty sent to the API. Individual TESTCASE difficulties are set per line in the paste.</p>
//           </div>

//           <button
//             onClick={() => {
//               if (!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id) {
//                 showAlert("Select Subject, Topic and Sub Topic", "danger"); return;
//               }
//               if (!batchConfig.pcm_combination_id) {
//                 showAlert("Select a PCM Combination", "danger"); return;
//               }
//               setUI("qb-select");
//             }}
//             disabled={!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id || !batchConfig.pcm_combination_id}
//             className={`cod-button cod-button-primary ${(!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id || !batchConfig.pcm_combination_id) ? "cod-button-disabled" : ""}`}
//           >
//             Next → Select Question Bank
//           </button>
//         </div>
//       )}

//       {/* ── QB SELECT ── */}
//       {ui === "qb-select" && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div>
//               <h3 className="cod-title">📚 Select Question Bank</h3>
//               <p className="cod-subtitle">Pick the QB to upload coding questions into</p>
//             </div>
//             <div className="cod-header-actions">
//               <button onClick={() => setUI("batch-config")}
//                 className="cod-button cod-button-secondary cod-button-small">← Back</button>
//               <button onClick={clearToken}
//                 className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>

//           {selectedQB && (
//             <div className="cod-selected-qb-banner">
//               <span className="cod-selected-qb-icon">✅</span>
//               <div style={{ flex: 1 }}>
//                 <div className="cod-selected-qb-name">{selectedQB.qb_name}</div>
//                 <div className="cod-selected-qb-id">{selectedQB.qb_id}</div>
//               </div>
//               <button onClick={() => setUI("upload")}
//                 className="cod-button cod-button-success cod-button-small">
//                 Continue →
//               </button>
//             </div>
//           )}

//           <div className="cod-search-row">
//             <input
//               type="text"
//               value={qbSearchTerm}
//               onChange={e => setQbSearchTerm(e.target.value)}
//               onKeyDown={e => e.key === "Enter" && searchQBs()}
//               placeholder="Search question bank by name..."
//               className="cod-input"
//             />
//             <button
//               onClick={searchQBs}
//               disabled={!qbSearchTerm.trim()}
//               className={`cod-button cod-button-primary cod-button-small ${!qbSearchTerm.trim() ? "cod-button-disabled" : ""}`}
//             >
//               🔍 Search
//             </button>
//           </div>

//           {qbSearchResults.length > 0 && (
//             <div className="cod-qb-results">
//               <div className="cod-results-title">{qbSearchResults.length} result(s)</div>
//               <div className="cod-qb-list">
//                 {qbSearchResults.map((qb, i) => (
//                   <div key={i} className="cod-qb-item">
//                     <div className="cod-qb-info">
//                       <div className="cod-qb-name">{qb.qb_name}</div>
//                       <div className="cod-qb-meta">
//                         <span>{qb.questionCount || 0} questions</span>
//                         <span>•</span>
//                         <span className="cod-qb-id-pill">{qb.qb_id.slice(0, 8)}…</span>
//                       </div>
//                     </div>
//                     <button onClick={() => selectQB(qb)}
//                       className="cod-button cod-button-success cod-button-small">
//                       ✓ Select
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── UPLOAD (paste + parse) ── */}
//       {ui === "upload" && (
//         <div className="cod-card">
//           <div className="cod-header">
//             <div>
//               <h3 className="cod-title">⚡ COD Sync — Paste & Upload</h3>
//               {selectedQB && (
//                 <p className="cod-subtitle">
//                   📚 <strong>{selectedQB.qb_name}</strong>
//                   <span className="cod-qb-id-inline"> · {selectedQB.qb_id.slice(0, 8)}…</span>
//                 </p>
//               )}
//             </div>
//             <div className="cod-header-actions">
//               <button onClick={() => setUI("qb-select")}
//                 className="cod-button cod-button-secondary cod-button-small">← QB</button>
//               <button onClick={clearToken}
//                 className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
//             </div>
//           </div>

//           {/* Format reference (collapsible) */}
//           <details className="cod-format-hint">
//             <summary className="cod-format-hint-title">
//               <span>📋 Paste format reference — click to expand</span>
//               <button
//                 onClick={e => { e.preventDefault(); e.stopPropagation(); downloadSampleFormat(); }}
//                 className="cod-button cod-button-info cod-button-small"
//                 style={{ marginLeft: "auto" }}
//               >
//                 📥 Download .txt
//               </button>
//             </summary>
//             <pre className="cod-format-pre">{`━━━ FIELD REFERENCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// REQUIRED FIELDS
//   TITLE:         One line — question title
//   DIFFICULTY:    Easy | Medium | Hard
//   LANGUAGE:      Comma-separated — Java, Python, C, C++   (varies per question)
//   TAGS:          Comma-separated — strings, loops, recursion
//   DESCRIPTION:   Multiline — use HTML (see format below)
//   INPUT_FORMAT:  Multiline — plain text or HTML
//   OUTPUT_FORMAT: Multiline — plain text or HTML
//   TESTCASE:      One per line → input | output | difficulty | score
//   SAMPLE_IO:     One per line → input | output

// OPTIONAL FIELDS  (omit entirely if not needed)
//   CONSTRAINTS:      Multiline — plain text or HTML
//   HEADER[Lang]:     Multiline — code prepended before stub  (hasSnippet → true)
//   FOOTER[Lang]:     Multiline — code appended after stub    (hasSnippet → true)
//   CODE_STUB[Lang]:  Multiline — editable body shown to student
//   SOLUTION[Lang]:   Multiline — full correct solution
//   WHITELIST[Lang]:  Comma-separated — e.g.  java, util
//   BLACKLIST[Lang]:  Comma-separated — e.g.  While, goto

// RULES
//   • [Lang] = exact language name: [Java] [Python] [C] [C++]
//   • Repeat HEADER/FOOTER/CODE_STUB/SOLUTION/WHITELIST/BLACKLIST per language
//   • TESTCASE / SAMPLE_IO — each on ONE line, pipe-separated
//   • Multi-line input/output — use \n as separator:
//       e.g.  3 3\n10 20 30\n5 5 5      →  3 3 / 10 20 30 / 5 5 5
//   • manual_difficulty set ONCE for the batch in Batch Configuration screen

// ━━━ DESCRIPTION FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Always start DESCRIPTION with a bold + underline "Problem Statement" heading,
// then write the problem body as HTML paragraphs and lists.

// DESCRIPTION:
// <p><strong><u>Problem Statement</u></strong></p>
// <p><br></p>
// <p>Your problem description here. Use <b>bold</b> for key terms.</p>
// <p><br></p>
// <p>The system must satisfy the following conditions:</p>
// <ul>
//   <li>Condition one.</li>
//   <li>Condition two.</li>
//   <li>Condition three.</li>
// </ul>
// <p><br></p>
// <p>However, the provided code contains certain issues and may not execute
// correctly. Your task is to identify and fix the bugs so that the program
// runs successfully.</p>

//   HTML tags allowed in DESCRIPTION / INPUT_FORMAT / OUTPUT_FORMAT / CONSTRAINTS:
//     <p>...</p>          paragraph
//     <p><br></p>         blank line spacer
//     <b>...</b>          bold
//     <strong>...</strong> bold
//     <u>...</u>          underline
//     <em>...</em>        italic
//     <ul><li>...</li></ul>  bullet list
//     <ol><li>...</li></ol>  numbered list

//   IMPORTANT: If your text contains < or > as literal characters
//   (e.g.  Row <i>: <sum>)  write them as plain text — the tool will
//   auto-escape them so the platform shows them correctly.
//   Only use < > inside actual HTML tags listed above.

// ━━━ EXAMPLE BLOCK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ---QUESTION---
// TITLE: Validate Product Code
// DIFFICULTY: Medium
// LANGUAGE: Java, Python
// TAGS: strings, validation, debugging

// DESCRIPTION:
// <p><strong><u>Problem Statement</u></strong></p>
// <p><br></p>
// <p>A product code verification system is being developed for an e-commerce warehouse.
// Each product must follow a strict format before it is accepted into inventory.</p>
// <p><br></p>
// <p>A valid product code must satisfy all of the following conditions:</p>
// <ul>
//   <li>The product code must start with <b>"PRD"</b>.</li>
//   <li>The product code must end with <b>"X"</b>.</li>
//   <li>The total length must be exactly <b>8 characters</b>.</li>
// </ul>
// <p><br></p>
// <p>However, the provided code contains certain issues and may not execute correctly.
// Your task is to identify and fix the bugs so that the program runs successfully.</p>

// INPUT_FORMAT:
// A single line containing the product code string.

// OUTPUT_FORMAT:
// Print Valid Product Code or Invalid Product Code.

// CONSTRAINTS:
// 1 ≤ length of code ≤ 20. Uppercase letters and digits only.

// HEADER[Java]:
// import java.util.Scanner;
// public class Main {
//     public static void main(String[] args) {

// FOOTER[Java]:
//     }
// }

// WHITELIST[Java]: java, util
// BLACKLIST[Java]: While, goto

// CODE_STUB[Java]:
//         Scanner sc = new Scanner(System.in)
//         String code = sc.nextLine();
//         if(code.length() >= 8 && code.startsWith("PRD") & code.endsWith("X")){
//             System.out.println("Valid Product Code");
//         } else {
//             System.out.println("Invalid Product Code");
//         }

// SOLUTION[Java]:
// import java.util.Scanner;
// public class Main {
//     public static void main(String[] args) {
//         Scanner sc = new Scanner(System.in);
//         String code = sc.nextLine();
//         if(code.length() == 8 && code.startsWith("PRD") && code.endsWith("X")){
//             System.out.println("Valid Product Code");
//         } else {
//             System.out.println("Invalid Product Code");
//         }
//     }
// }

// TESTCASE: PRD5678X | Valid Product Code | Easy | 20
// TESTCASE: PRD12345 | Invalid Product Code | Medium | 20
// TESTCASE: ABC1234X | Invalid Product Code | Easy | 20
// TESTCASE: PRD12X | Invalid Product Code | Medium | 20
// TESTCASE: PRDXXXXXX | Invalid Product Code | Hard | 10
// TESTCASE: PRD1234XX | Invalid Product Code | Hard | 10

// SAMPLE_IO: PRD1234X | Valid Product Code
// SAMPLE_IO: PRD12X | Invalid Product Code
// SAMPLE_IO: ABC1234X | Invalid Product Code
// ---END---`}
// </pre>
//           </details>

//           {/* Paste area */}
//           <div className="cod-paste-area">
//             <div className="cod-paste-header">
//               <label className="cod-label">
//                 Paste Claude output here
//                 {pasteInput && (
//                   <span className="cod-label-count">
//                     &nbsp;·&nbsp;
//                     {(pasteInput.match(/---QUESTION---/gi) || []).length} block(s) detected
//                   </span>
//                 )}
//               </label>
//               {pasteInput && (
//                 <button
//                   onClick={() => { setPasteInput(""); setParsedQuestions([]); }}
//                   className="cod-button cod-button-secondary cod-button-small"
//                 >
//                   🗑 Clear
//                 </button>
//               )}
//             </div>
//             <textarea
//               value={pasteInput}
//               onChange={e => setPasteInput(e.target.value)}
//               placeholder={
//                 "Paste the ---QUESTION--- ... ---END--- block(s) from Claude here.\n" +
//                 "Multiple questions supported — paste them all at once."
//               }
//               className="cod-paste-textarea"
//               spellCheck={false}
//             />
//           </div>

//           <button
//             onClick={handleParse}
//             disabled={!pasteInput.trim()}
//             className={`cod-button cod-button-primary ${!pasteInput.trim() ? "cod-button-disabled" : ""}`}
//           >
//             🔍 Parse & Validate
//           </button>

//           {/* Parsed list */}
//           {parsedQuestions.length > 0 && (
//             <div className="cod-parsed-section">
//               <div className="cod-parsed-header">
//                 <h4 className="cod-parsed-title">
//                   ✅ {parsedQuestions.length} question(s) ready
//                 </h4>
//                 <button
//                   onClick={() => { setPreviewIndex(0); setShowPreview(true); }}
//                   className="cod-button cod-button-info cod-button-small"
//                 >
//                   👁 Preview All
//                 </button>
//               </div>

//               <div className="cod-parsed-list">
//                 {parsedQuestions.map((q, i) => (
//                   <div key={i} className="cod-parsed-item">
//                     <span className="cod-parsed-num">Q{i + 1}</span>
//                     <span className="cod-parsed-qtitle">{q.title}</span>
//                     <span className="cod-parsed-langs">
//                       {q.languages.map(l => (
//                         <span key={l} className="cod-lang-pill">{l}</span>
//                       ))}
//                     </span>
//                     <span className={`cod-diff-pill cod-diff-${q.difficulty.toLowerCase()}`}>
//                       {q.difficulty}
//                     </span>
//                     <span className="cod-parsed-tc">{q.testcases.length} TCs</span>
//                   </div>
//                 ))}
//               </div>

//               {!selectedQB && (
//                 <p className="cod-warn-text">
//                   ⚠️ Go back and select a Question Bank first
//                 </p>
//               )}

//               <button
//                 onClick={uploadQuestions}
//                 disabled={isLoading || !selectedQB}
//                 className={`cod-button cod-button-success ${(isLoading || !selectedQB) ? "cod-button-disabled" : ""}`}
//               >
//                 {isLoading
//                   ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}…`
//                   : `🚀 Upload ${parsedQuestions.length} Question(s) → "${selectedQB?.qb_name}"`}
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── RESULTS ── */}
//       {ui === "results" && uploadResults && (
//         <div className="cod-card">
//           <div className="cod-result-section">
//             <div className="cod-result-icon">
//               {uploadResults.failed === 0 ? "🎉" : "⚠️"}
//             </div>
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
//               <button onClick={startNewUpload} className="cod-button cod-button-primary">
//                 ⚡ Upload More
//               </button>
//               <button
//                 onClick={() => { setParsedQuestions([]); setUploadResults(null); setUI("qb-select"); }}
//                 className="cod-button cod-button-secondary"
//               >
//                 📚 Change QB
//               </button>
//               <button
//                 onClick={() => { resetAll(); setUI("batch-config"); }}
//                 className="cod-button cod-button-secondary"
//               >
//                 ⚙️ New Batch
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


import { useState, useEffect } from "react";
import "./CODSync.css";
import { DEPARTMENT_IDS } from "../config";

const API = "https://api.examly.io";

// ─── PARSER ──────────────────────────────────────────────────────────────────
// Parses Claude's structured paste format into question objects.
//
// FORMAT (one block):
//   ---QUESTION---
//   TITLE: ...
//   DIFFICULTY: Easy | Medium | Hard
//   LANGUAGE: Java, Python
//   TAGS: tag1, tag2
//
//   DESCRIPTION:
//   <multiline HTML or plain text>
//
//   INPUT_FORMAT:
//   <multiline>
//
//   OUTPUT_FORMAT:
//   <multiline>
//
//   CONSTRAINTS:
//   <multiline>
//
//   CODE_STUB[Java]:
//   <multiline code>
//
//   SOLUTION[Java]:
//   <multiline code>
//
//   TESTCASE: <input> | <output> | <difficulty> | <score>
//   SAMPLE_IO: <input> | <output>
//   ---END---
//
// Multiple ---QUESTION--- ... ---END--- blocks supported in one paste.

function parseQuestions(raw) {
  const errors = [];
  const questions = [];

  // Split into individual question blocks
  const blocks = raw
    .split(/---QUESTION---/i)
    .map(b => b.split(/---END---/i)[0])
    .filter(b => b.trim().length > 0);

  if (blocks.length === 0) {
    errors.push("No ---QUESTION--- blocks found. Check the format.");
    return { questions, errors };
  }

  // Known multiline section keys (order matters for boundary detection)
  const SECTION_KEYS = [
    "DESCRIPTION", "INPUT_FORMAT", "OUTPUT_FORMAT", "CONSTRAINTS",
  ];
  // Regex that matches any section header line (including CODE_STUB[Lang], SOLUTION[Lang])
  const HEADER_RE = /^(TITLE|DIFFICULTY|LANGUAGE|TAGS|DESCRIPTION|INPUT_FORMAT|OUTPUT_FORMAT|CONSTRAINTS|CODE_STUB\[[^\]]+\]|SOLUTION\[[^\]]+\]|HEADER\[[^\]]+\]|FOOTER\[[^\]]+\]|WHITELIST\[[^\]]+\]|BLACKLIST\[[^\]]+\]|TESTCASE|SAMPLE_IO)\s*:/i;

  blocks.forEach((block, bi) => {
    const qNum = bi + 1;
    const qErrors = [];

    // ── Line-by-line segment builder ──────────────────────────────────────
    // Walk lines; when we hit a header, start collecting content for that key.
    // Content ends when the next header starts.
    const lines = block.split("\n");

    const segments = {};   // key → raw string content
    let currentKey = null;
    let currentLines = [];

    const flushCurrent = () => {
      if (currentKey !== null) {
        segments[currentKey] = currentLines.join("\n").trim();
      }
    };

    lines.forEach(line => {
      const m = line.match(/^([A-Z_]+(?:\[[^\]]+\])?)\s*:\s*(.*)/i);
      if (m) {
        const rawKey = m[1].toUpperCase();
        const rest   = m[2]; // text after the colon on the same line

        // Check if this is a known header
        const isSectionHeader = HEADER_RE.test(line);
        if (isSectionHeader) {
          flushCurrent();
          // Preserve original bracket content case (e.g. CODE_STUB[Java] not CODE_STUB[JAVA])
          const bracketM = m[1].match(/^([A-Z_]+)\[([^\]]+)\]$/i);
          currentKey = bracketM
            ? bracketM[1].toUpperCase() + "[" + bracketM[2] + "]"
            : rawKey;
          currentLines = rest.trim() ? [rest.trim()] : [];
          return;
        }
      }
      // Not a header — append to current section
      if (currentKey !== null) {
        currentLines.push(line);
      }
    });
    flushCurrent();

    // ── Helpers ───────────────────────────────────────────────────────────
    const get = (key) => segments[key.toUpperCase()] || null;

    // Collect all CODE_STUB[Lang] and SOLUTION[Lang] entries
    const getLangMap = (prefix) => {
      const result = {};
      Object.keys(segments).forEach(k => {
        const m = k.match(new RegExp(`^${prefix}\\[(.+)\\]$`, "i"));
        if (m) result[m[1]] = segments[k];
      });
      return result;
    };

    // TESTCASE lines (stored as a single segment, split by newline)
    const getTestcases = () => {
      const raw = get("TESTCASE") || "";
      // Also catch inline TESTCASE: lines that landed in segments
      const allLines = [];
      // Walk original lines for all TESTCASE: entries
      lines.forEach(line => {
        if (/^TESTCASE\s*:/i.test(line)) {
          allLines.push(line.replace(/^TESTCASE\s*:\s*/i, "").trim());
        }
      });
      // Convert literal \n sequences to real newlines (multi-line inputs like "3 3\n1 2 3")
      const unescape = (s) => s.replace(/\\n/g, "\n");

      return allLines
        .filter(l => l.length > 0)
        .map(val => {
          const parts = val.split("|").map(p => p.trim());
          const rawOut = unescape(parts[1] || "");
          // Ensure output ends with exactly one \n
          const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
          return {
            input:       unescape(parts[0] || ""),
            output,
            difficulty:  parts[2]?.trim() || "Medium",
            score:       parseInt(parts[3]) || 30,
            memBytes:    "512",
            timeBytes:   200,
            timeLimit:   null,
            outputLimit: null,
            memoryLimit: null,
          };
        });
    };

    const getSampleIO = () => {
      const allLines = [];
      lines.forEach(line => {
        if (/^SAMPLE_IO\s*:/i.test(line)) {
          allLines.push(line.replace(/^SAMPLE_IO\s*:\s*/i, "").trim());
        }
      });

      const unescape = (s) => s.replace(/\\n/g, "\n");

      return allLines
        .filter(l => l.length > 0)
        .map(val => {
          const parts = val.split("|").map(p => p.trim());
          const rawOut = unescape(parts[1] || "");
          const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
          return {
            input:       unescape(parts[0] || ""),
            output,
            memBytes:    "512",
            timeBytes:   200,
            sample:      "Yes",
            difficulty:  " - ",
            score:       " - ",
            timeLimit:   null,
            outputLimit: null,
            memoryLimit: null,
          };
        });
    };

    // ── Extract ───────────────────────────────────────────────────────────
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
    const headers     = getLangMap("HEADER");      // optional per-language header
    const footers     = getLangMap("FOOTER");      // optional per-language footer
    // WHITELIST/BLACKLIST: single-line comma-separated values per language
    const whitelists  = getLangMap("WHITELIST");   // e.g. "java, util"
    const blacklists  = getLangMap("BLACKLIST");   // e.g. "While, goto"
    const testcases   = getTestcases();
    const sampleIO    = getSampleIO();

    // ── Validate ──────────────────────────────────────────────────────────
    if (!title)
      qErrors.push(`Q${qNum}: Missing TITLE`);
    if (!difficulty || !["Easy","Medium","Hard"].includes(difficulty))
      qErrors.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard (got: "${difficulty}")`);
    if (!langRaw)
      qErrors.push(`Q${qNum}: Missing LANGUAGE`);
    if (!description)
      qErrors.push(`Q${qNum}: Missing DESCRIPTION`);
    if (!inputFmt)
      qErrors.push(`Q${qNum}: Missing INPUT_FORMAT`);
    if (!outputFmt)
      qErrors.push(`Q${qNum}: Missing OUTPUT_FORMAT`);
    if (testcases.length === 0)
      qErrors.push(`Q${qNum}: No TESTCASE lines found`);
    // CODE_STUB is optional — platform can show an empty editor
    if (Object.keys(solutions).length === 0)
      qErrors.push(`Q${qNum}: No SOLUTION[Language] block found`);

    if (qErrors.length > 0) {
      errors.push(...qErrors);
    } else {
      questions.push({
        title,
        difficulty,
        languages:   langRaw.split(",").map(l => l.trim()).filter(Boolean),
        tags:        tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [""],
        description,
        inputFmt,
        outputFmt,
        constraints: constraints || "",
        codeStubs,
        solutions,
        headers,
        footers,
        whitelists,
        blacklists,
        testcases,
        sampleIO,
      });
    }
  });

  return { questions, errors };
}

// ─── PAYLOAD BUILDER ─────────────────────────────────────────────────────────

function buildPayload(q, batchConfig, qbId, userId) {
  const wrapHtml = (text) => {
    if (!text) return "";
    // If already proper HTML (starts with a real tag like <p>, <ul>, <div> etc.) pass through.
    // Otherwise treat as plain text — escape < and > so placeholders like
    // <i>, <sum>, <row_number> are not stripped by the browser as unknown tags.
    if (/^<(p|ul|ol|div|h[1-6]|br|b|strong|em|span|table)\b/i.test(text.trim())) {
      return text;
    }
    const escAngle = (s) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return text
      .split(/\n\n+/)
      .map(para => `<p>${escAngle(para).replace(/\n/g, "<br>")}</p>`)
      .join("");
  };

  const solutionArray = q.languages.map(lang => {
    const header    = q.headers?.[lang]    || null;
    const footer    = q.footers?.[lang]    || null;
    const hasSnippet = !!(header || footer);

    // Parse whitelist/blacklist: "java, util" → [{list:["java"]},{list:["util"]}]
    const parseList = (raw) => {
      if (!raw || !raw.trim()) return [];
      return raw.split(",").map(v => v.trim()).filter(Boolean).map(v => ({ list: [v] }));
    };
    const whitelist = parseList(q.whitelists?.[lang]);
    const blacklist = parseList(q.blacklists?.[lang]);

    return {
      language:   lang,
      codeStub:   q.codeStubs[lang] || "",
      hasSnippet,
      ...(header     ? { header }     : {}),
      ...(footer     ? { footer }     : {}),
      ...(whitelist.length ? { whitelist } : {}),
      ...(blacklist.length ? { blacklist } : {}),
      solutiondata: q.solutions[lang]
        ? [{
            solution:      q.solutions[lang],
            solutionbest:  true,
            isSolutionExp: false,
            solutionExp:   null,
            solutionDebug: null,
          }]
        : [],
      hideHeader: false,
      hideFooter: false,
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
    timelimit: null,
    memorylimit: null,
    codesize: null,
    setLimit: false,
    enable_api: false,
    outputLimit: null,
    subject_id: batchConfig.subject_id || null,
    blooms_taxonomy: null,
    course_outcome: null,
    program_outcome: null,
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
    pcm_combination_ids: batchConfig.pcm_combination_id
      ? [batchConfig.pcm_combination_id]
      : [],  // should always have value — validated as required in batch config
    qb_id: qbId,
    createdBy: userId,
  };
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function CODSync() {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem("examly_token") || ""; } catch { return ""; }
  });
  const [ui, setUI] = useState(() =>
    localStorage.getItem("examly_token") ? "batch-config" : "welcome"
  );
  const [tokenInput, setTokenInput] = useState("");

  const [batchConfig, setBatchConfig] = useState({
    topic_id: "",
    sub_topic_id: "",
    subject_id: "",
    pcm_combination_id: "",
    manual_difficulty: "Medium",
  });

  // ── Batch Config API state ──
  const [bcLoading, setBcLoading] = useState(false);
  // Subjects from /api/questiondomain/getallsubjects
  const [allSubjects, setAllSubjects] = useState([]);   // [{subject_id, name}]
  const [allTopics, setAllTopics]     = useState([]);   // [{topic_id, subject_id, name}]
  const [allSubTopics, setAllSubTopics] = useState([]); // [{topic_id, sub_topic_id, name}]
  const [subjectSearch, setSubjectSearch] = useState("");
  const [topicSearch,   setTopicSearch]   = useState("");
  const [subTopicSearch, setSubTopicSearch] = useState("");
  const [subTopicFocused, setSubTopicFocused] = useState(false);
  // Selected display names
  const [selSubject,  setSelSubject]  = useState(null); // {subject_id, name}
  const [selTopic,    setSelTopic]    = useState(null); // {topic_id, name}
  const [selSubTopic, setSelSubTopic] = useState(null); // {sub_topic_id, name}
  // PCM state
  const [pcmValues,  setPcmValues]  = useState([]); // [{pcm_subject_id, name, pcm_topic:[{value,label}]}]
  const [pcmCombos,  setPcmCombos]  = useState([]); // [{id, pcm_subject_id, pcm_topic_id, pcm_level_id}]
  const [pcmLevels,  setPcmLevels]  = useState([]); // [{label, value}]
  const [pcmSubjectSel, setPcmSubjectSel] = useState(null);
  const [pcmTopicSel,   setPcmTopicSel]   = useState(null);
  const [pcmLevelSel,   setPcmLevelSel]   = useState(null);
  const [pcmSubjectSearch, setPcmSubjectSearch] = useState("");
  const [pcmTopicSearch,   setPcmTopicSearch]   = useState("");

  const [qbSearchTerm, setQbSearchTerm] = useState("");
  const [qbSearchResults, setQbSearchResults] = useState([]);
  const [selectedQB, setSelectedQB] = useState(null);

  const [pasteInput, setPasteInput] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadResults, setUploadResults] = useState(null);

  const [alert, setAlert] = useState(null);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");

  const BATCH_SIZE = 3;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const showAlert = (msg, type = "warning") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 5000);
  };
  const showOverlay = (msg) => { setOverlayText(msg); setOverlay(true); };
  const hideOverlay = () => setOverlay(false);

  const headers = { "Content-Type": "application/json", Authorization: token };

  // Auto-load on mount if token exists
  useEffect(() => {
    if (token && allSubjects.length === 0) {
      loadBcData(token);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Load all batch config data (called on token save + on mount if token exists) ──
  const loadBcData = async (tok) => {
    if (allSubjects.length > 0) return; // already loaded
    setBcLoading(true);
    const authHeaders = { "Content-Type": "application/json", Authorization: tok };
    try {
      const [subRes, pcmValRes, pcmComboRes] = await Promise.all([
        fetch(`${API}/api/questiondomain/getallsubjects`, { headers: authHeaders }),
        fetch(`${API}/api/pcm/getallpcmvalues`,           { headers: authHeaders }),
        fetch(`${API}/api/pcm/getallpcmcombinations`,     { headers: authHeaders }),
      ]);
      const subData      = await subRes.json();
      const pcmValData   = await pcmValRes.json();
      const pcmComboData = await pcmComboRes.json();

      if (subData?.statusCode === 200) {
        const subjects  = subData.data.subject  || [];
        const topics    = subData.data.topic    || [];
        const rawSubs   = subData.data.sub_topic || [];
        const subTopics = rawSubs.map(st => ({
          ...st,
          name: st.name || st.sub_topic_name || st.subtopic_name || st.label || "(unnamed)",
        }));
        setAllSubjects(subjects);
        setAllTopics(topics);
        setAllSubTopics(subTopics);
      }
      if (pcmValData?.success) {
        setPcmValues(pcmValData.data  || []);
        setPcmLevels(pcmValData.level || []);
      }
      if (pcmComboData?.success) {
        setPcmCombos(pcmComboData.data || []);
      }
    } catch (err) {
      showAlert("Failed to load config data: " + err.message, "danger");
    } finally {
      setBcLoading(false);
    }
  };

  // Auto-load when token already exists (returning user)
  const saveToken = () => {
    if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
    try {
      const tok = tokenInput.trim();
      localStorage.setItem("examly_token", tok);
      setToken(tok);
      setTokenInput("");
      setUI("batch-config");
      showAlert("Token saved! Loading config data...", "success");
      loadBcData(tok);
    } catch (err) { showAlert("Failed: " + err.message, "danger"); }
  };

  const clearToken = () => {
    try { localStorage.removeItem("examly_token"); } catch {}
    setToken(""); setUI("welcome"); resetAll();
    showAlert("Logged out", "danger");
  };

  const resetAll = () => {
    setBatchConfig({ topic_id: "", sub_topic_id: "", subject_id: "", pcm_combination_id: "", manual_difficulty: "Medium" });
    setQbSearchTerm(""); setQbSearchResults([]); setSelectedQB(null);
    setPasteInput(""); setParsedQuestions([]); setUploadResults(null);
    setShowPreview(false); setPreviewIndex(0);
  };

  const searchQBs = async () => {
    if (!qbSearchTerm.trim()) { showAlert("Enter a search term", "warning"); return; }
    showOverlay("🔍 Searching...");
    try {
      const res = await fetch(`${API}/api/questionbanks/all`, {
        method: "POST", headers,
        body: JSON.stringify({ department_id: DEPARTMENT_IDS, limit: 50, mainDepartmentUser: true, page: 1, search: qbSearchTerm })
      });
      const data = await res.json();
      const qbs = data?.questionbanks || [];
      setQbSearchResults(qbs);
      hideOverlay();
      if (qbs.length === 0) showAlert("No QBs found", "warning");
      else showAlert(`Found ${qbs.length} QB(s)`, "success");
    } catch (err) {
      hideOverlay();
      showAlert("Search error: " + err.message, "danger");
    }
  };

  const selectQB = (qb) => {
    setSelectedQB(qb);
    setQbSearchResults([]);
    showAlert(`QB selected: ${qb.qb_name}`, "success");
  };

  const handleParse = () => {
    if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
    const { questions, errors } = parseQuestions(pasteInput);

    if (errors.length > 0) {
      const preview = errors.slice(0, 6).join("\n");
      const more = errors.length > 6 ? `\n...and ${errors.length - 6} more` : "";
      showAlert(`❌ ${errors.length} error(s):\n\n${preview}${more}`, "danger");
      console.error("Parse errors:", errors);
      if (questions.length > 0) {
        setParsedQuestions(questions);
      }
      return;
    }

    setParsedQuestions(questions);
    showAlert(`✅ Parsed ${questions.length} question(s)!`, "success");
  };

  const uploadQuestions = async () => {
    if (parsedQuestions.length === 0) { showAlert("Parse first", "warning"); return; }
    if (!selectedQB) { showAlert("Select a QB first", "danger"); return; }

    setIsLoading(true);
    showOverlay("🔄 Starting upload...");

    const results = { total: parsedQuestions.length, success: 0, failed: 0, errors: [], ids: [] };

    try {
      const userId = selectedQB.user_id || "system";

      for (let i = 0; i < parsedQuestions.length; i += BATCH_SIZE) {
        const batch = parsedQuestions.slice(i, i + BATCH_SIZE);
        const bNum = Math.floor(i / BATCH_SIZE) + 1;
        const bTotal = Math.ceil(parsedQuestions.length / BATCH_SIZE);
        showOverlay(`📦 Batch ${bNum}/${bTotal}...`);
        setUploadProgress({ current: i, total: parsedQuestions.length });

        await Promise.all(batch.map(async (q, idx) => {
          const gi = i + idx;
          try {
            const payload = buildPayload(q, batchConfig, selectedQB.qb_id, userId);
            const res = await fetch(`${API}/api/programming_question/create`, {
              method: "POST", headers,
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
              results.success++;
              results.ids.push({ index: gi + 1, title: q.title, q_id: data.q_id });
            } else {
              throw new Error(data.message || "Upload failed");
            }
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
      if (results.failed === 0)
        showAlert(`🎉 All ${results.success} uploaded!`, "success");
      else
        showAlert(`⚠️ ${results.success} uploaded, ${results.failed} failed`, "warning");
      setUI("results");
    } catch (err) {
      hideOverlay();
      showAlert("Upload error: " + err.message, "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const startNewUpload = () => {
    setPasteInput(""); setParsedQuestions([]); setUploadResults(null);
    setUploadProgress({ current: 0, total: 0 });
    setShowPreview(false); setPreviewIndex(0);
    setUI("upload");
  };

  const currentQ = parsedQuestions[previewIndex];

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const downloadSampleFormat = () => {
    const txt = `━━━ COD SYNC — PASTE FORMAT REFERENCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED FIELDS
  TITLE:         One line — question title
  DIFFICULTY:    Easy | Medium | Hard
  LANGUAGE:      Comma-separated — Java, Python, C, C++   (varies per question)
  TAGS:          Comma-separated — strings, loops, recursion
  DESCRIPTION:   Multiline — use HTML (see DESCRIPTION FORMAT section below)
  INPUT_FORMAT:  Multiline — plain text or HTML
  OUTPUT_FORMAT: Multiline — plain text or HTML
  TESTCASE:      One per line → input | output | difficulty | score
  SAMPLE_IO:     One per line → input | output

OPTIONAL FIELDS  (omit entirely if not needed)
  CONSTRAINTS:      Multiline — plain text or HTML
  HEADER[Lang]:     Multiline — code prepended before stub  (hasSnippet → true)
  FOOTER[Lang]:     Multiline — code appended after stub    (hasSnippet → true)
  CODE_STUB[Lang]:  Multiline — editable body shown to student  (optional)
  SOLUTION[Lang]:   Multiline — full correct solution
  WHITELIST[Lang]:  Comma-separated — e.g.  java, util
  BLACKLIST[Lang]:  Comma-separated — e.g.  While, goto

RULES
  • [Lang] = exact language name: [Java] [Python] [C] [C++]
  • Repeat HEADER/FOOTER/CODE_STUB/SOLUTION/WHITELIST/BLACKLIST per language
  • TESTCASE / SAMPLE_IO — each on ONE line, pipe-separated
  • Multi-line input/output — use \n as separator:
      e.g.  3 3\n10 20 30\n5 5 5      means:  3 3 / 10 20 30 / 5 5 5
  • manual_difficulty set ONCE for the batch in Batch Configuration screen

━━━ DESCRIPTION FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always start DESCRIPTION with a bold + underline "Problem Statement" heading.

DESCRIPTION:
<p><strong><u>Problem Statement</u></strong></p>
<p><br></p>
<p>Your problem description here. Use <b>bold</b> for key terms.</p>
<p><br></p>
<p>The system must satisfy the following conditions:</p>
<ul>
  <li>Condition one.</li>
  <li>Condition two.</li>
  <li>Condition three.</li>
</ul>
<p><br></p>
<p>However, the provided code contains certain issues and may not execute correctly.
Your task is to identify and fix the bugs so that the program runs successfully.</p>

HTML tags allowed in DESCRIPTION / INPUT_FORMAT / OUTPUT_FORMAT / CONSTRAINTS:
  <p>...</p>              paragraph
  <p><br></p>             blank line spacer
  <b>...</b>              bold
  <strong>...</strong>    bold
  <u>...</u>              underline
  <em>...</em>            italic
  <ul><li>...</li></ul>   bullet list
  <ol><li>...</li></ol>   numbered list

IMPORTANT: If your text contains < or > as literal characters
(e.g.  Row <i>: <sum>)  write them as plain text — the tool auto-escapes them.
Only use < > inside actual HTML tags listed above.

━━━ TEMPLATE — COPY THIS BLOCK AND FILL IN ━━━━━━━━━━━━━━━━━━━━━━━━

---QUESTION---
TITLE: 
DIFFICULTY: Medium
LANGUAGE: Java
TAGS: 

DESCRIPTION:
<p><strong><u>Problem Statement</u></strong></p>
<p><br></p>
<p>Describe the real-world context and problem here.</p>
<p><br></p>
<p>The system must satisfy the following conditions:</p>
<ul>
  <li>Condition one with <b>key term</b>.</li>
  <li>Condition two.</li>
</ul>
<p><br></p>
<p>However, the provided code contains certain issues and may not execute correctly.
Your task is to identify and fix the bugs so that the program runs successfully.</p>

INPUT_FORMAT:
Describe input format here.

OUTPUT_FORMAT:
Describe output format here.

CONSTRAINTS:
Describe constraints here. e.g. 1 ≤ N ≤ 100

HEADER[Java]:
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {

FOOTER[Java]:
    }
}

CODE_STUB[Java]:
        // buggy code here

SOLUTION[Java]:
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        // correct solution here
    }
}

TESTCASE: input1 | output1 | Easy | 25
TESTCASE: input2 | output2 | Medium | 25
TESTCASE: input3 | output3 | Hard | 25
TESTCASE: input4 | output4 | Hard | 25

SAMPLE_IO: input1 | output1
SAMPLE_IO: input2 | output2
---END---

━━━ FULL EXAMPLE (Java + Python, multi-line input) ━━━━━━━━━━━━━━━━

---QUESTION---
TITLE: Validate Product Code
DIFFICULTY: Medium
LANGUAGE: Java, Python
TAGS: strings, validation, debugging

DESCRIPTION:
<p><strong><u>Problem Statement</u></strong></p>
<p><br></p>
<p>A product code verification system is being developed for an e-commerce warehouse.
Each product must follow a strict format before it is accepted into inventory.</p>
<p><br></p>
<p>A valid product code must satisfy all of the following conditions:</p>
<ul>
  <li>The product code must start with <b>"PRD"</b>.</li>
  <li>The product code must end with <b>"X"</b>.</li>
  <li>The total length must be exactly <b>8 characters</b>.</li>
</ul>
<p><br></p>
<p>However, the provided code contains certain issues and may not execute correctly.
Your task is to identify and fix the bugs so that the program runs successfully.</p>

INPUT_FORMAT:
A single line containing the product code string.

OUTPUT_FORMAT:
Print Valid Product Code or Invalid Product Code.

CONSTRAINTS:
1 ≤ length of code ≤ 20. Uppercase letters and digits only.

HEADER[Java]:
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {

FOOTER[Java]:
    }
}

WHITELIST[Java]: java, util
BLACKLIST[Java]: While, goto

CODE_STUB[Java]:
        Scanner sc = new Scanner(System.in)
        String code = sc.nextLine();
        if(code.length() >= 8 && code.startsWith("PRD") & code.endsWith("X")){
            System.out.println("Valid Product Code");
        } else {
            System.out.println("Invalid Product Code");
        }

SOLUTION[Java]:
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String code = sc.nextLine();
        if(code.length() == 8 && code.startsWith("PRD") && code.endsWith("X")){
            System.out.println("Valid Product Code");
        } else {
            System.out.println("Invalid Product Code");
        }
    }
}

CODE_STUB[Python]:
code = input()
if len(code) >= 8 and code.startswith("PRD") and code.endswith("X"):
    print("Valid Product Code")
else:
    print("Invalid Product Code")

SOLUTION[Python]:
code = input()
if len(code) == 8 and code.startswith("PRD") and code.endswith("X"):
    print("Valid Product Code")
else:
    print("Invalid Product Code")

TESTCASE: PRD5678X | Valid Product Code | Easy | 20
TESTCASE: PRD12345 | Invalid Product Code | Medium | 20
TESTCASE: ABC1234X | Invalid Product Code | Easy | 20
TESTCASE: PRD12X | Invalid Product Code | Medium | 20
TESTCASE: PRDXXXXXX | Invalid Product Code | Hard | 10
TESTCASE: PRD1234XX | Invalid Product Code | Hard | 10

SAMPLE_IO: PRD1234X | Valid Product Code
SAMPLE_IO: PRD12X | Invalid Product Code
SAMPLE_IO: ABC1234X | Invalid Product Code
---END---

━━━ EXAMPLE WITH MULTI-LINE INPUT (C language, grid problem) ━━━━━━

---QUESTION---
TITLE: Warehouse Grid Stock Checker
DIFFICULTY: Medium
LANGUAGE: C
TAGS: 2d array, loops, debugging

DESCRIPTION:
<p><strong><u>Problem Statement</u></strong></p>
<p><br></p>
<p>A smart warehouse is structured as a 2D grid of <b>R rows</b> and <b>C columns</b>.</p>
<p>Find the <b>total stock in each row</b> and the <b>row with maximum total stock</b>.</p>
<p><br></p>
<p>However, the provided code contains certain issues and may not execute correctly.
Your task is to identify and fix the bugs so that the program runs successfully.</p>

INPUT_FORMAT:
The first line contains R and C. The next R lines each contain C integers.

OUTPUT_FORMAT:
Print R lines: Row i: sum
Then: Max Stock Row: row_number

CONSTRAINTS:
1 ≤ R, C ≤ 10
0 ≤ stock value ≤ 500

CODE_STUB[C]:
#include <stdio.h>
int main() {
    // buggy code
    return 0;
}

SOLUTION[C]:
#include <stdio.h>
int main() {
    // correct solution
    return 0;
}

TESTCASE: 3 3\n10 20 30\n5 5 5\n100 200 300 | Row 1: 60\nRow 2: 15\nRow 3: 600\nMax Stock Row: 3 | Hard | 25
TESTCASE: 2 4\n50 60 70 80\n10 20 30 40 | Row 1: 260\nRow 2: 100\nMax Stock Row: 1 | Hard | 25

SAMPLE_IO: 3 3\n10 20 30\n5 5 5\n100 200 300 | Row 1: 60\nRow 2: 15\nRow 3: 600\nMax Stock Row: 3
---END---
`;
    const blob = new Blob([txt], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "CODSync_PasteFormat.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert("📥 Sample format downloaded!", "success");
  };

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
          <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
            {alert.msg}
          </pre>
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
                {currentQ.languages.map(l => (
                  <span key={l} className="cod-preview-lang">💻 {l}</span>
                ))}
                {currentQ.tags.filter(t => t).map(t => (
                  <span key={t} className="cod-preview-tag">🏷️ {t}</span>
                ))}
              </div>

              <div className="cod-preview-section">
                <h4>Title</h4>
                <p className="cod-preview-title-text">{currentQ.title}</p>
              </div>
              <div className="cod-preview-section">
                <h4>Description</h4>
                <div className="cod-preview-html"
                  dangerouslySetInnerHTML={{ __html: currentQ.description }} />
              </div>
              <div className="cod-preview-2col">
                <div className="cod-preview-section">
                  <h4>Input Format</h4>
                  <p>{currentQ.inputFmt}</p>
                </div>
                <div className="cod-preview-section">
                  <h4>Output Format</h4>
                  <p>{currentQ.outputFmt}</p>
                </div>
              </div>
              {currentQ.constraints && (
                <div className="cod-preview-section">
                  <h4>Constraints</h4>
                  <p>{currentQ.constraints}</p>
                </div>
              )}
              {currentQ.languages.map(lang => (
                <div key={lang} className="cod-preview-lang-block">
                  <div className="cod-preview-lang-header">
                    <span className="cod-lang-pill">{lang}</span>
                    {(currentQ.headers?.[lang] || currentQ.footers?.[lang]) && (
                      <span className="cod-snippet-badge">📎 Header/Footer</span>
                    )}
                    {currentQ.whitelists?.[lang] && (
                      <span className="cod-wl-badge">✅ WL: {currentQ.whitelists[lang]}</span>
                    )}
                    {currentQ.blacklists?.[lang] && (
                      <span className="cod-bl-badge">🚫 BL: {currentQ.blacklists[lang]}</span>
                    )}
                  </div>
                  {currentQ.headers?.[lang] && (
                    <div className="cod-preview-section">
                      <h4>Header</h4>
                      <pre className="cod-preview-code"><code>{currentQ.headers[lang]}</code></pre>
                    </div>
                  )}
                  {currentQ.codeStubs[lang] && (
                    <div className="cod-preview-section">
                      <h4>Code Stub</h4>
                      <pre className="cod-preview-code"><code>{currentQ.codeStubs[lang]}</code></pre>
                    </div>
                  )}
                  {currentQ.footers?.[lang] && (
                    <div className="cod-preview-section">
                      <h4>Footer</h4>
                      <pre className="cod-preview-code"><code>{currentQ.footers[lang]}</code></pre>
                    </div>
                  )}
                  {currentQ.solutions[lang] && (
                    <div className="cod-preview-section">
                      <h4>Solution</h4>
                      <pre className="cod-preview-code"><code>{currentQ.solutions[lang]}</code></pre>
                    </div>
                  )}
                </div>
              ))}
              <div className="cod-preview-section">
                <h4>
                  Test Cases ({currentQ.testcases.length}) + Sample I/O ({currentQ.sampleIO.length})
                </h4>
                <div className="cod-tc-grid">
                  {currentQ.testcases.slice(0, 5).map((tc, i) => (
                    <div key={i} className="cod-tc-row">
                      <span className="cod-tc-badge">TC{i + 1} · {tc.difficulty} · {tc.score}pts</span>
                      <span className="cod-tc-io">In: <code>{tc.input}</code></span>
                      <span className="cod-tc-io">Out: <code>{tc.output.trim()}</code></span>
                    </div>
                  ))}
                  {currentQ.testcases.length > 5 && (
                    <div className="cod-tc-more">+{currentQ.testcases.length - 5} more hidden TCs</div>
                  )}
                  {currentQ.sampleIO.map((s, i) => (
                    <div key={`s${i}`} className="cod-tc-row cod-tc-sample">
                      <span className="cod-tc-badge cod-tc-badge-sample">Sample {i + 1}</span>
                      <span className="cod-tc-io">In: <code>{s.input}</code></span>
                      <span className="cod-tc-io">Out: <code>{s.output.trim()}</code></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="cod-preview-modal-footer">
              <button
                onClick={() => setPreviewIndex(p => Math.max(0, p - 1))}
                disabled={previewIndex === 0}
                className="cod-button cod-button-secondary cod-button-small"
              >← Prev</button>
              <span className="cod-preview-counter">
                {previewIndex + 1} / {parsedQuestions.length}
              </span>
              <button
                onClick={() => setPreviewIndex(p => Math.min(parsedQuestions.length - 1, p + 1))}
                disabled={previewIndex === parsedQuestions.length - 1}
                className="cod-button cod-button-secondary cod-button-small"
              >Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── WELCOME ── */}
      {ui === "welcome" && (
        <div className="cod-welcome">
          <div className="cod-welcome-icon">⚡</div>
          <h2 className="cod-welcome-title">COD Sync</h2>
          <p className="cod-welcome-subtitle">
            Paste Claude-generated coding questions — bulk upload to question banks
          </p>
          <textarea
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            placeholder="Paste your Authorization token here..."
            className="cod-token-input"
          />
          <button onClick={saveToken} className="cod-button cod-button-primary">
            Save Token & Continue
          </button>
          <p className="cod-token-hint">💡 Token saved locally for future sessions</p>
        </div>
      )}

      {/* ── BATCH CONFIG ── */}
      {ui === "batch-config" && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <h3 className="cod-title">⚙️ Batch Configuration</h3>
              <p className="cod-subtitle">Select Subject → Topic → Sub Topic → PCM Combination</p>
            </div>
            <div className="cod-header-actions">
              {bcLoading && <span className="cod-bc-loading">⏳ Loading...</span>}
              <button onClick={clearToken}
                className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          {/* Loading state */}
          {bcLoading && (
            <div className="cod-bc-autoload">
              <div className="cod-bc-autoload-spinner"></div>
              <span>Loading subjects & PCM data...</span>
            </div>
          )}

          {allSubjects.length > 0 && (
            <div className="cod-bc-data-info">
              <span>📋 {allSubjects.length} subjects</span>
              <span>·</span>
              <span>🗂 {allTopics.length} topics</span>
              <span>·</span>
              <span>📌 {allSubTopics.length} sub topics</span>
              <span>·</span>
              <span>🔗 {pcmCombos.length} PCM combos</span>
              <button
                onClick={() => {
                  setBatchConfig({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"" });
                  setSelSubject(null); setSelTopic(null); setSelSubTopic(null);
                  setPcmSubjectSel(null); setPcmTopicSel(null); setPcmLevelSel(null);
                  setSubjectSearch(""); setTopicSearch(""); setSubTopicSearch("");
                  setPcmSubjectSearch(""); setPcmTopicSearch("");
                }}
                className="cod-button cod-button-secondary cod-button-small"
              >↺ Reset</button>
            </div>
          )}

          {allSubjects.length > 0 && (
            <div className="cod-bc-sections">

              {/* ── Unified search: Sub Topic / Topic / Subject ── */}
              <div className="cod-bc-panel">
                <div className="cod-bc-panel-title">
                  🔍 Search Sub Topic / Topic / Subject <span className="cod-required">*</span>
                </div>
                <input
                  type="text"
                  value={subTopicSearch}
                  onChange={e => { setSubTopicSearch(e.target.value); }}
                  placeholder="Search by sub topic, topic, or subject name..."
                  className="cod-input cod-search-input cod-st-input"
                  autoFocus
                  onFocus={() => setSubTopicFocused(true)}
                  onBlur={() => setTimeout(() => setSubTopicFocused(false), 200)}
                />

                {/* Results list */}
                {(subTopicSearch.trim().length > 0 || subTopicFocused) && allSubTopics.length > 0 && (
                  <div className="cod-bc-list cod-bc-subtopic-list">
                    {(() => {
                      const term = subTopicSearch.toLowerCase().trim();

                      // Build enriched list with topic + subject resolved
                      const enriched = allSubTopics.map(st => {
                        const stId   = st.sub_topic_id || st.id;
                        const topic   = allTopics.find(t => t.topic_id === (st.topic_id || st.topicId));
                        const subject = allSubjects.find(s => s.subject_id === (topic?.subject_id || topic?.subjectId));
                        return { st, stId, topic, subject };
                      });

                      // Search across sub topic name, topic name, subject name
                      const filtered = (term
                        ? enriched.filter(({ st, topic, subject }) =>
                            st.name.toLowerCase().includes(term) ||
                            topic?.name.toLowerCase().includes(term) ||
                            subject?.name.toLowerCase().includes(term)
                          )
                        : enriched
                      ).slice(0, 50);

                      if (filtered.length === 0) {
                        return (
                          <div className="cod-bc-empty" style={{border:"none"}}>
                            No results for "{subTopicSearch}"
                          </div>
                        );
                      }

                      return filtered.map(({ st, stId, topic, subject }) => {
                        const isSelected = selSubTopic?.sub_topic_id === stId;
                        // Highlight which part matched
                        const matchedTopic   = term && topic?.name.toLowerCase().includes(term) && !st.name.toLowerCase().includes(term);
                        const matchedSubject = term && subject?.name.toLowerCase().includes(term) && !st.name.toLowerCase().includes(term) && !topic?.name.toLowerCase().includes(term);
                        return (
                          <div
                            key={stId}
                            className={`cod-bc-item cod-bc-subtopic-item ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setSelSubTopic({ ...st, sub_topic_id: stId });
                              setSelTopic(topic || null);
                              setSelSubject(subject || null);
                              setSubTopicSearch(st.name);
                              setBatchConfig(p => ({
                                ...p,
                                sub_topic_id: stId,
                                topic_id:     topic?.topic_id     || p.topic_id,
                                subject_id:   subject?.subject_id || p.subject_id,
                              }));
                            }}
                          >
                            {/* Sub Topic → Topic → Subject */}
                            <span className={`cod-st-name ${matchedTopic || matchedSubject ? "cod-st-dim" : ""}`}>
                              {st.name}
                            </span>
                            <span className="cod-st-breadcrumb">
                              {topic && (
                                <span className={`cod-st-topic ${matchedTopic ? "cod-st-match" : ""}`}>
                                  {topic.name}
                                </span>
                              )}
                              {subject && (
                                <span className={`cod-st-subject ${matchedSubject ? "cod-st-match" : ""}`}>
                                  {subject.name}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Selected — show resolved chain */}
                {selSubTopic && (
                  <div className="cod-bc-resolved">
                    <div className="cod-bc-resolved-row">
                      <span className="cod-bc-resolved-label">Sub Topic</span>
                      <span className="cod-bc-resolved-val">{selSubTopic.name}</span>
                      <code className="cod-bc-resolved-id">{(selSubTopic.sub_topic_id||"").slice(0,8)}…</code>
                    </div>
                    <div className="cod-bc-resolved-row">
                      <span className="cod-bc-resolved-label">Topic</span>
                      <span className="cod-bc-resolved-val">{selTopic?.name || <em style={{color:"var(--cod-amber)"}}>not found</em>}</span>
                      <code className="cod-bc-resolved-id">{(selTopic?.topic_id||"").slice(0,8)}{selTopic ? "…" : ""}</code>
                    </div>
                    <div className="cod-bc-resolved-row">
                      <span className="cod-bc-resolved-label">Subject</span>
                      <span className="cod-bc-resolved-val">{selSubject?.name || <em style={{color:"var(--cod-amber)"}}>not found</em>}</span>
                      <code className="cod-bc-resolved-id">{(selSubject?.subject_id||"").slice(0,8)}{selSubject ? "…" : ""}</code>
                    </div>
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

              {/* ── Section 4: PCM Combination ── */}
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
                        return `${subj?.name || "?"} › ${topic?.label || "?"} › ${level?.label || "?"}`;
                      })()}
                    </span>
                  )}
                </div>

                <div className="cod-pcm-selectors">
                  {/* PCM Subject */}
                  <div className="cod-pcm-col">
                    <label className="cod-label">PCM Subject</label>
                    <input
                      type="text"
                      value={pcmSubjectSearch}
                      onChange={e => { setPcmSubjectSearch(e.target.value); setPcmTopicSel(null); setPcmLevelSel(null); }}
                      placeholder="🔍 Search..."
                      className="cod-input"
                    />
                    <div className="cod-bc-list">
                      {pcmValues
                        .filter(s => s.name.toLowerCase().includes(pcmSubjectSearch.toLowerCase()))
                        .map(s => (
                          <div
                            key={s.pcm_subject_id}
                            className={`cod-bc-item ${pcmSubjectSel?.pcm_subject_id === s.pcm_subject_id ? "selected" : ""}`}
                            onClick={() => { setPcmSubjectSel(s); setPcmTopicSel(null); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id: "" })); }}
                          >
                            {s.name}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* PCM Topic */}
                  <div className="cod-pcm-col">
                    <label className="cod-label">PCM Topic</label>
                    {!pcmSubjectSel
                      ? <div className="cod-bc-empty">Select PCM subject first</div>
                      : <>
                        <input
                          type="text"
                          value={pcmTopicSearch}
                          onChange={e => setPcmTopicSearch(e.target.value)}
                          placeholder="🔍 Search..."
                          className="cod-input"
                        />
                        <div className="cod-bc-list">
                          {(pcmSubjectSel.pcm_topic || [])
                            .filter(t => t.label.toLowerCase().includes(pcmTopicSearch.toLowerCase()))
                            .map(t => (
                              <div
                                key={t.value}
                                className={`cod-bc-item ${pcmTopicSel?.value === t.value ? "selected" : ""}`}
                                onClick={() => { setPcmTopicSel(t); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id: "" })); }}
                              >
                                {t.label}
                              </div>
                            ))}
                        </div>
                      </>
                    }
                  </div>

                  {/* PCM Level */}
                  <div className="cod-pcm-col">
                    <label className="cod-label">Level</label>
                    {!pcmTopicSel
                      ? <div className="cod-bc-empty">Select PCM topic first</div>
                      : <div className="cod-bc-list">
                          {pcmLevels.map(l => {
                            // Check if this combo actually exists
                            const exists = pcmCombos.some(c =>
                              c.pcm_subject_id === pcmSubjectSel?.pcm_subject_id &&
                              c.pcm_topic_id   === pcmTopicSel?.value &&
                              c.pcm_level_id   === l.value
                            );
                            return (
                              <div
                                key={l.value}
                                className={`cod-bc-item ${!exists ? "cod-bc-item-disabled" : ""} ${pcmLevelSel?.value === l.value ? "selected" : ""}`}
                                onClick={() => {
                                  if (!exists) return;
                                  setPcmLevelSel(l);
                                  // Find the combo id
                                  const combo = pcmCombos.find(c =>
                                    c.pcm_subject_id === pcmSubjectSel.pcm_subject_id &&
                                    c.pcm_topic_id   === pcmTopicSel.value &&
                                    c.pcm_level_id   === l.value
                                  );
                                  if (combo) {
                                    setBatchConfig(p => ({ ...p, pcm_combination_id: combo.id }));
                                    showAlert(`✅ PCM: ${pcmSubjectSel.name} › ${pcmTopicSel.label} › ${l.label}`, "success");
                                  }
                                }}
                              >
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
          )}

          {/* Summary + Next */}
          {batchConfig.subject_id && batchConfig.topic_id && batchConfig.sub_topic_id && batchConfig.pcm_combination_id && (
            <div className="cod-bc-summary">
              <div className="cod-bc-summary-row">
                <span className="cod-bc-summary-label">Subject</span>
                <span className="cod-bc-summary-val">{selSubject?.name}</span>
                <code className="cod-bc-summary-id">{batchConfig.subject_id.slice(0,8)}…</code>
              </div>
              <div className="cod-bc-summary-row">
                <span className="cod-bc-summary-label">Topic</span>
                <span className="cod-bc-summary-val">{selTopic?.name}</span>
                <code className="cod-bc-summary-id">{batchConfig.topic_id.slice(0,8)}…</code>
              </div>
              <div className="cod-bc-summary-row">
                <span className="cod-bc-summary-label">Sub Topic</span>
                <span className="cod-bc-summary-val">{selSubTopic?.name}</span>
                <code className="cod-bc-summary-id">{batchConfig.sub_topic_id.slice(0,8)}…</code>
              </div>
              <div className="cod-bc-summary-row">
                <span className="cod-bc-summary-label">PCM Combo</span>
                <span className="cod-bc-summary-val">
                  {pcmSubjectSel?.name} › {pcmTopicSel?.label} › {pcmLevelSel?.label}
                </span>
                <code className="cod-bc-summary-id">{batchConfig.pcm_combination_id.slice(0,8)}…</code>
              </div>
            </div>
          )}

          {/* Manual Difficulty selector */}
          <div className="cod-difficulty-selector">
            <label className="cod-label">Manual Difficulty <span className="cod-required">*</span></label>
            <div className="cod-diff-buttons">
              {["Easy", "Medium", "Hard"].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setBatchConfig(p => ({ ...p, manual_difficulty: d }))}
                  className={`cod-diff-btn cod-diff-btn-${d.toLowerCase()} ${batchConfig.manual_difficulty === d ? "active" : ""}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="cod-diff-note">This sets the question-level difficulty sent to the API. Individual TESTCASE difficulties are set per line in the paste.</p>
          </div>

          <button
            onClick={() => {
              if (!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id) {
                showAlert("Select Subject, Topic and Sub Topic", "danger"); return;
              }
              if (!batchConfig.pcm_combination_id) {
                showAlert("Select a PCM Combination", "danger"); return;
              }
              setUI("qb-select");
            }}
            disabled={!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id || !batchConfig.pcm_combination_id}
            className={`cod-button cod-button-primary ${(!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id || !batchConfig.pcm_combination_id) ? "cod-button-disabled" : ""}`}
          >
            Next → Select Question Bank
          </button>
        </div>
      )}

      {/* ── QB SELECT ── */}
      {ui === "qb-select" && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <h3 className="cod-title">📚 Select Question Bank</h3>
              <p className="cod-subtitle">Pick the QB to upload coding questions into</p>
            </div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("batch-config")}
                className="cod-button cod-button-secondary cod-button-small">← Back</button>
              <button onClick={clearToken}
                className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          {selectedQB && (
            <div className="cod-selected-qb-banner">
              <span className="cod-selected-qb-icon">✅</span>
              <div style={{ flex: 1 }}>
                <div className="cod-selected-qb-name">{selectedQB.qb_name}</div>
                <div className="cod-selected-qb-id">{selectedQB.qb_id}</div>
              </div>
              <button onClick={() => setUI("upload")}
                className="cod-button cod-button-success cod-button-small">
                Continue →
              </button>
            </div>
          )}

          <div className="cod-search-row">
            <input
              type="text"
              value={qbSearchTerm}
              onChange={e => setQbSearchTerm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchQBs()}
              placeholder="Search question bank by name..."
              className="cod-input"
            />
            <button
              onClick={searchQBs}
              disabled={!qbSearchTerm.trim()}
              className={`cod-button cod-button-primary cod-button-small ${!qbSearchTerm.trim() ? "cod-button-disabled" : ""}`}
            >
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
                        <span className="cod-qb-id-pill">{qb.qb_id.slice(0, 8)}…</span>
                      </div>
                    </div>
                    <button onClick={() => selectQB(qb)}
                      className="cod-button cod-button-success cod-button-small">
                      ✓ Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD (paste + parse) ── */}
      {ui === "upload" && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <h3 className="cod-title">⚡ COD Sync — Paste & Upload</h3>
              {selectedQB && (
                <p className="cod-subtitle">
                  📚 <strong>{selectedQB.qb_name}</strong>
                  <span className="cod-qb-id-inline"> · {selectedQB.qb_id.slice(0, 8)}…</span>
                </p>
              )}
            </div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("qb-select")}
                className="cod-button cod-button-secondary cod-button-small">← QB</button>
              <button onClick={clearToken}
                className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          {/* Format reference (collapsible) */}
          <details className="cod-format-hint">
            <summary className="cod-format-hint-title">
              <span>📋 Paste format reference — click to expand</span>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); downloadSampleFormat(); }}
                className="cod-button cod-button-info cod-button-small"
                style={{ marginLeft: "auto" }}
              >
                📥 Download .txt
              </button>
            </summary>
            <pre className="cod-format-pre">{`━━━ FIELD REFERENCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED FIELDS
  TITLE:         One line — question title
  DIFFICULTY:    Easy | Medium | Hard
  LANGUAGE:      Comma-separated — Java, Python, C, C++   (varies per question)
  TAGS:          Comma-separated — strings, loops, recursion
  DESCRIPTION:   Multiline — use HTML (see format below)
  INPUT_FORMAT:  Multiline — plain text or HTML
  OUTPUT_FORMAT: Multiline — plain text or HTML
  TESTCASE:      One per line → input | output | difficulty | score
  SAMPLE_IO:     One per line → input | output

OPTIONAL FIELDS  (omit entirely if not needed)
  CONSTRAINTS:      Multiline — plain text or HTML
  HEADER[Lang]:     Multiline — code prepended before stub  (hasSnippet → true)
  FOOTER[Lang]:     Multiline — code appended after stub    (hasSnippet → true)
  CODE_STUB[Lang]:  Multiline — editable body shown to student  (optional)
  SOLUTION[Lang]:   Multiline — full correct solution
  WHITELIST[Lang]:  Comma-separated — e.g.  java, util
  BLACKLIST[Lang]:  Comma-separated — e.g.  While, goto

RULES
  • [Lang] = exact language name: [Java] [Python] [C] [C++]
  • Repeat HEADER/FOOTER/CODE_STUB/SOLUTION/WHITELIST/BLACKLIST per language
  • TESTCASE / SAMPLE_IO — each on ONE line, pipe-separated
  • Multi-line input/output — use \n as separator:
      e.g.  3 3\n10 20 30\n5 5 5      →  3 3 / 10 20 30 / 5 5 5
  • manual_difficulty set ONCE for the batch in Batch Configuration screen

━━━ DESCRIPTION FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Always start DESCRIPTION with a bold + underline "Problem Statement" heading,
then write the problem body as HTML paragraphs and lists.

DESCRIPTION:
<p><strong><u>Problem Statement</u></strong></p>
<p><br></p>
<p>Your problem description here. Use <b>bold</b> for key terms.</p>
<p><br></p>
<p>The system must satisfy the following conditions:</p>
<ul>
  <li>Condition one.</li>
  <li>Condition two.</li>
  <li>Condition three.</li>
</ul>
<p><br></p>
<p>However, the provided code contains certain issues and may not execute
correctly. Your task is to identify and fix the bugs so that the program
runs successfully.</p>

  HTML tags allowed in DESCRIPTION / INPUT_FORMAT / OUTPUT_FORMAT / CONSTRAINTS:
    <p>...</p>          paragraph
    <p><br></p>         blank line spacer
    <b>...</b>          bold
    <strong>...</strong> bold
    <u>...</u>          underline
    <em>...</em>        italic
    <ul><li>...</li></ul>  bullet list
    <ol><li>...</li></ol>  numbered list

  IMPORTANT: If your text contains < or > as literal characters
  (e.g.  Row <i>: <sum>)  write them as plain text — the tool will
  auto-escape them so the platform shows them correctly.
  Only use < > inside actual HTML tags listed above.

━━━ EXAMPLE BLOCK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---QUESTION---
TITLE: Validate Product Code
DIFFICULTY: Medium
LANGUAGE: Java, Python
TAGS: strings, validation, debugging

DESCRIPTION:
<p><strong><u>Problem Statement</u></strong></p>
<p><br></p>
<p>A product code verification system is being developed for an e-commerce warehouse.
Each product must follow a strict format before it is accepted into inventory.</p>
<p><br></p>
<p>A valid product code must satisfy all of the following conditions:</p>
<ul>
  <li>The product code must start with <b>"PRD"</b>.</li>
  <li>The product code must end with <b>"X"</b>.</li>
  <li>The total length must be exactly <b>8 characters</b>.</li>
</ul>
<p><br></p>
<p>However, the provided code contains certain issues and may not execute correctly.
Your task is to identify and fix the bugs so that the program runs successfully.</p>

INPUT_FORMAT:
A single line containing the product code string.

OUTPUT_FORMAT:
Print Valid Product Code or Invalid Product Code.

CONSTRAINTS:
1 ≤ length of code ≤ 20. Uppercase letters and digits only.

HEADER[Java]:
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {

FOOTER[Java]:
    }
}

WHITELIST[Java]: java, util
BLACKLIST[Java]: While, goto

CODE_STUB[Java]:
        Scanner sc = new Scanner(System.in)
        String code = sc.nextLine();
        if(code.length() >= 8 && code.startsWith("PRD") & code.endsWith("X")){
            System.out.println("Valid Product Code");
        } else {
            System.out.println("Invalid Product Code");
        }

SOLUTION[Java]:
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String code = sc.nextLine();
        if(code.length() == 8 && code.startsWith("PRD") && code.endsWith("X")){
            System.out.println("Valid Product Code");
        } else {
            System.out.println("Invalid Product Code");
        }
    }
}

TESTCASE: PRD5678X | Valid Product Code | Easy | 20
TESTCASE: PRD12345 | Invalid Product Code | Medium | 20
TESTCASE: ABC1234X | Invalid Product Code | Easy | 20
TESTCASE: PRD12X | Invalid Product Code | Medium | 20
TESTCASE: PRDXXXXXX | Invalid Product Code | Hard | 10
TESTCASE: PRD1234XX | Invalid Product Code | Hard | 10

SAMPLE_IO: PRD1234X | Valid Product Code
SAMPLE_IO: PRD12X | Invalid Product Code
SAMPLE_IO: ABC1234X | Invalid Product Code
---END---`}
</pre>
          </details>

          {/* Paste area */}
          <div className="cod-paste-area">
            <div className="cod-paste-header">
              <label className="cod-label">
                Paste Claude output here
                {pasteInput && (
                  <span className="cod-label-count">
                    &nbsp;·&nbsp;
                    {(pasteInput.match(/---QUESTION---/gi) || []).length} block(s) detected
                  </span>
                )}
              </label>
              {pasteInput && (
                <button
                  onClick={() => { setPasteInput(""); setParsedQuestions([]); }}
                  className="cod-button cod-button-secondary cod-button-small"
                >
                  🗑 Clear
                </button>
              )}
            </div>
            <textarea
              value={pasteInput}
              onChange={e => setPasteInput(e.target.value)}
              placeholder={
                "Paste the ---QUESTION--- ... ---END--- block(s) from Claude here.\n" +
                "Multiple questions supported — paste them all at once."
              }
              className="cod-paste-textarea"
              spellCheck={false}
            />
          </div>

          <button
            onClick={handleParse}
            disabled={!pasteInput.trim()}
            className={`cod-button cod-button-primary ${!pasteInput.trim() ? "cod-button-disabled" : ""}`}
          >
            🔍 Parse & Validate
          </button>

          {/* Parsed list */}
          {parsedQuestions.length > 0 && (
            <div className="cod-parsed-section">
              <div className="cod-parsed-header">
                <h4 className="cod-parsed-title">
                  ✅ {parsedQuestions.length} question(s) ready
                </h4>
                <button
                  onClick={() => { setPreviewIndex(0); setShowPreview(true); }}
                  className="cod-button cod-button-info cod-button-small"
                >
                  👁 Preview All
                </button>
              </div>

              <div className="cod-parsed-list">
                {parsedQuestions.map((q, i) => (
                  <div key={i} className="cod-parsed-item">
                    <span className="cod-parsed-num">Q{i + 1}</span>
                    <span className="cod-parsed-qtitle">{q.title}</span>
                    <span className="cod-parsed-langs">
                      {q.languages.map(l => (
                        <span key={l} className="cod-lang-pill">{l}</span>
                      ))}
                    </span>
                    <span className={`cod-diff-pill cod-diff-${q.difficulty.toLowerCase()}`}>
                      {q.difficulty}
                    </span>
                    <span className="cod-parsed-tc">{q.testcases.length} TCs</span>
                  </div>
                ))}
              </div>

              {!selectedQB && (
                <p className="cod-warn-text">
                  ⚠️ Go back and select a Question Bank first
                </p>
              )}

              <button
                onClick={uploadQuestions}
                disabled={isLoading || !selectedQB}
                className={`cod-button cod-button-success ${(isLoading || !selectedQB) ? "cod-button-disabled" : ""}`}
              >
                {isLoading
                  ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}…`
                  : `🚀 Upload ${parsedQuestions.length} Question(s) → "${selectedQB?.qb_name}"`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {ui === "results" && uploadResults && (
        <div className="cod-card">
          <div className="cod-result-section">
            <div className="cod-result-icon">
              {uploadResults.failed === 0 ? "🎉" : "⚠️"}
            </div>
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
              <button onClick={startNewUpload} className="cod-button cod-button-primary">
                ⚡ Upload More
              </button>
              <button
                onClick={() => { setParsedQuestions([]); setUploadResults(null); setUI("qb-select"); }}
                className="cod-button cod-button-secondary"
              >
                📚 Change QB
              </button>
              <button
                onClick={() => { resetAll(); setUI("batch-config"); }}
                className="cod-button cod-button-secondary"
              >
                ⚙️ New Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}