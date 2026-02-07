// import { useState } from "react";
// import { DEPARTMENT_IDS } from "../config";
// import "./MetaCorporate.css";

// const API = "https://api.examly.io";
// // const AI_API = "http://localhost:4000";
// const AI_API = "https://cubeintouch-backend.onrender.com";

// export default function MetaCorporate() {
//   // Token Management
//   const [token, setToken] = useState(() => {
//     try {
//       return localStorage.getItem("examly_token_meta") || "";
//     } catch {
//       return "";
//     }
//   });

//   const [ui, setUI] = useState(token ? "menu" : "welcome");
//   const [tokenInput, setTokenInput] = useState("");

//   // Alert & Overlay
//   const [alert, setAlert] = useState(null);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");

//   // Search states
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [selectedQB, setSelectedQB] = useState(null);

//   // Questions & Metadata
//   const [allQuestions, setAllQuestions] = useState([]);
//   const [questions, setQuestions] = useState([]);
//   const [aiSuggestions, setAiSuggestions] = useState([]);
//   const [processStep, setProcessStep] = useState("search");
  
//   // Range Selection
//   const [rangeStart, setRangeStart] = useState(1);
//   const [rangeEnd, setRangeEnd] = useState(50);

//   // Analysis metadata
//   const [analysisMetadata, setAnalysisMetadata] = useState(null);

//   // Progress tracking
//   const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
//   const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

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

//   // ==================== TOKEN MANAGEMENT ====================

//   const saveToken = () => {
//     if (!tokenInput.trim()) {
//       showAlert("Token cannot be empty", "danger");
//       return;
//     }
//     try {
//       localStorage.setItem("examly_token_meta", tokenInput.trim());
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
//       localStorage.removeItem("examly_token_meta");
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
//     setSelectedQB(null);
//     setAllQuestions([]);
//     setQuestions([]);
//     setAiSuggestions([]);
//     setProcessStep("search");
//     setUpdateProgress({ current: 0, total: 0 });
//     setAnalysisProgress({ current: 0, total: 0 });
//     setRangeStart(1);
//     setRangeEnd(50);
//     setAnalysisMetadata(null);
//   };

//   // ==================== BACK NAVIGATION ====================
  
//   const handleBack = () => {
//     if (processStep === "range_select") {
//       setProcessStep("search");
//       setSelectedQB(null);
//       setAllQuestions([]);
//     } else if (processStep === "loaded") {
//       setProcessStep("range_select");
//       setQuestions([]);
//     } else if (processStep === "suggestions") {
//       setProcessStep("loaded");
//       setAiSuggestions([]);
//       setAnalysisMetadata(null);
//     } else if (processStep === "completed") {
//       setProcessStep("suggestions");
//     }
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

//   async function fetchAllQuestions(qbId) {
//     console.log("📥 Fetching all questions for QB:", qbId);
    
//     let allQuestions = [];
//     let page = 1;
//     let hasMore = true;
//     const limit = 200;

//     while (hasMore) {
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
      
//       console.log(`✅ Page ${page}: Found ${questions.length} questions`);
      
//       hasMore = questions.length === limit;
//       page++;
      
//       if (hasMore) await sleep(500);
//     }
    
//     console.log(`🎉 Total questions fetched: ${allQuestions.length}`);
//     return allQuestions;
//   }

//   async function analyzeWithAI(questions) {
//     const BATCH_SIZE = 5;
//     const totalBatches = Math.ceil(questions.length / BATCH_SIZE);
//     let allSuggestions = [];

//     for (let i = 0; i < totalBatches; i++) {
//       const start = i * BATCH_SIZE;
//       const end = Math.min(start + BATCH_SIZE, questions.length);
//       const batch = questions.slice(start, end);

//       setAnalysisProgress({ current: i + 1, total: totalBatches });
//       showOverlay(`🤖 Vector AI analyzing batch ${i + 1}/${totalBatches}...`);

//       console.log(`📤 Sending batch ${i + 1}:`, {
//         questionsCount: batch.length
//       });

//       const res = await fetch(`${AI_API}/analyze-metadata`, {
//         method: "POST",
//         headers: { 
//           "Content-Type": "application/json",
//           "Authorization": token  // ← Pass token to backend
//         },
//         body: JSON.stringify({
//           questions: batch.map(q => q.question_data || q.question || "")
//         })
//       });

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error('❌ AI API Error:', errorText);
//         throw new Error(`AI analysis failed: ${res.status} ${res.statusText}`);
//       }

//       const result = await res.json();
//       console.log(`✅ Batch ${i + 1} result:`, {
//         suggestions: result.suggestions?.length || 0,
//         metadata: result.metadata
//       });
      
//       const batchResults = result.suggestions || result.results || result;
      
//       // Map results back to original question IDs
//       const mappedResults = batchResults.map((suggestion, idx) => {
//         const originalQuestion = batch[idx];
//         return {
//           ...suggestion,
//           q_id: originalQuestion.q_id,
//           question_preview: (originalQuestion.question_data || "").substring(0, 100) + "..." || "N/A"
//         };
//       });
      
//       // Store metadata from first batch
//       if (result.metadata && i === 0) {
//         setAnalysisMetadata(result.metadata);
//       }
      
//       allSuggestions = [...allSuggestions, ...mappedResults];
      
//       await sleep(1000);
//     }

//     return allSuggestions;
//   }

//   async function updateQuestionMetadata(qId, metadata, originalQuestion) {
//     const question = originalQuestion;

//     const parsedOptions = typeof question.options === 'string' 
//       ? JSON.parse(question.options) 
//       : question.options;
//     const parsedAnswer = typeof question.answer === 'string' 
//       ? JSON.parse(question.answer) 
//       : question.answer;
//     const parsedHint = typeof question.hint === 'string' 
//       ? JSON.parse(question.hint) 
//       : (question.hint || []);
    
//     let parsedAnswerExplanation = question.answer_explanation
//       ? (typeof question.answer_explanation === 'string' ? JSON.parse(question.answer_explanation) : question.answer_explanation)
//       : { args: [] };
    
//     if (parsedAnswerExplanation.args) {
//       parsedAnswerExplanation.args = parsedAnswerExplanation.args.filter(arg => arg && arg.trim() !== '');
//     }

//     let processTags = [];
//     if (Array.isArray(question.tags)) {
//       processTags = question.tags.map(tag => {
//         if (typeof tag === 'string') {
//           return tag;
//         } else if (typeof tag === 'object' && tag.name) {
//           return tag.name;
//         }
//         return null;
//       }).filter(tag => tag && tag.trim() !== '');
//     }

//     const updatePayload = {
//       question_data: question.question_data || "",
//       options: parsedOptions,
//       answer: parsedAnswer,
//       subject_id: metadata.subject_id,
//       topic_id: metadata.topic_id,
//       sub_topic_id: metadata.sub_topic_id,
//       blooms_taxonomy: question.blooms_taxonomy || null,
//       course_outcome: question.course_outcome || null,
//       program_outcome: question.program_outcome || null,
//       hint: parsedHint,
//       answer_explanation: parsedAnswerExplanation,
//       manual_difficulty: question.manual_difficulty || null,
//       question_editor_type: question.question_editor_type || 1,
//       linked_concepts: question.linked_concepts || "",
//       tags: processTags,
//       question_media: question.question_media || [],
//       createdBy: question.createdBy || question.created_by || null
//     };

//     const res = await fetch(`${API}/api/update_mcq_question/${qId}`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify(updatePayload)
//     });

//     const json = await res.json();
    
//     if (json.statuscode !== 200 && !json.data?.success) {
//       throw new Error(json.data?.message || json.message || "Failed to update question");
//     }
    
//     return json;
//   }

//   // ==================== HANDLERS ====================

//   const handleSearchQB = async () => {
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

//   const handleSelectQB = async (qb) => {
//     setSelectedQB(qb);
//     showOverlay(`📚 Loading ${qb.questionCount} questions...`);

//     try {
//       const fetchedQuestions = await fetchAllQuestions(qb.qb_id);
//       setAllQuestions(fetchedQuestions);
      
//       setRangeStart(1);
//       setRangeEnd(Math.min(50, fetchedQuestions.length));
      
//       hideOverlay();
//       showAlert(`Loaded ${fetchedQuestions.length} questions`, "success");
//       setProcessStep("range_select");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error loading questions: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//   const handleConfirmRange = () => {
//     if (rangeStart < 1 || rangeEnd > allQuestions.length || rangeStart > rangeEnd) {
//       showAlert("Invalid range selected", "danger");
//       return;
//     }

//     const selectedQuestions = allQuestions.slice(rangeStart - 1, rangeEnd);
//     setQuestions(selectedQuestions);
//     setProcessStep("loaded");
//     showAlert(`Selected ${selectedQuestions.length} questions (${rangeStart}-${rangeEnd})`, "success");
//   };

//   const handleAnalyzeWithAI = async () => {
//     if (questions.length === 0) {
//       showAlert("No questions to analyze", "warning");
//       return;
//     }

//     setProcessStep("analyzing");
//     setAnalysisProgress({ current: 0, total: Math.ceil(questions.length / 5) });
//     showOverlay(`🤖 Starting Vector AI analysis...`);

//     try {
//       const suggestions = await analyzeWithAI(questions);
//       setAiSuggestions(suggestions);
//       hideOverlay();
//       showAlert(`AI analysis complete! ${suggestions.length} suggestions ready`, "success");
//       setProcessStep("suggestions");
//     } catch (err) {
//       hideOverlay();
//       showAlert("AI analysis failed: " + err.message, "danger");
//       console.error(err);
//       setProcessStep("loaded");
//     }
//   };

//   const handleApplyUpdates = async () => {
//     if (aiSuggestions.length === 0) {
//       showAlert("No suggestions to apply", "warning");
//       return;
//     }

//     setProcessStep("updating");
//     setUpdateProgress({ current: 0, total: aiSuggestions.length });

//     let successCount = 0;
//     let failCount = 0;

//     for (let i = 0; i < aiSuggestions.length; i++) {
//       const suggestion = aiSuggestions[i];
      
//       const originalQuestion = questions.find(q => q.q_id === suggestion.q_id);
      
//       if (!originalQuestion) {
//         console.error(`❌ Question ${suggestion.q_id} not found in loaded questions`);
//         failCount++;
//         continue;
//       }
      
//       setUpdateProgress({ current: i + 1, total: aiSuggestions.length });
//       showOverlay(`📝 Updating question ${i + 1}/${aiSuggestions.length}...`);

//       try {
//         await updateQuestionMetadata(suggestion.q_id, {
//           subject_id: suggestion.suggested_subject_id,
//           topic_id: suggestion.suggested_topic_id,
//           sub_topic_id: suggestion.suggested_sub_topic_id
//         }, originalQuestion);
        
//         successCount++;
//         console.log(`✅ Updated question ${i + 1}`);
//         await sleep(300);
//       } catch (err) {
//         failCount++;
//         console.error(`❌ Failed to update question ${i + 1}:`, err);
//       }
//     }

//     hideOverlay();
    
//     if (failCount === 0) {
//       showAlert(`Successfully updated all ${successCount} questions!`, "success");
//     } else {
//       showAlert(`⚠️ Updated ${successCount} questions, ${failCount} failed`, "warning");
//     }
    
//     setProcessStep("completed");
//   };

//   const handleNextRange = () => {
//     const nextStart = rangeEnd + 1;
//     const nextEnd = Math.min(nextStart + 49, allQuestions.length);
    
//     setRangeStart(nextStart);
//     setRangeEnd(nextEnd);
//     setProcessStep("range_select");
//     setAiSuggestions([]);
//     setQuestions([]);
//     setAnalysisMetadata(null);
//   };

//   const handleStartNew = () => {
//     resetState();
//     showAlert("Ready for new operation", "info");
//   };

//   const getPercentage = (current, total) => {
//     if (total === 0) return 0;
//     return Math.round((current / total) * 100);
//   };

//   // ==================== RENDER ====================

//   return (
//     <div className="meta-corporate-container">
//       {/* Animated Background */}
//       <div className="meta-bg-effects">
//         <div className="meta-orb meta-orb-1"></div>
//         <div className="meta-orb meta-orb-2"></div>
//         <div className="meta-orb meta-orb-3"></div>
//       </div>

//       {/* Enhanced Loading Overlay */}
//       {overlay && (
//         <div className="meta-overlay">
//           <div className="meta-overlay-content">
//             {/* Animated AI Robot */}
//             <div className="meta-ai-robot">
//               <div className="robot-container">
//                 <div className="robot-head">
//                   <div className="robot-antenna">
//                     <div className="antenna-ball"></div>
//                   </div>
//                   <div className="robot-face">
//                     <div className="robot-eye robot-eye-left">
//                       <div className="eye-pupil"></div>
//                     </div>
//                     <div className="robot-eye robot-eye-right">
//                       <div className="eye-pupil"></div>
//                     </div>
//                     <div className="robot-mouth"></div>
//                   </div>
//                 </div>
//                 <div className="robot-body">
//                   <div className="body-light body-light-1"></div>
//                   <div className="body-light body-light-2"></div>
//                   <div className="body-light body-light-3"></div>
//                 </div>
//                 <div className="robot-arms">
//                   <div className="robot-arm robot-arm-left"></div>
//                   <div className="robot-arm robot-arm-right"></div>
//                 </div>
//               </div>
//             </div>

//             {/* Progress Circle for Analysis */}
//             {processStep === "analyzing" && (
//               <div className="meta-progress-circle">
//                 <svg width="140" height="140">
//                   <circle 
//                     cx="70" cy="70" r="65" 
//                     fill="none" 
//                     stroke="rgba(102, 126, 234, 0.2)" 
//                     strokeWidth="10"
//                   />
//                   <circle 
//                     cx="70" cy="70" r="65" 
//                     fill="none" 
//                     stroke="url(#progressGradient)" 
//                     strokeWidth="10"
//                     strokeDasharray={`${(analysisProgress.current / analysisProgress.total) * 408} 408`}
//                     strokeLinecap="round"
//                     transform="rotate(-90 70 70)"
//                     style={{ transition: "stroke-dasharray 0.3s ease" }}
//                   />
//                   <defs>
//                     <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
//                       <stop offset="0%" stopColor="#667eea"/>
//                       <stop offset="100%" stopColor="#764ba2"/>
//                     </linearGradient>
//                   </defs>
//                 </svg>
//                 <div className="progress-percentage">
//                   {getPercentage(analysisProgress.current, analysisProgress.total)}%
//                 </div>
//               </div>
//             )}

//             {/* Progress Bar for Updates */}
//             {processStep === "updating" && (
//               <div className="meta-progress-bar-wrapper">
//                 <div className="meta-progress-bar">
//                   <div 
//                     className="meta-progress-fill"
//                     style={{ width: `${getPercentage(updateProgress.current, updateProgress.total)}%` }}
//                   >
//                     <div className="progress-shimmer"></div>
//                   </div>
//                 </div>
//                 <div className="meta-progress-text">
//                   {updateProgress.current} / {updateProgress.total} questions ({getPercentage(updateProgress.current, updateProgress.total)}%)
//                 </div>
//               </div>
//             )}

//             <div className="meta-overlay-text">{overlayText}</div>
//           </div>
//         </div>
//       )}

//       {/* Alert */}
//       {alert && (
//         <div className={`meta-alert meta-alert-${alert.type}`}>
//           {alert.type === "success" && "✅"}
//           {alert.type === "warning" && "⚠️"}
//           {alert.type === "danger" && "❌"}
//           {alert.type === "info" && "ℹ️"}
//           <span>{alert.msg}</span>
//         </div>
//       )}

//       {/* Welcome Screen */}
//       {ui === "welcome" && (
//         <div className="meta-card">
//           <div className="meta-header">
//             <div className="meta-title-section">
//               <div className="meta-ai-badge">🤖</div>
//               <div className="meta-title-content">
//                 <h1>Meta Thinkly-X</h1>
//                 <div className="meta-subtitle">
//                   AI-Powered Question Metadata Editor
//                   <div className="meta-ai-indicator">
//                     <div className="meta-ai-dot"></div>
//                     <span>Powered by Vector AI</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="meta-search-section">
//             <div className="meta-search-header">
//               <div className="meta-search-icon">🔑</div>
//               <h3 className="meta-search-title">Enter API Token</h3>
//             </div>

//             <textarea
//               value={tokenInput}
//               onChange={(e) => setTokenInput(e.target.value)}
//               placeholder="Paste your Examly API Authorization token here..."
//               className="meta-input"
//               rows={4}
//               style={{ fontFamily: "monospace", fontSize: "13px" }}
//             />

//             <button onClick={saveToken} className="meta-search-button">
//               💾 Save Token & Continue
//             </button>

//             <div style={{ marginTop: "16px", padding: "16px", background: "rgba(102, 126, 234, 0.1)", borderRadius: "12px", border: "1px solid rgba(102, 126, 234, 0.2)" }}>
//               <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.6" }}>
//                 💡 <strong>Tip:</strong> Your token will be saved separately from other tools for enhanced security
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Main Menu */}
//       {ui === "menu" && (
//         <div className="meta-card">
//           {/* Header with Back and Logout Button */}
//           <div className="meta-header">
//             <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
//               {processStep !== "search" && (
//                 <button
//                   onClick={handleBack}
//                   className="meta-back-button"
//                 >
//                   ← Back
//                 </button>
//               )}
//               <div className="meta-title-section">
//                 <div className="meta-ai-badge">🤖</div>
//                 <div className="meta-title-content">
//                   <h1>Meta Thinkly-X</h1>
//                   <div className="meta-subtitle">
//                     AI-Powered Question Metadata Editor
//                     <div className="meta-ai-indicator">
//                       <div className="meta-ai-dot"></div>
//                       <span>Vector AI Active</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <button onClick={clearToken} className="meta-logout-button">
//               🚪 Logout
//             </button>
//           </div>

//           {/* Step 1: Search QB */}
//           {processStep === "search" && (
//             <div className="meta-search-section">
//               <div className="meta-search-header">
//                 <div className="meta-search-icon">🔍</div>
//                 <h3 className="meta-search-title">Step 1: Search Question Bank</h3>
//               </div>

//               <div className="meta-search-bar">
//                 <input
//                   type="text"
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   onKeyPress={(e) => e.key === "Enter" && handleSearchQB()}
//                   placeholder="Enter QB name to search..."
//                   className="meta-input"
//                 />
//               </div>

//               <button onClick={handleSearchQB} className="meta-search-button">
//                 🔍 Search Question Banks
//               </button>

//               {/* Search Results */}
//               {searchResults.length > 0 && (
//                 <div className="meta-results">
//                   <div className="meta-results-header">
//                     <h4 className="meta-results-title">
//                       Search Results
//                       <span className="meta-results-count">{searchResults.length}</span>
//                     </h4>
//                   </div>

//                   {searchResults.map((qb) => (
//                     <div
//                       key={qb.qb_id}
//                       className={`meta-result-item ${selectedQB?.qb_id === qb.qb_id ? "selected" : ""}`}
//                       onClick={() => handleSelectQB(qb)}
//                     >
//                       <div className="meta-result-name">{qb.qb_name}</div>
//                       <div className="meta-result-meta">
//                         <span className="meta-result-tag">📚 {qb.questionCount} questions</span>
//                         <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>•</span>
//                         <span>{qb.visibility}</span>
//                         <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>•</span>
//                         <span>{qb.user_role}</span>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Step 2: Range Selection */}
//           {processStep === "range_select" && (
//             <div className="meta-range-selector">
//               <div className="meta-editor-header">
//                 <div className="meta-editor-icon">📊</div>
//                 <div className="meta-editor-info">
//                   <h3>Select Question Range</h3>
//                   <p>{selectedQB?.qb_name} - {allQuestions.length} total questions</p>
//                 </div>
//               </div>

//               <div className="meta-range-content">
//                 <div className="meta-range-inputs">
//                   <div className="meta-range-input-group">
//                     <label>Start Question</label>
//                     <input
//                       type="number"
//                       min="1"
//                       max={allQuestions.length}
//                       value={rangeStart}
//                       onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
//                       className="meta-input"
//                     />
//                   </div>
                  
//                   <div style={{ fontSize: "24px", color: "rgba(255, 255, 255, 0.5)", alignSelf: "center" }}>
//                     →
//                   </div>
                  
//                   <div className="meta-range-input-group">
//                     <label>End Question</label>
//                     <input
//                       type="number"
//                       min={rangeStart}
//                       max={allQuestions.length}
//                       value={rangeEnd}
//                       onChange={(e) => setRangeEnd(Math.min(allQuestions.length, parseInt(e.target.value) || rangeEnd))}
//                       className="meta-input"
//                     />
//                   </div>
//                 </div>

//                 <div className="meta-range-preview">
//                   <div className="range-preview-item">
//                     <span>Total Questions:</span>
//                     <strong>{allQuestions.length}</strong>
//                   </div>
//                   <div className="range-preview-item">
//                     <span>Selected Range:</span>
//                     <strong>{rangeStart} - {rangeEnd}</strong>
//                   </div>
//                   <div className="range-preview-item">
//                     <span>Will Analyze:</span>
//                     <strong style={{ color: "#4caf50" }}>{rangeEnd - rangeStart + 1} questions</strong>
//                   </div>
//                 </div>

//                 <button onClick={handleConfirmRange} className="meta-button meta-button-primary">
//                   ✅ Confirm & Load Questions
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Step 3: Questions Loaded */}
//           {processStep === "loaded" && (
//             <div className="meta-editor">
//               <div className="meta-editor-header">
//                 <div className="meta-editor-icon">📚</div>
//                 <div className="meta-editor-info">
//                   <h3>{selectedQB?.qb_name}</h3>
//                   <p>{questions.length} questions (#{rangeStart}-#{rangeEnd}) ready for AI analysis</p>
//                 </div>
//               </div>

//               <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "20px", borderRadius: "12px", border: "2px solid rgba(102, 126, 234, 0.3)", marginBottom: "24px" }}>
//                 <div style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
//                   🤖 Vector AI Analysis Ready
//                 </div>
//                 <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.6", marginBottom: "16px" }}>
//                   Our Vector AI will analyze each question using semantic similarity matching to suggest the most appropriate <strong>Subject</strong>, <strong>Topic</strong>, and <strong>SubTopic</strong>.
//                 </div>
//                 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
//                   <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
//                     <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Questions</div>
//                     <div style={{ fontSize: "24px", fontWeight: "800", color: "#4caf50" }}>{questions.length}</div>
//                   </div>
//                   <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
//                     <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Analysis Method</div>
//                     <div style={{ fontSize: "16px", fontWeight: "800", color: "#2196f3" }}>Vector Similarity</div>
//                   </div>
//                 </div>
//               </div>

//               <div className="meta-actions">
//                 <button
//                   onClick={handleAnalyzeWithAI}
//                   className="meta-button meta-button-primary"
//                   style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
//                 >
//                   🤖 Analyze with Vector AI
//                 </button>
//                 <button
//                   onClick={handleStartNew}
//                   className="meta-button meta-button-secondary"
//                 >
//                   🔄 Start Over
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Step 4: AI Suggestions */}
//           {processStep === "suggestions" && (
//             <div className="meta-editor">
//               <div className="meta-editor-header">
//                 <div className="meta-editor-icon">✨</div>
//                 <div className="meta-editor-info">
//                   <h3>AI Suggestions Ready</h3>
//                   <p>{aiSuggestions.length} questions analyzed 
//                     {analysisMetadata && ` (${analysisMetadata.mode} mode)`}
//                   </p>
//                 </div>
//               </div>

//               {/* Analysis Statistics */}
//               {analysisMetadata && (
//                 <div style={{ 
//                   background: "rgba(102, 126, 234, 0.1)", 
//                   padding: "20px", 
//                   borderRadius: "12px", 
//                   border: "2px solid rgba(102, 126, 234, 0.3)", 
//                   marginBottom: "24px" 
//                 }}>
//                   <div style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "16px" }}>
//                     📊 Analysis Statistics
//                   </div>
//                   <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
//                     <div style={{ background: "rgba(76, 175, 80, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(76, 175, 80, 0.3)" }}>
//                       <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>High Confidence</div>
//                       <div style={{ fontSize: "24px", fontWeight: "800", color: "#4caf50" }}>
//                         {analysisMetadata.high_confidence}
//                       </div>
//                       <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)" }}>
//                         {((analysisMetadata.high_confidence / analysisMetadata.total_questions) * 100).toFixed(1)}%
//                       </div>
//                     </div>
                    
//                     <div style={{ background: "rgba(255, 152, 0, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 152, 0, 0.3)" }}>
//                       <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>Medium Confidence</div>
//                       <div style={{ fontSize: "24px", fontWeight: "800", color: "#ff9800" }}>
//                         {analysisMetadata.medium_confidence || 0}
//                       </div>
//                       <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)" }}>
//                         {(((analysisMetadata.medium_confidence || 0) / analysisMetadata.total_questions) * 100).toFixed(1)}%
//                       </div>
//                     </div>
                    
//                     <div style={{ background: "rgba(244, 67, 54, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(244, 67, 54, 0.3)" }}>
//                       <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>Low Confidence</div>
//                       <div style={{ fontSize: "24px", fontWeight: "800", color: "#f44336" }}>
//                         {analysisMetadata.low_confidence || 0}
//                       </div>
//                       <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)" }}>
//                         {(((analysisMetadata.low_confidence || 0) / analysisMetadata.total_questions) * 100).toFixed(1)}%
//                       </div>
//                     </div>
                    
//                     <div style={{ background: "rgba(33, 150, 243, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(33, 150, 243, 0.3)" }}>
//                       <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>Avg Confidence</div>
//                       <div style={{ fontSize: "24px", fontWeight: "800", color: "#2196f3" }}>
//                         {analysisMetadata.average_confidence}%
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               <div style={{ maxHeight: "500px", overflowY: "auto", marginBottom: "24px" }}>
//                 {aiSuggestions.map((suggestion, index) => (
//                   <div
//                     key={suggestion.q_id || index}
//                     style={{
//                       background: "rgba(255, 255, 255, 0.05)",
//                       border: "2px solid rgba(255, 255, 255, 0.1)",
//                       borderRadius: "12px",
//                       padding: "20px",
//                       marginBottom: "16px"
//                     }}
//                   >
//                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
//                       <div style={{ flex: 1 }}>
//                         <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
//                           <div style={{ fontSize: "14px", fontWeight: "700", color: "#4facfe" }}>
//                             Question #{rangeStart + index}
//                           </div>
//                         </div>
//                         <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "12px" }}>
//                           {suggestion.question_preview || suggestion.question || "N/A"}
//                         </div>
//                       </div>
//                       <div style={{
//                         background: (suggestion.confidence >= 80) ? "rgba(76, 175, 80, 0.2)" : (suggestion.confidence >= 60) ? "rgba(255, 152, 0, 0.2)" : "rgba(244, 67, 54, 0.2)",
//                         color: (suggestion.confidence >= 80) ? "#4caf50" : (suggestion.confidence >= 60) ? "#ff9800" : "#f44336",
//                         padding: "6px 12px",
//                         borderRadius: "8px",
//                         fontSize: "13px",
//                         fontWeight: "700",
//                         border: `1px solid ${(suggestion.confidence >= 80) ? "#4caf50" : (suggestion.confidence >= 60) ? "#ff9800" : "#f44336"}`,
//                         flexShrink: 0,
//                         marginLeft: "16px"
//                       }}>
//                         {suggestion.confidence}% 
//                         {(suggestion.confidence >= 80) ? " ✅" : (suggestion.confidence >= 60) ? " ⚠️" : " ❌"}
//                       </div>
//                     </div>

//                     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px", marginBottom: "12px" }}>
//                       <div>
//                         <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>Subject</div>
//                         <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
//                           {suggestion.suggested_subject_name || suggestion.subject_name}
//                         </div>
//                       </div>
//                       <div>
//                         <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>Topic</div>
//                         <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
//                           {suggestion.suggested_topic_name || suggestion.topic_name}
//                         </div>
//                       </div>
//                       <div>
//                         <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>SubTopic</div>
//                         <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
//                           {suggestion.suggested_sub_topic_name || suggestion.sub_topic_name}
//                         </div>
//                       </div>
//                     </div>

//                     {suggestion.reasoning && (
//                       <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", fontStyle: "italic", background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "6px" }}>
//                         💡 {suggestion.reasoning}
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>

//               <div className="meta-actions">
//                 <button
//                   onClick={handleApplyUpdates}
//                   className="meta-button meta-button-primary"
//                 >
//                   ✅ Apply All Updates ({aiSuggestions.length} questions)
//                 </button>
//                 <button
//                   onClick={handleStartNew}
//                   className="meta-button meta-button-secondary"
//                 >
//                   🔄 Start Over
//                 </button>
//               </div>
//             </div>
//           )}

//           {/* Step 5: Completed */}
//           {processStep === "completed" && (
//             <div className="meta-editor">
//               <div style={{ textAlign: "center", padding: "60px 20px" }}>
//                 <div style={{ fontSize: "80px", marginBottom: "24px" }}>✅</div>
//                 <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
//                   Update Complete!
//                 </h2>
//                 <p style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "32px" }}>
//                   Successfully updated questions #{rangeStart}-#{rangeEnd}
//                 </p>

//                 <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
//                   <button
//                     onClick={handleStartNew}
//                     className="meta-button meta-button-primary"
//                   >
//                     🔄 Start New Operation
//                   </button>
                  
//                   {rangeEnd < allQuestions.length && (
//                     <button
//                       onClick={handleNextRange}
//                       className="meta-button meta-button-primary"
//                       style={{ background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)" }}
//                     >
//                       ➡️ Next Range ({rangeEnd + 1}-{Math.min(rangeEnd + 50, allQuestions.length)})
//                     </button>
//                   )}
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
import { DEPARTMENT_IDS } from "../config";
import "./MetaCorporate.css";

const API = "https://api.examly.io";
// const AI_API = "http://localhost:4000";
const AI_API = "https://cubeintouch-backend.onrender.com";

export default function MetaCorporate() {
  // Token Management
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("examly_token_meta") || "";
    } catch {
      return "";
    }
  });

  const [ui, setUI] = useState(token ? "menu" : "welcome");
  const [tokenInput, setTokenInput] = useState("");

  // Alert & Overlay
  const [alert, setAlert] = useState(null);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");

  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedQB, setSelectedQB] = useState(null);

  // Questions & Metadata
  const [allQuestions, setAllQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [processStep, setProcessStep] = useState("search");
  
  // Range Selection
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(50);

  // Analysis metadata
  const [analysisMetadata, setAnalysisMetadata] = useState(null);

  // Progress tracking
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const showAlert = (msg, type = "warning") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 6000); // 6 seconds for indexing message
  };

  const showOverlay = (msg) => {
    setOverlayText(msg);
    setOverlay(true);
  };

  const hideOverlay = () => setOverlay(false);

  // ==================== TOKEN MANAGEMENT ====================

  const saveToken = () => {
    if (!tokenInput.trim()) {
      showAlert("Token cannot be empty", "danger");
      return;
    }
    try {
      localStorage.setItem("examly_token_meta", tokenInput.trim());
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
      localStorage.removeItem("examly_token_meta");
    } catch (err) {
      console.error("Failed to clear token:", err);
    }
    setToken("");
    setUI("welcome");
    setTokenInput("");
    resetState();
    showAlert("Token cleared", "danger");
  };

  const resetState = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedQB(null);
    setAllQuestions([]);
    setQuestions([]);
    setAiSuggestions([]);
    setProcessStep("search");
    setUpdateProgress({ current: 0, total: 0 });
    setAnalysisProgress({ current: 0, total: 0 });
    setRangeStart(1);
    setRangeEnd(50);
    setAnalysisMetadata(null);
  };

  // ==================== BACK NAVIGATION ====================
  
  const handleBack = () => {
    if (processStep === "range_select") {
      setProcessStep("search");
      setSelectedQB(null);
      setAllQuestions([]);
    } else if (processStep === "loaded") {
      setProcessStep("range_select");
      setQuestions([]);
    } else if (processStep === "suggestions") {
      setProcessStep("loaded");
      setAiSuggestions([]);
      setAnalysisMetadata(null);
    } else if (processStep === "completed") {
      setProcessStep("suggestions");
    }
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

  async function fetchAllQuestions(qbId) {
    console.log("📥 Fetching all questions for QB:", qbId);
    
    let allQuestions = [];
    let page = 1;
    let hasMore = true;
    const limit = 200;

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
      
      allQuestions = [...allQuestions, ...questions];
      
      console.log(`✅ Page ${page}: Found ${questions.length} questions`);
      
      hasMore = questions.length === limit;
      page++;
      
      if (hasMore) await sleep(500);
    }
    
    console.log(`🎉 Total questions fetched: ${allQuestions.length}`);
    return allQuestions;
  }

  async function analyzeWithAI(questions) {
    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(questions.length / BATCH_SIZE);
    let allSuggestions = [];

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, questions.length);
      const batch = questions.slice(start, end);

      setAnalysisProgress({ current: i + 1, total: totalBatches });
      showOverlay(`🤖 Vector AI analyzing batch ${i + 1}/${totalBatches}...`);

      console.log(`📤 Sending batch ${i + 1}:`, {
        questionsCount: batch.length
      });

      const res = await fetch(`${AI_API}/analyze-metadata`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({
          questions: batch.map(q => q.question_data || q.question || "")
        })
      });

      // ✅ HANDLE 503 INDEXING IN PROGRESS
      if (res.status === 503) {
        try {
          const errorData = await res.json();
          
          if (errorData.status === 'indexing') {
            hideOverlay();
            showAlert(
              `⏳ First-time setup: Your taxonomy is being indexed. This takes ${errorData.estimatedTime || '3-5 minutes'}. Please wait and try again.`, 
              "warning"
            );
            setProcessStep("loaded");
            return [];
          }
        } catch (parseErr) {
          // If JSON parse fails, treat as generic 503
          hideOverlay();
          showAlert("⏳ Service temporarily unavailable. Please try again in a few minutes.", "warning");
          setProcessStep("loaded");
          return [];
        }
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ AI API Error:', errorText);
        throw new Error(`AI analysis failed: ${res.status} ${res.statusText}`);
      }

      const result = await res.json();
      console.log(`✅ Batch ${i + 1} result:`, {
        suggestions: result.suggestions?.length || 0,
        metadata: result.metadata
      });
      
      const batchResults = result.suggestions || result.results || result;
      
      // Map results back to original question IDs
      const mappedResults = batchResults.map((suggestion, idx) => {
        const originalQuestion = batch[idx];
        return {
          ...suggestion,
          q_id: originalQuestion.q_id,
          question_preview: (originalQuestion.question_data || "").substring(0, 100) + "..." || "N/A"
        };
      });
      
      // Store metadata from first batch
      if (result.metadata && i === 0) {
        setAnalysisMetadata(result.metadata);
      }
      
      allSuggestions = [...allSuggestions, ...mappedResults];
      
      await sleep(1000);
    }

    return allSuggestions;
  }

  async function updateQuestionMetadata(qId, metadata, originalQuestion) {
    const question = originalQuestion;

    const parsedOptions = typeof question.options === 'string' 
      ? JSON.parse(question.options) 
      : question.options;
    const parsedAnswer = typeof question.answer === 'string' 
      ? JSON.parse(question.answer) 
      : question.answer;
    const parsedHint = typeof question.hint === 'string' 
      ? JSON.parse(question.hint) 
      : (question.hint || []);
    
    let parsedAnswerExplanation = question.answer_explanation
      ? (typeof question.answer_explanation === 'string' ? JSON.parse(question.answer_explanation) : question.answer_explanation)
      : { args: [] };
    
    if (parsedAnswerExplanation.args) {
      parsedAnswerExplanation.args = parsedAnswerExplanation.args.filter(arg => arg && arg.trim() !== '');
    }

    let processTags = [];
    if (Array.isArray(question.tags)) {
      processTags = question.tags.map(tag => {
        if (typeof tag === 'string') {
          return tag;
        } else if (typeof tag === 'object' && tag.name) {
          return tag.name;
        }
        return null;
      }).filter(tag => tag && tag.trim() !== '');
    }

    const updatePayload = {
      question_data: question.question_data || "",
      options: parsedOptions,
      answer: parsedAnswer,
      subject_id: metadata.subject_id,
      topic_id: metadata.topic_id,
      sub_topic_id: metadata.sub_topic_id,
      blooms_taxonomy: question.blooms_taxonomy || null,
      course_outcome: question.course_outcome || null,
      program_outcome: question.program_outcome || null,
      hint: parsedHint,
      answer_explanation: parsedAnswerExplanation,
      manual_difficulty: question.manual_difficulty || null,
      question_editor_type: question.question_editor_type || 1,
      linked_concepts: question.linked_concepts || "",
      tags: processTags,
      question_media: question.question_media || [],
      createdBy: question.createdBy || question.created_by || null
    };

    const res = await fetch(`${API}/api/update_mcq_question/${qId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(updatePayload)
    });

    const json = await res.json();
    
    if (json.statuscode !== 200 && !json.data?.success) {
      throw new Error(json.data?.message || json.message || "Failed to update question");
    }
    
    return json;
  }

  // ==================== HANDLERS ====================

  const handleSearchQB = async () => {
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

  const handleSelectQB = async (qb) => {
    setSelectedQB(qb);
    showOverlay(`📚 Loading ${qb.questionCount} questions...`);

    try {
      const fetchedQuestions = await fetchAllQuestions(qb.qb_id);
      setAllQuestions(fetchedQuestions);
      
      setRangeStart(1);
      setRangeEnd(Math.min(50, fetchedQuestions.length));
      
      hideOverlay();
      showAlert(`Loaded ${fetchedQuestions.length} questions`, "success");
      setProcessStep("range_select");
    } catch (err) {
      hideOverlay();
      showAlert("Error loading questions: " + err.message, "danger");
      console.error(err);
    }
  };

  const handleConfirmRange = () => {
    if (rangeStart < 1 || rangeEnd > allQuestions.length || rangeStart > rangeEnd) {
      showAlert("Invalid range selected", "danger");
      return;
    }

    const selectedQuestions = allQuestions.slice(rangeStart - 1, rangeEnd);
    setQuestions(selectedQuestions);
    setProcessStep("loaded");
    showAlert(`Selected ${selectedQuestions.length} questions (${rangeStart}-${rangeEnd})`, "success");
  };

  const handleAnalyzeWithAI = async () => {
    if (questions.length === 0) {
      showAlert("No questions to analyze", "warning");
      return;
    }

    setProcessStep("analyzing");
    setAnalysisProgress({ current: 0, total: Math.ceil(questions.length / 5) });
    showOverlay(`🤖 Starting Vector AI analysis...`);

    try {
      const suggestions = await analyzeWithAI(questions);
      
      // Check if indexing in progress (empty array returned)
      if (suggestions.length === 0) {
        // Alert already shown in analyzeWithAI
        return;
      }
      
      setAiSuggestions(suggestions);
      hideOverlay();
      showAlert(`AI analysis complete! ${suggestions.length} suggestions ready`, "success");
      setProcessStep("suggestions");
    } catch (err) {
      hideOverlay();
      showAlert("AI analysis failed: " + err.message, "danger");
      console.error(err);
      setProcessStep("loaded");
    }
  };

  const handleApplyUpdates = async () => {
    if (aiSuggestions.length === 0) {
      showAlert("No suggestions to apply", "warning");
      return;
    }

    setProcessStep("updating");
    setUpdateProgress({ current: 0, total: aiSuggestions.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < aiSuggestions.length; i++) {
      const suggestion = aiSuggestions[i];
      
      const originalQuestion = questions.find(q => q.q_id === suggestion.q_id);
      
      if (!originalQuestion) {
        console.error(`❌ Question ${suggestion.q_id} not found in loaded questions`);
        failCount++;
        continue;
      }
      
      setUpdateProgress({ current: i + 1, total: aiSuggestions.length });
      showOverlay(`📝 Updating question ${i + 1}/${aiSuggestions.length}...`);

      try {
        await updateQuestionMetadata(suggestion.q_id, {
          subject_id: suggestion.suggested_subject_id,
          topic_id: suggestion.suggested_topic_id,
          sub_topic_id: suggestion.suggested_sub_topic_id
        }, originalQuestion);
        
        successCount++;
        console.log(`✅ Updated question ${i + 1}`);
        await sleep(300);
      } catch (err) {
        failCount++;
        console.error(`❌ Failed to update question ${i + 1}:`, err);
      }
    }

    hideOverlay();
    
    if (failCount === 0) {
      showAlert(`Successfully updated all ${successCount} questions!`, "success");
    } else {
      showAlert(`⚠️ Updated ${successCount} questions, ${failCount} failed`, "warning");
    }
    
    setProcessStep("completed");
  };

  const handleNextRange = () => {
    const nextStart = rangeEnd + 1;
    const nextEnd = Math.min(nextStart + 49, allQuestions.length);
    
    setRangeStart(nextStart);
    setRangeEnd(nextEnd);
    setProcessStep("range_select");
    setAiSuggestions([]);
    setQuestions([]);
    setAnalysisMetadata(null);
  };

  const handleStartNew = () => {
    resetState();
    showAlert("Ready for new operation", "info");
  };

  const getPercentage = (current, total) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  // ==================== RENDER ====================

  return (
    <div className="meta-corporate-container">
      {/* Animated Background */}
      <div className="meta-bg-effects">
        <div className="meta-orb meta-orb-1"></div>
        <div className="meta-orb meta-orb-2"></div>
        <div className="meta-orb meta-orb-3"></div>
      </div>

      {/* Enhanced Loading Overlay */}
      {overlay && (
        <div className="meta-overlay">
          <div className="meta-overlay-content">
            {/* Animated AI Robot */}
            <div className="meta-ai-robot">
              <div className="robot-container">
                <div className="robot-head">
                  <div className="robot-antenna">
                    <div className="antenna-ball"></div>
                  </div>
                  <div className="robot-face">
                    <div className="robot-eye robot-eye-left">
                      <div className="eye-pupil"></div>
                    </div>
                    <div className="robot-eye robot-eye-right">
                      <div className="eye-pupil"></div>
                    </div>
                    <div className="robot-mouth"></div>
                  </div>
                </div>
                <div className="robot-body">
                  <div className="body-light body-light-1"></div>
                  <div className="body-light body-light-2"></div>
                  <div className="body-light body-light-3"></div>
                </div>
                <div className="robot-arms">
                  <div className="robot-arm robot-arm-left"></div>
                  <div className="robot-arm robot-arm-right"></div>
                </div>
              </div>
            </div>

            {/* Progress Circle for Analysis */}
            {processStep === "analyzing" && (
              <div className="meta-progress-circle">
                <svg width="140" height="140">
                  <circle 
                    cx="70" cy="70" r="65" 
                    fill="none" 
                    stroke="rgba(102, 126, 234, 0.2)" 
                    strokeWidth="10"
                  />
                  <circle 
                    cx="70" cy="70" r="65" 
                    fill="none" 
                    stroke="url(#progressGradient)" 
                    strokeWidth="10"
                    strokeDasharray={`${(analysisProgress.current / analysisProgress.total) * 408} 408`}
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                    style={{ transition: "stroke-dasharray 0.3s ease" }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#667eea"/>
                      <stop offset="100%" stopColor="#764ba2"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="progress-percentage">
                  {getPercentage(analysisProgress.current, analysisProgress.total)}%
                </div>
              </div>
            )}

            {/* Progress Bar for Updates */}
            {processStep === "updating" && (
              <div className="meta-progress-bar-wrapper">
                <div className="meta-progress-bar">
                  <div 
                    className="meta-progress-fill"
                    style={{ width: `${getPercentage(updateProgress.current, updateProgress.total)}%` }}
                  >
                    <div className="progress-shimmer"></div>
                  </div>
                </div>
                <div className="meta-progress-text">
                  {updateProgress.current} / {updateProgress.total} questions ({getPercentage(updateProgress.current, updateProgress.total)}%)
                </div>
              </div>
            )}

            <div className="meta-overlay-text">{overlayText}</div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <div className={`meta-alert meta-alert-${alert.type}`}>
          {alert.type === "success" && "✅"}
          {alert.type === "warning" && "⚠️"}
          {alert.type === "danger" && "❌"}
          {alert.type === "info" && "ℹ️"}
          <span>{alert.msg}</span>
        </div>
      )}

      {/* Welcome Screen */}
      {ui === "welcome" && (
        <div className="meta-card">
          <div className="meta-header">
            <div className="meta-title-section">
              <div className="meta-ai-badge">🤖</div>
              <div className="meta-title-content">
                <h1>Meta Thinkly-X</h1>
                <div className="meta-subtitle">
                  AI-Powered Question Metadata Editor
                  <div className="meta-ai-indicator">
                    <div className="meta-ai-dot"></div>
                    <span>Powered by Vector AI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="meta-search-section">
            <div className="meta-search-header">
              <div className="meta-search-icon">🔑</div>
              <h3 className="meta-search-title">Enter API Token</h3>
            </div>

            <textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your Examly API Authorization token here..."
              className="meta-input"
              rows={4}
              style={{ fontFamily: "monospace", fontSize: "13px" }}
            />

            <button onClick={saveToken} className="meta-search-button">
              💾 Save Token & Continue
            </button>

            <div style={{ marginTop: "16px", padding: "16px", background: "rgba(102, 126, 234, 0.1)", borderRadius: "12px", border: "1px solid rgba(102, 126, 234, 0.2)" }}>
              <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.6" }}>
                💡 <strong>Tip:</strong> Your token will be saved separately from other tools for enhanced security
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Menu */}
      {ui === "menu" && (
        <div className="meta-card">
          {/* Header with Back and Logout Button */}
          <div className="meta-header">
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
              {processStep !== "search" && (
                <button
                  onClick={handleBack}
                  className="meta-back-button"
                >
                  ← Back
                </button>
              )}
              <div className="meta-title-section">
                <div className="meta-ai-badge">🤖</div>
                <div className="meta-title-content">
                  <h1>Meta Thinkly-X</h1>
                  <div className="meta-subtitle">
                    AI-Powered Question Metadata Editor
                    <div className="meta-ai-indicator">
                      <div className="meta-ai-dot"></div>
                      <span>Vector AI Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={clearToken} className="meta-logout-button">
              🚪 Logout
            </button>
          </div>

          {/* Step 1: Search QB */}
          {processStep === "search" && (
            <div className="meta-search-section">
              <div className="meta-search-header">
                <div className="meta-search-icon">🔍</div>
                <h3 className="meta-search-title">Step 1: Search Question Bank</h3>
              </div>

              <div className="meta-search-bar">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearchQB()}
                  placeholder="Enter QB name to search..."
                  className="meta-input"
                />
              </div>

              <button onClick={handleSearchQB} className="meta-search-button">
                🔍 Search Question Banks
              </button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="meta-results">
                  <div className="meta-results-header">
                    <h4 className="meta-results-title">
                      Search Results
                      <span className="meta-results-count">{searchResults.length}</span>
                    </h4>
                  </div>

                  {searchResults.map((qb) => (
                    <div
                      key={qb.qb_id}
                      className={`meta-result-item ${selectedQB?.qb_id === qb.qb_id ? "selected" : ""}`}
                      onClick={() => handleSelectQB(qb)}
                    >
                      <div className="meta-result-name">{qb.qb_name}</div>
                      <div className="meta-result-meta">
                        <span className="meta-result-tag">📚 {qb.questionCount} questions</span>
                        <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>•</span>
                        <span>{qb.visibility}</span>
                        <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>•</span>
                        <span>{qb.user_role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Range Selection */}
          {processStep === "range_select" && (
            <div className="meta-range-selector">
              <div className="meta-editor-header">
                <div className="meta-editor-icon">📊</div>
                <div className="meta-editor-info">
                  <h3>Select Question Range</h3>
                  <p>{selectedQB?.qb_name} - {allQuestions.length} total questions</p>
                </div>
              </div>

              <div className="meta-range-content">
                <div className="meta-range-inputs">
                  <div className="meta-range-input-group">
                    <label>Start Question</label>
                    <input
                      type="number"
                      min="1"
                      max={allQuestions.length}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                      className="meta-input"
                    />
                  </div>
                  
                  <div style={{ fontSize: "24px", color: "rgba(255, 255, 255, 0.5)", alignSelf: "center" }}>
                    →
                  </div>
                  
                  <div className="meta-range-input-group">
                    <label>End Question</label>
                    <input
                      type="number"
                      min={rangeStart}
                      max={allQuestions.length}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(Math.min(allQuestions.length, parseInt(e.target.value) || rangeEnd))}
                      className="meta-input"
                    />
                  </div>
                </div>

                <div className="meta-range-preview">
                  <div className="range-preview-item">
                    <span>Total Questions:</span>
                    <strong>{allQuestions.length}</strong>
                  </div>
                  <div className="range-preview-item">
                    <span>Selected Range:</span>
                    <strong>{rangeStart} - {rangeEnd}</strong>
                  </div>
                  <div className="range-preview-item">
                    <span>Will Analyze:</span>
                    <strong style={{ color: "#4caf50" }}>{rangeEnd - rangeStart + 1} questions</strong>
                  </div>
                </div>

                <button onClick={handleConfirmRange} className="meta-button meta-button-primary">
                  ✅ Confirm & Load Questions
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Questions Loaded */}
          {processStep === "loaded" && (
            <div className="meta-editor">
              <div className="meta-editor-header">
                <div className="meta-editor-icon">📚</div>
                <div className="meta-editor-info">
                  <h3>{selectedQB?.qb_name}</h3>
                  <p>{questions.length} questions (#{rangeStart}-#{rangeEnd}) ready for AI analysis</p>
                </div>
              </div>

              <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "20px", borderRadius: "12px", border: "2px solid rgba(102, 126, 234, 0.3)", marginBottom: "24px" }}>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                  🤖 Vector AI Analysis Ready
                </div>
                <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.6", marginBottom: "16px" }}>
                  Our Vector AI will analyze each question using semantic similarity matching to suggest the most appropriate <strong>Subject</strong>, <strong>Topic</strong>, and <strong>SubTopic</strong>.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Questions</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#4caf50" }}>{questions.length}</div>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Analysis Method</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#2196f3" }}>Vector Similarity</div>
                  </div>
                </div>
              </div>

              {/* First-time indexing notice */}
              <div style={{ background: "rgba(255, 152, 0, 0.1)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 152, 0, 0.3)", marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", lineHeight: "1.6" }}>
                  ℹ️ <strong>Note:</strong> First-time users may need to wait 3-5 minutes for initial setup. If you see a "setup in progress" message, please wait and try again.
                </div>
              </div>

              <div className="meta-actions">
                <button
                  onClick={handleAnalyzeWithAI}
                  className="meta-button meta-button-primary"
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                >
                  🤖 Analyze with Vector AI
                </button>
                <button
                  onClick={handleStartNew}
                  className="meta-button meta-button-secondary"
                >
                  🔄 Start Over
                </button>
              </div>
            </div>
          )}

          {/* Step 4: AI Suggestions */}
          {processStep === "suggestions" && (
            <div className="meta-editor">
              <div className="meta-editor-header">
                <div className="meta-editor-icon">✨</div>
                <div className="meta-editor-info">
                  <h3>AI Suggestions Ready</h3>
                  <p>{aiSuggestions.length} questions analyzed 
                    {analysisMetadata && ` (${analysisMetadata.mode} mode)`}
                  </p>
                </div>
              </div>

              {/* Analysis Statistics */}
              {analysisMetadata && (
                <div style={{ 
                  background: "rgba(102, 126, 234, 0.1)", 
                  padding: "20px", 
                  borderRadius: "12px", 
                  border: "2px solid rgba(102, 126, 234, 0.3)", 
                  marginBottom: "24px" 
                }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "16px" }}>
                    📊 Analysis Statistics
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                    <div style={{ background: "rgba(76, 175, 80, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(76, 175, 80, 0.3)" }}>
                      <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>High Confidence</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: "#4caf50" }}>
                        {analysisMetadata.high_confidence}
                      </div>
                      <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)" }}>
                        {((analysisMetadata.high_confidence / analysisMetadata.total_questions) * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <div style={{ background: "rgba(255, 152, 0, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 152, 0, 0.3)" }}>
                      <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>Medium Confidence</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: "#ff9800" }}>
                        {analysisMetadata.medium_confidence || 0}
                      </div>
                      <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)" }}>
                        {(((analysisMetadata.medium_confidence || 0) / analysisMetadata.total_questions) * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <div style={{ background: "rgba(244, 67, 54, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(244, 67, 54, 0.3)" }}>
                      <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>Low Confidence</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: "#f44336" }}>
                        {analysisMetadata.low_confidence || 0}
                      </div>
                      <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)" }}>
                        {(((analysisMetadata.low_confidence || 0) / analysisMetadata.total_questions) * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <div style={{ background: "rgba(33, 150, 243, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(33, 150, 243, 0.3)" }}>
                      <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)", marginBottom: "4px" }}>Avg Confidence</div>
                      <div style={{ fontSize: "24px", fontWeight: "800", color: "#2196f3" }}>
                        {analysisMetadata.average_confidence}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ maxHeight: "500px", overflowY: "auto", marginBottom: "24px" }}>
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.q_id || index}
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "2px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "20px",
                      marginBottom: "16px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: "#4facfe" }}>
                            Question #{rangeStart + index}
                          </div>
                        </div>
                        <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "12px" }}>
                          {suggestion.question_preview || suggestion.question || "N/A"}
                        </div>
                      </div>
                      <div style={{
                        background: (suggestion.confidence >= 80) ? "rgba(76, 175, 80, 0.2)" : (suggestion.confidence >= 60) ? "rgba(255, 152, 0, 0.2)" : "rgba(244, 67, 54, 0.2)",
                        color: (suggestion.confidence >= 80) ? "#4caf50" : (suggestion.confidence >= 60) ? "#ff9800" : "#f44336",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "700",
                        border: `1px solid ${(suggestion.confidence >= 80) ? "#4caf50" : (suggestion.confidence >= 60) ? "#ff9800" : "#f44336"}`,
                        flexShrink: 0,
                        marginLeft: "16px"
                      }}>
                        {suggestion.confidence}% 
                        {(suggestion.confidence >= 80) ? " ✅" : (suggestion.confidence >= 60) ? " ⚠️" : " ❌"}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>Subject</div>
                        <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
                          {suggestion.suggested_subject_name || suggestion.subject_name}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>Topic</div>
                        <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
                          {suggestion.suggested_topic_name || suggestion.topic_name}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>SubTopic</div>
                        <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
                          {suggestion.suggested_sub_topic_name || suggestion.sub_topic_name}
                        </div>
                      </div>
                    </div>

                    {suggestion.reasoning && (
                      <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", fontStyle: "italic", background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "6px" }}>
                        💡 {suggestion.reasoning}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="meta-actions">
                <button
                  onClick={handleApplyUpdates}
                  className="meta-button meta-button-primary"
                >
                  ✅ Apply All Updates ({aiSuggestions.length} questions)
                </button>
                <button
                  onClick={handleStartNew}
                  className="meta-button meta-button-secondary"
                >
                  🔄 Start Over
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Completed */}
          {processStep === "completed" && (
            <div className="meta-editor">
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: "80px", marginBottom: "24px" }}>✅</div>
                <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
                  Update Complete!
                </h2>
                <p style={{ fontSize: "16px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "32px" }}>
                  Successfully updated questions #{rangeStart}-#{rangeEnd}
                </p>

                <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={handleStartNew}
                    className="meta-button meta-button-primary"
                  >
                    🔄 Start New Operation
                  </button>
                  
                  {rangeEnd < allQuestions.length && (
                    <button
                      onClick={handleNextRange}
                      className="meta-button meta-button-primary"
                      style={{ background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)" }}
                    >
                      ➡️ Next Range ({rangeEnd + 1}-{Math.min(rangeEnd + 50, allQuestions.length)})
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}