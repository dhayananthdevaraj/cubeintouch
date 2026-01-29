// services/metadataService.js - Metadata Analysis Service
import Groq from "groq-sdk";
import dotenv from "dotenv";
import { buildHierarchyMaps, matchHierarchy } from "../utils/hierarchyMatcher.js";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const BATCH_SIZE = 5;
const BATCH_DELAY = 1000;
const MAX_RETRIES = 3;

/**
 * Analyze questions and suggest metadata in batches
 * @param {Array} questions - Questions to analyze
 * @param {Array} availableSubjects - Available subjects
 * @param {Array} availableTopics - Available topics
 * @param {Array} availableSubTopics - Available subtopics
 * @returns {Promise<Array>} - Array of metadata suggestions
 */
export async function analyzeMetadataBatch(questions, availableSubjects, availableTopics, availableSubTopics) {
  console.log(`📊 Building hierarchy maps...`);
  
  // Build hierarchical lookup maps
  const { hierarchyMap, topicSubTopicsMap, allHierarchies } = buildHierarchyMaps(
    availableSubjects,
    availableTopics,
    availableSubTopics
  );

  console.log(`📚 Hierarchy Stats:`);
  console.log(`   Total unique hierarchies: ${allHierarchies.length}`);
  console.log(`   Subjects: ${availableSubjects.length}`);
  console.log(`   Topics: ${availableTopics.length}`);
  console.log(`   SubTopics: ${availableSubTopics.length}`);

  // Create hierarchical context for AI (limit to first 50 for prompt size)
  const hierarchicalOptions = Array.from(hierarchyMap.values())
    .slice(0, 50)
    .map(h => `${h.subject_name} → ${h.topic_name} → ${h.sub_topic_name}`)
    .join("\n");

  const allSuggestions = [];
  const totalBatches = Math.ceil(questions.length / BATCH_SIZE);

  console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} questions each`);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, questions.length);
    const batchQuestions = questions.slice(start, end);

    console.log(`🔄 Batch ${batchIndex + 1}/${totalBatches} (Q ${start + 1}-${end})`);

    // Analyze this batch
    const batchResults = await analyzeBatchWithRetry(
      batchQuestions,
      hierarchicalOptions,
      batchIndex + 1
    );

    // Match AI suggestions to actual hierarchy with enhanced fuzzy matching
    const enrichedResults = batchResults.map(result => {
      const originalQuestion = batchQuestions.find(q => q.q_id === result.q_id);
      
      const matchedData = matchHierarchy(
        result,
        hierarchyMap,
        topicSubTopicsMap,
        allHierarchies  // Pass all hierarchies for fuzzy matching
      );

      return {
        q_id: result.q_id,
        question_preview: originalQuestion?.question_data?.replace(/<[^>]*>/g, '').substring(0, 100) || "N/A",
        ...matchedData
      };
    });

    allSuggestions.push(...enrichedResults);
    console.log(`✅ Batch ${batchIndex + 1} complete (${enrichedResults.length} suggestions)`);

    // Delay between batches (except for last batch)
    if (batchIndex < totalBatches - 1) {
      console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log(`🎉 Complete! ${allSuggestions.length} suggestions`);
  return allSuggestions;
}

/**
 * Analyze a single batch with retry logic
 * @param {Array} batchQuestions - Questions in this batch
 * @param {string} hierarchicalOptions - Available hierarchies as string
 * @param {number} batchNumber - Batch number for logging
 * @returns {Promise<Array>} - Parsed AI results
 */
async function analyzeBatchWithRetry(batchQuestions, hierarchicalOptions, batchNumber) {
  const prompt = `You are an expert at classifying programming and technical questions into Subject → Topic → SubTopic hierarchies.

CRITICAL INSTRUCTIONS:
1. Extract the MAIN PRIMARY technology from the question (this is MOST important)
2. Match to the closest available hierarchy
3. Your response must be ONLY a valid JSON array - no markdown, no explanations

AVAILABLE HIERARCHIES:
${hierarchicalOptions}

TECHNOLOGY DISAMBIGUATION RULES (CRITICAL):
⚠️ JavaScript ≠ Java
   - "JavaScript code" → Web Technology → JavaScript (NOT Java Programming)
   - "Java code" → Java Programming (NOT JavaScript)
   - Look for: "JavaScript", "JS", "ECMAScript" → These are JavaScript
   - Look for: "Java" (without "Script") → This is Java

⚠️ React ≠ Angular ≠ Vue
   - "React" questions → React hierarchies (NOT Angular)
   - "Angular" questions → Angular hierarchies (NOT React)
   - Even if question mentions Java/Spring Boot backend, if it asks about React frontend → Use React

⚠️ Python ≠ Java ≠ JavaScript
   - These are completely different languages
   - Never mix them up

KEYWORD EXTRACTION PRIORITY:
1. PRIMARY technology mentioned in question (React, JavaScript, Python, Java, etc.)
2. Specific framework/library (Express, Django, Spring Boot, etc.)
3. Specific concept (loops, functions, classes, etc.)

MATCHING RULES:
- If question is about "JavaScript code output" → Web Technology → JavaScript
- If question is about "React component" → React hierarchy
- If question is about "Java loops" → Java Programming → Loops
- If question mentions multiple technologies (e.g., "React + Spring Boot"), prioritize the one being TESTED
  - Example: "React application with Spring Boot API" → Focus on React if asking about React
  
NEVER match:
- JavaScript to Java hierarchies
- React to Angular hierarchies  
- Python to Java hierarchies

RESPONSE FORMAT (NOTHING ELSE):
[{"q_id":"id","subject":"exact_subject_name","topic":"exact_topic_name","sub_topic":"exact_subtopic_name","confidence":85,"reason":"PRIMARY technology: X, extracted keywords: Y, Z"}]

QUESTIONS TO ANALYZE:
${batchQuestions.map((q, i) => {
  const questionText = q.question_data?.replace(/<[^>]*>/g, '').substring(0, 150);
  return `${i + 1}. ID:${q.q_id}\nQ: ${questionText}`;
}).join('\n\n')}`;

  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      const message = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000
      });

      let responseText = message.choices[0].message.content.trim();

      // Remove markdown code blocks
      responseText = responseText
        .replace(/^```json\s*/gi, "")
        .replace(/^```\s*/gi, "")
        .replace(/```\s*$/gi, "")
        .trim();

      // Extract JSON array using regex (handles extra text before/after)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }

      const cleanJson = jsonMatch[0];
      const batchResults = JSON.parse(cleanJson);

      // Validation
      if (!Array.isArray(batchResults)) {
        throw new Error("Response is not an array");
      }

      console.log(`✅ Batch ${batchNumber} parsed successfully (${batchResults.length} results)`);
      return batchResults;

    } catch (parseError) {
      retryCount++;
      console.error(`⚠️ Batch ${batchNumber} parse error (attempt ${retryCount}/${MAX_RETRIES}):`, parseError.message);

      if (retryCount >= MAX_RETRIES) {
        console.error(`❌ Batch ${batchNumber} failed after ${MAX_RETRIES} attempts`);
        // Create fallback results for this batch
        return batchQuestions.map(q => ({
          q_id: q.q_id,
          subject: "Programming",
          topic: "General",
          sub_topic: "Basics",
          confidence: 30,
          reason: "Fallback due to parsing error"
        }));
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}