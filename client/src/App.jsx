// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import WelcomeLoader from "./components/WelcomeLoader";
import TokenGate from "./components/TokenGate";
import { GlobalTokenProvider } from "./context/GlobalTokenContext";
import { useGlobalToken } from "./context/useGlobalToken";
import Dashboard from "./pages/Dashboard";
import Finder from "./pages/Finder";
import MCQ_QC from "./pages/MCQ_QC";
import CourseQBFinder from "./pages/CourseQBFinder";
import QBAccess from "./pages/QBAccess";
import "./App.css";
import MCQUploader from "./pages/MCQUploader";
import MetaAccess from "./pages/MetaAccess";
import ResultX from "./pages/result/ResultX";
import CodeLens from "./pages/CodeLens";
import CODSync from "./pages/CODSync";
import Scaffa from "./pages/scaf/Scaffa";
import Packager from "./pages/Packager";
import DupDetect from "./pages/DupDetect";
import WeightGen from "./pages/WeightGen";
import FileSync from "./pages/FileSync";
import BlankSync from "./pages/BlankSync";
import TestPacking from "./pages/TestPacking";
// import MysqlSchemaFetch from "./pages/MysqlSchemaFetch"; // temporary support tool — safe to remove later

function AppShell() {
  const [isLoading, setIsLoading] = useState(true);
  const { hasToken, showGate } = useGlobalToken();

  if (isLoading) return <WelcomeLoader onLoadComplete={() => setIsLoading(false)} />;
  if (!hasToken) return <TokenGate mode="blocking" />;

  return (
    <BrowserRouter>
      <div className="app-layout">
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
              <Route path="/meta-thinkly" element={<MetaAccess />} />
              <Route path="mcq-uploader" element={<MCQUploader />} />
              <Route path="/result-x" element={<ResultX />} />
              <Route path="/codelens" element={<CodeLens />} />
              <Route path="/cod-sync" element={<CODSync />} />
              <Route path="/scaffa" element={<Scaffa />} />
               <Route path="/packager" element={<Packager />} />
               <Route path="/dup-detect" element={<DupDetect />} />
               <Route path="/weight-gen" element={<WeightGen />} />
               <Route path="/file-sync" element={<FileSync />} />
               <Route path="/blank-sync" element={<BlankSync />} />
               <Route path="/test-packing" element={<TestPacking />} />
            </Routes>
          </div>
        </div>
      </div>

      {showGate && <TokenGate mode="modal" />}
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <GlobalTokenProvider>
      <AppShell />
    </GlobalTokenProvider>
  );
}