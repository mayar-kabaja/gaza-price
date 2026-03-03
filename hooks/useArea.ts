"use client";

import { useAreaContext } from "@/contexts/AreaContext";

/** Re-export useAreaContext as useArea for backward compatibility. Requires AreaProvider. */
export function useArea() {
  return useAreaContext();
}
