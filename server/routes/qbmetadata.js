// server/routes/qbmetadata.js
import express from "express";
import { listTechStacks, searchQbMetadata, invalidateCache } from "../services/qbMetadataService.js";

const router = express.Router();

// ── GET /qb-metadata/tech-stacks ────────────────────────────────────────────
router.get("/tech-stacks", async (req, res) => {
  try {
    const techStacks = await listTechStacks();
    res.json({ success: true, techStacks });
  } catch (err) {
    console.error("❌ /qb-metadata/tech-stacks:", err.message);
    res.status(500).json({ success: false, error: err.message || "Failed to load tech stacks" });
  }
});

// ── GET /qb-metadata/search?techStack=...&topic=...&type=... ───────────────
router.get("/search", async (req, res) => {
  const { techStack, topic = "", type = "" } = req.query;

  if (!techStack) return res.status(400).json({ success: false, error: "techStack is required" });

  try {
    const results = await searchQbMetadata({ techStack, topic, type });
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error("❌ /qb-metadata/search:", err.message);
    res.status(500).json({ success: false, error: err.message || "QB metadata search failed" });
  }
});

// ── POST /qb-metadata/refresh — force re-fetch of the sheet on next read ───
router.post("/refresh", (req, res) => {
  invalidateCache();
  res.json({ success: true, message: "QB metadata cache cleared — next request re-fetches the sheet" });
});

export default router;
