"use client";

import { useSyncExternalStore } from "react";

type ConnectionQuality = "slow" | "fast";

function getSnapshot(): ConnectionQuality {
  if (typeof navigator === "undefined") return "fast";
  const conn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (!conn) return "fast";
  if (conn.saveData) return "slow";
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") return "slow";
  return "fast";
}

function getServerSnapshot(): ConnectionQuality {
  return "fast";
}

function subscribe(callback: () => void): () => void {
  const conn = typeof navigator !== "undefined"
    ? (navigator as unknown as { connection?: EventTarget }).connection
    : undefined;
  if (conn) {
    conn.addEventListener("change", callback);
    return () => conn.removeEventListener("change", callback);
  }
  return () => {};
}

export function useConnectionQuality(): ConnectionQuality {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
