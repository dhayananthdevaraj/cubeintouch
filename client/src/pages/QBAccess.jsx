// import { useState } from "react";
// import { DEPARTMENT_IDS } from "../config";
// import "./QBAccess.css";

// const API = "https://api.examly.io";

// export default function QBAccess() {
//   const [token, setToken] = useState(() => {
//     try {
//       return localStorage.getItem("examly_token") || "";
//     } catch {
//       return "";
//     }
//   });

//   const [ui, setUI] = useState(token ? "menu" : "welcome");
//   const [activeTab, setActiveTab] = useState("clone"); // "clone" or "meta"

//   // Common states
//   const [alert, setAlert] = useState(null);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");
//   const [tokenInput, setTokenInput] = useState("");

//   // Clone & Move states
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [selectedSourceQB, setSelectedSourceQB] = useState(null);
//   const [cloneQBName, setCloneQBName] = useState("");
//   const [clonedQB, setClonedQB] = useState(null);
//   const [clonedQuestions, setClonedQuestions] = useState([]);
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
//       localStorage.setItem("examly_token", tokenInput.trim());
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
//       localStorage.removeItem("examly_token");
//     } catch (err) {
//       console.error("Failed to clear token:", err);
//     }
//     setToken("");
//     setUI("welcome");
//     setTokenInput("");
//     resetCloneState();
//     showAlert("Token cleared", "danger");
//   };

//   const resetCloneState = () => {
//     setSearchTerm("");
//     setSearchResults([]);
//     setSelectedSourceQB(null);
//     setCloneQBName("");
//     setClonedQB(null);
//     setClonedQuestions([]);
//     setTargetSearchTerm("");
//     setTargetSearchResults([]);
//     setSelectedTargetQB(null);
//     setProcessStep("search");
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

//   async function cloneQuestionBank(qbData, newName) {
//     const res = await fetch(`${API}/api/questionbank/clone`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         mainDepartmentUser: true,
//         price: qbData.price || 0,
//         qb_code: null,
//         qb_description: qbData.qb_description,
//         qb_id: qbData.qb_id,
//         qb_name: newName,
//         tags: [],
//         visibility: qbData.visibility || "Within Department"
//       })
//     });

//     const json = await res.json();
//     if (json?.data?.success) {
//       return json.data;
//     } else {
//       throw new Error(json?.data?.message || "Failed to clone QB");
//     }
//   }

//   async function fetchQBQuestions(qbId) {
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
//     return json?.non_group_questions || [];
//   }

//   async function moveQuestions(questionIds, questionTypes, targetQbId, currentQbId) {
//     const qIdString = questionIds.join(",");
//     const qTypeString = questionTypes.join(",");

//     const res = await fetch(
//       `${API}/api/questionMove?q_id=${qIdString}&q_type=${qTypeString}&qb_id=${targetQbId}&current_qb_id=${currentQbId}`,
//       {
//         method: "GET",
//         headers: { Authorization: token }
//       }
//     );

//     const json = await res.json();
//     if (!json.success) {
//       throw new Error(json.message || "Failed to move questions");
//     }
//     return json;
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

//   const handleCloneQB = async () => {
//     if (!selectedSourceQB) {
//       showAlert("Please select a source QB", "warning");
//       return;
//     }

//     if (!cloneQBName.trim()) {
//       showAlert("Please enter a name for the cloned QB", "warning");
//       return;
//     }

//     showOverlay("🔄 Cloning question bank...");

//     try {
//       const cloneResult = await cloneQuestionBank(selectedSourceQB, cloneQBName.trim());

//       showOverlay("📚 Fetching questions from cloned QB...");

//       const questions = await fetchQBQuestions(cloneResult.qb_id);

//       setClonedQB({
//         qb_id: cloneResult.qb_id,
//         qb_name: cloneQBName.trim(),
//         questionCount: questions.length
//       });
//       setClonedQuestions(questions);
//       setProcessStep("cloned");

//       hideOverlay();
//       showAlert(
//         `✅ Successfully cloned QB with ${questions.length} questions!`,
//         "success"
//       );
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error cloning QB: " + err.message, "danger");
//       console.error(err);
//     }
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

//     if (clonedQuestions.length === 0) {
//       showAlert("No questions to move", "warning");
//       return;
//     }

//     const targetQBName = selectedTargetQB.qb_name;
//     const questionCount = clonedQuestions.length;

//     try {
//       // Step 1: Move all questions
//       showOverlay(`📦 Moving ${questionCount} question(s)...`);

//       const questionIds = clonedQuestions.map((q) => q.q_id);
//       const questionTypes = clonedQuestions.map(
//         (q) => q.question_type || "mcq_single_correct"
//       );

//       // Process in batches of 3 using Promise.all
//       const batchSize = 3;
//       let successCount = 0;
//       let failCount = 0;

//       for (let i = 0; i < questionIds.length; i += batchSize) {
//         const batchIds = questionIds.slice(i, i + batchSize);
//         const batchTypes = questionTypes.slice(i, i + batchSize);

//         showOverlay(
//           `📦 Moving: ${Math.min(i + batchSize, questionIds.length)}/${questionIds.length}`
//         );

//         const batchPromises = batchIds.map((qId, idx) =>
//           moveQuestions([qId], [batchTypes[idx]], selectedTargetQB.qb_id, clonedQB.qb_id)
//             .then(() => {
//               successCount++;
//               return true;
//             })
//             .catch((err) => {
//               console.error(`Failed to move question ${qId}:`, err);
//               failCount++;
//               return false;
//             })
//         );

//         await Promise.all(batchPromises);

//         if (i + batchSize < questionIds.length) {
//           await sleep(300);
//         }
//       }

//       if (successCount === 0) {
//         hideOverlay();
//         showAlert("❌ Failed to move any questions", "danger");
//         return;
//       }

//       // Step 2: Delete the cloned QB
//       await sleep(500);
//       showOverlay("🗑️ Deleting empty cloned QB...");

//       try {
//         await deleteQuestionBank(clonedQB.qb_id, clonedQB.qb_name);
//         await sleep(300);
//       } catch (deleteErr) {
//         console.warn("Failed to delete cloned QB:", deleteErr);
//         hideOverlay();
//         showAlert(
//           `✅ Moved ${successCount} question(s) to ${targetQBName}, but failed to delete cloned QB${failCount > 0 ? ` (${failCount} failed to move)` : ""}`,
//           "warning"
//         );
//         setProcessStep("moved");
//         return;
//       }

//       // Success
//       hideOverlay();
//       await sleep(200);
//       showAlert(
//         `✅ Successfully moved ${successCount} question(s) to ${targetQBName} and deleted cloned QB${failCount > 0 ? ` (${failCount} failed to move)` : ""}`,
//         "success"
//       );
//       setProcessStep("completed");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error during move process: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleStartNew = () => {
//     resetCloneState();
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
//           <h2 className="qb-welcome-title">🔐 QB Access Tool</h2>
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
//             <h2 className="qb-title">🛠️ QB Access Tool</h2>
//             <button
//               onClick={clearToken}
//               className="qb-button qb-button-danger qb-button-small"
//             >
//               🚪 Logout
//             </button>
//           </div>

//           {/* Tab Navigation */}
//           <div className="qb-tabs">
//             <button
//               className={`qb-tab ${activeTab === "clone" ? "qb-tab-active" : ""}`}
//               onClick={() => {
//                 setActiveTab("clone");
//                 resetCloneState();
//               }}
//             >
//               🔄 QB Clone and Move
//             </button>
//             <button
//               className={`qb-tab ${activeTab === "meta" ? "qb-tab-active" : ""}`}
//               onClick={() => setActiveTab("meta")}
//             >
//               📝 Meta Update
//             </button>
//           </div>

//           {/* Clone and Move Tab */}
//           {activeTab === "clone" && (
//             <div className="qb-tab-content">
//               {/* Step 1: Search and Select Source QB */}
//               {processStep === "search" && (
//                 <div className="qb-section">
//                   <h3 className="qb-section-title">📚 Step 1: Search Source QB</h3>

//                   <div className="qb-form-group">
//                     <label className="qb-label">Search Question Bank</label>
//                     <input
//                       type="text"
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       onKeyPress={(e) => e.key === "Enter" && handleSearchSourceQB()}
//                       placeholder="Enter QB name..."
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
//                       <h4 className="qb-subtitle">Search Results</h4>
//                       {searchResults.map((qb) => (
//                         <div
//                           key={qb.qb_id}
//                           className={`qb-search-item ${
//                             selectedSourceQB?.qb_id === qb.qb_id
//                               ? "qb-search-item-selected"
//                               : ""
//                           }`}
//                           onClick={() => setSelectedSourceQB(qb)}
//                         >
//                           <div className="qb-search-item-name">{qb.qb_name}</div>
//                           <div className="qb-search-item-meta">
//                             {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   {selectedSourceQB && (
//                     <div className="qb-selected-section">
//                       <h4 className="qb-subtitle">✅ Selected QB</h4>
//                       <div className="qb-selected-card">
//                         <div className="qb-selected-name">{selectedSourceQB.qb_name}</div>
//                         <div className="qb-selected-meta">
//                           {selectedSourceQB.questionCount} questions •{" "}
//                           {selectedSourceQB.visibility}
//                         </div>
//                       </div>

//                       <div className="qb-form-group" style={{ marginTop: "20px" }}>
//                         <label className="qb-label">Clone QB Name</label>
//                         <input
//                           type="text"
//                           value={cloneQBName}
//                           onChange={(e) => setCloneQBName(e.target.value)}
//                           placeholder="Enter name for cloned QB..."
//                           className="qb-input"
//                         />
//                       </div>

//                       <button
//                         onClick={handleCloneQB}
//                         disabled={!cloneQBName.trim()}
//                         className={`qb-button qb-button-success ${
//                           !cloneQBName.trim() ? "qb-button-disabled" : ""
//                         }`}
//                       >
//                         🔄 Clone QB
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Step 2: Select Target QB and Move */}
//               {(processStep === "cloned" || processStep === "moved") && (
//                 <div className="qb-section">
//                   <h3 className="qb-section-title">📦 Step 2: Select Target QB and Move</h3>

//                   <div className="qb-info-card">
//                     <div className="qb-info-title">Cloned QB</div>
//                     <div className="qb-info-name">{clonedQB.qb_name}</div>
//                     <div className="qb-info-meta">
//                       {clonedQuestions.length} questions ready to move
//                     </div>
//                   </div>

//                   <div className="qb-form-group" style={{ marginTop: "20px" }}>
//                     <label className="qb-label">Search Target QB</label>
//                     <input
//                       type="text"
//                       value={targetSearchTerm}
//                       onChange={(e) => setTargetSearchTerm(e.target.value)}
//                       onKeyPress={(e) => e.key === "Enter" && handleSearchTargetQB()}
//                       placeholder="Enter target QB name..."
//                       className="qb-input"
//                     />
//                   </div>

//                   <button
//                     onClick={handleSearchTargetQB}
//                     className="qb-button qb-button-primary"
//                   >
//                     🔍 Search Target
//                   </button>

//                   {targetSearchResults.length > 0 && (
//                     <div className="qb-search-results">
//                       <h4 className="qb-subtitle">Target QB Results</h4>
//                       {targetSearchResults.map((qb) => (
//                         <div
//                           key={qb.qb_id}
//                           className={`qb-search-item ${
//                             selectedTargetQB?.qb_id === qb.qb_id
//                               ? "qb-search-item-selected"
//                               : ""
//                           }`}
//                           onClick={() => setSelectedTargetQB(qb)}
//                         >
//                           <div className="qb-search-item-name">{qb.qb_name}</div>
//                           <div className="qb-search-item-meta">
//                             {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   {selectedTargetQB && (
//                     <div className="qb-selected-section">
//                       <h4 className="qb-subtitle">✅ Target QB Selected</h4>
//                       <div className="qb-selected-card">
//                         <div className="qb-selected-name">{selectedTargetQB.qb_name}</div>
//                         <div className="qb-selected-meta">
//                           {selectedTargetQB.questionCount} questions •{" "}
//                           {selectedTargetQB.visibility}
//                         </div>
//                       </div>

//                       <button
//                         onClick={handleMoveAndDelete}
//                         className="qb-button qb-button-success"
//                         style={{ marginTop: "16px" }}
//                       >
//                         📦 Move {clonedQuestions.length} Questions & Delete Clone
//                       </button>
//                     </div>
//                   )}

//                   <button
//                     onClick={handleStartNew}
//                     className="qb-button qb-button-secondary"
//                     style={{ marginTop: "20px" }}
//                   >
//                     🔄 Start New Operation
//                   </button>
//                 </div>
//               )}

//               {/* Step 3: Completion */}
//               {processStep === "completed" && (
//                 <div className="qb-section">
//                   <div className="qb-success-card">
//                     <div className="qb-success-icon">✅</div>
//                     <h3 className="qb-success-title">Operation Completed!</h3>
//                     <p className="qb-success-message">
//                       All questions have been moved to the target QB and the cloned QB has
//                       been deleted successfully.
//                     </p>

//                     <button
//                       onClick={handleStartNew}
//                       className="qb-button qb-button-primary"
//                       style={{ marginTop: "20px" }}
//                     >
//                       🔄 Start New Operation
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Meta Update Tab */}
//           {activeTab === "meta" && (
//             <div className="qb-tab-content">
//               <div className="qb-section">
//                 <h3 className="qb-section-title">📝 Meta Update</h3>
//                 <div className="qb-empty-state">
//                   Coming soon... Focus on this feature later.
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// import { useState } from "react";
// import { DEPARTMENT_IDS, B_D_ID_OPTIONS } from "../config";
// import "./QBAccess.css";

// const API = "https://api.examly.io";

// export default function QBAccess() {
//   const [token, setToken] = useState(() => {
//     try {
//       return localStorage.getItem("examly_token") || "";
//     } catch {
//       return "";
//     }
//   });

//   const [ui, setUI] = useState(token ? "menu" : "welcome");
//   const [activeTab, setActiveTab] = useState("clone"); // "clone" or "meta"

//   // Common states
//   const [alert, setAlert] = useState(null);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");
//   const [tokenInput, setTokenInput] = useState("");

//   // Clone & Move states
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [selectedSourceQB, setSelectedSourceQB] = useState(null);
//   const [cloneQBName, setCloneQBName] = useState("");
//   const [clonedQB, setClonedQB] = useState(null);
//   const [clonedQuestions, setClonedQuestions] = useState([]);
//   const [targetSearchTerm, setTargetSearchTerm] = useState("");
//   const [targetSearchResults, setTargetSearchResults] = useState([]);
//   const [selectedTargetQB, setSelectedTargetQB] = useState(null);
//   const [processStep, setProcessStep] = useState("search"); // search, cloned, moved, completed
  
//   // Department selection states
//   const [selectedDepartments, setSelectedDepartments] = useState([]);
//   const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
//   const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
//   const [showSourceDropdown, setShowSourceDropdown] = useState(false);
//   const [showTargetDropdown, setShowTargetDropdown] = useState(false);

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
//       localStorage.setItem("examly_token", tokenInput.trim());
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
//       localStorage.removeItem("examly_token");
//     } catch (err) {
//       console.error("Failed to clear token:", err);
//     }
//     setToken("");
//     setUI("welcome");
//     setTokenInput("");
//     resetCloneState();
//     showAlert("Token cleared", "danger");
//   };

//   const resetCloneState = () => {
//     setSearchTerm("");
//     setSearchResults([]);
//     setSelectedSourceQB(null);
//     setCloneQBName("");
//     setClonedQB(null);
//     setClonedQuestions([]);
//     setTargetSearchTerm("");
//     setTargetSearchResults([]);
//     setSelectedTargetQB(null);
//     setProcessStep("search");
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

//   async function cloneQuestionBank(qbData, newName, selectedDepts) {
//     // Build b_d_id array from selected departments
//     const b_d_id = selectedDepts.map(dept => ({
//       label: dept.label,
//       value: dept.value,
//       branch_id: dept.branch_id,
//       school_id: dept.school_id,
//       department_id: dept.department_id
//     }));

//     const res = await fetch(`${API}/api/questionbank/clone`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         mainDepartmentUser: true,
//         price: qbData.price || 0,
//         qb_code: null,
//         qb_description: qbData.qb_description,
//         qb_id: qbData.qb_id,
//         qb_name: newName,
//         tags: qbData.tags || [],
//         visibility: qbData.visibility || "Within Department",
//         b_d_id: b_d_id
//       })
//     });

//     const json = await res.json();
    
//     console.log("📋 Clone API Request:", {
//       qb_id: qbData.qb_id,
//       qb_name: newName,
//       b_d_id: b_d_id,
//       b_d_id_count: b_d_id.length
//     });
//     console.log("📋 Clone API Response:", json);
    
//     if (json?.data?.success) {
//       return json.data;
//     } else {
//       throw new Error(json?.message || json?.data?.message || "Failed to clone QB");
//     }
//   }

//   async function fetchQBQuestions(qbId) {
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
//     return json?.non_group_questions || [];
//   }

//   async function moveQuestions(questionIds, questionTypes, targetQbId, currentQbId) {
//     const qIdString = questionIds.join(",");
//     const qTypeString = questionTypes.join(",");

//     const res = await fetch(
//       `${API}/api/questionMove?q_id=${qIdString}&q_type=${qTypeString}&qb_id=${targetQbId}&current_qb_id=${currentQbId}`,
//       {
//         method: "GET",
//         headers: { Authorization: token }
//       }
//     );

//     const json = await res.json();
//     if (!json.success) {
//       throw new Error(json.message || "Failed to move questions");
//     }
//     return json;
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

//   const handleCloneQB = async () => {
//     if (!selectedSourceQB) {
//       showAlert("Please select a source QB", "warning");
//       return;
//     }

//     if (!cloneQBName.trim()) {
//       showAlert("Please enter a name for the cloned QB", "warning");
//       return;
//     }

//     if (selectedDepartments.length === 0) {
//       showAlert("Please select at least one department", "warning");
//       return;
//     }

//     showOverlay("🔄 Cloning question bank...");

//     try {
//       const cloneResult = await cloneQuestionBank(
//         selectedSourceQB, 
//         cloneQBName.trim(),
//         selectedDepartments
//       );

//       showOverlay("📚 Fetching questions from cloned QB...");

//       const questions = await fetchQBQuestions(cloneResult.qb_id);

//       setClonedQB({
//         qb_id: cloneResult.qb_id,
//         qb_name: cloneQBName.trim(),
//         questionCount: questions.length
//       });
//       setClonedQuestions(questions);
//       setProcessStep("cloned");

//       hideOverlay();
//       showAlert(
//         `✅ Successfully cloned QB with ${questions.length} questions to ${selectedDepartments.length} department(s)!`,
//         "success"
//       );
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error cloning QB: " + err.message, "danger");
//       console.error(err);
//     }
//   };

// const handleMoveAndDelete = async () => {
//     if (!selectedTargetQB) {
//       showAlert("Please select a target QB", "warning");
//       return;
//     }

//     if (clonedQuestions.length === 0) {
//       showAlert("No questions to move", "warning");
//       return;
//     }

//     const targetQBName = selectedTargetQB.qb_name;
//     const questionCount = clonedQuestions.length;

//     try {
//       // Step 1: Move all questions
//       showOverlay(`📦 Moving ${questionCount} question(s)...`);

//       const questionIds = clonedQuestions.map((q) => q.q_id);
//       const questionTypes = clonedQuestions.map(
//         (q) => q.question_type || "mcq_single_correct"
//       );

//       // Process in batches of 3 using Promise.all
//       const batchSize = 3;
//       let successCount = 0;
//       let failCount = 0;

//       for (let i = 0; i < questionIds.length; i += batchSize) {
//         const batchIds = questionIds.slice(i, i + batchSize);
//         const batchTypes = questionTypes.slice(i, i + batchSize);

//         showOverlay(
//           `📦 Moving: ${Math.min(i + batchSize, questionIds.length)}/${questionIds.length}`
//         );

//         const batchPromises = batchIds.map((qId, idx) =>
//           moveQuestions([qId], [batchTypes[idx]], selectedTargetQB.qb_id, clonedQB.qb_id)
//             .then(() => {
//               successCount++;
//               return true;
//             })
//             .catch((err) => {
//               console.error(`Failed to move question ${qId}:`, err);
//               failCount++;
//               return false;
//             })
//         );

//         await Promise.all(batchPromises);

//         if (i + batchSize < questionIds.length) {
//           await sleep(300);
//         }
//       }

//       if (successCount === 0) {
//         hideOverlay();
//         showAlert("❌ Failed to move any questions", "danger");
//         return;
//       }

//       // Step 2: Delete the cloned QB
//       await sleep(500);
//       showOverlay("🗑️ Deleting empty cloned QB...");

//       try {
//         await deleteQuestionBank(clonedQB.qb_id, clonedQB.qb_name);
//         await sleep(300);
//       } catch (deleteErr) {
//         console.warn("Failed to delete cloned QB:", deleteErr);
//         hideOverlay();
//         showAlert(
//           `✅ Moved ${successCount} question(s) to ${targetQBName}, but failed to delete cloned QB${failCount > 0 ? ` (${failCount} failed to move)` : ""}`,
//           "warning"
//         );
//         setProcessStep("moved");
//         return;
//       }

//       // Success
//       hideOverlay();
//       await sleep(200);
//       showAlert(
//         `✅ Successfully moved ${successCount} question(s) to ${targetQBName} and deleted cloned QB${failCount > 0 ? ` (${failCount} failed to move)` : ""}`,
//         "success"
//       );
//       setProcessStep("completed");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error during move process: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleStartNew = () => {
//     resetCloneState();
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
//           <h2 className="qb-welcome-title">🔐 QB Access Tool</h2>
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
//             <h2 className="qb-title">🛠️ QB Access Tool</h2>
//             <button
//               onClick={clearToken}
//               className="qb-button qb-button-danger qb-button-small"
//             >
//               🚪 Logout
//             </button>
//           </div>

//           {/* Tab Navigation */}
//           <div className="qb-tabs">
//             <button
//               className={`qb-tab ${activeTab === "clone" ? "qb-tab-active" : ""}`}
//               onClick={() => {
//                 setActiveTab("clone");
//                 resetCloneState();
//               }}
//             >
//               🔄 QB Clone and Move
//             </button>
//             <button
//               className={`qb-tab ${activeTab === "meta" ? "qb-tab-active" : ""}`}
//               onClick={() => setActiveTab("meta")}
//             >
//               📝 Meta Update
//             </button>
//           </div>

//           {/* Clone and Move Tab */}
//           {activeTab === "clone" && (
//             <div className="qb-tab-content">
//               {/* Step 1: Search and Select Source QB */}
//               {processStep === "search" && (
//                 <div className="qb-section">
//                   <h3 className="qb-section-title">📚 Step 1: Search Source QB</h3>

//                   <div className="qb-form-group">
//                     <label className="qb-label">Search Question Bank</label>
//                     <input
//                       type="text"
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       onKeyPress={(e) => e.key === "Enter" && handleSearchSourceQB()}
//                       placeholder="Enter QB name..."
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
//                       <h4 className="qb-subtitle">Search Results</h4>
//                       {searchResults.map((qb) => (
//                         <div
//                           key={qb.qb_id}
//                           className={`qb-search-item ${
//                             selectedSourceQB?.qb_id === qb.qb_id
//                               ? "qb-search-item-selected"
//                               : ""
//                           }`}
//                           onClick={() => setSelectedSourceQB(qb)}
//                         >
//                           <div className="qb-search-item-name">{qb.qb_name}</div>
//                           <div className="qb-search-item-meta">
//                             {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   {selectedSourceQB && (
//                     <div className="qb-selected-section">
//                       <h4 className="qb-subtitle">✅ Selected QB</h4>
//                       <div className="qb-selected-card">
//                         <div className="qb-selected-name">{selectedSourceQB.qb_name}</div>
//                         <div className="qb-selected-meta">
//                           {selectedSourceQB.questionCount} questions •{" "}
//                           {selectedSourceQB.visibility}
//                         </div>
//                       </div>

//                       <div className="qb-form-group" style={{ marginTop: "20px" }}>
//                         <label className="qb-label">Clone QB Name</label>
//                         <input
//                           type="text"
//                           value={cloneQBName}
//                           onChange={(e) => setCloneQBName(e.target.value)}
//                           placeholder="Enter name for cloned QB..."
//                           className="qb-input"
//                         />
//                       </div>

//                       {/* Department Selection Dropdown */}
//                       <div className="qb-form-group">
//                         <label className="qb-label">Select Departments (b_d_id)</label>
//                         <div className="qb-search-dropdown-wrapper">
//                           <input
//                             type="text"
//                             value={departmentSearchTerm}
//                             onChange={(e) => {
//                               setDepartmentSearchTerm(e.target.value);
//                               setShowDepartmentDropdown(true);
//                             }}
//                             onFocus={() => setShowDepartmentDropdown(true)}
//                             placeholder="Search and select departments..."
//                             className="qb-input"
//                           />
                          
//                           {showDepartmentDropdown && (
//                             <div className="qb-dropdown qb-dropdown-multi">
//                               {B_D_ID_OPTIONS
//                                 .filter(dept => 
//                                   dept.label.toLowerCase().includes(departmentSearchTerm.toLowerCase())
//                                 )
//                                 .map((dept) => {
//                                   const isSelected = selectedDepartments.some(d => d.value === dept.value);
//                                   return (
//                                     <div
//                                       key={dept.value}
//                                       className={`qb-dropdown-item ${isSelected ? 'qb-dropdown-item-selected' : ''}`}
//                                       onClick={() => {
//                                         if (isSelected) {
//                                           // Remove department
//                                           setSelectedDepartments(
//                                             selectedDepartments.filter(d => d.value !== dept.value)
//                                           );
//                                         } else {
//                                           // Add department
//                                           setSelectedDepartments([...selectedDepartments, dept]);
//                                         }
//                                       }}
//                                     >
//                                       <div className="qb-dropdown-item-checkbox">
//                                         <input
//                                           type="checkbox"
//                                           checked={isSelected}
//                                           onChange={() => {}}
//                                           className="qb-checkbox-inline"
//                                         />
//                                         <div className="qb-dropdown-item-content">
//                                           <div className="qb-dropdown-item-name">{dept.label}</div>
//                                           <div className="qb-dropdown-item-meta">
//                                             Dept: {dept.department_id.slice(0, 8)}...
//                                           </div>
//                                         </div>
//                                       </div>
//                                     </div>
//                                   );
//                                 })}
//                             </div>
//                           )}
                          
//                           {/* Selected Departments Display */}
//                           {selectedDepartments.length > 0 && (
//                             <div className="qb-selected-departments">
//                               {selectedDepartments.map((dept) => (
//                                 <div key={dept.value} className="qb-dept-chip">
//                                   <span>{dept.label}</span>
//                                   <button
//                                     onClick={() => {
//                                       setSelectedDepartments(
//                                         selectedDepartments.filter(d => d.value !== dept.value)
//                                       );
//                                     }}
//                                     className="qb-dept-chip-remove"
//                                   >
//                                     ×
//                                   </button>
//                                 </div>
//                               ))}
//                             </div>
//                           )}
//                         </div>
//                       </div>

//                       <button
//                         onClick={handleCloneQB}
//                         disabled={!cloneQBName.trim() || selectedDepartments.length === 0}
//                         className={`qb-button qb-button-success ${
//                           (!cloneQBName.trim() || selectedDepartments.length === 0) ? "qb-button-disabled" : ""
//                         }`}
//                       >
//                         🔄 Clone QB to {selectedDepartments.length} Department(s)
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Step 2: Select Target QB and Move */}
//               {(processStep === "cloned" || processStep === "moved") && (
//                 <div className="qb-section">
//                   <h3 className="qb-section-title">📦 Step 2: Select Target QB and Move</h3>

//                   <div className="qb-info-card">
//                     <div className="qb-info-title">Cloned QB</div>
//                     <div className="qb-info-name">{clonedQB.qb_name}</div>
//                     <div className="qb-info-meta">
//                       {clonedQuestions.length} questions ready to move
//                     </div>
//                   </div>

//                   <div className="qb-form-group" style={{ marginTop: "20px" }}>
//                     <label className="qb-label">Search Target QB</label>
//                     <input
//                       type="text"
//                       value={targetSearchTerm}
//                       onChange={(e) => setTargetSearchTerm(e.target.value)}
//                       onKeyPress={(e) => e.key === "Enter" && handleSearchTargetQB()}
//                       placeholder="Enter target QB name..."
//                       className="qb-input"
//                     />
//                   </div>

//                   <button
//                     onClick={handleSearchTargetQB}
//                     className="qb-button qb-button-primary"
//                   >
//                     🔍 Search Target
//                   </button>

//                   {targetSearchResults.length > 0 && (
//                     <div className="qb-search-results">
//                       <h4 className="qb-subtitle">Target QB Results</h4>
//                       {targetSearchResults.map((qb) => (
//                         <div
//                           key={qb.qb_id}
//                           className={`qb-search-item ${
//                             selectedTargetQB?.qb_id === qb.qb_id
//                               ? "qb-search-item-selected"
//                               : ""
//                           }`}
//                           onClick={() => setSelectedTargetQB(qb)}
//                         >
//                           <div className="qb-search-item-name">{qb.qb_name}</div>
//                           <div className="qb-search-item-meta">
//                             {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   {selectedTargetQB && (
//                     <div className="qb-selected-section">
//                       <h4 className="qb-subtitle">✅ Target QB Selected</h4>
//                       <div className="qb-selected-card">
//                         <div className="qb-selected-name">{selectedTargetQB.qb_name}</div>
//                         <div className="qb-selected-meta">
//                           {selectedTargetQB.questionCount} questions •{" "}
//                           {selectedTargetQB.visibility}
//                         </div>
//                       </div>

//                       <button
//                         onClick={handleMoveAndDelete}
//                         className="qb-button qb-button-success"
//                         style={{ marginTop: "16px" }}
//                       >
//                         📦 Move {clonedQuestions.length} Questions & Delete Clone
//                       </button>
//                     </div>
//                   )}

//                   <button
//                     onClick={handleStartNew}
//                     className="qb-button qb-button-secondary"
//                     style={{ marginTop: "20px" }}
//                   >
//                     🔄 Start New Operation
//                   </button>
//                 </div>
//               )}

//               {/* Step 3: Completion */}
//               {processStep === "completed" && (
//                 <div className="qb-section">
//                   <div className="qb-success-card">
//                     <div className="qb-success-icon">✅</div>
//                     <h3 className="qb-success-title">Operation Completed!</h3>
//                     <p className="qb-success-message">
//                       All questions have been moved to the target QB and the cloned QB has
//                       been deleted successfully.
//                     </p>

//                     <button
//                       onClick={handleStartNew}
//                       className="qb-button qb-button-primary"
//                       style={{ marginTop: "20px" }}
//                     >
//                       🔄 Start New Operation
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Meta Update Tab */}
//           {activeTab === "meta" && (
//             <div className="qb-tab-content">
//               <div className="qb-section">
//                 <h3 className="qb-section-title">📝 Meta Update</h3>
//                 <div className="qb-empty-state">
//                   Coming soon... Focus on this feature later.
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }


// import { useState } from "react";
// import { DEPARTMENT_IDS, B_D_ID_OPTIONS } from "../config";
// import "./QBAccess.css";

// const API = "https://api.examly.io";

// export default function QBAccess() {
//   const [token, setToken] = useState(() => {
//     try {
//       return localStorage.getItem("examly_token") || "";
//     } catch {
//       return "";
//     }
//   });

//   const [ui, setUI] = useState(token ? "menu" : "welcome");
//   const [activeTab, setActiveTab] = useState("clone"); // "clone" or "meta"

//   // Common states
//   const [alert, setAlert] = useState(null);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");
//   const [tokenInput, setTokenInput] = useState("");

//   // Clone & Move states
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [selectedSourceQB, setSelectedSourceQB] = useState(null);
//   const [cloneQBName, setCloneQBName] = useState("");
//   const [clonedQB, setClonedQB] = useState(null);
//   const [clonedQuestions, setClonedQuestions] = useState([]);
//   const [targetSearchTerm, setTargetSearchTerm] = useState("");
//   const [targetSearchResults, setTargetSearchResults] = useState([]);
//   const [selectedTargetQB, setSelectedTargetQB] = useState(null);
//   const [processStep, setProcessStep] = useState("search"); // search, cloned, moved, completed
  
//   // Department selection states
//   const [selectedDepartments, setSelectedDepartments] = useState([]);
//   const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
//   const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
//   const [showSourceDropdown, setShowSourceDropdown] = useState(false);
//   const [showTargetDropdown, setShowTargetDropdown] = useState(false);

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
//       localStorage.setItem("examly_token", tokenInput.trim());
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
//       localStorage.removeItem("examly_token");
//     } catch (err) {
//       console.error("Failed to clear token:", err);
//     }
//     setToken("");
//     setUI("welcome");
//     setTokenInput("");
//     resetCloneState();
//     showAlert("Token cleared", "danger");
//   };

//   const resetCloneState = () => {
//     setSearchTerm("");
//     setSearchResults([]);
//     setSelectedSourceQB(null);
//     setCloneQBName("");
//     setClonedQB(null);
//     setClonedQuestions([]);
//     setTargetSearchTerm("");
//     setTargetSearchResults([]);
//     setSelectedTargetQB(null);
//     setProcessStep("search");
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

//   async function cloneQuestionBank(qbData, newName, selectedDepts) {
//     // Build b_d_id array from selected departments
//     const b_d_id = selectedDepts.map(dept => ({
//       label: dept.label,
//       value: dept.value,
//       branch_id: dept.branch_id,
//       school_id: dept.school_id,
//       department_id: dept.department_id
//     }));

//     const res = await fetch(`${API}/api/questionbank/clone`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         mainDepartmentUser: true,
//         price: qbData.price || 0,
//         qb_code: null,
//         qb_description: qbData.qb_description,
//         qb_id: qbData.qb_id,
//         qb_name: newName,
//         tags: qbData.tags || [],
//         visibility: qbData.visibility || "Within Department",
//         b_d_id: b_d_id
//       })
//     });

//     const json = await res.json();
    
//     console.log("📋 Clone API Request:", {
//       qb_id: qbData.qb_id,
//       qb_name: newName,
//       b_d_id: b_d_id,
//       b_d_id_count: b_d_id.length
//     });
//     console.log("📋 Clone API Response:", json);
    
//     if (json?.data?.success) {
//       return json.data;
//     } else {
//       throw new Error(json?.message || json?.data?.message || "Failed to clone QB");
//     }
//   }

//   async function fetchQBQuestions(qbId) {
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
//     return json?.non_group_questions || [];
//   }

//   async function fetchQBQuestionsWithRetry(qbId, maxRetries = 5) {
//     console.log("📥 Fetching questions for QB:", qbId);
    
//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//       const questions = await fetchQBQuestions(qbId);
      
//       console.log(`📊 Attempt ${attempt}/${maxRetries}: Found ${questions.length} questions`);
      
//       if (questions.length > 0) {
//         console.log("✅ Questions successfully fetched!");
//         return questions;
//       }
      
//       if (attempt < maxRetries) {
//         // Exponential backoff: 2s, 4s, 6s, 8s
//         const waitTime = attempt * 2000;
//         console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
//         await sleep(waitTime);
//       }
//     }
    
//     console.warn("⚠️ No questions found after all retries");
//     return [];
//   }

//   async function moveQuestions(questionIds, questionTypes, targetQbId, currentQbId) {
//     const qIdString = questionIds.join(",");
//     const qTypeString = questionTypes.join(",");

//     const res = await fetch(
//       `${API}/api/questionMove?q_id=${qIdString}&q_type=${qTypeString}&qb_id=${targetQbId}&current_qb_id=${currentQbId}`,
//       {
//         method: "GET",
//         headers: { Authorization: token }
//       }
//     );

//     const json = await res.json();
//     if (!json.success) {
//       throw new Error(json.message || "Failed to move questions");
//     }
//     return json;
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

//   const handleCloneQB = async () => {
//     if (!selectedSourceQB) {
//       showAlert("Please select a source QB", "warning");
//       return;
//     }

//     if (!cloneQBName.trim()) {
//       showAlert("Please enter a name for the cloned QB", "warning");
//       return;
//     }

//     if (selectedDepartments.length === 0) {
//       showAlert("Please select at least one department", "warning");
//       return;
//     }

//     showOverlay("🔄 Cloning question bank...");

//     try {
//       const cloneResult = await cloneQuestionBank(
//         selectedSourceQB, 
//         cloneQBName.trim(),
//         selectedDepartments
//       );

//       showOverlay("📚 Fetching questions from cloned QB...");
//       showOverlay("⏳ Please wait, questions are being copied...");

//       // Use retry mechanism to wait for questions to appear
//       const questions = await fetchQBQuestionsWithRetry(cloneResult.qb_id);

//       if (questions.length === 0) {
//         hideOverlay();
//         showAlert(
//           "⚠️ QB cloned but no questions found yet. The questions might still be copying. Please wait a moment and try refreshing.",
//           "warning"
//         );
        
//         // Still allow user to proceed, but show warning
//         setClonedQB({
//           qb_id: cloneResult.qb_id,
//           qb_name: cloneQBName.trim(),
//           questionCount: 0
//         });
//         setClonedQuestions([]);
//         setProcessStep("cloned");
//         return;
//       }

//       setClonedQB({
//         qb_id: cloneResult.qb_id,
//         qb_name: cloneQBName.trim(),
//         questionCount: questions.length
//       });
//       setClonedQuestions(questions);
//       setProcessStep("cloned");

//       hideOverlay();
//       showAlert(
//         `✅ Successfully cloned QB with ${questions.length} questions to ${selectedDepartments.length} department(s)!`,
//         "success"
//       );
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error cloning QB: " + err.message, "danger");
//       console.error(err);
//     }
//   };

// const handleMoveAndDelete = async () => {
//     if (!selectedTargetQB) {
//       showAlert("Please select a target QB", "warning");
//       return;
//     }

//     if (clonedQuestions.length === 0) {
//       showAlert("No questions to move", "warning");
//       return;
//     }

//     const targetQBName = selectedTargetQB.qb_name;
//     const questionCount = clonedQuestions.length;

//     try {
//       // Step 1: Move all questions
//       showOverlay(`📦 Moving ${questionCount} question(s)...`);

//       const questionIds = clonedQuestions.map((q) => q.q_id);
//       const questionTypes = clonedQuestions.map(
//         (q) => q.question_type || "mcq_single_correct"
//       );

//       // Process in batches of 3 using Promise.all
//       const batchSize = 3;
//       let successCount = 0;
//       let failCount = 0;

//       for (let i = 0; i < questionIds.length; i += batchSize) {
//         const batchIds = questionIds.slice(i, i + batchSize);
//         const batchTypes = questionTypes.slice(i, i + batchSize);

//         showOverlay(
//           `📦 Moving: ${Math.min(i + batchSize, questionIds.length)}/${questionIds.length}`
//         );

//         const batchPromises = batchIds.map((qId, idx) =>
//           moveQuestions([qId], [batchTypes[idx]], selectedTargetQB.qb_id, clonedQB.qb_id)
//             .then(() => {
//               successCount++;
//               return true;
//             })
//             .catch((err) => {
//               console.error(`Failed to move question ${qId}:`, err);
//               failCount++;
//               return false;
//             })
//         );

//         await Promise.all(batchPromises);

//         if (i + batchSize < questionIds.length) {
//           await sleep(300);
//         }
//       }

//       if (successCount === 0) {
//         hideOverlay();
//         showAlert("❌ Failed to move any questions", "danger");
//         return;
//       }

//       // Step 2: Delete the cloned QB
//       await sleep(500);
//       showOverlay("🗑️ Deleting empty cloned QB...");

//       try {
//         await deleteQuestionBank(clonedQB.qb_id, clonedQB.qb_name);
//         await sleep(300);
//       } catch (deleteErr) {
//         console.warn("Failed to delete cloned QB:", deleteErr);
//         hideOverlay();
//         showAlert(
//           `✅ Moved ${successCount} question(s) to ${targetQBName}, but failed to delete cloned QB${failCount > 0 ? ` (${failCount} failed to move)` : ""}`,
//           "warning"
//         );
//         setProcessStep("moved");
//         return;
//       }

//       // Success
//       hideOverlay();
//       await sleep(200);
//       showAlert(
//         `✅ Successfully moved ${successCount} question(s) to ${targetQBName} and deleted cloned QB${failCount > 0 ? ` (${failCount} failed to move)` : ""}`,
//         "success"
//       );
//       setProcessStep("completed");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error during move process: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleStartNew = () => {
//     resetCloneState();
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
//           <h2 className="qb-welcome-title">🔐 QB Access Tool</h2>
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
//             <h2 className="qb-title">🛠️ QB Access Tool</h2>
//             <button
//               onClick={clearToken}
//               className="qb-button qb-button-danger qb-button-small"
//             >
//               🚪 Logout
//             </button>
//           </div>

//           {/* Tab Navigation */}
//           <div className="qb-tabs">
//             <button
//               className={`qb-tab ${activeTab === "clone" ? "qb-tab-active" : ""}`}
//               onClick={() => {
//                 setActiveTab("clone");
//                 resetCloneState();
//               }}
//             >
//               🔄 QB Clone and Move
//             </button>
//             <button
//               className={`qb-tab ${activeTab === "meta" ? "qb-tab-active" : ""}`}
//               onClick={() => setActiveTab("meta")}
//             >
//               📝 Meta Update
//             </button>
//           </div>

//           {/* Clone and Move Tab */}
//           {activeTab === "clone" && (
//             <div className="qb-tab-content">
//               {/* Step 1: Search and Select Source QB */}
//               {processStep === "search" && (
//                 <div className="qb-section">
//                   <h3 className="qb-section-title">📚 Step 1: Search Source QB</h3>

//                   <div className="qb-form-group">
//                     <label className="qb-label">Search Question Bank</label>
//                     <input
//                       type="text"
//                       value={searchTerm}
//                       onChange={(e) => setSearchTerm(e.target.value)}
//                       onKeyPress={(e) => e.key === "Enter" && handleSearchSourceQB()}
//                       placeholder="Enter QB name..."
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
//                       <h4 className="qb-subtitle">Search Results</h4>
//                       {searchResults.map((qb) => (
//                         <div
//                           key={qb.qb_id}
//                           className={`qb-search-item ${
//                             selectedSourceQB?.qb_id === qb.qb_id
//                               ? "qb-search-item-selected"
//                               : ""
//                           }`}
//                           onClick={() => setSelectedSourceQB(qb)}
//                         >
//                           <div className="qb-search-item-name">{qb.qb_name}</div>
//                           <div className="qb-search-item-meta">
//                             {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   {selectedSourceQB && (
//                     <div className="qb-selected-section">
//                       <h4 className="qb-subtitle">✅ Selected QB</h4>
//                       <div className="qb-selected-card">
//                         <div className="qb-selected-name">{selectedSourceQB.qb_name}</div>
//                         <div className="qb-selected-meta">
//                           {selectedSourceQB.questionCount} questions •{" "}
//                           {selectedSourceQB.visibility}
//                         </div>
//                       </div>

//                       <div className="qb-form-group" style={{ marginTop: "20px" }}>
//                         <label className="qb-label">Clone QB Name</label>
//                         <input
//                           type="text"
//                           value={cloneQBName}
//                           onChange={(e) => setCloneQBName(e.target.value)}
//                           placeholder="Enter name for cloned QB..."
//                           className="qb-input"
//                         />
//                       </div>

//                       {/* Department Selection Dropdown */}
//                       <div className="qb-form-group">
//                         <label className="qb-label">Select Departments (b_d_id)</label>
//                         <div className="qb-search-dropdown-wrapper">
//                           <input
//                             type="text"
//                             value={departmentSearchTerm}
//                             onChange={(e) => {
//                               setDepartmentSearchTerm(e.target.value);
//                               setShowDepartmentDropdown(true);
//                             }}
//                             onFocus={() => setShowDepartmentDropdown(true)}
//                             placeholder="Search and select departments..."
//                             className="qb-input"
//                           />
                          
//                           {showDepartmentDropdown && (
//                             <div className="qb-dropdown qb-dropdown-multi">
//                               {B_D_ID_OPTIONS
//                                 .filter(dept => 
//                                   dept.label.toLowerCase().includes(departmentSearchTerm.toLowerCase())
//                                 )
//                                 .map((dept) => {
//                                   const isSelected = selectedDepartments.some(d => d.value === dept.value);
//                                   return (
//                                     <div
//                                       key={dept.value}
//                                       className={`qb-dropdown-item ${isSelected ? 'qb-dropdown-item-selected' : ''}`}
//                                       onClick={() => {
//                                         if (isSelected) {
//                                           // Remove department
//                                           setSelectedDepartments(
//                                             selectedDepartments.filter(d => d.value !== dept.value)
//                                           );
//                                         } else {
//                                           // Add department
//                                           setSelectedDepartments([...selectedDepartments, dept]);
//                                         }
//                                       }}
//                                     >
//                                       <div className="qb-dropdown-item-checkbox">
//                                         <input
//                                           type="checkbox"
//                                           checked={isSelected}
//                                           onChange={() => {}}
//                                           className="qb-checkbox-inline"
//                                         />
//                                         <div className="qb-dropdown-item-content">
//                                           <div className="qb-dropdown-item-name">{dept.label}</div>
//                                           <div className="qb-dropdown-item-meta">
//                                             Dept: {dept.department_id.slice(0, 8)}...
//                                           </div>
//                                         </div>
//                                       </div>
//                                     </div>
//                                   );
//                                 })}
//                             </div>
//                           )}
                          
//                           {/* Selected Departments Display */}
//                           {selectedDepartments.length > 0 && (
//                             <div className="qb-selected-departments">
//                               {selectedDepartments.map((dept) => (
//                                 <div key={dept.value} className="qb-dept-chip">
//                                   <span>{dept.label}</span>
//                                   <button
//                                     onClick={() => {
//                                       setSelectedDepartments(
//                                         selectedDepartments.filter(d => d.value !== dept.value)
//                                       );
//                                     }}
//                                     className="qb-dept-chip-remove"
//                                   >
//                                     ×
//                                   </button>
//                                 </div>
//                               ))}
//                             </div>
//                           )}
//                         </div>
//                       </div>

//                       <button
//                         onClick={handleCloneQB}
//                         disabled={!cloneQBName.trim() || selectedDepartments.length === 0}
//                         className={`qb-button qb-button-success ${
//                           (!cloneQBName.trim() || selectedDepartments.length === 0) ? "qb-button-disabled" : ""
//                         }`}
//                       >
//                         🔄 Clone QB to {selectedDepartments.length} Department(s)
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Step 2: Select Target QB and Move */}
//               {(processStep === "cloned" || processStep === "moved") && (
//                 <div className="qb-section">
//                   <h3 className="qb-section-title">📦 Step 2: Select Target QB and Move</h3>

//                   <div className="qb-info-card">
//                     <div className="qb-info-title">Cloned QB</div>
//                     <div className="qb-info-name">{clonedQB.qb_name}</div>
//                     <div className="qb-info-meta">
//                       {clonedQuestions.length} questions ready to move
//                       {clonedQuestions.length === 0 && (
//                         <span className="qb-warning-text">
//                           {" "}⚠️ Questions might still be copying
//                         </span>
//                       )}
//                     </div>
//                     {clonedQuestions.length === 0 && (
//                       <button
//                         onClick={async () => {
//                           showOverlay("🔄 Refreshing questions...");
//                           try {
//                             const questions = await fetchQBQuestionsWithRetry(clonedQB.qb_id, 3);
//                             setClonedQuestions(questions);
//                             setClonedQB({
//                               ...clonedQB,
//                               questionCount: questions.length
//                             });
//                             hideOverlay();
//                             if (questions.length > 0) {
//                               showAlert(`✅ Found ${questions.length} questions!`, "success");
//                             } else {
//                               showAlert("⚠️ Still no questions found. Please wait longer and try again.", "warning");
//                             }
//                           } catch (err) {
//                             hideOverlay();
//                             showAlert("Error refreshing: " + err.message, "danger");
//                           }
//                         }}
//                         className="qb-button qb-button-warning qb-button-small"
//                         style={{ marginTop: "12px" }}
//                       >
//                         🔄 Refresh Questions
//                       </button>
//                     )}
//                   </div>

//                   <div className="qb-form-group" style={{ marginTop: "20px" }}>
//                     <label className="qb-label">Search Target QB</label>
//                     <input
//                       type="text"
//                       value={targetSearchTerm}
//                       onChange={(e) => setTargetSearchTerm(e.target.value)}
//                       onKeyPress={(e) => e.key === "Enter" && handleSearchTargetQB()}
//                       placeholder="Enter target QB name..."
//                       className="qb-input"
//                     />
//                   </div>

//                   <button
//                     onClick={handleSearchTargetQB}
//                     className="qb-button qb-button-primary"
//                   >
//                     🔍 Search Target
//                   </button>

//                   {targetSearchResults.length > 0 && (
//                     <div className="qb-search-results">
//                       <h4 className="qb-subtitle">Target QB Results</h4>
//                       {targetSearchResults.map((qb) => (
//                         <div
//                           key={qb.qb_id}
//                           className={`qb-search-item ${
//                             selectedTargetQB?.qb_id === qb.qb_id
//                               ? "qb-search-item-selected"
//                               : ""
//                           }`}
//                           onClick={() => setSelectedTargetQB(qb)}
//                         >
//                           <div className="qb-search-item-name">{qb.qb_name}</div>
//                           <div className="qb-search-item-meta">
//                             {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   {selectedTargetQB && (
//                     <div className="qb-selected-section">
//                       <h4 className="qb-subtitle">✅ Target QB Selected</h4>
//                       <div className="qb-selected-card">
//                         <div className="qb-selected-name">{selectedTargetQB.qb_name}</div>
//                         <div className="qb-selected-meta">
//                           {selectedTargetQB.questionCount} questions •{" "}
//                           {selectedTargetQB.visibility}
//                         </div>
//                       </div>

//                       <button
//                         onClick={handleMoveAndDelete}
//                         className="qb-button qb-button-success"
//                         style={{ marginTop: "16px" }}
//                       >
//                         📦 Move {clonedQuestions.length} Questions & Delete Clone
//                       </button>
//                     </div>
//                   )}

//                   <button
//                     onClick={handleStartNew}
//                     className="qb-button qb-button-secondary"
//                     style={{ marginTop: "20px" }}
//                   >
//                     🔄 Start New Operation
//                   </button>
//                 </div>
//               )}

//               {/* Step 3: Completion */}
//               {processStep === "completed" && (
//                 <div className="qb-section">
//                   <div className="qb-success-card">
//                     <div className="qb-success-icon">✅</div>
//                     <h3 className="qb-success-title">Operation Completed!</h3>
//                     <p className="qb-success-message">
//                       All questions have been moved to the target QB and the cloned QB has
//                       been deleted successfully.
//                     </p>

//                     <button
//                       onClick={handleStartNew}
//                       className="qb-button qb-button-primary"
//                       style={{ marginTop: "20px" }}
//                     >
//                       🔄 Start New Operation
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Meta Update Tab */}
//           {activeTab === "meta" && (
//             <div className="qb-tab-content">
//               <div className="qb-section">
//                 <h3 className="qb-section-title">📝 Meta Update</h3>
//                 <div className="qb-empty-state">
//                   Coming soon... Focus on this feature later.
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

import { useState } from "react";
import { DEPARTMENT_IDS, B_D_ID_OPTIONS } from "../config";
import "./QBAccess.css";

const API = "https://api.examly.io";

export default function QBAccess() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("examly_token") || "";
    } catch {
      return "";
    }
  });

  const [ui, setUI] = useState(token ? "menu" : "welcome");
  const [activeTab, setActiveTab] = useState("clone"); // "clone" or "meta"

  // Common states
  const [alert, setAlert] = useState(null);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [tokenInput, setTokenInput] = useState("");

  // Clone & Move states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSourceQB, setSelectedSourceQB] = useState(null);
  const [cloneQBName, setCloneQBName] = useState("");
  const [clonedQB, setClonedQB] = useState(null);
  const [clonedQuestions, setClonedQuestions] = useState([]);
  const [targetSearchTerm, setTargetSearchTerm] = useState("");
  const [targetSearchResults, setTargetSearchResults] = useState([]);
  const [selectedTargetQB, setSelectedTargetQB] = useState(null);
  const [processStep, setProcessStep] = useState("search"); // search, cloned, moved, completed
  
  // Department selection states
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

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
    try {
      localStorage.setItem("examly_token", tokenInput.trim());
      setToken(tokenInput.trim());
      setTokenInput("");
      setUI("menu");
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
    resetCloneState();
    showAlert("Token cleared", "danger");
  };

  const resetCloneState = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedSourceQB(null);
    setCloneQBName("");
    setClonedQB(null);
    setClonedQuestions([]);
    setTargetSearchTerm("");
    setTargetSearchResults([]);
    setSelectedTargetQB(null);
    setProcessStep("search");
  };

  // ==================== API FUNCTIONS ====================

  async function searchQuestionBanks(searchTerm) {
    const res = await fetch(`${API}/api/v2/questionbanks`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        branch_id: "all",
        department_id: DEPARTMENT_IDS,
        limit: 25,
        mainDepartmentUser: true,
        page: 1,
        search: searchTerm,
        visibility: "All"
      })
    });

    const json = await res.json();
    return json?.results?.questionbanks || [];
  }

  async function cloneQuestionBank(qbData, newName, selectedDepts) {
    // Build b_d_id array from selected departments
    const b_d_id = selectedDepts.map(dept => ({
      label: dept.label,
      value: dept.value,
      branch_id: dept.branch_id,
      school_id: dept.school_id,
      department_id: dept.department_id
    }));

    const res = await fetch(`${API}/api/questionbank/clone`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mainDepartmentUser: true,
        price: qbData.price || 0,
        qb_code: null,
        qb_description: qbData.qb_description,
        qb_id: qbData.qb_id,
        qb_name: newName,
        tags: qbData.tags || [],
        visibility: qbData.visibility || "Within Department",
        b_d_id: b_d_id
      })
    });

    const json = await res.json();
    
    console.log("📋 Clone API Request:", {
      qb_id: qbData.qb_id,
      qb_name: newName,
      b_d_id: b_d_id,
      b_d_id_count: b_d_id.length
    });
    console.log("📋 Clone API Response:", json);
    
    if (json?.data?.success) {
      return json.data;
    } else {
      throw new Error(json?.message || json?.data?.message || "Failed to clone QB");
    }
  }

  async function fetchQBQuestions(qbId) {
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
    return json?.non_group_questions || [];
  }

  async function fetchQBQuestionsWithRetry(qbId, maxRetries = 5) {
    console.log("📥 Fetching questions for QB:", qbId);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const questions = await fetchQBQuestions(qbId);
      
      console.log(`📊 Attempt ${attempt}/${maxRetries}: Found ${questions.length} questions`);
      
      if (questions.length > 0) {
        console.log("✅ Questions successfully fetched!");
        return questions;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 6s, 8s
        const waitTime = attempt * 2000;
        console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
        await sleep(waitTime);
      }
    }
    
    console.warn("⚠️ No questions found after all retries");
    return [];
  }

  async function moveQuestions(questionIds, questionTypes, targetQbId, currentQbId) {
    const qIdString = questionIds.join(",");
    const qTypeString = questionTypes.join(",");

    const res = await fetch(
      `${API}/api/questionMove?q_id=${qIdString}&q_type=${qTypeString}&qb_id=${targetQbId}&current_qb_id=${currentQbId}`,
      {
        method: "GET",
        headers: { Authorization: token }
      }
    );

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Failed to move questions");
    }
    return json;
  }

  async function deleteQuestionBank(qbId, qbName) {
    const res = await fetch(`${API}/api/v2/questionbanks/bulkDelete`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        branch_id: "all",
        department_id: DEPARTMENT_IDS,
        ids: [qbId],
        limit: 25,
        mainDepartmentUser: true,
        page: 1,
        search: qbName,
        visibility: "All"
      })
    });

    const json = await res.json();
    if (json?.data?.success) {
      return json.data;
    } else {
      throw new Error(json?.data?.message || "Failed to delete QB");
    }
  }

  // ==================== HANDLERS ====================

  const handleSearchSourceQB = async () => {
    if (!searchTerm.trim()) {
      showAlert("Please enter a search term", "warning");
      return;
    }

    showOverlay("🔍 Searching question banks...");

    try {
      const results = await searchQuestionBanks(searchTerm);
      setSearchResults(results);
      hideOverlay();

      if (results.length === 0) {
        showAlert("No question banks found", "warning");
      } else {
        showAlert(`Found ${results.length} question bank(s)`, "success");
      }
    } catch (err) {
      hideOverlay();
      showAlert("Error searching: " + err.message, "danger");
      console.error(err);
    }
  };

  const handleSearchTargetQB = async () => {
    if (!targetSearchTerm.trim()) {
      showAlert("Please enter a search term", "warning");
      return;
    }

    showOverlay("🔍 Searching target question banks...");

    try {
      const results = await searchQuestionBanks(targetSearchTerm);
      setTargetSearchResults(results);
      hideOverlay();

      if (results.length === 0) {
        showAlert("No question banks found", "warning");
      } else {
        showAlert(`Found ${results.length} question bank(s)`, "success");
      }
    } catch (err) {
      hideOverlay();
      showAlert("Error searching: " + err.message, "danger");
      console.error(err);
    }
  };

  const handleCloneQB = async () => {
    if (!selectedSourceQB) {
      showAlert("Please select a source QB", "warning");
      return;
    }

    if (!cloneQBName.trim()) {
      showAlert("Please enter a name for the cloned QB", "warning");
      return;
    }

    if (selectedDepartments.length === 0) {
      showAlert("Please select at least one department", "warning");
      return;
    }

    showOverlay("🔄 Cloning question bank...");

    try {
      const cloneResult = await cloneQuestionBank(
        selectedSourceQB, 
        cloneQBName.trim(),
        selectedDepartments
      );

      showOverlay("📚 Fetching questions from cloned QB...");
      showOverlay("⏳ Please wait, questions are being copied...");

      // Use retry mechanism to wait for questions to appear
      const questions = await fetchQBQuestionsWithRetry(cloneResult.qb_id);

      if (questions.length === 0) {
        hideOverlay();
        showAlert(
          "⚠️ QB cloned but no questions found yet. The questions might still be copying. Please wait a moment and try refreshing.",
          "warning"
        );
        
        // Still allow user to proceed, but show warning
        setClonedQB({
          qb_id: cloneResult.qb_id,
          qb_name: cloneQBName.trim(),
          questionCount: 0
        });
        setClonedQuestions([]);
        setProcessStep("cloned");
        return;
      }

      setClonedQB({
        qb_id: cloneResult.qb_id,
        qb_name: cloneQBName.trim(),
        questionCount: questions.length
      });
      setClonedQuestions(questions);
      setProcessStep("cloned");

      hideOverlay();
      showAlert(
        `✅ Successfully cloned QB with ${questions.length} questions to ${selectedDepartments.length} department(s)!`,
        "success"
      );
    } catch (err) {
      hideOverlay();
      showAlert("Error cloning QB: " + err.message, "danger");
      console.error(err);
    }
  };

const handleMoveAndDelete = async () => {
    if (!selectedTargetQB) {
      showAlert("Please select a target QB", "warning");
      return;
    }

    if (clonedQuestions.length === 0) {
      showAlert("No questions to move", "warning");
      return;
    }

    const targetQBName = selectedTargetQB.qb_name;
    const questionCount = clonedQuestions.length;

    try {
      // Step 1: Move all questions
      showOverlay(`📦 Moving ${questionCount} question(s)...`);

      const questionIds = clonedQuestions.map((q) => q.q_id);
      const questionTypes = clonedQuestions.map(
        (q) => q.question_type || "mcq_single_correct"
      );

      // Process in batches of 3 using Promise.all
      const batchSize = 3;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < questionIds.length; i += batchSize) {
        const batchIds = questionIds.slice(i, i + batchSize);
        const batchTypes = questionTypes.slice(i, i + batchSize);

        showOverlay(
          `📦 Moving: ${Math.min(i + batchSize, questionIds.length)}/${questionIds.length}`
        );

        const batchPromises = batchIds.map((qId, idx) =>
          moveQuestions([qId], [batchTypes[idx]], selectedTargetQB.qb_id, clonedQB.qb_id)
            .then(() => {
              successCount++;
              return true;
            })
            .catch((err) => {
              console.error(`Failed to move question ${qId}:`, err);
              failCount++;
              return false;
            })
        );

        await Promise.all(batchPromises);

        if (i + batchSize < questionIds.length) {
          await sleep(300);
        }
      }

      if (successCount === 0) {
        hideOverlay();
        showAlert("❌ Failed to move any questions", "danger");
        return;
      }

      // Step 2: Delete the cloned QB
      await sleep(500);
      showOverlay("🗑️ Deleting empty cloned QB...");

      try {
        await deleteQuestionBank(clonedQB.qb_id, clonedQB.qb_name);
        await sleep(300);
      } catch (deleteErr) {
        console.warn("Failed to delete cloned QB:", deleteErr);
        hideOverlay();
        showAlert(
          `✅ Moved ${successCount} question(s) to ${targetQBName}, but failed to delete cloned QB${failCount > 0 ? ` (${failCount} failed to move)` : ""}`,
          "warning"
        );
        setProcessStep("moved");
        return;
      }

      // Success
      hideOverlay();
      await sleep(200);
      showAlert(
        `✅ Successfully moved ${successCount} question(s) to ${targetQBName} and deleted cloned QB${failCount > 0 ? ` (${failCount} failed to move)` : ""}`,
        "success"
      );
      setProcessStep("completed");
    } catch (err) {
      hideOverlay();
      showAlert("Error during move process: " + err.message, "danger");
      console.error(err);
    }
  };

  const handleStartNew = () => {
    resetCloneState();
    showAlert("Ready for new operation", "info");
  };

  // ==================== RENDER ====================

  return (
    <div className="qb-access-container">
      {/* Loading Overlay */}
      {overlay && (
        <div className="qb-overlay">
          <div className="qb-overlay-content">
            <div className="qb-spinner"></div>
            <div className="qb-overlay-text">{overlayText}</div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <div className={`qb-alert qb-alert-${alert.type}`}>{alert.msg}</div>
      )}

      {/* Welcome Screen */}
      {ui === "welcome" && (
        <div className="qb-welcome">
          <h2 className="qb-welcome-title">🔐 QB Access Tool</h2>
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

      {/* Menu Screen */}
      {ui === "menu" && (
        <div className="qb-card">
          <div className="qb-menu-header">
            <h2 className="qb-title">🛠️ QB Access Tool</h2>
            <button
              onClick={clearToken}
              className="qb-button qb-button-danger qb-button-small"
            >
              🚪 Logout
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="qb-tabs">
            <button
              className={`qb-tab ${activeTab === "clone" ? "qb-tab-active" : ""}`}
              onClick={() => {
                setActiveTab("clone");
                resetCloneState();
              }}
            >
              🔄 QB Clone and Move
            </button>
            <button
              className={`qb-tab ${activeTab === "meta" ? "qb-tab-active" : ""}`}
              onClick={() => setActiveTab("meta")}
            >
              📝 Meta Update
            </button>
          </div>

          {/* Clone and Move Tab */}
          {activeTab === "clone" && (
            <div className="qb-tab-content">
              {/* Step 1: Search and Select Source QB */}
              {processStep === "search" && (
                <div className="qb-section">
                  <h3 className="qb-section-title">📚 Step 1: Search Source QB</h3>

                  <div className="qb-form-group">
                    <label className="qb-label">Search Question Bank</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearchSourceQB()}
                      placeholder="Enter QB name..."
                      className="qb-input"
                    />
                  </div>

                  <button
                    onClick={handleSearchSourceQB}
                    className="qb-button qb-button-primary"
                  >
                    🔍 Search
                  </button>

                  {searchResults.length > 0 && (
                    <div className="qb-search-results">
                      <h4 className="qb-subtitle">Search Results</h4>
                      {searchResults.map((qb) => (
                        <div
                          key={qb.qb_id}
                          className={`qb-search-item ${
                            selectedSourceQB?.qb_id === qb.qb_id
                              ? "qb-search-item-selected"
                              : ""
                          }`}
                          onClick={() => setSelectedSourceQB(qb)}
                        >
                          <div className="qb-search-item-name">{qb.qb_name}</div>
                          <div className="qb-search-item-meta">
                            {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSourceQB && (
                    <div className="qb-selected-section">
                      <h4 className="qb-subtitle">✅ Selected QB</h4>
                      <div className="qb-selected-card">
                        <div className="qb-selected-name">{selectedSourceQB.qb_name}</div>
                        <div className="qb-selected-meta">
                          {selectedSourceQB.questionCount} questions •{" "}
                          {selectedSourceQB.visibility}
                        </div>
                      </div>

                      <div className="qb-form-group" style={{ marginTop: "20px" }}>
                        <label className="qb-label">Clone QB Name</label>
                        <input
                          type="text"
                          value={cloneQBName}
                          onChange={(e) => setCloneQBName(e.target.value)}
                          placeholder="Enter name for cloned QB..."
                          className="qb-input"
                        />
                      </div>

                      {/* Department Selection Dropdown */}
                      <div className="qb-form-group">
                        <label className="qb-label">Select Departments</label>
                        <div className="qb-search-dropdown-wrapper">
                          <input
                            type="text"
                            value={departmentSearchTerm}
                            onChange={(e) => {
                              setDepartmentSearchTerm(e.target.value);
                              setShowDepartmentDropdown(true);
                            }}
                            onFocus={() => setShowDepartmentDropdown(true)}
                            onBlur={() => {
                              // Close dropdown after a short delay to allow click events
                              setTimeout(() => setShowDepartmentDropdown(false), 200);
                            }}
                            placeholder="Search and select departments..."
                            className="qb-input"
                          />
                          
                          {showDepartmentDropdown && (
                            <div 
                              className="qb-dropdown qb-dropdown-multi"
                              onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
                            >
                              {B_D_ID_OPTIONS
                                .filter(dept => 
                                  dept.label.toLowerCase().includes(departmentSearchTerm.toLowerCase())
                                )
                                .map((dept) => {
                                  const isSelected = selectedDepartments.some(d => d.value === dept.value);
                                  return (
                                    <div
                                      key={dept.value}
                                      className={`qb-dropdown-item ${isSelected ? 'qb-dropdown-item-selected' : ''}`}
                                      onClick={() => {
                                        if (isSelected) {
                                          // Remove department
                                          setSelectedDepartments(
                                            selectedDepartments.filter(d => d.value !== dept.value)
                                          );
                                        } else {
                                          // Add department
                                          setSelectedDepartments([...selectedDepartments, dept]);
                                        }
                                        // Clear search and close dropdown after selection
                                        setDepartmentSearchTerm("");
                                        setShowDepartmentDropdown(false);
                                      }}
                                    >
                                      <div className="qb-dropdown-item-checkbox">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {}}
                                          className="qb-checkbox-inline"
                                        />
                                        <div className="qb-dropdown-item-content">
                                          <div className="qb-dropdown-item-name">{dept.label}</div>
                                          <div className="qb-dropdown-item-meta">
                                            Dept: {dept.department_id.slice(0, 8)}...
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                          
                          {/* Selected Departments Display */}
                          {selectedDepartments.length > 0 && (
                            <div className="qb-selected-departments">
                              {selectedDepartments.map((dept) => (
                                <div key={dept.value} className="qb-dept-chip">
                                  <span>{dept.label}</span>
                                  <button
                                    onClick={() => {
                                      setSelectedDepartments(
                                        selectedDepartments.filter(d => d.value !== dept.value)
                                      );
                                    }}
                                    className="qb-dept-chip-remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleCloneQB}
                        disabled={!cloneQBName.trim() || selectedDepartments.length === 0}
                        className={`qb-button qb-button-success ${
                          (!cloneQBName.trim() || selectedDepartments.length === 0) ? "qb-button-disabled" : ""
                        }`}
                      >
                        🔄 Clone QB to {selectedDepartments.length} Department(s)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Target QB and Move */}
              {(processStep === "cloned" || processStep === "moved") && (
                <div className="qb-section">
                  <h3 className="qb-section-title">📦 Step 2: Select Target QB and Move</h3>

                  <div className="qb-info-card">
                    <div className="qb-info-title">Cloned QB</div>
                    <div className="qb-info-name">{clonedQB.qb_name}</div>
                    <div className="qb-info-meta">
                      {clonedQuestions.length} questions ready to move
                      {clonedQuestions.length === 0 && (
                        <span className="qb-warning-text">
                          {" "}⚠️ Questions might still be copying
                        </span>
                      )}
                    </div>
                    {clonedQuestions.length === 0 && (
                      <button
                        onClick={async () => {
                          showOverlay("🔄 Refreshing questions...");
                          try {
                            const questions = await fetchQBQuestionsWithRetry(clonedQB.qb_id, 3);
                            setClonedQuestions(questions);
                            setClonedQB({
                              ...clonedQB,
                              questionCount: questions.length
                            });
                            hideOverlay();
                            if (questions.length > 0) {
                              showAlert(`✅ Found ${questions.length} questions!`, "success");
                            } else {
                              showAlert("⚠️ Still no questions found. Please wait longer and try again.", "warning");
                            }
                          } catch (err) {
                            hideOverlay();
                            showAlert("Error refreshing: " + err.message, "danger");
                          }
                        }}
                        className="qb-button qb-button-warning qb-button-small"
                        style={{ marginTop: "12px" }}
                      >
                        🔄 Refresh Questions
                      </button>
                    )}
                  </div>

                  <div className="qb-form-group" style={{ marginTop: "20px" }}>
                    <label className="qb-label">Search Target QB</label>
                    <input
                      type="text"
                      value={targetSearchTerm}
                      onChange={(e) => setTargetSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearchTargetQB()}
                      placeholder="Enter target QB name..."
                      className="qb-input"
                    />
                  </div>

                  <button
                    onClick={handleSearchTargetQB}
                    className="qb-button qb-button-primary"
                  >
                    🔍 Search Target
                  </button>

                  {targetSearchResults.length > 0 && (
                    <div className="qb-search-results">
                      <h4 className="qb-subtitle">Target QB Results</h4>
                      {targetSearchResults.map((qb) => (
                        <div
                          key={qb.qb_id}
                          className={`qb-search-item ${
                            selectedTargetQB?.qb_id === qb.qb_id
                              ? "qb-search-item-selected"
                              : ""
                          }`}
                          onClick={() => setSelectedTargetQB(qb)}
                        >
                          <div className="qb-search-item-name">{qb.qb_name}</div>
                          <div className="qb-search-item-meta">
                            {qb.questionCount} questions • {qb.user_role} • {qb.visibility}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedTargetQB && (
                    <div className="qb-selected-section">
                      <h4 className="qb-subtitle">✅ Target QB Selected</h4>
                      <div className="qb-selected-card">
                        <div className="qb-selected-name">{selectedTargetQB.qb_name}</div>
                        <div className="qb-selected-meta">
                          {selectedTargetQB.questionCount} questions •{" "}
                          {selectedTargetQB.visibility}
                        </div>
                      </div>

                      <button
                        onClick={handleMoveAndDelete}
                        className="qb-button qb-button-success"
                        style={{ marginTop: "16px" }}
                      >
                        📦 Move {clonedQuestions.length} Questions & Delete Clone
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleStartNew}
                    className="qb-button qb-button-secondary"
                    style={{ marginTop: "20px" }}
                  >
                    🔄 Start New Operation
                  </button>
                </div>
              )}

              {/* Step 3: Completion */}
              {processStep === "completed" && (
                <div className="qb-section">
                  <div className="qb-success-card">
                    <div className="qb-success-icon">✅</div>
                    <h3 className="qb-success-title">Operation Completed!</h3>
                    <p className="qb-success-message">
                      All questions have been moved to the target QB and the cloned QB has
                      been deleted successfully.
                    </p>

                    <button
                      onClick={handleStartNew}
                      className="qb-button qb-button-primary"
                      style={{ marginTop: "20px" }}
                    >
                      🔄 Start New Operation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Meta Update Tab */}
          {activeTab === "meta" && (
            <div className="qb-tab-content">
              <div className="qb-section">
                <h3 className="qb-section-title">📝 Meta Update</h3>
                <div className="qb-empty-state">
                  Coming soon... Focus on this feature later.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}