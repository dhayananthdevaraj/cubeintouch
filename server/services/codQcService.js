// // server/services/codQcService.js
// import { llmCall } from "./llmQueue.js";

// function stripHtml(html) {
//   if (!html) return "";
//   return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ")
//     .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
//     .replace(/\s+/g, " ").trim();
// }

// export async function analyzeCODQuestion({
//   question, inputFormat, outputFormat, sampleIO,
//   solution, language, whitelist, blacklist, difficulty, topic
// }) {
//   const fullDescription = [
//     stripHtml(question),
//     inputFormat  ? `Input Format: ${stripHtml(inputFormat)}`  : "",
//     outputFormat ? `Output Format: ${stripHtml(outputFormat)}` : "",
//   ].filter(Boolean).join("\n\n");

//   const sampleBlock = sampleIO?.length
//     ? sampleIO.map((s, i) => `Sample ${i+1}:\nInput:\n${s.input}\nOutput:\n${s.output}`).join("\n\n")
//     : "None provided";

//   const prompt = `
// You are a STRICT QC reviewer for compiler-mode programming questions on a corporate training platform.
// Your job is to find real problems — not to be lenient. A bad question that reaches students causes serious issues.

// === FULL DESCRIPTION (exactly what the student sees) ===
// ${fullDescription}

// === SAMPLE I/O ===
// ${sampleBlock}

// === REFERENCE SOLUTION (${language}) ===
// ${solution}

// === WHITELIST (keywords student MUST use, checked by automated judge) ===
// ${whitelist?.length ? whitelist.join(", ") : "None"}

// === BLACKLIST (keywords student must NOT use, checked by automated judge) ===
// ${blacklist?.length ? blacklist.join(", ") : "None"}

// Difficulty: ${difficulty || "Not set"} | Topic: ${topic || "Not set"}

// === STRICT EVALUATION RULES ===

// 1. description_completeness — BE STRICT
//    The description must be COMPLETE on its own. Check:
//    - Is it clear exactly what the program should DO?
//    - Is the INPUT FORMAT explicitly stated? (data types, number of lines, order)
//    - Is the OUTPUT FORMAT explicitly stated? (exact format, spacing, newlines)
//    - Are edge cases or constraints mentioned?
//    - Could a student write the solution WITHOUT guessing anything?
//    If ANY of these is unclear or missing → FAIL this check, score <= 5

// 2. solution_matches_description
//    Trace the solution code manually:
//    - Does it read input exactly as described?
//    - Does it produce output in exactly the format described?
//    - If the description says "print X" but solution prints "X\n extra" → FAIL

// 3. sample_io_validity
//    If samples are missing → WARN
//    If samples are present, mentally execute the solution with each sample input:
//    - Does it produce the EXACT expected output (including spacing/newlines)?
//    - If NO samples provided → score this as warn

// 4. whitelist_in_description
//    Each whitelist keyword represents a concept the student MUST use.
//    - Is EACH whitelist keyword explicitly mentioned or clearly implied in the description?
//    - If a student cannot know they need to use "ArrayList" from reading the description → FAIL
//    - "Can be inferred" is NOT sufficient — it must be EXPLICIT or strongly implied

// 5. whitelist_in_solution
//    - Does the solution code literally contain each whitelist keyword as a token?
//    - Check case-sensitively for Java/C++, case-insensitively for Python

// 6. blacklist_violation
//    - Does the solution contain any blacklisted keyword as a code token?
//    - String.contains() style match — not just substring

// 7. difficulty_match
//    - Easy: basic I/O, simple loops/conditions
//    - Medium: data structures, moderate logic, multiple steps
//    - Hard: complex algorithms, advanced DS, optimization
//    - Mismatch → WARN or FAIL depending on severity

// === SCORING RULES (STRICT) ===
// - description_completeness FAIL → overallScore MAX 4, status = FAIL
// - solution_matches_description FAIL → overallScore MAX 5, status = FAIL
// - sample_io_validity FAIL → overallScore MAX 6, status = FAIL or WARN
// - blacklist_violation FAIL → status = FAIL always
// - whitelist_in_description FAIL → overallScore -2
// - All checks pass → overallScore 8-10
// - Minor warns only → overallScore 6-7, status = WARN

// Return ONLY this JSON (no markdown, no backticks, no explanation):
// {
//   "overallScore": <0-10>,
//   "status": "<PASS|WARN|FAIL>",
//   "summary": "<2-3 sentences. Be specific about what's wrong or right.>",
//   "checks": [
//     { "name": "Description Completeness",    "key": "description_completeness",    "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": <"specific fix" or null> },
//     { "name": "Solution Matches Description","key": "solution_matches_description", "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": <"specific fix" or null> },
//     { "name": "Sample I/O Validity",         "key": "sample_io_validity",          "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": <"specific fix" or null> },
//     { "name": "Whitelist in Description",    "key": "whitelist_in_description",    "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": <"specific fix" or null> },
//     { "name": "Whitelist in Solution",       "key": "whitelist_in_solution",       "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": <"specific fix" or null> },
//     { "name": "Blacklist Violation",         "key": "blacklist_violation",         "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": <"specific fix" or null> },
//     { "name": "Difficulty Match",            "key": "difficulty_match",            "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": <"specific fix" or null> }
//   ]
// }`;

//   const { text, provider, model } = await llmCall({
//     task: "cod-qc",
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens: 1500,
//   });

//   console.log(`  ✅ COD QC via [${provider}] model: ${model}`);

//   const cleaned = text
//     .replace(/^```json\s*/gi, "")
//     .replace(/^```\s*/gi, "")
//     .replace(/```\s*$/gi, "")
//     .trim();

//   const parsed = JSON.parse(cleaned);
//   if (!parsed.checks || !Array.isArray(parsed.checks)) {
//     throw new Error("Invalid QC response from LLM");
//   }

//   return parsed;
// }


// server/services/codQcService.js
import { llmCall } from "./llmQueue.js";

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────────────────────
// STEP 1 — Generate a fresh AI solution from description alone
// ─────────────────────────────────────────────────────────────
export async function generateAISolution({
  question, inputFormat, outputFormat, sampleIO,
  language, whitelist, blacklist, difficulty, topic,
}) {
  const fullDescription = [
    stripHtml(question),
    inputFormat  ? `Input Format:\n${stripHtml(inputFormat)}`  : "",
    outputFormat ? `Output Format:\n${stripHtml(outputFormat)}` : "",
  ].filter(Boolean).join("\n\n");

  const sampleBlock = sampleIO?.length
    ? sampleIO.map((s, i) =>
        `Sample ${i + 1}:\nInput:\n${s.input}\nExpected Output:\n${s.output}`
      ).join("\n\n")
    : "None provided";

  const whitelistNote = whitelist?.length
    ? `You MUST use these keywords/constructs in your solution: ${whitelist.join(", ")}`
    : "";

  const blacklistNote = blacklist?.length
    ? `You must NOT use these keywords/constructs: ${blacklist.join(", ")}`
    : "";

  const prompt = `
You are an expert competitive programmer. Your job is to write a correct, clean ${language} solution
for the following programming problem.

IMPORTANT RULES:
- Write ONLY the complete, runnable ${language} solution code
- Do NOT reference any pre-existing solution — write it yourself purely from the description
- The solution must handle ALL edge cases implied by the description
- Match the output format EXACTLY (spacing, newlines, capitalization)
- Do NOT add any explanation, comments beyond what helps, or markdown fences
${whitelistNote ? `- ${whitelistNote}` : ""}
${blacklistNote ? `- ${blacklistNote}` : ""}

=== PROBLEM STATEMENT ===
${fullDescription}

=== SAMPLE I/O ===
${sampleBlock}

Difficulty: ${difficulty || "Not set"} | Topic: ${topic || "Not set"}

Return ONLY the raw ${language} source code. No markdown. No explanation. No backticks.
`.trim();

  const { text, provider, model } = await llmCall({
    task: "cod-ai-solution",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.15,
    max_tokens: 2000,
  });

  console.log(`  ✅ AI Solution generated via [${provider}] model: ${model}`);

  // Strip any accidental markdown fences
  const code = text
    .replace(/^```[\w]*\s*/gi, "")
    .replace(/```\s*$/gi, "")
    .trim();

  return { code, provider, model };
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — QC: check description, I/O formats, sample I/O
//           Does NOT look at the ref solution at all
// ─────────────────────────────────────────────────────────────
export async function analyzeCODQuestion({
  question, inputFormat, outputFormat, sampleIO,
  language, whitelist, blacklist, difficulty, topic,
  aiSolutionCode,          // the AI-generated code (from step 1)
  compileResults,          // results from running AI solution against TCs
}) {
  const fullDescription = [
    stripHtml(question),
    inputFormat  ? `Input Format:\n${stripHtml(inputFormat)}`  : "",
    outputFormat ? `Output Format:\n${stripHtml(outputFormat)}` : "",
  ].filter(Boolean).join("\n\n");

  const sampleBlock = sampleIO?.length
    ? sampleIO.map((s, i) =>
        `Sample ${i + 1}:\nInput:\n${s.input}\nExpected Output:\n${s.output}`
      ).join("\n\n")
    : "None provided";

  // Summarise compile results for the LLM
  const compileSummary = compileResults
    ? (() => {
        const { summary, results } = compileResults;
        const failedCases = (results || [])
          .filter(r => !r.passed)
          .slice(0, 3)
          .map((r, i) =>
            `TC${i + 1}: input="${r.input}" | expected="${r.expected}" | got="${r.actual}" | status=${r.status}`
          )
          .join("\n");
        return `Passed: ${summary?.passed}/${summary?.total}\n${failedCases ? `Failed cases:\n${failedCases}` : "All passed."}`;
      })()
    : "Compile results not available.";

  const prompt = `
You are a STRICT QC reviewer for compiler-mode programming questions on a corporate training platform.
You are NOT evaluating the reference solution. Instead, an AI independently generated a solution
purely from the description, and we ran it against the judge's test cases. Use that to validate
whether the question description is correct and complete.

=== FULL DESCRIPTION (exactly what students see) ===
${fullDescription}

=== SAMPLE I/O ===
${sampleBlock}

=== AI-GENERATED SOLUTION (${language}) ===
${aiSolutionCode || "Not generated"}

=== COMPILE / TEST CASE RESULTS ===
${compileSummary}

=== WHITELIST (keywords student MUST use) ===
${whitelist?.length ? whitelist.join(", ") : "None"}

=== BLACKLIST (keywords student must NOT use) ===
${blacklist?.length ? blacklist.join(", ") : "None"}

Difficulty: ${difficulty || "Not set"} | Topic: ${topic || "Not set"}

=== EVALUATION RULES ===

1. description_completeness — STRICT
   - Is it COMPLETELY clear what the program must do?
   - Is input format explicit? (types, number of lines, order, constraints)
   - Is output format explicit? (exact format, spacing, newlines, case)
   - Could a competent programmer solve this WITHOUT guessing anything?
   → If anything is ambiguous or missing: FAIL, score ≤ 5

2. input_format_clarity
   - Is the input format section present and unambiguous?
   - Are data types, ranges, and structure explicitly described?
   → Missing or vague input spec: FAIL

3. output_format_clarity
   - Is the output format section present and unambiguous?
   - Are exact spacing, newlines, and format explicitly described?
   → Missing or vague output spec: FAIL

4. sample_io_validity
   - Are samples present? (missing samples → WARN)
   - Do the sample inputs/outputs match the description logically?
   - Mentally trace: does the problem description support deriving sample outputs from sample inputs?
   → Inconsistency: FAIL

5. description_testcase_alignment
   THIS IS THE KEY CHECK — use the compile results to judge description quality:
   - If the AI solution (written purely from description) PASSED all/most test cases:
     → The description was clear enough: PASS
   - If the AI solution FAILED many test cases:
     → The description was likely ambiguous, incomplete, or misleading: FAIL
     → Identify what was likely unclear based on the failure pattern
   - If partial pass: WARN, investigate what might be underspecified

6. whitelist_in_description
   - Is each whitelist keyword mentioned or clearly implied in the description?
   → Not explicit: FAIL

7. difficulty_match
   - Does difficulty label match actual problem complexity?
   → Mismatch: WARN or FAIL

=== SCORING ===
- description_completeness FAIL → max score 4, status FAIL
- description_testcase_alignment FAIL → max score 5, status FAIL  
- input_format_clarity FAIL → max score 6, status FAIL
- output_format_clarity FAIL → max score 6, status FAIL
- All pass → score 8–10
- Only warns → score 6–7, status WARN

Return ONLY this JSON (no markdown, no backticks, no explanation):
{
  "overallScore": <0-10>,
  "status": "<PASS|WARN|FAIL>",
  "summary": "<2-3 sentences. Be specific about what is correct or wrong.>",
  "aiSolutionVerdict": "<brief verdict on whether AI solution passing/failing implies description quality>",
  "checks": [
    { "name": "Description Completeness",       "key": "description_completeness",       "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
    { "name": "Input Format Clarity",           "key": "input_format_clarity",           "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
    { "name": "Output Format Clarity",          "key": "output_format_clarity",          "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
    { "name": "Sample I/O Validity",            "key": "sample_io_validity",             "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
    { "name": "Description → Testcase Alignment","key": "description_testcase_alignment","status": "<pass|warn|fail>", "message": "<specific finding based on compile results>", "suggestion": "<specific fix or null>" },
    { "name": "Whitelist in Description",       "key": "whitelist_in_description",       "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
    { "name": "Difficulty Match",               "key": "difficulty_match",               "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" }
  ]
}`.trim();

  const { text, provider, model } = await llmCall({
    task: "cod-qc",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 1800,
  });

  console.log(`  ✅ COD QC via [${provider}] model: ${model}`);

  const cleaned = text
    .replace(/^```json\s*/gi, "")
    .replace(/^```\s*/gi, "")
    .replace(/```\s*$/gi, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  if (!parsed.checks || !Array.isArray(parsed.checks)) {
    throw new Error("Invalid QC response from LLM");
  }

  return parsed;
}