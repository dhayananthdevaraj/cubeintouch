// routes/health.js - Health Check Endpoint
import express from "express";

const router = express.Router();

/**
 * GET /health
 * Health check endpoint to verify API status
 * 
 * Response:
 * {
 *   status: string
 *   timestamp: ISO string
 *   models: object with model information
 *   endpoints: object with available endpoints
 * }
 */
router.get("/", (req, res) => {
  res.json({ 
    status: "✅ AI API is running", 
    timestamp: new Date().toISOString(),
    models: {
      qc: "openai/gpt-oss-20b",
      metadata: "llama-3.3-70b-versatile"
    },
    endpoints: {
      qc: "POST /qc",
      metadata: "POST /analyze-metadata",
      health: "GET /health"
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      }
    }
  });
});

export default router;