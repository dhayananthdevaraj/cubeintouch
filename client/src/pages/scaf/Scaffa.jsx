// src/pages/Scaffa.jsx
import { useState } from "react";
import ReactScaf from "./ReactScaf";
import AngularScaf from "./AngularScaf";
import "./Scaffa.css";

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