"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeProductCard } from "@/components/home/HomeProductCard";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { HomeProductCardSkeleton } from "@/components/ui/Skeleton";
import { useArea } from "@/hooks/useArea";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { Category } from "@/types/app";
import { useCategories, useProductsInfinite } from "@/lib/queries/hooks";

const FALLBACK_CHIPS = ["🌾 دقيق", "🍚 أرز", "🫒 زيت", "🍬 سكر", "🥛 حليب", "🧂 ملح"];

export function HomeData() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const { area } = useArea();

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const sortedCategories = [...categories].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const effectiveCategoryId =
    selectedCategoryId ?? sortedCategories[0]?.id ?? null;

  const {
    data: infiniteData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError: productsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProductsInfinite(effectiveCategoryId, undefined, true, area?.id ?? null);

  const rawProducts = infiniteData?.pages?.flatMap((p) => p.products) ?? [];
  // When user has area selected, only show products that have prices in that area
  const filteredProducts = area?.id
    ? rawProducts.filter((p) => Array.isArray(p.price_preview) && p.price_preview.length > 0)
    : rawProducts;
  const products = [...filteredProducts].sort((a, b) => {
    const aHasPrices = Array.isArray(a.price_preview) && a.price_preview.length > 0;
    const bHasPrices = Array.isArray(b.price_preview) && b.price_preview.length > 0;
    if (aHasPrices === bHasPrices) return 0;
    return aHasPrices ? -1 : 1;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(
      LOCAL_STORAGE_KEYS.welcome_toast_dismissed
    );
    if (!dismissed) setShowWelcomeToast(true);
  }, []);

  function dismissWelcomeToast() {
    setShowWelcomeToast(false);
    if (typeof window !== "undefined")
      localStorage.setItem(LOCAL_STORAGE_KEYS.welcome_toast_dismissed, "1");
  }

  const hasCategories = sortedCategories.length > 0;
  const showSkeletons = categoriesLoading || (!!effectiveCategoryId && productsLoading);
  const error = productsError ? "تعذر تحميل البيانات" : null;

  return (
    <div className="flex flex-col min-h-dvh">
      <AppHeader />

      {showWelcomeToast && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl bg-ink px-3.5 py-3 animate-slide-down flex-shrink-0">
          <span className="text-lg">👋</span>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[13px] text-white leading-snug">
              أهلاً — كل شيء جاهز
            </div>
            <div className="text-[11px] text-white/50 mt-0.5">
              أنت مجهول الهوية تماماً · لا حساب مطلوب
            </div>
          </div>
          <button
            type="button"
            onClick={dismissWelcomeToast}
            className="text-white/30 text-base p-0.5 shrink-0"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
      )}

      {/* Category tabs — show immediately; skeleton chips while categories load */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0 bg-white border-b border-border">
        {hasCategories ? (
          sortedCategories.map((c: Category) => {
            const label = c.icon ? `${c.icon} ${c.name_ar}` : c.name_ar;
            const isSelected = effectiveCategoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryId(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                  isSelected
                    ? "bg-olive-pale border-olive text-olive font-semibold"
                    : "bg-white border-border text-slate hover:border-olive/50"
                }`}
              >
                {label}
              </button>
            );
          })
        ) : categoriesLoading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-8 w-16 rounded-full bg-border/50 animate-pulse flex-shrink-0"
            />
          ))
        ) : (
          FALLBACK_CHIPS.map((chip) => (
            <span
              key={chip}
              className="px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 bg-white border-border text-slate"
            >
              {chip}
            </span>
          ))
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-3 pb-24">
        {showSkeletons ? (
          <div className="px-4">
            {[...Array(5)].map((_, i) => (
              <HomeProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="mx-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : !effectiveCategoryId ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">📂</div>
            <div className="font-display font-bold text-ink mb-1">
              لا توجد فئات
            </div>
            <div className="text-sm text-mist">
              لم يتم العثور على فئات منتجات
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-display font-bold text-ink mb-1">
              {area?.id ? "لا أسعار في منطقتك لهذه الفئة" : "لا منتجات في هذه الفئة"}
            </div>
            <div className="text-sm text-mist">
              {area?.id ? "جرب فئة أخرى أو غيّر المنطقة أعلاه" : "جرب فئة أخرى أو ابحث عن منتج أعلاه"}
            </div>
          </div>
        ) : (
          <>
            {products.map((product) => (
              <HomeProductCard
                key={product.id}
                product={product}
                areaId={area?.id ?? null}
                isRefetching={productsFetching}
              />
            ))}
            {hasNextPage && (
              <div className="px-4 pt-2 pb-4">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-3 rounded-xl border-[1.5px] border-olive text-olive font-display font-bold text-sm hover:bg-olive-pale disabled:opacity-50 transition-colors"
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
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
