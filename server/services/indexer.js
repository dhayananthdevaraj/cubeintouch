import fetch from "node-fetch";
import { embedOne } from "./embedding.js";
import { qdrant } from "./vectorDB.js";

/**
 ✅ Token-based cache
 Prevents re-indexing every request
*/
const tokenCache = new Map();

/**
 Convert token → safe collection suffix
*/
function tokenKey(token) {
  return token.slice(-12).replace(/[^a-zA-Z0-9]/g, "");
}

/**
 Create collections if not exist
*/
async function createCollections(key) {

  const subjects = `subjects_${key}`;
  const subtopics = `subtopics_${key}`;

  const existing = await qdrant.getCollections();
  const names = existing.collections.map(c => c.name);

  if (!names.includes(subjects)) {
    await qdrant.createCollection(subjects, {
      vectors: {
        size: 3072,
        distance: "Cosine",
      },
    });
    console.log("✅ Created:", subjects);
  }

  if (!names.includes(subtopics)) {
    await qdrant.createCollection(subtopics, {
      vectors: {
        size: 384,
        distance: "Cosine",
      },
    });
    console.log("✅ Created:", subtopics);
  }

  return { subjects, subtopics };
}

/**
 Fetch taxonomy from Examly
*/
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

/**
 MAIN INDEXER
*/
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

  const subjectPoints = [];

  for (const [id, name] of subjectMap) {

    const vector = await embedOne(`
Subject: ${name}
Technical exam questions about ${name}.
`);

    subjectPoints.push({
      id,
      vector,
      payload: {
        subject_id: id,
        name,
      },
    });
  }

  await qdrant.upsert(collections.subjects, {
    points: subjectPoints,
  });

  console.log("✅ Subjects indexed:", subjectPoints.length);

  //---------------------------------------
  // SUBTOPIC INDEXING
  //---------------------------------------

  const subtopicPoints = [];

  for (const item of platformData) {

    const subject = item.topic.subject.name;
    const topic = item.topic.name;
    const subtopic = item.name;

    const vector = await embedOne(`
Subject: ${subject}
Topic: ${topic}
Subtopic: ${subtopic}

Exam MCQs testing ${subtopic}.
`);

    subtopicPoints.push({
      id: item.sub_topic_id,
      vector,
      payload: {
        subject_id: item.topic.subject.subject_id,
        topic_id: item.topic.topic_id,
        subtopic_id: item.sub_topic_id,
        subject_name: subject,
        topic_name: topic,
        subtopic_name: subtopic,
      },
    });
  }

  await qdrant.upsert(collections.subtopics, {
    points: subtopicPoints,
  });

  console.log("🔥 Subtopics indexed:", subtopicPoints.length);

  const result = {
    indexed: true,
    ...collections,
  };

  tokenCache.set(token, result);

  return result;
}

/**
 PUBLIC FUNCTION
 Called before classification
*/
export async function ensureIndexed(token) {

  if (tokenCache.has(token)) {
    return tokenCache.get(token);
  }

  console.log("⚡ First time setup — indexing vectors");

  return await indexAll(token);
}
