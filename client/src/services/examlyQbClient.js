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

/** Full test detail — GET /api/v2/test/{testId} — used only to read its per-section question-id groups (e.g. `questions: [{ COD: [qId, ...] }]`). */
export async function fetchTestDetail({ token, testId }) {
  const res = await fetch(`${API}/api/v2/test/${testId}`, { headers: headersFor(token) });
  if (!res.ok) throw new Error(`Failed to fetch test detail (HTTP ${res.status})`);
  return res.json();
}

/**
 * Every COD/programming question id in a test's `questions` groups, plus the
 * names of any OTHER section types found (MCQ, etc.) so a caller can tell
 * the user those exist but aren't included — this only extracts COD ids
 * because that's the only question type this codebase has a confirmed,
 * working update path for (update_programming_question).
 */
export function extractCodQuestionIdsFromTest(testDetail) {
  const groups = Array.isArray(testDetail?.questions) ? testDetail.questions : [];
  const codIds = [];
  const otherTypes = new Set();
  groups.forEach((group) => {
    Object.entries(group || {}).forEach(([type, ids]) => {
      if (!Array.isArray(ids)) return;
      if (type === "COD") codIds.push(...ids);
      else otherTypes.add(type);
    });
  });
  return { codIds: [...new Set(codIds)], otherTypes: [...otherTypes] };
}

/** Matches Examly's question_type for coding/programming questions — same check TestPacking.jsx uses locally. */
export const CODING_TYPE_RE = /programming|coding/i;

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
  const { answer = {}, learning = {}, ...rest } = entity;
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
