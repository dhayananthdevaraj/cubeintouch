// client/src/services/examlyQbClient.js
//
// Thin wrapper around Examly's EXISTING question-bank search/fetch endpoints —
// same calls already used by CourseQBFinder.jsx / QBAccessCorporate.jsx
// (POST /api/questionbanks/all to resolve a QB by name, POST
// /api/v2/questionfilter, paginated, to fetch its questions). Reused here
// rather than reinvented, per the Test Packing requirement to build on the
// existing QB search instead of duplicating it.

const API = "https://api.examly.io";

function headersFor(token) {
  return { "Content-Type": "application/json", Authorization: token };
}

// No truncation here on purpose — this feeds both the on-screen preview and
// the downloadable PDF, and both need the COMPLETE question text, not a
// clipped "..." snippet. Row-level compactness in list views (candidate/manual
// pool rows) is handled with CSS line-clamping instead, not by cutting data.
export function extractQuestionText(questionData) {
  if (!questionData) return "No question text";
  return questionData
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\$\$\$examly/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every QB matching a name search — names aren't unique across departments/domains, so callers that need to let the user disambiguate should use this instead of findQuestionBankByName. */
export async function searchQuestionBanksByName({ token, departmentIds, qbName }) {
  const res = await fetch(`${API}/api/questionbanks/all`, {
    method: "POST",
    headers: headersFor(token),
    body: JSON.stringify({
      department_id: departmentIds,
      limit: 20,
      mainDepartmentUser: true,
      page: 1,
      search: qbName,
    }),
  });
  if (!res.ok) throw new Error(`QB search failed for "${qbName}" (HTTP ${res.status})`);
  const json = await res.json();
  return json?.questionbanks || [];
}

/** Resolve an exact/near QB name to its Examly QB object (qb_id, qb_name, ...) */
export async function findQuestionBankByName({ token, departmentIds, qbName }) {
  const banks = await searchQuestionBanksByName({ token, departmentIds, qbName });
  // Prefer an exact (case-insensitive) name match; fall back to the top search result
  return banks.find((b) => (b.qb_name || "").toLowerCase() === qbName.toLowerCase()) || banks[0] || null;
}

/** Fetch ALL questions in a QB (paginated), normalized to the shape qbMatchingService expects */
export async function fetchQuestionsForQb({ token, qb, techStack, topic, compiler }) {
  let allQuestions = [];
  let page = 1;
  const limit = 200;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${API}/api/v2/questionfilter`, {
      method: "POST",
      headers: headersFor(token),
      body: JSON.stringify({ qb_id: qb.qb_id, page, limit, type: "Single" }),
    });
    if (!res.ok) throw new Error(`Failed to fetch questions for QB "${qb.qb_name}" (HTTP ${res.status})`);

    const json = await res.json();
    const questions = json?.non_group_questions || [];
    allQuestions = allQuestions.concat(questions);

    hasMore = questions.length === limit;
    page += 1;
  }

  return allQuestions.map((q) => ({
    id: q.q_id,
    qbId: qb.qb_id,
    qbName: qb.qb_name,
    questionText: extractQuestionText(q.question_data),
    questionType: q.question_type || "unknown",
    tags: q.tags || [],
    techStack,
    topic: q.topic?.name || topic || null,
    compiler: compiler || null,
    raw: q,
  }));
}

/**
 * Given a list of sheet QB-metadata candidates ({techStack, type, qbName, count}),
 * resolve each to an Examly QB and fetch its questions. Candidates that don't
 * resolve on Examly (renamed/deleted QB) are skipped, not fatal.
 */
export async function fetchQuestionsForCandidates({ token, departmentIds, candidates, techStack, topic, compiler, onProgress }) {
  const allQuestions = [];
  const unresolved = [];

  for (const candidate of candidates) {
    try {
      const qb = await findQuestionBankByName({ token, departmentIds, qbName: candidate.qbName });
      if (!qb) { unresolved.push(candidate.qbName); continue; }

      const questions = await fetchQuestionsForQb({ token, qb, techStack, topic, compiler });
      questions.forEach((q) => { q._score = candidate.matchScore; q.sheetType = candidate.type; });
      allQuestions.push(...questions);
      onProgress?.({ qbName: candidate.qbName, fetched: questions.length });
    } catch (err) {
      console.warn(`⚠️  Skipping QB "${candidate.qbName}":`, err.message);
      unresolved.push(candidate.qbName);
    }
  }

  return { questions: allQuestions, unresolved };
}

function parseJsonSafe(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

/** Search tests by name — POST /api/v2/tests/filter. Returns every match (same test name can exist across departments), for the caller to disambiguate. */
export async function searchTestsByName({ token, departmentIds, testName }) {
  const res = await fetch(`${API}/api/v2/tests/filter`, {
    method: "POST",
    headers: headersFor(token),
    body: JSON.stringify({
      page: 1,
      limit: 25,
      search: testName,
      branch_id: "All",
      department_id: departmentIds,
      mainDepartmentUser: true,
    }),
  });
  if (!res.ok) throw new Error(`Test search failed for "${testName}" (HTTP ${res.status})`);
  const json = await res.json();
  return json?.data || [];
}

/** Full test detail — GET /api/v2/test/{testId} — used only to read its per-section `questions` groups. */
export async function fetchTestDetail({ token, testId }) {
  const res = await fetch(`${API}/api/v2/test/${testId}`, { headers: headersFor(token) });
  if (!res.ok) throw new Error(`Failed to fetch test detail (HTTP ${res.status})`);
  return res.json();
}

/**
 * Every section of a test, as { name, ids } — ALL sections, unfiltered. No
 * attempt is made here to guess which sections are "COD" — confirmed
 * unreliable in practice: a section literally named "Programming" can
 * contain questions Examly's own authoring UI labels "MCQ - Single Correct",
 * yet they're still backed by the same programming_question entity and
 * fetch/update through it just fine. Section display names are not a type
 * signal at all. The only trustworthy test is actually attempting
 * fetchRawProgrammingQuestion per id and letting a real success/failure
 * decide — which is what the caller does with every id this returns.
 */
export function extractTestSections(testDetail) {
  const groups = Array.isArray(testDetail?.questions) ? testDetail.questions : [];
  const sections = [];

  groups.forEach((group) => {
    if (!group || typeof group !== "object") return;

    if (Array.isArray(group.non_group_questions)) {
      const ids = group.non_group_questions.map((q) => q?.q_id).filter(Boolean);
      if (ids.length) sections.push({ name: group.name || "Unnamed section", ids });
      return;
    }

    Object.entries(group).forEach(([label, value]) => {
      if (!Array.isArray(value) || !value.length) return;
      const ids = value.map((item) => (typeof item === "string" ? item : item?.q_id)).filter(Boolean);
      if (ids.length) sections.push({ name: label, ids });
    });
  });

  return sections;
}

/** Matches Examly's question_type for coding/programming questions — same check TestPacking.jsx uses locally. */
export const CODING_TYPE_RE = /programming|coding/i;
const MCQ_TYPE_RE = /mcq/i;

/** Classify a real `question_type` string (from a QB's own question list, which DOES carry one reliably) into the type Taggy knows how to fetch/update. Returns null for anything else — not yet supported, left to fail its own fetch rather than being silently skipped. */
export function classifyQuestionType(questionType) {
  if (CODING_TYPE_RE.test(questionType || "")) return "programming";
  if (MCQ_TYPE_RE.test(questionType || "")) return "mcq";
  return null;
}

function parseMaybeJson(value, fallback) {
  if (typeof value !== "string") return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

/**
 * Normalize an MCQ item from fetchQuestionsForQb's `raw` (the exact shape
 * POST /api/v2/questionfilter returns per non_group_question) into the flat
 * entity shape buildMcqUpdatePayload/currentTags expect — grounded in
 * MetaCorporate.jsx's/MetaUniversity.jsx's own confirmed-working
 * update_mcq_question flow, which builds its payload directly from this SAME
 * list item with no separate per-id GET at all (some fields — options,
 * answer, hint, answer_explanation — arrive JSON-stringified there; this
 * parses them back). Used so a QB-sourced MCQ never has to depend on a
 * single-id mcq_question GET whose response shape is unconfirmed.
 */
export function normalizeMcqListItem(raw) {
  return {
    ...raw,
    options: parseMaybeJson(raw.options, raw.options),
    answer: parseMaybeJson(raw.answer, raw.answer),
    hint: parseMaybeJson(raw.hint, []),
    answer_explanation: parseMaybeJson(raw.answer_explanation, { args: [] }),
    tags: (raw.tags || []).map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean),
    createdBy: raw.createdBy || raw.created_by || null,
  };
}

/**
 * Raw, UNMODIFIED entity from GET /api/programming_question/{q_id} — unlike
 * fetchProgrammingQuestionDetail (which keeps only a display-friendly
 * subset), this keeps every field Examly returns so it can be round-tripped
 * into PUT /api/update_programming_question/{q_id} with only the intended
 * fields mutated. Only use this when you actually need to write the
 * question back — for display-only previews, fetchProgrammingQuestionDetail
 * is simpler.
 */
export async function fetchRawProgrammingQuestion({ token, qId }) {
  const res = await fetch(`${API}/api/programming_question/${qId}`, { headers: headersFor(token) });
  if (!res.ok) throw new Error(`Failed to fetch question detail (HTTP ${res.status})`);

  const json = await res.json();
  const entity = json?.data?.entity;
  if (!entity) throw new Error("Unexpected response from programming_question endpoint");
  return entity;
}

/**
 * Raw, UNMODIFIED entity from GET /api/mcq_question/{q_id} — confirmed via a
 * real browser capture of Examly's own authoring UI editing an MCQ: flat
 * (no answer/learning sub-namespaces like programming's shape), with `tags`
 * as a plain top-level array. Round-trips into POST /api/update_mcq_question/
 * {q_id} the same way fetchRawProgrammingQuestion does for update_programming_
 * question.
 */
export async function fetchRawMcqQuestion({ token, qId }) {
  const res = await fetch(`${API}/api/mcq_question/${qId}`, { headers: headersFor(token) });
  if (!res.ok) throw new Error(`Failed to fetch question detail (HTTP ${res.status})`);

  const json = await res.json();
  const entity = json?.data?.entity;
  if (!entity) throw new Error("Unexpected response from mcq_question endpoint");
  return entity;
}

// Exact key set captured from a real update_mcq_question POST body (Examly's
// own authoring UI) — not guessed. Notably excludes q_id/qb_id/question_type,
// same drop pattern confirmed for update_programming_question.
const MCQ_UPDATE_FIELDS = [
  "answer", "answer_explanation", "blooms_taxonomy", "course_outcome", "createdBy",
  "hint", "linked_concepts", "manual_difficulty", "options", "program_outcome",
  "question_data", "question_editor_type", "question_media", "sub_topic_id",
  "subject_id", "tags", "topic_id",
];

/** Build the POST body for update_mcq_question from a raw entity — picks exactly the confirmed field set above and normalizes tags to plain strings. */
export function buildMcqUpdatePayload(entity) {
  const payload = {};
  MCQ_UPDATE_FIELDS.forEach((key) => { payload[key] = entity[key]; });
  payload.tags = (entity.tags || []).map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean);
  return payload;
}

/** POST the full (mostly-unchanged) MCQ question back — writes to a live Examly question, not reversible from here. */
export async function updateMcqQuestion({ token, qId, payload }) {
  const res = await fetch(`${API}/api/update_mcq_question/${qId}`, {
    method: "POST",
    headers: headersFor(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update question (HTTP ${res.status})`);
  return res.json().catch(() => ({}));
}

// GET /api/programming_question/{id} does NOT 404 for a non-programming id —
// it still returns the shared question row, but with BOTH answer and learning
// as literal `null` (confirmed directly: this is exactly what crashed
// buildQuestionUpdatePayload reading `null.question_editor_type` on a real
// test section named "Programming" that actually held an MCQ). A genuine
// programming entity always has real data under at least one of these — this
// codebase's own buildQuestionUpdatePayload already depends on that being
// true for every COD question it has ever successfully updated — so their
// presence, not any guessed field, is the trustworthy signal here.
function isGenuineProgrammingEntity(entity) {
  if (!entity) return false;
  const hasAnswer = !!(entity.answer && typeof entity.answer === "object");
  const hasLearning = !!(entity.learning && typeof entity.learning === "object");
  return hasAnswer || hasLearning;
}

/**
 * Fetch a question's raw entity without assuming its type up front, for
 * sources (test sections) that carry no reliable per-question type at all.
 * Tries programming first (cheapest — one request) and only pays for a
 * second request to mcq_question when the first comes back genuinely hollow.
 * If a source DOES know the real type already (a QB's own question list),
 * use fetchQuestionByHint instead to skip this guesswork entirely.
 */
export async function fetchRawQuestionAnyType({ token, qId }) {
  try {
    const entity = await fetchRawProgrammingQuestion({ token, qId });
    if (isGenuineProgrammingEntity(entity)) return { raw: entity, qType: "programming" };
  } catch {
    // Not fetchable as programming either — fall through and let the mcq attempt's own error surface instead.
  }
  const raw = await fetchRawMcqQuestion({ token, qId });
  return { raw, qType: "mcq" };
}

/** Fetch a question, routing directly by a known type ("programming" | "mcq") when the caller already has one (e.g. from a QB's real per-question question_type) — falls back to the blind fetchRawQuestionAnyType when the type is unknown or unrecognized. */
export async function fetchQuestionByHint({ token, qId, typeHint }) {
  if (typeHint === "programming") return { raw: await fetchRawProgrammingQuestion({ token, qId }), qType: "programming" };
  if (typeHint === "mcq") return { raw: await fetchRawMcqQuestion({ token, qId }), qType: "mcq" };
  return fetchRawQuestionAnyType({ token, qId });
}

// update_programming_question's schema uses DIFFERENT field names than GET
// returns for these — confirmed via a live 400 ("X is not allowed") naming
// exactly these GET-side keys. Renamed (not dropped): these carry real
// question content (input/output format, constraints, limits) that a PUT
// would otherwise wipe if simply omitted, and the renamed-to names are the
// exact ones CODSyncPlatform.jsx's own (working) create payload already
// uses for the same data, so they're a grounded choice, not a guess.
const RENAME_FOR_UPDATE = {
  input_format: "inputformat",
  output_format: "outputformat",
  code_constraints: "codeconstraints",
  run_time_limit: "timelimit",
  memory_limit: "memorylimit",
  code_size: "codesize",
  output_limit: "outputLimit",
};

// Confirmed outright rejected by the same 400 — q_id is already the URL's
// id, question_type can't change via update, answer_explanation isn't part
// of either the create or update schema.
const FORBIDDEN_FOR_UPDATE = ["q_id", "question_type", "answer_explanation"];

/**
 * Build the PUT body for update_programming_question from a raw entity —
 * spreads entity's own top-level fields, then entity.learning, then
 * entity.answer (later wins on overlap), so a field present under EITHER
 * nested object makes it into the payload regardless of which one actually
 * carries it for a given question — confirmed necessary in practice:
 * `question_editor_type` lives under `answer` for some questions but under
 * `learning` for others. Beyond the renames/drops below (both confirmed
 * against real 400 responses, not speculative), nothing else is hand-picked,
 * so any field this codebase doesn't know about rides along unchanged
 * instead of being silently dropped.
 */
export function buildQuestionUpdatePayload(entity, { manualDifficultyFallback = "Medium" } = {}) {
  // `= {}` destructuring defaults only cover `undefined` — a hollow non-
  // programming entity (see isGenuineProgrammingEntity) comes back with
  // these as literal `null`, which would otherwise crash every read below.
  const { answer: rawAnswer, learning: rawLearning, ...rest } = entity;
  const answer = rawAnswer || {};
  const learning = rawLearning || {};
  const merged = { ...rest, ...learning, ...answer };

  // `question_data`/`tags` belong to `learning` — make sure learning's
  // version always wins even if some question variant also has a stale
  // copy under `answer` that the spread order above would otherwise prefer.
  merged.question_data = learning.question_data ?? answer.question_data;
  merged.tags = (learning.tags || answer.tags || []).map((t) => (typeof t === "string" ? t : t.name));
  // Fields update_programming_question requires but some questions' GET
  // response omits entirely (missing key -> undefined -> JSON.stringify
  // drops it -> 400 "<field> is required"). `question_editor_type: 1` is
  // the value this codebase already sends for every COD question it
  // creates (CODSyncPlatform.jsx, CODSyncMultifile.jsx) — a grounded
  // fallback. `manual_difficulty` has no such known-good constant (it's a
  // per-question classification we have no business inventing) AND the
  // server rejects `null` ("must be a string"), so when truly absent
  // everywhere it needs an actual difficulty label — left as a caller-
  // supplied fallback (surfaced as a user-visible config, not silently
  // picked here) rather than guessed inside this function.
  merged.question_editor_type = answer.question_editor_type ?? learning.question_editor_type ?? rest.question_editor_type ?? 1;
  merged.manual_difficulty = answer.manual_difficulty ?? learning.manual_difficulty ?? rest.manual_difficulty ?? manualDifficultyFallback;

  Object.entries(RENAME_FOR_UPDATE).forEach(([from, to]) => {
    if (merged[to] === undefined && merged[from] !== undefined) merged[to] = merged[from];
    delete merged[from];
  });
  FORBIDDEN_FOR_UPDATE.forEach((key) => { delete merged[key]; });

  return merged;
}

/** `answer.testcases` normally arrives JSON-stringified on GET — handle either shape without assuming. */
export function parseTestcases(testcases) {
  if (Array.isArray(testcases)) return testcases;
  return parseJsonSafe(testcases, []);
}

/** PUT the full (mostly-unchanged) question back — writes to a live Examly question, not reversible from here. */
export async function updateProgrammingQuestion({ token, qId, payload }) {
  const res = await fetch(`${API}/api/update_programming_question/${qId}`, {
    method: "PUT",
    headers: headersFor(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update question (HTTP ${res.status})`);
  return res.json().catch(() => ({}));
}

/**
 * Full detail for a single programming/coding question — confirmed against a
 * real response from GET /api/programming_question/{q_id}. Used for the "see
 * entire preview" expand (input/output format, sample IO, testcases,
 * reference solution) that the compact question list doesn't carry.
 */
export async function fetchProgrammingQuestionDetail({ token, qId }) {
  const res = await fetch(`${API}/api/programming_question/${qId}`, { headers: headersFor(token) });
  if (!res.ok) throw new Error(`Failed to fetch question detail (HTTP ${res.status})`);

  const json = await res.json();
  const entity = json?.data?.entity;
  if (!entity) throw new Error("Unexpected response from programming_question endpoint");

  const answer = entity.answer || {};
  const learning = entity.learning || {};

  return {
    questionHtml: learning.question_data || "",
    inputFormat: answer.input_format || "",
    outputFormat: answer.output_format || "",
    codeConstraints: answer.code_constraints || "",
    languages: answer.multilanguage || [],
    sampleIO: parseJsonSafe(answer.sample_io, []),
    testcases: parseJsonSafe(answer.testcases, []),
    solutions: (answer.solution || []).map((s) => ({
      language: s.language,
      code: s.solutiondata?.[0]?.solution || "",
      mysqlSchema: s.mysqlSchema || null,
    })),
    tags: (learning.tags || []).map((t) => t.name),
  };
}
