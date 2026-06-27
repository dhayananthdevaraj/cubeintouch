// src/pages/Packager.jsx
import { useState, useRef } from "react";
import "./Packager.css";
import apiConfig from "../apiConfig";

const TECHSTACKS = [
  { id: "pytest",  label: "pytest", lang: "Python",    icon: "🐍", desc: "Python test packaging via pytest runner" },
  { id: "junit",  label: "JUnit",  lang: "Java",       icon: "☕", desc: "Java Maven test packaging via JUnit" },
  { id: "nunit",  label: "NUnit",  lang: ".NET / C#",  icon: "⚙️", desc: ".NET test packaging via NUnit runner" },
];

const STATUS = { IDLE: "idle", PROCESSING: "processing", DONE: "done", ERROR: "error" };

// ── Recursive tree node ──────────────────────────────────
function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="tree-node" style={{ paddingLeft: depth * 16 }}>
      <div
        className={`tree-row ${hasChildren ? "tree-folder" : "tree-file"}`}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        <span className="tree-arrow">{hasChildren ? (open ? "▾" : "▸") : " "}</span>
        <span className="tree-icon">{hasChildren ? (open ? "📂" : "📁") : getFileIcon(node.name)}</span>
        <span className="tree-name">{node.name}</span>
      </div>
      {hasChildren && open && node.children.map((c, i) => (
        <TreeNode key={i} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

function getFileIcon(name) {
  if (name.endsWith(".sh"))   return "⚡";
  if (name.endsWith(".java")) return "☕";
  if (name.endsWith(".py"))   return "🐍";
  if (name.endsWith(".cs"))   return "⚙️";
  if (name.endsWith(".xml"))  return "📄";
  if (name.endsWith(".json")) return "📋";
  if (name.endsWith(".zip"))  return "🗜️";
  return "📄";
}

// ── Main component ───────────────────────────────────────
export default function Packager() {
  const [stack, setStack]           = useState(null);
  const [file, setFile]             = useState(null);
  const [tree, setTree]             = useState(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [status, setStatus]         = useState(STATUS.IDLE);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadName, setDownloadName] = useState("");
  const [errorMsg, setErrorMsg]     = useState("");
  const [logLines, setLogLines]     = useState([]);
  const [dragging, setDragging]     = useState(false);
  const fileRef = useRef();

  const addLog = (line) => setLogLines(p => [...p, line]);

  const resetResult = () => {
    setStatus(STATUS.IDLE);
    setDownloadUrl(null);
    setDownloadName("");
    setErrorMsg("");
    setLogLines([]);
  };

  const resetFile = () => {
    setFile(null);
    setTree(null);
    if (fileRef.current) fileRef.current.value = "";
    resetResult();
  };

  const handleStackSelect = (s) => { setStack(s.id); resetResult(); };

  const processFile = async (f) => {
    if (!f.name.endsWith(".zip")) {
      setErrorMsg("Only .zip files are accepted.");
      setStatus(STATUS.ERROR);
      return;
    }
    setFile(f);
    setTree(null);
    resetResult();

    // Fetch folder tree preview
    setTreeLoading(true);
    try {
      const fd = new FormData();
      fd.append("folder", f);
      const res = await fetch(apiConfig.PACKAGER_PREVIEW, { method: "POST", body: fd });
      const data = await res.json();
      setTree(data.tree || []);
    } catch {
      setTree([]);
    } finally {
      setTreeLoading(false);
    }
  };

  const handleFileChange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };
  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!stack || !file) return;
    setStatus(STATUS.PROCESSING);
    setLogLines([]);
    setErrorMsg("");
    setDownloadUrl(null);

    addLog(`📦 Uploading ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);
    addLog(`⚙️  Running ${stack} packaging script...`);

    const formData = new FormData();
    formData.append("folder", file);
    formData.append("stack", stack);

    try {
      const res = await fetch(apiConfig.PACKAGER_RUN, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Server error: ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const nm = (cd.match(/filename="?([^"]+)"?/) || [])[1] || `${file.name.replace(/\.zip$/i,"")}_packaged.zip`;
      setDownloadUrl(URL.createObjectURL(blob));
      setDownloadName(nm);
      setStatus(STATUS.DONE);
      addLog(`✅ Packaging complete → ${nm}`);
    } catch (err) {
      setStatus(STATUS.ERROR);
      setErrorMsg(err.message);
      addLog(`❌ Error: ${err.message}`);
    }
  };

  const selectedStack  = TECHSTACKS.find(t => t.id === stack);
  const isProcessing   = status === STATUS.PROCESSING;
  const step1Done      = !!stack;
  const step2Done      = !!file;
  const step2Active    = step1Done && !step2Done;
  const step3Active    = step1Done && step2Done;

  return (
    <div className="pkgr-root">
      <div className="pkgr-wrap">

        {/* Header */}
        <div className="pkgr-hero">
          <div className="pkgr-eyebrow">
            <span className="pkgr-pulse"></span>
            Test packager
          </div>
          <h1 className="pkgr-h1">Package &amp; <span className="pkgr-accent">ship</span></h1>
          <p className="pkgr-sub">Upload your test folder zip, pick a stack, get a self-extracting artifact back.</p>
        </div>

        <div className="pkgr-layout">

          {/* LEFT — Steps */}
          <div className="pkgr-steps">

            {/* Step 1 */}
            <div className="pkgr-step-row">
              <div className={`pkgr-step-num ${step1Done ? "done" : "active"}`}>{step1Done ? "✓" : "1"}</div>
              <div className="pkgr-step-body">
                <div className="pkgr-step-label">Choose stack</div>
                <div className="pkgr-stacks">
                  {TECHSTACKS.map(s => (
                    <button key={s.id} className={`pkgr-stack-card ${stack === s.id ? "selected" : ""}`} onClick={() => handleStackSelect(s)}>
                      <span className="pkgr-s-icon">{s.icon}</span>
                      <span className="pkgr-s-name">{s.label}</span>
                      <span className="pkgr-s-lang">{s.lang}</span>
                      {stack === s.id && <span className="pkgr-s-check">✓</span>}
                    </button>
                  ))}
                </div>
                {selectedStack && <span className="pkgr-desc-chip">{selectedStack.desc}</span>}
              </div>
            </div>

            <div className="pkgr-connector"></div>

            {/* Step 2 */}
            <div className="pkgr-step-row">
              <div className={`pkgr-step-num ${step2Done ? "done" : step2Active ? "active" : ""}`}>{step2Done ? "✓" : "2"}</div>
              <div className="pkgr-step-body">
                <div className="pkgr-step-label">Upload zip</div>
                <div
                  className={`pkgr-dropzone ${file ? "has-file" : ""} ${!stack ? "locked" : ""} ${dragging ? "drag" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={stack ? handleDrop : undefined}
                  onClick={() => stack && fileRef.current?.click()}
                >
                  <input ref={fileRef} type="file" accept=".zip" style={{ display: "none" }} onChange={handleFileChange} />
                  {file ? (
                    <div className="pkgr-file-row">
                      <span className="pkgr-file-icon">📁</span>
                      <div>
                        <div className="pkgr-file-name">{file.name}</div>
                        <div className="pkgr-file-size">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button className="pkgr-file-remove" onClick={e => { e.stopPropagation(); resetFile(); }}>✕</button>
                    </div>
                  ) : (
                    <div className="pkgr-dz-placeholder">
                      <span className="pkgr-dz-icon">📂</span>
                      <div className="pkgr-dz-text">{stack ? "Drop zip here or click to browse" : "Select a stack first"}</div>
                      <div className="pkgr-dz-hint">.zip only · single or multi-folder</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pkgr-connector"></div>

            {/* Step 3 */}
            <div className="pkgr-step-row">
              <div className={`pkgr-step-num ${status === STATUS.DONE ? "done" : step3Active ? "active" : ""}`}>{status === STATUS.DONE ? "✓" : "3"}</div>
              <div className="pkgr-step-body">
                <div className="pkgr-step-label">Package</div>
                <button
                  className={`pkgr-run-btn ${isProcessing ? "loading" : ""}`}
                  disabled={!stack || !file || isProcessing}
                  onClick={handleSubmit}
                >
                  {isProcessing ? (<><span className="pkgr-spinner"></span> Packaging...</>)
                    : status === STATUS.DONE ? "↺ Run again"
                    : "⬡ Run packager"}
                </button>
              </div>
            </div>

            {/* Log */}
            {logLines.length > 0 && (
              <div className="pkgr-log">
                <div className="pkgr-log-head"><span className="pkgr-log-dot"></span>Output</div>
                <div className="pkgr-log-body">
                  {logLines.map((line, i) => <span key={i} className="pkgr-log-line">{line}</span>)}
                </div>
              </div>
            )}

            {/* Error */}
            {status === STATUS.ERROR && errorMsg && (
              <div className="pkgr-err"><span>⚠️</span><span>{errorMsg}</span></div>
            )}

            {/* Done */}
            {status === STATUS.DONE && downloadUrl && (
              <div className="pkgr-done">
                <span className="pkgr-done-icon">🎉</span>
                <div>
                  <div className="pkgr-done-title">Packaging complete</div>
                  <div className="pkgr-done-name">{downloadName}</div>
                </div>
                <a className="pkgr-dl-btn" href={downloadUrl} download={downloadName}>⬇ Download</a>
              </div>
            )}
          </div>

          {/* RIGHT — Folder tree */}
          {(file || treeLoading) && (
            <div className="pkgr-tree-panel">
              <div className="pkgr-tree-header">
                <span className="pkgr-tree-title">📦 {file?.name}</span>
                <span className="pkgr-tree-badge">{treeLoading ? "scanning..." : "structure"}</span>
              </div>
              <div className="pkgr-tree-body">
                {treeLoading ? (
                  <div className="pkgr-tree-loading">
                    <span className="pkgr-spinner-dark"></span>
                    Reading zip structure...
                  </div>
                ) : tree && tree.length > 0 ? (
                  tree.map((node, i) => <TreeNode key={i} node={node} depth={0} />)
                ) : (
                  <div className="pkgr-tree-empty">No entries found</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}