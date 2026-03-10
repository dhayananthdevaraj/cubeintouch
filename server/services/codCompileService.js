// // server/services/codCompileService.js

// const JUDGE0_BASE = "https://ce.judge0.com";

// const LANGUAGE_IDS = {
//   "C": 50,
//   "C#": 51,
//   "C++": 54,
//   "Java": 62,
//   "JavaScript": 63,
//   "Python": 71,
//   "Python3": 71
// };

// async function submitToJudge0(sourceCode, languageId, stdin) {

//   const submit = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=false`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({
//       source_code: sourceCode,
//       language_id: languageId,
//       stdin: stdin || "",
//       cpu_time_limit: 5,
//       memory_limit: 262144
//     })
//   });

//   const { token } = await submit.json();

//   if (!token) throw new Error("Judge0 submission failed");

//   // Poll result
//   for (let i = 0; i < 15; i++) {

//     await sleep(1000);

//     const res = await fetch(
//       `${JUDGE0_BASE}/submissions/${token}?base64_encoded=false`
//     );

//     const result = await res.json();

//     if (result.status && result.status.id > 2) {
//       return result;
//     }
//   }

//   throw new Error("Execution timeout");
// }

// function normalizeOutput(str) {
//   if (!str) return "";
//   return str
//     .replace(/\r\n/g, "\n")
//     .replace(/\r/g, "\n")
//     .trim()
//     .split("\n")
//     .map(l => l.trimEnd())
//     .join("\n");
// }

// function getStatus(id, passed) {
//   if (passed) return "Accepted";

//   const map = {
//     4: "Wrong Answer",
//     5: "Time Limit Exceeded",
//     6: "Compilation Error",
//     7: "Runtime Error",
//     8: "Runtime Error",
//     9: "Runtime Error",
//     10: "Runtime Error",
//     11: "Runtime Error",
//     12: "Runtime Error"
//   };

//   return map[id] || "Wrong Answer";
// }

// export async function runTestCases({ solution, language, testcases }) {

//   const languageId = LANGUAGE_IDS[language] || LANGUAGE_IDS["Java"];
//   const results = [];

//   for (let i = 0; i < testcases.length; i++) {

//     const tc = testcases[i];

//     console.log(`⚙️  Running TC ${i + 1}/${testcases.length}`);

//     try {

//       const r = await submitToJudge0(solution, languageId, tc.input);

//       const actual = normalizeOutput(r.stdout || "");
//       const expected = normalizeOutput(tc.output);

//       const passed = actual === expected;

//       results.push({
//         tcIndex: i,
//         input: tc.input,
//         expected,
//         actual,
//         passed,
//         status: getStatus(r.status?.id, passed),
//         error: r.stderr || r.compile_output || null,
//         time: r.time ? `${r.time}s` : "—",
//         memory: r.memory ? `${r.memory}KB` : "—",
//         score: passed ? (tc.score || 0) : 0
//       });

//     } catch (err) {

//       results.push({
//         tcIndex: i,
//         input: tc.input,
//         expected: normalizeOutput(tc.output),
//         actual: "",
//         passed: false,
//         status: "Error",
//         error: err.message,
//         time: "—",
//         memory: "—",
//         score: 0
//       });

//     }

//     if (i < testcases.length - 1) {
//       await sleep(400);
//     }
//   }

//   return results;
// }

// function sleep(ms) {
//   return new Promise(r => setTimeout(r, ms));
// }

// server/services/codCompileService.js



//9mar
const JUDGE0_BASE = "https://ce.judge0.com";

const LANGUAGE_IDS = {
  "C":          50,
  "C#":         51,
  "C++":        54,
  "Java":       62,
  "JavaScript": 63,
  "Python":     71,
  "Python3":    71,
};

// ── Configurable delay between TC submissions (ms) ──────────────────────────
// Judge0 free tier: ~60 submissions/min → ~1000ms apart is safe
// Increase if you hit 429s from Judge0
const TC_DELAY_MS = 1200;

async function submitToJudge0(sourceCode, languageId, stdin) {
  const submit = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code:    sourceCode,
      language_id:    languageId,
      stdin:          stdin || "",
      cpu_time_limit: 5,
      memory_limit:   262144,
    }),
  });

  if (!submit.ok) {
    const errText = await submit.text();
    throw new Error(`Judge0 submit failed (${submit.status}): ${errText}`);
  }

  const { token } = await submit.json();
  if (!token) throw new Error("Judge0 returned no token");

  // Poll with back-off
  for (let i = 0; i < 20; i++) {
    await sleep(1000);

    const res    = await fetch(`${JUDGE0_BASE}/submissions/${token}?base64_encoded=false`);
    const result = await res.json();

    // status.id > 2 means processing is complete
    if (result.status && result.status.id > 2) {
      return result;
    }
  }

  throw new Error("Judge0 execution timeout");
}

function normalizeOutput(str) {
  if (!str) return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n")
    .map(l => l.trimEnd())
    .join("\n");
}

function getStatus(id, passed) {
  if (passed) return "Accepted";
  const map = {
    4:  "Wrong Answer",
    5:  "Time Limit Exceeded",
    6:  "Compilation Error",
    7:  "Runtime Error (SIGSEGV)",
    8:  "Runtime Error (SIGFPE)",
    9:  "Runtime Error (SIGKILL)",
    10: "Runtime Error (SIGILL)",
    11: "Runtime Error (NZEC)",
    12: "Runtime Error (Other)",
    13: "Internal Error",
    14: "Exec Format Error",
  };
  return map[id] || "Wrong Answer";
}

export async function runTestCases({ solution, language, testcases }) {
  const languageId = LANGUAGE_IDS[language] || LANGUAGE_IDS["Java"];
  const results    = [];

  for (let i = 0; i < testcases.length; i++) {
    const tc = testcases[i];

    console.log(`⚙️  Running TC ${i + 1}/${testcases.length}`);

    try {
      const r = await submitToJudge0(solution, languageId, tc.input);

      const actual   = normalizeOutput(r.stdout || "");
      const expected = normalizeOutput(tc.output);
      const passed   = actual === expected;

      results.push({
        tcIndex:  i,
        input:    tc.input,
        expected,
        actual,
        passed,
        status:   getStatus(r.status?.id, passed),
        error:    r.stderr || r.compile_output || null,
        time:     r.time   ? `${r.time}s` : "—",
        memory:   r.memory ? `${r.memory}KB` : "—",
        score:    passed ? (tc.score || 0) : 0,
      });
    } catch (err) {
      results.push({
        tcIndex:  i,
        input:    tc.input,
        expected: normalizeOutput(tc.output),
        actual:   "",
        passed:   false,
        status:   "Error",
        error:    err.message,
        time:     "—",
        memory:   "—",
        score:    0,
      });
    }

    // ── Rate-limit guard: wait between each TC submission ──────────────────
    // Prevents Judge0 free tier 429s (60 req/min limit)
    if (i < testcases.length - 1) {
      await sleep(TC_DELAY_MS);
    }
  }

  return results;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}