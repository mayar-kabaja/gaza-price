"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AreaPicker } from "@/components/onboarding/AreaPicker";
import { Area } from "@/types/app";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { getStoredToken, setStoredToken } from "@/lib/auth/token";
import { apiFetch } from "@/lib/api/fetch";
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

      let token = getStoredToken();
      if (!token) {
        const res = await apiFetch("/api/auth/session", { method: "GET", credentials: "include" });
        const data = await res.json();
        if (data?.access_token) {
          token = data.access_token as string;
          setStoredToken(token);
        }
      }
      if (token) {
        await apiFetch("/api/contributors/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          credentials: "include",
          body: JSON.stringify({ area_id: area.id }),
        });
      }

      router.replace("/");
    } catch {
      setLoading(false);
    }
  }

  return <AreaPicker areas={areas} onSelect={handleSelect} loading={loading} loadError={loadError} />;
}
