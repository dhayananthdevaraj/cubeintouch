// src/context/GlobalTokenContext.jsx
//
// One shared Examly token for the whole app, pasted once when the site opens.
// Every tool page used to have its own "paste your token" welcome screen with
// its own localStorage key — this still works exactly as before under the
// hood (nothing in those pages was rewritten), but saveToken() also seeds
// every one of those legacy keys so a page's own gate finds a token already
// there and never shows itself.
//
// Day-boundary expiry: a token is only trusted for the calendar day it was
// pasted on (local time) — open the site on a new day and it's treated as
// expired even though Examly's own server-side session may still be valid,
// so the user re-confirms daily rather than silently riding a stale paste.
// This is separate from Examly's own unpredictable server-side resets,
// which still show up as ordinary 401s mid-session.
import { useState, useCallback, useMemo, useEffect } from "react";
import { decodeJwt, formatClaimName } from "../utils/jwt";
import { GlobalTokenContext } from "./globalTokenContextInstance";

const GLOBAL_TOKEN_KEY = "examly_global_token";
const GLOBAL_PASTED_AT_KEY = "examly_global_token_pasted_at";

const LEGACY_TOKEN_KEYS = [
  "examly_token",
  "mcq_qc_token",
  "examly_token_meta",
  "examly_token_meta_university",
  "examly_token_university",
  "examly_token_blanksync_university",
  "examly_token_cod_corporate",
  "examly_token_cod_university",
  "examly_token_fu_university",
  "examly_token_mcq_corporate",
  "examly_token_mcq_university",
  "examly_token_testpack_university",
  "examly_token_mysqlschema_support",
];

/** True once local calendar day has moved past the day `pastedAtIso` was recorded on. */
function isExpired(pastedAtIso) {
  if (!pastedAtIso) return false; // no timestamp on record — don't force-expire, treat as valid
  const pasted = new Date(pastedAtIso);
  if (Number.isNaN(pasted.getTime())) return false;
  return pasted.toDateString() !== new Date().toDateString();
}

function clearAllTokenStorage() {
  try {
    localStorage.removeItem(GLOBAL_TOKEN_KEY);
    localStorage.removeItem(GLOBAL_PASTED_AT_KEY);
    LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch { /* ignore */ }
}

function readInitial() {
  try {
    const token = localStorage.getItem(GLOBAL_TOKEN_KEY) || "";
    const pastedAt = localStorage.getItem(GLOBAL_PASTED_AT_KEY) || "";
    if (token && isExpired(pastedAt)) {
      clearAllTokenStorage();
      return { token: "", pastedAt: "" };
    }
    return { token, pastedAt };
  } catch {
    return { token: "", pastedAt: "" };
  }
}

export function GlobalTokenProvider({ children }) {
  const [{ token, pastedAt }, setState] = useState(readInitial);
  const [showGate, setShowGate] = useState(false);

  const saveToken = useCallback((rawToken) => {
    const tok = (rawToken || "").trim();
    if (!tok) return;
    const now = new Date().toISOString();
    try {
      localStorage.setItem(GLOBAL_TOKEN_KEY, tok);
      localStorage.setItem(GLOBAL_PASTED_AT_KEY, now);
      LEGACY_TOKEN_KEYS.forEach((key) => localStorage.setItem(key, tok));
    } catch { /* ignore */ }
    setState({ token: tok, pastedAt: now });
    setShowGate(false);
  }, []);

  const logout = useCallback(() => {
    clearAllTokenStorage();
    // Logging out unmounts <BrowserRouter> entirely (AppShell swaps to the
    // blocking TokenGate) without the router ever navigating, so the address
    // bar is left on whatever tool page was open. Reset it to "/" so the
    // router starts fresh at the Dashboard once a new token is pasted.
    try { window.history.replaceState(null, "", "/"); } catch { /* ignore */ }
    setState({ token: "", pastedAt: "" });
  }, []);

  // Covers a tab left open across the midnight boundary (readInitial only
  // catches a fresh load/reload) — schedule a check for the next local
  // midnight and log out if the current token has just crossed into a new day.
  useEffect(() => {
    if (!token) return undefined;
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0);
    const timer = setTimeout(() => {
      if (isExpired(pastedAt)) logout();
    }, nextMidnight.getTime() - now.getTime());
    return () => clearTimeout(timer);
  }, [token, pastedAt, logout]);

  const openGate = useCallback(() => setShowGate(true), []);
  const closeGate = useCallback(() => setShowGate(false), []);

  const claims = useMemo(() => decodeJwt(token), [token]);
  const displayName = useMemo(
    () => formatClaimName(claims?.name) || claims?.email || "",
    [claims]
  );

  const value = useMemo(
    () => ({
      token,
      pastedAt,
      claims,
      displayName,
      hasToken: !!token,
      showGate,
      saveToken,
      logout,
      openGate,
      closeGate,
    }),
    [token, pastedAt, claims, displayName, showGate, saveToken, logout, openGate, closeGate]
  );

  return <GlobalTokenContext.Provider value={value}>{children}</GlobalTokenContext.Provider>;
}
