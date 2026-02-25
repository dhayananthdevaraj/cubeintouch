// routes/repoviewer.js
import express from "express";
import { getRepoFiles } from "../services/repoViewerService.js";

const router = express.Router();

router.post("/get-repo-files", async (req, res) => {
  try {
    const { repoKey, techStack = "puppeteer" } = req.body;
    if (!repoKey) return res.status(400).json({ success: false, error: "repoKey is required" });

    console.log(`\n📁 Repo Viewer: ${repoKey} — stack: ${techStack}`);
    const result = await getRepoFiles({ repoKey, techStack });
    res.json(result);
  } catch (err) {
    console.error("❌ Repo Viewer Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;