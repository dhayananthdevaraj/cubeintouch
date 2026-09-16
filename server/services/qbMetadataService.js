// server/services/qbMetadataService.js
//
// Ingests QB (Question Bank) availability metadata from a published Google Sheet.
// Each sheet tab = one tech stack. Columns are NOT standardized across tabs
// ("COD QB Name" vs "Question Bank Name  MCQ" vs "QB name", count header text
// varies too) — so instead of a fixed schema we detect QB-name columns
// generically and treat the very next column as its count, which held true
// across every tab sampled. Topic is not a separate column anywhere; it's
// embedded in the QB name string, so matching is done as a normalized
// substring search against qbName rather than a rigid name parse.

const PUBLISHED_SHEET_ID =
  process.env.QB_SHEET_PUBLISHED_ID ||
  "2PACX-1vRdGJxOw6L4r302TpeU8Fmr1Kwi0nIppzzmPqBm_fUYmeTXuc1r_Olkp8uLPSb9AyCk9SDSbtdRVQf7";

const PUBHTML_URL = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_SHEET_ID}/pubhtml`;
const csvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_SHEET_ID}/pub?gid=${gid}&single=true&output=csv`;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — "live" but avoids hammering Google on every request
let cache = { at: 0, records: [], techStacks: [] };

// ── CSV parsing ────────────────────────────────────────────────────────────
// Hand-rolled because cells can contain embedded commas AND embedded newlines
// inside quotes (confirmed in the "Digitization" tab) — a naive split(',') or
// split('\n') breaks on real data.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── Sheet tab discovery ──────────────────────────────────────────────────
/** Parse the pubhtml page's embedded `items.push({name:"...", gid:"..."})` list */
function parseTabsFromPubhtml(html) {
  const tabs = [];
  const re = /items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?gid:\s*"(\d+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    tabs.push({ name: m[1].replace(/\\"/g, '"'), gid: m[2] });
  }
  return tabs;
}

async function fetchTabList() {
  const res = await fetch(PUBHTML_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Failed to load QB sheet tab list (HTTP ${res.status})`);
  const html = await res.text();
  const tabs = parseTabsFromPubhtml(html);
  if (!tabs.length) throw new Error("No sheet tabs found — the published sheet link may have changed");
  return tabs;
}

// ── QB-name column detection ─────────────────────────────────────────────
const QB_NAME_HEADER_RE = /qb\s*name|qbs\b|question\s*bank\s*name|^qb$/i;

function deriveTypeLabel(header) {
  const stripped = header.replace(/qb\s*name|qbs\b|question\s*bank\s*name/gi, "").trim().replace(/\s{2,}/g, " ");
  return stripped || "General";
}

/** Parse one tab's CSV rows into flat QB metadata records */
function parseTabRows(rows, techStack) {
  if (!rows.length) return [];
  const header = rows[0];
  const qbColumns = [];

  header.forEach((h, i) => {
    const text = (h || "").trim();
    if (text && QB_NAME_HEADER_RE.test(text)) {
      qbColumns.push({
        nameCol: i,
        countCol: i + 1,
        type: deriveTypeLabel(text),
        topicsCol: (header[i + 2] || "").toLowerCase().includes("topic") ? i + 2 : null,
      });
    }
  });

  if (!qbColumns.length) return []; // e.g. "Content Banks" (videos/PDFs) or an empty tab — not QB data

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;

    for (const col of qbColumns) {
      const qbName = (row[col.nameCol] || "").trim();
      if (!qbName) continue;

      const rawCount = (row[col.countCol] || "").trim();
      const count = parseInt(rawCount.replace(/[^\d]/g, ""), 10);

      records.push({
        techStack,
        type: col.type,
        qbName,
        count: Number.isFinite(count) ? count : 0,
        topics: col.topicsCol != null ? (row[col.topicsCol] || "").trim() || null : null,
      });
    }
  }
  return records;
}

async function fetchAllRecords() {
  const tabs = await fetchTabList();

  const perTab = await Promise.all(
    tabs.map(async (tab) => {
      try {
        const res = await fetch(csvUrl(tab.gid), { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) {
          console.warn(`⚠️  QB sheet tab "${tab.name}" fetch failed (HTTP ${res.status})`);
          return [];
        }
        const csv = await res.text();
        return parseTabRows(parseCsv(csv), tab.name);
      } catch (err) {
        console.warn(`⚠️  QB sheet tab "${tab.name}" failed:`, err.message);
        return [];
      }
    })
  );

  return perTab.flat();
}

async function getRecords() {
  const now = Date.now();
  if (now - cache.at < CACHE_TTL_MS && cache.records.length) return cache.records;

  const records = await fetchAllRecords();
  const techStacks = [...new Set(records.map((r) => r.techStack))].sort();
  cache = { at: now, records, techStacks };
  return records;
}

// ── Public API ────────────────────────────────────────────────────────────

/** List every tech stack (sheet tab) that actually contains QB data */
export async function listTechStacks() {
  await getRecords();
  return cache.techStacks;
}

/** Normalize for fuzzy matching: lowercase, unify separators, collapse whitespace */
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a free-text topic field into individual topics — comma AND/OR newline separated */
function splitTopics(topic) {
  return String(topic || "")
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Score one QB name against one normalized topic: 3 = whole phrase, 2 = all words, 1 = some words, 0 = no match */
function scoreTopicMatch(normName, normTopic) {
  if (!normTopic) return 1; // no topic filter — everything in the stack is a candidate
  const topicWords = normTopic.split(" ").filter(Boolean);
  if (normName.includes(normTopic)) return 3;
  if (topicWords.length && topicWords.every((w) => normName.includes(w))) return 2;
  if (topicWords.some((w) => normName.includes(w))) return 1;
  return 0;
}

/**
 * Filter+score `records` (already narrowed to one tech stack) against a
 * type filter and one or more topics (comma/newline separated — a QB only
 * needs to match ANY one of them, scored at that topic's best match).
 */
function matchRecords(records, { topics = [], type = "" } = {}) {
  const normType = normalize(type);
  const normTopics = topics.map(normalize);

  const byKey = new Map(); // dedupe when a QB matches more than one topic — keep its best score
  for (const r of records) {
    if (normType && !normalize(r.type).includes(normType)) continue;

    const normName = normalize(r.qbName);
    const best = normTopics.length
      ? Math.max(...normTopics.map((t) => scoreTopicMatch(normName, t)))
      : scoreTopicMatch(normName, "");
    if (best <= 0) continue;

    const key = `${r.techStack}|${r.type}|${r.qbName}`;
    const existing = byKey.get(key);
    if (!existing || best > existing.matchScore) byKey.set(key, { ...r, matchScore: best });
  }

  const scored = [...byKey.values()];
  scored.sort((a, b) => b.matchScore - a.matchScore || b.count - a.count);
  return scored;
}

/**
 * Search QB metadata records by tech stack (exact match against the tab name)
 * and one or more free-text topics (comma/newline separated — fuzzy substring
 * match against the QB name, a QB matches if it matches ANY given topic),
 * optionally narrowed by question type. Returns records sorted best-match-first.
 */
export async function searchQbMetadata({ techStack, topic = "", type = "" }) {
  if (!techStack) throw new Error("techStack is required");

  const records = await getRecords();
  const stackMatches = records.filter((r) => normalize(r.techStack) === normalize(techStack));
  if (!stackMatches.length) return [];

  return matchRecords(stackMatches, { topics: splitTopics(topic), type });
}

/** Force a re-fetch on the next call (e.g. after the sheet is known to have changed) */
export function invalidateCache() {
  cache = { at: 0, records: [], techStacks: [] };
}

export const __internal = { parseCsv, parseTabsFromPubhtml, parseTabRows, normalize, splitTopics, matchRecords };
