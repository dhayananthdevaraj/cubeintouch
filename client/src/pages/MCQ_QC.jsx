
import { useState } from "react";
import { DEPARTMENT_IDS } from "../config";
import "./MCQ_QC.css";

const API_BASE = "https://api.examly.io/api";
// const QC_API = "http://localhost:4000/qc";
const QC_API = "https://cubeintouch-backend.onrender.com/qc";

export default function MCQ_QC() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(true);

  const [testName, setTestName] = useState("");
  const [alert, setAlert] = useState(null);
  const [results, setResults] = useState([]);
  const [parsedMcqs, setParsedMcqs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");

  const showAlert = (msg, type = "warning") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  };
  const showOverlay = (msg) => { setOverlayText(msg); setOverlay(true); };
  const hideOverlay = () => setOverlay(false);

  const saveToken = () => {
    if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
    setToken(tokenInput.trim());
    setShowTokenInput(false);
    showAlert("✅ Token saved for this session", "success");
  };

  const clearToken = () => {
    setToken("");
    setTokenInput("");
    setShowTokenInput(true);
    setResults([]);
    setParsedMcqs([]);
    setStats(null);
    showAlert("Token cleared", "info");
  };

  const stripHTML = (html) => html.replace(/<[^>]*>/g, "").trim();

  const splitQuestionAndCode = (raw) => {
    if (!raw.includes("$$$examly")) return { question: stripHTML(raw), code: "" };
    const [q, code] = raw.split("$$$examly");
    return { question: stripHTML(q), code: code.trim() };
  };

  const parseOptions = (optionsStr) => {
    try { return JSON.parse(optionsStr || "[]").map((o) => stripHTML(o.text)); }
    catch { return []; }
  };

  const parseExistingAnswer = (answerStr) => {
    try { return stripHTML(JSON.parse(answerStr || "{}").args?.[0] || ""); }
    catch { return ""; }
  };

  const handleReset = () => {
    setTestName(""); setResults([]); setParsedMcqs([]);
    setStats(null); setAlert(null);
    showAlert("Form reset", "info");
  };

  const runQcInBatches = async (mcqs, batchSize = 4) => {
    const allResults = [];
    for (let i = 0; i < mcqs.length; i += batchSize) {
      const batch = mcqs.slice(i, i + batchSize);
      showOverlay(`🔍 Processing ${i + 1}–${Math.min(i + batchSize, mcqs.length)} of ${mcqs.length}`);
      try {
        const response = await fetch(QC_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mcqs: batch })
        });
        if (!response.ok) throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
        const batchData = await response.json();
        if (!Array.isArray(batchData)) throw new Error("Backend response is not an array");
        allResults.push(...batchData);
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        hideOverlay();
        showAlert(`❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${err.message}`, "danger");
        throw err;
      }
    }
    return allResults;
  };

  const handleQC = async () => {
    if (!testName.trim()) { showAlert("Please enter a test name", "warning"); return; }
    if (!token) { showAlert("Token missing. Please paste your token above.", "danger"); return; }

    setIsLoading(true);
    setResults([]); setParsedMcqs([]); setStats(null);

    try {
      showOverlay("🔍 Checking backend connection...");
      try {
        const healthRes = await fetch(QC_API.replace("/qc", "/health"), { method: "GET" });
        if (!healthRes.ok) {
          hideOverlay();
          showAlert("❌ Backend not running. Please check backend server.", "danger");
          setIsLoading(false); return;
        }
      } catch {
        hideOverlay();
        showAlert("⚠️ Cannot connect to backend. Make sure it's running!", "danger");
        setIsLoading(false); return;
      }

      showOverlay("🔎 Finding test...");
      const searchRes = await fetch(API_BASE + "/v2/tests/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          search: testName, page: 1, limit: 10,
          branch_id: "All", department_id: DEPARTMENT_IDS, mainDepartmentUser: true
        })
      });

      if (!searchRes.ok) {
        const errData = await searchRes.json().catch(() => ({}));
        hideOverlay();
        showAlert("❌ API Error: " + (errData.message || searchRes.statusText), "danger");
        setIsLoading(false); return;
      }

      const searchData = await searchRes.json();
      const test = searchData?.data?.[0];
      if (!test) {
        hideOverlay();
        showAlert("❌ Test not found. Check test name and try again.", "danger");
        setIsLoading(false); return;
      }

      showOverlay(`📋 Fetching MCQs from: ${test.testName || testName}...`);

      const questionsRes = await fetch(API_BASE + "/questions/test/" + test.testId, {
        headers: { Authorization: token }
      });
      if (!questionsRes.ok) {
        hideOverlay();
        showAlert("❌ Failed to fetch MCQs from test", "danger");
        setIsLoading(false); return;
      }

      const qjson = await questionsRes.json();
      const LIST = qjson?.[0]?.non_group_questions || [];
      if (!LIST.length) {
        hideOverlay();
        showAlert("❌ No MCQs found in test", "danger");
        setIsLoading(false); return;
      }

      showOverlay(`⚙️ Parsing ${LIST.length} MCQs...`);
      const mcqs = LIST.map((q) => {
        if (!q.mcq_questions) return null;
        const { question, code } = splitQuestionAndCode(q.question_data || "");
        const options = parseOptions(q.mcq_questions.options);
        const existingAnswer = parseExistingAnswer(q.mcq_questions.answer);
        return {
          question, code, options, existingAnswer,
          difficulty: q.manual_difficulty || "NA",
          topic: q.topic?.name || "Unknown"
        };
      }).filter(Boolean);

      if (!mcqs.length) {
        hideOverlay();
        showAlert("❌ No valid MCQs found", "danger");
        setIsLoading(false); return;
      }

      setParsedMcqs(mcqs);

      showOverlay(`⚡ Running AI Quality Check on ${mcqs.length} MCQs...`);
      const report = await runQcInBatches(mcqs, 4);

      const adjustedReport = report.map((r) => {
        let score = r.qualityScore || 0;
        const hasIssues = r.issues && r.issues.length > 0;
        if ((hasIssues || !r.isCorrect) && score >= 6) {
          score = Math.max(score - 2, 5);
        }
        return { ...r, qualityScore: score };
      });

      showOverlay("📊 Calculating results...");
      const clean = adjustedReport.filter((r) => r.isCorrect && !(r.issues?.length)).length;
      const issues = adjustedReport.length - clean;
      const avgScore = (
        adjustedReport.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / adjustedReport.length
      ).toFixed(1);

      setStats({ correct: clean, incorrect: issues, total: adjustedReport.length, avgScore });
      setResults(adjustedReport);

      hideOverlay();
      showAlert(`✅ QC Completed! ${clean} clean, ${issues} with issues`, "success");
    } catch (err) {
      hideOverlay();
      showAlert("Error: " + err.message, "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!results.length) { showAlert("No results to download", "warning"); return; }
    const csv =
      "Q#,Question,Correct?,Quality Score,Issues,Suggested Answer\n" +
      results.map((q, i) =>
        `"${i + 1}","${q.question.replace(/"/g, '""')}","${q.isCorrect ? "✓" : "✗"}","${q.qualityScore}","${(q.issues || []).join("; ").replace(/"/g, '""')}","${(q.correctAnswer || "").replace(/"/g, '""')}"`
      ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${testName}_qc_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert("✅ Report downloaded", "success");
  };

  const getResultItemClass = (q) => {
    if (!q.isCorrect) return "mcq-result-item mcq-result-item--error";
    if (q.issues && q.issues.length > 0) return "mcq-result-item mcq-result-item--warning";
    return "mcq-result-item mcq-result-item--success";
  };

  const getOptionClass = (option, mcq, qcResult) => {
    const isChosen = option === mcq?.existingAnswer;
    if (!isChosen) return "mcq-option";
    return qcResult?.isCorrect ? "mcq-option mcq-option--correct" : "mcq-option mcq-option--wrong";
  };

  return (
    <div className="mcq-qc-container">
      {overlay && (
        <div className="mcq-overlay">
          <div className="mcq-overlay-content">
            <div className="mcq-spinner"></div>
            <div className="mcq-overlay-text">{overlayText}</div>
          </div>
        </div>
      )}

      {alert && (
        <div className={`mcq-alert mcq-alert-${alert.type}`}>{alert.msg}</div>
      )}

      {/* ── Header Card ── */}
      <div className="mcq-card">
        <h2 className="mcq-title">🔍 MCQ AI Quality Check</h2>

        {/* Token active — top right corner of card */}
        {!showTokenInput && (
          <div className="mcq-token-corner">
            <span className="mcq-token-dot"></span>
            <span className="mcq-session-label">Session Active</span>
            <button
              onClick={clearToken}
              className="mcq-button mcq-button-danger mcq-button-sm"
            >
              Clear
            </button>
          </div>
        )}

        {/* Token input form */}
        {showTokenInput && (
          <div className="mcq-form-group" style={{ marginTop: "20px" }}>
            <label className="mcq-label">Authorization Token</label>
            <textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your Examly API token here..."
              className="mcq-token-textarea"
              rows={3}
            />
            <button
              onClick={saveToken}
              className="mcq-button mcq-button-primary"
              style={{ marginTop: "12px" }}
            >
              🔑 Save Token
            </button>
          </div>
        )}
      </div>

      {/* ── Test Input Card ── */}
      {token && (
        <div className="mcq-card">
          <div className="mcq-form-group">
            <label className="mcq-label">Test Name</label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleQC()}
              placeholder="Enter test name..."
              className="mcq-input"
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleQC}
            disabled={isLoading}
            className={`mcq-button mcq-button-primary ${isLoading ? "mcq-button-disabled" : ""}`}
          >
            {isLoading ? "🔄 Processing..." : "🚀 Analyze MCQs"}
          </button>
          <div className="mcq-button-group">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className={`mcq-button mcq-button-secondary ${isLoading ? "mcq-button-disabled" : ""}`}
            >
              🔄 Reset
            </button>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      {stats && (
        <div className="mcq-card">
          <h3 className="mcq-subtitle">📊 Summary</h3>
          <div className="mcq-stats-grid">
            <div className="mcq-stat-box">
              <div className="mcq-stat-label">Total MCQs</div>
              <div className="mcq-stat-value">{stats.total}</div>
            </div>
            <div className="mcq-stat-box">
              <div className="mcq-stat-label">✅ Clean</div>
              <div className="mcq-stat-value success">{stats.correct}</div>
            </div>
            <div className="mcq-stat-box">
              <div className="mcq-stat-label">⚠️ Issues</div>
              <div className="mcq-stat-value danger">{stats.incorrect}</div>
            </div>
            <div className="mcq-stat-box">
              <div className="mcq-stat-label">Avg Score</div>
              <div className="mcq-stat-value">{stats.avgScore}/10</div>
            </div>
          </div>
          <button onClick={downloadReport} className="mcq-button mcq-button-success">
            📥 Download Report
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {results.length > 0 && (
        <div className="mcq-card">
          <h3 className="mcq-subtitle">🎯 Detailed Results</h3>
          <div className="mcq-results-list">
            {results.map((q, i) => {
              const mcq = parsedMcqs[i];
              const hasIssues = q.issues && q.issues.length > 0;
              const scoreClass =
                q.qualityScore >= 8 ? "score-high" :
                q.qualityScore >= 6 ? "score-mid" : "score-low";

              return (
                <div key={i} className={getResultItemClass(q)}>
                  <div className="mcq-result-header">
                    <span className="mcq-result-number">Q{i + 1}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {mcq?.topic && <span className="mcq-result-topic">{mcq.topic}</span>}
                      {mcq?.difficulty && mcq.difficulty !== "NA" && (
                        <span className="mcq-result-difficulty">{mcq.difficulty}</span>
                      )}
                      <span className={`mcq-result-score ${scoreClass}`}>
                        {!q.isCorrect ? "❌" : hasIssues ? "⚠️" : "✅"} {q.qualityScore}/10
                      </span>
                    </div>
                  </div>

                  <div className="mcq-result-question">{q.question}</div>

                  {mcq?.code && <pre className="mcq-result-code">{mcq.code}</pre>}

                  {mcq?.options?.length > 0 && (
                    <div className="mcq-options-list">
                      {mcq.options.map((option, j) => (
                        <div key={j} className={getOptionClass(option, mcq, q)}>
                          <span className="mcq-option-letter">{String.fromCharCode(65 + j)}</span>
                          <span className="mcq-option-text">{option}</span>
                          {option === mcq.existingAnswer && (
                            <span className="mcq-option-badge">
                              {q.isCorrect ? "✓ Correct" : "✗ Wrong"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {hasIssues && (
                    <div className="mcq-issues-list">
                      <strong>⚠️ Issues:</strong>
                      <ul>
                        {q.issues.map((issue, j) => <li key={j}>{issue}</li>)}
                      </ul>
                    </div>
                  )}

                  {!q.isCorrect && q.correctAnswer && (
                    <div className="mcq-suggestion">
                      <strong>✏️ Suggested Answer:</strong> {q.correctAnswer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!results.length && !isLoading && (
        <div className="mcq-empty-state">
          <div className="mcq-empty-icon">📝</div>
          <p>
            {token
              ? 'Enter a test name and click "Analyze MCQs" to get started'
              : "Paste your token above to get started"}
          </p>
        </div>
      )}
    </div>
  );
}