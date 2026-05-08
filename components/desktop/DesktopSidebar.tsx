"use client";

import type { Area } from "@/types/app";
import { cn } from "@/lib/utils";
import { useSectionsWithCategories } from "@/lib/queries/hooks";

interface DesktopSidebarProps {
  selectedAreaId: string | null;
  selectedCategoryId: string | null;
  onAreaSelect: (area: Area) => void;
  onCategorySelect: (categoryId: string) => void;
  onSubmitClick?: () => void;
}

export default function DesktopSidebar({
  selectedAreaId,
  selectedCategoryId,
  onAreaSelect,
  onCategorySelect,
  onSubmitClick,
}: DesktopSidebarProps) {
  const { data: sections = [], isLoading: sectionsLoading } = useSectionsWithCategories();

  const DOT_COLORS = ["#556070", "#BA7517", "#639922", "#378ADD", "#D4537E", "#7F77DD", "#993C1D", "#0F8B8D"];

  return (
    <div className="flex flex-col gap-px">
      {sectionsLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-fog animate-pulse" />
          ))}
        </div>
      ) : (
      <>
        {/* "الكل" */}
        <button
          type="button"
          onClick={() => onCategorySelect("__all__")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-body transition-colors text-right cursor-pointer",
            selectedCategoryId === "__all__"
              ? "bg-fog font-medium text-ink"
              : "text-ink hover:bg-fog"
          )}
        >
          <span className="flex-1 font-medium">الكل</span>
        </button>

        {sections.flatMap((section, sIdx) =>
          (section.categories ?? []).map((cat, cIdx) => {
            const dotColor = DOT_COLORS[(sIdx * 3 + cIdx) % DOT_COLORS.length];
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategorySelect(cat.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-body transition-colors text-right cursor-pointer",
                  isSelected
                    ? "bg-fog font-medium text-ink"
                    : "text-ink hover:bg-fog"
                )}
              >
                <span className="flex-1">
                  {cat.name_ar}
                </span>
              </button>
            );
          })
        )}
      </>
      )}
    </div>
  );
}

export function DesktopSidebarCTA({ onSubmitClick }: { onSubmitClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onSubmitClick}
      className="w-full rounded-2xl bg-gradient-to-l from-olive to-olive-deep px-5 py-5 text-center text-white hover:opacity-90 transition-opacity cursor-pointer shadow-sm border border-olive-mid/30 mt-3"
    >
      <div className="font-display font-bold text-base mb-1.5">ساعد مجتمعك</div>
      <div className="text-xs text-white/70">أبلغ عن سعر وساهم في الشفافية</div>
    </button>
  );
}
