"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  central: "وسط غزة",
  south: "جنوب غزة",
  north: "شمال غزة",
};

interface AppHeaderProps {
  hideActions?: boolean;
  hideSearch?: boolean;
}

export function AppHeader({ hideActions = false, hideSearch = false }: AppHeaderProps) {
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
  const govOrder = ["central", "south", "north"];

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
  <>
    <div className="bg-olive px-5 pt-4 pb-3 relative overflow-visible flex-shrink-0 z-30">
      {/* BG circles (clipped to header) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-44 h-44 rounded-full bg-white/5 -bottom-14 -left-12" />
        <div className="absolute w-24 h-24 rounded-full bg-white/4 -top-8 right-5" />
      </div>

      {/* Top row */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="w-8 h-8 rounded-full" />
          <span className="font-display font-extrabold text-xl text-white leading-none">
            غزة <span className="text-sand">بريس</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
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

      {!hideActions && (
        <p className="text-[13px] text-white/60 font-body mb-3 relative z-10">
          أسعار شفافة · قوة المجتمع
        </p>
      )}

      {/* Quick action pills */}
      {!hideActions && (
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <button
          type="button"
          onClick={() => setOpenAreaPicker(true)}
          className={cn(
            "flex-1 flex items-center justify-center gap-[5px] bg-white/95 dark:bg-white/12 dark:border dark:border-white/20 rounded-2xl px-3 py-1.5 text-[13px] font-semibold text-mist dark:text-white font-body transition-all cursor-pointer hover:bg-white dark:hover:bg-white/20",
            areaJustChanged && "ring-2 ring-white shadow-[0_0_0_2px_rgba(255,255,255,0.3)]"
          )}
        >
          {!areaJustChanged && <div className="w-1.5 h-1.5 rounded-full bg-sand" />}
          {area?.name_ar || "المنطقة"}
        </button>
        <Link
          href="/reports"
          className="flex-1 flex items-center justify-center gap-1.5 bg-white/95 dark:bg-white/12 dark:border dark:border-white/20 rounded-2xl px-3 py-1.5 text-[13px] font-semibold text-mist dark:text-white font-body transition-colors hover:bg-white dark:hover:bg-white/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          تقاريري
        </Link>
        <Link
          href="/favorites"
          className="flex-1 flex items-center justify-center gap-1.5 bg-white/95 dark:bg-white/12 dark:border dark:border-white/20 rounded-2xl px-3 py-1.5 text-[13px] font-semibold text-mist dark:text-white font-body transition-colors hover:bg-white dark:hover:bg-white/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          المفضلة
        </Link>
      </div>
      )}

      {/* SearchBar */}
      {!hideSearch && (
        <div className={cn("relative z-10", !hideActions && "mb-1")}>
          <SearchBar hideActions={hideActions} />
        </div>
      )}

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
              <div className="mx-4 my-2 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                {areaError || "تعذر تحميل المناطق"}
              </div>
            )}
            <div className="overflow-y-auto no-scrollbar flex-1 px-4 py-3 pb-8">
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
  </>
  );
}
