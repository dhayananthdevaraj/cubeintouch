
// src/components/WelcomeLoader.jsx
import { useState, useEffect } from 'react';

// Palette pulled from the CubeInTouch swirl mark
const COLORS = {
  indigo: '#6E63D6',
  blue:   '#5B8DEF',
  coral:  '#F0663F',
  orange: '#FF8A3D',
};

// Background orbital-arc rings — a slow "simulation" echoing the logo swirl.
// Each entry: radius, color, arc fraction (0-1), opacity, seconds/rev, direction.
const BG_RINGS = [
  { r: 110, c: COLORS.orange, f: 0.30, o: 0.55, dur: 26, dir:  1, w: 2 },
  { r: 165, c: COLORS.coral,  f: 0.55, o: 0.42, dur: 34, dir: -1, w: 2 },
  { r: 225, c: COLORS.coral,  f: 0.40, o: 0.32, dur: 46, dir:  1, w: 1.5 },
  { r: 290, c: COLORS.blue,   f: 0.62, o: 0.30, dur: 58, dir: -1, w: 1.5 },
  { r: 360, c: COLORS.indigo, f: 0.45, o: 0.24, dur: 72, dir:  1, w: 1.5 },
  { r: 435, c: COLORS.indigo, f: 0.58, o: 0.18, dur: 90, dir: -1, w: 1 },
];

// Concentric spiral arcs that make up the mark itself (outer indigo -> inner coral).
const MARK_ARCS = [
  { r: 46, c: COLORS.indigo, f: 0.74, rot:   0 },
  { r: 35, c: COLORS.blue,   f: 0.74, rot:  58 },
  { r: 24, c: COLORS.coral,  f: 0.76, rot: 120 },
  { r: 14, c: COLORS.orange, f: 0.80, rot: 186 },
];

const arc = (r, f) => {
  const C = 2 * Math.PI * r;
  return { strokeDasharray: `${(f * C).toFixed(2)} ${C.toFixed(2)}` };
};

export default function WelcomeLoader({ onLoadComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('loading'); // loading, fadeout, complete

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setStage('fadeout'), 500);
          setTimeout(() => {
            setStage('complete');
            onLoadComplete();
          }, 1000);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(progressInterval);
  }, [onLoadComplete]);

  if (stage === 'complete') return null;

  const status =
    progress < 30 ? 'Initializing' :
    progress < 60 ? 'Loading tools' :
    progress < 90 ? 'Setting up workspace' :
    'Ready';

  return (
    <div className={`cw-loader ${stage === 'fadeout' ? 'cw-fade-out' : ''}`} role="status" aria-live="polite">
      {/* Background simulation — orbital arcs echoing the logo swirl */}
      <div className="cw-sim" aria-hidden="true">
        <svg viewBox="0 0 1000 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(500 500)">
            {BG_RINGS.map((ring, i) => (
              <circle
                key={i}
                cx="0" cy="0" r={ring.r}
                fill="none"
                stroke={ring.c}
                strokeWidth={ring.w}
                strokeLinecap="round"
                style={{
                  ...arc(ring.r, ring.f),
                  opacity: ring.o,
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  animation: `${ring.dir > 0 ? 'cw-rot' : 'cw-rotR'} ${ring.dur}s linear infinite`,
                }}
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="cw-vignette" aria-hidden="true" />

      <div className="cw-content">
        {/* Brand mark — the CubeInTouch swirl */}
        <div className="cw-mark-wrap" aria-hidden="true">
          <svg className="cw-mark" viewBox="0 0 120 120" width="112" height="112">
            <g transform="translate(60 60)">
              {MARK_ARCS.map((a, i) => (
                <circle
                  key={i}
                  cx="0" cy="0" r={a.r}
                  fill="none"
                  stroke={a.c}
                  strokeWidth="7"
                  strokeLinecap="round"
                  transform={`rotate(${a.rot})`}
                  style={arc(a.r, a.f)}
                />
              ))}
              <circle cx="0" cy="0" r="5" fill={COLORS.orange} />
            </g>
          </svg>
        </div>

        {/* Wordmark */}
        <h1 className="cw-wordmark">
          <span className="cw-w-strong">Cube</span><span className="cw-w-thin">In</span><span className="cw-w-strong">Touch</span>
        </h1>

        {/* Progress */}
        <div className="cw-progress">
          <div className="cw-readout">
            <span className="cw-status">{status}</span>
            <span className="cw-pct">{String(progress).padStart(3, '0')}<span className="cw-pct-sym">%</span></span>
          </div>
          <div className="cw-track">
            <div className="cw-fill" style={{ width: `${progress}%` }}>
              <span className="cw-fill-tip" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cw-loader {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(120% 90% at 50% 42%, #16224a 0%, #0b1226 48%, #070b18 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
          transition: opacity 0.8s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .cw-loader.cw-fade-out { opacity: 0; }

        /* Background simulation */
        .cw-sim {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 150vmax;
          height: 150vmax;
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: cw-drift 42s ease-in-out infinite;
        }

        @keyframes cw-drift {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50%      { transform: translate(-50%, -50%) scale(1.08); }
        }

        .cw-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 46%, transparent 30%, rgba(7,11,24,0.55) 70%, rgba(7,11,24,0.9) 100%);
        }

        @keyframes cw-rot  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes cw-rotR { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }

        .cw-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 0 24px;
        }

        /* Brand mark */
        .cw-mark-wrap {
          margin-bottom: 42px;
          display: flex;
          justify-content: center;
        }

        .cw-mark {
          animation: cw-rot 22s linear infinite;
          filter: drop-shadow(0 6px 22px rgba(240,102,63,0.35));
        }

        /* Wordmark */
        .cw-wordmark {
          font-size: 44px;
          line-height: 1;
          letter-spacing: -0.02em;
          margin: 0 0 40px;
          color: #eaf0ff;
          animation: cw-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }

        .cw-w-strong { font-weight: 800; }
        .cw-w-thin   { font-weight: 300; color: ${COLORS.coral}; margin: 0 1px; }

        @keyframes cw-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Progress */
        .cw-progress {
          width: min(360px, 78vw);
          margin: 0 auto;
          animation: cw-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s backwards;
        }

        .cw-readout {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .cw-status {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8ea0c8;
        }

        .cw-pct {
          font-family: 'SF Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
          font-size: 15px;
          font-weight: 600;
          color: #eaf0ff;
          letter-spacing: 0.04em;
          font-variant-numeric: tabular-nums;
        }

        .cw-pct-sym { color: ${COLORS.orange}; margin-left: 2px; }

        .cw-track {
          height: 3px;
          width: 100%;
          background: rgba(148,178,255,0.14);
          border-radius: 99px;
          overflow: hidden;
        }

        .cw-fill {
          position: relative;
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, ${COLORS.indigo} 0%, ${COLORS.coral} 60%, ${COLORS.orange} 100%);
          box-shadow: 0 0 16px rgba(240,102,63,0.55);
          transition: width 0.25s ease;
        }

        .cw-fill-tip {
          position: absolute;
          right: 0;
          top: 50%;
          width: 7px;
          height: 7px;
          transform: translate(50%, -50%);
          border-radius: 50%;
          background: #fff4ec;
          box-shadow: 0 0 10px rgba(255,255,255,0.9);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .cw-wordmark { font-size: 34px; }
          .cw-mark { width: 92px; height: 92px; }
        }

        /* Accessibility — respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .cw-sim, .cw-mark, .cw-wordmark, .cw-progress { animation: none; }
          .cw-sim :where(circle) { animation: none !important; }
          .cw-loader { transition: none; }
        }
      `}</style>
    </div>
  );
}