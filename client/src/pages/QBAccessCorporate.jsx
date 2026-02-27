
// import { useState } from "react";
// import { DEPARTMENT_IDS, B_D_ID_OPTIONS } from "../config";
// import "./QBAccessCorporate.css";

// const API = "https://api.examly.io";

// export default function QBAccessCorporate({ onBack }) {
//   const [token, setToken] = useState(() => {
//     try {
//       return localStorage.getItem("examly_token_corporate") || "";
//     } catch {
//       return "";
//     }
//   });

//   const [ui, setUI] = useState(token ? "menu" : "welcome");
//   const [tokenInput, setTokenInput] = useState("");
//   const [alert, setAlert] = useState(null);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");

//   // Search & Clone states
//   const [qbMode, setQbMode] = useState("multiple"); // "single" or "multiple"
//   const [inputMode, setInputMode] = useState("type"); // "type" or "search"
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [qbNameInput, setQbNameInput] = useState(""); // For typing QB names
//   const [selectedSourceQBs, setSelectedSourceQBs] = useState([]); // Array for multiple selection
//   const [clonedQBs, setClonedQBs] = useState([]); // Array to store all cloned QBs

//   // Question filtering states (NO stverified filtering)
//   const [allQuestions, setAllQuestions] = useState([]);
//   const [filteredQuestions, setFilteredQuestions] = useState([]);
//   const [selectedQuestions, setSelectedQuestions] = useState([]);
//   const [availableTags, setAvailableTags] = useState([]);
//   const [selectedTags, setSelectedTags] = useState([]); // Empty by default - NO stverified
//   const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
//   const [availableQuestionTypes, setAvailableQuestionTypes] = useState([]);

//   // Target QB states
//   const [targetSearchTerm, setTargetSearchTerm] = useState("");
//   const [targetSearchResults, setTargetSearchResults] = useState([]);
//   const [selectedTargetQB, setSelectedTargetQB] = useState(null);
  
//   const [processStep, setProcessStep] = useState("search"); // search, cloned, moved, completed

//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: token
//   };

//   const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
//       localStorage.setItem("examly_token_corporate", tokenInput.trim());
//       setToken(tokenInput.trim());
//       setTokenInput("");
//       setUI("menu");
//       showAlert("Token saved successfully!", "success");
//     } catch (err) {
//       showAlert("Failed to save token: " + err.message, "danger");
//     }
//   };

//   const clearToken = () => {
//     try {
//       localStorage.removeItem("examly_token_corporate");
//     } catch (err) {
//       console.error("Failed to clear token:", err);
//     }
//     setToken("");
//     setUI("welcome");
//     setTokenInput("");
//     resetState();
//     showAlert("Token cleared", "danger");
//   };

//   const resetState = () => {
//     setSearchTerm("");
//     setSearchResults([]);
//     setSelectedSourceQBs([]);
//     setClonedQBs([]);
//     setAllQuestions([]);
//     setFilteredQuestions([]);
//     setSelectedQuestions([]);
//     setAvailableTags([]);
//     setSelectedTags([]); // No default tags
//     setSelectedQuestionTypes([]);
//     setAvailableQuestionTypes([]);
//     setTargetSearchTerm("");
//     setTargetSearchResults([]);
//     setSelectedTargetQB(null);
//     setProcessStep("search");
//     setQbNameInput("");
//   };

//   // Helper function to extract clean text from question_data HTML
//   const extractQuestionText = (questionData) => {
//     if (!questionData) return "No question text";
    
//     const text = questionData
//       .replace(/<[^>]*>/g, ' ')
//       .replace(/&nbsp;/g, ' ')
//       .replace(/&lt;/g, '<')
//       .replace(/&gt;/g, '>')
//       .replace(/&amp;/g, '&')
//       .replace(/\$\$\$examly/g, '\n')
//       .replace(/\s+/g, ' ')
//       .trim();
    
//     return text.length > 150 ? text.substring(0, 150) + '...' : text;
//   };

//   // ==================== API FUNCTIONS ====================

//   async function searchQuestionBanks(searchTerm) {
//     const res = await fetch(`${API}/api/v2/questionbanks`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         branch_id: "all",
//         department_id: DEPARTMENT_IDS,
//         limit: 25,
//         mainDepartmentUser: true,
//         page: 1,
//         search: searchTerm,
//         visibility: "All"
//       })
//     });

//     const json = await res.json();
//     return json?.results?.questionbanks || [];
//   }

//   async function autoCloneQuestionBank(qbData) {
//     // Auto-generate clone name with prefix
//     const clonedName = `Internal_gb26_${qbData.qb_name}`;

//     const res = await fetch(`${API}/api/questionbank/clone`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         mainDepartmentUser: true,
//         price: qbData.price || 0,
//         qb_code: null,
//         qb_description: qbData.qb_description,
//         qb_id: qbData.qb_id,
//         qb_name: clonedName,
//         tags: qbData.tags || [],
//         visibility: qbData.visibility || "Within Department",
//         b_d_id: B_D_ID_OPTIONS // Use all departments from config - Batch Demo default
//       })
//     });

//     const json = await res.json();
    
//     console.log("📋 Auto-Clone API Request:", {
//       qb_id: qbData.qb_id,
//       qb_name: clonedName,
//       b_d_id: B_D_ID_OPTIONS,
//       b_d_id_count: B_D_ID_OPTIONS.length
//     });
//     console.log("📋 Auto-Clone API Response:", json);
    
//     if (json?.data?.success) {
//       return { ...json.data, clonedName };
//     } else {
//       throw new Error(json?.message || json?.data?.message || "Failed to clone QB");
//     }
//   }

//   async function fetchAllQuestions(qbId) {
//     console.log("📥 Fetching all questions for QB:", qbId);
    
//     let allQuestions = [];
//     let page = 1;
//     let hasMore = true;
//     const limit = 200;

//     while (hasMore) {
//       console.log(`📄 Fetching page ${page}...`);
      
//       const res = await fetch(`${API}/api/v2/questionfilter`, {
//         method: "POST",
//         headers,
//         body: JSON.stringify({
//           qb_id: qbId,
//           page: page,
//           limit: limit,
//           type: "Single"
//         })
//       });

//       const json = await res.json();
//       const questions = json?.non_group_questions || [];
      
//       allQuestions = [...allQuestions, ...questions];
      
//       console.log(`✅ Page ${page}: Found ${questions.length} questions (Total so far: ${allQuestions.length})`);
      
//       hasMore = questions.length === limit;
//       page++;
      
//       if (hasMore) {
//         await sleep(500);
//       }
//     }
    
//     console.log(`🎉 Completed! Total questions fetched: ${allQuestions.length}`);
//     return allQuestions;
//   }

//   async function moveQuestionsBatch(questionIds, questionTypes, targetQbId, currentQbId, batchSize = 100) {
//     const totalQuestions = questionIds.length;
//     const totalBatches = Math.ceil(totalQuestions / batchSize);
    
//     console.log(`📦 Moving ${totalQuestions} questions in ${totalBatches} batches of ${batchSize}`);
    
//     let movedCount = 0;
    
//     for (let i = 0; i < totalBatches; i++) {
//       const start = i * batchSize;
//       const end = Math.min(start + batchSize, totalQuestions);
//       const batchIds = questionIds.slice(start, end);
//       const batchTypes = questionTypes.slice(start, end);
      
//       const qIdString = batchIds.join(",");
//       const qTypeString = batchTypes.join(",");
      
//       showOverlay(`📦 Moving batch ${i + 1}/${totalBatches} (${batchIds.length} questions)...`);
      
//       console.log(`📦 Batch ${i + 1}/${totalBatches}: Moving ${batchIds.length} questions`);
      
//       const res = await fetch(
//         `${API}/api/questionMove?q_id=${qIdString}&q_type=${qTypeString}&qb_id=${targetQbId}&current_qb_id=${currentQbId}`,
//         {
//           method: "GET",
//           headers: { Authorization: token }
//         }
//       );

//       const json = await res.json();
//       if (!json.success) {
//         throw new Error(`Failed to move batch ${i + 1}: ${json.message || "Unknown error"}`);
//       }
      
//       movedCount += batchIds.length;
//       console.log(`✅ Batch ${i + 1}/${totalBatches} completed. Total moved: ${movedCount}/${totalQuestions}`);
      
//       // Small delay between batches to avoid rate limiting
//       if (i < totalBatches - 1) {
//         await sleep(500);
//       }
//     }
    
//     console.log(`🎉 All ${totalQuestions} questions moved successfully!`);
//     return { success: true, movedCount };
//   }

//   async function deleteQuestionBank(qbId, qbName) {
//     const res = await fetch(`${API}/api/v2/questionbanks/bulkDelete`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         branch_id: "all",
//         department_id: DEPARTMENT_IDS,
//         ids: [qbId],
//         limit: 25,
//         mainDepartmentUser: true,
//         page: 1,
//         search: qbName,
//         visibility: "All"
//       })
//     });

//     const json = await res.json();
//     if (json?.data?.success) {
//       return json.data;
//     } else {
//       throw new Error(json?.data?.message || "Failed to delete QB");
//     }
//   }

//   // ==================== HANDLERS ====================

//   const handleSearchSourceQB = async () => {
//     if (!searchTerm.trim()) {
//       showAlert("Please enter a search term", "warning");
//       return;
//     }

//     showOverlay("🔍 Searching question banks...");

//     try {
//       const results = await searchQuestionBanks(searchTerm);
//       setSearchResults(results);
//       hideOverlay();

//       if (results.length === 0) {
//         showAlert("No question banks found", "warning");
//       } else {
//         showAlert(`Found ${results.length} question bank(s)`, "success");
//       }
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error searching: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleAddQBByName = async (qbName) => {
//     if (!qbName.trim()) {
//       showAlert("Please enter a QB name", "warning");
//       return;
//     }

//     if (selectedSourceQBs.some(qb => qb.qb_name === qbName.trim())) {
//       showAlert(`"${qbName.trim()}" is already added`, "warning");
//       setQbNameInput("");
//       return;
//     }

//     showOverlay(`🔍 Searching for "${qbName.trim()}"...`);

//     try {
//       const results = await searchQuestionBanks(qbName.trim());
//       hideOverlay();

//       if (results.length === 0) {
//         showAlert(`No QB found with name "${qbName.trim()}"`, "danger");
//         return;
//       }

//       const exactMatch = results.find(qb => qb.qb_name === qbName.trim());
//       const qbToAdd = exactMatch || results[0];

//       setSelectedSourceQBs([...selectedSourceQBs, qbToAdd]);
//       setQbNameInput("");
//       showAlert(`✅ Added: ${qbToAdd.qb_name} (${qbToAdd.questionCount} questions)`, "success");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error searching: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleQBNameKeyPress = (e) => {
//     if (e.key === "Enter") {
//       e.preventDefault();
//       handleAddQBByName(qbNameInput);
//     }
//   };

//   const handleBatchCloneAndFetch = async () => {
//     if (selectedSourceQBs.length === 0) {
//       showAlert("Please select at least one source QB", "warning");
//       return;
//     }

//     showOverlay(`🔄 Starting batch clone of ${selectedSourceQBs.length} QB(s)...`);

//     const clonedResults = [];
//     let totalQuestionsExpected = 0;
//     let totalQuestionsFetched = 0;

//     try {
//       // Clone all QBs one by one
//       for (let i = 0; i < selectedSourceQBs.length; i++) {
//         const sourceQB = selectedSourceQBs[i];
//         const qbNumber = i + 1;
        
//         showOverlay(`🔄 Cloning QB ${qbNumber}/${selectedSourceQBs.length}: ${sourceQB.qb_name}...`);
        
//         const cloneResult = await autoCloneQuestionBank(sourceQB);
//         const expectedCount = sourceQB.questionCount;
//         totalQuestionsExpected += expectedCount;
        
//         showOverlay(`📚 QB ${qbNumber}/${selectedSourceQBs.length} cloned! Waiting for ${expectedCount} questions...`);
        
//         // Wait and retry until we get all questions for this QB
//         const maxRetries = 10;
//         let questions = [];
        
//         for (let attempt = 1; attempt <= maxRetries; attempt++) {
//           const waitTime = attempt * 2000;
//           showOverlay(`⏳ QB ${qbNumber}/${selectedSourceQBs.length}: Waiting ${waitTime/1000}s (Attempt ${attempt}/${maxRetries})...`);
//           await sleep(waitTime);
          
//           showOverlay(`📥 QB ${qbNumber}/${selectedSourceQBs.length}: Fetching questions (Attempt ${attempt}/${maxRetries})...`);
//           questions = await fetchAllQuestions(cloneResult.qb_id);
          
//           console.log(`📊 QB ${qbNumber} - Attempt ${attempt}: Found ${questions.length}/${expectedCount} questions`);
          
//           if (questions.length >= expectedCount) {
//             console.log(`✅ QB ${qbNumber}: All ${questions.length} questions fetched!`);
//             break;
//           } else {
//             if (attempt === maxRetries) {
//               console.warn(`⚠️ QB ${qbNumber}: Max retries reached with ${questions.length}/${expectedCount} questions`);
//             }
//           }
//         }

//         totalQuestionsFetched += questions.length;
        
//         clonedResults.push({
//           qb_id: cloneResult.qb_id,
//           qb_name: cloneResult.clonedName,
//           originalName: sourceQB.qb_name,
//           questionCount: questions.length,
//           expectedCount: expectedCount,
//           questions: questions
//         });

//         if (i < selectedSourceQBs.length - 1) {
//           await sleep(1000);
//         }
//       }

//       // Merge all questions from all cloned QBs
//       const allQuestionsFromAllQBs = clonedResults.flatMap(qb => qb.questions);
      
//       // Extract unique tags and question types
//       const tagsSet = new Set();
//       const typesSet = new Set();
      
//       allQuestionsFromAllQBs.forEach(q => {
//         if (q.tags && Array.isArray(q.tags)) {
//           q.tags.forEach(tag => tagsSet.add(tag.name));
//         }
//         if (q.question_type) {
//           typesSet.add(q.question_type);
//         }
//       });

//       const tags = Array.from(tagsSet);
//       const types = Array.from(typesSet);

//       setAvailableTags(tags);
//       setAvailableQuestionTypes(types);
//       setAllQuestions(allQuestionsFromAllQBs);
      
//       // NO auto-filtering - show all questions
//       setFilteredQuestions(allQuestionsFromAllQBs);
//       setSelectedQuestions(allQuestionsFromAllQBs.map(q => q.q_id));
//       setClonedQBs(clonedResults);
//       setProcessStep("cloned");

//       hideOverlay();
      
//       const allComplete = totalQuestionsFetched >= totalQuestionsExpected;
//       const statusMessage = allComplete
//         ? `✅ Successfully cloned ${selectedSourceQBs.length} QB(s) with ${totalQuestionsFetched} total questions! All questions auto-selected.`
//         : `⚠️ Cloned ${selectedSourceQBs.length} QB(s) with ${totalQuestionsFetched}/${totalQuestionsExpected} questions. ${allQuestionsFromAllQBs.length} questions auto-selected.`;
      
//       showAlert(statusMessage, allComplete ? "success" : "warning");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error during batch clone: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleApplyFilters = () => {
//     let filtered = [...allQuestions];

//     // Filter by tags
//     if (selectedTags.length > 0) {
//       filtered = filtered.filter(q => 
//         q.tags && q.tags.some(tag => selectedTags.includes(tag.name))
//       );
//     }

//     // Filter by question types
//     if (selectedQuestionTypes.length > 0) {
//       filtered = filtered.filter(q => 
//         selectedQuestionTypes.includes(q.question_type)
//       );
//     }

//     setFilteredQuestions(filtered);
//     setSelectedQuestions(filtered.map(q => q.q_id));
//     showAlert(`Filtered to ${filtered.length} questions`, "success");
//   };

//   const handleToggleQuestion = (qId) => {
//     setSelectedQuestions(prev => 
//       prev.includes(qId) 
//         ? prev.filter(id => id !== qId)
//         : [...prev, qId]
//     );
//   };

//   const handleSelectAll = () => {
//     setSelectedQuestions(filteredQuestions.map(q => q.q_id));
//   };

//   const handleDeselectAll = () => {
//     setSelectedQuestions([]);
//   };

//   const handleSearchTargetQB = async () => {
//     if (!targetSearchTerm.trim()) {
//       showAlert("Please enter a search term", "warning");
//       return;
//     }

//     showOverlay("🔍 Searching target question banks...");

//     try {
//       const results = await searchQuestionBanks(targetSearchTerm);
//       setTargetSearchResults(results);
//       hideOverlay();

//       if (results.length === 0) {
//         showAlert("No question banks found", "warning");
//       } else {
//         showAlert(`Found ${results.length} question bank(s)`, "success");
//       }
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error searching: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleMoveAndDelete = async () => {
//     if (!selectedTargetQB) {
//       showAlert("Please select a target QB", "warning");
//       return;
//     }

//     if (selectedQuestions.length === 0) {
//       showAlert("No questions selected to move", "warning");
//       return;
//     }

//     const targetQBName = selectedTargetQB.qb_name;
//     const questionCount = selectedQuestions.length;

//     try {
//       showOverlay(`📦 Preparing to move ${questionCount} question(s) in batches of 100...`);

//       const questionsToMove = allQuestions.filter(q => selectedQuestions.includes(q.q_id));
//       const questionIds = questionsToMove.map(q => q.q_id);
//       const questionTypes = questionsToMove.map(q => q.question_type || "mcq_single_correct");

//       // Move all questions in batches of 100
//       const moveResult = await moveQuestionsBatch(questionIds, questionTypes, selectedTargetQB.qb_id, clonedQBs[0].qb_id, 100);
      
//       console.log(`✅ Moved ${moveResult.movedCount} questions successfully`);

//       await sleep(500);
      
//       // Delete all cloned QBs
//       showOverlay(`🗑️ Deleting ${clonedQBs.length} cloned QB(s)...`);
      
//       let deletedCount = 0;
//       let failedDeletes = [];
      
//       for (let i = 0; i < clonedQBs.length; i++) {
//         const clonedQB = clonedQBs[i];
//         showOverlay(`🗑️ Deleting QB ${i + 1}/${clonedQBs.length}: ${clonedQB.qb_name}...`);
        
//         try {
//           await deleteQuestionBank(clonedQB.qb_id, clonedQB.qb_name);
//           deletedCount++;
//           console.log(`✅ Deleted: ${clonedQB.qb_name}`);
//           await sleep(300);
//         } catch (deleteErr) {
//           console.warn(`Failed to delete ${clonedQB.qb_name}:`, deleteErr);
//           failedDeletes.push(clonedQB.qb_name);
//         }
//       }

//       hideOverlay();
//       await sleep(200);
      
//       if (failedDeletes.length === 0) {
//         showAlert(
//           `✅ Successfully moved ${questionCount} question(s) to ${targetQBName} in batches and deleted all ${clonedQBs.length} cloned QB(s)`,
//           "success"
//         );
//       } else {
//         showAlert(
//           `✅ Moved ${questionCount} question(s) to ${targetQBName} in batches. Deleted ${deletedCount}/${clonedQBs.length} QB(s). Failed: ${failedDeletes.join(", ")}`,
//           "warning"
//         );
//       }
      
//       setProcessStep("completed");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error during move process: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleStartNew = () => {
//     resetState();
//     showAlert("Ready for new operation", "info");
//   };

//   // ==================== RENDER ====================

//   return (
//     <div className="qb-access-container">
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
//         <div className={`qb-alert qb-alert-${alert.type}`}>{alert.msg}</div>
//       )}

//       {/* Welcome Screen */}
//       {ui === "welcome" && (
//         <div className="qb-welcome">
//           <div className="qb-back-button-container">
//             <button onClick={onBack} className="qb-button qb-button-secondary qb-button-small">
//               ← Back to Organizations
//             </button>
//           </div>
          
//           <h2 className="qb-welcome-title">🔐 Stark - Corporate</h2>
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

//       {/* Menu Screen */}
//       {ui === "menu" && (
//         <div className="qb-card">
//           <div className="qb-menu-header">
//             <div>
//               <h2 className="qb-title">🛠️ Stark - Corporate</h2>
//               <p className="qb-org-breadcrumb">QB Clone, Filter & Move Tool</p>
//             </div>
//             <div className="qb-menu-actions">
//               <button
//                 onClick={onBack}
//                 className="qb-button qb-button-secondary qb-button-small"
//               >
//                 ← Organizations
//               </button>
//               <button
//                 onClick={clearToken}
//                 className="qb-button qb-button-danger qb-button-small"
//               >
//                 🚪 Logout
//               </button>
//             </div>
//           </div>

//           {/* Step 1: Search and Auto-Clone */}
//           {processStep === "search" && (
//             <div className="qb-section">
//               <h3 className="qb-section-title">📚 Step 1: Select QB(s) to Clone</h3>

//               {/* QB Mode Selector - Single or Multiple */}
//               <div style={{ display: "flex", gap: "8px", marginBottom: "24px", padding: "4px", background: "#f1f3f5", borderRadius: "10px" }}>
//                 <button
//                   onClick={() => {
//                     setQbMode("single");
//                     setSelectedSourceQBs([]);
//                   }}
//                   style={{
//                     flex: 1,
//                     padding: "12px 20px",
//                     background: qbMode === "single" ? "white" : "transparent",
//                     border: "none",
//                     borderRadius: "8px",
//                     color: qbMode === "single" ? "#4c6ef5" : "#868e96",
//                     fontSize: "15px",
//                     fontWeight: "700",
//                     cursor: "pointer",
//                     transition: "all 0.2s ease",
//                     boxShadow: qbMode === "single" ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
//                   }}
//                 >
//                   📄 Single QB
//                 </button>
//                 <button
//                   onClick={() => {
//                     setQbMode("multiple");
//                     setSelectedSourceQBs([]);
//                   }}
//                   style={{
//                     flex: 1,
//                     padding: "12px 20px",
//                     background: qbMode === "multiple" ? "white" : "transparent",
//                     border: "none",
//                     borderRadius: "8px",
//                     color: qbMode === "multiple" ? "#4c6ef5" : "#868e96",
//                     fontSize: "15px",
//                     fontWeight: "700",
//                     cursor: "pointer",
//                     transition: "all 0.2s ease",
//                     boxShadow: qbMode === "multiple" ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
//                   }}
//                 >
//                   📚 Multiple QBs
//                 </button>
//               </div>

//               {/* Input Method Tabs - Type or Search */}
//               <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid #e9ecef" }}>
//                 <button
//                   onClick={() => setInputMode("type")}
//                   style={{
//                     padding: "12px 24px",
//                     background: inputMode === "type" ? "rgba(76, 110, 245, 0.1)" : "transparent",
//                     border: "none",
//                     borderBottom: inputMode === "type" ? "3px solid #4c6ef5" : "3px solid transparent",
//                     color: inputMode === "type" ? "#4c6ef5" : "#868e96",
//                     fontSize: "15px",
//                     fontWeight: "600",
//                     cursor: "pointer",
//                     transition: "all 0.2s ease",
//                     position: "relative",
//                     bottom: "-2px"
//                   }}
//                 >
//                   ⌨️ Type QB Name{qbMode === "multiple" ? "s" : ""}
//                 </button>
//                 <button
//                   onClick={() => setInputMode("search")}
//                   style={{
//                     padding: "12px 24px",
//                     background: inputMode === "search" ? "rgba(76, 110, 245, 0.1)" : "transparent",
//                     border: "none",
//                     borderBottom: inputMode === "search" ? "3px solid #4c6ef5" : "3px solid transparent",
//                     color: inputMode === "search" ? "#4c6ef5" : "#868e96",
//                     fontSize: "15px",
//                     fontWeight: "600",
//                     cursor: "pointer",
//                     transition: "all 0.2s ease",
//                     position: "relative",
//                     bottom: "-2px"
//                   }}
//                 >
//                   🔍 Search & Select
//                 </button>
//               </div>

//               {/* Type Mode */}
//               {inputMode === "type" && (
//                 <div>
//                   {qbMode === "single" ? (
//                     /* Single QB - Direct search and proceed */
//                     <div>
//                       <div className="qb-form-group">
//                         <label className="qb-label">Search Question Bank</label>
//                         <input
//                           type="text"
//                           value={searchTerm}
//                           onChange={(e) => setSearchTerm(e.target.value)}
//                           onKeyPress={(e) => e.key === "Enter" && handleSearchSourceQB()}
//                           placeholder="Type QB name to search..."
//                           className="qb-input"
//                         />
//                       </div>

//                       <button
//                         onClick={handleSearchSourceQB}
//                         className="qb-button qb-button-primary"
//                       >
//                         🔍 Search
//                       </button>

//                       {searchResults.length > 0 && (
//                         <div className="qb-search-results">
//                           <h4 className="qb-subtitle">Search Results - Click to Select</h4>
//                           {searchResults.map((qb) => {
//                             const isSelected = selectedSourceQBs.some(selected => selected.qb_id === qb.qb_id);
//                             return (
//                               <div
//                                 key={qb.qb_id}
//                                 className={`qb-search-item ${isSelected ? "qb-search-item-selected" : ""}`}
//                                 onClick={() => setSelectedSourceQBs([qb])}
//                                 style={{ cursor: "pointer" }}
//                               >
//                                 <div style={{ flex: 1 }}>
//                                   <div className="qb-search-item-name">{qb.qb_name}</div>
//                                   <div className="qb-search-item-meta">
//                                     {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                                   </div>
//                                 </div>
//                               </div>
//                             );
//                           })}
//                         </div>
//                       )}
//                     </div>
//                   ) : (
//                     /* Multiple QBs - Add QB by name with Enter */
//                     <div>
//                       <div className="qb-form-group">
//                         <label className="qb-label">Enter QB Names (Press Enter to Add)</label>
//                         <input
//                           type="text"
//                           value={qbNameInput}
//                           onChange={(e) => setQbNameInput(e.target.value)}
//                           onKeyPress={handleQBNameKeyPress}
//                           placeholder="Type exact QB name and press Enter..."
//                           className="qb-input"
//                           style={{ marginBottom: "8px" }}
//                         />
//                         <div style={{ fontSize: "13px", color: "#868e96", marginBottom: "12px" }}>
//                           💡 Type the exact QB name and press <strong>Enter</strong> to add it to the list below
//                         </div>
//                       </div>

//                       <button
//                         onClick={() => handleAddQBByName(qbNameInput)}
//                         className="qb-button qb-button-primary"
//                       >
//                         ➕ Add QB
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Search Mode */}
//               {inputMode === "search" && (
//                 <div>
//                   <div className="qb-form-group">
//                     <label className="qb-label">Search Question Bank</label>
//                     <input
//                       type="text"
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       onKeyPress={(e) => e.key === "Enter" && handleSearchSourceQB()}
//                       placeholder="Enter QB name to search..."
//                       className="qb-input"
//                     />
//                   </div>

//                   <button
//                     onClick={handleSearchSourceQB}
//                     className="qb-button qb-button-primary"
//                   >
//                     🔍 Search
//                   </button>

//                   {searchResults.length > 0 && (
//                     <div className="qb-search-results">
//                       <h4 className="qb-subtitle">
//                         {qbMode === "single" ? "Search Results - Click to Select" : "Search Results - Click to Select Multiple"}
//                       </h4>
//                       {searchResults.map((qb) => {
//                         const isSelected = selectedSourceQBs.some(selected => selected.qb_id === qb.qb_id);
//                         return (
//                           <div
//                             key={qb.qb_id}
//                             className={`qb-search-item ${isSelected ? "qb-search-item-selected" : ""}`}
//                             onClick={() => {
//                               if (qbMode === "single") {
//                                 setSelectedSourceQBs([qb]);
//                               } else {
//                                 if (isSelected) {
//                                   setSelectedSourceQBs(selectedSourceQBs.filter(selected => selected.qb_id !== qb.qb_id));
//                                 } else {
//                                   setSelectedSourceQBs([...selectedSourceQBs, qb]);
//                                 }
//                               }
//                             }}
//                             style={{ cursor: "pointer" }}
//                           >
//                             <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
//                               {qbMode === "multiple" && (
//                                 <input
//                                   type="checkbox"
//                                   checked={isSelected}
//                                   onChange={() => {}}
//                                   style={{ width: "18px", height: "18px", cursor: "pointer" }}
//                                 />
//                               )}
//                               <div style={{ flex: 1 }}>
//                                 <div className="qb-search-item-name">{qb.qb_name}</div>
//                                 <div className="qb-search-item-meta">
//                                   {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                                 </div>
//                               </div>
//                             </div>
//                           </div>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Selected QBs List */}
//               {selectedSourceQBs.length > 0 && (
//                 <div className="qb-selected-section" style={{ marginTop: "24px" }}>
//                   <h4 className="qb-subtitle">
//                     {qbMode === "single" ? "✅ Selected QB" : `✅ QB List (${selectedSourceQBs.length})`}
//                   </h4>
                  
//                   <div style={{ marginBottom: "20px", maxHeight: "400px", overflowY: "auto", border: "2px solid #51cf66", borderRadius: "10px", padding: "16px", background: "white" }}>
//                     {selectedSourceQBs.map((qb, index) => (
//                       <div key={qb.qb_id} style={{ padding: "14px", background: "#f0fff4", borderRadius: "8px", marginBottom: qbMode === "multiple" ? "10px" : "0", border: "1px solid #51cf66" }}>
//                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
//                           <div style={{ flex: 1 }}>
//                             {qbMode === "multiple" && (
//                               <div style={{ fontSize: "14px", fontWeight: "700", color: "#51cf66", marginBottom: "6px" }}>
//                                 QB #{index + 1}
//                               </div>
//                             )}
//                             <div style={{ fontSize: "16px", fontWeight: "700", color: "#212529", marginBottom: "6px" }}>
//                               {qb.qb_name}
//                             </div>
//                             <div style={{ fontSize: "13px", color: "#868e96", marginBottom: "6px" }}>
//                               {qb.questionCount} questions • {qb.visibility}
//                             </div>
//                             <div style={{ fontSize: "13px", color: "#4c6ef5", fontWeight: "600", background: "#e7f5ff", padding: "4px 8px", borderRadius: "4px", display: "inline-block" }}>
//                               → Internal_gb26_{qb.qb_name}
//                             </div>
//                           </div>
//                           {qbMode === "multiple" && (
//                             <button
//                               onClick={() => setSelectedSourceQBs(selectedSourceQBs.filter(selected => selected.qb_id !== qb.qb_id))}
//                               style={{ background: "#fa5252", color: "white", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "600", marginLeft: "12px", flexShrink: 0 }}
//                             >
//                               ✕ Remove
//                             </button>
//                           )}
//                         </div>
//                       </div>
//                     ))}
//                   </div>

//                   {/* Batch Demo Info */}
//                   <div style={{ background: "linear-gradient(135deg, #fff3bf 0%, #ffe066 100%)", padding: "16px", borderRadius: "10px", marginBottom: "20px", border: "2px solid #fab005" }}>
//                     <div style={{ fontSize: "14px", fontWeight: "700", color: "#e67700", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
//                       🎯 Auto-Configuration
//                     </div>
//                     <div style={{ fontSize: "13px", color: "#495057", lineHeight: "1.6" }}>
//                       • <strong>Clone Prefix:</strong> Internal_gb26_<br/>
//                       • <strong>Batch Demo:</strong> Default selected (All {B_D_ID_OPTIONS.length} departments)<br/>
//                       • <strong>All Questions:</strong> Will be auto-selected (no filtering)
//                     </div>
//                   </div>

//                   {qbMode === "multiple" && (
//                     <div style={{ background: "linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)", padding: "20px", borderRadius: "12px", marginBottom: "20px", border: "2px solid #4c6ef5" }}>
//                       <div style={{ fontSize: "15px", fontWeight: "700", color: "#4c6ef5", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
//                         📊 Batch Clone Summary
//                       </div>
//                       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
//                         <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #4c6ef5" }}>
//                           <div style={{ fontSize: "12px", color: "#868e96", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>Total QBs</div>
//                           <div style={{ fontSize: "24px", fontWeight: "800", color: "#4c6ef5" }}>{selectedSourceQBs.length}</div>
//                         </div>
//                         <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #51cf66" }}>
//                           <div style={{ fontSize: "12px", color: "#868e96", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>Total Questions</div>
//                           <div style={{ fontSize: "24px", fontWeight: "800", color: "#51cf66" }}>{selectedSourceQBs.reduce((sum, qb) => sum + qb.questionCount, 0)}</div>
//                         </div>
//                         <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #7950f2" }}>
//                           <div style={{ fontSize: "12px", color: "#868e96", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>Departments</div>
//                           <div style={{ fontSize: "24px", fontWeight: "800", color: "#7950f2" }}>{B_D_ID_OPTIONS.length}</div>
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   <button
//                     onClick={handleBatchCloneAndFetch}
//                     className="qb-button qb-button-success"
//                     style={{ width: "100%", fontSize: "16px", padding: "16px" }}
//                   >
//                     {qbMode === "single" 
//                       ? "🔄 Clone QB & Fetch Questions"
//                       : `🚀 Batch Clone ${selectedSourceQBs.length} QB(s) & Fetch All Questions`
//                     }
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Step 2: Filter Questions & Select Target */}
//           {(processStep === "cloned" || processStep === "moved") && (
//             <div className="qb-section">
//               <h3 className="qb-section-title">🎯 Step 2: Filter Questions & Move</h3>

//               <div className="qb-info-card">
//                 <div className="qb-info-title">Cloned QBs ({clonedQBs.length})</div>
//                 <div style={{ marginBottom: "12px" }}>
//                   {clonedQBs.map((qb, index) => (
//                     <div key={qb.qb_id} style={{ padding: "8px 0", borderBottom: index < clonedQBs.length - 1 ? "1px solid rgba(76, 110, 245, 0.2)" : "none" }}>
//                       <div style={{ fontSize: "15px", fontWeight: "700", color: "#212529" }}>
//                         {index + 1}. {qb.qb_name}
//                       </div>
//                       <div style={{ fontSize: "13px", color: "#868e96" }}>
//                         {qb.questionCount} questions
//                         {qb.expectedCount && qb.questionCount < qb.expectedCount && (
//                           <span className="qb-warning-text">
//                             {" "}⚠️ Expected {qb.expectedCount}, got {qb.questionCount} ({qb.expectedCount - qb.questionCount} missing)
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//                 <div className="qb-info-meta" style={{ paddingTop: "12px", borderTop: "2px solid rgba(76, 110, 245, 0.3)" }}>
//                   <strong>Total:</strong> {allQuestions.length} questions • <strong>Filtered:</strong> {filteredQuestions.length} questions • <strong>Selected:</strong> {selectedQuestions.length} questions
//                 </div>
//               </div>

//               {/* Filters - NO stverified checkbox */}
//               <div className="qb-form-group">
//                 <label className="qb-label">Filter by Tags (Optional)</label>
//                 <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
//                   {availableTags.map(tag => (
//                     <label key={tag} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: selectedTags.includes(tag) ? "#e7f5ff" : "#f1f3f5", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
//                       <input
//                         type="checkbox"
//                         checked={selectedTags.includes(tag)}
//                         onChange={(e) => {
//                           if (e.target.checked) {
//                             setSelectedTags([...selectedTags, tag]);
//                           } else {
//                             setSelectedTags(selectedTags.filter(t => t !== tag));
//                           }
//                         }}
//                       />
//                       {tag}
//                     </label>
//                   ))}
//                 </div>
//               </div>

//               <div className="qb-form-group">
//                 <label className="qb-label">Filter by Question Type (Optional)</label>
//                 <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
//                   {availableQuestionTypes.map(type => (
//                     <label key={type} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: selectedQuestionTypes.includes(type) ? "#e7f5ff" : "#f1f3f5", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
//                       <input
//                         type="checkbox"
//                         checked={selectedQuestionTypes.includes(type)}
//                         onChange={(e) => {
//                           if (e.target.checked) {
//                             setSelectedQuestionTypes([...selectedQuestionTypes, type]);
//                           } else {
//                             setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type));
//                           }
//                         }}
//                       />
//                       {type}
//                     </label>
//                   ))}
//                 </div>
//               </div>

//               <button
//                 onClick={handleApplyFilters}
//                 className="qb-button qb-button-primary"
//                 style={{ marginBottom: "20px" }}
//               >
//                 🔍 Apply Filters
//               </button>

//               {/* Question Selection */}
//               <div style={{ marginBottom: "20px" }}>
//                 <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
//                   <button onClick={handleSelectAll} className="qb-button qb-button-secondary qb-button-small">
//                     ✅ Select All ({filteredQuestions.length})
//                   </button>
//                   <button onClick={handleDeselectAll} className="qb-button qb-button-secondary qb-button-small">
//                     ❌ Deselect All
//                   </button>
//                 </div>

//                 <div style={{ maxHeight: "400px", overflowY: "auto", border: "2px solid #e9ecef", borderRadius: "10px", padding: "16px", background: "#f8f9fa" }}>
//                   {filteredQuestions.length === 0 ? (
//                     <div style={{ textAlign: "center", padding: "40px", color: "#868e96" }}>
//                       No questions match the selected filters
//                     </div>
//                   ) : (
//                     filteredQuestions.map((q, index) => (
//                       <div key={q.q_id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px", background: "white", borderRadius: "8px", marginBottom: "12px", border: selectedQuestions.includes(q.q_id) ? "2px solid #4c6ef5" : "2px solid #dee2e6" }}>
//                         <input
//                           type="checkbox"
//                           checked={selectedQuestions.includes(q.q_id)}
//                           onChange={() => handleToggleQuestion(q.q_id)}
//                           style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer", flexShrink: 0 }}
//                         />
//                         <div style={{ flex: 1 }}>
//                           <div style={{ fontSize: "13px", fontWeight: "700", color: "#4c6ef5", marginBottom: "8px" }}>
//                             Q{index + 1} • {q.question_type}
//                           </div>
//                           <div style={{ fontSize: "14px", fontWeight: "600", color: "#212529", marginBottom: "8px", lineHeight: "1.5" }}>
//                             {extractQuestionText(q.question_data)}
//                           </div>
//                           <div style={{ fontSize: "12px", color: "#868e96", marginBottom: "4px" }}>
//                             <strong>Subject:</strong> {q.subject?.name || 'N/A'} • <strong>Topic:</strong> {q.topic?.name || 'N/A'}
//                           </div>
//                           <div style={{ fontSize: "12px", color: "#868e96" }}>
//                             <strong>Tags:</strong> {q.tags?.map(t => t.name).join(", ") || "None"}
//                           </div>
//                         </div>
//                       </div>
//                     ))
//                   )}
//                 </div>
//               </div>

//               {/* Target QB Search */}
//               <div className="qb-form-group">
//                 <label className="qb-label">Search Target QB</label>
//                 <input
//                   type="text"
//                   value={targetSearchTerm}
//                   onChange={(e) => setTargetSearchTerm(e.target.value)}
//                   onKeyPress={(e) => e.key === "Enter" && handleSearchTargetQB()}
//                   placeholder="Enter target QB name..."
//                   className="qb-input"
//                 />
//               </div>

//               <button
//                 onClick={handleSearchTargetQB}
//                 className="qb-button qb-button-primary"
//               >
//                 🔍 Search Target
//               </button>

//               {targetSearchResults.length > 0 && (
//                 <div className="qb-search-results">
//                   <h4 className="qb-subtitle">Target QB Results</h4>
//                   {targetSearchResults.map((qb) => (
//                     <div
//                       key={qb.qb_id}
//                       className={`qb-search-item ${
//                         selectedTargetQB?.qb_id === qb.qb_id
//                           ? "qb-search-item-selected"
//                           : ""
//                       }`}
//                       onClick={() => setSelectedTargetQB(qb)}
//                     >
//                       <div className="qb-search-item-name">{qb.qb_name}</div>
//                       <div className="qb-search-item-meta">
//                         {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               {selectedTargetQB && (
//                 <div className="qb-selected-section">
//                   <h4 className="qb-subtitle">✅ Target QB Selected</h4>
//                   <div className="qb-selected-card">
//                     <div className="qb-selected-name">{selectedTargetQB.qb_name}</div>
//                     <div className="qb-selected-meta">
//                       {selectedTargetQB.questionCount} questions • {selectedTargetQB.visibility}
//                     </div>
//                   </div>

//                   <button
//                     onClick={handleMoveAndDelete}
//                     disabled={selectedQuestions.length === 0}
//                     className={`qb-button qb-button-success ${selectedQuestions.length === 0 ? "qb-button-disabled" : ""}`}
//                     style={{ marginTop: "16px" }}
//                   >
//                     📦 Move {selectedQuestions.length} Questions (Batches of 100) & Auto-Delete Clones
//                   </button>
//                 </div>
//               )}

//               <button
//                 onClick={handleStartNew}
//                 className="qb-button qb-button-secondary"
//                 style={{ marginTop: "20px" }}
//               >
//                 🔄 Start New Operation
//               </button>
//             </div>
//           )}

//           {/* Step 3: Completion */}
//           {processStep === "completed" && (
//             <div className="qb-section">
//               <div className="qb-success-card">
//                 <div className="qb-success-icon">✅</div>
//                 <h3 className="qb-success-title">Operation Completed!</h3>
//                 <p className="qb-success-message">
//                   All selected questions have been moved to the target QB in batches of 100 and all cloned QBs have been deleted successfully.
//                 </p>

//                 <button
//                   onClick={handleStartNew}
//                   className="qb-button qb-button-primary"
//                   style={{ marginTop: "20px" }}
//                 >
//                   🔄 Start New Operation
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
import { useState, useEffect } from "react";
import { QB_ACCESS_CONFIG } from "../config";
import "./QBAccessCorporate.css";

const API = "https://api.examly.io";

export default function QBAccessCorporate({ onBack }) {
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [token, setToken] = useState("");
  const [ui, setUI] = useState("domain"); // "domain" | "welcome" | "menu"
  const [tokenInput, setTokenInput] = useState("");
  const [alert, setAlert] = useState(null);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");

  // Search & Clone states
  const [qbMode, setQbMode] = useState("multiple");
  const [inputMode, setInputMode] = useState("type");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [qbNameInput, setQbNameInput] = useState("");
  const [selectedSourceQBs, setSelectedSourceQBs] = useState([]);
  const [clonedQBs, setClonedQBs] = useState([]);

  // Question filtering states
  const [allQuestions, setAllQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
  const [availableQuestionTypes, setAvailableQuestionTypes] = useState([]);

  // Target QB states
  const [targetSearchTerm, setTargetSearchTerm] = useState("");
  const [targetSearchResults, setTargetSearchResults] = useState([]);
  const [selectedTargetQB, setSelectedTargetQB] = useState(null);

  const [processStep, setProcessStep] = useState("search");

  // When domain changes, load its token
  useEffect(() => {
    if (!selectedDomain) return;
    const storageKey = `examly_token_corporate_${selectedDomain}`; // e.g. examly_token_corporate_LTI
    try {
      const saved = localStorage.getItem(storageKey) || "";
      setToken(saved);
      setUI(saved ? "menu" : "welcome");
    } catch {
      setToken("");
      setUI("welcome");
    }
  }, [selectedDomain]);

  // Derived config from selected domain
  const domainConfig = selectedDomain ? QB_ACCESS_CONFIG[selectedDomain] : null;
  const activeDeptIds = domainConfig ? domainConfig.department_ids : [];
  const activeBDIds = domainConfig ? domainConfig.b_d_id_options : [];
  const clonePrefix = "Internal_gb26_";

  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const storageKey = `examly_token_corporate_${selectedDomain}`;
    try {
      localStorage.setItem(storageKey, tokenInput.trim());
      setToken(tokenInput.trim());
      setTokenInput("");
      setUI("menu");
      showAlert("Token saved successfully!", "success");
    } catch (err) {
      showAlert("Failed to save token: " + err.message, "danger");
    }
  };

  const clearToken = () => {
    const storageKey = `examly_token_corporate_${selectedDomain}`;
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.error("Failed to clear token:", err);
    }
    setToken("");
    setUI("welcome");
    setTokenInput("");
    resetState();
    showAlert("Token cleared", "danger");
  };

  const handleSwitchDomain = () => {
    setSelectedDomain(null);
    setUI("domain");
    resetState();
    setToken("");
    setTokenInput("");
  };

  const resetState = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedSourceQBs([]);
    setClonedQBs([]);
    setAllQuestions([]);
    setFilteredQuestions([]);
    setSelectedQuestions([]);
    setAvailableTags([]);
    setSelectedTags([]);
    setSelectedQuestionTypes([]);
    setAvailableQuestionTypes([]);
    setTargetSearchTerm("");
    setTargetSearchResults([]);
    setSelectedTargetQB(null);
    setProcessStep("search");
    setQbNameInput("");
  };

  const extractQuestionText = (questionData) => {
    if (!questionData) return "No question text";
    const text = questionData
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\$\$\$examly/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  // ==================== API FUNCTIONS ====================

  async function searchQuestionBanks(term) {
    const res = await fetch(`${API}/api/v2/questionbanks`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        branch_id: "all",
        department_id: activeDeptIds,
        limit: 25,
        mainDepartmentUser: true,
        page: 1,
        search: term,
        visibility: "All"
      })
    });
    const json = await res.json();
    return json?.results?.questionbanks || [];
  }

  async function autoCloneQuestionBank(qbData) {
    const clonedName = `${clonePrefix}${qbData.qb_name}`;
    const res = await fetch(`${API}/api/questionbank/clone`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mainDepartmentUser: true,
        price: qbData.price || 0,
        qb_code: null,
        qb_description: qbData.qb_description,
        qb_id: qbData.qb_id,
        qb_name: clonedName,
        tags: qbData.tags || [],
        visibility: qbData.visibility || "Within Department",
        b_d_id: activeBDIds
      })
    });
    const json = await res.json();
    console.log("📋 Auto-Clone API Response:", json);
    if (json?.data?.success) {
      return { ...json.data, clonedName };
    } else {
      throw new Error(json?.message || json?.data?.message || "Failed to clone QB");
    }
  }

  async function fetchAllQuestions(qbId) {
    let allQ = [];
    let page = 1;
    let hasMore = true;
    const limit = 200;
    while (hasMore) {
      const res = await fetch(`${API}/api/v2/questionfilter`, {
        method: "POST",
        headers,
        body: JSON.stringify({ qb_id: qbId, page, limit, type: "Single" })
      });
      const json = await res.json();
      const questions = json?.non_group_questions || [];
      allQ = [...allQ, ...questions];
      hasMore = questions.length === limit;
      page++;
      if (hasMore) await sleep(500);
    }
    return allQ;
  }

  async function moveQuestionsBatch(questionIds, questionTypes, targetQbId, currentQbId, batchSize = 100) {
    const total = questionIds.length;
    const totalBatches = Math.ceil(total / batchSize);
    let movedCount = 0;
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, total);
      const batchIds = questionIds.slice(start, end);
      const batchTypes = questionTypes.slice(start, end);
      showOverlay(`📦 Moving batch ${i + 1}/${totalBatches} (${batchIds.length} questions)...`);
      const res = await fetch(
        `${API}/api/questionMove?q_id=${batchIds.join(",")}&q_type=${batchTypes.join(",")}&qb_id=${targetQbId}&current_qb_id=${currentQbId}`,
        { method: "GET", headers: { Authorization: token } }
      );
      const json = await res.json();
      if (!json.success) throw new Error(`Failed to move batch ${i + 1}: ${json.message || "Unknown error"}`);
      movedCount += batchIds.length;
      if (i < totalBatches - 1) await sleep(500);
    }
    return { success: true, movedCount };
  }

  async function deleteQuestionBank(qbId, qbName) {
    const res = await fetch(`${API}/api/v2/questionbanks/bulkDelete`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        branch_id: "all",
        department_id: activeDeptIds,
        ids: [qbId],
        limit: 25,
        mainDepartmentUser: true,
        page: 1,
        search: qbName,
        visibility: "All"
      })
    });
    const json = await res.json();
    if (json?.data?.success) return json.data;
    throw new Error(json?.data?.message || "Failed to delete QB");
  }

  // ==================== HANDLERS ====================

  const handleSearchSourceQB = async () => {
    if (!searchTerm.trim()) { showAlert("Please enter a search term", "warning"); return; }
    showOverlay("🔍 Searching question banks...");
    try {
      const results = await searchQuestionBanks(searchTerm);
      setSearchResults(results);
      hideOverlay();
      if (results.length === 0) showAlert("No question banks found", "warning");
      else showAlert(`Found ${results.length} question bank(s)`, "success");
    } catch (err) {
      hideOverlay();
      showAlert("Error searching: " + err.message, "danger");
    }
  };

  const handleAddQBByName = async (qbName) => {
    if (!qbName.trim()) { showAlert("Please enter a QB name", "warning"); return; }
    if (selectedSourceQBs.some(qb => qb.qb_name === qbName.trim())) {
      showAlert(`"${qbName.trim()}" is already added`, "warning");
      setQbNameInput("");
      return;
    }
    showOverlay(`🔍 Searching for "${qbName.trim()}"...`);
    try {
      const results = await searchQuestionBanks(qbName.trim());
      hideOverlay();
      if (results.length === 0) { showAlert(`No QB found with name "${qbName.trim()}"`, "danger"); return; }
      const exactMatch = results.find(qb => qb.qb_name === qbName.trim());
      const qbToAdd = exactMatch || results[0];
      setSelectedSourceQBs([...selectedSourceQBs, qbToAdd]);
      setQbNameInput("");
      showAlert(`✅ Added: ${qbToAdd.qb_name} (${qbToAdd.questionCount} questions)`, "success");
    } catch (err) {
      hideOverlay();
      showAlert("Error searching: " + err.message, "danger");
    }
  };

  const handleBatchCloneAndFetch = async () => {
    if (selectedSourceQBs.length === 0) { showAlert("Please select at least one source QB", "warning"); return; }
    showOverlay(`🔄 Starting batch clone of ${selectedSourceQBs.length} QB(s)...`);
    const clonedResults = [];
    let totalQuestionsExpected = 0;
    let totalQuestionsFetched = 0;
    try {
      for (let i = 0; i < selectedSourceQBs.length; i++) {
        const sourceQB = selectedSourceQBs[i];
        const qbNumber = i + 1;
        showOverlay(`🔄 Cloning QB ${qbNumber}/${selectedSourceQBs.length}: ${sourceQB.qb_name}...`);
        const cloneResult = await autoCloneQuestionBank(sourceQB);
        const expectedCount = sourceQB.questionCount;
        totalQuestionsExpected += expectedCount;
        const maxRetries = 10;
        let questions = [];
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const waitTime = attempt * 2000;
          showOverlay(`⏳ QB ${qbNumber}/${selectedSourceQBs.length}: Waiting ${waitTime / 1000}s (Attempt ${attempt}/${maxRetries})...`);
          await sleep(waitTime);
          showOverlay(`📥 QB ${qbNumber}/${selectedSourceQBs.length}: Fetching questions (Attempt ${attempt}/${maxRetries})...`);
          questions = await fetchAllQuestions(cloneResult.qb_id);
          if (questions.length >= expectedCount) break;
        }
        totalQuestionsFetched += questions.length;
        clonedResults.push({
          qb_id: cloneResult.qb_id,
          qb_name: cloneResult.clonedName,
          originalName: sourceQB.qb_name,
          questionCount: questions.length,
          expectedCount,
          questions
        });
        if (i < selectedSourceQBs.length - 1) await sleep(1000);
      }
      const allQuestionsFromAllQBs = clonedResults.flatMap(qb => qb.questions);
      const tagsSet = new Set();
      const typesSet = new Set();
      allQuestionsFromAllQBs.forEach(q => {
        if (q.tags && Array.isArray(q.tags)) q.tags.forEach(tag => tagsSet.add(tag.name));
        if (q.question_type) typesSet.add(q.question_type);
      });
      setAvailableTags(Array.from(tagsSet));
      setAvailableQuestionTypes(Array.from(typesSet));
      setAllQuestions(allQuestionsFromAllQBs);
      setFilteredQuestions(allQuestionsFromAllQBs);
      setSelectedQuestions(allQuestionsFromAllQBs.map(q => q.q_id));
      setClonedQBs(clonedResults);
      setProcessStep("cloned");
      hideOverlay();
      const allComplete = totalQuestionsFetched >= totalQuestionsExpected;
      showAlert(
        allComplete
          ? `✅ Cloned ${selectedSourceQBs.length} QB(s) with ${totalQuestionsFetched} questions! All auto-selected.`
          : `⚠️ Cloned ${selectedSourceQBs.length} QB(s) with ${totalQuestionsFetched}/${totalQuestionsExpected} questions.`,
        allComplete ? "success" : "warning"
      );
    } catch (err) {
      hideOverlay();
      showAlert("Error during batch clone: " + err.message, "danger");
    }
  };

  const handleApplyFilters = () => {
    let filtered = [...allQuestions];
    if (selectedTags.length > 0) filtered = filtered.filter(q => q.tags && q.tags.some(tag => selectedTags.includes(tag.name)));
    if (selectedQuestionTypes.length > 0) filtered = filtered.filter(q => selectedQuestionTypes.includes(q.question_type));
    setFilteredQuestions(filtered);
    setSelectedQuestions(filtered.map(q => q.q_id));
    showAlert(`Filtered to ${filtered.length} questions`, "success");
  };

  const handleToggleQuestion = (qId) => {
    setSelectedQuestions(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
  };

  const handleSearchTargetQB = async () => {
    if (!targetSearchTerm.trim()) { showAlert("Please enter a search term", "warning"); return; }
    showOverlay("🔍 Searching target question banks...");
    try {
      const results = await searchQuestionBanks(targetSearchTerm);
      setTargetSearchResults(results);
      hideOverlay();
      if (results.length === 0) showAlert("No question banks found", "warning");
      else showAlert(`Found ${results.length} question bank(s)`, "success");
    } catch (err) {
      hideOverlay();
      showAlert("Error searching: " + err.message, "danger");
    }
  };

  const handleMoveAndDelete = async () => {
    if (!selectedTargetQB) { showAlert("Please select a target QB", "warning"); return; }
    if (selectedQuestions.length === 0) { showAlert("No questions selected to move", "warning"); return; }
    try {
      showOverlay(`📦 Preparing to move ${selectedQuestions.length} question(s) in batches of 100...`);
      const questionsToMove = allQuestions.filter(q => selectedQuestions.includes(q.q_id));
      const questionIds = questionsToMove.map(q => q.q_id);
      const questionTypes = questionsToMove.map(q => q.question_type || "mcq_single_correct");
      await moveQuestionsBatch(questionIds, questionTypes, selectedTargetQB.qb_id, clonedQBs[0].qb_id, 100);
      await sleep(500);
      showOverlay(`🗑️ Deleting ${clonedQBs.length} cloned QB(s)...`);
      let deletedCount = 0;
      let failedDeletes = [];
      for (let i = 0; i < clonedQBs.length; i++) {
        const clonedQB = clonedQBs[i];
        showOverlay(`🗑️ Deleting QB ${i + 1}/${clonedQBs.length}: ${clonedQB.qb_name}...`);
        try {
          await deleteQuestionBank(clonedQB.qb_id, clonedQB.qb_name);
          deletedCount++;
          await sleep(300);
        } catch (deleteErr) {
          failedDeletes.push(clonedQB.qb_name);
        }
      }
      hideOverlay();
      await sleep(200);
      showAlert(
        failedDeletes.length === 0
          ? `✅ Moved ${selectedQuestions.length} question(s) to ${selectedTargetQB.qb_name} and deleted all ${clonedQBs.length} cloned QB(s)`
          : `✅ Moved ${selectedQuestions.length} question(s). Deleted ${deletedCount}/${clonedQBs.length} QB(s). Failed: ${failedDeletes.join(", ")}`,
        failedDeletes.length === 0 ? "success" : "warning"
      );
      setProcessStep("completed");
    } catch (err) {
      hideOverlay();
      showAlert("Error during move process: " + err.message, "danger");
    }
  };

  const handleStartNew = () => {
    resetState();
    showAlert("Ready for new operation", "info");
  };

  // ==================== RENDER ====================

  return (
    <div className="qb-access-container">
      {overlay && (
        <div className="qb-overlay">
          <div className="qb-overlay-content">
            <div className="qb-spinner"></div>
            <div className="qb-overlay-text">{overlayText}</div>
          </div>
        </div>
      )}

      {alert && (
        <div className={`qb-alert qb-alert-${alert.type}`}>{alert.msg}</div>
      )}

      {/* ── DOMAIN SELECTION SCREEN ── */}
      {ui === "domain" && (
        <div style={{
          minHeight: "calc(100vh - 120px)",
          display: "flex",
          alignItems: "stretch",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          border: "1px solid #e9ecef"
        }}>
          {/* Left branding panel */}
          <div style={{
            flex: "1",
            background: "linear-gradient(145deg, #0d6efd 0%, #6610f2 100%)",
            padding: "60px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            color: "white",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "52px", marginBottom: "20px" }}>🏢</div>
              <h1 style={{ fontSize: "32px", fontWeight: "800", margin: "0 0 12px 0", lineHeight: 1.2, letterSpacing: "-0.5px" }}>
                QB Access
              </h1>
              <p style={{ fontSize: "15px", opacity: 0.85, margin: "0 0 36px 0", lineHeight: 1.6, maxWidth: "280px" }}>
                Corporate QB Clone, Filter & Move Tool
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {["Clone QBs with auto-prefix", "Batch question move", "Filter by tags & type", "Auto-delete cloned QBs"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", opacity: 0.92 }}>
                    <span style={{ width: "22px", height: "22px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right domain selector */}
          <div style={{
            flex: "1",
            background: "white",
            padding: "60px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}>
            <div style={{ marginBottom: "36px" }}>
              <button
                onClick={onBack}
                style={{ background: "none", border: "none", color: "#6c757d", fontSize: "13px", cursor: "pointer", padding: "0 0 20px 0", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
              >
                ← Back to Organizations
              </button>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#0d6efd", textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 10px 0" }}>
                Step 1 of 2
              </p>
              <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#1a1a1a", margin: "0 0 8px 0", letterSpacing: "-0.3px" }}>
                Select Domain
              </h2>
              <p style={{ color: "#6c757d", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
                Choose the corporate domain you want to work with
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* LTIM / Stark Corporate */}
              {["LTI", "HEXAWARE"].map((domainKey) => {
                const cfg = QB_ACCESS_CONFIG[domainKey];
                if (!cfg) return null;
                return (
                  <div
                    key={domainKey}
                    onClick={() => setSelectedDomain(domainKey)}
                    style={{
                      cursor: "pointer",
                      border: "2px solid #e9ecef",
                      borderRadius: "12px",
                      padding: "20px 24px",
                      background: "white",
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.border = `2px solid ${cfg.color}`;
                      e.currentTarget.style.background = `${cfg.color}08`;
                      e.currentTarget.style.transform = "translateX(6px)";
                      e.currentTarget.style.boxShadow = `0 4px 20px ${cfg.color}25`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.border = "2px solid #e9ecef";
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.transform = "translateX(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      width: "52px", height: "52px",
                      background: `${cfg.color}15`,
                      borderRadius: "12px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "26px", flexShrink: 0
                    }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a1a", marginBottom: "3px" }}>
                        {cfg.label}
                      </div>
                      <div style={{ fontSize: "13px", color: "#6c757d" }}>
                        {cfg.description}
                      </div>
                    </div>
                    <div style={{ fontSize: "18px", color: "#dee2e6" }}>→</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TOKEN ENTRY SCREEN ── */}
      {ui === "welcome" && (
        <div style={{
          minHeight: "calc(100vh - 120px)",
          display: "flex",
          alignItems: "stretch",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          border: "1px solid #e9ecef"
        }}>
          {/* Left branding */}
          <div style={{
            flex: "1",
            background: "linear-gradient(145deg, #0d6efd 0%, #6610f2 100%)",
            padding: "60px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            color: "white",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "240px", height: "240px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "52px", marginBottom: "20px" }}>🏢</div>
              <h1 style={{ fontSize: "32px", fontWeight: "800", margin: "0 0 12px 0", lineHeight: 1.2 }}>
                QB Access
              </h1>
              <p style={{ fontSize: "15px", opacity: 0.85, margin: "0 0 36px 0", lineHeight: 1.6, maxWidth: "280px" }}>
                Corporate QB Clone, Filter & Move Tool
              </p>
              {selectedDomain && domainConfig && (
                <div style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)"
                }}>
                  <div style={{ fontSize: "11px", opacity: 0.75, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Selected Domain
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "22px" }}>{domainConfig.icon}</span>
                    <span style={{ fontSize: "16px", fontWeight: "700" }}>{domainConfig.label}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right token entry */}
          <div style={{
            flex: "1",
            background: "white",
            padding: "60px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}>
            <div style={{ marginBottom: "32px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#0d6efd", textTransform: "uppercase", letterSpacing: "2px", margin: "0 0 10px 0" }}>
                Step 2 of 2
              </p>
              <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#1a1a1a", margin: "0 0 8px 0", letterSpacing: "-0.3px" }}>
                Enter API Token
              </h2>
              <p style={{ color: "#6c757d", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
                Paste your Authorization token to continue
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#495057", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                Authorization Token
              </label>
              <textarea
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your token here..."
                style={{
                  width: "100%", minHeight: "140px", padding: "14px",
                  border: "1.5px solid #dee2e6", borderRadius: "10px",
                  fontFamily: "monospace", fontSize: "12px",
                  boxSizing: "border-box", resize: "vertical", lineHeight: 1.5,
                  color: "#1a1a1a", background: "white", outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={e => { e.target.style.borderColor = "#0d6efd"; }}
                onBlur={e => { e.target.style.borderColor = "#dee2e6"; }}
              />
            </div>

            <button
              onClick={saveToken}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)",
                color: "white", border: "none", borderRadius: "10px",
                fontSize: "15px", fontWeight: "700", cursor: "pointer",
                marginBottom: "16px", transition: "opacity 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.92"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Save Token & Continue →
            </button>

            <button
              onClick={() => { setSelectedDomain(null); setUI("domain"); }}
              style={{
                width: "100%", padding: "12px",
                background: "transparent", color: "#6c757d",
                border: "1.5px solid #dee2e6", borderRadius: "10px",
                fontSize: "13px", fontWeight: "600", cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#6c757d"; e.currentTarget.style.color = "#1a1a1a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#dee2e6"; e.currentTarget.style.color = "#6c757d"; }}
            >
              ← Back to Domain Selection
            </button>

            <p style={{ fontSize: "12px", color: "#adb5bd", textAlign: "center", marginTop: "20px" }}>
              💡 Token is saved separately per domain in localStorage
            </p>
          </div>
        </div>
      )}

      {/* ── MAIN MENU SCREEN ── */}
      {ui === "menu" && (
        <div className="qb-card">
          <div className="qb-menu-header">
            <div>
              <h2 className="qb-title">
                {domainConfig?.icon} {domainConfig?.label} — Corporate
              </h2>
              <p className="qb-org-breadcrumb">QB Clone, Filter & Move Tool</p>
            </div>
            <div className="qb-menu-actions">
              {/* Domain badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: `${domainConfig?.color}15`,
                border: `1.5px solid ${domainConfig?.color}40`,
                borderRadius: "20px", padding: "6px 14px",
                fontSize: "13px", fontWeight: "600",
                color: domainConfig?.color
              }}>
                <span>{domainConfig?.icon}</span>
                <span>{domainConfig?.label}</span>
                <button
                  onClick={handleSwitchDomain}
                  style={{
                    background: `${domainConfig?.color}25`, border: "none",
                    cursor: "pointer", color: domainConfig?.color,
                    fontSize: "12px", padding: "2px 6px",
                    borderRadius: "50%", lineHeight: 1, fontWeight: "bold"
                  }}
                  title="Switch domain"
                >
                  ✕
                </button>
              </div>
              <button onClick={onBack} className="qb-button qb-button-secondary qb-button-small">
                ← Organizations
              </button>
              <button onClick={clearToken} className="qb-button qb-button-danger qb-button-small">
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Step 1: Search and Clone */}
          {processStep === "search" && (
            <div className="qb-section">
              <h3 className="qb-section-title">📚 Step 1: Select QB(s) to Clone</h3>

              {/* QB Mode */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "24px", padding: "4px", background: "#f1f3f5", borderRadius: "10px" }}>
                {[{ key: "single", label: "📄 Single QB" }, { key: "multiple", label: "📚 Multiple QBs" }].map(m => (
                  <button key={m.key} onClick={() => { setQbMode(m.key); setSelectedSourceQBs([]); }}
                    style={{
                      flex: 1, padding: "12px 20px",
                      background: qbMode === m.key ? "white" : "transparent",
                      border: "none", borderRadius: "8px",
                      color: qbMode === m.key ? "#4c6ef5" : "#868e96",
                      fontSize: "15px", fontWeight: "700", cursor: "pointer",
                      boxShadow: qbMode === m.key ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.2s"
                    }}
                  >{m.label}</button>
                ))}
              </div>

              {/* Input Method Tabs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid #e9ecef" }}>
                {[{ key: "type", label: `⌨️ Type QB Name${qbMode === "multiple" ? "s" : ""}` }, { key: "search", label: "🔍 Search & Select" }].map(m => (
                  <button key={m.key} onClick={() => setInputMode(m.key)}
                    style={{
                      padding: "12px 24px", background: inputMode === m.key ? "rgba(76,110,245,0.1)" : "transparent",
                      border: "none", borderBottom: inputMode === m.key ? "3px solid #4c6ef5" : "3px solid transparent",
                      color: inputMode === m.key ? "#4c6ef5" : "#868e96",
                      fontSize: "15px", fontWeight: "600", cursor: "pointer",
                      position: "relative", bottom: "-2px", transition: "all 0.2s"
                    }}
                  >{m.label}</button>
                ))}
              </div>

              {/* Type Mode */}
              {inputMode === "type" && (
                <div>
                  {qbMode === "single" ? (
                    <div>
                      <div className="qb-form-group">
                        <label className="qb-label">Search Question Bank</label>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                          onKeyPress={e => e.key === "Enter" && handleSearchSourceQB()}
                          placeholder="Type QB name to search..." className="qb-input" />
                      </div>
                      <button onClick={handleSearchSourceQB} className="qb-button qb-button-primary">🔍 Search</button>
                      {searchResults.length > 0 && (
                        <div className="qb-search-results">
                          <h4 className="qb-subtitle">Search Results - Click to Select</h4>
                          {searchResults.map(qb => (
                            <div key={qb.qb_id} className={`qb-search-item ${selectedSourceQBs.some(s => s.qb_id === qb.qb_id) ? "qb-search-item-selected" : ""}`}
                              onClick={() => setSelectedSourceQBs([qb])} style={{ cursor: "pointer" }}>
                              <div className="qb-search-item-name">{qb.qb_name}</div>
                              <div className="qb-search-item-meta">{qb.questionCount} questions • {qb.user_role} • {qb.visibility}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="qb-form-group">
                        <label className="qb-label">Enter QB Names (Press Enter to Add)</label>
                        <input type="text" value={qbNameInput} onChange={e => setQbNameInput(e.target.value)}
                          onKeyPress={e => e.key === "Enter" && handleAddQBByName(qbNameInput)}
                          placeholder="Type exact QB name and press Enter..." className="qb-input" style={{ marginBottom: "8px" }} />
                        <div style={{ fontSize: "13px", color: "#868e96", marginBottom: "12px" }}>
                          💡 Type the exact QB name and press <strong>Enter</strong> to add it
                        </div>
                      </div>
                      <button onClick={() => handleAddQBByName(qbNameInput)} className="qb-button qb-button-primary">➕ Add QB</button>
                    </div>
                  )}
                </div>
              )}

              {/* Search Mode */}
              {inputMode === "search" && (
                <div>
                  <div className="qb-form-group">
                    <label className="qb-label">Search Question Bank</label>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      onKeyPress={e => e.key === "Enter" && handleSearchSourceQB()}
                      placeholder="Enter QB name to search..." className="qb-input" />
                  </div>
                  <button onClick={handleSearchSourceQB} className="qb-button qb-button-primary">🔍 Search</button>
                  {searchResults.length > 0 && (
                    <div className="qb-search-results">
                      <h4 className="qb-subtitle">{qbMode === "single" ? "Click to Select" : "Click to Select Multiple"}</h4>
                      {searchResults.map(qb => {
                        const isSelected = selectedSourceQBs.some(s => s.qb_id === qb.qb_id);
                        return (
                          <div key={qb.qb_id} className={`qb-search-item ${isSelected ? "qb-search-item-selected" : ""}`}
                            onClick={() => {
                              if (qbMode === "single") { setSelectedSourceQBs([qb]); }
                              else { isSelected ? setSelectedSourceQBs(selectedSourceQBs.filter(s => s.qb_id !== qb.qb_id)) : setSelectedSourceQBs([...selectedSourceQBs, qb]); }
                            }} style={{ cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {qbMode === "multiple" && <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ width: "18px", height: "18px" }} />}
                              <div style={{ flex: 1 }}>
                                <div className="qb-search-item-name">{qb.qb_name}</div>
                                <div className="qb-search-item-meta">{qb.questionCount} questions • {qb.user_role} • {qb.visibility}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Selected QBs List */}
              {selectedSourceQBs.length > 0 && (
                <div className="qb-selected-section" style={{ marginTop: "24px" }}>
                  <h4 className="qb-subtitle">{qbMode === "single" ? "✅ Selected QB" : `✅ QB List (${selectedSourceQBs.length})`}</h4>
                  <div style={{ marginBottom: "20px", maxHeight: "400px", overflowY: "auto", border: "2px solid #51cf66", borderRadius: "10px", padding: "16px", background: "white" }}>
                    {selectedSourceQBs.map((qb, index) => (
                      <div key={qb.qb_id} style={{ padding: "14px", background: "#f0fff4", borderRadius: "8px", marginBottom: qbMode === "multiple" ? "10px" : "0", border: "1px solid #51cf66" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            {qbMode === "multiple" && <div style={{ fontSize: "14px", fontWeight: "700", color: "#51cf66", marginBottom: "6px" }}>QB #{index + 1}</div>}
                            <div style={{ fontSize: "16px", fontWeight: "700", color: "#212529", marginBottom: "6px" }}>{qb.qb_name}</div>
                            <div style={{ fontSize: "13px", color: "#868e96", marginBottom: "6px" }}>{qb.questionCount} questions • {qb.visibility}</div>
                            <div style={{ fontSize: "13px", color: "#4c6ef5", fontWeight: "600", background: "#e7f5ff", padding: "4px 8px", borderRadius: "4px", display: "inline-block" }}>
                              → {clonePrefix}{qb.qb_name}
                            </div>
                          </div>
                          {qbMode === "multiple" && (
                            <button onClick={() => setSelectedSourceQBs(selectedSourceQBs.filter(s => s.qb_id !== qb.qb_id))}
                              style={{ background: "#fa5252", color: "white", border: "none", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "600", marginLeft: "12px" }}>
                              ✕ Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Auto-config info */}
                  <div style={{ background: "linear-gradient(135deg, #fff3bf 0%, #ffe066 100%)", padding: "16px", borderRadius: "10px", marginBottom: "20px", border: "2px solid #fab005" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#e67700", marginBottom: "8px" }}>🎯 Auto-Configuration</div>
                    <div style={{ fontSize: "13px", color: "#495057", lineHeight: "1.6" }}>
                      • <strong>Clone Prefix:</strong> {clonePrefix}<br />
                      • <strong>Domain:</strong> {domainConfig?.label}<br />
                      • <strong>Departments:</strong> {activeBDIds.length} configured<br />
                      • <strong>All Questions:</strong> Will be auto-selected
                    </div>
                  </div>

                  {qbMode === "multiple" && (
                    <div style={{ background: "linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)", padding: "20px", borderRadius: "12px", marginBottom: "20px", border: "2px solid #4c6ef5" }}>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#4c6ef5", marginBottom: "12px" }}>📊 Batch Clone Summary</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                        {[
                          { label: "Total QBs", value: selectedSourceQBs.length, color: "#4c6ef5" },
                          { label: "Total Questions", value: selectedSourceQBs.reduce((sum, qb) => sum + qb.questionCount, 0), color: "#51cf66" },
                          { label: "Departments", value: activeBDIds.length, color: "#7950f2" }
                        ].map(stat => (
                          <div key={stat.label} style={{ background: "white", padding: "12px", borderRadius: "8px", border: `1px solid ${stat.color}` }}>
                            <div style={{ fontSize: "12px", color: "#868e96", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase" }}>{stat.label}</div>
                            <div style={{ fontSize: "24px", fontWeight: "800", color: stat.color }}>{stat.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={handleBatchCloneAndFetch} className="qb-button qb-button-success" style={{ width: "100%", fontSize: "16px", padding: "16px" }}>
                    {qbMode === "single" ? "🔄 Clone QB & Fetch Questions" : `🚀 Batch Clone ${selectedSourceQBs.length} QB(s) & Fetch All Questions`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Filter & Move */}
          {(processStep === "cloned" || processStep === "moved") && (
            <div className="qb-section">
              <h3 className="qb-section-title">🎯 Step 2: Filter Questions & Move</h3>

              <div className="qb-info-card">
                <div className="qb-info-title">Cloned QBs ({clonedQBs.length})</div>
                <div style={{ marginBottom: "12px" }}>
                  {clonedQBs.map((qb, index) => (
                    <div key={qb.qb_id} style={{ padding: "8px 0", borderBottom: index < clonedQBs.length - 1 ? "1px solid rgba(76,110,245,0.2)" : "none" }}>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: "#212529" }}>{index + 1}. {qb.qb_name}</div>
                      <div style={{ fontSize: "13px", color: "#868e96" }}>
                        {qb.questionCount} questions
                        {qb.expectedCount && qb.questionCount < qb.expectedCount && (
                          <span className="qb-warning-text"> ⚠️ Expected {qb.expectedCount}, got {qb.questionCount}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="qb-info-meta" style={{ paddingTop: "12px", borderTop: "2px solid rgba(76,110,245,0.3)" }}>
                  <strong>Total:</strong> {allQuestions.length} • <strong>Filtered:</strong> {filteredQuestions.length} • <strong>Selected:</strong> {selectedQuestions.length}
                </div>
              </div>

              {/* Tag Filter */}
              <div className="qb-form-group">
                <label className="qb-label">Filter by Tags (Optional)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  {availableTags.map(tag => (
                    <label key={tag} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: selectedTags.includes(tag) ? "#e7f5ff" : "#f1f3f5", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
                      <input type="checkbox" checked={selectedTags.includes(tag)} onChange={e => setSelectedTags(e.target.checked ? [...selectedTags, tag] : selectedTags.filter(t => t !== tag))} />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div className="qb-form-group">
                <label className="qb-label">Filter by Question Type (Optional)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  {availableQuestionTypes.map(type => (
                    <label key={type} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: selectedQuestionTypes.includes(type) ? "#e7f5ff" : "#f1f3f5", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
                      <input type="checkbox" checked={selectedQuestionTypes.includes(type)} onChange={e => setSelectedQuestionTypes(e.target.checked ? [...selectedQuestionTypes, type] : selectedQuestionTypes.filter(t => t !== type))} />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={handleApplyFilters} className="qb-button qb-button-primary" style={{ marginBottom: "20px" }}>🔍 Apply Filters</button>

              {/* Question List */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <button onClick={() => setSelectedQuestions(filteredQuestions.map(q => q.q_id))} className="qb-button qb-button-secondary qb-button-small">✅ Select All ({filteredQuestions.length})</button>
                  <button onClick={() => setSelectedQuestions([])} className="qb-button qb-button-secondary qb-button-small">❌ Deselect All</button>
                </div>
                <div style={{ maxHeight: "400px", overflowY: "auto", border: "2px solid #e9ecef", borderRadius: "10px", padding: "16px", background: "#f8f9fa" }}>
                  {filteredQuestions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#868e96" }}>No questions match the selected filters</div>
                  ) : (
                    filteredQuestions.map((q, index) => (
                      <div key={q.q_id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px", background: "white", borderRadius: "8px", marginBottom: "12px", border: selectedQuestions.includes(q.q_id) ? "2px solid #4c6ef5" : "2px solid #dee2e6" }}>
                        <input type="checkbox" checked={selectedQuestions.includes(q.q_id)} onChange={() => handleToggleQuestion(q.q_id)} style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#4c6ef5", marginBottom: "8px" }}>Q{index + 1} • {q.question_type}</div>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#212529", marginBottom: "8px", lineHeight: "1.5" }}>{extractQuestionText(q.question_data)}</div>
                          <div style={{ fontSize: "12px", color: "#868e96" }}><strong>Tags:</strong> {q.tags?.map(t => t.name).join(", ") || "None"}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Target QB */}
              <div className="qb-form-group">
                <label className="qb-label">Search Target QB</label>
                <input type="text" value={targetSearchTerm} onChange={e => setTargetSearchTerm(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && handleSearchTargetQB()}
                  placeholder="Enter target QB name..." className="qb-input" />
              </div>
              <button onClick={handleSearchTargetQB} className="qb-button qb-button-primary">🔍 Search Target</button>

              {targetSearchResults.length > 0 && (
                <div className="qb-search-results">
                  <h4 className="qb-subtitle">Target QB Results</h4>
                  {targetSearchResults.map(qb => (
                    <div key={qb.qb_id} className={`qb-search-item ${selectedTargetQB?.qb_id === qb.qb_id ? "qb-search-item-selected" : ""}`} onClick={() => setSelectedTargetQB(qb)}>
                      <div className="qb-search-item-name">{qb.qb_name}</div>
                      <div className="qb-search-item-meta">{qb.questionCount} questions • {qb.user_role} • {qb.visibility}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTargetQB && (
                <div className="qb-selected-section">
                  <h4 className="qb-subtitle">✅ Target QB Selected</h4>
                  <div className="qb-selected-card">
                    <div className="qb-selected-name">{selectedTargetQB.qb_name}</div>
                    <div className="qb-selected-meta">{selectedTargetQB.questionCount} questions • {selectedTargetQB.visibility}</div>
                  </div>
                  <button onClick={handleMoveAndDelete} disabled={selectedQuestions.length === 0}
                    className={`qb-button qb-button-success ${selectedQuestions.length === 0 ? "qb-button-disabled" : ""}`} style={{ marginTop: "16px" }}>
                    📦 Move {selectedQuestions.length} Questions (Batches of 100) & Auto-Delete Clones
                  </button>
                </div>
              )}

              <button onClick={handleStartNew} className="qb-button qb-button-secondary" style={{ marginTop: "20px" }}>🔄 Start New Operation</button>
            </div>
          )}

          {/* Step 3: Completed */}
          {processStep === "completed" && (
            <div className="qb-section">
              <div className="qb-success-card">
                <div className="qb-success-icon">✅</div>
                <h3 className="qb-success-title">Operation Completed!</h3>
                <p className="qb-success-message">
                  All selected questions have been moved to the target QB in batches of 100 and all cloned QBs have been deleted successfully.
                </p>
                <button onClick={handleStartNew} className="qb-button qb-button-primary" style={{ marginTop: "20px" }}>
                  🔄 Start New Operation
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}