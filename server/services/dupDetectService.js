// server/services/dupDetectService.js

/**
 * Strip HTML tags and normalize text for comparison
 */
function normalizeText(raw = "") {
  return raw
    .replace(/<[^>]*>/g, "")       // strip HTML
    .replace(/\$\$\$examly[\s\S]*/g, "") // strip code block
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/[^a-z0-9\s]/gi, " ") // keep only alphanumeric
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Tokenize into word set
 */
function tokenize(text) {
  return new Set(text.split(" ").filter(Boolean));
}

/**
 * Jaccard similarity between two texts (0–1)
 */
function jaccardSimilarity(a, b) {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Levenshtein distance (normalized)
 */
function levenshteinSimilarity(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const maxLen = Math.max(m, n);
  return 1 - dp[m][n] / maxLen;
}

/**
 * Combined similarity score (Jaccard + Levenshtein average)
 * Jaccard is better for bag-of-words, Levenshtein for char-level edits
 */
function combinedSimilarity(normA, normB) {
  const jaccard = jaccardSimilarity(normA, normB);
  // Only run Levenshtein on shorter texts (performance guard)
  if (normA.length > 500 || normB.length > 500) return jaccard;
  const lev = levenshteinSimilarity(normA, normB);
  return (jaccard * 0.6 + lev * 0.4);
}

/**
 * Main duplicate detection function
 * @param {Array} mcqs - Array of { q_id, question, options, difficulty, topic }
 * @param {number} threshold - 0–1, default 0.80
 * @returns {Array} clusters - groups of duplicate question indices
 */
export function detectDuplicates(mcqs, threshold = 0.80) {
  const normalized = mcqs.map((q) => normalizeText(q.question));

  const pairs = []; // { i, j, score }

  for (let i = 0; i < mcqs.length; i++) {
    for (let j = i + 1; j < mcqs.length; j++) {
      const score = combinedSimilarity(normalized[i], normalized[j]);
      if (score >= threshold) {
        pairs.push({ i, j, score: parseFloat((score * 100).toFixed(1)) });
      }
    }
  }

  // Union-Find to group duplicates into clusters
  const parent = mcqs.map((_, i) => i);

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x, y) {
    parent[find(x)] = find(y);
  }

  pairs.forEach(({ i, j }) => union(i, j));

  // Group indices by root
  const groupMap = new Map();
  mcqs.forEach((_, i) => {
    const root = find(i);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root).push(i);
  });

  // Build cluster output — only groups with 2+ members
  const clusters = [];
  groupMap.forEach((indices) => {
    if (indices.length < 2) return;

    // Find max similarity score within cluster
    let maxScore = 0;
    const clusterPairs = pairs.filter(
      ({ i, j }) => indices.includes(i) && indices.includes(j)
    );
    clusterPairs.forEach(({ score }) => {
      if (score > maxScore) maxScore = score;
    });

    clusters.push({
      questions: indices.map((idx) => ({
        index: idx,
        q_id: mcqs[idx].q_id,
        question: mcqs[idx].question,
        options: mcqs[idx].options,
        difficulty: mcqs[idx].difficulty,
        topic: mcqs[idx].topic,
        existingAnswer: mcqs[idx].existingAnswer,
      })),
      maxSimilarity: maxScore,
      pairScores: clusterPairs,
    });
  });

  // Sort by highest similarity first
  clusters.sort((a, b) => b.maxSimilarity - a.maxSimilarity);

  return clusters;
}