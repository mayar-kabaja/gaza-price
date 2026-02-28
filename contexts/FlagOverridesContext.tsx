"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type FlagOverridesContextValue = {
  overrides: Record<string, number>;
  setOverride: (priceId: string, count: number) => void;
};

const FlagOverridesContext = createContext<FlagOverridesContextValue | null>(null);

export function FlagOverridesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const setOverride = useCallback((priceId: string, count: number) => {
    setOverrides((prev) => (prev[priceId] === count ? prev : { ...prev, [priceId]: count }));
  }, []);

  return (
    <FlagOverridesContext.Provider value={{ overrides, setOverride }}>
      {children}
    </FlagOverridesContext.Provider>
  );
}

export function useFlagOverrides() {
  const ctx = useContext(FlagOverridesContext);
  return ctx ?? { overrides: {} as Record<string, number>, setOverride: () => {} };
}
