"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Contributor } from "@/types/app";

export function useSession() {
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await supabase
        .from("contributors")
        .select("*, area:areas(*)")
        .eq("id", session.user.id)
        .single();

      setContributor(data);
      setLoading(false);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  return { contributor, loading };
}
