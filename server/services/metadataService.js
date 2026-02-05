// // services/metadataService.js - Metadata Analysis Service
// import Groq from "groq-sdk";
// import dotenv from "dotenv";
// import { buildHierarchyMaps, matchHierarchy } from "../utils/hierarchyMatcher.js";

// dotenv.config();

// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// const BATCH_SIZE = 5;
// const BATCH_DELAY = 1000;
// const MAX_RETRIES = 3;

// /**
//  * Analyze questions and suggest metadata in batches
//  * @param {Array} questions - Questions to analyze
//  * @param {Array} availableSubjects - Available subjects
//  * @param {Array} availableTopics - Available topics
//  * @param {Array} availableSubTopics - Available subtopics
//  * @returns {Promise<Array>} - Array of metadata suggestions
//  */
// export async function analyzeMetadataBatch(questions, availableSubjects, availableTopics, availableSubTopics) {
//   console.log(`📊 Building hierarchy maps...`);
  
//   // Build hierarchical lookup maps
//   const { hierarchyMap, topicSubTopicsMap, allHierarchies } = buildHierarchyMaps(
//     availableSubjects,
//     availableTopics,
//     availableSubTopics
//   );

//   console.log(`📚 Hierarchy Stats:`);
//   console.log(`   Total unique hierarchies: ${allHierarchies.length}`);
//   console.log(`   Subjects: ${availableSubjects.length}`);
//   console.log(`   Topics: ${availableTopics.length}`);
//   console.log(`   SubTopics: ${availableSubTopics.length}`);

//   // Create hierarchical context for AI (limit to first 50 for prompt size)
//   const hierarchicalOptions = Array.from(hierarchyMap.values())
//     .slice(0, 50)
//     .map(h => `${h.subject_name} → ${h.topic_name} → ${h.sub_topic_name}`)
//     .join("\n");

//   const allSuggestions = [];
//   const totalBatches = Math.ceil(questions.length / BATCH_SIZE);

//   console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} questions each`);

//   for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
//     const start = batchIndex * BATCH_SIZE;
//     const end = Math.min(start + BATCH_SIZE, questions.length);
//     const batchQuestions = questions.slice(start, end);

//     console.log(`🔄 Batch ${batchIndex + 1}/${totalBatches} (Q ${start + 1}-${end})`);

//     // Analyze this batch
//     const batchResults = await analyzeBatchWithRetry(
//       batchQuestions,
//       hierarchicalOptions,
//       batchIndex + 1
//     );

//     // Match AI suggestions to actual hierarchy with enhanced fuzzy matching
//     const enrichedResults = batchResults.map(result => {
//       const originalQuestion = batchQuestions.find(q => q.q_id === result.q_id);
      
//       const matchedData = matchHierarchy(
//         result,
//         hierarchyMap,
//         topicSubTopicsMap,
//         allHierarchies  // Pass all hierarchies for fuzzy matching
//       );

//       return {
//         q_id: result.q_id,
//         question_preview: originalQuestion?.question_data?.replace(/<[^>]*>/g, '').substring(0, 100) || "N/A",
//         ...matchedData
//       };
//     });

//     allSuggestions.push(...enrichedResults);
//     console.log(`✅ Batch ${batchIndex + 1} complete (${enrichedResults.length} suggestions)`);

//     // Delay between batches (except for last batch)
//     if (batchIndex < totalBatches - 1) {
//       console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s...`);
//       await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
//     }
//   }

//   console.log(`🎉 Complete! ${allSuggestions.length} suggestions`);
//   return allSuggestions;
// }

// /**
//  * Analyze a single batch with retry logic
//  * @param {Array} batchQuestions - Questions in this batch
//  * @param {string} hierarchicalOptions - Available hierarchies as string
//  * @param {number} batchNumber - Batch number for logging
//  * @returns {Promise<Array>} - Parsed AI results
//  */
// async function analyzeBatchWithRetry(batchQuestions, hierarchicalOptions, batchNumber) {
//   const prompt = `You are an expert at classifying programming and technical questions into Subject → Topic → SubTopic hierarchies.

// CRITICAL INSTRUCTIONS:
// 1. Extract the MAIN PRIMARY technology from the question (this is MOST important)
// 2. Match to the closest available hierarchy
// 3. Your response must be ONLY a valid JSON array - no markdown, no explanations

// AVAILABLE HIERARCHIES:
// ${hierarchicalOptions}

// TECHNOLOGY DISAMBIGUATION RULES (CRITICAL):
// ⚠️ JavaScript ≠ Java
//    - "JavaScript code" → Web Technology → JavaScript (NOT Java Programming)
//    - "Java code" → Java Programming (NOT JavaScript)
//    - Look for: "JavaScript", "JS", "ECMAScript" → These are JavaScript
//    - Look for: "Java" (without "Script") → This is Java

// ⚠️ React ≠ Angular ≠ Vue
//    - "React" questions → React hierarchies (NOT Angular)
//    - "Angular" questions → Angular hierarchies (NOT React)
//    - Even if question mentions Java/Spring Boot backend, if it asks about React frontend → Use React

// ⚠️ Python ≠ Java ≠ JavaScript
//    - These are completely different languages
//    - Never mix them up

// KEYWORD EXTRACTION PRIORITY:
// 1. PRIMARY technology mentioned in question (React, JavaScript, Python, Java, etc.)
// 2. Specific framework/library (Express, Django, Spring Boot, etc.)
// 3. Specific concept (loops, functions, classes, etc.)

// MATCHING RULES:
// - If question is about "JavaScript code output" → Web Technology → JavaScript
// - If question is about "React component" → React hierarchy
// - If question is about "Java loops" → Java Programming → Loops
// - If question mentions multiple technologies (e.g., "React + Spring Boot"), prioritize the one being TESTED
//   - Example: "React application with Spring Boot API" → Focus on React if asking about React
  
// NEVER match:
// - JavaScript to Java hierarchies
// - React to Angular hierarchies  
// - Python to Java hierarchies

// RESPONSE FORMAT (NOTHING ELSE):
// [{"q_id":"id","subject":"exact_subject_name","topic":"exact_topic_name","sub_topic":"exact_subtopic_name","confidence":85,"reason":"PRIMARY technology: X, extracted keywords: Y, Z"}]

// QUESTIONS TO ANALYZE:
// ${batchQuestions.map((q, i) => {
//   const questionText = q.question_data?.replace(/<[^>]*>/g, '').substring(0, 150);
//   return `${i + 1}. ID:${q.q_id}\nQ: ${questionText}`;
// }).join('\n\n')}`;

//   let retryCount = 0;

//   while (retryCount < MAX_RETRIES) {
//     try {
//       const message = await groq.chat.completions.create({
//         model: "llama-3.3-70b-versatile",
//         messages: [{ role: "user", content: prompt }],
//         temperature: 0.2,
//         max_tokens: 2000
//       });

//       let responseText = message.choices[0].message.content.trim();

//       // Remove markdown code blocks
//       responseText = responseText
//         .replace(/^```json\s*/gi, "")
//         .replace(/^```\s*/gi, "")
//         .replace(/```\s*$/gi, "")
//         .trim();

//       // Extract JSON array using regex (handles extra text before/after)
//       const jsonMatch = responseText.match(/\[[\s\S]*\]/);
//       if (!jsonMatch) {
//         throw new Error("No JSON array found in response");
//       }

//       const cleanJson = jsonMatch[0];
//       const batchResults = JSON.parse(cleanJson);

//       // Validation
//       if (!Array.isArray(batchResults)) {
//         throw new Error("Response is not an array");
//       }

//       console.log(`✅ Batch ${batchNumber} parsed successfully (${batchResults.length} results)`);
//       return batchResults;

//     } catch (parseError) {
//       retryCount++;
//       console.error(`⚠️ Batch ${batchNumber} parse error (attempt ${retryCount}/${MAX_RETRIES}):`, parseError.message);

//       if (retryCount >= MAX_RETRIES) {
//         console.error(`❌ Batch ${batchNumber} failed after ${MAX_RETRIES} attempts`);
//         // Create fallback results for this batch
//         return batchQuestions.map(q => ({
//           q_id: q.q_id,
//           subject: "Programming",
//           topic: "General",
//           sub_topic: "Basics",
//           confidence: 30,
//           reason: "Fallback due to parsing error"
//         }));
//       }

//       // Wait before retry
//       await new Promise(resolve => setTimeout(resolve, 2000));
//     }
//   }
// }

// // services/metadataService.js - Metadata Analysis Service (UPDATED)
// import Groq from "groq-sdk";
// import dotenv from "dotenv";
// import { buildHierarchyMaps, matchHierarchy } from "../utils/intelligentHierarchyMatcher.js"; // ← CHANGED THIS LINE

// dotenv.config();

// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// const BATCH_SIZE = 5;
// const BATCH_DELAY = 1000;
// const MAX_RETRIES = 3;

// /**
//  * Analyze questions and suggest metadata in batches
//  * @param {Array} questions - Questions to analyze
//  * @param {Array} availableSubjects - Available subjects
//  * @param {Array} availableTopics - Available topics
//  * @param {Array} availableSubTopics - Available subtopics
//  * @returns {Promise<Array>} - Array of metadata suggestions
//  */
// export async function analyzeMetadataBatch(questions, availableSubjects, availableTopics, availableSubTopics) {
//   console.log(`📊 Building hierarchy maps...`);
  
//   // Build hierarchical lookup maps with intelligent conflict detection
//   const { hierarchyMap, topicSubTopicsMap, allHierarchies, conflictMap } = buildHierarchyMaps(
//     availableSubjects,
//     availableTopics,
//     availableSubTopics
//   );

//   console.log(`📚 Hierarchy Stats:`);
//   console.log(`   Total unique hierarchies: ${allHierarchies.length}`);
//   console.log(`   Subjects: ${availableSubjects.length}`);
//   console.log(`   Topics: ${availableTopics.length}`);
//   console.log(`   SubTopics: ${availableSubTopics.length}`);
//   console.log(`   Potential conflicts detected: ${conflictMap.size}`);

//   // Create hierarchical context for AI (limit to first 50 for prompt size)
//   const hierarchicalOptions = Array.from(hierarchyMap.values())
//     .slice(0, 50)
//     .map(h => `${h.subject_name} → ${h.topic_name} → ${h.sub_topic_name}`)
//     .join("\n");

//   const allSuggestions = [];
//   const totalBatches = Math.ceil(questions.length / BATCH_SIZE);

//   console.log(`📦 Processing in ${totalBatches} batches of ${BATCH_SIZE} questions each`);

//   for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
//     const start = batchIndex * BATCH_SIZE;
//     const end = Math.min(start + BATCH_SIZE, questions.length);
//     const batchQuestions = questions.slice(start, end);

//     console.log(`🔄 Batch ${batchIndex + 1}/${totalBatches} (Q ${start + 1}-${end})`);

//     // Analyze this batch
//     const batchResults = await analyzeBatchWithRetry(
//       batchQuestions,
//       hierarchicalOptions,
//       batchIndex + 1
//     );

//     // Match AI suggestions to actual hierarchy with intelligent fuzzy matching
//     const enrichedResults = batchResults.map(result => {
//       const originalQuestion = batchQuestions.find(q => q.q_id === result.q_id);
//       const questionText = originalQuestion?.question_data?.replace(/<[^>]*>/g, '') || "";
      
//       const matchedData = matchHierarchy(
//         result,
//         hierarchyMap,
//         topicSubTopicsMap,
//         allHierarchies,
//         conflictMap,
//         questionText // Pass question context for intelligent disambiguation
//       );

//       return {
//         q_id: result.q_id,
//         question_preview: questionText.substring(0, 100) || "N/A",
//         ...matchedData
//       };
//     });

//     allSuggestions.push(...enrichedResults);
//     console.log(`✅ Batch ${batchIndex + 1} complete (${enrichedResults.length} suggestions)`);

//     // Delay between batches (except for last batch)
//     if (batchIndex < totalBatches - 1) {
//       console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s...`);
//       await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
//     }
//   }

//   console.log(`🎉 Complete! ${allSuggestions.length} suggestions`);
//   return allSuggestions;
// }

// /**
//  * Analyze a single batch with retry logic
//  * @param {Array} batchQuestions - Questions in this batch
//  * @param {string} hierarchicalOptions - Available hierarchies as string
//  * @param {number} batchNumber - Batch number for logging
//  * @returns {Promise<Array>} - Parsed AI results
//  */
// async function analyzeBatchWithRetry(batchQuestions, hierarchicalOptions, batchNumber) {
//   const prompt = `You are an expert at classifying programming and technical questions into Subject → Topic → SubTopic hierarchies.

// CRITICAL INSTRUCTIONS:
// 1. Extract the MAIN PRIMARY technology from the question (this is MOST important)
// 2. Match to the closest available hierarchy
// 3. Your response must be ONLY a valid JSON array - no markdown, no explanations

// AVAILABLE HIERARCHIES:
// ${hierarchicalOptions}

// TECHNOLOGY DISAMBIGUATION RULES (CRITICAL):
// ⚠️ JavaScript ≠ Java
//    - "JavaScript code" → Web Technology → JavaScript (NOT Java Programming)
//    - "Java code" → Java Programming (NOT JavaScript)
//    - Look for: "JavaScript", "JS", "ECMAScript" → These are JavaScript
//    - Look for: "Java" (without "Script") → This is Java

// ⚠️ React ≠ Angular ≠ Vue
//    - "React" questions → React hierarchies (NOT Angular)
//    - "Angular" questions → Angular hierarchies (NOT React)
//    - Even if question mentions Java/Spring Boot backend, if it asks about React frontend → Use React

// ⚠️ Python ≠ Java ≠ JavaScript
//    - These are completely different languages
//    - Never mix them up

// KEYWORD EXTRACTION PRIORITY:
// 1. PRIMARY technology mentioned in question (React, JavaScript, Python, Java, etc.)
// 2. Specific framework/library (Express, Django, Spring Boot, etc.)
// 3. Specific concept (loops, functions, classes, etc.)

// MATCHING RULES:
// - If question is about "JavaScript code output" → Web Technology → JavaScript
// - If question is about "React component" → React hierarchy
// - If question is about "Java loops" → Java Programming → Loops
// - If question mentions multiple technologies (e.g., "React + Spring Boot"), prioritize the one being TESTED
//   - Example: "React application with Spring Boot API" → Focus on React if asking about React
  
// NEVER match:
// - JavaScript to Java hierarchies
// - React to Angular hierarchies  
// - Python to Java hierarchies

// RESPONSE FORMAT (NOTHING ELSE):
// [{"q_id":"id","subject":"exact_subject_name","topic":"exact_topic_name","sub_topic":"exact_subtopic_name","confidence":85,"reason":"PRIMARY technology: X, extracted keywords: Y, Z"}]

// QUESTIONS TO ANALYZE:
// ${batchQuestions.map((q, i) => {
//   const questionText = q.question_data?.replace(/<[^>]*>/g, '').substring(0, 150);
//   return `${i + 1}. ID:${q.q_id}\nQ: ${questionText}`;
// }).join('\n\n')}`;

//   let retryCount = 0;

//   while (retryCount < MAX_RETRIES) {
//     try {
//       const message = await groq.chat.completions.create({
//         model: "llama-3.3-70b-versatile",
//         messages: [{ role: "user", content: prompt }],
//         temperature: 0.2,
//         max_tokens: 2000
//       });

//       let responseText = message.choices[0].message.content.trim();

//       // Remove markdown code blocks
//       responseText = responseText
//         .replace(/^```json\s*/gi, "")
//         .replace(/^```\s*/gi, "")
//         .replace(/```\s*$/gi, "")
//         .trim();

//       // Extract JSON array using regex (handles extra text before/after)
//       const jsonMatch = responseText.match(/\[[\s\S]*\]/);
//       if (!jsonMatch) {
//         throw new Error("No JSON array found in response");
//       }

//       const cleanJson = jsonMatch[0];
//       const batchResults = JSON.parse(cleanJson);

//       // Validation
//       if (!Array.isArray(batchResults)) {
//         throw new Error("Response is not an array");
//       }

//       console.log(`✅ Batch ${batchNumber} parsed successfully (${batchResults.length} results)`);
//       return batchResults;

//     } catch (parseError) {
//       retryCount++;
//       console.error(`⚠️ Batch ${batchNumber} parse error (attempt ${retryCount}/${MAX_RETRIES}):`, parseError.message);

//       if (retryCount >= MAX_RETRIES) {
//         console.error(`❌ Batch ${batchNumber} failed after ${MAX_RETRIES} attempts`);
//         // Create fallback results for this batch
//         return batchQuestions.map(q => ({
//           q_id: q.q_id,
//           subject: "Programming",
//           topic: "General",
//           sub_topic: "Basics",
//           confidence: 30,
//           reason: "Fallback due to parsing error"
//         }));
//       }

//       // Wait before retry
//       await new Promise(resolve => setTimeout(resolve, 2000));
//     }
//   }
// }

// services/metadataService.js - DYNAMIC ULTIMATE VERSION
// Automatically adapts to ALL subjects in platform data
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const BATCH_SIZE = 5;
const BATCH_DELAY = 1000;
const MAX_RETRIES = 3;

/**
 * DYNAMIC KEYWORD EXTRACTION FROM PLATFORM DATA
 * Automatically builds keyword dictionary from all subjects/topics
 */
function buildDynamicKeywordMap(platformData) {
  const keywordMap = {
    subjects: new Map(),
    topics: new Map(),
    technologies: new Map()
  };
  
  console.log('🔧 Building dynamic keyword map from platform data...');
  
  platformData.forEach(item => {
    const subjectName = item.topic.subject.name.toLowerCase();
    const topicName = item.topic.name.toLowerCase();
    const subTopicName = item.name.toLowerCase();
    
    // Extract subject keywords
    const subjectWords = extractKeywords(subjectName);
    if (!keywordMap.subjects.has(subjectName)) {
      keywordMap.subjects.set(subjectName, {
        id: item.topic.subject.subject_id,
        name: item.topic.subject.name,
        keywords: new Set(subjectWords),
        topics: new Set()
      });
    }
    keywordMap.subjects.get(subjectName).topics.add(topicName);
    
    // Extract topic keywords
    const topicWords = extractKeywords(topicName);
    const topicKey = `${subjectName}::${topicName}`;
    if (!keywordMap.topics.has(topicKey)) {
      keywordMap.topics.set(topicKey, {
        id: item.topic.topic_id,
        name: item.topic.name,
        subjectName: item.topic.subject.name,
        subjectId: item.topic.subject.subject_id,
        keywords: new Set(topicWords),
        subTopics: []
      });
    }
    keywordMap.topics.get(topicKey).subTopics.push({
      id: item.sub_topic_id,
      name: item.name
    });
    
    // Build technology-specific keywords
    buildTechnologyKeywords(keywordMap.technologies, subjectName, topicName);
  });
  
  // Enhance with domain-specific patterns
  enhanceWithDomainPatterns(keywordMap);
  
  console.log(`✅ Built keyword map: ${keywordMap.subjects.size} subjects, ${keywordMap.topics.size} topics`);
  
  return keywordMap;
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text) {
  const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'using', 'development']);
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word));
  
  return words;
}

/**
 * Build technology-specific keyword patterns
 */
function buildTechnologyKeywords(techMap, subject, topic) {
  const patterns = {
    // Programming languages
    'java': ['class', 'public', 'static', 'void', 'extends', 'implements', 'system.out', 'import java', 'exception', 'thread'],
    'javascript': ['console.log', 'const', 'let', 'var', '=>', 'function', 'typeof', 'undefined', 'node', 'npm'],
    'python': ['def', 'import', 'print(', '__init__', 'self', 'elif', 'range(', 'pandas', 'numpy', 'pyspark'],
    'c++': ['cout', 'cin', 'std::', '#include', 'iostream', 'namespace', 'template'],
    'c#': ['console.writeline', 'using system', 'namespace', 'linq', 'async await'],
    
    // Big Data & Databases
    'sql': ['select', 'insert', 'update', 'delete', 'join', 'where', 'group by', 'having', 'table'],
    'nosql': ['document', 'mongodb', 'cassandra', 'collection', 'key-value'],
    'hive': ['hive', 'hiveql', 'partition', 'bucket', 'hadoop', 'hdfs', 'mapreduce'],
    'spark': ['spark', 'pyspark', 'rdd', 'dataframe', 'transformation', 'action', 'sparkcontext'],
    'kafka': ['kafka', 'producer', 'consumer', 'topic', 'broker', 'zookeeper', 'partition', 'offset'],
    
    // Cloud & DevOps
    'aws': ['aws', 'ec2', 's3', 'lambda', 'cloudwatch', 'iam', 'vpc', 'elb', 'rds'],
    'azure': ['azure', 'vm', 'blob', 'cosmos', 'functions', 'aks', 'resource group'],
    'docker': ['docker', 'container', 'dockerfile', 'image', 'volume', 'compose'],
    'kubernetes': ['kubernetes', 'k8s', 'pod', 'deployment', 'service', 'namespace', 'kubectl'],
    
    // Web frameworks
    'spring': ['spring', 'springboot', '@autowired', '@bean', '@service', '@controller', 'ioc', 'dependency injection'],
    'react': ['react', 'jsx', 'component', 'props', 'state', 'hooks', 'usestate', 'useeffect'],
    'angular': ['angular', 'directive', 'component', 'ng-', 'typescript', 'rxjs', 'observable'],
    'hibernate': ['hibernate', 'jpa', 'entity', 'session', 'criteria', 'hql'],
    
    // Testing
    'selenium': ['selenium', 'webdriver', 'locator', 'xpath', 'css selector', 'wait'],
    'junit': ['junit', 'test', '@test', 'assert', 'mock'],
    
    // Data Science
    'pandas': ['pandas', 'dataframe', 'series', 'groupby', 'merge', 'pivot'],
    'numpy': ['numpy', 'array', 'matrix', 'vectorization'],
    'matplotlib': ['matplotlib', 'plot', 'scatter', 'bar', 'histogram']
  };
  
  // Map subject/topic to technology patterns
  for (const [tech, keywords] of Object.entries(patterns)) {
    if (subject.includes(tech) || topic.includes(tech)) {
      if (!techMap.has(tech)) {
        techMap.set(tech, {
          keywords: new Set(keywords),
          subjects: new Set(),
          topics: new Set()
        });
      }
      techMap.get(tech).subjects.add(subject);
      techMap.get(tech).topics.add(topic);
    }
  }
}

/**
 * Enhance keyword map with domain patterns
 */
function enhanceWithDomainPatterns(keywordMap) {
  // Add common aliases and variations
  const aliases = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'python': ['py', 'python3', 'python2'],
    'sql': ['mysql', 'postgresql', 'oracle', 'tsql', 'plsql'],
    'java': ['jdk', 'jvm', 'jre']
  };
  
  for (const [tech, aliasList] of Object.entries(aliases)) {
    if (keywordMap.technologies.has(tech)) {
      aliasList.forEach(alias => {
        keywordMap.technologies.get(tech).keywords.add(alias);
      });
    }
  }
}

/**
 * INTELLIGENT CONTEXT DETECTION
 * Analyzes question and finds best matching subject/topic
 */
function detectQuestionContext(questionText, keywordMap) {
  const text = questionText.toLowerCase();
  const words = extractKeywords(text);
  
  const context = {
    detectedSubjects: [],
    detectedTopics: [],
    detectedTechnologies: [],
    confidence: 'low'
  };
  
  // 1. Technology detection (most specific)
  for (const [tech, techData] of keywordMap.technologies.entries()) {
    let matchCount = 0;
    for (const keyword of techData.keywords) {
      if (text.includes(keyword)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      context.detectedTechnologies.push({
        name: tech,
        matchCount,
        subjects: Array.from(techData.subjects),
        topics: Array.from(techData.topics)
      });
    }
  }
  
  // 2. Subject detection (broad category)
  for (const [subjectName, subjectData] of keywordMap.subjects.entries()) {
    let matchCount = 0;
    for (const keyword of subjectData.keywords) {
      if (words.includes(keyword) || text.includes(keyword)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      context.detectedSubjects.push({
        name: subjectName,
        displayName: subjectData.name,
        id: subjectData.id,
        matchCount
      });
    }
  }
  
  // 3. Topic detection (specific area)
  for (const [topicKey, topicData] of keywordMap.topics.entries()) {
    let matchCount = 0;
    for (const keyword of topicData.keywords) {
      if (words.includes(keyword) || text.includes(keyword)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      context.detectedTopics.push({
        name: topicData.name,
        subjectName: topicData.subjectName,
        matchCount
      });
    }
  }
  
  // Sort by match count
  context.detectedSubjects.sort((a, b) => b.matchCount - a.matchCount);
  context.detectedTopics.sort((a, b) => b.matchCount - a.matchCount);
  context.detectedTechnologies.sort((a, b) => b.matchCount - a.matchCount);
  
  // Set confidence
  if (context.detectedTechnologies.length > 0 && context.detectedTechnologies[0].matchCount >= 2) {
    context.confidence = 'high';
  } else if (context.detectedSubjects.length > 0 || context.detectedTopics.length > 0) {
    context.confidence = 'medium';
  }
  
  console.log(`🔍 Context Detection:`);
  console.log(`   Technologies: [${context.detectedTechnologies.slice(0, 3).map(t => `${t.name}(${t.matchCount})`).join(', ')}]`);
  console.log(`   Subjects: [${context.detectedSubjects.slice(0, 3).map(s => `${s.displayName}(${s.matchCount})`).join(', ')}]`);
  console.log(`   Topics: [${context.detectedTopics.slice(0, 3).map(t => `${t.name}(${t.matchCount})`).join(', ')}]`);
  console.log(`   Confidence: ${context.confidence}`);
  
  return context;
}

/**
 * Build platform lookup with ALL matching subtopics
 */
function buildPlatformLookupMap(platformData) {
  const subTopicsByName = new Map();
  const topicsByName = new Map();
  const subjectsByName = new Map();
  
  platformData.forEach(item => {
    const subTopicLower = item.name.toLowerCase();
    const topicLower = item.topic.name.toLowerCase();
    const subjectLower = item.topic.subject.name.toLowerCase();
    
    // Store all SubTopics with same name (INCLUDING parent info)
    if (!subTopicsByName.has(subTopicLower)) {
      subTopicsByName.set(subTopicLower, []);
    }
    subTopicsByName.get(subTopicLower).push({
      sub_topic_id: item.sub_topic_id,
      sub_topic_name: item.name,
      topic_id: item.topic.topic_id,
      topic_name: item.topic.name,
      subject_id: item.topic.subject.subject_id,
      subject_name: item.topic.subject.name
    });
    
    // Store topics
    if (!topicsByName.has(topicLower)) {
      topicsByName.set(topicLower, []);
    }
    topicsByName.get(topicLower).push({
      topic_id: item.topic.topic_id,
      topic_name: item.topic.name,
      subject_id: item.topic.subject.subject_id,
      subject_name: item.topic.subject.name
    });
    
    // Store subjects
    if (!subjectsByName.has(subjectLower)) {
      subjectsByName.set(subjectLower, {
        subject_id: item.topic.subject.subject_id,
        subject_name: item.topic.subject.name
      });
    }
  });
  
  // Log duplicates
  let duplicateCount = 0;
  subTopicsByName.forEach((matches, name) => {
    if (matches.length > 1) {
      duplicateCount++;
      console.log(`   ⚠️  "${matches[0].sub_topic_name}" exists in ${matches.length} hierarchies`);
    }
  });
  
  if (duplicateCount > 0) {
    console.log(`📋 Found ${duplicateCount} duplicate SubTopic names across different hierarchies`);
  }
  
  return { subTopicsByName, topicsByName, subjectsByName };
}

/**
 * CONTEXT-AWARE MATCHING with dynamic scoring
 */
function findContextAwareMatch(aiSuggestion, platformLookup, questionText, keywordMap) {
  const { subTopicsByName, topicsByName, subjectsByName } = platformLookup;
  const suggestionLower = aiSuggestion.toLowerCase().trim();
  
  console.log(`\n🔍 Matching: "${aiSuggestion}"`);
  
  // Get question context
  const context = detectQuestionContext(questionText, keywordMap);
  
  // Find all SubTopic matches
  let potentialMatches = [];
  
  // 1. Try exact SubTopic match
  if (subTopicsByName.has(suggestionLower)) {
    const matches = subTopicsByName.get(suggestionLower);
    console.log(`📋 Found ${matches.length} potential matches`);
    if (matches.length > 1) {
      console.log(`   ⚠️  "${aiSuggestion}" exists in ${matches.length} different hierarchies!`);
    }
    
    potentialMatches = matches.map(match => ({
      ...match,
      baseScore: 100,
      matchType: 'exact'
    }));
  }
  
  // 2. Try contains match
  if (potentialMatches.length === 0) {
    subTopicsByName.forEach((matches, name) => {
      if (name.includes(suggestionLower) || suggestionLower.includes(name)) {
        matches.forEach(match => {
          potentialMatches.push({
            ...match,
            baseScore: 70,
            matchType: 'contains'
          });
        });
      }
    });
  }
  
  // 3. Try word overlap
  if (potentialMatches.length === 0) {
    const suggestionWords = new Set(extractKeywords(suggestionLower));
    subTopicsByName.forEach((matches, name) => {
      const nameWords = new Set(extractKeywords(name));
      const overlap = [...suggestionWords].filter(w => nameWords.has(w)).length;
      
      if (overlap > 0) {
        const score = Math.min(50, overlap * 15);
        matches.forEach(match => {
          potentialMatches.push({
            ...match,
            baseScore: score,
            matchType: 'word-overlap'
          });
        });
      }
    });
  }
  
  if (potentialMatches.length === 0) {
    console.log('❌ No matches found');
    return null;
  }
  
  // APPLY CONTEXT SCORING
  potentialMatches = potentialMatches.map(match => {
    let contextScore = 0;
    const subjectLower = match.subject_name.toLowerCase();
    const topicLower = match.topic_name.toLowerCase();
    
    // 1. Technology-based scoring (HIGHEST priority)
    if (context.detectedTechnologies.length > 0) {
      const topTech = context.detectedTechnologies[0];
      
      // Check if this match's subject/topic is in the detected technology
      if (topTech.subjects.includes(subjectLower) || topTech.topics.includes(topicLower)) {
        contextScore += 50; // Strong boost
        console.log(`   ✓ Technology match: ${topTech.name} → ${match.subject_name}`);
      } else {
        // Penalize non-matching technologies
        contextScore -= 40;
      }
      
      // Additional boost for high-confidence multi-keyword matches
      if (topTech.matchCount >= 3) {
        contextScore += 20;
      }
    }
    
    // 2. Subject-based scoring
    if (context.detectedSubjects.length > 0) {
      const topSubject = context.detectedSubjects[0];
      
      if (subjectLower === topSubject.name || subjectLower.includes(topSubject.name)) {
        contextScore += 30;
        console.log(`   ✓ Subject match: ${topSubject.displayName}`);
      }
    }
    
    // 3. Topic-based scoring
    if (context.detectedTopics.length > 0) {
      const topTopic = context.detectedTopics[0];
      
      if (topicLower === topTopic.name.toLowerCase() || 
          topicLower.includes(topTopic.name.toLowerCase())) {
        contextScore += 25;
        console.log(`   ✓ Topic match: ${topTopic.name}`);
      }
    }
    
    // 4. Cross-technology penalty
    // Prevent Java questions from getting JavaScript answers, etc.
    if (context.detectedTechnologies.length > 0) {
      const topTech = context.detectedTechnologies[0].name;
      
      const conflicts = {
        'javascript': ['java', 'python', 'c++', 'c#'],
        'java': ['javascript', 'python', 'c++', 'c#'],
        'python': ['java', 'javascript', 'c++', 'c#'],
        'sql': ['nosql', 'mongodb', 'cassandra'],
        'hive': ['sql'],
        'spark': ['hadoop'],
        'react': ['angular', 'vue'],
        'angular': ['react', 'vue']
      };
      
      if (conflicts[topTech]) {
        for (const conflictTech of conflicts[topTech]) {
          if (subjectLower.includes(conflictTech) || topicLower.includes(conflictTech)) {
            contextScore -= 60; // Heavy penalty
            console.log(`   ✗ Conflict detected: ${topTech} ≠ ${conflictTech}`);
          }
        }
      }
    }
    
    const finalScore = match.baseScore + contextScore;
    
    return {
      ...match,
      contextScore,
      finalScore
    };
  });
  
  // Sort by final score
  potentialMatches.sort((a, b) => b.finalScore - a.finalScore);
  
  // Show top matches
  console.log(`📊 Top ${Math.min(5, potentialMatches.length)} matches (context-aware):`);
  potentialMatches.slice(0, 5).forEach((match, i) => {
    console.log(`  ${i + 1}. [${match.finalScore}] ${match.subject_name} → ${match.topic_name} → ${match.sub_topic_name}`);
  });
  
  const bestMatch = potentialMatches[0];
  console.log(`✅ Selected: [${bestMatch.finalScore}] ${bestMatch.matchType}`);
  console.log(`   ${bestMatch.subject_name} → ${bestMatch.topic_name} → ${bestMatch.sub_topic_name}\n`);
  
  // Calculate confidence
  const confidence = Math.min(95, 50 + (bestMatch.finalScore / 3));
  
  return {
    subject_id: bestMatch.subject_id,
    subject_name: bestMatch.subject_name,
    topic_id: bestMatch.topic_id,
    topic_name: bestMatch.topic_name,
    sub_topic_id: bestMatch.sub_topic_id,
    sub_topic_name: bestMatch.sub_topic_name,
    match_score: Math.round(bestMatch.finalScore),
    match_type: bestMatch.matchType,
    confidence: Math.round(confidence)
  };
}

/**
 * Call Groq API with retry logic
 */
async function callGroqAPI(question, retryCount = 0) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert educational content classifier. Analyze the question and identify ONLY the most specific SubTopic it belongs to.

CRITICAL RULES:
1. Return ONLY the SubTopic name - no explanation, no parent categories
2. Be as specific as possible
3. If the question mentions a specific technology/tool (like Hive, Spark, React), include it in your answer
4. Return just the name, nothing else

Examples:
Question: "What is a Hive partition?" → Answer: "Hive Partitions"
Question: "How do React hooks work?" → Answer: "React Hooks"
Question: "Write a Java program for exception handling" → Answer: "Exception Handling"
Question: "Explain GROUP BY in SQL" → Answer: "GROUP BY"

Now classify this question - return ONLY the SubTopic name:`
        },
        {
          role: "user",
          content: question
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 50
    });

    const suggestion = completion.choices[0]?.message?.content?.trim() || "";
    return suggestion;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️  Retry ${retryCount + 1}/${MAX_RETRIES} for question...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return callGroqAPI(question, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Process questions in batches
 */
async function processBatch(questions, platformLookup, keywordMap) {
  const results = [];

  for (const question of questions) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 Question: ${question}`);
      console.log('='.repeat(80));

      // Get AI suggestion
      const aiSuggestion = await callGroqAPI(question);
      console.log(`🤖 AI Suggestion: "${aiSuggestion}"`);

      // Find context-aware match
      const match = findContextAwareMatch(aiSuggestion, platformLookup, question, keywordMap);

      if (match) {
        results.push({
          question,
          ...match,
          ai_suggestion: aiSuggestion
        });
      } else {
        results.push({
          question,
          error: "No matching metadata found",
          ai_suggestion: aiSuggestion
        });
      }
    } catch (error) {
      console.error(`❌ Error processing question: ${error.message}`);
      results.push({
        question,
        error: error.message
      });
    }

    // Delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Main function to classify questions
 */
export async function classifyQuestions(questions, platformData) {
  try {
    console.log(`\n${'*'.repeat(80)}`);
    console.log('🚀 DYNAMIC METADATA CLASSIFICATION - ULTIMATE VERSION');
    console.log(`📊 Processing ${questions.length} questions`);
    console.log(`📚 Platform data: ${platformData.length} SubTopics`);
    console.log('*'.repeat(80));

    // Build dynamic keyword map from platform data
    const keywordMap = buildDynamicKeywordMap(platformData);

    // Build platform lookup with duplicate detection
    const platformLookup = buildPlatformLookupMap(platformData);

    // Process in batches
    const allResults = [];
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(questions.length / BATCH_SIZE)}`);

      const batchResults = await processBatch(batch, platformLookup, keywordMap);
      allResults.push(...batchResults);

      if (i + BATCH_SIZE < questions.length) {
        console.log(`⏳ Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Calculate statistics
    const successful = allResults.filter(r => !r.error).length;
    const highConfidence = allResults.filter(r => r.confidence && r.confidence >= 80).length;

    console.log(`\n${'*'.repeat(80)}`);
    console.log('✅ CLASSIFICATION COMPLETE');
    console.log(`   Total: ${allResults.length} questions`);
    console.log(`   Successful: ${successful} (${Math.round(successful / allResults.length * 100)}%)`);
    console.log(`   High Confidence (≥80): ${highConfidence} (${Math.round(highConfidence / allResults.length * 100)}%)`);
    console.log('*'.repeat(80));

    return allResults;
  } catch (error) {
    console.error('❌ Error in classifyQuestions:', error);
    throw error;
  }
}

export default { classifyQuestions };