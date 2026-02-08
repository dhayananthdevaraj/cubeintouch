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

//focus1
// import { qdrant } from "./vectorDB.js";
// import { embedOne } from "./embedding.js";

// function tokenKey(token) {
//   return "prod_v1";
// }

// export async function classifyQuestion(questionText, token) {
  
//   const key = tokenKey(token);
  
//   const collections = {
//     subjects: `subjects_${key}`,
//     topics: `topics_${key}`,
//     subtopics: `subtopics_${key}`
//   };

//   try {
//     console.log(`🔍 Classifying: "${questionText.substring(0, 60)}..."`);
    
//     const questionVector = await embedOne(questionText);

//     // ✅ STEP 1: Search ALL THREE LEVELS simultaneously
//     const [subjectResults, topicResults, subtopicResults] = await Promise.all([
//       qdrant.search(collections.subjects, {
//         vector: questionVector,
//         limit: 3,
//         with_payload: true
//       }),
//       qdrant.search(collections.topics, {
//         vector: questionVector,
//         limit: 3,
//         with_payload: true
//       }),
//       qdrant.search(collections.subtopics, {
//         vector: questionVector,
//         limit: 5,
//         with_payload: true
//       })
//     ]);

//     // Get top matches
//     const topSubject = subjectResults[0];
//     const topTopic = topicResults[0];
//     const topSubtopic = subtopicResults[0];

//     // Calculate scores
//     const subjectScore = topSubject.score * 100;
//     const topicScore = topTopic.score * 100;
//     const subtopicScore = topSubtopic.score * 100;

//     console.log(`   Subject: ${topSubject.payload.name} (${Math.round(subjectScore)}%)`);
//     console.log(`   Topic: ${topTopic.payload.topic_name} (${Math.round(topicScore)}%)`);
//     console.log(`   Subtopic: ${topSubtopic.payload.subtopic_name} (${Math.round(subtopicScore)}%)`);

//     // ✅ STEP 2: Smart Selection Strategy
//     let finalResult;
//     let strategy;

//     // Strategy 1: If subtopic score is high AND matches topic → Use subtopic
//     if (subtopicScore >= 60 && topSubtopic.payload.topic_id === topTopic.payload.topic_id) {
//       finalResult = topSubtopic.payload;
//       strategy = "direct_subtopic_match";
      
//     // Strategy 2: If topic score is high → Search subtopics within that topic
//     } else if (topicScore >= 50) {
//       console.log(`   🔎 Searching subtopics within topic: ${topTopic.payload.topic_name}`);
      
//       const filteredSubtopics = await qdrant.search(collections.subtopics, {
//         vector: questionVector,
//         limit: 1,
//         filter: {
//           must: [
//             { key: "topic_id", match: { value: topTopic.payload.topic_id } }
//           ]
//         },
//         with_payload: true
//       });

//       if (filteredSubtopics.length > 0) {
//         finalResult = filteredSubtopics[0].payload;
//         strategy = "topic_filtered_subtopic";
//       } else {
//         finalResult = topSubtopic.payload;
//         strategy = "fallback_subtopic";
//       }
      
//     // Strategy 3: If subject score is high → Search topics within subject → Then subtopics
//     } else if (subjectScore >= 40) {
//       console.log(`   🔎 Searching topics within subject: ${topSubject.payload.name}`);
      
//       const filteredTopics = await qdrant.search(collections.topics, {
//         vector: questionVector,
//         limit: 1,
//         filter: {
//           must: [
//             { key: "subject_id", match: { value: topSubject.payload.subject_id } }
//           ]
//         },
//         with_payload: true
//       });

//       if (filteredTopics.length > 0) {
//         const matchedTopic = filteredTopics[0];
        
//         const filteredSubtopics = await qdrant.search(collections.subtopics, {
//           vector: questionVector,
//           limit: 1,
//           filter: {
//             must: [
//               { key: "topic_id", match: { value: matchedTopic.payload.topic_id } }
//             ]
//           },
//           with_payload: true
//         });

//         if (filteredSubtopics.length > 0) {
//           finalResult = filteredSubtopics[0].payload;
//           strategy = "subject_filtered_chain";
//         } else {
//           finalResult = topSubtopic.payload;
//           strategy = "fallback_subtopic";
//         }
//       } else {
//         finalResult = topSubtopic.payload;
//         strategy = "fallback_subtopic";
//       }
      
//     // Strategy 4: Low confidence → Just use best subtopic match
//     } else {
//       finalResult = topSubtopic.payload;
//       strategy = "best_overall_subtopic";
//     }

//     // Calculate final confidence based on strategy
//     let confidence;
//     if (strategy === "direct_subtopic_match") {
//       confidence = Math.round(subtopicScore);
//     } else if (strategy === "topic_filtered_subtopic") {
//       confidence = Math.round((topicScore + subtopicScore) / 2);
//     } else if (strategy === "subject_filtered_chain") {
//       confidence = Math.round((subjectScore + topicScore + subtopicScore) / 3);
//     } else {
//       confidence = Math.round(subtopicScore);
//     }

//     console.log(`   ✅ Strategy: ${strategy}, Final confidence: ${confidence}%`);

//     return {
//       suggested_subject_id: finalResult.subject_id,
//       suggested_topic_id: finalResult.topic_id,
//       suggested_sub_topic_id: finalResult.subtopic_id,
//       suggested_subject_name: finalResult.subject_name,
//       suggested_topic_name: finalResult.topic_name,
//       suggested_sub_topic_name: finalResult.subtopic_name,
//       confidence: confidence,
//       reasoning: `${strategy}: ${finalResult.topic_name} → ${finalResult.subtopic_name}`
//     };

//   } catch (err) {
//     console.error("❌ Classification error:", err);
//     throw err;
//   }
// }


//focus2

import { qdrant } from "./vectorDB.js";
import { embedOne } from "./embedding.js";

function tokenKey(token) {
  return "prod_v1";
}

// ✅ COMPREHENSIVE TECHNOLOGY DETECTION (Auto-expands)
function detectTechnologies(questionText) {
  const text = questionText.toLowerCase();
  const detectedTechs = [];
  
  const patterns = {
    // Programming Languages
    'javascript': /\b(javascript|js\b|console\.log|let |const |var |=>|function\(|\.js\b)\b/i,
    'typescript': /\b(typescript|ts\b|interface |type |\.ts\b)\b/i,
    'java': /\b(public class|public static|System\.out|import java\.|\.java\b)\b/i,
    'python': /\b(def |import |print\(|if __name__|\.py\b|python)\b/i,
    'csharp': /\b(using System|namespace |Console\.WriteLine|\.cs\b|c#)\b/i,
    'php': /\b(<\?php|echo |\.php\b)\b/i,
    'ruby': /\b(def |end\b|\.rb\b|ruby)\b/i,
    'go': /\b(package main|func |import |golang|\.go\b)\b/i,
    'rust': /\b(fn |let mut|cargo|\.rs\b)\b/i,
    'kotlin': /\b(fun |val |var |\.kt\b|kotlin)\b/i,
    'swift': /\b(func |let |var |\.swift\b)\b/i,
    
    // Frontend Frameworks
    'react': /\b(useState|useEffect|jsx|import.*react|props|component|reactjs)\b/i,
    'angular': /\b(angular|@Component|@Injectable|ng\b|ngOnInit|\.component\.ts)\b/i,
    'vue': /\b(vue\.js|v-if|v-for|<template>|vuejs)\b/i,
    'svelte': /\b(svelte|<script>|\.svelte)\b/i,
    
    // Backend Frameworks
    'nodejs': /\b(require\(|module\.exports|npm|node\.js|process\.env|fs\.create|express\.)\b/i,
    'express': /\b(app\.get|app\.post|express\(\)|middleware)\b/i,
    'nestjs': /\b(@Module|@Controller|@Injectable|nestjs)\b/i,
    'django': /\b(django|from django|models\.Model|\.py\b.*django)\b/i,
    'flask': /\b(from flask|@app\.route|flask\.)\b/i,
    'springboot': /\b(@SpringBootApplication|@RestController|@Autowired|application\.properties)\b/i,
    'spring': /\b(@Component|@Service|@Repository|springframework)\b/i,
    
    // Databases
    'mysql': /\b(mysql|SHOW TABLES|mysqldump|MyISAM)\b/i,
    'postgresql': /\b(postgres|psql|pg_dump)\b/i,
    'mongodb': /\b(mongodb|mongoose|db\.collection|findOne)\b/i,
    'redis': /\b(redis|HSET|LPUSH|redis-cli)\b/i,
    'sql': /\b(SELECT |INSERT |UPDATE |DELETE |FROM |WHERE |JOIN |CREATE TABLE)\b/i,
    
    // ORM/Database Tools
    'hibernate': /\b(@Entity|@Table|@Column|@Id|SessionFactory|hibernate)\b/i,
    'jpa': /\b(EntityManager|@PersistenceContext|JPA)\b/i,
    'sequelize': /\b(sequelize\.define|findAll|findOne)\b/i,
    
    // Web Technologies
    'html': /\b(<html|<div|<table|<input|<body|<head|<tr>|<td>|<p>|<span>)\b/i,
    'css': /\b(margin:|padding:|color:|display:|flex|grid|\.css\b|stylesheet)\b/i,
    'sass': /\b(\.scss|\.sass|@mixin|@include)\b/i,
    'bootstrap': /\b(bootstrap|container|row|col-md)\b/i,
    'tailwind': /\b(tailwind|@apply|prose)\b/i,
    
    // HTTP/API
    'axios': /\b(axios\.get|axios\.post|axios\(|baseURL)\b/i,
    'fetch': /\b(fetch\(|\.then\(|\.json\(\))\b/i,
    'rest': /\b(REST API|RESTful|@GetMapping|@PostMapping)\b/i,
    'graphql': /\b(graphql|query |mutation |type Query)\b/i,
    
    // Cloud/DevOps
    'docker': /\b(docker|dockerfile|docker-compose|container)\b/i,
    'kubernetes': /\b(kubectl|k8s|pod|deployment\.yaml)\b/i,
    'aws': /\b(aws|s3|ec2|lambda|dynamodb)\b/i,
    'azure': /\b(azure|az\b|blob storage)\b/i,
    'gcp': /\b(google cloud|gcp|firebase)\b/i,
    
    // Build Tools
    'webpack': /\b(webpack|webpack\.config)\b/i,
    'vite': /\b(vite|vite\.config)\b/i,
    'maven': /\b(pom\.xml|mvn |<dependency>)\b/i,
    'gradle': /\b(build\.gradle|gradlew)\b/i,
    'npm': /\b(npm install|package\.json|npm run)\b/i,
    'yarn': /\b(yarn add|yarn\.lock)\b/i,
    
    // Testing
    'jest': /\b(jest|describe\(|it\(|expect\()\b/i,
    'junit': /\b(@Test|assertEquals|JUnit)\b/i,
    'selenium': /\b(selenium|webdriver|driver\.get)\b/i,
    
    // Version Control
    'git': /\b(git commit|git push|git pull|git clone|git branch)\b/i,
    
    // Big Data
    'spark': /\b(spark|rdd|dataframe|pyspark)\b/i,
    'hadoop': /\b(hadoop|mapreduce|hdfs)\b/i,
    'kafka': /\b(kafka|producer|consumer|topic)\b/i,
    
    // .NET
    'dotnet': /\b(using System|namespace |ASP\.NET|\.NET Core|IActionResult)\b/i,
    'aspnet': /\b(ASP\.NET|Startup\.cs|appsettings\.json)\b/i,
  };
  
  for (const [tech, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      detectedTechs.push(tech);
    }
  }
  
  if (detectedTechs.length > 0) {
    console.log(`   🔍 Detected technologies: ${detectedTechs.join(', ')}`);
  }
  
  return detectedTechs;
}

// ✅ DYNAMIC KEYWORD GENERATION (Maps tech to potential subject keywords)
function generateSubjectKeywords(tech) {
  const baseKeywords = [tech];
  
  // Add common variations and related terms
  const expansions = {
    'javascript': ['js', 'javascript', 'ecmascript', 'programming'],
    'typescript': ['ts', 'typescript', 'javascript'],
    'nodejs': ['node', 'node.js', 'javascript', 'backend'],
    'react': ['react', 'reactjs', 'javascript', 'frontend'],
    'angular': ['angular', 'angularjs', 'typescript', 'frontend'],
    'vue': ['vue', 'vuejs', 'javascript', 'frontend'],
    'java': ['java', 'programming'],
    'python': ['python', 'programming'],
    'csharp': ['c#', 'csharp', 'dotnet', '.net'],
    'springboot': ['spring', 'springboot', 'java'],
    'spring': ['spring', 'java'],
    'hibernate': ['hibernate', 'orm', 'java'],
    'mysql': ['mysql', 'sql', 'database'],
    'sql': ['sql', 'database'],
    'html': ['html', 'web', 'markup'],
    'css': ['css', 'styling', 'web'],
    'git': ['git', 'github', 'version'],
    'docker': ['docker', 'container', 'devops'],
    'aws': ['aws', 'cloud'],
    'dotnet': ['dotnet', '.net', 'asp.net', 'c#'],
    'aspnet': ['asp.net', '.net', 'dotnet'],
  };
  
  return expansions[tech] || baseKeywords;
}

// ✅ FLEXIBLE MATCHING (handles variations)
function matchesTechnology(name, allTechKeywords) {
  if (!name || !allTechKeywords || allTechKeywords.length === 0) return false;
  
  const nameLower = name.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove special chars
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();
  
  return allTechKeywords.some(keyword => {
    const keywordLower = keyword.toLowerCase();
    
    // Exact match
    if (nameLower === keywordLower) return true;
    
    // Word boundary match (e.g., "Java" matches "Java Full Stack")
    if (new RegExp(`\\b${keywordLower}\\b`, 'i').test(nameLower)) return true;
    
    // Partial match for compound words (e.g., "springboot" matches "Spring Boot")
    if (nameLower.replace(/\s+/g, '') === keywordLower.replace(/\s+/g, '')) return true;
    
    return false;
  });
}

export async function classifyQuestion(questionText, token) {
  
  const key = tokenKey(token);
  
  const collections = {
    subjects: `subjects_${key}`,
    topics: `topics_${key}`,
    subtopics: `subtopics_${key}`
  };

  try {
    console.log(`🔍 Classifying: "${questionText.substring(0, 80)}..."`);
    
    // ✅ DETECT ALL TECHNOLOGIES
    const detectedTechs = detectTechnologies(questionText);
    
    // ✅ GENERATE ALL POSSIBLE KEYWORDS
    const allKeywords = [];
    detectedTechs.forEach(tech => {
      const keywords = generateSubjectKeywords(tech);
      allKeywords.push(...keywords);
    });
    
    // Remove duplicates
    const uniqueKeywords = [...new Set(allKeywords)];
    
    const questionVector = await embedOne(questionText);

    // ✅ SEARCH ALL THREE LEVELS
    const [subjectResults, topicResults, subtopicResults] = await Promise.all([
      qdrant.search(collections.subjects, {
        vector: questionVector,
        limit: 8,
        with_payload: true
      }),
      qdrant.search(collections.topics, {
        vector: questionVector,
        limit: 10,
        with_payload: true
      }),
      qdrant.search(collections.subtopics, {
        vector: questionVector,
        limit: 15,
        with_payload: true
      })
    ]);

    // ✅ BOOST MATCHING RESULTS
    if (uniqueKeywords.length > 0) {
      console.log(`   🎯 Matching against keywords: ${uniqueKeywords.slice(0, 5).join(', ')}${uniqueKeywords.length > 5 ? '...' : ''}`);
      
      let boostedCount = 0;
      
      // Boost subjects
      subjectResults.forEach(result => {
        if (matchesTechnology(result.payload.name, uniqueKeywords)) {
          const oldScore = result.score;
          result.score = Math.min(1.0, result.score * 2.0);  // 100% boost
          console.log(`   ✨ Boosted subject "${result.payload.name}": ${(oldScore*100).toFixed(0)}% → ${(result.score*100).toFixed(0)}%`);
          boostedCount++;
        }
      });
      
      // Boost topics
      topicResults.forEach(result => {
        const topicMatch = matchesTechnology(result.payload.topic_name, uniqueKeywords);
        const subjectMatch = matchesTechnology(result.payload.subject_name, uniqueKeywords);
        
        if (topicMatch || subjectMatch) {
          const oldScore = result.score;
          result.score = Math.min(1.0, result.score * 2.0);
          console.log(`   ✨ Boosted topic "${result.payload.topic_name}": ${(oldScore*100).toFixed(0)}% → ${(result.score*100).toFixed(0)}%`);
          boostedCount++;
        }
      });
      
      // Boost subtopics
      subtopicResults.forEach(result => {
        const topicMatch = matchesTechnology(result.payload.topic_name, uniqueKeywords);
        const subjectMatch = matchesTechnology(result.payload.subject_name, uniqueKeywords);
        
        if (topicMatch || subjectMatch) {
          const oldScore = result.score;
          result.score = Math.min(1.0, result.score * 2.0);
          boostedCount++;
        }
      });
      
      console.log(`   📈 Total boosted: ${boostedCount} items`);
      
      // Re-sort
      subjectResults.sort((a, b) => b.score - a.score);
      topicResults.sort((a, b) => b.score - a.score);
      subtopicResults.sort((a, b) => b.score - a.score);
    }

    // ✅ Get top matches
    const topSubject = subjectResults[0];
    const topTopic = topicResults[0];
    const topSubtopic = subtopicResults[0];

    const subjectScore = topSubject.score * 100;
    const topicScore = topTopic.score * 100;
    const subtopicScore = topSubtopic.score * 100;

    console.log(`   📊 Top matches:`);
    console.log(`      Subject: ${topSubject.payload.name} (${Math.round(subjectScore)}%)`);
    console.log(`      Topic: ${topTopic.payload.topic_name} (${Math.round(topicScore)}%)`);
    console.log(`      Subtopic: ${topSubtopic.payload.subtopic_name} (${Math.round(subtopicScore)}%)`);

    // ✅ SMART SELECTION STRATEGY
    let finalResult;
    let strategy;

    if (subtopicScore >= 60 && topSubtopic.payload.topic_id === topTopic.payload.topic_id) {
      finalResult = topSubtopic.payload;
      strategy = "direct_match";
      
    } else if (topicScore >= 50) {
      const filteredSubtopics = await qdrant.search(collections.subtopics, {
        vector: questionVector,
        limit: 1,
        filter: {
          must: [{ key: "topic_id", match: { value: topTopic.payload.topic_id } }]
        },
        with_payload: true
      });

      finalResult = filteredSubtopics.length > 0 ? filteredSubtopics[0].payload : topSubtopic.payload;
      strategy = "topic_filtered";
      
    } else if (subjectScore >= 40) {
      const filteredTopics = await qdrant.search(collections.topics, {
        vector: questionVector,
        limit: 1,
        filter: {
          must: [{ key: "subject_id", match: { value: topSubject.payload.subject_id } }]
        },
        with_payload: true
      });

      if (filteredTopics.length > 0) {
        const filteredSubtopics = await qdrant.search(collections.subtopics, {
          vector: questionVector,
          limit: 1,
          filter: {
            must: [{ key: "topic_id", match: { value: filteredTopics[0].payload.topic_id } }]
          },
          with_payload: true
        });

        finalResult = filteredSubtopics.length > 0 ? filteredSubtopics[0].payload : topSubtopic.payload;
        strategy = "subject_chain";
      } else {
        finalResult = topSubtopic.payload;
        strategy = "fallback";
      }
      
    } else {
      finalResult = topSubtopic.payload;
      strategy = "best_match";
    }

    // ✅ CALCULATE CONFIDENCE
    let confidence;
    if (strategy === "direct_match") {
      confidence = Math.round(subtopicScore);
    } else if (strategy === "topic_filtered") {
      confidence = Math.round((topicScore + subtopicScore) / 2);
    } else if (strategy === "subject_chain") {
      confidence = Math.round((subjectScore + topicScore + subtopicScore) / 3);
    } else {
      confidence = Math.round(subtopicScore);
    }

    // ✅ TECHNOLOGY MATCH BONUS
    if (uniqueKeywords.length > 0) {
      const matches = matchesTechnology(finalResult.topic_name, uniqueKeywords) ||
                     matchesTechnology(finalResult.subject_name, uniqueKeywords);
      
      if (matches) {
        confidence = Math.min(100, confidence + 20);
        console.log(`   🎯 Tech match bonus: +20% → ${confidence}%`);
      }
    }

    console.log(`   ✅ ${strategy} → ${finalResult.subject_name} / ${finalResult.topic_name} / ${finalResult.subtopic_name} (${confidence}%)`);

    return {
      suggested_subject_id: finalResult.subject_id,
      suggested_topic_id: finalResult.topic_id,
      suggested_sub_topic_id: finalResult.subtopic_id,
      suggested_subject_name: finalResult.subject_name,
      suggested_topic_name: finalResult.topic_name,
      suggested_sub_topic_name: finalResult.subtopic_name,
      confidence: confidence,
      reasoning: `${detectedTechs.length > 0 ? detectedTechs.slice(0, 2).join('+') + ' → ' : ''}${finalResult.topic_name} → ${finalResult.subtopic_name}`
    };

  } catch (err) {
    console.error("❌ Classification error:", err);
    throw err;
  }
}