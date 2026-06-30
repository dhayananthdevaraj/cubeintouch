// server/routes/dupdetect.js
import express from "express";
import { detectDuplicates } from "../services/dupDetectService.js";

const router = express.Router();

/**
 * POST /dup-detect
 * Body: { mcqs: Array, threshold: number (optional, 0-100) }
 */
router.post("/", (req, res) => {
  try {
    const { mcqs, threshold } = req.body;

    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      return res.status(400).json({ error: "mcqs array is required and must be non-empty" });
    }

    if (mcqs.length > 500) {
      return res.status(400).json({ error: "Maximum 500 MCQs per request" });
    }

    const normalizedThreshold = threshold != null
      ? Math.min(Math.max(threshold / 100, 0.5), 1.0)
      : 0.80;

    const clusters = detectDuplicates(mcqs, normalizedThreshold);

    const totalDuplicateQuestions = clusters.reduce(
      (sum, c) => sum + c.questions.length, 0
    );

    return res.json({
      success: true,
      total: mcqs.length,
      duplicateClusters: clusters.length,
      totalDuplicateQuestions,
      threshold: Math.round(normalizedThreshold * 100),
      clusters,
    });
  } catch (err) {
    console.error("❌ dup-detect error:", err.message);
    return res.status(500).json({ error: "Internal error: " + err.message });
  }
});

export default router;