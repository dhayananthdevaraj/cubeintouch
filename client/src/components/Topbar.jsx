// src/components/Topbar.jsx
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useGlobalToken } from "../context/useGlobalToken";
import { formatPastedAt } from "../utils/jwt";
import "./Topbar.css";

function ProfileChip() {
  const { displayName, claims, pastedAt, openGate, logout } = useGlobalToken();
  const [open, setOpen] = useState(false);

  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="profile-chip-wrap">
      <button className="profile-chip" onClick={() => setOpen((v) => !v)}>
        <span className="profile-avatar">{initial}</span>
        <span className="profile-chip-text">
          <span className="profile-welcome">Welcome{displayName ? `, ${displayName}` : ""}</span>
          <span className="profile-pasted">Token pasted {formatPastedAt(pastedAt) || "—"}</span>
        </span>
        <span className="profile-caret">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <>
          <div className="profile-backdrop" onClick={() => setOpen(false)} />
          <div className="profile-panel">
            <div className="profile-panel-header">
              <span className="profile-avatar profile-avatar--lg">{initial}</span>
              <div>
                <div className="profile-panel-name">{displayName || "Connected"}</div>
                {claims?.email && <div className="profile-panel-email">{claims.email}</div>}
              </div>
            </div>

            <div className="profile-panel-row">
              <span className="profile-panel-label">Token pasted</span>
              <span className="profile-panel-value">{formatPastedAt(pastedAt) || "Unknown"}</span>
            </div>
            {claims?.staff_type && (
              <div className="profile-panel-row">
                <span className="profile-panel-label">Staff type</span>
                <span className="profile-panel-value">{claims.staff_type}</span>
              </div>
            )}

            <p className="profile-panel-hint">
              Platform tokens can reset at any time. If a tool starts failing, update your token here.
            </p>

            <div className="profile-panel-actions">
              <button className="profile-panel-btn" onClick={() => { setOpen(false); openGate(); }}>
                Update token
              </button>
              <button className="profile-panel-btn profile-panel-btn--danger" onClick={() => { setOpen(false); logout(); }}>
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Topbar() {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case "/":
        return {
          title: "Dashboard",
          icon: "🏠",
          subtitle: "Overview & Quick Access"
        };
      case "/finder":
        return {
          title: "Content Finder",
          icon: "📚",
          subtitle: "Search Projects & Content Banks"
        };
      case "/course-qb":
        return {
          title: "QB Space",
          icon: "🎓",
          subtitle: "Analyze Question Banks"
        };
      case "/qb-access":
        return {
          title: "QB Access Tool",
          icon: "🔄",
          subtitle: "Clone & Move Question Banks"
        };
      case "/mcq-qc":
        return {
          title: "MCQ Quality Check",
          icon: "🔍",
          subtitle: "Validate Questions"
        };
      case "/meta-thinkly":
        return {
          title: "Meta Thinkly-X",
          icon: "📝",
          subtitle: "Edit Question Bank Metadata"
        };
        case "/mcq-uploader":
        return {
          title: "MCQ Sync",
          icon: "📤",
          subtitle: "Upload json MCQ Questions"
        };
        case "/cod-sync":
        return {
          title: "COD Sync",
          icon: "📤",
          subtitle: "Upload COD Questions"
        };
        case "/result-x":
        return { title: "Result X",
          icon: "⚡",
      subtitle: "AI Result Analysis" };
      case "/codelens":
      return {
        title: "CodeLens",
        icon: "🔭",
        subtitle: "Compiler Mode · Code QC"
      };
      case "/scaffa":
      return {
        title: "Scaffa",
        icon: "🏗️",
        subtitle: "Scaffold & Structure Manager"
      };
         case "/packager":
        return {
          title: "Packager",
          icon: "📦",
          subtitle: "pytest · junit · nunit · Test Artifact Builder"
        };
        case "/dup-detect":
          return {
          title: "Dup Detect",
          icon: "🔁",
          subtitle: "Find Duplicate MCQs · Text Similarity"
         };
         case "/weight-gen":
  return {
    title: "WeightGen",
    icon: "⚖️",
    subtitle: "Test Extractor · Weightage Calculator"
  };
  case "/file-sync":
  return { title: "FileSync", icon: "📎", subtitle: "Upload File-Upload Questions · University" };
      case "/specq":
      return {
        title: "specQ",
        icon: "⚗️",
        subtitle: "Automated QC · AI-Powered Validation"
      };
      case "/blank-sync":
      return { title: "BlankSync", icon: "✏️", subtitle: "Upload Fill-in-the-Blank Questions · University" };
      case "/test-packing":
      return { title: "Test Packing", icon: "🧪", subtitle: "Auto-pack or manually build a test from the QB" };

      default:
        return {
          title: "Support Hub",
          icon: "🎯",
          subtitle: "CubeInTouch Internal Tools"
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="topbar">
      <div className="topbar-background">
        <div className="topbar-gradient"></div>
      </div>

      <div className="topbar-content">
        <div className="topbar-left">
          <div className="page-icon">{pageInfo.icon}</div>
          <div className="page-info">
            <h2 className="page-title">{pageInfo.title}</h2>
            <p className="page-subtitle">{pageInfo.subtitle}</p>
          </div>
        </div>

        <div className="topbar-right">
          <ProfileChip />
        </div>
      </div>
    </header>
  );
}