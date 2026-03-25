// src/pages/scaffa/ReactScaf.jsx
import { useState, useEffect, useRef } from "react";
import apiConfig from "../../apiConfig";
import "./ReactScaf.css";

const validateUrl = (url) =>
  /^https:\/\/808[0-9]{1}-[\w\d]+\.premiumproject\.examly\.io\/?$/.test(url);

/* ── Flower Loader SVG ─────────────────────────────────────── */
function FlowerLoader() {
  return (
    <div className="rsc-loader-wrap">
      <div className="rsc-loader-backdrop" />
      <div className="rsc-loader-box">
        <div className="loader">
          <svg id="pegtopone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <g><path d="M50 15 C50 15, 65 30, 65 50 C65 70, 50 85, 50 85 C50 85, 35 70, 35 50 C35 30, 50 15, 50 15Z"/><path d="M15 50 C15 50, 30 35, 50 35 C70 35, 85 50, 85 50 C85 50, 70 65, 50 65 C30 65, 15 50, 15 50Z" fill="var(--rsc-purple-light)"/></g>
          </svg>
          <svg id="pegtoptwo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <g><path d="M50 15 C50 15, 65 30, 65 50 C65 70, 50 85, 50 85 C50 85, 35 70, 35 50 C35 30, 50 15, 50 15Z"/><path d="M15 50 C15 50, 30 35, 50 35 C70 35, 85 50, 85 50 C85 50, 70 65, 50 65 C30 65, 15 50, 15 50Z" fill="var(--rsc-purple-light)"/></g>
          </svg>
          <svg id="pegtopthree" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <g><path d="M50 15 C50 15, 65 30, 65 50 C65 70, 50 85, 50 85 C50 85, 35 70, 35 50 C35 30, 50 15, 50 15Z"/><path d="M15 50 C15 50, 30 35, 50 35 C70 35, 85 50, 85 50 C85 50, 70 65, 50 65 C30 65, 15 50, 15 50Z" fill="var(--rsc-purple-light)"/></g>
          </svg>
        </div>
        <p className="rsc-loader-text">Generating ZIP...</p>
        <p className="rsc-loader-sub">Building scaffold structure</p>
      </div>
    </div>
  );
}

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ show, message, type = "success" }) {
  if (!show) return null;
  return (
    <div className={`rsc-toast rsc-toast--${type}`}>
      <span className="rsc-toast-icon">{type === "success" ? "✓" : "✕"}</span>
      <span>{message}</span>
    </div>
  );
}

export default function ReactScaf() {

  // ── URL & folder browser ──────────────────────────────────
  const [githubUrl, setGithubUrl]             = useState("");
  const [urlError, setUrlError]               = useState("");
  const [folderPath, setFolderPath]           = useState("");
  const [pathHistory, setPathHistory]         = useState([]);
  const [folders, setFolders]                 = useState([]);
  const [fetchingFolders, setFetchingFolders] = useState(false);

  // ── Spec files ────────────────────────────────────────────
  const [specFiles, setSpecFiles]             = useState([]);
  const [selectedFiles, setSelectedFiles]     = useState([]);
  const [fetchingSpecs, setFetchingSpecs]     = useState(false);
  const [specFolder, setSpecFolder]           = useState("");

  // ── Local input ───────────────────────────────────────────
  const [testCaseCode, setTestCaseCode]       = useState("");
  const [fileName, setFileName]               = useState("");
  const [uploadedFile, setUploadedFile]       = useState(null);

  // ── ZIP ───────────────────────────────────────────────────
  const [zipFileName, setZipFileName]         = useState("");
  const [loading, setLoading]                 = useState(false);

  // ── Toast ─────────────────────────────────────────────────
  const [toast, setToast]                     = useState({ show: false, message: "", type: "success" });

  // ── Preview ───────────────────────────────────────────────
  const [showPreview, setShowPreview]         = useState(false);

  // ── Weight ────────────────────────────────────────────────
  const [weightMode, setWeightMode]           = useState(null); // null | "percent" | "custom"
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const [weightObjects, setWeightObjects]     = useState([]);
  const [generatedJSON, setGeneratedJSON]     = useState([]);
  const [totalWeightage, setTotalWeightage]   = useState(0);
  const [copyDone, setCopyDone]               = useState(false);

  useEffect(() => {
    const total = weightObjects.reduce((acc, o) => acc + o.weightage, 0);
    setTotalWeightage(total);
  }, [weightObjects]);

  // ── Derived ───────────────────────────────────────────────
  const urlSourceCode = selectedFiles.map((f) => f.content).join("\n");
  const activeCode    = urlSourceCode || testCaseCode;
  const hasCode       = activeCode.trim().length > 0;
  const isValidUrl    = validateUrl(githubUrl);

  // ── Toast helper ─────────────────────────────────────────
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // ── URL handlers ─────────────────────────────────────────

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setGithubUrl(val);
    setUrlError(val && !validateUrl(val)
      ? "Invalid URL — format: https://808*-...premiumproject.examly.io/"
      : "");
  };

  const fetchFolders = async (path = "") => {
    setFetchingFolders(true);
    try {
      const res  = await fetch(apiConfig.FETCH_FOLDERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl, path }),
      });
      const data = await res.json();
      setFolders(data.folders || []);
      setFolderPath(path);
      setSpecFiles([]);
    } catch (err) {
      console.error("Folder fetch error:", err);
    } finally {
      setFetchingFolders(false);
    }
  };

  const handleFolderClick = (folder) => {
    const newPath = folderPath ? `${folderPath}/${folder}` : folder;
    setPathHistory((h) => [...h, folderPath]);
    fetchFolders(newPath);
  };

  const handleBack = () => {
    const prev = pathHistory[pathHistory.length - 1] ?? "";
    setPathHistory((h) => h.slice(0, -1));
    fetchFolders(prev);
  };

  const handleClearUrl = () => {
    setGithubUrl(""); setUrlError("");
    setFolders([]); setFolderPath(""); setPathHistory([]);
    setSpecFiles([]); setSelectedFiles([]);
  };

  const fetchSpecFiles = async (folder) => {
    setFetchingSpecs(true);
    setSpecFolder(folder);
    try {
      const res  = await fetch(apiConfig.FETCH_SPEC_FILES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl, folderName: folder, type: "react" }),
      });
      const data = await res.json();
      setSpecFiles(data.specFiles || []);
      setSelectedFiles([]);
    } catch (err) {
      console.error("Spec fetch error:", err);
    } finally {
      setFetchingSpecs(false);
    }
  };

  const toggleFile = (file) => {
    setSelectedFiles((prev) =>
      prev.some((f) => f.name === file.name)
        ? prev.filter((f) => f.name !== file.name)
        : [...prev, file]
    );
  };

  // ── Local upload ─────────────────────────────────────────

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setTestCaseCode(ev.target.result);
    reader.readAsText(file);
  };

  // ── ZIP ──────────────────────────────────────────────────

  const handleGenerateZip = async () => {
    if (!zipFileName.trim()) {
      showToast("Please enter a ZIP filename", "error");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    if (uploadedFile && !urlSourceCode) formData.append("testCase", uploadedFile);
    else formData.append("testCase", activeCode);
    formData.append("zipFileName", zipFileName.trim());

    try {
      const res = await fetch(apiConfig.UPLOAD, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server error");
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${zipFileName.trim()}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      showToast(`✅ ${zipFileName.trim()}.zip downloaded successfully!`);
      setZipFileName("");
    } catch (err) {
      showToast("Failed to generate ZIP. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Weight ───────────────────────────────────────────────

  const parseTestNames = (code) => {
    const regex = /(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g;
    const names = []; let match;
    while ((match = regex.exec(code)) !== null) names.push(match[1]);
    return names;
  };

  const applyWeight = (mode, pct) => {
    const names = parseTestNames(activeCode);
    if (!names.length) { showToast("No test() / it() blocks found", "error"); return; }

    if (mode === "custom") {
      setWeightMode("custom");
      const objs = names.map((n) => ({ name: n, weightage: 0 }));
      setWeightObjects(objs); setGeneratedJSON(objs);
    } else {
      setWeightMode("percent");
      const per = (parseFloat(pct) / 100) / names.length;
      const objs = names.map((n) => ({ name: n, weightage: per }));
      setWeightObjects(objs); setGeneratedJSON(objs);
    }
  };

  const updateWeight = (i, val) => {
    const updated = [...weightObjects];
    updated[i].weightage = parseFloat(val) || 0;
    setWeightObjects(updated); setGeneratedJSON(updated);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(weightObjects, null, 2));
    setCopyDone(true);
    showToast("Weight JSON copied to clipboard!");
    setTimeout(() => setCopyDone(false), 2500);
  };

  const highlightTestNames = (code) =>
    code.replace(
      /(?:test|it)\s*\(\s*(['"`])([^'"`]+)\1\s*,/g,
      (match, quote, name) =>
        `<span style="color:#7c3aed;font-weight:700;">${match.split(quote)[0]}${quote}${name}${quote}</span>,`
    );

  return (
    <div className="rsc-page">

      {/* Toast */}
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      {/* Loading */}
      {loading && <FlowerLoader />}

      {/* ══ SECTION 1 — Workspace Fetch ══ */}
      <div className="rsc-card">
        <div className="rsc-card-head">
          <div className="rsc-card-icon rsc-icon-blue">🔍</div>
          <div>
            <h3 className="rsc-card-title">Fetch Workspace</h3>
            <p className="rsc-card-desc">Browse and select test files from your examly workspace</p>
          </div>
        </div>

        <div className="rsc-field">
          <label className="rsc-label">Workspace URL</label>
          <div className="rsc-input-row">
            <input
              className={`rsc-input ${urlError ? "rsc-input--error" : githubUrl && isValidUrl ? "rsc-input--valid" : ""}`}
              value={githubUrl}
              onChange={handleUrlChange}
              placeholder="https://808*-...premiumproject.examly.io/"
            />
            <button
              className="rsc-btn rsc-btn--blue"
              onClick={() => { setPathHistory([]); fetchFolders(""); }}
              disabled={!isValidUrl || fetchingFolders}
            >
              {fetchingFolders
                ? <><span className="rsc-btn-spinner" /> Fetching...</>
                : "Fetch"}
            </button>
            {githubUrl && (
              <button className="rsc-btn rsc-btn--ghost-red" onClick={handleClearUrl}>
                Clear
              </button>
            )}
          </div>
          {urlError && <p className="rsc-field-error">⚠ {urlError}</p>}
        </div>

        {/* Folder browser */}
        {folders.length > 0 && (
          <div className="rsc-browser">
            <div className="rsc-browser-bar">
              <div className="rsc-browser-path">
                <span className="rsc-path-root">root</span>
                {folderPath && folderPath.split("/").map((seg, i) => (
                  <span key={i} className="rsc-path-seg"> / {seg}</span>
                ))}
              </div>
              {pathHistory.length > 0 && (
                <button className="rsc-back-btn" onClick={handleBack}>← Back</button>
              )}
            </div>
            <div className="rsc-browser-list">
              {folders.map((folder, i) => {
                const fullPath = folderPath ? `${folderPath}/${folder}` : folder;
                return (
                  <div key={i} className="rsc-folder-row">
                    <div className="rsc-folder-name" onClick={() => handleFolderClick(folder)}>
                      <span className="rsc-folder-icon">📁</span>
                      <span>{folder}</span>
                    </div>
                    <button
                      className="rsc-view-btn"
                      onClick={() => fetchSpecFiles(fullPath)}
                      disabled={fetchingSpecs}
                    >
                      {fetchingSpecs && specFolder === fullPath
                        ? <span className="rsc-btn-spinner rsc-btn-spinner--sm" />
                        : "View .js/.ts"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* File selector */}
        {specFiles.length > 0 && (
          <div className="rsc-file-select">
            <div className="rsc-file-select-head">
              <span className="rsc-label" style={{ margin: 0 }}>Files in "{specFolder.split("/").pop()}"</span>
              <span className="rsc-badge rsc-badge--blue">{specFiles.length} files</span>
              {selectedFiles.length > 0 && (
                <span className="rsc-badge rsc-badge--green">✓ {selectedFiles.length} selected</span>
              )}
            </div>
            <div className="rsc-file-list">
              {specFiles.map((file, i) => {
                const isSelected = selectedFiles.some((f) => f.name === file.name);
                return (
                  <label key={i} className={`rsc-file-item ${isSelected ? "rsc-file-item--active" : ""}`}>
                    <input
                      type="checkbox"
                      className="rsc-checkbox"
                      checked={isSelected}
                      onChange={() => toggleFile(file)}
                    />
                    <span className="rsc-file-icon">📜</span>
                    <span className="rsc-file-name">{file.name.split("/").pop()}</span>
                    <span className="rsc-file-path">{file.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ SECTION 2 — Local Input ══ */}
      <div className="rsc-card">
        <div className="rsc-card-head">
          <div className="rsc-card-icon rsc-icon-violet">📝</div>
          <div>
            <h3 className="rsc-card-title">Local Input</h3>
            <p className="rsc-card-desc">Paste or upload test case code directly</p>
          </div>
          {selectedFiles.length > 0 && (
            <span className="rsc-card-disabled-tag">Using workspace files</span>
          )}
        </div>

        <div className="rsc-two-col">
          <div className="rsc-field">
            <label className="rsc-label">Paste test code</label>
            <textarea
              className="rsc-textarea"
              value={testCaseCode}
              onChange={(e) => setTestCaseCode(e.target.value)}
              placeholder={"test('should render', () => {\n  // ...\n});\n\nit('should pass', () => {\n  // ...\n});"}
              disabled={selectedFiles.length > 0}
              rows={8}
            />
          </div>
          <div className="rsc-field">
            <label className="rsc-label">Upload file</label>
            <label className={`rsc-upload-box ${selectedFiles.length > 0 ? "rsc-upload-box--disabled" : ""}`}>
              <div className="rsc-upload-inner">
                <span className="rsc-upload-icon">⬆</span>
                <span className="rsc-upload-text">
                  {fileName ? fileName : "Click to upload .js / .ts / .txt"}
                </span>
                {fileName && <span className="rsc-upload-clear" onClick={(e) => { e.preventDefault(); setFileName(""); setUploadedFile(null); setTestCaseCode(""); }}>✕</span>}
              </div>
              <input
                type="file"
                accept=".js,.txt,.ts"
                onChange={handleFileUpload}
                disabled={selectedFiles.length > 0}
                style={{ display: "none" }}
              />
            </label>
            {/* Parsed test count */}
            {hasCode && (
              <div className="rsc-parsed-info">
                <span className="rsc-badge rsc-badge--violet">
                  {parseTestNames(activeCode).length} test blocks found
                </span>
                <span className="rsc-parsed-hint">test() &amp; it() parsed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ SECTION 3 — Generate ZIP (always visible when hasCode) ══ */}
      {hasCode && (
        <div className="rsc-card rsc-card--action">
          <div className="rsc-zip-row">
            <div className="rsc-zip-left">
              <div className="rsc-card-icon rsc-icon-green">⬇</div>
              <div>
                <h3 className="rsc-card-title">Generate ZIP</h3>
                <p className="rsc-card-desc">Download the scaffold ZIP for this test case</p>
              </div>
            </div>
            <div className="rsc-zip-right">
              <input
                className="rsc-input rsc-zip-input"
                value={zipFileName}
                onChange={(e) => setZipFileName(e.target.value)}
                placeholder="filename (without .zip)"
                onKeyDown={(e) => e.key === "Enter" && zipFileName && handleGenerateZip()}
              />
              <button
                className="rsc-btn rsc-btn--green rsc-btn--lg"
                onClick={handleGenerateZip}
                disabled={!zipFileName.trim() || loading}
              >
                ⬇ Download ZIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SECTION 4 — Preview + Weight side by side ══ */}
      {hasCode && (
        <div className="rsc-bottom-grid">

          {/* Preview */}
          <div className="rsc-card rsc-card--half">
            <div className="rsc-card-head">
              <div className="rsc-card-icon rsc-icon-amber">👁</div>
              <div>
                <h3 className="rsc-card-title">Preview</h3>
                <p className="rsc-card-desc">
                  <span className="rsc-highlight">test()</span> &amp; <span className="rsc-highlight">it()</span> highlighted
                </p>
              </div>
              <button
                className={`rsc-toggle-btn ${showPreview ? "rsc-toggle-btn--active" : ""}`}
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Hide" : "Show"}
              </button>
            </div>
            {showPreview && (
              <div className="rsc-preview-wrap">
                {selectedFiles.length > 0
                  ? selectedFiles.map((file, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div className="rsc-file-tag">{file.name.split("/").pop()}</div>
                      <div
                        className="rsc-preview"
                        dangerouslySetInnerHTML={{ __html: highlightTestNames(file.content) }}
                      />
                    </div>
                  ))
                  : <div
                      className="rsc-preview"
                      dangerouslySetInnerHTML={{ __html: highlightTestNames(activeCode) }}
                    />
                }
              </div>
            )}
          </div>

          {/* Weight Object */}
          <div className="rsc-card rsc-card--half">
            <div className="rsc-card-head">
              <div className="rsc-card-icon rsc-icon-purple">⚖</div>
              <div>
                <h3 className="rsc-card-title">Weight Object</h3>
                <p className="rsc-card-desc">Assign weightage to test cases</p>
              </div>
            </div>

            {/* Mode selector */}
            <div className="rsc-weight-modes">
              <button
                className={`rsc-mode-btn ${weightMode === "percent" ? "rsc-mode-btn--active" : ""}`}
                onClick={() => setWeightMode(weightMode === "percent" ? null : "percent")}
              >
                % Percentage
              </button>
              <button
                className={`rsc-mode-btn ${weightMode === "custom" ? "rsc-mode-btn--active" : ""}`}
                onClick={() => applyWeight("custom")}
              >
                Custom
              </button>
            </div>

            {/* Percentage select */}
            {weightMode === "percent" && (
              <div className="rsc-pct-row">
                <select
                  className="rsc-select"
                  value={selectedPercentage}
                  onChange={(e) => setSelectedPercentage(e.target.value)}
                >
                  <option value="">Select %</option>
                  {[10,20,30,40,50,60,70,80,90,100].map((v) => (
                    <option key={v} value={v}>{v}%</option>
                  ))}
                </select>
                <button
                  className="rsc-btn rsc-btn--purple"
                  disabled={!selectedPercentage}
                  onClick={() => applyWeight("percent", selectedPercentage)}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Weight table */}
            {generatedJSON.length > 0 && (
              <div className="rsc-weight-section">
                <div className="rsc-weight-table-wrap">
                  <table className="rsc-weight-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Test Case</th>
                        <th>Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedJSON.map((tc, i) => (
                        <tr key={i}>
                          <td className="rsc-td-num">{i + 1}</td>
                          <td className="rsc-td-name">{tc.name}</td>
                          <td className="rsc-td-weight">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="rsc-weight-input"
                              value={tc.weightage}
                              onChange={(e) => updateWeight(i, e.target.value)}
                              readOnly={weightMode === "percent"}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rsc-weight-footer">
                  <div className="rsc-total-chip">
                    Total <strong>{totalWeightage % 1 === 0 ? totalWeightage.toFixed(2) : parseFloat(totalWeightage.toFixed(6))}</strong>
                  </div>
                  <button className="rsc-btn rsc-btn--purple" onClick={copyToClipboard}>
                    {copyDone ? "✓ Copied!" : "Copy JSON"}
                  </button>
                </div>
              </div>
            )}

            {!generatedJSON.length && (
              <div className="rsc-weight-empty">
                <span>Select a mode above to generate weight objects</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}