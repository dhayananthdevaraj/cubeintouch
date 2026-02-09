import express from "express";
import { ensureIndexedUniversity } from "../services/platformManagerUniversity.js";
import { classifyQuestionUniversity } from "../services/vectorClassifierUniversity.js";

const router = express.Router();

// Track indexing status for university collections
const indexingStatus = new Map();

router.post("/analyze-metadata-university", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        error: "Authorization token required",
      });
    }

    if (token.length < 50) {
      return res.status(401).json({
        error: "Invalid token format",
      });
    }

    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({
        error: "questions array required",
      });
    }

    console.log(`📥 [UNIVERSITY] Received ${questions.length} questions for analysis`);

    // ✅ CHECK IF CURRENTLY INDEXING (use university-specific key)
    const tokenKey = "prod_v2_university";
    const status = indexingStatus.get(tokenKey);

    if (status === 'indexing') {
      return res.status(503).json({
        success: false,
        error: "University indexing in progress. Please wait 5-7 minutes and try again.",
        status: "indexing",
        estimatedTime: "5-7 minutes"
      });
    }

    // ✅ TRY TO INDEX WITH 90-SECOND TIMEOUT
    const indexingPromise = ensureIndexedUniversity(token);
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 90000));
    
    const result = await Promise.race([indexingPromise, timeout]);

    if (result === 'timeout') {
      // Mark as indexing in background
      indexingStatus.set(tokenKey, 'indexing');
      
      // Continue indexing in background
      indexingPromise.then(() => {
        indexingStatus.set(tokenKey, 'complete');
        console.log("✅ [UNIVERSITY] Background indexing completed");
      }).catch(err => {
        console.error("❌ [UNIVERSITY] Background indexing failed:", err);
        indexingStatus.delete(tokenKey);
      });

      return res.status(503).json({
        success: false,
        error: "First-time university taxonomy indexing in progress. Takes 5-7 minutes. Please wait and try again.",
        status: "indexing",
        estimatedTime: "5-7 minutes"
      });
    }

    // ✅ INDEXING COMPLETE
    indexingStatus.set(tokenKey, 'complete');

    // ✅ CLASSIFY QUESTIONS
    const results = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      console.log(`🔍 [UNIVERSITY] Classifying question ${i + 1}/${questions.length}`);
      
      const classificationResult = await classifyQuestionUniversity(q, token);
      results.push(classificationResult);
    }

    const highConfidence = results.filter(r => r.confidence >= 80).length;
    const mediumConfidence = results.filter(r => r.confidence >= 60 && r.confidence < 80).length;
    const lowConfidence = results.filter(r => r.confidence < 60).length;
    
    const avgConfidence = Math.round(
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    );

    console.log(`✅ [UNIVERSITY] Analysis complete: ${results.length} classifications`);
    console.log(`📊 [UNIVERSITY] Stats: High=${highConfidence}, Med=${mediumConfidence}, Low=${lowConfidence}, Avg=${avgConfidence}%`);

    res.json({
      success: true,
      suggestions: results,
      metadata: {
        mode: 'vector_university',
        total_questions: results.length,
        high_confidence: highConfidence,
        medium_confidence: mediumConfidence,
        low_confidence: lowConfidence,
        average_confidence: avgConfidence
      }
    });

  } catch (err) {
    console.error("❌ [UNIVERSITY] Error in analyze-metadata-university:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;