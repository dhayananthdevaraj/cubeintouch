// src/pages/TestPacking.jsx
//
// Test Packing / Test Creation — a 5-step wizard: Token → Configuration →
// Select Question Banks → Fetch & Pack → Review. Reuses the existing
// services untouched (examlyQbClient, qbMatchingService, testCreationService)
// — this file only orchestrates them into the new flow and UI.
//
// Key flow change from the previous version: QB candidates are now searched
// and shown FIRST, the user checks which ones to use, and only THEN do we
// call Examly to fetch actual questions — for BOTH Automatic and Manual mode
// (they now share the identical search → select → fetch step; they only
// diverge after fetching: Automatic auto-packs via
// packSequentialBalancedSelections, Manual shows the fetched pool for
// hand-selection, same as before).
//
// University-only for now (see UNIVERSITY_DEPARTMENT_IDS/
// UNIVERSITY_B_D_ID_OPTIONS below) — same starting point as FileSync/
// BlankSync, which note Corporate support as a later addition.
import { useState, useEffect, useMemo } from "react";
import apiConfig from "../apiConfig";
import { readToken } from "../utils/tokenStorage";
import { UNIVERSITY_DEPARTMENT_IDS, UNIVERSITY_B_D_ID_OPTIONS } from "../configUniversity";
import {
  fetchQuestionsForCandidates,
  fetchQuestionsForQb,
  findQuestionBankByName,
  fetchProgrammingQuestionDetail,
} from "../services/examlyQbClient";
import {
  packSequentialBalancedSelections,
  buildPreview,
  summarizeQbSources,
  validateRequirement,
  validateSelection,
  dedupeQuestions,
  isStVerified,
} from "../services/qbMatchingService";
import { createTest } from "../services/testCreationService";
import "./TestPacking.css";

const TOKEN_KEY = "examly_token_testpack_university";
const CODING_TYPE_RE = /programming|coding/i;
const DETAIL_FETCH_CONCURRENCY = 4;

const STEPS = [
  { n: 1, label: "Token" },
  { n: 2, label: "Configuration" },
  { n: 3, label: "Select QBs" },
  { n: 4, label: "Fetch & Pack" },
  { n: 5, label: "Review" },
];

export default function TestPacking() {
  // ── Auth — unchanged logic, restyled ───────────────────────────────────
  const [token, setToken] = useState(() => readToken(TOKEN_KEY));
  const [ui, setUi] = useState(() => (readToken(TOKEN_KEY) ? "app" : "welcome"));
  const [tokenInput, setTokenInput] = useState("");
  const [bdIdOption, setBdIdOption] = useState(UNIVERSITY_B_D_ID_OPTIONS[1]); // "University - admin"

  const saveToken = () => {
    if (!tokenInput.trim()) { setError("Token cannot be empty"); return; }
    const tok = tokenInput.trim();
    try { localStorage.setItem(TOKEN_KEY, tok); } catch { /* ignore */ }
    setToken(tok);
    setTokenInput("");
    setUi("app");
    setStep(2);
  };

  // ── Wizard step (2-5 while ui === "app"; step 1 = the welcome/token gate) ─
  const [step, setStep] = useState(2);

  // ── Mode — now decided as part of Configuration (step 2) ────────────────
  const [mode, setMode] = useState("automatic"); // "automatic" | "manual"

  // ── Tech stacks (from the QB metadata sheet) ───────────────────────────
  const [techStacks, setTechStacks] = useState([]);
  const [loadingStacks, setLoadingStacks] = useState(false);

  useEffect(() => {
    setLoadingStacks(true);
    fetch(apiConfig.QB_TECH_STACKS)
      .then((r) => r.json())
      .then((d) => setTechStacks(d.techStacks || []))
      .catch(() => setError("Failed to load tech stacks from the QB metadata sheet."))
      .finally(() => setLoadingStacks(false));
  }, []);

  // ── Configuration (step 2) ───────────────────────────────────────────────
  const [techStack, setTechStack] = useState("");
  // Topics are chips: type, press Enter, it's committed. Each topic gets its
  // OWN candidate pool and an even share of requestedCount (see
  // packSequentialBalancedSelections) so a test always contains questions
  // from every entered topic, not just whichever one's QB scores highest.
  const [topics, setTopics] = useState([]);
  const [topicDraft, setTopicDraft] = useState("");
  const [compiler, setCompiler] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [requiredCount, setRequiredCount] = useState(20);
  const [testName, setTestName] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [duration, setDuration] = useState("60"); // minutes
  const [testCount, setTestCount] = useState(1); // Automatic mode only
  const [publishOnCreate, setPublishOnCreate] = useState(true);

  // ── Shared status/error ─────────────────────────────────────────────────
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // ── Step 3 — QB candidates + which ones are checked ─────────────────────
  const [candidates, setCandidates] = useState([]); // sheet metadata matches, each tagged .matchedTopic
  const [selectedQbIdx, setSelectedQbIdx] = useState(() => new Set());
  const [qbFilterText, setQbFilterText] = useState("");

  // ── Step 4 (manual mode only) — fetched pool awaiting hand-selection ────
  const [manualPool, setManualPool] = useState([]);
  const [manualSelectedIds, setManualSelectedIds] = useState(() => new Set());

  // ── Step 5 — one or more packed tests from this run ─────────────────────
  const [previews, setPreviews] = useState([]); // array of preview DTOs (see qbMatchingService.buildPreview)
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [creatingIndex, setCreatingIndex] = useState(null);
  const [pdfGeneratingIndex, setPdfGeneratingIndex] = useState(null);
  const [createResults, setCreateResults] = useState({}); // { [previewIndex]: {testId} | {error, testId?} }

  // ── "Full Preview" expand — full HTML always available; extra structured
  //    detail (I/O format, testcases, solution) fetched on demand for coding
  //    questions and cached by question id. This SAME cache is reused to
  //    enrich the PDF, so the screen and the PDF never disagree. ───────────
  const [expandedQId, setExpandedQId] = useState(null);
  const [detailLoadingQId, setDetailLoadingQId] = useState(null);
  const [detailCache, setDetailCache] = useState({}); // { [qId]: detail | { error } }

  // ── Editing a packed test's question set — remove a question, or add more
  //    from a QB (an existing source, or a different one typed in) ──────────
  const [addQbTarget, setAddQbTarget] = useState(null); // { previewIdx, qbName } | null
  const [addQbPool, setAddQbPool] = useState([]);
  const [addQbSelectedIds, setAddQbSelectedIds] = useState(() => new Set());

  const effectiveSectionName = () => sectionName.trim() || techStack || "Section 1";
  const effectiveDuration = () => (String(duration).trim() ? String(duration).trim() : "60");

  /** Committed chips + any not-yet-Entered draft text, so a forgotten Enter still counts on submit */
  const allTopics = () => (topicDraft.trim() ? [...topics, topicDraft.trim()] : topics);

  function handleTopicKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = topicDraft.trim();
      if (val && !topics.includes(val)) setTopics((prev) => [...prev, val]);
      setTopicDraft("");
    } else if (e.key === "Backspace" && !topicDraft && topics.length) {
      setTopics((prev) => prev.slice(0, -1));
    }
  }

  function removeTopic(t) {
    setTopics((prev) => prev.filter((x) => x !== t));
  }

  // ── Step 2 → 3 : search QB metadata (shared by both modes) ──────────────
  async function searchCandidatesForTopic(oneTopic) {
    const params = new URLSearchParams({ techStack, topic: oneTopic, type: questionType });
    const res = await fetch(`${apiConfig.QB_METADATA_SEARCH}?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "QB metadata search failed");
    return json.results || [];
  }

  async function handleFindQuestionBanks() {
    const topicList = allTopics();
    const { valid, errors } = validateRequirement({ techStack, topics: topicList, requestedCount: requiredCount });
    if (!valid) { setError(errors.join(" ")); return; }
    if (topicDraft.trim()) { setTopics(topicList); setTopicDraft(""); }

    // Changing the config and re-searching invalidates every downstream step.
    setCandidates([]);
    setSelectedQbIdx(new Set());
    setQbFilterText("");
    setManualPool([]);
    setManualSelectedIds(new Set());
    setPreviews([]);
    setCreateResults({});
    setError("");

    setStatus("Searching QB metadata sheet...");
    try {
      const perTopicCandidates = await Promise.all(topicList.map((t) => searchCandidatesForTopic(t)));
      const merged = topicList.flatMap((t, i) => perTopicCandidates[i].map((c) => ({ ...c, matchedTopic: t })));
      setCandidates(merged);
      setStatus("");
      if (!merged.length) {
        setError(`No QB metadata found for any of: ${topicList.join(", ")} under "${techStack}". Check the spelling or try broader topics.`);
        return;
      }
      setStep(3);
    } catch (err) {
      setError(err.message || "QB metadata search failed.");
      setStatus("");
    }
  }

  // ── Step 3 — QB selection ────────────────────────────────────────────────
  const filteredCandidates = useMemo(() => {
    const q = qbFilterText.trim().toLowerCase();
    if (!q) return candidates.map((c, i) => ({ c, i }));
    return candidates
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => [c.qbName, c.type, c.matchedTopic, c.techStack].some((v) => v && v.toLowerCase().includes(q)));
  }, [candidates, qbFilterText]);

  function toggleQbSelected(i) {
    setSelectedQbIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function selectAllQbs() {
    setSelectedQbIdx((prev) => new Set([...prev, ...filteredCandidates.map(({ i }) => i)]));
  }

  function clearAllQbs() {
    setSelectedQbIdx(new Set());
  }

  const selectedQbAvailableCount = useMemo(
    () => [...selectedQbIdx].reduce((sum, i) => sum + (candidates[i]?.count || 0), 0),
    [selectedQbIdx, candidates]
  );

  // ── Step 3 → 4 : fetch questions ONLY from the checked QBs, then pack ───
  async function handleFetchAndPack() {
    if (!token.trim()) { setError("Paste an Examly bearer token first."); return; }
    if (!selectedQbIdx.size) { setError("Select at least one Question Bank first."); return; }

    setError("");
    setPreviews([]);
    setCreateResults({});
    setManualPool([]);
    setManualSelectedIds(new Set());
    setStep(4);

    const selected = [...selectedQbIdx].map((i) => candidates[i]);
    const byTopic = new Map();
    selected.forEach((c) => {
      const key = c.matchedTopic || "General";
      if (!byTopic.has(key)) byTopic.set(key, []);
      byTopic.get(key).push(c);
    });

    let fetchedQbCount = 0;
    const totalQbs = selected.length;
    const topicPools = [];
    const allFetched = [];

    setStatus(`Fetching questions from ${totalQbs} selected QB(s)...`);
    try {
      for (const [topicName, group] of byTopic.entries()) {
        const { questions, unresolved } = await fetchQuestionsForCandidates({
          token,
          departmentIds: UNIVERSITY_DEPARTMENT_IDS,
          candidates: group,
          techStack,
          topic: topicName,
          compiler,
          onProgress: ({ qbName, fetched }) => {
            fetchedQbCount += 1;
            setStatus(`Fetched ${fetched} question(s) from "${qbName}" (${fetchedQbCount}/${totalQbs} QBs)...`);
          },
        });
        if (unresolved.length) console.warn(`QBs not found on Examly for topic "${topicName}":`, unresolved);
        topicPools.push({ topic: topicName, candidates: questions });
        allFetched.push(...questions);
      }

      if (mode === "manual") {
        setManualPool(dedupeQuestions(allFetched));
        setStatus("");
        return; // stays on step 4 for hand-selection
      }

      const nTests = Math.max(1, Number(testCount) || 1);
      const { selections, shortBy } = packSequentialBalancedSelections(topicPools, nTests, Number(requiredCount));
      if (!selections.length) {
        setError("No suitable questions were found from the selected QBs.");
        setStatus("");
        setStep(3);
        return;
      }

      const topicLabel = topics.join(", ");
      const baseName = testName.trim() || `${techStack} - ${topicLabel}`;
      const newPreviews = selections.map((selection, i) => buildPreview({
        testName: nTests > 1 ? `${baseName} - Test ${i + 1}` : baseName,
        techStack, topic: topicLabel, compiler,
        sectionName: effectiveSectionName(),
        duration: effectiveDuration(),
        selection,
      }));

      setPreviews(newPreviews);
      setActivePreviewIdx(0);
      if (shortBy > 0) setError(`Only ${newPreviews.length} of ${nTests} requested test(s) could be packed — the selected QBs ran out of non-repeating matching questions.`);
      setStatus("");
      setStep(5);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch/pack questions.");
      setStatus("");
      setStep(3);
    }
  }

  // ── Step 4 (manual) — hand-select questions, build the single preview ───
  function toggleManualQuestion(id) {
    setManualSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleBuildManualPreview() {
    const selectedQuestions = manualPool.filter((q) => manualSelectedIds.has(q.id));
    const { valid, errors } = validateSelection(selectedQuestions);
    if (!valid) { setError(errors.join(" ")); return; }
    setError("");
    setCreateResults({});

    const selection = {
      selected: selectedQuestions,
      requestedCount: Number(requiredCount) || selectedQuestions.length,
      selectedCount: selectedQuestions.length,
      stVerifiedCount: selectedQuestions.filter(isStVerified).length,
      otherCount: selectedQuestions.filter((q) => !isStVerified(q)).length,
      usedFallback: false,
      shortBy: 0,
      warning:
        Number(requiredCount) && selectedQuestions.length !== Number(requiredCount)
          ? `${selectedQuestions.length} questions selected manually (${requiredCount} requested).`
          : null,
    };

    const topicLabel = topics.join(", ");
    setPreviews([buildPreview({
      testName: testName.trim() || `${techStack} - ${topicLabel || "Manual"}`,
      techStack, topic: topicLabel, compiler,
      sectionName: effectiveSectionName(),
      duration: effectiveDuration(),
      selection,
    })]);
    setActivePreviewIdx(0);
    setStep(5);
  }

  // ── Step 5 — edit a preview (remove / add-from-QB) ──────────────────────
  function updatePreview(idx, patch) {
    setPreviews((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function replacePreviewQuestions(idx, questions) {
    const stVerifiedCount = questions.filter((q) => q.stVerified).length;
    updatePreview(idx, {
      questions,
      selectedCount: questions.length,
      stVerifiedCount,
      otherCount: questions.length - stVerifiedCount,
      qbSources: summarizeQbSources(questions),
    });
  }

  function removeQuestionFromPreview(idx, qId) {
    replacePreviewQuestions(idx, previews[idx].questions.filter((q) => q.id !== qId));
  }

  async function openAddFromQb(idx, qbName) {
    if (!token.trim()) { setError("Paste an Examly bearer token first."); return; }
    if (!qbName?.trim()) return;
    setError("");
    setAddQbTarget({ previewIdx: idx, qbName });
    setAddQbPool([]);
    setAddQbSelectedIds(new Set());
    setStatus(`Fetching questions from "${qbName}"...`);
    try {
      const qb = await findQuestionBankByName({ token, departmentIds: UNIVERSITY_DEPARTMENT_IDS, qbName });
      if (!qb) { setError(`QB "${qbName}" was not found on Examly.`); setAddQbTarget(null); setStatus(""); return; }

      const fetched = await fetchQuestionsForQb({ token, qb, techStack, topic: topics.join(", "), compiler });
      const existingIds = new Set(previews[idx].questions.map((q) => q.id));
      setAddQbPool(fetched.filter((q) => !existingIds.has(q.id)));
      setStatus("");
    } catch (err) {
      setError(err.message || "Failed to fetch questions.");
      setAddQbTarget(null);
      setStatus("");
    }
  }

  function toggleAddQbSelected(qId) {
    setAddQbSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
  }

  function cancelAddFromQb() {
    setAddQbTarget(null);
    setAddQbPool([]);
    setAddQbSelectedIds(new Set());
  }

  function confirmAddFromQb() {
    const { previewIdx } = addQbTarget;
    const toAdd = addQbPool
      .filter((q) => addQbSelectedIds.has(q.id))
      .map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionHtml: q.raw?.question_data || null,
        questionType: q.questionType,
        qbName: q.qbName,
        stVerified: isStVerified(q),
        topic: topics.join(", "),
        compiler: q.compiler || compiler || null,
      }));

    replacePreviewQuestions(previewIdx, [...previews[previewIdx].questions, ...toAdd]);
    updatePreview(previewIdx, { addQbDraft: "" });
    cancelAddFromQb();
  }

  // ── "Full Preview" expand — reuses/populates detailCache ────────────────
  async function toggleQuestionPreview(q) {
    if (expandedQId === q.id) { setExpandedQId(null); return; }
    setExpandedQId(q.id);
    if (detailCache[q.id] || !CODING_TYPE_RE.test(q.questionType || "")) return;

    setDetailLoadingQId(q.id);
    try {
      const detail = await fetchProgrammingQuestionDetail({ token, qId: q.id });
      setDetailCache((prev) => ({ ...prev, [q.id]: detail }));
    } catch (err) {
      setDetailCache((prev) => ({ ...prev, [q.id]: { error: err.message || "Failed to load full detail." } }));
    } finally {
      setDetailLoadingQId(null);
    }
  }

  // ── PDF — enrich COD questions with full detail (reusing detailCache),
  //    fetch whatever's missing with limited concurrency, THEN download ────
  async function fetchDetailsWithConcurrency(ids, concurrency) {
    const results = {};
    let cursor = 0;
    async function worker() {
      while (cursor < ids.length) {
        const qId = ids[cursor++];
        try {
          results[qId] = await fetchProgrammingQuestionDetail({ token, qId });
        } catch (err) {
          results[qId] = { error: err.message || "Failed to load detail." };
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
    return results;
  }

  async function handleDownloadPdf(idx) {
    const p = previews[idx];
    if (!p) return;
    setError("");
    setPdfGeneratingIndex(idx);
    try {
      const codIds = p.questions.filter((q) => CODING_TYPE_RE.test(q.questionType || "")).map((q) => q.id);
      const missingIds = codIds.filter((id) => !detailCache[id]);

      let mergedCache = detailCache;
      if (missingIds.length) {
        if (!token.trim()) { setError("Paste an Examly bearer token first — needed to fetch full COD details for the PDF."); setPdfGeneratingIndex(null); return; }
        setStatus(`Preparing PDF — fetching full details for ${missingIds.length} question(s)...`);
        const fetched = await fetchDetailsWithConcurrency(missingIds, DETAIL_FETCH_CONCURRENCY);
        mergedCache = { ...detailCache, ...fetched };
        setDetailCache(mergedCache); // reused by the on-screen accordion too
      }

      const enrichedQuestions = p.questions.map((q) => {
        const d = mergedCache[q.id];
        return d && !d.error ? { ...q, detail: d } : q;
      });

      setStatus("Generating PDF...");
      const res = await fetch(apiConfig.TESTPACK_PDF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, questions: enrichedQuestions }),
      });
      if (!res.ok) throw new Error("PDF generation failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(p.testName || "test-preview").replace(/[^\w-]+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus("");
    } catch (err) {
      setError(err.message || "PDF download failed.");
      setStatus("");
    } finally {
      setPdfGeneratingIndex(null);
    }
  }

  // ── Create Test ──────────────────────────────────────────────────────────
  async function handleCreateTest(idx) {
    const p = previews[idx];
    if (!p) return;
    if (!token.trim()) { setError("Paste an Examly bearer token first."); return; }
    setCreatingIndex(idx);
    setCreateResults((prev) => ({ ...prev, [idx]: null }));
    setError("");
    try {
      const result = await createTest({
        token,
        testName: p.testName,
        bdId: [bdIdOption],
        createdBy: "TestPacking",
        sectionName: p.sectionName,
        duration: p.duration,
        questionIds: p.questions.map((q) => q.id),
        publish: publishOnCreate,
      });
      setCreateResults((prev) => ({ ...prev, [idx]: { testId: result.testId, published: result.published } }));
    } catch (err) {
      setCreateResults((prev) => ({ ...prev, [idx]: { error: err.message || "Test creation failed.", testId: err.testId } }));
    } finally {
      setCreatingIndex(null);
    }
  }

  function removePreview(idx) {
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
    setCreateResults((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (i < idx) next[i] = v; else if (i > idx) next[i - 1] = v;
      });
      return next;
    });
    setActivePreviewIdx((cur) => Math.max(0, Math.min(cur, previews.length - 2)));
  }

  const manualSelectedCount = manualSelectedIds.size;
  const currentStepNum = ui === "welcome" ? 1 : step;

  return (
    <div className="tp-root">
      <div className="tp-topbar">
        <div>
          <h1 className="tp-title">Test Packing</h1>
          <p className="tp-subtitle">Assemble tests from the Question Bank — automatically or by hand</p>
        </div>
      </div>

      <Stepper current={currentStepNum} />

      {ui === "welcome" && (
        <div className="tp-card tp-welcome">
          <h2 className="tp-welcome-title">Connect to Examly</h2>
          <p className="tp-muted">Paste your Authorization token to continue.</p>
          <textarea
            className="tp-input tp-mono-input"
            rows={3}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your Authorization token here..."
          />
          <div className="tp-actions-row">
            <button className="tp-btn tp-btn--primary" onClick={saveToken}>Continue</button>
          </div>
          {error && <p className="tp-alert tp-alert--error">{error}</p>}
          <p className="tp-hint">Token is saved locally in this browser for this tool only.</p>
        </div>
      )}

      {ui === "app" && step === 2 && (
        <ConfigStep
          {...{
            mode, setMode, techStack, setTechStack, techStacks, loadingStacks,
            topics, topicDraft, setTopicDraft, handleTopicKeyDown, removeTopic,
            compiler, setCompiler, questionType, setQuestionType,
            sectionName, setSectionName, duration, setDuration,
            testName, setTestName, requiredCount, setRequiredCount,
            testCount, setTestCount, publishOnCreate, setPublishOnCreate,
            bdIdOption, setBdIdOption,
            status, error, onSubmit: handleFindQuestionBanks,
          }}
        />
      )}

      {ui === "app" && step === 3 && (
        <QbSelectStep
          {...{
            candidates, filteredCandidates, selectedQbIdx, toggleQbSelected,
            selectAllQbs, clearAllQbs, qbFilterText, setQbFilterText,
            requiredCount, selectedQbAvailableCount,
            status, error, onBack: () => setStep(2), onSubmit: handleFetchAndPack,
          }}
        />
      )}

      {ui === "app" && step === 4 && mode === "automatic" && (
        <div className="tp-card tp-progress-card">
          <div className="tp-spinner" />
          <p className="tp-progress-text">{status || "Packing your test(s)..."}</p>
          {error && <p className="tp-alert tp-alert--error">{error}</p>}
        </div>
      )}

      {ui === "app" && step === 4 && mode === "manual" && (
        <ManualSelectStep
          {...{
            manualPool, manualSelectedIds, toggleManualQuestion, manualSelectedCount,
            status, error, onBack: () => setStep(3), onSubmit: handleBuildManualPreview,
          }}
        />
      )}

      {ui === "app" && step === 5 && previews.length > 0 && (
        <ReviewStep
          {...{
            previews, activePreviewIdx, setActivePreviewIdx,
            updatePreview, removeQuestionFromPreview, removePreview,
            openAddFromQb, toggleAddQbSelected, confirmAddFromQb, cancelAddFromQb,
            addQbTarget, addQbPool, addQbSelectedIds, status,
            expandedQId, detailLoadingQId, detailCache, toggleQuestionPreview,
            creatingIndex, pdfGeneratingIndex, createResults,
            onDownloadPdf: handleDownloadPdf, onCreateTest: handleCreateTest,
            onBack: () => setStep(mode === "manual" ? 4 : 3),
            error,
          }}
        />
      )}
    </div>
  );
}

// ── Stepper ─────────────────────────────────────────────────────────────
function Stepper({ current }) {
  return (
    <div className="tp-stepper">
      {STEPS.map((s, i) => (
        <div className="tp-stepper-item" key={s.n}>
          <div className={`tp-step ${current === s.n ? "tp-step--active" : ""} ${current > s.n ? "tp-step--done" : ""}`}>
            <span className="tp-step-circle">{current > s.n ? "✓" : s.n}</span>
            <span className="tp-step-label">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <span className={`tp-step-connector ${current > s.n ? "tp-step-connector--done" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

// ── Step 2 — Configuration ────────────────────────────────────────────────
function ConfigStep(props) {
  const {
    mode, setMode, techStack, setTechStack, techStacks, loadingStacks,
    topics, topicDraft, setTopicDraft, handleTopicKeyDown, removeTopic,
    compiler, setCompiler, questionType, setQuestionType,
    sectionName, setSectionName, duration, setDuration,
    testName, setTestName, requiredCount, setRequiredCount,
    testCount, setTestCount, publishOnCreate, setPublishOnCreate,
    bdIdOption, setBdIdOption,
    status, error, onSubmit,
  } = props;

  return (
    <div className="tp-card">
      <div className="tp-card-head">
        <h2 className="tp-card-title">Test Configuration</h2>
        <div className="tp-segmented">
          <button className={`tp-segmented-btn ${mode === "automatic" ? "tp-segmented-btn--active" : ""}`} onClick={() => setMode("automatic")}>Automatic</button>
          <button className={`tp-segmented-btn ${mode === "manual" ? "tp-segmented-btn--active" : ""}`} onClick={() => setMode("manual")}>Manual</button>
        </div>
      </div>

      <div className="tp-form-grid">
        <div className="tp-field">
          <label className="tp-label">University</label>
          <select className="tp-input" value={bdIdOption.value} onChange={(e) => setBdIdOption(UNIVERSITY_B_D_ID_OPTIONS.find((o) => o.value === e.target.value))}>
            {UNIVERSITY_B_D_ID_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="tp-field">
          <label className="tp-label">Technology Stack</label>
          <select className="tp-input" value={techStack} onChange={(e) => setTechStack(e.target.value)} disabled={loadingStacks}>
            <option value="">{loadingStacks ? "Loading..." : "Select tech stack"}</option>
            {techStacks.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="tp-field tp-field--wide">
          <label className="tp-label">Topics</label>
          <div className="tp-chip-input">
            {topics.map((t) => (
              <span key={t} className="tp-topic-chip">
                {t}
                <button type="button" onClick={() => removeTopic(t)} aria-label={`Remove ${t}`}>✕</button>
              </span>
            ))}
            <input
              className="tp-chip-input-field"
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
              onKeyDown={handleTopicKeyDown}
              placeholder={topics.length ? "Add another..." : "Type a topic, press Enter"}
            />
          </div>
          {topics.length > 1 && <p className="tp-hint">Each test gets an even split across all {topics.length} topics.</p>}
        </div>
        <div className="tp-field">
          <label className="tp-label">Compiler / Language</label>
          <input className="tp-input" value={compiler} onChange={(e) => setCompiler(e.target.value)} placeholder="Optional — e.g. Python" />
        </div>
        <div className="tp-field">
          <label className="tp-label">Question Type</label>
          <input className="tp-input" value={questionType} onChange={(e) => setQuestionType(e.target.value)} placeholder="Optional — e.g. MCQ, COD" />
        </div>
        <div className="tp-field">
          <label className="tp-label">Section Name</label>
          <input className="tp-input" value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder={techStack || "e.g. Python"} />
        </div>
        <div className="tp-field">
          <label className="tp-label">Duration (minutes)</label>
          <input className="tp-input" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="tp-field">
          <label className="tp-label">Test Name</label>
          <input className="tp-input" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Defaults to '<stack> - <topic>'" />
        </div>
        <div className="tp-field">
          <label className="tp-label">Questions per Test</label>
          <input className="tp-input" type="number" min="1" value={requiredCount} onChange={(e) => setRequiredCount(e.target.value)} />
        </div>
        {mode === "automatic" && (
          <div className="tp-field">
            <label className="tp-label">Number of Tests</label>
            <input className="tp-input" type="number" min="1" value={testCount} onChange={(e) => setTestCount(e.target.value)} />
          </div>
        )}
      </div>

      {mode === "automatic" && Number(testCount) > 1 && (
        <p className="tp-hint">Packing {testCount} separate tests — no question will repeat across any of them.</p>
      )}

      <label className="tp-checkbox-row">
        <input type="checkbox" checked={publishOnCreate} onChange={(e) => setPublishOnCreate(e.target.checked)} />
        Publish on creation (unchecked leaves the test as a draft)
      </label>

      <div className="tp-actions-row">
        <button className="tp-btn tp-btn--primary" onClick={onSubmit} disabled={!!status}>
          {status || "Find Question Banks"}
        </button>
      </div>
      {error && <p className="tp-alert tp-alert--error">{error}</p>}
    </div>
  );
}

// ── Step 3 — Select Question Banks ────────────────────────────────────────
function QbSelectStep(props) {
  const {
    candidates, filteredCandidates, selectedQbIdx, toggleQbSelected,
    selectAllQbs, clearAllQbs, qbFilterText, setQbFilterText,
    requiredCount, selectedQbAvailableCount,
    status, error, onBack, onSubmit,
  } = props;

  return (
    <div className="tp-card">
      <div className="tp-card-head">
        <h2 className="tp-card-title">Select Question Banks</h2>
        <span className="tp-count-text">{candidates.length} found</span>
      </div>

      <div className="tp-qb-toolbar">
        <input
          className="tp-input tp-qb-filter"
          value={qbFilterText}
          onChange={(e) => setQbFilterText(e.target.value)}
          placeholder="Filter QBs by name, type, or topic..."
        />
        <div className="tp-qb-toolbar-actions">
          <button className="tp-btn tp-btn--outline tp-btn--sm" onClick={selectAllQbs}>Select All</button>
          <button className="tp-btn tp-btn--outline tp-btn--sm" onClick={clearAllQbs}>Clear All</button>
        </div>
      </div>

      <div className="tp-summary-strip">
        <div><span className="tp-summary-n">{selectedQbIdx.size}</span><span className="tp-summary-l">Selected</span></div>
        <div><span className="tp-summary-n">{selectedQbAvailableCount}</span><span className="tp-summary-l">Available Questions</span></div>
        <div><span className="tp-summary-n">{requiredCount}</span><span className="tp-summary-l">Required</span></div>
      </div>

      <div className="tp-qb-list">
        {filteredCandidates.map(({ c, i }) => (
          <label key={i} className={`tp-qb-row ${selectedQbIdx.has(i) ? "tp-qb-row--selected" : ""}`}>
            <input type="checkbox" checked={selectedQbIdx.has(i)} onChange={() => toggleQbSelected(i)} />
            <div className="tp-qb-row-body">
              <div className="tp-qb-row-name">{c.qbName}</div>
              <div className="tp-qb-row-meta">
                <span className="tp-badge">{c.type}</span>
                <span>{c.techStack}</span>
                <span>{c.count} question{c.count === 1 ? "" : "s"}</span>
                {c.matchedTopic && <span>Matched: {c.matchedTopic}</span>}
                {typeof c.matchScore === "number" && <span className="tp-match-score">score {c.matchScore}</span>}
              </div>
            </div>
          </label>
        ))}
        {!filteredCandidates.length && <p className="tp-muted tp-empty-msg">No QBs match this filter.</p>}
      </div>

      <div className="tp-actions-row">
        <button className="tp-btn tp-btn--ghost" onClick={onBack}>Back</button>
        <button className="tp-btn tp-btn--primary" onClick={onSubmit} disabled={!selectedQbIdx.size || !!status}>
          {status || `Fetch Questions from Selected QBs (${selectedQbIdx.size})`}
        </button>
      </div>
      {error && <p className="tp-alert tp-alert--error">{error}</p>}
    </div>
  );
}

// ── Step 4 (manual) — hand-select from the fetched pool ──────────────────
function ManualSelectStep(props) {
  const { manualPool, manualSelectedIds, toggleManualQuestion, manualSelectedCount, status, error, onBack, onSubmit } = props;

  return (
    <div className="tp-card">
      <div className="tp-card-head">
        <h2 className="tp-card-title">Select Questions</h2>
        <span className="tp-count-text">{manualSelectedCount} of {manualPool.length} selected</span>
      </div>

      {status && <p className="tp-alert tp-alert--info">{status}</p>}

      <div className="tp-qcard-list">
        {manualPool.map((q) => (
          <label key={q.id} className={`tp-qcard tp-qcard--selectable ${manualSelectedIds.has(q.id) ? "tp-qcard--selected" : ""}`}>
            <input type="checkbox" checked={manualSelectedIds.has(q.id)} onChange={() => toggleManualQuestion(q.id)} />
            <div className="tp-qcard-body">
              <div className="tp-qcard-title">{q.questionText}</div>
              <div className="tp-qcard-meta">
                <span>{q.questionType}</span>
                <span>{q.qbName}</span>
                {isStVerified(q) && <span className="tp-badge tp-badge--verified">ST Verified</span>}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="tp-actions-row">
        <button className="tp-btn tp-btn--ghost" onClick={onBack}>Back</button>
        <button className="tp-btn tp-btn--primary" onClick={onSubmit} disabled={!manualSelectedCount}>
          Build Preview ({manualSelectedCount})
        </button>
      </div>
      {error && <p className="tp-alert tp-alert--error">{error}</p>}
    </div>
  );
}

// ── Step 5 — Review (two-column workspace) ────────────────────────────────
function ReviewStep(props) {
  const {
    previews, activePreviewIdx, setActivePreviewIdx,
    updatePreview, removeQuestionFromPreview, removePreview,
    openAddFromQb, toggleAddQbSelected, confirmAddFromQb, cancelAddFromQb,
    addQbTarget, addQbPool, addQbSelectedIds, status,
    expandedQId, detailLoadingQId, detailCache, toggleQuestionPreview,
    creatingIndex, pdfGeneratingIndex, createResults,
    onDownloadPdf, onCreateTest, onBack, error,
  } = props;

  const idx = activePreviewIdx;
  const preview = previews[idx];
  const createResult = createResults[idx];
  if (!preview) return null;

  return (
    <div>
      {previews.length > 1 && (
        <div className="tp-preview-tabs">
          {previews.map((p, i) => (
            <button key={i} className={`tp-preview-tab ${i === idx ? "tp-preview-tab--active" : ""}`} onClick={() => setActivePreviewIdx(i)}>
              {p.testName || `Test ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="tp-review-grid">
        {/* Left — question cards */}
        <div className="tp-review-main">
          <div className="tp-card">
            <div className="tp-card-head">
              <h2 className="tp-card-title">Questions</h2>
              <span className="tp-count-text">{preview.selectedCount}</span>
            </div>

            {preview.warning && <p className="tp-alert tp-alert--warning">{preview.warning}</p>}

            <div className="tp-qcard-list">
              {preview.questions.map((q, i) => {
                const isExpanded = expandedQId === q.id;
                const isLoadingDetail = detailLoadingQId === q.id;
                const detail = detailCache[q.id];
                return (
                  <div key={q.id} className="tp-qcard">
                    <div className="tp-qcard-num">{i + 1}</div>
                    <div className="tp-qcard-body">
                      <div className="tp-qcard-title">{q.questionText}</div>
                      <div className="tp-qcard-meta">
                        <span>{q.questionType}</span>
                        <span>{q.qbName}</span>
                        <span>{q.topic}</span>
                        {q.stVerified && <span className="tp-badge tp-badge--verified">ST Verified</span>}
                      </div>
                      <div className="tp-qcard-btnrow">
                        <button className="tp-btn tp-btn--outline tp-btn--sm" onClick={() => toggleQuestionPreview(q)}>
                          {isExpanded ? "Hide Preview" : "Full Preview"}
                        </button>
                        <button className="tp-btn tp-btn--ghost tp-btn--sm" onClick={() => removeQuestionFromPreview(idx, q.id)}>Remove</button>
                      </div>

                      {isExpanded && (
                        <FullPreview q={q} detail={detail} isLoading={isLoadingDetail} />
                      )}
                    </div>
                  </div>
                );
              })}
              {!preview.questions.length && <p className="tp-muted tp-empty-msg">No questions in this test yet.</p>}
            </div>

            <AddQbSources
              {...{ preview, idx, updatePreview, openAddFromQb, addQbTarget, addQbPool, addQbSelectedIds, toggleAddQbSelected, confirmAddFromQb, cancelAddFromQb, status }}
            />
          </div>
        </div>

        {/* Right — sticky summary */}
        <div className="tp-review-summary">
          <div className="tp-card">
            <div className="tp-field">
              <label className="tp-label">Test Name</label>
              <input className="tp-input" value={preview.testName} onChange={(e) => updatePreview(idx, { testName: e.target.value })} />
            </div>
            <div className="tp-field">
              <label className="tp-label">Section</label>
              <input className="tp-input" value={preview.sectionName} onChange={(e) => updatePreview(idx, { sectionName: e.target.value })} />
            </div>
            <div className="tp-field">
              <label className="tp-label">Duration (min)</label>
              <input className="tp-input" type="number" min="1" value={preview.duration} onChange={(e) => updatePreview(idx, { duration: e.target.value })} />
            </div>

            <div className="tp-summary-divider" />

            <div className="tp-summary-block">
              <div className="tp-summary-row"><span>Technology</span><strong>{preview.techStack}</strong></div>
              <div className="tp-summary-row"><span>Topic</span><strong>{preview.topic}</strong></div>
              <div className="tp-summary-row"><span>Compiler</span><strong>{preview.compiler}</strong></div>
            </div>

            <div className="tp-summary-divider" />

            <div className="tp-summary-stats">
              <div><span className="tp-summary-n">{preview.selectedCount}</span><span className="tp-summary-l">Questions</span></div>
              <div><span className="tp-summary-n">{preview.stVerifiedCount}</span><span className="tp-summary-l">ST Verified</span></div>
              <div><span className="tp-summary-n">{preview.otherCount}</span><span className="tp-summary-l">Other</span></div>
            </div>

            <div className="tp-summary-divider" />

            <div className="tp-qb-sources-title">QB Sources</div>
            <ul className="tp-summary-sources">
              {preview.qbSources.map((s, i) => <li key={i}><span>{s.qbName}</span><span>{s.count}</span></li>)}
            </ul>

            <div className="tp-summary-actions">
              <button className="tp-btn tp-btn--outline" onClick={() => onDownloadPdf(idx)} disabled={pdfGeneratingIndex === idx}>
                {pdfGeneratingIndex === idx ? (status || "Preparing PDF...") : "Download PDF"}
              </button>
              <button className="tp-btn tp-btn--primary" onClick={() => onCreateTest(idx)} disabled={creatingIndex === idx}>
                {creatingIndex === idx ? "Creating..." : "Create Test"}
              </button>
              <button className="tp-btn tp-btn--ghost tp-btn--sm" onClick={onBack}>Back</button>
              {previews.length > 1 && <button className="tp-btn tp-btn--ghost tp-btn--sm" onClick={() => removePreview(idx)}>Remove this test</button>}
            </div>

            {createResult?.testId && !createResult.error && (
              <p className="tp-alert tp-alert--success">
                Test created{createResult.published ? " and published" : " (draft)"}. ID: {createResult.testId}
              </p>
            )}
            {createResult?.error && (
              <p className="tp-alert tp-alert--error">
                {createResult.error}
                {createResult.testId && ` (draft test ${createResult.testId} was created but may be incomplete — check Examly)`}
              </p>
            )}
            {error && <p className="tp-alert tp-alert--error">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function FullPreview({ q, detail, isLoading }) {
  return (
    <div className="tp-full-preview">
      {q.questionHtml && <div className="tp-full-preview-html" dangerouslySetInnerHTML={{ __html: q.questionHtml }} />}
      {isLoading && <p className="tp-alert tp-alert--info">Loading full question detail...</p>}
      {detail?.error && <p className="tp-alert tp-alert--error">{detail.error}</p>}

      {detail && !detail.error && (
        <div className="tp-full-preview-detail">
          {detail.inputFormat && <FullPreviewSection label="Input Format" html={detail.inputFormat} />}
          {detail.outputFormat && <FullPreviewSection label="Output Format" html={detail.outputFormat} />}
          {detail.codeConstraints && <FullPreviewSection label="Constraints" html={detail.codeConstraints} />}
          {detail.sampleIO?.length > 0 && (
            <div className="tp-full-preview-section">
              <div className="tp-full-preview-label">Sample I/O</div>
              {detail.sampleIO.map((s, si) => (
                <div key={si} className="tp-io-row">
                  <code>In: {s.input}</code>
                  <code>Out: {s.output}</code>
                </div>
              ))}
            </div>
          )}
          {detail.testcases?.length > 0 && (
            <div className="tp-full-preview-section">
              <div className="tp-full-preview-label">Testcases ({detail.testcases.length})</div>
              {detail.testcases.map((tc, ti) => (
                <div key={ti} className="tp-io-row">
                  <code>In: {tc.input}</code>
                  <span className="tp-badge">{tc.difficulty} • {tc.score} pts</span>
                </div>
              ))}
            </div>
          )}
          {detail.solutions?.length > 0 && detail.solutions.map((s, sxi) => (
            <div key={sxi} className="tp-full-preview-section">
              <div className="tp-full-preview-label">Reference Solution{s.language ? ` (${s.language})` : ""}</div>
              <pre className="tp-code-block">{s.code}</pre>
            </div>
          ))}
          {detail.languages?.length > 0 && (
            <div className="tp-full-preview-section">
              <div className="tp-full-preview-label">Supported Languages</div>
              <div className="tp-languages-row">{detail.languages.join(", ")}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FullPreviewSection({ label, html }) {
  return (
    <div className="tp-full-preview-section">
      <div className="tp-full-preview-label">{label}</div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function AddQbSources(props) {
  const { preview, idx, updatePreview, openAddFromQb, addQbTarget, addQbPool, addQbSelectedIds, toggleAddQbSelected, confirmAddFromQb, cancelAddFromQb, status } = props;

  return (
    <div className="tp-add-qb">
      <div className="tp-qb-sources-title">QB Sources</div>
      <ul className="tp-source-list">
        {preview.qbSources.map((s, i) => (
          <li key={i}>
            <span>{s.qbName}</span>
            <span className="tp-source-right">
              {s.count}
              <button className="tp-btn tp-btn--outline tp-btn--sm" onClick={() => openAddFromQb(idx, s.qbName)}>Add More</button>
            </span>
          </li>
        ))}
      </ul>

      <div className="tp-add-qb-row">
        <input
          className="tp-input"
          value={preview.addQbDraft || ""}
          onChange={(e) => updatePreview(idx, { addQbDraft: e.target.value })}
          placeholder="Add questions from a different QB by name..."
        />
        <button className="tp-btn tp-btn--outline" onClick={() => openAddFromQb(idx, preview.addQbDraft)} disabled={!preview.addQbDraft?.trim()}>
          Search
        </button>
      </div>

      {addQbTarget?.previewIdx === idx && (
        <div className="tp-add-qb-panel">
          <div className="tp-add-qb-panel-head">
            <span>Add from &quot;{addQbTarget.qbName}&quot;</span>
            <button className="tp-btn tp-btn--ghost tp-btn--sm" onClick={cancelAddFromQb}>Close</button>
          </div>
          {addQbPool.length === 0 ? (
            <p className="tp-muted">{status || "No additional questions found in this QB."}</p>
          ) : (
            <>
              <div className="tp-qcard-list">
                {addQbPool.map((q) => (
                  <label key={q.id} className={`tp-qcard tp-qcard--selectable ${addQbSelectedIds.has(q.id) ? "tp-qcard--selected" : ""}`}>
                    <input type="checkbox" checked={addQbSelectedIds.has(q.id)} onChange={() => toggleAddQbSelected(q.id)} />
                    <div className="tp-qcard-body">
                      <div className="tp-qcard-title">{q.questionText}</div>
                      <div className="tp-qcard-meta">
                        <span>{q.questionType}</span>
                        {isStVerified(q) && <span className="tp-badge tp-badge--verified">ST Verified</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="tp-actions-row">
                <button className="tp-btn tp-btn--primary" onClick={confirmAddFromQb} disabled={!addQbSelectedIds.size}>
                  Add Selected ({addQbSelectedIds.size})
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
