
// import fetch from "node-fetch";
// import { embedOne, embedBatch } from "./embedding.js";
// import { qdrant } from "./vectorDB.js";

// const tokenCache = new Map();

// function tokenKey(token) {
//   return "prod_v1";
// }

// async function createCollections(key) {

//   const subjects = `subjects_${key}`;
//   const topics = `topics_${key}`;
//   const subtopics = `subtopics_${key}`;

//   const existing = await qdrant.getCollections();
//   const names = existing.collections.map(c => c.name);

//   // CREATE SUBJECTS COLLECTION
//   if (!names.includes(subjects)) {
//     await qdrant.createCollection(subjects, {
//       vectors: { size: 384, distance: "Cosine" },
//     });
//     console.log("✅ Created:", subjects);
//   }

//   // CREATE TOPICS COLLECTION
//   if (!names.includes(topics)) {
//     await qdrant.createCollection(topics, {
//       vectors: { size: 384, distance: "Cosine" },
//     });
//     console.log("✅ Created:", topics);
//   }

//   // CREATE SUBTOPICS COLLECTION
//   if (!names.includes(subtopics)) {
//     await qdrant.createCollection(subtopics, {
//       vectors: { size: 384, distance: "Cosine" },
//     });
//     console.log("✅ Created:", subtopics);
//   }
  
//   // CREATE INDEXES
//   try {
//     await qdrant.createPayloadIndex(topics, {
//       field_name: "subject_id",
//       field_schema: "keyword",
//     });
//     console.log("✅ Created index on topics.subject_id");
//   } catch (err) {
//     if (err.status !== 409) console.error("Index creation failed:", err.message);
//   }

//   try {
//     await qdrant.createPayloadIndex(subtopics, {
//       field_name: "subject_id",
//       field_schema: "keyword",
//     });
//     console.log("✅ Created index on subtopics.subject_id");
//   } catch (err) {
//     if (err.status !== 409) console.error("Index creation failed:", err.message);
//   }

//   try {
//     await qdrant.createPayloadIndex(subtopics, {
//       field_name: "topic_id",
//       field_schema: "keyword",
//     });
//     console.log("✅ Created index on subtopics.topic_id");
//   } catch (err) {
//     if (err.status !== 409) console.error("Index creation failed:", err.message);
//   }

//   return { subjects, topics, subtopics };
// }

// async function fetchPlatformData(token, retries = 3) {
  
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       console.log(`📡 Fetching taxonomy (attempt ${attempt}/${retries})...`);
      
//       const controller = new AbortController();
//       const timeout = setTimeout(() => controller.abort(), 30000);
      
//       const res = await fetch(
//         `${process.env.EXAMLY_API}/api/getalldetails`,
//         {
//           headers: { Authorization: token },
//           signal: controller.signal
//         }
//       );

//       clearTimeout(timeout);

//       if (!res.ok) {
//         throw new Error(`Examly API returned ${res.status}`);
//       }

//       const json = await res.json();
//       console.log(`✅ Successfully fetched ${json.data?.length || 0} subtopics`);
      
//       return json.data;
      
//     } catch (err) {
//       console.error(`❌ Attempt ${attempt} failed:`, err.message);
      
//       if (attempt === retries) {
//         throw new Error(`Failed to fetch taxonomy after ${retries} attempts: ${err.message}`);
//       }
      
//       const waitTime = attempt * 2000;
//       console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
//       await new Promise(resolve => setTimeout(resolve, waitTime));
//     }
//   }
// }

// async function indexAll(token) {

//   const key = tokenKey(token);
//   const collections = await createCollections(key);

//   console.log("📚 Fetching taxonomy from Examly...");
  
//   let platformData;
//   try {
//     platformData = await fetchPlatformData(token);
//   } catch (err) {
//     console.error("❌ Failed to fetch platform data:", err.message);
//     throw new Error("Unable to fetch taxonomy from Examly. Please try again later.");
//   }

//   // ✅ BUILD MAPS FOR ALL THREE LEVELS
//   const subjectMap = new Map();
//   const topicMap = new Map();
  
//   platformData.forEach(item => {
//     const s = item.topic.subject;
//     const t = item.topic;
    
//     subjectMap.set(s.subject_id, s.name);
    
//     if (!topicMap.has(t.topic_id)) {
//       topicMap.set(t.topic_id, {
//         topic_id: t.topic_id,
//         topic_name: t.name,
//         subject_id: s.subject_id,
//         subject_name: s.name
//       });
//     }
//   });
  
//   const expectedSubjects = subjectMap.size;
//   const expectedTopics = topicMap.size;
//   const expectedSubtopics = platformData.length;

//   // ✅ CHECK EXISTING DATA
//   const subjectsInfo = await qdrant.getCollection(collections.subjects);
//   const topicsInfo = await qdrant.getCollection(collections.topics);
//   const subtopicsInfo = await qdrant.getCollection(collections.subtopics);

//   const currentSubjects = subjectsInfo.points_count || 0;
//   const currentTopics = topicsInfo.points_count || 0;
//   const currentSubtopics = subtopicsInfo.points_count || 0;

//   const hasSubjects = currentSubjects === expectedSubjects;
//   const hasTopics = currentTopics === expectedTopics;
//   const hasSubtopics = currentSubtopics === expectedSubtopics;

//   // ✅ IF ALL DATA IS UP-TO-DATE, SKIP
//   if (hasSubjects && hasTopics && hasSubtopics) {
//     console.log(`✅ All collections up-to-date:`);
//     console.log(`   📊 Subjects: ${currentSubjects}/${expectedSubjects}`);
//     console.log(`   📊 Topics: ${currentTopics}/${expectedTopics}`);
//     console.log(`   📊 Subtopics: ${currentSubtopics}/${expectedSubtopics}`);
    
//     const result = {
//       indexed: true,
//       subjects: collections.subjects,
//       topics: collections.topics,
//       subtopics: collections.subtopics,
//     };
    
//     tokenCache.set(token, result);
//     return result;
//   }

//   // ✅ RE-INDEX ALL THREE LEVELS
//   console.log(`🔄 Data changed - re-indexing:`);
//   console.log(`   📊 Subjects: ${currentSubjects} → ${expectedSubjects}`);
//   console.log(`   📊 Topics: ${currentTopics} → ${expectedTopics}`);
//   console.log(`   📊 Subtopics: ${currentSubtopics} → ${expectedSubtopics}`);

//   // DELETE OLD COLLECTIONS
//   for (const collectionName of [collections.subjects, collections.topics, collections.subtopics]) {
//     try {
//       await qdrant.deleteCollection(collectionName);
//       console.log(`🗑️  Deleted ${collectionName}`);
//     } catch (err) {
//       console.log(`ℹ️  ${collectionName} didn't exist`);
//     }
//   }

//   // RECREATE COLLECTIONS
//   await qdrant.createCollection(collections.subjects, {
//     vectors: { size: 384, distance: "Cosine" },
//   });
//   await qdrant.createCollection(collections.topics, {
//     vectors: { size: 384, distance: "Cosine" },
//   });
//   await qdrant.createCollection(collections.subtopics, {
//     vectors: { size: 384, distance: "Cosine" },
//   });
//   console.log("✅ Recreated all collections");

//   // CREATE INDEXES
//   await qdrant.createPayloadIndex(collections.topics, {
//     field_name: "subject_id",
//     field_schema: "keyword",
//   });
//   await qdrant.createPayloadIndex(collections.subtopics, {
//     field_name: "subject_id",
//     field_schema: "keyword",
//   });
//   await qdrant.createPayloadIndex(collections.subtopics, {
//     field_name: "topic_id",
//     field_schema: "keyword",
//   });
//   console.log("✅ Created all indexes");

//   //---------------------------------------
//   // LEVEL 1: SUBJECT INDEXING
//   //---------------------------------------

//   console.log(`🔍 Indexing ${subjectMap.size} subjects...`);

//   const subjectTexts = [];
//   const subjectIds = [];

//   for (const [id, name] of subjectMap) {
//     subjectTexts.push(
//       `${name}. Subject ${name}. Programming ${name}. Technical questions about ${name}. ${name} concepts and theory. MCQ exam for ${name}. ${name} assessment and quiz.`
//     );
//     subjectIds.push(id);
//   }

//   console.log("⚡ Embedding subjects...");
//   const subjectVectors = await embedBatch(subjectTexts);

//   const subjectPoints = subjectIds.map((id, idx) => ({
//     id,
//     vector: subjectVectors[idx],
//     payload: {
//       subject_id: id,
//       name: subjectMap.get(id),
//     },
//   }));

//   await qdrant.upsert(collections.subjects, {
//     points: subjectPoints,
//   });

//   console.log("✅ Subjects indexed:", subjectPoints.length);

//   //---------------------------------------
//   // LEVEL 2: TOPIC INDEXING
//   //---------------------------------------

//   console.log(`🔍 Indexing ${topicMap.size} topics...`);

//   const topicTexts = [];
//   const topicIds = [];
//   const topicPayloads = [];

//   for (const [id, topic] of topicMap) {
//     topicTexts.push(
//       `${topic.topic_name}. ${topic.subject_name} ${topic.topic_name}. Technical questions about ${topic.topic_name}. ${topic.topic_name} programming concepts. MCQ for ${topic.topic_name}. ${topic.topic_name} quiz and assessment. ${topic.subject_name} - ${topic.topic_name} exam.`
//     );
//     topicIds.push(id);
//     topicPayloads.push(topic);
//   }

//   console.log("⚡ Embedding topics in batches...");
//   const BATCH_SIZE = 100;
//   let topicVectors = [];
  
//   for (let i = 0; i < topicTexts.length; i += BATCH_SIZE) {
//     const batch = topicTexts.slice(i, i + BATCH_SIZE);
//     const vectors = await embedBatch(batch);
//     topicVectors.push(...vectors);
//     console.log(`  ✓ Embedded ${Math.min(i + BATCH_SIZE, topicTexts.length)}/${topicTexts.length} topics`);
//   }

//   const topicPoints = topicIds.map((id, idx) => ({
//     id,
//     vector: topicVectors[idx],
//     payload: topicPayloads[idx]
//   }));

//   await qdrant.upsert(collections.topics, {
//     points: topicPoints,
//   });

//   console.log("✅ Topics indexed:", topicPoints.length);

//   //---------------------------------------
//   // LEVEL 3: SUBTOPIC INDEXING
//   //---------------------------------------

//   const subtopicTexts = [];
//   const subtopicData = [];

//   for (const item of platformData) {
//     const subject = item.topic.subject.name;
//     const topic = item.topic.name;
//     const subtopic = item.name;

//     subtopicTexts.push(
//       `${subtopic}. ${topic} ${subtopic}. ${subject} ${topic} ${subtopic}. Questions about ${subtopic}. ${topic} - ${subtopic} concepts. MCQ on ${subtopic}. ${subtopic} programming quiz. Technical ${topic} assessment covering ${subtopic}.`
//     );

//     subtopicData.push({
//       id: item.sub_topic_id,
//       payload: {
//         subject_id: item.topic.subject.subject_id,
//         topic_id: item.topic.topic_id,
//         subtopic_id: item.sub_topic_id,
//         subject_name: subject,
//         topic_name: topic,
//         subtopic_name: subtopic,
//       }
//     });
//   }

//   console.log(`⚡ Embedding ${subtopicTexts.length} subtopics in batches...`);
//   let allSubtopicVectors = [];
  
//   for (let i = 0; i < subtopicTexts.length; i += BATCH_SIZE) {
//     const batch = subtopicTexts.slice(i, i + BATCH_SIZE);
//     const vectors = await embedBatch(batch);
//     allSubtopicVectors.push(...vectors);
//     console.log(`  ✓ Embedded ${Math.min(i + BATCH_SIZE, subtopicTexts.length)}/${subtopicTexts.length} subtopics`);
//   }

//   const subtopicPoints = subtopicData.map((data, idx) => ({
//     ...data,
//     vector: allSubtopicVectors[idx],
//   }));

//   await qdrant.upsert(collections.subtopics, {
//     points: subtopicPoints,
//   });

//   console.log("🔥 Subtopics indexed:", subtopicPoints.length);

//   const result = {
//     indexed: true,
//     subjects: collections.subjects,
//     topics: collections.topics,
//     subtopics: collections.subtopics,
//   };

//   tokenCache.set(token, result);

//   return result;
// }

// export async function ensureIndexed(token) {

//   if (tokenCache.has(token)) {
//     console.log("✅ Using in-memory cache");
//     return tokenCache.get(token);
//   }

//   console.log("⚡ Checking indexing status...");

//   return await indexAll(token);
// }

//fixed

import fetch from "node-fetch";
import { embedOne, embedBatch } from "./embedding.js";
import { qdrant } from "./vectorDB.js";

const tokenCache = new Map();

function tokenKey(token) {
  return "prod_v1";
}

async function createCollections(key) {

  const subjects = `subjects_${key}`;
  const topics = `topics_${key}`;
  const subtopics = `subtopics_${key}`;

  const existing = await qdrant.getCollections();
  const names = existing.collections.map(c => c.name);

  if (!names.includes(subjects)) {
    await qdrant.createCollection(subjects, {
      vectors: { size: 384, distance: "Cosine" },
    });
    console.log("✅ Created:", subjects);
  }

  if (!names.includes(topics)) {
    await qdrant.createCollection(topics, {
      vectors: { size: 384, distance: "Cosine" },
    });
    console.log("✅ Created:", topics);
  }

  if (!names.includes(subtopics)) {
    await qdrant.createCollection(subtopics, {
      vectors: { size: 384, distance: "Cosine" },
    });
    console.log("✅ Created:", subtopics);
  }
  
  // CREATE INDEXES
  try {
    await qdrant.createPayloadIndex(topics, {
      field_name: "subject_id",
      field_schema: "keyword",
    });
    console.log("✅ Created index on topics.subject_id");
  } catch (err) {
    if (err.status !== 409) console.error("Index creation failed:", err.message);
  }

  try {
    await qdrant.createPayloadIndex(subtopics, {
      field_name: "subject_id",
      field_schema: "keyword",
    });
    console.log("✅ Created index on subtopics.subject_id");
  } catch (err) {
    if (err.status !== 409) console.error("Index creation failed:", err.message);
  }

  try {
    await qdrant.createPayloadIndex(subtopics, {
      field_name: "topic_id",
      field_schema: "keyword",
    });
    console.log("✅ Created index on subtopics.topic_id");
  } catch (err) {
    if (err.status !== 409) console.error("Index creation failed:", err.message);
  }

  return { subjects, topics, subtopics };
}

async function fetchPlatformData(token, retries = 3) {
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📡 Fetching taxonomy (attempt ${attempt}/${retries})...`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const res = await fetch(
        `${process.env.EXAMLY_API}/api/getalldetails`,
        {
          headers: { Authorization: token },
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Examly API returned ${res.status}`);
      }

      const json = await res.json();
      console.log(`✅ Successfully fetched ${json.data?.length || 0} subtopics`);
      
      return json.data;
      
    } catch (err) {
      console.error(`❌ Attempt ${attempt} failed:`, err.message);
      
      if (attempt === retries) {
        throw new Error(`Failed to fetch taxonomy after ${retries} attempts: ${err.message}`);
      }
      
      const waitTime = attempt * 2000;
      console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

async function indexAll(token) {

  const key = tokenKey(token);
  const collections = await createCollections(key);

  console.log("📚 Fetching taxonomy from Examly...");
  
  let platformData;
  try {
    platformData = await fetchPlatformData(token);
  } catch (err) {
    console.error("❌ Failed to fetch platform data:", err.message);
    throw new Error("Unable to fetch taxonomy from Examly. Please try again later.");
  }

  // ✅ BUILD MAPS FOR ALL THREE LEVELS
  const subjectMap = new Map();
  const topicMap = new Map();
  
  platformData.forEach(item => {
    const s = item.topic.subject;
    const t = item.topic;
    
    subjectMap.set(s.subject_id, s.name);
    
    if (!topicMap.has(t.topic_id)) {
      topicMap.set(t.topic_id, {
        topic_id: t.topic_id,
        topic_name: t.name,
        subject_id: s.subject_id,
        subject_name: s.name
      });
    }
  });
  
  const expectedSubjects = subjectMap.size;
  const expectedTopics = topicMap.size;
  const expectedSubtopics = platformData.length;

  // ✅ CHECK EXISTING DATA
  const subjectsInfo = await qdrant.getCollection(collections.subjects);
  const topicsInfo = await qdrant.getCollection(collections.topics);
  const subtopicsInfo = await qdrant.getCollection(collections.subtopics);

  const currentSubjects = subjectsInfo.points_count || 0;
  const currentTopics = topicsInfo.points_count || 0;
  const currentSubtopics = subtopicsInfo.points_count || 0;

  const hasSubjects = currentSubjects === expectedSubjects;
  const hasTopics = currentTopics === expectedTopics;
  const hasSubtopics = currentSubtopics === expectedSubtopics;

  if (hasSubjects && hasTopics && hasSubtopics) {
    console.log(`✅ All collections up-to-date:`);
    console.log(`   📊 Subjects: ${currentSubjects}/${expectedSubjects}`);
    console.log(`   📊 Topics: ${currentTopics}/${expectedTopics}`);
    console.log(`   📊 Subtopics: ${currentSubtopics}/${expectedSubtopics}`);
    
    const result = {
      indexed: true,
      subjects: collections.subjects,
      topics: collections.topics,
      subtopics: collections.subtopics,
    };
    
    tokenCache.set(token, result);
    return result;
  }

  console.log(`🔄 Data changed - re-indexing:`);
  console.log(`   📊 Subjects: ${currentSubjects} → ${expectedSubjects}`);
  console.log(`   📊 Topics: ${currentTopics} → ${expectedTopics}`);
  console.log(`   📊 Subtopics: ${currentSubtopics} → ${expectedSubtopics}`);

  // DELETE OLD COLLECTIONS
  for (const collectionName of [collections.subjects, collections.topics, collections.subtopics]) {
    try {
      await qdrant.deleteCollection(collectionName);
      console.log(`🗑️  Deleted ${collectionName}`);
    } catch (err) {
      console.log(`ℹ️  ${collectionName} didn't exist`);
    }
  }

  // RECREATE COLLECTIONS
  await qdrant.createCollection(collections.subjects, {
    vectors: { size: 384, distance: "Cosine" },
  });
  await qdrant.createCollection(collections.topics, {
    vectors: { size: 384, distance: "Cosine" },
  });
  await qdrant.createCollection(collections.subtopics, {
    vectors: { size: 384, distance: "Cosine" },
  });
  console.log("✅ Recreated all collections");

  // CREATE INDEXES
  await qdrant.createPayloadIndex(collections.topics, {
    field_name: "subject_id",
    field_schema: "keyword",
  });
  await qdrant.createPayloadIndex(collections.subtopics, {
    field_name: "subject_id",
    field_schema: "keyword",
  });
  await qdrant.createPayloadIndex(collections.subtopics, {
    field_name: "topic_id",
    field_schema: "keyword",
  });
  console.log("✅ Created all indexes");

  //---------------------------------------
  // LEVEL 1: SUBJECT INDEXING
  //---------------------------------------

  console.log(`🔍 Indexing ${subjectMap.size} subjects...`);

  const subjectTexts = [];
  const subjectIds = [];

  for (const [id, name] of subjectMap) {
    subjectTexts.push(
      `${name}. Subject ${name}. Programming ${name}. Technical questions about ${name}. ${name} concepts and theory. MCQ exam for ${name}. ${name} assessment and quiz.`
    );
    subjectIds.push(id);
  }

  console.log("⚡ Embedding subjects...");
  const subjectVectors = await embedBatch(subjectTexts);

  const subjectPoints = subjectIds.map((id, idx) => ({
    id,
    vector: subjectVectors[idx],
    payload: {
      // ✅ FIX: Store IDs as strings for consistent keyword filter matching
      subject_id: String(id),
      name: subjectMap.get(id),
    },
  }));

  await qdrant.upsert(collections.subjects, {
    points: subjectPoints,
  });

  console.log("✅ Subjects indexed:", subjectPoints.length);

  //---------------------------------------
  // LEVEL 2: TOPIC INDEXING
  //---------------------------------------

  console.log(`🔍 Indexing ${topicMap.size} topics...`);

  const topicTexts = [];
  const topicIds = [];
  const topicPayloads = [];

  for (const [id, topic] of topicMap) {
    topicTexts.push(
      `${topic.topic_name}. ${topic.subject_name} ${topic.topic_name}. Technical questions about ${topic.topic_name}. ${topic.topic_name} programming concepts. MCQ for ${topic.topic_name}. ${topic.topic_name} quiz and assessment. ${topic.subject_name} - ${topic.topic_name} exam.`
    );
    topicIds.push(id);
    // ✅ FIX: Store IDs as strings
    topicPayloads.push({
      ...topic,
      topic_id: String(topic.topic_id),
      subject_id: String(topic.subject_id),
    });
  }

  console.log("⚡ Embedding topics in batches...");
  const BATCH_SIZE = 100;
  let topicVectors = [];
  
  for (let i = 0; i < topicTexts.length; i += BATCH_SIZE) {
    const batch = topicTexts.slice(i, i + BATCH_SIZE);
    const vectors = await embedBatch(batch);
    topicVectors.push(...vectors);
    console.log(`  ✓ Embedded ${Math.min(i + BATCH_SIZE, topicTexts.length)}/${topicTexts.length} topics`);
  }

  const topicPoints = topicIds.map((id, idx) => ({
    id,
    vector: topicVectors[idx],
    payload: topicPayloads[idx]
  }));

  await qdrant.upsert(collections.topics, {
    points: topicPoints,
  });

  console.log("✅ Topics indexed:", topicPoints.length);

  //---------------------------------------
  // LEVEL 3: SUBTOPIC INDEXING
  //---------------------------------------

  const subtopicTexts = [];
  const subtopicData = [];

  for (const item of platformData) {
    const subject = item.topic.subject.name;
    const topic = item.topic.name;
    const subtopic = item.name;

    subtopicTexts.push(
      `${subtopic}. ${topic} ${subtopic}. ${subject} ${topic} ${subtopic}. Questions about ${subtopic}. ${topic} - ${subtopic} concepts. MCQ on ${subtopic}. ${subtopic} programming quiz. Technical ${topic} assessment covering ${subtopic}.`
    );

    subtopicData.push({
      id: item.sub_topic_id,
      payload: {
        // ✅ FIX: Store ALL IDs as strings
        subject_id: String(item.topic.subject.subject_id),
        topic_id: String(item.topic.topic_id),
        subtopic_id: String(item.sub_topic_id),
        subject_name: subject,
        topic_name: topic,
        subtopic_name: subtopic,
      }
    });
  }

  console.log(`⚡ Embedding ${subtopicTexts.length} subtopics in batches...`);
  let allSubtopicVectors = [];
  
  for (let i = 0; i < subtopicTexts.length; i += BATCH_SIZE) {
    const batch = subtopicTexts.slice(i, i + BATCH_SIZE);
    const vectors = await embedBatch(batch);
    allSubtopicVectors.push(...vectors);
    console.log(`  ✓ Embedded ${Math.min(i + BATCH_SIZE, subtopicTexts.length)}/${subtopicTexts.length} subtopics`);
  }

  const subtopicPoints = subtopicData.map((data, idx) => ({
    ...data,
    vector: allSubtopicVectors[idx],
  }));

  await qdrant.upsert(collections.subtopics, {
    points: subtopicPoints,
  });

  console.log("🔥 Subtopics indexed:", subtopicPoints.length);

  const result = {
    indexed: true,
    subjects: collections.subjects,
    topics: collections.topics,
    subtopics: collections.subtopics,
  };

  tokenCache.set(token, result);

  return result;
}

export async function ensureIndexed(token) {

  if (tokenCache.has(token)) {
    console.log("✅ Using in-memory cache");
    return tokenCache.get(token);
  }

  console.log("⚡ Checking indexing status...");

  return await indexAll(token);
}