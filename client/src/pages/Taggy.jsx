// src/pages/Taggy.jsx
//
// Bulk tag updater, with two ways to find the questions to tag — DIFFERENT
// question types are supported depending on which one, by design:
//   1. Search by QB name (reuses searchQuestionBanksByName/fetchQuestionsForQb,
//      the same functions CODMedia.jsx already uses) — supports BOTH
//      COD/programming (programming_question) and MCQ (mcq_question). A QB's
//      own question list DOES carry a reliable per-question `question_type`,
//      so each question is routed directly to the matching fetch via
//      classifyQuestionType/fetchQuestionByHint — no guessing needed here.
//   2. Search by Test name (searchTestsByName -> fetchTestDetail ->
//      extractTestSections) — COD/programming ONLY. MCQ support here was
//      tried and dropped: a test's own per-question data (itemsById) has
//      real text but no `tags` field at all, and the single-id mcq_question
//      GET needed to fill that gap kept disagreeing with other test
//      endpoints on which fields even exist — too fragile to keep. A
//      section's own NAME is NOT a reliable type signal either way
//      (confirmed: a section literally named "Programming" can hold
//      questions Examly's own authoring UI calls "MCQ - Single Correct") —
//      classifyTestListItemType reads the test's own declared/nested type per
//      question instead, and buildTestInitialItems/excludeMcqFromSections
//      drop anything that comes back MCQ before it's ever shown or fetched.
//      An id with no recognizable type is still attempted (codOnly
//      fetchQuestionByHint fails outright if it isn't genuinely programming,
//      rather than ever falling back to mcq_question).
//
// Flow is a 3-step wizard — "search" -> "candidates" -> "results" — each
// step fully REPLACES the previous one (no vertical stacking), with a Back
// button one step at a time, matching CODMedia's view-switching pattern.
//
// Tag updates go through the per-type build+update pair already hardened
// against each endpoint's real-world quirks — only `tags` is actually
// changed, and (see computeNewTags) a tag that case-insensitively matches one
// the question already has is skipped rather than duplicated.
import { useState } from "react";
import {
  searchQuestionBanksByName,
  fetchQuestionsForQb,
  searchTestsByName,
  fetchTestDetail,
  extractTestSections,
  classifyTestListItemType,
  fetchQuestionByHint,
  buildQuestionUpdatePayload,
  updateProgrammingQuestion,
  buildMcqUpdatePayload,
  updateMcqQuestion,
  extractQuestionText,
  classifyQuestionType,
  normalizeMcqListItem,
} from "../services/examlyQbClient";
import { useGlobalToken } from "../context/useGlobalToken";
import { DEPARTMENT_IDS } from "../config";
import { UNIVERSITY_DEPARTMENT_IDS } from "../configUniversity";
import "./Taggy.css";

const FETCH_BATCH_SIZE = 3; // how many question-detail fetches run concurrently per batch
const FETCH_BATCH_COOLDOWN_MS = 700; // pause between batches, easing load on Examly's API
const APPLY_CONCURRENCY = 3;
const MAX_BATCH_SOURCES = 10; // max QB/Test names a single Batch run resolves

/** One name per line, trimmed, deduped, capped at MAX_BATCH_SOURCES — the live counter in the UI uses this same parse so what's shown always matches what Process All will actually do. */
function parseBatchNames(input) {
  return [...new Set(input.split("\n").map((n) => n.trim()).filter(Boolean))].slice(0, MAX_BATCH_SOURCES);
}

const STEPS = [
  { key: "search", label: "Find source" },
  { key: "candidates", label: "Pick exact match" },
  { key: "results", label: "Update tags" },
];

/** Tag storage shape differs by type: programming nests under learning/answer, mcq keeps a flat top-level array. */
function currentTags(raw, qType) {
  if (!raw) return [];
  const list = qType === "mcq" ? raw.tags : (raw.learning?.tags || raw.answer?.tags);
  return (list || []).map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean);
}

function parseTagInput(input) {
  return [...new Set(input.split(",").map((t) => t.trim()).filter(Boolean))];
}

/**
 * Build fetchDetailsFor's `initial` items for a batch of test-sourced ids —
 * COD/programming only (Test search no longer handles MCQ at all; use QB
 * search for those). An id extractTestSections' itemsById confirms is MCQ is
 * dropped before it ever reaches a fetch; an id with no recognizable type is
 * still attempted (codOnly fetchQuestionByHint fails outright if it turns
 * out not to be genuinely programming, rather than falling back to mcq).
 * Seeded with the item's real question text up front so the UI never shows
 * blank while its own per-id fetch is in flight.
 */
function buildTestInitialItems(ids, itemsMap) {
  return ids
    .filter((id) => classifyTestListItemType(itemsMap.get(id)) !== "mcq")
    .map((id) => {
      const item = itemsMap.get(id);
      const typeHint = classifyTestListItemType(item);
      const questionText = item ? extractQuestionText(item.question_data) : "";
      return { id, raw: null, loading: true, error: null, typeHint, questionText, codOnly: true };
    });
}

/** Drops confirmed-MCQ ids from every section (Test search is COD-only) and drops any section left with nothing. Section counts shown in the UI reflect only what's actually attempted here. */
function excludeMcqFromSections(sections, itemsById) {
  return sections
    .map((s) => ({ name: s.name, ids: s.ids.filter((id) => classifyTestListItemType(itemsById.get(id)) !== "mcq") }))
    .filter((s) => s.ids.length > 0);
}

/**
 * "Add" mode skips any tag the question already has — case-insensitively, so
 * "stverified" doesn't get duplicated alongside an existing "STVerified" —
 * and keeps the existing tag's original casing rather than the input's.
 * Confirmed requirement: a batch tagged "stverified,tverified,v4" against a
 * question that already has stverified+tverified should only add v4.
 */
function computeNewTags(existingTags, tagsToApply, mode) {
  if (mode === "replace") return [...new Set(tagsToApply)];

  const seen = new Set();
  const result = [];
  [...existingTags, ...tagsToApply].forEach((t) => {
    const key = t.toLowerCase();
    if (!seen.has(key)) { seen.add(key); result.push(t); }
  });
  return result;
}

/** Shown whenever an async step is in flight — a determinate progress bar once there's a real done/total count (fetchDetailsFor), an indeterminate shimmer otherwise (e.g. the initial search/test-detail call). */
function Loader({ message, progress }) {
  const hasProgress = progress && progress.total > 0;
  const pct = hasProgress ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="tgy-loader">
      <div className="tgy-loader-ring" />
      <div className="tgy-loader-body">
        <p className="tgy-loader-text">{message}</p>
        <div className={`tgy-loader-track ${hasProgress ? "" : "tgy-loader-track--indeterminate"}`}>
          <div className="tgy-loader-fill" style={hasProgress ? { width: `${pct}%` } : undefined} />
        </div>
        {hasProgress && <span className="tgy-loader-count">{progress.done}/{progress.total}</span>}
      </div>
    </div>
  );
}

function Stepper({ current }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="tgy-stepper">
      {STEPS.map((s, i) => (
        <div key={s.key} className={`tgy-step ${i === idx ? "tgy-step--active" : i < idx ? "tgy-step--done" : ""}`}>
          <span className="tgy-step-dot">{i < idx ? "✓" : i + 1}</span>
          <span className="tgy-step-label">{s.label}</span>
          {i < STEPS.length - 1 && <span className="tgy-step-line" />}
        </div>
      ))}
    </div>
  );
}

export default function Taggy() {
  const { token } = useGlobalToken();

  const [view, setView] = useState("search"); // "search" | "candidates" | "results"
  const [orgType, setOrgType] = useState("university");
  const [method, setMethod] = useState("qb"); // "qb" | "test"

  const [inputMode, setInputMode] = useState("single"); // "single" | "batch"
  const [qbName, setQbName] = useState("");
  const [qbCandidates, setQbCandidates] = useState(null);
  const [testName, setTestName] = useState("");
  const [testCandidates, setTestCandidates] = useState(null);
  const [batchInput, setBatchInput] = useState(""); // batch mode: one QB/Test name per line
  const [batchIssues, setBatchIssues] = useState([]); // [{name, message}] — names that were skipped and why

  const [sourceLabel, setSourceLabel] = useState("");
  const [testSections, setTestSections] = useState([]); // [{name, ids}] — ALL sections, test-method only
  const [testQuestionsById, setTestQuestionsById] = useState(() => new Map()); // id -> rich item from extractTestSections' itemsById, test-method only
  const [checkedSections, setCheckedSections] = useState(() => new Set()); // names of sections currently included in the fetch
  const [status, setStatus] = useState("");
  const [fetchProgress, setFetchProgress] = useState({ done: 0, total: 0 }); // drives the loader's progress bar during fetchDetailsFor
  const [error, setError] = useState("");

  const [questions, setQuestions] = useState([]); // {id, questionText, raw, loading, error}
  const [selected, setSelected] = useState(() => new Set());

  // ── Tag update popup ────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState("idle"); // "idle" | "confirm" | "running" | "done"
  const [tagInput, setTagInput] = useState("");
  const [tagMode, setTagMode] = useState("add"); // "add" | "replace"
  const [tagTargets, setTagTargets] = useState([]);
  const [applyResults, setApplyResults] = useState({}); // {[id]: {status, message}}
  const [applyDone, setApplyDone] = useState(0);

  const departmentIds = orgType === "university" ? UNIVERSITY_DEPARTMENT_IDS : DEPARTMENT_IDS;
  const readyQuestions = questions.filter((q) => !q.loading && !q.error && q.raw);
  const selectedQuestions = readyQuestions.filter((q) => selected.has(q.id));
  const allReadySelected = readyQuestions.length > 0 && selectedQuestions.length === readyQuestions.length;
  const tagsToApply = parseTagInput(tagInput);
  const distinctSources = new Set(questions.map((q) => q.sourceLabel).filter(Boolean)).size;

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllReady() { setSelected(new Set(readyQuestions.map((q) => q.id))); }
  function selectNone() { setSelected(new Set()); }

  /** Wipes the fetched-questions step only — NOT the candidate list, so "Back" from results still shows every match from the original search, not just the one picked. */
  function resetAllDownstream() {
    setQuestions([]);
    setSelected(new Set());
    setApplyResults({});
    setTestSections([]);
    setTestQuestionsById(new Map());
    setCheckedSections(new Set());
    setSourceLabel("");
    setBatchIssues([]);
    setError("");
    setStatus("");
    setFetchProgress({ done: 0, total: 0 });
  }

  /** Full wipe, including the candidate list — used when the search itself changes (method/org), since a QB result list is meaningless once you're searching tests instead, and vice versa. */
  function clearEverything() {
    setQbCandidates(null);
    setTestCandidates(null);
    setBatchInput("");
    resetAllDownstream();
  }

  function switchMethod(next) {
    if (next === method) return;
    setMethod(next);
    clearEverything();
    setView("search");
  }
  function switchOrg(next) {
    if (next === orgType) return;
    setOrgType(next);
    clearEverything();
    setView("search");
  }

  function backToSearch() { setView("search"); }
  /** Batch results have no candidate-picker step to go back to (names are resolved automatically) — go straight to search instead. */
  function backToCandidates() { setView(candidates ? "candidates" : "search"); }

  /** Fetches one question's detail. `q.codOnly` (set only for test-sourced items — see buildTestInitialItems) makes an unrecognized type fail outright instead of falling back to mcq_question, since Test search no longer supports MCQ at all. */
  async function fetchOneDetail(q) {
    if (q.raw) return { raw: q.raw, qType: q.qType }; // already resolved (QB-sourced MCQs — see handleSelectQb)
    return fetchQuestionByHint({ token, qId: q.id, typeHint: q.typeHint, codOnly: q.codOnly });
  }

  /**
   * Batch-and-cooldown instead of one continuous concurrent pool — FETCH_BATCH_SIZE
   * requests at a time, then a pause before the next batch, easing load on
   * Examly's API rather than firing everything at once.
   */
  async function fetchDetailsFor(initial) {
    setQuestions(initial);
    setSelected(new Set(initial.map((q) => q.id)));
    setStatus(`Fetching question detail for ${initial.length} question(s)...`);
    setFetchProgress({ done: 0, total: initial.length });

    let done = 0;
    for (let start = 0; start < initial.length; start += FETCH_BATCH_SIZE) {
      const batch = initial.slice(start, start + FETCH_BATCH_SIZE).map((q, i) => ({ q, myIdx: start + i }));

      await Promise.all(batch.map(async ({ q, myIdx }) => {
        try {
          const { raw: entity, qType } = await fetchOneDetail(q);
          const text = q.questionText || extractQuestionText(entity.learning?.question_data || entity.question_data);
          setQuestions((prev) => {
            const next = [...prev];
            next[myIdx] = { ...next[myIdx], raw: entity, qType, questionText: text, loading: false };
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
          setStatus(`Fetching question detail... ${done}/${initial.length}`);
          setFetchProgress({ done, total: initial.length });
        }
      }));

      if (start + FETCH_BATCH_SIZE < initial.length) {
        await new Promise((resolve) => setTimeout(resolve, FETCH_BATCH_COOLDOWN_MS));
      }
    }
    setStatus("");
    setFetchProgress({ done: 0, total: 0 });
  }

  // ── Method 1: QB search ──────────────────────────────────────────────────
  async function handleSearchQb() {
    const name = qbName.trim();
    if (!name) { setError("Enter a QB name."); return; }
    setError("");
    setStatus(`Searching for "${name}"...`);
    try {
      const banks = await searchQuestionBanksByName({ token, departmentIds, qbName: name });
      setStatus("");
      if (!banks.length) { setError(`No question banks found matching "${name}".`); return; }
      setQbCandidates(banks);
      setView("candidates");
    } catch (err) {
      setError(err.message || "Failed to search."); setStatus("");
    }
  }

  async function handleSelectQb(qb) {
    resetAllDownstream();
    setView("results");
    setSourceLabel(qb.qb_name);
    setStatus(`Fetching questions from "${qb.qb_name}"...`);
    try {
      const fetched = await fetchQuestionsForQb({ token, qb });
      if (!fetched.length) {
        setStatus(""); setError(`QB "${qb.qb_name}" has no questions.`);
        return;
      }
      // QB's own list carries a real per-question question_type, so route
      // each one directly instead of guessing — only COD/MCQ are actually
      // fetchable today; anything else surfaces its own fetch failure below.
      // MCQs skip a per-id fetch entirely — the list item already carries
      // everything needed (see normalizeMcqListItem), so there's no need to
      // depend on a single-id mcq_question GET at all for this path.
      const initial = fetched.map((q) => {
        const typeHint = classifyQuestionType(q.questionType);
        if (typeHint === "mcq") {
          return {
            id: q.id, questionText: q.questionText, error: null, typeHint,
            raw: normalizeMcqListItem(q.raw), qType: "mcq", loading: false,
          };
        }
        return { id: q.id, questionText: q.questionText, raw: null, loading: true, error: null, typeHint };
      });
      await fetchDetailsFor(initial);
    } catch (err) {
      setError(err.message || "Failed to fetch."); setStatus("");
    }
  }

  // ── Method 2: Test search ────────────────────────────────────────────────
  async function handleSearchTest() {
    const name = testName.trim();
    if (!name) { setError("Enter a test name."); return; }
    setError("");
    setStatus(`Searching for "${name}"...`);
    try {
      const tests = await searchTestsByName({ token, departmentIds, testName: name });
      setStatus("");
      if (!tests.length) { setError(`No tests found matching "${name}".`); return; }
      setTestCandidates(tests);
      setView("candidates");
    } catch (err) {
      setError(err.message || "Failed to search."); setStatus("");
    }
  }

  async function handleSelectTest(test) {
    resetAllDownstream();
    setView("results");
    setSourceLabel(test.testName);
    setStatus(`Fetching test "${test.testName}"...`);
    try {
      // fetchTestDetail's response already embeds real per-question data
      // (text + a type-specific key, per item) alongside the section
      // grouping itself — extractTestSections hands both back in one pass,
      // so there's no need for (and, confirmed, no reliability in) a second
      // separate call to re-fetch the same data.
      const detail = await fetchTestDetail({ token, testId: test.testId });
      const { sections: allSections, itemsById } = extractTestSections(detail);
      // Test search is COD-only (MCQ stays QB-search-only) — drop confirmed-MCQ
      // ids and any section left empty by that before anything is shown/fetched.
      const sections = excludeMcqFromSections(allSections, itemsById);
      setTestSections(sections);
      setTestQuestionsById(itemsById);

      if (!allSections.length) {
        setStatus("");
        setError(`Test "${test.testName}" has no question sections.`);
        return;
      }
      if (!sections.length) {
        setStatus("");
        setError(`Test "${test.testName}" has no COD/programming questions — Test search only supports COD (use QB search for MCQ).`);
        return;
      }

      // Every section is attempted — nothing is pre-excluded by the section's
      // own name.
      const allSectionNames = sections.map((s) => s.name);
      setCheckedSections(new Set(allSectionNames));

      const ids = sections.flatMap((s) => s.ids);
      await fetchDetailsFor(buildTestInitialItems(ids, itemsById));
    } catch (err) {
      setError(err.message || "Failed to fetch."); setStatus("");
    }
  }

  function toggleTestSection(name) {
    const next = new Set(checkedSections);
    if (next.has(name)) next.delete(name); else next.add(name);
    setCheckedSections(next);

    const ids = testSections.filter((s) => next.has(s.name)).flatMap((s) => s.ids);
    if (ids.length) {
      fetchDetailsFor(buildTestInitialItems(ids, testQuestionsById));
    } else {
      setQuestions([]);
      setSelected(new Set());
    }
  }

  // ── Method 3: Batch (up to MAX_BATCH_SOURCES QB or Test names, processed one at a time) ──
  /**
   * Resolves each name SEQUENTIALLY (not in parallel) — deliberately, both
   * because an exact-match search followed immediately by fetching that
   * source's questions is the same two-step flow a single search does, and
   * because hammering the search endpoint for 10 names at once has no
   * upside. A name matching anything other than exactly one QB/Test is
   * skipped (recorded in batchIssues) rather than guessed at — ambiguous
   * names still need the single-search picker. Every successfully resolved
   * source's questions are combined into ONE list (tagged with sourceLabel so
   * multi-source results stay distinguishable), then fetched via the same
   * batched-with-cooldown fetchDetailsFor every other path already uses.
   */
  async function handleBatchProcess() {
    const names = parseBatchNames(batchInput);
    if (!names.length) { setError(`Enter at least one ${method === "qb" ? "QB" : "test"} name (one per line).`); return; }
    setError("");
    resetAllDownstream();
    setView("results");

    const combinedInitial = [];
    const issues = [];

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      setStatus(`Resolving ${i + 1}/${names.length}: "${name}"...`);
      try {
        if (method === "qb") {
          const banks = await searchQuestionBanksByName({ token, departmentIds, qbName: name });
          if (!banks.length) { issues.push({ name, message: "No QB found" }); continue; }
          if (banks.length > 1) { issues.push({ name, message: `${banks.length} QBs matched — ambiguous, use Single search to pick one` }); continue; }
          const qb = banks[0];
          const fetched = await fetchQuestionsForQb({ token, qb });
          if (!fetched.length) { issues.push({ name, message: "QB has no questions" }); continue; }
          fetched.forEach((q) => {
            const typeHint = classifyQuestionType(q.questionType);
            if (typeHint === "mcq") {
              combinedInitial.push({
                id: q.id, questionText: q.questionText, error: null, typeHint, sourceLabel: qb.qb_name,
                raw: normalizeMcqListItem(q.raw), qType: "mcq", loading: false,
              });
            } else {
              combinedInitial.push({ id: q.id, questionText: q.questionText, raw: null, loading: true, error: null, typeHint, sourceLabel: qb.qb_name });
            }
          });
        } else {
          const tests = await searchTestsByName({ token, departmentIds, testName: name });
          if (!tests.length) { issues.push({ name, message: "No test found" }); continue; }
          if (tests.length > 1) { issues.push({ name, message: `${tests.length} tests matched — ambiguous, use Single search to pick one` }); continue; }
          const test = tests[0];
          const detail = await fetchTestDetail({ token, testId: test.testId });
          const { sections: allSections, itemsById } = extractTestSections(detail);
          const sections = excludeMcqFromSections(allSections, itemsById);
          if (!allSections.length) { issues.push({ name, message: "Test has no question sections" }); continue; }
          if (!sections.length) { issues.push({ name, message: "No COD/programming questions (Test search is COD-only)" }); continue; }
          const ids = sections.flatMap((s) => s.ids);
          buildTestInitialItems(ids, itemsById).forEach((item) => combinedInitial.push({ ...item, sourceLabel: test.testName }));
        }
      } catch (err) {
        issues.push({ name, message: err.message || "Failed" });
      }
    }

    setBatchIssues(issues);
    setSourceLabel(`Batch — ${names.length - issues.length} of ${names.length} source(s) resolved`);

    if (!combinedInitial.length) {
      setStatus("");
      setError(`No questions found across any of the ${names.length} name(s) provided.`);
      return;
    }
    await fetchDetailsFor(combinedInitial);
  }

  // ── Tag update popup ─────────────────────────────────────────────────────
  function openModal() {
    setTagInput("");
    setTagMode("add");
    setPhase("idle");
    setApplyResults({});
    setApplyDone(0);
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); }

  function handleContinueToConfirm() {
    if (!tagsToApply.length) return;
    setTagTargets(selectedQuestions);
    setPhase("confirm");
  }

  async function runTagUpdate() {
    setPhase("running");
    const pending = {};
    tagTargets.forEach((q) => { pending[q.id] = { status: "pending" }; });
    setApplyResults(pending);
    setApplyDone(0);

    let idx = 0;
    let done = 0;
    async function worker() {
      while (idx < tagTargets.length) {
        const q = tagTargets[idx++];
        try {
          const existing = currentTags(q.raw, q.qType);
          const newTags = computeNewTags(existing, tagsToApply, tagMode);

          if (q.qType === "mcq") {
            const payload = buildMcqUpdatePayload(q.raw);
            payload.tags = newTags;
            await updateMcqQuestion({ token, qId: q.id, payload });
            setQuestions((prev) => prev.map((qq) => (qq.id === q.id
              ? { ...qq, raw: { ...qq.raw, tags: newTags } }
              : qq)));
          } else {
            const payload = buildQuestionUpdatePayload(q.raw);
            payload.tags = newTags;
            await updateProgrammingQuestion({ token, qId: q.id, payload });
            setQuestions((prev) => prev.map((qq) => (qq.id === q.id
              ? { ...qq, raw: { ...qq.raw, learning: { ...qq.raw.learning, tags: newTags.map((name) => ({ name })) } } }
              : qq)));
          }
          setApplyResults((prev) => ({ ...prev, [q.id]: { status: "done" } }));
        } catch (err) {
          setApplyResults((prev) => ({ ...prev, [q.id]: { status: "error", message: err.message || "Failed" } }));
        } finally {
          done++;
          setApplyDone(done);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(APPLY_CONCURRENCY, tagTargets.length) }, worker));
    setPhase("done");
  }

  const appliedDone = Object.values(applyResults).filter((r) => r.status === "done").length;
  const appliedError = Object.values(applyResults).filter((r) => r.status === "error").length;
  const candidates = method === "qb" ? qbCandidates : testCandidates;

  return (
    <div className="tgy-root">
      <div className="tgy-topbar">
        <div>
          <h1 className="tgy-title">Taggy</h1>
          <p className="tgy-subtitle">Bulk-update tags on COD or MCQ questions found by QB, or COD-only by Test name — writes directly to Examly.</p>
        </div>
      </div>

      <Stepper current={view} />

      {view === "search" && (
        <div className="tgy-card tgy-card--hero">
          <div className="tgy-segmented">
            <button className={orgType === "university" ? "tgy-seg-btn tgy-seg-btn--active" : "tgy-seg-btn"} onClick={() => switchOrg("university")}>University</button>
            <button className={orgType === "corporate" ? "tgy-seg-btn tgy-seg-btn--active" : "tgy-seg-btn"} onClick={() => switchOrg("corporate")}>Corporate</button>
          </div>

          <div className="tgy-method-tabs">
            <button className={`tgy-method-tab ${method === "qb" ? "tgy-method-tab--active" : ""}`} onClick={() => switchMethod("qb")}>
              <span className="tgy-method-icon">📚</span>
              <span>
                <strong>Search by QB</strong>
                <small>Find a Question Bank by name</small>
              </span>
            </button>
            <button className={`tgy-method-tab ${method === "test" ? "tgy-method-tab--active" : ""}`} onClick={() => switchMethod("test")}>
              <span className="tgy-method-icon">📝</span>
              <span>
                <strong>Search by Test</strong>
                <small>Find an assessment/test by name</small>
              </span>
            </button>
          </div>

          <div className="tgy-segmented" style={{ marginTop: 4 }}>
            <button className={inputMode === "single" ? "tgy-seg-btn tgy-seg-btn--active" : "tgy-seg-btn"} onClick={() => setInputMode("single")}>Single</button>
            <button className={inputMode === "batch" ? "tgy-seg-btn tgy-seg-btn--active" : "tgy-seg-btn"} onClick={() => setInputMode("batch")}>Batch (up to {MAX_BATCH_SOURCES})</button>
          </div>

          {inputMode === "single" ? (
            method === "qb" ? (
              <>
                <label className="tgy-label">Question Bank name</label>
                <div className="tgy-actions-row">
                  <input className="tgy-input" value={qbName} onChange={(e) => setQbName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchQb()} placeholder="Exact or near QB name..." autoFocus />
                  <button className="tgy-btn tgy-btn--primary" onClick={handleSearchQb} disabled={!!status}>Search QBs</button>
                </div>
              </>
            ) : (
              <>
                <label className="tgy-label">Test name</label>
                <div className="tgy-actions-row">
                  <input className="tgy-input" value={testName} onChange={(e) => setTestName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchTest()} placeholder="Exact or near test name..." autoFocus />
                  <button className="tgy-btn tgy-btn--primary" onClick={handleSearchTest} disabled={!!status}>Search Tests</button>
                </div>
              </>
            )
          ) : (
            <>
              <label className="tgy-label">
                {method === "qb" ? "Question Bank names" : "Test names"} — one per line, up to {MAX_BATCH_SOURCES}.
                A name matching anything other than exactly one {method === "qb" ? "QB" : "test"} is skipped (shown after processing) — use Single search for those.
              </label>
              <textarea className="tgy-input tgy-batch-textarea" value={batchInput} onChange={(e) => setBatchInput(e.target.value)}
                placeholder={method === "qb" ? "QB name 1\nQB name 2\n..." : "Test name 1\nTest name 2\n..."} rows={6} />
              <div className="tgy-actions-row">
                <span className="tgy-muted">{parseBatchNames(batchInput).length}/{MAX_BATCH_SOURCES} name(s) ready</span>
                <button className="tgy-btn tgy-btn--primary" onClick={handleBatchProcess} disabled={!!status || !parseBatchNames(batchInput).length}>
                  Process All
                </button>
              </div>
            </>
          )}
          {status && <Loader message={status} />}
          {error && <p className="tgy-alert tgy-alert--error">{error}</p>}
        </div>
      )}

      {view === "candidates" && candidates && (
        <div className="tgy-card">
          <button className="tgy-back" onClick={backToSearch}>← Back</button>
          <h2 className="tgy-section-title">{candidates.length} {method === "qb" ? "question bank" : "test"}{candidates.length > 1 ? "s" : ""} matched</h2>
          <p className="tgy-muted">The same name can exist in more than one department — pick the right one.</p>
          <div className="tgy-candidate-grid">
            {method === "qb"
              ? candidates.map((qb) => (
                <button key={qb.qb_id} className="tgy-candidate" onClick={() => handleSelectQb(qb)}>
                  <span className="tgy-candidate-name">{qb.qb_name}</span>
                  <span className="tgy-muted">{qb.qb_id}{qb.questionCount != null ? ` · ${qb.questionCount} questions` : ""}</span>
                </button>
              ))
              : candidates.map((t) => (
                <button key={t.testId} className="tgy-candidate" onClick={() => handleSelectTest(t)}>
                  <span className="tgy-candidate-name">{t.testName}</span>
                  <span className="tgy-muted">{t.testCode} · {t.testType}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {view === "results" && (
        <div className="tgy-card">
          <button className="tgy-back" onClick={backToCandidates}>← Back</button>

          <div className="tgy-result-header">
            <div>
              <strong>{sourceLabel}</strong>
              {questions.length > 0 && (
                <span className="tgy-muted">
                  {" "}— {questions.length} question(s) {method === "test" ? "attempted" : "found"}, {readyQuestions.length} ready, {selectedQuestions.length} selected
                </span>
              )}
            </div>
            {questions.length > 0 && (
              <div className="tgy-actions-row">
                <label className="tgy-checkbox">
                  <input type="checkbox" checked={allReadySelected} onChange={(e) => (e.target.checked ? selectAllReady() : selectNone())} />
                  Select all
                </label>
                <button className="tgy-btn tgy-btn--primary" onClick={openModal} disabled={!selectedQuestions.length}>
                  🏷️ Update Tags ({selectedQuestions.length})
                </button>
              </div>
            )}
          </div>

          {batchIssues.length > 0 && (
            <div className="tgy-alert tgy-alert--warn" style={{ display: "block" }}>
              <strong>{batchIssues.length} name(s) skipped:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {batchIssues.map((issue) => <li key={issue.name}>{issue.name} — {issue.message}</li>)}
              </ul>
            </div>
          )}

          {method === "test" && testSections.length > 0 && (
            <div className="tgy-sections-filter">
              <span className="tgy-label" style={{ marginBottom: 0 }}>
                Sections ({testSections.reduce((sum, s) => sum + s.ids.length, 0)} COD/programming question(s) total) —
                Test search only supports COD (use QB search for MCQ); a section's name doesn't reliably indicate
                support either way, so any question that still fails to load shows why below.
              </span>
              <div className="tgy-sections-chips">
                {testSections.map((s) => (
                  <label key={s.name} className="tgy-section-chip">
                    <input
                      type="checkbox"
                      checked={checkedSections.has(s.name)}
                      onChange={() => toggleTestSection(s.name)}
                    />
                    {s.name} ({s.ids.length})
                  </label>
                ))}
              </div>
            </div>
          )}

          {status && <Loader message={status} progress={fetchProgress} />}
          {error && <p className="tgy-alert tgy-alert--error">{error}</p>}

          {questions.length > 0 && (
            <div className="tgy-list">
              {questions.map((q) => {
                const result = applyResults[q.id];
                return (
                  <div className="tgy-q-item" key={q.id}>
                    <input type="checkbox" className="tgy-q-checkbox" checked={selected.has(q.id)}
                      onChange={() => toggleSelected(q.id)} disabled={!q.raw} />
                    <div className="tgy-q-body">
                      <div className="tgy-q-head">
                        <span className="tgy-qid">{q.id}</span>
                        <span className="tgy-qtext">{q.questionText || "..."}</span>
                        {distinctSources > 1 && q.sourceLabel && <span className="tgy-muted">· {q.sourceLabel}</span>}
                        {result && (
                          <span className={`tgy-badge tgy-badge--${result.status}`}>
                            {result.status === "pending" ? "Updating…" : result.status === "done" ? "Updated" : `Failed: ${result.message}`}
                          </span>
                        )}
                      </div>
                      {q.loading && <p className="tgy-muted">Loading...</p>}
                      {q.error && <p className="tgy-alert tgy-alert--error">{q.error}</p>}
                      {q.raw && (
                        <div className="tgy-tags">
                          {currentTags(q.raw, q.qType).length
                            ? currentTags(q.raw, q.qType).map((t) => <span key={t} className="tgy-tag-chip">{t}</span>)
                            : <span className="tgy-muted">No tags</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="tgy-modal-backdrop" onClick={(phase === "idle" || phase === "confirm") ? closeModal : undefined}>
          <div className="tgy-modal" onClick={(e) => e.stopPropagation()}>
            {phase === "idle" && (
              <>
                <h3 className="tgy-modal-title">Update Tags</h3>
                <p className="tgy-muted">Applies to {selectedQuestions.length} selected question(s).</p>
                <label className="tgy-label">Tag(s) — comma separated</label>
                <input className="tgy-input" style={{ width: "100%" }} autoFocus value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleContinueToConfirm()}
                  placeholder="e.g. Recursion, Arrays" />
                <div className="tgy-radio-row">
                  <label><input type="radio" checked={tagMode === "add"} onChange={() => setTagMode("add")} /> Add to existing tags</label>
                  <label><input type="radio" checked={tagMode === "replace"} onChange={() => setTagMode("replace")} /> Replace all tags</label>
                </div>
                <div className="tgy-modal-actions">
                  <button className="tgy-btn tgy-btn--ghost" onClick={closeModal}>Cancel</button>
                  <button className="tgy-btn tgy-btn--primary" disabled={!tagsToApply.length} onClick={handleContinueToConfirm}>Continue</button>
                </div>
              </>
            )}
            {phase === "confirm" && (
              <>
                <h3 className="tgy-modal-title">Confirm update</h3>
                <p className="tgy-alert tgy-alert--warn">
                  Writes directly to {tagTargets.length} live question(s) on Examly — not reversible from here.
                </p>
                <p className="tgy-muted">
                  {tagMode === "replace" ? "Replace all tags with:" : "Add tag(s):"} <strong>{tagsToApply.join(", ")}</strong>
                </p>
                <div className="tgy-modal-actions">
                  <button className="tgy-btn tgy-btn--ghost" onClick={() => setPhase("idle")}>Back</button>
                  <button className="tgy-btn tgy-btn--danger" onClick={runTagUpdate}>Confirm — Update {tagTargets.length}</button>
                </div>
              </>
            )}
            {phase === "running" && (
              <div className="tgy-progress">
                <div className="tgy-spinner" />
                <p>Updating... {applyDone}/{tagTargets.length}</p>
                <div className="tgy-progress-track"><div className="tgy-progress-fill" style={{ width: `${tagTargets.length ? (applyDone / tagTargets.length) * 100 : 0}%` }} /></div>
              </div>
            )}
            {phase === "done" && (
              <>
                <h3 className="tgy-modal-title">Done</h3>
                <p className="tgy-muted">{appliedDone} updated, {appliedError} failed.</p>
                <div className="tgy-modal-actions">
                  <button className="tgy-btn tgy-btn--primary" onClick={closeModal}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
