
import { useState } from "react";
import CODSyncPlatform from "./CODSyncPlatform";
import { DEPARTMENT_IDS, B_D_ID_OPTIONS } from "../config";
import { UNIVERSITY_DEPARTMENT_IDS, UNIVERSITY_B_D_ID_OPTIONS } from "../configUniversity";
import "./QBAccess.css";

// ── Platform configs ────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: "corporate",
    label: "Stark — Corporate",
    description: "Upload coding questions to Corporate Question Banks",
    icon: "🏢",
    color: "#0d6efd",
    tokenKey: "examly_token_cod_corporate",
    departmentIds: DEPARTMENT_IDS,
    bdIdOptions: B_D_ID_OPTIONS,          // for QB creation dept selector
  },
  {
    id: "university",
    label: "Stark University",
    description: "Upload coding questions to University Question Banks",
    icon: "🎓",
    color: "#7950f2",
    tokenKey: "examly_token_cod_university",
    departmentIds: UNIVERSITY_DEPARTMENT_IDS,
    bdIdOptions: UNIVERSITY_B_D_ID_OPTIONS, // for QB creation dept selector
  },
];

export default function CODSync() {
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  if (selectedPlatform) {
    return (
      <CODSyncPlatform
        platform={selectedPlatform}
        onBack={() => setSelectedPlatform(null)}
      />
    );
  }

  return (
    <div className="qb-access-container">
      <div className="qb-org-selection">
        <div className="qb-org-header">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📤</div>
          <h1 className="qb-org-title">COD Sync</h1>
          <p className="qb-org-subtitle">
            Select your platform to upload coding questions
          </p>
        </div>

        <div className="qb-org-grid">
          {PLATFORMS.map((p) => (
            <div
              key={p.id}
              className="qb-org-card"
              onClick={() => setSelectedPlatform(p)}
              style={{ "--org-accent": p.color }}
            >
              <div className="qb-org-icon">{p.icon}</div>
              <h3 className="qb-org-name">{p.label}</h3>
              <p className="qb-org-description">{p.description}</p>
              <button className="qb-org-button">Select →</button>
            </div>
          ))}
        </div>

        <div className="qb-org-footer">
          <p className="qb-org-hint">
            💡 Tokens are saved separately per platform
          </p>
        </div>
      </div>
    </div>
  );
}