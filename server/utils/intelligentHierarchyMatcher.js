// utils/intelligentHierarchyMatcher.js - AI-Powered Dynamic Disambiguation

/**
 * INTELLIGENT DISAMBIGUATION SYSTEM
 * Dynamically learns conflicts from hierarchy structure instead of hardcoded rules
 * Scales to ANY number of topics automatically
 */

/**
 * Build semantic similarity maps from hierarchy
 * This analyzes the hierarchy to find potentially confusing topics
 */
function buildSemanticConflictMap(allHierarchies) {
  const conflictMap = new Map();
  
  console.log(`🧠 Building semantic conflict map from ${allHierarchies.length} hierarchies...`);
  
  // Group by subject first for efficiency
  const subjectGroups = new Map();
  
  allHierarchies.forEach(hierarchy => {
    const subjectKey = hierarchy.subject_name.toLowerCase();
    if (!subjectGroups.has(subjectKey)) {
      subjectGroups.set(subjectKey, []);
    }
    subjectGroups.get(subjectKey).push(hierarchy);
  });
  
  // Analyze each subject group for potential conflicts
  let totalConflicts = 0;
  
  subjectGroups.forEach((hierarchies, subjectName) => {
    // Topics within same subject that might be confused
    const topicNames = new Set();
    hierarchies.forEach(h => {
      topicNames.add(h.topic_name.toLowerCase());
    });
    
    // Check for similar topic names
    const topicArray = Array.from(topicNames);
    for (let i = 0; i < topicArray.length; i++) {
      for (let j = i + 1; j < topicArray.length; j++) {
        const topic1 = topicArray[i];
        const topic2 = topicArray[j];
        
        // Check if topics are semantically similar (potential confusion)
        if (areTopicsSimilar(topic1, topic2)) {
          const conflictKey = `${topic1}|${topic2}`;
          conflictMap.set(conflictKey, {
            topic1,
            topic2,
            subject: subjectName,
            reason: 'similar_names'
          });
          totalConflicts++;
        }
      }
    }
  });
  
  console.log(`✅ Found ${totalConflicts} potential conflicts across ${subjectGroups.size} subjects`);
  
  return conflictMap;
}

/**
 * Check if two topics are similar enough to be confused
 * Uses multiple heuristics
 */
function areTopicsSimilar(topic1, topic2) {
  // Same topic - not a conflict
  if (topic1 === topic2) return false;
  
  // One contains the other (e.g., "Java" in "JavaScript")
  if (topic1.includes(topic2) || topic2.includes(topic1)) {
    // Check if it's a genuine conflict or just versioning
    if (isVersioningRelated(topic1, topic2)) {
      return false; // "React 16" vs "React 18" - not a conflict
    }
    return true; // "Java" vs "JavaScript" - conflict!
  }
  
  // Check for common word prefixes/suffixes that indicate different tech
  if (hasConflictingModifiers(topic1, topic2)) {
    return true;
  }
  
  return false;
}

/**
 * Check if topics are version-related (not a conflict)
 */
function isVersioningRelated(topic1, topic2) {
  const versionPattern = /\d+(\.\d+)?/;
  const hasVersion1 = versionPattern.test(topic1);
  const hasVersion2 = versionPattern.test(topic2);
  
  if (hasVersion1 && hasVersion2) {
    const base1 = topic1.replace(versionPattern, '').trim();
    const base2 = topic2.replace(versionPattern, '').trim();
    return base1 === base2; // Same base, different versions
  }
  
  return false;
}

/**
 * Check for conflicting modifiers (NoSQL vs SQL, Node.js vs Express)
 */
function hasConflictingModifiers(topic1, topic2) {
  const conflictingPrefixes = [
    ['no', ''],      // NoSQL vs SQL
    ['non', ''],     // Non-relational vs Relational
  ];
  
  for (const [prefix1, prefix2] of conflictingPrefixes) {
    if (topic1.startsWith(prefix1) && topic2.startsWith(prefix2)) {
      const base1 = topic1.substring(prefix1.length);
      const base2 = topic2.substring(prefix2.length);
      if (base1 === base2) return true;
    }
  }
  
  return false;
}

/**
 * INTELLIGENT SIMILARITY CALCULATION
 * Uses AI prompt to determine if two hierarchies should match
 */
function calculateIntelligentSimilarity(
  aiSuggestion,
  candidateHierarchy,
  questionContext,
  conflictMap
) {
  const aiTopic = aiSuggestion.topic.toLowerCase();
  const candidateTopic = candidateHierarchy.topic_name.toLowerCase();
  
  // Exact match - highest score
  if (aiTopic === candidateTopic) {
    return 100;
  }
  
  // Check dynamic conflict map
  const conflictKey1 = `${aiTopic}|${candidateTopic}`;
  const conflictKey2 = `${candidateTopic}|${aiTopic}`;
  
  if (conflictMap.has(conflictKey1) || conflictMap.has(conflictKey2)) {
    // Potential conflict detected
    // Use question context to determine if it's a real conflict
    const isRealConflict = detectConflictFromContext(
      questionContext,
      aiTopic,
      candidateTopic
    );
    
    if (isRealConflict) {
      console.log(`⚠️  CONFLICT: "${aiTopic}" vs "${candidateTopic}" in question context`);
      return 0; // Block this match
    }
  }
  
  // Fuzzy matching for non-conflicting cases
  return calculateBasicSimilarity(aiTopic, candidateTopic);
}

/**
 * Detect conflicts from question context
 * Looks for technology-specific keywords in the question
 */
function detectConflictFromContext(questionText, topic1, topic2) {
  const question = questionText.toLowerCase();
  
  // Extract technology keywords from question
  const tech1Keywords = extractTechKeywords(topic1);
  const tech2Keywords = extractTechKeywords(topic2);
  
  // Count keyword matches in question
  let topic1Matches = 0;
  let topic2Matches = 0;
  
  tech1Keywords.forEach(keyword => {
    if (question.includes(keyword)) topic1Matches++;
  });
  
  tech2Keywords.forEach(keyword => {
    if (question.includes(keyword)) topic2Matches++;
  });
  
  // If one technology has significantly more matches, it's a conflict
  if (topic1Matches > 0 && topic2Matches === 0) {
    return true; // topic1 is in question, topic2 is not - conflict!
  }
  
  if (topic2Matches > 0 && topic1Matches === 0) {
    return true; // topic2 is in question, topic1 is not - conflict!
  }
  
  // Check for explicit technology mentions
  if (question.includes(topic1) && !question.includes(topic2)) {
    return true;
  }
  
  if (question.includes(topic2) && !question.includes(topic1)) {
    return true;
  }
  
  return false; // Not enough evidence for conflict
}

/**
 * Extract technology-specific keywords
 */
function extractTechKeywords(techName) {
  const keywords = [techName];
  
  // Add common variations
  const variations = {
    'javascript': ['js', 'ecmascript', 'node', 'browser'],
    'java': ['jvm', 'spring', 'maven', 'gradle', 'class'],
    'python': ['py', 'django', 'flask', 'pandas', 'numpy', 'def', 'import'],
    'react': ['jsx', 'usestate', 'useeffect', 'component', 'hooks'],
    'angular': ['ng', 'typescript', 'directive', 'ngrx'],
    'vue': ['vue.js', 'vuex', 'v-model', 'composition'],
    'sql': ['select', 'join', 'where', 'relational'],
    'nosql': ['document', 'collection', 'key-value'],
    'mysql': ['mysql', 'mariadb'],
    'postgresql': ['postgres', 'psql'],
    'mongodb': ['mongo', 'bson', 'document'],
    'django': ['django', 'orm', 'models.py'],
    'flask': ['flask', 'route', 'decorator'],
    'express': ['express.js', 'middleware', 'app.use'],
    'aws': ['ec2', 's3', 'lambda', 'amazon'],
    'azure': ['microsoft', 'azure functions'],
    'docker': ['dockerfile', 'container', 'image'],
    'kubernetes': ['k8s', 'pod', 'kubectl'],
    'git': ['commit', 'branch', 'merge'],
    'github': ['pull request', 'repository'],
    'rest': ['restful', 'get', 'post', 'endpoint'],
    'graphql': ['query', 'mutation', 'schema']
  };
  
  const lowerTech = techName.toLowerCase();
  if (variations[lowerTech]) {
    keywords.push(...variations[lowerTech]);
  }
  
  return keywords;
}

/**
 * Calculate basic similarity (for non-conflicting cases)
 */
function calculateBasicSimilarity(str1, str2) {
  // Contains match
  if (str1.includes(str2) || str2.includes(str1)) {
    return 85;
  }
  
  // Word overlap
  const words1 = str1.split(/[\s-_]+/);
  const words2 = str2.split(/[\s-_]+/);
  
  let commonWords = 0;
  words1.forEach(w1 => {
    if (words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))) {
      commonWords++;
    }
  });
  
  const wordOverlapScore = (commonWords / Math.max(words1.length, words2.length)) * 80;
  
  // Levenshtein distance
  const levenshteinScore = (1 - (levenshteinDistance(str1, str2) / Math.max(str1.length, str2.length))) * 70;
  
  return Math.max(wordOverlapScore, levenshteinScore);
}

/**
 * Levenshtein distance calculation
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
 * Build hierarchy maps with semantic analysis
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
      
      const key = `${subject.name}|${topic.name}|${subTopic.name}`.toLowerCase();
      hierarchyMap.set(key, hierarchyData);
      allHierarchies.push(hierarchyData);

      const topicKey = `${subject.name}|${topic.name}`.toLowerCase();
      if (!topicSubTopicsMap.has(topicKey)) {
        topicSubTopicsMap.set(topicKey, []);
      }
      topicSubTopicsMap.get(topicKey).push(hierarchyData);
    }
  });

  // Build semantic conflict map dynamically
  const conflictMap = buildSemanticConflictMap(allHierarchies);

  return { hierarchyMap, topicSubTopicsMap, allHierarchies, conflictMap };
}

/**
 * Match hierarchy with intelligent disambiguation
 */
export function matchHierarchy(aiResult, hierarchyMap, topicSubTopicsMap, allHierarchies, conflictMap, questionText = "") {
  console.log(`\n🔍 Matching AI Result:`, {
    subject: aiResult.subject,
    topic: aiResult.topic,
    sub_topic: aiResult.sub_topic,
    confidence: aiResult.confidence
  });

  // Try exact match first
  const exactKey = `${aiResult.subject}|${aiResult.topic}|${aiResult.sub_topic}`.toLowerCase();
  let matchedHierarchy = hierarchyMap.get(exactKey);
  let matchType = "exact";
  let matchScore = 100;

  if (matchedHierarchy) {
    console.log(`✅ EXACT MATCH FOUND`);
    return buildMatchResult(matchedHierarchy, aiResult, matchType, matchScore);
  }

  // Intelligent fuzzy matching
  const candidates = [];
  
  allHierarchies.forEach(hierarchy => {
    // Use intelligent similarity that considers conflicts
    const subjectScore = calculateIntelligentSimilarity(
      { topic: aiResult.subject },
      { topic_name: hierarchy.subject_name },
      questionText,
      conflictMap
    );
    
    const topicScore = calculateIntelligentSimilarity(
      { topic: aiResult.topic },
      { topic_name: hierarchy.topic_name },
      questionText,
      conflictMap
    );
    
    const subTopicScore = calculateIntelligentSimilarity(
      { topic: aiResult.sub_topic },
      { topic_name: hierarchy.sub_topic_name },
      questionText,
      conflictMap
    );
    
    // Weighted scoring with emphasis on topic (40%)
    let totalScore = (subjectScore * 0.30) + (topicScore * 0.40) + (subTopicScore * 0.30);
    
    candidates.push({
      hierarchy,
      totalScore,
      subjectScore,
      topicScore,
      subTopicScore
    });
  });

  candidates.sort((a, b) => b.totalScore - a.totalScore);
  
  const bestMatch = candidates[0];
  
  console.log(`📊 Top 3 Candidates:`);
  candidates.slice(0, 3).forEach((c, idx) => {
    console.log(`  ${idx + 1}. [${c.totalScore.toFixed(1)}%] ${c.hierarchy.subject_name} → ${c.hierarchy.topic_name} → ${c.hierarchy.sub_topic_name}`);
  });

  // Determine match type
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

  console.log(`✅ BEST MATCH: [${matchScore.toFixed(1)}%] ${bestMatch.hierarchy.subject_name} → ${bestMatch.hierarchy.topic_name} → ${bestMatch.hierarchy.sub_topic_name}`);

  return buildMatchResult(bestMatch.hierarchy, aiResult, matchType, matchScore);
}

/**
 * Build match result
 */
function buildMatchResult(matchedHierarchy, aiResult, matchType, matchScore) {
  const adjustedConfidence = calculateAdjustedConfidence(
    aiResult.confidence || 75,
    matchType,
    matchScore
  );

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
 * Calculate adjusted confidence
 */
function calculateAdjustedConfidence(originalConfidence, matchType, matchScore) {
  let baseConfidence = originalConfidence;
  
  const typeAdjustments = {
    exact: 0,
    fuzzy_high_confidence: -5,
    fuzzy_medium_confidence: -15,
    fuzzy_low_confidence: -30,
    fallback_best_available: -40
  };

  const typeAdjustment = typeAdjustments[matchType] || -45;
  
  let scoreAdjustment = 0;
  if (matchScore < 85) {
    scoreAdjustment = -((85 - matchScore) * 0.3);
  }

  const adjusted = baseConfidence + typeAdjustment + scoreAdjustment;

  return Math.max(30, Math.min(100, Math.round(adjusted)));
}

export { calculateIntelligentSimilarity };