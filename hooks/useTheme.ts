"use client";

import { useSyncExternalStore, useCallback } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function applyTheme(next: Theme) {
  if (next === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((cb) => cb());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return { theme, toggle } as const;
}
