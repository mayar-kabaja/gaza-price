"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
  onProfileClick?: () => void;
  isProfileActive?: boolean;
}

export function DesktopHeader({ onSubmitClick, onSuggestClick, onProfileClick, isProfileActive }: DesktopHeaderProps) {
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
    <header className="h-16 bg-olive-deep border-b border-sand/30 grid grid-cols-[280px_1fr] items-center z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="w-8 h-8 rounded-lg" />
          <span className="font-display font-extrabold text-lg text-white">
            غزة<span className="text-sand">بريس</span>
          </span>
        </Link>
        <span className="text-[11px] text-white/50 font-body hidden xl:inline">أسعار شفافة</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-6">
        <DesktopSearchBar />

        {/* Area picker */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/80 text-xs font-body hover:bg-white/20 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-confirm" />
            {area ? area.name_ar : "اختر منطقة"}
            <svg width="10" height="10" viewBox="0 0 10 10" className={cn("text-white/50 transition-transform", open && "rotate-180")}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 animate-fade-up">
              <div className="max-h-64 overflow-y-auto no-scrollbar p-2">
                {/* Clear area option */}
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

        {/* Right group — pushed to the left (end) side */}
        <div className="flex items-center gap-3 mr-auto">
          {/* Suggest product button */}
          <button
            type="button"
            onClick={onSuggestClick}
            className="px-4 py-2 rounded-lg bg-transparent border border-white/30 text-white font-display font-bold text-sm hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            + اقتراح منتج
          </button>

          {/* Report button — opens modal */}
          <button
            type="button"
            onClick={onSubmitClick}
            className="px-4 py-2 rounded-lg bg-transparent border border-sand text-sand font-display font-bold text-sm hover:bg-sand/10 transition-colors whitespace-nowrap cursor-pointer"
          >
            + اضف سعر
          </button>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors cursor-pointer flex-shrink-0"
            aria-label={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Avatar — profile toggle */}
          <button
            type="button"
            onClick={onProfileClick}
            className={cn(
              "w-9 h-9 rounded-full border flex items-center justify-center text-white hover:bg-white/25 transition-colors cursor-pointer flex-shrink-0",
              isProfileActive
                ? "bg-white/30 border-sand ring-2 ring-sand/40"
                : "bg-white/15 border-white/25"
            )}
            title="حسابي"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/80">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
