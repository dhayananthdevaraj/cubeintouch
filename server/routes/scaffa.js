// // server/routes/scaffa.js
// import express from "express";
// import multer from "multer";
// import fs from "fs-extra";
// import {
//   fetchFolders,
//   fetchSpecFiles,
//   generateReactZip,
//   generateAngularZip,
// } from "../services/scaffaService.js";

// const router = express.Router();
// const upload = multer();

// // ── POST /scaffa/fetch-folders ───────────────────────────────────────────────
// router.post("/fetch-folders", async (req, res) => {
//   const { githubUrl, path: folderPath = "" } = req.body;

//   if (!githubUrl)
//     return res.status(400).json({ error: "githubUrl is required" });

//   try {
//     const folders = await fetchFolders(githubUrl, folderPath);
//     res.json({ folders });
//   } catch (err) {
//     console.error("❌ /fetch-folders:", err.message);
//     res.status(500).json({ error: err.message || "Failed to fetch folders" });
//   }
// });

// // ── POST /scaffa/fetch-spec-files ────────────────────────────────────────────
// router.post("/fetch-spec-files", async (req, res) => {
//   const { githubUrl, folderName, type = "angular" } = req.body;

//   if (!githubUrl || !folderName)
//     return res.status(400).json({ error: "githubUrl and folderName are required" });

//   try {
//     const specFiles = await fetchSpecFiles(githubUrl, folderName, type);
//     res.json({ specFiles });
//   } catch (err) {
//     console.error("❌ /fetch-spec-files:", err.message);
//     res.status(500).json({ error: err.message || "Failed to fetch spec files" });
//   }
// });

// // ── POST /scaffa/upload  →  React ZIP ────────────────────────────────────────
// router.post("/upload", upload.single("testCase"), async (req, res) => {
//   const testCase    = req.file ? req.file.buffer.toString() : req.body.testCase;
//   const zipFileName = req.body.zipFileName;

//   if (!testCase)    return res.status(400).json({ error: "testCase is required" });
//   if (!zipFileName) return res.status(400).json({ error: "zipFileName is required" });

//   try {
//     const { zipPath, tempDir } = await generateReactZip(testCase, zipFileName);
//     res.download(zipPath, `${zipFileName}.zip`, async (err) => {
//       if (err) console.error("❌ React ZIP download error:", err.message);
//       await fs.remove(tempDir).catch(() => {});
//       console.log(`🧹 Cleaned up: ${tempDir}`);
//     });
//   } catch (err) {
//     console.error("❌ /upload (React):", err.message);
//     res.status(500).json({ error: "Failed to generate React ZIP" });
//   }
// });

// // ── POST /scaffa/upload-angular-scaf  →  Angular ZIP + karma.sh ─────────────
// router.post("/upload-angular-scaf", upload.array("specFiles"), async (req, res) => {
//   const files       = req.files;
//   const zipFileName = req.body.zipFileName;

//   if (!zipFileName)
//     return res.status(400).json({ error: "zipFileName is required" });
//   if (!files || !files.length)
//     return res.status(400).json({ error: "No spec files uploaded" });

//   try {
//     const { zipPath, tempDir } = await generateAngularZip(files, zipFileName);
//     res.download(zipPath, `${zipFileName}.zip`, async (err) => {
//       if (err) console.error("❌ Angular ZIP download error:", err.message);
//       await fs.remove(tempDir).catch(() => {});
//       console.log(`🧹 Cleaned up: ${tempDir}`);
//     });
//   } catch (err) {
//     console.error("❌ /upload-angular-scaf:", err.message);
//     res.status(500).json({ error: "Failed to generate Angular ZIP" });
//   }
// });

// router.post("/download-folder", async (req, res) => {
//   const { githubUrl, folderPath, zipFileName } = req.body;
 
//   if (!githubUrl || !folderPath)
//     return res.status(400).json({ error: "githubUrl and folderPath are required" });
 
//   const name = zipFileName || folderPath.split("/").pop() || "folder";
 
//   try {
//     const { zipPath, tempDir } = await downloadFolderAsZip(githubUrl, folderPath, name);
 
//     res.download(zipPath, `${name}.zip`, async (err) => {
//       if (err) console.error("❌ Folder ZIP download error:", err.message);
//       await fs.remove(tempDir).catch(() => {});
//       console.log(`🧹 Cleaned up: ${tempDir}`);
//     });
//   } catch (err) {
//     console.error("❌ /download-folder:", err.message);
//     res.status(500).json({ error: err.message || "Failed to download folder" });
//   }
// });

// export default router;

// server/routes/scaffa.js
import express from "express";
import multer from "multer";
import fs from "fs-extra";
import {
  fetchFolders,
  fetchSpecFiles,
  generateReactZip,
  generateAngularZip,
  downloadFolderAsZip,        // ← NEW
} from "../services/scaffaService.js";

const router = express.Router();
const upload = multer();

// ── POST /scaffa/fetch-folders ───────────────────────────────────────────────
router.post("/fetch-folders", async (req, res) => {
  const { githubUrl, path: folderPath = "" } = req.body;

  if (!githubUrl)
    return res.status(400).json({ error: "githubUrl is required" });

  try {
    const folders = await fetchFolders(githubUrl, folderPath);
    res.json({ folders });
  } catch (err) {
    console.error("❌ /fetch-folders:", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch folders" });
  }
});

// ── POST /scaffa/fetch-spec-files ────────────────────────────────────────────
router.post("/fetch-spec-files", async (req, res) => {
  const { githubUrl, folderName, type = "angular" } = req.body;

  if (!githubUrl || !folderName)
    return res.status(400).json({ error: "githubUrl and folderName are required" });

  try {
    const specFiles = await fetchSpecFiles(githubUrl, folderName, type);
    res.json({ specFiles });
  } catch (err) {
    console.error("❌ /fetch-spec-files:", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch spec files" });
  }
});

// ── POST /scaffa/upload  →  React ZIP ────────────────────────────────────────
router.post("/upload", upload.single("testCase"), async (req, res) => {
  const testCase    = req.file ? req.file.buffer.toString() : req.body.testCase;
  const zipFileName = req.body.zipFileName;

  if (!testCase)    return res.status(400).json({ error: "testCase is required" });
  if (!zipFileName) return res.status(400).json({ error: "zipFileName is required" });

  try {
    const { zipPath, tempDir } = await generateReactZip(testCase, zipFileName);
    res.download(zipPath, `${zipFileName}.zip`, async (err) => {
      if (err) console.error("❌ React ZIP download error:", err.message);
      await fs.remove(tempDir).catch(() => {});
      console.log(`🧹 Cleaned up: ${tempDir}`);
    });
  } catch (err) {
    console.error("❌ /upload (React):", err.message);
    res.status(500).json({ error: "Failed to generate React ZIP" });
  }
});

// ── POST /scaffa/upload-angular-scaf  →  Angular ZIP + karma.sh ─────────────
router.post("/upload-angular-scaf", upload.array("specFiles"), async (req, res) => {
  const files       = req.files;
  const zipFileName = req.body.zipFileName;

  if (!zipFileName)
    return res.status(400).json({ error: "zipFileName is required" });
  if (!files || !files.length)
    return res.status(400).json({ error: "No spec files uploaded" });

  try {
    const { zipPath, tempDir } = await generateAngularZip(files, zipFileName);
    res.download(zipPath, `${zipFileName}.zip`, async (err) => {
      if (err) console.error("❌ Angular ZIP download error:", err.message);
      await fs.remove(tempDir).catch(() => {});
      console.log(`🧹 Cleaned up: ${tempDir}`);
    });
  } catch (err) {
    console.error("❌ /upload-angular-scaf:", err.message);
    res.status(500).json({ error: "Failed to generate Angular ZIP" });
  }
});

// ── POST /scaffa/download-folder  →  Full folder ZIP (all file types) ────────
router.post("/download-folder", async (req, res) => {
  const { githubUrl, folderPath, zipFileName } = req.body;

  if (!githubUrl || !folderPath)
    return res.status(400).json({ error: "githubUrl and folderPath are required" });

  const name = zipFileName || folderPath.split("/").pop() || "folder";

  try {
    const { zipPath, tempDir } = await downloadFolderAsZip(githubUrl, folderPath, name);
    res.download(zipPath, `${name}.zip`, async (err) => {
      if (err) console.error("❌ Folder ZIP download error:", err.message);
      await fs.remove(tempDir).catch(() => {});
      console.log(`🧹 Cleaned up: ${tempDir}`);
    });
  } catch (err) {
    console.error("❌ /download-folder:", err.message);
    res.status(500).json({ error: err.message || "Failed to download folder" });
  }
});

export default router;