
// import express from "express";
// import { ensureIndexed } from "../services/platformManager.js";
// import { classifyQuestion } from "../services/vectorClassifier.js";

// const router = express.Router();

// // Track indexing status globally (not per token, since we use shared collections)
// const indexingStatus = new Map();

// router.post("/analyze-metadata", async (req, res) => {
//   try {
//     const token = req.headers.authorization;

//     if (!token) {
//       return res.status(401).json({
//         error: "Authorization token required",
//       });
//     }

//     if (token.length < 50) {
//       return res.status(401).json({
//         error: "Invalid token format",
//       });
//     }

//     const { questions } = req.body;

//     if (!questions || !Array.isArray(questions)) {
//       return res.status(400).json({
//         error: "questions array required",
//       });
//     }

//     console.log(`📥 Received ${questions.length} questions for analysis`);

//     // ✅ CHECK IF CURRENTLY INDEXING (use fixed key since collections are shared)
//     const tokenKey = "prod_v1";  // Same as platformManager
//     const status = indexingStatus.get(tokenKey);

//     if (status === 'indexing') {
//       return res.status(503).json({
//         success: false,
//         error: "Indexing in progress. Please wait 5-7 minutes and try again.",
//         status: "indexing",
//         estimatedTime: "5-7 minutes"
//       });
//     }

//     // ✅ TRY TO INDEX WITH 90-SECOND TIMEOUT (increased for 3 collections)
//     const indexingPromise = ensureIndexed(token);
//     const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 90000));
    
//     const result = await Promise.race([indexingPromise, timeout]);

//     if (result === 'timeout') {
//       // Mark as indexing in background
//       indexingStatus.set(tokenKey, 'indexing');
      
//       // Continue indexing in background
//       indexingPromise.then(() => {
//         indexingStatus.set(tokenKey, 'complete');
//         console.log("✅ Background indexing completed");
//       }).catch(err => {
//         console.error("❌ Background indexing failed:", err);
//         indexingStatus.delete(tokenKey);
//       });

//       return res.status(503).json({
//         success: false,
//         error: "First-time indexing in progress. Indexing 3-level taxonomy (subjects, topics, subtopics) takes 5-7 minutes. Please wait and try again in 5 minutes.",
//         status: "indexing",
//         estimatedTime: "5-7 minutes"
//       });
//     }

//     // ✅ INDEXING COMPLETE - MARK AS DONE
//     indexingStatus.set(tokenKey, 'complete');

//     // ✅ CLASSIFY QUESTIONS
//     const results = [];

//     for (let i = 0; i < questions.length; i++) {
//       const q = questions[i];
      
//       console.log(`🔍 Classifying question ${i + 1}/${questions.length}`);
      
//       const classificationResult = await classifyQuestion(q, token);
//       results.push(classificationResult);
//     }

//     const highConfidence = results.filter(r => r.confidence >= 80).length;
//     const mediumConfidence = results.filter(r => r.confidence >= 60 && r.confidence < 80).length;
//     const lowConfidence = results.filter(r => r.confidence < 60).length;
    
//     const avgConfidence = Math.round(
//       results.reduce((sum, r) => sum + r.confidence, 0) / results.length
//     );

//     console.log(`✅ Analysis complete: ${results.length} classifications`);
//     console.log(`📊 Stats: High=${highConfidence}, Med=${mediumConfidence}, Low=${lowConfidence}, Avg=${avgConfidence}%`);

//     res.json({
//       success: true,
//       suggestions: results,
//       metadata: {
//         mode: 'vector',
//         total_questions: results.length,
//         high_confidence: highConfidence,
//         medium_confidence: mediumConfidence,
//         low_confidence: lowConfidence,
//         average_confidence: avgConfidence
//       }
//     });

//   } catch (err) {
//     console.error("❌ Error in analyze-metadata:", err);

//     res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// export default router;

//fixed

import express from "express";
import { ensureIndexed } from "../services/platformManager.js";
import { classifyQuestion } from "../services/vectorClassifier.js";

const router = express.Router();

// ✅ Shared indexing state (single key since collections are shared)
const TOKEN_KEY = "prod_v1";
const indexingStatus = new Map(); // 'indexing' | 'complete' | undefined

// ─────────────────────────────────────────────
// POST /analyze-metadata
// ─────────────────────────────────────────────
router.post("/analyze-metadata", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    if (token.length < 50) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: "questions array required" });
    }

    console.log(`📥 Received ${questions.length} questions for analysis`);

    // ✅ CHECK IF ALREADY INDEXING (from a previous timed-out request)
    const currentStatus = indexingStatus.get(TOKEN_KEY);

    if (currentStatus === "indexing") {
      console.log("⏳ Indexing already in progress — returning 503 with retry hint");
      return res.status(503).json({
        success: false,
        error: "Indexing in progress. Please wait and try again.",
        status: "indexing",
        estimatedTime: "3-5 minutes",
        // ✅ Tell the client exactly how long to wait before retrying
        retryAfterSeconds: 30,
      });
    }

    // ✅ TRY TO ENSURE INDEXED
    //    Use a 3-minute timeout (Render cold start + embedding can take ~2 min)
    let indexingDone = false;

    indexingStatus.set(TOKEN_KEY, "indexing");

    const indexingPromise = ensureIndexed(token).then((result) => {
      indexingDone = true;
      indexingStatus.set(TOKEN_KEY, "complete");
      return result;
    });

    // ✅ INCREASED: 3 minutes to account for cold start + full indexing
    const TIMEOUT_MS = 3 * 60 * 1000;
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve("timeout"), TIMEOUT_MS)
    );

    const raceResult = await Promise.race([indexingPromise, timeoutPromise]);

    if (raceResult === "timeout") {
      // Indexing is still running in background — do NOT cancel it
      // Just tell the client to retry; next request will either:
      //   a) still be indexing → another 503 with retry hint
      //   b) complete → proceeds normally
      console.log("⏳ Indexing timed out on this request — still running in background");

      // Keep status as 'indexing' so next request sees it correctly
      // (the .then() above will update it to 'complete' when done)

      return res.status(503).json({
        success: false,
        error:
          "Server is indexing the taxonomy for the first time. This takes 3–5 minutes on first run. Please wait and try again.",
        status: "indexing",
        estimatedTime: "3-5 minutes",
        retryAfterSeconds: 60,
      });
    }

    // ✅ INDEXING COMPLETE — CLASSIFY QUESTIONS
    console.log("✅ Indexing confirmed — starting classification");

    const results = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`🔍 Classifying question ${i + 1}/${questions.length}`);
      const classificationResult = await classifyQuestion(q, token);
      results.push(classificationResult);
    }

    const highConfidence = results.filter((r) => r.confidence >= 80).length;
    const mediumConfidence = results.filter(
      (r) => r.confidence >= 60 && r.confidence < 80
    ).length;
    const lowConfidence = results.filter((r) => r.confidence < 60).length;
    const avgConfidence = Math.round(
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    );

    console.log(`✅ Analysis complete: ${results.length} classifications`);
    console.log(
      `📊 Stats: High=${highConfidence}, Med=${mediumConfidence}, Low=${lowConfidence}, Avg=${avgConfidence}%`
    );

    res.json({
      success: true,
      suggestions: results,
      metadata: {
        mode: "vector",
        total_questions: results.length,
        high_confidence: highConfidence,
        medium_confidence: mediumConfidence,
        low_confidence: lowConfidence,
        average_confidence: avgConfidence,
      },
    });
  } catch (err) {
    console.error("❌ Error in analyze-metadata:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;