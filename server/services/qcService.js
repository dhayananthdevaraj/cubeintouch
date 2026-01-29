// services/qcService.js - Quality Check Service
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Analyze a batch of MCQs for quality and correctness
 * @param {Array} mcqs - Array of MCQ objects
 * @returns {Promise<Array>} - Array of QC results
 */
export async function analyzeQCBatch(mcqs) {
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

    // Clean up response - remove markdown code blocks
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

    return parsed;

  } catch (err) {
    console.error("QC Service Error:", err.message);
    throw new Error(`QC analysis failed: ${err.message}`);
  }
}