// src/utils/jwt.js
//
// Lightweight JWT payload decoder for DISPLAY purposes only (profile chip,
// "Welcome <name>", claims breakdown). No signature verification — the token
// is still sent to Examly as-is for every real API call.

/** Decode a JWT's payload segment to a plain object, or null if it isn't one. */
export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Examly's `name` claim often arrives as "First$Last" — normalize for display. */
export function formatClaimName(name) {
  if (!name) return "";
  return name.replace(/\$/g, " ").replace(/\s+/g, " ").trim();
}

/** "11:59 PM" for today, "Sep 23, 11:59 PM" otherwise. */
export function formatPastedAt(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;

  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${date}, ${time}`;
}
