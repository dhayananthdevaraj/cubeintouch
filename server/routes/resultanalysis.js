

// routes/resultanalysis.js
import express from "express";
import { analyzeStudentResult } from "../services/resultAnalysisService.js";

const router = express.Router();

/**
 * POST /analyze-result
 * Analyze student's GitHub code against question requirements
 *
 * Request Body:
 * {
 *   repoKey:         string  - GitHub repo name (unique per student)
 *   questionHtml:    string  - Question description HTML from Examly
 *   studentName:     string  - Student name
 *   failedTestcases: array   - List of failed testcase names
 * }
 *
 * Response:
 * {
 *   success:       boolean
 *   studentName:   string
 *   repoKey:       string
 *   filesAnalyzed: array  - file paths fetched from GitHub
 *   analysis:      array  - exactly 4 strings, each starts with "Student code has"
 * }
 */
router.post("/analyze-result", async (req, res) => {
  try {
    const { repoKey, questionHtml, studentName, failedTestcases, techStack } = req.body;

    if (!repoKey) {
      return res.status(400).json({ success: false, error: "repoKey is required" });
    }
    if (!questionHtml) {
      return res.status(400).json({ success: false, error: "questionHtml is required" });
    }

    console.log(`\n📊 Result Analysis: ${studentName || "Unknown"} — repo: ${repoKey} — stack: ${techStack || "puppeteer"}`);

    const result = await analyzeStudentResult({
      repoKey,
      questionHtml,
      studentName,
      failedTestcases: failedTestcases || [],
      techStack: techStack || "puppeteer",
    });

    console.log(`✅ Analysis Complete: ${studentName || "Unknown"}`);
    res.json(result);

  } catch (err) {
    console.error("❌ Result Analysis Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Analysis failed",
      detail: err.message,
      suggestion: "Check GITHUB_TOKEN in .env and verify repoKey is correct",
    });
  }
});

export default router;