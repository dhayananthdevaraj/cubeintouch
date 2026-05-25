import { useState, useEffect } from "react";
import "./CODSync.css";
import {
  QuestionTypePill,
  MultifileUploadSection,
  parseMultifileQuestions,
  buildMultifilePayload,
  MULTIFILE_LANGUAGES,
} from "./CODSyncMultifile";

const API        = "https://api.examly.io";
const JUDGE0_API = "https://ce.judge0.com/submissions?wait=true";

import headerFooterTxt    from "../../public/templates/format_code_snippet_header_footer.txt?raw";
import codeStubTxt        from "../../public/templates/format_code_stub.txt?raw";
import multiLanguageTxt   from "../../public/templates/format_multi_language.txt?raw";
import snippetWithStubTxt from "../../public/templates/format_snippet_with_stub.txt?raw";
import snippetStubWlBlTxt from "../../public/templates/format_snippet_stub_whitelist_blacklist.txt?raw";

// ─── JUDGE0 LANGUAGE ID MAP ───────────────────────────────────────────────────
const JUDGE0_LANG_ID = {
  "C":          50,
  "C++":        54,
  "Java":       62,
  "Python":     71,
  "Python 3":   71,
  "Python 2":   70,
  "JavaScript": 63,
  "C#":         51,
  "Go":         60,
  "Kotlin":     78,
  "Swift":      83,
  "R":          80,
  "Ruby":       72,
  "Scala":      81,
  "TypeScript": 74,
};

function getLangId(lang) {
  if (!lang) return null;
  const clean = lang.trim();
  if (JUDGE0_LANG_ID[clean]) return JUDGE0_LANG_ID[clean];
  for (const [key, id] of Object.entries(JUDGE0_LANG_ID)) {
    if (clean.toLowerCase().includes(key.toLowerCase())) return id;
  }
  return null;
}

function assembleSource(q, lang) {
  const parts = [];
  if (q.headers?.[lang]) parts.push(q.headers[lang]);
  if (q.solutions?.[lang]) parts.push(q.solutions[lang]);
  if (q.footers?.[lang]) parts.push(q.footers[lang]);
  return parts.join("\n\n");
}

function normalizeOutput(str) {
  if (!str) return "";
  return str
    .split("\n")
    .map(l => l.trimEnd())
    .join("\n")
    .trim();
}

// ─── SAFE PIPE SPLIT ──────────────────────────────────────────────────────────
// Splits on " | " (space-pipe-space) up to maxParts times.
// This means any bare | inside an output field is preserved correctly.
function splitTCLine(val, maxParts) {
  const parts = [];
  let remaining = val;
  for (let i = 0; i < maxParts - 1; i++) {
    const idx = remaining.indexOf(" | ");
    if (idx === -1) break;
    parts.push(remaining.slice(0, idx).trim());
    remaining = remaining.slice(idx + 3);
  }
  parts.push(remaining.trim());
  return parts;
}

// Detect potential pipe-in-output issues for warnings
function detectPipeWarning(val) {
  // Count space-pipe-space occurrences
  const spacedPipes = (val.match(/ \| /g) || []).length;
  // Count bare pipes (not surrounded by spaces on both sides)
  const allPipes = (val.match(/\|/g) || []).length;
  const barePipes = allPipes - spacedPipes;
  return { spacedPipes, barePipes };
}

// ─── COMPILER-STYLE TC PANEL ─────────────────────────────────────────────────
function TCPanel({ tc, index, isSample }) {
  const statusColor = tc.status === "pass" ? "#10b981" : tc.status === "skip" ? "#f59e0b" : tc.status === "error" ? "#8b5cf6" : "#ef4444";
  const statusBg    = tc.status === "pass" ? "rgba(16,185,129,0.06)" : tc.status === "skip" ? "rgba(245,158,11,0.06)" : tc.status === "error" ? "rgba(139,92,246,0.06)" : "rgba(239,68,68,0.06)";
  const statusIcon  = tc.status === "pass" ? "✓" : tc.status === "skip" ? "⏭" : tc.status === "error" ? "!" : "✗";
  const label       = isSample ? `Sample ${index}` : `TC${index}`;

  return (
    <div style={{
      border: `1.5px solid ${statusColor}40`,
      borderRadius: 12, overflow: "hidden",
      background: "white",
      boxShadow: `0 2px 8px ${statusColor}15`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px",
        background: statusBg,
        borderBottom: `1px solid ${statusColor}20`,
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 60, height: 24, borderRadius: 6,
          background: statusColor, color: "white",
          fontSize: 11, fontWeight: 800, flexShrink: 0,
          letterSpacing: "0.02em",
        }}>
          {label} {statusIcon}
        </span>
        {!isSample && tc.difficulty && (
          <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>
            {tc.difficulty} · {tc.score}pts
          </span>
        )}
        {isSample && (
          <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 700, background: "rgba(99,102,241,0.08)", padding: "2px 8px", borderRadius: 20 }}>
            Sample I/O
          </span>
        )}
        {tc.time && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
            ⏱ {tc.time}s
          </span>
        )}
        {tc.status === "pass" && (
          <span style={{ marginLeft: tc.time ? 0 : "auto", fontSize: 11, fontWeight: 700, color: "#10b981" }}>Accepted</span>
        )}
        {tc.status === "skip" && (
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>{tc.reason}</span>
        )}
      </div>

      {tc.status !== "skip" && (
        <div style={{ display: "grid", gridTemplateColumns: tc.input !== null && tc.input !== "" ? "1fr 1fr 1fr" : "1fr 1fr", gap: 0 }}>
          {(tc.input !== null && tc.input !== "") && (
            <div style={{ borderRight: "1px solid #f1f3f5" }}>
              <div style={{ padding: "6px 12px", background: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#64748b", display: "inline-block" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Input</span>
              </div>
              <pre style={{
                margin: 0, padding: "10px 12px",
                background: "#0f172a", color: "#e2e8f0",
                fontSize: 11, lineHeight: 1.7,
                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
                minHeight: 60, maxHeight: 160, overflowY: "auto",
              }}>{(tc.input || "").trim()}</pre>
            </div>
          )}

          <div style={{ borderRight: "1px solid #f1f3f5" }}>
            <div style={{ padding: "6px 12px", background: "#064e3b", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected</span>
            </div>
            <pre style={{
              margin: 0, padding: "10px 12px",
              background: "#022c22", color: "#6ee7b7",
              fontSize: 11, lineHeight: 1.7,
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              whiteSpace: "pre-wrap", wordBreak: "break-all",
              minHeight: 60, maxHeight: 160, overflowY: "auto",
            }}>{(tc.expected || "").trim()}</pre>
          </div>

          <div>
            <div style={{
              padding: "6px 12px",
              background: tc.status === "pass" ? "#064e3b" : tc.status === "error" ? "#2e1065" : "#450a0a",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: tc.status === "pass" ? "#10b981" : tc.status === "error" ? "#8b5cf6" : "#ef4444", display: "inline-block" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: tc.status === "pass" ? "#6ee7b7" : tc.status === "error" ? "#c4b5fd" : "#fca5a5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {tc.status === "error" ? "Error" : "Actual Output"}
              </span>
              {tc.status === "pass" && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: "#10b981" }}>✓ Match</span>}
              {tc.status === "fail" && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: "#ef4444" }}>✗ Mismatch</span>}
            </div>
            <pre style={{
              margin: 0, padding: "10px 12px",
              background: tc.status === "pass" ? "#022c22" : tc.status === "error" ? "#1a0533" : "#1c0404",
              color: tc.status === "pass" ? "#6ee7b7" : tc.status === "error" ? "#c4b5fd" : "#fca5a5",
              fontSize: 11, lineHeight: 1.7,
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              whiteSpace: "pre-wrap", wordBreak: "break-all",
              minHeight: 60, maxHeight: 160, overflowY: "auto",
            }}>
              {tc.status === "error"
                ? (tc.reason || "Unknown error")
                : (tc.actual || "(no output)").trim()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VALIDATE SECTION COMPONENT ──────────────────────────────────────────────
function ValidateSection({ parsedQuestions, onValidated, showAlert }) {
  const [isValidating, setIsValidating]   = useState(false);
  const [validationResults, setResults]   = useState(null);
  const [progress, setProgress]           = useState({ current: 0, total: 0, label: "" });
  const [expandedQ, setExpandedQ]         = useState(null);
  const [forceOverride, setForceOverride] = useState(false);

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const runOne = async (source, langId, input) => {
    const res = await fetch(JUDGE0_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: source,
        language_id: langId,
        stdin: input || "",
        cpu_time_limit: 5,
        wall_time_limit: 10,
      }),
    });
    return await res.json();
  };

  const classifyResult = (data, expected) => {
    const actual  = data.stdout || "";
    const passed  = normalizeOutput(actual) === normalizeOutput(expected);
    const statusId = data.status?.id;
    let tcStatus = passed ? "pass" : "fail";
    let reason = null;
    if (statusId === 6)  { tcStatus = "error"; reason = (data.compile_output || "Compile Error").trim(); }
    if (statusId === 5)  { tcStatus = "error"; reason = "Time Limit Exceeded"; }
    if (statusId === 11) { tcStatus = "error"; reason = (data.stderr || "Runtime Error").trim(); }
    if (statusId === 13) { tcStatus = "error"; reason = "Internal Error"; }
    return { tcStatus, reason, actual };
  };

  const runValidation = async () => {
    setIsValidating(true);
    setResults(null);
    setForceOverride(false);
    setExpandedQ(null);

    const allResults = [];
    let globalIdx = 0;
    const totalTCs = parsedQuestions.reduce((s, q) => s + q.testcases.length + (q.sampleIO?.length || 0), 0);
    setProgress({ current: 0, total: totalTCs, label: "Starting..." });

    for (const q of parsedQuestions) {
      const lang   = q.languages.find(l => q.solutions?.[l] && getLangId(l));
      const langId = lang ? getLangId(lang) : null;
      const source = lang ? assembleSource(q, lang) : null;

      const qResult = {
        title: q.title,
        lang: lang || q.languages[0],
        langId,
        hasSource: !!source,
        testcases: [],
        sampleIO: [],
        passCount: 0,
        failCount: 0,
        skipCount: 0,
        samplePassCount: 0,
        sampleFailCount: 0,
      };

      for (let ti = 0; ti < q.testcases.length; ti++) {
        const tc = q.testcases[ti];
        globalIdx++;
        setProgress({ current: globalIdx, total: totalTCs, label: `${q.title} — TC${ti + 1}` });

        if (!source || !langId) {
          qResult.testcases.push({ index: ti + 1, status: "skip", reason: !langId ? `No Judge0 support for "${q.languages[0]}"` : "No solution", input: tc.input, expected: tc.output, actual: null, difficulty: tc.difficulty, score: tc.score, time: null });
          qResult.skipCount++;
          continue;
        }

        try {
          const data = await runOne(source, langId, tc.input);
          const { tcStatus, reason, actual } = classifyResult(data, tc.output);
          if (tcStatus === "pass") qResult.passCount++; else qResult.failCount++;
          qResult.testcases.push({ index: ti + 1, status: tcStatus, reason, input: tc.input, expected: tc.output, actual, difficulty: tc.difficulty, score: tc.score, time: data.time });
        } catch (err) {
          qResult.testcases.push({ index: ti + 1, status: "error", reason: "Network: " + err.message, input: tc.input, expected: tc.output, actual: null, difficulty: tc.difficulty, score: tc.score, time: null });
          qResult.failCount++;
        }

        if (globalIdx < totalTCs) await sleep(300);
      }

      for (let si = 0; si < (q.sampleIO?.length || 0); si++) {
        const s = q.sampleIO[si];
        globalIdx++;
        setProgress({ current: globalIdx, total: totalTCs, label: `${q.title} — Sample ${si + 1}` });

        if (!source || !langId) {
          qResult.sampleIO.push({ index: si + 1, status: "skip", reason: "No source", input: s.input, expected: s.output, actual: null, time: null });
          qResult.skipCount++;
          continue;
        }

        try {
          const data = await runOne(source, langId, s.input);
          const { tcStatus, reason, actual } = classifyResult(data, s.output);
          if (tcStatus === "pass") qResult.samplePassCount++; else qResult.sampleFailCount++;
          qResult.sampleIO.push({ index: si + 1, status: tcStatus, reason, input: s.input, expected: s.output, actual, time: data.time });
        } catch (err) {
          qResult.sampleIO.push({ index: si + 1, status: "error", reason: "Network: " + err.message, input: s.input, expected: s.output, actual: null, time: null });
          qResult.sampleFailCount++;
        }

        if (globalIdx < totalTCs) await sleep(300);
      }

      allResults.push(qResult);
    }

    setResults(allResults);
    setIsValidating(false);

    const totalPass = allResults.reduce((s, r) => s + r.passCount + r.samplePassCount, 0);
    const totalFail = allResults.reduce((s, r) => s + r.failCount + r.sampleFailCount, 0);
    const totalSkip = allResults.reduce((s, r) => s + r.skipCount, 0);

    if (totalFail === 0 && totalSkip === 0) {
      showAlert(`🎉 All ${totalPass} testcases + samples passed!`, "success");
      onValidated(true);
    } else if (totalFail === 0) {
      showAlert(`✅ ${totalPass} passed, ${totalSkip} skipped (unsupported language)`, "warning");
      onValidated(true);
    } else {
      showAlert(`⚠️ ${totalFail} testcase(s) failed — review before uploading`, "danger");
      onValidated(false);
    }
  };

  const allPassed = validationResults && validationResults.every(r => r.failCount === 0 && r.sampleFailCount === 0);

  return (
    <div style={{
      background: "#0f172a",
      border: "2px solid #1e293b",
      borderRadius: 16,
      overflow: "hidden",
      marginTop: 16,
      marginBottom: 4,
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
    }}>
      {/* IDE title bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px",
        background: "#1e293b",
        borderBottom: "1px solid #334155",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ef4444","#f59e0b","#10b981"].map((c,i) => (
              <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, display: "inline-block" }} />
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginLeft: 6 }}>
            🔬 Testcase Validator — Judge0 CE
          </span>
          {validationResults && (
            <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
              {[
                { label: "Passed",  count: validationResults.reduce((s,r)=>s+r.passCount+r.samplePassCount,0), color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                { label: "Failed",  count: validationResults.reduce((s,r)=>s+r.failCount+r.sampleFailCount,0), color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
                { label: "Skipped", count: validationResults.reduce((s,r)=>s+r.skipCount,0),                   color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
              ].map(s => s.count > 0 && (
                <span key={s.label} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: s.bg, border: `1px solid ${s.color}40`,
                  borderRadius: 20, padding: "2px 10px",
                  fontSize: 11, fontWeight: 800, color: s.color,
                }}>
                  {s.count} {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={runValidation}
          disabled={isValidating}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: isValidating ? "#334155" : "linear-gradient(135deg, #10b981, #059669)",
            color: isValidating ? "#64748b" : "white",
            border: "none", borderRadius: 8,
            padding: "8px 18px", fontSize: 12, fontWeight: 800,
            cursor: isValidating ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            boxShadow: isValidating ? "none" : "0 4px 12px rgba(16,185,129,0.4)",
          }}
        >
          {isValidating ? (
            <>
              <span style={{ width: 12, height: 12, border: "2px solid #475569", borderTopColor: "#94a3b8", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              Running…
            </>
          ) : (
            <>▶ {validationResults ? "Re-Run" : "Run All Tests"}</>
          )}
        </button>
      </div>

      {/* Progress bar */}
      {isValidating && (
        <div style={{ padding: "10px 18px", background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>$ running: {progress.label}</span>
            <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{progress.current}/{progress.total}</span>
          </div>
          <div style={{ height: 4, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
              background: "linear-gradient(90deg, #10b981, #06b6d4)",
              borderRadius: 99, transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}

      {/* Idle state */}
      {!validationResults && !isValidating && (
        <div style={{ padding: "24px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>
            $ click "Run All Tests" to validate testcases + sample I/O via Judge0
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
            Supports C, C++, Java, Python, JavaScript, Go, Kotlin, Swift, Scala, R, Ruby, TypeScript
          </div>
        </div>
      )}

      {/* Per-question results */}
      {validationResults && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {validationResults.map((qr, qi) => {
            const isExpanded  = expandedQ === qi;
            const totalPass   = qr.passCount + qr.samplePassCount;
            const totalFail   = qr.failCount + qr.sampleFailCount;
            const statusColor = totalFail > 0 ? "#ef4444" : qr.skipCount > 0 ? "#f59e0b" : "#10b981";

            return (
              <div key={qi} style={{ borderBottom: qi < validationResults.length - 1 ? "1px solid #1e293b" : "none" }}>
                <div
                  onClick={() => setExpandedQ(isExpanded ? null : qi)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 18px", cursor: "pointer",
                    background: isExpanded ? "#1e293b" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "#1a2744"; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: statusColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "white", fontWeight: 900, flexShrink: 0,
                  }}>
                    {totalFail > 0 ? "✗" : qr.skipCount > 0 ? "~" : "✓"}
                  </span>

                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                      Q{qi + 1} — {qr.title}
                    </span>
                    <span style={{ fontSize: 11, color: "#475569", marginLeft: 10, fontFamily: "monospace" }}>
                      [{qr.lang}]
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {qr.testcases.map((tc, ti) => (
                      <span key={ti} style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: tc.status === "pass" ? "#10b981" : tc.status === "skip" ? "#f59e0b" : tc.status === "error" ? "#8b5cf6" : "#ef4444",
                        color: "white", fontSize: 9, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}>
                        {tc.index}
                      </span>
                    ))}
                    {qr.sampleIO.length > 0 && (
                      <span style={{ width: 1, height: 16, background: "#334155", margin: "0 2px" }} />
                    )}
                    {qr.sampleIO.map((s, si) => (
                      <span key={`s${si}`} style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: s.status === "pass" ? "#6366f1" : s.status === "skip" ? "#f59e0b" : "#ef4444",
                        color: "white", fontSize: 8, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid rgba(255,255,255,0.2)",
                      }}>
                        S{s.index}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
                    {totalPass > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>✓ {totalPass}</span>}
                    {totalFail > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>✗ {totalFail}</span>}
                    {qr.skipCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>⏭ {qr.skipCount}</span>}
                  </div>

                  <span style={{ fontSize: 14, color: "#475569", marginLeft: 4 }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {isExpanded && (
                  <div style={{ background: "#0a0f1e", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {qr.testcases.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2, fontFamily: "monospace" }}>
                          ── Testcases ({qr.testcases.length}) ──────────────────
                        </div>
                        {qr.testcases.map((tc, ti) => (
                          <TCPanel key={ti} tc={tc} index={tc.index} isSample={false} />
                        ))}
                      </>
                    )}
                    {qr.sampleIO.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6, marginBottom: 2, fontFamily: "monospace" }}>
                          ── Sample I/O ({qr.sampleIO.length}) ──────────────────
                        </div>
                        {qr.sampleIO.map((s, si) => (
                          <TCPanel key={`s${si}`} tc={s} index={s.index} isSample={true} />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Force override */}
      {validationResults && !allPassed && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px",
          background: "#1a0404",
          borderTop: "1px solid #3f1010",
        }}>
          <input
            type="checkbox"
            id="force-override"
            checked={forceOverride}
            onChange={e => { setForceOverride(e.target.checked); onValidated(e.target.checked); }}
            style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#ef4444" }}
          />
          <label htmlFor="force-override" style={{ fontSize: 12, fontWeight: 600, color: "#fca5a5", cursor: "pointer", fontFamily: "monospace" }}>
            ⚠ force upload anyway — I acknowledge some testcases may be incorrect
          </label>
        </div>
      )}
    </div>
  );
}

// ─── FORMAT TEMPLATES ─────────────────────────────────────────────────────────
const FORMAT_TEMPLATES = [
  {
    id: "header-footer", icon: "📎", label: "Code Snippet", sub: "Header + Footer",
    color: "#6366f1", colorDim: "rgba(99,102,241,0.08)", colorBorder: "rgba(99,102,241,0.2)",
    filename: "format_code_snippet_header_footer.txt", content: headerFooterTxt,
  },
  {
    id: "code-stub", icon: "✏️", label: "Code Stub", sub: "Buggy starter code",
    color: "#10b981", colorDim: "rgba(16,185,129,0.08)", colorBorder: "rgba(16,185,129,0.2)",
    filename: "format_code_stub.txt", content: codeStubTxt,
  },
  {
    id: "multi-language", icon: "🌐", label: "Multi Language", sub: "C,Java,C++,Python,...",
    color: "#f59e0b", colorDim: "rgba(245,158,11,0.08)", colorBorder: "rgba(245,158,11,0.2)",
    filename: "format_multi_language.txt", content: multiLanguageTxt,
  },
  {
    id: "snippet-stub", icon: "🔧", label: "Snippet + Stub", sub: "Header · Footer · Buggy body",
    color: "#8b5cf6", colorDim: "rgba(139,92,246,0.08)", colorBorder: "rgba(139,92,246,0.2)",
    filename: "format_snippet_with_stub.txt", content: snippetWithStubTxt,
  },
  {
    id: "snippet-stub-wl-bl", icon: "🛡️", label: "Snippet + Stub + WL/BL",
    sub: "Header · Footer · Stub · Whitelist · Blacklist",
    color: "#ef4444", colorDim: "rgba(239,68,68,0.08)", colorBorder: "rgba(239,68,68,0.2)",
    filename: "format_snippet_stub_whitelist_blacklist.txt", content: snippetStubWlBlTxt,
  },
];

// ─── FORMAT SELECTOR ─────────────────────────────────────────────────────────
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
    <div style={{ background:"#f8f9fc", border:"1.5px solid #e4e7f0", borderRadius:16, padding:"18px 20px", marginBottom:18 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:28, height:28, background:"linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>📋</div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:"#111827", letterSpacing:"-0.02em" }}>Sample Format Templates</div>
          <div style={{ fontSize:11, color:"#9ca3af", fontWeight:500, marginTop:1 }}>Select a format to download its template .txt file</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px, 1fr))", gap:10 }}>
        {FORMAT_TEMPLATES.map(fmt => {
          const isDl = downloading === fmt.id;
          return (
            <button key={fmt.id} onClick={() => handleDownload(fmt)} style={{
              background: isDl ? fmt.colorDim : "#ffffff",
              border: `1.5px solid ${isDl ? fmt.color : "#e4e7f0"}`,
              borderRadius:12, padding:"13px 14px", cursor:"pointer", textAlign:"left",
              transition:"all 0.2s ease", display:"flex", flexDirection:"column", gap:6,
              position:"relative", overflow:"hidden",
              boxShadow: isDl ? `0 4px 14px ${fmt.colorBorder}` : "0 1px 3px rgba(0,0,0,0.06)",
            }}
              onMouseEnter={e => { if (!isDl) { e.currentTarget.style.border=`1.5px solid ${fmt.color}`; e.currentTarget.style.background=fmt.colorDim; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 6px 18px ${fmt.colorBorder}`; } }}
              onMouseLeave={e => { if (!isDl) { e.currentTarget.style.border="1.5px solid #e4e7f0"; e.currentTarget.style.background="#ffffff"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.06)"; } }}
            >
              <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:fmt.color, borderRadius:"12px 0 0 12px" }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", paddingLeft:6 }}>
                <span style={{ fontSize:20 }}>{fmt.icon}</span>
                <span style={{ fontSize:10, fontWeight:800, color:isDl?fmt.color:"#9ca3af", background:isDl?fmt.colorDim:"#f3f4f6", border:`1px solid ${isDl?fmt.colorBorder:"transparent"}`, padding:"2px 7px", borderRadius:20, transition:"all 0.2s", fontFamily:"monospace" }}>
                  {isDl ? "✓ saved" : "↓ .txt"}
                </span>
              </div>
              <div style={{ paddingLeft:6 }}>
                <div style={{ fontSize:12.5, fontWeight:800, color:"#111827", letterSpacing:"-0.02em", lineHeight:1.3 }}>{fmt.label}</div>
                <div style={{ fontSize:10.5, fontWeight:600, color:fmt.color, marginTop:2, lineHeight:1.3 }}>{fmt.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.15)", borderRadius:8, fontSize:11, color:"#6366f1", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
        <span>💡</span><span>Each template includes format rules, field guide and a working example question.</span>
      </div>
    </div>
  );
}

// ─── PARSE ERRORS PANEL ───────────────────────────────────────────────────────
// Shown inline below the parse button — persistent, dismissible, categorised.
function ParseErrorsPanel({ errors, warnings, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reset dismissed state whenever new errors come in
    setDismissed(false);
  }, [errors, warnings]);

  if (dismissed) return null;
  if (!errors.length && !warnings.length) return null;

  return (
    <div style={{
      marginTop: 12,
      border: errors.length > 0 ? "1.5px solid #fca5a5" : "1.5px solid #fde68a",
      borderRadius: 12,
      overflow: "hidden",
      background: errors.length > 0 ? "#fff8f8" : "#fffbeb",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: errors.length > 0 ? "#fef2f2" : "#fefce8",
        borderBottom: errors.length > 0 ? "1px solid #fecaca" : "1px solid #fde68a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{errors.length > 0 ? "❌" : "⚠️"}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: errors.length > 0 ? "#991b1b" : "#92400e" }}>
            {errors.length > 0
              ? `${errors.length} parse error${errors.length > 1 ? "s" : ""} found`
              : `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`}
          </span>
          {errors.length > 0 && warnings.length > 0 && (
            <span style={{ fontSize: 11, color: "#b45309", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 20, padding: "1px 8px", fontWeight: 700 }}>
              + {warnings.length} warning{warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => { setDismissed(true); onDismiss?.(); }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af", lineHeight: 1, padding: "0 2px" }}
          title="Dismiss"
        >×</button>
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {errors.map((err, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "8px 10px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              fontSize: 12,
            }}>
              <span style={{ color: "#dc2626", fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✗</span>
              <span style={{ color: "#7f1d1d", fontFamily: "monospace", lineHeight: 1.5 }}>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warning list */}
      {warnings.length > 0 && (
        <div style={{ padding: errors.length > 0 ? "0 14px 10px" : "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {warnings.map((w, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "8px 10px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              fontSize: 12,
            }}>
              <span style={{ color: "#d97706", fontWeight: 800, flexShrink: 0, marginTop: 1 }}>⚠</span>
              <span style={{ color: "#78350f", fontFamily: "monospace", lineHeight: 1.5 }}>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pipe tip — always shown if any pipe warnings exist */}
      {warnings.some(w => w.includes("pipe") || w.includes("|")) && (
        <div style={{
          margin: "0 14px 12px",
          padding: "8px 12px",
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 8,
          fontSize: 11,
          color: "#4338ca",
          fontWeight: 600,
          lineHeight: 1.6,
        }}>
          💡 <strong>Tip:</strong> If your expected output contains <code>|</code> characters, always use{" "}
          <code style={{ background: "#e0e7ff", padding: "1px 5px", borderRadius: 4 }}> | </code>{" "}
          (space · pipe · space) as the field delimiter — bare <code>|</code> inside output is now safe as long as delimiters have spaces.
        </div>
      )}
    </div>
  );
}

// ─── PARSER ───────────────────────────────────────────────────────────────────
function parseQuestions(raw) {
  const errors   = [];
  const warnings = [];
  const questions = [];

  const blocks = raw
    .split(/---QUESTION---/i)
    .map(b => b.split(/---END---/i)[0])
    .filter(b => b.trim().length > 0);

  if (blocks.length === 0) {
    errors.push("No ---QUESTION--- blocks found. Check the format.");
    return { questions, errors, warnings };
  }

  const HEADER_RE = /^(TITLE|DIFFICULTY|LANGUAGE|TAGS|DESCRIPTION|INPUT_FORMAT|OUTPUT_FORMAT|CONSTRAINTS|CODE_STUB\[[^\]]+\]|SOLUTION\[[^\]]+\]|HEADER\[[^\]]+\]|FOOTER\[[^\]]+\]|WHITELIST\[[^\]]+\]|BLACKLIST\[[^\]]+\]|TESTCASE|SAMPLE_IO)\s*:/i;

  blocks.forEach((block, bi) => {
    const qNum    = bi + 1;
    const qErrors = [];
    const qWarns  = [];
    const lines   = block.split("\n");
    const segments = {};
    let currentKey   = null;
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

    const get        = k => segments[k.toUpperCase()] || null;
    const getLangMap = prefix => {
      const result = {};
      Object.keys(segments).forEach(k => {
        const m = k.match(new RegExp(`^${prefix}\\[(.+)\\]$`, "i"));
        if (m) result[m[1]] = segments[k];
      });
      return result;
    };
    const unescape = s => s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

    // ── getTestcases: uses splitTCLine for safe pipe handling ──
    const getTestcases = () => {
      const allLines = [];
      lines.forEach(line => {
        if (/^TESTCASE\s*:/i.test(line))
          allLines.push(line.replace(/^TESTCASE\s*:\s*/i, "").trim());
      });

      return allLines.filter(l => l.length > 0).map((val, idx) => {
        // Detect pipe issues and warn
        const { spacedPipes, barePipes } = detectPipeWarning(val);
        if (barePipes > 0) {
          qWarns.push(
            `Q${qNum} TC${idx + 1}: Found ${barePipes} bare "|" (no surrounding spaces) in testcase line. ` +
            `If this is inside your expected output, it is preserved correctly. ` +
            `Ensure field delimiters use " | " (space-pipe-space).`
          );
        }
        if (spacedPipes < 2) {
          qWarns.push(
            `Q${qNum} TC${idx + 1}: Expected at least 2 " | " delimiters (input | output | difficulty | score). ` +
            `Found only ${spacedPipes}. Check this testcase line for formatting issues.`
          );
        }

        // Safe split: only splits on " | ", stops at 4 parts
        // This means | inside the output field is never mis-split
        const parts  = splitTCLine(val, 4);
        const rawOut = unescape(parts[1] || "");
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

    // ── getSampleIO: uses splitTCLine for safe pipe handling ──
    const getSampleIO = () => {
      const allLines = [];
      lines.forEach(line => {
        if (/^SAMPLE_IO\s*:/i.test(line))
          allLines.push(line.replace(/^SAMPLE_IO\s*:\s*/i, "").trim());
      });

      return allLines.filter(l => l.length > 0).map((val, idx) => {
        const { barePipes } = detectPipeWarning(val);
        if (barePipes > 0) {
          qWarns.push(
            `Q${qNum} Sample ${idx + 1}: Found ${barePipes} bare "|" in SAMPLE_IO line. ` +
            `If inside expected output, it is preserved. Use " | " as delimiter.`
          );
        }

        // Safe split: only 2 parts for SAMPLE_IO (input | output)
        const parts  = splitTCLine(val, 2);
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

    // Validation errors
    if (!title)       qErrors.push(`Q${qNum}: Missing TITLE`);
    if (!difficulty || !["Easy","Medium","Hard"].includes(difficulty))
      qErrors.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard (got "${difficulty || "missing"}")`);
    if (!langRaw)     qErrors.push(`Q${qNum}: Missing LANGUAGE`);
    if (!description) qErrors.push(`Q${qNum}: Missing DESCRIPTION`);
    if (!inputFmt)    qErrors.push(`Q${qNum}: Missing INPUT_FORMAT`);
    if (!outputFmt)   qErrors.push(`Q${qNum}: Missing OUTPUT_FORMAT`);
    if (testcases.length === 0)
      qErrors.push(`Q${qNum}: No TESTCASE lines found`);
    if (Object.keys(solutions).length === 0)
      qErrors.push(`Q${qNum}: No SOLUTION[Language] block found`);

    // Accumulate
    if (qErrors.length > 0) errors.push(...qErrors);
    if (qWarns.length > 0)  warnings.push(...qWarns);

    // Only push question if no hard errors
    if (qErrors.length === 0) {
      questions.push({
        title,
        difficulty,
        languages: langRaw.split(",").map(l => l.trim()).filter(Boolean),
        tags: tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [""],
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

  return { questions, errors, warnings };
}

// ─── PAYLOAD BUILDER ──────────────────────────────────────────────────────────
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
      language: lang,
      codeStub: q.codeStubs[lang] || "",
      hasSnippet: anySnippet,
      ...(header ? { header } : {}),
      ...(footer ? { footer } : {}),
      ...(parseList(q.whitelists?.[lang]).length ? { whitelist: parseList(q.whitelists?.[lang]) } : {}),
      ...(parseList(q.blacklists?.[lang]).length ? { blacklist: parseList(q.blacklists?.[lang]) } : {}),
      solutiondata: q.solutions[lang]
        ? [{ solution: q.solutions[lang], solutionbest: true, isSolutionExp: false, solutionExp: null, solutionDebug: null }]
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

  // Auth
  const [token, setToken]           = useState(() => { try { return localStorage.getItem(platform.tokenKey) || ""; } catch { return ""; } });
  const [ui, setUI]                 = useState(() => localStorage.getItem(platform.tokenKey) ? "batch-config" : "welcome");
  const [tokenInput, setTokenInput] = useState("");

  // Batch Config
  const [batchConfig, setBatchConfig]         = useState({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"", manual_difficulty:"Medium" });
  const [bcLoading, setBcLoading]             = useState(false);
  const [allSubjects, setAllSubjects]         = useState([]);
  const [allTopics, setAllTopics]             = useState([]);
  const [allSubTopics, setAllSubTopics]       = useState([]);
  const [subTopicSearch, setSubTopicSearch]   = useState("");
  const [subTopicFocused, setSubTopicFocused] = useState(false);
  const [selSubject, setSelSubject]           = useState(null);
  const [selTopic, setSelTopic]               = useState(null);
  const [selSubTopic, setSelSubTopic]         = useState(null);
  const [pcmValues, setPcmValues]             = useState([]);
  const [pcmCombos, setPcmCombos]             = useState([]);
  const [pcmLevels, setPcmLevels]             = useState([]);
  const [pcmSubjectSel, setPcmSubjectSel]     = useState(null);
  const [pcmTopicSel, setPcmTopicSel]         = useState(null);
  const [pcmLevelSel, setPcmLevelSel]         = useState(null);
  const [pcmSubjectSearch, setPcmSubjectSearch] = useState("");
  const [pcmTopicSearch, setPcmTopicSearch]     = useState("");

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

  // Upload (single-file)
  const [pasteInput, setPasteInput]           = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parseErrors, setParseErrors]         = useState([]);
  const [parseWarnings, setParseWarnings]     = useState([]);
  const [previewIndex, setPreviewIndex]       = useState(0);
  const [showPreview, setShowPreview]         = useState(false);
  const [isLoading, setIsLoading]             = useState(false);
  const [uploadProgress, setUploadProgress]   = useState({ current:0, total:0 });
  const [uploadResults, setUploadResults]     = useState(null);

  // Validation state
  const [validationPassed, setValidationPassed] = useState(false);
  // "skip" = user chose to skip validator; "run" = show validator; null = not chosen yet
  const [validationMode, setValidationMode]     = useState(null);
  const [skipConfirmed, setSkipConfirmed]       = useState(false);

  // Question type mode
  const [questionTypeMode, setQuestionTypeMode] = useState("single");

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
        setAllSubTopics((subData.data.sub_topic || []).map(st => ({ ...st, name: st.name || st.sub_topic_name || st.subtopic_name || st.label || "(unnamed)" })));
      }
      if (pcmValData?.success) { setPcmValues(pcmValData.data || []); setPcmLevels(pcmValData.level || []); }
      if (pcmComboData?.success) setPcmCombos(pcmComboData.data || []);
    } catch (err) { showAlert("Failed to load config data: " + err.message, "danger"); }
    finally { setBcLoading(false); }
  };

  const saveToken = () => {
    if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
    const tok = tokenInput.trim();
    try {
      localStorage.setItem(platform.tokenKey, tok);
      setToken(tok); setTokenInput(""); setUI("batch-config");
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
    setBatchConfig({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"", manual_difficulty:"Medium" });
    setSelSubject(null); setSelTopic(null); setSelSubTopic(null);
    setPcmSubjectSel(null); setPcmTopicSel(null); setPcmLevelSel(null);
    setSubTopicSearch(""); setPcmSubjectSearch(""); setPcmTopicSearch("");
    resetQBStep(); resetUpload();
  };

  const resetQBStep = () => {
    setQbMode("create"); setQbName(""); setQbCode(""); setQbDescription("");
    setSelectedDepts([]); setDeptSearch(""); setQbSearchTerm(""); setQbSearchResults([]); setActiveQB(null);
  };

  const resetUpload = () => {
    setPasteInput(""); setParsedQuestions([]); setParseErrors([]); setParseWarnings([]);
    setUploadResults(null); setUploadProgress({ current:0, total:0 });
    setShowPreview(false); setPreviewIndex(0);
    setValidationPassed(false); setValidationMode(null); setSkipConfirmed(false);
  };

  const createQB = async () => {
    if (!qbName.trim())         { showAlert("QB Name is required", "danger"); return; }
    if (selectedDepts.length === 0) { showAlert("Select at least one department", "danger"); return; }
    showOverlay("🔨 Creating Question Bank...");
    try {
      const res = await fetch(`${API}/api/questionbank/create`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({ qb_name:qbName, qb_code:qbCode||null, qb_description:qbDescription||null, tags:[], b_d_id:selectedDepts, departmentChanged:true, visibility:"Within Department", price:0, mainDepartmentUser:true }),
      });
      const result = await res.json();
      if (result.statusCode === 200 && result.data.success) {
        const qbData = result.data.data.data;
        setActiveQB({ qb_id:qbData.qb_id, qb_name:qbData.qb_name, createdBy:qbData.createdBy });
        hideOverlay(); showAlert("✅ Question Bank created!", "success"); setUI("upload");
      } else throw new Error(result.data?.message || "Failed to create QB");
    } catch (err) { hideOverlay(); showAlert("Error creating QB: " + err.message, "danger"); }
  };

  const searchQBs = async () => {
    if (!qbSearchTerm.trim()) { showAlert("Enter a search term", "warning"); return; }
    showOverlay("🔍 Searching...");
    try {
      const res  = await fetch(`${API}/api/questionbanks/all`, { method:"POST", headers:getHeaders(), body:JSON.stringify({ department_id:platform.departmentIds, limit:50, mainDepartmentUser:true, page:1, search:qbSearchTerm }) });
      const data = await res.json();
      const qbs  = data?.questionbanks || [];
      setQbSearchResults(qbs); hideOverlay();
      if (qbs.length === 0) showAlert("No QBs found", "warning");
      else showAlert(`Found ${qbs.length} QB(s)`, "success");
    } catch (err) { hideOverlay(); showAlert("Search error: " + err.message, "danger"); }
  };

  const selectQB = qb => {
    setActiveQB({ qb_id:qb.qb_id, qb_name:qb.qb_name, createdBy:qb.user_id||"system" });
    setQbSearchResults([]);
    showAlert(`QB selected: ${qb.qb_name}`, "success");
    setUI("upload");
  };

  // ── Parse handler — shows errors inline via ParseErrorsPanel ──
  const handleParse = () => {
    if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
    const { questions, errors, warnings } = parseQuestions(pasteInput);

    setParseErrors(errors);
    setParseWarnings(warnings);
    setValidationPassed(false);

    if (errors.length > 0) {
      // Still set questions if some blocks were valid
      setParsedQuestions(questions);
      // No showAlert — errors shown inline in ParseErrorsPanel
      return;
    }

    setParsedQuestions(questions);

    // Show a success toast + inline warnings if any
    if (warnings.length > 0) {
      showAlert(`✅ Parsed ${questions.length} question(s) with ${warnings.length} warning(s) — check below.`, "warning");
    } else {
      showAlert(`✅ Parsed ${questions.length} question(s)! Now validate testcases before uploading.`, "success");
    }
  };

  const uploadQuestions = async () => {
    if (parsedQuestions.length === 0) { showAlert("Parse first", "warning"); return; }
    if (!activeQB)                    { showAlert("No QB selected", "danger"); return; }
    const canUpload = validationMode === "run" ? validationPassed : validationMode === "skip" ? skipConfirmed : false;
    if (!canUpload) { showAlert("⚠️ Complete the validation step first", "warning"); return; }

    setIsLoading(true); showOverlay("🔄 Starting upload...");
    const results = { total:parsedQuestions.length, success:0, failed:0, errors:[], ids:[] };

    try {
      const userId = activeQB.createdBy || "system";
      for (let i = 0; i < parsedQuestions.length; i += BATCH_SIZE) {
        const batch  = parsedQuestions.slice(i, i + BATCH_SIZE);
        const bNum   = Math.floor(i / BATCH_SIZE) + 1;
        const bTotal = Math.ceil(parsedQuestions.length / BATCH_SIZE);
        showOverlay(`📦 Batch ${bNum}/${bTotal}...`);
        setUploadProgress({ current:i, total:parsedQuestions.length });

        await Promise.all(batch.map(async (q, idx) => {
          const gi = i + idx;
          try {
            const payload = buildPayload(q, batchConfig, activeQB.qb_id, userId);
            const res     = await fetch(`${API}/api/programming_question/create`, { method:"POST", headers:getHeaders(), body:JSON.stringify(payload) });
            const data    = await res.json();
            if (data.success) { results.success++; results.ids.push({ index:gi+1, title:q.title, q_id:data.q_id }); }
            else throw new Error(data.message || "Upload failed");
          } catch (err) { results.failed++; results.errors.push({ index:gi+1, title:q.title, error:err.message }); }
        }));

        if (i + BATCH_SIZE < parsedQuestions.length) await sleep(400);
      }

      setUploadProgress({ current:parsedQuestions.length, total:parsedQuestions.length });
      setUploadResults(results); hideOverlay();
      if (results.failed === 0) showAlert(`🎉 All ${results.success} uploaded!`, "success");
      else showAlert(`⚠️ ${results.success} uploaded, ${results.failed} failed`, "warning");
      setUI("results");
    } catch (err) { hideOverlay(); showAlert("Upload error: " + err.message, "danger"); }
    finally { setIsLoading(false); }
  };

  const startNewUpload     = () => { resetUpload(); setUI("upload"); };
  const currentQ           = parsedQuestions[previewIndex];
  const handleMultifileResults = results => { setUploadResults(results); setUI("results"); };

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
          <pre style={{ margin:0, fontFamily:"inherit", whiteSpace:"pre-wrap" }}>{alert.msg}</pre>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && currentQ && questionTypeMode === "single" && (
        <div className="cod-preview-modal" onClick={() => setShowPreview(false)}>
          <div className="cod-preview-modal-content" onClick={e => e.stopPropagation()}>
            <div className="cod-preview-modal-header">
              <h3>Preview — Q{previewIndex+1} of {parsedQuestions.length}</h3>
              <button className="cod-preview-close" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="cod-preview-modal-body">
              <div className="cod-preview-meta">
                <span className="cod-preview-difficulty">{currentQ.difficulty}</span>
                {currentQ.languages.map(l => <span key={l} className="cod-preview-lang">💻 {l}</span>)}
                {currentQ.tags.filter(t => t).map(t => <span key={t} className="cod-preview-tag">🏷️ {t}</span>)}
              </div>
              <div className="cod-preview-section"><h4>Title</h4><p className="cod-preview-title-text">{currentQ.title}</p></div>
              <div className="cod-preview-section"><h4>Description</h4><div className="cod-preview-html" dangerouslySetInnerHTML={{ __html: currentQ.description }} /></div>
              <div className="cod-preview-2col">
                <div className="cod-preview-section"><h4>Input Format</h4><p>{currentQ.inputFmt}</p></div>
                <div className="cod-preview-section"><h4>Output Format</h4><p>{currentQ.outputFmt}</p></div>
              </div>
              {currentQ.constraints && <div className="cod-preview-section"><h4>Constraints</h4><p>{currentQ.constraints}</p></div>}
              {currentQ.languages.map(lang => (
                <div key={lang} className="cod-preview-lang-block">
                  <div className="cod-preview-lang-header">
                    <span className="cod-lang-pill">{lang}</span>
                    {(currentQ.headers?.[lang] || currentQ.footers?.[lang]) && <span className="cod-snippet-badge">📎 Header/Footer</span>}
                    {currentQ.whitelists?.[lang] && <span className="cod-wl-badge">✅ WL: {currentQ.whitelists[lang]}</span>}
                    {currentQ.blacklists?.[lang] && <span className="cod-bl-badge">🚫 BL: {currentQ.blacklists[lang]}</span>}
                  </div>
                  {currentQ.headers?.[lang]  && <div className="cod-preview-section"><h4>Header</h4><pre className="cod-preview-code"><code>{currentQ.headers[lang]}</code></pre></div>}
                  {currentQ.codeStubs[lang]  && <div className="cod-preview-section"><h4>Code Stub</h4><pre className="cod-preview-code"><code>{currentQ.codeStubs[lang]}</code></pre></div>}
                  {currentQ.footers?.[lang]  && <div className="cod-preview-section"><h4>Footer</h4><pre className="cod-preview-code"><code>{currentQ.footers[lang]}</code></pre></div>}
                  {currentQ.solutions[lang]  && <div className="cod-preview-section"><h4>Solution</h4><pre className="cod-preview-code"><code>{currentQ.solutions[lang]}</code></pre></div>}
                </div>
              ))}
              <div className="cod-preview-section">
                <h4>Test Cases ({currentQ.testcases.length}) + Sample I/O ({currentQ.sampleIO.length})</h4>
                <div className="cod-tc-grid">
                  {currentQ.testcases.slice(0,5).map((tc,i) => (
                    <div key={i} className="cod-tc-row">
                      <span className="cod-tc-badge">TC{i+1} · {tc.difficulty} · {tc.score}pts</span>
                      <span className="cod-tc-io">In: <code>{tc.input}</code></span>
                      <span className="cod-tc-io">Out: <code>{tc.output.trim()}</code></span>
                    </div>
                  ))}
                  {currentQ.testcases.length > 5 && <div className="cod-tc-more">+{currentQ.testcases.length-5} more</div>}
                  {currentQ.sampleIO.map((s,i) => (
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
              <button onClick={() => setPreviewIndex(p => Math.max(0,p-1))} disabled={previewIndex===0} className="cod-button cod-button-secondary cod-button-small">← Prev</button>
              <span className="cod-preview-counter">{previewIndex+1} / {parsedQuestions.length}</span>
              <button onClick={() => setPreviewIndex(p => Math.min(parsedQuestions.length-1,p+1))} disabled={previewIndex===parsedQuestions.length-1} className="cod-button cod-button-secondary cod-button-small">Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ WELCOME ══ */}
      {ui === "welcome" && (
        <div className="cod-welcome">
          <div style={{ marginBottom:16 }}><PlatformBadge /></div>
          <div className="cod-welcome-icon">⚡</div>
          <h2 className="cod-welcome-title">COD Sync</h2>
          <p className="cod-welcome-subtitle">Bulk upload AI-generated coding questions to question banks</p>
          <textarea value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Paste your Authorization token here..." className="cod-token-input" />
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <button onClick={saveToken} className="cod-button cod-button-primary">Save Token & Continue</button>
            <button onClick={onBack}    className="cod-button cod-button-secondary">← Back</button>
          </div>
          <p className="cod-token-hint">💡 Token saved separately per platform</p>
        </div>
      )}

      {/* ══ BATCH CONFIG ══ */}
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
          {bcLoading && <div className="cod-bc-autoload"><div className="cod-bc-autoload-spinner"></div><span>Loading subjects & PCM data...</span></div>}
          {allSubjects.length > 0 && (
            <>
              <div className="cod-bc-data-info">
                <span>📋 {allSubjects.length} subjects</span><span>·</span>
                <span>🗂 {allTopics.length} topics</span><span>·</span>
                <span>📌 {allSubTopics.length} sub topics</span><span>·</span>
                <span>🔗 {pcmCombos.length} PCM combos</span>
                <button onClick={() => { setBatchConfig({ topic_id:"", sub_topic_id:"", subject_id:"", pcm_combination_id:"", manual_difficulty:"Medium" }); setSelSubject(null); setSelTopic(null); setSelSubTopic(null); setPcmSubjectSel(null); setPcmTopicSel(null); setPcmLevelSel(null); setSubTopicSearch(""); setPcmSubjectSearch(""); setPcmTopicSearch(""); }} className="cod-button cod-button-secondary cod-button-small">↺ Reset</button>
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
                        if (filtered.length === 0) return <div className="cod-bc-empty" style={{border:"none"}}>No results for "{subTopicSearch}"</div>;
                        return filtered.map(({ st, stId, topic, subject }) => (
                          <div key={stId} className={`cod-bc-item cod-bc-subtopic-item ${selSubTopic?.sub_topic_id === stId ? "selected" : ""}`}
                            onMouseDown={e => {
                              e.preventDefault();
                              setSelSubTopic({ ...st, sub_topic_id: stId });
                              setSelTopic(topic || null);
                              setSelSubject(subject || null);
                              setSubTopicSearch(st.name);
                              setSubTopicFocused(false);
                              setBatchConfig(p => ({ ...p, sub_topic_id:stId, topic_id:topic?.topic_id||p.topic_id, subject_id:subject?.subject_id||p.subject_id }));
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
                        { label:"Sub Topic", val:selSubTopic.name,   id:selSubTopic.sub_topic_id },
                        { label:"Topic",     val:selTopic?.name,     id:selTopic?.topic_id },
                        { label:"Subject",   val:selSubject?.name,   id:selSubject?.subject_id },
                      ].map(row => (
                        <div key={row.label} className="cod-bc-resolved-row">
                          <span className="cod-bc-resolved-label">{row.label}</span>
                          <span className="cod-bc-resolved-val">{row.val || <em style={{color:"#f59e0b"}}>not found</em>}</span>
                          <code className="cod-bc-resolved-id">{(row.id||"").slice(0,8)}{row.id?"…":""}</code>
                        </div>
                      ))}
                      <button onClick={() => { setSelSubTopic(null); setSelTopic(null); setSelSubject(null); setSubTopicSearch(""); setBatchConfig(p => ({ ...p, sub_topic_id:"", topic_id:"", subject_id:"" })); }} className="cod-bc-clear-sel">✕ Clear</button>
                    </div>
                  )}
                </div>

                <div className="cod-bc-panel cod-bc-panel-pcm">
                  <div className="cod-bc-panel-title">
                    4. PCM Combination <span className="cod-required">*</span>
                    {batchConfig.pcm_combination_id && (
                      <span className="cod-bc-selected-name cod-bc-selected-pcm">{(() => {
                        const combo = pcmCombos.find(c => c.id === batchConfig.pcm_combination_id);
                        if (!combo) return batchConfig.pcm_combination_id.slice(0,8) + "…";
                        const subj  = pcmValues.find(s => s.pcm_subject_id === combo.pcm_subject_id);
                        const topic = subj?.pcm_topic?.find(t => t.value === combo.pcm_topic_id);
                        const level = pcmLevels.find(l => l.value === combo.pcm_level_id);
                        return `${subj?.name||"?"} › ${topic?.label||"?"} › ${level?.label||"?"}`;
                      })()}</span>
                    )}
                  </div>
                  <div className="cod-pcm-selectors">
                    <div className="cod-pcm-col">
                      <label className="cod-label">PCM Subject</label>
                      <input type="text" value={pcmSubjectSearch} onChange={e => { setPcmSubjectSearch(e.target.value); setPcmTopicSel(null); setPcmLevelSel(null); }} placeholder="🔍 Search..." className="cod-input" />
                      <div className="cod-bc-list">
                        {pcmValues.filter(s => s.name.toLowerCase().includes(pcmSubjectSearch.toLowerCase())).map(s => (
                          <div key={s.pcm_subject_id} className={`cod-bc-item ${pcmSubjectSel?.pcm_subject_id===s.pcm_subject_id?"selected":""}`} onClick={() => { setPcmSubjectSel(s); setPcmTopicSel(null); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id:"" })); }}>{s.name}</div>
                        ))}
                      </div>
                    </div>
                    <div className="cod-pcm-col">
                      <label className="cod-label">PCM Topic</label>
                      {!pcmSubjectSel ? <div className="cod-bc-empty">Select PCM subject first</div> : (
                        <>
                          <input type="text" value={pcmTopicSearch} onChange={e => setPcmTopicSearch(e.target.value)} placeholder="🔍 Search..." className="cod-input" />
                          <div className="cod-bc-list">
                            {(pcmSubjectSel.pcm_topic||[]).filter(t => t.label.toLowerCase().includes(pcmTopicSearch.toLowerCase())).map(t => (
                              <div key={t.value} className={`cod-bc-item ${pcmTopicSel?.value===t.value?"selected":""}`} onClick={() => { setPcmTopicSel(t); setPcmLevelSel(null); setBatchConfig(p => ({ ...p, pcm_combination_id:"" })); }}>{t.label}</div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="cod-pcm-col">
                      <label className="cod-label">Level</label>
                      {!pcmTopicSel ? <div className="cod-bc-empty">Select PCM topic first</div> : (
                        <div className="cod-bc-list">
                          {pcmLevels.map(l => {
                            const exists = pcmCombos.some(c => c.pcm_subject_id===pcmSubjectSel?.pcm_subject_id && c.pcm_topic_id===pcmTopicSel?.value && c.pcm_level_id===l.value);
                            return (
                              <div key={l.value} className={`cod-bc-item ${!exists?"cod-bc-item-disabled":""} ${pcmLevelSel?.value===l.value?"selected":""}`}
                                onClick={() => {
                                  if (!exists) return;
                                  setPcmLevelSel(l);
                                  const combo = pcmCombos.find(c => c.pcm_subject_id===pcmSubjectSel.pcm_subject_id && c.pcm_topic_id===pcmTopicSel.value && c.pcm_level_id===l.value);
                                  if (combo) { setBatchConfig(p => ({ ...p, pcm_combination_id:combo.id })); showAlert(`✅ PCM: ${pcmSubjectSel.name} › ${pcmTopicSel.label} › ${l.label}`, "success"); }
                                }}>
                                {l.label}{!exists && <span className="cod-bc-no-combo"> (no combo)</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {batchConfig.subject_id && batchConfig.topic_id && batchConfig.sub_topic_id && batchConfig.pcm_combination_id && (
                <div className="cod-bc-summary">
                  {[
                    { label:"Subject",   val:selSubject?.name, id:batchConfig.subject_id },
                    { label:"Topic",     val:selTopic?.name,   id:batchConfig.topic_id },
                    { label:"Sub Topic", val:selSubTopic?.name, id:batchConfig.sub_topic_id },
                    { label:"PCM Combo", val:`${pcmSubjectSel?.name} › ${pcmTopicSel?.label} › ${pcmLevelSel?.label}`, id:batchConfig.pcm_combination_id },
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
                <button key={d} type="button" onClick={() => setBatchConfig(p => ({ ...p, manual_difficulty:d }))} className={`cod-diff-btn cod-diff-btn-${d.toLowerCase()} ${batchConfig.manual_difficulty===d?"active":""}`}>{d}</button>
              ))}
            </div>
            <p className="cod-diff-note">Sets the question-level difficulty sent to the API.</p>
          </div>

          <button
            onClick={() => {
              if (!batchConfig.subject_id || !batchConfig.topic_id || !batchConfig.sub_topic_id) { showAlert("Select Subject, Topic and Sub Topic","danger"); return; }
              if (!batchConfig.pcm_combination_id) { showAlert("Select a PCM Combination","danger"); return; }
              setUI("qb-select");
            }}
            disabled={!batchConfig.subject_id||!batchConfig.topic_id||!batchConfig.sub_topic_id||!batchConfig.pcm_combination_id}
            className={`cod-button cod-button-primary ${(!batchConfig.subject_id||!batchConfig.topic_id||!batchConfig.sub_topic_id||!batchConfig.pcm_combination_id)?"cod-button-disabled":""}`}
          >
            Next → Select Question Bank
          </button>
        </div>
      )}

      {/* ══ QB SELECT ══ */}
      {ui === "qb-select" && (
        <div className="cod-card">
          <div className="cod-header">
            <div><PlatformBadge /><h3 className="cod-title">📚 Question Bank</h3><p className="cod-subtitle">Create a new QB or select an existing one</p></div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("batch-config")} className="cod-button cod-button-secondary cod-button-small">← Back</button>
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">← Platforms</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:24, padding:4, background:"#f1f3f5", borderRadius:12 }}>
            {[{ key:"create", label:"➕ Create New QB" }, { key:"search", label:"🔍 Search Existing QB" }].map(m => (
              <button key={m.key} onClick={() => { setQbMode(m.key); setQbSearchResults([]); }} style={{ flex:1, padding:"12px 20px", background:qbMode===m.key?"white":"transparent", border:"none", borderRadius:10, color:qbMode===m.key?platform.color:"#868e96", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:qbMode===m.key?"0 2px 10px rgba(0,0,0,0.10)":"none", transition:"all 0.2s" }}>{m.label}</button>
            ))}
          </div>

          {qbMode === "create" && (
            <div>
              <div className="cod-form-group"><label className="cod-label">Question Bank Name <span className="cod-required">*</span></label><input type="text" value={qbName} onChange={e => setQbName(e.target.value)} placeholder="Enter QB name..." className="cod-input" /></div>
              <div className="cod-form-group"><label className="cod-label">QB Code <span style={{ fontWeight:500, textTransform:"none", letterSpacing:0, color:"#9ca3af" }}>(optional)</span></label><input type="text" value={qbCode} onChange={e => setQbCode(e.target.value)} placeholder="Enter QB code..." className="cod-input" /></div>
              <div className="cod-form-group"><label className="cod-label">Description <span style={{ fontWeight:500, textTransform:"none", letterSpacing:0, color:"#9ca3af" }}>(optional)</span></label><textarea value={qbDescription} onChange={e => setQbDescription(e.target.value)} placeholder="Enter description..." className="cod-input" rows={2} style={{ resize:"vertical", minHeight:60 }} /></div>
              <div className="cod-form-group">
                <label className="cod-label">Department <span className="cod-required">*</span></label>
                <input type="text" value={deptSearch} onChange={e => setDeptSearch(e.target.value)} placeholder="🔍 Search department..." className="cod-input cod-search-input" />
                <div className="cod-bc-list" style={{ marginTop:8 }}>
                  {filteredDepts.slice(0,10).map((dept,idx) => {
                    const isSel = selectedDepts.some(d => d.value === dept.value);
                    return (
                      <div key={idx} className={`cod-bc-item ${isSel?"selected":""}`} style={{ display:"flex", alignItems:"center", gap:10 }} onClick={() => setSelectedDepts(prev => isSel?prev.filter(d=>d.value!==dept.value):[...prev,dept])}>
                        <input type="checkbox" checked={isSel} onChange={() => {}} style={{ width:15, height:15, flexShrink:0 }} />
                        <span>{dept.label}</span>
                      </div>
                    );
                  })}
                  {filteredDepts.length === 0  && <div className="cod-bc-empty">No departments found</div>}
                  {filteredDepts.length > 10   && <div style={{ padding:"8px 12px", fontSize:12, color:"#9ca3af" }}>+{filteredDepts.length-10} more — keep typing to filter</div>}
                </div>
                {selectedDepts.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
                    {selectedDepts.map(dept => (
                      <div key={dept.value} style={{ display:"inline-flex", alignItems:"center", gap:6, background:`${platform.color}12`, border:`1px solid ${platform.color}30`, borderRadius:20, padding:"4px 10px", fontSize:12, fontWeight:700, color:platform.color }}>
                        <span>{dept.label}</span>
                        <button onClick={() => setSelectedDepts(prev => prev.filter(d => d.value!==dept.value))} style={{ background:"none", border:"none", cursor:"pointer", color:platform.color, fontSize:14, padding:0, lineHeight:1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={createQB} disabled={!qbName.trim()||selectedDepts.length===0} className={`cod-button cod-button-success ${(!qbName.trim()||selectedDepts.length===0)?"cod-button-disabled":""}`}>🔨 Create Question Bank & Continue</button>
            </div>
          )}

          {qbMode === "search" && (
            <div>
              {activeQB && (
                <div className="cod-selected-qb-banner">
                  <span className="cod-selected-qb-icon">✅</span>
                  <div style={{ flex:1 }}><div className="cod-selected-qb-name">{activeQB.qb_name}</div><div className="cod-selected-qb-id">{activeQB.qb_id}</div></div>
                  <button onClick={() => setUI("upload")} className="cod-button cod-button-success cod-button-small">Continue →</button>
                </div>
              )}
              <div className="cod-search-row">
                <input type="text" value={qbSearchTerm} onChange={e => setQbSearchTerm(e.target.value)} onKeyDown={e => e.key==="Enter"&&searchQBs()} placeholder="Search question bank by name..." className="cod-input" />
                <button onClick={searchQBs} disabled={!qbSearchTerm.trim()} className={`cod-button cod-button-primary cod-button-small ${!qbSearchTerm.trim()?"cod-button-disabled":""}`}>🔍 Search</button>
              </div>
              {qbSearchResults.length > 0 && (
                <div className="cod-qb-results">
                  <div className="cod-results-title">{qbSearchResults.length} result(s)</div>
                  <div className="cod-qb-list">
                    {qbSearchResults.map((qb,i) => (
                      <div key={i} className="cod-qb-item">
                        <div className="cod-qb-info"><div className="cod-qb-name">{qb.qb_name}</div><div className="cod-qb-meta"><span>{qb.questionCount||0} questions</span><span>•</span><span className="cod-qb-id-pill">{qb.qb_id.slice(0,8)}…</span></div></div>
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

      {/* ══ UPLOAD ══ */}
      {ui === "upload" && activeQB && (
        <div className="cod-card">
          <div className="cod-header">
            <div>
              <PlatformBadge />
              <h3 className="cod-title">⚡ COD Sync — Paste & Upload</h3>
              <p className="cod-subtitle">📚 <strong>{activeQB.qb_name}</strong><span className="cod-qb-id-inline"> · {activeQB.qb_id.slice(0,8)}…</span></p>
            </div>
            <div className="cod-header-actions">
              <button onClick={() => setUI("qb-select")} className="cod-button cod-button-secondary cod-button-small">← QB</button>
              <button onClick={onBack}     className="cod-button cod-button-secondary cod-button-small">← Platforms</button>
              <button onClick={clearToken} className="cod-button cod-button-danger cod-button-small">🚪 Logout</button>
            </div>
          </div>

          <QuestionTypePill mode={questionTypeMode} onChange={mode => { setQuestionTypeMode(mode); resetUpload(); }} />

          {questionTypeMode === "single" && (
            <>
              <FormatSelector />

              <div className="cod-paste-area">
                <div className="cod-paste-header">
                  <label className="cod-label">
                    Paste AI output here
                    {pasteInput && <span className="cod-label-count">&nbsp;·&nbsp;{(pasteInput.match(/---QUESTION---/gi)||[]).length} block(s) detected</span>}
                  </label>
                  {pasteInput && (
                    <button onClick={() => { setPasteInput(""); setParsedQuestions([]); setParseErrors([]); setParseWarnings([]); setValidationPassed(false); }} className="cod-button cod-button-secondary cod-button-small">🗑 Clear</button>
                  )}
                </div>
                <textarea
                  value={pasteInput}
                  onChange={e => setPasteInput(e.target.value)}
                  placeholder={"Paste the ---QUESTION--- ... ---END--- block(s) from AI here.\nMultiple questions supported."}
                  className="cod-paste-textarea"
                  spellCheck={false}
                />
              </div>

              {/* Parse button */}
              <button
                onClick={handleParse}
                disabled={!pasteInput.trim()}
                className={`cod-button cod-button-primary ${!pasteInput.trim()?"cod-button-disabled":""}`}
              >
                🔍 Parse & Validate
              </button>

              {/* ── Inline error/warning panel — shown after parse attempt ── */}
              <ParseErrorsPanel
                errors={parseErrors}
                warnings={parseWarnings}
                onDismiss={() => { setParseErrors([]); setParseWarnings([]); }}
              />

              {/* ── Parsed questions list ── */}
              {parsedQuestions.length > 0 && (
                <div className="cod-parsed-section">
                  <div className="cod-parsed-header">
                    <h4 className="cod-parsed-title">
                      ✅ {parsedQuestions.length} question(s) ready
                      {parseErrors.length > 0 && (
                        <span style={{ fontSize:11, fontWeight:700, color:"#ef4444", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:20, padding:"2px 8px", marginLeft:8 }}>
                          {parseErrors.length} block(s) had errors — skipped
                        </span>
                      )}
                    </h4>
                    <button onClick={() => { setPreviewIndex(0); setShowPreview(true); }} className="cod-button cod-button-info cod-button-small">👁 Preview All</button>
                  </div>

                  <div className="cod-parsed-list">
                    {parsedQuestions.map((q,i) => (
                      <div key={i} className="cod-parsed-item">
                        <span className="cod-parsed-num">Q{i+1}</span>
                        <span className="cod-parsed-qtitle">{q.title}</span>
                        <span className="cod-parsed-langs">{q.languages.map(l => <span key={l} className="cod-lang-pill">{l}</span>)}</span>
                        <span className={`cod-diff-pill cod-diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                        <span className="cod-parsed-tc">{q.testcases.length} TCs</span>
                        <span style={{
                          fontSize:10, fontWeight:700,
                          background: validationPassed ? "rgba(16,185,129,0.1)" : skipConfirmed ? "rgba(99,102,241,0.1)" : "rgba(245,158,11,0.1)",
                          border: `1px solid ${validationPassed ? "rgba(16,185,129,0.3)" : skipConfirmed ? "rgba(99,102,241,0.3)" : "rgba(245,158,11,0.3)"}`,
                          color: validationPassed ? "#10b981" : skipConfirmed ? "#6366f1" : "#f59e0b",
                          padding:"2px 8px", borderRadius:20,
                        }}>
                          {validationPassed ? "✅ validated" : skipConfirmed ? "⚡ skip confirmed" : "⏳ not validated"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* ── Validation mode chooser ── */}
                  {validationMode === null && (
                    <div style={{
                      marginTop: 16,
                      background: "#f8f9fc",
                      border: "1.5px solid #e4e7f0",
                      borderRadius: 14,
                      padding: "16px 18px",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🧪</span> How do you want to proceed before uploading?
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {/* Run validator */}
                        <button
                          onClick={() => setValidationMode("run")}
                          style={{
                            flex: 1, padding: "14px 16px", cursor: "pointer",
                            background: "linear-gradient(135deg, #0f172a, #1e293b)",
                            border: "1.5px solid #334155",
                            borderRadius: 12, textAlign: "left",
                            display: "flex", flexDirection: "column", gap: 4,
                            transition: "all 0.2s",
                            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(16,185,129,0.25)"; e.currentTarget.style.borderColor = "#10b981"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.15)"; e.currentTarget.style.borderColor = "#334155"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18 }}>🔬</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>Run Validator</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", paddingLeft: 2, lineHeight: 1.5 }}>
                            Run testcases against Judge0 CE before uploading. Recommended.
                          </div>
                        </button>

                        {/* Skip validator */}
                        <button
                          onClick={() => setValidationMode("skip")}
                          style={{
                            flex: 1, padding: "14px 16px", cursor: "pointer",
                            background: "#fff8f0",
                            border: "1.5px solid #fde68a",
                            borderRadius: 12, textAlign: "left",
                            display: "flex", flexDirection: "column", gap: 4,
                            transition: "all 0.2s",
                            boxShadow: "0 2px 8px rgba(245,158,11,0.1)",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(245,158,11,0.2)"; e.currentTarget.style.borderColor = "#f59e0b"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(245,158,11,0.1)"; e.currentTarget.style.borderColor = "#fde68a"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 18 }}>⚡</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "#b45309" }}>Skip Validation</span>
                          </div>
                          <div style={{ fontSize: 11, color: "#92400e", paddingLeft: 2, lineHeight: 1.5 }}>
                            Upload directly without running testcases. Use if you trust the output.
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Change choice link */}
                  {validationMode !== null && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>
                        {validationMode === "run" ? "🔬 Running validator before upload" : "⚡ Skipping validation"}
                      </span>
                      <button
                        onClick={() => { setValidationMode(null); setValidationPassed(false); setSkipConfirmed(false); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6366f1", fontWeight: 700, padding: 0, textDecoration: "underline" }}
                      >
                        change
                      </button>
                    </div>
                  )}

                  {/* ── Validator (only when mode = run) ── */}
                  {validationMode === "run" && (
                    <ValidateSection
                      parsedQuestions={parsedQuestions}
                      onValidated={passed => setValidationPassed(passed)}
                      showAlert={showAlert}
                    />
                  )}

                  {/* ── Skip confirmation box (only when mode = skip) ── */}
                  {validationMode === "skip" && (
                    <div style={{
                      marginTop: 12,
                      background: "#fff8f0",
                      border: "1.5px solid #fde68a",
                      borderRadius: 12,
                      padding: "14px 16px",
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}>
                      <input
                        type="checkbox"
                        id="skip-validation-confirm"
                        checked={skipConfirmed}
                        onChange={e => setSkipConfirmed(e.target.checked)}
                        style={{ width: 15, height: 15, marginTop: 2, cursor: "pointer", accentColor: "#f59e0b", flexShrink: 0 }}
                      />
                      <label htmlFor="skip-validation-confirm" style={{ fontSize: 12, fontWeight: 600, color: "#92400e", cursor: "pointer", lineHeight: 1.6 }}>
                        ⚠️ I understand I'm uploading without validating testcases. The expected outputs may be incorrect and I take responsibility for the content uploaded.
                      </label>
                    </div>
                  )}

                  {/* ── Upload button ── */}
                  <div style={{ marginTop: 16 }}>
                    {(() => {
                      const canUpload = validationMode === "run"
                        ? validationPassed
                        : validationMode === "skip"
                          ? skipConfirmed
                          : false;
                      const notChosenYet = validationMode === null;
                      return (
                        <>
                          {notChosenYet && (
                            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                              <span>☝️</span> Choose a validation option above to enable upload.
                            </div>
                          )}
                          {validationMode === "run" && !validationPassed && (
                            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                              <span>⚠️</span> Run the validator — or force override inside the validator panel.
                            </div>
                          )}
                          {validationMode === "skip" && !skipConfirmed && (
                            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                              <span>☝️</span> Check the acknowledgement box above to enable upload.
                            </div>
                          )}
                          <button
                            onClick={uploadQuestions}
                            disabled={isLoading || !canUpload}
                            className={`cod-button cod-button-success ${(isLoading || !canUpload) ? "cod-button-disabled" : ""}`}
                          >
                            {isLoading
                              ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}…`
                              : `🚀 Upload ${parsedQuestions.length} Question(s) → "${activeQB.qb_name}"`}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}

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

      {/* ══ RESULTS ══ */}
      {ui === "results" && uploadResults && (
        <div className="cod-card">
          <div className="cod-result-section">
            <div className="cod-result-icon">{uploadResults.failed===0?"🎉":"⚠️"}</div>
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
                  {uploadResults.ids.map((item,i) => (
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
                  {uploadResults.errors.map((err,i) => (
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