"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Area } from "@/types/app";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";

interface AreaContextValue {
  area: Area | null;
  saveArea: (a: Area) => void;
  clearArea: () => void;
}

const AreaContext = createContext<AreaContextValue | null>(null);

export function AreaProvider({ children }: { children: ReactNode }) {
  const [area, setArea] = useState<Area | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.area);
    if (stored) {
      try {
        setArea(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const saveArea = useCallback((a: Area) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.area, JSON.stringify(a));
    setArea(a);
  }, []);

  const clearArea = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.area);
    setArea(null);
  }, []);

  return (
    <AreaContext.Provider value={{ area, saveArea, clearArea }}>
      {children}
    </AreaContext.Provider>
  );
}

export function useAreaContext(): AreaContextValue {
  const ctx = useContext(AreaContext);
  if (!ctx) {
    throw new Error("useAreaContext must be used within AreaProvider");
  }
  return ctx;
}
