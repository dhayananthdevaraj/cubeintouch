// src/pages/Scaffa.jsx
import { useState } from "react";
import ReactScaf from "./ReactScaf";
import AngularScaf from "./AngularScaf";
import apiConfig from "../../apiConfig";
import "./Scaffa.css";

const validateUrl = (url) =>
  /^https:\/\/808[0-9]{1}-[\w\d]+\.premiumproject\.examly\.io\/?$/.test(url);

/* ══ Quick Folder Download — independent of the React/Angular tabs ══ */
function QuickFolderDownload() {
  const [repoUrl, setRepoUrl]                 = useState("");
  const [urlError, setUrlError]               = useState("");
  const [folderPath, setFolderPath]           = useState("");
  const [pathHistory, setPathHistory]         = useState([]);
  const [folders, setFolders]                 = useState([]);
  const [fetchingFolders, setFetchingFolders] = useState(false);
  const [downloadingFolder, setDownloadingFolder] = useState(null);
  const [status, setStatus]                   = useState({ text: "", type: "success" });

  const isValidUrl = validateUrl(repoUrl);

  const showStatus = (text, type = "success") => {
    setStatus({ text, type });
    setTimeout(() => setStatus({ text: "", type: "success" }), 3500);
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setRepoUrl(val);
    setUrlError(
      val && !validateUrl(val)
        ? "Invalid URL — format: https://808*-...premiumproject.examly.io/"
        : ""
    );
  };

  const fetchFolders = async (path = "") => {
    setFetchingFolders(true);
    try {
      const res  = await fetch(apiConfig.FETCH_FOLDERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: repoUrl, path }),
      });
      const data = await res.json();
      setFolders(data.folders || []);
      setFolderPath(path);
    } catch (err) {
      console.error("Folder fetch error:", err);
      showStatus("Failed to fetch folders.", "error");
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

  const handleClear = () => {
    setRepoUrl(""); setUrlError("");
    setFolders([]); setFolderPath(""); setPathHistory([]);
  };

  const handleDownloadFolder = async (folder, fullPath) => {
    setDownloadingFolder(fullPath);
    try {
      const res = await fetch(apiConfig.DOWNLOAD_FOLDER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: repoUrl, folderPath: fullPath, zipFileName: folder }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Server error");
      }

      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${folder}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      showStatus(`✅ "${folder}" folder downloaded as ZIP!`);
    } catch (err) {
      console.error("Folder download error:", err);
      showStatus(`Failed to download "${folder}". ${err.message}`, "error");
    } finally {
      setDownloadingFolder(null);
    }
  };

  return (
    <div className="sc-panel">
      <h3 className="sc-panel-title">📦 Quick Folder Download</h3>

      <label className="sc-label">Repo / Workspace URL</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          className={`sc-input ${urlError ? "error" : ""}`}
          style={{ flex: "1 1 320px" }}
          value={repoUrl}
          onChange={handleUrlChange}
          placeholder="https://808*-...premiumproject.examly.io/"
        />
        <button
          className="sc-btn sc-btn-primary"
          onClick={() => { setPathHistory([]); fetchFolders(""); }}
          disabled={!isValidUrl || fetchingFolders}
        >
          {fetchingFolders ? "Fetching..." : "Fetch Folders"}
        </button>
        {repoUrl && (
          <button className="sc-btn sc-btn-ghost" onClick={handleClear}>Clear</button>
        )}
      </div>
      {urlError && <p className="sc-error-msg">⚠ {urlError}</p>}
      {status.text && (
        <p className="sc-error-msg" style={{ color: status.type === "error" ? "var(--sc-rose)" : "#34d399" }}>
          {status.text}
        </p>
      )}

      {folders.length > 0 && (
        <div className="sc-folder-browser">
          <div className="sc-folder-header">
            <span className="sc-folder-path">
              root{folderPath && folderPath.split("/").map((seg) => ` / ${seg}`).join("")}
            </span>
            {pathHistory.length > 0 && (
              <button className="sc-spec-btn" onClick={handleBack}>← Back</button>
            )}
          </div>
          <div className="sc-folder-list">
            {folders.map((folder, i) => {
              const fullPath      = folderPath ? `${folderPath}/${folder}` : folder;
              const isDownloading = downloadingFolder === fullPath;
              return (
                <div key={i} className="sc-folder-item">
                  <div
                    className="sc-folder-item-left"
                    onClick={() => handleFolderClick(folder)}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="sc-folder-icon">📁</span>
                    <span>{folder}</span>
                  </div>
                  <button
                    className="sc-dl-btn"
                    onClick={() => handleDownloadFolder(folder, fullPath)}
                    disabled={isDownloading || !!downloadingFolder}
                    title={`Download entire "${folder}" folder as ZIP`}
                  >
                    {isDownloading ? "Zipping..." : "📦 Download"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  {
    id: "react",
    label: "React Scaf",
    icon: "⚛",
    color: "#61dafb",
    desc: "Generate ZIP scaffold from Puppeteer test cases",
  },
  {
    id: "angular",
    label: "Angular Scaf",
    icon: "🔺",
    color: "#dd0031",
    desc: "Fetch .spec.ts from workspace & generate karma ZIP",
  },
  {
    id: "springboot",
    label: "SpringBoot Scaf",
    icon: "🍃",
    color: "#6db33f",
    desc: "Coming soon",
    disabled: true,
  },
  {
    id: "dotnet",
    label: "Dotnet Scaf",
    icon: "◈",
    color: "#512bd4",
    desc: "Coming soon",
    disabled: true,
  },
  {
    id: "puppeteer",
    label: "Puppeteer Scaf",
    icon: "🤖",
    color: "#40b5a4",
    desc: "Coming soon",
    disabled: true,
  },
];

export default function Scaffa() {
  const [activeTab, setActiveTab] = useState("react");

  return (
    <div className="scaffa-page">
      {/* Subtle dot-grid background */}
      <div className="scaffa-dotgrid" />

      {/* Page Header */}
      <div className="scaffa-header">
        <div className="scaffa-header-left">
          <div className="scaffa-logo">
            <span className="scaffa-logo-icon">🏗️</span>
          </div>
          <div>
            <h1 className="scaffa-title">Scaffa</h1>
            <p className="scaffa-subtitle">
              Scaffold generator — ZIP builder for test-driven project structures
            </p>
          </div>
        </div>
        <div className="scaffa-header-badge">
          <span className="scaffa-pulse" />
          <span>Ready</span>
        </div>
      </div>

      {/* Quick Folder Download — repo URL → browse → download any folder as ZIP */}
      <QuickFolderDownload />

      {/* Tab Selector */}
      <div className="scaffa-tabs-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`scaffa-tab ${activeTab === tab.id ? "active" : ""} ${tab.disabled ? "disabled" : ""}`}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            style={{ "--tab-color": tab.color }}
            title={tab.disabled ? "Coming soon" : tab.desc}
          >
            <span className="scaffa-tab-icon">{tab.icon}</span>
            <span className="scaffa-tab-label">{tab.label}</span>
            {tab.disabled && <span className="scaffa-tab-soon">Soon</span>}
            {activeTab === tab.id && <span className="scaffa-tab-bar" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="scaffa-content">
        {activeTab === "react" && <ReactScaf />}
        {activeTab === "angular" && <AngularScaf />}
        {(activeTab === "springboot" || activeTab === "dotnet" || activeTab === "puppeteer") && (
          <div className="scaffa-coming-soon">
            <div className="coming-soon-icon">🚧</div>
            <h3>Coming Soon</h3>
            <p>This scaffold generator is under development.</p>
          </div>
        )}
      </div>
    </div>
  );
}