
// import { useState, useEffect } from "react";
// import { CONTENT_DEPARTMENT_IDS, COURSE_DEPARTMENT_IDS, PROJECT_DEPARTMENT_IDS } from "../config";

// const API = "https://api.examly.io";

// export default function Finder() {
//   const [token, setToken] = useState(() => localStorage.getItem("examly_token") || "");
//   const [ui, setUI] = useState(token ? "search" : "welcome");
//   const [courseName, setCourseName] = useState("");
//   const [status, setStatus] = useState("");
//   const [alert, setAlert] = useState(null);
//   const [contentItems, setContentItems] = useState([]);
//   const [projectItems, setProjectItems] = useState([]);
//   const [page, setPage] = useState(1);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");
//   const [tokenInput, setTokenInput] = useState("");
//   const [isAutoDetecting, setIsAutoDetecting] = useState(false);
//   const [autoDetectStatus, setAutoDetectStatus] = useState("");

//   const PAGE_SIZE = 10;

//   useEffect(() => {
//     if (token) setUI("search");
//     else setUI("welcome");
//   }, [token]);

//   // Alert helper
//   const showAlert = (msg, type = "warning") => {
//     setAlert({ msg, type });
//     setTimeout(() => setAlert(null), 4000);
//   };

//   const showOverlay = (msg) => {
//     setOverlayText(msg);
//     setOverlay(true);
//   };

//   const hideOverlay = () => setOverlay(false);

//   // ============================================
//   // GUIDED TOKEN EXTRACTION
//   // ============================================
  
//   const startAutoDetect = () => {
//     setIsAutoDetecting(true);
//     setAutoDetectStatus("");
//   };

//   const stopAutoDetect = () => {
//     setIsAutoDetecting(false);
//     setAutoDetectStatus("");
//   };

//   // Copy instructions to clipboard
//   const copyInstructions = () => {
//     const instructions = `Step-by-step guide to extract your token:

// 1. Open: https://admin.ltimindtree.iamneo.ai/
// 2. Login to your account
// 3. Press F12 to open Developer Tools
// 4. Click on "Network" tab
// 5. Click on "Fetch/XHR" filter
// 6. Refresh the page or click any menu
// 7. Look for any request to "api.examly.io"
// 8. Click on it
// 9. Go to "Headers" section
// 10. Find "Authorization" in Request Headers
// 11. Copy the entire token value
// 12. Paste it in the token input field below`;

//     navigator.clipboard.writeText(instructions).then(() => {
//       showAlert("📋 Instructions copied to clipboard!", "success");
//     });
//   };

//   // ============================================
//   // MANUAL TOKEN MANAGEMENT
//   // ============================================

//   const saveToken = () => {
//     if (!tokenInput.trim()) {
//       showAlert("Token cannot be empty", "danger");
//       return;
//     }
//     localStorage.setItem("examly_token", tokenInput.trim());
//     setToken(tokenInput.trim());
//     setTokenInput("");
//     setUI("search");
//     showAlert("✅ Token saved successfully!", "success");
//   };

//   const clearToken = () => {
//     localStorage.removeItem("examly_token");
//     setToken("");
//     setUI("welcome");
//     setTokenInput("");
//     setContentItems([]);
//     setProjectItems([]);
//     showAlert("Token cleared", "danger");
//   };

//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: token
//   };

//   const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

//   // ============================================
//   // API HELPERS (unchanged)
//   // ============================================

//   async function findCourseByName(name) {
//     const res = await fetch(`${API}/api/v2/courses/filter`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         mainDepartmentUser: true,
//         page: 1,
//         limit: 100,
//         search: name,
//         department_id: COURSE_DEPARTMENT_IDS,
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

//   async function getAllContentBanks(schoolId) {
//     const res = await fetch(`${API}/api/v2/contentbank/all`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({
//         branch_id: "all",
//         dataIds: schoolId || "",
//         department_id: CONTENT_DEPARTMENT_IDS,
//         mainDepartmentUser: true
//       })
//     });
//     const json = await res.json();
//     return json?.results?.contentbanks || [];
//   }

//   async function fetchContentBankContents(cb_id, pageNum = 1, limit = 50) {
//     const res = await fetch(`${API}/api/content/filter`, {
//       method: "POST",
//       headers,
//       body: JSON.stringify({ cb_id, page: pageNum, limit })
//     });
//     return await res.json();
//   }

//   async function fetchAllContentBanksBatched(cbList, courseContentIds) {
//     const map = new Map();
//     const BATCH_SIZE = 3;
//     const DELAY_MS = 500;
//     const PAGE_DELAY_MS = 150;

//     async function fetchSingleCBAllPages(cb_id, cb_label) {
//       let pageNum = 1;
//       let allContent = [];

//       while (true) {
//         try {
//           const res = await fetchContentBankContents(cb_id, pageNum, 50);
//           const arr = res.content || [];

//           arr.forEach((c) => {
//             if (courseContentIds.has(c.content_id) && !map.has(c.content_id)) {
//               map.set(c.content_id, {
//                 content_id: c.content_id,
//                 name: c.name,
//                 file: c.content_media?.file || "",
//                 size: c.content_media?.size || "",
//                 type: c.content_media?.type || c.type || "",
//                 cb_id: cb_id,
//                 cb_label: cb_label,
//                 createdBy: c.createdBy || ""
//               });
//             }
//           });

//           if (arr.length < 50) break;
//           pageNum++;
//           await sleep(PAGE_DELAY_MS);
//         } catch (err) {
//           console.error(`Error fetching CB ${cb_id}:`, err);
//           break;
//         }
//       }
//       return allContent;
//     }

//     for (let i = 0; i < cbList.length; i += BATCH_SIZE) {
//       const batch = cbList.slice(i, Math.min(i + BATCH_SIZE, cbList.length));
//       const batchNum = Math.floor(i / BATCH_SIZE) + 1;
//       const totalBatches = Math.ceil(cbList.length / BATCH_SIZE);

//       showOverlay(`Batch ${batchNum}/${totalBatches}: Fetching ${batch.length} content banks...`);

//       const promises = batch.map((cb) =>
//         fetchSingleCBAllPages(cb.value || cb.cb_id, cb.label || cb.name)
//       );

//       try {
//         await Promise.all(promises);
//       } catch (err) {
//         console.error(`Batch ${batchNum} error:`, err);
//       }

//       if (i + BATCH_SIZE < cbList.length) {
//         await sleep(DELAY_MS);
//       }
//     }

//     return map;
//   }

//   function collectContentIdsFromCourse(courseData) {
//     const out = [];
    
//     console.log("Course Data Structure:", JSON.stringify(courseData, null, 2));
    
//     let modules = [];
    
//     if (courseData.course_modules?.c_module_data) {
//       modules = courseData.course_modules.c_module_data;
//     }
//     else if (Array.isArray(courseData.course_modules)) {
//       modules = courseData.course_modules;
//     }
//     else if (Array.isArray(courseData.modules)) {
//       modules = courseData.modules;
//     }
//     else if (Array.isArray(courseData.c_module_data)) {
//       modules = courseData.c_module_data;
//     }

//     modules.forEach((mod) => {
//       const moduleName = mod.c_module_name || mod.module_name || mod.name || "";

//       const subModules = mod.c_sub_modules || mod.sub_modules || [];
      
//       if (Array.isArray(subModules) && subModules.length > 0) {
//         subModules.forEach((sub) => {
//           const subName = sub.sub_module_name || sub.module_name || sub.name || "";
          
//           const params = sub.sub_module_params || sub.module_params || sub.params || [];
          
//           (params || []).forEach((p) => {
//             if (p.content_id) {
//               out.push({ content_id: p.content_id, moduleName, subName });
//             }
//             if (Array.isArray(p.content_data)) {
//               p.content_data.forEach((cd) => {
//                 if (cd.content_id) {
//                   out.push({ content_id: cd.content_id, moduleName, subName });
//                 }
//               });
//             }
//             if (Array.isArray(p.contents)) {
//               p.contents.forEach((cd) => {
//                 if (cd.content_id) {
//                   out.push({ content_id: cd.content_id, moduleName, subName });
//                 }
//               });
//             }
//           });
//         });
//       } else {
//         const params = mod.c_module_params || mod.module_params || mod.params || [];
        
//         (params || []).forEach((p) => {
//           const subName = p.sub_module_name || p.module_name || "";
          
//           if (p.content_id) {
//             out.push({ content_id: p.content_id, moduleName, subName });
//           }
          
//           if (Array.isArray(p.content_data)) {
//             p.content_data.forEach((cd) => {
//               if (cd.content_id) {
//                 out.push({ content_id: cd.content_id, moduleName, subName });
//               }
//             });
//           }
          
//           if (Array.isArray(p.contents)) {
//             p.contents.forEach((cd) => {
//               if (cd.content_id) {
//                 out.push({ content_id: cd.content_id, moduleName, subName });
//               }
//             });
//           }
//         });
//       }
//     });

//     console.log("Collected Content IDs:", out);
//     return out;
//   }

//   async function searchProjects() {
//     if (!courseName.trim()) {
//       showAlert("Please enter a course name", "warning");
//       return;
//     }

//     try {
//       setStatus("Searching projects...");
//       const courseId = await findCourseByName(courseName);
//       if (!courseId) {
//         showAlert("Course not found", "danger");
//         return;
//       }

//       const course = await getCourseDetails(courseId);
//       const modules = course.course_modules?.c_module_data || [];
//       const pbIds = new Set();

//       modules.forEach((m) =>
//         (m.c_module_params || []).forEach((p) => p.pb_id && pbIds.add(p.pb_id))
//       );

//       const schoolId = course.course_branch_department?.[0]?.school_id || "";

//       const res = await fetch(`${API}/api/projectBanks/get`, {
//         method: "POST",
//         headers,
//         body: JSON.stringify({
//           branch_id: "all",
//           page: 1,
//           limit: 200,
//           visibility: "All",
//           mainDepartmentUser: true,
//           department_id: PROJECT_DEPARTMENT_IDS,
//           dataIds: schoolId
//         })
//       });

//       const json = await res.json();
//       const rows = json?.results?.rows || [];
//       const matched = rows.filter((r) => pbIds.has(r.pb_id));

//       if (matched.length === 0) {
//         showAlert("No project banks found", "warning");
//         return;
//       }

//       setProjectItems(matched);
//       setStatus(`Found ${matched.length} project bank(s)`);
//     } catch (err) {
//       showAlert("Error: " + err.message, "danger");
//       console.error(err);
//     }
//   }

//   async function searchContents() {
//     if (!courseName.trim()) {
//       showAlert("Please enter a course name", "warning");
//       return;
//     }

//     try {
//       showOverlay("Initializing search...");
//       const courseId = await findCourseByName(courseName);
//       if (!courseId) {
//         hideOverlay();
//         showAlert("Course not found", "danger");
//         return;
//       }

//       showOverlay("Fetching course details...");
//       const course = await getCourseDetails(courseId);
//       console.log("Full Course Data:", course);
      
//       const orderedContent = collectContentIdsFromCourse(course);

//       if (!orderedContent.length) {
//         hideOverlay();
//         showAlert("⚠️ No content_id found in course modules. Check browser console for course structure.", "warning");
//         console.warn("Course structure:", JSON.stringify(course, null, 2));
//         return;
//       }

//       const courseSet = new Set(orderedContent.map((x) => x.content_id));
//       const schoolId = course.course_branch_department?.[0]?.school_id || "";
      
//       showOverlay("Fetching content banks...");
//       const banks = await getAllContentBanks(schoolId);

//       if (!banks.length) {
//         hideOverlay();
//         showAlert("No content banks found for this school", "warning");
//         return;
//       }

//       showOverlay(`Found ${banks.length} content banks. Searching...`);
//       const matches = await fetchAllContentBanksBatched(banks, courseSet);
//       const final = [];
//       const addedIds = new Set();

//       orderedContent.forEach((ctx) => {
//         if (!addedIds.has(ctx.content_id) && matches.has(ctx.content_id)) {
//           const match = matches.get(ctx.content_id);
//           final.push({
//             content_id: ctx.content_id,
//             moduleName: ctx.moduleName,
//             subName: ctx.subName,
//             contentName: match.name || match.file || "",
//             file: match.file || "",
//             cb_label: match.cb_label,
//             size: match.size,
//             createdBy: match.createdBy
//           });
//           addedIds.add(ctx.content_id);
//         }
//       });

//       hideOverlay();

//       if (!final.length) {
//         showAlert(`Found 0 matches in content banks. Searched for ${orderedContent.length} content items across ${banks.length} banks.`, "warning");
//         return;
//       }

//       setContentItems(final);
//       setPage(1);
//       setUI("content");
//       showAlert(`✅ Found ${final.length} content file(s)`, "success");
//     } catch (err) {
//       hideOverlay();
//       showAlert("Error: " + err.message, "danger");
//       console.error("Full error:", err);
//     }
//   }

//   const exportCSV = () => {
//     if (!contentItems.length) {
//       showAlert("No content to export", "warning");
//       return;
//     }

//     const headers = ["Content ID", "Module", "Submodule", "Content Name", "File", "Content Bank", "Size", "Created By"];
//     const rows = contentItems.map((item) => [
//       item.content_id,
//       item.moduleName,
//       item.subName,
//       item.contentName,
//       item.file,
//       item.cb_label,
//       item.size,
//       item.createdBy
//     ]);

//     let csv = headers.map((h) => `"${h}"`).join(",") + "\n";
//     rows.forEach((row) => {
//       csv += row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",") + "\n";
//     });

//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     const url = URL.createObjectURL(blob);

//     const timestamp = new Date().toISOString().split("T")[0];
//     const filename = `${courseName}_content_${timestamp}.csv`;

//     link.setAttribute("href", url);
//     link.setAttribute("download", filename);
//     link.style.visibility = "hidden";

//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);

//     showAlert(`Downloaded: ${filename}`, "success");
//   };

//   const totalPages = Math.max(1, Math.ceil(contentItems.length / PAGE_SIZE));
//   const pageItems = contentItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   const formatSize = (sizeStr) => {
//     if (!sizeStr) return "";
//     const n = parseFloat(sizeStr);
//     if (isNaN(n)) return sizeStr;
//     if (n > 1024) return (n / 1024).toFixed(2) + " MB";
//     return n.toFixed(2) + " KB";
//   };

//   return (
//     <div className="finder-container" style={styles.container}>
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
//           <div style={styles.alertContent}>{alert.msg}</div>
//         </div>
//       )}

//       {/* Welcome Screen */}
//       {ui === "welcome" && (
//         <div style={styles.welcome}>
//           <div style={styles.logoContainer}>
//             <div style={styles.logo}>📚</div>
//             <h2 style={styles.welcomeTitle}>Course Finder</h2>
//             <p style={styles.welcomeSubtitle}>Intelligent Course Content Discovery</p>
//           </div>

//           {/* Auto-Detection Section */}
//           <div style={styles.autoDetectSection}>
//             <div style={styles.featureBadge}>🎯 GUIDED TOKEN EXTRACTION</div>
//             <h3 style={styles.sectionTitle}>Quick Setup Guide</h3>
//             <p style={styles.sectionDesc}>
//               Follow these simple steps to extract your authentication token
//             </p>

//             {!isAutoDetecting ? (
//               <button 
//                 onClick={startAutoDetect} 
//                 style={{ ...styles.button, ...styles.buttonAutoDetect }}
//               >
//                 <span style={styles.buttonIcon}>📖</span>
//                 Show Me How
//               </button>
//             ) : (
//               <div style={styles.guideContainer}>
//                 <div style={styles.guideSteps}>
//                   <div style={styles.guideStep}>
//                     <div style={styles.stepNumber}>1</div>
//                     <div style={styles.stepContent}>
//                       <div style={styles.stepTitle}>Open Admin Panel</div>
//                       <div style={styles.stepDesc}>
//                         Go to{" "}
//                         <a 
//                           href="https://admin.ltimindtree.iamneo.ai/" 
//                           target="_blank" 
//                           rel="noopener noreferrer"
//                           style={styles.stepLink}
//                         >
//                           admin.ltimindtree.iamneo.ai
//                         </a>
//                       </div>
//                     </div>
//                   </div>

//                   <div style={styles.guideStep}>
//                     <div style={styles.stepNumber}>2</div>
//                     <div style={styles.stepContent}>
//                       <div style={styles.stepTitle}>Open Developer Tools</div>
//                       <div style={styles.stepDesc}>
//                         Press <kbd style={styles.kbd}>F12</kbd> or{" "}
//                         <kbd style={styles.kbd}>Ctrl+Shift+I</kbd> (Windows) /{" "}
//                         <kbd style={styles.kbd}>Cmd+Option+I</kbd> (Mac)
//                       </div>
//                     </div>
//                   </div>

//                   <div style={styles.guideStep}>
//                     <div style={styles.stepNumber}>3</div>
//                     <div style={styles.stepContent}>
//                       <div style={styles.stepTitle}>Navigate to Network Tab</div>
//                       <div style={styles.stepDesc}>
//                         Click on the <strong>"Network"</strong> tab, then filter by{" "}
//                         <strong>"Fetch/XHR"</strong>
//                       </div>
//                     </div>
//                   </div>

//                   <div style={styles.guideStep}>
//                     <div style={styles.stepNumber}>4</div>
//                     <div style={styles.stepContent}>
//                       <div style={styles.stepTitle}>Trigger a Request</div>
//                       <div style={styles.stepDesc}>
//                         Refresh the page or click any menu item to generate network requests
//                       </div>
//                     </div>
//                   </div>

//                   <div style={styles.guideStep}>
//                     <div style={styles.stepNumber}>5</div>
//                     <div style={styles.stepContent}>
//                       <div style={styles.stepTitle}>Find API Request</div>
//                       <div style={styles.stepDesc}>
//                         Look for any request to <strong>"api.examly.io"</strong> in the list
//                       </div>
//                     </div>
//                   </div>

//                   <div style={styles.guideStep}>
//                     <div style={styles.stepNumber}>6</div>
//                     <div style={styles.stepContent}>
//                       <div style={styles.stepTitle}>Copy Authorization Token</div>
//                       <div style={styles.stepDesc}>
//                         Click the request → <strong>"Headers"</strong> tab → Find{" "}
//                         <strong>"Authorization"</strong> → Copy the token value
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 <div style={styles.guideActions}>
//                   <button 
//                     onClick={copyInstructions}
//                     style={{ ...styles.button, ...styles.buttonSecondary }}
//                   >
//                     📋 Copy Instructions
//                   </button>
//                   <button 
//                     onClick={stopAutoDetect}
//                     style={{ ...styles.button, ...styles.buttonSecondary }}
//                   >
//                     ← Back
//                   </button>
//                 </div>

//                 <div style={styles.videoHint}>
//                   💡 <strong>Pro Tip:</strong> Once you see the token in the Headers section,
//                   right-click and select "Copy value" for easy extraction
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Divider */}
//           <div style={styles.divider}>
//             <span style={styles.dividerText}>OR</span>
//           </div>

//           {/* Manual Input Section */}
//           <div style={styles.manualSection}>
//             <h3 style={styles.sectionTitle}>Manual Entry</h3>
//             <p style={styles.sectionDesc}>Paste your API token directly</p>

//             <textarea
//               value={tokenInput}
//               onChange={(e) => setTokenInput(e.target.value)}
//               placeholder="Paste your Authorization token here..."
//               style={styles.tokenInput}
//             />

//             <button 
//               onClick={saveToken} 
//               style={{ ...styles.button, ...styles.buttonPrimary }}
//             >
//               <span style={styles.buttonIcon}>💾</span>
//               Save Token
//             </button>
//           </div>

//           <div style={styles.securityNote}>
//             <span style={styles.securityIcon}>🔒</span>
//             Your token is stored locally and never sent to external servers
//           </div>
//         </div>
//       )}

//       {/* Search Screen */}
//       {ui === "search" && (
//         <div style={styles.searchContainer}>
//           <div style={styles.searchHeader}>
//             <h3 style={styles.searchTitle}>
//               <span style={styles.searchIcon}>🔍</span>
//               Course Explorer
//             </h3>
//             <button 
//               onClick={clearToken} 
//               style={{ ...styles.button, ...styles.buttonDanger, ...styles.buttonSmall }}
//             >
//               🚪 Logout
//             </button>
//           </div>

//           <div style={styles.formGroup}>
//             <label style={styles.label}>
//               <span style={styles.labelIcon}>📖</span>
//               Course Name
//             </label>
//             <input
//               type="text"
//               value={courseName}
//               onChange={(e) => setCourseName(e.target.value)}
//               onKeyPress={(e) => e.key === "Enter" && searchContents()}
//               placeholder="Enter course name..."
//               style={styles.input}
//             />
//           </div>

//           <div style={styles.actionGrid}>
//             <button 
//               onClick={searchProjects} 
//               style={{ ...styles.button, ...styles.buttonAction, ...styles.buttonProject }}
//             >
//               <span style={styles.actionIcon}>🎯</span>
//               <div style={styles.actionContent}>
//                 <div style={styles.actionTitle}>Projects</div>
//                 <div style={styles.actionDesc}>Find project banks</div>
//               </div>
//             </button>
            
//             <button 
//               onClick={searchContents} 
//               style={{ ...styles.button, ...styles.buttonAction, ...styles.buttonContent }}
//             >
//               <span style={styles.actionIcon}>📄</span>
//               <div style={styles.actionContent}>
//                 <div style={styles.actionTitle}>Contents</div>
//                 <div style={styles.actionDesc}>Search content files</div>
//               </div>
//             </button>
//           </div>

//           {status && (
//             <div style={styles.statusCard}>
//               <span style={styles.statusIcon}>ℹ️</span>
//               {status}
//             </div>
//           )}

//           {/* Project Results */}
//           {projectItems.length > 0 && (
//             <div style={styles.results}>
//               <h4 style={styles.resultsTitle}>
//                 Project Banks ({projectItems.length})
//               </h4>
//               <div style={styles.resultsList}>
//                 {projectItems.map((item) => (
//                   <div key={item.pb_id} style={styles.resultItem}>
//                     <div style={styles.resultHeader}>
//                       <span style={styles.resultIcon}>🎯</span>
//                       <div style={styles.itemTitle}>{item.name}</div>
//                     </div>
//                     <div style={styles.itemMeta}>
//                       <span style={styles.metaLabel}>ID:</span> {item.pb_id}
//                     </div>
//                     <div style={styles.itemMeta}>
//                       <span style={styles.metaLabel}>Created by:</span> {item.createdBy || "N/A"}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Content Screen */}
//       {ui === "content" && (
//         <div style={styles.contentContainer}>
//           <div style={styles.contentHeader}>
//             <h3 style={styles.contentTitle}>
//               <span style={styles.contentIcon}>📊</span>
//               Content Results
//             </h3>
//             <div style={styles.headerActions}>
//               <button 
//                 onClick={exportCSV} 
//                 style={{ ...styles.button, ...styles.buttonSuccess, ...styles.buttonSmall }}
//               >
//                 📥 Export All
//               </button>
//               <button 
//                 onClick={() => setUI("search")} 
//                 style={{ ...styles.button, ...styles.buttonSecondary, ...styles.buttonSmall }}
//               >
//                 ← Back
//               </button>
//             </div>
//           </div>

//           <div style={styles.contentList}>
//             {pageItems.length === 0 ? (
//               <div style={styles.emptyState}>
//                 <div style={styles.emptyIcon}>📭</div>
//                 <div style={styles.emptyText}>No content files found</div>
//               </div>
//             ) : (
//               pageItems.map((item) => (
//                 <div key={item.content_id} style={styles.contentItem}>
//                   <span style={styles.cbLabel}>{item.cb_label}</span>
//                   <div style={styles.moduleName}>
//                     <span style={styles.moduleIcon}>📁</span>
//                     {item.moduleName}
//                   </div>
//                   <div style={styles.submoduleName}>
//                     <span style={styles.submoduleIcon}>└</span>
//                     {item.subName}
//                   </div>
//                   <div style={styles.contentName}>
//                     <span style={styles.fileIcon}>📄</span>
//                     {item.contentName || item.file || "Untitled"}
//                   </div>
//                   <div style={styles.meta}>
//                     {item.content_id} • {item.file} • {formatSize(item.size)}
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>

//           {/* Pagination */}
//           <div style={styles.pagination}>
//             <button
//               onClick={() => setPage(Math.max(1, page - 1))}
//               disabled={page <= 1}
//               style={{ 
//                 ...styles.button, 
//                 ...styles.buttonSecondary,
//                 ...(page <= 1 ? styles.buttonDisabled : {}) 
//               }}
//             >
//               ← Previous
//             </button>
//             <span style={styles.pageInfo}>
//               Page <strong>{page}</strong> of <strong>{totalPages}</strong>
//             </span>
//             <button
//               onClick={() => setPage(Math.min(totalPages, page + 1))}
//               disabled={page >= totalPages}
//               style={{ 
//                 ...styles.button, 
//                 ...styles.buttonSecondary,
//                 ...(page >= totalPages ? styles.buttonDisabled : {}) 
//               }}
//             >
//               Next →
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Add keyframe animation */}
//       <style>{`
//         @keyframes spin {
//           0% { transform: rotate(0deg); }
//           100% { transform: rotate(360deg); }
//         }
        
//         @keyframes pulse {
//           0%, 100% { opacity: 1; }
//           50% { opacity: 0.5; }
//         }
//       `}</style>
//     </div>
//   );
// }

// // Enhanced Inline Styles
// const styles = {
//   container: {
//     padding: "32px 24px",
//     maxWidth: "960px",
//     margin: "0 auto",
//     fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
//     minHeight: "100vh"
//   },
  
//   // Overlay styles
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
//     background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
//     borderRadius: "16px",
//     padding: "40px",
//     textAlign: "center",
//     boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
//     maxWidth: "400px"
//   },
//   spinner: {
//     border: "4px solid #f0f2f5",
//     borderTop: "4px solid #0d6efd",
//     borderRadius: "50%",
//     width: "56px",
//     height: "56px",
//     margin: "0 auto 20px",
//     animation: "spin 0.8s linear infinite"
//   },
//   overlayText: {
//     fontSize: "15px",
//     fontWeight: "600",
//     color: "#1a1a1a",
//     lineHeight: "1.5"
//   },
  
//   // Alert styles
//   alert: {
//     padding: "16px 20px",
//     borderRadius: "12px",
//     marginBottom: "20px",
//     fontSize: "14px",
//     fontWeight: "500",
//     boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
//     border: "1px solid"
//   },
//   alertContent: {
//     whiteSpace: "pre-line",
//     lineHeight: "1.6"
//   },
//   alert_success: {
//     background: "linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)",
//     color: "#155724",
//     borderColor: "#c3e6cb"
//   },
//   alert_warning: {
//     background: "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)",
//     color: "#856404",
//     borderColor: "#ffeaa7"
//   },
//   alert_danger: {
//     background: "linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)",
//     color: "#721c24",
//     borderColor: "#f5c6cb"
//   },
//   alert_info: {
//     background: "linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)",
//     color: "#0c5460",
//     borderColor: "#bee5eb"
//   },
  
//   // Welcome screen styles
//   welcome: {
//     textAlign: "center",
//     padding: "40px 20px",
//     maxWidth: "600px",
//     margin: "0 auto"
//   },
//   logoContainer: {
//     marginBottom: "48px"
//   },
//   logo: {
//     fontSize: "64px",
//     marginBottom: "16px"
//   },
//   welcomeTitle: {
//     fontSize: "32px",
//     fontWeight: "800",
//     background: "linear-gradient(135deg, #0d6efd 0%, #0c5cde 100%)",
//     WebkitBackgroundClip: "text",
//     WebkitTextFillColor: "transparent",
//     marginBottom: "8px"
//   },
//   welcomeSubtitle: {
//     color: "#6c757d",
//     fontSize: "16px",
//     fontWeight: "500"
//   },
  
//   // Auto-detect section
//   autoDetectSection: {
//     background: "linear-gradient(135deg, #f8f9ff 0%, #f0f5ff 100%)",
//     border: "2px solid #e7eef8",
//     borderRadius: "16px",
//     padding: "32px",
//     marginBottom: "24px"
//   },
//   featureBadge: {
//     display: "inline-block",
//     background: "linear-gradient(135deg, #0d6efd 0%, #0c5cde 100%)",
//     color: "white",
//     padding: "6px 16px",
//     borderRadius: "20px",
//     fontSize: "12px",
//     fontWeight: "700",
//     marginBottom: "16px",
//     textTransform: "uppercase",
//     letterSpacing: "0.5px"
//   },
//   sectionTitle: {
//     fontSize: "20px",
//     fontWeight: "700",
//     color: "#1a1a1a",
//     marginBottom: "8px"
//   },
//   sectionDesc: {
//     color: "#6c757d",
//     fontSize: "14px",
//     marginBottom: "24px",
//     lineHeight: "1.5"
//   },
//   guideContainer: {
//     background: "white",
//     borderRadius: "12px",
//     padding: "24px",
//     border: "2px solid #e7eef8"
//   },
//   guideSteps: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "16px",
//     marginBottom: "24px"
//   },
//   guideStep: {
//     display: "flex",
//     gap: "16px",
//     padding: "16px",
//     background: "#f8f9fa",
//     borderRadius: "10px",
//     border: "1px solid #e9ecef",
//     alignItems: "flex-start"
//   },
//   stepNumber: {
//     minWidth: "36px",
//     height: "36px",
//     borderRadius: "50%",
//     background: "linear-gradient(135deg, #0d6efd 0%, #0c5cde 100%)",
//     color: "white",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     fontWeight: "700",
//     fontSize: "16px",
//     flexShrink: 0
//   },
//   stepContent: {
//     flex: 1
//   },
//   stepTitle: {
//     fontSize: "15px",
//     fontWeight: "700",
//     color: "#1a1a1a",
//     marginBottom: "6px"
//   },
//   stepDesc: {
//     fontSize: "13px",
//     color: "#495057",
//     lineHeight: "1.6"
//   },
//   stepLink: {
//     color: "#0d6efd",
//     textDecoration: "none",
//     fontWeight: "600",
//     borderBottom: "1px dashed #0d6efd"
//   },
//   kbd: {
//     background: "#e9ecef",
//     padding: "2px 6px",
//     borderRadius: "4px",
//     fontSize: "12px",
//     fontFamily: "monospace",
//     border: "1px solid #dee2e6",
//     fontWeight: "600"
//   },
//   guideActions: {
//     display: "flex",
//     gap: "12px",
//     marginBottom: "16px"
//   },
//   videoHint: {
//     padding: "12px",
//     background: "#fff3cd",
//     borderRadius: "8px",
//     fontSize: "13px",
//     color: "#856404",
//     border: "1px solid #ffeaa7",
//     lineHeight: "1.5"
//   },
  
//   // Divider
//   divider: {
//     position: "relative",
//     height: "1px",
//     background: "#dee2e6",
//     margin: "32px 0",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center"
//   },
//   dividerText: {
//     background: "white",
//     padding: "0 16px",
//     color: "#6c757d",
//     fontSize: "12px",
//     fontWeight: "600"
//   },
  
//   // Manual section
//   manualSection: {
//     background: "white",
//     border: "2px solid #e9ecef",
//     borderRadius: "16px",
//     padding: "32px"
//   },
//   tokenInput: {
//     width: "100%",
//     minHeight: "140px",
//     padding: "16px",
//     border: "2px solid #dee2e6",
//     borderRadius: "12px",
//     fontFamily: "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
//     fontSize: "13px",
//     marginBottom: "16px",
//     boxSizing: "border-box",
//     resize: "vertical",
//     background: "#f8f9fa",
//     transition: "all 0.2s ease",
//     color: "black",
//   },
//   securityNote: {
//     marginTop: "32px",
//     padding: "16px",
//     background: "#f8f9fa",
//     borderRadius: "12px",
//     fontSize: "13px",
//     color: "#495057",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "8px"
//   },
//   securityIcon: {
//     fontSize: "18px"
//   },
  
//   // Button styles
//   button: {
//     padding: "14px 24px",
//     fontSize: "15px",
//     fontWeight: "600",
//     border: "none",
//     borderRadius: "10px",
//     cursor: "pointer",
//     transition: "all 0.2s ease",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "8px",
//     boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
//   },
//   buttonIcon: {
//     fontSize: "18px"
//   },
//   buttonAutoDetect: {
//     width: "100%",
//     background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
//     color: "white",
//     boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)"
//   },
//   buttonPrimary: {
//     width: "100%",
//     background: "linear-gradient(135deg, #0d6efd 0%, #0c5cde 100%)",
//     color: "white",
//     boxShadow: "0 4px 15px rgba(13, 110, 253, 0.3)"
//   },
//   buttonSecondary: {
//     background: "#f8f9fa",
//     border: "2px solid #dee2e6",
//     color: "#495057"
//   },
//   buttonDanger: {
//     background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
//     color: "white",
//     boxShadow: "0 4px 15px rgba(220, 53, 69, 0.3)"
//   },
//   buttonSuccess: {
//     background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
//     color: "white",
//     boxShadow: "0 4px 15px rgba(40, 167, 69, 0.3)"
//   },
//   buttonDisabled: {
//     opacity: "0.5",
//     cursor: "not-allowed",
//     boxShadow: "none"
//   },
//   buttonSmall: {
//     padding: "10px 20px",
//     fontSize: "14px"
//   },
  
//   // Search screen
//   searchContainer: {
//     background: "white",
//     borderRadius: "16px",
//     padding: "32px",
//     boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
//   },
//   searchHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: "32px",
//     paddingBottom: "20px",
//     borderBottom: "2px solid #f0f2f5"
//   },
//   searchTitle: {
//     fontSize: "24px",
//     fontWeight: "800",
//     margin: "0",
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//     color: "#1a1a1a"
//   },
//   searchIcon: {
//     fontSize: "28px"
//   },
//   formGroup: {
//     marginBottom: "24px"
//   },
//   label: {
//     display: "flex",
//     alignItems: "center",
//     gap: "8px",
//     fontWeight: "700",
//     fontSize: "13px",
//     textTransform: "uppercase",
//     color: "#495057",
//     marginBottom: "10px",
//     letterSpacing: "0.5px"
//   },
//   labelIcon: {
//     fontSize: "16px"
//   },
//   input: {
//     width: "100%",
//     padding: "14px 16px",
//     border: "2px solid #dee2e6",
//     borderRadius: "10px",
//     fontSize: "15px",
//     boxSizing: "border-box",
//     transition: "all 0.2s ease",
//     background: "#f8f9fa",
//     color:"black"
//   },
//   actionGrid: {
//     display: "grid",
//     gridTemplateColumns: "1fr 1fr",
//     gap: "16px",
//     marginBottom: "20px"
//   },
//   buttonAction: {
//     flexDirection: "column",
//     padding: "24px",
//     gap: "12px",
//     height: "auto"
//   },
//   actionIcon: {
//     fontSize: "32px"
//   },
//   actionContent: {
//     textAlign: "center"
//   },
//   actionTitle: {
//     fontSize: "16px",
//     fontWeight: "700",
//     marginBottom: "4px"
//   },
//   actionDesc: {
//     fontSize: "12px",
//     opacity: "0.9"
//   },
//   buttonProject: {
//     background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
//     color: "white"
//   },
//   buttonContent: {
//     background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
//     color: "white"
//   },
//   statusCard: {
//     marginTop: "20px",
//     padding: "16px 20px",
//     background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
//     borderRadius: "12px",
//     color: "#495057",
//     fontSize: "14px",
//     fontWeight: "500",
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//     border: "1px solid #dee2e6"
//   },
//   statusIcon: {
//     fontSize: "20px"
//   },
  
//   // Results
//   results: {
//     marginTop: "32px"
//   },
//   resultsTitle: {
//     fontSize: "18px",
//     fontWeight: "700",
//     marginBottom: "16px",
//     color: "#1a1a1a"
//   },
//   resultsList: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "12px"
//   },
//   resultItem: {
//     background: "linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)",
//     border: "2px solid #ffe0e0",
//     borderLeft: "5px solid #f5576c",
//     borderRadius: "12px",
//     padding: "16px",
//     transition: "all 0.2s ease"
//   },
//   resultHeader: {
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//     marginBottom: "12px"
//   },
//   resultIcon: {
//     fontSize: "24px"
//   },
//   itemTitle: {
//     fontWeight: "700",
//     color: "#1a1a1a",
//     fontSize: "16px"
//   },
//   itemMeta: {
//     fontSize: "13px",
//     color: "#6c757d",
//     fontFamily: "'SF Mono', Monaco, monospace",
//     marginTop: "6px"
//   },
//   metaLabel: {
//     fontWeight: "600",
//     color: "#495057"
//   },
  
//   // Content screen
//   contentContainer: {
//     background: "white",
//     borderRadius: "16px",
//     padding: "32px",
//     boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
//   },
//   contentHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: "24px",
//     paddingBottom: "16px",
//     borderBottom: "2px solid #f0f2f5",
//     gap: "16px",
//     flexWrap: "wrap"
//   },
//   contentTitle: {
//     fontSize: "22px",
//     fontWeight: "800",
//     margin: "0",
//     flex: 1,
//     display: "flex",
//     alignItems: "center",
//     gap: "12px"
//   },
//   contentIcon: {
//     fontSize: "26px"
//   },
//   headerActions: {
//     display: "flex",
//     gap: "10px"
//   },
//   contentList: {
//     maxHeight: "500px",
//     overflowY: "auto",
//     marginBottom: "20px",
//     paddingRight: "8px"
//   },
//   contentItem: {
//     background: "linear-gradient(135deg, #f8faff 0%, #f0f5ff 100%)",
//     border: "2px solid #e7eef8",
//     borderLeft: "5px solid #0d6efd",
//     borderRadius: "12px",
//     padding: "16px",
//     marginBottom: "12px",
//     transition: "all 0.2s ease"
//   },
//   cbLabel: {
//     fontSize: "11px",
//     color: "#0d6efd",
//     fontWeight: "700",
//     textTransform: "uppercase",
//     background: "#f0f7ff",
//     padding: "4px 12px",
//     borderRadius: "6px",
//     display: "inline-block",
//     marginBottom: "10px",
//     letterSpacing: "0.5px"
//   },
//   moduleName: {
//     fontSize: "15px",
//     fontWeight: "700",
//     color: "#1a1a1a",
//     margin: "8px 0 4px 0",
//     display: "flex",
//     alignItems: "center",
//     gap: "8px"
//   },
//   moduleIcon: {
//     fontSize: "16px"
//   },
//   submoduleName: {
//     fontSize: "13px",
//     fontWeight: "600",
//     color: "#495057",
//     margin: "4px 0 8px 0",
//     display: "flex",
//     alignItems: "center",
//     gap: "6px",
//     paddingLeft: "24px"
//   },
//   submoduleIcon: {
//     color: "#6c757d"
//   },
//   contentName: {
//     fontSize: "14px",
//     fontWeight: "600",
//     color: "#212529",
//     margin: "8px 0",
//     display: "flex",
//     alignItems: "center",
//     gap: "8px",
//     paddingLeft: "24px"
//   },
//   fileIcon: {
//     fontSize: "14px"
//   },
//   meta: {
//     fontSize: "11px",
//     color: "#868e96",
//     fontFamily: "'SF Mono', Monaco, monospace",
//     marginTop: "8px",
//     paddingTop: "8px",
//     borderTop: "1px solid #e9ecef"
//   },
//   emptyState: {
//     textAlign: "center",
//     padding: "60px 24px"
//   },
//   emptyIcon: {
//     fontSize: "64px",
//     marginBottom: "16px"
//   },
//   emptyText: {
//     color: "#868e96",
//     fontSize: "15px",
//     fontWeight: "500"
//   },
//   pagination: {
//     display: "flex",
//     gap: "16px",
//     alignItems: "center",
//     paddingTop: "16px",
//     borderTop: "2px solid #f0f2f5"
//   },
//   pageInfo: {
//     fontSize: "14px",
//     fontWeight: "600",
//     color: "#495057",
//     flex: 1,
//     textAlign: "center"
//   }
// };

// import { useState, useEffect } from "react";
// import { CONTENT_DEPARTMENT_IDS, COURSE_DEPARTMENT_IDS, PROJECT_DEPARTMENT_IDS } from "../config";

// const API = "https://api.examly.io";

// // ─── Toast System ───────────────────────────────────────────────────────────
// function ToastContainer({ toasts, removeToast }) {
//   return (
//     <div style={{
//       position: "fixed", top: "20px", right: "20px",
//       zIndex: 99999, display: "flex", flexDirection: "column", gap: "10px",
//       maxWidth: "380px", width: "100%"
//     }}>
//       {toasts.map(t => (
//         <div key={t.id} style={{
//           display: "flex", alignItems: "flex-start", gap: "12px",
//           padding: "14px 16px",
//           background: t.type === "success" ? "#0f2b1a" :
//                        t.type === "danger"  ? "#2b0f0f" :
//                        t.type === "info"    ? "#0f1e2b" : "#2b240f",
//           border: `1px solid ${
//             t.type === "success" ? "#22c55e33" :
//             t.type === "danger"  ? "#ef444433" :
//             t.type === "info"    ? "#3b82f633" : "#f59e0b33"
//           }`,
//           borderLeft: `3px solid ${
//             t.type === "success" ? "#22c55e" :
//             t.type === "danger"  ? "#ef4444" :
//             t.type === "info"    ? "#3b82f6" : "#f59e0b"
//           }`,
//           borderRadius: "10px",
//           boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
//           backdropFilter: "blur(12px)",
//           animation: "slideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
//           fontFamily: "'DM Sans', sans-serif"
//         }}>
//           <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "1px" }}>
//             {t.type === "success" ? "✓" :
//              t.type === "danger"  ? "✕" :
//              t.type === "info"    ? "ℹ" : "⚠"}
//           </span>
//           <div style={{ flex: 1 }}>
//             <div style={{
//               fontSize: "13px", fontWeight: "600", lineHeight: "1.5",
//               color: t.type === "success" ? "#86efac" :
//                      t.type === "danger"  ? "#fca5a5" :
//                      t.type === "info"    ? "#93c5fd" : "#fcd34d"
//             }}>
//               {t.msg}
//             </div>
//           </div>
//           <button onClick={() => removeToast(t.id)} style={{
//             background: "none", border: "none", cursor: "pointer",
//             color: "#666", fontSize: "16px", padding: "0", flexShrink: 0,
//             lineHeight: 1
//           }}>×</button>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ─── Overlay ─────────────────────────────────────────────────────────────────
// function Overlay({ text }) {
//   return (
//     <div style={{
//       position: "fixed", inset: 0,
//       background: "rgba(5,8,15,0.75)",
//       backdropFilter: "blur(6px)",
//       display: "flex", alignItems: "center", justifyContent: "center",
//       zIndex: 9998
//     }}>
//       <div style={{
//         background: "#0d1117",
//         border: "1px solid #21262d",
//         borderRadius: "16px",
//         padding: "40px 48px",
//         textAlign: "center",
//         boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
//         maxWidth: "360px"
//       }}>
//         <div style={{
//           width: "48px", height: "48px",
//           border: "3px solid #21262d",
//           borderTop: "3px solid #58a6ff",
//           borderRadius: "50%",
//           margin: "0 auto 20px",
//           animation: "spin 0.7s linear infinite"
//         }} />
//         <div style={{
//           fontSize: "14px", fontWeight: "500",
//           color: "#8b949e", lineHeight: "1.6",
//           fontFamily: "'DM Sans', sans-serif"
//         }}>{text}</div>
//       </div>
//     </div>
//   );
// }

// export default function Finder() {
//   const [token, setToken] = useState(() => {
//     try { return localStorage.getItem("examly_token") || ""; } catch { return ""; }
//   });
//   const [ui, setUI] = useState(token ? "search" : "welcome");
//   const [courseName, setCourseName] = useState("");
//   const [status, setStatus] = useState("");
//   const [toasts, setToasts] = useState([]);
//   const [contentItems, setContentItems] = useState([]);
//   const [projectItems, setProjectItems] = useState([]);
//   const [page, setPage] = useState(1);
//   const [overlay, setOverlay] = useState(false);
//   const [overlayText, setOverlayText] = useState("");
//   const [tokenInput, setTokenInput] = useState("");
//   const [showGuide, setShowGuide] = useState(false);
//   const [activeTab, setActiveTab] = useState("projects"); // "projects" | "content"
//   const [isLoading, setIsLoading] = useState(false);

//   const PAGE_SIZE = 10;

//   useEffect(() => {
//     if (token) setUI("search");
//     else setUI("welcome");
//   }, [token]);

//   // ── Toast helpers ──────────────────────────────────────────────────────────
//   let toastId = 0;
//   const addToast = (msg, type = "warning") => {
//     const id = ++toastId + Date.now();
//     setToasts(prev => [...prev, { id, msg, type }]);
//     setTimeout(() => removeToast(id), 5000);
//   };
//   const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

//   const showOverlay = (msg) => { setOverlayText(msg); setOverlay(true); };
//   const hideOverlay = () => setOverlay(false);

//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));

//   const headers = { "Content-Type": "application/json", Authorization: token };

//   // ── Token ──────────────────────────────────────────────────────────────────
//   const saveToken = () => {
//     if (!tokenInput.trim()) { addToast("Token cannot be empty", "danger"); return; }
//     try {
//       localStorage.setItem("examly_token", tokenInput.trim());
//       setToken(tokenInput.trim());
//       setTokenInput("");
//       addToast("Token saved — you're in!", "success");
//     } catch (err) {
//       addToast("Failed to save token: " + err.message, "danger");
//     }
//   };

//   const clearToken = () => {
//     try { localStorage.removeItem("examly_token"); } catch {}
//     setToken(""); setUI("welcome"); setTokenInput("");
//     setContentItems([]); setProjectItems([]);
//     setCourseName(""); setStatus("");
//     addToast("Logged out successfully", "info");
//   };

//   // ── API helpers ────────────────────────────────────────────────────────────
//   async function findCourseByName(name) {
//     const res = await fetch(`${API}/api/v2/courses/filter`, {
//       method: "POST", headers,
//       body: JSON.stringify({
//         mainDepartmentUser: true, page: 1, limit: 100,
//         search: name, department_id: COURSE_DEPARTMENT_IDS,
//         branch_id: [], batch_id: "All", publishType: [],
//         publisherCourseOnly: false, tag_id: []
//       })
//     });
//     if (!res.ok) throw new Error(`Course search failed (HTTP ${res.status})`);
//     const json = await res.json();
//     return json?.rows?.[0]?.c_id || json?.rows?.[0]?.$c_id || null;
//   }

//   async function getCourseDetails(id) {
//     const res = await fetch(`${API}/api/v2/course/${id}`, {
//       headers: { Authorization: token }
//     });
//     if (!res.ok) throw new Error(`Course fetch failed (HTTP ${res.status})`);
//     const json = await res.json();
//     return json.course || json;
//   }

//   async function getAllContentBanks(schoolId) {
//     const res = await fetch(`${API}/api/v2/contentbank/all`, {
//       method: "POST", headers,
//       body: JSON.stringify({
//         branch_id: "all", dataIds: schoolId || "",
//         department_id: CONTENT_DEPARTMENT_IDS, mainDepartmentUser: true
//       })
//     });
//     if (!res.ok) throw new Error(`Content bank fetch failed (HTTP ${res.status})`);
//     const json = await res.json();
//     return json?.results?.contentbanks || [];
//   }

//   async function fetchContentBankContents(cb_id, pageNum = 1, limit = 50) {
//     const res = await fetch(`${API}/api/content/filter`, {
//       method: "POST", headers,
//       body: JSON.stringify({ cb_id, page: pageNum, limit })
//     });
//     return await res.json();
//   }

//   async function fetchAllContentBanksBatched(cbList, courseContentIds) {
//     const map = new Map();
//     const BATCH_SIZE = 3, DELAY_MS = 500, PAGE_DELAY_MS = 150;

//     async function fetchSingleCBAllPages(cb_id, cb_label) {
//       let pageNum = 1;
//       while (true) {
//         try {
//           const res = await fetchContentBankContents(cb_id, pageNum, 50);
//           const arr = res.content || [];
//           arr.forEach(c => {
//             if (courseContentIds.has(c.content_id) && !map.has(c.content_id)) {
//               map.set(c.content_id, {
//                 content_id: c.content_id, name: c.name,
//                 file: c.content_media?.file || "", size: c.content_media?.size || "",
//                 type: c.content_media?.type || c.type || "",
//                 cb_id, cb_label, createdBy: c.createdBy || ""
//               });
//             }
//           });
//           if (arr.length < 50) break;
//           pageNum++;
//           await sleep(PAGE_DELAY_MS);
//         } catch { break; }
//       }
//     }

//     for (let i = 0; i < cbList.length; i += BATCH_SIZE) {
//       const batch = cbList.slice(i, i + BATCH_SIZE);
//       showOverlay(`Scanning content banks… ${i + batch.length}/${cbList.length}`);
//       await Promise.all(batch.map(cb =>
//         fetchSingleCBAllPages(cb.value || cb.cb_id, cb.label || cb.name)
//       )).catch(() => {});
//       if (i + BATCH_SIZE < cbList.length) await sleep(DELAY_MS);
//     }
//     return map;
//   }

//   function collectContentIdsFromCourse(courseData) {
//     const out = [];
//     let modules = courseData.course_modules?.c_module_data
//       || (Array.isArray(courseData.course_modules) ? courseData.course_modules : null)
//       || courseData.modules || courseData.c_module_data || [];

//     modules.forEach(mod => {
//       const moduleName = mod.c_module_name || mod.module_name || mod.name || "";
//       const subModules = mod.c_sub_modules || mod.sub_modules || [];

//       if (Array.isArray(subModules) && subModules.length > 0) {
//         subModules.forEach(sub => {
//           const subName = sub.sub_module_name || sub.module_name || sub.name || "";
//           (sub.sub_module_params || sub.module_params || sub.params || []).forEach(p => {
//             if (p.content_id) out.push({ content_id: p.content_id, moduleName, subName });
//             (p.content_data || []).forEach(cd => cd.content_id && out.push({ content_id: cd.content_id, moduleName, subName }));
//             (p.contents || []).forEach(cd => cd.content_id && out.push({ content_id: cd.content_id, moduleName, subName }));
//           });
//         });
//       } else {
//         (mod.c_module_params || mod.module_params || mod.params || []).forEach(p => {
//           const subName = p.sub_module_name || p.module_name || "";
//           if (p.content_id) out.push({ content_id: p.content_id, moduleName, subName });
//           (p.content_data || []).forEach(cd => cd.content_id && out.push({ content_id: cd.content_id, moduleName, subName }));
//           (p.contents || []).forEach(cd => cd.content_id && out.push({ content_id: cd.content_id, moduleName, subName }));
//         });
//       }
//     });
//     return out;
//   }

//   // ── Search Projects ────────────────────────────────────────────────────────
//   async function searchProjects() {
//     if (!courseName.trim()) { addToast("Please enter a course name or code", "warning"); return; }

//     setIsLoading(true);
//     setProjectItems([]);
//     setStatus("Searching...");

//     try {
//       // Step 1: Find course
//       setStatus("Looking up course...");
//       const courseId = await findCourseByName(courseName);
//       if (!courseId) {
//         addToast(`No course found matching "${courseName}". Check the name/code and try again.`, "danger");
//         setStatus(""); setIsLoading(false); return;
//       }

//       // Step 2: Get course details
//       setStatus("Fetching course structure...");
//       const course = await getCourseDetails(courseId);
//       const modules = course.course_modules?.c_module_data || [];
//       const pbIds = new Set();

//       modules.forEach(m => {
//         (m.c_module_params || []).forEach(p => {
//           if (p.pb_id) pbIds.add(p.pb_id);
//         });
//         (m.c_sub_modules || []).forEach(sub =>
//           (sub.sub_module_params || []).forEach(sp => {
//             if (sp.pb_id) pbIds.add(sp.pb_id);
//           })
//         );
//       });

//       if (pbIds.size === 0) {
//         addToast("This course has no Project module — it may be a content-only or QB course.", "warning");
//         setStatus(""); setIsLoading(false); return;
//       }

//       const schoolId = course.course_branch_department?.[0]?.school_id || "";

//       // Step 3: Broad department search
//       setStatus(`Searching ${pbIds.size} project bank(s) in your departments...`);
//       const res = await fetch(`${API}/api/projectBanks/get`, {
//         method: "POST", headers,
//         body: JSON.stringify({
//           branch_id: "all", page: 1, limit: 200,
//           visibility: "All", mainDepartmentUser: true,
//           department_id: PROJECT_DEPARTMENT_IDS, dataIds: schoolId
//         })
//       });

//       const json = await res.json();
//       const rows = json?.results?.rows || [];
//       const matched = rows.filter(r => pbIds.has(r.pb_id));
//       const matchedIds = new Set(matched.map(r => r.pb_id));

//       // Step 4: Fallback for unmatched pb_ids (cross-department)
//       const unmatchedIds = Array.from(pbIds).filter(id => !matchedIds.has(id));

//       if (unmatchedIds.length > 0) {
//         setStatus(`Found ${matched.length} via dept search. Trying direct lookup for ${unmatchedIds.length} cross-dept bank(s)...`);

//         for (const pbId of unmatchedIds) {
//           let added = false;

//           // Try direct GET endpoint
//           try {
//             const directRes = await fetch(`${API}/api/projectBank/${pbId}`, {
//               headers: { Authorization: token }
//             });
//             if (directRes.ok) {
//               const dj = await directRes.json();
//               const pb = dj?.projectBank || dj?.result || dj;
//               if (pb && (pb.pb_id || pb.name)) {
//                 matched.push({
//                   pb_id: pb.pb_id || pbId,
//                   name: pb.name || `Project Bank (${pbId.slice(0, 8)}…)`,
//                   createdBy: pb.createdBy || "N/A",
//                   pb_description: pb.pb_description || null,
//                   _tag: "cross-dept"
//                 });
//                 matchedIds.add(pbId);
//                 added = true;
//               }
//             }
//           } catch {}

//           // Last resort: extract name from course params
//           if (!added) {
//             let projectName = "Unnamed Project Bank";
//             modules.forEach(m => {
//               (m.c_module_params || []).forEach(p => {
//                 if (p.pb_id === pbId) projectName = p.projectName || p.project_name || projectName;
//               });
//             });
//             matched.push({
//               pb_id: pbId,
//               name: projectName,
//               createdBy: "N/A",
//               pb_description: null,
//               _tag: "course-only"
//             });
//             matchedIds.add(pbId);
//           }

//           await sleep(150);
//         }
//       }

//       if (matched.length === 0) {
//         addToast("No project banks could be found. The banks may belong to a restricted department.", "warning");
//         setStatus(""); setIsLoading(false); return;
//       }

//       setProjectItems(matched);
//       setActiveTab("projects");
//       setStatus(`Found ${matched.length} project bank(s)`);
//       addToast(`✓ Found ${matched.length} project bank(s)`, "success");
//     } catch (err) {
//       console.error(err);
//       addToast(`Error: ${err.message}`, "danger");
//       setStatus("");
//     }

//     setIsLoading(false);
//   }

//   // ── Search Contents ────────────────────────────────────────────────────────
//   async function searchContents() {
//     if (!courseName.trim()) { addToast("Please enter a course name or code", "warning"); return; }

//     setIsLoading(true);
//     setContentItems([]);

//     try {
//       showOverlay("Looking up course...");
//       const courseId = await findCourseByName(courseName);
//       if (!courseId) {
//         hideOverlay();
//         addToast(`No course found matching "${courseName}". Check the name/code and try again.`, "danger");
//         setIsLoading(false); return;
//       }

//       showOverlay("Fetching course structure...");
//       const course = await getCourseDetails(courseId);
//       const orderedContent = collectContentIdsFromCourse(course);

//       if (!orderedContent.length) {
//         hideOverlay();
//         addToast("No content items found in this course. It may be a project-only course — try searching Projects instead.", "warning");
//         setIsLoading(false); return;
//       }

//       const courseSet = new Set(orderedContent.map(x => x.content_id));
//       const schoolId = course.course_branch_department?.[0]?.school_id || "";

//       showOverlay("Fetching content banks...");
//       const banks = await getAllContentBanks(schoolId);

//       if (!banks.length) {
//         hideOverlay();
//         addToast("No content banks found for this school. Your token may not have access to the content bank API.", "warning");
//         setIsLoading(false); return;
//       }

//       showOverlay(`Scanning ${banks.length} content banks...`);
//       const matches = await fetchAllContentBanksBatched(banks, courseSet);

//       const final = [];
//       const addedIds = new Set();
//       orderedContent.forEach(ctx => {
//         if (!addedIds.has(ctx.content_id) && matches.has(ctx.content_id)) {
//           const m = matches.get(ctx.content_id);
//           final.push({
//             content_id: ctx.content_id, moduleName: ctx.moduleName, subName: ctx.subName,
//             contentName: m.name || m.file || "", file: m.file || "",
//             cb_label: m.cb_label, size: m.size, createdBy: m.createdBy
//           });
//           addedIds.add(ctx.content_id);
//         }
//       });

//       hideOverlay();

//       if (!final.length) {
//         addToast(
//           `Searched ${orderedContent.length} content item(s) across ${banks.length} bank(s) — no matches found. The content may belong to a bank in a different department.`,
//           "warning"
//         );
//         setIsLoading(false); return;
//       }

//       setContentItems(final);
//       setPage(1);
//       setActiveTab("content");
//       setUI("content");
//       addToast(`✓ Found ${final.length} content file(s)`, "success");
//     } catch (err) {
//       hideOverlay();
//       console.error(err);
//       addToast(`Error: ${err.message}`, "danger");
//     }

//     setIsLoading(false);
//   }

//   // ── Export CSV ─────────────────────────────────────────────────────────────
//   const exportCSV = () => {
//     if (!contentItems.length) { addToast("Nothing to export", "warning"); return; }
//     const hdrs = ["Content ID", "Module", "Submodule", "Content Name", "File", "Content Bank", "Size", "Created By"];
//     const rows = contentItems.map(i => [i.content_id, i.moduleName, i.subName, i.contentName, i.file, i.cb_label, i.size, i.createdBy]);
//     let csv = hdrs.map(h => `"${h}"`).join(",") + "\n";
//     rows.forEach(r => { csv += r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",") + "\n"; });
//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     link.setAttribute("href", URL.createObjectURL(blob));
//     link.setAttribute("download", `${courseName}_content_${new Date().toISOString().split("T")[0]}.csv`);
//     link.style.visibility = "hidden";
//     document.body.appendChild(link); link.click(); document.body.removeChild(link);
//     addToast("CSV downloaded!", "success");
//   };

//   const totalPages = Math.max(1, Math.ceil(contentItems.length / PAGE_SIZE));
//   const pageItems = contentItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

//   const formatSize = (s) => {
//     if (!s) return "";
//     const n = parseFloat(s);
//     if (isNaN(n)) return s;
//     return n > 1024 ? (n / 1024).toFixed(1) + " MB" : n.toFixed(0) + " KB";
//   };

//   // ─────────────────────────────────────────────────────────────────────────
//   // RENDER
//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <div style={{ minHeight: "100vh", background: "#05080f", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

//       <ToastContainer toasts={toasts} removeToast={removeToast} />
//       {overlay && <Overlay text={overlayText} />}

//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
//         @keyframes spin { to { transform: rotate(360deg); } }
//         @keyframes slideIn { from { opacity:0; transform: translateX(24px); } to { opacity:1; transform: translateX(0); } }
//         @keyframes fadeUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
//         @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
//         * { box-sizing: border-box; margin: 0; padding: 0; }
//         input, textarea, button, select { font-family: inherit; }
//         ::-webkit-scrollbar { width: 4px; }
//         ::-webkit-scrollbar-track { background: #0d1117; }
//         ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
//         .finder-card { animation: fadeUp 0.4s ease both; }
//         .action-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
//         .action-btn:active { transform: translateY(0); }
//         .result-row:hover { background: #161b22 !important; }
//         input:focus, textarea:focus { outline: none; border-color: #388bfd !important; }
//       `}</style>

//       {/* ── WELCOME SCREEN ── */}
//       {ui === "welcome" && (
//         <div style={{
//           minHeight: "100vh", display: "flex", alignItems: "center",
//           justifyContent: "center", padding: "24px"
//         }}>
//           <div className="finder-card" style={{ width: "100%", maxWidth: "480px" }}>

//             {/* Logo */}
//             <div style={{ textAlign: "center", marginBottom: "40px" }}>
//               <div style={{
//                 width: "64px", height: "64px", margin: "0 auto 20px",
//                 background: "linear-gradient(135deg, #1f6feb, #388bfd)",
//                 borderRadius: "18px", display: "flex", alignItems: "center",
//                 justifyContent: "center", fontSize: "28px",
//                 boxShadow: "0 0 0 1px #388bfd33, 0 12px 40px #1f6feb44"
//               }}>📚</div>
//               <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#e6edf3", letterSpacing: "-0.5px" }}>
//                 Content Finder
//               </h1>
//               <p style={{ color: "#8b949e", fontSize: "14px", marginTop: "6px" }}>
//                 Search Projects & Content Banks
//               </p>
//             </div>

//             {/* Token Card */}
//             <div style={{
//               background: "#0d1117", border: "1px solid #21262d",
//               borderRadius: "16px", padding: "28px", marginBottom: "16px"
//             }}>
//               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
//                 <span style={{ fontSize: "13px", fontWeight: "600", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.5px" }}>
//                   Authorization Token
//                 </span>
//                 <button
//                   onClick={() => setShowGuide(!showGuide)}
//                   style={{
//                     fontSize: "12px", color: "#388bfd", background: "none",
//                     border: "1px solid #388bfd44", borderRadius: "6px",
//                     padding: "4px 10px", cursor: "pointer", fontWeight: "500"
//                   }}
//                 >
//                   {showGuide ? "Hide guide" : "How to get it?"}
//                 </button>
//               </div>

//               {showGuide && (
//                 <div style={{
//                   background: "#161b22", border: "1px solid #21262d",
//                   borderRadius: "10px", padding: "16px", marginBottom: "16px",
//                   fontSize: "13px", color: "#8b949e", lineHeight: "1.8"
//                 }}>
//                   {[
//                     ["1", "Open", "admin.ltimindtree.iamneo.ai"],
//                     ["2", "Press", "F12 → Network tab → Fetch/XHR filter"],
//                     ["3", "Click", "any request to api.examly.io"],
//                     ["4", "Go to", "Headers → find Authorization"],
//                     ["5", "Copy", "the full token value and paste below"]
//                   ].map(([num, label, val]) => (
//                     <div key={num} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
//                       <span style={{
//                         minWidth: "22px", height: "22px", background: "#388bfd22",
//                         borderRadius: "50%", display: "inline-flex",
//                         alignItems: "center", justifyContent: "center",
//                         fontSize: "11px", fontWeight: "700", color: "#388bfd", flexShrink: 0
//                       }}>{num}</span>
//                       <span><strong style={{ color: "#c9d1d9" }}>{label}</strong> {val}</span>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <textarea
//                 value={tokenInput}
//                 onChange={e => setTokenInput(e.target.value)}
//                 placeholder="Paste your token here…"
//                 rows={4}
//                 style={{
//                   width: "100%", padding: "12px 14px",
//                   background: "#161b22", border: "1px solid #30363d",
//                   borderRadius: "10px", color: "#e6edf3",
//                   fontSize: "12px", fontFamily: "'DM Mono', monospace",
//                   resize: "vertical", lineHeight: "1.6", marginBottom: "16px"
//                 }}
//               />

//               <button
//                 onClick={saveToken}
//                 className="action-btn"
//                 style={{
//                   width: "100%", padding: "13px",
//                   background: "linear-gradient(135deg, #1f6feb, #388bfd)",
//                   color: "white", border: "none", borderRadius: "10px",
//                   fontSize: "15px", fontWeight: "700", cursor: "pointer",
//                   boxShadow: "0 4px 20px #1f6feb44", transition: "all 0.2s"
//                 }}
//               >
//                 Continue →
//               </button>
//             </div>

//             <p style={{ textAlign: "center", fontSize: "12px", color: "#484f58" }}>
//               🔒 Token stored locally in your browser only
//             </p>
//           </div>
//         </div>
//       )}

//       {/* ── SEARCH SCREEN ── */}
//       {ui === "search" && (
//         <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 20px" }}>

//           {/* Header */}
//           <div style={{
//             display: "flex", alignItems: "center", justifyContent: "space-between",
//             marginBottom: "32px", flexWrap: "wrap", gap: "12px"
//           }}>
//             <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
//               <div style={{
//                 width: "42px", height: "42px",
//                 background: "linear-gradient(135deg, #1f6feb, #388bfd)",
//                 borderRadius: "12px", display: "flex", alignItems: "center",
//                 justifyContent: "center", fontSize: "20px"
//               }}>📚</div>
//               <div>
//                 <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#e6edf3", letterSpacing: "-0.3px" }}>
//                   Content Finder
//                 </h2>
//                 <p style={{ fontSize: "12px", color: "#484f58" }}>Search Projects & Content Banks</p>
//               </div>
//             </div>
//             <button
//               onClick={clearToken}
//               className="action-btn"
//               style={{
//                 padding: "9px 18px", background: "#21262d",
//                 border: "1px solid #30363d", color: "#8b949e",
//                 borderRadius: "8px", fontSize: "13px", cursor: "pointer",
//                 fontWeight: "600", transition: "all 0.2s"
//               }}
//             >
//               🚪 Logout
//             </button>
//           </div>

//           {/* Search Bar */}
//           <div className="finder-card" style={{
//             background: "#0d1117", border: "1px solid #21262d",
//             borderRadius: "16px", padding: "24px", marginBottom: "20px"
//           }}>
//             <label style={{
//               display: "block", fontSize: "11px", fontWeight: "700",
//               color: "#484f58", textTransform: "uppercase",
//               letterSpacing: "1px", marginBottom: "10px"
//             }}>
//               Course Name or Code
//             </label>
//             <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
//               <input
//                 type="text"
//                 value={courseName}
//                 onChange={e => setCourseName(e.target.value)}
//                 onKeyDown={e => e.key === "Enter" && !isLoading && searchProjects()}
//                 placeholder="e.g. sdp1dec25g01 or Orchard SDET Python..."
//                 disabled={isLoading}
//                 style={{
//                   flex: 1, minWidth: "200px", padding: "12px 16px",
//                   background: "#161b22", border: "1px solid #30363d",
//                   borderRadius: "10px", color: "#e6edf3", fontSize: "14px",
//                   transition: "border-color 0.2s"
//                 }}
//               />
//             </div>

//             {/* Action Buttons */}
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" }}>
//               <button
//                 onClick={searchProjects}
//                 disabled={isLoading}
//                 className="action-btn"
//                 style={{
//                   padding: "16px", display: "flex", flexDirection: "column",
//                   alignItems: "center", gap: "6px",
//                   background: isLoading ? "#161b22" : "linear-gradient(135deg, #6e40c9, #a371f7)",
//                   border: isLoading ? "1px solid #30363d" : "none",
//                   borderRadius: "12px", cursor: isLoading ? "not-allowed" : "pointer",
//                   color: "white", transition: "all 0.2s",
//                   boxShadow: isLoading ? "none" : "0 4px 20px #6e40c944",
//                   opacity: isLoading ? 0.6 : 1
//                 }}
//               >
//                 <span style={{ fontSize: "24px" }}>🎯</span>
//                 <div style={{ fontSize: "14px", fontWeight: "700" }}>Projects</div>
//                 <div style={{ fontSize: "11px", opacity: 0.8 }}>Find project banks</div>
//               </button>

//               <button
//                 onClick={searchContents}
//                 disabled={isLoading}
//                 className="action-btn"
//                 style={{
//                   padding: "16px", display: "flex", flexDirection: "column",
//                   alignItems: "center", gap: "6px",
//                   background: isLoading ? "#161b22" : "linear-gradient(135deg, #0a6d6d, #20b8b8)",
//                   border: isLoading ? "1px solid #30363d" : "none",
//                   borderRadius: "12px", cursor: isLoading ? "not-allowed" : "pointer",
//                   color: "white", transition: "all 0.2s",
//                   boxShadow: isLoading ? "none" : "0 4px 20px #20b8b844",
//                   opacity: isLoading ? 0.6 : 1
//                 }}
//               >
//                 <span style={{ fontSize: "24px" }}>📄</span>
//                 <div style={{ fontSize: "14px", fontWeight: "700" }}>Contents</div>
//                 <div style={{ fontSize: "11px", opacity: 0.8 }}>Search content files</div>
//               </button>
//             </div>
//           </div>

//           {/* Status */}
//           {(status || isLoading) && (
//             <div style={{
//               display: "flex", alignItems: "center", gap: "10px",
//               padding: "12px 16px", background: "#0d1117",
//               border: "1px solid #21262d", borderRadius: "10px", marginBottom: "20px",
//               fontSize: "13px", color: "#8b949e"
//             }}>
//               {isLoading && <div style={{
//                 width: "14px", height: "14px", border: "2px solid #30363d",
//                 borderTop: "2px solid #388bfd", borderRadius: "50%",
//                 animation: "spin 0.7s linear infinite", flexShrink: 0
//               }} />}
//               {status}
//             </div>
//           )}

//           {/* Project Results */}
//           {projectItems.length > 0 && (
//             <div className="finder-card" style={{
//               background: "#0d1117", border: "1px solid #21262d",
//               borderRadius: "16px", overflow: "hidden"
//             }}>
//               <div style={{
//                 padding: "16px 20px", borderBottom: "1px solid #21262d",
//                 display: "flex", alignItems: "center", justifyContent: "space-between"
//               }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//                   <span style={{ fontSize: "16px" }}>🎯</span>
//                   <span style={{ fontSize: "14px", fontWeight: "700", color: "#e6edf3" }}>
//                     Project Banks
//                   </span>
//                   <span style={{
//                     fontSize: "11px", fontWeight: "700",
//                     background: "#6e40c922", color: "#a371f7",
//                     padding: "2px 8px", borderRadius: "20px"
//                   }}>
//                     {projectItems.length} found
//                   </span>
//                 </div>
//                 <button
//                   onClick={() => setProjectItems([])}
//                   style={{
//                     background: "none", border: "none", color: "#484f58",
//                     cursor: "pointer", fontSize: "16px"
//                   }}
//                 >×</button>
//               </div>

//               {projectItems.map((item, idx) => (
//                 <div
//                   key={item.pb_id}
//                   className="result-row"
//                   style={{
//                     padding: "16px 20px",
//                     borderBottom: idx < projectItems.length - 1 ? "1px solid #161b22" : "none",
//                     transition: "background 0.15s"
//                   }}
//                 >
//                   <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
//                     <div style={{ flex: 1 }}>
//                       <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
//                         <span style={{ fontSize: "14px", fontWeight: "700", color: "#e6edf3" }}>
//                           {item.name}
//                         </span>
//                         {item._tag === "cross-dept" && (
//                           <span style={{
//                             fontSize: "10px", fontWeight: "700",
//                             background: "#1f6feb22", color: "#388bfd",
//                             padding: "2px 7px", borderRadius: "4px"
//                           }}>CROSS-DEPT</span>
//                         )}
//                         {item._tag === "course-only" && (
//                           <span style={{
//                             fontSize: "10px", fontWeight: "700",
//                             background: "#f59e0b22", color: "#f59e0b",
//                             padding: "2px 7px", borderRadius: "4px"
//                           }}>DEPT RESTRICTED</span>
//                         )}
//                       </div>
//                       <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
//                         <span style={{ fontSize: "11px", color: "#484f58", fontFamily: "'DM Mono', monospace" }}>
//                           {item.pb_id}
//                         </span>
//                         {item.createdBy && item.createdBy !== "N/A" && (
//                           <span style={{ fontSize: "11px", color: "#484f58" }}>
//                             by {item.createdBy}
//                           </span>
//                         )}
//                         {item.pb_description && (
//                           <span style={{ fontSize: "11px", color: "#484f58" }}>
//                             {item.pb_description}
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                     <button
//                       onClick={() => {
//                         navigator.clipboard.writeText(item.pb_id).then(() =>
//                           addToast("PB ID copied!", "success")
//                         );
//                       }}
//                       style={{
//                         padding: "6px 12px", background: "#21262d",
//                         border: "1px solid #30363d", color: "#8b949e",
//                         borderRadius: "6px", cursor: "pointer",
//                         fontSize: "11px", fontWeight: "600", flexShrink: 0,
//                         transition: "all 0.15s"
//                       }}
//                     >
//                       Copy ID
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {/* ── CONTENT SCREEN ── */}
//       {ui === "content" && (
//         <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 20px" }}>

//           {/* Header */}
//           <div style={{
//             display: "flex", alignItems: "center", justifyContent: "space-between",
//             marginBottom: "24px", flexWrap: "wrap", gap: "12px"
//           }}>
//             <div>
//               <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#e6edf3", letterSpacing: "-0.3px" }}>
//                 Content Results
//               </h2>
//               <p style={{ fontSize: "12px", color: "#484f58", marginTop: "2px" }}>
//                 {contentItems.length} file(s) found for "{courseName}"
//               </p>
//             </div>
//             <div style={{ display: "flex", gap: "10px" }}>
//               <button
//                 onClick={exportCSV}
//                 className="action-btn"
//                 style={{
//                   padding: "9px 16px", background: "#1a3a1a",
//                   border: "1px solid #22c55e44", color: "#22c55e",
//                   borderRadius: "8px", fontSize: "13px",
//                   cursor: "pointer", fontWeight: "600", transition: "all 0.2s"
//                 }}
//               >
//                 📥 Export CSV
//               </button>
//               <button
//                 onClick={() => setUI("search")}
//                 className="action-btn"
//                 style={{
//                   padding: "9px 16px", background: "#21262d",
//                   border: "1px solid #30363d", color: "#8b949e",
//                   borderRadius: "8px", fontSize: "13px",
//                   cursor: "pointer", fontWeight: "600", transition: "all 0.2s"
//                 }}
//               >
//                 ← Back
//               </button>
//             </div>
//           </div>

//           {/* Content List */}
//           <div className="finder-card" style={{
//             background: "#0d1117", border: "1px solid #21262d",
//             borderRadius: "16px", overflow: "hidden", marginBottom: "16px"
//           }}>
//             {pageItems.length === 0 ? (
//               <div style={{ padding: "48px", textAlign: "center", color: "#484f58" }}>
//                 No content files found
//               </div>
//             ) : pageItems.map((item, idx) => (
//               <div
//                 key={item.content_id}
//                 className="result-row"
//                 style={{
//                   padding: "16px 20px",
//                   borderBottom: idx < pageItems.length - 1 ? "1px solid #161b22" : "none",
//                   transition: "background 0.15s"
//                 }}
//               >
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
//                   <div style={{ flex: 1 }}>
//                     <span style={{
//                       fontSize: "10px", fontWeight: "700", color: "#388bfd",
//                       background: "#388bfd14", padding: "2px 8px",
//                       borderRadius: "4px", display: "inline-block", marginBottom: "8px",
//                       letterSpacing: "0.5px", textTransform: "uppercase"
//                     }}>
//                       {item.cb_label}
//                     </span>
//                     <div style={{ fontSize: "14px", fontWeight: "600", color: "#c9d1d9", marginBottom: "4px" }}>
//                       {item.contentName || item.file || "Untitled"}
//                     </div>
//                     <div style={{ fontSize: "12px", color: "#484f58" }}>
//                       <span style={{ color: "#6e7681" }}>📁</span> {item.moduleName}
//                       {item.subName && <span> › {item.subName}</span>}
//                     </div>
//                   </div>
//                   <div style={{ textAlign: "right", flexShrink: 0 }}>
//                     <div style={{ fontSize: "12px", color: "#484f58", fontFamily: "'DM Mono', monospace" }}>
//                       {formatSize(item.size)}
//                     </div>
//                     <div style={{ fontSize: "10px", color: "#30363d", marginTop: "4px", fontFamily: "'DM Mono', monospace" }}>
//                       {item.content_id.slice(0, 8)}…
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Pagination */}
//           {totalPages > 1 && (
//             <div style={{
//               display: "flex", alignItems: "center", justifyContent: "center",
//               gap: "12px"
//             }}>
//               <button
//                 onClick={() => setPage(p => Math.max(1, p - 1))}
//                 disabled={page <= 1}
//                 style={{
//                   padding: "8px 16px", background: "#21262d",
//                   border: "1px solid #30363d", color: page <= 1 ? "#30363d" : "#8b949e",
//                   borderRadius: "8px", cursor: page <= 1 ? "not-allowed" : "pointer",
//                   fontSize: "13px", fontWeight: "600"
//                 }}
//               >← Prev</button>
//               <span style={{ fontSize: "13px", color: "#484f58" }}>
//                 <strong style={{ color: "#c9d1d9" }}>{page}</strong> / {totalPages}
//               </span>
//               <button
//                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
//                 disabled={page >= totalPages}
//                 style={{
//                   padding: "8px 16px", background: "#21262d",
//                   border: "1px solid #30363d", color: page >= totalPages ? "#30363d" : "#8b949e",
//                   borderRadius: "8px", cursor: page >= totalPages ? "not-allowed" : "pointer",
//                   fontSize: "13px", fontWeight: "600"
//                 }}
//               >Next →</button>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { CONTENT_DEPARTMENT_IDS, COURSE_DEPARTMENT_IDS, PROJECT_DEPARTMENT_IDS } from "../config";

const API = "https://api.examly.io";

// ─── Toast System ────────────────────────────────────────────────────────────
function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{
      position: "fixed", top: "20px", right: "20px",
      zIndex: 99999, display: "flex", flexDirection: "column", gap: "8px",
      maxWidth: "380px", width: "100%", pointerEvents: "none"
    }}>
      {toasts.map(t => {
        const c = {
          success: { bg: "#f0fdf4", border: "#bbf7d0", accent: "#16a34a", text: "#15803d", icon: "✓" },
          danger:  { bg: "#fef2f2", border: "#fecaca", accent: "#dc2626", text: "#b91c1c", icon: "✕" },
          info:    { bg: "#eff6ff", border: "#bfdbfe", accent: "#2563eb", text: "#1d4ed8", icon: "i" },
          warning: { bg: "#fffbeb", border: "#fde68a", accent: "#d97706", text: "#b45309", icon: "!" },
        }[t.type] || { bg: "#fffbeb", border: "#fde68a", accent: "#d97706", text: "#b45309", icon: "!" };
        return (
          <div key={t.id} style={{
            pointerEvents: "all",
            display: "flex", alignItems: "flex-start", gap: "10px",
            padding: "13px 15px",
            background: c.bg, border: `1px solid ${c.border}`,
            borderLeft: `3px solid ${c.accent}`, borderRadius: "10px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            animation: "slideIn 0.25s cubic-bezier(0.34,1.56,0.64,1)"
          }}>
            <span style={{
              width: "20px", height: "20px", background: c.accent, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: "800", color: "white", flexShrink: 0, marginTop: "1px"
            }}>{c.icon}</span>
            <div style={{ flex: 1, fontSize: "13px", color: c.text, fontWeight: "500", lineHeight: "1.55" }}>
              {t.msg}
            </div>
            <button onClick={() => removeToast(t.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9ca3af", fontSize: "17px", lineHeight: 1, flexShrink: 0, padding: "0 2px"
            }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Overlay ─────────────────────────────────────────────────────────────────
function Overlay({ text }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(255,255,255,0.78)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9998
    }}>
      <div style={{
        background: "white", border: "1px solid #e5e7eb", borderRadius: "16px",
        padding: "36px 48px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
      }}>
        <div style={{
          width: "44px", height: "44px", border: "3px solid #e5e7eb",
          borderTop: "3px solid #2563eb", borderRadius: "50%",
          margin: "0 auto 16px", animation: "spin 0.7s linear infinite"
        }} />
        <div style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280", lineHeight: "1.5" }}>
          {text}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Finder() {
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem("examly_token") || ""; } catch { return ""; }
  });
  const [ui, setUI] = useState(token ? "search" : "welcome");
  const [courseName, setCourseName] = useState("");
  const [status, setStatus] = useState("");
  const [toasts, setToasts] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [projectItems, setProjectItems] = useState([]);
  const [page, setPage] = useState(1);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (token) setUI("search");
    else setUI("welcome");
  }, [token]);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  let _tid = 0;
  const addToast = (msg, type = "warning") => {
    const id = ++_tid + Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => removeToast(id), 5500);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const showOverlay = (msg) => { setOverlayText(msg); setOverlay(true); };
  const hideOverlay = () => setOverlay(false);

  const startAutoDetect = () => setIsAutoDetecting(true);
  const stopAutoDetect  = () => setIsAutoDetecting(false);

  const copyInstructions = () => {
    const txt = `How to get your Authorization token:
1. Open: https://admin.ltimindtree.iamneo.ai/
2. Login to your account
3. Press F12 → Network tab → Fetch/XHR filter
4. Refresh the page or click any menu
5. Find any request to api.examly.io
6. Click it → Headers section → find "Authorization"
7. Copy the full token value and paste it below`;
    navigator.clipboard.writeText(txt).then(() => addToast("📋 Instructions copied!", "success"));
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const headers = { "Content-Type": "application/json", Authorization: token };

  // ── Token ─────────────────────────────────────────────────────────────────
  const saveToken = () => {
    if (!tokenInput.trim()) { addToast("Token cannot be empty", "danger"); return; }
    try {
      localStorage.setItem("examly_token", tokenInput.trim());
      setToken(tokenInput.trim());
      setTokenInput("");
      addToast("Token saved — you're in!", "success");
    } catch (err) { addToast("Failed to save token: " + err.message, "danger"); }
  };

  const clearToken = () => {
    try { localStorage.removeItem("examly_token"); } catch {}
    setToken(""); setUI("welcome"); setTokenInput("");
    setContentItems([]); setProjectItems([]);
    setCourseName(""); setStatus("");
    addToast("Logged out successfully", "info");
  };

  // ── API helpers ────────────────────────────────────────────────────────────
  async function findCourseByName(name) {
    const res = await fetch(`${API}/api/v2/courses/filter`, {
      method: "POST", headers,
      body: JSON.stringify({
        mainDepartmentUser: true, page: 1, limit: 100, search: name,
        department_id: COURSE_DEPARTMENT_IDS, branch_id: [], batch_id: "All",
        publishType: [], publisherCourseOnly: false, tag_id: []
      })
    });
    if (!res.ok) throw new Error(`Course search failed (HTTP ${res.status})`);
    const json = await res.json();
    return json?.rows?.[0]?.c_id || json?.rows?.[0]?.$c_id || null;
  }

  async function getCourseDetails(id) {
    const res = await fetch(`${API}/api/v2/course/${id}`, { headers: { Authorization: token } });
    if (!res.ok) throw new Error(`Course fetch failed (HTTP ${res.status})`);
    const json = await res.json();
    return json.course || json;
  }

  async function getAllContentBanks(schoolId) {
    const res = await fetch(`${API}/api/v2/contentbank/all`, {
      method: "POST", headers,
      body: JSON.stringify({
        branch_id: "all", dataIds: schoolId || "",
        department_id: CONTENT_DEPARTMENT_IDS, mainDepartmentUser: true
      })
    });
    if (!res.ok) throw new Error(`Content bank fetch failed (HTTP ${res.status})`);
    const json = await res.json();
    return json?.results?.contentbanks || [];
  }

  async function fetchContentBankContents(cb_id, pageNum = 1, limit = 50) {
    const res = await fetch(`${API}/api/content/filter`, {
      method: "POST", headers,
      body: JSON.stringify({ cb_id, page: pageNum, limit })
    });
    return await res.json();
  }

  async function fetchAllContentBanksBatched(cbList, courseContentIds) {
    const map = new Map();
    const BATCH_SIZE = 3, DELAY_MS = 500, PAGE_DELAY_MS = 150;

    async function fetchSingleCBAllPages(cb_id, cb_label) {
      let pageNum = 1;
      while (true) {
        try {
          const res = await fetchContentBankContents(cb_id, pageNum, 50);
          const arr = res.content || [];
          arr.forEach(c => {
            if (courseContentIds.has(c.content_id) && !map.has(c.content_id)) {
              map.set(c.content_id, {
                content_id: c.content_id, name: c.name,
                file: c.content_media?.file || "", size: c.content_media?.size || "",
                type: c.content_media?.type || c.type || "",
                cb_id, cb_label, createdBy: c.createdBy || ""
              });
            }
          });
          if (arr.length < 50) break;
          pageNum++;
          await sleep(PAGE_DELAY_MS);
        } catch (err) { console.error(`Error fetching CB ${cb_id}:`, err); break; }
      }
    }

    for (let i = 0; i < cbList.length; i += BATCH_SIZE) {
      const batch = cbList.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(cbList.length / BATCH_SIZE);
      showOverlay(`Batch ${batchNum}/${totalBatches}: Fetching ${batch.length} content banks...`);
      const promises = batch.map(cb => fetchSingleCBAllPages(cb.value || cb.cb_id, cb.label || cb.name));
      try { await Promise.all(promises); } catch (err) { console.error(`Batch ${batchNum} error:`, err); }
      if (i + BATCH_SIZE < cbList.length) await sleep(DELAY_MS);
    }
    return map;
  }

  function collectContentIdsFromCourse(courseData) {
    const out = [];
    console.log("Course Data Structure:", JSON.stringify(courseData, null, 2));

    let modules = [];
    if (courseData.course_modules?.c_module_data) modules = courseData.course_modules.c_module_data;
    else if (Array.isArray(courseData.course_modules)) modules = courseData.course_modules;
    else if (Array.isArray(courseData.modules)) modules = courseData.modules;
    else if (Array.isArray(courseData.c_module_data)) modules = courseData.c_module_data;

    modules.forEach(mod => {
      const moduleName = mod.c_module_name || mod.module_name || mod.name || "";
      const subModules = mod.c_sub_modules || mod.sub_modules || [];

      if (Array.isArray(subModules) && subModules.length > 0) {
        subModules.forEach(sub => {
          const subName = sub.sub_module_name || sub.module_name || sub.name || "";
          const params = sub.sub_module_params || sub.module_params || sub.params || [];
          (params || []).forEach(p => {
            if (p.content_id) out.push({ content_id: p.content_id, moduleName, subName });
            if (Array.isArray(p.content_data)) p.content_data.forEach(cd => { if (cd.content_id) out.push({ content_id: cd.content_id, moduleName, subName }); });
            if (Array.isArray(p.contents))     p.contents.forEach(cd => { if (cd.content_id) out.push({ content_id: cd.content_id, moduleName, subName }); });
          });
        });
      } else {
        const params = mod.c_module_params || mod.module_params || mod.params || [];
        (params || []).forEach(p => {
          const subName = p.sub_module_name || p.module_name || "";
          if (p.content_id) out.push({ content_id: p.content_id, moduleName, subName });
          if (Array.isArray(p.content_data)) p.content_data.forEach(cd => { if (cd.content_id) out.push({ content_id: cd.content_id, moduleName, subName }); });
          if (Array.isArray(p.contents))     p.contents.forEach(cd => { if (cd.content_id) out.push({ content_id: cd.content_id, moduleName, subName }); });
        });
      }
    });

    console.log("Collected Content IDs:", out);
    return out;
  }

  // ── Search Projects ────────────────────────────────────────────────────────
  async function searchProjects() {
    if (!courseName.trim()) { addToast("Please enter a course name or code", "warning"); return; }
    setIsLoading(true); setProjectItems([]); setStatus("Looking up course...");

    try {
      // Step 1: find course
      const courseId = await findCourseByName(courseName);
      if (!courseId) {
        addToast(`No course found matching "${courseName}". Double-check the name or course code and try again.`, "danger");
        setStatus(""); setIsLoading(false); return;
      }

      // Step 2: get course structure
      setStatus("Fetching course structure...");
      const course = await getCourseDetails(courseId);
      const modules = course.course_modules?.c_module_data || [];
      const pbIds = new Set();

      modules.forEach(m => {
        (m.c_module_params || []).forEach(p => { if (p.pb_id) pbIds.add(p.pb_id); });
        (m.c_sub_modules || []).forEach(sub =>
          (sub.sub_module_params || []).forEach(sp => { if (sp.pb_id) pbIds.add(sp.pb_id); })
        );
      });

      if (pbIds.size === 0) {
        addToast("This course has no Project module. It may be a content-only or QB-based course — try the Content search instead.", "warning");
        setStatus(""); setIsLoading(false); return;
      }

      const schoolId = course.course_branch_department?.[0]?.school_id || "";

      // Step 3: broad dept search
      setStatus(`Searching ${pbIds.size} project bank(s) in your departments...`);
      const res = await fetch(`${API}/api/projectBanks/get`, {
        method: "POST", headers,
        body: JSON.stringify({
          branch_id: "all", page: 1, limit: 200, visibility: "All",
          mainDepartmentUser: true, department_id: PROJECT_DEPARTMENT_IDS, dataIds: schoolId
        })
      });
      const json = await res.json();
      const rows = json?.results?.rows || [];
      const matched = rows.filter(r => pbIds.has(r.pb_id));
      const matchedIds = new Set(matched.map(r => r.pb_id));

      // Step 4: fallback for cross-dept pb_ids
      const unmatchedIds = Array.from(pbIds).filter(id => !matchedIds.has(id));
      if (unmatchedIds.length > 0) {
        setStatus(`${matched.length} found via dept search. Looking up ${unmatchedIds.length} cross-dept bank(s)...`);
        for (const pbId of unmatchedIds) {
          let added = false;
          // Try direct GET endpoint
          try {
            const dr = await fetch(`${API}/api/projectBank/${pbId}`, { headers: { Authorization: token } });
            if (dr.ok) {
              const dj = await dr.json();
              const pb = dj?.projectBank || dj?.result || dj;
              if (pb && (pb.pb_id || pb.name)) {
                matched.push({
                  pb_id: pb.pb_id || pbId,
                  name: pb.name || `Project Bank (${pbId.slice(0, 8)}…)`,
                  createdBy: pb.createdBy || "N/A",
                  pb_description: pb.pb_description || null,
                  _tag: "cross-dept"
                });
                matchedIds.add(pbId); added = true;
              }
            }
          } catch {}

          // Last resort: use name from course params
          if (!added) {
            let projectName = "Unnamed Project Bank";
            modules.forEach(m => {
              (m.c_module_params || []).forEach(p => {
                if (p.pb_id === pbId) projectName = p.projectName || p.project_name || projectName;
              });
            });
            matched.push({ pb_id: pbId, name: projectName, createdBy: "N/A", pb_description: null, _tag: "restricted" });
            matchedIds.add(pbId);
          }
          await sleep(150);
        }
      }

      if (matched.length === 0) {
        addToast("No project banks could be found. The banks may belong to a restricted department outside your access scope.", "warning");
        setStatus(""); setIsLoading(false); return;
      }

      setProjectItems(matched);
      setStatus(`Found ${matched.length} project bank(s)`);
      addToast(`✓ Found ${matched.length} project bank(s)`, "success");
    } catch (err) {
      addToast(`Error: ${err.message}`, "danger");
      setStatus(""); console.error(err);
    }
    setIsLoading(false);
  }

  // ── Search Contents ────────────────────────────────────────────────────────
  async function searchContents() {
    if (!courseName.trim()) { addToast("Please enter a course name or code", "warning"); return; }
    setIsLoading(true); setContentItems([]);

    try {
      showOverlay("Looking up course...");
      const courseId = await findCourseByName(courseName);
      if (!courseId) {
        hideOverlay();
        addToast(`No course found matching "${courseName}". Double-check the name or course code and try again.`, "danger");
        setIsLoading(false); return;
      }

      showOverlay("Fetching course details...");
      const course = await getCourseDetails(courseId);
      console.log("Full Course Data:", course);

      const orderedContent = collectContentIdsFromCourse(course);
      if (!orderedContent.length) {
        hideOverlay();
        addToast("No content items found in this course. It may be a project-only course — try the Projects search instead.", "warning");
        console.warn("Course structure:", JSON.stringify(course, null, 2));
        setIsLoading(false); return;
      }

      const courseSet = new Set(orderedContent.map(x => x.content_id));
      const schoolId = course.course_branch_department?.[0]?.school_id || "";

      showOverlay("Fetching content banks...");
      const banks = await getAllContentBanks(schoolId);
      if (!banks.length) {
        hideOverlay();
        addToast("No content banks found for this school. Your token may not have access to the content bank API.", "warning");
        setIsLoading(false); return;
      }

      showOverlay(`Found ${banks.length} content banks. Searching...`);
      const matches = await fetchAllContentBanksBatched(banks, courseSet);

      const final = [];
      const addedIds = new Set();
      orderedContent.forEach(ctx => {
        if (!addedIds.has(ctx.content_id) && matches.has(ctx.content_id)) {
          const m = matches.get(ctx.content_id);
          final.push({
            content_id: ctx.content_id, moduleName: ctx.moduleName, subName: ctx.subName,
            contentName: m.name || m.file || "", file: m.file || "",
            cb_label: m.cb_label, size: m.size, createdBy: m.createdBy
          });
          addedIds.add(ctx.content_id);
        }
      });

      hideOverlay();

      if (!final.length) {
        addToast(`Searched ${orderedContent.length} item(s) across ${banks.length} bank(s) — no matches found. The content may belong to a bank in a different department.`, "warning");
        setIsLoading(false); return;
      }

      setContentItems(final); setPage(1); setUI("content");
      addToast(`✓ Found ${final.length} content file(s)`, "success");
    } catch (err) {
      hideOverlay(); addToast(`Error: ${err.message}`, "danger"); console.error("Full error:", err);
    }
    setIsLoading(false);
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!contentItems.length) { addToast("No content to export", "warning"); return; }
    const hdrs = ["Content ID", "Module", "Submodule", "Content Name", "File", "Content Bank", "Size", "Created By"];
    let csv = hdrs.map(h => `"${h}"`).join(",") + "\n";
    contentItems.forEach(i => {
      csv += [i.content_id, i.moduleName, i.subName, i.contentName, i.file, i.cb_label, i.size, i.createdBy]
        .map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `${courseName}_content_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    addToast(`Downloaded: ${courseName}_content.csv`, "success");
  };

  const totalPages = Math.max(1, Math.ceil(contentItems.length / PAGE_SIZE));
  const pageItems  = contentItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const formatSize = (s) => {
    if (!s) return "";
    const n = parseFloat(s);
    if (isNaN(n)) return s;
    return n > 1024 ? (n / 1024).toFixed(2) + " MB" : n.toFixed(2) + " KB";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {overlay && <Overlay text={overlayText} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(18px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        .fc  { animation: fadeUp 0.3s ease both; }
        .hrow:hover { background: #f9fafb !important; }
        .abtn { transition: all 0.18s ease; }
        .abtn:hover { opacity: 0.88; transform: translateY(-1px); }
        .abtn:active { transform: translateY(0); opacity: 1; }
        input:focus, textarea:focus { outline: none !important; border-color: #2563eb !important; box-shadow: 0 0 0 3px #2563eb18 !important; }
      `}</style>

      {/* ══ WELCOME ══════════════════════════════════════════════════════════ */}
      {ui === "welcome" && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div className="fc" style={{ width: "100%", maxWidth: "500px" }}>

            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <div style={{
                width: "62px", height: "62px", margin: "0 auto 16px",
                background: "linear-gradient(135deg, #2563eb, #60a5fa)",
                borderRadius: "18px", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "28px",
                boxShadow: "0 4px 20px #2563eb30"
              }}>📚</div>
              <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#111827", letterSpacing: "-0.5px", margin: "0 0 6px" }}>
                Content Finder
              </h1>
              <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
                Search Projects & Content Banks
              </p>
            </div>

            {/* Auto-detect guide */}
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px", marginBottom: "16px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "inline-block", background: "#eff6ff", color: "#2563eb", padding: "5px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.5px", border: "1px solid #bfdbfe" }}>
                🎯 Guided Token Extraction
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#111827", margin: "0 0 6px" }}>Quick Setup Guide</h3>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 20px", lineHeight: "1.5" }}>
                Follow these steps to extract your authentication token
              </p>

              {!isAutoDetecting ? (
                <button onClick={startAutoDetect} className="abtn" style={{
                  width: "100%", padding: "13px", background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                  color: "white", border: "none", borderRadius: "10px", fontSize: "14px",
                  fontWeight: "700", cursor: "pointer", boxShadow: "0 2px 12px #7c3aed28"
                }}>
                  📖 Show Me How
                </button>
              ) : (
                <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                    {[
                      ["1", "Open Admin Panel", "Go to admin.ltimindtree.iamneo.ai"],
                      ["2", "Open DevTools", "Press F12 or Ctrl+Shift+I (Win) / Cmd+Option+I (Mac)"],
                      ["3", "Network Tab", 'Click "Network" tab, then filter by "Fetch/XHR"'],
                      ["4", "Trigger a Request", "Refresh the page or click any menu item"],
                      ["5", "Find API Request", 'Look for any request to "api.examly.io" in the list'],
                      ["6", "Copy Token", 'Click it → "Headers" tab → find "Authorization" → copy the value'],
                    ].map(([n, title, desc]) => (
                      <div key={n} style={{ display: "flex", gap: "12px", padding: "12px", background: "white", borderRadius: "9px", border: "1px solid #e5e7eb", alignItems: "flex-start" }}>
                        <span style={{ minWidth: "28px", height: "28px", background: "linear-gradient(135deg, #2563eb, #3b82f6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", color: "white", flexShrink: 0 }}>{n}</span>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827", marginBottom: "2px" }}>{title}</div>
                          <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                    <button onClick={copyInstructions} className="abtn" style={{ flex: 1, padding: "10px", background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                      📋 Copy Instructions
                    </button>
                    <button onClick={stopAutoDetect} className="abtn" style={{ flex: 1, padding: "10px", background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                      ← Back
                    </button>
                  </div>
                  <div style={{ padding: "10px 12px", background: "#fffbeb", borderRadius: "8px", fontSize: "12px", color: "#92400e", border: "1px solid #fde68a", lineHeight: "1.5" }}>
                    💡 <strong>Pro Tip:</strong> Right-click the Authorization value and select "Copy value" for easy extraction
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ position: "relative", height: "1px", background: "#e5e7eb", margin: "20px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ background: "#f3f4f6", padding: "0 14px", color: "#9ca3af", fontSize: "12px", fontWeight: "600" }}>OR</span>
            </div>

            {/* Manual token entry */}
            <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "28px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#111827", margin: "0 0 6px" }}>Manual Entry</h3>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 18px", lineHeight: "1.5" }}>Paste your API token directly</p>

              <textarea
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="Paste your Authorization token here..."
                rows={5}
                style={{
                  width: "100%", padding: "13px 15px",
                  background: "#f9fafb", border: "1.5px solid #e5e7eb",
                  borderRadius: "10px", color: "#111827",
                  fontSize: "12px", fontFamily: "'JetBrains Mono', monospace",
                  resize: "vertical", lineHeight: "1.6", marginBottom: "14px",
                  transition: "border-color 0.2s, box-shadow 0.2s"
                }}
              />

              <button onClick={saveToken} className="abtn" style={{
                width: "100%", padding: "13px",
                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                color: "white", border: "none", borderRadius: "10px",
                fontSize: "14px", fontWeight: "700", cursor: "pointer",
                boxShadow: "0 2px 12px #2563eb28"
              }}>
                💾 Save Token & Continue
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: "20px", padding: "14px", background: "white", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>🔒</span>
              Your token is stored locally and never sent to external servers
            </div>
          </div>
        </div>
      )}

      {/* ══ SEARCH ═══════════════════════════════════════════════════════════ */}
      {ui === "search" && (
        <div style={{ maxWidth: "820px", margin: "0 auto", padding: "28px 20px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, #2563eb, #3b82f6)", borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 2px 10px #2563eb22" }}>📚</div>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#111827", margin: "0 0 2px", letterSpacing: "-0.3px" }}>Course Explorer</h2>
                <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Search Projects & Content Banks</p>
              </div>
            </div>
            <button onClick={clearToken} className="abtn" style={{ padding: "8px 16px", background: "white", border: "1px solid #e5e7eb", color: "#6b7280", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "600", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              🚪 Logout
            </button>
          </div>

          {/* Search card */}
          <div className="fc" style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "22px", marginBottom: "14px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>
                📖 Course Name
              </label>
              <input
                type="text"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isLoading && searchProjects()}
                placeholder="Enter course name or code..."
                disabled={isLoading}
                style={{
                  width: "100%", padding: "12px 15px",
                  background: "#f9fafb", border: "1.5px solid #e5e7eb",
                  borderRadius: "9px", color: "#111827", fontSize: "14px",
                  transition: "border-color 0.2s, box-shadow 0.2s"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button onClick={searchProjects} disabled={isLoading} className="abtn" style={{
                padding: "20px 12px", flexDirection: "column", display: "flex", alignItems: "center", gap: "7px",
                background: isLoading ? "#f9fafb" : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                border: isLoading ? "1.5px solid #e5e7eb" : "none", borderRadius: "12px",
                cursor: isLoading ? "not-allowed" : "pointer", color: isLoading ? "#9ca3af" : "white",
                boxShadow: isLoading ? "none" : "0 4px 15px rgba(245,87,108,0.3)", opacity: isLoading ? 0.65 : 1
              }}>
                <span style={{ fontSize: "24px" }}>🎯</span>
                <div style={{ fontSize: "14px", fontWeight: "700" }}>Projects</div>
                <div style={{ fontSize: "11px", opacity: 0.9 }}>Find project banks</div>
              </button>

              <button onClick={searchContents} disabled={isLoading} className="abtn" style={{
                padding: "20px 12px", flexDirection: "column", display: "flex", alignItems: "center", gap: "7px",
                background: isLoading ? "#f9fafb" : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                border: isLoading ? "1.5px solid #e5e7eb" : "none", borderRadius: "12px",
                cursor: isLoading ? "not-allowed" : "pointer", color: isLoading ? "#9ca3af" : "white",
                boxShadow: isLoading ? "none" : "0 4px 15px rgba(79,172,254,0.3)", opacity: isLoading ? 0.65 : 1
              }}>
                <span style={{ fontSize: "24px" }}>📄</span>
                <div style={{ fontSize: "14px", fontWeight: "700" }}>Contents</div>
                <div style={{ fontSize: "11px", opacity: 0.9 }}>Search content files</div>
              </button>
            </div>
          </div>

          {/* Status bar */}
          {(status || isLoading) && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 16px", background: "white", border: "1px solid #e5e7eb", borderRadius: "10px", marginBottom: "14px", fontSize: "13px", color: "#6b7280", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {isLoading && <div style={{ width: "14px", height: "14px", border: "2px solid #e5e7eb", borderTop: "2px solid #2563eb", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />}
              <span style={{ fontWeight: "500" }}>{status}</span>
            </div>
          )}

          {/* Project Results */}
          {projectItems.length > 0 && (
            <div className="fc" style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px" }}>🎯</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>Project Banks</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", background: "#fce7f3", color: "#be185d", padding: "2px 8px", borderRadius: "20px" }}>
                    {projectItems.length} found
                  </span>
                </div>
                <button onClick={() => { setProjectItems([]); setStatus(""); }} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "17px", padding: "2px 6px", borderRadius: "4px" }}>×</button>
              </div>

              {projectItems.map((item, idx) => (
                <div key={item.pb_id} className="hrow" style={{ padding: "14px 20px", borderBottom: idx < projectItems.length - 1 ? "1px solid #f3f4f6" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", transition: "background 0.12s" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>{item.name}</span>
                      {item._tag === "cross-dept" && (
                        <span style={{ fontSize: "10px", fontWeight: "700", background: "#eff6ff", color: "#2563eb", padding: "1px 7px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>CROSS-DEPT</span>
                      )}
                      {item._tag === "restricted" && (
                        <span style={{ fontSize: "10px", fontWeight: "700", background: "#fffbeb", color: "#d97706", padding: "1px 7px", borderRadius: "4px", border: "1px solid #fde68a" }}>DEPT RESTRICTED</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "'JetBrains Mono', monospace" }}>{item.pb_id}</span>
                      {item.createdBy && item.createdBy !== "N/A" && <span style={{ fontSize: "11px", color: "#9ca3af" }}>by {item.createdBy}</span>}
                      {item.pb_description && <span style={{ fontSize: "11px", color: "#9ca3af" }}>{item.pb_description}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(item.pb_id).then(() => addToast("PB ID copied!", "success"))}
                    style={{ padding: "6px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280", borderRadius: "7px", cursor: "pointer", fontSize: "11px", fontWeight: "600", flexShrink: 0, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#111827"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.color = "#6b7280"; }}
                  >
                    Copy ID
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ CONTENT RESULTS ══════════════════════════════════════════════════ */}
      {ui === "content" && (
        <div style={{ maxWidth: "820px", margin: "0 auto", padding: "28px 20px" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#111827", margin: "0 0 3px", letterSpacing: "-0.3px" }}>Content Results</h2>
              <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>{contentItems.length} file(s) found for "{courseName}"</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={exportCSV} className="abtn" style={{ padding: "8px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "700" }}>
                📥 Export All
              </button>
              <button onClick={() => setUI("search")} className="abtn" style={{ padding: "8px 14px", background: "white", border: "1px solid #e5e7eb", color: "#6b7280", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "600", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                ← Back
              </button>
            </div>
          </div>

          <div className="fc" style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", marginBottom: "14px", maxHeight: "560px", overflowY: "auto" }}>
            {pageItems.length === 0 ? (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "14px" }}>📭</div>
                <div style={{ color: "#9ca3af", fontSize: "14px", fontWeight: "500" }}>No content files found</div>
              </div>
            ) : pageItems.map((item, idx) => (
              <div key={item.content_id} className="hrow" style={{ padding: "14px 20px", borderBottom: idx < pageItems.length - 1 ? "1px solid #f3f4f6" : "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", transition: "background 0.12s" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "2px 7px", borderRadius: "4px", display: "inline-block", marginBottom: "7px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                    {item.cb_label}
                  </span>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                    {item.contentName || item.file || "Untitled"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    📁 {item.moduleName}
                    {item.subName && <span style={{ color: "#9ca3af" }}> › {item.subName}</span>}
                  </div>
                  <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
                    {item.content_id} • {item.file}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {item.size && <div style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>{formatSize(item.size)}</div>}
                  {item.createdBy && <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "3px" }}>{item.createdBy}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="abtn" style={{ padding: "8px 16px", background: "white", border: "1px solid #e5e7eb", color: page <= 1 ? "#d1d5db" : "#374151", borderRadius: "8px", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              ← Previous
            </button>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>
              Page <strong style={{ color: "#111827" }}>{page}</strong> of <strong style={{ color: "#111827" }}>{totalPages}</strong>
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="abtn" style={{ padding: "8px 16px", background: "white", border: "1px solid #e5e7eb", color: page >= totalPages ? "#d1d5db" : "#374151", borderRadius: "8px", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "600", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}