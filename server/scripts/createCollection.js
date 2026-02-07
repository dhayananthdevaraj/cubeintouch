import { qdrant } from "../services/vectorDB.js";

async function createCollection() {
  try {

    await qdrant.createCollection("subtopics_v1", {
      vectors: {
        size: 3072,        // IMPORTANT
        distance: "Cosine" // BEST for semantic search
      }
    });

    console.log("✅ Collection created successfully");

  } catch (err) {

    if (err.status === 409) {
      console.log("⚠️ Collection already exists");
    } else {
      console.error(err);
    }

  }
}

createCollection();
