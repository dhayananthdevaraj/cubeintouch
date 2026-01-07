// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h4>📚CubeInTouch</h4>
        <span>Support Tools</span>
      </div>

      <nav className="sidebar-menu">
        <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}>
          🏠 Dashboard
        </NavLink>

        <NavLink to="/finder" className={({ isActive }) => isActive ? "active" : ""}>
          📚 PB&CB Finder
        </NavLink>

        <NavLink to="/mcq-qc" className={({ isActive }) => isActive ? "active" : ""}>
          🔍 MCQ QC
        </NavLink>

        <NavLink to="/course-qb" className={({ isActive }) => isActive ? "active" : ""}>
          🎓 QB Finder
        </NavLink>

        <NavLink to="/qb-access" className={({ isActive }) => isActive ? "active" : ""}>
          🔄 QB Access
        </NavLink>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Coming Soon</div>
          <span className="disabled">📊 Reports</span>
          <span className="disabled">⚙️ Automations</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <p>v1.0.0</p>
      </div>
    </aside>
  );
}