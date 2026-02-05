// services/metadataLangGraphService.js - REAL LangGraph Implementation
import { StateGraph, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { buildHierarchyMaps, matchHierarchy } from "../utils/intelligentHierarchyMatcher.js";
import dotenv from "dotenv";

dotenv.config();

// Initialize LLM
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.1,
});

/**
 * STATE DEFINITION
 * This is the shared state that flows through the graph
 */
class MetadataAnalysisState {
  constructor() {
    this.question = null;
    this.questionId = null;
    this.agent1Classification = null;
    this.agent2Classification = null;
    this.agent3Classification = null;
    this.finalClassification = null;
    this.agentAgreement = null;
    this.validationStatus = null;
    this.hierarchyMap = null;
    this.topicSubTopicsMap = null;
    this.allHierarchies = null;
    this.conflictMap = null; // NEW: Dynamic conflict detection
    this.hierarchicalOptions = null;
    this.errors = [];
  }
}

/**
 * AGENT 1 NODE: Primary Classifier
 */
async function agent1ClassifyNode(state) {
  console.log(`  🤖 AGENT 1: Classifying question ${state.questionId}`);
  
  const prompt = `You are AGENT 1: Primary Technology Classifier.

YOUR MISSION: Identify the PRIMARY technology being tested and classify accurately.

AVAILABLE HIERARCHIES:
${state.hierarchicalOptions}

QUESTION:
${state.question}

CRITICAL RULES:
1. Extract PRIMARY technology (React, Java, Python, etc.)
2. Match to most specific hierarchy
3. JavaScript ≠ Java, React ≠ Angular, Python ≠ Java

OUTPUT (JSON ONLY):
{
  "subject": "exact_subject_name",
  "topic": "exact_topic_name",
  "sub_topic": "exact_subtopic_name",
  "confidence": 85,
  "primary_technology": "React",
  "reason": "Question tests React hooks"
}`;

  try {
    const response = await llm.invoke([
      new SystemMessage("You are a metadata classification expert. Always respond with valid JSON."),
      new HumanMessage(prompt)
    ]);
    
    const content = response.content.replace(/```json\n?|\n?```/g, '').trim();
    const classification = JSON.parse(content);
    
    state.agent1Classification = classification;
    console.log(`    ✅ Agent 1: ${classification.subject} → ${classification.topic} → ${classification.sub_topic} (${classification.confidence}%)`);
    
    return state;
  } catch (error) {
    console.error(`    ❌ Agent 1 failed:`, error.message);
    state.errors.push({ agent: "agent1", error: error.message });
    return state;
  }
}

/**
 * AGENT 2 NODE: Validator & Corrector
 */
async function agent2ValidateNode(state) {
  console.log(`  🔍 AGENT 2: Validating Agent 1's classification`);
  
  if (!state.agent1Classification) {
    console.log(`    ⚠️  No Agent 1 classification to validate`);
    return state;
  }
  
  const prompt = `You are AGENT 2: Classification Validator.

QUESTION:
${state.question}

AGENT 1 CLASSIFIED AS:
${JSON.stringify(state.agent1Classification, null, 2)}

YOUR TASK:
1. Verify if Agent 1 is correct
2. Check for JavaScript/Java, React/Angular confusion
3. Either APPROVE or CORRECT the classification

AVAILABLE HIERARCHIES:
${state.hierarchicalOptions}

OUTPUT (JSON ONLY):
{
  "status": "APPROVED" | "CORRECTED",
  "subject": "exact_subject_name",
  "topic": "exact_topic_name",
  "sub_topic": "exact_subtopic_name",
  "confidence": 90,
  "validation_reason": "Agent 1 correct" OR "Corrected: was Java, should be JavaScript"
}`;

  try {
    const response = await llm.invoke([
      new SystemMessage("You are a validation expert. Always respond with valid JSON."),
      new HumanMessage(prompt)
    ]);
    
    const content = response.content.replace(/```json\n?|\n?```/g, '').trim();
    const validation = JSON.parse(content);
    
    state.agent2Classification = validation;
    state.validationStatus = validation.status;
    
    console.log(`    ✅ Agent 2: ${validation.status} - ${validation.subject} → ${validation.topic} → ${validation.sub_topic} (${validation.confidence}%)`);
    
    return state;
  } catch (error) {
    console.error(`    ❌ Agent 2 failed:`, error.message);
    state.errors.push({ agent: "agent2", error: error.message });
    return state;
  }
}

/**
 * CONDITIONAL ROUTER: Determines if Agent 3 is needed
 */
function shouldCallAgent3(state) {
  // Check if both agents provided classifications
  if (!state.agent1Classification || !state.agent2Classification) {
    console.log(`    → Route: agent3 (missing classifications)`);
    return "agent3";
  }
  
  // Check if agents agree on classification
  const agent1 = state.agent1Classification;
  const agent2 = state.agent2Classification;
  
  const agree = (
    agent1.subject === agent2.subject &&
    agent1.topic === agent2.topic &&
    agent1.sub_topic === agent2.sub_topic
  );
  
  if (agree) {
    console.log(`    → Route: fuzzy_match (agents agree)`);
    state.agentAgreement = true;
    return "fuzzy_match";
  }
  
  // Check confidence difference
  const confidenceDiff = Math.abs(agent1.confidence - agent2.confidence);
  
  if (confidenceDiff > 20) {
    console.log(`    → Route: agent3 (confidence diff: ${confidenceDiff})`);
    state.agentAgreement = false;
    return "agent3";
  }
  
  // Agent 2 has priority (corrected classification)
  if (state.validationStatus === "CORRECTED") {
    console.log(`    → Route: fuzzy_match (Agent 2 corrected)`);
    state.agentAgreement = false;
    return "fuzzy_match";
  }
  
  console.log(`    → Route: fuzzy_match (using Agent 2)`);
  state.agentAgreement = false;
  return "fuzzy_match";
}

/**
 * AGENT 3 NODE: Reconciliation
 */
async function agent3ReconcileNode(state) {
  console.log(`  ⚖️  AGENT 3: Reconciling conflict`);
  
  const prompt = `You are AGENT 3: Conflict Resolution Specialist.

QUESTION:
${state.question}

AGENT 1 SAYS:
${JSON.stringify(state.agent1Classification, null, 2)}

AGENT 2 SAYS:
${JSON.stringify(state.agent2Classification, null, 2)}

YOUR TASK: Determine the correct classification by carefully analyzing the question.

AVAILABLE HIERARCHIES:
${state.hierarchicalOptions}

OUTPUT (JSON ONLY):
{
  "subject": "final_subject_name",
  "topic": "final_topic_name",
  "sub_topic": "final_subtopic_name",
  "confidence": 92,
  "chosen_agent": "Agent 1" | "Agent 2" | "Agent 3 (Own Analysis)",
  "reason": "Why this classification is correct"
}`;

  try {
    const response = await llm.invoke([
      new SystemMessage("You are a conflict resolution expert. Always respond with valid JSON."),
      new HumanMessage(prompt)
    ]);
    
    const content = response.content.replace(/```json\n?|\n?```/g, '').trim();
    const reconciliation = JSON.parse(content);
    
    state.agent3Classification = reconciliation;
    
    console.log(`    ✅ Agent 3: ${reconciliation.subject} → ${reconciliation.topic} → ${reconciliation.sub_topic} (${reconciliation.confidence}%)`);
    console.log(`    📌 Chose: ${reconciliation.chosen_agent}`);
    
    return state;
  } catch (error) {
    console.error(`    ❌ Agent 3 failed:`, error.message);
    state.errors.push({ agent: "agent3", error: error.message });
    // Fallback: use Agent 2's classification
    state.agent3Classification = state.agent2Classification;
    return state;
  }
}

/**
 * FUZZY MATCH NODE: Map to actual hierarchy
 */
function fuzzyMatchNode(state) {
  console.log(`  🎯 FUZZY MATCHING: Mapping to actual hierarchy`);
  
  // Determine which classification to use
  let classificationToUse;
  if (state.agent3Classification) {
    classificationToUse = state.agent3Classification;
  } else if (state.agent2Classification) {
    classificationToUse = state.agent2Classification;
  } else if (state.agent1Classification) {
    classificationToUse = state.agent1Classification;
  } else {
    console.error(`    ❌ No classifications available!`);
    return state;
  }
  
  // Perform fuzzy matching with question context and conflict map
  const matchedData = matchHierarchy(
    classificationToUse,
    state.hierarchyMap,
    state.topicSubTopicsMap,
    state.allHierarchies,
    state.conflictMap,
    state.question // Pass question text for context-based disambiguation
  );
  
  // Build final result
  state.finalClassification = {
    q_id: state.questionId,
    suggested_subject_id: matchedData.suggested_subject_id,
    suggested_subject_name: matchedData.suggested_subject_name,
    suggested_topic_id: matchedData.suggested_topic_id,
    suggested_topic_name: matchedData.suggested_topic_name,
    suggested_sub_topic_id: matchedData.suggested_sub_topic_id,
    suggested_sub_topic_name: matchedData.suggested_sub_topic_name,
    confidence: matchedData.confidence,
    reasoning: matchedData.reasoning,
    match_type: matchedData.match_type,
    match_score: matchedData.match_score,
    agent_agreement: state.agentAgreement,
    validation_status: state.validationStatus,
    agent1_confidence: state.agent1Classification?.confidence,
    agent2_confidence: state.agent2Classification?.confidence,
    agent3_used: !!state.agent3Classification
  };
  
  console.log(`    ✅ Final: ${state.finalClassification.suggested_subject_name} → ${state.finalClassification.suggested_topic_name} → ${state.finalClassification.suggested_sub_topic_name}`);
  console.log(`    📊 Confidence: ${state.finalClassification.confidence}% | Match: ${state.finalClassification.match_type}\n`);
  
  return state;
}

/**
 * BUILD THE LANGGRAPH STATE GRAPH
 */
function buildMetadataGraph() {
  const workflow = new StateGraph({
    channels: {
      question: null,
      questionId: null,
      agent1Classification: null,
      agent2Classification: null,
      agent3Classification: null,
      finalClassification: null,
      agentAgreement: null,
      validationStatus: null,
      hierarchyMap: null,
      topicSubTopicsMap: null,
      allHierarchies: null,
      conflictMap: null, // NEW: Dynamic conflict map
      hierarchicalOptions: null,
      errors: []
    }
  });
  
  // Add nodes
  workflow.addNode("agent1", agent1ClassifyNode);
  workflow.addNode("agent2", agent2ValidateNode);
  workflow.addNode("agent3", agent3ReconcileNode);
  workflow.addNode("fuzzy_match", fuzzyMatchNode);
  
  // Set entry point
  workflow.setEntryPoint("agent1");
  
  // Add edges
  workflow.addEdge("agent1", "agent2");
  
  // Conditional edge from agent2
  workflow.addConditionalEdges(
    "agent2",
    shouldCallAgent3,
    {
      "agent3": "agent3",
      "fuzzy_match": "fuzzy_match"
    }
  );
  
  // Edge from agent3 to fuzzy_match
  workflow.addEdge("agent3", "fuzzy_match");
  
  // Edge from fuzzy_match to END
  workflow.addEdge("fuzzy_match", END);
  
  return workflow.compile();
}

/**
 * MAIN ANALYSIS FUNCTION
 */
export async function analyzeMetadataWithLangGraph(
  questions, 
  availableSubjects, 
  availableTopics, 
  availableSubTopics
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🤖 REAL LANGGRAPH METADATA ANALYSIS`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Build hierarchy maps with intelligent conflict detection
  console.log(`📊 Building hierarchy maps...`);
  const { hierarchyMap, topicSubTopicsMap, allHierarchies, conflictMap } = buildHierarchyMaps(
    availableSubjects,
    availableTopics,
    availableSubTopics
  );
  
  const hierarchicalOptions = Array.from(hierarchyMap.values())
    .slice(0, 50)
    .map(h => `${h.subject_name} → ${h.topic_name} → ${h.sub_topic_name}`)
    .join("\n");
  
  console.log(`📚 Hierarchy Stats:`);
  console.log(`   Hierarchies: ${allHierarchies.length}`);
  console.log(`   Subjects: ${availableSubjects.length}`);
  console.log(`   Topics: ${availableTopics.length}`);
  console.log(`   SubTopics: ${availableSubTopics.length}\n`);
  
  // Compile the graph
  const graph = buildMetadataGraph();
  
  console.log(`🎯 Processing ${questions.length} questions through LangGraph...\n`);
  
  const allResults = [];
  
  // Process each question through the graph
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const questionText = question.question_data?.replace(/<[^>]*>/g, '').substring(0, 200) || "";
    
    console.log(`${'─'.repeat(80)}`);
    console.log(`📝 Question ${i + 1}/${questions.length}: ${question.q_id}`);
    console.log(`   "${questionText.substring(0, 80)}..."`);
    
    // Initialize state
    const initialState = {
      question: questionText,
      questionId: question.q_id,
      agent1Classification: null,
      agent2Classification: null,
      agent3Classification: null,
      finalClassification: null,
      agentAgreement: null,
      validationStatus: null,
      hierarchyMap,
      topicSubTopicsMap,
      allHierarchies,
      conflictMap, // NEW: Pass conflict map
      hierarchicalOptions,
      errors: []
    };
    
    try {
      // Run the graph
      const result = await graph.invoke(initialState);
      
      if (result.finalClassification) {
        allResults.push({
          ...result.finalClassification,
          question_preview: questionText.substring(0, 100)
        });
      } else {
        console.error(`    ❌ No final classification produced`);
        // Fallback
        allResults.push(createFallbackClassification(question, allHierarchies));
      }
      
    } catch (error) {
      console.error(`    ❌ Graph execution failed:`, error.message);
      allResults.push(createFallbackClassification(question, allHierarchies));
    }
    
    // Rate limiting
    if (i < questions.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  
  // Generate statistics
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎉 LANGGRAPH ANALYSIS COMPLETE`);
  console.log(`${'='.repeat(80)}`);
  console.log(generateStatistics(allResults));
  
  return allResults;
}

/**
 * Create fallback classification
 */
function createFallbackClassification(question, allHierarchies) {
  const fallback = allHierarchies[0] || {
    subject_id: "unknown",
    subject_name: "Programming",
    topic_id: "unknown",
    topic_name: "General",
    sub_topic_id: "unknown",
    sub_topic_name: "Basics"
  };
  
  return {
    q_id: question.q_id,
    question_preview: question.question_data?.replace(/<[^>]*>/g, '').substring(0, 100) || "N/A",
    suggested_subject_id: fallback.subject_id,
    suggested_subject_name: fallback.subject_name,
    suggested_topic_id: fallback.topic_id,
    suggested_topic_name: fallback.topic_name,
    suggested_sub_topic_id: fallback.sub_topic_id,
    suggested_sub_topic_name: fallback.sub_topic_name,
    confidence: 30,
    reasoning: "Fallback classification due to error",
    match_type: "fallback",
    match_score: 30,
    agent_agreement: null,
    validation_status: null
  };
}

/**
 * Generate statistics
 */
function generateStatistics(results) {
  const stats = {
    total: results.length,
    highConfidence: results.filter(r => r.confidence >= 80).length,
    mediumConfidence: results.filter(r => r.confidence >= 60 && r.confidence < 80).length,
    lowConfidence: results.filter(r => r.confidence < 60).length,
    agentAgreement: results.filter(r => r.agent_agreement === true).length,
    agentDisagreement: results.filter(r => r.agent_agreement === false).length,
    agent3Used: results.filter(r => r.agent3_used === true).length,
    approved: results.filter(r => r.validation_status === "APPROVED").length,
    corrected: results.filter(r => r.validation_status === "CORRECTED").length
  };
  
  return `
📊 STATISTICS:
   Total: ${stats.total}
   
   Confidence:
   ✅ High (≥80%):   ${stats.highConfidence} (${((stats.highConfidence/stats.total)*100).toFixed(1)}%)
   ⚠️  Medium (60-79%): ${stats.mediumConfidence} (${((stats.mediumConfidence/stats.total)*100).toFixed(1)}%)
   ❌ Low (<60%):    ${stats.lowConfidence} (${((stats.lowConfidence/stats.total)*100).toFixed(1)}%)
   
   Agent Workflow:
   🤝 Agreed:      ${stats.agentAgreement} (${((stats.agentAgreement/stats.total)*100).toFixed(1)}%)
   ⚔️  Disagreed:   ${stats.agentDisagreement} (${((stats.agentDisagreement/stats.total)*100).toFixed(1)}%)
   ⚖️  Agent 3 Used: ${stats.agent3Used} (${((stats.agent3Used/stats.total)*100).toFixed(1)}%)
   
   Validation:
   ✓ Approved:  ${stats.approved} (${((stats.approved/stats.total)*100).toFixed(1)}%)
   ✎ Corrected: ${stats.corrected} (${((stats.corrected/stats.total)*100).toFixed(1)}%)
`;
}