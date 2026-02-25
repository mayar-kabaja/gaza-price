"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AreaPicker } from "@/components/onboarding/AreaPicker";
import { Area } from "@/types/app";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const done = localStorage.getItem(LOCAL_STORAGE_KEYS.onboarding_done);
    if (done) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/areas");
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setLoadError(typeof data?.message === "string" ? data.message : "تعذر تحميل المناطق");
        setAreas([]);
        return;
      }
      setLoadError(null);
      setAreas(data?.areas ?? []);
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleSelect(area: Area) {
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEYS.area, JSON.stringify(area));
      localStorage.setItem(LOCAL_STORAGE_KEYS.onboarding_done, "1");

      // Save to Supabase contributor row
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Upsert contributor with selected area
        await supabase.from("contributors").upsert({
          id: session.user.id,
          anon_session_id: session.user.id,
          area_id: area.id,
          trust_level: "new",
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }

      router.replace("/");
    } catch {
      setLoading(false);
    }
  }

  return <AreaPicker areas={areas} onSelect={handleSelect} loading={loading} loadError={loadError} />;
}
