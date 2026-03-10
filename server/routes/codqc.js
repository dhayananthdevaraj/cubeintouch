
// // server/routes/codqc.js
// import express from "express";
// import { generateAISolution, analyzeCODQuestion } from "../services/codQcService.js";
// import { runTestCases } from "../services/codCompileService.js"; // ✅ correct import

// const router = express.Router();

// // ── POST /cod-qc
// // Body: { question, inputFormat, outputFormat, sampleIO, language,
// //         whitelist, blacklist, difficulty, topic, testcases }
// // NO solution field required anymore — AI generates it
// router.post("/", async (req, res) => {
//   try {
//     const {
//       question, inputFormat, outputFormat, sampleIO,
//       language = "Java", whitelist = [], blacklist = [],
//       difficulty, topic, testcases = [],
//     } = req.body;

//     if (!question) {
//       return res.status(400).json({ error: "question is required" });
//     }
//     if (!testcases.length) {
//       return res.status(400).json({ error: "testcases are required to validate the question" });
//     }

//     console.log(`🤖 COD QC [New Flow]: ${language} | ${topic} | ${testcases.length} TCs`);

//     // ── STEP 1: Generate AI solution from description alone
//     console.log("  ⏳ Step 1: Generating AI solution from description...");
//     const { code: aiCode, model: solModel } = await generateAISolution({
//       question, inputFormat, outputFormat, sampleIO,
//       language, whitelist, blacklist, difficulty, topic,
//     });
//     console.log(`  ✅ Step 1 done. Code length: ${aiCode.length} chars`);

//     // ── STEP 2: Compile & run AI solution against test cases
//     console.log("  ⏳ Step 2: Running AI solution against test cases...");
//     let compileResults = null;
//     try {
//       const results = await runTestCases({ solution: aiCode, language, testcases });

//       const passed     = results.filter(r => r.passed).length;
//       const total      = results.length;
//       const totalScore = results.filter(r => r.passed).reduce((s, r) => s + (r.score || 0), 0);
//       const maxScore   = results.reduce((s, r) => s + (r.score || 0), 0);

//       compileResults = {
//         results,
//         summary: {
//           total,
//           passed,
//           failed: total - passed,
//           totalScore,
//           maxScore,
//           passRate: `${Math.round((passed / total) * 100)}%`,
//         },
//       };

//       console.log(`  ✅ Step 2 done. ${passed}/${total} passed`);
//     } catch (compileErr) {
//       console.warn(`  ⚠️ Step 2 compile failed: ${compileErr.message}`);
//       compileResults = {
//         summary: { passed: 0, total: testcases.length, failed: testcases.length, totalScore: 0, maxScore: 0, passRate: "0%" },
//         results: [],
//         error: compileErr.message,
//       };
//     }

//     // ── STEP 3: QC analysis using description + compile evidence
//     console.log("  ⏳ Step 3: Running QC analysis...");
//     const qcResult = await analyzeCODQuestion({
//       question, inputFormat, outputFormat, sampleIO,
//       language, whitelist, blacklist, difficulty, topic,
//       aiSolutionCode: aiCode,
//       compileResults,
//     });
//     console.log(`  ✅ Step 3 done. Score=${qcResult.overallScore} Status=${qcResult.status}`);

//     // ── Return everything to the frontend
//     res.json({
//       ...qcResult,
//       aiSolution: {
//         code: aiCode,
//         model: solModel,
//         language,
//       },
//       compileResults,
//     });

//   } catch (err) {
//     console.error("❌ COD QC Error:", err.message);
//     res.status(500).json({ error: "QC analysis failed", detail: err.message });
//   }
// });

// export default router;

// // server/routes/codqc.js
// import express from "express";
// import { generateAISolution, analyzeCODQuestion } from "../services/codQcService.js";
// import { runTestCases } from "../services/codCompileService.js"; // ✅ correct import

// const router = express.Router();

// // ── POST /cod-qc
// // Body: { question, inputFormat, outputFormat, sampleIO, language,
// //         whitelist, blacklist, difficulty, topic, testcases }
// // NO solution field required anymore — AI generates it
// router.post("/", async (req, res) => {
//   try {
//     const {
//       question, inputFormat, outputFormat, sampleIO,
//       language = "Java", whitelist = [], blacklist = [],
//       difficulty, topic, testcases = [],
//       syllabus = null,
//     } = req.body;

//     if (!question) {
//       return res.status(400).json({ error: "question is required" });
//     }
//     if (!testcases.length) {
//       return res.status(400).json({ error: "testcases are required to validate the question" });
//     }

//     console.log(`🤖 COD QC [New Flow]: ${language} | ${topic} | ${testcases.length} TCs`);

//     // ── STEP 1: Generate AI solution from description alone
//     console.log("  ⏳ Step 1: Generating AI solution from description...");
//     const { code: aiCode, model: solModel } = await generateAISolution({
//       question, inputFormat, outputFormat, sampleIO,
//       language, whitelist, blacklist, difficulty, topic,
//     });
//     console.log(`  ✅ Step 1 done. Code length: ${aiCode.length} chars`);

//     // ── STEP 2: Compile & run AI solution against test cases
//     console.log("  ⏳ Step 2: Running AI solution against test cases...");
//     let compileResults = null;
//     try {
//       const results = await runTestCases({ solution: aiCode, language, testcases });

//       const passed     = results.filter(r => r.passed).length;
//       const total      = results.length;
//       const totalScore = results.filter(r => r.passed).reduce((s, r) => s + (r.score || 0), 0);
//       const maxScore   = results.reduce((s, r) => s + (r.score || 0), 0);

//       compileResults = {
//         results,
//         summary: {
//           total,
//           passed,
//           failed: total - passed,
//           totalScore,
//           maxScore,
//           passRate: `${Math.round((passed / total) * 100)}%`,
//         },
//       };

//       console.log(`  ✅ Step 2 done. ${passed}/${total} passed`);
//     } catch (compileErr) {
//       console.warn(`  ⚠️ Step 2 compile failed: ${compileErr.message}`);
//       compileResults = {
//         summary: { passed: 0, total: testcases.length, failed: testcases.length, totalScore: 0, maxScore: 0, passRate: "0%" },
//         results: [],
//         error: compileErr.message,
//       };
//     }

//     // ── STEP 3: QC analysis using description + compile evidence
//     console.log("  ⏳ Step 3: Running QC analysis...");
//     const qcResult = await analyzeCODQuestion({
//       question, inputFormat, outputFormat, sampleIO,
//       language, whitelist, blacklist, difficulty, topic,
//       aiSolutionCode: aiCode,
//       compileResults,
//       refSolutionCode: req.body.refSolutionCode || null,
//       testcases,
//       syllabus,
//     });
//     console.log(`  ✅ Step 3 done. Score=${qcResult.overallScore} Status=${qcResult.status}`);

//     // ── Return everything to the frontend
//     res.json({
//       ...qcResult,
//       aiSolution: {
//         code: aiCode,
//         model: solModel,
//         language,
//       },
//       compileResults,
//     });

//   } catch (err) {
//     console.error("❌ COD QC Error:", err.message);
//     res.status(500).json({ error: "QC analysis failed", detail: err.message });
//   }
// });

// export default router;


//9mar
// server/routes/codqc.js
import express from "express";
import { generateAISolution, analyzeCODQuestion } from "../services/codQcService.js";
import { runTestCases } from "../services/codCompileService.js";

const router = express.Router();

// ── POST /cod-qc
// Body: { question, inputFormat, outputFormat, sampleIO, language,
//         whitelist, blacklist, difficulty, topic, testcases, refSolutionCode }
router.post("/", async (req, res) => {
  try {
    const {
      question, inputFormat, outputFormat, sampleIO,
      language       = "Java",
      whitelist      = [],
      blacklist      = [],
      difficulty,
      topic,
      testcases      = [],
      refSolutionCode = null,   // ← ref solution from the QB
    } = req.body;

    if (!question)        return res.status(400).json({ error: "question is required" });
    if (!testcases.length) return res.status(400).json({ error: "testcases are required" });

    console.log(`\n🤖 COD QC: [${language}] ${topic} | ${testcases.length} TCs | ref=${!!refSolutionCode}`);

    // ── STEP 1: Generate AI solution from description alone ──────────────────
    console.log("  ⏳ Step 1: Generating AI solution...");
    const { code: aiCode, model: solModel } = await generateAISolution({
      question, inputFormat, outputFormat, sampleIO,
      language, whitelist, blacklist, difficulty, topic,
    });
    console.log(`  ✅ Step 1 done. ${aiCode.length} chars`);

    // ── STEP 2: Run AI solution against test cases ───────────────────────────
    console.log("  ⏳ Step 2: Running AI solution against TCs...");
    let compileResults = null;
    try {
      const tcResults = await runTestCases({ solution: aiCode, language, testcases });

      const passed     = tcResults.filter(r => r.passed).length;
      const total      = tcResults.length;
      const totalScore = tcResults.filter(r => r.passed).reduce((s, r) => s + (r.score || 0), 0);
      const maxScore   = tcResults.reduce((s, r) => s + (r.score || 0), 0);

      compileResults = {
        results: tcResults,
        summary: {
          total,
          passed,
          failed:     total - passed,
          totalScore,
          maxScore,
          passRate:   `${Math.round((passed / total) * 100)}%`,
        },
      };
      console.log(`  ✅ Step 2 done. ${passed}/${total} passed`);
    } catch (compileErr) {
      console.warn(`  ⚠️  Step 2 compile failed: ${compileErr.message}`);
      compileResults = {
        summary: { passed: 0, total: testcases.length, failed: testcases.length, totalScore: 0, maxScore: 0, passRate: "0%" },
        results: [],
        error:   compileErr.message,
      };
    }

    // ── STEP 3: QC analysis ─────────────────────────────────────────────────
    // Primary: description vs ref solution
    // Secondary: why did AI solution fail (if it did)
    console.log("  ⏳ Step 3: QC analysis...");
    const qcResult = await analyzeCODQuestion({
      question, inputFormat, outputFormat, sampleIO,
      language, whitelist, blacklist, difficulty, topic,
      aiSolutionCode:  aiCode,
      compileResults,
      refSolutionCode,   // ← passed through
    });
    console.log(`  ✅ Step 3 done. Score=${qcResult.overallScore} Status=${qcResult.status}`);

    // ── Respond ─────────────────────────────────────────────────────────────
    res.json({
      ...qcResult,
      aiSolution: {
        code:     aiCode,
        model:    solModel,
        language,
      },
      compileResults,
    });

  } catch (err) {
    console.error("❌ COD QC Error:", err.message);
    res.status(500).json({ error: "QC analysis failed", detail: err.message });
  }
});

export default router;