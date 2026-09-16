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

/** Resolve an exact/near QB name to its Examly QB object (qb_id, qb_name, ...) */
export async function findQuestionBankByName({ token, departmentIds, qbName }) {
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
  const banks = json?.questionbanks || [];
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
    })),
    tags: (learning.tags || []).map((t) => t.name),
  };
}
