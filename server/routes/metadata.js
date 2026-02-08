
// import express from "express";
// import { ensureIndexed } from "../services/platformManager.js";
// import { classifyQuestion } from "../services/vectorClassifier.js";

// const router = express.Router();

// // Track indexing status per token
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

//     // ✅ CHECK IF CURRENTLY INDEXING
//     const tokenKey = token.slice(-8);
//     const status = indexingStatus.get(tokenKey);

//     if (status === 'indexing') {
//       return res.status(503).json({
//         success: false,
//         error: "Indexing in progress. Please wait 2-3 minutes and try again.",
//         status: "indexing"
//       });
//     }

//     // ✅ TRY TO INDEX WITH 45-SECOND TIMEOUT
//     const indexingPromise = ensureIndexed(token);
//     const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 45000));
    
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
//         error: "First-time indexing in progress. This takes 3-5 minutes. Please try again in 3 minutes.",
//         status: "indexing",
//         estimatedTime: "3-5 minutes"
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

import express from "express";
import { ensureIndexed } from "../services/platformManager.js";
import { classifyQuestion } from "../services/vectorClassifier.js";

const router = express.Router();

// Track indexing status globally (not per token, since we use shared collections)
const indexingStatus = new Map();

router.post("/analyze-metadata", async (req, res) => {
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

    console.log(`📥 Received ${questions.length} questions for analysis`);

    // ✅ CHECK IF CURRENTLY INDEXING (use fixed key since collections are shared)
    const tokenKey = "prod_v1";  // Same as platformManager
    const status = indexingStatus.get(tokenKey);

    if (status === 'indexing') {
      return res.status(503).json({
        success: false,
        error: "Indexing in progress. Please wait 5-7 minutes and try again.",
        status: "indexing",
        estimatedTime: "5-7 minutes"
      });
    }

    // ✅ TRY TO INDEX WITH 90-SECOND TIMEOUT (increased for 3 collections)
    const indexingPromise = ensureIndexed(token);
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 90000));
    
    const result = await Promise.race([indexingPromise, timeout]);

    if (result === 'timeout') {
      // Mark as indexing in background
      indexingStatus.set(tokenKey, 'indexing');
      
      // Continue indexing in background
      indexingPromise.then(() => {
        indexingStatus.set(tokenKey, 'complete');
        console.log("✅ Background indexing completed");
      }).catch(err => {
        console.error("❌ Background indexing failed:", err);
        indexingStatus.delete(tokenKey);
      });

      return res.status(503).json({
        success: false,
        error: "First-time indexing in progress. Indexing 3-level taxonomy (subjects, topics, subtopics) takes 5-7 minutes. Please wait and try again in 5 minutes.",
        status: "indexing",
        estimatedTime: "5-7 minutes"
      });
    }

    // ✅ INDEXING COMPLETE - MARK AS DONE
    indexingStatus.set(tokenKey, 'complete');

    // ✅ CLASSIFY QUESTIONS
    const results = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      console.log(`🔍 Classifying question ${i + 1}/${questions.length}`);
      
      const classificationResult = await classifyQuestion(q, token);
      results.push(classificationResult);
    }

    const highConfidence = results.filter(r => r.confidence >= 80).length;
    const mediumConfidence = results.filter(r => r.confidence >= 60 && r.confidence < 80).length;
    const lowConfidence = results.filter(r => r.confidence < 60).length;
    
    const avgConfidence = Math.round(
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    );

    console.log(`✅ Analysis complete: ${results.length} classifications`);
    console.log(`📊 Stats: High=${highConfidence}, Med=${mediumConfidence}, Low=${lowConfidence}, Avg=${avgConfidence}%`);

    res.json({
      success: true,
      suggestions: results,
      metadata: {
        mode: 'vector',
        total_questions: results.length,
        high_confidence: highConfidence,
        medium_confidence: mediumConfidence,
        low_confidence: lowConfidence,
        average_confidence: avgConfidence
      }
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