"use client";

import type { Area } from "@/types/app";
import { cn } from "@/lib/utils";
import { useSectionsWithCategories } from "@/lib/queries/hooks";
import { CategoryIcon } from "@/lib/category-icons";
import { toArabicNumerals } from "@/lib/arabic";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch";

function useCategoryCounts() {
  return useQuery({
    queryKey: ["category-price-counts"],
    queryFn: async () => {
      const res = await apiFetch("/api/stats/categories", { credentials: "include" });
      const data: { category_id: string; count: number }[] = await res.json();
      const map: Record<string, number> = {};
      let total = 0;
      for (const row of data) {
        map[row.category_id] = row.count;
        total += row.count;
      }
      map["__all__"] = total;
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

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
  const { data: counts } = useCategoryCounts();

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
              ? "bg-olive-pale font-medium text-olive"
              : "text-ink hover:bg-fog"
          )}
        >
          <CategoryIcon name="__all__" size={16} />
          <span className="flex-1 font-medium">الكل</span>
          {counts?.["__all__"] != null && (
            <span className="text-[11px] text-mist tabular-nums">{toArabicNumerals(counts["__all__"])}</span>
          )}
        </button>

        {sections.flatMap((section, sIdx) =>
          (section.categories ?? []).map((cat, cIdx) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategorySelect(cat.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-body transition-colors text-right cursor-pointer",
                  isSelected
                    ? "bg-olive-pale font-medium text-olive"
                    : "text-ink hover:bg-fog"
                )}
              >
                <CategoryIcon name={cat.name_ar} size={16} />
                <span className="flex-1">
                  {cat.name_ar}
                </span>
                {counts?.[cat.id] != null && (
                  <span className="text-[11px] text-mist tabular-nums">{toArabicNumerals(counts[cat.id])}</span>
                )}
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
