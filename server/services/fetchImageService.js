// services/fetchImageService.js
// S3 bucket policy for exams-media-content allows ONLY:
//   Origin/Referer: https://admin.orchard.iamneo.in
// Confirmed from DevTools: 200 OK with these exact headers.

import https from "https";
import http  from "http";

export async function fetchImageAsBase64({ url, token = "" }) {
  if (!url || !url.startsWith("http")) {
    throw new Error("url is required and must start with http");
  }

  // ── Exact headers that S3 accepts — copied from working browser request ────
  const workingHeaders = {
    "User-Agent":       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    "Accept":           "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Encoding":  "gzip, deflate, br, zstd",
    "Accept-Language":  "en-GB,en;q=0.9,en-US;q=0.8,en-IN;q=0.7",
    "Origin":           "https://admin.orchard.iamneo.in",
    "Referer":          "https://admin.orchard.iamneo.in/",
    "Cache-Control":    "no-cache",
    "Pragma":           "no-cache",
    "Connection":       "keep-alive",
    "sec-ch-ua":        '"Microsoft Edge";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "Sec-Fetch-Dest":   "image",
    "Sec-Fetch-Mode":   "cors",
    "Sec-Fetch-Site":   "cross-site",
  };

  // Try with token as cookie too (in case some images need auth)
  const attempts = [
    workingHeaders,
    token ? { ...workingHeaders, "Cookie": `token=${token}` }         : null,
    token ? { ...workingHeaders, "Authorization": `Bearer ${token}` } : null,
  ].filter(Boolean);

  let lastStatus = null;
  let lastBody   = null;

  for (const headers of attempts) {
    try {
      const { statusCode, buffer, contentType } = await httpGet(url, headers);

      if (statusCode === 200) {
        const mime   = contentType?.startsWith("image/") ? contentType : detectMime(url, buffer);
        const base64 = buffer.toString("base64");
        console.log(`  ✅ fetch-image OK — ${mime} — ${buffer.length} bytes — ${url.split("/").pop()}`);
        return {
          data_url:     `data:${mime};base64,${base64}`,
          content_type: mime,
          size_bytes:   buffer.length,
        };
      }

      console.warn(`  ⚠️  fetch-image HTTP ${statusCode} for ${url.split("/").pop()}`);
      lastStatus = statusCode;
      lastBody   = buffer.toString("utf-8").slice(0, 300);
    } catch (err) {
      lastBody = err.message;
    }
  }

  throw new Error(
    `All fetch attempts failed. Last HTTP status: ${lastStatus}. Detail: ${lastBody}`
  );
}

// ── HTTP GET with redirect follow ─────────────────────────────────────────────
function httpGet(url, headers, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 10) return reject(new Error("Too many redirects"));

    const parsed = new URL(url);
    const lib    = parsed.protocol === "https:" ? https : http;

    const req = lib.request(
      {
        hostname:           parsed.hostname,
        path:               parsed.pathname + parsed.search,
        method:             "GET",
        headers,
        rejectUnauthorized: false,
      },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          const nextUrl = response.headers.location.startsWith("http")
            ? response.headers.location
            : `${parsed.protocol}//${parsed.host}${response.headers.location}`;
          httpGet(nextUrl, headers, redirectCount + 1).then(resolve).catch(reject);
          return;
        }

        const chunks = [];
        response.on("data",  (chunk) => chunks.push(chunk));
        response.on("end",   () => resolve({
          statusCode:  response.statusCode,
          buffer:      Buffer.concat(chunks),
          contentType: response.headers["content-type"]?.split(";")[0].trim() || "",
        }));
        response.on("error", reject);
      }
    );

    req.on("error", reject);
    req.setTimeout(30_000, () => { req.destroy(); reject(new Error("Timeout after 30s")); });
    req.end();
  });
}

// ── Detect MIME from magic bytes then URL extension ───────────────────────────
function detectMime(url, buffer) {
  if (buffer.length >= 4) {
    const b = buffer;
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)                  return "image/jpeg";
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46)                  return "image/gif";
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return "image/webp";
  }
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  return {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  }[ext] || "image/png";
}