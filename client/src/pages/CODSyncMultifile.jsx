// CODSyncMultifile.jsx
// Drop-in replacement for the upload UI section in CODSyncPlatform
// Handles both Single-file and Multi-file programming question formats

import { useState } from "react";

const API = "https://api.examly.io";

// ─── MULTIFILE LANGUAGE OPTIONS ──────────────────────────────────────────────
export const MULTIFILE_LANGUAGES = [
  { value: "Java (11)",                  label: "Java (11)" },
  { value: "Java JDBC",                  label: "Java JDBC" },
  { value: "Python",                     label: "Python" },
  { value: "Python with MySql",          label: "Python with MySql" },
  { value: "Python with Datascience",    label: "Python with Datascience" },
  { value: "Javascript File Based",      label: "Javascript File Based" },
  { value: "Javascript with mongodb",    label: "Javascript with mongodb" },
  { value: "R (3.5)",                    label: "R (3.5)" },
  { value: "Verilog",                    label: "Verilog" },
  { value: "Vhdl",                       label: "Vhdl" },
  { value: "Mongodb Standalone",         label: "Mongodb Standalone" },
  { value: "Java with Oracledb",         label: "Java with Oracledb" },
  { value: "Oracledb Standalone",        label: "Oracledb Standalone" },
  { value: ".NET with MsSql (2019)",     label: ".NET with MsSql (2019)" },
  { value: "SQL Server (2019)",          label: "SQL Server (2019)" },
  { value: "C++",                        label: "C++" },
  { value: "CassandraDB Standalone",     label: "CassandraDB Standalone" },
  { value: "MySQL (8.0)",                label: "MySQL (8.0)" },
  { value: "PostgreSQL (13.6)",          label: "PostgreSQL (13.6)" },
  { value: "GNU Prolog",                 label: "GNU Prolog" },
  { value: "Cobol",                      label: "Cobol" },
  { value: "Scala",                      label: "Scala" },
  { value: "Java (17)",                  label: "Java (17)" },
  { value: "Java (21)",                  label: "Java (21)" },
  { value: "Python MSSQL",               label: "Python MSSQL" },
];

// ─── DEFAULT FILENAMES per language ──────────────────────────────────────────
const DEFAULT_FILENAME = {
  "Java (11)":               "Main.java",
  "Java (17)":               "Main.java",
  "Java (21)":               "Main.java",
  "Java JDBC":               "Main.java",
  "Java with Oracledb":      "Main.java",
  "Python":                  "main.py",
  "Python with MySql":       "main.py",
  "Python with Datascience": "main.py",
  "Python MSSQL":            "main.py",
  "Javascript File Based":   "index.js",
  "Javascript with mongodb": "index.js",
  "R (3.5)":                 "main.r",
  "Verilog":                 "main.v",
  "Vhdl":                    "main.vhd",
  "Mongodb Standalone":      "query.js",
  "Oracledb Standalone":     "query.sql",
  ".NET with MsSql (2019)":  "Program.cs",
  "SQL Server (2019)":       "query.sql",
  "C++":                     "main.cpp",
  "CassandraDB Standalone":  "query.cql",
  "MySQL (8.0)":             "file.sql",
  "PostgreSQL (13.6)":       "file.sql",
  "GNU Prolog":              "main.pl",
  "Cobol":                   "main.cob",
  "Scala":                   "Main.scala",
};

// ─── MULTIFILE PARSER ─────────────────────────────────────────────────────────
/*
  Format expected (multifile):

  ---QUESTION---
  TITLE: ...
  DIFFICULTY: Easy|Medium|Hard
  LANGUAGE: MySQL (8.0)
  TAGS: tag1, tag2
  DESCRIPTION: ...
  INPUT_FORMAT: ...
  OUTPUT_FORMAT: ...
  CONSTRAINTS: ...
  INITIAL_QUERY[MySQL (8.0)]:
  <sql code here>
  SOLUTION_FILE[MySQL (8.0)]:
  <filename>file.sql</filename>
  <content>
  SELECT ...
  </content>
  TESTCASE: <input>|<output>|<difficulty>|<score>
  SAMPLE_IO: <input>|<output>
  ---END---

  INITIAL_QUERY is optional (used as the starter code shown to students).
  SOLUTION_FILE block can be repeated for multiple files in a language.
  For languages where input is null (SQL, etc.), use TESTCASE: null|<output>|Medium|100
*/
export function parseMultifileQuestions(raw) {
  const errors = [];
  const questions = [];

  const blocks = raw
    .split(/---QUESTION---/i)
    .map(b => b.split(/---END---/i)[0])
    .filter(b => b.trim().length > 0);

  if (blocks.length === 0) {
    errors.push("No ---QUESTION--- blocks found.");
    return { questions, errors };
  }

  blocks.forEach((block, bi) => {
    const qNum = bi + 1;
    const qErrors = [];
    const lines = block.split("\n");

    // ── Segment extractor ──
    const segments = {};
    let currentKey = null;
    let currentLines = [];

    // HEADER_RE: matches plain keys OR bracketed keys like SOLUTION_FILE[MySQL (8.0)]
    // Bracket content can contain ANY chars (spaces, dots, digits, parens, dots).
    const HEADER_RE = /^(TITLE|DIFFICULTY|LANGUAGE|TAGS|DESCRIPTION|INPUT_FORMAT|OUTPUT_FORMAT|CONSTRAINTS|INITIAL_QUERY\[[^\]]+\]|SOLUTION_FILE\[[^\]]+\]|TESTCASE|SAMPLE_IO)\s*:/i;

    // LINE_RE: key prefix = word chars; bracket content = anything except ]
    const LINE_RE = /^([A-Za-z_][A-Za-z0-9_]*)(\[[^\]]+\])?\s*:\s*(.*)/;

    const flushCurrent = () => {
      if (currentKey !== null) {
        const existing = segments[currentKey];
        if (existing !== undefined) {
          // Support multiple SOLUTION_FILE blocks for same language
          if (!Array.isArray(existing)) segments[currentKey] = [existing];
          segments[currentKey].push(currentLines.join("\n").trim());
        } else {
          segments[currentKey] = currentLines.join("\n").trim();
        }
      }
    };

    lines.forEach(line => {
      const m = line.match(LINE_RE);
      if (m && HEADER_RE.test(line)) {
        flushCurrent();
        // m[1]=key prefix (e.g. SOLUTION_FILE), m[2]=bracket incl. [] (e.g. [MySQL (8.0)]) or undefined
        const prefix = m[1].toUpperCase();
        const bracket = m[2] || ""; // already includes [ and ]
        // Preserve original bracket content case — e.g. SOLUTION_FILE[MySQL (8.0)]
        currentKey = bracket ? prefix + bracket : prefix;
        currentLines = m[3].trim() ? [m[3].trim()] : [];
        return;
      }
      if (currentKey !== null) currentLines.push(line);
    });
    flushCurrent();

    const get = k => {
      const val = segments[k.toUpperCase()];
      return Array.isArray(val) ? val[0] : (val || null);
    };

    const getLangMap = prefix => {
      const result = {};
      Object.keys(segments).forEach(k => {
        const m = k.match(new RegExp(`^${prefix.toUpperCase()}\\[(.+)\\]$`, "i"));
        if (m) result[m[1]] = segments[k];
      });
      return result;
    };

    const unescape = s => (s || "").replace(/\\n/g, "\n").replace(/\\t/g, "\t");

    // ── Parse SOLUTION_FILE blocks ──
    // Each block looks like:
    //   <filename>file.sql</filename>
    //   <content>
    //   ...code...
    //   </content>
    const parseSolutionFiles = rawBlock => {
      const files = [];
      if (!rawBlock) return files;
      const blocks = Array.isArray(rawBlock) ? rawBlock : [rawBlock];
      blocks.forEach(b => {
        const fnMatch = b.match(/<filename>(.*?)<\/filename>/is);
        const ctMatch = b.match(/<content>([\s\S]*?)<\/content>/is);
        if (fnMatch && ctMatch) {
          files.push({
            filename: fnMatch[1].trim(),
            content: ctMatch[1].trim(),
            id: "main",
          });
        } else if (b.trim()) {
          // Fallback: treat whole block as content with default id
          files.push({ filename: "file.txt", content: b.trim(), id: "main" });
        }
      });
      return files;
    };

    // ── Testcase parsing ──
    const getTestcases = () => {
      const allLines = [];
      lines.forEach(line => {
        if (/^TESTCASE\s*:/i.test(line))
          allLines.push(line.replace(/^TESTCASE\s*:\s*/i, "").trim());
      });
      return allLines.filter(l => l.length > 0).map(val => {
        const parts = val.split("|").map(p => p.trim());
        const rawInput = parts[0] === "null" || parts[0] === "" ? null : unescape(parts[0]);
        const rawOut = unescape(parts[1] || "");
        const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
        return {
          input: rawInput, output,
          difficulty: parts[2]?.trim() || "Medium",
          score: parseInt(parts[3]) || 100,
          memBytes: "320", timeBytes: 11,
          timeLimit: null, outputLimit: null, memoryLimit: null,
        };
      });
    };

    const getSampleIO = () => {
      const allLines = [];
      lines.forEach(line => {
        if (/^SAMPLE_IO\s*:/i.test(line))
          allLines.push(line.replace(/^SAMPLE_IO\s*:\s*/i, "").trim());
      });
      return allLines.filter(l => l.length > 0).map(val => {
        const parts = val.split("|").map(p => p.trim());
        const rawInput = parts[0] === "null" || parts[0] === "" ? null : unescape(parts[0]);
        const rawOut = unescape(parts[1] || "");
        const output = rawOut.endsWith("\n") ? rawOut : rawOut + "\n";
        return {
          input: rawInput, output,
          memBytes: "322", timeBytes: 11,
          sample: "Yes", difficulty: " - ", score: " - ",
          timeLimit: null, outputLimit: null, memoryLimit: null,
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
    const initialQueries = getLangMap("INITIAL_QUERY"); // { lang: rawSql }
    const solutionFileBlocks = getLangMap("SOLUTION_FILE"); // { lang: rawBlock | rawBlock[] }
    const testcases   = getTestcases();
    const sampleIO    = getSampleIO();

    if (!title)       qErrors.push(`Q${qNum}: Missing TITLE`);
    if (!difficulty || !["Easy","Medium","Hard"].includes(difficulty))
      qErrors.push(`Q${qNum}: DIFFICULTY must be Easy, Medium, or Hard`);
    if (!langRaw)     qErrors.push(`Q${qNum}: Missing LANGUAGE`);
    if (!description) qErrors.push(`Q${qNum}: Missing DESCRIPTION`);
    if (!inputFmt)    qErrors.push(`Q${qNum}: Missing INPUT_FORMAT`);
    if (!outputFmt)   qErrors.push(`Q${qNum}: Missing OUTPUT_FORMAT`);
    if (testcases.length === 0) qErrors.push(`Q${qNum}: No TESTCASE lines found`);
    if (Object.keys(solutionFileBlocks).length === 0)
      qErrors.push(`Q${qNum}: No SOLUTION_FILE[Language] block found`);

    if (qErrors.length > 0) { errors.push(...qErrors); return; }

    // Build per-language solution files map
    const solutionFiles = {};
    Object.entries(solutionFileBlocks).forEach(([lang, raw]) => {
      solutionFiles[lang] = parseSolutionFiles(raw);
    });

    questions.push({
      title, difficulty,
      languages: langRaw.split(",").map(l => l.trim()).filter(Boolean),
      tags: tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [""],
      description, inputFmt, outputFmt,
      constraints: constraints || "",
      initialQueries,
      solutionFiles,
      testcases, sampleIO,
    });
  });

  return { questions, errors };
}

// ─── MULTIFILE PAYLOAD BUILDER ────────────────────────────────────────────────
export function buildMultifilePayload(q, batchConfig, qbId, userId) {
  const wrapHtml = text => {
    if (!text) return "";
    if (/^<(p|ul|ol|div|h[1-6]|br|b|strong|em|span|table)\b/i.test(text.trim())) return text;
    const esc = s => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return text.split(/\n\n+/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  };

  // initialQuery lives at the TOP LEVEL of the payload (not inside solution[]).
  // The API rejects it if placed inside solution objects.
  // When multiple languages are present, use the first language's initialQuery.
  const firstLang = q.languages[0];
  const topLevelInitialQuery = q.initialQueries?.[firstLang] || null;

  const solutionArray = q.languages.map(lang => {
    const files = q.solutionFiles[lang] || [];

    return {
      language: lang,
      hasSnippet: false,
      solutiondata: [{
        solution: null,
        solutionExp: null,
        solutionbest: true,
        isSolutionExp: false,
        solutionDebug: null,
        solutionfiles: files.map((f, idx) => ({
          filename: f.filename,
          content: f.content,
          id: idx === 0 ? "main" : `file_${idx}`,
        })),
      }],
      hideHeader: false,
      hideFooter: false,
    };
  });

  return {
    question_type: "programming_file_based",
    question_editor_type: 1,
    question_data: wrapHtml(q.description),
    multilanguage: q.languages,
    inputformat: wrapHtml(q.inputFmt),
    outputformat: wrapHtml(q.outputFmt),
    enablecustominput: true,
    line_token_evaluation: false,
    codeconstraints: wrapHtml(q.constraints) || null,
    timelimit: null, memorylimit: null, codesize: null,
    setLimit: false, enable_api: false, outputLimit: null,
    subject_id: batchConfig.subject_id || null,
    blooms_taxonomy: null, course_outcome: null, program_outcome: null,
    hint: [],
    manual_difficulty: batchConfig.manual_difficulty || q.difficulty,
    ...(topLevelInitialQuery ? { initialQuery: topLevelInitialQuery } : {}),
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

// ─── FORMAT TEMPLATE FOR MULTIFILE ───────────────────────────────────────────
const MULTIFILE_FORMAT_EXAMPLE = `---QUESTION---
TITLE: Find Top Performing Employees
DIFFICULTY: Medium
LANGUAGE: MySQL (8.0)
TAGS: SQL, Aggregation, Subquery

DESCRIPTION:
Write a SQL query to find employees whose total sales exceed the overall average.
Display EMPLOYEE_NAME, DEPARTMENT, TOTAL_SALES, AVG_SALES_ALL_EMPLOYEES.
Order by TOTAL_SALES descending.

INPUT_FORMAT:
Tables EMPLOYEES and SALES are pre-populated as described.

OUTPUT_FORMAT:
Refer to sample output for formatting.

CONSTRAINTS:
Use INNER JOIN, GROUP BY, HAVING with subquery, and aggregate functions.

INITIAL_QUERY[MySQL (8.0)]:
-- Write your query here
SELECT ...

SOLUTION_FILE[MySQL (8.0)]:
<filename>file.sql</filename>
<content>
SELECT
    e.EMPLOYEE_NAME,
    e.DEPARTMENT,
    ROUND(SUM(s.SALE_AMOUNT), 2) AS TOTAL_SALES,
    ROUND(
        (SELECT SUM(SALE_AMOUNT) FROM SALES) /
        (SELECT COUNT(DISTINCT EMPLOYEE_ID) FROM EMPLOYEES),
    2) AS AVG_SALES_ALL_EMPLOYEES
FROM EMPLOYEES e
INNER JOIN SALES s ON e.EMPLOYEE_ID = s.EMPLOYEE_ID
GROUP BY e.EMPLOYEE_ID, e.EMPLOYEE_NAME, e.DEPARTMENT
HAVING SUM(s.SALE_AMOUNT) > (
    SELECT AVG(emp_total) FROM (
        SELECT SUM(s2.SALE_AMOUNT) AS emp_total
        FROM SALES s2
        INNER JOIN EMPLOYEES e2 ON s2.EMPLOYEE_ID = e2.EMPLOYEE_ID
        GROUP BY e2.EMPLOYEE_ID
    ) AS subquery
)
ORDER BY TOTAL_SALES DESC;
</content>

TESTCASE: null|EMPLOYEE_NAME\\tDEPARTMENT\\tTOTAL_SALES\\tAVG_SALES_ALL_EMPLOYEES\\nEva Menon\\tMobiles\\t13500.00\\t5875.00\\nAlice Roy\\tElectronics\\t10500.00\\t5875.00\\n|Medium|100
SAMPLE_IO: null|EMPLOYEE_NAME\\tDEPARTMENT\\tTOTAL_SALES\\tAVG_SALES_ALL_EMPLOYEES\\nEva Menon\\tMobiles\\t13500.00\\t5875.00\\nAlice Roy\\tElectronics\\t10500.00\\t5875.00\\n
---END---`;

// ─── MODE TOGGLE PILL ─────────────────────────────────────────────────────────
export function QuestionTypePill({ mode, onChange }) {
  return (
    <div style={{
      display: "inline-flex",
      background: "#f1f3f5",
      borderRadius: 12,
      padding: 4,
      gap: 4,
      marginBottom: 18,
      border: "1.5px solid #e4e7f0",
    }}>
      {[
        { key: "single",    icon: "📄", label: "Single File" },
        { key: "multifile", icon: "🗂️", label: "Multi File" },
      ].map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 20px",
            border: "none", borderRadius: 9,
            background: mode === opt.key ? "white" : "transparent",
            color: mode === opt.key ? "#6366f1" : "#868e96",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: mode === opt.key ? "0 2px 10px rgba(0,0,0,0.10)" : "none",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 15 }}>{opt.icon}</span>
          {opt.label}
          {mode === opt.key && (
            <span style={{
              background: "#6366f1",
              color: "white",
              fontSize: 10, fontWeight: 800,
              padding: "2px 7px", borderRadius: 20,
              marginLeft: 2,
            }}>ACTIVE</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── MULTIFILE FORMAT INFO CARD ───────────────────────────────────────────────
function MultifileFormatCard() {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(MULTIFILE_FORMAT_EXAMPLE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div style={{
      background: "#f8f9fc",
      border: "1.5px solid #e4e7f0",
      borderRadius: 16,
      padding: "18px 20px",
      marginBottom: 18,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28,
          background: "linear-gradient(135deg, #f59e0b, #ef4444)",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0,
        }}>🗂️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
            Multi-File Format Guide
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginTop: 1 }}>
            Uses <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>SOLUTION_FILE[Lang]</code> with filename/content tags
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: "white", border: "1.5px solid #e4e7f0",
            borderRadius: 8, padding: "5px 12px",
            fontSize: 11, fontWeight: 700, color: "#6366f1",
            cursor: "pointer",
          }}
        >{expanded ? "▲ Hide" : "▼ Show Example"}</button>
      </div>

      {/* Key differences */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 8, marginBottom: expanded ? 12 : 0,
      }}>
        {[
          { icon: "📁", title: "SOLUTION_FILE[Lang]", desc: "Wrap code in <filename> and <content> tags" },
          { icon: "🔧", title: "INITIAL_QUERY[Lang]", desc: "Optional starter code shown to students" },
          { icon: "🚫", title: "No CODE_STUB / HEADER / FOOTER", desc: "Not used in multifile format" },
          { icon: "⬛", title: "Null inputs OK", desc: "Use 'null' for SQL/DB testcase inputs" },
        ].map((item, i) => (
          <div key={i} style={{
            background: "white",
            border: "1px solid #e4e7f0",
            borderRadius: 10, padding: "10px 12px",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#111827" }}>{item.title}</div>
              <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Expandable example */}
      {expanded && (
        <div style={{ position: "relative" }}>
          <pre style={{
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 10, padding: "14px 16px",
            fontSize: 11, lineHeight: 1.6,
            overflowX: "auto", margin: 0,
            maxHeight: 400, overflowY: "auto",
            fontFamily: "'Fira Code', 'Cascadia Code', monospace",
          }}>
            <code>{MULTIFILE_FORMAT_EXAMPLE}</code>
          </pre>
          <button
            onClick={handleCopy}
            style={{
              position: "absolute", top: 10, right: 10,
              background: copied ? "#10b981" : "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 7, padding: "5px 12px",
              color: "white", fontSize: 11, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s",
            }}
          >{copied ? "✓ Copied!" : "📋 Copy"}</button>
        </div>
      )}

      {/* Supported languages badge strip */}
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", alignSelf: "center", marginRight: 4 }}>
          Supported:
        </span>
        {["MySQL (8.0)", "PostgreSQL (13.6)", "Python", "Java (11)", "Java (17)", "Java (21)", "C++", "SQL Server (2019)", "R (3.5)", "Scala", "+ more"].map(lang => (
          <span key={lang} style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#6366f1",
            fontSize: 10, fontWeight: 700,
            padding: "2px 8px", borderRadius: 20,
          }}>{lang}</span>
        ))}
      </div>
    </div>
  );
}

// ─── MULTIFILE UPLOAD SECTION (drop-in for upload UI in CODSyncPlatform) ─────
export function MultifileUploadSection({
  activeQB,
  batchConfig,
  token,
  showAlert,
  onResults,
}) {
  const [pasteInput, setPasteInput]     = useState("");
  const [parsedQuestions, setParsed]    = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [uploadProgress, setProgress]   = useState({ current: 0, total: 0 });

  const BATCH_SIZE = 3;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getHeaders = () => ({ "Content-Type": "application/json", Authorization: token });

  const currentQ = parsedQuestions[previewIndex];

  const handleParse = () => {
    if (!pasteInput.trim()) { showAlert("Nothing to parse", "warning"); return; }
    const { questions, errors } = parseMultifileQuestions(pasteInput);
    if (errors.length > 0) {
      const preview = errors.slice(0, 6).join("\n");
      const more = errors.length > 6 ? `\n...and ${errors.length - 6} more` : "";
      showAlert(`❌ ${errors.length} error(s):\n\n${preview}${more}`, "danger");
      if (questions.length > 0) setParsed(questions);
      return;
    }
    setParsed(questions);
    showAlert(`✅ Parsed ${questions.length} multifile question(s)!`, "success");
  };

  const uploadQuestions = async () => {
    if (parsedQuestions.length === 0) { showAlert("Parse first", "warning"); return; }
    if (!activeQB) { showAlert("No QB selected", "danger"); return; }

    setIsLoading(true);
    const results = { total: parsedQuestions.length, success: 0, failed: 0, errors: [], ids: [] };

    try {
      const userId = activeQB.createdBy || "system";
      for (let i = 0; i < parsedQuestions.length; i += BATCH_SIZE) {
        const batch  = parsedQuestions.slice(i, i + BATCH_SIZE);
        setProgress({ current: i, total: parsedQuestions.length });

        await Promise.all(batch.map(async (q, idx) => {
          const gi = i + idx;
          try {
            const payload = buildMultifilePayload(q, batchConfig, activeQB.qb_id, userId);
            const res = await fetch(`${API}/api/programming_question/create`, {
              method: "POST", headers: getHeaders(), body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
              results.success++;
              results.ids.push({ index: gi + 1, title: q.title, q_id: data.q_id });
            } else throw new Error(data.message || "Upload failed");
          } catch (err) {
            results.failed++;
            results.errors.push({ index: gi + 1, title: q.title, error: err.message });
          }
        }));

        if (i + BATCH_SIZE < parsedQuestions.length) await sleep(400);
      }

      setProgress({ current: parsedQuestions.length, total: parsedQuestions.length });
      if (results.failed === 0) showAlert(`🎉 All ${results.success} uploaded!`, "success");
      else showAlert(`⚠️ ${results.success} uploaded, ${results.failed} failed`, "warning");
      onResults(results);
    } catch (err) {
      showAlert("Upload error: " + err.message, "danger");
    } finally { setIsLoading(false); }
  };

  return (
    <div>
      {/* Preview modal */}
      {showPreview && currentQ && (
        <div
          onClick={() => setShowPreview(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 16,
              width: "100%", maxWidth: 780,
              maxHeight: "90vh", overflow: "hidden",
              display: "flex", flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: "18px 24px",
              borderBottom: "1px solid #f1f3f5",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
                  🗂️ Preview — Q{previewIndex + 1} of {parsedQuestions.length}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{currentQ.title}</div>
              </div>
              <button onClick={() => setShowPreview(false)} style={{
                background: "none", border: "none", fontSize: 22,
                cursor: "pointer", color: "#9ca3af", lineHeight: 1,
              }}>×</button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {/* Meta */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <span style={{
                  background: currentQ.difficulty === "Easy" ? "#dcfce7" : currentQ.difficulty === "Hard" ? "#fee2e2" : "#fef3c7",
                  color: currentQ.difficulty === "Easy" ? "#16a34a" : currentQ.difficulty === "Hard" ? "#dc2626" : "#d97706",
                  padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800,
                }}>{currentQ.difficulty}</span>
                {currentQ.languages.map(l => (
                  <span key={l} style={{
                    background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                    color: "#6366f1", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  }}>💻 {l}</span>
                ))}
                {currentQ.tags.filter(t => t).map(t => (
                  <span key={t} style={{
                    background: "#f3f4f6", color: "#6b7280",
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  }}>🏷️ {t}</span>
                ))}
                <span style={{
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                  color: "#f59e0b", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                }}>🗂️ Multi-file</span>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Description</div>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: currentQ.description }} />
              </div>

              {/* Per-language solution files */}
              {currentQ.languages.map(lang => (
                <div key={lang} style={{
                  background: "#f8f9fc", border: "1.5px solid #e4e7f0",
                  borderRadius: 12, padding: 16, marginBottom: 12,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
                    fontSize: 12, fontWeight: 800, color: "#111827",
                  }}>
                    <span style={{
                      background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                      color: "#6366f1", padding: "2px 10px", borderRadius: 20, fontSize: 11,
                    }}>{lang}</span>
                    <span style={{ color: "#9ca3af", fontWeight: 500 }}>
                      {(currentQ.solutionFiles[lang] || []).length} solution file(s)
                    </span>
                  </div>

                  {currentQ.initialQueries?.[lang] && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", marginBottom: 4 }}>Initial Query (starter code)</div>
                      <pre style={{
                        background: "#1e293b", color: "#94a3b8",
                        borderRadius: 8, padding: "10px 12px",
                        fontSize: 11, lineHeight: 1.5, margin: 0, overflow: "auto",
                      }}><code>{currentQ.initialQueries[lang]}</code></pre>
                    </div>
                  )}

                  {(currentQ.solutionFiles[lang] || []).map((f, fi) => (
                    <div key={fi} style={{ marginBottom: fi < currentQ.solutionFiles[lang].length - 1 ? 10 : 0 }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "#1e293b", borderRadius: "8px 8px 0 0",
                        padding: "6px 12px",
                      }}>
                        <span style={{ fontSize: 12 }}>📄</span>
                        <code style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 700 }}>{f.filename}</code>
                      </div>
                      <pre style={{
                        background: "#0f172a", color: "#e2e8f0",
                        borderRadius: "0 0 8px 8px", padding: "10px 12px",
                        fontSize: 11, lineHeight: 1.5, margin: 0,
                        maxHeight: 220, overflow: "auto",
                      }}><code>{f.content}</code></pre>
                    </div>
                  ))}
                </div>
              ))}

              {/* Testcases */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Test Cases ({currentQ.testcases.length}) + Sample I/O ({currentQ.sampleIO.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {currentQ.testcases.slice(0, 5).map((tc, i) => (
                    <div key={i} style={{
                      background: "#f8f9fc", border: "1px solid #e4e7f0",
                      borderRadius: 8, padding: "8px 12px", fontSize: 11,
                    }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                        <span style={{ background: "#6366f1", color: "white", padding: "1px 8px", borderRadius: 20, fontSize: 10, fontWeight: 800 }}>TC{i+1}</span>
                        <span style={{ color: "#9ca3af" }}>{tc.difficulty} · {tc.score}pts</span>
                        {tc.input === null && <span style={{ color: "#f59e0b", fontWeight: 700 }}>null input</span>}
                      </div>
                      {tc.input !== null && <div style={{ color: "#374151" }}>In: <code style={{ background: "#e5e7eb", padding: "1px 5px", borderRadius: 3 }}>{tc.input}</code></div>}
                      <div style={{ color: "#374151", marginTop: 2 }}>Out: <code style={{ background: "#e5e7eb", padding: "1px 5px", borderRadius: 3 }}>{tc.output.trim().slice(0, 120)}{tc.output.trim().length > 120 ? "…" : ""}</code></div>
                    </div>
                  ))}
                  {currentQ.testcases.length > 5 && (
                    <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>+{currentQ.testcases.length - 5} more test cases</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: "14px 24px",
              borderTop: "1px solid #f1f3f5",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <button
                onClick={() => setPreviewIndex(p => Math.max(0, p - 1))}
                disabled={previewIndex === 0}
                className="cod-button cod-button-secondary cod-button-small"
              >← Prev</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#6b7280" }}>
                {previewIndex + 1} / {parsedQuestions.length}
              </span>
              <button
                onClick={() => setPreviewIndex(p => Math.min(parsedQuestions.length - 1, p + 1))}
                disabled={previewIndex === parsedQuestions.length - 1}
                className="cod-button cod-button-secondary cod-button-small"
              >Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* Format card */}
      <MultifileFormatCard />

      {/* Paste area */}
      <div className="cod-paste-area">
        <div className="cod-paste-header">
          <label className="cod-label">
            Paste AI output here (multifile format)
            {pasteInput && (
              <span className="cod-label-count">
                &nbsp;·&nbsp;{(pasteInput.match(/---QUESTION---/gi)||[]).length} block(s) detected
              </span>
            )}
          </label>
          {pasteInput && (
            <button onClick={() => { setPasteInput(""); setParsed([]); }}
              className="cod-button cod-button-secondary cod-button-small">🗑 Clear</button>
          )}
        </div>
        <textarea
          value={pasteInput}
          onChange={e => setPasteInput(e.target.value)}
          placeholder={"Paste multifile ---QUESTION--- ... ---END--- block(s) here.\nUse SOLUTION_FILE[Lang] with <filename> and <content> tags.\nFor SQL/DB questions, use 'null' as testcase input."}
          className="cod-paste-textarea"
          spellCheck={false}
        />
      </div>

      <button
        onClick={handleParse}
        disabled={!pasteInput.trim()}
        className={`cod-button cod-button-primary ${!pasteInput.trim() ? "cod-button-disabled" : ""}`}
      >
        🔍 Parse & Validate (Multifile)
      </button>

      {/* Parsed list */}
      {parsedQuestions.length > 0 && (
        <div className="cod-parsed-section">
          <div className="cod-parsed-header">
            <h4 className="cod-parsed-title">✅ {parsedQuestions.length} multifile question(s) ready</h4>
            <button onClick={() => { setPreviewIndex(0); setShowPreview(true); }}
              className="cod-button cod-button-info cod-button-small">👁 Preview All</button>
          </div>
          <div className="cod-parsed-list">
            {parsedQuestions.map((q, i) => (
              <div key={i} className="cod-parsed-item">
                <span className="cod-parsed-num">Q{i+1}</span>
                <span className="cod-parsed-qtitle">{q.title}</span>
                <span className="cod-parsed-langs">
                  {q.languages.map(l => <span key={l} className="cod-lang-pill">{l}</span>)}
                </span>
                <span className={`cod-diff-pill cod-diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                <span className="cod-parsed-tc">{q.testcases.length} TCs</span>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "#f59e0b",
                  padding: "2px 8px", borderRadius: 20,
                }}>🗂️ multifile</span>
              </div>
            ))}
          </div>
          <button
            onClick={uploadQuestions}
            disabled={isLoading}
            className={`cod-button cod-button-success ${isLoading ? "cod-button-disabled" : ""}`}
          >
            {isLoading
              ? `🔄 Uploading ${uploadProgress.current}/${uploadProgress.total}…`
              : `🚀 Upload ${parsedQuestions.length} Multifile Question(s) → "${activeQB?.qb_name}"`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── LANGUAGE REFERENCE TABLE (optional helper component) ────────────────────
export function MultifileLangReference() {
  const [search, setSearch] = useState("");
  const filtered = MULTIFILE_LANGUAGES.filter(l =>
    l.label.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{
      background: "#f8f9fc", border: "1.5px solid #e4e7f0",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
        📋 Multifile Supported Languages ({MULTIFILE_LANGUAGES.length})
      </div>
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Filter languages..."
        style={{
          width: "100%", padding: "7px 10px",
          border: "1.5px solid #e4e7f0", borderRadius: 8,
          fontSize: 12, outline: "none", marginBottom: 10, boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {filtered.map(lang => (
          <span key={lang.value} style={{
            background: "white", border: "1px solid #e4e7f0",
            borderRadius: 8, padding: "4px 10px",
            fontSize: 11, fontWeight: 600, color: "#374151",
          }}>
            {lang.label}
          </span>
        ))}
      </div>
    </div>
  );
}