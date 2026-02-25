"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AreaPicker } from "@/components/onboarding/AreaPicker";
import { Area } from "@/types/app";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useAreas } from "@/lib/queries/hooks";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { data: areasData, isError: areasError } = useAreas();
  const areas = areasData?.areas ?? [];
  const loadError = areasError ? "تعذر تحميل المناطق" : null;

  useEffect(() => {
    const done = localStorage.getItem(LOCAL_STORAGE_KEYS.onboarding_done);
    if (done) router.replace("/");
  }, [router]);

  async function handleSelect(area: Area) {
    setLoading(true);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.area, JSON.stringify(area));
      localStorage.setItem(LOCAL_STORAGE_KEYS.onboarding_done, "1");

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
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
