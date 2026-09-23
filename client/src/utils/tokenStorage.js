// src/utils/tokenStorage.js
//
// Every tool page still reads/writes its own localStorage token key (left
// untouched on purpose — see GlobalTokenContext.jsx). This just makes that
// read fall back to the one shared token pasted at site-open, so a page
// whose own key hasn't been written yet (freshly added page, a per-domain
// key like QBAccessCorporate's, or a stale fan-out) still skips its welcome
// screen instead of asking the user to paste again.
const GLOBAL_TOKEN_KEY = "examly_global_token";

export function readToken(pageKey) {
  try {
    return localStorage.getItem(pageKey) || localStorage.getItem(GLOBAL_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}
