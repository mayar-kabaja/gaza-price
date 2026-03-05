"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeProductCard } from "@/components/home/HomeProductCard";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { HomeProductCardSkeleton } from "@/components/ui/Skeleton";
import { useArea } from "@/hooks/useArea";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { Category } from "@/types/app";
import { useSectionsWithCategories, useProductsInfinite, useAreas } from "@/lib/queries/hooks";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { isStale as checkStale } from "@/lib/price";

// Desktop components
import { DesktopHeader } from "@/components/desktop/DesktopHeader";
import { DesktopSidebar } from "@/components/desktop/DesktopSidebar";
import { DesktopBreadcrumb } from "@/components/desktop/DesktopBreadcrumb";
import { DesktopStatsStrip } from "@/components/desktop/DesktopStatsStrip";
import { DesktopFilterBar, type DesktopFilter, type DesktopSort } from "@/components/desktop/DesktopFilterBar";
import { DesktopPriceGrid } from "@/components/desktop/DesktopPriceGrid";
import { DesktopSubmitModal } from "@/components/desktop/DesktopSubmitModal";
import { DesktopSuggestModal } from "@/components/desktop/DesktopSuggestModal";
import { DesktopProfilePanel } from "@/components/desktop/DesktopProfilePanel";

export function HomeData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams?.get("category") ?? null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryFromUrl);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const { area, saveArea } = useArea();
  const connection = useConnectionQuality();
  const isSlow = connection === "slow";
  const isDesktop = useIsDesktop();

  // Desktop filter/sort state
  const [desktopFilter, setDesktopFilter] = useState<DesktopFilter>("all");
  const [desktopSort, setDesktopSort] = useState<DesktopSort>("newest");
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [desktopView, setDesktopView] = useState<"prices" | "profile">("prices");

  // Sync from URL when navigating from /categories
  useEffect(() => {
    if (categoryFromUrl) setSelectedCategoryId(categoryFromUrl);
  }, [categoryFromUrl]);

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setDesktopView("prices");
    router.replace(`/?category=${id}`);
  }

  const { data: sections, isLoading: categoriesLoading } = useSectionsWithCategories();
  useAreas(); // pre-warm cache for sidebar/modals

  // Flatten categories from sections (same order as /categories page)
  const sortedCategories = (sections ?? []).flatMap((s) => s.categories ?? []);
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
  } = useProductsInfinite(effectiveCategoryId, undefined, true, area?.id ?? null, isSlow ? 5 : undefined);

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

  // Desktop filtered/sorted products
  const desktopProducts = useMemo(() => {
    let filtered = [...products];

    // Apply desktop filter
    if (desktopFilter === "confirmed") {
      filtered = filtered.filter((p) =>
        (p.price_preview ?? []).some((pp) => pp.confirmation_count > 0)
      );
    } else if (desktopFilter === "recent") {
      filtered = filtered.filter((p) =>
        (p.price_preview ?? []).some((pp) => !checkStale(pp.reported_at))
      );
    }

    // Apply desktop sort
    if (desktopSort === "cheapest") {
      filtered.sort((a, b) => {
        const aMin = Math.min(...(a.price_preview ?? []).map((pp) => pp.price));
        const bMin = Math.min(...(b.price_preview ?? []).map((pp) => pp.price));
        return aMin - bMin;
      });
    } else {
      // newest — sort by latest reported_at
      filtered.sort((a, b) => {
        const aLatest = Math.max(...(a.price_preview ?? []).map((pp) => new Date(pp.reported_at).getTime()));
        const bLatest = Math.max(...(b.price_preview ?? []).map((pp) => new Date(pp.reported_at).getTime()));
        return bLatest - aLatest;
      });
    }

    return filtered;
  }, [products, desktopFilter, desktopSort]);

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

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="h-screen grid grid-rows-[64px_1fr]">
        <DesktopHeader
          onSubmitClick={() => setSubmitModalOpen(true)}
          onSuggestClick={() => setSuggestModalOpen(true)}
          onProfileClick={() => setDesktopView((v) => v === "profile" ? "prices" : "profile")}
          isProfileActive={desktopView === "profile"}
        />
        <div className="flex overflow-hidden">
          <DesktopSidebar
            selectedAreaId={area?.id ?? null}
            selectedCategoryId={effectiveCategoryId}
            onAreaSelect={(a) => saveArea(a)}
            onCategorySelect={selectCategory}
            onSubmitClick={() => setSubmitModalOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-8 bg-fog">
            {desktopView === "profile" ? (
              <DesktopProfilePanel />
            ) : (
              <>
                <DesktopBreadcrumb categoryId={effectiveCategoryId} />
                <DesktopStatsStrip products={products} isLoading={showSkeletons} />
                <DesktopFilterBar
                  filter={desktopFilter}
                  sort={desktopSort}
                  onFilterChange={setDesktopFilter}
                  onSortChange={setDesktopSort}
                />
                <DesktopPriceGrid
                  products={desktopProducts}
                  sections={sections ?? []}
                  selectedCategoryId={effectiveCategoryId}
                  hasNextPage={hasNextPage ?? false}
                  isFetchingNextPage={isFetchingNextPage}
                  onLoadMore={() => fetchNextPage()}
                  isLoading={showSkeletons}
                />
              </>
            )}
          </main>
        </div>
        <DesktopSubmitModal open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} />
        <DesktopSuggestModal open={suggestModalOpen} onClose={() => setSuggestModalOpen(false)} />
      </div>
    );
  }

  // ── Mobile layout (unchanged) ──
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
                onClick={() => selectCategory(c.id)}
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
          <div className="text-xs text-mist font-body px-2">لا توجد تصنيفات</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-3 pb-24">
        {showSkeletons ? (
          <div className="px-4">
            {[...Array(isSlow ? 3 : 5)].map((_, i) => (
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
