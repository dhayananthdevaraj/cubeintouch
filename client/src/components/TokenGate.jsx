// src/components/TokenGate.jsx
//
// The ONE token paste screen for the whole site. Shown full-screen right
// after the cube loader on first visit (or whenever there's no token), and
// as a dismissable modal when the user chooses "Update token" from the
// profile chip because Examly's own session token reset server-side.
import { useState, useRef, useEffect } from "react";
import { useGlobalToken } from "../context/useGlobalToken";
import { decodeJwt, formatClaimName } from "../utils/jwt";
import LiquidMetalBackground from "./LiquidMetalBackground";
import "./TokenGate.css";

const COLORS = { indigo: "#6E63D6", blue: "#5B8DEF", coral: "#F0663F", orange: "#FF8A3D" };
const MARK_ARCS = [
  { r: 46, c: COLORS.indigo, f: 0.74, rot: 0 },
  { r: 35, c: COLORS.blue, f: 0.74, rot: 58 },
  { r: 24, c: COLORS.coral, f: 0.76, rot: 120 },
  { r: 14, c: COLORS.orange, f: 0.8, rot: 186 },
];
const arc = (r, f) => {
  const C = 2 * Math.PI * r;
  return { strokeDasharray: `${(f * C).toFixed(2)} ${C.toFixed(2)}` };
};

// Staged connecting sequence — purely cosmetic, the real save happens once it finishes.
const CONNECT_STEPS = [
  { pct: 28, label: "Verifying token" },
  { pct: 64, label: "Decoding session" },
  { pct: 100, label: "Loading your workspace" },
];
const STEP_INTERVAL_MS = 480;
const HANDOFF_DELAY_MS = 550;

function Mark({ spinning }) {
  return (
    <div className="tg-mark-wrap" aria-hidden="true">
      <svg className={`tg-mark ${spinning ? "tg-mark--spin" : ""}`} viewBox="0 0 120 120" width="64" height="64">
        <g transform="translate(60 60)">
          {MARK_ARCS.map((a, i) => (
            <circle key={i} cx="0" cy="0" r={a.r} fill="none" stroke={a.c} strokeWidth="7"
              strokeLinecap="round" transform={`rotate(${a.rot})`} style={arc(a.r, a.f)} />
          ))}
          <circle cx="0" cy="0" r="5" fill={COLORS.orange} />
        </g>
      </svg>
    </div>
  );
}

export default function TokenGate({ mode = "blocking" }) {
  const { saveToken, closeGate } = useGlobalToken();
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("form"); // "form" | "connecting"
  const [stepIdx, setStepIdx] = useState(0);
  const [welcomeName, setWelcomeName] = useState("");
  const pendingTokenRef = useRef("");

  const isModal = mode === "modal";

  function handleContinue() {
    const tok = tokenInput.trim();
    if (!tok) { setError("Paste your Examly Authorization token first."); return; }
    setError("");
    pendingTokenRef.current = tok;

    const claims = decodeJwt(tok);
    setWelcomeName(formatClaimName(claims?.name) || claims?.email || "");
    setStepIdx(0);
    setPhase("connecting");
  }

  useEffect(() => {
    if (phase !== "connecting") return undefined;

    const timers = CONNECT_STEPS.slice(1).map((_, i) =>
      setTimeout(() => setStepIdx(i + 1), STEP_INTERVAL_MS * (i + 1))
    );
    const handoff = setTimeout(
      () => saveToken(pendingTokenRef.current),
      STEP_INTERVAL_MS * CONNECT_STEPS.length + HANDOFF_DELAY_MS
    );

    return () => { timers.forEach(clearTimeout); clearTimeout(handoff); };
  }, [phase, saveToken]);

  const connecting = phase === "connecting";
  const step = CONNECT_STEPS[stepIdx];
  const isDone = stepIdx === CONNECT_STEPS.length - 1;

  return (
    <div className={`tg-root ${isModal ? "tg-root--modal" : ""}`} role="dialog" aria-modal="true" aria-label="Connect to Examly">
      {!isModal && <LiquidMetalBackground />}
      {isModal && <div className="tg-backdrop" onClick={connecting ? undefined : closeGate} />}

      <div className="tg-card">
        {isModal && !connecting && (
          <button className="tg-close" onClick={closeGate} aria-label="Cancel">×</button>
        )}

        <Mark spinning={connecting} />

        {!connecting ? (
          <>
            <h1 className="tg-title">
              {isModal ? "Update your token" : (
                <><span className="tg-w-strong">Cube</span><span className="tg-w-thin">In</span><span className="tg-w-strong">Touch</span></>
              )}
            </h1>
            <p className="tg-subtitle">
              {isModal
                ? "Paste a fresh Authorization token — this replaces the one every tool is currently using."
                : "Paste your Examly Authorization token once to unlock every tool."}
            </p>

            <textarea
              className="tg-input"
              rows={4}
              autoFocus
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your Authorization token here..."
            />

            {error && <p className="tg-error">{error}</p>}

            <button className="tg-btn" onClick={handleContinue}>Continue</button>

            <p className="tg-hint">
              Saved locally in this browser and shared across every tool — no more re-pasting per page.
              The platform token can reset at any time; if a request starts failing, come back here and paste a new one.
            </p>
          </>
        ) : (
          <div className="tg-connecting">
            <h1 className={`tg-title tg-connect-title ${isDone ? "tg-connect-title--done" : ""}`}>
              {isDone ? `Welcome${welcomeName ? `, ${welcomeName}` : ""}!` : "Connecting"}
            </h1>
            <p className="tg-step-label">{step.label}…</p>

            <div className="tg-track">
              <div className="tg-fill" style={{ width: `${step.pct}%` }}>
                <span className="tg-fill-tip" />
              </div>
            </div>

            <div className="tg-step-dots">
              {CONNECT_STEPS.map((s, i) => (
                <span key={s.label} className={`tg-step-dot ${i <= stepIdx ? "tg-step-dot--done" : ""}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
