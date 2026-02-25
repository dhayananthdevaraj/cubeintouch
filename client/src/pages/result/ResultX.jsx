import { useState } from "react";
import ResultXWeekly from "./ResultXWeekly";
import ResultXMilestone from "./ResultXMilestone";
import "./ResultX.css";

export default function ResultX() {
  const [selectedMode, setSelectedMode] = useState(null);

  const modes = [
    {
      id: "weekly",
      name: "Weekly",
      description: "Analyze weekly assessment results — upload Excel with result links, fetch scores, and get AI-powered feedback per student.",
      icon: "📅",
      tag: "Week-wise",
      color: "#4f46e5",
      colorSoft: "#eef0fd",
      colorBorder: "#c7d2fe",
    },
    {
      id: "milestone",
      name: "Milestone",
      description: "Deep-dive milestone evaluation — analyze coding submissions from GitHub repos with AI code review and mistake detection.",
      icon: "🏁",
      tag: "Project-based",
      color: "#d97706",
      colorSoft: "#fffbeb",
      colorBorder: "#fde68a",
    },
  ];

  if (selectedMode) {
    const ModeComponent = selectedMode === "weekly" ? ResultXWeekly : ResultXMilestone;
    return <ModeComponent onBack={() => setSelectedMode(null)} />;
  }

  return (
    <div className="rx-page">

      {/* topbar */}
      <div className="rx-topbar">
        <div className="rx-topbar-left">
          <div className="rx-topbar-title">
            <div className="rx-topbar-icon" style={{ background: "#fef3c7" }}>⚡</div>
            <div>
              <div className="rx-topbar-name">Result X</div>
              <div className="rx-topbar-sub">AI Result Analysis</div>
            </div>
          </div>
        </div>
      </div>

      {/* centered content */}
      <div style={{
        minHeight: "calc(100vh - 68px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 24px", background: "#f0f2f7",
      }}>
        <div style={{ width: "100%", maxWidth: "740px", display: "flex", flexDirection: "column", gap: "32px" }}>

          {/* heading */}
          <div style={{ textAlign: "center" }}>
            <h1 style={{
              fontSize: "32px", fontWeight: "800", color: "#0f1629",
              margin: "0 0 10px", letterSpacing: "-0.8px", fontFamily: "Outfit, sans-serif",
            }}>
              Select Analysis Mode
            </h1>
            <p style={{ fontSize: "15px", color: "#8892b0", margin: 0, fontFamily: "Outfit, sans-serif" }}>
              Choose how you want to analyze student results
            </p>
          </div>

          {/* mode cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {modes.map((mode) => (
              <ModeCard key={mode.id} mode={mode} onClick={() => setSelectedMode(mode.id)} />
            ))}
          </div>

          {/* hint */}
          <p style={{
            textAlign: "center", fontSize: "12px", color: "#8892b0", margin: 0,
            fontFamily: "JetBrains Mono, monospace",
          }}>
            💡 Both modes use your existing Examly token — no extra setup needed
          </p>

        </div>
      </div>
    </div>
  );
}

function ModeCard({ mode, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        border: `1px solid ${hovered ? mode.colorBorder : "#e2e6ef"}`,
        borderRadius: "20px",
        padding: "32px 28px",
        cursor: "pointer",
        display: "flex", flexDirection: "column", gap: "14px",
        boxShadow: hovered
          ? "0 8px 30px rgba(15,22,41,0.1), 0 3px 10px rgba(15,22,41,0.06)"
          : "0 1px 3px rgba(15,22,41,0.06)",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "4px", background: mode.color,
        borderRadius: "20px 20px 0 0",
      }} />

      {/* icon + tag */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: "54px", height: "54px", borderRadius: "14px",
          background: mode.colorSoft, border: `1px solid ${mode.colorBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "26px",
        }}>
          {mode.icon}
        </div>
        <span style={{
          fontSize: "11px", fontWeight: "700", fontFamily: "JetBrains Mono, monospace",
          color: mode.color, background: mode.colorSoft,
          border: `1px solid ${mode.colorBorder}`,
          padding: "4px 10px", borderRadius: "99px",
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          {mode.tag}
        </span>
      </div>

      {/* name */}
      <div style={{
        fontSize: "22px", fontWeight: "800", color: "#0f1629",
        letterSpacing: "-0.4px", fontFamily: "Outfit, sans-serif",
      }}>
        {mode.name}
      </div>

      {/* description */}
      <p style={{
        fontSize: "13px", color: "#3d4766", margin: 0,
        lineHeight: "1.7", fontFamily: "Outfit, sans-serif",
      }}>
        {mode.description}
      </p>

      {/* CTA */}
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        fontSize: "13px", fontWeight: "700",
        color: hovered ? mode.color : "#8892b0",
        fontFamily: "Outfit, sans-serif",
        transition: "color 0.2s", marginTop: "4px",
      }}>
        Launch {mode.name}
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}