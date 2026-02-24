"use client";

import { useEffect, useState } from "react";
import { Area } from "@/types/app";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

export function useArea() {
  const [area, setArea] = useState<Area | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.area);
    if (stored) {
      try { setArea(JSON.parse(stored)); } catch {}
    }
  }, []);

  function saveArea(a: Area) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.area, JSON.stringify(a));
    setArea(a);
  }

  function clearArea() {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.area);
    setArea(null);
  }

  return { area, saveArea, clearArea };
}
