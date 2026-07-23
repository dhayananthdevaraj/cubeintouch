// // server/routes/filereformat.js
// import express from "express";
// import { reformatFileQuestions } from "../services/fileReformatService.js";

// const router = express.Router();

// // POST /file-reformat
// router.post("/", async (req, res) => {
//   try {
//     const { raw, defaultDifficulty, defaultBlooms, defaultFileSize, defaultFileTypes } = req.body;
//     if (!raw || !raw.trim()) {
//       return res.status(400).json({ success: false, error: "'raw' content is required" });
//     }
//     const formatted = await reformatFileQuestions({
//       raw,
//       defaultDifficulty,
//       defaultBlooms,
//       defaultFileSize,
//       defaultFileTypes,
//     });
//     res.json({ success: true, formatted });
//   } catch (err) {
//     console.error("🔥 file-reformat error:", err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// export default router;


// server/routes/filereformat.js
import express from "express";
import { reformatFileQuestions } from "../services/fileReformatService.js";

const router = express.Router();

// POST /file-reformat
router.post("/", async (req, res) => {
  try {
    const { raw, defaultDifficulty, defaultBlooms } = req.body;
    if (!raw || !raw.trim()) {
      return res.status(400).json({ success: false, error: "'raw' content is required" });
    }
    const formatted = await reformatFileQuestions({
      raw,
      defaultDifficulty,
      defaultBlooms,
    });
    res.json({ success: true, formatted });
  } catch (err) {
    console.error("🔥 file-reformat error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;