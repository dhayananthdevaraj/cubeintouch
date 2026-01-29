// routes/qc.js - Quality Check Endpoint
import express from "express";
import { analyzeQCBatch } from "../services/qcService.js";

const router = express.Router();

/**
 * POST /qc
 * Quality check MCQ questions for accuracy and quality
 * 
 * Request Body:
 * {
 *   mcqs: Array of MCQ objects containing:
 *     - question: string
 *     - code: string (optional)
 *     - options: array
 *     - existingAnswer: string
 *     - difficulty: string
 *     - topic: string
 * }
 * 
 * Response:
 * Array of QC results with:
 *   - question: string
 *   - isCorrect: boolean
 *   - correctAnswer: string (if incorrect)
 *   - issues: array of strings
 *   - qualityScore: number (0-10)
 */
router.post("/", async (req, res) => {
  try {
    const mcqs = req.body.mcqs || [];

    // Validation
    if (!Array.isArray(mcqs)) {
      return res.status(400).json({ 
        error: "mcqs must be an array" 
      });
    }

    if (mcqs.length === 0) {
      return res.status(400).json({ 
        error: "mcqs array is empty" 
      });
    }

    console.log(`📊 QC Request: Analyzing ${mcqs.length} MCQs`);

    // Process QC analysis
    const results = await analyzeQCBatch(mcqs);

    console.log(`✅ QC Complete: ${results.length} results returned`);
    res.json(results);

  } catch (err) {
    console.error("❌ QC Error:", err.message);
    res.status(500).json({
      error: "QC processing failed",
      detail: err.message,
      suggestion: "Check API key and request format"
    });
  }
});

export default router;