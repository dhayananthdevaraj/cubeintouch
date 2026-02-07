import { pipeline } from '@xenova/transformers';

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log("🔄 Loading embedding model (first time only - ~30s)...");
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
    console.log("✅ Model loaded and cached");
  }
  return embedder;
}

/**
 * Batch embed texts locally (NO API NEEDED)
 */
export async function embedBatch(texts) {
  const model = await getEmbedder();
  
  const embeddings = [];
  
  for (const text of texts) {
    const output = await model(text, {
      pooling: 'mean',
      normalize: true
    });
    
    const embedding = Array.from(output.data);
    embeddings.push(embedding);
  }
  
  console.log(`✅ Embedded ${texts.length} text(s) locally`);
  
  return embeddings;
}

/**
 * Single text embedding
 */
export async function embedOne(text) {
  const [vector] = await embedBatch([text]);
  return vector;
}