"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AreaPicker } from "@/components/onboarding/AreaPicker";
import { Area } from "@/types/app";
import { useArea } from "@/hooks/useArea";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import { getStoredToken, setStoredToken } from "@/lib/auth/token";
import { apiFetch } from "@/lib/api/fetch";
import { useAreas } from "@/lib/queries/hooks";
import { LoaderDots } from "@/components/ui/LoaderDots";

export default function OnboardingPage() {
  const router = useRouter();
  const { saveArea } = useArea();
  const [loading, setLoading] = useState(false);

  const { data: areasData, isError: areasError, isLoading: areasLoading, refetch } = useAreas({ retry: 3 });
  const areas = areasData?.areas ?? [];
  const loadError = areasError ? "تعذر تحميل المناطق — تحقق من اتصالك بالإنترنت" : null;

  useEffect(() => {
    const done = localStorage.getItem(LOCAL_STORAGE_KEYS.onboarding_done);
    if (done) router.replace("/");
  }, [router]);

  async function handleSelect(area: Area) {
    setLoading(true);
    try {
      saveArea(area);
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

  if ((areasLoading || areasError) && areas.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ background: "#1A1F2E" }}>
        <div className="absolute w-[200px] h-[200px] rounded-full bg-olive/15 -top-14 -left-14" />
        <div className="absolute w-[150px] h-[150px] rounded-full bg-sand/10 -bottom-8 -right-10" />
        <div className="relative z-10 text-center">
          <h1 className="font-display font-extrabold text-[2.8rem] text-white leading-none">
            غزة <span className="text-sand">بريس</span>
          </h1>
          {areasError ? (
            <>
              <p className="text-sm text-red-400 mt-2.5 font-body">تعذر الاتصال بالخادم</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-5 px-6 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-body"
              >
                إعادة المحاولة
              </button>
            </>
          ) : (
            <p className="text-sm text-white/45 mt-2.5 font-body">جاري تحميل المناطق...</p>
          )}
        </div>
        {!areasError && <LoaderDots className="relative z-10 mt-10" variant="light" />}
      </div>
    );
  }

  return <AreaPicker areas={areas} onSelect={handleSelect} loading={loading} loadError={loadError} />;
}
