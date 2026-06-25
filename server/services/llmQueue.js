import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const PROVIDERS = [
  {
    name:   "groq-1",
    type:   "groq",
    client: new Groq({ apiKey: process.env.GROQ_API_KEY }),
    models: {
      default:           "llama-3.3-70b-versatile",
      qc:                "openai/gpt-oss-20b",
      analysis:          "llama-3.3-70b-versatile",
      "analysis-observe": "llama-3.1-8b-instant",      // ← Stage 1: fast + huge quota
      "cod-ai-solution": "llama-3.3-70b-versatile",
      "qc-desc":         "meta-llama/llama-4-scout-17b-16e-instruct",
      "qc-input":        "llama-3.3-70b-versatile",
      "qc-output":       "llama-3.3-70b-versatile",
      "qc-sample":       "meta-llama/llama-4-scout-17b-16e-instruct",
      "qc-whitelist":    "llama-3.3-70b-versatile",
      "qc-difficulty":   "llama-3.3-70b-versatile",
      "qc-ai-failure":   "meta-llama/llama-4-scout-17b-16e-instruct",
    },
    isRateLimited:  false,
    rateLimitUntil: null,
    modelLimits:    {},
  },
  {
    name:   "groq-2",
    type:   "groq",
    client: new Groq({ apiKey: process.env.GROQ_API_KEY_2 }),
    models: {
      default:           "llama-3.3-70b-versatile",
      qc:                "openai/gpt-oss-20b",
      analysis:          "llama-3.3-70b-versatile",
      "analysis-observe": "llama-3.1-8b-instant",      // ← Stage 1: separate TPD bucket
      "cod-ai-solution": "llama-3.3-70b-versatile",
      "qc-desc":         "meta-llama/llama-4-scout-17b-16e-instruct",
      "qc-input":        "llama-3.3-70b-versatile",
      "qc-output":       "llama-3.3-70b-versatile",
      "qc-sample":       "meta-llama/llama-4-scout-17b-16e-instruct",
      "qc-whitelist":    "llama-3.3-70b-versatile",
      "qc-difficulty":   "llama-3.3-70b-versatile",
      "qc-ai-failure":   "meta-llama/llama-4-scout-17b-16e-instruct",
    },
    isRateLimited:  false,
    rateLimitUntil: null,
    modelLimits:    {},
  },
  {
    name:   "groq-3",
    type:   "groq",
    client: new Groq({ apiKey: process.env.GROQ_API_KEY_3 }),
    models: {
      default:           "llama-3.3-70b-versatile",
      qc:                "openai/gpt-oss-20b",
      analysis:          "llama-3.3-70b-versatile",
      "analysis-observe": "llama-3.1-8b-instant",      // ← Stage 1: separate TPD bucket
      "cod-ai-solution": "llama-3.3-70b-versatile",
      "qc-desc":         "meta-llama/llama-4-scout-17b-16e-instruct",
      "qc-input":        "llama-3.3-70b-versatile",
      "qc-output":       "llama-3.3-70b-versatile",
      "qc-sample":       "meta-llama/llama-4-scout-17b-16e-instruct",
      "qc-whitelist":    "llama-3.3-70b-versatile",
      "qc-difficulty":   "llama-3.3-70b-versatile",
      "qc-ai-failure":   "meta-llama/llama-4-scout-17b-16e-instruct",
    },
    isRateLimited:  false,
    rateLimitUntil: null,
    modelLimits:    {},
  },
  {
    name:   "gemini-1",
    type:   "gemini",
    apiKey: process.env.GEMINI_API_KEY,
    client: null,
    models: {
      default:           "gemini-2.5-flash",
      qc:                "gemini-2.5-flash",
      analysis:          "gemini-2.5-flash",
      "analysis-observe": "gemini-2.5-flash",
      "cod-ai-solution": "gemini-2.5-flash",
      "qc-desc":         "gemini-2.5-flash",
      "qc-input":        "gemini-2.5-flash",
      "qc-output":       "gemini-2.5-flash",
      "qc-sample":       "gemini-2.5-flash",
      "qc-whitelist":    "gemini-2.5-flash",
      "qc-difficulty":   "gemini-2.5-flash",
      "qc-ai-failure":   "gemini-2.5-flash",
    },
    isRateLimited:  false,
    rateLimitUntil: null,
    modelLimits:    {},
  },
  {
    name:   "gemini-2",
    type:   "gemini",
    apiKey: process.env.GEMINI_API_KEY_2,
    client: null,
    models: {
      default:           "gemini-2.5-flash",
      qc:                "gemini-2.5-flash",
      analysis:          "gemini-2.5-flash",
      "analysis-observe": "gemini-2.5-flash",
      "cod-ai-solution": "gemini-2.5-flash",
      "qc-desc":         "gemini-2.5-flash",
      "qc-input":        "gemini-2.5-flash",
      "qc-output":       "gemini-2.5-flash",
      "qc-sample":       "gemini-2.5-flash",
      "qc-whitelist":    "gemini-2.5-flash",
      "qc-difficulty":   "gemini-2.5-flash",
      "qc-ai-failure":   "gemini-2.5-flash",
    },
    isRateLimited:  false,
    rateLimitUntil: null,
    modelLimits:    {},
  },
];

// ── Rate limit helpers ─────────────────────────────────────────────────────────

function parseRetryAfterMs(errorMessage = "") {
  const match = errorMessage.match(/(\d+)m([\d.]+)s/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseFloat(match[2]);
    return (minutes * 60 + seconds) * 1000;
  }
  const secMatch = errorMessage.match(/in\s+([\d.]+)s/);
  if (secMatch) return parseFloat(secMatch[1]) * 1000;
  return 2 * 60 * 1000;   // default 2 min cooldown
}

function markRateLimited(provider, model, errorMessage) {
  const retryMs = parseRetryAfterMs(errorMessage);
  const until   = Date.now() + retryMs;
  const mins    = Math.ceil(retryMs / 60000);

  provider.modelLimits[model] = { until };

  console.warn(
    `  🚫 [${provider.name}/${model}] Rate limited ~${mins} min ` +
    `(until ${new Date(until).toLocaleTimeString()})`
  );
}

function isAvailable(provider) {
  if (!provider.isRateLimited) return true;
  if (Date.now() >= provider.rateLimitUntil) {
    provider.isRateLimited  = false;
    provider.rateLimitUntil = null;
    console.log(`  ✅ [${provider.name}] Rate limit cleared.`);
    return true;
  }
  const remainingMin = Math.ceil((provider.rateLimitUntil - Date.now()) / 60000);
  console.log(`  ⏭️  [${provider.name}] Still locked (~${remainingMin} min left). Skipping.`);
  return false;
}

function isModelAvailable(provider, model) {
  const limit = provider.modelLimits[model];
  if (!limit) return true;
  if (Date.now() >= limit.until) {
    delete provider.modelLimits[model];
    console.log(`  ✅ [${provider.name}/${model}] Model rate limit cleared.`);
    return true;
  }
  const mins = Math.ceil((limit.until - Date.now()) / 60000);
  console.log(`  ⏭️  [${provider.name}/${model}] Model locked (~${mins} min). Skipping.`);
  return false;
}

// ── Per-type API callers ───────────────────────────────────────────────────────

function stripThinkBlocks(raw) {
  if (!raw) return raw;
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function callGroq(provider, { model, messages, temperature, max_tokens }) {
  const GROQ_TIMEOUT_MS = 30_000;
  const controller      = new AbortController();
  const timer           = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const res = await provider.client.chat.completions.create(
      { model, messages, temperature, max_tokens },
      { signal: controller.signal }
    );
    const content = res.choices[0].message.content;
    if (!content || !content.trim()) throw new Error("Groq returned empty content");
    return stripThinkBlocks(content.trim());
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(provider, { model, messages, temperature, max_tokens }) {
  const apiKey = provider.apiKey;
  if (!apiKey) throw new Error(`No API key configured for ${provider.name}`);

  const contents = [];
  let systemText = "";

  for (const m of messages) {
    if (m.role === "system") {
      systemText = m.content;
    } else {
      const text = systemText ? `${systemText}\n\n${m.content}` : m.content;
      systemText = "";
      contents.push({
        role:  m.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      });
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res  = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      contents,
      generationConfig: { temperature, maxOutputTokens: max_tokens },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err     = new Error(errText);
    err.status    = res.status;
    throw err;
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || !text.trim()) throw new Error("Gemini returned empty response");
  return text.trim();
}

// ── Core queue function ────────────────────────────────────────────────────────

export async function llmCall({
  task        = "default",
  messages,
  temperature = 0.4,
  max_tokens  = 500,
}) {
  const errors = [];

  for (const provider of PROVIDERS) {
    if (!isAvailable(provider)) continue;

    const model = provider.models[task] || provider.models.default;

    if (!isModelAvailable(provider, model)) {
      errors.push(`[${provider.name}/${model}] model rate-limited`);
      continue;
    }

    try {
      console.log(`  🤖 [${provider.name}] Trying model: ${model}`);

      let text;
      if (provider.type === "groq") {
        text = await callGroq(provider, { model, messages, temperature, max_tokens });
      } else if (provider.type === "gemini") {
        text = await callGemini(provider, { model, messages, temperature, max_tokens });
      }

      console.log(`  ✅ [${provider.name}] Success.`);
      return { text, provider: provider.name, model };

    } catch (err) {
      const status  = err.status || 0;
      const message = err.message || "";

      // ── Timeout / hang — treat as soft rate limit, not network drop ──────────
      // A 30s AbortError on Groq almost always means token cap exceeded,
      // not a real network failure. Apply a 2-min cooldown on that model.
      const isTimeout =
        err.name === "AbortError" ||
        message.includes("aborted");

      if (isTimeout) {
        console.warn(`  ⏱️  [${provider.name}/${model}] Request timed out — likely token cap. Cooling down 2 min.`);
        markRateLimited(provider, model, "Timed out. Retry in 2m0.0s");
        errors.push(`[${provider.name}/${model}] timeout → cooldown`);
        continue;
      }

      // ── Real network drops — skip immediately, no cooldown ────────────────────
      const isNetworkDrop =
        message.includes("Premature close") ||
        message.includes("socket hang up")  ||
        message.includes("ECONNRESET");

      if (isNetworkDrop) {
        console.warn(`  ⚠️  [${provider.name}] Network drop. Skipping to next provider.`);
        errors.push(`[${provider.name}] network drop: ${message.slice(0, 80)}`);
        continue;
      }

      // ── Rate limit / quota errors ─────────────────────────────────────────────
      const isRateLimit =
        status === 429 ||
        message.toLowerCase().includes("rate limit")     ||
        message.toLowerCase().includes("quota")          ||
        message.toLowerCase().includes("context_length") ||
        message.toLowerCase().includes("tokens per day") ||
        message.toLowerCase().includes("tpd")            ||
        message.toLowerCase().includes("token")          ||
        message.toLowerCase().includes("requests per");

      if (isRateLimit) {
        markRateLimited(provider, model, message);
        errors.push(`[${provider.name}/${model}] rate-limited`);
        continue;
      }

      console.error(`  ❌ [${provider.name}] Error ${status}: ${message.slice(0, 200)}`);
      errors.push(`[${provider.name}] error ${status}: ${message.slice(0, 100)}`);
      continue;
    }
  }

  throw new Error(`All LLM providers exhausted.\n${errors.join("\n")}`);
}

// ── Optional: provider status ─────────────────────────────────────────────────

export function getLLMProviderStatus() {
  return PROVIDERS.map((p) => ({
    name:           p.name,
    type:           p.type,
    available:      !p.isRateLimited || Date.now() >= (p.rateLimitUntil ?? 0),
    modelLimits:    Object.fromEntries(
      Object.entries(p.modelLimits).map(([m, v]) => [m, new Date(v.until).toISOString()])
    ),
    rateLimitUntil: p.rateLimitUntil
      ? new Date(p.rateLimitUntil).toISOString()
      : null,
  }));
}