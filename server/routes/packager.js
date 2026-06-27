// server/routes/packager.js
import express from "express";
import multer from "multer";
import { runPackager, getZipTree } from "../services/packagerService.js";
import { createReadStream } from "fs";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.endsWith(".zip")) {
      return cb(new Error("Only .zip files are accepted"));
    }
    cb(null, true);
  },
});

// POST /packager/preview — returns folder tree JSON
router.post("/preview", upload.single("folder"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No zip file uploaded." });
  try {
    const tree = await getZipTree(req.file.buffer);
    res.json({ tree });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /packager/run
router.post("/run", upload.single("folder"), async (req, res) => {
  const { stack } = req.body;

  if (!stack) return res.status(400).json({ error: "Missing stack." });
  if (!req.file) return res.status(400).json({ error: "No zip file uploaded." });

  try {
    const original = req.file.originalname;
    const baseName = original.replace(/\.zip$/i, "");
    const outputName = `${baseName}_packaged.zip`;

    const { zipPath, zipName, cleanup } = await runPackager(stack, req.file.buffer, outputName);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const stream = createReadStream(zipPath);
    stream.pipe(res);
    stream.on("end", cleanup);
    stream.on("error", (err) => { console.error("Stream error:", err); cleanup(); });

  } catch (err) {
    console.error("❌ Packager route error:", err.message);
    return res.status(500).json({ error: err.message || "Packaging failed." });
  }
});

export default router;