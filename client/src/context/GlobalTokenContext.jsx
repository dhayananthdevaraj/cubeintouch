// src/context/GlobalTokenContext.jsx
//
// One shared Examly token for the whole app, pasted once when the site opens.
// Every tool page used to have its own "paste your token" welcome screen with
// its own localStorage key — this still works exactly as before under the
// hood (nothing in those pages was rewritten), but saveToken() also seeds
// every one of those legacy keys so a page's own gate finds a token already
// there and never shows itself. Examly's own session token can reset at any
// time server-side, so there is no client-side expiry to track — only when
// it was last pasted, surfaced in the profile chip so the user knows how
// stale it might be.
import { useState, useCallback, useMemo } from "react";
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

function readInitial() {
  try {
    return {
      token: localStorage.getItem(GLOBAL_TOKEN_KEY) || "",
      pastedAt: localStorage.getItem(GLOBAL_PASTED_AT_KEY) || "",
    };
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
    try {
      localStorage.removeItem(GLOBAL_TOKEN_KEY);
      localStorage.removeItem(GLOBAL_PASTED_AT_KEY);
      LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch { /* ignore */ }
    // Logging out unmounts <BrowserRouter> entirely (AppShell swaps to the
    // blocking TokenGate) without the router ever navigating, so the address
    // bar is left on whatever tool page was open. Reset it to "/" so the
    // router starts fresh at the Dashboard once a new token is pasted.
    try { window.history.replaceState(null, "", "/"); } catch { /* ignore */ }
    setState({ token: "", pastedAt: "" });
  }, []);

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
