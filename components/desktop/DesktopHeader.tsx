"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
// onMarketClick kept in props for back-compat but no longer used (السوق is now a Link)
import { DesktopSearchBar } from "./DesktopSearchBar";
import type { Area, Governorate } from "@/types/app";
import { useAreas } from "@/lib/queries/hooks";
import { useArea } from "@/hooks/useArea";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const GOV_LABELS: Record<Governorate, string> = {
  central: "وسط غزة",
  south: "جنوب غزة",
  north: "شمال غزة",
};
const GOV_ORDER: Governorate[] = ["central", "south", "north"];

interface DesktopHeaderProps {
  onSubmitClick: () => void;
  onSuggestClick: () => void;
  onNewListingClick?: () => void;
  onMarketClick?: () => void;
  onProfileClick?: () => void;
  isProfileActive?: boolean;
}

export function DesktopHeader({ onSubmitClick, onSuggestClick, onNewListingClick, onMarketClick, onProfileClick, isProfileActive }: DesktopHeaderProps) {
  const { area, saveArea, clearArea } = useArea();
  const { theme, toggle: toggleTheme } = useTheme();
  const { data: areasData } = useAreas();
  const areas = (areasData as { areas?: Area[] })?.areas ?? [];

  const [open, setOpen] = useState(false);
  const [openGovs, setOpenGovs] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const areasByGov = GOV_ORDER.map((gov) => ({
    gov,
    label: GOV_LABELS[gov],
    areas: areas.filter((a) => a.governorate === gov),
  })).filter((g) => g.areas.length > 0);

  return (
    <header className="h-[60px] bg-olive-deep border-b border-white/8 flex items-center gap-4 px-5 z-40">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <img src="/logo.svg" alt="" className="w-[34px] h-[34px] rounded-full" />
        <div>
          <div className="font-display font-extrabold text-[17px] text-white leading-tight">
            غزة<span className="text-sand">بريس</span>
          </div>
          <div className="text-[10px] text-white/50 font-body leading-none">أسعار شفافة</div>
        </div>
      </Link>

      {/* Divider */}
      <div className="w-px h-7 bg-white/12 flex-shrink-0" />

      {/* Search */}
      <DesktopSearchBar />

      {/* Area picker */}
      <div className="relative flex-shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-[5px] rounded-full bg-white/7 border border-white/12 text-white/85 text-[13px] font-body hover:bg-white/12 transition-colors cursor-pointer"
        >
          <span className="w-[7px] h-[7px] rounded-full bg-confirm flex-shrink-0" />
          {area ? area.name_ar : "اختر منطقة"}
          <span className="text-[10px] opacity-60">▾</span>
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-fade-up">
            <div className="max-h-64 overflow-y-auto no-scrollbar p-2">
              {area && (
                <button
                  type="button"
                  onClick={() => { clearArea(); setOpen(false); }}
                  className="w-full px-3 py-1.5 mb-1 rounded-lg text-sm font-body text-sand hover:bg-sand/5 transition-colors text-right cursor-pointer"
                >
                  كل المناطق
                </button>
              )}
              {areasByGov.map((group) => {
                const isGovOpen = openGovs[group.gov] ?? false;
                return (
                  <div key={group.gov}>
                    <button
                      type="button"
                      onClick={() => setOpenGovs((prev) => ({ ...prev, [group.gov]: !prev[group.gov] }))}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-display font-bold text-ink hover:bg-fog transition-colors text-right cursor-pointer"
                    >
                      <span>{group.label}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={cn("text-mist transition-transform", isGovOpen && "rotate-90")}
                      >
                        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                    {isGovOpen && (
                      <div className="mr-3 mt-0.5 space-y-0.5">
                        {group.areas.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => { saveArea(a); setOpen(false); }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-body transition-colors text-right cursor-pointer",
                              area?.id === a.id
                                ? "bg-olive-pale text-olive font-semibold"
                                : "text-slate hover:bg-fog hover:text-ink"
                            )}
                          >
                            <span>{a.name_ar}</span>
                            {a.active_reports_count != null && a.active_reports_count > 0 && (
                              <span className="text-[11px] text-mist bg-fog rounded-full px-2 py-0.5">
                                {a.active_reports_count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Add listing button — only on market pages */}
        {onNewListingClick && (
          <button
            type="button"
            onClick={onNewListingClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sand/90 text-olive-deep text-[12px] font-display font-bold hover:bg-sand transition-all whitespace-nowrap cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            إعلان جديد
          </button>
        )}
        {/* Add product button */}
        <button
          type="button"
          onClick={onSuggestClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-[12px] font-display font-bold hover:bg-white/18 transition-all whitespace-nowrap cursor-pointer"
        >
          أضف منتج
        </button>
        {/* Primary CTA */}
        <button
          type="button"
          onClick={onSubmitClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-sand text-[12px] font-display font-bold hover:bg-white/18 transition-all whitespace-nowrap cursor-pointer"
        >
          أضف سعر
        </button>

        <div className="w-px h-5 bg-white/12 mx-1" />

        {/* Profile */}
        <button
          type="button"
          onClick={onProfileClick}
          className={cn(
            "w-[32px] h-[32px] rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer flex-shrink-0",
            isProfileActive && "bg-white/15 text-white"
          )}
          title="حسابي"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer flex-shrink-0"
          aria-label={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
        >
          {theme === "dark" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
