

// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import rateLimit from "express-rate-limit";
// import helmet from "helmet";

// import qcRoutes from "./routes/qc.js";
// import metadataRoutes from "./routes/metadata.js";
// import metadataUniversityRoutes from "./routes/metadataUniversity.js"; // ✅ NEW
// import healthRoutes from "./routes/health.js";

// dotenv.config();

// const app = express();

// app.set("trust proxy", 1);

// app.use(helmet());

// const limiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 120,
//   message: {
//     error: "Too many requests. Slow down.",
//   },
// });

// app.use(limiter);

// app.use(cors({
//   origin: "*", 
// }));

// app.use(express.json({
//   limit: "2mb",
// }));

// app.use("/qc", qcRoutes);
// app.use("/", metadataRoutes);
// app.use("/", metadataUniversityRoutes); // ✅ NEW UNIVERSITY ROUTE
// app.use("/health", healthRoutes);

// app.use((err, req, res, next) => {
//   console.error("🔥 SERVER ERROR:", err.message);

//   res.status(err.status || 500).json({
//     success: false,
//     error: "Internal server error",
//   });
// });

// app.use((req, res) => {
//   res.status(404).json({
//     error: "Endpoint not found",
//   });
// });

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//   console.log(`
// 🚀 ===============================
//       AI METADATA SERVER
// =================================

// ✅ Running on port: ${PORT}
// ✅ Health:     /health
// ✅ QC:         /qc
// ✅ Corporate:  /analyze-metadata
// ✅ University: /analyze-metadata-university

// =================================
//   `);
// });

// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import qcRoutes from "./routes/qc.js";
import metadataRoutes from "./routes/metadata.js";
import metadataUniversityRoutes from "./routes/metadataUniversity.js";
import healthRoutes from "./routes/health.js";
import resultAnalysisRoutes from "./routes/resultanalysis.js"; 
import repoViewerRoutes from "./routes/repoviewer.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Too many requests. Slow down." },
});

app.use(limiter);
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

app.use("/qc", qcRoutes);
app.use("/", metadataRoutes);
app.use("/", metadataUniversityRoutes);
app.use("/", resultAnalysisRoutes); // ✅ NEW — POST /analyze-result
app.use("/health", healthRoutes);
app.use("/", repoViewerRoutes); 

app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err.message);
  res.status(err.status || 500).json({ success: false, error: "Internal server error" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`
🚀 ===============================
      AI METADATA SERVER
=================================

✅ Running on port: ${PORT}
✅ Health:        /health
✅ QC:            /qc
✅ Corporate:     /analyze-metadata
✅ University:    /analyze-metadata-university
✅ Result X:      /analyze-result

=================================
  `);
});