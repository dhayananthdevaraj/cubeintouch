// src/components/Topbar.jsx
import { useLocation } from "react-router-dom";

export default function Topbar() {
  const location = useLocation();

  const getTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/finder":
        return "Content → Finder";
      case "/course-qb":
        return "Course → QB Finder";
      case "/qb-access":
        return "QB → Access Tool";
      case "/mcq-qc":
        return "MCQ → Quality Check";
      default:
        return "Support Hub";
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title">{getTitle()}</h2>
      </div>

      <div className="topbar-right">
        <span className="badge bg-primary">Internal</span>
      </div>
    </header>
  );
}