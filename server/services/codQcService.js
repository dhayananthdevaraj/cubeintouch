
// // // server/services/codQcService.js
// // import { llmCall } from "./llmQueue.js";

// // function stripHtml(html) {
// //   if (!html) return "";
// //   return html
// //     .replace(/<[^>]*>/g, " ")
// //     .replace(/&nbsp;/g, " ")
// //     .replace(/&lt;/g, "<")
// //     .replace(/&gt;/g, ">")
// //     .replace(/&amp;/g, "&")
// //     .replace(/\s+/g, " ")
// //     .trim();
// // }

// // // ─────────────────────────────────────────────────────────────
// // // STEP 1 — Generate a fresh AI solution from description alone
// // // ─────────────────────────────────────────────────────────────
// // export async function generateAISolution({
// //   question, inputFormat, outputFormat, sampleIO,
// //   language, whitelist, blacklist, difficulty, topic,
// // }) {
// //   const fullDescription = [
// //     stripHtml(question),
// //     inputFormat  ? `Input Format:\n${stripHtml(inputFormat)}`  : "",
// //     outputFormat ? `Output Format:\n${stripHtml(outputFormat)}` : "",
// //   ].filter(Boolean).join("\n\n");

// //   const sampleBlock = sampleIO?.length
// //     ? sampleIO.map((s, i) =>
// //         `Sample ${i + 1}:\nInput:\n${s.input}\nExpected Output:\n${s.output}`
// //       ).join("\n\n")
// //     : "None provided";

// //   const whitelistNote = whitelist?.length
// //     ? `You MUST use these keywords/constructs in your solution: ${whitelist.join(", ")}`
// //     : "";

// //   const blacklistNote = blacklist?.length
// //     ? `You must NOT use these keywords/constructs: ${blacklist.join(", ")}`
// //     : "";

// //   const prompt = `
// // You are an expert competitive programmer. Your job is to write a correct, clean ${language} solution
// // for the following programming problem.

// // IMPORTANT RULES:
// // - Write ONLY the complete, runnable ${language} solution code
// // - Do NOT reference any pre-existing solution — write it yourself purely from the description
// // - The solution must handle ALL edge cases implied by the description
// // - Match the output format EXACTLY (spacing, newlines, capitalization)
// // - Do NOT add any explanation, comments beyond what helps, or markdown fences
// // ${whitelistNote ? `- ${whitelistNote}` : ""}
// // ${blacklistNote ? `- ${blacklistNote}` : ""}

// // === PROBLEM STATEMENT ===
// // ${fullDescription}

// // === SAMPLE I/O ===
// // ${sampleBlock}

// // Difficulty: ${difficulty || "Not set"} | Topic: ${topic || "Not set"}

// // Return ONLY the raw ${language} source code. No markdown. No explanation. No backticks.
// // `.trim();

// //   const { text, provider, model } = await llmCall({
// //     task: "cod-ai-solution",
// //     messages: [{ role: "user", content: prompt }],
// //     temperature: 0.15,
// //     max_tokens: 2000,
// //   });

// //   console.log(`  ✅ AI Solution generated via [${provider}] model: ${model}`);

// //   // Strip any accidental markdown fences
// //   const code = text
// //     .replace(/^```[\w]*\s*/gi, "")
// //     .replace(/```\s*$/gi, "")
// //     .trim();

// //   return { code, provider, model };
// // }

// // // ─────────────────────────────────────────────────────────────
// // // STEP 2 — QC: check description, I/O formats, sample I/O
// // //           Does NOT look at the ref solution at all
// // // ─────────────────────────────────────────────────────────────
// // export async function analyzeCODQuestion({
// //   question, inputFormat, outputFormat, sampleIO,
// //   language, whitelist, blacklist, difficulty, topic,
// //   aiSolutionCode,          // the AI-generated code (from step 1)
// //   compileResults,          // results from running AI solution against TCs
// // }) {
// //   const fullDescription = [
// //     stripHtml(question),
// //     inputFormat  ? `Input Format:\n${stripHtml(inputFormat)}`  : "",
// //     outputFormat ? `Output Format:\n${stripHtml(outputFormat)}` : "",
// //   ].filter(Boolean).join("\n\n");

// //   const sampleBlock = sampleIO?.length
// //     ? sampleIO.map((s, i) =>
// //         `Sample ${i + 1}:\nInput:\n${s.input}\nExpected Output:\n${s.output}`
// //       ).join("\n\n")
// //     : "None provided";

// //   // Summarise compile results for the LLM
// //   const compileSummary = compileResults
// //     ? (() => {
// //         const { summary, results } = compileResults;
// //         const failedCases = (results || [])
// //           .filter(r => !r.passed)
// //           .slice(0, 3)
// //           .map((r, i) =>
// //             `TC${i + 1}: input="${r.input}" | expected="${r.expected}" | got="${r.actual}" | status=${r.status}`
// //           )
// //           .join("\n");
// //         return `Passed: ${summary?.passed}/${summary?.total}\n${failedCases ? `Failed cases:\n${failedCases}` : "All passed."}`;
// //       })()
// //     : "Compile results not available.";

// //   const prompt = `
// // You are a STRICT QC reviewer for compiler-mode programming questions on a corporate training platform.
// // You are NOT evaluating the reference solution. Instead, an AI independently generated a solution
// // purely from the description, and we ran it against the judge's test cases. Use that to validate
// // whether the question description is correct and complete.

// // === FULL DESCRIPTION (exactly what students see) ===
// // ${fullDescription}

// // === SAMPLE I/O ===
// // ${sampleBlock}

// // === AI-GENERATED SOLUTION (${language}) ===
// // ${aiSolutionCode || "Not generated"}

// // === COMPILE / TEST CASE RESULTS ===
// // ${compileSummary}

// // === WHITELIST (keywords student MUST use) ===
// // ${whitelist?.length ? whitelist.join(", ") : "None"}

// // === BLACKLIST (keywords student must NOT use) ===
// // ${blacklist?.length ? blacklist.join(", ") : "None"}

// // Difficulty: ${difficulty || "Not set"} | Topic: ${topic || "Not set"}

// // === EVALUATION RULES ===

// // 1. description_completeness — STRICT
// //    - Is it COMPLETELY clear what the program must do?
// //    - Is input format explicit? (types, number of lines, order, constraints)
// //    - Is output format explicit? (exact format, spacing, newlines, case)
// //    - Could a competent programmer solve this WITHOUT guessing anything?
// //    → If anything is ambiguous or missing: FAIL, score ≤ 5

// // 2. input_format_clarity
// //    - Is the input format section present and unambiguous?
// //    - Are data types, ranges, and structure explicitly described?
// //    → Missing or vague input spec: FAIL

// // 3. output_format_clarity
// //    - Is the output format section present and unambiguous?
// //    - Are exact spacing, newlines, and format explicitly described?
// //    → Missing or vague output spec: FAIL

// // 4. sample_io_validity
// //    - Are samples present? (missing samples → WARN)
// //    - Do the sample inputs/outputs match the description logically?
// //    - Mentally trace: does the problem description support deriving sample outputs from sample inputs?
// //    → Inconsistency: FAIL

// // 5. description_testcase_alignment
// //    THIS IS THE KEY CHECK — use the compile results to judge description quality:
// //    - If the AI solution (written purely from description) PASSED all/most test cases:
// //      → The description was clear enough: PASS
// //    - If the AI solution FAILED many test cases:
// //      → The description was likely ambiguous, incomplete, or misleading: FAIL
// //      → Identify what was likely unclear based on the failure pattern
// //    - If partial pass: WARN, investigate what might be underspecified

// // 6. whitelist_in_description
// //    - Is each whitelist keyword mentioned or clearly implied in the description?
// //    → Not explicit: FAIL

// // 7. difficulty_match
// //    - Does difficulty label match actual problem complexity?
// //    → Mismatch: WARN or FAIL

// // === SCORING ===
// // - description_completeness FAIL → max score 4, status FAIL
// // - description_testcase_alignment FAIL → max score 5, status FAIL  
// // - input_format_clarity FAIL → max score 6, status FAIL
// // - output_format_clarity FAIL → max score 6, status FAIL
// // - All pass → score 8–10
// // - Only warns → score 6–7, status WARN

// // Return ONLY this JSON (no markdown, no backticks, no explanation):
// // {
// //   "overallScore": <0-10>,
// //   "status": "<PASS|WARN|FAIL>",
// //   "summary": "<2-3 sentences. Be specific about what is correct or wrong.>",
// //   "aiSolutionVerdict": "<brief verdict on whether AI solution passing/failing implies description quality>",
// //   "checks": [
// //     { "name": "Description Completeness",       "key": "description_completeness",       "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
// //     { "name": "Input Format Clarity",           "key": "input_format_clarity",           "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
// //     { "name": "Output Format Clarity",          "key": "output_format_clarity",          "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
// //     { "name": "Sample I/O Validity",            "key": "sample_io_validity",             "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
// //     { "name": "Description → Testcase Alignment","key": "description_testcase_alignment","status": "<pass|warn|fail>", "message": "<specific finding based on compile results>", "suggestion": "<specific fix or null>" },
// //     { "name": "Whitelist in Description",       "key": "whitelist_in_description",       "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" },
// //     { "name": "Difficulty Match",               "key": "difficulty_match",               "status": "<pass|warn|fail>", "message": "<specific finding>", "suggestion": "<specific fix or null>" }
// //   ]
// // }`.trim();

// //   const { text, provider, model } = await llmCall({
// //     task: "cod-qc",
// //     messages: [{ role: "user", content: prompt }],
// //     temperature: 0.1,
// //     max_tokens: 1800,
// //   });

// //   console.log(`  ✅ COD QC via [${provider}] model: ${model}`);

// //   const cleaned = text
// //     .replace(/^```json\s*/gi, "")
// //     .replace(/^```\s*/gi, "")
// //     .replace(/```\s*$/gi, "")
// //     .trim();

// //   const parsed = JSON.parse(cleaned);
// //   if (!parsed.checks || !Array.isArray(parsed.checks)) {
// //     throw new Error("Invalid QC response from LLM");
// //   }

// //   return parsed;
// // }



// //9mar
// // server/services/codQcService.js
// import { llmCall } from "./llmQueue.js";

// function stripHtml(html) {
//   if (!html) return "";
//   return html
//     .replace(/<[^>]*>/g, " ")
//     .replace(/&nbsp;/g, " ")
//     .replace(/&lt;/g, "<")
//     .replace(/&gt;/g, ">")
//     .replace(/&amp;/g, "&")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// // Strip <think>...</think> blocks from reasoning models
// function stripThinkBlocks(raw) {
//   if (!raw) return raw;
//   return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
// }

// // Extract first {...} JSON object from anywhere in the response text.
// // Works regardless of preamble, markdown headers, code fences, or trailing text.
// function extractJSON(raw) {
//   const cleaned = stripThinkBlocks(raw)
//     .replace(/```json/gi, "")
//     .replace(/```/g, "")
//     .trim();

//   const start = cleaned.indexOf("{");
//   const end   = cleaned.lastIndexOf("}");
//   if (start !== -1 && end !== -1 && end > start) {
//     return cleaned.slice(start, end + 1);
//   }
//   return null; // signal: no JSON found
// }

// // Call llmCall, get text back, extract JSON from it.
// // If no JSON in first response, send the raw text back to the model
// // with a single follow-up: "Convert that to JSON."
// async function llmCallWithJSONRetry({ task, messages, temperature, max_tokens }) {
//   const { text, provider, model } = await llmCall({ task, messages, temperature, max_tokens });

//   const json = extractJSON(text);
//   if (json) {
//     try { return JSON.parse(json); } catch (_) {}
//   }

//   // Model returned prose — ask it to convert its own answer to JSON
//   console.warn(`  ⚠️  [${task}] No JSON in response, retrying with extract prompt...`);
//   const retryMessages = [
//     ...messages,
//     { role: "assistant", content: text },
//     { role: "user",      content: 'Convert your answer to this exact JSON format (no other text):\n{"status":"pass|warn|fail","finding":"one sentence","fix":"one sentence or null"}' },
//   ];

//   const { text: retryText } = await llmCall({ task, messages: retryMessages, temperature: 0, max_tokens: 150 });
//   const retryJson = extractJSON(retryText);
//   if (retryJson) {
//     return JSON.parse(retryJson);
//   }

//   throw new Error(`[${task}] Model did not return JSON after retry. Last response: ${retryText.slice(0, 200)}`);
// }

// // Each check returns ONLY this tiny shape:
// // {"status":"pass|warn|fail","finding":"one sentence","fix":"one sentence or null"}
// function parseCheckJSON(raw) {
//   // Only used for simple inline parses — main checks use llmCallWithJSONRetry
//   const json = extractJSON(raw);
//   if (!json) throw new Error(`No JSON found: ${raw.slice(0, 120)}`);
//   return JSON.parse(json);
// }

// const RETURN_FORMAT = `Return ONLY this JSON (no markdown, no extra text):
// {"status":"pass|warn|fail","finding":"one sentence","fix":"one sentence or null"}`;

// function buildCtx({ desc, samples, refCode, language }) {
//   return `DESCRIPTION:\n${desc}\n\nSAMPLES: ${samples}\n\nREF SOLUTION (${language}):\n${refCode}`;
// }

// // Run tasks in sequential pairs — avoids concurrent request errors on Groq
// // But since each check now uses a DIFFERENT model, we can safely run 2 at a time
// async function runInBatches(tasks, batchSize = 2) {
//   const results = [];
//   for (let i = 0; i < tasks.length; i += batchSize) {
//     const batch = tasks.slice(i, i + batchSize);
//     const batchResults = await Promise.all(batch.map(fn => fn()));
//     results.push(...batchResults);
//   }
//   return results;
// }

// // ─────────────────────────────────────────────────────────────
// // STEP 1 — Generate AI solution from description alone
// // Task: "cod-ai-solution" → llama-3.3-70b-versatile
// // ─────────────────────────────────────────────────────────────
// export async function generateAISolution({
//   question, inputFormat, outputFormat, sampleIO,
//   language, whitelist, blacklist, difficulty, topic,
// }) {
//   const desc = [
//     stripHtml(question),
//     inputFormat  ? `Input Format:\n${stripHtml(inputFormat)}`  : "",
//     outputFormat ? `Output Format:\n${stripHtml(outputFormat)}` : "",
//   ].filter(Boolean).join("\n\n");

//   const samples = sampleIO?.length
//     ? sampleIO.map((s, i) => `Sample ${i + 1}:\nInput: ${s.input}\nOutput: ${s.output}`).join("\n\n")
//     : "None";

//   const prompt = `Write a correct ${language} solution for this problem. Return ONLY raw code, no markdown.
// ${whitelist?.length ? `Must use: ${whitelist.join(", ")}` : ""}
// ${blacklist?.length ? `Must NOT use: ${blacklist.join(", ")}` : ""}

// PROBLEM:
// ${desc}

// SAMPLES:
// ${samples}

// Return ONLY runnable ${language} code.`.trim();

//   const { text, provider, model } = await llmCall({
//     task: "cod-ai-solution",        // → llama-3.3-70b-versatile
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.15,
//     max_tokens: 2000,
//   });

//   console.log(`  ✅ AI Solution via [${provider}] ${model}`);

//   const code = text
//     .replace(/^```[\w]*\s*/gi, "")
//     .replace(/```\s*$/gi, "")
//     .trim();

//   return { code, provider, model };
// }

// // ─────────────────────────────────────────────────────────────
// // 6 QC CHECKS — each uses a DEDICATED task → dedicated model
// // Spread across 5 different models = no single model hit twice
// //
// //  qc-desc       → llama-4-scout-17b   (30K TPM, strong logic)
// //  qc-input      → qwen3-32b           (60 RPM, fast)
// //  qc-output     → qwen3-32b           (60 RPM, fast)
// //  qc-sample     → kimi-k2-instruct    (60 RPM, fast)
// //  qc-whitelist  → llama-3.1-8b-instant (trivial keyword check)
// //  qc-difficulty → llama-3.1-8b-instant (trivial label check)
// //  qc-ai-failure → llama-4-scout-17b   (30K TPM)
// // ─────────────────────────────────────────────────────────────

// async function checkDescVsRef({ ctx }) {
//   const prompt = `You are a strict QC reviewer for a coding platform.

// ${ctx}

// TASK: Does the description COMPLETELY and ACCURATELY describe what the reference solution computes?
// - Read the ref solution logic carefully
// - Would a competent programmer arrive at the same algorithm from the description alone?
// - If the description would lead to different logic: FAIL

// ${RETURN_FORMAT}`;

//   const result = await llmCallWithJSONRetry({
//     task: "qc-desc",                // → llama-4-scout-17b-16e-instruct
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens: 200,
//   });
//   return { key: "desc_vs_ref", name: "Description matches Ref Solution Logic", ...result };
// }

// async function checkInputFormat({ ctx }) {
//   const prompt = `You are a strict QC reviewer for a coding platform.

// ${ctx}

// TASK: Is the INPUT FORMAT section present and unambiguous?
// - Are data types, number of input lines, order, and constraints explicitly stated?
// - Does it match exactly what the ref solution reads from stdin?

// ${RETURN_FORMAT}`;

//   const result = await llmCallWithJSONRetry({
//     task: "qc-input",               // → qwen3-32b (60 RPM)
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens: 200,
//   });
//   return { key: "input_format", name: "Input Format Clarity", ...result };
// }

// async function checkOutputFormat({ ctx }) {
//   const prompt = `You are a strict QC reviewer for a coding platform.

// ${ctx}

// TASK: Is the OUTPUT FORMAT section present and unambiguous?
// - Are spacing, newlines, capitalization, and format explicitly described?
// - Does it match exactly what the ref solution prints to stdout?

// ${RETURN_FORMAT}`;

//   const result = await llmCallWithJSONRetry({
//     task: "qc-output",              // → qwen3-32b (60 RPM)
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens: 200,
//   });
//   return { key: "output_format", name: "Output Format Clarity", ...result };
// }

// async function checkSampleValidity({ ctx, sampleIO }) {
//   if (!sampleIO?.length) {
//     return {
//       key: "sample_validity", name: "Sample I/O matches Ref",
//       status: "warn", finding: "No sample I/O provided.",
//       fix: "Add at least one sample input/output pair.",
//     };
//   }

//   const prompt = `You are a strict QC reviewer for a coding platform.

// ${ctx}

// TASK: Do the sample I/O pairs match what the reference solution would produce?
// - Trace the ref solution logic with each sample input
// - Check if the sample output matches what the ref solution outputs
// - Also verify samples are consistent with the description

// ${RETURN_FORMAT}`;

//   const result = await llmCallWithJSONRetry({
//     task: "qc-sample",              // → kimi-k2-instruct (60 RPM)
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens: 200,
//   });
//   return { key: "sample_validity", name: "Sample I/O matches Ref", ...result };
// }

// async function checkWhitelistCoverage({ ctx, whitelist }) {
//   if (!whitelist?.length) {
//     return {
//       key: "whitelist_coverage", name: "Whitelist in Description",
//       status: "pass", finding: "No whitelist defined.", fix: null,
//     };
//   }

//   const prompt = `You are a strict QC reviewer for a coding platform.

// ${ctx}

// Whitelist (student MUST use): ${whitelist.join(", ")}

// TASK: Is each whitelist keyword explicitly mentioned or clearly implied in the description?
// - The description itself must guide students to use these constructs
// - If any required keyword is not mentioned or implied: FAIL

// ${RETURN_FORMAT}`;

//   const result = await llmCallWithJSONRetry({
//     task: "qc-whitelist",           // → llama-3.1-8b-instant (trivial check)
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens: 200,
//   });
//   return { key: "whitelist_coverage", name: "Whitelist in Description", ...result };
// }

// async function checkDifficultyMatch({ ctx, difficulty }) {
//   const prompt = `You are a strict QC reviewer for a coding platform.

// ${ctx}

// Assigned difficulty: ${difficulty || "Not set"}

// TASK: Does the difficulty label match the actual problem complexity based on the ref solution?
// Easy=simple loop/math, Medium=multiple loops/string ops/basic DS, Hard=complex algorithm/DP/graphs.
// If mislabeled: WARN for minor mismatch, FAIL for very wrong.

// ${RETURN_FORMAT}`;

//   const result = await llmCallWithJSONRetry({
//     task: "qc-difficulty",          // → llama-3.1-8b-instant (trivial check)
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.1,
//     max_tokens: 200,
//   });
//   return { key: "difficulty_match", name: "Difficulty Match", ...result };
// }

// // ─────────────────────────────────────────────────────────────
// // STEP 3A — Run 6 checks in batches of 2
// // Since each pair uses different models, no model is hit twice per batch
// // ─────────────────────────────────────────────────────────────
// export async function analyzeDescriptionVsRef({
//   question, inputFormat, outputFormat, sampleIO,
//   language, whitelist, blacklist, difficulty,
//   refSolutionCode,
// }) {
//   const desc = [
//     stripHtml(question),
//     inputFormat  ? `Input Format: ${stripHtml(inputFormat)}`  : "",
//     outputFormat ? `Output Format: ${stripHtml(outputFormat)}` : "",
//   ].filter(Boolean).join("\n");

//   const samples = sampleIO?.length
//     ? sampleIO.map((s, i) => `Sample ${i + 1}: input="${s.input}" output="${s.output}"`).join(" | ")
//     : "None";

//   const ctx = buildCtx({ desc, samples, refCode: refSolutionCode, language });

//   console.log("  ⏳ Running 6 QC checks (2 at a time, each on its own model)...");

//   // Batch layout — each pair hits different models:
//   // Batch 1: qc-desc (llama-4-scout) + qc-input (qwen3-32b)
//   // Batch 2: qc-output (qwen3-32b)   + qc-sample (kimi-k2)
//   // Batch 3: qc-whitelist (8b)        + qc-difficulty (8b)
//   const checks = await runInBatches([
//     () => checkDescVsRef        ({ ctx }),
//     () => checkInputFormat      ({ ctx }),
//     () => checkOutputFormat     ({ ctx }),
//     () => checkSampleValidity   ({ ctx, sampleIO }),
//     () => checkWhitelistCoverage({ ctx, whitelist }),
//     () => checkDifficultyMatch  ({ ctx, difficulty }),
//   ], 2);

//   const failCount = checks.filter(c => c.status === "fail").length;
//   const warnCount = checks.filter(c => c.status === "warn").length;

//   let refMatchScore, refMatchVerdict;
//   if      (failCount >= 3)  { refMatchScore = 2; refMatchVerdict = "fail"; }
//   else if (failCount === 2) { refMatchScore = 4; refMatchVerdict = "fail"; }
//   else if (failCount === 1) { refMatchScore = 5; refMatchVerdict = "fail"; }
//   else if (warnCount >= 3)  { refMatchScore = 6; refMatchVerdict = "warn"; }
//   else if (warnCount >= 1)  { refMatchScore = 7; refMatchVerdict = "warn"; }
//   else                      { refMatchScore = 9; refMatchVerdict = "pass"; }

//   const issues = checks
//     .filter(c => c.status !== "pass")
//     .map(c => `${c.name}: ${c.finding}`)
//     .join(". ");

//   const refMatchSummary = issues
//     ? `${failCount} failure(s), ${warnCount} warning(s). ${issues}`
//     : "All checks passed. Description accurately matches the reference solution.";

//   console.log(`  ✅ 6 checks done. Fails=${failCount} Warns=${warnCount} Score=${refMatchScore}`);
//   return { checks, refMatchScore, refMatchVerdict, refMatchSummary };
// }

// // ─────────────────────────────────────────────────────────────
// // STEP 3B — AI failure analysis
// // Task: "qc-ai-failure" → llama-4-scout-17b
// // Runs after 3A completes (not concurrently)
// // ─────────────────────────────────────────────────────────────
// export async function analyzeAIFailures({
//   question, inputFormat, outputFormat,
//   language, compileResults,
// }) {
//   const desc = [
//     stripHtml(question),
//     inputFormat  ? `Input: ${stripHtml(inputFormat)}`  : "",
//     outputFormat ? `Output: ${stripHtml(outputFormat)}` : "",
//   ].filter(Boolean).join("\n");

//   const { summary, results } = compileResults;
//   const failedCases = (results || [])
//     .filter(r => !r.passed)
//     .slice(0, 3)
//     .map((r, i) => `TC${i + 1}: in="${r.input}" expected="${r.expected}" got="${r.actual}" [${r.status}]`)
//     .join("\n");

//   const prompt = `A ${language} AI solution written from a description passed ${summary?.passed}/${summary?.total} test cases.

// DESCRIPTION: ${desc}

// FAILED: ${failedCases || "None"}

// Was failure due to: (a) ambiguous/incomplete description, or (b) AI reasoning error despite clear description?

// Return ONLY JSON (no markdown):
// {"verdict":"pass|warn|fail","reason":"one sentence"}`;

//   const messages = [{ role: "user", content: prompt }];
//   const { text, provider, model } = await llmCall({
//     task: "qc-ai-failure",
//     messages,
//     temperature: 0.1,
//     max_tokens: 150,
//   });

//   console.log(`  ✅ AI failure analysis via [${provider}] ${model}`);

//   // Extract JSON from whatever the model returned — works even with prose preamble
//   const json = extractJSON(text);
//   if (json) { try { return JSON.parse(json); } catch(_) {} }

//   // If no JSON found, send the model's own response back and ask it to convert
//   console.warn("  ⚠️  [qc-ai-failure] No JSON in response, retrying...");
//   const { text: retryText } = await llmCall({
//     task: "qc-ai-failure",
//     messages: [
//       ...messages,
//       { role: "assistant", content: text },
//       { role: "user",      content: 'Convert to JSON only: {"verdict":"pass|warn|fail","reason":"one sentence"}' },
//     ],
//     temperature: 0,
//     max_tokens: 100,
//   });
//   const retryJson = extractJSON(retryText);
//   if (retryJson) return JSON.parse(retryJson);
//   throw new Error(`[qc-ai-failure] No JSON after retry: ${retryText.slice(0, 200)}`);
// }

// // ─────────────────────────────────────────────────────────────
// // COMBINED — Step 3A then Step 3B sequentially
// // ─────────────────────────────────────────────────────────────
// export async function analyzeCODQuestion({
//   question, inputFormat, outputFormat, sampleIO,
//   language, whitelist, blacklist, difficulty, topic,
//   aiSolutionCode, compileResults, refSolutionCode,
// }) {
//   const summary  = compileResults?.summary;
//   const passRate = summary ? (summary.passed / summary.total) : 1;

//   // 3A: 6 checks in pairs
//   const refAnalysis = refSolutionCode
//     ? await analyzeDescriptionVsRef({
//         question, inputFormat, outputFormat, sampleIO,
//         language, whitelist, blacklist, difficulty, refSolutionCode,
//       })
//     : null;

//   // 3B: AI failure diagnosis (after 3A)
//   const aiFailureAnalysis = (passRate < 1 && compileResults?.results?.length)
//     ? await analyzeAIFailures({ question, inputFormat, outputFormat, language, compileResults })
//     : null;

//   const checks = refAnalysis?.checks || [];

//   let overallScore, status;
//   if (refAnalysis) {
//     overallScore = refAnalysis.refMatchScore;
//     status       = refAnalysis.refMatchVerdict?.toUpperCase() || "WARN";
//   } else {
//     overallScore = Math.round(passRate * 10);
//     status       = passRate === 1 ? "PASS" : passRate >= 0.5 ? "WARN" : "FAIL";
//   }

//   const aiLine   = summary
//     ? `AI solution: ${summary.passed}/${summary.total} TCs passed (${summary.passRate}).`
//     : "AI compile results unavailable.";
//   const failLine = aiFailureAnalysis ? ` ${aiFailureAnalysis.reason}` : "";
//   const refLine  = refAnalysis
//     ? ` Ref check: ${refAnalysis.refMatchSummary}`
//     : " No reference solution — ref comparison skipped.";

//   return {
//     overallScore,
//     status,
//     summary: `${aiLine}${failLine}${refLine}`.trim(),
//     aiSolutionVerdict: aiFailureAnalysis?.verdict || (passRate === 1 ? "pass" : passRate >= 0.5 ? "warn" : "fail"),
//     checks,
//     refAnalysis: refAnalysis
//       ? { score: refAnalysis.refMatchScore, verdict: refAnalysis.refMatchVerdict, summary: refAnalysis.refMatchSummary }
//       : null,
//   };
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

// Strip <think>...</think> blocks from reasoning models
function stripThinkBlocks(raw) {
  if (!raw) return raw;
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// Extract first {...} JSON object from anywhere in the response text.
// Works regardless of preamble, markdown headers, code fences, or trailing text.
// If the JSON is truncated (no closing }), attempts to repair it.
function extractJSON(raw) {
  const cleaned = stripThinkBlocks(raw)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  if (start === -1) return null;

  const end = cleaned.lastIndexOf("}");
  if (end !== -1 && end > start) {
    // Complete JSON found
    return cleaned.slice(start, end + 1);
  }

  // No closing } — JSON was truncated. Attempt repair:
  // Close any open string, then close the object.
  let partial = cleaned.slice(start);
  // Count quotes to detect open string
  const quoteCount = (partial.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) partial += '"';   // close open string
  partial += "}";                               // close object
  try { JSON.parse(partial); return partial; } catch (_) {}
  // Repair failed — return null
  return null;
}

// Call llmCall, get text back, extract JSON from it.
// If no JSON in first response, send the raw text back to the model
// with a single follow-up: "Convert that to JSON."
async function llmCallWithJSONRetry({ task, messages, temperature, max_tokens }) {
  const { text, provider, model } = await llmCall({ task, messages, temperature, max_tokens });

  const json = extractJSON(text);
  if (json) {
    try { return JSON.parse(json); } catch (_) {}
  }

  // Model returned prose — ask it to output just the JSON, no reasoning
  console.warn(`  ⚠️  [${task}] No JSON in response, retrying...`);
  const retryMessages = [
    { role: "user", content: messages[messages.length - 1].content +
      '\n\nRespond with ONLY this JSON object, no other text:\n{"status":"pass|warn|fail","finding":"<your finding in one sentence>","fix":"<your fix in one sentence or null>"}' },
  ];

  // max_tokens 300 — enough for the JSON shape even with long finding/fix values
  const { text: retryText } = await llmCall({ task, messages: retryMessages, temperature: 0, max_tokens: 500 });
  const retryJson = extractJSON(retryText);
  if (retryJson) {
    try { return JSON.parse(retryJson); } catch(_) {}
  }

  // Last resort: build a minimal valid response so QC doesn't crash
  console.error(`  ❌ [${task}] No JSON after retry, using fallback result.`);
  return { status: "warn", finding: "QC check inconclusive — model did not return structured result.", fix: null };
}

// Each check returns ONLY this tiny shape:
// {"status":"pass|warn|fail","finding":"one sentence","fix":"one sentence or null"}
function parseCheckJSON(raw) {
  // Only used for simple inline parses — main checks use llmCallWithJSONRetry
  const json = extractJSON(raw);
  if (!json) throw new Error(`No JSON found: ${raw.slice(0, 120)}`);
  return JSON.parse(json);
}

const RETURN_FORMAT = `Return ONLY this JSON (no markdown, no extra text):
{"status":"pass|warn|fail","finding":"one sentence","fix":"one sentence or null"}`;

function buildCtx({ desc, samples, refCode, language }) {
  return `DESCRIPTION:\n${desc}\n\nSAMPLES: ${samples}\n\nREF SOLUTION (${language}):\n${refCode}`;
}

// Run tasks in sequential pairs — avoids concurrent request errors on Groq
// But since each check now uses a DIFFERENT model, we can safely run 2 at a time
async function runInBatches(tasks, batchSize = 2) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

// ─────────────────────────────────────────────────────────────
// STEP 1 — Generate AI solution from description alone
// Task: "cod-ai-solution" → llama-3.3-70b-versatile
// ─────────────────────────────────────────────────────────────
export async function generateAISolution({
  question, inputFormat, outputFormat, sampleIO,
  language, whitelist, blacklist, difficulty, topic,
}) {
  const desc = [
    stripHtml(question),
    inputFormat  ? `Input Format:\n${stripHtml(inputFormat)}`  : "",
    outputFormat ? `Output Format:\n${stripHtml(outputFormat)}` : "",
  ].filter(Boolean).join("\n\n");

  const samples = sampleIO?.length
    ? sampleIO.map((s, i) => `Sample ${i + 1}:\nInput: ${s.input}\nOutput: ${s.output}`).join("\n\n")
    : "None";

  const prompt = `Write a correct ${language} solution for this problem. Return ONLY raw code, no markdown.
${whitelist?.length ? `Must use: ${whitelist.join(", ")}` : ""}
${blacklist?.length ? `Must NOT use: ${blacklist.join(", ")}` : ""}

PROBLEM:
${desc}

SAMPLES:
${samples}

Return ONLY runnable ${language} code.`.trim();

  const { text, provider, model } = await llmCall({
    task: "cod-ai-solution",        // → llama-3.3-70b-versatile
    messages: [{ role: "user", content: prompt }],
    temperature: 0.15,
    max_tokens: 2000,
  });

  console.log(`  ✅ AI Solution via [${provider}] ${model}`);

  const code = text
    .replace(/^```[\w]*\s*/gi, "")
    .replace(/```\s*$/gi, "")
    .trim();

  return { code, provider, model };
}

// ─────────────────────────────────────────────────────────────
// 6 QC CHECKS — each uses a DEDICATED task → dedicated model
// Spread across 5 different models = no single model hit twice
//
//  qc-desc       → llama-4-scout-17b   (30K TPM, strong logic)
//  qc-input      → qwen3-32b           (60 RPM, fast)
//  qc-output     → qwen3-32b           (60 RPM, fast)
//  qc-sample     → kimi-k2-instruct    (60 RPM, fast)
//  qc-whitelist  → llama-3.1-8b-instant (trivial keyword check)
//  qc-difficulty → llama-3.1-8b-instant (trivial label check)
//  qc-ai-failure → llama-4-scout-17b   (30K TPM)
// ─────────────────────────────────────────────────────────────

async function checkDescVsRef({ ctx }) {
  const prompt = `You are a strict QC reviewer for a coding platform.

${ctx}

TASK: Does the description COMPLETELY and ACCURATELY describe what the reference solution computes?
- Read the ref solution logic carefully
- Would a competent programmer arrive at the same algorithm from the description alone?
- If the description would lead to different logic: FAIL

${RETURN_FORMAT}`;

  const result = await llmCallWithJSONRetry({
    task: "qc-desc",                // → llama-4-scout-17b-16e-instruct
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  });
  return { key: "desc_vs_ref", name: "Description matches Ref Solution Logic", ...result };
}

async function checkInputFormat({ ctx }) {
  const prompt = `You are a strict QC reviewer for a coding platform.

${ctx}

TASK: Is the INPUT FORMAT section present and unambiguous?
- Are data types, number of input lines, order, and constraints explicitly stated?
- Does it match exactly what the ref solution reads from stdin?

${RETURN_FORMAT}`;

  const result = await llmCallWithJSONRetry({
    task: "qc-input",               // → qwen3-32b (60 RPM)
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  });
  return { key: "input_format", name: "Input Format Clarity", ...result };
}

async function checkOutputFormat({ ctx }) {
  const prompt = `You are a strict QC reviewer for a coding platform.

${ctx}

TASK: Is the OUTPUT FORMAT section present and unambiguous?
- Are spacing, newlines, capitalization, and format explicitly described?
- Does it match exactly what the ref solution prints to stdout?

${RETURN_FORMAT}`;

  const result = await llmCallWithJSONRetry({
    task: "qc-output",              // → qwen3-32b (60 RPM)
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  });
  return { key: "output_format", name: "Output Format Clarity", ...result };
}

async function checkSampleValidity({ ctx, sampleIO }) {
  if (!sampleIO?.length) {
    return {
      key: "sample_validity", name: "Sample I/O matches Ref",
      status: "warn", finding: "No sample I/O provided.",
      fix: "Add at least one sample input/output pair.",
    };
  }

  const prompt = `You are a strict QC reviewer for a coding platform.

${ctx}

TASK: Do the sample I/O pairs match what the reference solution would produce?
- Trace the ref solution logic with each sample input
- Check if the sample output matches what the ref solution outputs
- Also verify samples are consistent with the description

${RETURN_FORMAT}`;

  const result = await llmCallWithJSONRetry({
    task: "qc-sample",              // → kimi-k2-instruct (60 RPM)
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  });
  return { key: "sample_validity", name: "Sample I/O matches Ref", ...result };
}

async function checkWhitelistCoverage({ ctx, whitelist }) {
  if (!whitelist?.length) {
    return {
      key: "whitelist_coverage", name: "Whitelist in Description",
      status: "pass", finding: "No whitelist defined.", fix: null,
    };
  }

  const prompt = `You are a strict QC reviewer for a coding platform.

${ctx}

Whitelist (student MUST use): ${whitelist.join(", ")}

TASK: Is each whitelist keyword explicitly mentioned or clearly implied in the description?
- The description itself must guide students to use these constructs
- If any required keyword is not mentioned or implied: FAIL

${RETURN_FORMAT}`;

  const result = await llmCallWithJSONRetry({
    task: "qc-whitelist",           // → llama-3.1-8b-instant (trivial check)
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  });
  return { key: "whitelist_coverage", name: "Whitelist in Description", ...result };
}

async function checkDifficultyMatch({ ctx, difficulty }) {
  const prompt = `You are a strict QC reviewer for a coding platform.

${ctx}

Assigned difficulty: ${difficulty || "Not set"}

TASK: Does the difficulty label match the actual problem complexity based on the ref solution?
Easy=simple loop/math, Medium=multiple loops/string ops/basic DS, Hard=complex algorithm/DP/graphs.
If mislabeled: WARN for minor mismatch, FAIL for very wrong.

${RETURN_FORMAT}`;

  const result = await llmCallWithJSONRetry({
    task: "qc-difficulty",          // → llama-3.1-8b-instant (trivial check)
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
  });
  return { key: "difficulty_match", name: "Difficulty Match", ...result };
}

// ─────────────────────────────────────────────────────────────
// STEP 3A — Run 6 checks in batches of 2
// Since each pair uses different models, no model is hit twice per batch
// ─────────────────────────────────────────────────────────────
export async function analyzeDescriptionVsRef({
  question, inputFormat, outputFormat, sampleIO,
  language, whitelist, blacklist, difficulty,
  refSolutionCode,
}) {
  const desc = [
    stripHtml(question),
    inputFormat  ? `Input Format: ${stripHtml(inputFormat)}`  : "",
    outputFormat ? `Output Format: ${stripHtml(outputFormat)}` : "",
  ].filter(Boolean).join("\n");

  const samples = sampleIO?.length
    ? sampleIO.map((s, i) => `Sample ${i + 1}: input="${s.input}" output="${s.output}"`).join(" | ")
    : "None";

  const ctx = buildCtx({ desc, samples, refCode: refSolutionCode, language });

  console.log("  ⏳ Running 6 QC checks (2 at a time, each on its own model)...");

  // Batch layout — each pair hits different models:
  // Batch 1: qc-desc (llama-4-scout) + qc-input (qwen3-32b)
  // Batch 2: qc-output (qwen3-32b)   + qc-sample (kimi-k2)
  // Batch 3: qc-whitelist (8b)        + qc-difficulty (8b)
  const checks = await runInBatches([
    () => checkDescVsRef        ({ ctx }),
    () => checkInputFormat      ({ ctx }),
    () => checkOutputFormat     ({ ctx }),
    () => checkSampleValidity   ({ ctx, sampleIO }),
    () => checkWhitelistCoverage({ ctx, whitelist }),
    () => checkDifficultyMatch  ({ ctx, difficulty }),
  ], 2);

  const failCount = checks.filter(c => c.status === "fail").length;
  const warnCount = checks.filter(c => c.status === "warn").length;

  let refMatchScore, refMatchVerdict;
  if      (failCount >= 3)  { refMatchScore = 2; refMatchVerdict = "fail"; }
  else if (failCount === 2) { refMatchScore = 4; refMatchVerdict = "fail"; }
  else if (failCount === 1) { refMatchScore = 5; refMatchVerdict = "fail"; }
  else if (warnCount >= 3)  { refMatchScore = 6; refMatchVerdict = "warn"; }
  else if (warnCount >= 1)  { refMatchScore = 7; refMatchVerdict = "warn"; }
  else                      { refMatchScore = 9; refMatchVerdict = "pass"; }

  const issues = checks
    .filter(c => c.status !== "pass")
    .map(c => `${c.name}: ${c.finding}`)
    .join(". ");

  const refMatchSummary = issues
    ? `${failCount} failure(s), ${warnCount} warning(s). ${issues}`
    : "All checks passed. Description accurately matches the reference solution.";

  console.log(`  ✅ 6 checks done. Fails=${failCount} Warns=${warnCount} Score=${refMatchScore}`);
  return { checks, refMatchScore, refMatchVerdict, refMatchSummary };
}

// ─────────────────────────────────────────────────────────────
// STEP 3B — AI failure analysis
// Task: "qc-ai-failure" → llama-4-scout-17b
// Runs after 3A completes (not concurrently)
// ─────────────────────────────────────────────────────────────
export async function analyzeAIFailures({
  question, inputFormat, outputFormat,
  language, compileResults,
}) {
  const desc = [
    stripHtml(question),
    inputFormat  ? `Input: ${stripHtml(inputFormat)}`  : "",
    outputFormat ? `Output: ${stripHtml(outputFormat)}` : "",
  ].filter(Boolean).join("\n");

  const { summary, results } = compileResults;
  const failedCases = (results || [])
    .filter(r => !r.passed)
    .slice(0, 3)
    .map((r, i) => `TC${i + 1}: in="${r.input}" expected="${r.expected}" got="${r.actual}" [${r.status}]`)
    .join("\n");

  const prompt = `A ${language} AI solution written from a description passed ${summary?.passed}/${summary?.total} test cases.

DESCRIPTION: ${desc}

FAILED: ${failedCases || "None"}

Was failure due to: (a) ambiguous/incomplete description, or (b) AI reasoning error despite clear description?

Return ONLY JSON (no markdown):
{"verdict":"pass|warn|fail","reason":"one sentence"}`;

  const messages = [{ role: "user", content: prompt }];
  const { text, provider, model } = await llmCall({
    task: "qc-ai-failure",
    messages,
    temperature: 0.1,
    max_tokens: 500,
  });

  console.log(`  ✅ AI failure analysis via [${provider}] ${model}`);

  // Extract JSON from whatever the model returned — works even with prose preamble
  const json = extractJSON(text);
  if (json) { try { return JSON.parse(json); } catch(_) {} }

  // If no JSON found, send the model's own response back and ask it to convert
  console.warn("  ⚠️  [qc-ai-failure] No JSON in response, retrying...");
  const { text: retryText } = await llmCall({
    task: "qc-ai-failure",
    messages: [
      ...messages,
      { role: "assistant", content: text },
      { role: "user",      content: 'Convert to JSON only: {"verdict":"pass|warn|fail","reason":"one sentence"}' },
    ],
    temperature: 0,
    max_tokens: 500,
  });
  const retryJson = extractJSON(retryText);
  if (retryJson) return JSON.parse(retryJson);
  throw new Error(`[qc-ai-failure] No JSON after retry: ${retryText.slice(0, 200)}`);
}

// ─────────────────────────────────────────────────────────────
// COMBINED — Step 3A then Step 3B sequentially
// ─────────────────────────────────────────────────────────────
export async function analyzeCODQuestion({
  question, inputFormat, outputFormat, sampleIO,
  language, whitelist, blacklist, difficulty, topic,
  aiSolutionCode, compileResults, refSolutionCode,
}) {
  const summary  = compileResults?.summary;
  const passRate = summary ? (summary.passed / summary.total) : 1;

  // 3A: 6 checks in pairs
  const refAnalysis = refSolutionCode
    ? await analyzeDescriptionVsRef({
        question, inputFormat, outputFormat, sampleIO,
        language, whitelist, blacklist, difficulty, refSolutionCode,
      })
    : null;

  // 3B: AI failure diagnosis (after 3A)
  const aiFailureAnalysis = (passRate < 1 && compileResults?.results?.length)
    ? await analyzeAIFailures({ question, inputFormat, outputFormat, language, compileResults })
    : null;

  const checks = refAnalysis?.checks || [];

  let overallScore, status;
  if (refAnalysis) {
    overallScore = refAnalysis.refMatchScore;
    status       = refAnalysis.refMatchVerdict?.toUpperCase() || "WARN";
  } else {
    overallScore = Math.round(passRate * 10);
    status       = passRate === 1 ? "PASS" : passRate >= 0.5 ? "WARN" : "FAIL";
  }

  const aiLine   = summary
    ? `AI solution: ${summary.passed}/${summary.total} TCs passed (${summary.passRate}).`
    : "AI compile results unavailable.";
  const failLine = aiFailureAnalysis ? ` ${aiFailureAnalysis.reason}` : "";
  const refLine  = refAnalysis
    ? ` Ref check: ${refAnalysis.refMatchSummary}`
    : " No reference solution — ref comparison skipped.";

  return {
    overallScore,
    status,
    summary: `${aiLine}${failLine}${refLine}`.trim(),
    aiSolutionVerdict: aiFailureAnalysis?.verdict || (passRate === 1 ? "pass" : passRate >= 0.5 ? "warn" : "fail"),
    checks,
    refAnalysis: refAnalysis
      ? { score: refAnalysis.refMatchScore, verdict: refAnalysis.refMatchVerdict, summary: refAnalysis.refMatchSummary }
      : null,
  };
}