// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import WelcomeLoader from "./components/WelcomeLoader";
import Dashboard from "./pages/Dashboard";
import Finder from "./pages/Finder";
import MCQ_QC from "./pages/MCQ_QC";
import CourseQBFinder from "./pages/CourseQBFinder";
import QBAccess from "./pages/QBAccess";
import "./App.css";
import MetaCorporate from "./pages/MetaCorporate";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && <WelcomeLoader onLoadComplete={() => setIsLoading(false)} />}
      
      <BrowserRouter>
        <div className="app-layout" style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease' }}>
          <Sidebar />

          <div className="app-main">
            <Topbar />

            <div className="app-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/finder" element={<Finder />} />
                <Route path="/course-qb" element={<CourseQBFinder />} />
                <Route path="/qb-access" element={<QBAccess />} />
                <Route path="/mcq-qc" element={<MCQ_QC />} />
                <Route path="/meta-thinker" element={<MetaCorporate />} />
              </Routes>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </>
  );
}