import fetch from "node-fetch";
import { embedOne, embedBatch } from "./embedding.js";
import { qdrant } from "./vectorDB.js";

const tokenCache = new Map();

function tokenKey(token) {
  return "prod_v2_university"; // Fixed namespace for university
}

async function createCollections(key) {
  const subjects = `subjects_${key}`;
  const topics = `topics_${key}`;
  const subtopics = `subtopics_${key}`;

  const existing = await qdrant.getCollections();
  const names = existing.collections.map(c => c.name);

  // CREATE SUBJECTS COLLECTION
  if (!names.includes(subjects)) {
    await qdrant.createCollection(subjects, {
      vectors: { size: 384, distance: "Cosine" },
    });
    console.log("✅ [UNIVERSITY] Created:", subjects);
  }

  // CREATE TOPICS COLLECTION
  if (!names.includes(topics)) {
    await qdrant.createCollection(topics, {
      vectors: { size: 384, distance: "Cosine" },
    });
    console.log("✅ [UNIVERSITY] Created:", topics);
  }

  // CREATE SUBTOPICS COLLECTION
  if (!names.includes(subtopics)) {
    await qdrant.createCollection(subtopics, {
      vectors: { size: 384, distance: "Cosine" },
    });
    console.log("✅ [UNIVERSITY] Created:", subtopics);
  }
  
  // CREATE INDEXES
  try {
    await qdrant.createPayloadIndex(topics, {
      field_name: "subject_id",
      field_schema: "keyword",
    });
    console.log("✅ [UNIVERSITY] Created index on topics.subject_id");
  } catch (err) {
    if (err.status !== 409) console.error("[UNIVERSITY] Index creation failed:", err.message);
  }

  try {
    await qdrant.createPayloadIndex(subtopics, {
      field_name: "subject_id",
      field_schema: "keyword",
    });
    console.log("✅ [UNIVERSITY] Created index on subtopics.subject_id");
  } catch (err) {
    if (err.status !== 409) console.error("[UNIVERSITY] Index creation failed:", err.message);
  }

  try {
    await qdrant.createPayloadIndex(subtopics, {
      field_name: "topic_id",
      field_schema: "keyword",
    });
    console.log("✅ [UNIVERSITY] Created index on subtopics.topic_id");
  } catch (err) {
    if (err.status !== 409) console.error("[UNIVERSITY] Index creation failed:", err.message);
  }

  return { subjects, topics, subtopics };
}

async function fetchPlatformData(token, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📡 [UNIVERSITY] Fetching taxonomy (attempt ${attempt}/${retries})...`);
      
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
      console.log(`✅ [UNIVERSITY] Successfully fetched ${json.data?.length || 0} subtopics`);
      
      return json.data;
      
    } catch (err) {
      console.error(`❌ [UNIVERSITY] Attempt ${attempt} failed:`, err.message);
      
      if (attempt === retries) {
        throw new Error(`Failed to fetch university taxonomy after ${retries} attempts: ${err.message}`);
      }
      
      const waitTime = attempt * 2000;
      console.log(`⏳ [UNIVERSITY] Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

async function indexAll(token) {
  const key = tokenKey(token);
  const collections = await createCollections(key);

  console.log("📚 [UNIVERSITY] Fetching taxonomy from Examly...");
  
  let platformData;
  try {
    platformData = await fetchPlatformData(token);
  } catch (err) {
    console.error("❌ [UNIVERSITY] Failed to fetch platform data:", err.message);
    throw new Error("Unable to fetch university taxonomy from Examly. Please try again later.");
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

  // ✅ IF ALL DATA IS UP-TO-DATE, SKIP
  if (hasSubjects && hasTopics && hasSubtopics) {
    console.log(`✅ [UNIVERSITY] All collections up-to-date:`);
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

  // ✅ RE-INDEX ALL THREE LEVELS
  console.log(`🔄 [UNIVERSITY] Data changed - re-indexing:`);
  console.log(`   📊 Subjects: ${currentSubjects} → ${expectedSubjects}`);
  console.log(`   📊 Topics: ${currentTopics} → ${expectedTopics}`);
  console.log(`   📊 Subtopics: ${currentSubtopics} → ${expectedSubtopics}`);

  // DELETE OLD COLLECTIONS
  for (const collectionName of [collections.subjects, collections.topics, collections.subtopics]) {
    try {
      await qdrant.deleteCollection(collectionName);
      console.log(`🗑️  [UNIVERSITY] Deleted ${collectionName}`);
    } catch (err) {
      console.log(`ℹ️  [UNIVERSITY] ${collectionName} didn't exist`);
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
  console.log("✅ [UNIVERSITY] Recreated all collections");

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
  console.log("✅ [UNIVERSITY] Created all indexes");

  //---------------------------------------
  // LEVEL 1: SUBJECT INDEXING
  //---------------------------------------

  console.log(`🔍 [UNIVERSITY] Indexing ${subjectMap.size} subjects...`);

  const subjectTexts = [];
  const subjectIds = [];

for (const [id, name] of subjectMap) {
  
  subjectTexts.push(
    `${name}. Questions about ${name}. ${name} problems. ${name} exam questions. University ${name} assessment. ${name} concepts and theory. Test on ${name}. ${name} quiz. Academic ${name} questions. ${name} problem solving. ${name} course material.`
  );
  subjectIds.push(id);
}

  console.log("⚡ [UNIVERSITY] Embedding subjects...");
  const subjectVectors = await embedBatch(subjectTexts);

  const subjectPoints = subjectIds.map((id, idx) => ({
    id,
    vector: subjectVectors[idx],
    payload: {
      subject_id: id,
      name: subjectMap.get(id),
    },
  }));

  await qdrant.upsert(collections.subjects, {
    points: subjectPoints,
  });

  console.log("✅ [UNIVERSITY] Subjects indexed:", subjectPoints.length);

  //---------------------------------------
  // LEVEL 2: TOPIC INDEXING
  //---------------------------------------

  console.log(`🔍 [UNIVERSITY] Indexing ${topicMap.size} topics...`);

  const topicTexts = [];
  const topicIds = [];
  const topicPayloads = [];

for (const [id, topic] of topicMap) {
  
  topicTexts.push(
    `${topic.topic_name}. ${topic.subject_name} ${topic.topic_name}. Questions on ${topic.topic_name}. ${topic.topic_name} problems and solutions. ${topic.subject_name} exam covering ${topic.topic_name}. ${topic.topic_name} concepts. University questions about ${topic.topic_name}. ${topic.topic_name} quiz questions. ${topic.topic_name} assessment. ${topic.topic_name} exercises and examples.`
  );
  topicIds.push(id);
  topicPayloads.push(topic);
}

  console.log("⚡ [UNIVERSITY] Embedding topics in batches...");
  const BATCH_SIZE = 100;
  let topicVectors = [];
  
  for (let i = 0; i < topicTexts.length; i += BATCH_SIZE) {
    const batch = topicTexts.slice(i, i + BATCH_SIZE);
    const vectors = await embedBatch(batch);
    topicVectors.push(...vectors);
    console.log(`  ✓ [UNIVERSITY] Embedded ${Math.min(i + BATCH_SIZE, topicTexts.length)}/${topicTexts.length} topics`);
  }

  const topicPoints = topicIds.map((id, idx) => ({
    id,
    vector: topicVectors[idx],
    payload: topicPayloads[idx]
  }));

  await qdrant.upsert(collections.topics, {
    points: topicPoints,
  });

  console.log("✅ [UNIVERSITY] Topics indexed:", topicPoints.length);

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
    `${subtopic}. ${topic} ${subtopic}. ${subject} ${topic} ${subtopic}. Questions about ${subtopic}. ${subtopic} problems. University exam on ${subtopic}. ${topic} questions covering ${subtopic}. ${subtopic} quiz. ${subject} ${subtopic} assessment. ${subtopic} concepts and examples. ${subtopic} exercises. ${topic} ${subtopic} tutorial.`
  );

  subtopicData.push({
    id: item.sub_topic_id,
    payload: {
      subject_id: item.topic.subject.subject_id,
      topic_id: item.topic.topic_id,
      subtopic_id: item.sub_topic_id,
      subject_name: subject,
      topic_name: topic,
      subtopic_name: subtopic,
    }
  });
}

console.log(`⚡ [UNIVERSITY] Embedding ${subtopicTexts.length} subtopics in batches...`);
let allSubtopicVectors = [];

for (let i = 0; i < subtopicTexts.length; i += BATCH_SIZE) {
  const batch = subtopicTexts.slice(i, i + BATCH_SIZE);
  const vectors = await embedBatch(batch);
  allSubtopicVectors.push(...vectors);
  console.log(`  ✓ [UNIVERSITY] Embedded ${Math.min(i + BATCH_SIZE, subtopicTexts.length)}/${subtopicTexts.length} subtopics`);
}

const subtopicPoints = subtopicData.map((data, idx) => ({
  ...data,
  vector: allSubtopicVectors[idx],
}));

// ✅ BATCH UPSERT TO AVOID PAYLOAD SIZE LIMIT (33MB for Qdrant)
console.log(`📦 [UNIVERSITY] Upserting ${subtopicPoints.length} subtopics in batches...`);
const UPSERT_BATCH_SIZE = 500; // Safe batch size
const totalUpsertBatches = Math.ceil(subtopicPoints.length / UPSERT_BATCH_SIZE);

for (let i = 0; i < subtopicPoints.length; i += UPSERT_BATCH_SIZE) {
  const batchNumber = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
  const batch = subtopicPoints.slice(i, i + UPSERT_BATCH_SIZE);
  
  console.log(`  ✓ [UNIVERSITY] Upserting batch ${batchNumber}/${totalUpsertBatches} (${batch.length} points)`);
  
  await qdrant.upsert(collections.subtopics, {
    points: batch,
  });
}

console.log("🔥 [UNIVERSITY] Subtopics indexed:", subtopicPoints.length);

  const result = {
    indexed: true,
    subjects: collections.subjects,
    topics: collections.topics,
    subtopics: collections.subtopics,
  };

  tokenCache.set(token, result);

  return result;
}

export async function ensureIndexedUniversity(token) {
  if (tokenCache.has(token)) {
    console.log("✅ [UNIVERSITY] Using in-memory cache");
    return tokenCache.get(token);
  }

  console.log("⚡ [UNIVERSITY] Checking indexing status...");

  return await indexAll(token);
}