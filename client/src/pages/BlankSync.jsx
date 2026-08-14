// src/pages/BlankSync.jsx
import { useNavigate } from "react-router-dom";
import BlankSyncPlatform from "./BlankSyncPlatform";
import { UNIVERSITY_DEPARTMENT_IDS, UNIVERSITY_B_D_ID_OPTIONS } from "../configUniversity";

// BlankSync is University-only. If you later add Corporate, mirror the
// PLATFORMS pattern from CODSync.jsx and add a selector here.
const UNIVERSITY_PLATFORM = {
  id: "university",
  label: "Stark University",
  description: "Upload fill-in-the-blank questions to University Question Banks",
  icon: "✏️",
  color: "#f59f00",
  tokenKey: "examly_token_blanksync_university",
  departmentIds: UNIVERSITY_DEPARTMENT_IDS,
  bdIdOptions: UNIVERSITY_B_D_ID_OPTIONS,
};

export default function BlankSync() {
  const navigate = useNavigate();
  return (
    <BlankSyncPlatform
      platform={UNIVERSITY_PLATFORM}
      onBack={() => navigate("/")}
    />
  );
}