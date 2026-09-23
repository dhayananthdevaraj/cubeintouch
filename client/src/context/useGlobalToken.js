// src/context/useGlobalToken.js
import { useContext } from "react";
import { GlobalTokenContext } from "./globalTokenContextInstance";

export function useGlobalToken() {
  const ctx = useContext(GlobalTokenContext);
  if (!ctx) throw new Error("useGlobalToken must be used within GlobalTokenProvider");
  return ctx;
}
