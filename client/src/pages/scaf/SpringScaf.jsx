// src/pages/scaffa/SpringScaf.jsx
//
// Same workspace-fetch → select → generate flow as ReactScaf/AngularScaf, but
// SpringBoot only ever has ONE test file to swap in:
// junit/test/java/com/examly/springapp/SpringappApplicationTests.java — so
// selection is single-file (radio-style), not a multi-select checklist.
import { useState, useEffect } from "react";
import apiConfig from "../../apiConfig";
import "./SpringScaf.css";

const validateUrl = (url) =>
  /^https:\/\/808[0-9]{1}-[\w\d]+\.premiumproject\.examly\.io\/?$/.test(url);

function Toast({ show, message, type = "success" }) {
  if (!show) return null;
  return (
    <div className={`ssc-toast ssc-toast--${type}`}>
      <span className="ssc-toast-icon">{type === "success" ? "✓" : "✕"}</span>
      <span>{message}</span>
    </div>
  );
}

export default function SpringScaf() {
  // ── URL & folder browser ──────────────────────────────────
  const [githubUrl, setGithubUrl]             = useState("");
  const [urlError, setUrlError]               = useState("");
  const [folderPath, setFolderPath]           = useState("");
  const [pathHistory, setPathHistory]         = useState([]);
  const [folders, setFolders]                 = useState([]);
  const [fetchingFolders, setFetchingFolders] = useState(false);

  // ── Spec (test) files — single-select ──────────────────────
  const [specFiles, setSpecFiles]             = useState([]);
  const [selectedFile, setSelectedFile]       = useState(null);
  const [fetchingSpecs, setFetchingSpecs]     = useState(false);
  const [specFolder, setSpecFolder]           = useState("");

  // ── Local input ───────────────────────────────────────────
  const [testCaseCode, setTestCaseCode]       = useState("");
  const [fileName, setFileName]               = useState("");
  const [uploadedFile, setUploadedFile]       = useState(null);

  // ── ZIP ───────────────────────────────────────────────────
  const [zipFileName, setZipFileName]         = useState("");
  const [loading, setLoading]                 = useState(false);

  // ── Toast / preview ─────────────────────────────────────────
  const [toast, setToast]                     = useState({ show: false, message: "", type: "success" });
  const [showPreview, setShowPreview]         = useState(false);

  // ── Weight ────────────────────────────────────────────────
  const [weightMode, setWeightMode]                 = useState(null); // null | "percent" | "custom"
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const [weightObjects, setWeightObjects]           = useState([]);
  const [generatedJSON, setGeneratedJSON]           = useState([]);
  const [totalWeightage, setTotalWeightage]         = useState(0);
  const [copyDone, setCopyDone]                     = useState(false);

  useEffect(() => {
    const total = weightObjects.reduce((a, o) => a + o.weightage, 0);
    setTotalWeightage(total);
  }, [weightObjects]);

  const activeCode = selectedFile?.content || testCaseCode;
  const hasCode    = activeCode.trim().length > 0;
  const isValidUrl = validateUrl(githubUrl);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

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
    setSpecFiles([]); setSelectedFile(null);
  };

  const fetchSpecFiles = async (folder) => {
    setFetchingSpecs(true);
    setSpecFolder(folder);
    try {
      const res  = await fetch(apiConfig.FETCH_SPEC_FILES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl, folderName: folder, type: "springboot" }),
      });
      const data = await res.json();
      setSpecFiles(data.specFiles || []);
      setSelectedFile(null);
    } catch (err) {
      console.error("Spec fetch error:", err);
    } finally {
      setFetchingSpecs(false);
    }
  };

  const selectFile = (file) => {
    setSelectedFile((prev) => (prev?.name === file.name ? null : file));
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
    if (!zipFileName.trim()) { showToast("Please enter a ZIP filename", "error"); return; }
    if (!hasCode)            { showToast("No test file selected or pasted", "error"); return; }

    setLoading(true);
    const formData = new FormData();
    if (uploadedFile && !selectedFile) formData.append("testCase", uploadedFile);
    else formData.append("testCase", activeCode);
    formData.append("zipFileName", zipFileName.trim());

    try {
      const res = await fetch(apiConfig.UPLOAD_SPRINGBOOT, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server error");
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${zipFileName.trim()}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`✅ ${zipFileName.trim()}.zip downloaded successfully!`);
      setZipFileName("");
    } catch (err) {
      showToast(`Failed to generate ZIP. ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Weight — parses `@Test ... void methodName(` (same pattern WeightGen
  //    uses for Java) ───────────────────────────────────────────────────
  const parseTestNames = (code) => {
    const regex = /@Test[\s\S]*?\bvoid\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[A-Za-z0-9_,\s]+)?\s*\{/g;
    const names = []; let match;
    while ((match = regex.exec(code)) !== null) names.push(match[1]);
    return names;
  };

  const applyWeight = (mode, pct) => {
    const names = parseTestNames(activeCode);
    if (!names.length) { showToast("No @Test methods found", "error"); return; }

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

  // HTML-escape first — Java source routinely contains `<`/`>` (generics like
  // List<String>) which would otherwise get misread as real tags once this
  // goes through dangerouslySetInnerHTML.
  const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const highlightTestNames = (code) =>
    escapeHtml(code).replace(
      /(@Test[\s\S]*?\bvoid\s+)([A-Za-z0-9_]+)(\s*\()/g,
      (match, pre, name, post) => `${pre}<span style="color:#4f8a2c;font-weight:700;">${name}</span>${post}`
    );

  return (
    <div className="ssc-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      {/* ══ SECTION 1 — Workspace Fetch ══ */}
      <div className="ssc-card">
        <div className="ssc-card-head">
          <div className="ssc-card-icon">🍃</div>
          <div>
            <h3 className="ssc-card-title">Fetch Workspace</h3>
            <p className="ssc-card-desc">Browse your examly workspace and pick the SpringBoot test file</p>
          </div>
        </div>

        <div className="ssc-field">
          <label className="ssc-label">Workspace URL</label>
          <div className="ssc-input-row">
            <input
              className={`ssc-input ${urlError ? "ssc-input--error" : githubUrl && isValidUrl ? "ssc-input--valid" : ""}`}
              value={githubUrl}
              onChange={handleUrlChange}
              placeholder="https://808*-...premiumproject.examly.io/"
            />
            <button
              className="ssc-btn ssc-btn--primary"
              onClick={() => { setPathHistory([]); fetchFolders(""); }}
              disabled={!isValidUrl || fetchingFolders}
            >
              {fetchingFolders ? <><span className="ssc-btn-spinner" /> Fetching...</> : "Fetch"}
            </button>
            {githubUrl && <button className="ssc-btn ssc-btn--ghost-red" onClick={handleClearUrl}>Clear</button>}
          </div>
          {urlError && <p className="ssc-field-error">⚠ {urlError}</p>}
        </div>

        {folders.length > 0 && (
          <div className="ssc-browser">
            <div className="ssc-browser-bar">
              <div className="ssc-browser-path">
                <span className="ssc-path-root">root</span>
                {folderPath && folderPath.split("/").map((seg, i) => <span key={i} className="ssc-path-seg"> / {seg}</span>)}
              </div>
              {pathHistory.length > 0 && <button className="ssc-back-btn" onClick={handleBack}>← Back</button>}
            </div>
            <div className="ssc-browser-list">
              {folders.map((folder, i) => {
                const fullPath = folderPath ? `${folderPath}/${folder}` : folder;
                return (
                  <div key={i} className="ssc-folder-row">
                    <div className="ssc-folder-name" onClick={() => handleFolderClick(folder)}>
                      <span className="ssc-folder-icon">📁</span>
                      <span>{folder}</span>
                    </div>
                    <button
                      className="ssc-view-btn"
                      onClick={() => fetchSpecFiles(fullPath)}
                      disabled={fetchingSpecs}
                    >
                      {fetchingSpecs && specFolder === fullPath
                        ? <span className="ssc-btn-spinner ssc-btn-spinner--sm" />
                        : "View .java"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {specFiles.length > 0 && (
          <div className="ssc-file-select">
            <div className="ssc-file-select-head">
              <span className="ssc-label" style={{ margin: 0 }}>Files in "{specFolder.split("/").pop()}"</span>
              <span className="ssc-badge">{specFiles.length} files</span>
              {selectedFile && <span className="ssc-badge ssc-badge--green">✓ selected</span>}
              <span className="ssc-file-select-hint">Pick ONE file — it replaces SpringappApplicationTests.java</span>
            </div>
            <div className="ssc-file-list">
              {specFiles.map((file, i) => {
                const isSelected = selectedFile?.name === file.name;
                return (
                  <label key={i} className={`ssc-file-item ${isSelected ? "ssc-file-item--active" : ""}`}>
                    <input type="radio" className="ssc-radio" name="ssc-test-file" checked={isSelected} onChange={() => selectFile(file)} />
                    <span className="ssc-file-icon">☕</span>
                    <span className="ssc-file-name">{file.name.split("/").pop()}</span>
                    <span className="ssc-file-path">{file.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ══ SECTION 2 — Local Input ══ */}
      <div className="ssc-card">
        <div className="ssc-card-head">
          <div className="ssc-card-icon ssc-icon-violet">📝</div>
          <div>
            <h3 className="ssc-card-title">Local Input</h3>
            <p className="ssc-card-desc">Paste or upload the test file directly</p>
          </div>
          {selectedFile && <span className="ssc-card-disabled-tag">Using workspace file</span>}
        </div>

        <div className="ssc-two-col">
          <div className="ssc-field">
            <label className="ssc-label">Paste Java test code</label>
            <textarea
              className="ssc-textarea"
              value={testCaseCode}
              onChange={(e) => setTestCaseCode(e.target.value)}
              placeholder={"@SpringBootTest\nclass SpringappApplicationTests {\n  @Test\n  void backend_testSomething() { ... }\n}"}
              disabled={!!selectedFile}
              rows={8}
            />
          </div>
          <div className="ssc-field">
            <label className="ssc-label">Upload file</label>
            <label className={`ssc-upload-box ${selectedFile ? "ssc-upload-box--disabled" : ""}`}>
              <div className="ssc-upload-inner">
                <span className="ssc-upload-icon">⬆</span>
                <span className="ssc-upload-text">{fileName || "Click to upload .java"}</span>
                {fileName && <span className="ssc-upload-clear" onClick={(e) => { e.preventDefault(); setFileName(""); setUploadedFile(null); setTestCaseCode(""); }}>✕</span>}
              </div>
              <input type="file" accept=".java" onChange={handleFileUpload} disabled={!!selectedFile} style={{ display: "none" }} />
            </label>
          </div>
        </div>
      </div>

      {/* ══ SECTION 3 — Generate ZIP ══ */}
      {hasCode && (
        <div className="ssc-card ssc-card--action">
          <div className="ssc-zip-row">
            <div className="ssc-zip-left">
              <div className="ssc-card-icon ssc-icon-green">⬇</div>
              <div>
                <h3 className="ssc-card-title">Generate ZIP</h3>
                <p className="ssc-card-desc">springapp + junit, packaged with your test file</p>
              </div>
            </div>
            <div className="ssc-zip-right">
              <input
                className="ssc-input ssc-zip-input"
                value={zipFileName}
                onChange={(e) => setZipFileName(e.target.value)}
                placeholder="filename (without .zip)"
                onKeyDown={(e) => e.key === "Enter" && zipFileName && handleGenerateZip()}
              />
              <button className="ssc-btn ssc-btn--green ssc-btn--lg" onClick={handleGenerateZip} disabled={!zipFileName.trim() || loading}>
                {loading ? <><span className="ssc-btn-spinner" /> Building...</> : "⬇ Download ZIP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SECTION 4 — Preview + Weight side by side ══ */}
      {hasCode && (
        <div className="ssc-bottom-grid">

          {/* Preview */}
          <div className="ssc-card ssc-card--half">
            <div className="ssc-card-head">
              <div className="ssc-card-icon ssc-icon-amber">👁</div>
              <div>
                <h3 className="ssc-card-title">Preview</h3>
                <p className="ssc-card-desc"><span className="ssc-highlight">@Test</span> methods highlighted</p>
              </div>
              <button className={`ssc-toggle-btn ${showPreview ? "ssc-toggle-btn--active" : ""}`} onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Hide" : "Show"}
              </button>
            </div>
            {showPreview && (
              <div className="ssc-preview-wrap">
                {selectedFile && <div className="ssc-file-tag">{selectedFile.name.split("/").pop()}</div>}
                <div className="ssc-preview" dangerouslySetInnerHTML={{ __html: highlightTestNames(activeCode) }} />
              </div>
            )}
          </div>

          {/* Weight Object */}
          <div className="ssc-card ssc-card--half">
            <div className="ssc-card-head">
              <div className="ssc-card-icon ssc-icon-violet">⚖</div>
              <div>
                <h3 className="ssc-card-title">Weight Object</h3>
                <p className="ssc-card-desc">Assign weightage to @Test methods</p>
              </div>
            </div>

            <div className="ssc-weight-modes">
              <button
                className={`ssc-mode-btn ${weightMode === "percent" ? "ssc-mode-btn--active" : ""}`}
                onClick={() => setWeightMode(weightMode === "percent" ? null : "percent")}
              >
                % Percentage
              </button>
              <button
                className={`ssc-mode-btn ${weightMode === "custom" ? "ssc-mode-btn--active" : ""}`}
                onClick={() => applyWeight("custom")}
              >
                Custom
              </button>
            </div>

            {weightMode === "percent" && (
              <div className="ssc-pct-row">
                <select className="ssc-select" value={selectedPercentage} onChange={(e) => setSelectedPercentage(e.target.value)}>
                  <option value="">Select %</option>
                  {[10,20,30,40,50,60,70,80,90,100].map((v) => <option key={v} value={v}>{v}%</option>)}
                </select>
                <button className="ssc-btn ssc-btn--violet" disabled={!selectedPercentage} onClick={() => applyWeight("percent", selectedPercentage)}>
                  Apply
                </button>
              </div>
            )}

            {generatedJSON.length > 0 && (
              <div className="ssc-weight-section">
                <div className="ssc-weight-table-wrap">
                  <table className="ssc-weight-table">
                    <thead>
                      <tr><th>#</th><th>Test Method</th><th>Weight</th></tr>
                    </thead>
                    <tbody>
                      {generatedJSON.map((tc, i) => (
                        <tr key={i}>
                          <td className="ssc-td-num">{i + 1}</td>
                          <td className="ssc-td-name">{tc.name}</td>
                          <td className="ssc-td-weight">
                            <input
                              type="number" min="0" step="0.01"
                              className="ssc-weight-input"
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
                <div className="ssc-weight-footer">
                  <div className="ssc-total-chip">
                    Total <strong>{totalWeightage % 1 === 0 ? totalWeightage.toFixed(2) : parseFloat(totalWeightage.toFixed(6))}</strong>
                  </div>
                  <button className="ssc-btn ssc-btn--violet" onClick={copyToClipboard}>
                    {copyDone ? "✓ Copied!" : "Copy JSON"}
                  </button>
                </div>
              </div>
            )}

            {!generatedJSON.length && (
              <div className="ssc-weight-empty">
                <span>Select a mode above to generate weight objects</span>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
