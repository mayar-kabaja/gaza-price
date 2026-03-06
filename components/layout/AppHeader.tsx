"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useArea } from "@/hooks/useArea";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { SearchBar } from "@/components/search/SearchBar";
import type { Area } from "@/types/app";
import { cn } from "@/lib/utils";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";
import { useAreas, useUpdateContributorMe } from "@/lib/queries/hooks";

const GOV_LABELS: Record<string, string> = {
  north: "شمال غزة",
  central: "وسط القطاع",
  south: "جنوب غزة",
};

export function AppHeader() {
  const router = useRouter();
  const { area, saveArea } = useArea();
  const { accessToken } = useSession();
  const [openAreaPicker, setOpenAreaPicker] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [areaJustChanged, setAreaJustChanged] = useState(false);

  const { theme, toggle: toggleTheme } = useTheme();
  const { data: areasData, isError: areasError } = useAreas();
  const areas = areasData?.areas ?? [];
  const updateMe = useUpdateContributorMe();

  useEffect(() => {
    if (areaJustChanged) {
      const t = setTimeout(() => setAreaJustChanged(false), 1500);
      return () => clearTimeout(t);
    }
  }, [areaJustChanged]);

  const grouped = areas.reduce<Record<string, Area[]>>((acc, a) => {
    const g = a.governorate;
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});
  const govOrder = ["north", "central", "south"];

  async function handleSelectArea(selected: Area) {
    const wasDifferent = area?.id !== selected.id;
    saveArea(selected);
    setAreaError(null);
    setOpenAreaPicker(false);
    if (wasDifferent) setAreaJustChanged(true);
    try {
      await updateMe.mutateAsync({
        area_id: selected.id,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
    } catch (err: unknown) {
      const res = err && typeof err === "object" && "status" in err ? { status: (err as { status: number }).status } : { status: 500 };
      const data = err && typeof err === "object" && "data" in err ? (err as { data: ApiErrorResponse }).data : {};
      handleApiError(res as Response, data, setAreaError, router);
      setOpenAreaPicker(true);
    }
  }

  return (
    <div className="bg-olive px-5 pt-4 pb-5 relative overflow-visible flex-shrink-0 z-30">
      {/* BG circles (clipped to header) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-44 h-44 rounded-full bg-white/5 -bottom-14 -left-12" />
        <div className="absolute w-24 h-24 rounded-full bg-white/4 -top-8 right-5" />
      </div>

      {/* Top row */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="w-8 h-8 rounded-lg" />
          <span className="font-display font-extrabold text-xl text-white leading-none">
            غزة <span className="text-sand">بريس</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {area ? (
          <button
            type="button"
            onClick={() => setOpenAreaPicker(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 transition-all text-right cursor-pointer",
              areaJustChanged
                ? "bg-white/25 border-2 border-white shadow-[0_0_0_2px_rgba(255,255,255,0.3)]"
                : "bg-white/12 border border-white/20 hover:bg-white/20"
            )}
            aria-label="تغيير المنطقة"
          >
            {areaJustChanged ? (
              <span className="text-white" aria-hidden></span>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-sand" />
            )}
            <span className="text-[11px] text-white/90 font-body">{area.name_ar}</span>
          </button>
        ) : null}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors cursor-pointer"
            aria-label={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <p className="text-[13px] text-white/60 font-body mb-3 relative z-10">
        أسعار شفافة · قوة المجتمع
      </p>

      <SearchBar />

      {/* Area picker sheet */}
      {openAreaPicker && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            aria-hidden
            onClick={() => setOpenAreaPicker(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl max-h-[75vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.15)]">
            <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
              <h2 className="font-display font-bold text-ink">اختر المنطقة</h2>
              <button
                type="button"
                onClick={() => setOpenAreaPicker(false)}
                className="text-mist hover:text-ink p-1 text-lg leading-none"
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            {(areaError || areasError) && (
              <div className="mx-4 mt-2 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {areaError || "تعذر تحميل المناطق"}
              </div>
            )}
            <div className="overflow-y-auto no-scrollbar flex-1 px-4 py-3">
              {govOrder.map((gov) => {
                const govAreas = grouped[gov];
                if (!govAreas?.length) return null;
                return (
                  <div key={gov} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[11px] font-bold text-mist uppercase tracking-widest">
                        {GOV_LABELS[gov]}
                      </span>
                    </div>
                    {govAreas.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleSelectArea(a)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-2xl border-[1.5px] mb-2 transition-all text-right",
                          area?.id === a.id
                            ? "border-olive bg-olive-pale"
                            : "border-border bg-surface hover:border-olive-mid"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            area?.id === a.id ? "border-olive bg-olive" : "border-border"
                          )}
                        >
                          {area?.id === a.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={cn("font-display font-bold text-sm", area?.id === a.id ? "text-olive-deep" : "text-ink")}>
                            {a.name_ar}
                          </div>
                          <div className="text-xs text-mist mt-0.5">{GOV_LABELS[a.governorate]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
