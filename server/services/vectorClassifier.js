// import { embedOne } from "./embedding.js";
// import { qdrant } from "./vectorDB.js";
// import { ensureIndexed } from "./platformManager.js";

// export async function classifyQuestion(question, token) {
  
//   const { subjects, subtopics } = await ensureIndexed(token);

//   const cleanQuestion = question.trim().replace(/\s+/g, ' ');
  
//   const vector = await embedOne(cleanQuestion);

//   //------------------
//   // SUBJECT SEARCH
//   //------------------
//   const subjectResults = await qdrant.search(subjects, {
//     vector,
//     limit: 1,
//   });

//   if (!subjectResults || subjectResults.length === 0) {
//     throw new Error("No subject classification found");
//   }

//   const subjectId = subjectResults[0].payload.subject_id;
//   const subjectName = subjectResults[0].payload.name;

//   //------------------
//   // SUBTOPIC SEARCH (filtered by subject)
//   //------------------
//   const subtopicResults = await qdrant.search(subtopics, {
//     vector,
//     limit: 1,
//     filter: {
//       must: [{
//         key: "subject_id",
//         match: { value: subjectId },
//       }],
//     },
//   });

//   if (!subtopicResults || subtopicResults.length === 0) {
//     throw new Error(`No subtopic found for subject: ${subjectName}`);
//   }

//   const best = subtopicResults[0];

//   const confidence = Math.round(best.score * 100);

//   return {
//     suggested_subject_id: best.payload.subject_id,
//     suggested_topic_id: best.payload.topic_id,
//     suggested_sub_topic_id: best.payload.subtopic_id,
    
//     suggested_subject_name: best.payload.subject_name,
//     suggested_topic_name: best.payload.topic_name,
//     suggested_sub_topic_name: best.payload.subtopic_name,
    
//     confidence: confidence,
    
//     reasoning: `Vector similarity: ${confidence}% match with ${best.payload.subtopic_name}`
//   };
// }

import { qdrant } from "./vectorDB.js";
import { embedOne } from "./embedding.js";

function tokenKey(token) {
  return "prod_v1";
}

export async function classifyQuestion(questionText, token) {
  
  const key = tokenKey(token);
  
  const collections = {
    subjects: `subjects_${key}`,
    topics: `topics_${key}`,
    subtopics: `subtopics_${key}`
  };

  try {
    console.log(`🔍 Classifying: "${questionText.substring(0, 60)}..."`);
    
    const questionVector = await embedOne(questionText);

    // ✅ STEP 1: Search ALL THREE LEVELS simultaneously
    const [subjectResults, topicResults, subtopicResults] = await Promise.all([
      qdrant.search(collections.subjects, {
        vector: questionVector,
        limit: 3,
        with_payload: true
      }),
      qdrant.search(collections.topics, {
        vector: questionVector,
        limit: 3,
        with_payload: true
      }),
      qdrant.search(collections.subtopics, {
        vector: questionVector,
        limit: 5,
        with_payload: true
      })
    ]);

    // Get top matches
    const topSubject = subjectResults[0];
    const topTopic = topicResults[0];
    const topSubtopic = subtopicResults[0];

    // Calculate scores
    const subjectScore = topSubject.score * 100;
    const topicScore = topTopic.score * 100;
    const subtopicScore = topSubtopic.score * 100;

    console.log(`   Subject: ${topSubject.payload.name} (${Math.round(subjectScore)}%)`);
    console.log(`   Topic: ${topTopic.payload.topic_name} (${Math.round(topicScore)}%)`);
    console.log(`   Subtopic: ${topSubtopic.payload.subtopic_name} (${Math.round(subtopicScore)}%)`);

    // ✅ STEP 2: Smart Selection Strategy
    let finalResult;
    let strategy;

    // Strategy 1: If subtopic score is high AND matches topic → Use subtopic
    if (subtopicScore >= 60 && topSubtopic.payload.topic_id === topTopic.payload.topic_id) {
      finalResult = topSubtopic.payload;
      strategy = "direct_subtopic_match";
      
    // Strategy 2: If topic score is high → Search subtopics within that topic
    } else if (topicScore >= 50) {
      console.log(`   🔎 Searching subtopics within topic: ${topTopic.payload.topic_name}`);
      
      const filteredSubtopics = await qdrant.search(collections.subtopics, {
        vector: questionVector,
        limit: 1,
        filter: {
          must: [
            { key: "topic_id", match: { value: topTopic.payload.topic_id } }
          ]
        },
        with_payload: true
      });

      if (filteredSubtopics.length > 0) {
        finalResult = filteredSubtopics[0].payload;
        strategy = "topic_filtered_subtopic";
      } else {
        finalResult = topSubtopic.payload;
        strategy = "fallback_subtopic";
      }
      
    // Strategy 3: If subject score is high → Search topics within subject → Then subtopics
    } else if (subjectScore >= 40) {
      console.log(`   🔎 Searching topics within subject: ${topSubject.payload.name}`);
      
      const filteredTopics = await qdrant.search(collections.topics, {
        vector: questionVector,
        limit: 1,
        filter: {
          must: [
            { key: "subject_id", match: { value: topSubject.payload.subject_id } }
          ]
        },
        with_payload: true
      });

      if (filteredTopics.length > 0) {
        const matchedTopic = filteredTopics[0];
        
        const filteredSubtopics = await qdrant.search(collections.subtopics, {
          vector: questionVector,
          limit: 1,
          filter: {
            must: [
              { key: "topic_id", match: { value: matchedTopic.payload.topic_id } }
            ]
          },
          with_payload: true
        });

        if (filteredSubtopics.length > 0) {
          finalResult = filteredSubtopics[0].payload;
          strategy = "subject_filtered_chain";
        } else {
          finalResult = topSubtopic.payload;
          strategy = "fallback_subtopic";
        }
      } else {
        finalResult = topSubtopic.payload;
        strategy = "fallback_subtopic";
      }
      
    // Strategy 4: Low confidence → Just use best subtopic match
    } else {
      finalResult = topSubtopic.payload;
      strategy = "best_overall_subtopic";
    }

    // Calculate final confidence based on strategy
    let confidence;
    if (strategy === "direct_subtopic_match") {
      confidence = Math.round(subtopicScore);
    } else if (strategy === "topic_filtered_subtopic") {
      confidence = Math.round((topicScore + subtopicScore) / 2);
    } else if (strategy === "subject_filtered_chain") {
      confidence = Math.round((subjectScore + topicScore + subtopicScore) / 3);
    } else {
      confidence = Math.round(subtopicScore);
    }

    console.log(`   ✅ Strategy: ${strategy}, Final confidence: ${confidence}%`);

    return {
      suggested_subject_id: finalResult.subject_id,
      suggested_topic_id: finalResult.topic_id,
      suggested_sub_topic_id: finalResult.subtopic_id,
      suggested_subject_name: finalResult.subject_name,
      suggested_topic_name: finalResult.topic_name,
      suggested_sub_topic_name: finalResult.subtopic_name,
      confidence: confidence,
      reasoning: `${strategy}: ${finalResult.topic_name} → ${finalResult.subtopic_name}`
    };

  } catch (err) {
    console.error("❌ Classification error:", err);
    throw err;
  }
}