import fetch from "node-fetch";
import { embedOne, embedBatch } from "./embedding.js";
import { qdrant } from "./vectorDB.js";

const tokenCache = new Map();

function tokenKey(token) {
  return token.slice(-12).replace(/[^a-zA-Z0-9]/g, "");
}

async function createCollections(key) {

  const subjects = `subjects_${key}`;
  const subtopics = `subtopics_${key}`;

  const existing = await qdrant.getCollections();
  const names = existing.collections.map(c => c.name);

  // CREATE SUBJECTS COLLECTION
  if (!names.includes(subjects)) {
    await qdrant.createCollection(subjects, {
      vectors: {
        size: 384,
        distance: "Cosine",
      },
    });
    console.log("✅ Created:", subjects);
  }

  // CREATE SUBTOPICS COLLECTION
  if (!names.includes(subtopics)) {
    await qdrant.createCollection(subtopics, {
      vectors: {
        size: 384,
        distance: "Cosine",
      },
    });
    console.log("✅ Created:", subtopics);
  }
  
  // CREATE INDEX - CHANGED TO KEYWORD TYPE
  try {
    await qdrant.createPayloadIndex(subtopics, {
      field_name: "subject_id",
      field_schema: "keyword",  // ← CHANGED from "integer"
    });
    console.log("✅ Created keyword index on subject_id");
  } catch (err) {
    if (err.status === 409) {
      console.log("⚠️ Index already exists");
    } else {
      console.error("❌ Index creation failed:", err.message);
    }
  }

  return { subjects, subtopics };
}

async function fetchPlatformData(token) {

  const res = await fetch(
    `${process.env.EXAMLY_API}/api/getalldetails`,
    {
      headers: { Authorization: token },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch platform taxonomy");
  }

  const json = await res.json();

  return json.data;
}

async function indexAll(token) {

  const key = tokenKey(token);
  const collections = await createCollections(key);

  console.log("📚 Fetching taxonomy...");

  const platformData = await fetchPlatformData(token);

  //---------------------------------------
  // SUBJECT INDEXING
  //---------------------------------------

  const subjectMap = new Map();

  platformData.forEach(item => {
    const s = item.topic.subject;
    subjectMap.set(s.subject_id, s.name);
  });

  console.log(`🔍 Found ${subjectMap.size} unique subjects`);

  const subjectTexts = [];
  const subjectIds = [];

  for (const [id, name] of subjectMap) {
    subjectTexts.push(
      `Subject: ${name}. Technical exam questions about ${name}. Programming concepts, theory, and applied knowledge in ${name}.`
    );
    subjectIds.push(id);
  }

  console.log("⚡ Embedding subjects in batch...");
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

  console.log("✅ Subjects indexed:", subjectPoints.length);

  //---------------------------------------
  // SUBTOPIC INDEXING
  //---------------------------------------

  const BATCH_SIZE = 50;
  const subtopicTexts = [];
  const subtopicData = [];

  for (const item of platformData) {
    const subject = item.topic.subject.name;
    const topic = item.topic.name;
    const subtopic = item.name;

    subtopicTexts.push(
      `Subject: ${subject}. Topic: ${topic}. Subtopic: ${subtopic}. Exam MCQs testing knowledge of ${subtopic} within ${topic}. Focus on ${subject} concepts related to ${subtopic}.`
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

  console.log(`⚡ Embedding ${subtopicTexts.length} subtopics in batches...`);
  const allVectors = [];
  
  for (let i = 0; i < subtopicTexts.length; i += BATCH_SIZE) {
    const batch = subtopicTexts.slice(i, i + BATCH_SIZE);
    const vectors = await embedBatch(batch);
    allVectors.push(...vectors);
    
    console.log(`  ✓ Embedded ${Math.min(i + BATCH_SIZE, subtopicTexts.length)}/${subtopicTexts.length}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const subtopicPoints = subtopicData.map((data, idx) => ({
    ...data,
    vector: allVectors[idx],
  }));

  await qdrant.upsert(collections.subtopics, {
    points: subtopicPoints,
  });

  console.log("🔥 Subtopics indexed:", subtopicPoints.length);

  const result = {
    indexed: true,
    subjects: collections.subjects,
    subtopics: collections.subtopics,
  };

  tokenCache.set(token, result);

  return result;
}

export async function ensureIndexed(token) {

  if (tokenCache.has(token)) {
    console.log("✅ Using cached collections");
    return tokenCache.get(token);
  }

  console.log("⚡ First time setup — indexing vectors");

  return await indexAll(token);
}