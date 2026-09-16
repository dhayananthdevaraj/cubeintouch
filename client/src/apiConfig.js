// const API_BASE_URL = "http://localhost:4000";
const API_BASE_URL = "https://cubeintouch-backend.onrender.com";

const apiConfig = {
  FETCH_FOLDERS:    `${API_BASE_URL}/scaffa/fetch-folders`,
  FETCH_SPEC_FILES: `${API_BASE_URL}/scaffa/fetch-spec-files`,
  UPLOAD:           `${API_BASE_URL}/scaffa/upload`,
  UPLOAD_SPECS:     `${API_BASE_URL}/scaffa/upload-angular-scaf`,
  UPLOAD_SPRINGBOOT: `${API_BASE_URL}/scaffa/upload-springboot-scaf`,
  UPLOAD_ANGULAR_SPRINGBOOT: `${API_BASE_URL}/scaffa/upload-angular-springboot-scaf`,
  DOWNLOAD_FOLDER:  `${API_BASE_URL}/scaffa/download-folder`,
  PACKAGER_RUN:     `${API_BASE_URL}/packager/run`,
  PACKAGER_PREVIEW: `${API_BASE_URL}/packager/preview`,
  DUP_DETECT:       `${API_BASE_URL}/dup-detect`,
  FILE_REFORMAT:    `${API_BASE_URL}/file-reformat`,   // ← add this
  QB_TECH_STACKS:   `${API_BASE_URL}/qb-metadata/tech-stacks`,
  QB_METADATA_SEARCH: `${API_BASE_URL}/qb-metadata/search`,
  TESTPACK_PDF:     `${API_BASE_URL}/testpack/pdf`,
};

export default apiConfig;