// routes/fetchimage.js
import express from "express";
import { fetchImageAsBase64 } from "../services/fetchImageService.js";

const router = express.Router();

router.post("/api/fetch-image", async (req, res) => {
  const { url = "", token = "", header_name = "", cookie_name = "" } = req.body;

  if (!url || !url.startsWith("http")) {
    return res.status(400).json({ error: "url is required and must start with http" });
  }

  try {
    const result = await fetchImageAsBase64({ url, token, header_name, cookie_name });
    return res.json(result);
  } catch (err) {
    console.error("❌ fetch-image error:", err.message);
    return res.status(422).json({
      error:  err.message,
      hint:   "Copy the exact Cookie header from DevTools → Network tab and pass as token.",
    });
  }
});

export default router;