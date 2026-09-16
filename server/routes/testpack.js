// server/routes/testpack.js
import express from "express";
import { renderTestPackPdf } from "../services/testPackPdfService.js";

const router = express.Router();

// ── POST /testpack/pdf — renders the preview DTO to a downloadable PDF ─────
router.post("/pdf", (req, res) => {
  const preview = req.body;

  if (!preview || !Array.isArray(preview.questions)) {
    return res.status(400).json({ success: false, error: "A valid test preview payload is required" });
  }

  try {
    const fileName = `${(preview.testName || "test-preview").replace(/[^\w\-]+/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    renderTestPackPdf(preview, res);
  } catch (err) {
    console.error("❌ /testpack/pdf:", err.message);
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message || "PDF generation failed" });
  }
});

export default router;
