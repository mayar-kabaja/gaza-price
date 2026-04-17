"use client";

import { DesktopPriceCard } from "./DesktopPriceCard";
import { LoaderDots } from "@/components/ui/LoaderDots";
import type { Product, Section } from "@/types/app";

interface DesktopPriceGridProps {
  products: Product[];
  sections: Section[];
  selectedCategoryId: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export function DesktopPriceGrid({
  products,
  sections,
  selectedCategoryId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  isLoading,
}: DesktopPriceGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-surface rounded-xl overflow-hidden shadow-sm">
            <div className="h-[3px] bg-fog animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fog animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-24 rounded bg-fog animate-pulse" />
                  <div className="h-3 w-14 rounded bg-fog animate-pulse" />
                </div>
              </div>
              <div className="h-7 w-20 rounded bg-fog animate-pulse" />
              <div className="h-1.5 rounded-full bg-fog animate-pulse" />
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="h-3 w-24 rounded bg-fog animate-pulse" />
                <div className="h-7 w-16 rounded-md bg-fog animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <div className="font-display font-bold text-ink mb-1">لا توجد منتجات</div>
        <div className="text-sm text-mist">جرب تصنيفاً آخر أو غيّر المنطقة</div>
      </div>
    );
  }

  // Group products by category for section dividers when showing all
  const showDividers = !selectedCategoryId;

  // Build grouped structure
  type Group = { label: string; icon?: string; products: Product[] };
  const groups: Group[] = [];

  if (showDividers) {
    const categoryMap = new Map<string, Group>();
    for (const section of sections) {
      for (const cat of section.categories ?? []) {
        categoryMap.set(cat.id, { label: cat.name_ar, icon: cat.icon, products: [] });
      }
    }
    for (const product of products) {
      const group = categoryMap.get(product.category_id);
      if (group) {
        group.products.push(product);
      } else {
        // Fallback group
        const fallback = categoryMap.get("_other") ?? { label: "أخرى", products: [] };
        fallback.products.push(product);
        categoryMap.set("_other", fallback);
      }
    }
    for (const group of categoryMap.values()) {
      if (group.products.length > 0) groups.push(group);
    }
  } else {
    groups.push({ label: "", products });
  }

  let cardIndex = 0;

  return (
    <div>
      {groups.map((group) => (
        <div key={group.label || "all"}>
          {group.label && (
            <div className="flex items-center gap-3 mb-4 mt-2">
              {group.icon && <span className="text-lg">{group.icon}</span>}
              <h3 className="font-display font-bold text-ink">{group.label}</h3>
              <span className="text-xs text-mist font-body">{group.products.length} منتج</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {group.products.map((product) => {
              const idx = cardIndex++;
              return <DesktopPriceCard key={product.id} product={product} index={idx} />;
            })}
          </div>
        </div>
      ))}

      {hasNextPage && (
        <div className="flex justify-center py-6">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="px-8 py-3 rounded-xl border-[1.5px] border-olive text-olive font-display font-bold text-sm hover:bg-olive-pale disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                جاري التحميل
                <LoaderDots size="sm" />
              </span>
            ) : (
              "تحميل المزيد"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
