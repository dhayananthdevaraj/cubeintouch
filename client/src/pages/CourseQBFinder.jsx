
import { useState, useEffect } from "react";
import { DEPARTMENT_IDS } from "../config";
import "./CourseQBFinder.css";

const API = "https://api.examly.io";

export default function CourseQBFinder() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("examly_token") || "";
    } catch {
      return "";
    }
  });
  const [ui, setUI] = useState(token ? "search" : "welcome");
  const [courseName, setCourseName] = useState("");
  const [status, setStatus] = useState("");
  const [alert, setAlert] = useState(null);
  const [moduleTree, setModuleTree] = useState([]);
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [selectedTests, setSelectedTests] = useState(new Set());
  const [qbResults, setQbResults] = useState([]);
  const [tokenInput, setTokenInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [selectedQB, setSelectedQB] = useState(null);
  const [qbQuestions, setQbQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [testQuestionMap, setTestQuestionMap] = useState({});
  const [clonedQuestions, setClonedQuestions] = useState([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveSearchTerm, setMoveSearchTerm] = useState("");
  const [moveSearchResults, setMoveSearchResults] = useState([]);
  const [selectedTargetQB, setSelectedTargetQB] = useState(null);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [allQuestions, setAllQuestions] = useState([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState(new Set());
  const [allQuestionIdsBeforeClone, setAllQuestionIdsBeforeClone] = useState([]);
  const [showWeekDropdown, setShowWeekDropdown] = useState(false);
  
  // Range selection state
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [rangeFilter, setRangeFilter] = useState('all');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    searchText: "",
    difficulty: "all",
    clonedStatus: "all",
    usedStatus: "all"
  });

  useEffect(() => {
    if (token) setUI("search");
    else setUI("welcome");
  }, [token]);

  const showAlert = (msg, type = "warning") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const showOverlay = (msg) => {
    setOverlayText(msg);
    setOverlay(true);
  };

  const hideOverlay = () => setOverlay(false);

  const saveToken = () => {
    if (!tokenInput.trim()) {
      showAlert("Token cannot be empty", "danger");
      return;
    }
    try {
      localStorage.setItem("examly_token", tokenInput.trim());
      setToken(tokenInput.trim());
      setTokenInput("");
      setUI("search");
      showAlert("Token saved successfully!", "success");
    } catch (err) {
      showAlert("Failed to save token: " + err.message, "danger");
    }
  };

  const clearToken = () => {
    try {
      localStorage.removeItem("examly_token");
    } catch (err) {
      console.error("Failed to clear token:", err);
    }
    setToken("");
    setUI("welcome");
    setTokenInput("");
    setModuleTree([]);
    setSelectedTests(new Set());
    setQbResults([]);
    showAlert("Token cleared", "danger");
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Copy to clipboard helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showAlert("📋 Copied to clipboard!", "success");
    }).catch(() => {
      showAlert("Failed to copy", "danger");
    });
  };

  async function findCourseByName(name) {
    const res = await fetch(`${API}/api/v2/courses/filter`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mainDepartmentUser: true,
        page: 1,
        limit: 100,
        search: name,
        department_id: DEPARTMENT_IDS,
        branch_id: [],
        batch_id: "All",
        publishType: [],
        publisherCourseOnly: false,
        tag_id: []
      })
    });
    const json = await res.json();
    return json?.rows?.[0]?.c_id || json?.rows?.[0]?.$c_id || null;
  }

  async function getCourseDetails(id) {
    const res = await fetch(`${API}/api/v2/course/${id}`, {
      headers: { Authorization: token }
    });
    const json = await res.json();
    return json.course || json;
  }

  async function fetchTestDetailsForModule(t_id) {
    const res = await fetch(`${API}/api/questions/test/${t_id}`, {
      headers: { Authorization: token }
    });
    const json = await res.json();
    return json?.[0]?.non_group_questions || [];
  }

  // NEW: Fetch full test details including test_rules for Rule-Based tests
async function fetchFullTestDetails(t_id) {
  const res = await fetch(`${API}/api/v2/test/${t_id}`, {
    headers: { Authorization: token }
  });
  const json = await res.json();
  return json;
}

// NEW: Extract all unique QB IDs and names from test_rules
function extractQBsFromTestRules(testDetails) {
  const qbMap = new Map();
  
  if (!testDetails?.test_rules || !Array.isArray(testDetails.test_rules)) {
    return qbMap;
  }

  console.log("📋 Extracting QBs from test_rules...");

  testDetails.test_rules.forEach((section, sectionIdx) => {
    if (Array.isArray(section)) {
      section.forEach((blocks, blockIdx) => {
        if (Array.isArray(blocks)) {
          blocks.forEach((block, ruleIdx) => {
            if (block?.questionbank && Array.isArray(block.questionbank)) {
              console.log(`📦 Section ${sectionIdx}, Block ${blockIdx}, Rule ${ruleIdx}: Found ${block.questionbank.length} QBs`);
              
              block.questionbank.forEach(qb => {
                if (qb.qb_id && qb.qb_name) {
                  qbMap.set(qb.qb_id, qb.qb_name);
                  console.log(`  ✅ Added: ${qb.qb_name} (${qb.qb_id})`);
                }
              });
            }
          });
        }
      });
    }
  });

  console.log(`📊 Total unique QBs extracted from test_rules: ${qbMap.size}`);
  return qbMap;
}

  async function getQuestionBanks(qbIdList) {
    if (!qbIdList || qbIdList.length === 0) {
      return [];
    }

    const res = await fetch(`${API}/api/questionbanks/all`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        department_id: DEPARTMENT_IDS,
        qb_id_list: qbIdList,
        isTestPreview: true,
        mainDepartmentUser: true
      })
    });

    const json = await res.json();
    return json?.questionbanks || [];
  }

  async function fetchQBQuestions(qbId) {
    console.log("📥 fetchQBQuestions called for QB:", qbId);
    
    let allQuestions = [];
    let page = 1;
    const limit = 200;
    let hasMore = true;
    
    while (hasMore) {
      const res = await fetch(`${API}/api/v2/questionfilter`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          qb_id: qbId,
          page: page,
          limit: limit,
          type: "Single"
        })
      });

      const json = await res.json();
      const questions = json?.non_group_questions || [];
      
      if (questions.length > 0) {
        allQuestions = [...allQuestions, ...questions];
        console.log(`📄 Page ${page}: Fetched ${questions.length} questions (Total so far: ${allQuestions.length})`);
        
        if (questions.length < limit) {
          hasMore = false;
        } else {
          page++;
          await sleep(300);
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log("📊 Total questions fetched across all pages:", allQuestions.length);
    return allQuestions;
  }

  // NEW: Check if a test is Rule-Based by searching for it
  async function checkIfTestIsRuleBased(testName) {
    try {
      const res = await fetch(`${API}/api/v2/tests/filter`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          page: 1,
          limit: 25,
          search: testName,
          branch_id: "All",
          department_id: DEPARTMENT_IDS,
          mainDepartmentUser: true
        })
      });

      const json = await res.json();
      
      if (json?.data && json.data.length > 0) {
        const test = json.data[0];
        const isRuleBased = test.testType === "Rule Based Test";
        console.log(`🎲 Test "${testName}" - Type: ${test.testType} - Rule Based: ${isRuleBased}`);
        return isRuleBased;
      }
      
      return false;
    } catch (err) {
      console.error(`Error checking test type for ${testName}:`, err);
      return false;
    }
  }

  // NEW: Check if QB has any Rule-Based tests
  // async function checkQBForRuleBasedTests(qbId, questions) {
  //   console.log("🔍 Checking QB for Rule-Based tests...");
    
  //   // Extract unique test names from questions
  //   const testNames = new Set();
  //   questions.forEach(q => {
  //     if (q.question_testName && Array.isArray(q.question_testName)) {
  //       q.question_testName.forEach(name => testNames.add(name));
  //     }
  //   });

  //   console.log(`📋 Found ${testNames.size} unique test names in QB`);
    
  //   if (testNames.size === 0) {
  //     return { hasRuleBased: false, ruleBasedTests: [] };
  //   }

  //   const ruleBasedTests = [];
    
  //   // Check each test (limit to first 10 to avoid too many API calls)
  //   const testNamesArray = Array.from(testNames).slice(0, 10);
    
  //   for (const testName of testNamesArray) {
  //     const isRuleBased = await checkIfTestIsRuleBased(testName);
  //     if (isRuleBased) {
  //       ruleBasedTests.push(testName);
  //     }
  //     await sleep(200); // Rate limiting
  //   }

  //   const hasRuleBased = ruleBasedTests.length > 0;
    
  //   if (hasRuleBased) {
  //     console.log(`🎲 QB has ${ruleBasedTests.length} Rule-Based test(s):`, ruleBasedTests);
  //   } else {
  //     console.log("✅ No Rule-Based tests found in QB");
  //   }

  //   return { hasRuleBased, ruleBasedTests };
  // }

// OPTIMIZED BATCHED VERSION - Checks ALL tests in batches of 3 parallel calls

async function checkQBForRuleBasedTests(qbId, questions) {
  console.log("🔍 Checking QB for Rule-Based tests (BATCHED PARALLEL)...");
  
  // Extract unique test names from questions
  const testNames = new Set();
  questions.forEach(q => {
    if (q.question_testName && Array.isArray(q.question_testName)) {
      q.question_testName.forEach(name => testNames.add(name));
    }
  });

  console.log(`📋 Found ${testNames.size} unique test names in QB`);
  
  if (testNames.size === 0) {
    return { hasRuleBased: false, ruleBasedTests: [] };
  }

  // Convert to array to process ALL tests
  const testNamesArray = Array.from(testNames);
  
  console.log(`🚀 Checking ALL ${testNamesArray.length} tests in batches of 3...`);
  
  try {
    const ruleBasedTests = [];
    const BATCH_SIZE = 3; // Process 3 tests at a time
    
    // Process tests in batches
    for (let i = 0; i < testNamesArray.length; i += BATCH_SIZE) {
      const batch = testNamesArray.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(testNamesArray.length / BATCH_SIZE);
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} tests)...`);
      
      // ✅ Process this batch in parallel using Promise.all
      const batchPromises = batch.map(async (testName) => {
        try {
          const isRuleBased = await checkIfTestIsRuleBased(testName);
          return { testName, isRuleBased };
        } catch (err) {
          console.error(`Error checking ${testName}:`, err);
          return { testName, isRuleBased: false };
        }
      });

      // Wait for this batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Collect Rule-Based tests from this batch
      batchResults.forEach(result => {
        if (result.isRuleBased) {
          ruleBasedTests.push(result.testName);
          console.log(`🎲 Found Rule-Based test: ${result.testName}`);
        }
      });
      
      // Optional: Small delay between batches to be nice to the API
      // (Remove this if you want maximum speed)
      if (i + BATCH_SIZE < testNamesArray.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const hasRuleBased = ruleBasedTests.length > 0;
    
    if (hasRuleBased) {
      console.log(`✅ COMPLETE: Found ${ruleBasedTests.length} Rule-Based test(s) out of ${testNamesArray.length} total:`, ruleBasedTests);
    } else {
      console.log(`✅ COMPLETE: No Rule-Based tests found (checked all ${testNamesArray.length} tests)`);
    }

    return { hasRuleBased, ruleBasedTests };
    
  } catch (err) {
    console.error("Error in checkQBForRuleBasedTests:", err);
    return { hasRuleBased: false, ruleBasedTests: [] };
  }
}

  async function cloneQuestions(qbId, qIds) {
    console.log("🔧 Sending to clone API - QB ID:", qbId, "Question IDs:", qIds);
    
    const res = await fetch(`${API}/api/questionBulkClone`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        qb_id: qbId,
        q_id: qIds,
        g_id: null
      })
    });

    if (!res.ok) {
      throw new Error("Failed to clone questions");
    }

    const result = await res.json();
    console.log("🔧 Clone API response:", result);
    return result;
  }

  async function searchQuestionBanks(searchTerm) {
    const res = await fetch(`${API}/api/questionbanks/all`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        department_id: DEPARTMENT_IDS,
        limit: 20,
        mainDepartmentUser: true,
        page: 1,
        search: searchTerm
      })
    });

    const json = await res.json();
    return json?.questionbanks || [];
  }

  async function moveQuestion(qId, qType, targetQbId, currentQbId) {
    const res = await fetch(
      `${API}/api/questionMove?q_id=${qId}&q_type=${qType}&qb_id=${targetQbId}&current_qb_id=${currentQbId}`,
      {
        method: "GET",
        headers: { Authorization: token }
      }
    );

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Failed to move question");
    }
    return json;
  }

  function buildModuleTree(courseData) {
    const courseModules = courseData.course_modules?.c_module_data || [];
    
    const tree = courseModules.map((mod, modIdx) => {
      const directTests = [];
      
      (mod.c_module_params || []).forEach((param) => {
        if (param.t_id) {
          directTests.push({
            id: `${modIdx}-direct-${param.t_id}`,
            t_id: param.t_id,
            name: param.t_name || `Test ${param.t_id.slice(0, 8)}`,
            type: "direct",
            t_type: param.t_type || "Manual Assessment Test",
            isRuleBased: param.t_type === "Rule Based Test"
          });
        }
      });

      const subModules = [];
      if (Array.isArray(mod.c_sub_modules) && mod.c_sub_modules.length > 0) {
        mod.c_sub_modules.forEach((sub, subIdx) => {
          const subTests = [];
          
          (sub.sub_module_params || []).forEach((param) => {
            if (param.t_id) {
              subTests.push({
                id: `${modIdx}-${subIdx}-${param.t_id}`,
                t_id: param.t_id,
                name: param.t_name || `Test ${param.t_id.slice(0, 8)}`,
                type: "sub",
                t_type: param.t_type || "Manual Assessment Test",
                isRuleBased: param.t_type === "Rule Based Test"
              });
            }
          });

          if (subTests.length > 0) {
            subModules.push({
              id: `${modIdx}-${subIdx}`,
              name: sub.sub_module_name || `Sub-module ${subIdx + 1}`,
              tests: subTests
            });
          }
        });
      }

      const totalTests = directTests.length + subModules.reduce((sum, s) => sum + s.tests.length, 0);

      return {
        id: modIdx,
        name: mod.c_module_name || `Module ${modIdx + 1}`,
        directTests,
        subModules,
        totalTests
      };
    });

    return tree.filter(m => m.totalTests > 0);
  }

  async function handleSearchCourse() {
    if (!courseName.trim()) {
      showAlert("Please enter a course name", "warning");
      return;
    }

    setIsLoading(true);
    setStatus("🔎 Finding course...");
    setModuleTree([]);
    setSelectedTests(new Set());
    setQbResults([]);

    try {
      const courseId = await findCourseByName(courseName);
      if (!courseId) {
        showAlert("❌ Course not found", "danger");
        setIsLoading(false);
        return;
      }

      setStatus("📋 Fetching course details...");
      const course = await getCourseDetails(courseId);
      
      const tree = buildModuleTree(course);

      if (!tree.length) {
        showAlert("❌ No modules with tests found in course", "danger");
        setIsLoading(false);
        return;
      }

      setModuleTree(tree);
      const totalTests = tree.reduce((sum, m) => sum + m.totalTests, 0);
      setStatus(`✅ Found ${tree.length} modules with ${totalTests} tests total.`);
      setIsLoading(false);
    } catch (err) {
      showAlert("Error: " + err.message, "danger");
      console.error(err);
      setIsLoading(false);
    }
  }

  const toggleModule = (moduleId) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const toggleTest = (testId) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  const selectAllTests = () => {
    const allTestIds = new Set();
    moduleTree.forEach(mod => {
      mod.directTests.forEach(t => allTestIds.add(t.id));
      mod.subModules.forEach(sub => {
        sub.tests.forEach(t => allTestIds.add(t.id));
      });
    });
    setSelectedTests(allTestIds);
  };

  const deselectAllTests = () => {
    setSelectedTests(new Set());
  };

  // Handle dropdown toggle and initialize range values
  const handleDropdownToggle = () => {
    if (!showWeekDropdown) {
      // Opening dropdown - initialize range values
      const patternedList = getPatternedModulesList();
      if (patternedList.length > 0) {
        setRangeStart(patternedList[0].order);
        setRangeEnd(patternedList[patternedList.length - 1].order);
        setRangeFilter('all');
      }
    }
    setShowWeekDropdown(!showWeekDropdown);
  };

  // ============================================
  // INTELLIGENT DYNAMIC SELECTION SYSTEM
  // ============================================
  
  // Extract week/module identifier from module name
  const extractWeekIdentifier = (moduleName) => {
    if (!moduleName) return null;
    
    const lowerName = moduleName.toLowerCase();
    
    // PRIORITY 1: "Week X Day Y" pattern - Check FIRST (highest priority)
    const weekDayMatch = lowerName.match(/week\s*(\d+)\s*day\s*(\d+)/i);
    if (weekDayMatch) {
      const weekNum = parseInt(weekDayMatch[1]);
      const dayNum = parseInt(weekDayMatch[2]);
      const compositeOrder = weekNum * 100 + dayNum;
      return {
        identifier: `Week ${weekNum} Day ${dayNum}`,
        display: `Week ${weekNum} Day ${dayNum}`,
        order: compositeOrder,
        type: 'week'
      };
    }

    // PRIORITY 2: "Week" pattern without day
    const weekMatch = lowerName.match(/week\s*(\d+)/i);
    if (weekMatch) {
      const weekNum = parseInt(weekMatch[1]);
      return {
        identifier: `Week ${weekNum}`,
        display: `Week ${weekNum}`,
        order: weekNum * 100,
        type: 'week'
      };
    }
        
    // PRIORITY 3: "Day" pattern
    const dayMatch = lowerName.match(/day\s*(\d+)/i);
    if (dayMatch) {
      return {
        identifier: `Day ${dayMatch[1]}`,
        display: `Day ${dayMatch[1]}`,
        order: parseInt(dayMatch[1]),
        type: 'day'
      };
    }
    
    // PRIORITY 4: "W1", "W2" pattern
    const wMatch = lowerName.match(/\bw(\d+)\b/i);
    if (wMatch) {
      return {
        identifier: `W${wMatch[1]}`,
        display: `W${wMatch[1]}`,
        order: parseInt(wMatch[1]),
        type: 'week'
      };
    }
    
    // PRIORITY 5: "1st Week", "2nd Week" pattern
    const ordinalMatch = lowerName.match(/(\d+)(?:st|nd|rd|th)\s*week/i);
    if (ordinalMatch) {
      return {
        identifier: `Week ${ordinalMatch[1]}`,
        display: `Week ${ordinalMatch[1]}`,
        order: parseInt(ordinalMatch[1]),
        type: 'week'
      };
    }
    
    // PRIORITY 6: "Module 1", "Module 2" pattern
    const moduleMatch = lowerName.match(/module\s*(\d+)/i);
    if (moduleMatch) {
      return {
        identifier: `Module ${moduleMatch[1]}`,
        display: `Module ${moduleMatch[1]}`,
        order: parseInt(moduleMatch[1]),
        type: 'module'
      };
    }
    
    return null;
  };

  // Analyze course structure and detect available test patterns
  const analyzeTestPatterns = () => {
    const patterns = {
      hasWeeks: false,
      hasModules: false,
      hasDays: false,
      hasPractice: false,
      hasKCQ: false,
      hasAssessment: false,
      hasQuiz: false,
      practiceCount: 0,
      kcqCount: 0,
      assessmentCount: 0,
      quizCount: 0
    };

    const allTests = [];
    
    moduleTree.forEach(mod => {
      const weekInfo = extractWeekIdentifier(mod.name);
      if (weekInfo) {
        if (weekInfo.type === 'week') patterns.hasWeeks = true;
        if (weekInfo.type === 'module') patterns.hasModules = true;
        if (weekInfo.type === 'day') patterns.hasDays = true;
      }

      mod.directTests.forEach(t => allTests.push(t));
      mod.subModules.forEach(sub => {
        sub.tests.forEach(t => allTests.push(t));
      });
    });

    // Analyze test names for common patterns
    allTests.forEach(test => {
      const lowerName = test.name.toLowerCase();
      
      if (lowerName.includes('practice')) {
        patterns.hasPractice = true;
        patterns.practiceCount++;
      }
      if (lowerName.includes('kcq') || lowerName.includes('kc')) {
        patterns.hasKCQ = true;
        patterns.kcqCount++;
      }
      if (lowerName.includes('assessment')) {
        patterns.hasAssessment = true;
        patterns.assessmentCount++;
      }
      if (lowerName.includes('quiz')) {
        patterns.hasQuiz = true;
        patterns.quizCount++;
      }
    });

    return patterns;
  };

  // Get ALL modules with metadata (including non-patterned modules)
  const getAllModulesWithMetadata = () => {
    const modulesList = [];
    
    moduleTree.forEach((mod, index) => {
      const weekInfo = extractWeekIdentifier(mod.name);
      
      const metadata = {
        moduleName: mod.name,
        moduleIndex: index,
        identifier: weekInfo ? weekInfo.identifier : `custom_${index}`,
        display: mod.name,
        order: weekInfo ? weekInfo.order : 9000 + index,
        type: weekInfo ? weekInfo.type : 'custom',
        hasPattern: !!weekInfo,
        hasPractice: false,
        hasKCQ: false,
        hasAssessment: false,
        hasQuiz: false,
        practiceCount: 0,
        kcqCount: 0,
        assessmentCount: 0,
        quizCount: 0,
        totalTests: 0
      };
      
      // Analyze tests in this module
      const analyzeTests = (tests) => {
        tests.forEach(t => {
          metadata.totalTests++;
          const lowerName = t.name.toLowerCase();
          
          if (lowerName.includes('practice')) {
            metadata.hasPractice = true;
            metadata.practiceCount++;
          }
          if (lowerName.includes('kcq') || lowerName.includes('kc')) {
            metadata.hasKCQ = true;
            metadata.kcqCount++;
          }
          if (lowerName.includes('assessment')) {
            metadata.hasAssessment = true;
            metadata.assessmentCount++;
          }
          if (lowerName.includes('quiz')) {
            metadata.hasQuiz = true;
            metadata.quizCount++;
          }
        });
      };

      analyzeTests(mod.directTests);
      mod.subModules.forEach(sub => analyzeTests(sub.tests));
      
      modulesList.push(metadata);
    });
    
    return modulesList.sort((a, b) => a.order - b.order);
  };

  // Get only patterned modules for range selection
  const getPatternedModulesList = () => {
    return getAllModulesWithMetadata().filter(m => m.hasPattern);
  };

  // Select tests by module
  const selectByModuleAndFilter = (moduleName, filterType = 'all') => {
    const testIds = new Set();
    
    moduleTree.forEach(mod => {
      if (mod.name === moduleName) {
        const checkAndAdd = (tests) => {
          tests.forEach(t => {
            const lowerName = t.name.toLowerCase();
            
            if (filterType === 'all') {
              testIds.add(t.id);
            } else if (filterType === 'practice' && lowerName.includes('practice')) {
              testIds.add(t.id);
            } else if (filterType === 'kcq' && (lowerName.includes('kcq') || lowerName.includes('kc'))) {
              testIds.add(t.id);
            } else if (filterType === 'assessment' && lowerName.includes('assessment')) {
              testIds.add(t.id);
            } else if (filterType === 'quiz' && lowerName.includes('quiz')) {
              testIds.add(t.id);
            }
          });
        };

        checkAndAdd(mod.directTests);
        mod.subModules.forEach(sub => checkAndAdd(sub.tests));
      }
    });

    setSelectedTests(new Set([...selectedTests, ...testIds]));
    
    const filterLabel = filterType === 'all' ? 'all tests' : `${filterType} tests`;
    const displayName = moduleName.length > 30 ? moduleName.substring(0, 30) + '...' : moduleName;
    showAlert(`✅ Selected ${testIds.size} ${filterLabel} from ${displayName}`, "success");
  };

  // Select tests by global filter
  const selectByGlobalFilter = (filterType) => {
    const testIds = new Set();
    
    moduleTree.forEach(mod => {
      const checkAndAdd = (tests) => {
        tests.forEach(t => {
          const lowerName = t.name.toLowerCase();
          
          if (filterType === 'all') {
            testIds.add(t.id);
          } else if (filterType === 'practice' && lowerName.includes('practice')) {
            testIds.add(t.id);
          } else if (filterType === 'kcq' && (lowerName.includes('kcq') || lowerName.includes('kc'))) {
            testIds.add(t.id);
          } else if (filterType === 'assessment' && lowerName.includes('assessment')) {
            testIds.add(t.id);
          } else if (filterType === 'quiz' && lowerName.includes('quiz')) {
            testIds.add(t.id);
          }
        });
      };

      checkAndAdd(mod.directTests);
      mod.subModules.forEach(sub => checkAndAdd(sub.tests));
    });

    setSelectedTests(new Set([...selectedTests, ...testIds]));
    
    const filterLabel = filterType === 'all' ? 'All tests' : `All ${filterType} tests`;
    showAlert(`✅ Selected ${testIds.size} tests - ${filterLabel}`, "success");
  };

  // Select module range
  const selectModuleRange = (startNum, endNum, filterType = 'all') => {
    const testIds = new Set();
    
    moduleTree.forEach(mod => {
      const weekInfo = extractWeekIdentifier(mod.name);
      if (weekInfo && weekInfo.order >= startNum && weekInfo.order <= endNum) {
        const checkAndAdd = (tests) => {
          tests.forEach(t => {
            const lowerName = t.name.toLowerCase();
            
            if (filterType === 'all') {
              testIds.add(t.id);
            } else if (filterType === 'practice' && lowerName.includes('practice')) {
              testIds.add(t.id);
            } else if (filterType === 'kcq' && (lowerName.includes('kcq') || lowerName.includes('kc'))) {
              testIds.add(t.id);
            } else if (filterType === 'assessment' && lowerName.includes('assessment')) {
              testIds.add(t.id);
            } else if (filterType === 'quiz' && lowerName.includes('quiz')) {
              testIds.add(t.id);
            }
          });
        };

        checkAndAdd(mod.directTests);
        mod.subModules.forEach(sub => checkAndAdd(sub.tests));
      }
    });

    setSelectedTests(new Set([...selectedTests, ...testIds]));
    
    const rangeLabel = weekInfo && weekInfo.type === 'week' 
      ? `Week ${startNum}-${endNum}` 
      : `Module ${startNum}-${endNum}`;
    const filterLabel = filterType === 'all' ? 'all tests' : `${filterType} tests`;
    showAlert(`✅ Selected ${testIds.size} ${filterLabel} from ${rangeLabel}`, "success");
  };

  async function handleFetchQB() {
    if (selectedTests.size === 0) {
      showAlert("Please select at least one test", "warning");
      return;
    }

    setIsLoading(true);
    showOverlay("🔍 Fetching question banks...");

    try {
      const allQBIds = new Set();
      const qbIdToNameMap = new Map();
      let processedTests = 0;
      const qbToTestMap = {};
      const testQMap = {};
      const qbMetadata = {};

      for (const testId of selectedTests) {
        showOverlay(
          `📋 Processing tests: ${processedTests + 1}/${selectedTests.size}`
        );

        let actualTId = null;
        let testName = null;
        let isRuleBased = false;
        
        for (const mod of moduleTree) {
          const directTest = mod.directTests.find(t => t.id === testId);
          if (directTest) {
            actualTId = directTest.t_id;
            testName = directTest.name;
            isRuleBased = directTest.isRuleBased;
            break;
          }
          for (const sub of mod.subModules) {
            const subTest = sub.tests.find(t => t.id === testId);
            if (subTest) {
              actualTId = subTest.t_id;
              testName = subTest.name;
              isRuleBased = subTest.isRuleBased;
              break;
            }
          }
          if (actualTId) break;
        }


//old
        // if (actualTId) {
        //   try {
        //     const questions = await fetchTestDetailsForModule(actualTId);
        //     testQMap[actualTId] = questions;
            
        //     questions.forEach((q) => {
        //       if (q.qb_id) {
        //         allQBIds.add(q.qb_id);
                
        //         if (!qbToTestMap[q.qb_id]) {
        //           qbToTestMap[q.qb_id] = {};
        //         }
        //         if (!qbToTestMap[q.qb_id][testName]) {
        //           qbToTestMap[q.qb_id][testName] = [];
        //         }
        //         qbToTestMap[q.qb_id][testName].push(q.q_id);
                
        //         if (!qbMetadata[q.qb_id]) {
        //           qbMetadata[q.qb_id] = {
        //             hasRuleBasedTest: false,
        //             ruleBasedTests: []
        //           };
        //         }
        //         if (isRuleBased) {
        //           qbMetadata[q.qb_id].hasRuleBasedTest = true;
        //           if (!qbMetadata[q.qb_id].ruleBasedTests.includes(testName)) {
        //             qbMetadata[q.qb_id].ruleBasedTests.push(testName);
        //           }
        //         }
        //       }
        //     });

        //     await sleep(200);
        //   } catch (err) {
        //     console.warn(`Failed to fetch test ${actualTId}:`, err);
        //   }
        // }

        if (actualTId) {
  try {
    // ✅ NEW: For Rule-Based tests, fetch full test details to get test_rules
    if (isRuleBased) {
      console.log(`🎲 Processing Rule-Based test: ${testName}`);
      showOverlay(`🎲 Extracting QBs from Rule-Based test: ${testName}`);
      
      const fullTestDetails = await fetchFullTestDetails(actualTId);
      const qbMapFromRules = extractQBsFromTestRules(fullTestDetails);
      
      console.log(`✅ Found ${qbMapFromRules.size} QBs in test_rules for "${testName}"`);
      
      // Add all QBs from test_rules
      qbMapFromRules.forEach((qbName, qbId) => {
        allQBIds.add(qbId);
        qbIdToNameMap.set(qbId, qbName);
        
        if (!qbMetadata[qbId]) {
          qbMetadata[qbId] = {
            hasRuleBasedTest: true,
            ruleBasedTests: [testName]
          };
        } else {
          qbMetadata[qbId].hasRuleBasedTest = true;
          if (!qbMetadata[qbId].ruleBasedTests.includes(testName)) {
            qbMetadata[qbId].ruleBasedTests.push(testName);
          }
        }
        
        if (!qbToTestMap[qbId]) {
          qbToTestMap[qbId] = {};
        }
        if (!qbToTestMap[qbId][testName]) {
          qbToTestMap[qbId][testName] = [];
        }
      });
      
      console.log(`📊 Total QBs after processing "${testName}": ${allQBIds.size}`);
    } else {
      // For non-Rule-Based tests, use existing logic
      const questions = await fetchTestDetailsForModule(actualTId);
      testQMap[actualTId] = questions;
      
      questions.forEach((q) => {
        if (q.qb_id) {
          allQBIds.add(q.qb_id);
          
          if (!qbToTestMap[q.qb_id]) {
            qbToTestMap[q.qb_id] = {};
          }
          if (!qbToTestMap[q.qb_id][testName]) {
            qbToTestMap[q.qb_id][testName] = [];
          }
          qbToTestMap[q.qb_id][testName].push(q.q_id);
          
          if (!qbMetadata[q.qb_id]) {
            qbMetadata[q.qb_id] = {
              hasRuleBasedTest: false,
              ruleBasedTests: []
            };
          }
        }
      });
    }

    await sleep(200);
  } catch (err) {
    console.warn(`Failed to fetch test ${actualTId}:`, err);
  }
}

        processedTests++;
      }

      if (allQBIds.size === 0) {
        hideOverlay();
        showAlert("❌ No question banks found in selected tests", "warning");
        setIsLoading(false);
        return;
      }

      showOverlay(`📚 Fetching details for ${allQBIds.size} question bank(s)...`);

      // const qbList = await getQuestionBanks(Array.from(allQBIds));
      
      // const enhancedQbList = qbList.map(qb => ({
      //   ...qb,
      //   hasRuleBasedTest: qbMetadata[qb.qb_id]?.hasRuleBasedTest || false,
      //   ruleBasedTests: qbMetadata[qb.qb_id]?.ruleBasedTests || []
      // }));

      // setTestQuestionMap(qbToTestMap);
      // setQbResults(enhancedQbList);
      // setUI("results");
      // showAlert(`✅ Found ${enhancedQbList.length} question bank(s)`, "success");

      const qbList = await getQuestionBanks(Array.from(allQBIds));

// ✅ NEW: For QBs that came from test_rules only, add QB name if missing
const enhancedQbList = qbList.map(qb => {
  const enhancedQb = {
    ...qb,
    hasRuleBasedTest: qbMetadata[qb.qb_id]?.hasRuleBasedTest || false,
    ruleBasedTests: qbMetadata[qb.qb_id]?.ruleBasedTests || []
  };
  
  if (!enhancedQb.qb_name && qbIdToNameMap.has(qb.qb_id)) {
    enhancedQb.qb_name = qbIdToNameMap.get(qb.qb_id);
    console.log(`📝 Added QB name from test_rules: ${enhancedQb.qb_name}`);
  }
  
  return enhancedQb;
});

// ✅ NEW: Add QBs that were in test_rules but not returned by getQuestionBanks
const returnedQbIds = new Set(qbList.map(qb => qb.qb_id));
const missingQbIds = Array.from(allQBIds).filter(id => !returnedQbIds.has(id));

if (missingQbIds.length > 0) {
  console.log(`⚠️ ${missingQbIds.length} QBs from test_rules not returned by API, adding manually...`);
  
  missingQbIds.forEach(qbId => {
    const qbName = qbIdToNameMap.get(qbId) || `Unknown QB (${qbId.slice(0, 8)})`;
    console.log(`  📌 Adding missing QB: ${qbName}`);
    
    enhancedQbList.push({
      qb_id: qbId,
      qb_name: qbName,
      questionCount: 0,
      user_role: "unknown",
      hasRuleBasedTest: qbMetadata[qbId]?.hasRuleBasedTest || false,
      ruleBasedTests: qbMetadata[qbId]?.ruleBasedTests || [],
      fromTestRulesOnly: true
    });
  });
}

console.log(`✅ Final QB list count: ${enhancedQbList.length}`);
console.log(`✅ Rule-Based QBs: ${enhancedQbList.filter(qb => qb.hasRuleBasedTest).length}`);

setTestQuestionMap(qbToTestMap);
setQbResults(enhancedQbList);
setUI("results");

const ruleBasedCount = enhancedQbList.filter(qb => qb.hasRuleBasedTest).length;
showAlert(
  `✅ Found ${enhancedQbList.length} question bank(s)${ruleBasedCount > 0 ? ` (${ruleBasedCount} Rule-Based)` : ""}`,
  "success"
);
    } catch (err) {
      showAlert("Error: " + err.message, "danger");
      console.error(err);
    } finally {
      hideOverlay();
      setIsLoading(false);
    }
  }

  const handleCloneQuestions = async () => {
    const selectedQIds = Array.from(selectedQuestions);
    console.log("🔄 Starting clone with selected IDs:", selectedQIds);
    
    if (selectedQIds.length === 0) {
      showAlert("Please select questions to clone", "warning");
      return;
    }

    showOverlay("📚 Fetching current questions for comparison...");
    
    try {
      const allCurrentQuestions = await fetchQBQuestions(selectedQB.qb_id);
      const currentQuestionIds = allCurrentQuestions.map(q => q.q_id);
      
      console.log("📋 ALL question IDs before clone:", currentQuestionIds);
      console.log("📋 Total questions in QB before clone:", currentQuestionIds.length);
      
      hideOverlay();
      
      showOverlay(`🔄 Cloning ${selectedQIds.length} question(s)...`);

      const result = await cloneQuestions(selectedQB.qb_id, selectedQIds);
      
      console.log("📦 Clone API response:", result);
      
      hideOverlay();
      
      if (result.success) {
        showAlert(`✅ Successfully cloned ${selectedQIds.length} question(s)!`, "success");
        
        setShowAllQuestions(true);
        showOverlay("📚 Refreshing questions to find cloned ones...");
        
        try {
          const updatedQuestions = await fetchQBQuestions(selectedQB.qb_id);
          setAllQuestions(updatedQuestions);
          setQbQuestions(updatedQuestions);
          
          const updatedQuestionIds = updatedQuestions.map(q => q.q_id);
          
          const newQuestionIds = [];
          for (const id of updatedQuestionIds) {
            if (!currentQuestionIds.includes(id)) {
              newQuestionIds.push(id);
            }
          }
          
          console.log("🔍 Finding cloned questions:");
          console.log("Before clone:", currentQuestionIds.length, "questions");
          console.log("After clone:", updatedQuestionIds.length, "questions");
          console.log("New question IDs found:", newQuestionIds);
          console.log("New question count:", newQuestionIds.length);
          console.log("Selected count:", selectedQIds.length);
          
          if (newQuestionIds.length > 0) {
            if (newQuestionIds.length === selectedQIds.length) {
              setClonedQuestions(prev => [...prev, ...newQuestionIds]);
              console.log("🎯 Auto-selecting cloned questions:", newQuestionIds);
              setSelectedQuestions(new Set(newQuestionIds));
              
              hideOverlay();
              showAlert(`✅ Found ${newQuestionIds.length} cloned question(s)! They are highlighted in green.`, "success");
            } else {
              console.warn("⚠️ Cloned more questions than selected!");
              console.warn("Selected:", selectedQIds.length, "New:", newQuestionIds.length);
              
              const selectedQuestionsData = allCurrentQuestions.filter(q => selectedQIds.includes(q.q_id));
              const actualClones = [];
              
              newQuestionIds.forEach(newId => {
                const newQ = updatedQuestions.find(q => q.q_id === newId);
                if (newQ) {
                  selectedQuestionsData.forEach(selectedQ => {
                    const newContent = newQ.question_data || '';
                    const selectedContent = selectedQ.question_data || '';
                    
                    if (newContent.substring(0, 100) === selectedContent.substring(0, 100)) {
                      actualClones.push(newId);
                    }
                  });
                }
              });
              
              if (actualClones.length > 0) {
                setClonedQuestions(prev => [...prev, ...actualClones]);
                console.log("🎯 Auto-selecting actual cloned questions:", actualClones);
                setSelectedQuestions(new Set(actualClones));
                
                hideOverlay();
                showAlert(`✅ Found ${actualClones.length} cloned question(s)! The API cloned ${newQuestionIds.length} total.`, "warning");
              } else {
                setClonedQuestions(prev => [...prev, ...newQuestionIds]);
                console.log("⚠️ Could not identify actual clones, marking all new as cloned:", newQuestionIds);
                setSelectedQuestions(new Set(newQuestionIds));
                
                hideOverlay();
                showAlert(`⚠️ Cloned ${newQuestionIds.length} questions (may include unintended ones).`, "warning");
              }
            }
          } else {
            hideOverlay();
            showAlert("⚠️ Questions cloned but no new IDs detected. Try refreshing the page.", "warning");
          }
        } catch (err) {
          hideOverlay();
          showAlert("⚠️ Cloned but failed to refresh questions: " + err.message, "warning");
        }
      } else {
        showAlert("⚠️ Clone operation failed", "warning");
      }
    } catch (err) {
      hideOverlay();
      showAlert("Error cloning questions: " + err.message, "danger");
      console.error(err);
    }
  };

  const handleSearchTargetQB = async () => {
    if (!moveSearchTerm.trim()) {
      showAlert("Please enter a search term", "warning");
      return;
    }

    showOverlay("🔍 Searching question banks...");

    try {
      const results = await searchQuestionBanks(moveSearchTerm);
      setMoveSearchResults(results);
      hideOverlay();
      
      if (results.length === 0) {
        showAlert("No question banks found", "warning");
      }
    } catch (err) {
      hideOverlay();
      showAlert("Error searching: " + err.message, "danger");
      console.error(err);
    }
  };

  const handleMoveQuestions = async () => {
    if (!selectedTargetQB) {
      showAlert("Please select a target question bank", "warning");
      return;
    }

    const questionsToMove = clonedQuestions.length > 0 ? clonedQuestions : Array.from(selectedQuestions);
    
    if (questionsToMove.length === 0) {
      showAlert("No questions to move", "warning");
      return;
    }

    const targetQBName = selectedTargetQB.qb_name;
    const targetQBId = selectedTargetQB.qb_id;

    setShowMoveModal(false);
    
    await sleep(300);

    showOverlay(`📦 Moving ${questionsToMove.length} question(s)...`);

    try {
      let successCount = 0;
      let failCount = 0;

      const batchSize = 3;
      for (let i = 0; i < questionsToMove.length; i += batchSize) {
        const batch = questionsToMove.slice(i, i + batchSize);
        
        showOverlay(`📦 Moving: ${Math.min(i + batchSize, questionsToMove.length)}/${questionsToMove.length}`);
        
        const batchPromises = batch.map(qId =>
          moveQuestion(
            qId,
            "mcq_single_correct",
            targetQBId,
            selectedQB.qb_id
          ).then(() => {
            successCount++;
            return true;
          }).catch(err => {
            console.error(`Failed to move question ${qId}:`, err);
            failCount++;
            return false;
          })
        );

        await Promise.all(batchPromises);
        
        if (i + batchSize < questionsToMove.length) {
          await sleep(300);
        }
      }

      hideOverlay();
      
      setClonedQuestions([]);
      setSelectedQuestions(new Set());
      setMoveSearchTerm("");
      setMoveSearchResults([]);
      setSelectedTargetQB(null);
      
      await sleep(200);
      
      if (successCount > 0) {
        showAlert(
          `✅ Moved ${successCount} question(s) to ${targetQBName}${failCount > 0 ? ` (${failCount} failed)` : ""}`,
          "success"
        );
        
        showOverlay("🔄 Refreshing questions...");
        try {
          if (showAllQuestions) {
            const updatedQuestions = await fetchQBQuestions(selectedQB.qb_id);
            setAllQuestions(updatedQuestions);
            setQbQuestions(updatedQuestions);
          } else {
            const allQuestions = await fetchQBQuestions(selectedQB.qb_id);
            const usedQuestions = allQuestions.filter(q => usedQuestionIds.has(q.q_id));
            setQbQuestions(usedQuestions);
          }
          hideOverlay();
        } catch (err) {
          hideOverlay();
          showAlert("⚠️ Questions moved but failed to refresh list", "warning");
        }
      } else {
        showAlert("❌ Failed to move questions", "danger");
      }
    } catch (err) {
      hideOverlay();
      showAlert("Error moving questions: " + err.message, "danger");
      console.error(err);
    }
  };

  const exportCSV = () => {
    if (!qbResults.length) {
      showAlert("No results to export", "warning");
      return;
    }

    const headers = ["QB Name", "QB ID", "Questions", "User Role", "Imported", "Has Rule Based Test", "Rule Based Tests"];
    const rows = qbResults.map((qb) => [
      qb.qb_name,
      qb.qb_id,
      qb.questionCount,
      qb.user_role,
      qb.imported,
      qb.hasRuleBasedTest ? "Yes" : "No",
      qb.ruleBasedTests?.join("; ") || ""
    ]);

    let csv = headers.map((h) => `"${h}"`).join(",") + "\n";
    rows.forEach((row) => {
      csv += row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${courseName}_qb_${timestamp}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert(`Downloaded: ${filename}`, "success");
  };

  const toggleQuestionView = async () => {
    if (showAllQuestions) {
      const usedQuestions = allQuestions.filter(q => usedQuestionIds.has(q.q_id));
      setQbQuestions(usedQuestions);
      setShowAllQuestions(false);
      setSelectedQuestions(new Set());
      setClonedQuestions([]);
      showAlert("Showing only questions used in selected tests", "info");
    } else {
      if (allQuestions.length === 0) {
        showOverlay("📚 Fetching all questions from QB...");
        try {
          const allQuestionsData = await fetchQBQuestions(selectedQB.qb_id);
          setAllQuestions(allQuestionsData);
          setQbQuestions(allQuestionsData);
          
          // NEW: Check for Rule-Based tests in QB questions
          if (!selectedQB.hasRuleBasedTest) {
            showOverlay("🔍 Checking for Rule-Based tests in QB...");
            const { hasRuleBased, ruleBasedTests } = await checkQBForRuleBasedTests(selectedQB.qb_id, allQuestionsData);
            
            if (hasRuleBased) {
              setSelectedQB(prev => ({
                ...prev,
                hasRuleBasedTest: true,
                ruleBasedTests: ruleBasedTests
              }));
              
              hideOverlay();
              showAlert(
                `⚠️ Rule-Based test detected! Clone/Move disabled. Tests: ${ruleBasedTests.join(", ")}`,
                "warning"
              );
              return;
            }
          }
          
          hideOverlay();
          showAlert("Showing ALL questions from the QB", "success");
        } catch (err) {
          hideOverlay();
          showAlert("Error fetching all questions: " + err.message, "danger");
          return;
        }
      } else {
        setQbQuestions(allQuestions);
        showAlert("Showing ALL questions from the QB", "success");
      }
      setShowAllQuestions(true);
      setSelectedQuestions(new Set());
    }
  };

  // Filter Logic
  const applyFilters = (questions) => {
    return questions.filter(q => {
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const questionText = (q.question_data || "").toLowerCase();
        const qId = (q.q_id || "").toLowerCase();
        
        if (!questionText.includes(searchLower) && !qId.includes(searchLower)) {
          return false;
        }
      }
      
      if (filters.difficulty !== "all") {
        const qDifficulty = (q.difficulty_level || "").toLowerCase();
        if (qDifficulty !== filters.difficulty.toLowerCase()) {
          return false;
        }
      }
      
      if (filters.clonedStatus === "cloned") {
        if (!clonedQuestions.includes(q.q_id)) {
          return false;
        }
      } else if (filters.clonedStatus === "original") {
        if (clonedQuestions.includes(q.q_id)) {
          return false;
        }
      }
      
      if (showAllQuestions && filters.usedStatus !== "all") {
        const isUsed = usedQuestionIds.has(q.q_id);
        if (filters.usedStatus === "used" && !isUsed) {
          return false;
        }
        if (filters.usedStatus === "unused" && isUsed) {
          return false;
        }
      }
      
      return true;
    });
  };

  const filteredQuestions = applyFilters(qbQuestions);

  const resetFilters = () => {
    setFilters({
      searchText: "",
      difficulty: "all",
      clonedStatus: "all",
      usedStatus: "all"
    });
  };

  const hasActiveFilters = () => {
    return filters.searchText !== "" || 
           filters.difficulty !== "all" || 
           filters.clonedStatus !== "all" || 
           filters.usedStatus !== "all";
  };

  return (
    <div className="qb-finder-container">
      {overlay && (
        <div className="qb-overlay">
          <div className="qb-overlay-content">
            <div className="qb-spinner"></div>
            <div className="qb-overlay-text">{overlayText}</div>
          </div>
        </div>
      )}

      {alert && (
        <div className={`qb-alert qb-alert-${alert.type}`}>
          {alert.msg}
        </div>
      )}

      {showMoveModal && (
        <div className="qb-modal-backdrop" onClick={() => setShowMoveModal(false)}>
          <div className="qb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qb-modal-header">
              <h3 className="qb-modal-title">📦 Move Questions to QB</h3>
              <button className="qb-modal-close" onClick={() => setShowMoveModal(false)}>
                ×
              </button>
            </div>

            <div className="qb-modal-body">
              <div className="qb-form-group">
                <label className="qb-label">Search Question Bank</label>
                <input
                  type="text"
                  value={moveSearchTerm}
                  onChange={(e) => setMoveSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearchTargetQB()}
                  placeholder="Enter QB name..."
                  className="qb-input"
                />
              </div>

              <button
                onClick={handleSearchTargetQB}
                className="qb-button qb-button-primary"
              >
                🔍 Search
              </button>

              {moveSearchResults.length > 0 && (
                <div className="qb-search-results">
                  {moveSearchResults.map((qb) => (
                    <div
                      key={qb.qb_id}
                      className="qb-search-item"
                      style={{
                        background: selectedTargetQB?.qb_id === qb.qb_id ? "#e7f3ff" : "transparent"
                      }}
                      onClick={() => setSelectedTargetQB(qb)}
                    >
                      <div className="qb-search-item-name">{qb.qb_name}</div>
                      <div className="qb-search-item-meta">
                        {qb.questionCount} questions • {qb.user_role}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="qb-modal-footer">
              <button
                onClick={() => setShowMoveModal(false)}
                className="qb-button qb-button-small qb-button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveQuestions}
                disabled={!selectedTargetQB}
                className={`qb-button qb-button-small qb-button-success ${!selectedTargetQB ? "qb-button-disabled" : ""}`}
              >
                Move {clonedQuestions.length > 0 ? clonedQuestions.length : selectedQuestions.size} Questions
              </button>
            </div>
          </div>
        </div>
      )}

      {ui === "welcome" && (
        <div className="qb-welcome">
          <h2 className="qb-welcome-title">🎓 Course Question Bank Finder</h2>
          <p className="qb-welcome-subtitle">Paste your API token below</p>

          <textarea
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your Authorization token here..."
            className="qb-token-input"
          />

          <button onClick={saveToken} className="qb-button qb-button-primary">
            Save Token
          </button>

          <p className="qb-token-hint">
            💡 Tip: Your token will be saved in localStorage for future sessions
          </p>
        </div>
      )}

      {ui === "search" && (
        <div className="qb-card">
          <h3 className="qb-title">📘 Course → QB Finder</h3>

          <div className="qb-form-group">
            <label className="qb-label">Course Name</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearchCourse()}
              placeholder="Enter course name... or code..."
              className="qb-input"
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleSearchCourse}
            disabled={isLoading}
            className={`qb-button qb-button-primary ${isLoading ? "qb-button-disabled" : ""}`}
          >
            {isLoading ? "🔄 Searching..." : "🔎 Search Course"}
          </button>

          <button
            onClick={clearToken}
            className="qb-button qb-button-danger"
            style={{ marginTop: "12px" }}
          >
            🚪 Logout
          </button>

            {status && <div className="qb-status">{status}</div>}

          {moduleTree.length > 0 && (
            <div className="qb-tree-section">
              {/* ✅ TOP FETCH QB BUTTON - USER FRIENDLY */}
              <button
                onClick={handleFetchQB}
                disabled={selectedTests.size === 0 || isLoading}
                className={`qb-button qb-button-success ${selectedTests.size === 0 ? "qb-button-disabled" : ""}`}
                style={{ marginBottom: "16px", width: "100%" }}
              >
                {isLoading ? "🔄 Processing..." : `📥 Fetch QB (${selectedTests.size} selected)`}
              </button>

              <div className="qb-tree-header">
                <h4 className="qb-subtitle">📚 Modules & Tests</h4>
                <div className="qb-toggle-buttons">
                  <button
                    onClick={deselectAllTests}
                    className="qb-button qb-button-small qb-button-secondary"
                  >
                    ☐ Clear
                  </button>
                  
                  {moduleTree.length > 0 && (
                    <div className="qb-week-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        onClick={handleDropdownToggle}
                        className="qb-button qb-button-small qb-button-info"
                      >
                        🎯 Smart Select
                      </button>
                      
                      {showWeekDropdown && (() => {
                        const allModules = getAllModulesWithMetadata();
                        const patternedModules = getPatternedModulesList();
                        
                        return (
                          <div className="qb-week-dropdown" style={{
                            position: 'absolute',
                            top: '100%',
                            right: '0',
                            background: 'white',
                            border: '2px solid #0d6efd',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            minWidth: '360px',
                            maxWidth: '420px',
                            zIndex: 1000,
                            marginTop: '8px',
                            maxHeight: '550px',
                            overflowY: 'auto'
                          }}>
                            <div style={{
                              padding: '16px',
                              borderBottom: '2px solid #f0f0f0',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              position: 'sticky',
                              top: 0,
                              zIndex: 10,
                              borderRadius: '10px 10px 0 0'
                            }}>
                              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '6px' }}>
                                🎯 Intelligent Selection
                              </div>
                              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                                Select tests by category or range
                              </div>
                            </div>
                            
                            {allModules.length > 0 ? (
                              <>
                                {patternedModules.length > 0 && (
                                <div style={{
                                  padding: '16px',
                                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                  borderBottom: '2px solid #dee2e6'
                                }}>
                                  <div style={{
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    marginBottom: '12px',
                                    color: '#495057',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <span>📊 Range Selection</span>
                                  </div>
                                  
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '12px'
                                  }}>
                                    <div style={{ flex: 1 }}>
                                      <label style={{
                                        display: 'block',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#6c757d',
                                        marginBottom: '4px'
                                      }}>
                                        From
                                      </label>
                                      <select
                                        value={rangeStart}
                                        onChange={(e) => setRangeStart(parseInt(e.target.value))}
                                        style={{
                                          width: '100%',
                                          padding: '6px 8px',
                                          fontSize: '12px',
                                          border: '1.5px solid #ced4da',
                                          borderRadius: '6px',
                                          background: 'white',
                                          cursor: 'pointer',
                                          maxHeight: '200px',
                                          overflowY: 'auto',
                                          color:'black'
                                        }}
                                        size="5"
                                      >
                                        {patternedModules.map(w => (
                                          <option key={w.order} value={w.order}>
                                            {w.display.length > 35 ? w.display.substring(0, 35) + '...' : w.display}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    
                                    <div style={{
                                      fontSize: '18px',
                                      fontWeight: 'bold',
                                      color: '#6c757d',
                                      marginTop: '18px'
                                    }}>
                                      →
                                    </div>
                                    
                                    <div style={{ flex: 1 }}>
                                      <label style={{
                                        display: 'block',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#6c757d',
                                        marginBottom: '4px'
                                      }}>
                                        To
                                      </label>
                                      <select
                                        value={rangeEnd}
                                        onChange={(e) => setRangeEnd(parseInt(e.target.value))}
                                        style={{
                                          width: '100%',
                                          padding: '6px 8px',
                                          fontSize: '12px',
                                          border: '1.5px solid #ced4da',
                                          borderRadius: '6px',
                                          background: 'white',
                                          cursor: 'pointer',
                                          maxHeight: '200px',
                                          overflowY: 'auto',
                                          color:'black'
                                        }}
                                        size="5"
                                      >
                                        {patternedModules.map(w => (
                                          <option key={w.order} value={w.order}>
                                            {w.display.length > 35 ? w.display.substring(0, 35) + '...' : w.display}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  
                                  <div style={{ marginBottom: '12px' }}>
                                    <label style={{
                                      display: 'block',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      color: '#6c757d',
                                      marginBottom: '6px'
                                    }}>
                                      Filter Type
                                    </label>
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                                      gap: '6px'
                                    }}>
                                      <button
                                        onClick={() => setRangeFilter('all')}
                                        style={{
                                          padding: '6px 8px',
                                          fontSize: '11px',
                                          background: rangeFilter === 'all' ? '#6c757d' : 'white',
                                          color: rangeFilter === 'all' ? 'white' : '#6c757d',
                                          border: `1.5px solid ${rangeFilter === 'all' ? '#6c757d' : '#ced4da'}`,
                                          borderRadius: '5px',
                                          cursor: 'pointer',
                                          fontWeight: '600'
                                        }}
                                      >
                                        ✅ All
                                      </button>
                                      <button
                                        onClick={() => setRangeFilter('practice')}
                                        style={{
                                          padding: '6px 8px',
                                          fontSize: '11px',
                                          background: rangeFilter === 'practice' ? '#2196F3' : 'white',
                                          color: rangeFilter === 'practice' ? 'white' : '#2196F3',
                                          border: `1.5px solid ${rangeFilter === 'practice' ? '#2196F3' : '#ced4da'}`,
                                          borderRadius: '5px',
                                          cursor: 'pointer',
                                          fontWeight: '600'
                                        }}
                                      >
                                        📝 Practice
                                      </button>
                                      <button
                                        onClick={() => setRangeFilter('kcq')}
                                        style={{
                                          padding: '6px 8px',
                                          fontSize: '11px',
                                          background: rangeFilter === 'kcq' ? '#FF9800' : 'white',
                                          color: rangeFilter === 'kcq' ? 'white' : '#FF9800',
                                          border: `1.5px solid ${rangeFilter === 'kcq' ? '#FF9800' : '#ced4da'}`,
                                          borderRadius: '5px',
                                          cursor: 'pointer',
                                          fontWeight: '600'
                                        }}
                                      >
                                        🎯 KCQ
                                      </button>
                                      <button
                                        onClick={() => setRangeFilter('quiz')}
                                        style={{
                                          padding: '6px 8px',
                                          fontSize: '11px',
                                          background: rangeFilter === 'quiz' ? '#4CAF50' : 'white',
                                          color: rangeFilter === 'quiz' ? 'white' : '#4CAF50',
                                          border: `1.5px solid ${rangeFilter === 'quiz' ? '#4CAF50' : '#ced4da'}`,
                                          borderRadius: '5px',
                                          cursor: 'pointer',
                                          fontWeight: '600'
                                        }}
                                      >
                                        ❓ Quiz
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => {
                                      const start = Math.min(rangeStart, rangeEnd);
                                      const end = Math.max(rangeStart, rangeEnd);
                                      selectModuleRange(start, end, rangeFilter);
                                      setShowWeekDropdown(false);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '10px',
                                      fontSize: '13px',
                                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      fontWeight: '700',
                                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                                    }}
                                  >
                                    🚀 Apply Range Selection
                                  </button>
                                </div>
                                )}
                                
                                <div style={{
                                  padding: '12px',
                                  background: '#f8f9fa',
                                  borderBottom: '1px solid #e9ecef',
                                  position: 'sticky',
                                  top: patternedModules.length > 0 ? '64px' : '0',
                                  zIndex: 9
                                }}>
                                  <div style={{ 
                                    fontSize: '13px', 
                                    fontWeight: 'bold',
                                    color: '#495057',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <span>📅 Individual Selection</span>
                                    <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#6c757d' }}>
                                      ({allModules.length} modules)
                                    </span>
                                  </div>
                                </div>
                                
                                <div style={{
                                  maxHeight: '400px',
                                  overflowY: 'auto',
                                  overflowX: 'hidden'
                                }}>
                                  {allModules.map((moduleInfo) => (
                                    <div key={moduleInfo.identifier} style={{
                                      padding: '12px',
                                      borderBottom: '1px solid #f0f0f0',
                                      background: 'white'
                                    }}>
                                    <div style={{
                                      fontWeight: '600',
                                      marginBottom: '8px',
                                      color: '#212529',
                                      fontSize: '13px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <span style={{ 
                                        maxWidth: '250px', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {moduleInfo.display}
                                      </span>
                                      <span style={{
                                        fontSize: '11px',
                                        background: '#e9ecef',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        color: '#6c757d',
                                        fontWeight: '500',
                                        flexShrink: 0
                                      }}>
                                        {moduleInfo.totalTests} tests
                                      </span>
                                    </div>
                                    <div style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '6px'
                                    }}>
                                      <button
                                        onClick={() => {
                                          selectByModuleAndFilter(moduleInfo.moduleName, 'all');
                                          setShowWeekDropdown(false);
                                        }}
                                        style={{
                                          padding: '5px 10px',
                                          fontSize: '11px',
                                          background: '#6c757d',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '5px',
                                          cursor: 'pointer',
                                          fontWeight: '500',
                                          flex: '1 1 auto',
                                          minWidth: '65px'
                                        }}
                                      >
                                        ✅ All
                                      </button>
                                      {moduleInfo.hasPractice && (
                                        <button
                                          onClick={() => {
                                            selectByModuleAndFilter(moduleInfo.moduleName, 'practice');
                                            setShowWeekDropdown(false);
                                          }}
                                          style={{
                                            padding: '5px 10px',
                                            fontSize: '11px',
                                            background: '#2196F3',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            flex: '1 1 auto',
                                            minWidth: '65px'
                                          }}
                                          title={`${moduleInfo.practiceCount} practice test(s)`}
                                        >
                                          📝 Practice
                                        </button>
                                      )}
                                      {moduleInfo.hasKCQ && (
                                        <button
                                          onClick={() => {
                                            selectByModuleAndFilter(moduleInfo.moduleName, 'kcq');
                                            setShowWeekDropdown(false);
                                          }}
                                          style={{
                                            padding: '5px 10px',
                                            fontSize: '11px',
                                            background: '#FF9800',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            flex: '1 1 auto',
                                            minWidth: '65px'
                                          }}
                                          title={`${moduleInfo.kcqCount} KCQ test(s)`}
                                        >
                                          🎯 KCQ
                                        </button>
                                      )}
                                      {moduleInfo.hasAssessment && (
                                        <button
                                          onClick={() => {
                                            selectByModuleAndFilter(moduleInfo.moduleName, 'assessment');
                                            setShowWeekDropdown(false);
                                          }}
                                          style={{
                                            padding: '5px 10px',
                                            fontSize: '11px',
                                            background: '#9C27B0',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            flex: '1 1 auto',
                                            minWidth: '65px'
                                          }}
                                          title={`${moduleInfo.assessmentCount} assessment test(s)`}
                                        >
                                          📊 Assess
                                        </button>
                                      )}
                                      {moduleInfo.hasQuiz && (
                                        <button
                                          onClick={() => {
                                            selectByModuleAndFilter(moduleInfo.moduleName, 'quiz');
                                            setShowWeekDropdown(false);
                                          }}
                                          style={{
                                            padding: '5px 10px',
                                            fontSize: '11px',
                                            background: '#4CAF50',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontWeight: '500',
                                            flex: '1 1 auto',
                                            minWidth: '65px'
                                          }}
                                          title={`${moduleInfo.quizCount} quiz test(s)`}
                                        >
                                          ❓ Quiz
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                </div>
                              </>
                            ) : (
                              <div style={{
                                padding: '32px',
                                textAlign: 'center',
                                color: '#6c757d',
                                fontSize: '14px'
                              }}>
                                No modules found in this course
                              </div>
                            )}
                            
                            <div style={{
                              padding: '12px',
                              textAlign: 'center',
                              position: 'sticky',
                              bottom: 0,
                              background: 'white',
                              borderTop: '2px solid #f0f0f0'
                            }}>
                              <button
                                onClick={() => setShowWeekDropdown(false)}
                                style={{
                                  padding: '8px 24px',
                                  fontSize: '13px',
                                  background: '#f8f9fa',
                                  color: '#495057',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="qb-tree">
                {moduleTree.map((mod) => (
                  <div key={mod.id} className="qb-module-node">
                    <div
                      className="qb-module-header"
                      onClick={() => toggleModule(mod.id)}
                    >
                      <span className="qb-expand-icon">
                        {expandedModules.has(mod.id) ? "▼" : "▶"}
                      </span>
                      <span className="qb-module-name">📁 {mod.name}</span>
                      <span className="qb-test-badge">{mod.totalTests} tests</span>
                    </div>

                    {expandedModules.has(mod.id) && (
                      <div className="qb-module-content">
                        {mod.directTests.length > 0 && (
                          <div className="qb-section">
                            <div className="qb-section-title">📝 Direct Tests</div>
                            {mod.directTests.map((test) => (
                              <div key={test.id} className="qb-test-item">
                                <input
                                  type="checkbox"
                                  checked={selectedTests.has(test.id)}
                                  onChange={() => toggleTest(test.id)}
                                  className="qb-checkbox"
                                  id={test.id}
                                />
                                <label htmlFor={test.id} className="qb-test-label">
                                  {test.name}
                                  {test.isRuleBased && (
                                    <span 
                                      className="qb-rule-based-badge"
                                      style={{
                                        marginLeft: '8px',
                                        padding: '2px 8px',
                                        background: '#ff9800',
                                        color: 'white',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                      }}
                                      title="Rule Based Test - View functionality disabled"
                                    >
                                      🎲 Rule-Based
                                    </span>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}

                        {mod.subModules.map((sub) => (
                          <div key={sub.id} className="qb-sub-module-section">
                            <div className="qb-sub-module-title">
                              <span>📂 {sub.name}</span>
                              <span className="qb-sub-test-count">({sub.tests.length})</span>
                            </div>
                            {sub.tests.map((test) => (
                              <div key={test.id} className="qb-test-item">
                                <input
                                  type="checkbox"
                                  checked={selectedTests.has(test.id)}
                                  onChange={() => toggleTest(test.id)}
                                  className="qb-checkbox"
                                  id={test.id}
                                />
                                <label htmlFor={test.id} className="qb-test-label">
                                  {test.name}
                                  {test.isRuleBased && (
                                    <span 
                                      className="qb-rule-based-badge"
                                      style={{
                                        marginLeft: '8px',
                                        padding: '2px 8px',
                                        background: '#ff9800',
                                        color: 'white',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                      }}
                                      title="Rule Based Test - View functionality disabled"
                                    >
                                      🎲 Rule-Based
                                    </span>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleFetchQB}
                disabled={selectedTests.size === 0 || isLoading}
                className={`qb-button qb-button-success ${selectedTests.size === 0 ? "qb-button-disabled" : ""}`}
                style={{ marginTop: "16px" }}
              >
                {isLoading ? "🔄 Processing..." : `📥 Fetch QB (${selectedTests.size} selected)`}
              </button>
            </div>
          )}
        </div>
      )}

      {ui === "results" && !selectedQB && (
        <div className="qb-card">
          <div className="qb-results-header">
            <h3 className="qb-title">📊 Question Banks Found</h3>
            <div className="qb-header-actions">
              <button
                onClick={exportCSV}
                className="qb-button qb-button-success qb-button-small"
              >
                📥 Export CSV
              </button>
              <button
                onClick={() => setUI("search")}
                className="qb-button qb-button-secondary qb-button-small"
              >
                ← Back
              </button>
            </div>
          </div>

          {qbResults.length === 0 ? (
            <div className="qb-empty-state">No question banks found</div>
          ) : (
            <div className="qb-table-wrapper">
              <table className="qb-table">
                <thead>
                  <tr className="qb-table-header">
                    <th className="qb-th">QB Name</th>
                    <th className="qb-th">Questions</th>
                    <th className="qb-th">User Role</th>
                    <th className="qb-th">QB ID</th>
                    <th className="qb-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {qbResults.map((qb, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "qb-tr-even" : "qb-tr-odd"}
                      style={{
                        background: qb.hasRuleBasedTest 
                          ? 'linear-gradient(to right, #ffe0e0 0%, #ffffff 100%)' 
                          : undefined
                      }}
                    >
                    <td className="qb-td">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong>{qb.qb_name}</strong>
                        
                        {/* NEW: Indicator for QBs from test_rules */}
                        {qb.fromTestRulesOnly && (
                          <span 
                            style={{
                              fontSize: '11px',
                              color: '#6c757d',
                              fontStyle: 'italic'
                            }}
                            title="This QB was extracted from test_rules (no questions loaded)"
                          >
                            📋 From test rules
                          </span>
                        )}
                        
                        {qb.hasRuleBasedTest && (
                            <span 
                              style={{
                                fontSize: '11px',
                                color: '#dc3545',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title={`Rule-based tests: ${qb.ruleBasedTests.join(', ')}`}
                            >
                              🎲 Rule-Based QB - Clone/Move Disabled
                            </span>
                          )}
                        </div>
                      </td>
                    <td className="qb-td">
                      <span className="qb-badge">
                        {qb.fromTestRulesOnly ? '?' : qb.questionCount}
                      </span>
                    </td>
                      <td className="qb-td">{qb.user_role}</td>
                      <td className="qb-td qb-mono">{qb.qb_id}</td>
                      <td className="qb-td">
                        {qb.hasRuleBasedTest ? (
                          <button
                            className="qb-button qb-button-small qb-button-warning"
                            onClick={() => {
                              copyToClipboard(qb.qb_name);
                            }}
                            title="Rule-based test detected - View disabled. Click to copy QB name"
                          >
                            📋 Copy Name
                          </button>
                        ) : (
                          // <button
                          //   className="qb-button qb-button-small qb-button-info"
                          //   onClick={async () => {
                          //     const usedQIds = new Set();
                          //     const testNames = [];

                          //     if (testQuestionMap[qb.qb_id]) {
                          //       Object.entries(testQuestionMap[qb.qb_id]).forEach(
                          //         ([tName, qIds]) => {
                          //           testNames.push(tName);
                          //           qIds.forEach((q) => usedQIds.add(q));
                          //         }
                          //       );
                          //     }

                          //     if (usedQIds.size === 0) {
                          //       showAlert(
                          //         "No questions from selected tests in this QB",
                          //         "warning"
                          //       );
                          //       return;
                          //     }

                          //     setUsedQuestionIds(usedQIds);
                          //     setShowAllQuestions(false);

                          //     setSelectedQB({
                          //       ...qb,
                          //       testNames,
                          //       usedQIds: Array.from(usedQIds)
                          //     });

                          //     showOverlay("📚 Fetching questions...");
                          //     try {
                          //       const allQuestions = await fetchQBQuestions(
                          //         qb.qb_id
                          //       );
                          //       setAllQuestions(allQuestions);
                          //       const filtered = allQuestions.filter((q) =>
                          //         usedQIds.has(q.q_id)
                          //       );
                          //       setQbQuestions(filtered);
                          //       setSelectedQuestions(new Set());
                          //       setClonedQuestions([]);
                          //       hideOverlay();
                          //     } catch (err) {
                          //       hideOverlay();
                          //       showAlert(
                          //         "Error fetching questions: " + err.message,
                          //         "danger"
                          //       );
                          //     }
                          //   }}
                          // >
                          //   👁️ View
                          // </button>

                          // REPLACE the View button's onClick handler (around line 2380) with this:

                      <button
                        className="qb-button qb-button-small qb-button-info"
                        onClick={async () => {
                          const usedQIds = new Set();
                          const testNames = [];

                          if (testQuestionMap[qb.qb_id]) {
                            Object.entries(testQuestionMap[qb.qb_id]).forEach(
                              ([tName, qIds]) => {
                                testNames.push(tName);
                                qIds.forEach((q) => usedQIds.add(q));
                              }
                            );
                          }

                          if (usedQIds.size === 0) {
                            showAlert(
                              "No questions from selected tests in this QB",
                              "warning"
                            );
                            return;
                          }

                          setUsedQuestionIds(usedQIds);
                          setShowAllQuestions(false);

                          setSelectedQB({
                            ...qb,
                            testNames,
                            usedQIds: Array.from(usedQIds)
                          });

                          showOverlay("📚 Fetching questions...");
                          try {
                            const allQuestions = await fetchQBQuestions(qb.qb_id);
                            setAllQuestions(allQuestions);
                            
                            // ✅ NEW: Check for Rule-Based tests immediately when viewing QB
                            if (!qb.hasRuleBasedTest) {
                              showOverlay("🔍 Checking for Rule-Based tests in QB...");
                              const { hasRuleBased, ruleBasedTests } = await checkQBForRuleBasedTests(qb.qb_id, allQuestions);
                              
                              if (hasRuleBased) {
                                // Update the selected QB with Rule-Based info
                                setSelectedQB(prev => ({
                                  ...prev,
                                  hasRuleBasedTest: true,
                                  ruleBasedTests: ruleBasedTests
                                }));
                                
                                // Also update the qbResults to persist this info
                                setQbResults(prevResults => 
                                  prevResults.map(qbItem => 
                                    qbItem.qb_id === qb.qb_id 
                                      ? { ...qbItem, hasRuleBasedTest: true, ruleBasedTests: ruleBasedTests }
                                      : qbItem
                                  )
                                );
                                
                                const filtered = allQuestions.filter((q) => usedQIds.has(q.q_id));
                                setQbQuestions(filtered);
                                setSelectedQuestions(new Set());
                                setClonedQuestions([]);
                                
                                hideOverlay();
                                showAlert(
                                  `⚠️ Rule-Based QB detected! Clone/Move disabled. Tests: ${ruleBasedTests.join(", ")}`,
                                  "warning"
                                );
                                return;
                              }
                            }
                            
                            const filtered = allQuestions.filter((q) => usedQIds.has(q.q_id));
                            setQbQuestions(filtered);
                            setSelectedQuestions(new Set());
                            setClonedQuestions([]);
                            hideOverlay();
                          } catch (err) {
                            hideOverlay();
                            showAlert(
                              "Error fetching questions: " + err.message,
                              "danger"
                            );
                          }
                        }}
                      >
                        👁️ View
                      </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="qb-stats">
            <p>
              <strong>Total Question Banks:</strong> {qbResults.length}
            </p>
            <p>
              <strong>Total Questions:</strong>{" "}
              {qbResults.reduce(
                (sum, qb) => sum + (qb.questionCount || 0),
                0
              )}
            </p>
            <p>
              <strong>Rule-Based QBs:</strong>{" "}
              <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                {qbResults.filter(qb => qb.hasRuleBasedTest).length}
              </span>
            </p>
          </div>
        </div>
      )}

      {ui === "results" && selectedQB && (
        <div className="qb-card">
          <div className="qb-detail-header">
            <div>
              <h3 className="qb-title">
                📖 {selectedQB.qb_name}
                {selectedQB.hasRuleBasedTest && (
                  <span 
                    style={{
                      marginLeft: '12px',
                      padding: '4px 12px',
                      background: '#dc3545',
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 'bold'
                    }}
                    title={`Rule-based tests: ${selectedQB.ruleBasedTests?.join(', ')}`}
                  >
                    🎲 Rule-Based QB
                  </span>
                )}
              </h3>
              <p className="qb-subtitle">
                {showAllQuestions ? "ALL questions in QB" : "Questions used in selected tests"}
              </p>
              <p className="qb-test-info">
                {!showAllQuestions && (
                  <>📝 From: {selectedQB.testNames?.join(", ")}</>
                )}
              </p>
              {selectedQB.hasRuleBasedTest && (
                <p style={{
                  color: '#dc3545',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  marginTop: '8px'
                }}>
                  ⚠️ Clone and Move operations are disabled for Rule-Based QBs
                </p>
              )}
            </div>

            <div className="qb-header-actions">
              <button
                onClick={async () => {
                  showOverlay("🔄 Refreshing questions...");
                  try {
                    const updatedQuestions = await fetchQBQuestions(selectedQB.qb_id);
                    setAllQuestions(updatedQuestions);
                    setQbQuestions(updatedQuestions);
                    hideOverlay();
                    showAlert("✅ Questions refreshed", "success");
                  } catch (err) {
                    hideOverlay();
                    showAlert("Error refreshing questions: " + err.message, "danger");
                  }
                }}
                className="qb-button qb-button-small qb-button-secondary"
                style={{ marginRight: "8px" }}
                title="Refresh questions"
              >
                🔄 Refresh
              </button>

              <button
                onClick={toggleQuestionView}
                className="qb-button qb-button-small qb-button-secondary"
                style={{ marginRight: "8px" }}
              >
                {showAllQuestions ? "👁️ Show Used Only" : "👁️ Show All"}
              </button>

              <button
                onClick={handleCloneQuestions}
                disabled={selectedQuestions.size === 0 || selectedQB.hasRuleBasedTest}
                className={`qb-button qb-button-small qb-button-warning ${
                  (selectedQuestions.size === 0 || selectedQB.hasRuleBasedTest) ? "qb-button-disabled" : ""
                }`}
                style={{ marginRight: "8px" }}
                title={selectedQB.hasRuleBasedTest ? "Clone disabled for Rule-Based QB" : "Clone selected questions"}
              >
                🔄 Clone ({selectedQuestions.size})
              </button>

              {showAllQuestions && (clonedQuestions.length > 0 || selectedQuestions.size > 0) && (
                <button
                  onClick={() => {
                    setShowMoveModal(true);
                    setMoveSearchResults([]);
                    setSelectedTargetQB(null);
                  }}
                  disabled={selectedQB.hasRuleBasedTest}
                  className={`qb-button qb-button-small qb-button-success ${selectedQB.hasRuleBasedTest ? "qb-button-disabled" : ""}`}
                  style={{ marginRight: "8px" }}
                  title={selectedQB.hasRuleBasedTest ? "Move disabled for Rule-Based QB" : "Move selected questions"}
                >
                  📦 Move (
                  {clonedQuestions.length > 0
                    ? clonedQuestions.length
                    : selectedQuestions.size}
                  )
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedQB(null);
                  setClonedQuestions([]);
                  setSelectedQuestions(new Set());
                  setShowAllQuestions(false);
                  setAllQuestions([]);
                  setUsedQuestionIds(new Set());
                }}
                className="qb-button qb-button-small qb-button-secondary"
              >
                ← Back to QBs
              </button>
            </div>
          </div>

          <div className="qb-view-mode-indicator">
            <span className={`qb-view-mode-badge ${showAllQuestions ? 'qb-view-mode-all' : 'qb-view-mode-used'}`}>
              {showAllQuestions ? "📚 Viewing ALL questions" : "🎯 Viewing USED questions only"}
            </span>
            {showAllQuestions && (
              <span className="qb-view-mode-hint">
                (Cloned questions have green background)
              </span>
            )}
            {!showAllQuestions && (
              <span className="qb-view-mode-hint">
                (Clone questions to enable Move functionality)
              </span>
            )}
          </div>

          <div className="qb-questions-section">
            <div className="qb-question-header">
              <label className="qb-checkbox-label">
                <input
                  type="checkbox"
                  className="qb-checkbox"
                  checked={
                    selectedQuestions.size === filteredQuestions.length &&
                    filteredQuestions.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedQuestions(
                        new Set(filteredQuestions.map((q) => q.q_id))
                      );
                    } else {
                      setSelectedQuestions(new Set());
                    }
                    }}
                disabled={selectedQB.hasRuleBasedTest}
                title={selectedQB.hasRuleBasedTest ? "Selection disabled for Rule-Based QB" : "Select all questions"}
                />
                Select All ({filteredQuestions.length})
              </label>
              <div className="qb-question-count">
                {showAllQuestions && allQuestions.length > 0 && (
                  <span className="qb-total-count">
                    Total in QB: {allQuestions.length}
                  </span>
                )}
                {!showAllQuestions && usedQuestionIds.size > 0 && (
                  <span className="qb-used-count">
                    Used in tests: {usedQuestionIds.size}
                  </span>
                )}
                {showAllQuestions && clonedQuestions.length > 0 && (
                  <span className="qb-cloned-count">
                    Cloned: {clonedQuestions.length}
                  </span>
                )}
                {filteredQuestions.length < qbQuestions.length && (
                  <span className="qb-filtered-count">
                    Filtered: {filteredQuestions.length}/{qbQuestions.length}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Section */}
            <div className="qb-filter-section" style={{
              background: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #dee2e6'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: showFilters ? '16px' : '0'
              }}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="qb-button qb-button-small qb-button-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>{showFilters ? '▼' : '▶'}</span>
                  <span>🔍 Filters</span>
                  {hasActiveFilters() && (
                    <span style={{
                      background: '#ff9800',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      Active
                    </span>
                  )}
                </button>
                
                {hasActiveFilters() && (
                  <button
                    onClick={resetFilters}
                    className="qb-button qb-button-small qb-button-danger"
                  >
                    ✖️ Clear Filters
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="qb-filter-controls" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px'
                }}>
                  {/* Search Filter */}
                  <div className="qb-filter-item">
                    <label className="qb-label" style={{ marginBottom: '6px', display: 'block' }}>
                      🔎 Search Text
                    </label>
                    <input
                      type="text"
                      value={filters.searchText}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                      placeholder="Search question text or ID..."
                      className="qb-input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Difficulty Filter */}
                  <div className="qb-filter-item">
                    <label className="qb-label" style={{ marginBottom: '6px', display: 'block' }}>
                      📊 Difficulty Level
                    </label>
                    <select
                      value={filters.difficulty}
                      onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="qb-input"
                      style={{ width: '100%' }}
                    >
                      <option value="all">All Levels</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Cloned Status Filter */}
                  {showAllQuestions && (
                    <div className="qb-filter-item">
                      <label className="qb-label" style={{ marginBottom: '6px', display: 'block' }}>
                        ✅ Cloned Status
                      </label>
                      <select
                        value={filters.clonedStatus}
                        onChange={(e) => setFilters(prev => ({ ...prev, clonedStatus: e.target.value }))}
                        className="qb-input"
                        style={{ width: '100%' }}
                      >
                        <option value="all">All Questions</option>
                        <option value="cloned">Cloned Only</option>
                        <option value="original">Original Only</option>
                      </select>
                    </div>
                  )}

                  {/* Used Status Filter */}
                  {showAllQuestions && (
                    <div className="qb-filter-item">
                      <label className="qb-label" style={{ marginBottom: '6px', display: 'block' }}>
                        🎯 Used in Tests
                      </label>
                      <select
                        value={filters.usedStatus}
                        onChange={(e) => setFilters(prev => ({ ...prev, usedStatus: e.target.value }))}
                        className="qb-input"
                        style={{ width: '100%' }}
                      >
                        <option value="all">All Questions</option>
                        <option value="used">Used Only</option>
                        <option value="unused">Unused Only</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="qb-empty-state">
                {hasActiveFilters() 
                  ? "No questions match the current filters" 
                  : (showAllQuestions ? "No questions found in this QB" : "No questions from selected tests")
                }
              </div>
            ) : (
              <div className="qb-questions-list">
                {filteredQuestions.map((q, idx) => {
                  const isUsed = usedQuestionIds.has(q.q_id);
                  const isCloned = clonedQuestions.includes(q.q_id);
                  const isSelected = selectedQuestions.has(q.q_id);
                  
                  return (
                    <div 
                      key={q.q_id} 
                      className={`qb-question-card ${isCloned ? 'qb-question-cloned' : ''} ${isUsed && !showAllQuestions ? 'qb-question-used' : ''}`}
                    >
                      <div className="qb-question-card-header">
                        <input
                          type="checkbox"
                          className="qb-checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const copy = new Set(selectedQuestions);
                            copy.has(q.q_id)
                              ? copy.delete(q.q_id)
                              : copy.add(q.q_id);
                            setSelectedQuestions(copy);
                          }}
                          disabled={selectedQB.hasRuleBasedTest}
                          title={selectedQB.hasRuleBasedTest ? "Selection disabled for Rule-Based QB" : ""}
                        />
                        <span className="qb-question-number">
                          Q{idx + 1}
                        </span>
                        <span className="qb-qid-badge">
                          {q.q_id?.slice(0, 8) || 'N/A'}…
                        </span>
                        
                        <div className="qb-question-status">
                          {isCloned && (
                            <span className="qb-cloned-badge" title="Cloned question">
                              ✅ Cloned
                            </span>
                          )}
                          {!showAllQuestions && isUsed && (
                            <span className="qb-used-badge" title="Used in selected tests">
                              🎯 Used
                            </span>
                          )}
                          {showAllQuestions && isUsed && !isCloned && (
                            <span className="qb-used-badge" title="Used in selected tests">
                              🎯
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className="qb-question-text"
                        dangerouslySetInnerHTML={{
                          __html:
                            q.question_data?.slice(0, 250) || "No content"
                        }}
                      />

                      <div className="qb-question-meta">
                        <span className="qb-meta-item">
                          <span className="qb-meta-label">Type:</span>
                          <span className="qb-meta-value">
                            {q.question_editor_type === 1 ? "MCQ" : "Other"}
                          </span>
                        </span>
                        <span className="qb-meta-item">
                          <span className="qb-meta-label">QB:</span>
                          <span className="qb-meta-value qb-mono" title={q.qb_id}>
                            {q.qb_id?.slice(0, 8) || 'N/A'}…
                          </span>
                        </span>
                        {q.imported && q.imported !== "original_question" && (
                          <span className="qb-meta-item qb-imported-info" title={`Cloned from: ${q.imported}`}>
                            <span className="qb-meta-label">🔗</span>
                            <span className="qb-meta-value">Cloned</span>
                          </span>
                        )}
                        {q.difficulty_level && (
                          <span className="qb-meta-item">
                            <span className="qb-meta-label">Level:</span>
                            <span className={`qb-meta-value qb-difficulty qb-difficulty-${q.difficulty_level.toLowerCase()}`}>
                              {q.difficulty_level}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}