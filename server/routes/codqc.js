// // server/routes/codqc.js
// import express from "express";
// import { analyzeCODQuestion } from "../services/codQcService.js";

// const router = express.Router();

// router.post("/", async (req, res) => {
//   try {
//     const { question, inputFormat, outputFormat, sampleIO, solution, language, whitelist, blacklist, difficulty, topic } = req.body;

//     if (!question || !solution) {
//       return res.status(400).json({ error: "question and solution are required" });
//     }

//     console.log(`🔍 COD QC: ${language} | ${topic}`);
//     const result = await analyzeCODQuestion({ question, inputFormat, outputFormat, sampleIO, solution, language, whitelist, blacklist, difficulty, topic });
//     console.log(`✅ COD QC done: score=${result.overallScore} status=${result.status}`);
//     res.json(result);

//   } catch (err) {
//     console.error("❌ COD QC Error:", err.message);
//     res.status(500).json({ error: "QC analysis failed", detail: err.message });
//   }
// });

// export default router;
// server/routes/codqc.js
import express from "express";
import { generateAISolution, analyzeCODQuestion } from "../services/codQcService.js";
import { runTestCases } from "../services/codCompileService.js"; // ✅ correct import

const router = express.Router();

// ── POST /cod-qc
// Body: { question, inputFormat, outputFormat, sampleIO, language,
//         whitelist, blacklist, difficulty, topic, testcases }
// NO solution field required anymore — AI generates it
router.post("/", async (req, res) => {
  try {
    const {
      question, inputFormat, outputFormat, sampleIO,
      language = "Java", whitelist = [], blacklist = [],
      difficulty, topic, testcases = [],
    } = req.body;

    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }
    if (!testcases.length) {
      return res.status(400).json({ error: "testcases are required to validate the question" });
    }

    console.log(`🤖 COD QC [New Flow]: ${language} | ${topic} | ${testcases.length} TCs`);

    // ── STEP 1: Generate AI solution from description alone
    console.log("  ⏳ Step 1: Generating AI solution from description...");
    const { code: aiCode, model: solModel } = await generateAISolution({
      question, inputFormat, outputFormat, sampleIO,
      language, whitelist, blacklist, difficulty, topic,
    });
    console.log(`  ✅ Step 1 done. Code length: ${aiCode.length} chars`);

    // ── STEP 2: Compile & run AI solution against test cases
    console.log("  ⏳ Step 2: Running AI solution against test cases...");
    let compileResults = null;
    try {
      const results = await runTestCases({ solution: aiCode, language, testcases });

      const passed     = results.filter(r => r.passed).length;
      const total      = results.length;
      const totalScore = results.filter(r => r.passed).reduce((s, r) => s + (r.score || 0), 0);
      const maxScore   = results.reduce((s, r) => s + (r.score || 0), 0);

      compileResults = {
        results,
        summary: {
          total,
          passed,
          failed: total - passed,
          totalScore,
          maxScore,
          passRate: `${Math.round((passed / total) * 100)}%`,
        },
      };

      console.log(`  ✅ Step 2 done. ${passed}/${total} passed`);
    } catch (compileErr) {
      console.warn(`  ⚠️ Step 2 compile failed: ${compileErr.message}`);
      compileResults = {
        summary: { passed: 0, total: testcases.length, failed: testcases.length, totalScore: 0, maxScore: 0, passRate: "0%" },
        results: [],
        error: compileErr.message,
      };
    }

    // ── STEP 3: QC analysis using description + compile evidence
    console.log("  ⏳ Step 3: Running QC analysis...");
    const qcResult = await analyzeCODQuestion({
      question, inputFormat, outputFormat, sampleIO,
      language, whitelist, blacklist, difficulty, topic,
      aiSolutionCode: aiCode,
      compileResults,
    });
    console.log(`  ✅ Step 3 done. Score=${qcResult.overallScore} Status=${qcResult.status}`);

    // ── Return everything to the frontend
    res.json({
      ...qcResult,
      aiSolution: {
        code: aiCode,
        model: solModel,
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