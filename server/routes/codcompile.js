// server/routes/codcompile.js
import express from "express";
import { runTestCases } from "../services/codCompileService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { solution, language, testcases } = req.body;

    if (!solution || !language || !Array.isArray(testcases) || !testcases.length) {
      return res.status(400).json({ error: "solution, language, and testcases[] are required" });
    }

    console.log(`🔬 COD Compile: ${language} | ${testcases.length} TCs`);
    const results = await runTestCases({ solution, language, testcases });

    const passed     = results.filter(r => r.passed).length;
    const total      = results.length;
    const totalScore = results.filter(r => r.passed).reduce((s, r) => s + (r.score || 0), 0);
    const maxScore   = results.reduce((s, r) => s + (r.score || 0), 0);

    console.log(`✅ Compile done: ${passed}/${total} passed`);
    res.json({
      results,
      summary: { total, passed, failed: total - passed, totalScore, maxScore, passRate: `${Math.round((passed/total)*100)}%` }
    });

  } catch (err) {
    console.error("❌ Compile Error:", err.message);
    res.status(500).json({ error: "Compilation failed", detail: err.message });
  }
});

export default router;