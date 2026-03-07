"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { Contributor } from "@/types/app";
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
} from "@/lib/auth/token";
import { apiFetch } from "@/lib/api/fetch";

/** Backend /contributors/me shape. */
type MeResponse = {
  id: string;
  handle: string | null;
  area: { id: string; name_ar: string } | null;
  trust_level: string;
  report_count: number;
  confirmation_count: number;
  trust_score_total?: number;
  joined_at: string;
  last_active_at: string;
};

function mapMeToContributor(me: MeResponse): Contributor {
  return {
    id: me.id,
    anon_session_id: me.id,
    display_handle: me.handle ?? undefined,
    area_id: me.area?.id,
    area: me.area
      ? {
          id: me.area.id,
          name_ar: me.area.name_ar,
          governorate: "central",
          is_active: true,
        }
      : undefined,
    trust_level: me.trust_level as Contributor["trust_level"],
    report_count: me.report_count ?? 0,
    confirmation_count: me.confirmation_count ?? 0,
    flag_count: 0,
    is_banned: false,
    joined_at: me.joined_at,
    last_active_at: me.last_active_at,
  };
}

type SessionContextValue = {
  contributor: Contributor | null;
  accessToken: string | null;
  loading: boolean;
  refreshContributor: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContributor = useCallback(async (token: string) => {
    const res = await apiFetch("/api/contributors/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    setContributor(mapMeToContributor(data as MeResponse));
  }, []);

  const load = useCallback(async () => {
    // Skip contributor load on admin routes — admin uses same token key but JWT auth.
    // Loading contributors/me with admin JWT would 404 and clear the token.
    if (pathname?.startsWith("/admin")) {
      setLoading(false);
      return;
    }
    try {
      let token = getStoredToken();

      if (!token) {
        const res = await apiFetch("/api/auth/session", {
          method: "POST",
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error("session failed");
        const data = await res.json();
        token = data.access_token;
        setStoredToken(token!);
      }

      setAccessToken(token);
      await loadContributor(token!);
    } catch {
      clearStoredToken();
      setAccessToken(null);
      setContributor(null);
    } finally {
      setLoading(false);
    }
  }, [loadContributor, pathname]);

  useEffect(() => {
    load();
  }, [load]);

  // When apiFetch refreshes the token and writes to localStorage, sync into state
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = getStoredToken();
      setAccessToken((prev) => (stored !== prev ? stored : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const refreshContributor = useCallback(async () => {
    const token = getStoredToken();
    if (token) await loadContributor(token);
  }, [loadContributor]);

  const value: SessionContextValue = {
    contributor,
    accessToken,
    loading,
    refreshContributor,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionContext must be used within SessionProvider");
  }
  return ctx;
}
