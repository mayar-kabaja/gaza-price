"use client";

import { useSessionContext } from "@/contexts/SessionContext";

/**
 * Session hook — uses shared SessionProvider. Only one /contributors/me fetch
 * for the entire app, no matter how many components call useSession().
 */
export function useSession() {
  return useSessionContext();
}
