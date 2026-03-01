"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ConfirmFlagExclusivityContextValue = {
  confirmedByMe: Record<string, boolean>;
  flaggedByMe: Record<string, boolean>;
  setConfirmedByMe: (priceId: string, value: boolean) => void;
  setFlaggedByMe: (priceId: string, value: boolean) => void;
};

const ConfirmFlagExclusivityContext = createContext<ConfirmFlagExclusivityContextValue | null>(null);

export function ConfirmFlagExclusivityProvider({ children }: { children: ReactNode }) {
  const [confirmedByMe, setConfirmedByMeState] = useState<Record<string, boolean>>({});
  const [flaggedByMe, setFlaggedByMeState] = useState<Record<string, boolean>>({});

  const setConfirmedByMe = useCallback((priceId: string, value: boolean) => {
    setConfirmedByMeState((prev) => (prev[priceId] === value ? prev : { ...prev, [priceId]: value }));
  }, []);

  const setFlaggedByMe = useCallback((priceId: string, value: boolean) => {
    setFlaggedByMeState((prev) => (prev[priceId] === value ? prev : { ...prev, [priceId]: value }));
  }, []);

  return (
    <ConfirmFlagExclusivityContext.Provider
      value={{ confirmedByMe, flaggedByMe, setConfirmedByMe, setFlaggedByMe }}
    >
      {children}
    </ConfirmFlagExclusivityContext.Provider>
  );
}

export function useConfirmFlagExclusivity() {
  const ctx = useContext(ConfirmFlagExclusivityContext);
  return (
    ctx ?? {
      confirmedByMe: {} as Record<string, boolean>,
      flaggedByMe: {} as Record<string, boolean>,
      setConfirmedByMe: () => {},
      setFlaggedByMe: () => {},
    }
  );
}
