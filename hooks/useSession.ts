"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Contributor } from "@/types/app";

export function useSession() {
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await fetch("/api/auth/session", { credentials: "include" });
        const again = await supabase.auth.getSession();
        session = again.data.session;
      }
      if (!session) {
        setAccessToken(null);
        setLoading(false);
        return;
      }
      setAccessToken(session.access_token);

      const { data } = await supabase
        .from("contributors")
        .select("*, area:areas(*)")
        .eq("id", session.user.id)
        .maybeSingle();

      setContributor(data ?? null);
      setLoading(false);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  return { contributor, loading, accessToken };
}
