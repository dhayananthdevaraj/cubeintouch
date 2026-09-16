// src/pages/scaffa/AngularSpringScaf.jsx
//
// Combination scaffold: ONE zip containing angularapp+karma AND
// springapp+junit together. Same workspace URL as the standalone
// Angular/SpringBoot flows, but with two independent browse-and-select
// widgets below it (Angular is multi-select .spec.ts, SpringBoot is
// single-select .java — same distinction as AngularScaf vs SpringScaf)
// since the frontend and backend code usually live in different folders
// of the same workspace. Workspace-only (no local paste/upload) to keep
// this combined flow focused — use the standalone tabs for local input.
import { useState, useEffect } from "react";
import apiConfig from "../../apiConfig";
import "./AngularSpringScaf.css";

const validateUrl = (url) =>
  /^https:\/\/808[0-9]{1}-[\w\d]+\.premiumproject\.examly\.io\/?$/.test(url);

// HTML-escape first — both TS (generics like Observable<User>) and Java
// (List<String>) routinely contain `<`/`>` that would otherwise get misread
// as real tags once this goes through dangerouslySetInnerHTML.
const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Test-name parsing/highlighting differs per side: Angular specs use `fit(...)`, SpringBoot uses `@Test void name()`. */
function parseNames(code, fetchType) {
  const regex = fetchType === "springboot"
    ? /@Test[\s\S]*?\bvoid\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[A-Za-z0-9_,\s]+)?\s*\{/g
    : /fit\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g;
  const names = []; let m;
  while ((m = regex.exec(code)) !== null) names.push(m[1]);
  return names;
}

function highlightNames(code, fetchType) {
  const escaped = escapeHtml(code);
  if (fetchType === "springboot") {
    return escaped.replace(
      /(@Test[\s\S]*?\bvoid\s+)([A-Za-z0-9_]+)(\s*\()/g,
      (match, pre, name, post) => `${pre}<span style="color:#4f8a2c;font-weight:700;">${name}</span>${post}`
    );
  }
  return escaped.replace(
    /(fit\s*\(\s*)(['"`])([^'"`]+)(\2\s*,)/g,
    (match, pre, quote, name) => `${pre}<span style="color:#dd0031;font-weight:700;">${quote}${name}${quote}</span>,`
  );
}

function Toast({ show, message, type = "success" }) {
  if (!show) return null;
  return (
    <div className={`asx-toast asx-toast--${type}`}>
      <span className="asx-toast-icon">{type === "success" ? "✓" : "✕"}</span>
      <span>{message}</span>
    </div>
  );
}

/** One folder-browser + file-select widget. `multiSelect` toggles checkbox-multi vs radio-single. */
function BrowsePanel({ title, icon, fileTypeLabel, fetchType, githubUrl, multiSelect, selected, onSelectedChange }) {
  const [folderPath, setFolderPath]           = useState("");
  const [pathHistory, setPathHistory]         = useState([]);
  const [folders, setFolders]                 = useState([]);
  const [fetchingFolders, setFetchingFolders] = useState(false);
  const [specFiles, setSpecFiles]             = useState([]);
  const [fetchingSpecs, setFetchingSpecs]     = useState(false);
  const [specFolder, setSpecFolder]           = useState("");

  // ── Preview + Weight ────────────────────────────────────────
  const [showPreview, setShowPreview]   = useState(false);
  const [weightMode, setWeightMode]     = useState(null); // null | "percent" | "custom"
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const [weightObjects, setWeightObjects] = useState([]);
  const [generatedJSON, setGeneratedJSON] = useState([]);
  const [totalWeightage, setTotalWeightage] = useState(0);
  const [copyDone, setCopyDone]         = useState(false);
  const [weightError, setWeightError]   = useState("");

  useEffect(() => {
    setTotalWeightage(weightObjects.reduce((a, o) => a + o.weightage, 0));
  }, [weightObjects]);

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

  const fetchSpecFiles = async (folder) => {
    setFetchingSpecs(true);
    setSpecFolder(folder);
    try {
      const res  = await fetch(apiConfig.FETCH_SPEC_FILES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl, folderName: folder, type: fetchType }),
      });
      const data = await res.json();
      setSpecFiles(data.specFiles || []);
      onSelectedChange(multiSelect ? [] : null);
    } catch (err) {
      console.error("Spec fetch error:", err);
    } finally {
      setFetchingSpecs(false);
    }
  };

  const isFileSelected = (file) => (multiSelect ? selected.some((f) => f.name === file.name) : selected?.name === file.name);

  const toggleFile = (file) => {
    setWeightMode(null); setWeightObjects([]); setGeneratedJSON([]); setWeightError("");
    if (multiSelect) {
      onSelectedChange(isFileSelected(file) ? selected.filter((f) => f.name !== file.name) : [...selected, file]);
    } else {
      onSelectedChange(isFileSelected(file) ? null : file);
    }
  };

  const activeCode = multiSelect ? selected.map((f) => f.content).join("\n") : selected?.content || "";
  const hasCode     = activeCode.trim().length > 0;

  const applyWeight = (mode, pct) => {
    const names = parseNames(activeCode, fetchType);
    if (!names.length) { setWeightError(fetchType === "springboot" ? "No @Test methods found" : "No fit() blocks found"); return; }
    setWeightError("");

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
    setTimeout(() => setCopyDone(false), 2500);
  };

  return (
    <div className="asx-card">
      <div className="asx-card-head">
        <div className="asx-card-icon">{icon}</div>
        <div>
          <h3 className="asx-card-title">{title}</h3>
          <p className="asx-card-desc">{multiSelect ? "Select one or more spec files" : "Select ONE test file"}</p>
        </div>
      </div>

      <div className="asx-btn-row">
        <button className="asx-btn asx-btn--outline" onClick={() => { setPathHistory([]); fetchFolders(""); }} disabled={!githubUrl || fetchingFolders}>
          {fetchingFolders ? "Fetching..." : "Fetch Folders"}
        </button>
      </div>

      <div className="asx-panel-cols">
        {folders.length > 0 && (
          <div className="asx-browser">
            <div className="asx-browser-bar">
              <div className="asx-browser-path">
                <span className="asx-path-root">root</span>
                {folderPath && folderPath.split("/").map((seg, i) => <span key={i}> / {seg}</span>)}
              </div>
              {pathHistory.length > 0 && <button className="asx-back-btn" onClick={handleBack}>← Back</button>}
            </div>
            <div className="asx-browser-list">
              {folders.map((folder, i) => {
                const fullPath = folderPath ? `${folderPath}/${folder}` : folder;
                return (
                  <div key={i} className="asx-folder-row">
                    <div className="asx-folder-name" onClick={() => handleFolderClick(folder)}>
                      <span>📁</span><span>{folder}</span>
                    </div>
                    <button className="asx-view-btn" onClick={() => fetchSpecFiles(fullPath)} disabled={fetchingSpecs}>
                      {fetchingSpecs && specFolder === fullPath ? "..." : `View ${fileTypeLabel}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {specFiles.length > 0 && (
          <div className="asx-file-list">
            {specFiles.map((file, i) => {
              const isSelected = isFileSelected(file);
              return (
                <label key={i} className={`asx-file-item ${isSelected ? "asx-file-item--active" : ""}`}>
                  <input type={multiSelect ? "checkbox" : "radio"} checked={isSelected} onChange={() => toggleFile(file)} />
                  <span className="asx-file-name">{file.name.split("/").pop()}</span>
                  <span className="asx-file-path">{file.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {(multiSelect ? selected.length > 0 : !!selected) && (
        <p className="asx-selected-hint">
          {multiSelect ? `✓ ${selected.length} spec file(s) selected` : `✓ ${selected.name.split("/").pop()} selected`}
        </p>
      )}

      {hasCode && (
        <div className="asx-bottom-grid">
          {/* Preview */}
          <div className="asx-subcard">
            <div className="asx-subcard-head">
              <span className="asx-subcard-title">Preview</span>
              <button className={`asx-toggle-btn ${showPreview ? "asx-toggle-btn--active" : ""}`} onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Hide" : "Show"}
              </button>
            </div>
            {showPreview && (
              <div className="asx-preview-wrap">
                {multiSelect
                  ? selected.map((file, i) => (
                      <div key={i} className="asx-preview-file">
                        <div className="asx-file-tag">{file.name.split("/").pop()}</div>
                        <div className="asx-preview" dangerouslySetInnerHTML={{ __html: highlightNames(file.content, fetchType) }} />
                      </div>
                    ))
                  : <div className="asx-preview" dangerouslySetInnerHTML={{ __html: highlightNames(activeCode, fetchType) }} />
                }
              </div>
            )}
          </div>

          {/* Weight */}
          <div className="asx-subcard">
            <div className="asx-subcard-head">
              <span className="asx-subcard-title">Weight Object</span>
            </div>
            <div className="asx-weight-modes">
              <button className={`asx-mode-btn ${weightMode === "percent" ? "asx-mode-btn--active" : ""}`} onClick={() => setWeightMode(weightMode === "percent" ? null : "percent")}>
                % Percentage
              </button>
              <button className={`asx-mode-btn ${weightMode === "custom" ? "asx-mode-btn--active" : ""}`} onClick={() => applyWeight("custom")}>
                Custom
              </button>
            </div>

            {weightMode === "percent" && (
              <div className="asx-pct-row">
                <select className="asx-select" value={selectedPercentage} onChange={(e) => setSelectedPercentage(e.target.value)}>
                  <option value="">Select %</option>
                  {[10,20,30,40,50,60,70,80,90,100].map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
                <button className="asx-btn asx-btn--outline" disabled={!selectedPercentage} onClick={() => applyWeight("percent", selectedPercentage)}>Apply</button>
              </div>
            )}

            {weightError && <p className="asx-field-error">⚠ {weightError}</p>}

            {generatedJSON.length > 0 && (
              <div className="asx-weight-table-wrap">
                <table className="asx-weight-table">
                  <thead><tr><th>#</th><th>{fetchType === "springboot" ? "Test Method" : "Test Case"}</th><th>Weight</th></tr></thead>
                  <tbody>
                    {generatedJSON.map((tc, i) => (
                      <tr key={i}>
                        <td className="asx-td-num">{i + 1}</td>
                        <td className="asx-td-name">{tc.name}</td>
                        <td className="asx-td-weight">
                          <input type="number" min="0" step="0.01" className="asx-weight-input" value={tc.weightage} onChange={(e) => updateWeight(i, e.target.value)} readOnly={weightMode === "percent"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="asx-weight-footer">
                  <div className="asx-total-chip">Total <strong>{totalWeightage % 1 === 0 ? totalWeightage.toFixed(2) : parseFloat(totalWeightage.toFixed(6))}</strong></div>
                  <button className="asx-btn asx-btn--outline" onClick={copyToClipboard}>{copyDone ? "✓ Copied!" : "Copy JSON"}</button>
                </div>
              </div>
            )}

            {!generatedJSON.length && !weightError && <p className="asx-weight-empty">Select a mode above to generate weight objects</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AngularSpringScaf() {
  const [githubUrl, setGithubUrl] = useState("");
  const [urlError, setUrlError]   = useState("");
  const [angularFiles, setAngularFiles] = useState([]);
  const [springFile, setSpringFile]     = useState(null);
  const [zipFileName, setZipFileName]   = useState("");
  const [loading, setLoading]           = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const isValidUrl = validateUrl(githubUrl);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setGithubUrl(val);
    setUrlError(val && !validateUrl(val) ? "Invalid URL — format: https://808*-...premiumproject.examly.io/" : "");
  };

  const handleGenerateZip = async () => {
    if (!zipFileName.trim()) { showToast("Please enter a ZIP filename", "error"); return; }
    if (!angularFiles.length) { showToast("Select at least one Angular spec file", "error"); return; }
    if (!springFile) { showToast("Select a SpringBoot test file", "error"); return; }

    setLoading(true);
    const formData = new FormData();
    angularFiles.forEach((file) => formData.append("specFiles", new Blob([file.content], { type: "text/plain" }), file.name));
    formData.append("testCase", springFile.content);
    formData.append("zipFileName", zipFileName.trim());

    try {
      const res = await fetch(apiConfig.UPLOAD_ANGULAR_SPRINGBOOT, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server error");
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${zipFileName.trim()}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`✅ ${zipFileName.trim()}.zip downloaded — angularapp + karma + springapp + junit`);
      setZipFileName("");
    } catch (err) {
      showToast(`Failed to generate ZIP. ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const hasBoth = angularFiles.length > 0 && !!springFile;

  return (
    <div className="asx-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      <div className="asx-card">
        <div className="asx-card-head">
          <div className="asx-card-icon">🧩</div>
          <div>
            <h3 className="asx-card-title">Workspace</h3>
            <p className="asx-card-desc">One URL, browsed independently for the Angular and SpringBoot folders below</p>
          </div>
        </div>
        <div className="asx-field">
          <label className="asx-label">Workspace URL</label>
          <input
            className={`asx-input ${urlError ? "asx-input--error" : githubUrl && isValidUrl ? "asx-input--valid" : ""}`}
            value={githubUrl}
            onChange={handleUrlChange}
            placeholder="https://808*-...premiumproject.examly.io/"
          />
          {urlError && <p className="asx-field-error">⚠ {urlError}</p>}
        </div>
      </div>

      <div className="asx-stack">
        <BrowsePanel
          title="Angular (Karma)" icon="🔺" fileTypeLabel=".spec.ts" fetchType="angular"
          githubUrl={isValidUrl ? githubUrl : ""} multiSelect
          selected={angularFiles} onSelectedChange={setAngularFiles}
        />
        <BrowsePanel
          title="SpringBoot (JUnit)" icon="🍃" fileTypeLabel=".java" fetchType="springboot"
          githubUrl={isValidUrl ? githubUrl : ""} multiSelect={false}
          selected={springFile} onSelectedChange={setSpringFile}
        />
      </div>

      {hasBoth && (
        <div className="asx-card asx-card--action">
          <div className="asx-zip-row">
            <div>
              <h3 className="asx-card-title">Generate Combined ZIP</h3>
              <p className="asx-card-desc">angularapp + karma + springapp + junit, all in one archive</p>
            </div>
            <div className="asx-zip-right">
              <input
                className="asx-input"
                value={zipFileName}
                onChange={(e) => setZipFileName(e.target.value)}
                placeholder="filename (without .zip)"
                onKeyDown={(e) => e.key === "Enter" && zipFileName && handleGenerateZip()}
              />
              <button className="asx-btn asx-btn--primary" onClick={handleGenerateZip} disabled={!zipFileName.trim() || loading}>
                {loading ? "Building..." : "⬇ Download ZIP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
