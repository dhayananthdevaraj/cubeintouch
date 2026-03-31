
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import "./ResultX.css";

const API    = "https://api.examly.io";
// const AI_API = "http://localhost:4000";
const AI_API = "https://cubeintouch-backend.onrender.com";
const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));

const BATCH_SIZE     = 3;
const BATCH_DELAY_MS = 65_000;

const TECH_STACKS = [
  { id: "puppeteer",  label: "Puppeteer",  icon: "🎭" },
  { id: "node-jest",  label: "Node Jest",  icon: "🟢" },
  { id: "react-jest", label: "React Jest", icon: "⚛️" },
  { id: "karma",      label: "Karma",      icon: "🔧" },
  { id: "junit",      label: "JUnit",      icon: "☕" },
  { id: "nunit",      label: "NUnit",      icon: "🔷" },
  { id: "pytest",     label: "Pytest",     icon: "🐍" },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function extractKeyFromAnswer(answerStr) {
  try {
    const parsed    = JSON.parse(answerStr);
    const resultStr = parsed?.resultList?.[0]?.result;
    if (!resultStr) return null;
    const resultParsed = JSON.parse(resultStr);
    return resultParsed?.key || resultParsed?.output?.key || null;
  } catch { return null; }
}

function extractTestcases(answerStr) {
  try { const parsed = JSON.parse(answerStr); return parsed?.tc_list || []; }
  catch { return []; }
}

function cleanName(raw) {
  if (!raw) return "Unknown";
  return raw.replace(/\$/g, " ").replace(/\s+/g, " ").trim();
}

function fileIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map  = { js: "🟨", jsx: "⚛️", ts: "🔷", tsx: "⚛️", html: "🌐", css: "🎨", java: "☕", cs: "🟣" };
  return map[ext] || "📄";
}

function folderIcon(folderName) {
  const lower = folderName.toLowerCase();
  if (lower.includes("controller")) return "🎮";
  if (lower.includes("model"))      return "📦";
  if (lower.includes("service"))    return "⚙️";
  if (lower.includes("repository")) return "🗄️";
  if (lower.includes("exception"))  return "⚠️";
  if (lower.includes("data"))       return "🗃️";
  if (lower.includes("component"))  return "🧩";
  if (lower.includes("page"))       return "📄";
  if (lower.includes("hook"))       return "🪝";
  if (lower.includes("util"))       return "🔧";
  if (lower.includes("src"))        return "📁";
  return "📁";
}

// ── parse all questions across all sections ───────────────────────────────────

function parseResultData(apiData, url) {
  const sections    = apiData?.frozen_test_data || [];
  const studentName = cleanName(apiData?.users_domain?.name || apiData?.users_domain?.email || "Unknown");
  const email       = apiData?.users_domain?.email || "";

  const allQuestions = sections.flatMap((sec, secIdx) =>
    (sec.questions || []).map((q) => {
      const answerStr = q?.student_questions?.answer || "";
      const tcList    = extractTestcases(answerStr);
      const evalTypes = q?.project_questions?.evaluation_type || [];

      return {
        label:          sections.length > 1 ? (sec.name || `Q${secIdx + 1}`) : null,
        qId:            q?.q_id || null,
        marks:          q?.student_questions?.marks ?? 0,
        total:          q?.project_questions?.total_marks ?? 0,
        evalType:       evalTypes.join(" + ") || "—",
        key:            extractKeyFromAnswer(answerStr),
        tcList,
        passCount:      tcList.filter(t => t.result?.toLowerCase() === "success").length,
        failCount:      tcList.filter(t => t.result?.toLowerCase() !== "success").length,
        questionHtml:   null,
        analysisReport: null,
        filesAnalyzed:  null,
        analysisError:  null,
      };
    })
  );

  return {
    studentName,
    email,
    url,
    marks:      apiData?.t_marks ?? 0,
    total:      apiData?.t_total_marks ?? 0,
    status:     apiData?.t_status,
    questions:  allQuestions,
    fetchError: null,
  };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ResultX() {
  const [token,      setToken]      = useState(() => { try { return localStorage.getItem("examly_token") || ""; } catch { return ""; } });
  const [tokenInput, setTokenInput] = useState("");
  const [ui,         setUi]         = useState(() => { try { return localStorage.getItem("examly_token") ? "upload" : "welcome"; } catch { return "welcome"; } });

  const [rows,      setRows]      = useState([]);
  const [results,   setResults]   = useState([]);
  const [manualUrl, setManualUrl] = useState("");
  const [techStack, setTechStack] = useState("puppeteer");

  const [processing,      setProcessing]      = useState(false);
  const [processedCount,  setProcessedCount]  = useState(0);
  const [analysingAll,    setAnalysingAll]    = useState(false);
  const [analyseAllCount, setAnalyseAllCount] = useState(0);
  const [analyseAllTotal, setAnalyseAllTotal] = useState(0);
  const [analyzingIdx,    setAnalyzingIdx]    = useState(null);
  const [batchCooldown,   setBatchCooldown]   = useState(null); // seconds remaining

  const [alert,       setAlert]       = useState(null);
  const [overlay,     setOverlay]     = useState(false);
  const [overlayText, setOverlayText] = useState("");

  const [questionModal, setQuestionModal] = useState(null);
  const [testcaseModal, setTestcaseModal] = useState(null);
  const [resultModal,   setResultModal]   = useState(null);
  const [analysisModal, setAnalysisModal] = useState(null);
  const [copyOk,        setCopyOk]        = useState(false);

  const [codeModal,       setCodeModal]       = useState(null);
  const [activeFile,      setActiveFile]      = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  const fileRef = useRef();

  // ── alert / overlay ──────────────────────────────────────────────────────────

  const showAlert = (msg, type = "warning") => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4000); };
  const showOv    = (msg) => { setOverlayText(msg); setOverlay(true); };
  const hideOv    = ()    => setOverlay(false);

  // ── auth ──────────────────────────────────────────────────────────────────────

  const saveToken = () => {
    if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
    localStorage.setItem("examly_token", tokenInput.trim());
    setToken(tokenInput.trim()); setUi("upload"); showAlert("Token saved!", "success");
  };

  const clearToken = () => {
    localStorage.removeItem("examly_token");
    setToken(""); setRows([]); setResults([]); setUi("welcome");
    showAlert("Logged out", "danger");
  };

  const headers = { "Content-Type": "application/json", Authorization: token };

  // ── file upload ───────────────────────────────────────────────────────────────

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const isCsv = file.name.endsWith(".csv");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = isCsv
          ? XLSX.read(evt.target.result, { type: "string" })
          : XLSX.read(evt.target.result, { type: "binary" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!json.length) { showAlert("Excel is empty", "danger"); return; }
        const firstRow = json[0];
        const urlKey   = Object.keys(firstRow).find(k => String(firstRow[k]).trim().startsWith("http")) || Object.keys(firstRow)[0];
        const parsed   = json
          .filter(r => String(r[urlKey] || "").trim().startsWith("http"))
          .map((r, i) => ({ idx: Date.now() + i, name: `Student ${rows.length + i + 1}`, url: String(r[urlKey]).trim() }));
        if (!parsed.length) { showAlert("No valid result URLs found", "danger"); return; }
        // PATCH C: append without wiping existing results
        setRows(prev => [...prev, ...parsed]);
        showAlert(`Added ${parsed.length} URLs from Excel`, "success");
      } catch (err) { showAlert("Failed to parse Excel: " + err.message, "danger"); }
    };
    reader.readAsBinaryString(file); e.target.value = "";
  };

  const addManualUrl = () => {
    const url = manualUrl.trim();
    if (!url.startsWith("http")) { showAlert("Enter a valid URL", "danger"); return; }
    setRows(prev => [...prev, { idx: Date.now(), name: `Student ${prev.length + 1}`, url }]);
    setManualUrl(""); showAlert("URL added", "success");
  };

  const removeRow = (idx) => setRows(prev => prev.filter(r => r.idx !== idx));
  const clearAll  = ()    => { setRows([]); setResults([]); showAlert("Cleared", "info"); };

  // ── fetch ─────────────────────────────────────────────────────────────────────

  async function fetchResult(url) {
    let testId = null;
    try { const u = new URL(url); testId = u.searchParams.get("testId") || u.searchParams.get("id"); }
    catch { throw new Error("Invalid URL"); }
    if (!testId) throw new Error("No testId in URL");
    const res = await fetch(`${API}/api/v2/test/student/resultanalysis`, { method: "POST", headers, body: JSON.stringify({ id: testId }) });
    if (!res.ok) throw new Error(`Result API ${res.status}`);
    return res.json();
  }

  async function fetchQuestion(qId) {
    const res = await fetch(`${API}/api/project_question/${qId}`, { headers: { Authorization: token } });
    if (!res.ok) throw new Error(`Question API ${res.status}`);
    return res.json();
  }

  const runFetch = async () => {
    if (!rows.length) { showAlert("No URLs loaded", "warning"); return; }
    setProcessing(true); setProcessedCount(0); showOv("Fetching results…");
    const processed = []; const questionCache = {};
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]; showOv(`Fetching results… ${i + 1} / ${rows.length}`);
      try {
        const apiData = await fetchResult(row.url);
        const parsed  = parseResultData(apiData, row.url);
        for (const q of parsed.questions) {
          if (q.qId) {
            if (!questionCache[q.qId]) {
              try { const qData = await fetchQuestion(q.qId); questionCache[q.qId] = qData?.learning?.question_data || ""; }
              catch { questionCache[q.qId] = ""; }
            }
            q.questionHtml = questionCache[q.qId];
          }
        }
        processed.push(parsed);
      } catch (err) {
        processed.push({ studentName: row.name, email: "", url: row.url, fetchError: err.message, marks: 0, total: 0, questions: [] });
      }
      setProcessedCount(i + 1); await sleep(300);
    }
    setResults(processed); hideOv(); setProcessing(false); setUi("table");
    showAlert(`Done — ${processed.filter(r => !r.fetchError).length}/${rows.length} fetched`, "success");
  };

  // ── AI analysis ───────────────────────────────────────────────────────────────

  const callAnalysisAPI = async (q, studentName) => {
    const failedTestcases = q.tcList?.filter(t => t.result?.toLowerCase() !== "success").map(t => t.name) || [];
    const res = await fetch(`${AI_API}/analyze-result`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoKey: q.key, questionHtml: q.questionHtml, studentName, failedTestcases, techStack }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Analysis failed");
    return json;
  };

  const runSingleAnalysis = async (r, ri, qi) => {
    const q = r.questions[qi];
    if (!q.key)          { showAlert("No repo key", "warning"); return; }
    if (!q.questionHtml) { showAlert("No question data", "warning"); return; }
    setAnalyzingIdx(`${ri}-${qi}`); setCopyOk(false);
    setAnalysisModal({ studentName: r.studentName, paragraph: null, loading: true, error: null });
    try {
      const json = await callAnalysisAPI(q, r.studentName);
      setResults(prev => prev.map((item, i) => i !== ri ? item : {
        ...item,
        questions: item.questions.map((iq, j) => j !== qi ? iq : { ...iq, analysisReport: json.analysis, filesAnalyzed: json.filesAnalyzed })
      }));
      setAnalysisModal({ studentName: r.studentName, paragraph: json.analysis, filesAnalyzed: json.filesAnalyzed, loading: false, error: null });
    } catch (err) {
      setAnalysisModal({ studentName: r.studentName, paragraph: null, loading: false, error: err.message });
    } finally { setAnalyzingIdx(null); }
  };

  // PATCH A: batched analyse-all with RPM cooldown
  const runAnalyseAll = async () => {
    const eligible = [];
    results.forEach((r, ri) => {
      if (r.fetchError) return;
      (r.questions || []).forEach((q, qi) => {
        if (q.key && q.questionHtml && !q.analysisReport) eligible.push({ r, ri, qi });
      });
    });
    if (!eligible.length) { showAlert("All eligible students already analysed", "info"); return; }

    setAnalysingAll(true);
    setAnalyseAllCount(0);
    setAnalyseAllTotal(eligible.length);

    for (let batchStart = 0; batchStart < eligible.length; batchStart += BATCH_SIZE) {
      const batch      = eligible.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum   = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(eligible.length / BATCH_SIZE);

      for (let bi = 0; bi < batch.length; bi++) {
        const { r, ri, qi } = batch[bi];
        const globalIdx = batchStart + bi;
        setAnalyseAllCount(globalIdx + 1);
        setAnalyzingIdx(`${ri}-${qi}`);
        try {
          const json = await callAnalysisAPI(r.questions[qi], r.studentName);
          setResults(prev => prev.map((item, i) => i !== ri ? item : {
            ...item,
            questions: item.questions.map((iq, j) =>
              j !== qi ? iq : { ...iq, analysisReport: json.analysis, filesAnalyzed: json.filesAnalyzed }
            ),
          }));
        } catch (err) {
          setResults(prev => prev.map((item, i) => i !== ri ? item : {
            ...item,
            questions: item.questions.map((iq, j) =>
              j !== qi ? iq : { ...iq, analysisError: err.message }
            ),
          }));
        }
        setAnalyzingIdx(null);
        await sleep(1500);
      }

      const isLastBatch = batchStart + BATCH_SIZE >= eligible.length;
      if (!isLastBatch) {
        const cooldownSecs = Math.ceil(BATCH_DELAY_MS / 1000);
        showAlert(`Batch ${batchNum}/${totalBatches} done — cooldown ${cooldownSecs}s…`, "info");
        let secs = cooldownSecs;
        while (secs > 0) {
          setBatchCooldown(secs);
          await sleep(1000);
          secs--;
        }
        setBatchCooldown(null);
      }
    }

    setAnalysingAll(false);
    showAlert(`Analysis complete for ${eligible.length} questions`, "success");
  };

  const copyAnalysis = () => {
    if (!analysisModal?.paragraph) return;
    navigator.clipboard.writeText(analysisModal.paragraph).then(() => { setCopyOk(true); setTimeout(() => setCopyOk(false), 2200); });
  };

  // PATCH B: CSV download — one row per student, all CODs merged into Report cell
  const downloadAnalysisCSV = () => {
    const lines = ["Student\tReport"];
    results.forEach(r => {
      if (r.fetchError) return;
      const questions = r.questions || [];
      if (!questions.length) return;

      let reportCell;
      if (questions.length === 1) {
        // Single COD — just the report text
        const report = questions[0].analysisReport
          ? questions[0].analysisReport.replace(/\t/g, " ").replace(/\n/g, " ")
          : "(not analysed)";
        reportCell = report;
      } else {
        // Multiple CODs — label each one, separated by " | "
        reportCell = questions.map((q, qi) => {
          const label  = q.label || `COD ${qi + 1}`;
          const report = q.analysisReport
            ? q.analysisReport.replace(/\t/g, " ").replace(/\n/g, " ")
            : "(not analysed)";
          return `${label}: ${report}`;
        }).join(" | ");
      }

      lines.push(`${r.studentName}\t${reportCell}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/tab-separated-values" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: "analysis_report.csv" });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── code viewer ───────────────────────────────────────────────────────────────

  const openCodeViewer = async (q) => {
    if (!q.key) { showAlert("No repo key for this student", "warning"); return; }
    setCodeModal({ studentName: q.studentName, repoKey: q.key, loading: true, files: [], folderTree: [], error: null });
    setActiveFile(null); setExpandedFolders({});
    try {
      const res  = await fetch(`${AI_API}/get-repo-files`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoKey: q.key, techStack }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load files");
      const expanded = {};
      (json.folderTree || []).forEach(f => { expanded[f.folder] = true; });
      setCodeModal({ studentName: q.studentName, repoKey: q.key, loading: false, files: json.files, folderTree: json.folderTree || [], error: null });
      setActiveFile(json.files[0]?.path || null);
      setExpandedFolders(expanded);
    } catch (err) {
      setCodeModal(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const toggleFolder = (folderKey) => setExpandedFolders(prev => ({ ...prev, [folderKey]: !prev[folderKey] }));

  // ── misc ──────────────────────────────────────────────────────────────────────

  const scoreColor = (marks, total) => {
    if (!total) return "var(--c-muted)";
    const pct = (marks / total) * 100;
    if (pct >= 80) return "var(--c-green)"; if (pct >= 50) return "var(--c-amber)"; return "var(--c-red)";
  };

  const selectedStack       = TECH_STACKS.find(t => t.id === techStack);
  const eligibleForAnalysis = results.flatMap(r => (r.questions || []).filter(q => !r.fetchError && q.key && q.questionHtml && !q.analysisReport));
  const alreadyAnalysed     = results.flatMap(r => (r.questions || []).filter(q => q.analysisReport));
  const activeFileData      = codeModal?.files?.find(f => f.path === activeFile);
  const totalBatches        = Math.ceil(eligibleForAnalysis.length / BATCH_SIZE);
  const currentBatch        = Math.ceil(analyseAllCount / BATCH_SIZE);
  const hasAnyReport        = results.some(r => !r.fetchError && r.questions.some(q => q.analysisReport));

  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="rx-page">

      {alert && <div className={`rx-alert rx-alert-${alert.type}`}>{alert.msg}</div>}

      {/* ══ Top action bar ══ */}
      {(ui === "table" || token) && (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", padding: "8px 16px", background: "var(--c-surface-2)", borderBottom: "1px solid var(--c-border)" }}>
          {ui === "table" && (
            <button className="rx-btn rx-btn-ghost" style={{ fontSize: "12px", padding: "6px 13px" }} onClick={() => setUi("upload")}>← Upload New</button>
          )}
          {token && (
            <button className="rx-btn rx-btn-ghost" style={{ fontSize: "12px", padding: "6px 13px" }} onClick={clearToken}>🚪 Logout</button>
          )}
        </div>
      )}

      {/* ══ Processing Overlay ══ */}
      {overlay && (
        <div className="rx-overlay">
          <div className="rx-overlay-box">
            <div className="rx-overlay-top">
              <div className="rx-spinner-wrap">
                <div className="rx-ring rx-ring-1" /><div className="rx-ring rx-ring-2" />
                <div className="rx-ring rx-ring-3" /><div className="rx-ring-center" />
              </div>
              <div className="rx-overlay-label">Processing Students</div>
            </div>
            <div className="rx-overlay-body">
              <div className="rx-overlay-text">{overlayText}</div>
              <div className="rx-overlay-steps">
                {["Connecting to Examly", "Fetching result data", "Loading question details"].map((label, i) => {
                  const pct  = processedCount / Math.max(rows.length, 1);
                  const done = i < Math.floor(pct * 3);
                  const act  = !done && i === Math.floor(pct * 3);
                  return (
                    <div key={label} className={`rx-step ${done ? "rx-step-done" : act ? "rx-step-active" : "rx-step-wait"}`}>
                      <div className="rx-step-dot" />{done ? "✓ " : ""}{label}
                    </div>
                  );
                })}
              </div>
              {processing && rows.length > 0 && (
                <div>
                  <div className="rx-progress-wrap">
                    <div className="rx-progress-bar" style={{ width: `${(processedCount / rows.length) * 100}%` }} />
                  </div>
                  <div className="rx-progress-label" style={{ marginTop: "6px" }}>
                    <span>{processedCount} of {rows.length} students</span>
                    <span>{Math.round((processedCount / rows.length) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Question Modal ══ */}
      {questionModal && (
        <div className="rx-modal-backdrop" onClick={() => setQuestionModal(null)}>
          <div className="rx-modal rx-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="rx-modal-header">
              <span className="rx-modal-title">📋 Question — {questionModal.qId?.slice(0, 8)}…</span>
              <div className="rx-modal-header-right"><button className="rx-modal-close" onClick={() => setQuestionModal(null)}>✕</button></div>
            </div>
            <div className="rx-modal-body">
              <div className="rx-question-html" dangerouslySetInnerHTML={{ __html: questionModal.html || "<p>No content</p>" }} />
            </div>
          </div>
        </div>
      )}

      {/* ══ Testcase Modal ══ */}
      {testcaseModal && (
        <div className="rx-modal-backdrop" onClick={() => setTestcaseModal(null)}>
          <div className="rx-modal rx-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="rx-modal-header">
              <span className="rx-modal-title">🧪 Testcases — {testcaseModal.studentName}</span>
              <div className="rx-modal-header-right"><button className="rx-modal-close" onClick={() => setTestcaseModal(null)}>✕</button></div>
            </div>
            <div className="rx-modal-body">
              <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                {[
                  { label: "Passed", val: testcaseModal.tcList.filter(t => t.result?.toLowerCase() === "success").length, color: "var(--c-green)" },
                  { label: "Failed", val: testcaseModal.tcList.filter(t => t.result?.toLowerCase() !== "success").length, color: "var(--c-red)" },
                ].map(s => (
                  <div key={s.label} className="rx-stat" style={{ flex: 1, padding: "13px 16px" }}>
                    <div className="rx-stat-val" style={{ color: s.color, fontSize: "24px" }}>{s.val}</div>
                    <div className="rx-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {testcaseModal.tcList.map((tc, i) => {
                  const passed = tc.result?.toLowerCase() === "success";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "9px", padding: "8px 12px", background: passed ? "#edfaf3" : "#fef3f3", border: `1px solid ${passed ? "#7dd9b2" : "#f9a8a8"}`, borderRadius: "7px" }}>
                      <span style={{ fontSize: "13px" }}>{passed ? "✅" : "❌"}</span>
                      <span style={{ flex: 1, fontSize: "12px", fontFamily: "JetBrains Mono, monospace", color: "var(--c-text)" }}>{tc.name}</span>
                      <span style={{ fontSize: "10px", fontWeight: "700", color: passed ? "var(--c-green)" : "var(--c-red)", textTransform: "uppercase" }}>{tc.result || "N/A"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Result Modal ══ */}
      {resultModal && (
        <div className="rx-modal-backdrop" onClick={() => setResultModal(null)}>
          <div className="rx-modal rx-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="rx-modal-header">
              <span className="rx-modal-title">📊 Result — {resultModal.studentName}</span>
              <div className="rx-modal-header-right"><button className="rx-modal-close" onClick={() => setResultModal(null)}>✕</button></div>
            </div>
            <div className="rx-modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {[
                  { label: "Student",     value: resultModal.studentName },
                  { label: "Email",       value: resultModal.email || "—" },
                  { label: "Score",       value: `${Number(resultModal.marks).toFixed(1)} / ${resultModal.total}` },
                  { label: "Status",      value: resultModal.status === 3 ? "✅ Completed" : resultModal.status === 2 ? "⏳ In Progress" : `Status ${resultModal.status}` },
                  { label: "Eval Type",   value: resultModal.evalType || "—" },
                  { label: "TC Pass",     value: `${resultModal.passCount} / ${resultModal.tcList?.length || 0}` },
                  { label: "Question ID", value: resultModal.qId ? resultModal.qId.slice(0, 20) + "…" : "N/A" },
                  { label: "Repo Key",    value: resultModal.key || "—" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "var(--c-surface-2)", border: "1px solid var(--c-border)", borderRadius: "7px" }}>
                    <span style={{ fontSize: "10px", fontFamily: "JetBrains Mono, monospace", color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{item.label}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--c-text)", fontFamily: "JetBrains Mono, monospace", wordBreak: "break-all", maxWidth: "55%", textAlign: "right" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Analysis Modal ══ */}
      {analysisModal && (
        <div className="rx-modal-backdrop" onClick={() => !analysisModal.loading && setAnalysisModal(null)}>
          <div className="rx-modal rx-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="rx-modal-header">
              <span className="rx-modal-title">🤖 AI Analysis — {analysisModal.studentName}</span>
              <div className="rx-modal-header-right">
                {!analysisModal.loading && !analysisModal.error && analysisModal.paragraph && (
                  <button className={`rx-modal-copy${copyOk ? " rx-modal-copy-ok" : ""}`} onClick={copyAnalysis}>
                    {copyOk ? "✓ Copied!" : (<><svg width="11" height="11" viewBox="0 0 20 20" fill="none"><rect x="7" y="7" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M4 13V4a1 1 0 011-1h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Copy Text</>)}
                  </button>
                )}
                {!analysisModal.loading && <button className="rx-modal-close" onClick={() => setAnalysisModal(null)}>✕</button>}
              </div>
            </div>
            <div className="rx-modal-body">
              {analysisModal.loading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "40px 0" }}>
                  <div style={{ position: "relative", width: "52px", height: "52px" }}>
                    <div className="rx-ring rx-ring-1" style={{ borderTopColor: "var(--c-indigo)", borderRightColor: "var(--c-indigo-soft)" }} />
                    <div className="rx-ring rx-ring-2" style={{ borderTopColor: "var(--c-violet)", borderLeftColor: "transparent" }} />
                  </div>
                  <div style={{ textAlign: "center", lineHeight: "1.65" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--c-text)", marginBottom: "5px" }}>Running AI Analysis</div>
                    <div style={{ fontSize: "12px", color: "var(--c-muted)", fontFamily: "JetBrains Mono, monospace" }}>Fetching code ...<br />Sending to AI…</div>
                  </div>
                </div>
              )}
              {!analysisModal.loading && analysisModal.error && (
                <div style={{ padding: "15px 18px", background: "var(--c-red-soft)", border: "1px solid #f9a8a8", borderRadius: "9px", color: "var(--c-red)", fontSize: "13px", fontWeight: "500" }}>
                  ✕ {analysisModal.error}
                </div>
              )}
              {!analysisModal.loading && !analysisModal.error && analysisModal.paragraph && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {analysisModal.filesAnalyzed?.length > 0 && (
                    <div className="rx-files-bar">
                      <span className="rx-files-bar-icon">📂</span>
                      {analysisModal.filesAnalyzed.map(f => <span key={f} className="rx-file-tag">{f.split("/").pop()}</span>)}
                    </div>
                  )}
                  <div className="rx-analysis-para">{analysisModal.paragraph}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ VS Code Viewer Modal ══ */}
      {codeModal && (
        <div className="rx-modal-backdrop" onClick={() => !codeModal.loading && setCodeModal(null)} style={{ alignItems: "center", padding: "20px" }}>
          <div className="rx-modal" onClick={e => e.stopPropagation()}
            style={{ width: "min(94vw, 1160px)", height: "min(90vh, 760px)", maxWidth: "unset", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", background: "#1e1e2e", border: "1px solid #313244", borderRadius: "12px", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}
          >
            {/* Title bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#181825", borderBottom: "1px solid #313244", flexShrink: 0, borderRadius: "12px 12px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f38ba8" }} />
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f9e2af" }} />
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#a6e3a1" }} />
                </div>
                <div style={{ width: "1px", height: "20px", background: "#313244" }} />
                <span style={{ fontSize: "14px" }}>🗂️</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#cdd6f4", lineHeight: 1.2 }}>
                    {codeModal.studentName}<span style={{ fontWeight: "400", color: "#6c7086" }}> — Solution Code</span>
                  </div>
                  <div style={{ fontSize: "10px", color: "#6c7086", fontFamily: "JetBrains Mono, monospace", marginTop: "1px" }}>{codeModal.repoKey}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {!codeModal.loading && codeModal.files?.length > 0 && (
                  <span style={{ fontSize: "10px", color: "#6c7086", fontFamily: "JetBrains Mono, monospace" }}>{codeModal.files.length} file{codeModal.files.length !== 1 ? "s" : ""}</span>
                )}
                {!codeModal.loading && (
                  <button onClick={() => setCodeModal(null)}
                    style={{ background: "transparent", border: "1px solid #45475a", color: "#6c7086", width: "26px", height: "26px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f38ba8"; e.currentTarget.style.color = "#1e1e2e"; e.currentTarget.style.borderColor = "#f38ba8"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6c7086"; e.currentTarget.style.borderColor = "#45475a"; }}
                  >✕</button>
                )}
              </div>
            </div>

            {codeModal.loading && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px", background: "#1e1e2e" }}>
                <div style={{ position: "relative", width: "48px", height: "48px" }}>
                  <div className="rx-ring rx-ring-1" style={{ borderTopColor: "#cba6f7", borderRightColor: "#313244" }} />
                  <div className="rx-ring rx-ring-2" style={{ borderTopColor: "#89b4fa", borderLeftColor: "transparent", borderRightColor: "transparent" }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#cdd6f4", marginBottom: "4px" }}>Loading Repository</div>
                  <div style={{ fontSize: "11px", color: "#6c7086", fontFamily: "JetBrains Mono, monospace" }}>Scanning all folders from GitHub…</div>
                </div>
              </div>
            )}

            {!codeModal.loading && codeModal.error && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", background: "#1e1e2e" }}>
                <div style={{ padding: "20px 28px", background: "#2a1f2f", border: "1px solid #f38ba8", borderRadius: "10px", color: "#f38ba8", fontSize: "13px", fontFamily: "JetBrains Mono, monospace" }}>✕ {codeModal.error}</div>
              </div>
            )}

            {!codeModal.loading && !codeModal.error && codeModal.files?.length > 0 && (
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Sidebar */}
                <div style={{ width: "240px", flexShrink: 0, background: "#181825", borderRight: "1px solid #313244", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid #313244", flexShrink: 0 }}>
                    <div style={{ fontSize: "9px", fontWeight: "800", color: "#6c7086", textTransform: "uppercase", letterSpacing: "1.4px" }}>Explorer</div>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
                    {codeModal.folderTree?.length > 0 ? codeModal.folderTree.map(folder => {
                      const isExpanded = expandedFolders[folder.folder] !== false;
                      return (
                        <div key={folder.folder}>
                          <div onClick={() => toggleFolder(folder.folder)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", cursor: "pointer", fontSize: "11px", fontWeight: "700", fontFamily: "JetBrains Mono, monospace", color: "#a6adc8", userSelect: "none" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#232334"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span style={{ fontSize: "10px", color: "#585b70", flexShrink: 0 }}>{isExpanded ? "▾" : "▸"}</span>
                            <span style={{ fontSize: "12px", flexShrink: 0 }}>{folderIcon(folder.displayName)}</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#89b4fa", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "10px" }}>{folder.displayName}</span>
                          </div>
                          {isExpanded && folder.files.map(f => {
                            const isActive = activeFile === f.path;
                            return (
                              <div key={f.path} onClick={() => setActiveFile(f.path)} title={f.path}
                                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 12px 4px 30px", cursor: "pointer", fontSize: "12px", fontFamily: "JetBrains Mono, monospace", color: isActive ? "#cdd6f4" : "#a6adc8", background: isActive ? "#2a2a3e" : "transparent", borderLeft: `2px solid ${isActive ? "#cba6f7" : "transparent"}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", userSelect: "none" }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#232334"; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                              >
                                <span style={{ flexShrink: 0, fontSize: "12px" }}>{fileIcon(f.name)}</span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }) : codeModal.files.map(f => {
                      const isActive = activeFile === f.path;
                      return (
                        <div key={f.path} onClick={() => setActiveFile(f.path)} title={f.path}
                          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", cursor: "pointer", fontSize: "12px", fontFamily: "JetBrains Mono, monospace", color: isActive ? "#cdd6f4" : "#a6adc8", background: isActive ? "#2a2a3e" : "transparent", borderLeft: `2px solid ${isActive ? "#cba6f7" : "transparent"}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", userSelect: "none" }}
                        >
                          <span style={{ flexShrink: 0 }}>{fileIcon(f.name)}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: "8px 12px", borderTop: "1px solid #313244", flexShrink: 0, fontSize: "10px", color: "#45475a", fontFamily: "JetBrains Mono, monospace" }}>
                    {codeModal.files.length} source file{codeModal.files.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Code Panel */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#1e1e2e" }}>
                  <div style={{ display: "flex", alignItems: "center", background: "#181825", borderBottom: "1px solid #313244", overflowX: "auto", flexShrink: 0, minHeight: "36px" }}>
                    {codeModal.files.map(f => {
                      const isActive = activeFile === f.path;
                      return (
                        <div key={f.path} onClick={() => setActiveFile(f.path)}
                          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "0 16px", cursor: "pointer", flexShrink: 0, fontSize: "12px", fontFamily: "JetBrains Mono, monospace", color: isActive ? "#cdd6f4" : "#6c7086", background: isActive ? "#1e1e2e" : "transparent", borderBottom: `2px solid ${isActive ? "#cba6f7" : "transparent"}`, borderRight: "1px solid #313244", height: "36px", whiteSpace: "nowrap" }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#a6adc8"; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#6c7086"; }}
                        >
                          <span>{fileIcon(f.name)}</span>{f.name}
                        </div>
                      );
                    })}
                  </div>
                  {activeFile && (
                    <div style={{ padding: "4px 16px", fontSize: "11px", color: "#585b70", fontFamily: "JetBrains Mono, monospace", background: "#1e1e2e", borderBottom: "1px solid #2a2a3e", flexShrink: 0 }}>
                      {activeFile.split("/").map((part, i, arr) => (
                        <span key={i}>
                          <span style={{ color: i === arr.length - 1 ? "#a6adc8" : "#585b70" }}>{part}</span>
                          {i < arr.length - 1 && <span style={{ margin: "0 5px", color: "#45475a" }}>›</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
                    {activeFileData ? (
                      <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "JetBrains Mono, monospace", fontSize: "12.5px", lineHeight: "1.65" }}>
                        <tbody>
                          {activeFileData.content.split("\n").map((line, idx) => (
                            <tr key={idx} onMouseEnter={e => e.currentTarget.style.background = "#232334"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <td style={{ userSelect: "none", textAlign: "right", padding: "0 14px 0 8px", color: "#45475a", fontSize: "11px", verticalAlign: "top", minWidth: "48px", width: "48px", borderRight: "1px solid #2a2a3e", background: "#1a1a2a" }}>{idx + 1}</td>
                              <td style={{ padding: "0 20px 0 16px", color: "#cdd6f4", whiteSpace: "pre", verticalAlign: "top" }}>{line || " "}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: "40px", color: "#45475a", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}>Select a file to view</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 16px", background: "#cba6f7", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e1e2e", fontFamily: "JetBrains Mono, monospace" }}>{selectedStack?.icon} {selectedStack?.label}</span>
                      {activeFileData && <span style={{ fontSize: "10px", color: "#3d3354", fontFamily: "JetBrains Mono, monospace" }}>{activeFileData.name}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {activeFileData && (
                        <>
                          <span style={{ fontSize: "10px", color: "#3d3354", fontFamily: "JetBrains Mono, monospace" }}>{activeFileData.content.split("\n").length} lines</span>
                          <span style={{ fontSize: "10px", color: "#3d3354", fontFamily: "JetBrains Mono, monospace" }}>{activeFileData.name.split(".").pop()?.toUpperCase()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Welcome ══ */}
      {ui === "welcome" && (
        <div className="rx-welcome">
          <div className="rx-welcome-inner">
            <div className="rx-welcome-icon">⚡</div>
            <h2 className="rx-welcome-title">Result X</h2>
            <p className="rx-welcome-sub">Enter your Examly token to get started</p>
            <div>
              <label className="rx-label">Authorization Token</label>
              <textarea className="rx-token-area" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Paste your token here..." />
            </div>
            <button className="rx-btn rx-btn-primary rx-btn-full" onClick={saveToken}>Save Token & Continue →</button>
            <p style={{ textAlign: "center", fontSize: "11px", color: "var(--c-muted)", fontFamily: "JetBrains Mono, monospace" }}>Token is saved locally in your browser</p>
          </div>
        </div>
      )}

      {/* ══ Upload ══ */}
      {ui === "upload" && (
        <div className="rx-body">
          <div className="rx-card">
            <p className="rx-card-title">📂 Load Result URLs</p>
            <div className="rx-upload-zone" onClick={() => fileRef.current?.click()}>
              <span className="rx-upload-icon">📊</span>
              <div className="rx-upload-title">Click to upload Excel file</div>
              <div className="rx-upload-hint">.xlsx / .xls / .csv — URL column auto-detected</div>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFile} />
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--c-border)" }} />
              <span style={{ fontSize: "11px", color: "var(--c-muted)", fontFamily: "JetBrains Mono, monospace" }}>or paste URL manually</span>
              <div style={{ flex: 1, height: "1px", background: "var(--c-border)" }} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input className="rx-input" value={manualUrl} onChange={e => setManualUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addManualUrl()} placeholder="Paste result URL here…" style={{ flex: 1 }} />
              <button className="rx-btn rx-btn-primary" style={{ padding: "9px 18px" }} onClick={addManualUrl}>+ Add</button>
            </div>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--c-muted)", fontFamily: "JetBrains Mono, monospace" }}>💡 Student names are fetched automatically from Examly</p>
            {rows.length > 0 && (
              <>
                <div className="rx-stat-strip" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  <div className="rx-stat"><div className="rx-stat-val">{rows.length}</div><div className="rx-stat-label">URLs Loaded</div></div>
                  <div className="rx-stat" style={{ cursor: "pointer" }} onClick={clearAll}><div className="rx-stat-val" style={{ color: "var(--c-red)", fontSize: "20px" }}>🗑 Clear</div><div className="rx-stat-label">All URLs</div></div>
                </div>
                <div>
                  <label className="rx-label" style={{ marginBottom: "7px" }}>Loaded URLs ({rows.length})</label>
                  <div className="rx-row-list">
                    {rows.map(r => (
                      <div key={r.idx} className="rx-row-item">
                        <span className="rx-row-idx">#{rows.indexOf(r) + 1}</span>
                        <span className="rx-row-url">{r.url}</span>
                        <button onClick={() => removeRow(r.idx)} style={{ background: "var(--c-red-soft)", border: "1px solid #f9a8a8", color: "var(--c-red)", borderRadius: "5px", padding: "2px 7px", cursor: "pointer", fontSize: "10px", fontWeight: "700", flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="rx-btn rx-btn-primary rx-btn-full" onClick={runFetch} disabled={processing}>
                  🚀 Fetch Results for {rows.length} Student{rows.length > 1 ? "s" : ""}
                </button>
              </>
            )}
          </div>
          <div className="rx-card" style={{ borderColor: "#bfc2f9" }}>
            <p className="rx-card-title">ℹ️ How it works</p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--c-text-2)", lineHeight: "1.7" }}>
              Upload an Excel file or paste result URLs manually. Scores, testcases, and repo keys are fetched from Examly automatically.
              Select the appropriate tech stack, then run AI analysis per student or all at once.
              Use <strong>View Code</strong> to inspect student source files in a VS Code-style explorer with folder tree.
            </p>
          </div>
        </div>
      )}

      {/* ══ Table ══ */}
      {ui === "table" && (
        <div className="rx-body">
          <div className="rx-stat-strip">
            {[
              { label: "Total",      val: results.length,                                                                                  color: "var(--c-text)"  },
              { label: "Success",    val: results.filter(r => !r.fetchError).length,                                                       color: "var(--c-green)" },
              { label: "Failed",     val: results.filter(r => r.fetchError).length,                                                        color: "var(--c-red)"   },
              { label: "Full Score", val: results.filter(r => !r.fetchError && Number(r.marks) === Number(r.total) && r.total > 0).length, color: "var(--c-amber)" },
            ].map(s => (
              <div key={s.label} className="rx-stat">
                <div className="rx-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="rx-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="rx-card" style={{ padding: "13px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "1px", flexShrink: 0 }}>Tech Stack</span>
              <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", flex: 1 }}>
                {TECH_STACKS.map(stack => (
                  <button key={stack.id} onClick={() => setTechStack(stack.id)} style={{
                    display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: "700",
                    cursor: "pointer", transition: "all 0.14s", fontFamily: "DM Sans, sans-serif",
                    border: `1px solid ${techStack === stack.id ? "var(--c-indigo)" : "var(--c-border)"}`,
                    background: techStack === stack.id ? "var(--c-indigo)" : "var(--c-surface-2)",
                    color: techStack === stack.id ? "white" : "var(--c-text-2)",
                    boxShadow: techStack === stack.id ? "0 2px 8px rgba(66,68,232,0.28)" : "none",
                  }}>{stack.icon} {stack.label}</button>
                ))}
              </div>
              <div style={{ width: "1px", height: "26px", background: "var(--c-border)", flexShrink: 0 }} />

              {/* Analyse All button */}
              <button className="rx-btn rx-btn-primary" style={{ padding: "7px 16px", fontSize: "12px", flexShrink: 0 }}
                onClick={runAnalyseAll} disabled={analysingAll || analyzingIdx !== null || eligibleForAnalysis.length === 0 || batchCooldown !== null}>
                {batchCooldown !== null
                  ? `⏳ Cooldown ${batchCooldown}s…`
                  : analysingAll
                    ? `⟳ ${analyseAllCount}/${analyseAllTotal} (batch ${currentBatch}/${totalBatches})…`
                    : `⚡ Analyse All${eligibleForAnalysis.length > 0 ? ` (${eligibleForAnalysis.length})` : ""}`
                }
              </button>

              {/* Download CSV button — PATCH B */}
              <button
                className="rx-btn rx-btn-ghost"
                style={{ padding: "7px 16px", fontSize: "12px", flexShrink: 0 }}
                onClick={downloadAnalysisCSV}
                disabled={!hasAnyReport}
                title={hasAnyReport ? "Download analysis as CSV" : "Run analysis first"}
              >
                ⬇ Download CSV
              </button>

              {alreadyAnalysed.length > 0 && (
                <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--c-green)", background: "var(--c-green-soft)", border: "1px solid #7dd9b2", padding: "3px 9px", borderRadius: "99px", fontFamily: "JetBrains Mono, monospace" }}>
                  ✅ {alreadyAnalysed.length} done
                </span>
              )}
            </div>

            {/* Analyse All progress bar */}
            {(analysingAll || batchCooldown !== null) && (
              <div style={{ marginTop: "11px" }}>
                <div className="rx-progress-wrap">
                  <div className="rx-progress-bar" style={{ width: `${(analyseAllCount / Math.max(analyseAllTotal, 1)) * 100}%`, background: batchCooldown !== null ? "var(--c-amber)" : undefined }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--c-muted)", marginTop: "5px", fontFamily: "JetBrains Mono, monospace" }}>
                  {batchCooldown !== null
                    ? <><span>⏳ Rate-limit cooldown — next batch in {batchCooldown}s</span><span>{Math.round((analyseAllCount / Math.max(analyseAllTotal, 1)) * 100)}%</span></>
                    : <><span>{analyseAllCount} of {analyseAllTotal} · batch {currentBatch}/{totalBatches} · {selectedStack?.label}</span><span>{Math.round((analyseAllCount / Math.max(analyseAllTotal, 1)) * 100)}%</span></>
                  }
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rx-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="rx-table">
                <thead>
                  <tr>{["#", "Student", "Score", "TC Pass / Fail", "Eval Type", "Question", "Testcases", "Result", "Repo Key", "View Code", "Analysis Report"].map(h => <th key={h} className="rx-th">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {results.map((r, ri) => {
                    if (r.fetchError) {
                      return (
                        <tr key={ri} className={ri % 2 === 0 ? "rx-tr-even" : "rx-tr-odd"}>
                          <td className="rx-td rx-td-mono">{ri + 1}</td>
                          <td className="rx-td" colSpan={10}>
                            <div style={{ fontWeight: "700", color: "var(--c-text)", fontSize: "13px" }}>{r.studentName}</div>
                            {r.email && <div style={{ fontSize: "11px", color: "var(--c-muted)", fontFamily: "JetBrains Mono, monospace" }}>{r.email}</div>}
                            <div style={{ fontSize: "11px", color: "var(--c-red)", fontFamily: "JetBrains Mono, monospace", marginTop: "2px" }}>✕ {r.fetchError}</div>
                          </td>
                        </tr>
                      );
                    }

                    const qCount = r.questions.length;
                    return r.questions.map((q, qi) => {
                      const isFirst  = qi === 0;
                      const rowClass = ri % 2 === 0 ? "rx-tr-even" : "rx-tr-odd";
                      const aidx     = `${ri}-${qi}`;

                      return (
                        <tr key={aidx} className={rowClass}>

                          {isFirst && (
                            <td className="rx-td rx-td-mono" rowSpan={qCount} style={{ verticalAlign: "top", paddingTop: "14px" }}>
                              {ri + 1}
                            </td>
                          )}

                          {isFirst && (
                            <td className="rx-td" rowSpan={qCount} style={{ verticalAlign: "top", paddingTop: "14px" }}>
                              <div style={{ fontWeight: "700", color: "var(--c-text)", fontSize: "13px" }}>{r.studentName}</div>
                              {r.email && <div style={{ fontSize: "11px", color: "var(--c-muted)", fontFamily: "JetBrains Mono, monospace", marginTop: "2px" }}>{r.email}</div>}
                            </td>
                          )}

                          {isFirst && (
                            <td className="rx-td" rowSpan={qCount} style={{ verticalAlign: "top", paddingTop: "14px" }}>
                              <span style={{ fontWeight: "700", fontSize: "13px", color: scoreColor(r.marks, r.total), fontFamily: "JetBrains Mono, monospace" }}>
                                {Number(r.marks).toFixed(1)} / {r.total}
                              </span>
                            </td>
                          )}

                          <td className="rx-td">
                            {q.label && (
                              <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--c-muted)", fontFamily: "JetBrains Mono, monospace", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                                {q.label}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: "5px" }}>
                              <span style={{ fontSize: "11px", color: "var(--c-green)", fontFamily: "JetBrains Mono, monospace", fontWeight: "700", background: "#edfaf3", padding: "2px 7px", borderRadius: "99px", border: "1px solid #7dd9b2" }}>✓{q.passCount}</span>
                              <span style={{ fontSize: "11px", color: "var(--c-red)",   fontFamily: "JetBrains Mono, monospace", fontWeight: "700", background: "#fef3f3", padding: "2px 7px", borderRadius: "99px", border: "1px solid #f9a8a8" }}>✕{q.failCount}</span>
                            </div>
                          </td>

                          <td className="rx-td">
                            {q.evalType && q.evalType !== "—"
                              ? <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                  {q.evalType.split(" + ").map(et => <span key={et} className="rx-eval-badge">⚙ {et}</span>)}
                                </div>
                              : <span style={{ color: "var(--c-muted)" }}>—</span>}
                          </td>

                          <td className="rx-td">
                            {q.qId && q.questionHtml
                              ? <button className="rx-table-btn rx-table-btn-indigo" onClick={() => setQuestionModal({ html: q.questionHtml, qId: q.qId })}>📋 Question</button>
                              : <span style={{ color: "var(--c-muted)" }}>—</span>}
                          </td>

                          <td className="rx-td">
                            {q.tcList?.length > 0
                              ? <button className="rx-table-btn rx-table-btn-teal" onClick={() => setTestcaseModal({ tcList: q.tcList, studentName: r.studentName })}>🧪 Testcases</button>
                              : <span style={{ color: "var(--c-muted)" }}>—</span>}
                          </td>

                          <td className="rx-td">
                            <button className="rx-table-btn rx-table-btn-amber" onClick={() => setResultModal({ ...q, studentName: r.studentName, email: r.email, status: r.status })}>📊 Result</button>
                          </td>

                          <td className="rx-td">
                            {q.key
                              ? <div className="rx-key-box">
                                  <span className="rx-key-text" title={q.key}>{q.key.slice(0, 16)}…</span>
                                  <button className="rx-key-copy" onClick={() => { navigator.clipboard.writeText(q.key); showAlert("Key copied!", "success"); }}>copy</button>
                                </div>
                              : <span style={{ color: "var(--c-muted)" }}>—</span>}
                          </td>

                          <td className="rx-td">
                            {q.key
                              ? <button
                                  onClick={() => openCodeViewer({ ...q, studentName: r.studentName })}
                                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 11px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", background: "#1e1e2e", border: "1px solid #cba6f7", color: "#cba6f7", transition: "all 0.14s" }}
                                  onMouseEnter={e => { e.currentTarget.style.background = "#cba6f7"; e.currentTarget.style.color = "#1e1e2e"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "#1e1e2e"; e.currentTarget.style.color = "#cba6f7"; }}
                                >🗂️ View Code</button>
                              : <span style={{ color: "var(--c-muted)" }}>—</span>}
                          </td>

                          <td className="rx-td">
                            {q.analysisError
                              ? <span style={{ fontSize: "11px", color: "var(--c-red)", fontFamily: "JetBrains Mono, monospace" }}>✕ Error</span>
                              : q.analysisReport
                                ? <button className="rx-table-btn rx-table-btn-green" onClick={() => { setCopyOk(false); setAnalysisModal({ studentName: r.studentName, paragraph: q.analysisReport, filesAnalyzed: q.filesAnalyzed, loading: false, error: null }); }}>✅ View Report</button>
                                : q.key && q.questionHtml
                                  ? <button className="rx-table-btn rx-table-btn-groq" onClick={() => runSingleAnalysis(r, ri, qi)} disabled={analyzingIdx !== null || analysingAll}>
                                      {analyzingIdx === aidx ? "⟳ Analysing…" : "🤖 Analyse"}
                                    </button>
                                  : <span style={{ fontSize: "11px", color: "var(--c-muted)" }}>{!q.key ? "No key" : "No question"}</span>}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}