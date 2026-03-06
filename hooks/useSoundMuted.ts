"use client";

import { useState, useCallback } from "react";

const KEY = "sounds_muted";

export function useSoundMuted(): [boolean, (muted: boolean) => void] {
  const [muted, setMutedState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "true";
  });

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value);
    if (value) {
      localStorage.setItem(KEY, "true");
    } else {
      localStorage.removeItem(KEY);
    }
  }, []);

  return [muted, setMuted];
}
