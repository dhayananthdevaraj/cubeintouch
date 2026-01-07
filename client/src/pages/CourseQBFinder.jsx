
// import { useState, useEffect } from "react";
// import { DEPARTMENT_IDS } from "../config";
// import "./CourseQBFinder.css";

// const API = "https://api.examly.io";

// export default function CourseQBFinder() {
//   const [token, setToken] = useState(() => {
//     try {
//       return localStorage.getItem("examly_token") || "";
//     } catch {
//       return "";
//     }
//   });
//   const [ui, setUI] = useState(token ? "search" : "welcome");
//   const [courseName, setCourseName] = useState("");
//   const [status, setStatus] = useState("");
//   const [alert, setAlert] = useState(null);
//   const [moduleTree, setModuleTree] = useState([]);
//   const [expandedModules, setExpandedModules] = useState(new Set());
//   const [selectedTests, setSelectedTests] = useState(new Set());
//   const [qbResults, setQbResults] = useState([]);
//   const [tokenInput, setTokenInput] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");
//   const [selectedQB, setSelectedQB] = useState(null);
//   const [qbQuestions, setQbQuestions] = useState([]);
//   const [selectedQuestions, setSelectedQuestions] = useState(new Set());
//   const [testQuestionMap, setTestQuestionMap] = useState({});
//   const [clonedQuestions, setClonedQuestions] = useState([]);
//   const [showMoveModal, setShowMoveModal] = useState(false);
//   const [moveSearchTerm, setMoveSearchTerm] = useState("");
//   const [moveSearchResults, setMoveSearchResults] = useState([]);
//   const [selectedTargetQB, setSelectedTargetQB] = useState(null);
//   const [showAllQuestions, setShowAllQuestions] = useState(false);
//   const [allQuestions, setAllQuestions] = useState([]);
//   const [usedQuestionIds, setUsedQuestionIds] = useState(new Set());
//   const [allQuestionIdsBeforeClone, setAllQuestionIdsBeforeClone] = useState([]);

//   useEffect(() => {
//     if (token) setUI("search");
//     else setUI("welcome");
//   }, [token]);

//   const showAlert = (msg, type = "warning") => {
//     setAlert({ msg, type });
//     setTimeout(() => setAlert(null), 4000);
//   };

//   const showOverlay = (msg) => {
//     setOverlayText(msg);
//     setOverlay(true);
//   };

//   const hideOverlay = () => setOverlay(false);

//   const saveToken = () => {
//     if (!tokenInput.trim()) {
//       showAlert("Token cannot be empty", "danger");
//       return;
//     }
//     try {
//       localStorage.setItem("examly_token", tokenInput.trim());
//       setToken(tokenInput.trim());
//       setTokenInput("");
//       setUI("search");
//       showAlert("Token saved successfully!", "success");
//     } catch (err) {
//       showAlert("Failed to save token: " + err.message, "danger");
//     }
//   };

//   const clearToken = () => {
//     try {
//       localStorage.removeItem("examly_token");
//     } catch (err) {
//       console.error("Failed to clear token:", err);
//     }
//     setToken("");
//     setUI("welcome");
//     setTokenInput("");
//     setModuleTree([]);
//     setSelectedTests(new Set());
//     setQbResults([]);
//     showAlert("Token cleared", "danger");
//   };

//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: token
//   };

//   const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

//   async function findCourseByName(name) {
//     const res = await fetch(`${API}/api/v2/courses/filter`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         mainDepartmentUser: true,
//         page: 1,
//         limit: 100,
//         search: name,
//         department_id: DEPARTMENT_IDS,
//         branch_id: [],
//         batch_id: "All",
//         publishType: [],
//         publisherCourseOnly: false,
//         tag_id: []
//       })
//     });
//     const json = await res.json();
//     return json?.rows?.[0]?.c_id || json?.rows?.[0]?.$c_id || null;
//   }

//   async function getCourseDetails(id) {
//     const res = await fetch(`${API}/api/v2/course/${id}`, {
//       headers: { Authorization: token }
//     });
//     const json = await res.json();
//     return json.course || json;
//   }

//   async function fetchTestDetailsForModule(t_id) {
//     const res = await fetch(`${API}/api/questions/test/${t_id}`, {
//       headers: { Authorization: token }
//     });
//     const json = await res.json();
//     return json?.[0]?.non_group_questions || [];
//   }

//   async function getQuestionBanks(qbIdList) {
//     if (!qbIdList || qbIdList.length === 0) {
//       return [];
//     }

//     const res = await fetch(`${API}/api/questionbanks/all`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         department_id: DEPARTMENT_IDS,
//         qb_id_list: qbIdList,
//         isTestPreview: true,
//         mainDepartmentUser: true
//       })
//     });

//     const json = await res.json();
//     return json?.questionbanks || [];
//   }

//   async function fetchQBQuestions(qbId) {
//     console.log("📥 fetchQBQuestions called for QB:", qbId);
    
//     const res = await fetch(`${API}/api/v2/questionfilter`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         qb_id: qbId,
//         page: 1,
//         limit: 200,
//         type: "Single"
//       })
//     });

//     const json = await res.json();
//     const questions = json?.non_group_questions || [];
    
//     console.log("📊 Total questions fetched:", questions.length);
    
//     if (questions.length > 0) {
//       console.log("🔍 Sample questions:", questions.slice(0, 3).map(q => ({
//         q_id: q.q_id,
//         imported: q.imported,
//         question_data: q.question_data?.substring(0, 50) + '...'
//       })));
//     }
    
//     return questions;
//   }

//   async function cloneQuestions(qbId, qIds) {
//     console.log("🔧 Sending to clone API - QB ID:", qbId, "Question IDs:", qIds);
//     console.log("🔧 Selected count:", qIds.length);
    
//     const res = await fetch(`${API}/api/questionBulkClone`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         qb_id: qbId,
//         q_id: qIds,  // Make sure this is ONLY the selected IDs
//         g_id: null
//       })
//     });

//     if (!res.ok) {
//       throw new Error("Failed to clone questions");
//     }

//     const result = await res.json();
//     console.log("🔧 Clone API response:", result);
//     return result;
//   }

//   async function searchQuestionBanks(searchTerm) {
//     const res = await fetch(`${API}/api/questionbanks/all`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         department_id: DEPARTMENT_IDS,
//         limit: 20,
//         mainDepartmentUser: true,
//         page: 1,
//         search: searchTerm
//       })
//     });

//     const json = await res.json();
//     return json?.questionbanks || [];
//   }

//   async function moveQuestion(qId, qType, targetQbId, currentQbId) {
//     const res = await fetch(
//       `${API}/api/questionMove?q_id=${qId}&q_type=${qType}&qb_id=${targetQbId}&current_qb_id=${currentQbId}`,
//       {
//         method: "GET",
//         headers: { Authorization: token }
//       }
//     );

//     const json = await res.json();
//     if (!json.success) {
//       throw new Error(json.message || "Failed to move question");
//     }
//     return json;
//   }

//   function buildModuleTree(courseData) {
//     const courseModules = courseData.course_modules?.c_module_data || [];
    
//     const tree = courseModules.map((mod, modIdx) => {
//       const directTests = [];
      
//       (mod.c_module_params || []).forEach((param) => {
//         if (param.t_id) {
//           directTests.push({
//             id: `${modIdx}-direct-${param.t_id}`,
//             t_id: param.t_id,
//             name: param.t_name || `Test ${param.t_id.slice(0, 8)}`,
//             type: "direct"
//           });
//         }
//       });

//       const subModules = [];
//       if (Array.isArray(mod.c_sub_modules) && mod.c_sub_modules.length > 0) {
//         mod.c_sub_modules.forEach((sub, subIdx) => {
//           const subTests = [];
          
//           (sub.sub_module_params || []).forEach((param) => {
//             if (param.t_id) {
//               subTests.push({
//                 id: `${modIdx}-${subIdx}-${param.t_id}`,
//                 t_id: param.t_id,
//                 name: param.t_name || `Test ${param.t_id.slice(0, 8)}`,
//                 type: "sub"
//               });
//             }
//           });

//           if (subTests.length > 0) {
//             subModules.push({
//               id: `${modIdx}-${subIdx}`,
//               name: sub.sub_module_name || `Sub-module ${subIdx + 1}`,
//               tests: subTests
//             });
//           }
//         });
//       }

//       const totalTests = directTests.length + subModules.reduce((sum, s) => sum + s.tests.length, 0);

//       return {
//         id: modIdx,
//         name: mod.c_module_name || `Module ${modIdx + 1}`,
//         directTests,
//         subModules,
//         totalTests
//       };
//     });

//     return tree.filter(m => m.totalTests > 0);
//   }

//   async function handleSearchCourse() {
//     if (!courseName.trim()) {
//       showAlert("Please enter a course name", "warning");
//       return;
//     }

//     setIsLoading(true);
//     setStatus("🔎 Finding course...");
//     setModuleTree([]);
//     setSelectedTests(new Set());
//     setQbResults([]);

//     try {
//       const courseId = await findCourseByName(courseName);
//       if (!courseId) {
//         showAlert("❌ Course not found", "danger");
//         setIsLoading(false);
//         return;
//       }

//       setStatus("📋 Fetching course details...");
//       const course = await getCourseDetails(courseId);
      
//       const tree = buildModuleTree(course);

//       if (!tree.length) {
//         showAlert("❌ No modules with tests found in course", "danger");
//         setIsLoading(false);
//         return;
//       }

//       setModuleTree(tree);
//       const totalTests = tree.reduce((sum, m) => sum + m.totalTests, 0);
//       setStatus(`✅ Found ${tree.length} modules with ${totalTests} tests total.`);
//       setIsLoading(false);
//     } catch (err) {
//       showAlert("Error: " + err.message, "danger");
//       console.error(err);
//       setIsLoading(false);
//     }
//   }

//   const toggleModule = (moduleId) => {
//     const newExpanded = new Set(expandedModules);
//     if (newExpanded.has(moduleId)) {
//       newExpanded.delete(moduleId);
//     } else {
//       newExpanded.add(moduleId);
//     }
//     setExpandedModules(newExpanded);
//   };

//   const toggleTest = (testId) => {
//     const newSelected = new Set(selectedTests);
//     if (newSelected.has(testId)) {
//       newSelected.delete(testId);
//     } else {
//       newSelected.add(testId);
//     }
//     setSelectedTests(newSelected);
//   };

//   const selectAllTests = () => {
//     const allTestIds = new Set();
//     moduleTree.forEach(mod => {
//       mod.directTests.forEach(t => allTestIds.add(t.id));
//       mod.subModules.forEach(sub => {
//         sub.tests.forEach(t => allTestIds.add(t.id));
//       });
//     });
//     setSelectedTests(allTestIds);
//   };

//   const deselectAllTests = () => {
//     setSelectedTests(new Set());
//   };

//   async function handleFetchQB() {
//     if (selectedTests.size === 0) {
//       showAlert("Please select at least one test", "warning");
//       return;
//     }

//     setIsLoading(true);
//     showOverlay("🔍 Fetching question banks...");

//     try {
//       const allQBIds = new Set();
//       let processedTests = 0;
//       const qbToTestMap = {};
//       const testQMap = {};

//       for (const testId of selectedTests) {
//         showOverlay(
//           `📋 Processing tests: ${processedTests + 1}/${selectedTests.size}`
//         );

//         let actualTId = null;
//         let testName = null;
        
//         for (const mod of moduleTree) {
//           const directTest = mod.directTests.find(t => t.id === testId);
//           if (directTest) {
//             actualTId = directTest.t_id;
//             testName = directTest.name;
//             break;
//           }
//           for (const sub of mod.subModules) {
//             const subTest = sub.tests.find(t => t.id === testId);
//             if (subTest) {
//               actualTId = subTest.t_id;
//               testName = subTest.name;
//               break;
//             }
//           }
//           if (actualTId) break;
//         }

//         if (actualTId) {
//           try {
//             const questions = await fetchTestDetailsForModule(actualTId);
//             testQMap[actualTId] = questions;
            
//             questions.forEach((q) => {
//               if (q.qb_id) {
//                 allQBIds.add(q.qb_id);
                
//                 if (!qbToTestMap[q.qb_id]) {
//                   qbToTestMap[q.qb_id] = {};
//                 }
//                 if (!qbToTestMap[q.qb_id][testName]) {
//                   qbToTestMap[q.qb_id][testName] = [];
//                 }
//                 qbToTestMap[q.qb_id][testName].push(q.q_id);
//               }
//             });

//             await sleep(200);
//           } catch (err) {
//             console.warn(`Failed to fetch test ${actualTId}:`, err);
//           }
//         }

//         processedTests++;
//       }

//       if (allQBIds.size === 0) {
//         hideOverlay();
//         showAlert("❌ No question banks found in selected tests", "warning");
//         setIsLoading(false);
//         return;
//       }

//       showOverlay(`📚 Fetching details for ${allQBIds.size} question bank(s)...`);

//       const qbList = await getQuestionBanks(Array.from(allQBIds));

//       setTestQuestionMap(qbToTestMap);
//       setQbResults(qbList);
//       setUI("results");
//       showAlert(`✅ Found ${qbList.length} question bank(s)`, "success");
//     } catch (err) {
//       showAlert("Error: " + err.message, "danger");
//       console.error(err);
//     } finally {
//       hideOverlay();
//       setIsLoading(false);
//     }
//   }

//   const handleCloneQuestions = async () => {
//     // Get selected question IDs
//     const selectedQIds = Array.from(selectedQuestions);
//     console.log("🔄 Starting clone with selected IDs:", selectedQIds);
    
//     if (selectedQIds.length === 0) {
//       showAlert("Please select questions to clone", "warning");
//       return;
//     }

//     // FIRST: Fetch ALL questions to get complete list of IDs
//     showOverlay("📚 Fetching current questions for comparison...");
    
//     try {
//       // Get ALL current questions in QB (not just displayed ones)
//       const allCurrentQuestions = await fetchQBQuestions(selectedQB.qb_id);
//       const currentQuestionIds = allCurrentQuestions.map(q => q.q_id);
      
//       console.log("📋 ALL question IDs before clone:", currentQuestionIds);
//       console.log("📋 Total questions in QB before clone:", currentQuestionIds.length);
      
//       hideOverlay();
      
//       // Now clone the selected questions
//       showOverlay(`🔄 Cloning ${selectedQIds.length} question(s)...`);

//       const result = await cloneQuestions(selectedQB.qb_id, selectedQIds);
      
//       console.log("📦 Clone API response:", result);
      
//       hideOverlay();
      
//       if (result.success) {
//         showAlert(`✅ Successfully cloned ${selectedQIds.length} question(s)!`, "success");
        
//         // Switch to all questions view
//         setShowAllQuestions(true);
//         showOverlay("📚 Refreshing questions to find cloned ones...");
        
//         try {
//           // Fetch all questions again to get updated data
//           const updatedQuestions = await fetchQBQuestions(selectedQB.qb_id);
//           setAllQuestions(updatedQuestions);
//           setQbQuestions(updatedQuestions);
          
//           // Get updated IDs
//           const updatedQuestionIds = updatedQuestions.map(q => q.q_id);
          
//           // Find newly added question IDs (ones that weren't there before)
//           const newQuestionIds = [];
//           for (const id of updatedQuestionIds) {
//             if (!currentQuestionIds.includes(id)) {
//               newQuestionIds.push(id);
//             }
//           }
          
//           console.log("🔍 Finding cloned questions:");
//           console.log("Before clone:", currentQuestionIds.length, "questions");
//           console.log("After clone:", updatedQuestionIds.length, "questions");
//           console.log("New question IDs found:", newQuestionIds);
//           console.log("New question count:", newQuestionIds.length);
//           console.log("Selected count:", selectedQIds.length);
          
//           // Only mark as cloned if the new IDs match the selected count
//           if (newQuestionIds.length > 0) {
//             // IMPORTANT: Only mark as cloned if it's a reasonable number
//             // If newQuestionIds is huge (like 31), it means ALL unused were cloned
//             if (newQuestionIds.length === selectedQIds.length) {
//               // Good case: Only cloned what was selected
//               setClonedQuestions(prev => [...prev, ...newQuestionIds]);
//               console.log("🎯 Auto-selecting cloned questions:", newQuestionIds);
//               setSelectedQuestions(new Set(newQuestionIds));
              
//               hideOverlay();
//               showAlert(`✅ Found ${newQuestionIds.length} cloned question(s)! They are highlighted in green.`, "success");
//             } else {
//               // Bad case: Cloned more than selected (like cloning 31 instead of 1)
//               console.warn("⚠️ Cloned more questions than selected!");
//               console.warn("Selected:", selectedQIds.length, "New:", newQuestionIds.length);
              
//               // Try to identify which ones are actual clones based on the selected IDs
//               // Look for questions with similar content to the selected ones
//               const selectedQuestionsData = allCurrentQuestions.filter(q => selectedQIds.includes(q.q_id));
//               const actualClones = [];
              
//               newQuestionIds.forEach(newId => {
//                 const newQ = updatedQuestions.find(q => q.q_id === newId);
//                 if (newQ) {
//                   // Check if this new question matches any selected question content
//                   selectedQuestionsData.forEach(selectedQ => {
//                     const newContent = newQ.question_data || '';
//                     const selectedContent = selectedQ.question_data || '';
                    
//                     // If first 100 characters match, consider it a clone
//                     if (newContent.substring(0, 100) === selectedContent.substring(0, 100)) {
//                       actualClones.push(newId);
//                     }
//                   });
//                 }
//               });
              
//               if (actualClones.length > 0) {
//                 setClonedQuestions(prev => [...prev, ...actualClones]);
//                 console.log("🎯 Auto-selecting actual cloned questions:", actualClones);
//                 setSelectedQuestions(new Set(actualClones));
                
//                 hideOverlay();
//                 showAlert(`✅ Found ${actualClones.length} cloned question(s)! The API cloned ${newQuestionIds.length} total.`, "warning");
//               } else {
//                 // Fallback: Just mark all new ones as cloned
//                 setClonedQuestions(prev => [...prev, ...newQuestionIds]);
//                 console.log("⚠️ Could not identify actual clones, marking all new as cloned:", newQuestionIds);
//                 setSelectedQuestions(new Set(newQuestionIds));
                
//                 hideOverlay();
//                 showAlert(`⚠️ Cloned ${newQuestionIds.length} questions (may include unintended ones).`, "warning");
//               }
//             }
//           } else {
//             hideOverlay();
//             showAlert("⚠️ Questions cloned but no new IDs detected. Try refreshing the page.", "warning");
//           }
//         } catch (err) {
//           hideOverlay();
//           showAlert("⚠️ Cloned but failed to refresh questions: " + err.message, "warning");
//         }
//       } else {
//         showAlert("⚠️ Clone operation failed", "warning");
//       }
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error cloning questions: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleSearchTargetQB = async () => {
//     if (!moveSearchTerm.trim()) {
//       showAlert("Please enter a search term", "warning");
//       return;
//     }

//     showOverlay("🔍 Searching question banks...");

//     try {
//       const results = await searchQuestionBanks(moveSearchTerm);
//       setMoveSearchResults(results);
//       hideOverlay();
      
//       if (results.length === 0) {
//         showAlert("No question banks found", "warning");
//       }
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error searching: " + err.message, "danger");
//       console.error(err);
//     }
//   };

// const handleMoveQuestions = async () => {
//   if (!selectedTargetQB) {
//     showAlert("Please select a target question bank", "warning");
//     return;
//   }

//   const questionsToMove = clonedQuestions.length > 0 ? clonedQuestions : Array.from(selectedQuestions);
  
//   if (questionsToMove.length === 0) {
//     showAlert("No questions to move", "warning");
//     return;
//   }

//   // Store target QB name before closing modal
//   const targetQBName = selectedTargetQB.qb_name;
//   const targetQBId = selectedTargetQB.qb_id;

//   // Close modal FIRST
//   setShowMoveModal(false);
  
//   // Small delay to let modal close animation complete
//   await sleep(300);

//   // NOW show the overlay
//   showOverlay(`📦 Moving ${questionsToMove.length} question(s)...`);

//   try {
//     let successCount = 0;
//     let failCount = 0;

//     // Process in batches of 3 using Promise.all
//     const batchSize = 3;
//     for (let i = 0; i < questionsToMove.length; i += batchSize) {
//       const batch = questionsToMove.slice(i, i + batchSize);
      
//       // Update overlay with progress
//       showOverlay(`📦 Moving: ${Math.min(i + batchSize, questionsToMove.length)}/${questionsToMove.length}`);
      
//       // Process batch in parallel
//       const batchPromises = batch.map(qId =>
//         moveQuestion(
//           qId,
//           "mcq_single_correct",
//           targetQBId,
//           selectedQB.qb_id
//         ).then(() => {
//           successCount++;
//           return true;
//         }).catch(err => {
//           console.error(`Failed to move question ${qId}:`, err);
//           failCount++;
//           return false;
//         })
//       );

//       await Promise.all(batchPromises);
      
//       // Small delay between batches to avoid rate limiting
//       if (i + batchSize < questionsToMove.length) {
//         await sleep(300);
//       }
//     }

//     // Hide overlay
//     hideOverlay();
    
//     // Clear state
//     setClonedQuestions([]);
//     setSelectedQuestions(new Set());
//     setMoveSearchTerm("");
//     setMoveSearchResults([]);
//     setSelectedTargetQB(null);
    
//     // Small delay before showing success alert
//     await sleep(200);
    
//     // Show success message
//     if (successCount > 0) {
//       showAlert(
//         `✅ Moved ${successCount} question(s) to ${targetQBName}${failCount > 0 ? ` (${failCount} failed)` : ""}`,
//         "success"
//       );
      
//       // Refresh questions based on current view mode
//       showOverlay("🔄 Refreshing questions...");
//       try {
//         if (showAllQuestions) {
//           const updatedQuestions = await fetchQBQuestions(selectedQB.qb_id);
//           setAllQuestions(updatedQuestions);
//           setQbQuestions(updatedQuestions);
//         } else {
//           const allQuestions = await fetchQBQuestions(selectedQB.qb_id);
//           const usedQuestions = allQuestions.filter(q => usedQuestionIds.has(q.q_id));
//           setQbQuestions(usedQuestions);
//         }
//         hideOverlay();
//       } catch (err) {
//         hideOverlay();
//         showAlert("⚠️ Questions moved but failed to refresh list", "warning");
//       }
//     } else {
//       showAlert("❌ Failed to move questions", "danger");
//     }
//   } catch (err) {
//     hideOverlay();
//     showAlert("Error moving questions: " + err.message, "danger");
//     console.error(err);
//   }
// };


//   const exportCSV = () => {
//     if (!qbResults.length) {
//       showAlert("No results to export", "warning");
//       return;
//     }

//     const headers = ["QB Name", "QB ID", "Questions", "User Role", "Imported"];
//     const rows = qbResults.map((qb) => [
//       qb.qb_name,
//       qb.qb_id,
//       qb.questionCount,
//       qb.user_role,
//       qb.imported
//     ]);

//     let csv = headers.map((h) => `"${h}"`).join(",") + "\n";
//     rows.forEach((row) => {
//       csv += row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",") + "\n";
//     });

//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     const url = URL.createObjectURL(blob);

//     const timestamp = new Date().toISOString().split("T")[0];
//     const filename = `${courseName}_qb_${timestamp}.csv`;

//     link.setAttribute("href", url);
//     link.setAttribute("download", filename);
//     link.style.visibility = "hidden";

//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     showAlert(`Downloaded: ${filename}`, "success");
//   };

//   const toggleQuestionView = async () => {
//     if (showAllQuestions) {
//       // Switch back to showing only used questions
//       const usedQuestions = allQuestions.filter(q => usedQuestionIds.has(q.q_id));
//       setQbQuestions(usedQuestions);
//       setShowAllQuestions(false);
//       setSelectedQuestions(new Set());
//       setClonedQuestions([]);
//       showAlert("Showing only questions used in selected tests", "info");
//     } else {
//       // Switch to showing all questions
//       if (allQuestions.length === 0) {
//         showOverlay("📚 Fetching all questions from QB...");
//         try {
//           const allQuestionsData = await fetchQBQuestions(selectedQB.qb_id);
//           setAllQuestions(allQuestionsData);
//           setQbQuestions(allQuestionsData);
//           hideOverlay();
//           showAlert("Showing ALL questions from the QB", "success");
//         } catch (err) {
//           hideOverlay();
//           showAlert("Error fetching all questions: " + err.message, "danger");
//           return;
//         }
//       } else {
//         setQbQuestions(allQuestions);
//         showAlert("Showing ALL questions from the QB", "success");
//       }
//       setShowAllQuestions(true);
//       setSelectedQuestions(new Set());
//     }
//   };

//   return (
//     <div className="qb-finder-container">
//       {/* Loading Overlay */}
//       {overlay && (
//         <div className="qb-overlay">
//           <div className="qb-overlay-content">
//             <div className="qb-spinner"></div>
//             <div className="qb-overlay-text">{overlayText}</div>
//           </div>
//         </div>
//       )}

//       {/* Alert */}
//       {alert && (
//         <div className={`qb-alert qb-alert-${alert.type}`}>
//           {alert.msg}
//         </div>
//       )}

//       {/* Move Modal */}
//       {showMoveModal && (
//         <div className="qb-modal-backdrop" onClick={() => setShowMoveModal(false)}>
//           <div className="qb-modal" onClick={(e) => e.stopPropagation()}>
//             <div className="qb-modal-header">
//               <h3 className="qb-modal-title">📦 Move Questions to QB</h3>
//               <button className="qb-modal-close" onClick={() => setShowMoveModal(false)}>
//                 ×
//               </button>
//             </div>

//             <div className="qb-modal-body">
//               <div className="qb-form-group">
//                 <label className="qb-label">Search Question Bank</label>
//                 <input
//                   type="text"
//                   value={moveSearchTerm}
//                   onChange={(e) => setMoveSearchTerm(e.target.value)}
//                   onKeyPress={(e) => e.key === "Enter" && handleSearchTargetQB()}
//                   placeholder="Enter QB name..."
//                   className="qb-input"
//                 />
//               </div>

//               <button
//                 onClick={handleSearchTargetQB}
//                 className="qb-button qb-button-primary"
//               >
//                 🔍 Search
//               </button>

//               {moveSearchResults.length > 0 && (
//                 <div className="qb-search-results">
//                   {moveSearchResults.map((qb) => (
//                     <div
//                       key={qb.qb_id}
//                       className="qb-search-item"
//                       style={{
//                         background: selectedTargetQB?.qb_id === qb.qb_id ? "#e7f3ff" : "transparent"
//                       }}
//                       onClick={() => setSelectedTargetQB(qb)}
//                     >
//                       <div className="qb-search-item-name">{qb.qb_name}</div>
//                       <div className="qb-search-item-meta">
//                         {qb.questionCount} questions • {qb.user_role}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>

//             <div className="qb-modal-footer">
//               <button
//                 onClick={() => setShowMoveModal(false)}
//                 className="qb-button qb-button-small qb-button-secondary"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleMoveQuestions}
//                 disabled={!selectedTargetQB}
//                 className={`qb-button qb-button-small qb-button-success ${!selectedTargetQB ? "qb-button-disabled" : ""}`}
//               >
//                 Move {clonedQuestions.length > 0 ? clonedQuestions.length : selectedQuestions.size} Questions
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Welcome Screen */}
//       {ui === "welcome" && (
//         <div className="qb-welcome">
//           <h2 className="qb-welcome-title">🎓 Course Question Bank Finder</h2>
//           <p className="qb-welcome-subtitle">Paste your API token below</p>

//           <textarea
//             value={tokenInput}
//             onChange={(e) => setTokenInput(e.target.value)}
//             placeholder="Paste your Authorization token here..."
//             className="qb-token-input"
//           />

//           <button onClick={saveToken} className="qb-button qb-button-primary">
//             Save Token
//           </button>

//           <p className="qb-token-hint">
//             💡 Tip: Your token will be saved in localStorage for future sessions
//           </p>
//         </div>
//       )}

//       {/* Search Screen */}
//       {ui === "search" && (
//         <div className="qb-card">
//           <h3 className="qb-title">🔍 Search Course</h3>

//           <div className="qb-form-group">
//             <label className="qb-label">Course Name</label>
//             <input
//               type="text"
//               value={courseName}
//               onChange={(e) => setCourseName(e.target.value)}
//               onKeyPress={(e) => e.key === "Enter" && handleSearchCourse()}
//               placeholder="Enter course name..."
//               className="qb-input"
//               disabled={isLoading}
//             />
//           </div>

//           <button
//             onClick={handleSearchCourse}
//             disabled={isLoading}
//             className={`qb-button qb-button-primary ${isLoading ? "qb-button-disabled" : ""}`}
//           >
//             {isLoading ? "🔄 Searching..." : "🔎 Search Course"}
//           </button>

//           <button
//             onClick={clearToken}
//             className="qb-button qb-button-danger"
//             style={{ marginTop: "12px" }}
//           >
//             🚪 Logout
//           </button>

//           {status && <div className="qb-status">{status}</div>}

//           {/* Module Tree */}
//           {moduleTree.length > 0 && (
//             <div className="qb-tree-section">
//               <div className="qb-tree-header">
//                 <h4 className="qb-subtitle">📚 Modules & Tests</h4>
//                 <div className="qb-toggle-buttons">
//                   <button
//                     onClick={selectAllTests}
//                     className="qb-button qb-button-small qb-button-secondary"
//                   >
//                     ☑️ All
//                   </button>
//                   <button
//                     onClick={deselectAllTests}
//                     className="qb-button qb-button-small qb-button-secondary"
//                   >
//                     ☐ None
//                   </button>
//                 </div>
//               </div>

//               <div className="qb-tree">
//                 {moduleTree.map((mod) => (
//                   <div key={mod.id} className="qb-module-node">
//                     <div
//                       className="qb-module-header"
//                       onClick={() => toggleModule(mod.id)}
//                     >
//                       <span className="qb-expand-icon">
//                         {expandedModules.has(mod.id) ? "▼" : "▶"}
//                       </span>
//                       <span className="qb-module-name">📁 {mod.name}</span>
//                       <span className="qb-test-badge">{mod.totalTests} tests</span>
//                     </div>

//                     {expandedModules.has(mod.id) && (
//                       <div className="qb-module-content">
//                         {mod.directTests.length > 0 && (
//                           <div className="qb-section">
//                             <div className="qb-section-title">📝 Direct Tests</div>
//                             {mod.directTests.map((test) => (
//                               <div key={test.id} className="qb-test-item">
//                                 <input
//                                   type="checkbox"
//                                   checked={selectedTests.has(test.id)}
//                                   onChange={() => toggleTest(test.id)}
//                                   className="qb-checkbox"
//                                   id={test.id}
//                                 />
//                                 <label htmlFor={test.id} className="qb-test-label">
//                                   {test.name}
//                                 </label>
//                               </div>
//                             ))}
//                           </div>
//                         )}

//                         {mod.subModules.map((sub) => (
//                           <div key={sub.id} className="qb-sub-module-section">
//                             <div className="qb-sub-module-title">
//                               <span>📂 {sub.name}</span>
//                               <span className="qb-sub-test-count">({sub.tests.length})</span>
//                             </div>
//                             {sub.tests.map((test) => (
//                               <div key={test.id} className="qb-test-item">
//                                 <input
//                                   type="checkbox"
//                                   checked={selectedTests.has(test.id)}
//                                   onChange={() => toggleTest(test.id)}
//                                   className="qb-checkbox"
//                                   id={test.id}
//                                 />
//                                 <label htmlFor={test.id} className="qb-test-label">
//                                   {test.name}
//                                 </label>
//                               </div>
//                             ))}
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>

//               <button
//                 onClick={handleFetchQB}
//                 disabled={selectedTests.size === 0 || isLoading}
//                 className={`qb-button qb-button-success ${selectedTests.size === 0 ? "qb-button-disabled" : ""}`}
//                 style={{ marginTop: "16px" }}
//               >
//                 {isLoading ? "🔄 Processing..." : `📥 Fetch QB (${selectedTests.size} selected)`}
//               </button>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Results Screen - QB List */}
//       {ui === "results" && !selectedQB && (
//         <div className="qb-card">
//           <div className="qb-results-header">
//             <h3 className="qb-title">📊 Question Banks Found</h3>
//             <div className="qb-header-actions">
//               <button
//                 onClick={exportCSV}
//                 className="qb-button qb-button-success qb-button-small"
//               >
//                 📥 Export CSV
//               </button>
//               <button
//                 onClick={() => setUI("search")}
//                 className="qb-button qb-button-secondary qb-button-small"
//               >
//                 ← Back
//               </button>
//             </div>
//           </div>

//           {qbResults.length === 0 ? (
//             <div className="qb-empty-state">No question banks found</div>
//           ) : (
//             <div className="qb-table-wrapper">
//               <table className="qb-table">
//                 <thead>
//                   <tr className="qb-table-header">
//                     <th className="qb-th">QB Name</th>
//                     <th className="qb-th">Questions</th>
//                     <th className="qb-th">User Role</th>
//                     <th className="qb-th">QB ID</th>
//                     <th className="qb-th">Action</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {qbResults.map((qb, idx) => (
//                     <tr
//                       key={idx}
//                       className={idx % 2 === 0 ? "qb-tr-even" : "qb-tr-odd"}
//                     >
//                       <td className="qb-td">
//                         <strong>{qb.qb_name}</strong>
//                       </td>
//                       <td className="qb-td">
//                         <span className="qb-badge">{qb.questionCount}</span>
//                       </td>
//                       <td className="qb-td">{qb.user_role}</td>
//                       <td className="qb-td qb-mono">{qb.qb_id}</td>
//                       <td className="qb-td">
//                         <button
//                           className="qb-button qb-button-small qb-button-info"
//                           onClick={async () => {
//                             const usedQIds = new Set();
//                             const testNames = [];

//                             if (testQuestionMap[qb.qb_id]) {
//                               Object.entries(testQuestionMap[qb.qb_id]).forEach(
//                                 ([tName, qIds]) => {
//                                   testNames.push(tName);
//                                   qIds.forEach((q) => usedQIds.add(q));
//                                 }
//                               );
//                             }

//                             if (usedQIds.size === 0) {
//                               showAlert(
//                                 "No questions from selected tests in this QB",
//                                 "warning"
//                               );
//                               return;
//                             }

//                             setUsedQuestionIds(usedQIds);
//                             setShowAllQuestions(false);

//                             setSelectedQB({
//                               ...qb,
//                               testNames,
//                               usedQIds: Array.from(usedQIds)
//                             });

//                             showOverlay("📚 Fetching questions...");
//                             try {
//                               const allQuestions = await fetchQBQuestions(
//                                 qb.qb_id
//                               );
//                               setAllQuestions(allQuestions);
//                               const filtered = allQuestions.filter((q) =>
//                                 usedQIds.has(q.q_id)
//                               );
//                               setQbQuestions(filtered);
//                               setSelectedQuestions(new Set());
//                               setClonedQuestions([]);
//                               hideOverlay();
//                             } catch (err) {
//                               hideOverlay();
//                               showAlert(
//                                 "Error fetching questions: " + err.message,
//                                 "danger"
//                               );
//                             }
//                           }}
//                         >
//                           👁️ View
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           <div className="qb-stats">
//             <p>
//               <strong>Total Question Banks:</strong> {qbResults.length}
//             </p>
//             <p>
//               <strong>Total Questions:</strong>{" "}
//               {qbResults.reduce(
//                 (sum, qb) => sum + (qb.questionCount || 0),
//                 0
//               )}
//             </p>
//           </div>
//         </div>
//       )}

//       {/* ================= QUESTIONS DETAIL SCREEN ================= */}
//       {ui === "results" && selectedQB && (
//         <div className="qb-card">
//           <div className="qb-detail-header">
//             <div>
//               <h3 className="qb-title">📖 {selectedQB.qb_name}</h3>
//               <p className="qb-subtitle">
//                 {showAllQuestions ? "ALL questions in QB" : "Questions used in selected tests"}
//               </p>
//               <p className="qb-test-info">
//                 {!showAllQuestions && (
//                   <>📝 From: {selectedQB.testNames?.join(", ")}</>
//                 )}
//               </p>
//             </div>

//             <div className="qb-header-actions">
//               {/* Refresh Button */}
//               <button
//                 onClick={async () => {
//                   showOverlay("🔄 Refreshing questions...");
//                   try {
//                     const updatedQuestions = await fetchQBQuestions(selectedQB.qb_id);
//                     setAllQuestions(updatedQuestions);
//                     setQbQuestions(updatedQuestions);
//                     hideOverlay();
//                     showAlert("✅ Questions refreshed", "success");
//                   } catch (err) {
//                     hideOverlay();
//                     showAlert("Error refreshing questions: " + err.message, "danger");
//                   }
//                 }}
//                 className="qb-button qb-button-small qb-button-secondary"
//                 style={{ marginRight: "8px" }}
//                 title="Refresh questions"
//               >
//                 🔄 Refresh
//               </button>

//               {/* View Toggle Button */}
//               <button
//                 onClick={toggleQuestionView}
//                 className="qb-button qb-button-small qb-button-secondary"
//                 style={{ marginRight: "8px" }}
//               >
//                 {showAllQuestions ? "👁️ Show Used Only" : "👁️ Show All"}
//               </button>

//               {/* Clone Button */}
//               <button
//                 onClick={handleCloneQuestions}
//                 disabled={selectedQuestions.size === 0}
//                 className={`qb-button qb-button-small qb-button-warning ${
//                   selectedQuestions.size === 0 ? "qb-button-disabled" : ""
//                 }`}
//                 style={{ marginRight: "8px" }}
//               >
//                 🔄 Clone ({selectedQuestions.size})
//               </button>

//               {/* Move Button - Only show when we're in "Show All" mode AND have cloned questions */}
//               {showAllQuestions && (clonedQuestions.length > 0 || selectedQuestions.size > 0) && (
//                 <button
//                   onClick={() => {
//                     setShowMoveModal(true);
//                     setMoveSearchResults([]);
//                     setSelectedTargetQB(null);
//                   }}
//                   className="qb-button qb-button-small qb-button-success"
//                   style={{ marginRight: "8px" }}
//                 >
//                   📦 Move (
//                   {clonedQuestions.length > 0
//                     ? clonedQuestions.length
//                     : selectedQuestions.size}
//                   )
//                 </button>
//               )}

//               {/* Debug Button */}
//               <button
//                 onClick={() => {
//                   console.log("🔍 DEBUG: Checking cloned status");
//                   console.log("clonedQuestions:", clonedQuestions);
//                   console.log("selectedQuestions:", Array.from(selectedQuestions));
//                   console.log("qbQuestions count:", qbQuestions.length);
//                   console.log("allQuestions count:", allQuestions.length);
//                   console.log("usedQuestionIds:", Array.from(usedQuestionIds));
//                   console.log("showAllQuestions:", showAllQuestions);
//                   showAlert("Check console for debug info", "info");
//                 }}
//                 className="qb-button qb-button-small qb-button-secondary"
//                 style={{ marginRight: "8px" }}
//                 title="Debug cloned questions"
//               >
//                 🐛 Debug
//               </button>

//               {/* Back Button */}
//               <button
//                 onClick={() => {
//                   setSelectedQB(null);
//                   setClonedQuestions([]);
//                   setSelectedQuestions(new Set());
//                   setShowAllQuestions(false);
//                   setAllQuestions([]);
//                   setUsedQuestionIds(new Set());
//                 }}
//                 className="qb-button qb-button-small qb-button-secondary"
//               >
//                 ← Back to QBs
//               </button>
//             </div>
//           </div>

//           {/* View Mode Indicator */}
//           <div className="qb-view-mode-indicator">
//             <span className={`qb-view-mode-badge ${showAllQuestions ? 'qb-view-mode-all' : 'qb-view-mode-used'}`}>
//               {showAllQuestions ? "📚 Viewing ALL questions" : "🎯 Viewing USED questions only"}
//             </span>
//             {showAllQuestions && (
//               <span className="qb-view-mode-hint">
//                 (Cloned questions have green background)
//               </span>
//             )}
//             {!showAllQuestions && (
//               <span className="qb-view-mode-hint">
//                 (Clone questions to enable Move functionality)
//               </span>
//             )}
//           </div>

//           <div className="qb-questions-section">
//             <div className="qb-question-header">
//               <label className="qb-checkbox-label">
//                 <input
//                   type="checkbox"
//                   className="qb-checkbox"
//                   checked={
//                     selectedQuestions.size === qbQuestions.length &&
//                     qbQuestions.length > 0
//                   }
//                   onChange={(e) => {
//                     if (e.target.checked) {
//                       setSelectedQuestions(
//                         new Set(qbQuestions.map((q) => q.q_id))
//                       );
//                     } else {
//                       setSelectedQuestions(new Set());
//                     }
//                   }}
//                 />
//                 Select All ({qbQuestions.length})
//               </label>
//               <div className="qb-question-count">
//                 {showAllQuestions && allQuestions.length > 0 && (
//                   <span className="qb-total-count">
//                     Total in QB: {allQuestions.length}
//                   </span>
//                 )}
//                 {!showAllQuestions && usedQuestionIds.size > 0 && (
//                   <span className="qb-used-count">
//                     Used in tests: {usedQuestionIds.size}
//                   </span>
//                 )}
//                 {showAllQuestions && clonedQuestions.length > 0 && (
//                   <span className="qb-cloned-count">
//                     Cloned: {clonedQuestions.length}
//                   </span>
//                 )}
//               </div>
//             </div>

//             {qbQuestions.length === 0 ? (
//               <div className="qb-empty-state">
//                 {showAllQuestions ? "No questions found in this QB" : "No questions from selected tests"}
//               </div>
//             ) : (
//               <div className="qb-questions-list">
//                 {qbQuestions.map((q, idx) => {
//                   const isUsed = usedQuestionIds.has(q.q_id);
//                   const isCloned = clonedQuestions.includes(q.q_id);
//                   const isSelected = selectedQuestions.has(q.q_id);
                  
//                   // Debug log for each cloned question
//                   if (isCloned) {
//                     console.log(`✅ Q${idx + 1} (${q.q_id}) is marked as cloned`);
//                   }
                  
//                   return (
//                     <div 
//                       key={q.q_id} 
//                       className={`qb-question-card ${isCloned ? 'qb-question-cloned' : ''} ${isUsed && !showAllQuestions ? 'qb-question-used' : ''}`}
//                     >
//                       <div className="qb-question-card-header">
//                         <input
//                           type="checkbox"
//                           className="qb-checkbox"
//                           checked={isSelected}
//                           onChange={() => {
//                             const copy = new Set(selectedQuestions);
//                             copy.has(q.q_id)
//                               ? copy.delete(q.q_id)
//                               : copy.add(q.q_id);
//                             setSelectedQuestions(copy);
//                           }}
//                         />
//                         <span className="qb-question-number">
//                           Q{idx + 1}
//                         </span>
//                         <span className="qb-qid-badge">
//                           {q.q_id?.slice(0, 8) || 'N/A'}…
//                         </span>
                        
//                         <div className="qb-question-status">
//                           {isCloned && (
//                             <span className="qb-cloned-badge" title="Cloned question">
//                               ✅ Cloned
//                             </span>
//                           )}
//                           {!showAllQuestions && isUsed && (
//                             <span className="qb-used-badge" title="Used in selected tests">
//                               🎯 Used
//                             </span>
//                           )}
//                           {showAllQuestions && isUsed && !isCloned && (
//                             <span className="qb-used-badge" title="Used in selected tests">
//                               🎯
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       <div
//                         className="qb-question-text"
//                         dangerouslySetInnerHTML={{
//                           __html:
//                             q.question_data?.slice(0, 250) || "No content"
//                         }}
//                       />

//                       <div className="qb-question-meta">
//                         <span>
//                           Type:{" "}
//                           {q.question_editor_type === 1 ? "MCQ" : "Other"}
//                         </span>
//                         <span>QB: {q.qb_id?.slice(0, 8) || 'N/A'}…</span>
//                         {q.imported && q.imported !== "original_question" && (
//                           <span className="qb-imported-info" title={`Cloned from: ${q.imported}`}>
//                             🔗 Clone
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
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
    
    const res = await fetch(`${API}/api/v2/questionfilter`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        qb_id: qbId,
        page: 1,
        limit: 200,
        type: "Single"
      })
    });

    const json = await res.json();
    const questions = json?.non_group_questions || [];
    
    console.log("📊 Total questions fetched:", questions.length);
    
    if (questions.length > 0) {
      console.log("🔍 Sample questions:", questions.slice(0, 3).map(q => ({
        q_id: q.q_id,
        imported: q.imported,
        question_data: q.question_data?.substring(0, 50) + '...'
      })));
    }
    
    return questions;
  }

  async function cloneQuestions(qbId, qIds) {
    console.log("🔧 Sending to clone API - QB ID:", qbId, "Question IDs:", qIds);
    console.log("🔧 Selected count:", qIds.length);
    
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
            type: "direct"
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
                type: "sub"
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

  const selectWeekTests = (weekPattern) => {
    const weekTestIds = new Set();
    moduleTree.forEach(mod => {
      if (mod.name.toLowerCase().includes(weekPattern.toLowerCase())) {
        mod.directTests.forEach(t => weekTestIds.add(t.id));
        mod.subModules.forEach(sub => {
          sub.tests.forEach(t => weekTestIds.add(t.id));
        });
      }
    });
    setSelectedTests(new Set([...selectedTests, ...weekTestIds]));
    showAlert(`✅ Selected tests from ${weekPattern}`, "success");
  };

  const selectWeekPracticeTests = (weekPattern) => {
    const practiceTestIds = new Set();
    moduleTree.forEach(mod => {
      if (mod.name.toLowerCase().includes(weekPattern.toLowerCase())) {
        mod.directTests.forEach(t => {
          if (t.name.toLowerCase().includes('practice')) {
            practiceTestIds.add(t.id);
          }
        });
        mod.subModules.forEach(sub => {
          sub.tests.forEach(t => {
            if (t.name.toLowerCase().includes('practice')) {
              practiceTestIds.add(t.id);
            }
          });
        });
      }
    });
    setSelectedTests(new Set([...selectedTests, ...practiceTestIds]));
    showAlert(`✅ Selected Practice tests from ${weekPattern}`, "success");
  };

  const selectWeekKCQTests = (weekPattern) => {
    const kcqTestIds = new Set();
    moduleTree.forEach(mod => {
      if (mod.name.toLowerCase().includes(weekPattern.toLowerCase())) {
        mod.directTests.forEach(t => {
          if (t.name.toLowerCase().includes('kcq') || t.name.toLowerCase().includes('kc')) {
            kcqTestIds.add(t.id);
          }
        });
        mod.subModules.forEach(sub => {
          sub.tests.forEach(t => {
            if (t.name.toLowerCase().includes('kcq') || t.name.toLowerCase().includes('kc')) {
              kcqTestIds.add(t.id);
            }
          });
        });
      }
    });
    setSelectedTests(new Set([...selectedTests, ...kcqTestIds]));
    showAlert(`✅ Selected KCQ tests from ${weekPattern}`, "success");
  };

  const getWeekList = () => {
    const weeks = new Set();
    moduleTree.forEach(mod => {
      const weekMatch = mod.name.match(/week\s*\d+/i);
      if (weekMatch) {
        weeks.add(weekMatch[0]);
      }
    });
    return Array.from(weeks).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });
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
      let processedTests = 0;
      const qbToTestMap = {};
      const testQMap = {};

      for (const testId of selectedTests) {
        showOverlay(
          `📋 Processing tests: ${processedTests + 1}/${selectedTests.size}`
        );

        let actualTId = null;
        let testName = null;
        
        for (const mod of moduleTree) {
          const directTest = mod.directTests.find(t => t.id === testId);
          if (directTest) {
            actualTId = directTest.t_id;
            testName = directTest.name;
            break;
          }
          for (const sub of mod.subModules) {
            const subTest = sub.tests.find(t => t.id === testId);
            if (subTest) {
              actualTId = subTest.t_id;
              testName = subTest.name;
              break;
            }
          }
          if (actualTId) break;
        }

        if (actualTId) {
          try {
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
              }
            });

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

      const qbList = await getQuestionBanks(Array.from(allQBIds));

      setTestQuestionMap(qbToTestMap);
      setQbResults(qbList);
      setUI("results");
      showAlert(`✅ Found ${qbList.length} question bank(s)`, "success");
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

    const headers = ["QB Name", "QB ID", "Questions", "User Role", "Imported"];
    const rows = qbResults.map((qb) => [
      qb.qb_name,
      qb.qb_id,
      qb.questionCount,
      qb.user_role,
      qb.imported
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
              placeholder="Enter course name..."
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
              <div className="qb-tree-header">
                <h4 className="qb-subtitle">📚 Modules & Tests</h4>
                <div className="qb-toggle-buttons">
                  {/* <button
                    onClick={selectAllTests}
                    className="qb-button qb-button-small qb-button-secondary"
                  >
                    ☑️ All
                  </button> */}
                  <button
                    onClick={deselectAllTests}
                    className="qb-button qb-button-small qb-button-secondary"
                  >
                    ☐ None
                  </button>
                  
                  {/* Week-wise Selection Dropdown */}
                  <div className="qb-week-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      onClick={() => setShowWeekDropdown(!showWeekDropdown)}
                      className="qb-button qb-button-small qb-button-info"
                    >
                      📅 Week Select
                    </button>
                    
                    {showWeekDropdown && (
                      <div className="qb-week-dropdown" style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        minWidth: '250px',
                        zIndex: 1000,
                        marginTop: '4px'
                      }}>
                        <div style={{
                          padding: '12px',
                          borderBottom: '1px solid #eee',
                          fontWeight: 'bold',
                          fontSize: '14px',
                          color: '#333'
                        }}>
                          Select by Week
                        </div>
                        
                        {getWeekList().map((week) => (
                          <div key={week} style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #f5f5f5'
                          }}>
                            <div style={{
                              fontWeight: '500',
                              marginBottom: '6px',
                              color: '#555',
                              fontSize: '13px'
                            }}>
                              {week.charAt(0).toUpperCase() + week.slice(1)}
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '6px',
                              flexWrap: 'wrap'
                            }}>
                              <button
                                onClick={() => {
                                  selectWeekTests(week);
                                  setShowWeekDropdown(false);
                                }}
                                className="qb-button qb-button-small"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  background: '#4CAF50',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  flex: '1'
                                }}
                              >
                                ✅ All Tests
                              </button>
                              <button
                                onClick={() => {
                                  selectWeekPracticeTests(week);
                                  setShowWeekDropdown(false);
                                }}
                                className="qb-button qb-button-small"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  background: '#2196F3',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  flex: '1'
                                }}
                              >
                                📝 Practice
                              </button>
                              <button
                                onClick={() => {
                                  selectWeekKCQTests(week);
                                  setShowWeekDropdown(false);
                                }}
                                className="qb-button qb-button-small"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  background: '#FF9800',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  flex: '1'
                                }}
                              >
                                🎯 KCQ
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        <div style={{
                          padding: '8px 12px',
                          textAlign: 'center'
                        }}>
                          <button
                            onClick={() => setShowWeekDropdown(false)}
                            style={{
                              padding: '6px 16px',
                              fontSize: '12px',
                              background: '#f5f5f5',
                              color: '#666',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
                    >
                      <td className="qb-td">
                        <strong>{qb.qb_name}</strong>
                      </td>
                      <td className="qb-td">
                        <span className="qb-badge">{qb.questionCount}</span>
                      </td>
                      <td className="qb-td">{qb.user_role}</td>
                      <td className="qb-td qb-mono">{qb.qb_id}</td>
                      <td className="qb-td">
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
                              const allQuestions = await fetchQBQuestions(
                                qb.qb_id
                              );
                              setAllQuestions(allQuestions);
                              const filtered = allQuestions.filter((q) =>
                                usedQIds.has(q.q_id)
                              );
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
          </div>
        </div>
      )}

      {ui === "results" && selectedQB && (
        <div className="qb-card">
          <div className="qb-detail-header">
            <div>
              <h3 className="qb-title">📖 {selectedQB.qb_name}</h3>
              <p className="qb-subtitle">
                {showAllQuestions ? "ALL questions in QB" : "Questions used in selected tests"}
              </p>
              <p className="qb-test-info">
                {!showAllQuestions && (
                  <>📝 From: {selectedQB.testNames?.join(", ")}</>
                )}
              </p>
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
                disabled={selectedQuestions.size === 0}
                className={`qb-button qb-button-small qb-button-warning ${
                  selectedQuestions.size === 0 ? "qb-button-disabled" : ""
                }`}
                style={{ marginRight: "8px" }}
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
                  className="qb-button qb-button-small qb-button-success"
                  style={{ marginRight: "8px" }}
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
                  console.log("🔍 DEBUG: Checking cloned status");
                  console.log("clonedQuestions:", clonedQuestions);
                  console.log("selectedQuestions:", Array.from(selectedQuestions));
                  console.log("qbQuestions count:", qbQuestions.length);
                  console.log("allQuestions count:", allQuestions.length);
                  console.log("usedQuestionIds:", Array.from(usedQuestionIds));
                  console.log("showAllQuestions:", showAllQuestions);
                  showAlert("Check console for debug info", "info");
                }}
                className="qb-button qb-button-small qb-button-secondary"
                style={{ marginRight: "8px" }}
                title="Debug cloned questions"
              >
                🐛 Debug
              </button>

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
                    selectedQuestions.size === qbQuestions.length &&
                    qbQuestions.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedQuestions(
                        new Set(qbQuestions.map((q) => q.q_id))
                      );
                    } else {
                      setSelectedQuestions(new Set());
                    }
                  }}
                />
                Select All ({qbQuestions.length})
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
              </div>
            </div>

            {qbQuestions.length === 0 ? (
              <div className="qb-empty-state">
                {showAllQuestions ? "No questions found in this QB" : "No questions from selected tests"}
              </div>
            ) : (
              <div className="qb-questions-list">
                {qbQuestions.map((q, idx) => {
                  const isUsed = usedQuestionIds.has(q.q_id);
                  const isCloned = clonedQuestions.includes(q.q_id);
                  const isSelected = selectedQuestions.has(q.q_id);
                  
                  if (isCloned) {
                    console.log(`✅ Q${idx + 1} (${q.q_id}) is marked as cloned`);
                  }
                  
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
                        <span>
                          Type:{" "}
                          {q.question_editor_type === 1 ? "MCQ" : "Other"}
                        </span>
                        <span>QB: {q.qb_id?.slice(0, 8) || 'N/A'}…</span>
                        {q.imported && q.imported !== "original_question" && (
                          <span className="qb-imported-info" title={`Cloned from: ${q.imported}`}>
                            🔗 Clone
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