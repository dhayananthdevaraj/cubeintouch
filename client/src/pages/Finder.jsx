import { useState, useEffect } from "react";
import { CONTENT_DEPARTMENT_IDS, COURSE_DEPARTMENT_IDS, PROJECT_DEPARTMENT_IDS } from "../config";

const API = "https://api.examly.io";

export default function Finder() {
  const [token, setToken] = useState(() => localStorage.getItem("examly_token") || "");
  const [ui, setUI] = useState(token ? "search" : "welcome");
  const [courseName, setCourseName] = useState("");
  const [status, setStatus] = useState("");
  const [alert, setAlert] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [projectItems, setProjectItems] = useState([]);
  const [page, setPage] = useState(1);
  const [overlay, setOverlay] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [tokenInput, setTokenInput] = useState("");

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (token) setUI("search");
    else setUI("welcome");
  }, [token]);

  // Alert helper
  const showAlert = (msg, type = "warning") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const showOverlay = (msg) => {
    setOverlayText(msg);
    setOverlay(true);
  };

  const hideOverlay = () => setOverlay(false);

  // Token management
  const saveToken = () => {
    if (!tokenInput.trim()) {
      showAlert("Token cannot be empty", "danger");
      return;
    }
    localStorage.setItem("examly_token", tokenInput.trim());
    setToken(tokenInput.trim());
    setTokenInput("");
    setUI("search");
    showAlert("Token saved successfully!", "success");
  };

  const clearToken = () => {
    localStorage.removeItem("examly_token");
    setToken("");
    setUI("welcome");
    setTokenInput("");
    setContentItems([]);
    setProjectItems([]);
    showAlert("Token cleared", "danger");
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // API Helpers
  async function findCourseByName(name) {
    const res = await fetch(`${API}/api/v2/courses/filter`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mainDepartmentUser: true,
        page: 1,
        limit: 100,
        search: name,
        department_id: COURSE_DEPARTMENT_IDS,
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

  async function getAllContentBanks(schoolId) {
    const res = await fetch(`${API}/api/v2/contentbank/all`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        branch_id: "all",
        dataIds: schoolId || "",
        department_id: CONTENT_DEPARTMENT_IDS,
        mainDepartmentUser: true
      })
    });
    const json = await res.json();
    return json?.results?.contentbanks || [];
  }

  async function fetchContentBankContents(cb_id, pageNum = 1, limit = 50) {
    const res = await fetch(`${API}/api/content/filter`, {
      method: "POST",
      headers,
      body: JSON.stringify({ cb_id, page: pageNum, limit })
    });
    return await res.json();
  }

  // Batch fetch with optimizations
  async function fetchAllContentBanksBatched(cbList, courseContentIds) {
    const map = new Map();
    const BATCH_SIZE = 3;
    const DELAY_MS = 500;
    const PAGE_DELAY_MS = 150;

    async function fetchSingleCBAllPages(cb_id, cb_label) {
      let pageNum = 1;
      let allContent = [];

      while (true) {
        try {
          const res = await fetchContentBankContents(cb_id, pageNum, 50);
          const arr = res.content || [];

          arr.forEach((c) => {
            if (courseContentIds.has(c.content_id) && !map.has(c.content_id)) {
              map.set(c.content_id, {
                content_id: c.content_id,
                name: c.name,
                file: c.content_media?.file || "",
                size: c.content_media?.size || "",
                type: c.content_media?.type || c.type || "",
                cb_id: cb_id,
                cb_label: cb_label,
                createdBy: c.createdBy || ""
              });
            }
          });

          if (arr.length < 50) break;
          pageNum++;
          await sleep(PAGE_DELAY_MS);
        } catch (err) {
          console.error(`Error fetching CB ${cb_id}:`, err);
          break;
        }
      }
      return allContent;
    }

    for (let i = 0; i < cbList.length; i += BATCH_SIZE) {
      const batch = cbList.slice(i, Math.min(i + BATCH_SIZE, cbList.length));
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(cbList.length / BATCH_SIZE);

      showOverlay(`Batch ${batchNum}/${totalBatches}: Fetching ${batch.length} content banks...`);

      const promises = batch.map((cb) =>
        fetchSingleCBAllPages(cb.value || cb.cb_id, cb.label || cb.name)
      );

      try {
        await Promise.all(promises);
      } catch (err) {
        console.error(`Batch ${batchNum} error:`, err);
      }

      if (i + BATCH_SIZE < cbList.length) {
        await sleep(DELAY_MS);
      }
    }

    return map;
  }

  // Collect content context from course
  function collectContentIdsFromCourse(courseData) {
    const out = [];
    
    // Debug log to see the structure
    console.log("Course Data Structure:", JSON.stringify(courseData, null, 2));
    
    // Try multiple possible paths for modules
    let modules = [];
    
    // Path 1: course_modules.c_module_data
    if (courseData.course_modules?.c_module_data) {
      modules = courseData.course_modules.c_module_data;
    }
    // Path 2: course_modules (direct array)
    else if (Array.isArray(courseData.course_modules)) {
      modules = courseData.course_modules;
    }
    // Path 3: modules
    else if (Array.isArray(courseData.modules)) {
      modules = courseData.modules;
    }
    // Path 4: c_module_data
    else if (Array.isArray(courseData.c_module_data)) {
      modules = courseData.c_module_data;
    }

    modules.forEach((mod) => {
      const moduleName = mod.c_module_name || mod.module_name || mod.name || "";

      // Handle sub-modules
      const subModules = mod.c_sub_modules || mod.sub_modules || [];
      
      if (Array.isArray(subModules) && subModules.length > 0) {
        subModules.forEach((sub) => {
          const subName = sub.sub_module_name || sub.module_name || sub.name || "";
          
          // Try different param paths
          const params = sub.sub_module_params || sub.module_params || sub.params || [];
          
          (params || []).forEach((p) => {
            // Direct content_id
            if (p.content_id) {
              out.push({ content_id: p.content_id, moduleName, subName });
            }
            // Nested content_data array
            if (Array.isArray(p.content_data)) {
              p.content_data.forEach((cd) => {
                if (cd.content_id) {
                  out.push({ content_id: cd.content_id, moduleName, subName });
                }
              });
            }
            // Alternative: contents
            if (Array.isArray(p.contents)) {
              p.contents.forEach((cd) => {
                if (cd.content_id) {
                  out.push({ content_id: cd.content_id, moduleName, subName });
                }
              });
            }
          });
        });
      } else {
        // No sub-modules, check module params directly
        const params = mod.c_module_params || mod.module_params || mod.params || [];
        
        (params || []).forEach((p) => {
          const subName = p.sub_module_name || p.module_name || "";
          
          // Direct content_id
          if (p.content_id) {
            out.push({ content_id: p.content_id, moduleName, subName });
          }
          
          // Nested content_data array
          if (Array.isArray(p.content_data)) {
            p.content_data.forEach((cd) => {
              if (cd.content_id) {
                out.push({ content_id: cd.content_id, moduleName, subName });
              }
            });
          }
          
          // Alternative: contents
          if (Array.isArray(p.contents)) {
            p.contents.forEach((cd) => {
              if (cd.content_id) {
                out.push({ content_id: cd.content_id, moduleName, subName });
              }
            });
          }
        });
      }
    });

    console.log("Collected Content IDs:", out);
    return out;
  }

  // Search projects
  async function searchProjects() {
    if (!courseName.trim()) {
      showAlert("Please enter a course name", "warning");
      return;
    }

    try {
      setStatus("Searching projects...");
      const courseId = await findCourseByName(courseName);
      if (!courseId) {
        showAlert("Course not found", "danger");
        return;
      }

      const course = await getCourseDetails(courseId);
      const modules = course.course_modules?.c_module_data || [];
      const pbIds = new Set();

      modules.forEach((m) =>
        (m.c_module_params || []).forEach((p) => p.pb_id && pbIds.add(p.pb_id))
      );

      const schoolId = course.course_branch_department?.[0]?.school_id || "";

      const res = await fetch(`${API}/api/projectBanks/get`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          branch_id: "all",
          page: 1,
          limit: 200,
          visibility: "All",
          mainDepartmentUser: true,
          department_id: PROJECT_DEPARTMENT_IDS,
          dataIds: schoolId
        })
      });

      const json = await res.json();
      const rows = json?.results?.rows || [];
      const matched = rows.filter((r) => pbIds.has(r.pb_id));

      if (matched.length === 0) {
        showAlert("No project banks found", "warning");
        return;
      }

      setProjectItems(matched);
      setStatus(`Found ${matched.length} project bank(s)`);
    } catch (err) {
      showAlert("Error: " + err.message, "danger");
      console.error(err);
    }
  }

  // Search contents
  async function searchContents() {
    if (!courseName.trim()) {
      showAlert("Please enter a course name", "warning");
      return;
    }

    try {
      showOverlay("Initializing search...");
      const courseId = await findCourseByName(courseName);
      if (!courseId) {
        hideOverlay();
        showAlert("Course not found", "danger");
        return;
      }

      showOverlay("Fetching course details...");
      const course = await getCourseDetails(courseId);
      console.log("Full Course Data:", course);
      
      const orderedContent = collectContentIdsFromCourse(course);

      if (!orderedContent.length) {
        hideOverlay();
        showAlert("⚠️ No content_id found in course modules. Check browser console for course structure.", "warning");
        console.warn("Course structure:", JSON.stringify(course, null, 2));
        return;
      }

      const courseSet = new Set(orderedContent.map((x) => x.content_id));
      const schoolId = course.course_branch_department?.[0]?.school_id || "";
      
      showOverlay("Fetching content banks...");
      const banks = await getAllContentBanks(schoolId);

      if (!banks.length) {
        hideOverlay();
        showAlert("No content banks found for this school", "warning");
        return;
      }

      showOverlay(`Found ${banks.length} content banks. Searching...`);
      const matches = await fetchAllContentBanksBatched(banks, courseSet);
      const final = [];
      const addedIds = new Set();

      orderedContent.forEach((ctx) => {
        if (!addedIds.has(ctx.content_id) && matches.has(ctx.content_id)) {
          const match = matches.get(ctx.content_id);
          final.push({
            content_id: ctx.content_id,
            moduleName: ctx.moduleName,
            subName: ctx.subName,
            contentName: match.name || match.file || "",
            file: match.file || "",
            cb_label: match.cb_label,
            size: match.size,
            createdBy: match.createdBy
          });
          addedIds.add(ctx.content_id);
        }
      });

      hideOverlay();

      if (!final.length) {
        showAlert(`Found 0 matches in content banks. Searched for ${orderedContent.length} content items across ${banks.length} banks.`, "warning");
        return;
      }

      setContentItems(final);
      setPage(1);
      setUI("content");
      showAlert(`✅ Found ${final.length} content file(s)`, "success");
    } catch (err) {
      hideOverlay();
      showAlert("Error: " + err.message, "danger");
      console.error("Full error:", err);
    }
  }

  // Export CSV
  const exportCSV = () => {
    if (!contentItems.length) {
      showAlert("No content to export", "warning");
      return;
    }

    const headers = ["Content ID", "Module", "Submodule", "Content Name", "File", "Content Bank", "Size", "Created By"];
    const rows = contentItems.map((item) => [
      item.content_id,
      item.moduleName,
      item.subName,
      item.contentName,
      item.file,
      item.cb_label,
      item.size,
      item.createdBy
    ]);

    let csv = headers.map((h) => `"${h}"`).join(",") + "\n";
    rows.forEach((row) => {
      csv += row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${courseName}_content_${timestamp}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showAlert(`Downloaded: ${filename}`, "success");
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(contentItems.length / PAGE_SIZE));
  const pageItems = contentItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatSize = (sizeStr) => {
    if (!sizeStr) return "";
    const n = parseFloat(sizeStr);
    if (isNaN(n)) return sizeStr;
    if (n > 1024) return (n / 1024).toFixed(2) + " MB";
    return n.toFixed(2) + " KB";
  };

  return (
    <div className="finder-container" style={styles.container}>
      {/* Loading Overlay */}
      {overlay && (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <div style={styles.spinner}></div>
            <div style={styles.overlayText}>{overlayText}</div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <div style={{ ...styles.alert, ...styles[`alert_${alert.type}`] }}>
          {alert.msg}
        </div>
      )}

      {/* Welcome Screen */}
      {ui === "welcome" && (
        <div style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>📚 Course Finder</h2>
          <p style={styles.welcomeSubtitle}>Paste your API token below</p>

          <textarea
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your Authorization token here..."
            style={styles.tokenInput}
          />

          <div style={styles.buttonGroup}>
            <button onClick={saveToken} style={{ ...styles.button, ...styles.buttonPrimary }}>
              Save Token
            </button>
          </div>

          <p style={styles.tokenHint}>
            💡 Tip: Your token will be saved in localStorage for future sessions
          </p>
        </div>
      )}

      {/* Search Screen */}
      {ui === "search" && (
        <div style={styles.searchContainer}>
          <h3 style={styles.searchTitle}>Course → Finder</h3>

          <div style={styles.formGroup}>
            <label style={styles.label}>Course Name</label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchContents()}
              placeholder="Enter course name..."
              style={styles.input}
            />
          </div>

          <div style={styles.controlsRow}>
            <button onClick={searchProjects} style={{ ...styles.button, ...styles.buttonPrimary }}>
              🎯 Projects
            </button>
            <button onClick={searchContents} style={{ ...styles.button, ...styles.buttonPrimary }}>
              📄 Contents
            </button>
          </div>

          <div style={styles.controlsRow}>
            <button onClick={clearToken} style={{ ...styles.button, ...styles.buttonDanger }}>
              🚪 Logout
            </button>
          </div>

          {status && <div style={styles.status}>{status}</div>}

          {/* Project Results */}
          {projectItems.length > 0 && (
            <div style={styles.results}>
              <h4>Project Banks ({projectItems.length})</h4>
              {projectItems.map((item) => (
                <div key={item.pb_id} style={styles.resultItem}>
                  <div style={styles.itemTitle}>{item.name}</div>
                  <div style={styles.itemMeta}>pb_id: {item.pb_id}</div>
                  <div style={styles.itemMeta}>By: {item.createdBy || "N/A"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Screen */}
      {ui === "content" && (
        <div style={styles.contentContainer}>
          <div style={styles.contentHeader}>
            <h3 style={styles.contentTitle}>Content Results</h3>
            <div style={styles.headerActions}>
              <button onClick={exportCSV} style={{ ...styles.button, ...styles.buttonSuccess }}>
                📥 Export All
              </button>
              <button onClick={() => setUI("search")} style={{ ...styles.button, ...styles.buttonSecondary }}>
                ← Back
              </button>
            </div>
          </div>

          <div style={styles.contentList}>
            {pageItems.length === 0 ? (
              <div style={styles.emptyState}>No content files found</div>
            ) : (
              pageItems.map((item) => (
                <div key={item.content_id} style={styles.contentItem}>
                  <span style={styles.cbLabel}>{item.cb_label}</span>
                  <div style={styles.moduleName}>{item.moduleName}</div>
                  <div style={styles.submoduleName}>{item.subName}</div>
                  <div style={styles.contentName}>{item.contentName || item.file || "Untitled"}</div>
                  <div style={styles.meta}>
                    {item.content_id} • {item.file} • {formatSize(item.size)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div style={styles.pagination}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              style={{ ...styles.button, ...(page <= 1 ? styles.buttonDisabled : {}) }}
            >
              ← Prev
            </button>
            <span style={styles.pageInfo}>Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              style={{ ...styles.button, ...(page >= totalPages ? styles.buttonDisabled : {}) }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Styles
const styles = {
  container: {
    padding: "24px",
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    backdropFilter: "blur(2px)"
  },
  overlayContent: {
    background: "white",
    borderRadius: "12px",
    padding: "32px",
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
  },
  spinner: {
    border: "4px solid #f0f2f5",
    borderTop: "4px solid #0d6efd",
    borderRadius: "50%",
    width: "48px",
    height: "48px",
    margin: "0 auto 16px",
    animation: "spin 0.8s linear infinite"
  },
  overlayText: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a1a"
  },
  alert: {
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "500"
  },
  alert_success: {
    background: "#d4edda",
    color: "#155724"
  },
  alert_warning: {
    background: "#fff3cd",
    color: "#856404"
  },
  alert_danger: {
    background: "#f8d7da",
    color: "#721c24"
  },
  welcome: {
    textAlign: "center",
    padding: "40px 0"
  },
  welcomeTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0d6efd",
    marginBottom: "8px"
  },
  welcomeSubtitle: {
    color: "#6c757d",
    marginBottom: "24px"
  },
  tokenInput: {
    width: "100%",
    minHeight: "120px",
    padding: "12px",
    border: "1.5px solid #dee2e6",
    borderRadius: "8px",
    fontFamily: "monospace",
    fontSize: "12px",
    marginBottom: "16px",
    boxSizing: "border-box"
  },
  tokenHint: {
    fontSize: "12px",
    color: "#6c757d",
    marginTop: "12px"
  },
  searchContainer: {
    background: "white",
    borderRadius: "12px",
    padding: "24px"
  },
  searchTitle: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "20px",
    color: "#1a1a1a"
  },
  formGroup: {
    marginBottom: "16px"
  },
  label: {
    display: "block",
    fontWeight: "600",
    fontSize: "12px",
    textTransform: "uppercase",
    color: "#495057",
    marginBottom: "8px"
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1.5px solid #dee2e6",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box"
  },
  controlsRow: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px",
    flexWrap: "wrap"
  },
  button: {
    flex: 1,
    minWidth: "120px",
    padding: "11px 16px",
    fontSize: "14px",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  buttonPrimary: {
    background: "linear-gradient(135deg, #0d6efd 0%, #0c5cde 100%)",
    color: "white",
    boxShadow: "0 2px 8px rgba(13, 110, 253, 0.2)"
  },
  buttonSecondary: {
    background: "#f8f9fa",
    border: "1.5px solid #dee2e6",
    color: "#495057"
  },
  buttonDanger: {
    background: "#dc3545",
    color: "white"
  },
  buttonSuccess: {
    background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
    color: "white"
  },
  buttonDisabled: {
    opacity: "0.5",
    cursor: "not-allowed"
  },
  status: {
    marginTop: "16px",
    padding: "12px",
    background: "#f8f9fa",
    borderRadius: "8px",
    color: "#6c757d",
    fontSize: "13px"
  },
  results: {
    marginTop: "24px"
  },
  resultItem: {
    background: "#f8f9fa",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "8px",
    borderLeft: "3px solid #0d6efd"
  },
  itemTitle: {
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: "4px"
  },
  itemMeta: {
    fontSize: "12px",
    color: "#6c757d",
    fontFamily: "monospace",
    marginTop: "2px"
  },
  contentContainer: {
    background: "white",
    borderRadius: "12px",
    padding: "24px"
  },
  contentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "2px solid #f0f2f5",
    gap: "12px",
    flexWrap: "wrap"
  },
  contentTitle: {
    fontSize: "18px",
    fontWeight: "700",
    margin: "0",
    flex: 1
  },
  headerActions: {
    display: "flex",
    gap: "8px"
  },
  contentList: {
    maxHeight: "400px",
    overflowY: "auto",
    marginBottom: "16px"
  },
  contentItem: {
    background: "linear-gradient(135deg, #f8faff 0%, #f0f5ff 100%)",
    border: "1px solid #e7eef8",
    borderLeft: "4px solid #0d6efd",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "10px"
  },
  cbLabel: {
    fontSize: "10px",
    color: "#0d6efd",
    fontWeight: "700",
    textTransform: "uppercase",
    background: "#f0f7ff",
    padding: "3px 8px",
    borderRadius: "4px",
    display: "inline-block",
    marginBottom: "6px"
  },
  moduleName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: "6px 0 3px 0"
  },
  submoduleName: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#495057",
    margin: "3px 0 5px 0"
  },
  contentName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#212529",
    margin: "5px 0"
  },
  meta: {
    fontSize: "11px",
    color: "#868e96",
    fontFamily: "monospace",
    marginTop: "5px"
  },
  emptyState: {
    textAlign: "center",
    padding: "24px",
    color: "#868e96",
    fontSize: "14px"
  },
  pagination: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    paddingTop: "12px",
    borderTop: "1px solid #f0f2f5"
  },
  pageInfo: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#495057",
    flex: 1,
    textAlign: "center"
  }
};