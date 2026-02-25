"use client";

import { cn } from "@/lib/utils";

export type ReportFilterValue = "all" | "my_area" | "today" | "trusted";

const FILTERS: { value: ReportFilterValue; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "my_area", label: "منطقتي" },
  { value: "today", label: "اليوم" },
  { value: "trusted", label: "الأعلى ثقة" },
];

interface ReportFiltersProps {
  value: ReportFilterValue;
  onChange: (value: ReportFilterValue) => void;
  hasArea: boolean;
}

export function ReportFilters({ value, onChange, hasArea }: ReportFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {FILTERS.map((f) => {
        const disabled = f.value === "my_area" && !hasArea;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => !disabled && onChange(f.value)}
            disabled={disabled}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-body font-medium transition-colors",
              value === f.value
                ? "bg-olive text-white"
                : disabled
                ? "bg-fog text-mist cursor-not-allowed"
                : "bg-white border border-border text-ink hover:border-olive-mid hover:text-olive"
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
