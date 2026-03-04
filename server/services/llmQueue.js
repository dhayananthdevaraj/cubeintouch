import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// ── Provider Definitions ───────────────────────────────────────────────────────

const PROVIDERS = [
  {
    name:   "groq-1",
    type:   "groq",
    client: new Groq({ apiKey: process.env.GROQ_API_KEY }),
    models: {
      default:  "llama-3.3-70b-versatile",
      qc:       "openai/gpt-oss-20b",
      analysis: "llama-3.3-70b-versatile",
    },
    isRateLimited:  false,
    rateLimitUntil: null,
  },
  {
    name:   "gemini",
    type:   "gemini",
    client: null,
    models: {
      default:  "gemini-2.5-flash",
      qc:       "gemini-2.5-flash",
      analysis: "gemini-2.5-flash",
    },
    isRateLimited:  false,
    rateLimitUntil: null,
  },
  {
    name:   "groq-2",
    type:   "groq",
    client: new Groq({ apiKey: process.env.GROQ_API_KEY_2 }),
    models: {
      default:  "llama-3.3-70b-versatile",
      qc:       "openai/gpt-oss-20b",
      analysis: "llama-3.3-70b-versatile",
    },
    isRateLimited:  false,
    rateLimitUntil: null,
  },
];

// ── Rate limit helpers ─────────────────────────────────────────────────────────

/**
 * Parse retry-after duration from Groq's error message.
 * Example: "Please try again in 30m32.543s"
 */
function parseRetryAfterMs(errorMessage = "") {
  const match = errorMessage.match(/(\d+)m([\d.]+)s/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseFloat(match[2]);
    return (minutes * 60 + seconds) * 1000;
  }
  const secMatch = errorMessage.match(/in\s+([\d.]+)s/);
  if (secMatch) return parseFloat(secMatch[1]) * 1000;

  return 5 * 60 * 1000; // Default: 5 min if unparseable
}

function markRateLimited(provider, errorMessage) {
  const retryMs           = parseRetryAfterMs(errorMessage);
  provider.isRateLimited  = true;
  provider.rateLimitUntil = Date.now() + retryMs;
  const mins              = Math.ceil(retryMs / 60000);
  console.warn(
    `  🚫 [${provider.name}] Rate limited. Locked for ~${mins} min ` +
    `(until ${new Date(provider.rateLimitUntil).toLocaleTimeString()})`
  );
}

function isAvailable(provider) {
  if (!provider.isRateLimited) return true;
  if (Date.now() >= provider.rateLimitUntil) {
    provider.isRateLimited  = false;
    provider.rateLimitUntil = null;
    console.log(`  ✅ [${provider.name}] Rate limit cleared. Available again.`);
    return true;
  }
  const remainingMin = Math.ceil((provider.rateLimitUntil - Date.now()) / 60000);
  console.log(`  ⏭️  [${provider.name}] Still locked (~${remainingMin} min left). Skipping.`);
  return false;
}

// ── Per-type API callers ───────────────────────────────────────────────────────

async function callGroq(provider, { model, messages, temperature, max_tokens }) {
  const res = await provider.client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });
  return res.choices[0].message.content.trim();
}

async function callGemini(provider, { model, messages, temperature, max_tokens }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in .env");

  // Gemini doesn't support "system" role — merge into first user message
  const contents = [];
  let systemText  = "";

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

  const url  = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents,
    generationConfig: { temperature, maxOutputTokens: max_tokens },
  };

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err     = new Error(errText);
    err.status    = res.status;
    throw err;
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text.trim();
}

// ── Core queue function ────────────────────────────────────────────────────────

/**
 * Call LLM with automatic fallback: Groq-1 → Gemini → Groq-2
 *
 * @param {object} opts
 * @param {"default"|"qc"|"analysis"} opts.task  - Model slot per provider
 * @param {Array}  opts.messages                  - OpenAI-style messages array
 * @param {number} [opts.temperature=0.4]
 * @param {number} [opts.max_tokens=500]
 * @returns {Promise<{ text: string, provider: string, model: string }>}
 */
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

      const isRateLimit =
        status === 429 ||
        message.toLowerCase().includes("rate limit")     ||
        message.toLowerCase().includes("quota")          ||
        message.toLowerCase().includes("tokens per day") ||
        message.toLowerCase().includes("tpd");

      if (isRateLimit) {
        markRateLimited(provider, message);
        errors.push(`[${provider.name}] rate-limited`);
        continue;
      }

      console.error(`  ❌ [${provider.name}] Error ${status}: ${message.slice(0, 200)}`);
      errors.push(`[${provider.name}] error ${status}: ${message.slice(0, 100)}`);
      continue;
    }
  }

  throw new Error(`All LLM providers exhausted.\n${errors.join("\n")}`);
}

// ── Optional: provider status (for /health/llm route) ────────────────────────

export function getLLMProviderStatus() {
  return PROVIDERS.map((p) => ({
    name:           p.name,
    type:           p.type,
    available:      !p.isRateLimited || Date.now() >= (p.rateLimitUntil ?? 0),
    rateLimitUntil: p.rateLimitUntil
      ? new Date(p.rateLimitUntil).toISOString()
      : null,
  }));
}