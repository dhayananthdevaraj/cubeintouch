// backend/server.js
import express from "express";
import Groq from "groq-sdk";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =======================
// QC ENDPOINT
// =======================
app.post("/qc", async (req, res) => {
  const mcqs = req.body.mcqs || [];

  if (!Array.isArray(mcqs)) {
    return res.status(400).json({ error: "mcqs must be an array" });
  }

  if (mcqs.length === 0) {
    return res.status(400).json({ error: "mcqs array is empty" });
  }

  const prompt = `
You are a senior MCQ (Multiple Choice Question) quality reviewer for educational platforms.

Each MCQ contains:
- question: The question text
- code: Optional code snippet
- options: Array of answer options
- existingAnswer: Current answer from platform (may be wrong)
- difficulty: Question difficulty level
- topic: Subject topic

YOUR JOB:
Review each MCQ for accuracy and quality. Do NOT solve the question; instead validate the existing answer and identify issues.

For EACH MCQ, return JSON with:
1. question: The question text
2. isCorrect: Boolean - is the existingAnswer correct?
3. correctAnswer: String - the correct answer text (only if isCorrect=false)
4. issues: Array of strings - list all problems (grammar, ambiguity, wrong premise, misleading options, missing context)
5. qualityScore: Number 0-10 - overall quality rating

IMPORTANT RULES:
- Do NOT trust existingAnswer blindly
- If answer is missing/unclear, mark isCorrect=false
- If question has no valid correct option, mention this in issues
- List ALL issues found, even minor ones
- Quality score should reflect: clarity, correctness, options validity, ambiguity level
- Return ONLY valid JSON array
- No markdown formatting
- No code blocks (remove \`\`\`json\`\`\` wrappers)

Return exactly this format:
[
  {
    "question": "exact question text",
    "isCorrect": true or false,
    "correctAnswer": "answer only if isCorrect=false",
    "issues": ["issue1", "issue2"],
    "qualityScore": 7
  }
]

MCQs to review:
${JSON.stringify(mcqs, null, 2)}
`;

  try {
       const message = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 4000
        });

    let responseText = message.choices[0].message.content.trim();

    // Clean up response
    responseText = responseText
      .replace(/^```json\s*/gi, "")
      .replace(/^```\s*/gi, "")
      .replace(/```\s*$/gi, "")
      .trim();

    // Parse JSON
    const parsed = JSON.parse(responseText);

    // Validate response format
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    res.json(parsed);
  } catch (err) {
    console.error("QC Error:", err.message);
    res.status(500).json({
      error: "QC processing failed",
      detail: err.message,
      suggestion: "Check API key and request format"
    });
  }
});

// =======================
// NEW: METADATA ANALYSIS ENDPOINT (BATCHED)
// =======================
// app.post("/analyze-metadata", async (req, res) => {
//   const { questions, availableSubjects, availableTopics, availableSubTopics } = req.body;

//   if (!Array.isArray(questions) || questions.length === 0) {
//     return res.status(400).json({ error: "questions array is required and cannot be empty" });
//   }

//   console.log(`📊 Received ${questions.length} questions for analysis`);

//   // Create compact lookup structures
//   const subjectMap = new Map(availableSubjects.map(s => [s.name.toLowerCase(), s]));
//   const topicMap = new Map(availableTopics.map(t => [t.name.toLowerCase(), t]));
//   const subTopicMap = new Map(availableSubTopics.map(st => [st.name.toLowerCase(), st]));

//   // Get only top options to reduce context
//   const topSubjects = availableSubjects.slice(0, 20).map(s => s.name).join(", ");
//   const topTopics = availableTopics.slice(0, 30).map(t => t.name).join(", ");
//   const topSubTopics = availableSubTopics.slice(0, 40).map(st => st.name).join(", ");

//   try {
//     const allSuggestions = [];
//     const BATCH_SIZE = 5; // Llama can handle larger batches
//     const BATCH_DELAY = 1000; // 1 second delay (Llama has better rate limits)
//     const totalBatches = Math.ceil(questions.length / BATCH_SIZE);

//     console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} questions each`);

//     for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
//       const start = batchIndex * BATCH_SIZE;
//       const end = Math.min(start + BATCH_SIZE, questions.length);
//       const batchQuestions = questions.slice(start, end);

//       console.log(`🔄 Batch ${batchIndex + 1}/${totalBatches} (Q ${start + 1}-${end})`);

//       // Compact prompt for Llama
//       const prompt = `Classify these ${batchQuestions.length} programming questions into Subject/Topic/SubTopic.

// Available Options:
// Subjects: ${topSubjects}
// Topics: ${topTopics}
// SubTopics: ${topSubTopics}

// Return ONLY this JSON array format (no markdown, no explanation):
// [{"q_id":"id","subject":"name","topic":"name","sub_topic":"name","confidence":80,"reason":"brief"}]

// Questions to analyze:
// ${batchQuestions.map((q, i) => 
//   `${i + 1}. ID:${q.q_id}\nQuestion: ${q.question_data?.replace(/<[^>]*>/g, '').substring(0, 100)}`
// ).join('\n\n')}`;

//       const message = await groq.chat.completions.create({
//         model: "llama-3.3-70b-versatile", // ✅ USING LLAMA 3.3 70B
//         messages: [{ role: "user", content: prompt }],
//         temperature: 0.2,
//         max_tokens: 2000
//       });

//       let responseText = message.choices[0].message.content.trim();
//       responseText = responseText
//         .replace(/^```json\s*/gi, "")
//         .replace(/^```\s*/gi, "")
//         .replace(/```\s*$/gi, "")
//         .trim();

//       const batchResults = JSON.parse(responseText);

//       // Enrich with IDs and full data
//       const enrichedResults = batchResults.map(result => {
//         // Fuzzy matching for subjects
//         const subject = subjectMap.get(result.subject.toLowerCase()) || 
//                        Array.from(subjectMap.values()).find(s => 
//                          s.name.toLowerCase().includes(result.subject.toLowerCase()) ||
//                          result.subject.toLowerCase().includes(s.name.toLowerCase())
//                        );
        
//         // Fuzzy matching for topics
//         const topic = topicMap.get(result.topic.toLowerCase()) || 
//                      Array.from(topicMap.values()).find(t => 
//                        t.name.toLowerCase().includes(result.topic.toLowerCase()) ||
//                        result.topic.toLowerCase().includes(t.name.toLowerCase())
//                      );
        
//         // Fuzzy matching for subtopics
//         const subTopic = subTopicMap.get(result.sub_topic.toLowerCase()) || 
//                         Array.from(subTopicMap.values()).find(st => 
//                           st.name.toLowerCase().includes(result.sub_topic.toLowerCase()) ||
//                           result.sub_topic.toLowerCase().includes(st.name.toLowerCase())
//                         );

//         const originalQuestion = batchQuestions.find(q => q.q_id === result.q_id);
        
//         return {
//           q_id: result.q_id,
//           question_preview: originalQuestion?.question_data?.replace(/<[^>]*>/g, '').substring(0, 100) || "N/A",
//           suggested_subject_id: subject?.subject_id || availableSubjects[0]?.subject_id,
//           suggested_subject_name: subject?.name || result.subject,
//           suggested_topic_id: topic?.topic_id || availableTopics[0]?.topic_id,
//           suggested_topic_name: topic?.name || result.topic,
//           suggested_sub_topic_id: subTopic?.sub_topic_id || availableSubTopics[0]?.sub_topic_id,
//           suggested_sub_topic_name: subTopic?.name || result.sub_topic,
//           confidence: result.confidence || 70,
//           reasoning: result.reason || "AI classification based on content analysis"
//         };
//       });

//       allSuggestions.push(...enrichedResults);
//       console.log(`✅ Batch ${batchIndex + 1} done (${enrichedResults.length} suggestions)`);

//       // Delay between batches
//       if (batchIndex < totalBatches - 1) {
//         console.log(`⏳ Waiting ${BATCH_DELAY/1000}s before next batch...`);
//         await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
//       }
//     }

//     console.log(`🎉 Complete! ${allSuggestions.length} total suggestions`);
//     res.json(allSuggestions);

//   } catch (err) {
//     console.error("❌ Analysis Error:", err.message);
//     res.status(500).json({
//       error: "Metadata analysis failed",
//       detail: err.message,
//       suggestion: "Check API key and try again"
//     });
//   }
// });

app.post("/analyze-metadata", async (req, res) => {
  const { questions, availableSubjects, availableTopics, availableSubTopics } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "questions array is required and cannot be empty" });
  }

  console.log(`📊 Received ${questions.length} questions for analysis`);

  // Build hierarchical lookup
  const hierarchyMap = new Map();
  const topicSubTopicsMap = new Map(); // Topic → available SubTopics
  
  availableSubTopics.forEach(subTopic => {
    const topic = availableTopics.find(t => t.topic_id === subTopic.topic_id);
    const subject = availableSubjects.find(s => s.subject_id === topic?.subject_id);
    
    if (topic && subject) {
      const key = `${subject.name}|${topic.name}|${subTopic.name}`.toLowerCase();
      hierarchyMap.set(key, {
        subject_id: subject.subject_id,
        subject_name: subject.name,
        topic_id: topic.topic_id,
        topic_name: topic.name,
        sub_topic_id: subTopic.sub_topic_id,
        sub_topic_name: subTopic.name
      });

      // Track available subtopics per topic
      const topicKey = `${subject.name}|${topic.name}`.toLowerCase();
      if (!topicSubTopicsMap.has(topicKey)) {
        topicSubTopicsMap.set(topicKey, []);
      }
      topicSubTopicsMap.get(topicKey).push({
        subject_id: subject.subject_id,
        subject_name: subject.name,
        topic_id: topic.topic_id,
        topic_name: topic.name,
        sub_topic_id: subTopic.sub_topic_id,
        sub_topic_name: subTopic.name
      });
    }
  });

  // Create hierarchical context for AI
  const hierarchicalOptions = Array.from(hierarchyMap.values())
    .slice(0, 50)
    .map(h => `${h.subject_name} → ${h.topic_name} → ${h.sub_topic_name}`)
    .join("\n");

  try {
    const allSuggestions = [];
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 1000;
    const totalBatches = Math.ceil(questions.length / BATCH_SIZE);

    console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} questions each`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, questions.length);
      const batchQuestions = questions.slice(start, end);

      console.log(`🔄 Batch ${batchIndex + 1}/${totalBatches} (Q ${start + 1}-${end})`);

      const prompt = `Analyze these programming questions and classify them into Subject → Topic → SubTopic.

IMPORTANT: Match ONLY from the available hierarchies below. If exact match doesn't exist, choose the closest available SubTopic under the correct Topic.

AVAILABLE HIERARCHIES:
${hierarchicalOptions}

RULES:
1. Identify the programming language/technology from question
2. Match to available hierarchy (must exist in the list above)
3. If exact SubTopic doesn't exist, choose closest one under same Topic
4. Provide confidence (0-100) and reasoning

Return ONLY JSON (no markdown):
[{"q_id":"id","subject":"name","topic":"name","sub_topic":"name","confidence":85,"reason":"brief"}]

QUESTIONS:
${batchQuestions.map((q, i) => {
  const questionText = q.question_data?.replace(/<[^>]*>/g, '').substring(0, 120);
  return `${i + 1}. ID:${q.q_id}\nQ: ${questionText}`;
}).join('\n\n')}`;

      const message = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000
      });

      let responseText = message.choices[0].message.content.trim();
      responseText = responseText
        .replace(/^```json\s*/gi, "")
        .replace(/^```\s*/gi, "")
        .replace(/```\s*$/gi, "")
        .trim();

      const batchResults = JSON.parse(responseText);

      // Smart matching with fallback strategy
      const enrichedResults = batchResults.map(result => {
        const originalQuestion = batchQuestions.find(q => q.q_id === result.q_id);
        
        // 1. Try exact hierarchical match
        const exactKey = `${result.subject}|${result.topic}|${result.sub_topic}`.toLowerCase();
        let matchedHierarchy = hierarchyMap.get(exactKey);
        let matchType = "exact";
        
        // 2. If no exact match, find best match under same Topic
        if (!matchedHierarchy) {
          const topicKey = `${result.subject}|${result.topic}`.toLowerCase();
          const availableSubTopics = topicSubTopicsMap.get(topicKey);
          
          if (availableSubTopics && availableSubTopics.length > 0) {
            // Find closest subtopic match
            matchedHierarchy = availableSubTopics.find(st =>
              st.sub_topic_name.toLowerCase().includes(result.sub_topic.toLowerCase()) ||
              result.sub_topic.toLowerCase().includes(st.sub_topic_name.toLowerCase())
            );
            
            // If still no match, just use first available subtopic under this topic
            if (!matchedHierarchy) {
              matchedHierarchy = availableSubTopics[0];
              matchType = "topic_fallback";
            } else {
              matchType = "fuzzy_subtopic";
            }
          }
        }
        
        // 3. If topic doesn't exist either, find closest topic under same subject
        if (!matchedHierarchy) {
          const subjectLower = result.subject.toLowerCase();
          const topicLower = result.topic.toLowerCase();
          
          matchedHierarchy = Array.from(hierarchyMap.values()).find(h =>
            h.subject_name.toLowerCase().includes(subjectLower) &&
            h.topic_name.toLowerCase().includes(topicLower)
          );
          matchType = "fuzzy_topic";
        }
        
        // 4. Final fallback: find any match with same subject
        if (!matchedHierarchy) {
          matchedHierarchy = Array.from(hierarchyMap.values()).find(h =>
            h.subject_name.toLowerCase().includes(result.subject.toLowerCase())
          );
          matchType = "subject_fallback";
        }
        
        // 5. Absolute fallback
        if (!matchedHierarchy) {
          matchedHierarchy = Array.from(hierarchyMap.values())[0];
          matchType = "absolute_fallback";
        }
        
        // Adjust confidence based on match quality
        let adjustedConfidence = result.confidence || 75;
        if (matchType === "topic_fallback") adjustedConfidence = Math.max(60, adjustedConfidence - 15);
        if (matchType === "fuzzy_topic") adjustedConfidence = Math.max(50, adjustedConfidence - 25);
        if (matchType === "subject_fallback") adjustedConfidence = Math.max(40, adjustedConfidence - 35);
        if (matchType === "absolute_fallback") adjustedConfidence = 30;

        let reasoning = result.reason || "AI classification";
        if (matchType !== "exact") {
          reasoning += ` (${matchType}: closest available match)`;
        }
        
        return {
          q_id: result.q_id,
          question_preview: originalQuestion?.question_data?.replace(/<[^>]*>/g, '').substring(0, 100) || "N/A",
          suggested_subject_id: matchedHierarchy.subject_id,
          suggested_subject_name: matchedHierarchy.subject_name,
          suggested_topic_id: matchedHierarchy.topic_id,
          suggested_topic_name: matchedHierarchy.topic_name,
          suggested_sub_topic_id: matchedHierarchy.sub_topic_id,
          suggested_sub_topic_name: matchedHierarchy.sub_topic_name,
          confidence: adjustedConfidence,
          reasoning: reasoning,
          match_type: matchType // For debugging
        };
      });

      allSuggestions.push(...enrichedResults);
      console.log(`✅ Batch ${batchIndex + 1} done (${enrichedResults.length} suggestions)`);

      if (batchIndex < totalBatches - 1) {
        console.log(`⏳ Waiting ${BATCH_DELAY/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(`🎉 Complete! ${allSuggestions.length} suggestions`);
    res.json(allSuggestions);

  } catch (err) {
    console.error("❌ Analysis Error:", err.message);
    res.status(500).json({
      error: "Metadata analysis failed",
      detail: err.message
    });
  }
});


// =======================
// HEALTH CHECK
// =======================
app.get("/health", (req, res) => {
  res.json({ 
    status: "✅ AI API is running", 
    timestamp: new Date().toISOString(),
    models: {
      qc: "openai/gpt-oss-20b",
      metadata: "llama-3.3-70b-versatile"
    },
    endpoints: {
      qc: "POST /qc",
      metadata: "POST /analyze-metadata"
    }
  });
});

// =======================
// ERROR HANDLING
// =======================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ AI API running on http://localhost:${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   📊 QC Model: openai/gpt-oss-20b`);
  console.log(`   🤖 Metadata Model: llama-3.3-70b-versatile`);
  console.log(`   QC Endpoint: POST http://localhost:${PORT}/qc`);
  console.log(`   Metadata Analysis: POST http://localhost:${PORT}/analyze-metadata`);
});