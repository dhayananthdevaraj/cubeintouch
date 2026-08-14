
// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import viteLogo from "../assets/vite.svg";
import "./Sidebar.css";

// Palette from the CubeInTouch swirl mark
const SB_COLORS = { indigo: "#6E63D6", blue: "#5B8DEF", coral: "#F0663F", orange: "#FF8A3D" };

// Spiral arcs for the compact brand crest (mirrors the logo swirl: outer indigo -> inner coral).
// r = radius, c = color, f = arc fraction (0-1), o = opacity, rot = start angle, w = stroke width
const SB_ARCS = [
  { r: 92, c: SB_COLORS.indigo, f: 0.72, o: 0.30, rot:   0, w: 2 },
  { r: 68, c: SB_COLORS.blue,   f: 0.74, o: 0.34, rot:  62, w: 2 },
  { r: 46, c: SB_COLORS.coral,  f: 0.76, o: 0.42, rot: 128, w: 2.5 },
  { r: 26, c: SB_COLORS.orange, f: 0.80, o: 0.55, rot: 196, w: 2.5 },
];

const sbArc = (r, f) => {
  const C = 2 * Math.PI * r;
  return { strokeDasharray: `${(f * C).toFixed(2)} ${C.toFixed(2)}` };
};

export default function Sidebar() {
  return (
    <aside className="sidebar" style={{ position: "relative", isolation: "isolate" }}>
      {/* Animated swirl crest — a compact spiral behind the brand header only */}
      <div className="sb-sim" aria-hidden="true">
        <div className="sb-glow"></div>
        <svg className="sb-swirl" viewBox="0 0 400 210" width="100%" height="210" preserveAspectRatio="xMidYMin slice">
          <g transform="translate(200 82)" className="sb-swirl-spin">
            {SB_ARCS.map((a, i) => (
              <circle
                key={i}
                cx="0" cy="0" r={a.r}
                fill="none"
                stroke={a.c}
                strokeWidth={a.w}
                strokeLinecap="round"
                transform={`rotate(${a.rot})`}
                style={{ ...sbArc(a.r, a.f), opacity: a.o }}
              />
            ))}
            <circle cx="0" cy="0" r="4" fill={SB_COLORS.orange} opacity="0.6" />
          </g>
        </svg>
      </div>

      {/* Brand Header */}
      <div className="sidebar-brand" style={{ position: "relative", zIndex: 1 }}>
        <div className="brand-logo">
          <span className="brand-icon">
            <img src={viteLogo} alt="CubeInTouch" style={{ width: "100%", height: "100%" }} />
          </span>
          <div className="brand-content">
            <h3 className="brand-title">CubeInTouch</h3>
          </div>
        </div>
        <div className="brand-glow"></div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu" style={{ position: "relative", zIndex: 1 }}>
        <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"🏠"}</span>
          <span className="nav-text">Dashboard</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/finder" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"📚"}</span>
          <span className="nav-text">PB&amp;CB Finder</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/mcq-qc" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"🔍"}</span>
          <span className="nav-text">MCQ QC</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/course-qb" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"🎓"}</span>
          <span className="nav-text">QB Space</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/qb-access" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"🔄"}</span>
          <span className="nav-text">QB Access</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/meta-thinkly" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"📝"}</span>
          <span className="nav-text">Meta Thinkly-X</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/mcq-uploader" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"📤"}</span>
          <span className="nav-text">MCQ Sync</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/cod-sync" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"📤"}</span>
          <span className="nav-text">COD Sync</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/result-x" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"⚡"}</span>
          <span className="nav-text">Result X</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/codelens" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"🔭"}</span>
          <span className="nav-text">CodeLens</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/packager" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"📦"}</span>
          <span className="nav-text">Packager</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/dup-detect" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
         <span className="nav-icon">{"🔁"}</span>
         <span className="nav-text">Dup Detect</span>
         <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/scaffa" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">{"🏗️"}</span>
          <span className="nav-text">Scaffa</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/weight-gen" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
        <span className="nav-icon">{"⚖️"}</span>
        <span className="nav-text">WeightGen</span>
        <span className="nav-indicator"></span>
      </NavLink>

      <NavLink to="/file-sync" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
  <span className="nav-icon">{"📎"}</span>
  <span className="nav-text">FileSync</span>
  <span className="nav-indicator"></span>
</NavLink>

<NavLink to="/blank-sync" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
  <span className="nav-icon">{"✏️"}</span>
  <span className="nav-text">BlankSync</span>
  <span className="nav-indicator"></span>
</NavLink>

        {/* specQ — External Tool */}
        <a  
          href="https://qc-automation-frontend.onrender.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link nav-link-specq"
        >
          <span className="nav-icon">{"⚗️"}</span>
          <span className="nav-text">specQ</span>
          <span className="nav-external">{"↗"}</span>
        </a>

      </nav>

      {/* Scoped styles for the swirl crest */}
      <style>{`
        .sb-sim {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 210px;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          /* Fade the whole crest out before the nav so links stay clean */
          -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 42%, transparent 82%);
                  mask-image: linear-gradient(180deg, #000 0%, #000 42%, transparent 82%);
        }
        .sb-glow {
          position: absolute;
          top: -40px; left: 50%;
          width: 260px; height: 260px;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(240,102,63,0.16) 0%, rgba(110,99,214,0.10) 40%, transparent 70%);
          animation: sb-breathe 6s ease-in-out infinite;
        }
        .sb-swirl { position: relative; }
        .sb-swirl-spin {
          transform-box: fill-box;
          transform-origin: center;
          animation: sb-rot 24s linear infinite;
        }
        @keyframes sb-rot { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sb-breathe {
          0%, 100% { opacity: 0.8; transform: translateX(-50%) scale(1); }
          50%      { opacity: 1;   transform: translateX(-50%) scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-swirl-spin, .sb-glow { animation: none; }
        }
      `}</style>
    </aside>
  );
}