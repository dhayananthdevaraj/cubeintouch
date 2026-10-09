// src/pages/questionSections.js
//
// Pure (no React) extraction of a COD/programming question's raw Examly data
// into named, independently copyable "sections" for the Question Preview
// Analyzer. Takes the SAME raw entity + parsed testcases the Weightage
// Modifier already fetched (fetchRawProgrammingQuestion / parseTestcases) —
// no extra API calls, and this module knows nothing about React or fetch.
//
// Field shapes below are confirmed against real GET
// /api/programming_question/{id} responses examined while building
// buildQuestionUpdatePayload (see examlyQbClient.js): answer.* carries
// input_format/output_format/code_constraints/sample_io/solution/testcases/
// multilanguage; learning.* carries question_data/tags/automatic_difficulty/
// question_type/hint/linked_concepts/video_solution/answer_explanation.
// Nothing here is invented — a section is only "available" when the
// underlying field actually has content.
import { extractQuestionText } from "../services/examlyQbClient";

export const SECTION_KEYS = [
  "overview",
  "description",
  "inputFormat",
  "outputFormat",
  "constraints",
  "sampleTestcases",
  "hiddenTestcases",
  "solution",
  "codeStub",
  "headerFooter",
  "whitelist",
  "mysqlSchema",
];

function stripHtml(html) {
  return html ? extractQuestionText(html) : "";
}

function parseJsonArraySafe(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isBlankScoreLike(v) {
  return v == null || String(v).trim() === "" || String(v).trim() === "-";
}

function formatTestcaseBlock(tc, i, { includeScore }) {
  const meta = [];
  if (!isBlankScoreLike(tc.difficulty)) meta.push(String(tc.difficulty));
  if (includeScore && !isBlankScoreLike(tc.score)) meta.push(`${tc.score}%`);
  const label = meta.length ? `Test ${i + 1} [${meta.join(", ")}]` : `Test ${i + 1}`;
  return `${label}\nInput:\n${tc.input ?? ""}\nExpected Output:\n${tc.output ?? ""}`;
}

/**
 * Build the ordered list of analyzer sections for one question.
 * `q` is a `questions[]` entry from CODMedia.jsx: { id, questionText, raw, testcases }.
 * Every section has { key, label, available, text } at minimum; some also
 * carry structured data (`items`, `perLanguage`) for richer rendering.
 */
export function extractQuestionSections(q) {
  const raw = q?.raw;
  const answer = raw?.answer || {};
  const learning = raw?.learning || {};
  const testcases = q?.testcases || [];
  const sampleIO = parseJsonArraySafe(answer.sample_io);
  const solutions = Array.isArray(answer.solution) ? answer.solution : [];
  const tags = (learning.tags || []).map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean);
  const manualDifficulty = answer.manual_difficulty ?? learning.manual_difficulty ?? null;

  const overviewLines = [
    `Question ID: ${q?.id ?? "—"}`,
    learning.question_type ? `Type: ${learning.question_type}` : null,
    answer.multilanguage?.length ? `Languages: ${answer.multilanguage.join(", ")}` : null,
    manualDifficulty ? `Difficulty: ${manualDifficulty}` : null,
    learning.automatic_difficulty != null ? `Automatic difficulty score: ${learning.automatic_difficulty}` : null,
    tags.length ? `Tags: ${tags.join(", ")}` : null,
  ].filter(Boolean);

  const solutionEntries = solutions
    .map((s) => ({ language: s.language, code: s.solutiondata?.[0]?.solution || "" }))
    .filter((s) => s.code);

  const codeStubEntries = solutions
    .map((s) => ({ language: s.language, code: s.codeStub || "" }))
    .filter((s) => s.code);

  const headerFooterEntries = solutions
    .map((s) => ({ language: s.language, header: s.header || "", footer: s.footer || "" }))
    .filter((s) => s.header || s.footer);

  const listEntries = solutions
    .map((s) => ({
      language: s.language,
      whitelist: (s.whitelist || []).flatMap((w) => w.list || []),
      blacklist: (s.blacklist || []).flatMap((w) => w.list || []),
    }))
    .filter((s) => s.whitelist.length || s.blacklist.length);

  const schemaEntries = solutions
    .map((s) => ({ language: s.language, schema: s.mysqlSchema || "" }))
    .filter((s) => s.schema);

  return [
    {
      key: "overview",
      label: "Overview",
      available: true,
      text: overviewLines.join("\n"),
    },
    {
      key: "description",
      label: "Description / Problem Statement",
      available: !!learning.question_data,
      html: learning.question_data || "",
      text: stripHtml(learning.question_data),
    },
    {
      key: "inputFormat",
      label: "Input Format",
      available: !!answer.input_format,
      html: answer.input_format || "",
      text: stripHtml(answer.input_format),
    },
    {
      key: "outputFormat",
      label: "Output Format",
      available: !!answer.output_format,
      html: answer.output_format || "",
      text: stripHtml(answer.output_format),
    },
    {
      key: "constraints",
      label: "Constraints",
      available: !!answer.code_constraints,
      html: answer.code_constraints || "",
      text: stripHtml(answer.code_constraints),
    },
    {
      key: "sampleTestcases",
      label: "Sample Test Cases",
      available: sampleIO.length > 0,
      items: sampleIO,
      text: sampleIO.map((s, i) => formatTestcaseBlock(s, i, { includeScore: false })).join("\n\n"),
    },
    {
      key: "hiddenTestcases",
      label: "Hidden Test Cases",
      available: testcases.length > 0,
      items: testcases,
      text: testcases.map((tc, i) => formatTestcaseBlock(tc, i, { includeScore: true })).join("\n\n"),
    },
    {
      key: "solution",
      label: "Solution / Reference Code",
      available: solutionEntries.length > 0,
      perLanguage: solutionEntries,
      text: solutionEntries.map((s) => `[${s.language}]\n${s.code}`).join("\n\n"),
    },
    {
      key: "codeStub",
      label: "Code Stub",
      available: codeStubEntries.length > 0,
      perLanguage: codeStubEntries,
      text: codeStubEntries.map((s) => `[${s.language}]\n${s.code}`).join("\n\n"),
    },
    {
      key: "headerFooter",
      label: "Header / Footer",
      available: headerFooterEntries.length > 0,
      perLanguage: headerFooterEntries,
      text: headerFooterEntries
        .map((s) => `[${s.language}]` + (s.header ? `\nHeader:\n${s.header}` : "") + (s.footer ? `\nFooter:\n${s.footer}` : ""))
        .join("\n\n"),
    },
    {
      key: "whitelist",
      label: "Whitelist / Blacklist",
      available: listEntries.length > 0,
      perLanguage: listEntries,
      text: listEntries
        .map((s) => `[${s.language}]` + (s.whitelist.length ? `\nWhitelist: ${s.whitelist.join(", ")}` : "") + (s.blacklist.length ? `\nBlacklist: ${s.blacklist.join(", ")}` : ""))
        .join("\n\n"),
    },
    {
      key: "mysqlSchema",
      label: "MySQL Schema",
      available: schemaEntries.length > 0,
      perLanguage: schemaEntries,
      text: schemaEntries.map((s) => `[${s.language}]\n${s.schema}`).join("\n\n"),
    },
  ];
}

/**
 * Combine the sections named in `selectedKeys` into one prompt-friendly text
 * block. Unavailable sections are skipped even if their key is selected.
 * Works on a single question's sections today; a future bulk-copy feature
 * can call this per question and join the results, since nothing here is
 * tied to a single-question assumption beyond what's passed in.
 */
export function combineSections(sections, selectedKeys) {
  return sections
    .filter((s) => selectedKeys.has(s.key) && s.available)
    .map((s) => `## ${s.label}\n\n${s.text || "(empty)"}`)
    .join("\n\n---\n\n");
}

/** Every available section, for "Copy Complete Question". */
export function combineAllAvailable(sections) {
  return combineSections(sections, new Set(sections.map((s) => s.key)));
}
