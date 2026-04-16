"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeProductCard } from "@/components/home/HomeProductCard";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { HomeProductCardSkeleton } from "@/components/ui/Skeleton";
import { useArea } from "@/hooks/useArea";
import type { Category } from "@/types/app";
import { useBootstrap, useProductsInfinite, useReportsInfinite } from "@/lib/queries/hooks";
import { ReportCard } from "@/components/reports/ReportCard";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useGlobalSidebar } from "@/components/layout/GlobalDesktopShell";

const DesktopSidebar = dynamic(() => import("@/components/desktop/DesktopSidebar"), { ssr: false });

const ALL_CATEGORY_ID = "__all__";

export function HomeData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams?.get("category") ?? null;
  const areaFromUrl = searchParams?.get("area") ?? null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryFromUrl ?? ALL_CATEGORY_ID);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const { area } = useArea();
  const connection = useConnectionQuality();
  const isSlow = connection === "slow";
  const isDesktop = useIsDesktop();

  // Desktop: sidebar area is browse-only (doesn't save to profile)
  const [browseAreaId, setBrowseAreaId] = useState<string | null>(areaFromUrl);
  const activeAreaId = (isDesktop ? browseAreaId : null) ?? area?.id ?? null;

  // Sync from URL when navigating from /categories or /account
  useEffect(() => {
    if (categoryFromUrl) setSelectedCategoryId(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    if (areaFromUrl) setBrowseAreaId(areaFromUrl);
  }, [areaFromUrl]);

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    router.replace(`/?category=${id}`);
  }

  const { data: bootstrap, isLoading: categoriesLoading } = useBootstrap();
  const sections = bootstrap?.sections;

  // Flatten categories from sections (same order as /categories page)
  const sortedCategories = (sections ?? []).flatMap((s) => s.categories ?? []);
  const isAllTab = (categoryFromUrl ?? selectedCategoryId) === ALL_CATEGORY_ID || (!categoryFromUrl && !selectedCategoryId);
  const effectiveCategoryId =
    categoryFromUrl ?? selectedCategoryId ?? ALL_CATEGORY_ID;

  useGlobalSidebar(
    isDesktop ? (
      <DesktopSidebar
        selectedAreaId={activeAreaId}
        selectedCategoryId={effectiveCategoryId}
        onAreaSelect={(a) => setBrowseAreaId(a.id)}
        onCategorySelect={selectCategory}
      />
    ) : null
  );

  const {
    data: infiniteData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError: productsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProductsInfinite(isAllTab ? null : effectiveCategoryId, undefined, true, activeAreaId, isSlow ? 5 : undefined);

  // "الكل" tab: fetch newest prices from ALL areas
  const {
    data: reportsData,
    isLoading: reportsLoading,
    isError: reportsError,
    fetchNextPage: fetchNextReports,
    hasNextPage: hasNextReports,
    isFetchingNextPage: isFetchingNextReports,
  } = useReportsInfinite(
    "all",
    null,
    true, // demo_last — real prices first, demo after
    isAllTab, // enabled only when الكل tab is active
    true, // active_only — hide pending/unapproved products
  );
  const allReports = reportsData?.pages?.flatMap((p) => p.reports) ?? [];

  const rawProducts = infiniteData?.pages?.flatMap((p) => p.products) ?? [];
  // When user has area selected, only show products that have prices in that area
  const filteredProducts = activeAreaId
    ? rawProducts.filter((p) => Array.isArray(p.price_preview) && p.price_preview.length > 0)
    : rawProducts;
  const products = [...filteredProducts].sort((a, b) => {
    const aHasPrices = Array.isArray(a.price_preview) && a.price_preview.length > 0;
    const bHasPrices = Array.isArray(b.price_preview) && b.price_preview.length > 0;
    if (aHasPrices === bHasPrices) return 0;
    return aHasPrices ? -1 : 1;
  });


  useEffect(() => {
    const t = setTimeout(() => setShowDemoBanner(false), 10000);
    return () => clearTimeout(t);
  }, []);

  const scrollToSelected = useCallback((el: HTMLButtonElement | null) => {
    if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, []);

  const hasCategories = sortedCategories.length > 0;
  const showSkeletons = categoriesLoading || (isAllTab ? reportsLoading : (!!effectiveCategoryId && productsLoading));
  const error = (isAllTab ? reportsError : productsError) ? "تعذر تحميل البيانات" : null;

  return (
    <div
  className={`flex flex-col min-h-dvh ${
    isDesktop ? "mt-4" : ""
  }`}
>
      {isDesktop ? null : <AppHeader />}

      {/* Welcome + Warning banner */}
      {showDemoBanner && (
        <div className="mx-4 my-2 rounded-xl overflow-hidden animate-slide-down border border-border flex-shrink-0 relative">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowDemoBanner(false)}
            className="absolute top-2 left-2 text-mist/50 text-base p-0.5 shrink-0 z-10"
            aria-label="إغلاق"
          >
            ×
          </button>
          {/* Welcome section */}
          <div className="bg-olive-pale px-3.5 py-2.5 flex items-center gap-2">
            <span className="text-base">👋</span>
            <span className="font-display font-bold text-[12px] text-olive">اهلاً بك في غزة بريس!</span>
          </div>
          {/* Warning section */}
          <div className="bg-sand-light px-3.5 py-2.5 flex items-start gap-2">
            <span className="text-sm mt-0.5 flex-shrink-0">&#9888;&#65039;</span>
            <div className="text-[11px] text-ink/70 leading-relaxed">
              <span className="font-bold text-ink">تنبيه:</span> الأسعار التجريبية مكتوب عليها &quot;تجريبي&quot; وباقي الأسعار حقيقية. إضافة أسعار مزيفة ستؤدي لحظر رقمك نهائياً.
            </div>
          </div>
          <div className="h-[2px] w-full bg-sand/20">
            <div className="h-full bg-sand/50" style={{ animation: "toastProgress 10s linear forwards" }} />
          </div>
        </div>
      )}

      {/* Category tabs — show immediately; skeleton chips while categories load */}
  {!isDesktop &&     <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0 bg-surface border-b border-border">
        {/* "الكل" tab — always first, always visible */}
        <button
          key={ALL_CATEGORY_ID}
          ref={isAllTab ? scrollToSelected : undefined}
          type="button"
          onClick={() => selectCategory(ALL_CATEGORY_ID)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
            isAllTab
              ? "bg-olive-pale border-olive text-olive font-semibold"
              : "bg-surface border-border text-slate hover:border-olive/50"
          }`}
        >
          🛒 الكل
        </button>
        {hasCategories ? (
          sortedCategories.map((c: Category) => {
            const label = c.icon ? `${c.icon} ${c.name_ar}` : c.name_ar;
            const isSelected = !isAllTab && effectiveCategoryId === c.id;
            return (
              <button
                key={c.id}
                ref={isSelected ? scrollToSelected : undefined}
                type="button"
                onClick={() => selectCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                  isSelected
                    ? "bg-olive-pale border-olive text-olive font-semibold"
                    : "bg-surface border-border text-slate hover:border-olive/50"
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
      </div>}

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
        ) : isAllTab ? (
          /* "الكل" tab — all reports as PriceCards, same style as other categories */
          allReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <div className="font-display font-bold text-ink mb-1">
                {activeAreaId ? "لا أسعار في منطقتك حالياً" : "لا أسعار حالياً"}
              </div>
              <div className="text-sm text-mist">
                كن أول من يضيف سعراً
              </div>
            </div>
          ) : (
            <div className="px-4 space-y-3">
              {allReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
              {hasNextReports && (
                <div className="py-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => fetchNextReports()}
                    disabled={isFetchingNextReports}
                    className="px-5 py-2.5 rounded-xl bg-olive-pale border border-olive-mid text-olive text-sm font-body font-medium disabled:opacity-50"
                  >
                    {isFetchingNextReports ? "جاري التحميل..." : "تحميل المزيد"}
                  </button>
                </div>
              )}
            </div>
          )
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
              {activeAreaId ? "لا أسعار في منطقتك لهذه الفئة" : "لا منتجات في هذه الفئة"}
            </div>
            <div className="text-sm text-mist">
              {activeAreaId ? "جرب فئة أخرى أو غيّر المنطقة أعلاه" : "جرب فئة أخرى أو ابحث عن منتج أعلاه"}
            </div>
          </div>
        ) : (
          <>
            {products.map((product) => (
              <HomeProductCard
                key={product.id}
                product={product}
                areaId={activeAreaId}
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
