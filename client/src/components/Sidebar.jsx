// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <span className="brand-icon">📚</span>
          <div className="brand-content">
            <h4 className="brand-title">CubeInTouch</h4>
            <span className="brand-subtitle">Support Tools</span>
          </div>
        </div>
        <div className="brand-glow"></div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-menu">
        <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">🏠</span>
          <span className="nav-text">Dashboard</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/finder" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">📚</span>
          <span className="nav-text">PB&CB Finder</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/mcq-qc" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">🔍</span>
          <span className="nav-text">MCQ QC</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/course-qb" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">🎓</span>
          <span className="nav-text">QB Finder</span>
          <span className="nav-indicator"></span>
        </NavLink>

        <NavLink to="/qb-access" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
          <span className="nav-icon">🔄</span>
          <span className="nav-text">QB Access</span>
          <span className="nav-indicator"></span>
        </NavLink>
      </nav>
    </aside>
  );
}