// test/testHierarchyMatching.js - Test Script for Enhanced Matching
import { buildHierarchyMaps, matchHierarchy } from "../utils/hierarchyMatcher.js";

// Sample test data
const mockSubjects = [
  { subject_id: "s1", name: "MEAN and MERN" },
  { subject_id: "s2", name: "Java Full Stack Development" },
  { subject_id: "s3", name: "Programming" }
];

const mockTopics = [
  { topic_id: "t1", subject_id: "s1", name: "React" },
  { topic_id: "t2", subject_id: "s2", name: "Developing Web Application using Angular" },
  { topic_id: "t3", subject_id: "s3", name: "Web Technology" },
  { topic_id: "t4", subject_id: "s3", name: "Python" }
];

const mockSubTopics = [
  { sub_topic_id: "st1", topic_id: "t1", name: "React - Programming" },
  { sub_topic_id: "st2", topic_id: "t2", name: "Promises" },
  { sub_topic_id: "st3", topic_id: "t3", name: "Java script" },
  { sub_topic_id: "st4", topic_id: "t4", name: "Exception Handling" }
];

// Test cases from user's examples
const testCases = [
  {
    name: "React Form Question",
    aiResult: {
      subject: "MEAN and MERN",
      topic: "React",
      sub_topic: "React Forms",
      confidence: 85,
      reason: "Question mentions React form"
    },
    expectedSubject: "MEAN and MERN",
    expectedTopic: "React",
    expectedConfidence: ">= 75"
  },
  {
    name: "JavaScript Code Question",
    aiResult: {
      subject: "Programming",
      topic: "Web Technology",
      sub_topic: "JavaScript Code",
      confidence: 80,
      reason: "JavaScript code output question"
    },
    expectedSubject: "Programming",
    expectedTopic: "Web Technology",
    expectedConfidence: ">= 70"
  },
  {
    name: "Exact Match Test",
    aiResult: {
      subject: "MEAN and MERN",
      topic: "React",
      sub_topic: "React - Programming",
      confidence: 90,
      reason: "Exact hierarchy match"
    },
    expectedSubject: "MEAN and MERN",
    expectedTopic: "React",
    expectedSubTopic: "React - Programming",
    expectedConfidence: "90"
  }
];

// Run tests
console.log("🧪 Running Hierarchy Matching Tests\n");
console.log("=".repeat(80));

// Build hierarchy maps
const { hierarchyMap, topicSubTopicsMap, allHierarchies } = buildHierarchyMaps(
  mockSubjects,
  mockTopics,
  mockSubTopics
);

console.log(`\n📚 Test Data Loaded:`);
console.log(`   Subjects: ${mockSubjects.length}`);
console.log(`   Topics: ${mockTopics.length}`);
console.log(`   SubTopics: ${mockSubTopics.length}`);
console.log(`   Total Hierarchies: ${allHierarchies.length}\n`);
console.log("=".repeat(80));

// Run each test case
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n📝 Test ${index + 1}: ${testCase.name}`);
  console.log("-".repeat(80));
  
  console.log(`\n🤖 AI Suggested:`);
  console.log(`   ${testCase.aiResult.subject} → ${testCase.aiResult.topic} → ${testCase.aiResult.sub_topic}`);
  console.log(`   Confidence: ${testCase.aiResult.confidence}%`);
  
  // Run matching
  const result = matchHierarchy(
    testCase.aiResult,
    hierarchyMap,
    topicSubTopicsMap,
    allHierarchies
  );
  
  console.log(`\n✅ Matched Result:`);
  console.log(`   ${result.suggested_subject_name} → ${result.suggested_topic_name} → ${result.suggested_sub_topic_name}`);
  console.log(`   Confidence: ${result.confidence}%`);
  console.log(`   Match Type: ${result.match_type}`);
  console.log(`   Match Score: ${result.match_score}%`);
  console.log(`   Reasoning: ${result.reasoning}`);
  
  // Validate results
  console.log(`\n🔍 Validation:`);
  let testPassed = true;
  
  // Check subject
  if (result.suggested_subject_name === testCase.expectedSubject) {
    console.log(`   ✅ Subject: ${result.suggested_subject_name}`);
  } else {
    console.log(`   ❌ Subject: Expected "${testCase.expectedSubject}", got "${result.suggested_subject_name}"`);
    testPassed = false;
  }
  
  // Check topic
  if (result.suggested_topic_name === testCase.expectedTopic) {
    console.log(`   ✅ Topic: ${result.suggested_topic_name}`);
  } else {
    console.log(`   ❌ Topic: Expected "${testCase.expectedTopic}", got "${result.suggested_topic_name}"`);
    testPassed = false;
  }
  
  // Check subtopic if specified
  if (testCase.expectedSubTopic) {
    if (result.suggested_sub_topic_name === testCase.expectedSubTopic) {
      console.log(`   ✅ SubTopic: ${result.suggested_sub_topic_name}`);
    } else {
      console.log(`   ⚠️  SubTopic: Expected "${testCase.expectedSubTopic}", got "${result.suggested_sub_topic_name}"`);
    }
  }
  
  // Check confidence
  if (testCase.expectedConfidence === "90") {
    if (result.confidence === 90) {
      console.log(`   ✅ Confidence: ${result.confidence}%`);
    } else {
      console.log(`   ⚠️  Confidence: Expected ${testCase.expectedConfidence}%, got ${result.confidence}%`);
    }
  } else if (testCase.expectedConfidence.startsWith(">=")) {
    const minConfidence = parseInt(testCase.expectedConfidence.split(" ")[1]);
    if (result.confidence >= minConfidence) {
      console.log(`   ✅ Confidence: ${result.confidence}% (>= ${minConfidence}%)`);
    } else {
      console.log(`   ❌ Confidence: Expected >= ${minConfidence}%, got ${result.confidence}%`);
      testPassed = false;
    }
  }
  
  if (testPassed) {
    console.log(`\n✅ TEST PASSED`);
    passed++;
  } else {
    console.log(`\n❌ TEST FAILED`);
    failed++;
  }
  
  console.log("=".repeat(80));
});

// Final summary
console.log(`\n📊 Test Summary:`);
console.log(`   Total Tests: ${testCases.length}`);
console.log(`   Passed: ${passed} ✅`);
console.log(`   Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
console.log(`   Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log(`\n🎉 All tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Review the output above.`);
}