// client/src/services/qbMatchingService.js
//
// Pure QB/question matching, ranking, selection, validation and preview-DTO
// building for the Test Packing feature. No network calls here — this module
// only transforms data already fetched via examlyQbClient.js and
// server /qb-metadata/search, so it's fully unit-testable and shared by both
// Automatic and Manual mode.

// ── Config (kept here, not scattered across the UI, per "configurable rather
//    than hard-coded" requirement) ──────────────────────────────────────────
export const MATCH_WEIGHTS = {
  techStackExact: 100,
  topicExact: 50,
  topicPartial: 20,
  compilerExact: 15,
  stVerified: 10,
  questionTypeMatch: 5,
};

// Confirmed against a real Examly question ("tags":[{"name":"tverified"}, ...]) —
// the actual tag is "tverified", not the "ST Verified" label the UI shows for it.
// Matched by normalizing (letters only, lowercased) and checking against
// {"verified","tverified","stverified"} — anchored so "unverified"/"notverified"
// never false-match (they don't reduce to one of those exact strings).
const VERIFIED_TAG_NORMALIZED_RE = /^s?t?verified$/;

function normalizeTagName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z]/g, "");
}

export function isStVerified(question) {
  const tags = question?.tags || [];
  // Examly tags are objects ({ name, ... }); tolerate plain strings too (e.g. in tests/mocks)
  return tags.some((t) => VERIFIED_TAG_NORMALIZED_RE.test(normalizeTagName(t?.name ?? t)));
}

/**
 * Score a single question against the requirement. `qbMeta` is the sheet
 * record (techStack/type/matchScore) this question's QB was resolved from.
 */
export function scoreQuestion(question, requirement, qbMeta) {
  let score = 0;
  if (qbMeta?.techStack && requirement.techStack &&
      qbMeta.techStack.toLowerCase() === requirement.techStack.toLowerCase()) {
    score += MATCH_WEIGHTS.techStackExact;
  }
  if (qbMeta?.matchScore >= 3) score += MATCH_WEIGHTS.topicExact;
  else if (qbMeta?.matchScore > 0) score += MATCH_WEIGHTS.topicPartial;

  if (requirement.compiler && question.compiler &&
      question.compiler.toLowerCase() === requirement.compiler.toLowerCase()) {
    score += MATCH_WEIGHTS.compilerExact;
  }
  if (isStVerified(question)) score += MATCH_WEIGHTS.stVerified;
  if (requirement.questionType && qbMeta?.type &&
      qbMeta.type.toLowerCase().includes(requirement.questionType.toLowerCase())) {
    score += MATCH_WEIGHTS.questionTypeMatch;
  }
  return score;
}

/** Dedupe by question id, keeping the highest-scored occurrence */
export function dedupeQuestions(questions) {
  const byId = new Map();
  for (const q of questions) {
    const existing = byId.get(q.id);
    if (!existing || (q._score || 0) > (existing._score || 0)) byId.set(q.id, q);
  }
  return [...byId.values()];
}

/**
 * Select up to `requestedCount` questions from `candidates`, preferring
 * ST Verified, then highest match score, with graceful fallback + a clear
 * warning when there aren't enough. Never selects more than requested and
 * never selects duplicates.
 */
export function selectQuestions(candidates, requestedCount) {
  const deduped = dedupeQuestions(candidates);

  const verified = deduped.filter(isStVerified).sort((a, b) => (b._score || 0) - (a._score || 0));
  const others = deduped.filter((q) => !isStVerified(q)).sort((a, b) => (b._score || 0) - (a._score || 0));

  const selected = [];
  for (const q of verified) {
    if (selected.length >= requestedCount) break;
    selected.push(q);
  }
  let usedFallback = false;
  for (const q of others) {
    if (selected.length >= requestedCount) break;
    selected.push(q);
    usedFallback = true;
  }

  const stVerifiedCount = selected.filter(isStVerified).length;
  const otherCount = selected.length - stVerifiedCount;

  return {
    selected,
    requestedCount,
    selectedCount: selected.length,
    stVerifiedCount,
    otherCount,
    usedFallback,
    shortBy: Math.max(0, requestedCount - selected.length),
    warning:
      selected.length < requestedCount
        ? `Only ${selected.length} suitable question${selected.length === 1 ? "" : "s"} found for this requirement. ${requestedCount} were requested.`
        : usedFallback
        ? `${otherCount} additional matching question${otherCount === 1 ? "" : "s"} selected because only ${stVerifiedCount} ST Verified question${stVerifiedCount === 1 ? "" : "s"} were available.`
        : null,
  };
}

/**
 * Pack `count` separate tests from ONE shared candidate pool with no question
 * repeated across any of them: each test's selection is removed from the pool
 * before the next test draws from it. Stops early (rather than looping forever)
 * once the pool can no longer produce a non-empty selection.
 */
export function packSequentialSelections(candidates, count, requestedCountEach) {
  let pool = dedupeQuestions(candidates);
  const selections = [];

  for (let i = 0; i < count; i++) {
    const selection = selectQuestions(pool, requestedCountEach);
    if (!selection.selected.length) break;

    selections.push(selection);
    const usedIds = new Set(selection.selected.map((q) => q.id));
    pool = pool.filter((q) => !usedIds.has(q.id));
  }

  return { selections, shortBy: count - selections.length };
}

/** Split `total` as evenly as possible across `n` buckets — remainder goes to the first buckets. e.g. (20, 3) => [7, 7, 6] */
export function splitCountEvenly(total, n) {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Select ONE test's questions balanced across multiple topics: `requestedCount`
 * is split as evenly as possible across `topicPools` (each independently
 * ST-Verified-prioritized via selectQuestions), so the test is guaranteed to
 * contain questions from EVERY topic rather than whichever topic's pool
 * happens to score highest dominating the whole thing.
 *
 * `topicPools` = [{ topic, candidates }] — each `candidates` is that ONE
 * topic's own matched question pool (not merged with the other topics').
 */
export function selectBalancedAcrossTopics(topicPools, requestedCount) {
  const shares = splitCountEvenly(requestedCount, topicPools.length);
  const perTopic = topicPools.map((tp, i) => ({
    topic: tp.topic,
    share: shares[i],
    selection: selectQuestions(tp.candidates, shares[i]),
  }));

  const selected = dedupeQuestions(perTopic.flatMap((p) => p.selection.selected));
  const stVerifiedCount = selected.filter(isStVerified).length;
  const otherCount = selected.length - stVerifiedCount;
  const shortTopics = perTopic.filter((p) => p.selection.selectedCount < p.share);

  return {
    selected,
    requestedCount,
    selectedCount: selected.length,
    stVerifiedCount,
    otherCount,
    perTopic, // for UI transparency: how many questions came from each topic
    shortBy: Math.max(0, requestedCount - selected.length),
    warning: shortTopics.length
      ? shortTopics.map((p) => `"${p.topic}": only ${p.selection.selectedCount} of ${p.share} found.`).join(" ")
      : null,
  };
}

/**
 * Packs `count` tests, each internally balanced across `topicPools` (see
 * selectBalancedAcrossTopics), with NO question repeated across any of the
 * tests: each test's picks are removed from every topic's pool before the
 * next test draws from it. Stops early once no topic pool can contribute
 * anything further.
 */
export function packSequentialBalancedSelections(topicPools, count, requestedCountEach) {
  let pools = topicPools.map((tp) => ({ topic: tp.topic, candidates: dedupeQuestions(tp.candidates) }));
  const selections = [];

  for (let i = 0; i < count; i++) {
    const selection = selectBalancedAcrossTopics(pools, requestedCountEach);
    if (!selection.selected.length) break;

    selections.push(selection);
    const usedIds = new Set(selection.selected.map((q) => q.id));
    pools = pools.map((p) => ({ ...p, candidates: p.candidates.filter((q) => !usedIds.has(q.id)) }));
  }

  return { selections, shortBy: count - selections.length };
}

/** Group selected questions by their source QB, for the "QB Sources" summary */
export function summarizeQbSources(selectedQuestions) {
  const byQb = new Map();
  for (const q of selectedQuestions) {
    const key = q.qbName || "Unknown QB";
    byQb.set(key, (byQb.get(key) || 0) + 1);
  }
  return [...byQb.entries()].map(([qbName, count]) => ({ qbName, count }));
}

// ── Validation (spec §13) ───────────────────────────────────────────────────
/** `topics` is the array of chip values; a single leftover `topic` string is also accepted for callers with just one */
export function validateRequirement({ techStack, topics, topic, requestedCount }) {
  const errors = [];
  if (!techStack || !String(techStack).trim()) errors.push("Technology stack is required.");
  const topicList = topics?.length ? topics : (topic ? [topic] : []);
  if (!topicList.length) errors.push("At least one topic is required.");
  const n = Number(requestedCount);
  if (!Number.isFinite(n) || n <= 0) errors.push("Required question count must be a positive number.");
  return { valid: errors.length === 0, errors };
}

export function validateSelection(selectedQuestions) {
  const errors = [];
  if (!selectedQuestions.length) errors.push("At least one question must be selected.");
  const ids = selectedQuestions.map((q) => q.id);
  if (new Set(ids).size !== ids.length) errors.push("Duplicate questions detected in the selection.");
  return { valid: errors.length === 0, errors };
}

// ── Preview DTO (shared by the on-screen preview AND the PDF — see
//    server/services/testPackPdfService.js, which renders this exact shape) ─
export function buildPreview({ testName, techStack, topic, compiler, sectionName, duration, selection }) {
  return {
    testName,
    techStack,
    topic,
    compiler: compiler || "-",
    sectionName: sectionName || techStack || "Section 1",
    duration: duration || "60",
    requestedCount: selection.requestedCount,
    selectedCount: selection.selectedCount,
    stVerifiedCount: selection.stVerifiedCount,
    otherCount: selection.otherCount,
    warning: selection.warning,
    qbSources: summarizeQbSources(selection.selected),
    questions: selection.selected.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      // Full source HTML (already fetched in bulk via questionfilter, no extra
      // request needed) — lets the preview show the complete formatted question,
      // not just the stripped/plain text used for the compact list + PDF.
      questionHtml: q.raw?.question_data || null,
      questionType: q.questionType,
      qbName: q.qbName,
      stVerified: isStVerified(q),
      topic: q.topic || topic, // each question keeps ITS OWN matched topic when known (multi-topic runs), falls back to the shared label otherwise
      compiler: q.compiler || compiler || null,
    })),
  };
}
