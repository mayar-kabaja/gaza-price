"use client";

import { useCategories } from "@/lib/queries/hooks";
import { cn } from "@/lib/utils";

interface CategoryStepProps {
  categoryId: string;
  onCategoryChange: (id: string) => void;
  onAutoAdvance: () => void;
}

export function CategoryStep({ categoryId, onCategoryChange, onAutoAdvance }: CategoryStepProps) {
  const { data: categoriesData } = useCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const sorted = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => {
            onCategoryChange(c.id);
            setTimeout(onAutoAdvance, 260);
          }}
          className={cn(
            "px-3.5 py-2 rounded-full border-[1.5px] text-[13px] font-semibold transition-all active:scale-95",
            categoryId === c.id
              ? "bg-olive text-white border-olive shadow-sm"
              : "bg-surface border-border text-ink hover:border-olive/40"
          )}
        >
          {c.icon} {c.name_ar}
        </button>
      ))}
    </div>
  );
}
