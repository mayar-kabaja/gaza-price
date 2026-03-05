"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export type DesktopFilter = "all" | "confirmed" | "recent";
export type DesktopSort = "newest" | "cheapest";

interface DesktopFilterBarProps {
  filter: DesktopFilter;
  sort: DesktopSort;
  onFilterChange: (f: DesktopFilter) => void;
  onSortChange: (s: DesktopSort) => void;
}

const FILTERS: { value: DesktopFilter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "confirmed", label: "مؤكدة فقط" },
  { value: "recent", label: "أقل من ٢٤ ساعة" },
];

const SORT_OPTIONS: { value: DesktopSort; label: string }[] = [
  { value: "newest", label: "الأحدث" },
  { value: "cheapest", label: "الأقل سعراً" },
];

export function DesktopFilterBar({ filter, sort, onFilterChange, onSortChange }: DesktopFilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return;
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sortOpen]);

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "الأحدث";

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-body border-[1.5px] transition-colors cursor-pointer",
              filter === f.value
                ? "bg-olive-pale border-olive text-olive font-semibold"
                : "bg-white border-border text-slate hover:border-olive/50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Custom sort dropdown */}
      <div ref={sortRef} className="relative">
        <button
          type="button"
          onClick={() => setSortOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-body border-[1.5px] border-border bg-white text-slate hover:border-olive/50 transition-colors cursor-pointer"
        >
          {currentSortLabel}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={cn("text-mist transition-transform", sortOpen && "rotate-180")}
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>

        {sortOpen && (
          <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-40 min-w-[140px]">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => { onSortChange(s.value); setSortOpen(false); }}
                className={cn(
                  "w-full px-4 py-2.5 text-sm font-body text-right transition-colors cursor-pointer",
                  sort === s.value
                    ? "bg-olive-pale text-olive font-semibold"
                    : "text-ink hover:bg-fog"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
