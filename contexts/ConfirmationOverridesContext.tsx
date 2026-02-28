"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ConfirmationOverridesContextValue = {
  overrides: Record<string, number>;
  setOverride: (priceId: string, count: number) => void;
};

const ConfirmationOverridesContext = createContext<ConfirmationOverridesContextValue | null>(null);

export function ConfirmationOverridesProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const setOverride = useCallback((priceId: string, count: number) => {
    setOverrides((prev) => (prev[priceId] === count ? prev : { ...prev, [priceId]: count }));
  }, []);

  return (
    <ConfirmationOverridesContext.Provider value={{ overrides, setOverride }}>
      {children}
    </ConfirmationOverridesContext.Provider>
  );
}

export function useConfirmationOverrides() {
  const ctx = useContext(ConfirmationOverridesContext);
  return ctx ?? { overrides: {} as Record<string, number>, setOverride: () => {} };
}
