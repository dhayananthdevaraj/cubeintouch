// src/pages/CODMedia.jsx
//
// COD question maintenance tool for a QB. Flow: search/select a QB, then
// pick one of two features — each replaces the page's main view (no modal):
//   1. Weightage Modifier (original feature, logic unchanged): define
//      difficulty tiers and bulk-fix testcase difficulty/weightage so every
//      question sums to 100%.
//   2. Question Preview Analyzer: a full-page, Prev/Next-navigable preview
//      of every section Examly has for a question, individually copyable
//      (or select-and-combine, or across the whole QB at once). It reads
//      the exact same fetched `questions[]` state the Weightage Modifier
//      has — no separate fetch path — and only hits the network again for
//      a question whose detail failed to load (Retry) or wasn't loaded yet
//      when "Copy All Questions" needs it.
//
// Writes directly to live Examly questions via PUT update_programming_question
// — built on fetchRawProgrammingQuestion/buildQuestionUpdatePayload (which
// round-trip the ENTIRE question, mutating only `testcases`) so nothing else
// about the question changes. Applying requires an explicit two-step confirm
// since this is not reversible from here. The analyzer is read-only — it
// never calls updateProgrammingQuestion.
import { useState } from "react";
import {
  searchQuestionBanksByName,
  fetchQuestionsForQb,
  fetchRawProgrammingQuestion,
  buildQuestionUpdatePayload,
  parseTestcases,
  updateProgrammingQuestion,
  CODING_TYPE_RE,
} from "../services/examlyQbClient";
import { useGlobalToken } from "../context/useGlobalToken";
import { DEPARTMENT_IDS } from "../config";
import { UNIVERSITY_DEPARTMENT_IDS } from "../configUniversity";
import { SECTION_KEYS, extractQuestionSections, combineSections } from "./questionSections";
import { copyToClipboard } from "../utils/clipboard";
import QuestionAnalyzer from "../components/QuestionAnalyzer";
import "./CODMedia.css";

const FETCH_CONCURRENCY = 4;
const APPLY_CONCURRENCY = 3;

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

let tierIdSeq = 0;
function makeTier(difficulty, count, weightage) {
  return { id: ++tierIdSeq, difficulty, count, weightage };
}

function defaultTiers() {
  return [
    makeTier("Easy", 2, 10),
    makeTier("Medium", 2, 15),
    makeTier("Hard", 2, 25),
  ];
}

/** True if this question already has its own manual_difficulty somewhere in the raw GET response. */
function hasManualDifficulty(raw) {
  if (!raw) return true; // not loaded yet — don't flag prematurely
  const { answer = {}, learning = {} } = raw;
  return (answer.manual_difficulty ?? learning.manual_difficulty ?? raw.manual_difficulty ?? null) !== null;
}

/** Assign tier.difficulty/weightage to the first N testcases per tier, in order. Extra testcases beyond the configured total are left untouched. */
function applyTierDistribution(testcases, tiers) {
  const result = testcases.map((tc) => ({ ...tc }));
  let idx = 0;
  for (const tier of tiers) {
    const count = Number(tier.count) || 0;
    for (let i = 0; i < count && idx < result.length; i++, idx++) {
      result[idx] = { ...result[idx], difficulty: tier.difficulty, score: Number(tier.weightage) || 0 };
    }
  }
  return { testcases: result, touched: idx };
}

// Module-level (not nested in CODMedia) so it isn't recreated every render.
function FeatureCardsView({ qbName, totalCount, readyCount, onOpenWeightage, onOpenAnalyzer }) {
  return (
    <div className="ctw-card">
      <div className="ctw-result-header">
        <h2 className="ctw-section-title" style={{ margin: 0 }}>{qbName}</h2>
        <span className="ctw-muted">{totalCount} COD question(s) · {readyCount} ready</span>
      </div>

      <div className="ctw-feature-row">
        <button className="ctw-feature-card ctw-feature-card--clickable" onClick={onOpenWeightage}>
          <div className="ctw-feature-icon">⚖️</div>
          <div>
            <h3 className="ctw-feature-title">Weightage Modifier</h3>
            <p className="ctw-muted">
              Define difficulty tiers, testcase counts and weightage, then bulk-apply so every question's
              scored testcases sum to exactly 100%.
            </p>
          </div>
        </button>

        <button className="ctw-feature-card ctw-feature-card--clickable" onClick={onOpenAnalyzer}>
          <div className="ctw-feature-icon">🔍</div>
          <div>
            <h3 className="ctw-feature-title">Question Preview Analyzer</h3>
            <p className="ctw-muted">
              Browse every question's full content — description, formats, constraints, testcases, solution,
              code stub, header/footer, whitelist, schema — filter and copy any part of it for an AI prompt.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function CODMedia() {
  const { token } = useGlobalToken();

  const [orgType, setOrgType] = useState("university");
  const [qbName, setQbName] = useState("");
  const [qbCandidates, setQbCandidates] = useState(null); // null = not searched yet; [] = searched, no matches
  const [selectedQb, setSelectedQb] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState([]); // {id, questionText, testcases, raw, loading, error}
  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set()); // which question ids Apply should touch

  const [tiers, setTiers] = useState(defaultTiers);
  const [manualDifficultyFallback, setManualDifficultyFallback] = useState("Medium");
  const [armed, setArmed] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResults, setApplyResults] = useState({}); // {[id]: {status: "pending"|"done"|"error", message}}

  // "features" (the two cards) | "weightage" | "analyzer" — only meaningful once questions.length > 0
  const [view, setView] = useState("features");

  // ── Question Preview Analyzer state — kept separate from weightage state ──
  const [analyzerIndex, setAnalyzerIndex] = useState(0);
  // Lifted above the analyzer so the section selection survives Prev/Next
  // navigation and switching away from/back to the analyzer view.
  const [selectedSections, setSelectedSections] = useState(() => new Set(SECTION_KEYS));
  const [copyAllState, setCopyAllState] = useState({ running: false, done: 0, total: 0, message: null, ok: null });

  const departmentIds = orgType === "university" ? UNIVERSITY_DEPARTMENT_IDS : DEPARTMENT_IDS;
  const totalWeightage = tiers.reduce((sum, t) => sum + (Number(t.count) || 0) * (Number(t.weightage) || 0), 0);
  const totalCount = tiers.reduce((sum, t) => sum + (Number(t.count) || 0), 0);
  const configValid = totalWeightage === 100 && totalCount > 0;

  const readyQuestions = questions.filter((q) => !q.loading && !q.error && q.testcases);
  const selectedQuestions = readyQuestions.filter((q) => selected.has(q.id));
  const allReadySelected = readyQuestions.length > 0 && selectedQuestions.length === readyQuestions.length;

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setArmed(false);
  }

  function selectAllReady() {
    setSelected(new Set(readyQuestions.map((q) => q.id)));
    setArmed(false);
  }

  function selectNone() {
    setSelected(new Set());
    setArmed(false);
  }

  function updateTier(id, field, value) {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    setArmed(false);
  }
  function addTier() {
    setTiers((prev) => [...prev, makeTier("Easy", 0, 0)]);
    setArmed(false);
  }
  function removeTier(id) {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    setArmed(false);
  }

  /**
   * Fetches one question's raw detail, merges it into `questions[]` at its
   * existing slot (for the UI), AND returns the fresh {raw, testcases} so a
   * caller that needs the value right away (handleCopyAllQuestions) doesn't
   * have to read back possibly-stale React state after an await — avoids a
   * race between "did this fetch finish" and "is state re-rendered yet".
   */
  async function fetchOneQuestionDetail(qId) {
    setQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, loading: true, error: null } : q)));
    try {
      const entity = await fetchRawProgrammingQuestion({ token, qId });
      const testcases = parseTestcases(entity.answer?.testcases);
      setQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, raw: entity, testcases, loading: false } : q)));
      return { raw: entity, testcases };
    } catch (err) {
      const message = err.message || "Failed";
      setQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, loading: false, error: message } : q)));
      throw new Error(message);
    }
  }

  async function handleSearchQb() {
    const name = qbName.trim();
    if (!name) { setError("Enter a QB name."); return; }

    setError("");
    setQuestions([]);
    setApplyResults({});
    setArmed(false);
    setQbCandidates(null);
    setSelectedQb(null);
    setStatus(`Searching for "${name}"...`);

    try {
      const banks = await searchQuestionBanksByName({ token, departmentIds, qbName: name });
      setQbCandidates(banks);
      if (!banks.length) setError(`No question banks found matching "${name}".`);
      setStatus("");
    } catch (err) {
      setError(err.message || "Failed to search.");
      setStatus("");
    }
  }

  async function handleSelectQb(qb) {
    setError("");
    setQuestions([]);
    setApplyResults({});
    setArmed(false);
    setView("features");
    setCopyAllState({ running: false, done: 0, total: 0, message: null, ok: null });
    setSelectedQb(qb);
    setStatus(`Fetching questions from "${qb.qb_name}"...`);

    try {
      const fetched = await fetchQuestionsForQb({ token, qb });
      const codQuestions = fetched.filter((q) => CODING_TYPE_RE.test(q.questionType || ""));
      if (!codQuestions.length) {
        setStatus("");
        setError(`QB "${qb.qb_name}" has no COD/programming questions.`);
        return;
      }

      const initial = codQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        testcases: null,
        raw: null,
        loading: true,
        error: null,
      }));
      setQuestions(initial);
      setSelected(new Set(initial.map((q) => q.id))); // default: apply to all, uncheck to exclude
      setStatus(`Fetching testcase detail for ${initial.length} question(s)...`);

      let idx = 0;
      let done = 0;
      async function worker() {
        while (idx < initial.length) {
          const myIdx = idx++;
          const q = initial[myIdx];
          try {
            const entity = await fetchRawProgrammingQuestion({ token, qId: q.id });
            const testcases = parseTestcases(entity.answer?.testcases);
            setQuestions((prev) => {
              const next = [...prev];
              next[myIdx] = { ...next[myIdx], raw: entity, testcases, loading: false };
              return next;
            });
          } catch (err) {
            setQuestions((prev) => {
              const next = [...prev];
              next[myIdx] = { ...next[myIdx], loading: false, error: err.message || "Failed" };
              return next;
            });
          } finally {
            done++;
            setStatus(`Fetching testcase detail... ${done}/${initial.length}`);
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, initial.length) }, worker));
      setStatus("");
    } catch (err) {
      setError(err.message || "Failed to fetch.");
      setStatus("");
    }
  }

  function handleApplyClick() {
    if (!configValid || !selectedQuestions.length) return;
    if (!armed) { setArmed(true); return; }
    runApply();
  }

  async function runApply() {
    setArmed(false);
    setApplying(true);
    const pending = {};
    selectedQuestions.forEach((q) => { pending[q.id] = { status: "pending" }; });
    setApplyResults(pending);

    const list = selectedQuestions;
    let idx = 0;
    async function worker() {
      while (idx < list.length) {
        const q = list[idx++];
        try {
          const { testcases: newTestcases } = applyTierDistribution(q.testcases, tiers);
          const payload = buildQuestionUpdatePayload(q.raw, { manualDifficultyFallback });
          payload.testcases = newTestcases;
          await updateProgrammingQuestion({ token, qId: q.id, payload });
          setApplyResults((prev) => ({ ...prev, [q.id]: { status: "done" } }));
        } catch (err) {
          setApplyResults((prev) => ({ ...prev, [q.id]: { status: "error", message: err.message || "Failed" } }));
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(APPLY_CONCURRENCY, list.length) }, worker));
    setApplying(false);
  }

  // ── Analyzer helpers ─────────────────────────────────────────────────────
  function openAnalyzer(startIndex = 0) {
    setAnalyzerIndex(Math.max(0, Math.min(startIndex, questions.length - 1)));
    setView("analyzer");
  }
  function toggleAnalyzerSection(key) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function selectAllAnalyzerSections() { setSelectedSections(new Set(SECTION_KEYS)); }
  function selectNoneAnalyzerSections() { setSelectedSections(new Set()); }

  /**
   * Copies every COD question in the QB (not just the currently viewed one),
   * limited to the currently-selected sections. Reuses already-fetched
   * `questions[]` entries as-is and only fetches the ones still missing
   * detail, concurrency-limited. Builds its combined text from a LOCAL
   * array of freshly-resolved values (not by re-reading `questions` state
   * after the awaits) specifically to avoid a stale-state race between
   * concurrent fetches finishing and this function reading the result.
   */
  async function handleCopyAllQuestions() {
    if (copyAllState.running || !questions.length) return;
    const snapshot = questions;
    setCopyAllState({ running: true, done: 0, total: snapshot.length, message: null, ok: null });

    const effective = new Array(snapshot.length);
    let idx = 0;
    let doneCount = 0;
    let hadFailure = false;

    async function worker() {
      while (idx < snapshot.length) {
        const myIdx = idx++;
        const q = snapshot[myIdx];
        try {
          if (q.raw && q.testcases) {
            effective[myIdx] = q;
          } else {
            const { raw, testcases } = await fetchOneQuestionDetail(q.id);
            effective[myIdx] = { ...q, raw, testcases, error: null };
          }
        } catch (err) {
          effective[myIdx] = { ...q, error: err.message || "Failed" };
          hadFailure = true;
        } finally {
          doneCount++;
          setCopyAllState((prev) => ({ ...prev, done: doneCount }));
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, snapshot.length) }, worker));

    const combinedText = effective
      .map((q, i) => {
        const heading = `# Question ${i + 1} of ${effective.length} — ${q.id}${q.questionText ? `\n${q.questionText}` : ""}`;
        if (!q.raw) return `${heading}\n\n(Failed to load: ${q.error || "unknown error"})`;
        const body = combineSections(extractQuestionSections(q), selectedSections);
        return `${heading}\n\n${body || "(no selected sections available)"}`;
      })
      .join("\n\n" + "=".repeat(48) + "\n\n");

    const copyOk = await copyToClipboard(combinedText);
    setCopyAllState({
      running: false,
      done: snapshot.length,
      total: snapshot.length,
      ok: copyOk,
      message: !copyOk
        ? "Could not copy to clipboard."
        : hadFailure
          ? `Copied ${snapshot.length} question(s) — some failed to load and are noted in the output.`
          : `Copied all ${snapshot.length} question(s).`,
    });
  }

  const appliedDone = Object.values(applyResults).filter((r) => r.status === "done").length;
  const appliedError = Object.values(applyResults).filter((r) => r.status === "error").length;
  const hasResults = Object.keys(applyResults).length > 0;

  return (
    <div className="ctw-root">
      <div className="ctw-topbar">
        <div>
          <h1 className="ctw-title">CodeScope</h1>
          <p className="ctw-subtitle">
            Fix testcase difficulty/weightage across a whole QB, and preview or copy any question's full content — writes directly to Examly.
          </p>
        </div>
      </div>

      <div className="ctw-card">
        <div className="ctw-segmented">
          <button className={orgType === "university" ? "ctw-seg-btn ctw-seg-btn--active" : "ctw-seg-btn"} onClick={() => setOrgType("university")}>University</button>
          <button className={orgType === "corporate" ? "ctw-seg-btn ctw-seg-btn--active" : "ctw-seg-btn"} onClick={() => setOrgType("corporate")}>Corporate</button>
        </div>

        <label className="ctw-label">Question Bank name</label>
        <div className="ctw-actions-row">
          <input
            className="ctw-input"
            value={qbName}
            onChange={(e) => setQbName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchQb()}
            placeholder="Exact or near QB name..."
          />
          <button className="ctw-btn ctw-btn--primary" onClick={handleSearchQb} disabled={!!status}>
            Search QBs
          </button>
        </div>
        {status && <p className="ctw-status">{status}</p>}
        {error && <p className="ctw-alert ctw-alert--error">{error}</p>}
      </div>

      {qbCandidates && qbCandidates.length > 0 && (
        <div className="ctw-card">
          <div className="ctw-result-header">
            <h2 className="ctw-section-title" style={{ margin: 0 }}>
              {qbCandidates.length} question bank{qbCandidates.length > 1 ? "s" : ""} matched &quot;{qbName.trim()}&quot;
            </h2>
            {selectedQb && <span className="ctw-muted">Using: <strong>{selectedQb.qb_name}</strong></span>}
          </div>
          <p className="ctw-muted">The same name can exist in more than one department — pick the right one.</p>
          <div className="ctw-q-list">
            {qbCandidates.map((qb) => (
              <button
                key={qb.qb_id}
                className={`ctw-qb-candidate ${selectedQb?.qb_id === qb.qb_id ? "ctw-qb-candidate--active" : ""}`}
                onClick={() => handleSelectQb(qb)}
                disabled={!!status}
              >
                <span className="ctw-qb-candidate-name">{qb.qb_name}</span>
                <span className="ctw-muted">
                  {qb.qb_id}
                  {qb.questionCount != null ? ` · ${qb.questionCount} questions` : ""}
                  {qb.visibility ? ` · ${qb.visibility}` : ""}
                  {qb.user_role ? ` · ${qb.user_role}` : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Only the two feature cards are shown right after QB selection ── */}
      {questions.length > 0 && view === "features" && (
        <FeatureCardsView
          qbName={selectedQb?.qb_name}
          totalCount={questions.length}
          readyCount={readyQuestions.length}
          onOpenWeightage={() => setView("weightage")}
          onOpenAnalyzer={() => openAnalyzer(analyzerIndex)}
        />
      )}

      {questions.length > 0 && view === "weightage" && (
        <>
          <button className="ctw-btn ctw-btn--ghost ctw-back-btn" onClick={() => setView("features")}>← Back to features</button>

          <div className="ctw-card">
            <h2 className="ctw-section-title">Weightage scheme</h2>
            <p className="ctw-muted">
              Define difficulty tiers, in order. The first <em>count</em> testcases of each question get tier 1&apos;s
              difficulty/weightage, the next <em>count</em> get tier 2&apos;s, and so on. Testcases beyond the configured
              total are left untouched.
            </p>

            <table className="ctw-tier-table">
              <thead>
                <tr>
                  <th>Difficulty</th>
                  <th>Count</th>
                  <th>Weightage % (per testcase)</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <select className="ctw-select" value={t.difficulty} onChange={(e) => updateTier(t.id, "difficulty", e.target.value)}>
                        {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td>
                      <input className="ctw-num-input" type="number" min="0" value={t.count}
                        onChange={(e) => updateTier(t.id, "count", e.target.value === "" ? "" : Number(e.target.value))} />
                    </td>
                    <td>
                      <input className="ctw-num-input" type="number" min="0" value={t.weightage}
                        onChange={(e) => updateTier(t.id, "weightage", e.target.value === "" ? "" : Number(e.target.value))} />
                    </td>
                    <td className="ctw-muted">{((Number(t.count) || 0) * (Number(t.weightage) || 0))}%</td>
                    <td>
                      <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" onClick={() => removeTier(t.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ctw-actions-row">
              <button className="ctw-btn ctw-btn--ghost ctw-btn--sm" onClick={addTier}>+ Add tier</button>
              <span className={configValid ? "ctw-total ctw-total--ok" : "ctw-total ctw-total--bad"}>
                Total: {totalWeightage}% across {totalCount} testcase(s) {configValid ? "✓" : "— must equal 100%"}
              </span>
            </div>

            <div className="ctw-actions-row">
              <label className="ctw-label" style={{ marginBottom: 0 }}>
                If a question has no difficulty of its own set:
              </label>
              <select className="ctw-select" value={manualDifficultyFallback} onChange={(e) => setManualDifficultyFallback(e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <p className="ctw-muted">
              Examly requires every question to have its own overall difficulty, separate from per-testcase difficulty.
              A few older questions never had one set — this fills it in only for those; it never overwrites a question
              that already has one.
            </p>
          </div>

          <div className="ctw-card">
            <div className="ctw-result-header">
              <div>
                <strong>{selectedQb?.qb_name}</strong>
                <span className="ctw-muted"> — {questions.length} COD question(s), {readyQuestions.length} ready, {selectedQuestions.length} selected</span>
              </div>
              <div className="ctw-actions-row">
                <label className="ctw-checkbox">
                  <input
                    type="checkbox"
                    checked={allReadySelected}
                    onChange={(e) => (e.target.checked ? selectAllReady() : selectNone())}
                  />
                  Select all
                </label>
                {armed ? (
                  <>
                    <span className="ctw-alert ctw-alert--warn">
                      Writes to {selectedQuestions.length} live question(s) on Examly — not reversible from here.
                    </span>
                    <button className="ctw-btn ctw-btn--danger" onClick={handleApplyClick} disabled={applying}>
                      Confirm — Apply to {selectedQuestions.length}
                    </button>
                    <button className="ctw-btn ctw-btn--ghost" onClick={() => setArmed(false)} disabled={applying}>Cancel</button>
                  </>
                ) : (
                  <button className="ctw-btn ctw-btn--primary" onClick={handleApplyClick} disabled={!configValid || !selectedQuestions.length || applying}>
                    {applying ? "Applying..." : `Apply to ${selectedQuestions.length} selected question(s)`}
                  </button>
                )}
              </div>
            </div>

            {hasResults && (
              <p className="ctw-status">
                {applying ? "Applying..." : `Done — ${appliedDone} updated, ${appliedError} failed.`}
              </p>
            )}

            <div className="ctw-q-list">
              {questions.map((q, qIdx) => {
                const isOpen = expanded.has(q.id);
                const preview = q.testcases ? applyTierDistribution(q.testcases, tiers) : null;
                const result = applyResults[q.id];
                return (
                  <div className="ctw-q-item" key={q.id}>
                    <div className="ctw-q-head" onClick={() => toggleExpanded(q.id)}>
                      <input
                        type="checkbox"
                        className="ctw-q-checkbox"
                        checked={selected.has(q.id)}
                        onChange={() => toggleSelected(q.id)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!q.testcases}
                      />
                      <span className="ctw-q-caret">{isOpen ? "▾" : "▸"}</span>
                      <span className="ctw-qid">{q.id}</span>
                      <span className="ctw-qtext">{q.questionText}</span>
                      {q.testcases && (
                        <span className="ctw-badge">
                          {q.testcases.length} testcase(s)
                          {preview && preview.touched < q.testcases.length && ` · ${preview.touched} covered`}
                        </span>
                      )}
                      {q.raw && !hasManualDifficulty(q.raw) && (
                        <span className="ctw-badge ctw-badge--warn" title="This question has no overall difficulty set — it will be filled in with the fallback above">
                          no difficulty → {manualDifficultyFallback}
                        </span>
                      )}
                      {result && (
                        <span className={`ctw-badge ctw-badge--${result.status}`}>
                          {result.status === "pending" ? "Applying…" : result.status === "done" ? "Updated" : `Failed: ${result.message}`}
                        </span>
                      )}
                      <button
                        className="ctw-btn ctw-btn--ghost ctw-btn--sm"
                        onClick={(e) => { e.stopPropagation(); openAnalyzer(qIdx); }}
                        title="Open in Question Preview Analyzer"
                      >
                        🔍 Analyze
                      </button>
                    </div>

                    {q.loading && <p className="ctw-muted">Loading detail...</p>}
                    {q.error && <p className="ctw-alert ctw-alert--error">{q.error}</p>}

                    {isOpen && q.testcases && (
                      <table className="ctw-tc-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Current difficulty</th>
                            <th>Current weightage</th>
                            <th>New difficulty</th>
                            <th>New weightage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.testcases.map((tc, i) => {
                            const newTc = preview.testcases[i];
                            const changed = newTc.difficulty !== tc.difficulty || newTc.score !== tc.score;
                            return (
                              <tr key={i} className={changed ? "ctw-tc-changed" : ""}>
                                <td>{i + 1}</td>
                                <td>{tc.difficulty ?? "—"}</td>
                                <td>{tc.score ?? "—"}</td>
                                <td>{newTc.difficulty ?? "—"}</td>
                                <td>{newTc.score ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {questions.length > 0 && view === "analyzer" && (
        <QuestionAnalyzer
          qbName={selectedQb?.qb_name}
          questions={questions}
          index={analyzerIndex}
          onIndexChange={(next) => setAnalyzerIndex(Math.max(0, Math.min(next, questions.length - 1)))}
          onBack={() => setView("features")}
          onRetry={fetchOneQuestionDetail}
          selectedSections={selectedSections}
          onToggleSection={toggleAnalyzerSection}
          onSelectAllSections={selectAllAnalyzerSections}
          onSelectNoneSections={selectNoneAnalyzerSections}
          copyAllState={copyAllState}
          onCopyAllQuestions={handleCopyAllQuestions}
        />
      )}
    </div>
  );
}
