// // routes/metadata.js - Metadata Analysis Endpoint
// import express from "express";
// import { analyzeMetadataBatch } from "../services/metadataService.js";

// const router = express.Router();

// /**
//  * POST /analyze-metadata
//  * Analyze questions and suggest Subject → Topic → SubTopic metadata
//  * 
//  * Request Body:
//  * {
//  *   questions: Array of question objects
//  *   availableSubjects: Array of subject objects
//  *   availableTopics: Array of topic objects
//  *   availableSubTopics: Array of subtopic objects
//  * }
//  * 
//  * Response:
//  * Array of suggestions with:
//  *   - q_id: string
//  *   - question_preview: string
//  *   - suggested_subject_id: string
//  *   - suggested_subject_name: string
//  *   - suggested_topic_id: string
//  *   - suggested_topic_name: string
//  *   - suggested_sub_topic_id: string
//  *   - suggested_sub_topic_name: string
//  *   - confidence: number (0-100)
//  *   - reasoning: string
//  *   - match_type: string
//  */
// router.post("/", async (req, res) => {
//   try {
//     const { questions, availableSubjects, availableTopics, availableSubTopics } = req.body;

//     // Validation
//     if (!Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ 
//         error: "questions array is required and cannot be empty" 
//       });
//     }

//     if (!availableSubjects || !availableTopics || !availableSubTopics) {
//       return res.status(400).json({
//         error: "Missing required fields",
//         required: ["questions", "availableSubjects", "availableTopics", "availableSubTopics"]
//       });
//     }

//     console.log(`📊 Metadata Analysis Request: ${questions.length} questions`);
//     console.log(`   Subjects: ${availableSubjects.length}`);
//     console.log(`   Topics: ${availableTopics.length}`);
//     console.log(`   SubTopics: ${availableSubTopics.length}`);

//     // Process metadata analysis
//     const suggestions = await analyzeMetadataBatch(
//       questions, 
//       availableSubjects, 
//       availableTopics, 
//       availableSubTopics
//     );

//     console.log(`✅ Metadata Analysis Complete: ${suggestions.length} suggestions`);
//     res.json(suggestions);

//   } catch (err) {
//     console.error("❌ Metadata Analysis Error:", err.message);
//     res.status(500).json({
//       error: "Metadata analysis failed",
//       detail: err.message
//     });
//   }
// });

// export default router;

// // routes/metadata.js - Metadata Analysis Endpoint (UPDATED)
// import express from "express";
// import { analyzeMetadataBatch } from "../services/metadataService.js";
// import { analyzeMetadataWithLangGraph } from "../services/metadataLangGraphService.js"; // NEW IMPORT

// const router = express.Router();

// /**
//  * POST /analyze-metadata
//  * Analyze questions and suggest Subject → Topic → SubTopic metadata
//  * 
//  * Request Body:
//  * {
//  *   questions: Array of question objects
//  *   availableSubjects: Array of subject objects
//  *   availableTopics: Array of topic objects
//  *   availableSubTopics: Array of subtopic objects
//  *   useLangGraph: boolean (optional) - Use real LangGraph multi-agent system
//  * }
//  * 
//  * Response:
//  * {
//  *   suggestions: Array of metadata suggestions,
//  *   metadata: {
//  *     total_questions: number,
//  *     mode: "single-agent" | "langgraph",
//  *     high_confidence: number,
//  *     average_confidence: number,
//  *     ... (additional stats for LangGraph mode)
//  *   }
//  * }
//  */
// router.post("/", async (req, res) => {
//   try {
//     const { 
//       questions, 
//       availableSubjects, 
//       availableTopics, 
//       availableSubTopics,
//       useLangGraph = false  // NEW PARAMETER
//     } = req.body;

//     // Validation
//     if (!Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ 
//         error: "questions array is required and cannot be empty" 
//       });
//     }

//     if (!availableSubjects || !availableTopics || !availableSubTopics) {
//       return res.status(400).json({
//         error: "Missing required fields",
//         required: ["questions", "availableSubjects", "availableTopics", "availableSubTopics"]
//       });
//     }

//     console.log(`\n${'='.repeat(80)}`);
//     console.log(`📊 METADATA ANALYSIS REQUEST`);
//     console.log(`${'='.repeat(80)}`);
//     console.log(`   Questions: ${questions.length}`);
//     console.log(`   Subjects: ${availableSubjects.length}`);
//     console.log(`   Topics: ${availableTopics.length}`);
//     console.log(`   SubTopics: ${availableSubTopics.length}`);
//     console.log(`   Mode: ${useLangGraph ? '🤖 LANGGRAPH (Multi-Agent)' : '⚡ SINGLE-AGENT (Fast)'}`);
//     console.log(`${'='.repeat(80)}\n`);

//     // Choose analysis method based on mode
//     const suggestions = useLangGraph 
//       ? await analyzeMetadataWithLangGraph(
//           questions, 
//           availableSubjects, 
//           availableTopics, 
//           availableSubTopics
//         )
//       : await analyzeMetadataBatch(
//           questions, 
//           availableSubjects, 
//           availableTopics, 
//           availableSubTopics
//         );

//     console.log(`\n✅ Analysis Complete: ${suggestions.length} suggestions generated`);
    
//     // Build response with metadata
//     const response = {
//       suggestions,
//       metadata: {
//         total_questions: questions.length,
//         total_suggestions: suggestions.length,
//         mode: useLangGraph ? 'langgraph' : 'single-agent',
//         high_confidence: suggestions.filter(s => s.confidence >= 80).length,
//         medium_confidence: suggestions.filter(s => s.confidence >= 60 && s.confidence < 80).length,
//         low_confidence: suggestions.filter(s => s.confidence < 60).length,
//         average_confidence: (suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length).toFixed(1)
//       }
//     };

//     // Add LangGraph-specific metadata if applicable
//     if (useLangGraph) {
//       const agentAgreement = suggestions.filter(s => s.agent_agreement === true).length;
//       const agentDisagreement = suggestions.filter(s => s.agent_agreement === false).length;
//       const agent3Used = suggestions.filter(s => s.agent3_used === true).length;
//       const approved = suggestions.filter(s => s.validation_status === "APPROVED").length;
//       const corrected = suggestions.filter(s => s.validation_status === "CORRECTED").length;

//       response.metadata.langgraph_stats = {
//         agent_agreement: agentAgreement,
//         agent_disagreement: agentDisagreement,
//         agent3_reconciliations: agent3Used,
//         approved_by_agent2: approved,
//         corrected_by_agent2: corrected,
//         agreement_rate: ((agentAgreement / suggestions.length) * 100).toFixed(1) + '%',
//         correction_rate: ((corrected / suggestions.length) * 100).toFixed(1) + '%'
//       };
//     }

//     res.json(response);

//   } catch (err) {
//     console.error("❌ Metadata Analysis Error:", err.message);
//     console.error(err.stack);
//     res.status(500).json({
//       error: "Metadata analysis failed",
//       detail: err.message
//     });
//   }
// });

// /**
//  * GET /analyze-metadata/info
//  * Get information about available analysis modes
//  */
// router.get("/info", (req, res) => {
//   res.json({
//     available_modes: {
//       single_agent: {
//         description: "Fast single-agent classification with intelligent fuzzy matching",
//         accuracy: "~80-85%",
//         speed: "Fast (1-2 seconds per question)",
//         use_case: "Quick analysis, large batches (100+ questions)",
//         features: [
//           "AI-powered classification",
//           "Intelligent conflict detection (dynamic)",
//           "Context-aware disambiguation",
//           "Scales to 12,200+ topics automatically"
//         ],
//         parameter: { useLangGraph: false }
//       },
//       langgraph_multi_agent: {
//         description: "Real LangGraph multi-agent system with validation and reconciliation",
//         accuracy: "~95-98%",
//         speed: "Slower (4-5 seconds per question)",
//         use_case: "High-accuracy requirements, critical classifications (production content)",
//         features: [
//           "Agent 1: Primary classification",
//           "Agent 2: Validation and automatic correction",
//           "Agent 3: Conflict resolution (when agents disagree)",
//           "Intelligent fuzzy matching with question context",
//           "Dynamic technology disambiguation",
//           "Real state graph execution with LangGraph"
//         ],
//         parameter: { useLangGraph: true }
//       }
//     },
//     recommendations: {
//       use_single_agent_when: [
//         "Processing 100+ questions",
//         "Speed is priority",
//         "80-85% accuracy is acceptable",
//         "Budget/API cost constraints",
//         "Testing or development phase"
//       ],
//       use_langgraph_when: [
//         "Processing critical/important questions (exams, assessments)",
//         "95%+ accuracy required",
//         "Willing to accept 2-3x processing time",
//         "Questions have complex/ambiguous content",
//         "Production content that will be seen by students"
//       ]
//     },
//     technology_disambiguation: {
//       description: "Both modes use intelligent dynamic disambiguation",
//       scope: "Automatically handles 12,200+ topics",
//       conflicts_detected: [
//         "Java ↔ JavaScript",
//         "React ↔ Angular ↔ Vue",
//         "SQL ↔ NoSQL",
//         "Python ↔ Java ↔ JavaScript",
//         "C ↔ C++ ↔ C#",
//         "Django ↔ Flask ↔ FastAPI",
//         "AWS ↔ Azure ↔ GCP",
//         "Docker ↔ Kubernetes",
//         "And many more (dynamic detection)"
//       ],
//       method: "Context-based analysis using question keywords"
//     },
//     cost_comparison: {
//       single_agent: {
//         api_calls_per_question: "~0.2 (batched)",
//         time_per_question: "1-2 seconds",
//         recommended_for: "Large batches"
//       },
//       langgraph: {
//         api_calls_per_question: "~2.1 (Agent1 + Agent2 + Agent3 when needed)",
//         time_per_question: "4-5 seconds",
//         recommended_for: "High-stakes content"
//       }
//     }
//   });
// });

// /**
//  * GET /analyze-metadata/health
//  * Health check endpoint
//  */
// router.get("/health", (req, res) => {
//   res.json({
//     status: "healthy",
//     service: "Metadata Analysis Service",
//     modes: ["single-agent", "langgraph"],
//     intelligent_disambiguation: "enabled",
//     timestamp: new Date().toISOString()
//   });
// });

// export default router;


//dynamic

// // routes/metadata.js - Updated for Dynamic System
// import express from "express";
// import { classifyQuestions } from "../services/metadataService.js"; // Dynamic system

// const router = express.Router();

// /**
//  * POST /analyze-metadata
//  * Analyze questions using Dynamic Ultimate system
//  * 
//  * Request Body:
//  * {
//  *   questions: ["question 1", "question 2", ...],
//  *   platformData: [full API response with all subtopics]
//  * }
//  */
// router.post("/", async (req, res) => {
//   try {
//     const { questions, platformData } = req.body;

//     // Validation
//     if (!Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ 
//         error: "questions array is required and cannot be empty" 
//       });
//     }

//     if (!Array.isArray(platformData) || platformData.length === 0) {
//       return res.status(400).json({
//         error: "platformData array is required and cannot be empty"
//       });
//     }

//     console.log(`\n${'='.repeat(80)}`);
//     console.log(`📊 DYNAMIC METADATA ANALYSIS`);
//     console.log(`${'='.repeat(80)}`);
//     console.log(`   Questions: ${questions.length}`);
//     console.log(`   Platform Data: ${platformData.length} SubTopics`);
//     console.log(`${'='.repeat(80)}\n`);

//     // Run dynamic classification
//     const results = await classifyQuestions(questions, platformData);

//     console.log(`\n✅ Analysis Complete: ${results.length} results\n`);
    
//     // Build response
//     const successful = results.filter(r => !r.error).length;
//     const highConfidence = results.filter(r => r.confidence >= 80).length;
//     const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;

//     res.json({
//       results,
//       metadata: {
//         total_questions: questions.length,
//         successful: successful,
//         failed: questions.length - successful,
//         high_confidence: highConfidence,
//         average_confidence: Math.round(avgConfidence),
//         mode: 'dynamic_ultimate'
//       }
//     });

//   } catch (err) {
//     console.error("❌ Metadata Analysis Error:", err.message);
//     console.error(err.stack);
//     res.status(500).json({
//       error: "Metadata analysis failed",
//       detail: err.message
//     });
//   }
// });

// /**
//  * GET /analyze-metadata/info
//  */
// router.get("/info", (req, res) => {
//   res.json({
//     system: "Dynamic Ultimate Metadata Classification",
//     features: [
//       "Auto-learns from platform data",
//       "Works for ALL subjects (60+)",
//       "Resolves duplicate SubTopics",
//       "Context-aware scoring",
//       "Technology conflict prevention"
//     ],
//     accuracy: "85-90% overall, 90-95% for duplicate resolution",
//     speed: "~500ms per question"
//   });
// });

// /**
//  * GET /analyze-metadata/health
//  */
// router.get("/health", (req, res) => {
//   res.json({
//     status: "healthy",
//     service: "Dynamic Metadata Classification",
//     version: "2.0",
//     timestamp: new Date().toISOString()
//   });
// });

// export default router;

// routes/metadata.js - BACKWARD COMPATIBLE VERSION
// import express from "express";
// import { classifyQuestions } from "../services/metadataService.js";

// const router = express.Router();

// /**
//  * Convert OLD format to NEW format
//  * OLD: { availableSubjects, availableTopics, availableSubTopics }
//  * NEW: { platformData }
//  */
// function convertToNewFormat(availableSubjects, availableTopics, availableSubTopics) {
//   console.log('🔄 Converting old format to new platformData format...');
  
//   const platformData = [];
  
//   availableSubTopics.forEach(subTopic => {
//     const topic = availableTopics.find(t => t.topic_id === subTopic.topic_id);
//     const subject = availableSubjects.find(s => s.subject_id === topic?.subject_id);
    
//     if (topic && subject) {
//       platformData.push({
//         sub_topic_id: subTopic.sub_topic_id,
//         name: subTopic.name,
//         topic: {
//           topic_id: topic.topic_id,
//           name: topic.name,
//           subject: {
//             subject_id: subject.subject_id,
//             name: subject.name
//           }
//         }
//       });
//     }
//   });
  
//   console.log(`✅ Converted ${platformData.length} SubTopics to platformData format`);
  
//   return platformData;
// }

// /**
//  * Extract question text from question objects
//  */
// function extractQuestions(questions) {
//   // Check if questions are already strings
//   if (questions.length > 0 && typeof questions[0] === 'string') {
//     return questions;
//   }
  
//   // Extract text from question objects
//   return questions.map(q => {
//     if (typeof q === 'object') {
//       // Try common field names
//       return q.question || q.text || q.question_text || q.content || JSON.stringify(q);
//     }
//     return String(q);
//   });
// }

// /**
//  * POST /analyze-metadata
//  * BACKWARD COMPATIBLE - Accepts both old and new formats
//  */
// router.post("/", async (req, res) => {
//   try {
//     let { questions, platformData, availableSubjects, availableTopics, availableSubTopics } = req.body;

//     // Validation
//     if (!Array.isArray(questions) || questions.length === 0) {
//       return res.status(400).json({ 
//         error: "questions array is required and cannot be empty" 
//       });
//     }

//     // BACKWARD COMPATIBILITY: Convert old format to new format
//     if (!platformData && availableSubjects && availableTopics && availableSubTopics) {
//       console.log('📦 OLD FORMAT DETECTED - Converting to new format...');
//       platformData = convertToNewFormat(availableSubjects, availableTopics, availableSubTopics);
//     }

//     // Validate platformData
//     if (!Array.isArray(platformData) || platformData.length === 0) {
//       return res.status(400).json({
//         error: "platformData array is required and cannot be empty",
//         hint: "Send either 'platformData' (new format) or 'availableSubjects/Topics/SubTopics' (old format)"
//       });
//     }

//     // Extract question text
//     const questionTexts = extractQuestions(questions);

//     console.log(`\n${'='.repeat(80)}`);
//     console.log(`📊 DYNAMIC METADATA ANALYSIS`);
//     console.log(`${'='.repeat(80)}`);
//     console.log(`   Questions: ${questionTexts.length}`);
//     console.log(`   Platform Data: ${platformData.length} SubTopics`);
//     console.log(`   Format: ${availableSubjects ? 'OLD (converted)' : 'NEW (direct)'}`);
//     console.log(`${'='.repeat(80)}\n`);

//     // Run dynamic classification
//     const results = await classifyQuestions(questionTexts, platformData);

//     console.log(`\n✅ Analysis Complete: ${results.length} results\n`);
    
//     // Build response
//     const successful = results.filter(r => !r.error).length;
//     const highConfidence = results.filter(r => r.confidence >= 80).length;
//     const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;

//     // Map results back to original question format if needed
//     const formattedResults = results.map((result, index) => {
//       const originalQuestion = questions[index];
      
//       // If original was an object, include original fields
//       if (typeof originalQuestion === 'object') {
//         return {
//           ...originalQuestion,
//           suggested_subject_id: result.subject_id,
//           suggested_subject_name: result.subject_name,
//           suggested_topic_id: result.topic_id,
//           suggested_topic_name: result.topic_name,
//           suggested_sub_topic_id: result.sub_topic_id,
//           suggested_sub_topic_name: result.sub_topic_name,
//           confidence: result.confidence,
//           ai_suggestion: result.ai_suggestion,
//           match_score: result.match_score,
//           match_type: result.match_type,
//           error: result.error
//         };
//       }
      
//       // Otherwise return as-is
//       return result;
//     });

//     res.json({
//       suggestions: formattedResults, // Use "suggestions" for backward compatibility
//       results: formattedResults,     // Also include "results" for new format
//       metadata: {
//         total_questions: questionTexts.length,
//         successful: successful,
//         failed: questionTexts.length - successful,
//         high_confidence: highConfidence,
//         medium_confidence: results.filter(r => r.confidence >= 60 && r.confidence < 80).length,
//         low_confidence: results.filter(r => r.confidence < 60).length,
//         average_confidence: Math.round(avgConfidence),
//         mode: 'dynamic_ultimate',
//         format_used: availableSubjects ? 'old_format_converted' : 'new_format_direct'
//       }
//     });

//   } catch (err) {
//     console.error("❌ Metadata Analysis Error:", err.message);
//     console.error(err.stack);
//     res.status(500).json({
//       error: "Metadata analysis failed",
//       detail: err.message
//     });
//   }
// });

// /**
//  * GET /analyze-metadata/info
//  */
// router.get("/info", (req, res) => {
//   res.json({
//     system: "Dynamic Ultimate Metadata Classification",
//     version: "2.0",
//     backward_compatible: true,
//     accepted_formats: {
//       new_format: {
//         questions: ["string array"],
//         platformData: [
//           {
//             sub_topic_id: "string",
//             name: "string",
//             topic: {
//               topic_id: "string",
//               name: "string",
//               subject: {
//                 subject_id: "string",
//                 name: "string"
//               }
//             }
//           }
//         ]
//       },
//       old_format: {
//         questions: ["array of objects or strings"],
//         availableSubjects: ["array"],
//         availableTopics: ["array"],
//         availableSubTopics: ["array"]
//       }
//     },
//     features: [
//       "Auto-learns from platform data",
//       "Works for ALL subjects (60+)",
//       "Resolves duplicate SubTopics",
//       "Context-aware scoring",
//       "Technology conflict prevention",
//       "Backward compatible with old API format"
//     ],
//     accuracy: "85-90% overall, 90-95% for duplicate resolution",
//     speed: "~500ms per question"
//   });
// });

// /**
//  * GET /analyze-metadata/health
//  */
// router.get("/health", (req, res) => {
//   res.json({
//     status: "healthy",
//     service: "Dynamic Metadata Classification",
//     version: "2.0",
//     backward_compatible: true,
//     timestamp: new Date().toISOString()
//   });
// });
import express from "express";
import { ensureIndexed } from "../services/platformManager.js";
import { classifyQuestion } from "../services/vectorClassifier.js";

const router = express.Router();

// Track indexing status per token
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

    // ✅ CHECK IF CURRENTLY INDEXING
    const tokenKey = token.slice(-8);
    const status = indexingStatus.get(tokenKey);

    if (status === 'indexing') {
      return res.status(503).json({
        success: false,
        error: "Indexing in progress. Please wait 2-3 minutes and try again.",
        status: "indexing"
      });
    }

    // ✅ TRY TO INDEX WITH 45-SECOND TIMEOUT
    const indexingPromise = ensureIndexed(token);
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 45000));
    
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
        error: "First-time indexing in progress. This takes 3-5 minutes. Please try again in 3 minutes.",
        status: "indexing",
        estimatedTime: "3-5 minutes"
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