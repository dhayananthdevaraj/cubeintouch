// utils/hierarchyMatcher.js - Enhanced Hierarchy Matching Utilities

/**
 * Check if two technologies/topics should NOT be matched (disambiguation)
 * Uses intelligent keyword detection instead of hardcoded blacklist
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} - True if they should be blocked from matching
 */
function shouldBlockMatch(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // JavaScript vs Java detection
  const hasJavaScript1 = s1.includes('javascript') || s1.includes('java script') || s1.includes('js ');
  const hasJavaScript2 = s2.includes('javascript') || s2.includes('java script') || s2.includes('js ');
  const hasJava1 = s1.includes('java') && !hasJavaScript1;
  const hasJava2 = s2.includes('java') && !hasJavaScript2;
  
  if ((hasJavaScript1 && hasJava2) || (hasJavaScript2 && hasJava1)) {
    console.log(`⚠️  BLOCKED: JavaScript vs Java conflict - "${s1}" vs "${s2}"`);
    return true;
  }
  
  // React vs Angular detection
  const hasReact1 = s1.includes('react');
  const hasReact2 = s2.includes('react');
  const hasAngular1 = s1.includes('angular');
  const hasAngular2 = s2.includes('angular');
  
  if ((hasReact1 && hasAngular2) || (hasReact2 && hasAngular1)) {
    console.log(`⚠️  BLOCKED: React vs Angular conflict - "${s1}" vs "${s2}"`);
    return true;
  }
  
  // React vs Vue detection
  const hasVue1 = s1.includes('vue');
  const hasVue2 = s2.includes('vue');
  
  if ((hasReact1 && hasVue2) || (hasReact2 && hasVue1)) {
    console.log(`⚠️  BLOCKED: React vs Vue conflict - "${s1}" vs "${s2}"`);
    return true;
  }
  
  // Angular vs Vue detection
  if ((hasAngular1 && hasVue2) || (hasAngular2 && hasVue1)) {
    console.log(`⚠️  BLOCKED: Angular vs Vue conflict - "${s1}" vs "${s2}"`);
    return true;
  }
  
  // Python vs Java/JavaScript detection
  const hasPython1 = s1.includes('python');
  const hasPython2 = s2.includes('python');
  
  if ((hasPython1 && (hasJava2 || hasJavaScript2)) || (hasPython2 && (hasJava1 || hasJavaScript1))) {
    console.log(`⚠️  BLOCKED: Python vs Java/JavaScript conflict - "${s1}" vs "${s2}"`);
    return true;
  }
  
  return false;
}

/**
 * Calculate similarity score between two strings using multiple algorithms
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-100)
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Check if this match should be blocked (technology disambiguation)
  if (shouldBlockMatch(s1, s2)) {
    return 0; // Force zero similarity for conflicting technologies
  }
  
  // Exact match
  if (s1 === s2) return 100;
  
  // Contains match (high priority)
  if (s1.includes(s2) || s2.includes(s1)) {
    // Special case: "java" in "javascript" should NOT be high match
    if ((s1.includes('javascript') && s2.includes('java') && !s2.includes('javascript')) ||
        (s2.includes('javascript') && s1.includes('java') && !s1.includes('javascript'))) {
      return 30; // Low score for java/javascript confusion
    }
    return 90;
  }
  
  // Word overlap matching
  const words1 = s1.split(/[\s-_]+/);
  const words2 = s2.split(/[\s-_]+/);
  
  let commonWords = 0;
  words1.forEach(w1 => {
    if (words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))) {
      commonWords++;
    }
  });
  
  const wordOverlapScore = (commonWords / Math.max(words1.length, words2.length)) * 80;
  
  // Levenshtein distance (edit distance)
  const levenshteinScore = (1 - (levenshteinDistance(s1, s2) / Math.max(s1.length, s2.length))) * 70;
  
  return Math.max(wordOverlapScore, levenshteinScore);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Build lookup maps for hierarchy matching
 * @param {Array} availableSubjects - Subject objects
 * @param {Array} availableTopics - Topic objects
 * @param {Array} availableSubTopics - SubTopic objects
 * @returns {Object} - hierarchyMap, topicSubTopicsMap, and allHierarchies
 */
export function buildHierarchyMaps(availableSubjects, availableTopics, availableSubTopics) {
  const hierarchyMap = new Map();
  const topicSubTopicsMap = new Map();
  const allHierarchies = [];

  availableSubTopics.forEach(subTopic => {
    const topic = availableTopics.find(t => t.topic_id === subTopic.topic_id);
    const subject = availableSubjects.find(s => s.subject_id === topic?.subject_id);

    if (topic && subject) {
      const hierarchyData = {
        subject_id: subject.subject_id,
        subject_name: subject.name,
        topic_id: topic.topic_id,
        topic_name: topic.name,
        sub_topic_id: subTopic.sub_topic_id,
        sub_topic_name: subTopic.name
      };
      
      // Full hierarchy key
      const key = `${subject.name}|${topic.name}|${subTopic.name}`.toLowerCase();
      hierarchyMap.set(key, hierarchyData);
      
      // Store all hierarchies for fuzzy search
      allHierarchies.push(hierarchyData);

      // Track available subtopics per topic
      const topicKey = `${subject.name}|${topic.name}`.toLowerCase();
      if (!topicSubTopicsMap.has(topicKey)) {
        topicSubTopicsMap.set(topicKey, []);
      }
      topicSubTopicsMap.get(topicKey).push(hierarchyData);
    }
  });

  return { hierarchyMap, topicSubTopicsMap, allHierarchies };
}

/**
 * Match AI suggestion to actual hierarchy with enhanced fuzzy matching and technology disambiguation
 * @param {Object} aiResult - AI classification result
 * @param {Map} hierarchyMap - Full hierarchy map
 * @param {Map} topicSubTopicsMap - Topic to subtopics map
 * @param {Array} allHierarchies - All available hierarchies for fuzzy search
 * @returns {Object} - Matched hierarchy with confidence and reasoning
 */
export function matchHierarchy(aiResult, hierarchyMap, topicSubTopicsMap, allHierarchies) {
  console.log(`\n🔍 Matching AI Result:`, {
    subject: aiResult.subject,
    topic: aiResult.topic,
    sub_topic: aiResult.sub_topic,
    confidence: aiResult.confidence
  });

  // 1. Try exact hierarchical match
  const exactKey = `${aiResult.subject}|${aiResult.topic}|${aiResult.sub_topic}`.toLowerCase();
  let matchedHierarchy = hierarchyMap.get(exactKey);
  let matchType = "exact";
  let matchScore = 100;

  if (matchedHierarchy) {
    console.log(`✅ EXACT MATCH FOUND`);
    return buildMatchResult(matchedHierarchy, aiResult, matchType, matchScore);
  }

  // 2. Fuzzy match on all three levels (Subject → Topic → SubTopic)
  const candidates = [];
  
  allHierarchies.forEach(hierarchy => {
    const subjectScore = calculateSimilarity(aiResult.subject, hierarchy.subject_name);
    const topicScore = calculateSimilarity(aiResult.topic, hierarchy.topic_name);
    const subTopicScore = calculateSimilarity(aiResult.sub_topic, hierarchy.sub_topic_name);
    
    // Check for technology conflicts and penalize heavily
    let conflictPenalty = 0;
    
    // JavaScript vs Java conflict detection
    if ((aiResult.topic.toLowerCase().includes('javascript') || aiResult.sub_topic.toLowerCase().includes('javascript')) &&
        (hierarchy.topic_name.toLowerCase().includes('java') && !hierarchy.topic_name.toLowerCase().includes('javascript'))) {
      conflictPenalty = 80; // Massive penalty
      console.log(`⚠️  Conflict: JavaScript question matched to Java hierarchy - penalty: ${conflictPenalty}`);
    }
    
    // React vs Angular conflict detection
    if ((aiResult.topic.toLowerCase().includes('react') || aiResult.sub_topic.toLowerCase().includes('react')) &&
        hierarchy.topic_name.toLowerCase().includes('angular')) {
      conflictPenalty = 80; // Massive penalty
      console.log(`⚠️  Conflict: React question matched to Angular hierarchy - penalty: ${conflictPenalty}`);
    }
    
    // Python vs Java/JavaScript conflict
    if (aiResult.topic.toLowerCase().includes('python') &&
        (hierarchy.topic_name.toLowerCase().includes('java') || hierarchy.topic_name.toLowerCase().includes('javascript'))) {
      conflictPenalty = 80;
      console.log(`⚠️  Conflict: Python question matched to Java/JavaScript hierarchy - penalty: ${conflictPenalty}`);
    }
    
    // Weighted scoring: Subject (30%), Topic (40%), SubTopic (30%)
    // Topic gets MORE weight because it contains the primary technology
    let totalScore = (subjectScore * 0.30) + (topicScore * 0.40) + (subTopicScore * 0.30);
    
    // Apply conflict penalty
    totalScore = Math.max(0, totalScore - conflictPenalty);
    
    candidates.push({
      hierarchy,
      totalScore,
      subjectScore,
      topicScore,
      subTopicScore,
      conflictPenalty
    });
  });

  // Sort by total score descending
  candidates.sort((a, b) => b.totalScore - a.totalScore);
  
  const bestMatch = candidates[0];
  
  console.log(`📊 Top 3 Candidates:`);
  candidates.slice(0, 3).forEach((c, idx) => {
    console.log(`  ${idx + 1}. [${c.totalScore.toFixed(1)}%] ${c.hierarchy.subject_name} → ${c.hierarchy.topic_name} → ${c.hierarchy.sub_topic_name}`);
    console.log(`     Sub: ${c.subjectScore.toFixed(1)}% | Top: ${c.topicScore.toFixed(1)}% | SubTop: ${c.subTopicScore.toFixed(1)}%${c.conflictPenalty > 0 ? ` | Penalty: -${c.conflictPenalty}%` : ''}`);
  });

  // Determine match type based on scores
  if (bestMatch.totalScore >= 85) {
    matchType = "fuzzy_high_confidence";
    matchScore = bestMatch.totalScore;
  } else if (bestMatch.totalScore >= 70) {
    matchType = "fuzzy_medium_confidence";
    matchScore = bestMatch.totalScore;
  } else if (bestMatch.totalScore >= 50) {
    matchType = "fuzzy_low_confidence";
    matchScore = bestMatch.totalScore;
  } else {
    matchType = "fallback_best_available";
    matchScore = bestMatch.totalScore;
  }

  console.log(`✅ BEST MATCH: [${matchScore.toFixed(1)}%] ${bestMatch.hierarchy.subject_name} → ${bestMatch.hierarchy.topic_name} → ${bestMatch.hierarchy.sub_topic_name} (${matchType})`);

  return buildMatchResult(bestMatch.hierarchy, aiResult, matchType, matchScore);
}

/**
 * Build final match result object
 */
function buildMatchResult(matchedHierarchy, aiResult, matchType, matchScore) {
  // Adjust AI confidence based on match quality
  const adjustedConfidence = calculateAdjustedConfidence(
    aiResult.confidence || 75,
    matchType,
    matchScore
  );

  // Build detailed reasoning
  let reasoning = aiResult.reason || "AI classification";
  
  if (matchType !== "exact") {
    const matchTypeDescriptions = {
      "fuzzy_high_confidence": `High confidence fuzzy match (${matchScore.toFixed(0)}% similarity)`,
      "fuzzy_medium_confidence": `Medium confidence fuzzy match (${matchScore.toFixed(0)}% similarity)`,
      "fuzzy_low_confidence": `Low confidence fuzzy match (${matchScore.toFixed(0)}% similarity)`,
      "fallback_best_available": `Best available match (${matchScore.toFixed(0)}% similarity)`
    };
    
    reasoning += ` - ${matchTypeDescriptions[matchType] || matchType}`;
  }

  return {
    suggested_subject_id: matchedHierarchy.subject_id,
    suggested_subject_name: matchedHierarchy.subject_name,
    suggested_topic_id: matchedHierarchy.topic_id,
    suggested_topic_name: matchedHierarchy.topic_name,
    suggested_sub_topic_id: matchedHierarchy.sub_topic_id,
    suggested_sub_topic_name: matchedHierarchy.sub_topic_name,
    confidence: adjustedConfidence,
    reasoning: reasoning,
    match_type: matchType,
    match_score: Math.round(matchScore)
  };
}

/**
 * Calculate adjusted confidence based on match type and match score
 * @param {number} originalConfidence - Original AI confidence
 * @param {string} matchType - Type of match found
 * @param {number} matchScore - Similarity score of the match
 * @returns {number} - Adjusted confidence score
 */
function calculateAdjustedConfidence(originalConfidence, matchType, matchScore) {
  let baseConfidence = originalConfidence;
  
  // Adjust based on match type
  const typeAdjustments = {
    exact: 0,
    fuzzy_high_confidence: -5,      // 85%+ match score
    fuzzy_medium_confidence: -15,   // 70-85% match score
    fuzzy_low_confidence: -30,      // 50-70% match score
    fallback_best_available: -40    // <50% match score
  };

  const typeAdjustment = typeAdjustments[matchType] || -45;
  
  // Additional adjustment based on actual match score
  let scoreAdjustment = 0;
  if (matchScore < 85) {
    scoreAdjustment = -((85 - matchScore) * 0.3); // Penalize low match scores
  }

  const adjusted = baseConfidence + typeAdjustment + scoreAdjustment;

  // Ensure confidence is within valid range (30-100)
  return Math.max(30, Math.min(100, Math.round(adjusted)));
}