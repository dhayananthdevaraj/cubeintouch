// routes/metadata.js - Metadata Analysis Endpoint
import express from "express";
import { analyzeMetadataBatch } from "../services/metadataService.js";

const router = express.Router();

/**
 * POST /analyze-metadata
 * Analyze questions and suggest Subject → Topic → SubTopic metadata
 * 
 * Request Body:
 * {
 *   questions: Array of question objects
 *   availableSubjects: Array of subject objects
 *   availableTopics: Array of topic objects
 *   availableSubTopics: Array of subtopic objects
 * }
 * 
 * Response:
 * Array of suggestions with:
 *   - q_id: string
 *   - question_preview: string
 *   - suggested_subject_id: string
 *   - suggested_subject_name: string
 *   - suggested_topic_id: string
 *   - suggested_topic_name: string
 *   - suggested_sub_topic_id: string
 *   - suggested_sub_topic_name: string
 *   - confidence: number (0-100)
 *   - reasoning: string
 *   - match_type: string
 */
router.post("/", async (req, res) => {
  try {
    const { questions, availableSubjects, availableTopics, availableSubTopics } = req.body;

    // Validation
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        error: "questions array is required and cannot be empty" 
      });
    }

    if (!availableSubjects || !availableTopics || !availableSubTopics) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["questions", "availableSubjects", "availableTopics", "availableSubTopics"]
      });
    }

    console.log(`📊 Metadata Analysis Request: ${questions.length} questions`);
    console.log(`   Subjects: ${availableSubjects.length}`);
    console.log(`   Topics: ${availableTopics.length}`);
    console.log(`   SubTopics: ${availableSubTopics.length}`);

    // Process metadata analysis
    const suggestions = await analyzeMetadataBatch(
      questions, 
      availableSubjects, 
      availableTopics, 
      availableSubTopics
    );

    console.log(`✅ Metadata Analysis Complete: ${suggestions.length} suggestions`);
    res.json(suggestions);

  } catch (err) {
    console.error("❌ Metadata Analysis Error:", err.message);
    res.status(500).json({
      error: "Metadata analysis failed",
      detail: err.message
    });
  }
});

export default router;