// src/pages/FileSync.jsx
import { useNavigate } from "react-router-dom";
import FileSyncPlatform from "./FileSyncPlatform";
import { UNIVERSITY_DEPARTMENT_IDS, UNIVERSITY_B_D_ID_OPTIONS } from "../configUniversity";

// FileSync is University-only. If you later add Corporate, mirror the
// PLATFORMS pattern from CODSync.jsx and add a selector here.
const UNIVERSITY_PLATFORM = {
  id: "university",
  label: "Stark University",
  description: "Upload file-upload questions to University Question Banks",
  icon: "🎓",
  color: "#7950f2",
  tokenKey: "examly_token_fu_university",
  departmentIds: UNIVERSITY_DEPARTMENT_IDS,
  bdIdOptions: UNIVERSITY_B_D_ID_OPTIONS,
};

export default function FileSync() {
  const navigate = useNavigate();
  return (
    <FileSyncPlatform
      platform={UNIVERSITY_PLATFORM}
      onBack={() => navigate("/")}
    />
  );
}