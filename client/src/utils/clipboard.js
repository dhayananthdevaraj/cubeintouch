// src/utils/clipboard.js
//
// navigator.clipboard requires a secure context and can throw/reject in some
// embeddings (e.g. an iframe without the clipboard-write permission) — this
// falls back to the legacy hidden-textarea + execCommand('copy') approach so
// "Copy" buttons keep working rather than silently failing.
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("Clipboard API unavailable");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
