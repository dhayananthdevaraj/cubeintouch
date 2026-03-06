
// import { useState, useEffect } from "react";
// import { QB_ACCESS_CONFIG } from "../config";
// import "./CodeLens.css";

// const API      = "https://api.examly.io";
// const LOCAL_BE = "http://localhost:4000";

// export default function CodeLens() {
//   const [selectedDomain, setSelectedDomain] = useState(null);
//   const [token, setToken]                   = useState("");
//   const [ui, setUI]                         = useState("domain");
//   const [tokenInput, setTokenInput]         = useState("");
//   const [alert, setAlert]                   = useState(null);
//   const [overlay, setOverlay]               = useState(false);
//   const [overlayText, setOverlayText]       = useState("");

//   const [qbSearch, setQbSearch]               = useState("");
//   const [qbResults, setQbResults]             = useState([]);
//   const [selectedQB, setSelectedQB]           = useState(null);
//   const [questions, setQuestions]             = useState([]);
//   const [selectedQuestion, setSelectedQuestion] = useState(null);
//   const [view, setView]                       = useState("search");

//   const [qcState, setQcState]             = useState("idle");
//   const [qcResult, setQcResult]           = useState(null);
//   const [compileState, setCompileState]   = useState("idle");
//   const [compileResults, setCompileResults] = useState(null);
//   const [compileProgress, setCompileProgress] = useState(0);

//   useEffect(() => {
//     if (!selectedDomain) return;
//     const storageKey = `examly_token_corporate_${selectedDomain}`;
//     try {
//       const saved = localStorage.getItem(storageKey) || "";
//       setToken(saved); setUI(saved ? "main" : "welcome");
//     } catch { setToken(""); setUI("welcome"); }
//   }, [selectedDomain]);

//   useEffect(() => {
//     setQcState("idle"); setQcResult(null);
//     setCompileState("idle"); setCompileResults(null); setCompileProgress(0);
//   }, [selectedQuestion]);

//   const domainConfig  = selectedDomain ? QB_ACCESS_CONFIG[selectedDomain] : null;
//   const activeDeptIds = domainConfig   ? domainConfig.department_ids : [];
//   const headers       = { "Content-Type": "application/json", Authorization: token };

//   const showAlert   = (msg, type = "info") => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4000); };
//   const showOverlay = (msg) => { setOverlayText(msg); setOverlay(true); };
//   const hideOverlay = () => setOverlay(false);

//   const saveToken = () => {
//     if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
//     const storageKey = `examly_token_corporate_${selectedDomain}`;
//     localStorage.setItem(storageKey, tokenInput.trim());
//     setToken(tokenInput.trim()); setTokenInput(""); setUI("main");
//     showAlert("Token saved. CodeLens activated.", "success");
//   };
//   const clearToken = () => {
//     const storageKey = `examly_token_corporate_${selectedDomain}`;
//     try { localStorage.removeItem(storageKey); } catch {}
//     setToken(""); setUI("welcome"); setTokenInput(""); resetState();
//     showAlert("Session cleared.", "info");
//   };
//   const handleSwitchDomain = () => { setSelectedDomain(null); setUI("domain"); resetState(); setToken(""); setTokenInput(""); };
//   const resetState = () => { setQbSearch(""); setQbResults([]); setSelectedQB(null); setQuestions([]); setSelectedQuestion(null); setView("search"); };

//   const searchQBs = async () => {
//     if (!qbSearch.trim()) { showAlert("Enter a QB name to search", "warning"); return; }
//     showOverlay("Searching question banks...");
//     try {
//       const res = await fetch(`${API}/api/v2/questionbanks`, {
//         method: "POST", headers,
//         body: JSON.stringify({ branch_id:"all", department_id:activeDeptIds, limit:25, mainDepartmentUser:true, page:1, search:qbSearch.trim(), visibility:"All" })
//       });
//       const json = await res.json();
//       const results = json?.results?.questionbanks || [];
//       setQbResults(results); hideOverlay();
//       if (!results.length) showAlert("No question banks found", "warning");
//       else showAlert(`Found ${results.length} QB(s)`, "success");
//     } catch (err) { hideOverlay(); showAlert("Error: " + err.message, "danger"); }
//   };

//   const fetchQuestions = async (qb) => {
//     setSelectedQB(qb); showOverlay(`Fetching questions from "${qb.qb_name}"...`);
//     try {
//       let allQ = [], page = 1, hasMore = true;
//       while (hasMore) {
//         const res = await fetch(`${API}/api/v2/questionfilter`, {
//           method:"POST", headers,
//           body: JSON.stringify({ qb_id:qb.qb_id, type:"Single", page, limit:50 })
//         });
//         const json = await res.json();
//         const batch = json?.non_group_questions || [];
//         allQ = [...allQ, ...batch]; hasMore = batch.length === 50; page++;
//       }
//       setQuestions(allQ); setView("questions"); hideOverlay();
//       showAlert(`Loaded ${allQ.length} questions`, "success");
//     } catch (err) { hideOverlay(); showAlert("Error: " + err.message, "danger"); }
//   };

//   const openQuestion = (q) => { setSelectedQuestion(q); setView("detail"); };

//   const runQCAnalysis = async (q) => {
//     const pq = q.programming_question;
//     const sol = pq?.solution?.[0];
//     const solutionCode = sol?.solutiondata?.[0]?.solution || "";
//     if (!solutionCode) { showAlert("No reference solution found", "warning"); return; }
//     setQcState("running"); setQcResult(null);
//     try {
//       const res = await fetch(`${LOCAL_BE}/cod-qc`, {
//         method:"POST", headers:{"Content-Type":"application/json"},
//         body: JSON.stringify({
//           question:q.question_data, inputFormat:pq?.input_format, outputFormat:pq?.output_format,
//           sampleIO:(() => { try { return JSON.parse(pq?.sample_io)||[]; } catch { return []; } })(),
//           solution:solutionCode, language:sol?.language||"Java",
//           whitelist:sol?.whitelist?.[0]?.list||[], blacklist:sol?.blacklist?.[0]?.list||[],
//           difficulty:q.manual_difficulty, topic:q.topic?.name,
//         })
//       });
//       if (!res.ok) { const e = await res.json(); throw new Error(e.detail||e.error); }
//       const data = await res.json();
//       setQcResult(data); setQcState("done");
//     } catch (err) { setQcState("error"); setQcResult({error:err.message}); showAlert("QC error: "+err.message,"danger"); }
//   };

//   const runCompiler = async (solutionCode, language, testcases) => {
//     if (!solutionCode) { showAlert("No solution code found","warning"); return; }
//     if (!testcases?.length) { showAlert("No test cases found","warning"); return; }
//     setCompileState("running"); setCompileResults(null); setCompileProgress(0);
//     const pi = setInterval(() => setCompileProgress(p => p < 85 ? p + Math.random()*8 : p), 600);
//     try {
//       const res = await fetch(`${LOCAL_BE}/cod-compile`, {
//         method:"POST", headers:{"Content-Type":"application/json"},
//         body: JSON.stringify({solution:solutionCode, language, testcases})
//       });
//       clearInterval(pi);
//       if (!res.ok) { const e = await res.json(); throw new Error(e.detail||e.error); }
//       const data = await res.json();
//       setCompileProgress(100);
//       setTimeout(() => { setCompileResults(data); setCompileState("done"); }, 300);
//     } catch (err) { clearInterval(pi); setCompileState("error"); setCompileResults({error:err.message}); showAlert("Compiler error: "+err.message,"danger"); }
//   };

//   // helpers
//   const stripHtml    = (h) => { if(!h) return ""; return h.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/\s+/g," ").trim(); };
//   const shortText    = (h,l=120) => { const t=stripHtml(h); return t.length>l?t.substring(0,l)+"…":t; };
//   const parseSampleIO  = (r) => { try{return JSON.parse(r)||[];}catch{return[];} };
//   const parseTestCases = (r) => { try{return JSON.parse(r)||[];}catch{return[];} };
//   const diffColor = (d) => { if(!d)return "cl-tag-neutral"; const l=d.toLowerCase(); if(l==="easy")return "cl-tag-easy"; if(l==="hard")return "cl-tag-hard"; return "cl-tag-medium"; };

//   const sIcon  = (s) => s==="pass"?"✅":s==="warn"?"⚠️":"❌";
//   const sColor = (s) => s==="pass"?"#16a34a":s==="warn"?"#a16207":"#dc2626";
//   const sBg    = (s) => s==="pass"?"#f0fdf4":s==="warn"?"#fffbeb":"#fef2f2";
//   const sBdr   = (s) => s==="pass"?"#86efac":s==="warn"?"#fde68a":"#fca5a5";
//   const oColor = (s) => s==="PASS"?"#16a34a":s==="WARN"?"#a16207":"#dc2626";
//   const oBg    = (s) => s==="PASS"?"#f0fdf4":s==="WARN"?"#fffbeb":"#fef2f2";
//   const oBdr   = (s) => s==="PASS"?"#86efac":s==="WARN"?"#fde68a":"#fca5a5";
//   const pColor = (p) => p?"#16a34a":"#dc2626";
//   const pBg    = (p) => p?"#f0fdf4":"#fef2f2";
//   const pBdr   = (p) => p?"#86efac":"#fca5a5";
// function highlightDiff(expected, actual) {

//   const eLines = (expected || "").split("\n");
//   const aLines = (actual || "").split("\n");

//   return aLines.map((line, i) => {

//     if (line !== eLines[i]) {

//       return `<span style="
//         background:#7f1d1d;
//         color:#fecaca;
//         padding:1px 3px;
//         border-radius:3px;
//       ">${line}</span>`;

//     }

//     return line;

//   }).join("\n");

// }
//   // TC Card
// const TCCard = ({ r, i }) => {
//   const [open, setOpen] = useState(!r.passed);

//   const diffActual = !r.passed
//     ? highlightDiff(r.expected, r.actual)
//     : r.actual;

//   return (
//     <div
//       style={{
//         border: "1px solid #e2e8f0",
//         borderRadius: "12px",
//         overflow: "hidden",
//         background: "#ffffff",
//         marginBottom: "12px",
//       }}
//     >

//       {/* HEADER */}
//       <div
//         onClick={() => setOpen(v => !v)}
//         style={{
//           display: "flex",
//           alignItems: "center",
//           padding: "14px 18px",
//           background: r.passed ? "#f0fdf4" : "#fef2f2",
//           cursor: "pointer",
//           gap: "14px"
//         }}
//       >
//         <span style={{fontSize:"18px"}}>
//           {r.passed ? "✅" : "❌"}
//         </span>

//         <span style={{
//           fontSize:"14px",
//           fontWeight:700,
//           color:"#0f172a"
//         }}>
//           Test Case {i+1}
//         </span>

//         <span style={{
//           fontSize:"12px",
//           fontWeight:700,
//           padding:"4px 10px",
//           borderRadius:"999px",
//           background:"#ffffff",
//           border:`1px solid ${r.passed ? "#22c55e" : "#ef4444"}`,
//           color:r.passed ? "#15803d" : "#b91c1c"
//         }}>
//           {r.status}
//         </span>

//         <div style={{marginLeft:"auto",display:"flex",gap:"16px",alignItems:"center"}}>

//           {r.time !== "—" &&
//             <span style={{fontSize:"12px",color:"#64748b"}}>
//               ⏱ {r.time}
//             </span>
//           }

//           {r.score > 0 &&
//             <span style={{
//               fontSize:"12px",
//               fontWeight:700,
//               color:"#16a34a"
//             }}>
//               +{r.score} pts
//             </span>
//           }

//           <span style={{
//             fontSize:"18px",
//             transform:open ? "rotate(90deg)" : "rotate(0deg)",
//             transition:"0.2s"
//           }}>
//             ›
//           </span>

//         </div>
//       </div>

//       {/* BODY */}
//       {open && (
//         <div
//           style={{
//             padding:"18px",
//             background:"#fafafa",
//             display:"flex",
//             flexDirection:"column",
//             gap:"16px"
//           }}
//         >

//           {/* INPUT */}
//           <div>
//             <div style={{
//               fontSize:"11px",
//               fontWeight:800,
//               letterSpacing:"1px",
//               color:"#6366f1",
//               marginBottom:"6px"
//             }}>
//               INPUT
//             </div>

//             <pre style={{
//               background:"#020617",
//               color:"#e2e8f0",
//               padding:"14px",
//               borderRadius:"8px",
//               fontSize:"13px",
//               fontFamily:"JetBrains Mono, monospace",
//               overflow:"auto"
//             }}>
//               {r.input || "(empty)"}
//             </pre>
//           </div>

//           {/* OUTPUT GRID */}
//           <div
//             style={{
//               display:"grid",
//               gridTemplateColumns:"1fr 1fr",
//               gap:"16px"
//             }}
//           >

//             {/* EXPECTED */}
//             <div>
//               <div style={{
//                 fontSize:"11px",
//                 fontWeight:800,
//                 letterSpacing:"1px",
//                 color:"#16a34a",
//                 marginBottom:"6px"
//               }}>
//                 EXPECTED OUTPUT
//               </div>

//               <pre style={{
//                 background:"#020617",
//                 color:"#86efac",
//                 padding:"14px",
//                 borderRadius:"8px",
//                 fontSize:"13px",
//                 fontFamily:"JetBrains Mono, monospace"
//               }}>
//                 {r.expected || "(empty)"}
//               </pre>
//             </div>

//             {/* ACTUAL */}
//             <div>
//               <div style={{
//                 fontSize:"11px",
//                 fontWeight:800,
//                 letterSpacing:"1px",
//                 color:r.passed ? "#16a34a" : "#ef4444",
//                 marginBottom:"6px"
//               }}>
//                 {r.passed ? "ACTUAL OUTPUT ✓" : "ACTUAL OUTPUT ✗"}
//               </div>

//               <pre
//                 dangerouslySetInnerHTML={{
//                   __html: diffActual || "(no output)"
//                 }}
//                 style={{
//                   background:"#020617",
//                   color:r.passed ? "#86efac" : "#fecaca",
//                   padding:"14px",
//                   borderRadius:"8px",
//                   fontSize:"13px",
//                   fontFamily:"JetBrains Mono, monospace"
//                 }}
//               />
//             </div>

//           </div>

//           {/* STDERR */}
//           {r.error && (
//             <div>
//               <div style={{
//                 fontSize:"11px",
//                 fontWeight:800,
//                 letterSpacing:"1px",
//                 color:"#ef4444",
//                 marginBottom:"6px"
//               }}>
//                 ERROR / STDERR
//               </div>

//               <pre style={{
//                 background:"#1a0a0a",
//                 color:"#fca5a5",
//                 padding:"14px",
//                 borderRadius:"8px",
//                 fontSize:"13px",
//                 fontFamily:"JetBrains Mono, monospace"
//               }}>
//                 {r.error}
//               </pre>
//             </div>
//           )}

//         </div>
//       )}

//     </div>
//   );
// };

//   return (
//     <div className="cl-root">
//       {overlay&&(<div className="cl-overlay"><div className="cl-overlay-box"><div className="cl-spin-ring"><div className="cl-spin-inner"/></div><p className="cl-overlay-text">{overlayText}</p></div></div>)}
//       {alert&&(<div className={`cl-alert cl-alert-${alert.type}`}><span className="cl-alert-dot"/>{alert.msg}</div>)}

//       {/* DOMAIN */}
//       {ui==="domain"&&(
//         <div className="cl-auth">
//           <div className="cl-auth-left">
//             <div className="cl-auth-pattern"/>
//             <div className="cl-auth-brand">
//               <div className="cl-auth-logo">🔭</div>
//               <h1 className="cl-auth-title">CodeLens</h1>
//               <p className="cl-auth-sub">Compiler Mode · Code QC Automation</p>
//               <div className="cl-auth-features">
//                 {["Compiler mode question scanning","AI-powered code quality analysis","Test case deep inspection","Whitelist / blacklist validation"].map(f=>(
//                   <div className="cl-auth-feat" key={f}><span className="cl-auth-feat-dot"/>{f}</div>
//                 ))}
//               </div>
//             </div>
//           </div>
//           <div className="cl-auth-right">
//             <div className="cl-auth-card">
//               <div className="cl-auth-card-icon">🔭</div>
//               <p className="cl-form-step">Step 1 of 2</p>
//               <h2 className="cl-auth-card-title">Select Domain</h2>
//               <p className="cl-auth-card-sub">Choose the corporate domain you want to work with</p>
//               <div className="cl-domain-list">
//                 {["LTI","HEXAWARE"].map(dk=>{
//                   const cfg=QB_ACCESS_CONFIG[dk]; if(!cfg)return null;
//                   return(
//                     <div key={dk} className="cl-domain-card" onClick={()=>setSelectedDomain(dk)}
//                       style={{"--domain-color":cfg.color}}
//                       onMouseEnter={e=>{e.currentTarget.style.borderColor=cfg.color;e.currentTarget.style.background=`${cfg.color}08`;}}
//                       onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.background="white";}}>
//                       <div className="cl-domain-icon-wrap" style={{background:`${cfg.color}15`}}>{cfg.icon}</div>
//                       <div className="cl-domain-info"><div className="cl-domain-label">{cfg.label}</div><div className="cl-domain-desc">{cfg.description}</div></div>
//                       <span className="cl-domain-arrow">→</span>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* TOKEN */}
//       {ui==="welcome"&&(
//         <div className="cl-auth">
//           <div className="cl-auth-left">
//             <div className="cl-auth-pattern"/>
//             <div className="cl-auth-brand">
//               <div className="cl-auth-logo">🔭</div>
//               <h1 className="cl-auth-title">CodeLens</h1>
//               <p className="cl-auth-sub">Compiler Mode · Code QC Automation</p>
//               {domainConfig&&<div className="cl-auth-domain-chip"><span>{domainConfig.icon}</span><span>{domainConfig.label}</span></div>}
//             </div>
//           </div>
//           <div className="cl-auth-right">
//             <div className="cl-auth-card">
//               <div className="cl-auth-card-icon">🔑</div>
//               <p className="cl-form-step">Step 2 of 2</p>
//               <h2 className="cl-auth-card-title">Enter API Token</h2>
//               <p className="cl-auth-card-sub">Paste your Examly Authorization token to activate CodeLens</p>
//               <label className="cl-label">Authorization Token</label>
//               <textarea className="cl-textarea" value={tokenInput} onChange={e=>setTokenInput(e.target.value)} placeholder="Paste token here..." rows={5}/>
//               <button className="cl-btn-primary" onClick={saveToken}>Activate CodeLens <span>→</span></button>
//               <button className="cl-btn-back" onClick={()=>{setSelectedDomain(null);setUI("domain");}}>← Back to Domain Selection</button>
//               <p className="cl-auth-note">🔐 Token saved per domain in localStorage</p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* MAIN */}
//       {ui==="main"&&(
//         <div className="cl-main">
//           <div className="cl-topbar">
//             <div className="cl-topbar-left">
//               <span className="cl-topbar-logo">🔭</span>
//               <div><div className="cl-topbar-title">CodeLens</div><div className="cl-topbar-sub">Compiler Mode · Code QC Automation</div></div>
//             </div>
//             <div className="cl-topbar-right">
//               {view!=="search"&&(
//                 <button className="cl-btn-ghost" onClick={()=>{if(view==="detail"){setView("questions");setSelectedQuestion(null);}else{setView("search");setSelectedQB(null);setQuestions([]);}}}>← Back</button>
//               )}
//               {domainConfig&&(
//                 <div className="cl-domain-badge" style={{background:`${domainConfig.color}12`,border:`1.5px solid ${domainConfig.color}40`,color:domainConfig.color}}>
//                   <span>{domainConfig.icon}</span><span>{domainConfig.label}</span>
//                   <button className="cl-domain-badge-x" onClick={handleSwitchDomain} style={{color:domainConfig.color}}>✕</button>
//                 </div>
//               )}
//               <div className="cl-token-badge"><span className="cl-token-dot"/><span>Connected</span></div>
//               <button className="cl-btn-logout" onClick={clearToken}>🚪 Logout</button>
//             </div>
//           </div>

//           <div className="cl-breadcrumb">
//             <span className={`cl-bc-item ${view==="search"?"cl-bc-active":"cl-bc-link"}`} onClick={()=>{setView("search");setSelectedQB(null);setQuestions([]);setSelectedQuestion(null);}}>QB Search</span>
//             {selectedQB&&(<><span className="cl-bc-sep">›</span><span className={`cl-bc-item ${view==="questions"?"cl-bc-active":"cl-bc-link"}`} onClick={()=>{setView("questions");setSelectedQuestion(null);}}>{selectedQB.qb_name}</span></>)}
//             {selectedQuestion&&(<><span className="cl-bc-sep">›</span><span className="cl-bc-item cl-bc-active">Question Detail</span></>)}
//           </div>

//           <div className="cl-content">

//           {/* QB SEARCH */}
//           {view==="search"&&(
//             <div className="cl-section">
//               <div className="cl-section-header">
//                 <div className="cl-section-icon">📦</div>
//                 <div><h2 className="cl-section-title">Select Question Bank</h2><p className="cl-section-sub">Search and select a COD question bank · Domain: {domainConfig?.label}</p></div>
//               </div>
//               <div className="cl-search-row">
//                 <div className="cl-search-wrap">
//                   <span className="cl-search-icon">🔍</span>
//                   <input className="cl-search-input" value={qbSearch} onChange={e=>setQbSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchQBs()} placeholder="e.g. Cloud_Java_COD"/>
//                 </div>
//                 <button className="cl-btn-primary" onClick={searchQBs}>Search</button>
//               </div>
//               {qbResults.length>0?(
//                 <div className="cl-qb-grid">
//                   {qbResults.map(qb=>(
//                     <div className="cl-qb-card" key={qb.qb_id} onClick={()=>fetchQuestions(qb)}>
//                       <div className="cl-qb-card-top"><span className="cl-qb-icon">📚</span><span className={`cl-visibility-badge ${qb.visibility==="Public"?"cl-vis-public":"cl-vis-dept"}`}>{qb.visibility}</span></div>
//                       <div className="cl-qb-name">{qb.qb_name}</div>
//                       <div className="cl-qb-meta"><span className="cl-qb-count">{qb.questionCount} questions</span><span className="cl-qb-role">{qb.user_role}</span></div>
//                       <div className="cl-qb-arrow">Open →</div>
//                     </div>
//                   ))}
//                 </div>
//               ):(
//                 <div className="cl-empty"><div className="cl-empty-icon">🔭</div><p>Search for a question bank to begin</p></div>
//               )}
//             </div>
//           )}

//           {/* QUESTIONS LIST */}
//           {view==="questions"&&(
//             <div className="cl-section">
//               <div className="cl-section-header">
//                 <div className="cl-section-icon">📋</div>
//                 <div><h2 className="cl-section-title">{selectedQB?.qb_name}</h2><p className="cl-section-sub">{questions.length} programming questions · Click any to inspect</p></div>
//                 <div className="cl-section-stat"><span className="cl-stat-num">{questions.length}</span><span className="cl-stat-label">Questions</span></div>
//               </div>
//               <div className="cl-q-list">
//                 {questions.map((q,idx)=>{
//                   const pq=q.programming_question; const samples=parseSampleIO(pq?.sample_io); const tcs=parseTestCases(pq?.testcases);
//                   const sol=pq?.solution?.[0]; const lang=sol?.language||"—";
//                   const hasWL=sol?.whitelist?.[0]?.list?.length>0; const hasBL=sol?.blacklist?.[0]?.list?.length>0;
//                   return(
//                     <div className="cl-q-row" key={q.q_id} onClick={()=>openQuestion(q)}>
//                       <div className="cl-q-num">Q{idx+1}</div>
//                       <div className="cl-q-body">
//                         <div className="cl-q-text">{shortText(q.question_data)}</div>
//                         <div className="cl-q-tags-row">
//                           <span className={`cl-tag ${diffColor(q.manual_difficulty)}`}>{q.manual_difficulty||"—"}</span>
//                           <span className="cl-tag cl-tag-lang">{lang}</span>
//                           <span className="cl-tag cl-tag-neutral">{q.topic?.name}</span>
//                           <span className="cl-tag cl-tag-neutral">{q.sub_topic?.name}</span>
//                           {hasWL&&<span className="cl-tag cl-tag-white">✓ Whitelist</span>}
//                           {hasBL&&<span className="cl-tag cl-tag-black">✕ Blacklist</span>}
//                           <span className="cl-tag cl-tag-tc">{tcs.length} TCs</span>
//                           <span className="cl-tag cl-tag-sample">{samples.length} Samples</span>
//                         </div>
//                       </div>
//                       <div className="cl-q-chevron">›</div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//           {/* QUESTION DETAIL */}
//           {view==="detail"&&selectedQuestion&&(()=>{
//             const q=selectedQuestion;
//             const pq=q.programming_question;
//             const samples=parseSampleIO(pq?.sample_io);
//             const tcs=parseTestCases(pq?.testcases);
//             const sol=pq?.solution?.[0];
//             const whitelist=sol?.whitelist?.[0]?.list||[];
//             const blacklist=sol?.blacklist?.[0]?.list||[];
//             const solCode=sol?.solutiondata?.[0]?.solution||"";
//             const language=sol?.language||"Java";
//             const summary=compileResults?.summary;
//             const passRate=summary?Math.round((summary.passed/summary.total)*100):0;

//             return (
//               <div className="cl-detail">

//                 {/* ── HEADER ── */}
//                 <div className="cl-detail-header">
//                   <div className="cl-detail-title-row">
//                     <h2 className="cl-detail-title">Question Detail</h2>
//                     <div className="cl-detail-badges">
//                       <span className={`cl-tag ${diffColor(q.manual_difficulty)}`}>{q.manual_difficulty}</span>
//                       <span className="cl-tag cl-tag-lang">{sol?.language||"N/A"}</span>
//                       <span className="cl-tag cl-tag-neutral">{q.blooms_taxonomy}</span>
//                     </div>
//                   </div>
//                   <div className="cl-detail-meta-row">
//                     <span>📁 {q.topic?.name}</span><span>›</span><span>{q.sub_topic?.name}</span>
//                     <span className="cl-detail-meta-sep"/>
//                     <span>🆔 {q.q_id?.substring(0,8)}…</span>
//                   </div>
//                 </div>

//                 {/* ── ROW 1: Problem (left) + Constraints/TCs/Solution (right) ── */}
//                 <div className="cl-detail-grid" style={{marginBottom:"20px"}}>
//                   {/* LEFT */}
//                   <div className="cl-detail-col">
//                     <div className="cl-panel">
//                       <div className="cl-panel-head"><span className="cl-panel-icon">📝</span>Problem Statement</div>
//                       <div className="cl-panel-body cl-problem-text" dangerouslySetInnerHTML={{__html:q.question_data}}/>
//                     </div>
//                     <div className="cl-panel-row">
//                       <div className="cl-panel cl-panel-half">
//                         <div className="cl-panel-head"><span className="cl-panel-icon">📥</span>Input Format</div>
//                         <div className="cl-panel-body cl-small-text" dangerouslySetInnerHTML={{__html:pq?.input_format||"<em>Not specified</em>"}}/>
//                       </div>
//                       <div className="cl-panel cl-panel-half">
//                         <div className="cl-panel-head"><span className="cl-panel-icon">📤</span>Output Format</div>
//                         <div className="cl-panel-body cl-small-text" dangerouslySetInnerHTML={{__html:pq?.output_format||"<em>Not specified</em>"}}/>
//                       </div>
//                     </div>
//                     {samples.length>0&&(
//                       <div className="cl-panel">
//                         <div className="cl-panel-head"><span className="cl-panel-icon">🔬</span>Sample I/O ({samples.length})</div>
//                         <div className="cl-panel-body">
//                           {samples.map((s,i)=>(
//                             <div className="cl-io-block" key={i}>
//                               <div className="cl-io-label">Sample {i+1}</div>
//                               <div className="cl-io-row">
//                                 <div className="cl-io-half"><div className="cl-io-sublabel">Input</div><pre className="cl-code-block cl-code-input">{s.input}</pre></div>
//                                 <div className="cl-io-half"><div className="cl-io-sublabel">Output</div><pre className="cl-code-block cl-code-output">{s.output}</pre></div>
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   {/* RIGHT */}
//                   <div className="cl-detail-col">
//                     {(whitelist.length>0||blacklist.length>0)&&(
//                       <div className="cl-panel">
//                         <div className="cl-panel-head"><span className="cl-panel-icon">🛡️</span>Code Constraints</div>
//                         <div className="cl-panel-body">
//                           {whitelist.length>0&&(<div className="cl-constraint-group"><div className="cl-constraint-label cl-wl-label">✓ Whitelist (Required)</div><div className="cl-constraint-tags">{whitelist.map(w=><span className="cl-ctag cl-ctag-white" key={w}>{w}</span>)}</div></div>)}
//                           {blacklist.length>0&&(<div className="cl-constraint-group"><div className="cl-constraint-label cl-bl-label">✕ Blacklist (Forbidden)</div><div className="cl-constraint-tags">{blacklist.map(b=><span className="cl-ctag cl-ctag-black" key={b}>{b}</span>)}</div></div>)}
//                         </div>
//                       </div>
//                     )}
//                     {tcs.length>0&&(
//                       <div className="cl-panel">
//                         <div className="cl-panel-head"><span className="cl-panel-icon">🧪</span>Test Cases ({tcs.length})</div>
//                         <div className="cl-panel-body cl-tc-scroll">
//                           {tcs.map((tc,i)=>(
//                             <div className="cl-tc-block" key={i}>
//                               <div className="cl-tc-head-row">
//                                 <span className="cl-tc-num">TC {i+1}</span>
//                                 {tc.difficulty&&<span className={`cl-tag ${diffColor(tc.difficulty)}`}>{tc.difficulty}</span>}
//                                 {tc.score&&<span className="cl-tag cl-tag-score">Score: {tc.score}</span>}
//                               </div>
//                               <div className="cl-io-row">
//                                 <div className="cl-io-half"><div className="cl-io-sublabel">Input</div><pre className="cl-code-block cl-code-input">{tc.input}</pre></div>
//                                 <div className="cl-io-half"><div className="cl-io-sublabel">Expected Output</div><pre className="cl-code-block cl-code-output">{tc.output}</pre></div>
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     )}
//                     {solCode&&(
//                       <div className="cl-panel">
//                         <div className="cl-panel-head"><span className="cl-panel-icon">💡</span>Reference Solution · {sol?.language}</div>
//                         <div className="cl-panel-body"><pre className="cl-code-block cl-code-solution">{solCode}</pre></div>
//                       </div>
//                     )}
//                     {q.tags?.length>0&&(
//                       <div className="cl-panel">
//                         <div className="cl-panel-head"><span className="cl-panel-icon">🏷️</span>Tags</div>
//                         <div className="cl-panel-body cl-tags-wrap">{q.tags.map(t=><span className="cl-ctag cl-ctag-tag" key={t.tag_id}>{t.name}</span>)}</div>
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* ══════════════════════════════════════════════════════
//                     ROW 2 — FULL WIDTH: QC Analysis (left) | Compiler (right)
//                     ══════════════════════════════════════════════════════ */}
//                {/* ══════════════════════════════════════════════════════
//     ROW 2 — AI QC PANEL
// ══════════════════════════════════════════════════════ */}

// <div style={{display:"flex",flexDirection:"column",gap:"18px",marginTop:"8px"}}>

// {/* ───────────────── AI QC PANEL ───────────────── */}

// <div className="cl-panel cl-panel-qc" style={{margin:0}}>
//   <div className="cl-panel-head">
//     <span className="cl-panel-icon">🔍</span>
//     AI Quality Check

//     {qcState==="idle" && <span className="cl-qc-badge-ready">Ready</span>}

//     {qcState==="running" &&
//       <span className="cl-qc-badge-ready"
//         style={{background:"#eff6ff",color:"#1d4ed8",borderColor:"#bfdbfe"}}>
//         Analysing…
//       </span>
//     }

//     {qcState==="done" && qcResult &&
//       <span className="cl-qc-badge-ready"
//         style={{
//           background:oBg(qcResult.status),
//           color:oColor(qcResult.status),
//           borderColor:oBdr(qcResult.status)
//         }}>
//         {qcResult.status} · {qcResult.overallScore}/10
//       </span>
//     }

//     {qcState==="error" &&
//       <span className="cl-qc-badge-ready"
//         style={{background:"#fef2f2",color:"#b91c1c",borderColor:"#fca5a5"}}>
//         Error
//       </span>
//     }
//   </div>

//   <div className="cl-panel-body">

//     {/* IDLE */}
//     {qcState==="idle" && (
//       <div className="cl-qc-placeholder">
//         <div className="cl-qc-ph-icon">🔍</div>

//         <p className="cl-qc-ph-text">
//           AI checks description completeness, solution correctness,
//           whitelist / blacklist, sample I/O validity and difficulty match
//         </p>

//         <button
//           className="cl-btn-qc"
//           disabled={!solCode}
//           onClick={()=>runQCAnalysis(q)}
//         >
//           🔍 Run QC Analysis
//         </button>

//         {!solCode &&
//           <p style={{fontSize:"11px",color:"#ef4444",marginTop:"8px"}}>
//             ⚠ No reference solution found
//           </p>
//         }
//       </div>
//     )}

//     {/* RUNNING */}
//     {qcState==="running" && (
//       <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px",padding:"32px"}}>
//         <div className="cl-spin-ring"><div className="cl-spin-inner"/></div>
//         <p style={{fontSize:"13px",color:"#6366f1",fontWeight:600}}>AI is analysing the question…</p>
//         <p style={{fontSize:"11px",color:"#94a3b8"}}>Checking format, logic, constraints</p>
//       </div>
//     )}

//     {/* ERROR */}
//     {qcState==="error" && (
//       <div>
//         <div style={{
//           background:"#fef2f2",
//           border:"1.5px solid #fca5a5",
//           borderRadius:"10px",
//           padding:"14px"
//         }}>
//           <p style={{fontWeight:700,color:"#b91c1c"}}>❌ Analysis Failed</p>
//           <p style={{fontSize:"12px",color:"#991b1b"}}>{qcResult?.error}</p>
//         </div>

//         <button
//           className="cl-btn-qc"
//           style={{marginTop:"12px",width:"100%"}}
//           onClick={()=>{setQcState("idle");setQcResult(null);}}
//         >
//           ↩ Retry
//         </button>
//       </div>
//     )}

//   </div>
// </div>


// {/* ══════════════════════════════════════════════════════
//     COMPILER PANEL (FULL WIDTH)
// ══════════════════════════════════════════════════════ */}

// <div className="cl-panel" style={{margin:0,border:"2px solid #e0e7ff"}}>

// <div className="cl-panel-head"
//   style={{background:"linear-gradient(135deg,#f5f3ff,#eff0ff)"}}
// >
//   <span className="cl-panel-icon">⚡</span>
//   Test Cases · Compiler

//   {compileState==="idle" &&
//     <span className="cl-qc-badge-ready"
//       style={{background:"#f0f4ff",color:"#3730a3",borderColor:"#c7d2fe"}}>
//       Ready
//     </span>
//   }

//   {compileState==="running" &&
//     <span className="cl-qc-badge-ready"
//       style={{background:"#eff6ff",color:"#1d4ed8",borderColor:"#bfdbfe"}}>
//       Running…
//     </span>
//   }

//   {compileState==="done" && summary &&
//     <span className="cl-qc-badge-ready"
//       style={{
//         background:passRate===100?"#f0fdf4":passRate>=50?"#fffbeb":"#fef2f2",
//         color:passRate===100?"#15803d":passRate>=50?"#a16207":"#b91c1c",
//         borderColor:passRate===100?"#86efac":passRate>=50?"#fde68a":"#fca5a5"
//       }}>
//       {summary.passed}/{summary.total} Passed
//     </span>
//   }

// </div>


// <div className="cl-panel-body" style={{padding:"22px"}}>

// {/* IDLE */}
// {compileState==="idle" && (
//   <div className="cl-qc-placeholder">

//     <div className="cl-qc-ph-icon">⚡</div>

//     <p className="cl-qc-ph-text">
//       Execute reference solution against
//       <strong> {tcs.length} </strong>
//       test cases
//     </p>

//     <button
//       className="cl-btn-qc"
//       disabled={!solCode || !tcs.length}
//       style={{background:"linear-gradient(135deg,#3730a3,#6366f1)"}}
//       onClick={()=>runCompiler(solCode,language,tcs)}
//     >
//       ▶ Run Test Cases
//     </button>

//   </div>
// )}


// {/* RUNNING */}
// {compileState==="running" && (
//   <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px",padding:"32px"}}>

//     <div className="cl-spin-ring"><div className="cl-spin-inner"/></div>

//     <p style={{fontSize:"13px",color:"#6366f1",fontWeight:600}}>
//       Compiling & running test cases…
//     </p>

//     <div style={{
//       width:"100%",
//       background:"#e8eaf6",
//       borderRadius:"99px",
//       height:"7px",
//       overflow:"hidden"
//     }}>
//       <div style={{
//         height:"100%",
//         background:"linear-gradient(90deg,#6366f1,#a855f7)",
//         width:`${compileProgress}%`,
//         transition:"width 0.5s"
//       }}/>
//     </div>

//     <p style={{fontSize:"11px",color:"#94a3b8"}}>
//       {Math.round(compileProgress)}% complete
//     </p>

//   </div>
// )}


// {/* RESULTS */}
// {compileState==="done" && compileResults && (

// <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>

// {/* SUMMARY */}
// <div style={{
//   padding:"18px",
//   borderRadius:"12px",
//   border:`1px solid ${passRate===100?"#86efac":"#fde68a"}`,
//   background:passRate===100?"#f0fdf4":"#fffbeb"
// }}>

// <div style={{fontSize:"20px",fontWeight:800}}>
//   {summary.passed}/{summary.total} Passed
// </div>

// <div style={{fontSize:"13px",color:"#64748b"}}>
//   {summary.failed>0
//     ? `${summary.failed} test case(s) failed`
//     : "All test cases passed ✓"}
// </div>

// </div>


// {/* TEST CASE LIST */}

// <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
//   {compileResults.results.map((r,i)=>
//     <TCCard key={i} r={r} i={i}/>
//   )}
// </div>

// </div>

// )}

// </div>
// </div>

// </div>
//               </div>
//             );
//           })()}
//           </div>{/* end cl-content */}
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect, useRef } from "react";
import { QB_ACCESS_CONFIG } from "../config";
import "./CodeLens.css";

const API      = "https://api.examly.io";
// const AI_API = "http://localhost:4000";
const AI_API = "https://cubeintouch-backend.onrender.com";

// ─── QC Step stages ───
const QC_STEPS = [
  { key: "generate", label: "Generating AI Solution",     icon: "🤖", desc: "Writing solution from description alone" },
  { key: "compile",  label: "Running Test Cases",          icon: "⚡", desc: "Executing AI solution against judge TCs" },
  { key: "analyze",  label: "Analysing Description Quality", icon: "🔍", desc: "Checking completeness, formats, alignment" },
];

export default function CodeLens() {
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [token, setToken]                   = useState("");
  const [ui, setUI]                         = useState("domain");
  const [tokenInput, setTokenInput]         = useState("");
  const [alert, setAlert]                   = useState(null);
  const [overlay, setOverlay]               = useState(false);
  const [overlayText, setOverlayText]       = useState("");

  const [qbSearch, setQbSearch]               = useState("");
  const [qbResults, setQbResults]             = useState([]);
  const [selectedQB, setSelectedQB]           = useState(null);
  const [questions, setQuestions]             = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [view, setView]                       = useState("search");

  // New unified QC state
  const [qcPhase, setQcPhase]         = useState("idle"); // idle | running | done | error
  const [qcStep, setQcStep]           = useState(null);   // generate | compile | analyze
  const [qcResult, setQcResult]       = useState(null);   // full response from backend
  const [showAiCode, setShowAiCode]   = useState(false);
  const [showTCDetail, setShowTCDetail] = useState(false);

  const reportRef = useRef(null);

  useEffect(() => {
    if (!selectedDomain) return;
    const storageKey = `examly_token_corporate_${selectedDomain}`;
    try {
      const saved = localStorage.getItem(storageKey) || "";
      setToken(saved); setUI(saved ? "main" : "welcome");
    } catch { setToken(""); setUI("welcome"); }
  }, [selectedDomain]);

  useEffect(() => {
    setQcPhase("idle"); setQcStep(null); setQcResult(null);
    setShowAiCode(false); setShowTCDetail(false);
  }, [selectedQuestion]);

  const domainConfig  = selectedDomain ? QB_ACCESS_CONFIG[selectedDomain] : null;
  const activeDeptIds = domainConfig   ? domainConfig.department_ids : [];
  const headers       = { "Content-Type": "application/json", Authorization: token };

  const showAlert   = (msg, type = "info") => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4500); };
  const showOverlay = (msg) => { setOverlayText(msg); setOverlay(true); };
  const hideOverlay = () => setOverlay(false);

  const saveToken = () => {
    if (!tokenInput.trim()) { showAlert("Token cannot be empty", "danger"); return; }
    const storageKey = `examly_token_corporate_${selectedDomain}`;
    localStorage.setItem(storageKey, tokenInput.trim());
    setToken(tokenInput.trim()); setTokenInput(""); setUI("main");
    showAlert("Token saved. CodeLens activated.", "success");
  };
  const clearToken = () => {
    const storageKey = `examly_token_corporate_${selectedDomain}`;
    try { localStorage.removeItem(storageKey); } catch {}
    setToken(""); setUI("welcome"); setTokenInput(""); resetState();
    showAlert("Session cleared.", "info");
  };
  const handleSwitchDomain = () => { setSelectedDomain(null); setUI("domain"); resetState(); setToken(""); setTokenInput(""); };
  const resetState = () => { setQbSearch(""); setQbResults([]); setSelectedQB(null); setQuestions([]); setSelectedQuestion(null); setView("search"); };

  const searchQBs = async () => {
    if (!qbSearch.trim()) { showAlert("Enter a QB name to search", "warning"); return; }
    showOverlay("Searching question banks...");
    try {
      const res = await fetch(`${API}/api/v2/questionbanks`, {
        method: "POST", headers,
        body: JSON.stringify({ branch_id:"all", department_id:activeDeptIds, limit:25, mainDepartmentUser:true, page:1, search:qbSearch.trim(), visibility:"All" })
      });
      const json = await res.json();
      const results = json?.results?.questionbanks || [];
      setQbResults(results); hideOverlay();
      if (!results.length) showAlert("No question banks found", "warning");
      else showAlert(`Found ${results.length} QB(s)`, "success");
    } catch (err) { hideOverlay(); showAlert("Error: " + err.message, "danger"); }
  };

  const fetchQuestions = async (qb) => {
    setSelectedQB(qb); showOverlay(`Fetching questions from "${qb.qb_name}"...`);
    try {
      let allQ = [], page = 1, hasMore = true;
      while (hasMore) {
        const res = await fetch(`${API}/api/v2/questionfilter`, {
          method:"POST", headers,
          body: JSON.stringify({ qb_id:qb.qb_id, type:"Single", page, limit:50 })
        });
        const json = await res.json();
        const batch = json?.non_group_questions || [];
        allQ = [...allQ, ...batch]; hasMore = batch.length === 50; page++;
      }
      setQuestions(allQ); setView("questions"); hideOverlay();
      showAlert(`Loaded ${allQ.length} questions`, "success");
    } catch (err) { hideOverlay(); showAlert("Error: " + err.message, "danger"); }
  };

  const openQuestion = (q) => { setSelectedQuestion(q); setView("detail"); };

  // ── NEW: single unified QC runner ──
  const runQC = async (q) => {
    const pq       = q.programming_question;
    const sol      = pq?.solution?.[0];
    const language = sol?.language || "Java";
    const tcs      = parseTestCases(pq?.testcases);

    if (!tcs.length) { showAlert("No test cases found — cannot run QC", "warning"); return; }

    setQcPhase("running"); setQcStep("generate"); setQcResult(null);

    try {
      const payload = {
        question:    q.question_data,
        inputFormat: pq?.input_format,
        outputFormat:pq?.output_format,
        sampleIO:    (() => { try { return JSON.parse(pq?.sample_io) || []; } catch { return []; } })(),
        language,
        whitelist:   sol?.whitelist?.[0]?.list  || [],
        blacklist:   sol?.blacklist?.[0]?.list  || [],
        difficulty:  q.manual_difficulty,
        topic:       q.topic?.name,
        testcases:   tcs,
      };

      // The backend handles all 3 steps internally; we just show progress via timed step labels
      const stepTimer1 = setTimeout(() => setQcStep("compile"),  2000);
      const stepTimer2 = setTimeout(() => setQcStep("analyze"), 10000);

      const res = await fetch(`${AI_API}/cod-qc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || e.error);
      }

      const data = await res.json();
      setQcResult(data);
      setQcPhase("done");
      setQcStep(null);

      const s = data.status;
      showAlert(
        `QC Complete · Score ${data.overallScore}/10 · ${s}`,
        s === "PASS" ? "success" : s === "WARN" ? "warning" : "danger"
      );
    } catch (err) {
      setQcPhase("error");
      setQcStep(null);
      setQcResult({ error: err.message });
      showAlert("QC Error: " + err.message, "danger");
    }
  };

  // ── Download Report ──
  const downloadReport = (q) => {
    if (!qcResult) return;
    const pq  = q.programming_question;
    const sol = pq?.solution?.[0];
    const cr  = qcResult.compileResults;
    const summary = cr?.summary;

    const lines = [
      "═══════════════════════════════════════════════════════",
      "  CodeLens QC Report",
      "═══════════════════════════════════════════════════════",
      "",
      `Question ID   : ${q.q_id}`,
      `Topic         : ${q.topic?.name} › ${q.sub_topic?.name}`,
      `Difficulty    : ${q.manual_difficulty}`,
      `Language      : ${sol?.language || "—"}`,
      `Blooms        : ${q.blooms_taxonomy}`,
      `Generated     : ${new Date().toLocaleString()}`,
      "",
      "───────────────────────────────────────────────────────",
      "  QC VERDICT",
      "───────────────────────────────────────────────────────",
      `Overall Score : ${qcResult.overallScore} / 10`,
      `Status        : ${qcResult.status}`,
      "",
      `Summary: ${qcResult.summary}`,
      "",
      qcResult.aiSolutionVerdict ? `AI Solution Verdict: ${qcResult.aiSolutionVerdict}` : "",
      "",
      "───────────────────────────────────────────────────────",
      "  AI SOLUTION COMPILE RESULTS",
      "───────────────────────────────────────────────────────",
      summary
        ? `Passed: ${summary.passed} / ${summary.total}  (Failed: ${summary.failed})`
        : "Compile results unavailable",
      "",
      ...(cr?.results || []).map((r, i) =>
        `  TC${i + 1}: ${r.passed ? "✓ PASS" : "✗ FAIL"} [${r.status}]${r.time ? "  ⏱ " + r.time : ""}${r.score > 0 ? "  +" + r.score + " pts" : ""}`
      ),
      "",
      "───────────────────────────────────────────────────────",
      "  CHECK DETAILS",
      "───────────────────────────────────────────────────────",
      ...(qcResult.checks || []).flatMap(c => [
        ``,
        `[${c.status.toUpperCase()}] ${c.name}`,
        `  Finding   : ${c.message}`,
        c.suggestion ? `  Fix needed: ${c.suggestion}` : "",
      ]),
      "",
      "───────────────────────────────────────────────────────",
      "  AI-GENERATED SOLUTION CODE",
      "───────────────────────────────────────────────────────",
      qcResult.aiSolution?.code || "Not available",
      "",
      "═══════════════════════════════════════════════════════",
      "  End of Report — CodeLens",
      "═══════════════════════════════════════════════════════",
    ].filter(l => l !== undefined);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `codelens-qc-${q.q_id?.substring(0, 8)}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert("Report downloaded!", "success");
  };

  // helpers
  const stripHtml     = (h) => { if(!h) return ""; return h.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/\s+/g," ").trim(); };
  const shortText     = (h, l=120) => { const t=stripHtml(h); return t.length>l?t.substring(0,l)+"…":t; };
  const parseSampleIO  = (r) => { try{return JSON.parse(r)||[];}catch{return[];} };
  const parseTestCases = (r) => { try{return JSON.parse(r)||[];}catch{return[];} };
  const diffColor = (d) => { if(!d)return "cl-tag-neutral"; const l=d.toLowerCase(); if(l==="easy")return "cl-tag-easy"; if(l==="hard")return "cl-tag-hard"; return "cl-tag-medium"; };

  const oColor = (s) => s==="PASS"?"#047857":s==="WARN"?"#b45309":"#be123c";
  const oBg    = (s) => s==="PASS"?"#f0fdf4":s==="WARN"?"#fffbeb":"#fff1f2";
  const oBdr   = (s) => s==="PASS"?"#a7f3d0":s==="WARN"?"#fde68a":"#fecdd3";

  const sColor = (s) => s==="pass"?"#047857":s==="warn"?"#b45309":"#be123c";
  const sBg    = (s) => s==="pass"?"#f0fdf4":s==="warn"?"#fffbeb":"#fff1f2";
  const sBdr   = (s) => s==="pass"?"#a7f3d0":s==="warn"?"#fde68a":"#fecdd3";

  function highlightDiff(expected, actual) {
    const eLines = (expected || "").split("\n");
    const aLines = (actual   || "").split("\n");
    return aLines.map((line, i) =>
      line !== eLines[i]
        ? `<span style="background:#7f1d1d;color:#fecaca;padding:1px 3px;border-radius:3px;">${line}</span>`
        : line
    ).join("\n");
  }

  // TCCard for compile results
  const TCCard = ({ r, i }) => {
    const [open, setOpen] = useState(!r.passed);
    const diffActual = !r.passed ? highlightDiff(r.expected, r.actual) : r.actual;
    return (
      <div style={{border:"1px solid #e2e8f0",borderRadius:"12px",overflow:"hidden",background:"#fff",marginBottom:"10px"}}>
        <div onClick={() => setOpen(v => !v)}
          style={{display:"flex",alignItems:"center",padding:"12px 16px",background:r.passed?"#f0fdf4":"#fff1f2",cursor:"pointer",gap:"12px"}}>
          <span style={{fontSize:"16px"}}>{r.passed?"✅":"❌"}</span>
          <span style={{fontSize:"13px",fontWeight:700,color:"#0f172a"}}>TC {i+1}</span>
          <span style={{fontSize:"11px",fontWeight:700,padding:"3px 9px",borderRadius:"999px",background:"#fff",
            border:`1px solid ${r.passed?"#22c55e":"#ef4444"}`,color:r.passed?"#15803d":"#b91c1c"}}>{r.status}</span>
          <div style={{marginLeft:"auto",display:"flex",gap:"14px",alignItems:"center"}}>
            {r.time && r.time !== "—" && <span style={{fontSize:"11px",color:"#64748b"}}>⏱ {r.time}</span>}
            {r.score > 0 && <span style={{fontSize:"11px",fontWeight:700,color:"#047857"}}>+{r.score} pts</span>}
            <span style={{fontSize:"16px",transform:open?"rotate(90deg)":"rotate(0deg)",transition:"0.2s"}}>›</span>
          </div>
        </div>
        {open && (
          <div style={{padding:"16px",background:"#fafafa",display:"flex",flexDirection:"column",gap:"14px"}}>
            <div>
              <div style={{fontSize:"10px",fontWeight:800,letterSpacing:"1px",color:"#6366f1",marginBottom:"5px"}}>INPUT</div>
              <pre style={{background:"#0d1117",color:"#e2e8f0",padding:"12px",borderRadius:"8px",fontSize:"12px",fontFamily:"JetBrains Mono,monospace",overflow:"auto",margin:0}}>{r.input||"(empty)"}</pre>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
              <div>
                <div style={{fontSize:"10px",fontWeight:800,letterSpacing:"1px",color:"#047857",marginBottom:"5px"}}>EXPECTED</div>
                <pre style={{background:"#0d1117",color:"#6ee7b7",padding:"12px",borderRadius:"8px",fontSize:"12px",fontFamily:"JetBrains Mono,monospace",margin:0}}>{r.expected||"(empty)"}</pre>
              </div>
              <div>
                <div style={{fontSize:"10px",fontWeight:800,letterSpacing:"1px",color:r.passed?"#047857":"#ef4444",marginBottom:"5px"}}>{r.passed?"ACTUAL ✓":"ACTUAL ✗"}</div>
                <pre dangerouslySetInnerHTML={{__html:diffActual||"(no output)"}}
                  style={{background:"#0d1117",color:r.passed?"#6ee7b7":"#fecaca",padding:"12px",borderRadius:"8px",fontSize:"12px",fontFamily:"JetBrains Mono,monospace",margin:0}}/>
              </div>
            </div>
            {r.error && (
              <div>
                <div style={{fontSize:"10px",fontWeight:800,letterSpacing:"1px",color:"#ef4444",marginBottom:"5px"}}>STDERR</div>
                <pre style={{background:"#1a0a0a",color:"#fca5a5",padding:"12px",borderRadius:"8px",fontSize:"12px",fontFamily:"JetBrains Mono,monospace",margin:0}}>{r.error}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cl-root">
      {overlay&&(<div className="cl-overlay"><div className="cl-overlay-box"><div className="cl-spin-ring"><div className="cl-spin-inner"/></div><p className="cl-overlay-text">{overlayText}</p></div></div>)}
      {alert&&(<div className={`cl-alert cl-alert-${alert.type}`}><span className="cl-alert-dot"/>{alert.msg}</div>)}

      {/* DOMAIN */}
      {ui==="domain"&&(
        <div className="cl-auth">
          <div className="cl-auth-left">
            <div className="cl-auth-pattern"/>
            <div className="cl-auth-brand">
              <div className="cl-auth-logo">🔭</div>
              <h1 className="cl-auth-title">CodeLens</h1>
              <p className="cl-auth-sub">Compiler Mode · Code QC Automation</p>
              <div className="cl-auth-features">
                {["AI generates solution from description","Solution tested against judge test cases","Description quality scored by AI","Whitelist / blacklist validation"].map(f=>(
                  <div className="cl-auth-feat" key={f}><span className="cl-auth-feat-dot"/>{f}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="cl-auth-right">
            <div className="cl-auth-card">
              <div className="cl-auth-card-icon">🔭</div>
              <p className="cl-form-step">Step 1 of 2</p>
              <h2 className="cl-auth-card-title">Select Domain</h2>
              <p className="cl-auth-card-sub">Choose the corporate domain you want to work with</p>
              <div className="cl-domain-list">
                {["LTI","HEXAWARE"].map(dk=>{
                  const cfg=QB_ACCESS_CONFIG[dk]; if(!cfg)return null;
                  return(
                    <div key={dk} className="cl-domain-card" onClick={()=>setSelectedDomain(dk)}
                      style={{"--domain-color":cfg.color}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=cfg.color;e.currentTarget.style.background=`${cfg.color}08`;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="";e.currentTarget.style.background="";}}>
                      <div className="cl-domain-icon-wrap" style={{background:`${cfg.color}15`}}>{cfg.icon}</div>
                      <div className="cl-domain-info"><div className="cl-domain-label">{cfg.label}</div><div className="cl-domain-desc">{cfg.description}</div></div>
                      <span className="cl-domain-arrow">→</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOKEN */}
      {ui==="welcome"&&(
        <div className="cl-auth">
          <div className="cl-auth-left">
            <div className="cl-auth-pattern"/>
            <div className="cl-auth-brand">
              <div className="cl-auth-logo">🔭</div>
              <h1 className="cl-auth-title">CodeLens</h1>
              <p className="cl-auth-sub">Compiler Mode · Code QC Automation</p>
              {domainConfig&&<div className="cl-auth-domain-chip"><span>{domainConfig.icon}</span><span>{domainConfig.label}</span></div>}
            </div>
          </div>
          <div className="cl-auth-right">
            <div className="cl-auth-card">
              <div className="cl-auth-card-icon">🔑</div>
              <p className="cl-form-step">Step 2 of 2</p>
              <h2 className="cl-auth-card-title">Enter API Token</h2>
              <p className="cl-auth-card-sub">Paste your Examly Authorization token to activate CodeLens</p>
              <label className="cl-label">Authorization Token</label>
              <textarea className="cl-textarea" value={tokenInput} onChange={e=>setTokenInput(e.target.value)} placeholder="Paste token here..." rows={5}/>
              <button className="cl-btn-primary" onClick={saveToken}>Activate CodeLens <span>→</span></button>
              <button className="cl-btn-back" onClick={()=>{setSelectedDomain(null);setUI("domain");}}>← Back to Domain Selection</button>
              <p className="cl-auth-note">🔐 Token saved per domain in localStorage</p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      {ui==="main"&&(
        <div className="cl-main">
          <div className="cl-topbar">
            <div className="cl-topbar-left">
              <span className="cl-topbar-logo">🔭</span>
              <div><div className="cl-topbar-title">CodeLens</div><div className="cl-topbar-sub">Compiler Mode · Code QC Automation</div></div>
            </div>
            <div className="cl-topbar-right">
              {view!=="search"&&(
                <button className="cl-btn-ghost" onClick={()=>{if(view==="detail"){setView("questions");setSelectedQuestion(null);}else{setView("search");setSelectedQB(null);setQuestions([]);}}}>← Back</button>
              )}
              {domainConfig&&(
                <div className="cl-domain-badge" style={{background:`${domainConfig.color}12`,border:`1.5px solid ${domainConfig.color}40`,color:domainConfig.color}}>
                  <span>{domainConfig.icon}</span><span>{domainConfig.label}</span>
                  <button className="cl-domain-badge-x" onClick={handleSwitchDomain} style={{color:domainConfig.color}}>✕</button>
                </div>
              )}
              <div className="cl-token-badge"><span className="cl-token-dot"/><span>Connected</span></div>
              <button className="cl-btn-logout" onClick={clearToken}>🚪 Logout</button>
            </div>
          </div>

          <div className="cl-breadcrumb">
            <span className={`cl-bc-item ${view==="search"?"cl-bc-active":"cl-bc-link"}`} onClick={()=>{setView("search");setSelectedQB(null);setQuestions([]);setSelectedQuestion(null);}}>QB Search</span>
            {selectedQB&&(<><span className="cl-bc-sep">›</span><span className={`cl-bc-item ${view==="questions"?"cl-bc-active":"cl-bc-link"}`} onClick={()=>{setView("questions");setSelectedQuestion(null);}}>{selectedQB.qb_name}</span></>)}
            {selectedQuestion&&(<><span className="cl-bc-sep">›</span><span className="cl-bc-item cl-bc-active">Question Detail</span></>)}
          </div>

          <div className="cl-content">

          {/* QB SEARCH */}
          {view==="search"&&(
            <div className="cl-section">
              <div className="cl-section-header">
                <div className="cl-section-icon">📦</div>
                <div><h2 className="cl-section-title">Select Question Bank</h2><p className="cl-section-sub">Search and select a COD question bank · Domain: {domainConfig?.label}</p></div>
              </div>
              <div className="cl-search-row">
                <div className="cl-search-wrap">
                  <span className="cl-search-icon">🔍</span>
                  <input className="cl-search-input" value={qbSearch} onChange={e=>setQbSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchQBs()} placeholder="e.g. Cloud_Java_COD"/>
                </div>
                <button className="cl-btn-primary" onClick={searchQBs}>Search</button>
              </div>
              {qbResults.length>0?(
                <div className="cl-qb-grid">
                  {qbResults.map(qb=>(
                    <div className="cl-qb-card" key={qb.qb_id} onClick={()=>fetchQuestions(qb)}>
                      <div className="cl-qb-card-top"><span className="cl-qb-icon">📚</span><span className={`cl-visibility-badge ${qb.visibility==="Public"?"cl-vis-public":"cl-vis-dept"}`}>{qb.visibility}</span></div>
                      <div className="cl-qb-name">{qb.qb_name}</div>
                      <div className="cl-qb-meta"><span className="cl-qb-count">{qb.questionCount} questions</span><span className="cl-qb-role">{qb.user_role}</span></div>
                      <div className="cl-qb-arrow">Open →</div>
                    </div>
                  ))}
                </div>
              ):(
                <div className="cl-empty"><div className="cl-empty-icon">🔭</div><p>Search for a question bank to begin</p></div>
              )}
            </div>
          )}

          {/* QUESTIONS LIST */}
          {view==="questions"&&(
            <div className="cl-section">
              <div className="cl-section-header">
                <div className="cl-section-icon">📋</div>
                <div><h2 className="cl-section-title">{selectedQB?.qb_name}</h2><p className="cl-section-sub">{questions.length} programming questions · Click any to inspect</p></div>
                <div className="cl-section-stat"><span className="cl-stat-num">{questions.length}</span><span className="cl-stat-label">Questions</span></div>
              </div>
              <div className="cl-q-list">
                {questions.map((q,idx)=>{
                  const pq=q.programming_question; const samples=parseSampleIO(pq?.sample_io); const tcs=parseTestCases(pq?.testcases);
                  const sol=pq?.solution?.[0]; const lang=sol?.language||"—";
                  const hasWL=sol?.whitelist?.[0]?.list?.length>0; const hasBL=sol?.blacklist?.[0]?.list?.length>0;
                  return(
                    <div className="cl-q-row" key={q.q_id} onClick={()=>openQuestion(q)}>
                      <div className="cl-q-num">Q{idx+1}</div>
                      <div className="cl-q-body">
                        <div className="cl-q-text">{shortText(q.question_data)}</div>
                        <div className="cl-q-tags-row">
                          <span className={`cl-tag ${diffColor(q.manual_difficulty)}`}>{q.manual_difficulty||"—"}</span>
                          <span className="cl-tag cl-tag-lang">{lang}</span>
                          <span className="cl-tag cl-tag-neutral">{q.topic?.name}</span>
                          <span className="cl-tag cl-tag-neutral">{q.sub_topic?.name}</span>
                          {hasWL&&<span className="cl-tag cl-tag-white">✓ WL</span>}
                          {hasBL&&<span className="cl-tag cl-tag-black">✕ BL</span>}
                          <span className="cl-tag cl-tag-tc">{tcs.length} TCs</span>
                          <span className="cl-tag cl-tag-sample">{samples.length} Samples</span>
                        </div>
                      </div>
                      <div className="cl-q-chevron">›</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUESTION DETAIL */}
          {view==="detail"&&selectedQuestion&&(()=>{
            const q   = selectedQuestion;
            const pq  = q.programming_question;
            const samples  = parseSampleIO(pq?.sample_io);
            const tcs      = parseTestCases(pq?.testcases);
            const sol      = pq?.solution?.[0];
            const whitelist= sol?.whitelist?.[0]?.list||[];
            const blacklist= sol?.blacklist?.[0]?.list||[];
            const solCode  = sol?.solutiondata?.[0]?.solution||"";

            const cr       = qcResult?.compileResults;
            const summary  = cr?.summary;
            const passRate = summary ? Math.round((summary.passed / summary.total) * 100) : 0;

            return (
              <div className="cl-detail" ref={reportRef}>

                {/* HEADER */}
                <div className="cl-detail-header">
                  <div className="cl-detail-title-row">
                    <h2 className="cl-detail-title">Question Detail</h2>
                    <div className="cl-detail-badges">
                      <span className={`cl-tag ${diffColor(q.manual_difficulty)}`}>{q.manual_difficulty}</span>
                      <span className="cl-tag cl-tag-lang">{sol?.language||"N/A"}</span>
                      <span className="cl-tag cl-tag-neutral">{q.blooms_taxonomy}</span>
                    </div>
                  </div>
                  <div className="cl-detail-meta-row">
                    <span>📁 {q.topic?.name}</span><span>›</span><span>{q.sub_topic?.name}</span>
                    <span className="cl-detail-meta-sep"/>
                    <span>🆔 {q.q_id?.substring(0,8)}…</span>
                  </div>
                </div>

                {/* ROW 1: Problem + Right panels */}
                <div className="cl-detail-grid" style={{marginBottom:"20px"}}>
                  {/* LEFT */}
                  <div className="cl-detail-col">
                    <div className="cl-panel">
                      <div className="cl-panel-head"><span className="cl-panel-icon">📝</span>Problem Statement</div>
                      <div className="cl-panel-body cl-problem-text" dangerouslySetInnerHTML={{__html:q.question_data}}/>
                    </div>
                    <div className="cl-panel-row">
                      <div className="cl-panel cl-panel-half">
                        <div className="cl-panel-head"><span className="cl-panel-icon">📥</span>Input Format</div>
                        <div className="cl-panel-body cl-small-text" dangerouslySetInnerHTML={{__html:pq?.input_format||"<em>Not specified</em>"}}/>
                      </div>
                      <div className="cl-panel cl-panel-half">
                        <div className="cl-panel-head"><span className="cl-panel-icon">📤</span>Output Format</div>
                        <div className="cl-panel-body cl-small-text" dangerouslySetInnerHTML={{__html:pq?.output_format||"<em>Not specified</em>"}}/>
                      </div>
                    </div>
                    {samples.length>0&&(
                      <div className="cl-panel">
                        <div className="cl-panel-head"><span className="cl-panel-icon">🔬</span>Sample I/O ({samples.length})</div>
                        <div className="cl-panel-body">
                          {samples.map((s,i)=>(
                            <div className="cl-io-block" key={i}>
                              <div className="cl-io-label">Sample {i+1}</div>
                              <div className="cl-io-row">
                                <div className="cl-io-half"><div className="cl-io-sublabel">Input</div><pre className="cl-code-block cl-code-input">{s.input}</pre></div>
                                <div className="cl-io-half"><div className="cl-io-sublabel">Output</div><pre className="cl-code-block cl-code-output">{s.output}</pre></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT */}
                  <div className="cl-detail-col">
                    {(whitelist.length>0||blacklist.length>0)&&(
                      <div className="cl-panel">
                        <div className="cl-panel-head"><span className="cl-panel-icon">🛡️</span>Code Constraints</div>
                        <div className="cl-panel-body">
                          {whitelist.length>0&&(<div className="cl-constraint-group"><div className="cl-constraint-label cl-wl-label">✓ Whitelist (Required)</div><div className="cl-constraint-tags">{whitelist.map(w=><span className="cl-ctag cl-ctag-white" key={w}>{w}</span>)}</div></div>)}
                          {blacklist.length>0&&(<div className="cl-constraint-group"><div className="cl-constraint-label cl-bl-label">✕ Blacklist (Forbidden)</div><div className="cl-constraint-tags">{blacklist.map(b=><span className="cl-ctag cl-ctag-black" key={b}>{b}</span>)}</div></div>)}
                        </div>
                      </div>
                    )}
                    {tcs.length>0&&(
                      <div className="cl-panel">
                        <div className="cl-panel-head"><span className="cl-panel-icon">🧪</span>Test Cases ({tcs.length})</div>
                        <div className="cl-panel-body cl-tc-scroll">
                          {tcs.map((tc,i)=>(
                            <div className="cl-tc-block" key={i}>
                              <div className="cl-tc-head-row">
                                <span className="cl-tc-num">TC {i+1}</span>
                                {tc.difficulty&&<span className={`cl-tag ${diffColor(tc.difficulty)}`}>{tc.difficulty}</span>}
                                {tc.score&&<span className="cl-tag cl-tag-score">Score: {tc.score}</span>}
                              </div>
                              <div className="cl-io-row">
                                <div className="cl-io-half"><div className="cl-io-sublabel">Input</div><pre className="cl-code-block cl-code-input">{tc.input}</pre></div>
                                <div className="cl-io-half"><div className="cl-io-sublabel">Expected Output</div><pre className="cl-code-block cl-code-output">{tc.output}</pre></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {solCode&&(
                      <div className="cl-panel">
                        <div className="cl-panel-head"><span className="cl-panel-icon">💡</span>Ref Solution · {sol?.language}</div>
                        <div className="cl-panel-body"><pre className="cl-code-block cl-code-solution">{solCode}</pre></div>
                      </div>
                    )}
                    {q.tags?.length>0&&(
                      <div className="cl-panel">
                        <div className="cl-panel-head"><span className="cl-panel-icon">🏷️</span>Tags</div>
                        <div className="cl-panel-body cl-tags-wrap">{q.tags.map(t=><span className="cl-ctag cl-ctag-tag" key={t.tag_id}>{t.name}</span>)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ═══════════════════════════════════════════
                    QC PANEL — NEW FLOW
                    ═══════════════════════════════════════════ */}
                <div className="cl-panel cl-panel-qc" style={{margin:0}}>

                  {/* Panel Header */}
                  <div className="cl-panel-head" style={{justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span className="cl-panel-icon">🤖</span>
                      <span>AI Code QC</span>
                      <span style={{fontSize:"11px",color:"#94a3b8",fontWeight:400}}>· generates solution → runs TCs → scores description</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      {/* Status badge */}
                      {qcPhase==="idle" && <span className="cl-qc-badge-ready">Ready</span>}
                      {qcPhase==="running" && <span className="cl-qc-badge-ready" style={{background:"#eff6ff",color:"#1d4ed8",borderColor:"#bfdbfe"}}>Running…</span>}
                      {qcPhase==="error"   && <span className="cl-qc-badge-ready" style={{background:"#fff1f2",color:"#be123c",borderColor:"#fecdd3"}}>Error</span>}
                      {qcPhase==="done" && qcResult && (
                        <span className="cl-qc-badge-ready" style={{background:oBg(qcResult.status),color:oColor(qcResult.status),borderColor:oBdr(qcResult.status)}}>
                          {qcResult.status} · {qcResult.overallScore}/10
                        </span>
                      )}
                      {/* Download button — only when done */}
                      {qcPhase==="done" && qcResult && (
                        <button
                          onClick={() => downloadReport(q)}
                          style={{
                            display:"flex",alignItems:"center",gap:"6px",
                            padding:"5px 13px",borderRadius:"8px",border:"1px solid #c4b5fd",
                            background:"#f5f3ff",color:"#5b4ef8",
                            fontSize:"12px",fontWeight:700,cursor:"pointer",
                            transition:"all 0.2s",whiteSpace:"nowrap",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background="#ede9fe"; }}
                          onMouseLeave={e => { e.currentTarget.style.background="#f5f3ff"; }}
                        >
                          ⬇ Download Report
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="cl-panel-body" style={{padding:"20px"}}>

                    {/* ── IDLE ── */}
                    {qcPhase==="idle" && (
                      <div className="cl-qc-placeholder">
                        <div style={{fontSize:"42px"}}>🤖</div>
                        <div style={{textAlign:"center",maxWidth:"420px"}}>
                          <p style={{fontSize:"14px",fontWeight:700,color:"#1e293b",marginBottom:"6px"}}>AI-Powered Description QC</p>
                          <p style={{fontSize:"12px",color:"#64748b",lineHeight:1.7}}>
                            An AI will independently write a {sol?.language||"Java"} solution from the description alone,
                            run it against all <strong>{tcs.length}</strong> test cases, then score the description's
                            completeness, I/O format clarity, and consistency.
                          </p>
                        </div>
                        {/* Step preview */}
                        <div style={{display:"flex",gap:"10px",marginTop:"4px",flexWrap:"wrap",justifyContent:"center"}}>
                          {QC_STEPS.map((s,i)=>(
                            <div key={s.key} style={{display:"flex",alignItems:"center",gap:"6px",padding:"7px 13px",
                              borderRadius:"8px",background:"#f8faff",border:"1px solid #e8eaf6",fontSize:"12px",color:"#64748b"}}>
                              <span>{s.icon}</span><span style={{fontWeight:600}}>{s.label}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          className="cl-btn-qc"
                          disabled={!tcs.length}
                          onClick={() => runQC(q)}
                          style={{marginTop:"8px",padding:"11px 32px",fontSize:"14px"}}
                        >
                          🤖 Get AI Code &amp; Run QC
                        </button>
                        {!tcs.length && <p style={{fontSize:"11px",color:"#ef4444",marginTop:"4px"}}>⚠ No test cases — cannot run QC</p>}
                      </div>
                    )}

                    {/* ── RUNNING ── */}
                    {qcPhase==="running" && (
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"24px",padding:"32px 16px"}}>
                        <div className="cl-spin-ring"><div className="cl-spin-inner"/></div>
                        {/* Step tracker */}
                        <div style={{display:"flex",flexDirection:"column",gap:"10px",width:"100%",maxWidth:"440px"}}>
                          {QC_STEPS.map((s) => {
                            const stepIdx = QC_STEPS.findIndex(x => x.key === qcStep);
                            const thisIdx = QC_STEPS.findIndex(x => x.key === s.key);
                            const isDone    = thisIdx < stepIdx;
                            const isActive  = s.key === qcStep;
                            const isPending = thisIdx > stepIdx;
                            return (
                              <div key={s.key} style={{
                                display:"flex",alignItems:"center",gap:"12px",
                                padding:"12px 16px",borderRadius:"10px",
                                background: isActive?"#eff0ff": isDone?"#f0fdf4":"#f8faff",
                                border: `1px solid ${isActive?"#c7d2fe":isDone?"#a7f3d0":"#e8eaf6"}`,
                                transition:"all 0.3s",
                              }}>
                                <span style={{fontSize:"18px"}}>{isDone?"✅":isActive?"⏳":s.icon}</span>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:"13px",fontWeight:700,color:isActive?"#3730a3":isDone?"#047857":"#64748b"}}>{s.label}</div>
                                  <div style={{fontSize:"11px",color:"#94a3b8",marginTop:"2px"}}>{s.desc}</div>
                                </div>
                                {isActive && <div className="cl-spin-ring" style={{width:"18px",height:"18px",borderWidth:"2px"}}><div className="cl-spin-inner"/></div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── ERROR ── */}
                    {qcPhase==="error" && (
                      <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                        <div style={{background:"#fff1f2",border:"1.5px solid #fecdd3",borderRadius:"10px",padding:"16px"}}>
                          <p style={{fontWeight:700,color:"#be123c",marginBottom:"4px"}}>❌ QC Failed</p>
                          <p style={{fontSize:"12px",color:"#9f1239"}}>{qcResult?.error}</p>
                        </div>
                        <button className="cl-btn-qc" onClick={()=>{setQcPhase("idle");setQcResult(null);}}>↩ Retry</button>
                      </div>
                    )}

                    {/* ── DONE ── */}
                    {qcPhase==="done" && qcResult && (() => {
                      const checks = qcResult.checks || [];
                      const cr     = qcResult.compileResults;
                      const sum    = cr?.summary;
                      const pr     = sum ? Math.round((sum.passed/sum.total)*100) : 0;

                      return (
                        <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>

                          {/* ── Overall Summary Card ── */}
                          <div style={{
                            padding:"20px 22px",borderRadius:"14px",
                            background: oBg(qcResult.status),
                            border:`1.5px solid ${oBdr(qcResult.status)}`,
                            display:"flex",gap:"20px",alignItems:"flex-start",flexWrap:"wrap",
                          }}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",color:oColor(qcResult.status),marginBottom:"6px"}}>QC Summary</div>
                              <p style={{fontSize:"13px",color:"#334155",lineHeight:1.7}}>{qcResult.summary}</p>
                              {qcResult.aiSolutionVerdict && (
                                <p style={{fontSize:"12px",color:"#64748b",marginTop:"8px",fontStyle:"italic"}}>
                                  🤖 {qcResult.aiSolutionVerdict}
                                </p>
                              )}
                            </div>
                            <div style={{textAlign:"center",minWidth:"90px"}}>
                              <div style={{fontSize:"36px",fontWeight:800,color:oColor(qcResult.status),lineHeight:1}}>{qcResult.overallScore}</div>
                              <div style={{fontSize:"11px",color:"#94a3b8",fontWeight:600}}>/10</div>
                              <div style={{fontSize:"12px",fontWeight:800,color:oColor(qcResult.status),marginTop:"4px",
                                background:"white",border:`1px solid ${oBdr(qcResult.status)}`,borderRadius:"6px",padding:"2px 10px"}}>
                                {qcResult.status}
                              </div>
                            </div>
                          </div>

                          {/* ── Compile Results (AI solution) ── */}
                          {sum && (
                            <div className="cl-panel" style={{overflow:"hidden"}}>
                              <div className="cl-panel-head" style={{background:"linear-gradient(135deg,#f5f3ff,#eff0ff)"}}>
                                <span className="cl-panel-icon">⚡</span>
                                AI Solution · Test Case Results
                                <span className="cl-qc-badge-ready" style={{
                                  background: pr===100?"#f0fdf4":pr>=50?"#fffbeb":"#fff1f2",
                                  color:       pr===100?"#047857":pr>=50?"#b45309":"#be123c",
                                  borderColor: pr===100?"#a7f3d0":pr>=50?"#fde68a":"#fecdd3",
                                }}>
                                  {sum.passed}/{sum.total} Passed · {pr}%
                                </span>
                                <button
                                  onClick={() => setShowTCDetail(v=>!v)}
                                  style={{marginLeft:"auto",fontSize:"11px",fontWeight:700,padding:"4px 12px",
                                    border:"1px solid #c4b5fd",borderRadius:"6px",background:"white",
                                    color:"#5b4ef8",cursor:"pointer"}}>
                                  {showTCDetail ? "Hide Details" : "Show Details"}
                                </button>
                              </div>
                              {/* Mini summary bar */}
                              <div style={{padding:"12px 18px",background:"#fafbff"}}>
                                <div style={{display:"flex",gap:"8px",marginBottom:"10px",flexWrap:"wrap"}}>
                                  {(cr.results||[]).map((r,i)=>(
                                    <div key={i} title={`TC ${i+1}: ${r.status}`}
                                      style={{width:"28px",height:"28px",borderRadius:"6px",
                                        background:r.passed?"#f0fdf4":"#fff1f2",
                                        border:`1.5px solid ${r.passed?"#a7f3d0":"#fecdd3"}`,
                                        display:"flex",alignItems:"center",justifyContent:"center",
                                        fontSize:"12px",cursor:"default"}}>
                                      {r.passed?"✓":"✗"}
                                    </div>
                                  ))}
                                </div>
                                {/* Progress bar */}
                                <div style={{height:"6px",borderRadius:"99px",background:"#e2e8f0",overflow:"hidden"}}>
                                  <div style={{height:"100%",borderRadius:"99px",
                                    background:`linear-gradient(90deg,${pr===100?"#10b981":"#f59e0b"},${pr===100?"#34d399":"#fbbf24"})`,
                                    width:`${pr}%`,transition:"width 0.6s ease"}}/>
                                </div>
                              </div>
                              {/* Expanded TC cards */}
                              {showTCDetail && (
                                <div style={{padding:"12px 18px 18px"}}>
                                  {(cr.results||[]).map((r,i)=><TCCard key={i} r={r} i={i}/>)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── AI Generated Solution ── */}
                          {qcResult.aiSolution?.code && (
                            <div className="cl-panel" style={{overflow:"hidden"}}>
                              <div className="cl-panel-head" style={{background:"linear-gradient(135deg,#fef9ec,#fef3c7)"}}>
                                <span className="cl-panel-icon">🤖</span>
                                AI-Generated Solution · {qcResult.aiSolution.language}
                                <span style={{fontSize:"10px",color:"#a16207",fontWeight:600,marginLeft:"4px"}}>
                                  (generated from description only)
                                </span>
                                <button
                                  onClick={() => setShowAiCode(v=>!v)}
                                  style={{marginLeft:"auto",fontSize:"11px",fontWeight:700,padding:"4px 12px",
                                    border:"1px solid #fde68a",borderRadius:"6px",background:"white",
                                    color:"#b45309",cursor:"pointer"}}>
                                  {showAiCode ? "Hide Code" : "View Code"}
                                </button>
                              </div>
                              {showAiCode && (
                                <div className="cl-panel-body">
                                  <pre className="cl-code-block cl-code-solution">{qcResult.aiSolution.code}</pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Check Details ── */}
                          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                            <div style={{fontSize:"11px",fontWeight:800,textTransform:"uppercase",letterSpacing:"1px",color:"#64748b",marginBottom:"4px"}}>
                              Check Details
                            </div>
                            {checks.map((c) => (
                              <div key={c.key}
                                style={{
                                  border:`1px solid ${sBdr(c.status)}`,
                                  borderRadius:"10px",
                                  overflow:"hidden",
                                  background:sBg(c.status),
                                }}>
                                <div style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"13px 16px"}}>
                                  <span style={{fontSize:"16px",marginTop:"1px"}}>
                                    {c.status==="pass"?"✅":c.status==="warn"?"⚠️":"❌"}
                                  </span>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:"13px",fontWeight:700,color:sColor(c.status),marginBottom:"3px"}}>{c.name}</div>
                                    <div style={{fontSize:"12px",color:"#475569",lineHeight:1.6}}>{c.message}</div>
                                    {c.suggestion && (
                                      <div style={{
                                        marginTop:"8px",padding:"8px 12px",
                                        background:"rgba(255,255,255,0.7)",
                                        border:"1px solid rgba(0,0,0,0.06)",
                                        borderRadius:"7px",fontSize:"12px",
                                        color:"#334155",lineHeight:1.6,
                                      }}>
                                        <span style={{fontWeight:700,color:"#5b4ef8"}}>💡 Fix: </span>{c.suggestion}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{
                                    fontSize:"10px",fontWeight:800,padding:"3px 9px",borderRadius:"5px",
                                    background:"white",border:`1px solid ${sBdr(c.status)}`,
                                    color:sColor(c.status),textTransform:"uppercase",letterSpacing:"0.5px",
                                    whiteSpace:"nowrap",
                                  }}>{c.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Re-run button */}
                          <div style={{display:"flex",justifyContent:"flex-end"}}>
                            <button className="cl-btn-qc"
                              style={{background:"linear-gradient(135deg,#475569,#64748b)",fontSize:"12px",padding:"8px 20px"}}
                              onClick={()=>{setQcPhase("idle");setQcResult(null);setShowAiCode(false);setShowTCDetail(false);}}>
                              ↩ Re-run QC
                            </button>
                          </div>

                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>
            );
          })()}
          </div>
        </div>
      )}
    </div>
  );
}