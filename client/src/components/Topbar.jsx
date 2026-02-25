// src/components/Topbar.jsx
import { useLocation } from "react-router-dom";
import "./Topbar.css";

export default function Topbar() {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case "/":
        return {
          title: "Dashboard",
          icon: "🏠",
          subtitle: "Overview & Quick Access"
        };
      case "/finder":
        return {
          title: "Content Finder",
          icon: "📚",
          subtitle: "Search Projects & Content Banks"
        };
      case "/course-qb":
        return {
          title: "QB Space",
          icon: "🎓",
          subtitle: "Analyze Question Banks"
        };
      case "/qb-access":
        return {
          title: "QB Access Tool",
          icon: "🔄",
          subtitle: "Clone & Move Question Banks"
        };
      case "/mcq-qc":
        return {
          title: "MCQ Quality Check",
          icon: "🔍",
          subtitle: "Validate Questions"
        };
      case "/meta-thinkly":
        return {
          title: "Meta Thinkly-X",
          icon: "📝",
          subtitle: "Edit Question Bank Metadata"
        };
        case "/mcq-uploader":
        return {
          title: "MCQ Sync",
          icon: "📤",
          subtitle: "Upload json MCQ Questions"
        };
        case "/result-x":
        return { title: "Result X",
     icon: "⚡",
      subtitle: "AI Result Analysis" };
      default:
        return {
          title: "Support Hub",
          icon: "🎯",
          subtitle: "CubeInTouch Internal Tools"
        };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="topbar">
      <div className="topbar-background">
        <div className="topbar-gradient"></div>
      </div>

      <div className="topbar-content">
        <div className="topbar-left">
          <div className="page-icon">{pageInfo.icon}</div>
          <div className="page-info">
            <h2 className="page-title">{pageInfo.title}</h2>
            <p className="page-subtitle">{pageInfo.subtitle}</p>
          </div>
        </div>

      </div>
    </header>
  );
}