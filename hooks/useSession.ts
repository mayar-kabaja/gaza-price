"use client";

import { useEffect, useState, useCallback } from "react";
import { Contributor } from "@/types/app";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/auth/token";

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

export function useSession() {
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    let token = getStoredToken();

    if (!token) {
      try {
        const res = await fetch("/api/auth/session", { method: "GET", credentials: "include" });
        const data = await res.json();
        if (!res.ok || !data?.access_token) {
          setAccessToken(null);
          setContributor(null);
          return;
        }
        token = data.access_token;
        setStoredToken(token);
      } catch {
        setAccessToken(null);
        setContributor(null);
        return;
      }
    }

    setAccessToken(token);

    try {
      const res = await fetch("/api/contributors/me", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.status === 401) {
        clearStoredToken();
        setAccessToken(null);
        setContributor(null);
        return;
      }
      if (!res.ok) {
        setContributor(null);
        return;
      }
      const data = await res.json();
      const me = data?.id != null ? data : (data.contributor ?? data);
      if (me?.id) {
        setContributor(mapMeToContributor(me as MeResponse));
      } else {
        setContributor(null);
      }
    } catch {
      setContributor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { contributor, loading, accessToken };
}
