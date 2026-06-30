// src/pages/DupDetect.jsx
import { useState } from "react";
import { DEPARTMENT_IDS } from "../config";
import apiConfig from "../apiConfig";
import "./DupDetect.css";

const API_BASE = "https://api.examly.io/api";
const DUP_API  = apiConfig.DUP_DETECT;

const ANALYSIS_STEPS = [
  { id:"backend", label:"Connecting to backend",      icon:"🛰️" },
  { id:"search",  label:"Locating source",            icon:"🔎" },
  { id:"fetch",   label:"Fetching questions",         icon:"📥" },
  { id:"parse",   label:"Parsing MCQs",               icon:"⚙️" },
  { id:"detect",  label:"Running similarity engine",  icon:"🧬" },
  { id:"done",    label:"Analysis complete",          icon:"✅" },
];

export default function DupDetect() {
  // ── page: "token" | "config" | "running" | "result"
  const [page,       setPage]       = useState(() => { try { return localStorage.getItem("mcq_qc_token") ? "config" : "token"; } catch { return "token"; } });
  const [token,      setToken]      = useState(() => { try { return localStorage.getItem("mcq_qc_token") || ""; } catch { return ""; } });
  const [tokenInput, setTokenInput] = useState("");

  // config
  const [sourceMode,    setSourceMode]    = useState("test");
  const [testSearch,    setTestSearch]    = useState("");
  const [testResults,   setTestResults]   = useState([]);
  const [selectedTest,  setSelectedTest]  = useState(null);
  const [testSearching, setTestSearching] = useState(false);
  const [qbSearch,      setQbSearch]      = useState("");
  const [qbResults,     setQbResults]     = useState([]);
  const [selectedQB,    setSelectedQB]    = useState(null);
  const [qbSearching,   setQbSearching]   = useState(false);
  const [threshold,     setThreshold]     = useState(80);

  // run
  const [activeStep, setActiveStep] = useState(-1);
  const [isLoading,  setIsLoading]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);

  // alert
  const [alert, setAlert] = useState(null);
  const showAlert = (msg, type = "warning") => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 5000); };

  // helpers
  const goStep    = id => setActiveStep(ANALYSIS_STEPS.findIndex(s => s.id === id));
  const stripHTML = (h = "") => h.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const parseOpts = s => { try { return JSON.parse(s || "[]").map(o => stripHTML(o.text)); } catch { return []; } };
  const parseAns  = s => { try { return stripHTML(JSON.parse(s || "{}").args?.[0] || ""); } catch { return ""; } };
  const diffWords = (a = "", b = "") => {
    const sb = new Set(b.split(/\s+/).map(w => w.toLowerCase()));
    return a.split(/\s+/).map(w => ({ word: w, diff: !sb.has(w.toLowerCase()) }));
  };

  // ── auth
  const saveToken = () => {
    if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
    localStorage.setItem("mcq_qc_token", tokenInput.trim());
    setToken(tokenInput.trim()); setPage("config");
  };
  const logout = () => {
    localStorage.removeItem("mcq_qc_token");
    setToken(""); setTokenInput(""); setPage("token");
    setResult(null);
    setQbResults([]); setSelectedQB(null);
    setTestResults([]); setSelectedTest(null);
  };

  // ── Test search
  const searchTest = async () => {
    if (!testSearch.trim()) return;
    setTestSearching(true);
    try {
      const res  = await fetch(API_BASE + "/v2/tests/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ branch_id: "All", department_id: DEPARTMENT_IDS, limit: 25, mainDepartmentUser: true, page: 1, search: testSearch }),
      });
      const data = await res.json();
      const tests = data?.data || [];
      setTestResults(tests);
      if (!tests.length) showAlert("No tests found", "warning");
    } catch (err) { showAlert("Error: " + err.message, "danger"); }
    finally { setTestSearching(false); }
  };

  // ── QB search
  const searchQB = async () => {
    if (!qbSearch.trim()) return;
    setQbSearching(true);
    try {
      const res  = await fetch(API_BASE + "/v2/questionbanks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ branch_id: "all", department_id: DEPARTMENT_IDS, limit: 25, mainDepartmentUser: true, page: 1, search: qbSearch, visibility: "All" }),
      });
      const data = await res.json();
      const qbs  = data?.results?.questionbanks || [];
      setQbResults(qbs);
      if (!qbs.length) showAlert("No QBs found", "warning");
    } catch (err) { showAlert("Error: " + err.message, "danger"); }
    finally { setQbSearching(false); }
  };

  // ── fetch from test
  const fetchFromTest = async () => {
    goStep("search");
    if (!selectedTest) throw new Error("No test selected");
    goStep("fetch");
    const qr = await fetch(API_BASE + "/questions/test/" + selectedTest.testId, { headers: { Authorization: token } });
    if (!qr.ok) throw new Error("Failed to fetch questions");
    return (await qr.json())?.[0]?.non_group_questions || [];
  };

  // ── fetch from QB
  const fetchFromQB = async qb => {
    goStep("fetch");
    const res = await fetch(API_BASE + "/v2/questionfilter", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({ qb_id: qb.qb_id, type: "Single", page: 1, limit: 500 }),
    });
    if (!res.ok) throw new Error("Failed to fetch QB questions");
    return (await res.json())?.non_group_questions || [];
  };

  const parseQuestions = raw =>
    raw.filter(q => q.mcq_questions).map(q => ({
      q_id: q.q_id,
      question: stripHTML(q.question_data || ""),
      options: parseOpts(q.mcq_questions?.options),
      existingAnswer: parseAns(q.mcq_questions?.answer),
      difficulty: q.manual_difficulty || "NA",
      topic: q.topic?.name || "Unknown",
    }));

  // ── run detect
  const handleDetect = async () => {
    if (sourceMode === "test" && !selectedTest)  { showAlert("Select a test first", "warning"); return; }
    if (sourceMode === "qb"   && !selectedQB)    { showAlert("Select a question bank", "warning"); return; }

    setIsLoading(true); setResult(null); setExpandedGroup(null); setPage("running");

    try {
      goStep("backend");
      try { const h = await fetch(DUP_API.replace("/dup-detect", "/health")); if (!h.ok) throw new Error(); }
      catch { showAlert("Backend not reachable", "danger"); setPage("config"); setIsLoading(false); return; }

      const rawList = sourceMode === "test" ? await fetchFromTest() : await fetchFromQB(selectedQB);
      if (!rawList.length) { showAlert("No MCQs found", "danger"); setPage("config"); setIsLoading(false); return; }

      goStep("parse");
      const mcqs = parseQuestions(rawList);
      if (mcqs.length < 2) { showAlert("Need at least 2 MCQs", "warning"); setPage("config"); setIsLoading(false); return; }

      goStep("detect");
      const res = await fetch(DUP_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcqs, threshold }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      goStep("done");
      await new Promise(r => setTimeout(r, 700));
      setResult(data); setPage("result");
    } catch (err) {
      showAlert("Error: " + err.message, "danger"); setPage("config");
    } finally { setIsLoading(false); setActiveStep(-1); }
  };

  const downloadCSV = () => {
    if (!result?.clusters?.length) return;
    const rows = ["Group,Q#,Question,Topic,Difficulty,Similarity%,Q_ID"];
    result.clusters.forEach((c, gi) => c.questions.forEach((q, qi) =>
      rows.push(`"Group ${gi+1}","${qi+1}","${q.question.replace(/"/g,'""')}","${q.topic}","${q.difficulty}","${c.maxSimilarity}","${q.q_id}"`)
    ));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = `dup_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const simLabel = s => s >= 95 ? "Exact" : s >= 88 ? "High" : "Moderate";
  const simColor = s => s >= 95 ? "critical" : s >= 88 ? "high" : "medium";

  // ════════════ PAGE: TOKEN ════════════
  if (page === "token") return (
    <div className="dd-token-page">
      {alert && <div className={`dd-alert dd-alert--${alert.type}`}>{alert.msg}</div>}
      <div className="dd-token-card">
        <div className="dd-token-top">
          <div className="dd-token-logo">🔁</div>
          <div>
            <div className="dd-token-brand">Dup Detect</div>
            <div className="dd-token-brand-sub">MCQ Similarity Engine</div>
          </div>
        </div>
        <div className="dd-token-divider" />
        <h2 className="dd-token-heading">Enter your token</h2>
        <p className="dd-token-desc">Paste your Examly authorization token to continue. It will be saved locally.</p>
        <textarea
          className="dd-token-input"
          rows={4}
          value={tokenInput}
          onChange={e => setTokenInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        />
        <button className="dd-token-btn" onClick={saveToken}>
          Continue <span className="dd-token-arrow">→</span>
        </button>
        <div className="dd-token-footer">🔒 Stored securely in your browser</div>
      </div>
    </div>
  );

  // ════════════ PAGE: CONFIG ════════════
  if (page === "config") return (
    <div className="dd-config-page">
      {alert && <div className={`dd-alert dd-alert--${alert.type}`}>{alert.msg}</div>}

      {/* Header */}
      <div className="dd-cfg-header">
        <div className="dd-cfg-header-left">
          <div className="dd-cfg-logo">🔁</div>
          <div>
            <div className="dd-cfg-title">Dup Detect</div>
            <div className="dd-cfg-sub">Configure your analysis</div>
          </div>
        </div>
        <div className="dd-cfg-header-right">
          <div className="dd-cfg-session">
            <span className="dd-cfg-session-dot" />
            Session active
          </div>
          <button className="dd-cfg-logout" onClick={logout}>Logout</button>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="dd-steps-indicator">
        <div className="dd-step-ind active"><span className="dd-step-ind-num">1</span><span className="dd-step-ind-label">Configure</span></div>
        <div className="dd-step-ind-line" />
        <div className="dd-step-ind"><span className="dd-step-ind-num">2</span><span className="dd-step-ind-label">Analyze</span></div>
        <div className="dd-step-ind-line" />
        <div className="dd-step-ind"><span className="dd-step-ind-num">3</span><span className="dd-step-ind-label">Results</span></div>
      </div>

      {/* Config form */}
      <div className="dd-cfg-body">
        {/* Source */}
        <div className="dd-cfg-section">
          <div className="dd-cfg-section-label">
            <span className="dd-cfg-section-num">01</span>
            Select Source Type
          </div>
          <div className="dd-cfg-source-grid">
            <div
              className={`dd-cfg-source-card ${sourceMode === "test" ? "active" : ""}`}
              onClick={() => { setSourceMode("test"); setQbResults([]); setSelectedQB(null); setQbSearch(""); }}
            >
              <div className="dd-cfg-source-icon">📋</div>
              <div className="dd-cfg-source-name">Test</div>
              <div className="dd-cfg-source-desc">Find duplicates within a test</div>
              {sourceMode === "test" && <div className="dd-cfg-source-check">✓</div>}
            </div>
            <div
              className={`dd-cfg-source-card ${sourceMode === "qb" ? "active" : ""}`}
              onClick={() => { setSourceMode("qb"); }}
            >
              <div className="dd-cfg-source-icon">📚</div>
              <div className="dd-cfg-source-name">Question Bank</div>
              <div className="dd-cfg-source-desc">Find duplicates within a QB</div>
              {sourceMode === "qb" && <div className="dd-cfg-source-check">✓</div>}
            </div>
          </div>
        </div>

        {/* Input — Test */}
        {sourceMode === "test" && (
        <div className="dd-cfg-section">
          <div className="dd-cfg-section-label">
            <span className="dd-cfg-section-num">02</span>
            Search Test
          </div>
          <div className="dd-cfg-search-row">
            <input className="dd-cfg-input" type="text" value={testSearch}
              onChange={e => setTestSearch(e.target.value)}
              onKeyPress={e => e.key === "Enter" && searchTest()}
              placeholder="Search test by name..." />
            <button className="dd-cfg-search-btn" onClick={searchTest} disabled={testSearching || !testSearch.trim()}>
              {testSearching ? <span className="dd-cfg-search-spinner" /> : "Search"}
            </button>
          </div>
          {testResults.length > 0 && !selectedTest && (
            <div className="dd-cfg-qb-results">
              {testResults.map(t => (
                <div key={t.testId} className="dd-cfg-qb-row" onClick={() => { setSelectedTest(t); setTestResults([]); }}>
                  <div>
                    <div className="dd-cfg-qb-name">{t.testName}</div>
                    <div className="dd-cfg-qb-meta">{t.sections?.[0]?.questionCount ?? "?"} questions · {t.createdBy} · {t.publishStatus}</div>
                  </div>
                  <span className="dd-cfg-qb-select">Select →</span>
                </div>
              ))}
            </div>
          )}
          {selectedTest && (
            <div className="dd-cfg-selected-qb">
              <div className="dd-cfg-selected-qb-left">
                <span className="dd-cfg-selected-icon">📋</span>
                <div>
                  <div className="dd-cfg-selected-name">{selectedTest.testName}</div>
                  <div className="dd-cfg-selected-meta">{selectedTest.sections?.[0]?.questionCount ?? "?"} questions · {selectedTest.publishStatus}</div>
                </div>
              </div>
              <button className="dd-cfg-selected-remove" onClick={() => { setSelectedTest(null); setTestSearch(""); setTestResults([]); }}>✕ Remove</button>
            </div>
          )}
        </div>
        )}

        {/* Input — QB */}
        {sourceMode === "qb" && (
        <div className="dd-cfg-section">
          <div className="dd-cfg-section-label">
            <span className="dd-cfg-section-num">02</span>
            Search Question Bank
          </div>
          <div className="dd-cfg-search-row">
            <input className="dd-cfg-input" type="text" value={qbSearch}
              onChange={e => setQbSearch(e.target.value)}
              onKeyPress={e => e.key === "Enter" && searchQB()}
              placeholder="Search question bank by name..." />
            <button className="dd-cfg-search-btn" onClick={searchQB} disabled={qbSearching || !qbSearch.trim()}>
              {qbSearching ? <span className="dd-cfg-search-spinner" /> : "Search"}
            </button>
          </div>
          {qbResults.length > 0 && !selectedQB && (
            <div className="dd-cfg-qb-results">
              {qbResults.map(qb => (
                <div key={qb.qb_id} className="dd-cfg-qb-row" onClick={() => { setSelectedQB(qb); setQbResults([]); }}>
                  <div>
                    <div className="dd-cfg-qb-name">{qb.qb_name}</div>
                    <div className="dd-cfg-qb-meta">{qb.questionCount} questions · {qb.createdBy}</div>
                  </div>
                  <span className="dd-cfg-qb-select">Select →</span>
                </div>
              ))}
            </div>
          )}
          {selectedQB && (
            <div className="dd-cfg-selected-qb">
              <div className="dd-cfg-selected-qb-left">
                <span className="dd-cfg-selected-icon">📚</span>
                <div>
                  <div className="dd-cfg-selected-name">{selectedQB.qb_name}</div>
                  <div className="dd-cfg-selected-meta">{selectedQB.questionCount} questions</div>
                </div>
              </div>
              <button className="dd-cfg-selected-remove" onClick={() => { setSelectedQB(null); setQbSearch(""); }}>✕ Remove</button>
            </div>
          )}
        </div>
        )}

        {/* Threshold */}
        <div className="dd-cfg-section">
          <div className="dd-cfg-section-label">
            <span className="dd-cfg-section-num">03</span>
            Similarity Threshold
            <span className="dd-cfg-threshold-pill">{threshold}%</span>
          </div>
          <input
            type="range" min={60} max={99} step={1}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="dd-cfg-slider"
          />
          <div className="dd-cfg-slider-labels">
            <span>60% — Broad match</span>
            <span>80% — Balanced</span>
            <span>99% — Exact only</span>
          </div>
          <div className="dd-cfg-slider-track">
            <div className="dd-cfg-track-green" />
            <div className="dd-cfg-track-amber" />
            <div className="dd-cfg-track-red" />
          </div>
        </div>

        {/* Run */}
        <div className="dd-cfg-run-row">
          <button className="dd-cfg-run-btn" onClick={handleDetect}>
            Run Duplicate Detection →
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════ PAGE: RUNNING ════════════
  if (page === "running") return (
    <div className="dd-running-page">
      <div className="dd-running-card">
        <div className="dd-running-header">
          <div className="dd-running-spinner-wrap">
            <div className="dd-running-ring dd-running-ring--1" />
            <div className="dd-running-ring dd-running-ring--2" />
            <div className="dd-running-ring dd-running-ring--3" />
            <div className="dd-running-center">🧬</div>
          </div>
          <div className="dd-running-title">Analyzing MCQs</div>
          <div className="dd-running-sub">Running similarity detection across your questions</div>
        </div>
        <div className="dd-running-steps">
          {ANALYSIS_STEPS.map((s, i) => {
            const state = i < activeStep ? "done" : i === activeStep ? "active" : "idle";
            return (
              <div key={s.id} className={`dd-running-step dd-running-step--${state}`}>
                <div className="dd-running-step-icon">
                  {state === "done" ? "✓" : state === "active" ? <span className="dd-running-pulse" /> : ""}
                </div>
                <div className="dd-running-step-text">
                  <span className="dd-running-step-emoji">{s.icon}</span>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ════════════ PAGE: RESULT ════════════
  if (page === "result" && result) return (
    <div className="dd-result-page">
      {alert && <div className={`dd-alert dd-alert--${alert.type}`}>{alert.msg}</div>}

      {/* Result header */}
      <div className="dd-result-header">
        <div className="dd-result-header-left">
          <button className="dd-result-back" onClick={() => { setPage("config"); setResult(null); }}>
            ← New Analysis
          </button>
          <div className="dd-result-title">Analysis Results</div>
        </div>
        {result.duplicateClusters > 0 && (
          <button className="dd-result-dl-btn" onClick={downloadCSV}>
            📥 Export CSV
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="dd-result-stats">
        {[
          { label: "MCQs Scanned",      val: result.total,                   color: "default" },
          { label: "Duplicate Groups",  val: result.duplicateClusters,       color: result.duplicateClusters > 0 ? "warn" : "ok" },
          { label: "Affected MCQs",     val: result.totalDuplicateQuestions, color: result.totalDuplicateQuestions > 0 ? "warn" : "ok" },
          { label: "Threshold",         val: result.threshold + "%",         color: "default" },
        ].map(s => (
          <div key={s.label} className={`dd-result-stat dd-result-stat--${s.color}`}>
            <div className="dd-result-stat-val">{s.val}</div>
            <div className="dd-result-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Clean state */}
      {result.duplicateClusters === 0 && (
        <div className="dd-result-clean">
          <div className="dd-result-clean-icon">✅</div>
          <div className="dd-result-clean-title">All questions are unique!</div>
          <div className="dd-result-clean-sub">No duplicates found at {result.threshold}% threshold across {result.total} MCQs.</div>
        </div>
      )}

      {/* Clusters */}
      {result.clusters?.length > 0 && (
        <div className="dd-result-clusters">
          <div className="dd-result-clusters-label">
            Duplicate Groups
            <span className="dd-result-clusters-badge">{result.clusters.length}</span>
          </div>
          {result.clusters.map((cluster, gi) => {
            const isOpen = expandedGroup === gi;
            const sc     = simColor(cluster.maxSimilarity);
            const q0     = cluster.questions[0];
            const q1     = cluster.questions[1];
            return (
              <div key={gi} className={`dd-cluster dd-cluster--${sc}`}>
                {/* Cluster header */}
                <div className="dd-cluster-hd" onClick={() => setExpandedGroup(isOpen ? null : gi)}>
                  <div className="dd-cluster-hd-left">
                    <div className={`dd-cluster-badge dd-cluster-badge--${sc}`}>
                      {simLabel(cluster.maxSimilarity)}
                    </div>
                    <div className="dd-cluster-info">
                      <span className="dd-cluster-title">Group {gi + 1}</span>
                      <span className="dd-cluster-count">{cluster.questions.length} questions</span>
                    </div>
                  </div>
                  <div className="dd-cluster-hd-right">
                    <div className="dd-cluster-meter-wrap">
                      <div className="dd-cluster-meter">
                        <div className={`dd-cluster-meter-fill dd-cluster-meter--${sc}`} style={{ width: `${cluster.maxSimilarity}%` }} />
                      </div>
                      <span className="dd-cluster-pct">{cluster.maxSimilarity}%</span>
                    </div>
                    <span className="dd-cluster-chevron">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Cluster body */}
                {isOpen && (
                  <div className="dd-cluster-body">
                    {/* Diff */}
                    {q0 && q1 && (
                      <div className="dd-diff-block">
                        <div className="dd-diff-header">
                          <span className="dd-diff-header-icon">⚡</span>
                          Side-by-side diff — top 2 similar
                        </div>
                        <div className="dd-diff-cols">
                          {[{ q: q0, words: diffWords(q0.question, q1.question) }, { q: q1, words: diffWords(q1.question, q0.question) }].map((side, si) => (
                            <div key={si} className="dd-diff-col">
                              <div className="dd-diff-col-head">
                                <span className="dd-diff-q-badge">Q{si + 1}</span>
                                <span className="dd-diff-topic">{side.q.topic}</span>
                                <span className={`dd-diff-dif dd-diff-dif--${side.q.difficulty?.toLowerCase()}`}>{side.q.difficulty}</span>
                              </div>
                              <div className="dd-diff-text">
                                {side.words.map((w, wi) => (
                                  w.diff
                                    ? <mark key={wi} className="dd-word-hl">{w.word}</mark>
                                    : <span key={wi}>{w.word}</span>
                                )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ' ', el], [])}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Q cards */}
                    <div className="dd-qcards">
                      {cluster.questions.map((q, qi) => (
                        <div key={qi} className="dd-qcard">
                          <div className="dd-qcard-head">
                            <span className="dd-qcard-num">Q{qi + 1}</span>
                            <span className="dd-qcard-topic">{q.topic}</span>
                            {q.difficulty !== "NA" && (
                              <span className={`dd-qcard-dif dd-qcard-dif--${q.difficulty?.toLowerCase()}`}>{q.difficulty}</span>
                            )}
                            <span className="dd-qcard-id">{q.q_id.slice(0, 8)}…</span>
                          </div>
                          <div className="dd-qcard-text">{q.question}</div>
                          {q.options?.length > 0 && (
                            <div className="dd-qcard-opts">
                              {q.options.map((opt, oi) => (
                                <div key={oi} className={`dd-qcard-opt ${opt === q.existingAnswer ? "correct" : ""}`}>
                                  <span className="dd-qcard-opt-ltr">{String.fromCharCode(65 + oi)}</span>
                                  <span className="dd-qcard-opt-text">{opt}</span>
                                  {opt === q.existingAnswer && <span className="dd-qcard-ans">✓ Answer</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return null;
}