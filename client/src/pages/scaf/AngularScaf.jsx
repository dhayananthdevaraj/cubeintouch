// src/pages/scaffa/AngularScaf.jsx
import { useState, useEffect } from "react";
import apiConfig from "../../apiConfig";
import "./AngularScaf.css";

const validateUrl = (url) =>
  /^https:\/\/808[0-9]{1}-[\w\d]+\.premiumproject\.examly\.io\/?$/.test(url);

/* ── Flower Loader ─────────────────────────────────────────── */
function FlowerLoader() {
  return (
    <div className="asc-loader-wrap">
      <div className="asc-loader-backdrop" />
      <div className="asc-loader-box">
        <div className="asc-flower">
          <svg id="asc-peg1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <g><path d="M50 15 C50 15, 65 30, 65 50 C65 70, 50 85, 50 85 C50 85, 35 70, 35 50 C35 30, 50 15, 50 15Z"/><path d="M15 50 C15 50, 30 35, 50 35 C70 35, 85 50, 85 50 C85 50, 70 65, 50 65 C30 65, 15 50, 15 50Z" fill="#f0abfc"/></g>
          </svg>
          <svg id="asc-peg2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <g><path d="M50 15 C50 15, 65 30, 65 50 C65 70, 50 85, 50 85 C50 85, 35 70, 35 50 C35 30, 50 15, 50 15Z"/><path d="M15 50 C15 50, 30 35, 50 35 C70 35, 85 50, 85 50 C85 50, 70 65, 50 65 C30 65, 15 50, 15 50Z" fill="#f0abfc"/></g>
          </svg>
          <svg id="asc-peg3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <g><path d="M50 15 C50 15, 65 30, 65 50 C65 70, 50 85, 50 85 C50 85, 35 70, 35 50 C35 30, 50 15, 50 15Z"/><path d="M15 50 C15 50, 30 35, 50 35 C70 35, 85 50, 85 50 C85 50, 70 65, 50 65 C30 65, 15 50, 15 50Z" fill="#f0abfc"/></g>
          </svg>
        </div>
        <p className="asc-loader-text">Generating ZIP...</p>
        <p className="asc-loader-sub">Building Angular scaffold</p>
      </div>
    </div>
  );
}

/* ── Toast ─────────────────────────────────────────────────── */
function Toast({ show, message, type = "success" }) {
  if (!show) return null;
  return (
    <div className={`asc-toast asc-toast--${type}`}>
      <span className="asc-toast-icon">{type === "success" ? "✓" : "✕"}</span>
      <span>{message}</span>
    </div>
  );
}

export default function AngularScaf() {

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

  // ── Local upload ──────────────────────────────────────────
  const [uploadedFileContents, setUploadedFileContents] = useState([]);

  // ── ZIP ───────────────────────────────────────────────────
  const [zipFileName, setZipFileName]         = useState("");
  const [loading, setLoading]                 = useState(false);

  // ── Toast ─────────────────────────────────────────────────
  const [toast, setToast]                     = useState({ show: false, message: "", type: "success" });

  // ── Preview ───────────────────────────────────────────────
  const [showPreview, setShowPreview]         = useState(false);

  // ── Weight ────────────────────────────────────────────────
  const [weightMode, setWeightMode]           = useState(null);
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const [weightObjects, setWeightObjects]     = useState([]);
  const [generatedJSON, setGeneratedJSON]     = useState([]);
  const [totalWeightage, setTotalWeightage]   = useState(0);
  const [copyDone, setCopyDone]               = useState(false);

  useEffect(() => {
    const total = weightObjects.reduce((a, o) => a + o.weightage, 0);
    setTotalWeightage(total);
  }, [weightObjects]);

  // ── Derived ───────────────────────────────────────────────
  const allFiles  = uploadedFileContents.length > 0 ? uploadedFileContents : selectedFiles;
  const hasFiles  = allFiles.length > 0;
  const isValidUrl = validateUrl(githubUrl);

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
        body: JSON.stringify({ githubUrl, folderName: folder }),
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

  const handleLocalUpload = (e) => {
    const files    = Array.from(e.target.files);
    const contents = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        contents.push({ name: file.name, content: ev.target.result });
        if (contents.length === files.length) setUploadedFileContents([...contents]);
      };
      reader.readAsText(file);
    });
  };

  // ── ZIP ──────────────────────────────────────────────────

  const handleGenerateZip = async () => {
    if (!zipFileName.trim()) { showToast("Please enter a ZIP filename", "error"); return; }
    if (!hasFiles)            { showToast("No spec files selected", "error"); return; }

    setLoading(true);
    const formData = new FormData();
    allFiles.forEach((file) => {
      formData.append("specFiles", new Blob([file.content], { type: "text/plain" }), file.name);
    });
    formData.append("zipFileName", zipFileName.trim());

    try {
      const res = await fetch(apiConfig.UPLOAD_SPECS, { method: "POST", body: formData });
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

  // ── Weight — parses fit('...') ───────────────────────────

  const parseFitNames = () => {
    const all = [];
    allFiles.forEach((file) => {
      const regex = /fit\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g;
      let match;
      while ((match = regex.exec(file.content)) !== null) all.push(match[1]);
    });
    return all;
  };

  const applyWeight = (mode, pct) => {
    const names = parseFitNames();
    if (!names.length) { showToast("No fit() blocks found in selected files", "error"); return; }

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

  const highlightFitNames = (content) =>
    content.replace(
      /fit\s*\(\s*(['"`])([^'"`]+)\1\s*,/g,
      (match, quote, name) =>
        `<span style="color:#dd0031;font-weight:700;">${match.split(quote)[0]}${quote}${name}${quote}</span>,`
    );

  return (
    <div className="asc-page">

      {/* Toast */}
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      {/* Loading */}
      {loading && <FlowerLoader />}

      {/* ══ SECTION 1 — Workspace Fetch ══ */}
      <div className="asc-card">
        <div className="asc-card-head">
          <div className="asc-card-icon asc-icon-red">🔍</div>
          <div>
            <h3 className="asc-card-title">Fetch Workspace</h3>
            <p className="asc-card-desc">Browse and select .spec.ts files from your examly workspace</p>
          </div>
        </div>

        <div className="asc-field">
          <label className="asc-label">Workspace URL</label>
          <div className="asc-input-row">
            <input
              className={`asc-input ${urlError ? "asc-input--error" : githubUrl && isValidUrl ? "asc-input--valid" : ""}`}
              value={githubUrl}
              onChange={handleUrlChange}
              placeholder="https://808*-...premiumproject.examly.io/"
            />
            <button
              className="asc-btn asc-btn--red"
              onClick={() => { setPathHistory([]); fetchFolders(""); }}
              disabled={!isValidUrl || fetchingFolders}
            >
              {fetchingFolders
                ? <><span className="asc-btn-spinner" /> Fetching...</>
                : "Fetch"}
            </button>
            {githubUrl && (
              <button className="asc-btn asc-btn--ghost-red" onClick={handleClearUrl}>Clear</button>
            )}
          </div>
          {urlError && <p className="asc-field-error">⚠ {urlError}</p>}
        </div>

        {/* Folder browser */}
        {folders.length > 0 && (
          <div className="asc-browser">
            <div className="asc-browser-bar">
              <div className="asc-browser-path">
                <span className="asc-path-root">root</span>
                {folderPath && folderPath.split("/").map((seg, i) => (
                  <span key={i} className="asc-path-seg"> / {seg}</span>
                ))}
              </div>
              {pathHistory.length > 0 && (
                <button className="asc-back-btn" onClick={handleBack}>← Back</button>
              )}
            </div>
            <div className="asc-browser-list">
              {folders.map((folder, i) => {
                const fullPath = folderPath ? `${folderPath}/${folder}` : folder;
                return (
                  <div key={i} className="asc-folder-row">
                    <div className="asc-folder-name" onClick={() => handleFolderClick(folder)}>
                      <span className="asc-folder-icon">📁</span>
                      <span>{folder}</span>
                    </div>
                    <button
                      className="asc-view-btn"
                      onClick={() => fetchSpecFiles(fullPath)}
                      disabled={fetchingSpecs}
                    >
                      {fetchingSpecs && specFolder === fullPath
                        ? <span className="asc-btn-spinner asc-btn-spinner--sm" />
                        : "View .spec.ts"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Spec file selector */}
        {specFiles.length > 0 && (
          <div className="asc-file-select">
            <div className="asc-file-select-head">
              <span className="asc-label" style={{ margin: 0 }}>
                Files in "{specFolder.split("/").pop()}"
              </span>
              <span className="asc-badge asc-badge--red">{specFiles.length} files</span>
              {selectedFiles.length > 0 && (
                <span className="asc-badge asc-badge--green">✓ {selectedFiles.length} selected</span>
              )}
            </div>
            <div className="asc-file-list">
              {specFiles.map((file, i) => {
                const isSelected = selectedFiles.some((f) => f.name === file.name);
                return (
                  <label key={i} className={`asc-file-item ${isSelected ? "asc-file-item--active" : ""}`}>
                    <input
                      type="checkbox"
                      className="asc-checkbox"
                      checked={isSelected}
                      onChange={() => toggleFile(file)}
                    />
                    <span className="asc-file-icon">📜</span>
                    <span className="asc-file-name">{file.name.split("/").pop()}</span>
                    <span className="asc-file-path">{file.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ SECTION 2 — Local Upload ══ */}
      <div className="asc-card">
        <div className="asc-card-head">
          <div className="asc-card-icon asc-icon-pink">📁</div>
          <div>
            <h3 className="asc-card-title">Or Upload Spec Files Locally</h3>
            <p className="asc-card-desc">Upload a folder containing .spec.ts files</p>
          </div>
          {uploadedFileContents.length > 0 && (
            <span className="asc-card-tag asc-card-tag--green">
              {uploadedFileContents.length} file(s) loaded
            </span>
          )}
          {selectedFiles.length > 0 && (
            <span className="asc-card-tag asc-card-tag--amber">Using workspace files</span>
          )}
        </div>

        <label className={`asc-upload-box ${selectedFiles.length > 0 ? "asc-upload-box--disabled" : ""}`}>
          <div className="asc-upload-inner">
            <span className="asc-upload-icon">⬆</span>
            <span className="asc-upload-text">
              {uploadedFileContents.length > 0
                ? `${uploadedFileContents.length} .spec.ts file(s) loaded`
                : "Click to select folder with .spec.ts files"}
            </span>
          </div>
          <input
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory="true"
            onChange={handleLocalUpload}
            disabled={selectedFiles.length > 0}
            style={{ display: "none" }}
          />
        </label>

        {uploadedFileContents.length > 0 && (
          <div className="asc-file-pills">
            {uploadedFileContents.map((f, i) => (
              <span key={i} className="asc-file-pill">📜 {f.name}</span>
            ))}
          </div>
        )}
      </div>

      {/* ══ SECTION 3 — Generate ZIP ══ */}
      {hasFiles && (
        <div className="asc-card asc-card--action">
          <div className="asc-zip-row">
            <div className="asc-zip-left">
              <div className="asc-card-icon asc-icon-green">⬇</div>
              <div>
                <h3 className="asc-card-title">Generate ZIP</h3>
                <p className="asc-card-desc">
                  Download Angular scaffold ZIP with karma.sh
                  <span className="asc-badge asc-badge--red" style={{ marginLeft: 8 }}>
                    {allFiles.length} spec file(s)
                  </span>
                </p>
              </div>
            </div>
            <div className="asc-zip-right">
              <input
                className="asc-input asc-zip-input"
                value={zipFileName}
                onChange={(e) => setZipFileName(e.target.value)}
                placeholder="filename (without .zip)"
                onKeyDown={(e) => e.key === "Enter" && zipFileName && handleGenerateZip()}
              />
              <button
                className="asc-btn asc-btn--green asc-btn--lg"
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
      {hasFiles && (
        <div className="asc-bottom-grid">

          {/* Preview */}
          <div className="asc-card asc-card--half">
            <div className="asc-card-head">
              <div className="asc-card-icon asc-icon-amber">👁</div>
              <div>
                <h3 className="asc-card-title">Preview</h3>
                <p className="asc-card-desc">
                  <span className="asc-highlight">fit()</span> blocks highlighted
                </p>
              </div>
              <button
                className={`asc-toggle-btn ${showPreview ? "asc-toggle-btn--active" : ""}`}
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Hide" : "Show"}
              </button>
            </div>
            {showPreview && (
              <div className="asc-preview-wrap">
                {allFiles.map((file, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div className="asc-file-tag">{file.name.split("/").pop()}</div>
                    <div
                      className="asc-preview"
                      dangerouslySetInnerHTML={{ __html: highlightFitNames(file.content) }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weight */}
          <div className="asc-card asc-card--half">
            <div className="asc-card-head">
              <div className="asc-card-icon asc-icon-purple">⚖</div>
              <div>
                <h3 className="asc-card-title">Weight Object</h3>
                <p className="asc-card-desc">Assign weightage to fit() test cases</p>
              </div>
            </div>

            <div className="asc-weight-modes">
              <button
                className={`asc-mode-btn ${weightMode === "percent" ? "asc-mode-btn--active" : ""}`}
                onClick={() => setWeightMode(weightMode === "percent" ? null : "percent")}
              >
                % Percentage
              </button>
              <button
                className={`asc-mode-btn ${weightMode === "custom" ? "asc-mode-btn--active" : ""}`}
                onClick={() => applyWeight("custom")}
              >
                Custom
              </button>
            </div>

            {weightMode === "percent" && (
              <div className="asc-pct-row">
                <select
                  className="asc-select"
                  value={selectedPercentage}
                  onChange={(e) => setSelectedPercentage(e.target.value)}
                >
                  <option value="">Select %</option>
                  {[10,20,30,40,50,60,70,80,90,100].map((v) => (
                    <option key={v} value={v}>{v}%</option>
                  ))}
                </select>
                <button
                  className="asc-btn asc-btn--purple"
                  disabled={!selectedPercentage}
                  onClick={() => applyWeight("percent", selectedPercentage)}
                >
                  Apply
                </button>
              </div>
            )}

            {generatedJSON.length > 0 && (
              <div className="asc-weight-section">
                <div className="asc-weight-table-wrap">
                  <table className="asc-weight-table">
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
                          <td className="asc-td-num">{i + 1}</td>
                          <td className="asc-td-name">{tc.name}</td>
                          <td className="asc-td-weight">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="asc-weight-input"
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
                <div className="asc-weight-footer">
                  <div className="asc-total-chip">
                    Total <strong>{totalWeightage % 1 === 0 ? totalWeightage.toFixed(2) : parseFloat(totalWeightage.toFixed(6))}</strong>
                  </div>
                  <button className="asc-btn asc-btn--purple" onClick={copyToClipboard}>
                    {copyDone ? "✓ Copied!" : "Copy JSON"}
                  </button>
                </div>
              </div>
            )}

            {!generatedJSON.length && (
              <div className="asc-weight-empty">
                Select a mode above to generate weight objects
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}