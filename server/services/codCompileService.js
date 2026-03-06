// server/services/codCompileService.js

const JUDGE0_BASE = "https://ce.judge0.com";

const LANGUAGE_IDS = {
  "C": 50,
  "C#": 51,
  "C++": 54,
  "Java": 62,
  "JavaScript": 63,
  "Python": 71,
  "Python3": 71
};

async function submitToJudge0(sourceCode, languageId, stdin) {

  const submit = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin || "",
      cpu_time_limit: 5,
      memory_limit: 262144
    })
  });

  const { token } = await submit.json();

  if (!token) throw new Error("Judge0 submission failed");

  // Poll result
  for (let i = 0; i < 15; i++) {

    await sleep(1000);

    const res = await fetch(
      `${JUDGE0_BASE}/submissions/${token}?base64_encoded=false`
    );

    const result = await res.json();

    if (result.status && result.status.id > 2) {
      return result;
    }
  }

  throw new Error("Execution timeout");
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
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error",
    8: "Runtime Error",
    9: "Runtime Error",
    10: "Runtime Error",
    11: "Runtime Error",
    12: "Runtime Error"
  };

  return map[id] || "Wrong Answer";
}

export async function runTestCases({ solution, language, testcases }) {

  const languageId = LANGUAGE_IDS[language] || LANGUAGE_IDS["Java"];
  const results = [];

  for (let i = 0; i < testcases.length; i++) {

    const tc = testcases[i];

    console.log(`⚙️  Running TC ${i + 1}/${testcases.length}`);

    try {

      const r = await submitToJudge0(solution, languageId, tc.input);

      const actual = normalizeOutput(r.stdout || "");
      const expected = normalizeOutput(tc.output);

      const passed = actual === expected;

      results.push({
        tcIndex: i,
        input: tc.input,
        expected,
        actual,
        passed,
        status: getStatus(r.status?.id, passed),
        error: r.stderr || r.compile_output || null,
        time: r.time ? `${r.time}s` : "—",
        memory: r.memory ? `${r.memory}KB` : "—",
        score: passed ? (tc.score || 0) : 0
      });

    } catch (err) {

      results.push({
        tcIndex: i,
        input: tc.input,
        expected: normalizeOutput(tc.output),
        actual: "",
        passed: false,
        status: "Error",
        error: err.message,
        time: "—",
        memory: "—",
        score: 0
      });

    }

    if (i < testcases.length - 1) {
      await sleep(400);
    }
  }

  return results;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}