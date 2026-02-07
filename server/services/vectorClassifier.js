import { embedOne } from "./embedding.js";
import { qdrant } from "./vectorDB.js";
import { ensureIndexed } from "./platformManager.js";

export async function classifyQuestion(question, token) {
  
  const { subjects, subtopics } = await ensureIndexed(token);

  const cleanQuestion = question.trim().replace(/\s+/g, ' ');
  
  const vector = await embedOne(cleanQuestion);

  //------------------
  // SUBJECT SEARCH
  //------------------
  const subjectResults = await qdrant.search(subjects, {
    vector,
    limit: 1,
  });

  if (!subjectResults || subjectResults.length === 0) {
    throw new Error("No subject classification found");
  }

  const subjectId = subjectResults[0].payload.subject_id;
  const subjectName = subjectResults[0].payload.name;

  //------------------
  // SUBTOPIC SEARCH (filtered by subject)
  //------------------
  const subtopicResults = await qdrant.search(subtopics, {
    vector,
    limit: 1,
    filter: {
      must: [{
        key: "subject_id",
        match: { value: subjectId },
      }],
    },
  });

  if (!subtopicResults || subtopicResults.length === 0) {
    throw new Error(`No subtopic found for subject: ${subjectName}`);
  }

  const best = subtopicResults[0];

  const confidence = Math.round(best.score * 100);

  return {
    suggested_subject_id: best.payload.subject_id,
    suggested_topic_id: best.payload.topic_id,
    suggested_sub_topic_id: best.payload.subtopic_id,
    
    suggested_subject_name: best.payload.subject_name,
    suggested_topic_name: best.payload.topic_name,
    suggested_sub_topic_name: best.payload.subtopic_name,
    
    confidence: confidence,
    
    reasoning: `Vector similarity: ${confidence}% match with ${best.payload.subtopic_name}`
  };
}