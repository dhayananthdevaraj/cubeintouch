// import { useState } from "react";
// import { DEPARTMENT_IDS } from "../config";
// import "./MetaCorporate.css";

// const API = "https://api.examly.io";
// const AI_API = "http://localhost:4000";

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
//   const [questions, setQuestions] = useState([]);
//   const [aiSuggestions, setAiSuggestions] = useState([]);
//   const [processStep, setProcessStep] = useState("search"); // search, analyzing, suggestions, updating, completed

//   // Domain Data
//   const [subjects, setSubjects] = useState([]);
//   const [topics, setTopics] = useState([]);
//   const [subTopics, setSubTopics] = useState([]);

//   // Update Progress
//   const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });

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
//     setQuestions([]);
//     setAiSuggestions([]);
//     setProcessStep("search");
//     setUpdateProgress({ current: 0, total: 0 });
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

//   async function fetchDomainData() {
//     const res = await fetch(`${API}/api/questiondomain/getallsubjects`, {
//       method: "GET",
//       headers: { Authorization: token }
//     });

//     const json = await res.json();
    
//     if (json.statusCode === 200 && json.data) {
//       setSubjects(json.data.subject || []);
//       setTopics(json.data.topic || []);
//       setSubTopics(json.data.sub_topic || []);
//     }
//   }

//   async function analyzeWithAI(questions) {
//     const res = await fetch(`${AI_API}/analyze-metadata`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         questions: questions,
//         availableSubjects: subjects,
//         availableTopics: topics,
//         availableSubTopics: subTopics
//       })
//     });

//     if (!res.ok) {
//       throw new Error("AI analysis failed");
//     }

//     return await res.json();
//   }

//   async function updateQuestionMetadata(qId, metadata) {
//     const res = await fetch(`${API}/api/update_mcq_question/${qId}`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         subject_id: metadata.subject_id,
//         topic_id: metadata.topic_id,
//         sub_topic_id: metadata.sub_topic_id
//       })
//     });

//     const json = await res.json();
    
//     if (json.statuscode !== 200 && !json.data?.success) {
//       throw new Error(json.data?.message || "Failed to update question");
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
//       // Fetch domain data
//       await fetchDomainData();
      
//       // Fetch all questions
//       const fetchedQuestions = await fetchAllQuestions(qb.qb_id);
//       setQuestions(fetchedQuestions);
      
//       hideOverlay();
//       showAlert(`✅ Loaded ${fetchedQuestions.length} questions from ${qb.qb_name}`, "success");
//       setProcessStep("loaded");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error loading questions: " + err.message, "danger");
//       console.error(err);
//     }
//   };

//  const handleAnalyzeWithAI = async () => {
//   if (questions.length === 0) {
//     showAlert("No questions to analyze", "warning");
//     return;
//   }

//   setProcessStep("analyzing");
//   showOverlay(`🤖 AI is analyzing ${questions.length} questions in batches...`);

//   try {
//     const suggestions = await analyzeWithAI(questions);
//     setAiSuggestions(suggestions);
//     hideOverlay();
//     showAlert(`✅ AI analysis complete! ${suggestions.length} suggestions ready`, "success");
//     setProcessStep("suggestions");
//   } catch (err) {
//     hideOverlay();
//     showAlert("AI analysis failed: " + err.message, "danger");
//     console.error(err);
//     setProcessStep("loaded");
//   }
// };
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
      
//       showOverlay(`📝 Updating question ${i + 1}/${aiSuggestions.length}...`);
//       setUpdateProgress({ current: i + 1, total: aiSuggestions.length });

//       try {
//         await updateQuestionMetadata(suggestion.q_id, {
//           subject_id: suggestion.suggested_subject_id,
//           topic_id: suggestion.suggested_topic_id,
//           sub_topic_id: suggestion.suggested_sub_topic_id
//         });
        
//         successCount++;
//         console.log(`✅ Updated question ${i + 1}`);
//         await sleep(300); // Rate limiting
//       } catch (err) {
//         failCount++;
//         console.error(`❌ Failed to update question ${i + 1}:`, err);
//       }
//     }

//     hideOverlay();
    
//     if (failCount === 0) {
//       showAlert(`✅ Successfully updated all ${successCount} questions!`, "success");
//     } else {
//       showAlert(`⚠️ Updated ${successCount} questions, ${failCount} failed`, "warning");
//     }
    
//     setProcessStep("completed");
//   };

//   const handleStartNew = () => {
//     resetState();
//     showAlert("Ready for new operation", "info");
//   };

//   const handleOverrideSuggestion = (index, field, value) => {
//     const updated = [...aiSuggestions];
//     updated[index][field] = value;
//     setAiSuggestions(updated);
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

//       {/* Loading Overlay */}
//       {overlay && (
//         <div className="meta-overlay">
//           <div className="meta-overlay-content">
//             <div className="meta-spinner"></div>
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
//                     <span>Powered by Groq AI</span>
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
//           {/* Header */}
//           <div className="meta-header">
//             <div className="meta-title-section">
//               <div className="meta-ai-badge">🤖</div>
//               <div className="meta-title-content">
//                 <h1>Meta Thinkly-X</h1>
//                 <div className="meta-subtitle">
//                   AI-Powered Question Metadata Editor
//                   <div className="meta-ai-indicator">
//                     <div className="meta-ai-dot"></div>
//                     <span>AI Active</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <button
//               onClick={clearToken}
//               className="meta-button meta-button-secondary"
//               style={{ padding: "12px 24px", fontSize: "14px" }}
//             >
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

//           {/* Step 2: Questions Loaded - Ready for AI */}
//           {processStep === "loaded" && (
//             <div className="meta-editor">
//               <div className="meta-editor-header">
//                 <div className="meta-editor-icon">📚</div>
//                 <div className="meta-editor-info">
//                   <h3>{selectedQB.qb_name}</h3>
//                   <p>{questions.length} questions loaded and ready for AI analysis</p>
//                 </div>
//               </div>

//               <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "20px", borderRadius: "12px", border: "2px solid rgba(102, 126, 234, 0.3)", marginBottom: "24px" }}>
//                 <div style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
//                   🤖 AI Analysis Ready
//                 </div>
//                 <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.6", marginBottom: "16px" }}>
//                   Our AI will analyze each question and suggest the most appropriate <strong>Subject</strong>, <strong>Topic</strong>, and <strong>SubTopic</strong> based on the question content.
//                 </div>
//                 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
//                   <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
//                     <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Questions</div>
//                     <div style={{ fontSize: "24px", fontWeight: "800", color: "#4caf50" }}>{questions.length}</div>
//                   </div>
//                   <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
//                     <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Subjects Available</div>
//                     <div style={{ fontSize: "24px", fontWeight: "800", color: "#2196f3" }}>{subjects.length}</div>
//                   </div>
//                   <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
//                     <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Topics Available</div>
//                     <div style={{ fontSize: "24px", fontWeight: "800", color: "#ff9800" }}>{topics.length}</div>
//                   </div>
//                   <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
//                     <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>SubTopics Available</div>
//                     <div style={{ fontSize: "24px", fontWeight: "800", color: "#9c27b0" }}>{subTopics.length}</div>
//                   </div>
//                 </div>
//               </div>

//               <div className="meta-actions">
//                 <button
//                   onClick={handleAnalyzeWithAI}
//                   className="meta-button meta-button-primary"
//                   style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
//                 >
//                   🤖 Analyze with AI
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

//           {/* Step 3: AI Suggestions */}
//           {processStep === "suggestions" && (
//             <div className="meta-editor">
//               <div className="meta-editor-header">
//                 <div className="meta-editor-icon">✨</div>
//                 <div className="meta-editor-info">
//                   <h3>AI Suggestions Ready</h3>
//                   <p>{aiSuggestions.length} questions analyzed with confidence scores</p>
//                 </div>
//               </div>

//               <div style={{ maxHeight: "500px", overflowY: "auto", marginBottom: "24px" }}>
//                 {aiSuggestions.map((suggestion, index) => (
//                   <div
//                     key={suggestion.q_id}
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
//                         <div style={{ fontSize: "14px", fontWeight: "700", color: "#4facfe", marginBottom: "8px" }}>
//                           Question #{index + 1}
//                         </div>
//                         <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "12px" }}>
//                           {suggestion.question_preview}
//                         </div>
//                       </div>
//                       <div style={{
//                         background: suggestion.confidence >= 80 ? "rgba(76, 175, 80, 0.2)" : suggestion.confidence >= 60 ? "rgba(255, 152, 0, 0.2)" : "rgba(244, 67, 54, 0.2)",
//                         color: suggestion.confidence >= 80 ? "#4caf50" : suggestion.confidence >= 60 ? "#ff9800" : "#f44336",
//                         padding: "6px 12px",
//                         borderRadius: "8px",
//                         fontSize: "13px",
//                         fontWeight: "700",
//                         border: `1px solid ${suggestion.confidence >= 80 ? "#4caf50" : suggestion.confidence >= 60 ? "#ff9800" : "#f44336"}`,
//                         flexShrink: 0,
//                         marginLeft: "16px"
//                       }}>
//                         {suggestion.confidence}% confident
//                       </div>
//                     </div>

//                     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px", marginBottom: "12px" }}>
//                       <div>
//                         <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>Subject</div>
//                         <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
//                           {suggestion.suggested_subject_name}
//                         </div>
//                       </div>
//                       <div>
//                         <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>Topic</div>
//                         <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
//                           {suggestion.suggested_topic_name}
//                         </div>
//                       </div>
//                       <div>
//                         <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>SubTopic</div>
//                         <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
//                           {suggestion.suggested_sub_topic_name}
//                         </div>
//                       </div>
//                     </div>

//                     <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", fontStyle: "italic", background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "6px" }}>
//                       💡 {suggestion.reasoning}
//                     </div>
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

//           {/* Step 4: Updating Progress */}
//           {processStep === "updating" && (
//             <div className="meta-editor">
//               <div className="meta-editor-header">
//                 <div className="meta-editor-icon">⚙️</div>
//                 <div className="meta-editor-info">
//                   <h3>Updating Questions...</h3>
//                   <p>Please wait while we apply the metadata changes</p>
//                 </div>
//               </div>

//               <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
//                 <div style={{ marginBottom: "16px" }}>
//                   <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
//                     <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)" }}>Progress</span>
//                     <span style={{ fontSize: "14px", fontWeight: "700", color: "#4caf50" }}>
//                       {updateProgress.current} / {updateProgress.total}
//                     </span>
//                   </div>
//                   <div style={{ width: "100%", height: "12px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "6px", overflow: "hidden" }}>
//                     <div
//                       style={{
//                         width: `${(updateProgress.current / updateProgress.total) * 100}%`,
//                         height: "100%",
//                         background: "linear-gradient(90deg, #4caf50, #45a049)",
//                         transition: "width 0.3s ease",
//                         borderRadius: "6px"
//                       }}
//                     ></div>
//                   </div>
//                 </div>

//                 <div style={{ textAlign: "center", color: "rgba(255, 255, 255, 0.6)", fontSize: "13px" }}>
//                   ⏳ Updating question metadata... Please don't close this page.
//                 </div>
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
//                   All question metadata has been successfully updated with AI suggestions
//                 </p>

//                 <button
//                   onClick={handleStartNew}
//                   className="meta-button meta-button-primary"
//                   style={{ maxWidth: "300px", margin: "0 auto" }}
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

import { useState } from "react";
import { DEPARTMENT_IDS } from "../config";
import "./MetaCorporate.css";

const API = "https://api.examly.io";
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
  const [questions, setQuestions] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [processStep, setProcessStep] = useState("search");

  // Domain Data
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subTopics, setSubTopics] = useState([]);

  // Update Progress
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });

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
    setQuestions([]);
    setAiSuggestions([]);
    setProcessStep("search");
    setUpdateProgress({ current: 0, total: 0 });
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

  async function fetchDomainData() {
    const res = await fetch(`${API}/api/questiondomain/getallsubjects`, {
      method: "GET",
      headers: { Authorization: token }
    });

    const json = await res.json();
    
    if (json.statusCode === 200 && json.data) {
      setSubjects(json.data.subject || []);
      setTopics(json.data.topic || []);
      setSubTopics(json.data.sub_topic || []);
    }
  }

  async function analyzeWithAI(questions) {
    const res = await fetch(`${AI_API}/analyze-metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: questions,
        availableSubjects: subjects,
        availableTopics: topics,
        availableSubTopics: subTopics
      })
    });

    if (!res.ok) {
      throw new Error("AI analysis failed");
    }

    return await res.json();
  }

  async function updateQuestionMetadata(qId, metadata) {
    const res = await fetch(`${API}/api/update_mcq_question/${qId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        subject_id: metadata.subject_id,
        topic_id: metadata.topic_id,
        sub_topic_id: metadata.sub_topic_id
      })
    });

    const json = await res.json();
    
    if (json.statuscode !== 200 && !json.data?.success) {
      throw new Error(json.data?.message || "Failed to update question");
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
      await fetchDomainData();
      const fetchedQuestions = await fetchAllQuestions(qb.qb_id);
      setQuestions(fetchedQuestions);
      
      hideOverlay();
      showAlert(`✅ Loaded ${fetchedQuestions.length} questions from ${qb.qb_name}`, "success");
      setProcessStep("loaded");
    } catch (err) {
      hideOverlay();
      showAlert("Error loading questions: " + err.message, "danger");
      console.error(err);
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (questions.length === 0) {
      showAlert("No questions to analyze", "warning");
      return;
    }

    setProcessStep("analyzing");
    showOverlay(`🤖 AI is analyzing ${questions.length} questions in batches...`);

    try {
      const suggestions = await analyzeWithAI(questions);
      setAiSuggestions(suggestions);
      hideOverlay();
      showAlert(`✅ AI analysis complete! ${suggestions.length} suggestions ready`, "success");
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
      
      showOverlay(`📝 Updating question ${i + 1}/${aiSuggestions.length}...`);
      setUpdateProgress({ current: i + 1, total: aiSuggestions.length });

      try {
        await updateQuestionMetadata(suggestion.q_id, {
          subject_id: suggestion.suggested_subject_id,
          topic_id: suggestion.suggested_topic_id,
          sub_topic_id: suggestion.suggested_sub_topic_id
        });
        
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
      showAlert(`✅ Successfully updated all ${successCount} questions!`, "success");
    } else {
      showAlert(`⚠️ Updated ${successCount} questions, ${failCount} failed`, "warning");
    }
    
    setProcessStep("completed");
  };

  const handleStartNew = () => {
    resetState();
    showAlert("Ready for new operation", "info");
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

      {/* Loading Overlay */}
      {overlay && (
        <div className="meta-overlay">
          <div className="meta-overlay-content">
            <div className="meta-spinner"></div>
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
                    <span>Powered by AI</span>
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
          {/* Header with Fixed Logout Button */}
          <div className="meta-header">
            <div className="meta-title-section">
              <div className="meta-ai-badge">🤖</div>
              <div className="meta-title-content">
                <h1>Meta Thinkly-X</h1>
                <div className="meta-subtitle">
                  AI-Powered Question Metadata Editor
                  <div className="meta-ai-indicator">
                    <div className="meta-ai-dot"></div>
                    <span>AI Active</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={clearToken}
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                background: "rgba(244, 67, 54, 0.1)",
                color: "#f44336",
                border: "1px solid rgba(244, 67, 54, 0.3)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(244, 67, 54, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(244, 67, 54, 0.1)";
              }}
            >
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

          {/* Step 2: Questions Loaded - Ready for AI */}
          {processStep === "loaded" && (
            <div className="meta-editor">
              <div className="meta-editor-header">
                <div className="meta-editor-icon">📚</div>
                <div className="meta-editor-info">
                  <h3>{selectedQB.qb_name}</h3>
                  <p>{questions.length} questions loaded and ready for AI analysis</p>
                </div>
              </div>

              <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "20px", borderRadius: "12px", border: "2px solid rgba(102, 126, 234, 0.3)", marginBottom: "24px" }}>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                  🤖 AI Analysis Ready
                </div>
                <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", lineHeight: "1.6", marginBottom: "16px" }}>
                  Our AI will analyze each question and suggest the most appropriate <strong>Subject</strong>, <strong>Topic</strong>, and <strong>SubTopic</strong> based on the question content.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Questions</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#4caf50" }}>{questions.length}</div>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Subjects Available</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#2196f3" }}>{subjects.length}</div>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>Topics Available</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#ff9800" }}>{topics.length}</div>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "4px" }}>SubTopics Available</div>
                    <div style={{ fontSize: "24px", fontWeight: "800", color: "#9c27b0" }}>{subTopics.length}</div>
                  </div>
                </div>
              </div>

              <div className="meta-actions">
                <button
                  onClick={handleAnalyzeWithAI}
                  className="meta-button meta-button-primary"
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                >
                  🤖 Analyze with AI
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

          {/* Step 3: AI Suggestions */}
          {processStep === "suggestions" && (
            <div className="meta-editor">
              <div className="meta-editor-header">
                <div className="meta-editor-icon">✨</div>
                <div className="meta-editor-info">
                  <h3>AI Suggestions Ready</h3>
                  <p>{aiSuggestions.length} questions analyzed with confidence scores</p>
                </div>
              </div>

              <div style={{ maxHeight: "500px", overflowY: "auto", marginBottom: "24px" }}>
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.q_id}
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
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#4facfe", marginBottom: "8px" }}>
                          Question #{index + 1}
                        </div>
                        <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", marginBottom: "12px" }}>
                          {suggestion.question_preview}
                        </div>
                      </div>
                      <div style={{
                        background: suggestion.confidence >= 80 ? "rgba(76, 175, 80, 0.2)" : suggestion.confidence >= 60 ? "rgba(255, 152, 0, 0.2)" : "rgba(244, 67, 54, 0.2)",
                        color: suggestion.confidence >= 80 ? "#4caf50" : suggestion.confidence >= 60 ? "#ff9800" : "#f44336",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "700",
                        border: `1px solid ${suggestion.confidence >= 80 ? "#4caf50" : suggestion.confidence >= 60 ? "#ff9800" : "#f44336"}`,
                        flexShrink: 0,
                        marginLeft: "16px"
                      }}>
                        {suggestion.confidence}% 
                        {suggestion.confidence >= 80 ? " ✅" : suggestion.confidence >= 60 ? " ⚠️" : " ❌"}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>Subject</div>
                        <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
                          {suggestion.suggested_subject_name}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>Topic</div>
                        <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
                          {suggestion.suggested_topic_name}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px" }}>SubTopic</div>
                        <div style={{ background: "rgba(102, 126, 234, 0.1)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#a8b2ff", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
                          {suggestion.suggested_sub_topic_name}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", fontStyle: "italic", background: "rgba(255, 255, 255, 0.03)", padding: "10px", borderRadius: "6px" }}>
                      💡 {suggestion.reasoning}
                    </div>
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

          {/* Step 4: Updating Progress */}
          {processStep === "updating" && (
            <div className="meta-editor">
              <div className="meta-editor-header">
                <div className="meta-editor-icon">⚙️</div>
                <div className="meta-editor-info">
                  <h3>Updating Questions...</h3>
                  <p>Please wait while we apply the metadata changes</p>
                </div>
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)" }}>Progress</span>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#4caf50" }}>
                      {updateProgress.current} / {updateProgress.total}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "12px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "6px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(updateProgress.current / updateProgress.total) * 100}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #4caf50, #45a049)",
                        transition: "width 0.3s ease",
                        borderRadius: "6px"
                      }}
                    ></div>
                  </div>
                </div>

                <div style={{ textAlign: "center", color: "rgba(255, 255, 255, 0.6)", fontSize: "13px" }}>
                  ⏳ Updating question metadata... Please don't close this page.
                </div>
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
                  All question metadata has been successfully updated with AI suggestions
                </p>

                <button
                  onClick={handleStartNew}
                  className="meta-button meta-button-primary"
                  style={{ maxWidth: "300px", margin: "0 auto" }}
                >
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