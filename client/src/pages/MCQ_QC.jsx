// // // src/pages/MCQ_QC.jsx
// // import { useState } from "react";
// // import { DEPARTMENT_IDS } from "../config";

// // const API_BASE = "https://api.examly.io/api";
// // const QC_API = "https://cubeintouch-backend.onrender.com/qc";

// // // Debug: Check if URLs are valid
// // console.log("API_BASE:", API_BASE);
// // console.log("QC_API:", QC_API);

// // export default function MCQ_QC() {

// // // 🔧 Extract ONLY the JWT from stored raw request
// // function extractAuthToken(raw) {
// //   if (!raw) return "";

// //   const match = raw.match(/authorization\s+([A-Za-z0-9\-_.]+)/i);
// //   return match ? match[1] : "";
// // }


// //     const [token, setToken] = useState(() => {
// //     const raw = localStorage.getItem("examly_token") || "";
// //     return extractAuthToken(raw);
// //     });
// //   const [testName, setTestName] = useState("");
// //   const [status, setStatus] = useState("");
// //   const [alert, setAlert] = useState(null);
// //   const [results, setResults] = useState([]);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [stats, setStats] = useState(null);

// //   const showAlert = (msg, type = "warning") => {
// //     setAlert({ msg, type });
// //     setTimeout(() => setAlert(null), 4000);
// //   };

// //   // Helper functions
// //   const stripHTML = (html) => {
// //     return html.replace(/<[^>]*>/g, "").trim();
// //   };

// //   const splitQuestionAndCode = (raw) => {
// //     if (!raw.includes("$$$examly")) {
// //       return { question: stripHTML(raw), code: "" };
// //     }
// //     const [q, code] = raw.split("$$$examly");
// //     return { question: stripHTML(q), code: code.trim() };
// //   };

// //   const parseOptions = (optionsStr) => {
// //     try {
// //       return JSON.parse(optionsStr || "[]").map((o) => stripHTML(o.text));
// //     } catch {
// //       return [];
// //     }
// //   };

// //   const parseExistingAnswer = (answerStr) => {
// //     try {
// //       const ans = JSON.parse(answerStr || "{}").args?.[0] || "";
// //       return stripHTML(ans);
// //     } catch {
// //       return "";
// //     }
// //   };

// //   // Batch QC
// //   const runQcInBatches = async (mcqs, batchSize = 4) => {
// //     const allResults = [];

// //     for (let i = 0; i < mcqs.length; i += batchSize) {
// //       const batch = mcqs.slice(i, i + batchSize);
// //       const start = i + 1;
// //       const end = Math.min(i + batchSize, mcqs.length);

// //       setStatus(`🔍 QC ${start}-${end} / ${mcqs.length}`);

// //       try {
// //         console.log(`Sending batch ${Math.floor(i / batchSize) + 1}:`, batch);

// //         const response = await fetch(QC_API, {
// //           method: "POST",
// //           headers: { "Content-Type": "application/json" },
// //           body: JSON.stringify({ mcqs: batch })
// //         });

// //         if (!response.ok) {
// //           const errText = await response.text();
// //           console.error(`Backend error (${response.status}):`, errText);
// //           throw new Error(`Backend returned ${response.status}: ${errText}`);
// //         }

// //         const batchData = await response.json();
        
// //         if (!Array.isArray(batchData)) {
// //           console.error("Invalid response format:", batchData);
// //           throw new Error("Backend response is not an array");
// //         }

// //         allResults.push(...batchData);
// //         console.log(`Batch processed:`, batchData);

// //         // Small delay between batches
// //         await new Promise((r) => setTimeout(r, 800));
// //       } catch (err) {
// //         console.error(`Batch error:`, err);
// //         showAlert(`❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${err.message}`, "danger");
// //         throw err;
// //       }
// //     }

// //     return allResults;
// //   };

// //   // Main QC function
// //   const handleQC = async () => {
// //     if (!testName.trim()) {
// //       showAlert("Please enter a test name", "warning");
// //       return;
// //     }

// //     if (!token) {
// //       showAlert("Token missing. Please go to Course Finder and authenticate.", "danger");
// //       return;
// //     }

// //     setIsLoading(true);
// //     setStatus("🔎 Finding test...");
// //     setResults([]);
// //     setStats(null);

// //     try {
// //       // Validate backend is running
// //       try {
// //         const healthRes = await fetch(QC_API.replace("/qc", "/health"), {
// //           method: "GET"
// //         });
// //         if (!healthRes.ok) {
// //           showAlert("❌ Backend not running on port 4000. Please start: npm run dev in backend folder", "danger");
// //           setIsLoading(false);
// //           return;
// //         }
// //       } catch (healthErr) {
// //         console.warn("Backend health check failed:", healthErr.message);
// //         showAlert("⚠️ Cannot connect to backend on https://cubeintouch-backend.onrender.com. Make sure it's running!", "danger");
// //         setIsLoading(false);
// //         return;
// //       }

// //       // Find test
// //       const searchRes = await fetch(API_BASE + "/v2/tests/filter", {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           Authorization: token
// //         },
// //         body: JSON.stringify({
// //           search: testName,
// //           page: 1,
// //           limit: 10,
// //           branch_id: "All",
// //           department_id: DEPARTMENT_IDS,
// //           mainDepartmentUser: true
// //         })
// //       });

// //       if (!searchRes.ok) {
// //         const errData = await searchRes.json().catch(() => ({}));
// //         showAlert("❌ API Error: " + (errData.message || searchRes.statusText), "danger");
// //         setIsLoading(false);
// //         return;
// //       }

// //       const searchData = await searchRes.json();
// //       const test = searchData?.data?.[0];

// //       if (!test) {
// //         showAlert("❌ Test not found. Check test name and try again.", "danger");
// //         setIsLoading(false);
// //         return;
// //       }

// //       setStatus(`📋 Fetching MCQs from: ${test.testName || testName}...`);

// //       // Fetch questions
// //       const questionsRes = await fetch(API_BASE + "/questions/test/" + test.testId, {
// //         headers: { Authorization: token }
// //       });

// //       if (!questionsRes.ok) {
// //         showAlert("❌ Failed to fetch MCQs from test", "danger");
// //         setIsLoading(false);
// //         return;
// //       }

// //       const qjson = await questionsRes.json();
// //       const LIST = qjson?.[0]?.non_group_questions || [];

// //       if (!LIST.length) {
// //         showAlert("❌ No MCQs found in test", "danger");
// //         setIsLoading(false);
// //         return;
// //       }

// //       // Parse MCQs
// //       const mcqs = LIST.map((q) => {
// //         if (!q.mcq_questions) return null;

// //         const { question, code } = splitQuestionAndCode(q.question_data || "");
// //         const options = parseOptions(q.mcq_questions.options);
// //         const existingAnswer = parseExistingAnswer(q.mcq_questions.answer);

// //         return {
// //           question,
// //           code,
// //           options,
// //           existingAnswer,
// //           difficulty: q.manual_difficulty || "NA",
// //           topic: q.topic?.name || "Unknown"
// //         };
// //       }).filter(Boolean);

// //       if (!mcqs.length) {
// //         showAlert("❌ No valid MCQs found", "danger");
// //         setIsLoading(false);
// //         return;
// //       }

// //       console.log(`Prepared ${mcqs.length} MCQs for QC`, mcqs);
// //       setStatus(`⚡ Running QC on ${mcqs.length} MCQs...`);

// //       // Run QC
// //       const report = await runQcInBatches(mcqs, 4);

// //       // Calculate stats
// //       const correct = report.filter((r) => r.isCorrect).length;
// //       const incorrect = report.filter((r) => !r.isCorrect).length;
// //       const avgScore = (
// //         report.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / report.length
// //       ).toFixed(1);

// //       setStats({ correct, incorrect, total: report.length, avgScore });
// //       setResults(report);
// //       showAlert(`✅ QC Completed! ${correct} correct, ${incorrect} issues found`, "success");
// //     } catch (err) {
// //       showAlert("Error: " + err.message, "danger");
// //       console.error("Full error:", err);
// //     } finally {
// //       setIsLoading(false);
// //       setStatus("");
// //     }
// //   };

// //   const downloadReport = () => {
// //     if (!results.length) {
// //       showAlert("No results to download", "warning");
// //       return;
// //     }

// //     const csv =
// //       "Q#,Question,Correct?,Quality Score,Issues,Suggested Answer\n" +
// //       results
// //         .map(
// //           (q, i) =>
// //             `"${i + 1}","${q.question.replace(/"/g, '""')}","${q.isCorrect ? "✓" : "✗"}","${q.qualityScore}","${(q.issues || []).join("; ").replace(/"/g, '""')}","${(q.correctAnswer || "").replace(/"/g, '""')}"`
// //         )
// //         .join("\n");

// //     const blob = new Blob([csv], { type: "text/csv" });
// //     const url = URL.createObjectURL(blob);
// //     const a = document.createElement("a");
// //     a.href = url;
// //     a.download = `${testName}_qc_${new Date().toISOString().split("T")[0]}.csv`;
// //     a.click();
// //     URL.revokeObjectURL(url);
// //     showAlert("✅ Report downloaded", "success");
// //   };

// //   return (
// //     <div style={styles.container}>
// //       {/* Alert */}
// //       {alert && (
// //         <div style={{ ...styles.alert, ...styles[`alert_${alert.type}`] }}>
// //           {alert.msg}
// //         </div>
// //       )}

// //       {/* Input Section */}
// //       <div style={styles.card}>
// //         <h2 style={styles.title}>🔍 MCQ AI Quality Check</h2>

// //         <div style={styles.formGroup}>
// //           <label style={styles.label}>Test Name</label>
// //           <input
// //             type="text"
// //             value={testName}
// //             onChange={(e) => setTestName(e.target.value)}
// //             onKeyPress={(e) => e.key === "Enter" && handleQC()}
// //             placeholder="Enter test name..."
// //             style={styles.input}
// //             disabled={isLoading}
// //           />
// //         </div>

// //         <button
// //           onClick={handleQC}
// //           disabled={isLoading || !token}
// //           style={{ ...styles.button, ...styles.buttonPrimary, ...(isLoading ? styles.buttonDisabled : {}) }}
// //         >
// //           {isLoading ? "🔄 Processing..." : "🚀 Analyze MCQs"}
// //         </button>

// //         {!token && (
// //           <div style={styles.warning}>
// //             ⚠️ No authentication token. Please use the Course Finder to authenticate first.
// //           </div>
// //         )}

// //         {status && <div style={styles.status}>{status}</div>}
// //       </div>

// //       {/* Stats Section */}
// //       {stats && (
// //         <div style={styles.card}>
// //           <h3 style={styles.subtitle}>📊 Summary</h3>
// //           <div style={styles.statsGrid}>
// //             <div style={styles.statBox}>
// //               <div style={styles.statLabel}>Total MCQs</div>
// //               <div style={styles.statValue}>{stats.total}</div>
// //             </div>
// //             <div style={styles.statBox}>
// //               <div style={styles.statLabel}>✅ Correct</div>
// //               <div style={{ ...styles.statValue, color: "#28a745" }}>{stats.correct}</div>
// //             </div>
// //             <div style={styles.statBox}>
// //               <div style={styles.statLabel}>❌ Issues</div>
// //               <div style={{ ...styles.statValue, color: "#dc3545" }}>{stats.incorrect}</div>
// //             </div>
// //             <div style={styles.statBox}>
// //               <div style={styles.statLabel}>Quality Score</div>
// //               <div style={styles.statValue}>{stats.avgScore}/10</div>
// //             </div>
// //           </div>

// //           <button
// //             onClick={downloadReport}
// //             style={{ ...styles.button, ...styles.buttonSuccess, marginTop: "16px" }}
// //           >
// //             📥 Download Report
// //           </button>
// //         </div>
// //       )}

// //       {/* Results Section */}
// //       {results.length > 0 && (
// //         <div style={styles.card}>
// //           <h3 style={styles.subtitle}>🎯 Detailed Results</h3>
// //           <div style={styles.resultsList}>
// //             {results.map((q, i) => (
// //               <div key={i} style={styles.resultItem}>
// //                 <div style={styles.resultHeader}>
// //                   <span style={styles.resultNumber}>Q{i + 1}</span>
// //                   <span style={styles.resultScore}>
// //                     {q.isCorrect ? "✅" : "⚠️"} {q.qualityScore}/10
// //                   </span>
// //                 </div>

// //                 <div style={styles.resultQuestion}>{q.question}</div>

// //                 {q.issues && q.issues.length > 0 && (
// //                   <div style={styles.issuesList}>
// //                     <strong>Issues:</strong>
// //                     <ul style={styles.ul}>
// //                       {q.issues.map((issue, j) => (
// //                         <li key={j}>{issue}</li>
// //                       ))}
// //                     </ul>
// //                   </div>
// //                 )}

// //                 {!q.isCorrect && q.correctAnswer && (
// //                   <div style={styles.suggestion}>
// //                     <strong>✏️ Suggested Answer:</strong> {q.correctAnswer}
// //                   </div>
// //                 )}
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       )}

// //       {/* Empty State */}
// //       {!results.length && !isLoading && !status && (
// //         <div style={styles.emptyState}>
// //           <div style={styles.emptyIcon}>📝</div>
// //           <p>Enter a test name and click "Analyze MCQs" to get started</p>
          
// //           {/* Debugging Info */}
// //           <div style={styles.debugSection}>
// //             <h4>🔧 Troubleshooting</h4>
// //             <div style={styles.debugInfo}>
// //               <p><strong>Backend Status:</strong> {token ? "✅ Token loaded" : "❌ No token"}</p>
// //               <details>
// //                 <summary>Click to see detailed debug info</summary>
// //                 <pre style={styles.debugPre}>
// // Token present: {!!token}
// // API endpoints configured: Yes
// // Browser: {navigator.userAgent.split(" ").slice(-1)[0]}
// //                 </pre>
// //               </details>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // // Styles
// // const styles = {
// //   container: {
// //     maxWidth: "900px",
// //     margin: "0 auto",
// //     padding: "20px",
// //     fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
// //   },
// //   alert: {
// //     padding: "12px 16px",
// //     borderRadius: "8px",
// //     marginBottom: "16px",
// //     fontSize: "14px",
// //     fontWeight: "500"
// //   },
// //   alert_success: { background: "#d4edda", color: "#155724" },
// //   alert_warning: { background: "#fff3cd", color: "#856404" },
// //   alert_danger: { background: "#f8d7da", color: "#721c24" },
// //   card: {
// //     background: "white",
// //     borderRadius: "12px",
// //     padding: "24px",
// //     marginBottom: "20px",
// //     boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
// //     border: "1px solid #e9ecef"
// //   },
// //   title: {
// //     fontSize: "24px",
// //     fontWeight: "700",
// //     marginBottom: "20px",
// //     color: "#1a1a1a"
// //   },
// //   subtitle: {
// //     fontSize: "16px",
// //     fontWeight: "700",
// //     marginBottom: "16px",
// //     color: "#1a1a1a"
// //   },
// //   formGroup: { marginBottom: "16px" },
// //   label: {
// //     display: "block",
// //     fontWeight: "600",
// //     fontSize: "12px",
// //     textTransform: "uppercase",
// //     color: "#495057",
// //     marginBottom: "8px"
// //   },
// //   input: {
// //     width: "100%",
// //     padding: "12px",
// //     border: "1.5px solid #dee2e6",
// //     borderRadius: "8px",
// //     fontSize: "14px",
// //     boxSizing: "border-box"
// //   },
// //   button: {
// //     width: "100%",
// //     padding: "12px",
// //     fontSize: "14px",
// //     fontWeight: "600",
// //     border: "none",
// //     borderRadius: "8px",
// //     cursor: "pointer",
// //     transition: "all 0.2s ease"
// //   },
// //   buttonPrimary: {
// //     background: "linear-gradient(135deg, #0d6efd 0%, #0c5cde 100%)",
// //     color: "white"
// //   },
// //   buttonSuccess: {
// //     background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
// //     color: "white"
// //   },
// //   buttonDisabled: { opacity: "0.5", cursor: "not-allowed" },
// //   warning: {
// //     background: "#fff3cd",
// //     border: "1px solid #ffc107",
// //     color: "#856404",
// //     padding: "12px",
// //     borderRadius: "8px",
// //     fontSize: "13px",
// //     marginTop: "12px"
// //   },
// //   status: {
// //     marginTop: "12px",
// //     padding: "12px",
// //     background: "#f8f9fa",
// //     borderRadius: "8px",
// //     color: "#6c757d",
// //     fontSize: "13px"
// //   },
// //   statsGrid: {
// //     display: "grid",
// //     gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
// //     gap: "12px",
// //     marginBottom: "16px"
// //   },
// //   statBox: {
// //     background: "#f8f9fa",
// //     border: "1px solid #e9ecef",
// //     borderRadius: "8px",
// //     padding: "16px",
// //     textAlign: "center"
// //   },
// //   statLabel: {
// //     fontSize: "12px",
// //     color: "#6c757d",
// //     marginBottom: "8px"
// //   },
// //   statValue: {
// //     fontSize: "24px",
// //     fontWeight: "700",
// //     color: "#0d6efd"
// //   },
// //   resultsList: {
// //     maxHeight: "600px",
// //     overflowY: "auto"
// //   },
// //   resultItem: {
// //     background: "linear-gradient(135deg, #f8faff 0%, #f0f5ff 100%)",
// //     border: "1px solid #e7eef8",
// //     borderLeft: "4px solid #0d6efd",
// //     borderRadius: "8px",
// //     padding: "16px",
// //     marginBottom: "12px"
// //   },
// //   resultHeader: {
// //     display: "flex",
// //     justifyContent: "space-between",
// //     alignItems: "center",
// //     marginBottom: "8px"
// //   },
// //   resultNumber: {
// //     fontWeight: "700",
// //     color: "#1a1a1a",
// //     fontSize: "14px"
// //   },
// //   resultScore: {
// //     fontWeight: "600",
// //     fontSize: "13px"
// //   },
// //   resultQuestion: {
// //     fontSize: "13px",
// //     color: "#212529",
// //     marginBottom: "8px",
// //     lineHeight: "1.5"
// //   },
// //   issuesList: {
// //     background: "#fff3cd",
// //     border: "1px solid #ffe69c",
// //     borderRadius: "6px",
// //     padding: "10px",
// //     marginBottom: "8px",
// //     fontSize: "12px"
// //   },
// //   ul: {
// //     marginLeft: "20px",
// //     marginTop: "6px"
// //   },
// //   suggestion: {
// //     background: "#cfe2ff",
// //     border: "1px solid #b6d4fe",
// //     borderRadius: "6px",
// //     padding: "10px",
// //     fontSize: "12px",
// //     color: "#084298"
// //   },
// //   emptyState: {
// //     textAlign: "center",
// //     padding: "60px 20px",
// //     color: "#868e96"
// //   },
// //   emptyState: {
// //     textAlign: "center",
// //     padding: "60px 20px",
// //     color: "#868e96"
// //   },
// //   emptyIcon: {
// //     fontSize: "48px",
// //     marginBottom: "16px"
// //   },
// //   debugSection: {
// //     marginTop: "32px",
// //     padding: "16px",
// //     background: "#f8f9fa",
// //     border: "1px solid #dee2e6",
// //     borderRadius: "8px",
// //     textAlign: "left"
// //   },
// //   debugInfo: {
// //     fontSize: "12px",
// //     color: "#495057",
// //     fontFamily: "monospace",
// //     marginBottom: "12px"
// //   },
// //   debugPre: {
// //     background: "#fff",
// //     padding: "8px",
// //     borderRadius: "4px",
// //     fontSize: "11px",
// //     overflow: "auto"
// //   },
// //   debugHint: {
// //     fontSize: "12px",
// //     color: "#0d6efd",
// //     background: "#e7f3ff",
// //     padding: "8px",
// //     borderRadius: "4px",
// //     marginTop: "12px"
// //   }
// // };

// // src/pages/MCQ_QC.jsx


// // src/pages/MCQ_QC.jsx
// import { useState } from "react";
// import { DEPARTMENT_IDS } from "../config";

// const API_BASE = "https://api.examly.io/api";
// const QC_API = "https://cubeintouch-backend.onrender.com/qc";

// // Debug: Check if URLs are valid
// console.log("API_BASE:", API_BASE);
// console.log("QC_API:", QC_API);

// export default function MCQ_QC() {
//   // ✅ Read token directly from localStorage like Finder.jsx and CourseQBFinder.jsx
//   const [token, setToken] = useState(() => {
//     try {
//       return localStorage.getItem("examly_token") || "";
//     } catch {
//       return "";
//     }
//   });
  
//   const [testName, setTestName] = useState("");
//   const [status, setStatus] = useState("");
//   const [alert, setAlert] = useState(null);
//   const [results, setResults] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [stats, setStats] = useState(null);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");

//   const showAlert = (msg, type = "warning") => {
//     setAlert({ msg, type });
//     setTimeout(() => setAlert(null), 4000);
//   };

//   const showOverlay = (msg) => {
//     setOverlayText(msg);
//     setOverlay(true);
//   };

//   const hideOverlay = () => {
//     setOverlay(false);
//   };

//   // Helper functions
//   const stripHTML = (html) => {
//     return html.replace(/<[^>]*>/g, "").trim();
//   };

//   const splitQuestionAndCode = (raw) => {
//     if (!raw.includes("$$$examly")) {
//       return { question: stripHTML(raw), code: "" };
//     }
//     const [q, code] = raw.split("$$$examly");
//     return { question: stripHTML(q), code: code.trim() };
//   };

//   const parseOptions = (optionsStr) => {
//     try {
//       return JSON.parse(optionsStr || "[]").map((o) => stripHTML(o.text));
//     } catch {
//       return [];
//     }
//   };

//   const parseExistingAnswer = (answerStr) => {
//     try {
//       const ans = JSON.parse(answerStr || "{}").args?.[0] || "";
//       return stripHTML(ans);
//     } catch {
//       return "";
//     }
//   };

//   // Batch QC
//   const runQcInBatches = async (mcqs, batchSize = 4) => {
//     const allResults = [];

//     for (let i = 0; i < mcqs.length; i += batchSize) {
//       const batch = mcqs.slice(i, i + batchSize);
//       const start = i + 1;
//       const end = Math.min(i + batchSize, mcqs.length);

//       showOverlay(`🔍 QC ${start}-${end} / ${mcqs.length}`);

//       try {
//         console.log(`Sending batch ${Math.floor(i / batchSize) + 1}:`, batch);

//         const response = await fetch(QC_API, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ mcqs: batch })
//         });

//         if (!response.ok) {
//           const errText = await response.text();
//           console.error(`Backend error (${response.status}):`, errText);
//           throw new Error(`Backend returned ${response.status}: ${errText}`);
//         }

//         const batchData = await response.json();
        
//         if (!Array.isArray(batchData)) {
//           console.error("Invalid response format:", batchData);
//           throw new Error("Backend response is not an array");
//         }

//         allResults.push(...batchData);
//         console.log(`Batch processed:`, batchData);

//         // Small delay between batches
//         await new Promise((r) => setTimeout(r, 800));
//       } catch (err) {
//         console.error(`Batch error:`, err);
//         hideOverlay();
//         showAlert(`❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${err.message}`, "danger");
//         throw err;
//       }
//     }

//     return allResults;
//   };

//   // Main QC function
//   const handleQC = async () => {
//     if (!testName.trim()) {
//       showAlert("Please enter a test name", "warning");
//       return;
//     }

//     if (!token) {
//       showAlert("Token missing. Please go to Course Finder or Course QB Finder to authenticate.", "danger");
//       return;
//     }

//     setIsLoading(true);
//     setResults([]);
//     setStats(null);

//     try {
//       // Validate backend is running
//       showOverlay("🔍 Checking backend connection...");
//       try {
//         const healthRes = await fetch(QC_API.replace("/qc", "/health"), {
//           method: "GET"
//         });
//         if (!healthRes.ok) {
//           hideOverlay();
//           showAlert("❌ Backend not running. Please check backend server.", "danger");
//           setIsLoading(false);
//           return;
//         }
//       } catch (healthErr) {
//         console.warn("Backend health check failed:", healthErr.message);
//         hideOverlay();
//         showAlert("⚠️ Cannot connect to backend. Make sure it's running!", "danger");
//         setIsLoading(false);
//         return;
//       }

//       // Find test
//       showOverlay("🔎 Finding test...");
//       const searchRes = await fetch(API_BASE + "/v2/tests/filter", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: token
//         },
//         body: JSON.stringify({
//           search: testName,
//           page: 1,
//           limit: 10,
//           branch_id: "All",
//           department_id: DEPARTMENT_IDS,
//           mainDepartmentUser: true
//         })
//       });

//       if (!searchRes.ok) {
//         const errData = await searchRes.json().catch(() => ({}));
//         hideOverlay();
//         showAlert("❌ API Error: " + (errData.message || searchRes.statusText), "danger");
//         setIsLoading(false);
//         return;
//       }

//       const searchData = await searchRes.json();
//       const test = searchData?.data?.[0];

//       if (!test) {
//         hideOverlay();
//         showAlert("❌ Test not found. Check test name and try again.", "danger");
//         setIsLoading(false);
//         return;
//       }

//       showOverlay(`📋 Fetching MCQs from: ${test.testName || testName}...`);

//       // Fetch questions
//       const questionsRes = await fetch(API_BASE + "/questions/test/" + test.testId, {
//         headers: { Authorization: token }
//       });

//       if (!questionsRes.ok) {
//         hideOverlay();
//         showAlert("❌ Failed to fetch MCQs from test", "danger");
//         setIsLoading(false);
//         return;
//       }

//       const qjson = await questionsRes.json();
//       const LIST = qjson?.[0]?.non_group_questions || [];

//       if (!LIST.length) {
//         hideOverlay();
//         showAlert("❌ No MCQs found in test", "danger");
//         setIsLoading(false);
//         return;
//       }

//       // Parse MCQs
//       showOverlay(`⚙️ Parsing ${LIST.length} MCQs...`);
//       const mcqs = LIST.map((q) => {
//         if (!q.mcq_questions) return null;

//         const { question, code } = splitQuestionAndCode(q.question_data || "");
//         const options = parseOptions(q.mcq_questions.options);
//         const existingAnswer = parseExistingAnswer(q.mcq_questions.answer);

//         return {
//           question,
//           code,
//           options,
//           existingAnswer,
//           difficulty: q.manual_difficulty || "NA",
//           topic: q.topic?.name || "Unknown"
//         };
//       }).filter(Boolean);

//       if (!mcqs.length) {
//         hideOverlay();
//         showAlert("❌ No valid MCQs found", "danger");
//         setIsLoading(false);
//         return;
//       }

//       console.log(`Prepared ${mcqs.length} MCQs for QC`, mcqs);
//       showOverlay(`⚡ Running AI Quality Check on ${mcqs.length} MCQs...`);

//       // Run QC
//       const report = await runQcInBatches(mcqs, 4);

//       // Calculate stats
//       showOverlay("📊 Calculating results...");
//       const correct = report.filter((r) => r.isCorrect).length;
//       const incorrect = report.filter((r) => !r.isCorrect).length;
//       const avgScore = (
//         report.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / report.length
//       ).toFixed(1);

//       setStats({ correct, incorrect, total: report.length, avgScore });
//       setResults(report);
      
//       hideOverlay();
//       showAlert(`✅ QC Completed! ${correct} correct, ${incorrect} issues found`, "success");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error: " + err.message, "danger");
//       console.error("Full error:", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const downloadReport = () => {
//     if (!results.length) {
//       showAlert("No results to download", "warning");
//       return;
//     }

//     const csv =
//       "Q#,Question,Correct?,Quality Score,Issues,Suggested Answer\n" +
//       results
//         .map(
//           (q, i) =>
//             `"${i + 1}","${q.question.replace(/"/g, '""')}","${q.isCorrect ? "✓" : "✗"}","${q.qualityScore}","${(q.issues || []).join("; ").replace(/"/g, '""')}","${(q.correctAnswer || "").replace(/"/g, '""')}"`
//         )
//         .join("\n");

//     const blob = new Blob([csv], { type: "text/csv" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `${testName}_qc_${new Date().toISOString().split("T")[0]}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//     showAlert("✅ Report downloaded", "success");
//   };

//   return (
//     <div style={styles.container}>
//       {/* Loading Overlay */}
//       {overlay && (
//         <div style={styles.overlay}>
//           <div style={styles.overlayContent}>
//             <div style={styles.spinner}></div>
//             <div style={styles.overlayText}>{overlayText}</div>
//           </div>
//         </div>
//       )}

//       {/* Alert */}
//       {alert && (
//         <div style={{ ...styles.alert, ...styles[`alert_${alert.type}`] }}>
//           {alert.msg}
//         </div>
//       )}

//       {/* Input Section */}
//       <div style={styles.card}>
//         <h2 style={styles.title}>🔍 MCQ AI Quality Check</h2>

//         <div style={styles.formGroup}>
//           <label style={styles.label}>Test Name</label>
//           <input
//             type="text"
//             value={testName}
//             onChange={(e) => setTestName(e.target.value)}
//             onKeyPress={(e) => e.key === "Enter" && handleQC()}
//             placeholder="Enter test name..."
//             style={styles.input}
//             disabled={isLoading}
//           />
//         </div>

//         <button
//           onClick={handleQC}
//           disabled={isLoading || !token}
//           style={{ ...styles.button, ...styles.buttonPrimary, ...(isLoading || !token ? styles.buttonDisabled : {}) }}
//         >
//           {isLoading ? "🔄 Processing..." : "🚀 Analyze MCQs"}
//         </button>

//         {!token && (
//           <div style={styles.warning}>
//             ⚠️ No authentication token found. Please use <strong>Course Finder</strong> or <strong>Course QB Finder</strong> to authenticate first.
//           </div>
//         )}
//       </div>

//       {/* Stats Section */}
//       {stats && (
//         <div style={styles.card}>
//           <h3 style={styles.subtitle}>📊 Summary</h3>
//           <div style={styles.statsGrid}>
//             <div style={styles.statBox}>
//               <div style={styles.statLabel}>Total MCQs</div>
//               <div style={styles.statValue}>{stats.total}</div>
//             </div>
//             <div style={styles.statBox}>
//               <div style={styles.statLabel}>✅ Correct</div>
//               <div style={{ ...styles.statValue, color: "#28a745" }}>{stats.correct}</div>
//             </div>
//             <div style={styles.statBox}>
//               <div style={styles.statLabel}>❌ Issues</div>
//               <div style={{ ...styles.statValue, color: "#dc3545" }}>{stats.incorrect}</div>
//             </div>
//             <div style={styles.statBox}>
//               <div style={styles.statLabel}>Quality Score</div>
//               <div style={styles.statValue}>{stats.avgScore}/10</div>
//             </div>
//           </div>

//           <button
//             onClick={downloadReport}
//             style={{ ...styles.button, ...styles.buttonSuccess, marginTop: "16px" }}
//           >
//             📥 Download Report
//           </button>
//         </div>
//       )}

//       {/* Results Section */}
//       {results.length > 0 && (
//         <div style={styles.card}>
//           <h3 style={styles.subtitle}>🎯 Detailed Results</h3>
//           <div style={styles.resultsList}>
//             {results.map((q, i) => (
//               <div key={i} style={styles.resultItem}>
//                 <div style={styles.resultHeader}>
//                   <span style={styles.resultNumber}>Q{i + 1}</span>
//                   <span style={styles.resultScore}>
//                     {q.isCorrect ? "✅" : "⚠️"} {q.qualityScore}/10
//                   </span>
//                 </div>

//                 <div style={styles.resultQuestion}>{q.question}</div>

//                 {q.issues && q.issues.length > 0 && (
//                   <div style={styles.issuesList}>
//                     <strong>Issues:</strong>
//                     <ul style={styles.ul}>
//                       {q.issues.map((issue, j) => (
//                         <li key={j}>{issue}</li>
//                       ))}
//                     </ul>
//                   </div>
//                 )}

//                 {!q.isCorrect && q.correctAnswer && (
//                   <div style={styles.suggestion}>
//                     <strong>✏️ Suggested Answer:</strong> {q.correctAnswer}
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Empty State */}
//       {!results.length && !isLoading && !status && (
//         <div style={styles.emptyState}>
//           <div style={styles.emptyIcon}>📝</div>
//           <p>Enter a test name and click "Analyze MCQs" to get started</p>
          
//           {/* Token Status */}
//           <div style={styles.debugSection}>
//             <h4>🔧 Status</h4>
//             <div style={styles.debugInfo}>
//               <p>
//                 <strong>Token Status:</strong> {token ? "✅ Loaded from localStorage" : "❌ Not found"}
//               </p>
//               {!token && (
//                 <div style={styles.debugHint}>
//                   💡 <strong>How to fix:</strong> Go to <strong>Course Finder</strong> or <strong>Course QB Finder</strong>, 
//                   paste your API token, and save it. The token will be stored in localStorage and automatically 
//                   available here.
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // Styles
// const styles = {
//   container: {
//     maxWidth: "900px",
//     margin: "0 auto",
//     padding: "20px",
//     fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
//   },
//   overlay: {
//     position: "fixed",
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     background: "rgba(0, 0, 0, 0.5)",
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "center",
//     zIndex: 9999,
//     backdropFilter: "blur(4px)"
//   },
//   overlayContent: {
//     background: "white",
//     borderRadius: "16px",
//     padding: "40px",
//     textAlign: "center",
//     boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
//     minWidth: "300px"
//   },
//   spinner: {
//     border: "4px solid #f0f2f5",
//     borderTop: "4px solid #0d6efd",
//     borderRadius: "50%",
//     width: "60px",
//     height: "60px",
//     margin: "0 auto 20px",
//     animation: "spin 1s linear infinite"
//   },
//   overlayText: {
//     fontSize: "16px",
//     fontWeight: "600",
//     color: "#1a1a1a",
//     lineHeight: "1.5"
//   },
//   alert: {
//     padding: "12px 16px",
//     borderRadius: "8px",
//     marginBottom: "16px",
//     fontSize: "14px",
//     fontWeight: "500"
//   },
//   alert_success: { background: "#d4edda", color: "#155724" },
//   alert_warning: { background: "#fff3cd", color: "#856404" },
//   alert_danger: { background: "#f8d7da", color: "#721c24" },
//   alert_info: { background: "#d1ecf1", color: "#0c5460" },
//   card: {
//     background: "white",
//     borderRadius: "12px",
//     padding: "24px",
//     marginBottom: "20px",
//     boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
//     border: "1px solid #e9ecef"
//   },
//   title: {
//     fontSize: "24px",
//     fontWeight: "700",
//     marginBottom: "20px",
//     color: "#1a1a1a"
//   },
//   subtitle: {
//     fontSize: "16px",
//     fontWeight: "700",
//     marginBottom: "16px",
//     color: "#1a1a1a"
//   },
//   formGroup: { marginBottom: "16px" },
//   label: {
//     display: "block",
//     fontWeight: "600",
//     fontSize: "12px",
//     textTransform: "uppercase",
//     color: "#495057",
//     marginBottom: "8px"
//   },
//   input: {
//     width: "100%",
//     padding: "12px",
//     border: "1.5px solid #dee2e6",
//     borderRadius: "8px",
//     fontSize: "14px",
//     boxSizing: "border-box"
//   },
//   button: {
//     width: "100%",
//     padding: "12px",
//     fontSize: "14px",
//     fontWeight: "600",
//     border: "none",
//     borderRadius: "8px",
//     cursor: "pointer",
//     transition: "all 0.2s ease"
//   },
//   buttonPrimary: {
//     background: "linear-gradient(135deg, #0d6efd 0%, #0c5cde 100%)",
//     color: "white"
//   },
//   buttonSuccess: {
//     background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
//     color: "white"
//   },
//   buttonDisabled: { opacity: "0.5", cursor: "not-allowed" },
//   warning: {
//     background: "#fff3cd",
//     border: "1px solid #ffc107",
//     color: "#856404",
//     padding: "12px",
//     borderRadius: "8px",
//     fontSize: "13px",
//     marginTop: "12px",
//     lineHeight: "1.5"
//   },
//   tokenInfo: {
//     background: "#d4edda",
//     border: "1px solid #c3e6cb",
//     color: "#155724",
//     padding: "12px",
//     borderRadius: "8px",
//     fontSize: "13px",
//     marginTop: "12px"
//   },
//   status: {
//     marginTop: "12px",
//     padding: "12px",
//     background: "#f8f9fa",
//     borderRadius: "8px",
//     color: "#6c757d",
//     fontSize: "13px"
//   },
//   statsGrid: {
//     display: "grid",
//     gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
//     gap: "12px",
//     marginBottom: "16px"
//   },
//   statBox: {
//     background: "#f8f9fa",
//     border: "1px solid #e9ecef",
//     borderRadius: "8px",
//     padding: "16px",
//     textAlign: "center"
//   },
//   statLabel: {
//     fontSize: "12px",
//     color: "#6c757d",
//     marginBottom: "8px"
//   },
//   statValue: {
//     fontSize: "24px",
//     fontWeight: "700",
//     color: "#0d6efd"
//   },
//   resultsList: {
//     maxHeight: "600px",
//     overflowY: "auto"
//   },
//   resultItem: {
//     background: "linear-gradient(135deg, #f8faff 0%, #f0f5ff 100%)",
//     border: "1px solid #e7eef8",
//     borderLeft: "4px solid #0d6efd",
//     borderRadius: "8px",
//     padding: "16px",
//     marginBottom: "12px"
//   },
//   resultHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: "8px"
//   },
//   resultNumber: {
//     fontWeight: "700",
//     color: "#1a1a1a",
//     fontSize: "14px"
//   },
//   resultScore: {
//     fontWeight: "600",
//     fontSize: "13px"
//   },
//   resultQuestion: {
//     fontSize: "13px",
//     color: "#212529",
//     marginBottom: "8px",
//     lineHeight: "1.5"
//   },
//   issuesList: {
//     background: "#fff3cd",
//     border: "1px solid #ffe69c",
//     borderRadius: "6px",
//     padding: "10px",
//     marginBottom: "8px",
//     fontSize: "12px"
//   },
//   ul: {
//     marginLeft: "20px",
//     marginTop: "6px"
//   },
//   suggestion: {
//     background: "#cfe2ff",
//     border: "1px solid #b6d4fe",
//     borderRadius: "6px",
//     padding: "10px",
//     fontSize: "12px",
//     color: "#084298"
//   },
//   emptyState: {
//     textAlign: "center",
//     padding: "60px 20px",
//     color: "#868e96"
//   },
//   emptyIcon: {
//     fontSize: "48px",
//     marginBottom: "16px"
//   },
//   debugSection: {
//     marginTop: "32px",
//     padding: "16px",
//     background: "#f8f9fa",
//     border: "1px solid #dee2e6",
//     borderRadius: "8px",
//     textAlign: "left"
//   },
//   debugInfo: {
//     fontSize: "13px",
//     color: "#495057",
//     marginBottom: "12px"
//   },
//   debugHint: {
//     fontSize: "13px",
//     color: "#0c5460",
//     background: "#d1ecf1",
//     padding: "12px",
//     borderRadius: "6px",
//     marginTop: "12px",
//     lineHeight: "1.6",
//     border: "1px solid #bee5eb"
//   }
// };

// // Add CSS animation for spinner
// if (typeof document !== 'undefined') {
//   const style = document.createElement('style');
//   style.textContent = `
//     @keyframes spin {
//       0% { transform: rotate(0deg); }
//       100% { transform: rotate(360deg); }
//     }
//   `;
//   document.head.appendChild(style);
// }


// src/pages/MCQ_QC.jsx
import { useState } from "react";
import { DEPARTMENT_IDS } from "../config";
import "./MCQ_QC.css";

const API_BASE = "https://api.examly.io/api";
const QC_API = "https://cubeintouch-backend.onrender.com/qc";

export default function MCQ_QC() {
  // Read token directly from localStorage
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("examly_token") || "";
    } catch {
      return "";
    }
  });
  
  const [testName, setTestName] = useState("");
  const [alert, setAlert] = useState(null);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");

  const showAlert = (msg, type = "warning") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const showOverlay = (msg) => {
    setOverlayText(msg);
    setOverlay(true);
  };

  const hideOverlay = () => {
    setOverlay(false);
  };

  // Helper functions
  const stripHTML = (html) => {
    return html.replace(/<[^>]*>/g, "").trim();
  };

  const splitQuestionAndCode = (raw) => {
    if (!raw.includes("$$$examly")) {
      return { question: stripHTML(raw), code: "" };
    }
    const [q, code] = raw.split("$$$examly");
    return { question: stripHTML(q), code: code.trim() };
  };

  const parseOptions = (optionsStr) => {
    try {
      return JSON.parse(optionsStr || "[]").map((o) => stripHTML(o.text));
    } catch {
      return [];
    }
  };

  const parseExistingAnswer = (answerStr) => {
    try {
      const ans = JSON.parse(answerStr || "{}").args?.[0] || "";
      return stripHTML(ans);
    } catch {
      return "";
    }
  };

  // Reset function
  const handleReset = () => {
    setTestName("");
    setResults([]);
    setStats(null);
    setAlert(null);
    showAlert("✨ Form reset successfully", "info");
  };

  // Batch QC
  const runQcInBatches = async (mcqs, batchSize = 4) => {
    const allResults = [];

    for (let i = 0; i < mcqs.length; i += batchSize) {
      const batch = mcqs.slice(i, i + batchSize);
      const start = i + 1;
      const end = Math.min(i + batchSize, mcqs.length);

      showOverlay(`🔍 Processing ${start}-${end} / ${mcqs.length}`);

      try {
        const response = await fetch(QC_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mcqs: batch })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Backend error (${response.status}):`, errText);
          throw new Error(`Backend returned ${response.status}: ${errText}`);
        }

        const batchData = await response.json();
        
        if (!Array.isArray(batchData)) {
          console.error("Invalid response format:", batchData);
          throw new Error("Backend response is not an array");
        }

        allResults.push(...batchData);

        // Small delay between batches
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        console.error(`Batch error:`, err);
        hideOverlay();
        showAlert(`❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${err.message}`, "danger");
        throw err;
      }
    }

    return allResults;
  };

  // Main QC function
  const handleQC = async () => {
    if (!testName.trim()) {
      showAlert("Please enter a test name", "warning");
      return;
    }

    if (!token) {
      showAlert("Token missing. Please go to Course Finder or Course QB Finder to authenticate.", "danger");
      return;
    }

    setIsLoading(true);
    setResults([]);
    setStats(null);

    try {
      // Validate backend is running
      showOverlay("🔍 Checking backend connection...");
      try {
        const healthRes = await fetch(QC_API.replace("/qc", "/health"), {
          method: "GET"
        });
        if (!healthRes.ok) {
          hideOverlay();
          showAlert("❌ Backend not running. Please check backend server.", "danger");
          setIsLoading(false);
          return;
        }
      } catch (healthErr) {
        console.warn("Backend health check failed:", healthErr.message);
        hideOverlay();
        showAlert("⚠️ Cannot connect to backend. Make sure it's running!", "danger");
        setIsLoading(false);
        return;
      }

      // Find test
      showOverlay("🔎 Finding test...");
      const searchRes = await fetch(API_BASE + "/v2/tests/filter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          search: testName,
          page: 1,
          limit: 10,
          branch_id: "All",
          department_id: DEPARTMENT_IDS,
          mainDepartmentUser: true
        })
      });

      if (!searchRes.ok) {
        const errData = await searchRes.json().catch(() => ({}));
        hideOverlay();
        showAlert("❌ API Error: " + (errData.message || searchRes.statusText), "danger");
        setIsLoading(false);
        return;
      }

      const searchData = await searchRes.json();
      const test = searchData?.data?.[0];

      if (!test) {
        hideOverlay();
        showAlert("❌ Test not found. Check test name and try again.", "danger");
        setIsLoading(false);
        return;
      }

      showOverlay(`📋 Fetching MCQs from: ${test.testName || testName}...`);

      // Fetch questions
      const questionsRes = await fetch(API_BASE + "/questions/test/" + test.testId, {
        headers: { Authorization: token }
      });

      if (!questionsRes.ok) {
        hideOverlay();
        showAlert("❌ Failed to fetch MCQs from test", "danger");
        setIsLoading(false);
        return;
      }

      const qjson = await questionsRes.json();
      const LIST = qjson?.[0]?.non_group_questions || [];

      if (!LIST.length) {
        hideOverlay();
        showAlert("❌ No MCQs found in test", "danger");
        setIsLoading(false);
        return;
      }

      // Parse MCQs
      showOverlay(`⚙️ Parsing ${LIST.length} MCQs...`);
      const mcqs = LIST.map((q) => {
        if (!q.mcq_questions) return null;

        const { question, code } = splitQuestionAndCode(q.question_data || "");
        const options = parseOptions(q.mcq_questions.options);
        const existingAnswer = parseExistingAnswer(q.mcq_questions.answer);

        return {
          question,
          code,
          options,
          existingAnswer,
          difficulty: q.manual_difficulty || "NA",
          topic: q.topic?.name || "Unknown"
        };
      }).filter(Boolean);

      if (!mcqs.length) {
        hideOverlay();
        showAlert("❌ No valid MCQs found", "danger");
        setIsLoading(false);
        return;
      }

      showOverlay(`⚡ Running AI Quality Check on ${mcqs.length} MCQs...`);

      // Run QC
      const report = await runQcInBatches(mcqs, 4);

      // Calculate stats
      showOverlay("📊 Calculating results...");
      const correct = report.filter((r) => r.isCorrect).length;
      const incorrect = report.filter((r) => !r.isCorrect).length;
      const avgScore = (
        report.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / report.length
      ).toFixed(1);

      setStats({ correct, incorrect, total: report.length, avgScore });
      setResults(report);
      
      hideOverlay();
      showAlert(`✅ QC Completed! ${correct} correct, ${incorrect} issues found`, "success");
    } catch (err) {
      hideOverlay();
      showAlert("Error: " + err.message, "danger");
      console.error("Full error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!results.length) {
      showAlert("No results to download", "warning");
      return;
    }

    const csv =
      "Q#,Question,Correct?,Quality Score,Issues,Suggested Answer\n" +
      results
        .map(
          (q, i) =>
            `"${i + 1}","${q.question.replace(/"/g, '""')}","${q.isCorrect ? "✓" : "✗"}","${q.qualityScore}","${(q.issues || []).join("; ").replace(/"/g, '""')}","${(q.correctAnswer || "").replace(/"/g, '""')}"`
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${testName}_qc_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert("✅ Report downloaded", "success");
  };

  return (
    <div className="mcq-qc-container">
      {/* Loading Overlay */}
      {overlay && (
        <div className="mcq-overlay">
          <div className="mcq-overlay-content">
            <div className="mcq-spinner"></div>
            <div className="mcq-overlay-text">{overlayText}</div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <div className={`mcq-alert mcq-alert-${alert.type}`}>
          {alert.msg}
        </div>
      )}

      {/* Input Section */}
      <div className="mcq-card">
        <h2 className="mcq-title">
          🔍 MCQ AI Quality Check
        </h2>

        <div className="mcq-form-group">
          <label className="mcq-label">Test Name</label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleQC()}
            placeholder="Enter test name..."
            className="mcq-input"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleQC}
          disabled={isLoading || !token}
          className={`mcq-button mcq-button-primary ${(isLoading || !token) ? 'mcq-button-disabled' : ''}`}
        >
          {isLoading ? "🔄 Processing..." : "🚀 Analyze MCQs"}
        </button>

        <div className="mcq-button-group">
          <button
            onClick={handleReset}
            disabled={isLoading}
            className={`mcq-button mcq-button-secondary ${isLoading ? 'mcq-button-disabled' : ''}`}
          >
            🔄 Reset
          </button>
        </div>

        {!token && (
          <div className="mcq-warning">
            ⚠️ No authentication token found. Please use <strong>Course Finder</strong> or <strong>Course QB Finder</strong> to authenticate first.
          </div>
        )}
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="mcq-card">
          <h3 className="mcq-subtitle">📊 Summary</h3>
          <div className="mcq-stats-grid">
            <div className="mcq-stat-box">
              <div className="mcq-stat-label">Total MCQs</div>
              <div className="mcq-stat-value">{stats.total}</div>
            </div>
            <div className="mcq-stat-box">
              <div className="mcq-stat-label">✅ Correct</div>
              <div className="mcq-stat-value success">{stats.correct}</div>
            </div>
            <div className="mcq-stat-box">
              <div className="mcq-stat-label">❌ Issues</div>
              <div className="mcq-stat-value danger">{stats.incorrect}</div>
            </div>
            <div className="mcq-stat-box">
              <div className="mcq-stat-label">Quality Score</div>
              <div className="mcq-stat-value">{stats.avgScore}/10</div>
            </div>
          </div>

          <button
            onClick={downloadReport}
            className="mcq-button mcq-button-success"
          >
            📥 Download Report
          </button>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="mcq-card">
          <h3 className="mcq-subtitle">🎯 Detailed Results</h3>
          <div className="mcq-results-list">
            {results.map((q, i) => (
              <div key={i} className="mcq-result-item">
                <div className="mcq-result-header">
                  <span className="mcq-result-number">Q{i + 1}</span>
                  <span className="mcq-result-score">
                    {q.isCorrect ? "✅" : "⚠️"} {q.qualityScore}/10
                  </span>
                </div>

                <div className="mcq-result-question">{q.question}</div>

                {q.issues && q.issues.length > 0 && (
                  <div className="mcq-issues-list">
                    <strong>Issues:</strong>
                    <ul>
                      {q.issues.map((issue, j) => (
                        <li key={j}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {!q.isCorrect && q.correctAnswer && (
                  <div className="mcq-suggestion">
                    <strong>✏️ Suggested Answer:</strong> {q.correctAnswer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!results.length && !isLoading && (
        <div className="mcq-empty-state">
          <div className="mcq-empty-icon">📝</div>
          <p>Enter a test name and click "Analyze MCQs" to get started</p>
          
          {/* Token Status */}
          <div className="mcq-debug-section">
            <h4>🔧 Status</h4>
            <div className="mcq-debug-info">
              <p>
                <strong>Token Status:</strong> {token ? "✅ Loaded from localStorage" : "❌ Not found"}
              </p>
              {!token && (
                <div className="mcq-debug-hint">
                  💡 <strong>How to fix:</strong> Go to <strong>Course Finder</strong> or <strong>Course QB Finder</strong>, 
                  paste your API token, and save it. The token will be stored in localStorage and automatically 
                  available here.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}