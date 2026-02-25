import { useState } from "react";
import "./ResultX.css";

export default function ResultXMilestone({ onBack }) {
  const [alert, setAlert] = useState(null);

  return (
    <div className="rx-page">
      {alert && (
        <div className={`rx-alert rx-alert-${alert.type}`}>{alert.msg}</div>
      )}

      {/* Top bar */}
      <div className="rx-topbar">
        <div className="rx-topbar-left">
          <button className="rx-back-btn" onClick={onBack}>
            ← Back
          </button>
          <div className="rx-topbar-title">
            <div
              className="rx-topbar-icon"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              🏁
            </div>
            <div>
              <div className="rx-topbar-name">Result X — Milestone</div>
              <div className="rx-topbar-sub">
                GitHub code review + AI mistake detection
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="rx-body">
        <div className="rx-card">
          <div className="rx-coming-soon">
            <div className="rx-coming-soon-icon">🏁</div>
            <h3 className="rx-coming-soon-title">Milestone Analysis</h3>
            <p className="rx-coming-soon-sub">
              This mode will fetch student code from GitHub repos, compare against
              question requirements, and generate AI-powered code review with
              4-line mistake analysis per student.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "100%",
                maxWidth: "400px",
                marginTop: "12px",
              }}
            >
              {[
                { icon: "📥", text: "Upload Excel with result URLs" },
                { icon: "🔗", text: "Auto-fetch GitHub repo from result API" },
                { icon: "📁", text: "Detect tech stack (React / Node / Angular...)" },
                { icon: "🤖", text: "Groq AI — 4-line code mistake analysis" },
              ].map((item) => (
                <div
                  key={item.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.15)",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "var(--rx-muted)",
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  <span style={{ fontSize: "18px" }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "8px",
                padding: "10px 20px",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: "100px",
                fontSize: "12px",
                fontWeight: "700",
                color: "#fbbf24",
                fontFamily: "DM Mono, monospace",
                letterSpacing: "1px",
              }}
            >
              ⏳ COMING SOON — Awaiting result API clarification
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}