"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { HomeProductCard } from "@/components/home/HomeProductCard";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { HomeProductCardSkeleton } from "@/components/ui/Skeleton";
import { useArea } from "@/hooks/useArea";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { Category } from "@/types/app";
import { useBootstrap, useProductsInfinite, useReportsInfinite } from "@/lib/queries/hooks";
import { ReportCard } from "@/components/reports/ReportCard";
import { useConnectionQuality } from "@/hooks/useConnectionQuality";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { isStale as checkStale } from "@/lib/price";
import type { DesktopFilter, DesktopSort } from "@/components/desktop/DesktopFilterBar";

// Desktop components — lazy-loaded so mobile never downloads them
const DesktopHeader = dynamic(() => import("@/components/desktop/DesktopHeader").then(m => ({ default: m.DesktopHeader })), { ssr: false });
const DesktopSidebar = dynamic(() => import("@/components/desktop/DesktopSidebar").then(m => ({ default: m.DesktopSidebar })), { ssr: false });
const DesktopBreadcrumb = dynamic(() => import("@/components/desktop/DesktopBreadcrumb").then(m => ({ default: m.DesktopBreadcrumb })), { ssr: false });
const DesktopStatsStrip = dynamic(() => import("@/components/desktop/DesktopStatsStrip").then(m => ({ default: m.DesktopStatsStrip })), { ssr: false });
const DesktopFilterBar = dynamic(() => import("@/components/desktop/DesktopFilterBar").then(m => ({ default: m.DesktopFilterBar })), { ssr: false });
const DesktopPriceGrid = dynamic(() => import("@/components/desktop/DesktopPriceGrid").then(m => ({ default: m.DesktopPriceGrid })), { ssr: false });
const DesktopSubmitModal = dynamic(() => import("@/components/desktop/DesktopSubmitModal").then(m => ({ default: m.DesktopSubmitModal })), { ssr: false });
const DesktopSuggestModal = dynamic(() => import("@/components/desktop/DesktopSuggestModal").then(m => ({ default: m.DesktopSuggestModal })), { ssr: false });

const ALL_CATEGORY_ID = "__all__";

export function HomeData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams?.get("category") ?? null;
  const areaFromUrl = searchParams?.get("area") ?? null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryFromUrl ?? ALL_CATEGORY_ID);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const { area } = useArea();
  const connection = useConnectionQuality();
  const isSlow = connection === "slow";
  const isDesktop = useIsDesktop();

  // Desktop: sidebar area is browse-only (doesn't save to profile)
  const [browseAreaId, setBrowseAreaId] = useState<string | null>(areaFromUrl);
  const activeAreaId = (isDesktop ? browseAreaId : null) ?? area?.id ?? null;

  // Desktop filter/sort state
  const [desktopFilter, setDesktopFilter] = useState<DesktopFilter>("all");
  const [desktopSort, setDesktopSort] = useState<DesktopSort>("newest");
  const modalFromUrl = searchParams?.get("modal") ?? null;
  const [submitModalOpen, setSubmitModalOpen] = useState(modalFromUrl === "submit");
  const [suggestModalOpen, setSuggestModalOpen] = useState(modalFromUrl === "suggest");

  // Sync from URL when navigating from /categories or /account
  useEffect(() => {
    if (categoryFromUrl) setSelectedCategoryId(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    if (areaFromUrl) setBrowseAreaId(areaFromUrl);
  }, [areaFromUrl]);

  useEffect(() => {
    if (modalFromUrl === "submit") setSubmitModalOpen(true);
    if (modalFromUrl === "suggest") setSuggestModalOpen(true);
  }, [modalFromUrl]);

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

  const {
    data: infiniteData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError: productsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProductsInfinite(isAllTab ? null : effectiveCategoryId, undefined, true, activeAreaId, isSlow ? 5 : undefined);

  // "الكل" tab: fetch all reports in user's area, newest first, no demo
  const {
    data: reportsData,
    isLoading: reportsLoading,
    isError: reportsError,
    fetchNextPage: fetchNextReports,
    hasNextPage: hasNextReports,
    isFetchingNextPage: isFetchingNextReports,
  } = useReportsInfinite(
    activeAreaId ? "my_area" : "all",
    activeAreaId,
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
    if (!dismissed) {
      setShowWelcomeToast(true);
      setTimeout(() => {
        setShowWelcomeToast(false);
        localStorage.setItem(LOCAL_STORAGE_KEYS.welcome_toast_dismissed, "1");
      }, 5000);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowDemoBanner(false), 10000);
    return () => clearTimeout(t);
  }, []);

  function dismissWelcomeToast() {
    setShowWelcomeToast(false);
    if (typeof window !== "undefined")
      localStorage.setItem(LOCAL_STORAGE_KEYS.welcome_toast_dismissed, "1");
  }

  const scrollToSelected = useCallback((el: HTMLButtonElement | null) => {
    if (el) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, []);

  const hasCategories = sortedCategories.length > 0;
  const showSkeletons = categoriesLoading || (isAllTab ? reportsLoading : (!!effectiveCategoryId && productsLoading));
  const error = (isAllTab ? reportsError : productsError) ? "تعذر تحميل البيانات" : null;

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="h-screen grid grid-rows-[64px_1fr]">
        <DesktopHeader
          onSubmitClick={() => setSubmitModalOpen(true)}
          onSuggestClick={() => setSuggestModalOpen(true)}
          onProfileClick={() => router.push("/account")}
        />
        <div className="flex overflow-hidden">
          <DesktopSidebar
            selectedAreaId={activeAreaId}
            selectedCategoryId={effectiveCategoryId}
            onAreaSelect={(a) => setBrowseAreaId(a.id)}
            onCategorySelect={selectCategory}
            onSubmitClick={() => setSubmitModalOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-8 bg-fog">
            {/* Demo data banner */}
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-sand-light border border-sand/30 px-4 py-3">
              <span className="text-base mt-0.5 flex-shrink-0">&#9888;&#65039;</span>
              <div>
                <span className="font-display font-bold text-sm text-ink">هذه نسخة تجريبية</span>
                <span className="text-sm text-mist mr-2">— الأسعار تجريبية فقط. كن أول من يضيف الأسعار الحقيقية في منطقتك.</span>
              </div>
            </div>
            <DesktopBreadcrumb categoryId={isAllTab ? null : effectiveCategoryId} />
            {isAllTab ? (
              /* Desktop "الكل" — reports feed */
              showSkeletons ? (
                <div className="space-y-3 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-surface rounded-2xl p-4 border border-border animate-pulse">
                      <div className="h-4 bg-fog rounded w-3/4 mb-2" />
                      <div className="h-3 bg-fog rounded w-1/2 mb-2" />
                      <div className="h-5 bg-fog rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : allReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <div className="font-display font-bold text-ink mb-1">
                    {activeAreaId ? "لا أسعار في منطقتك حالياً" : "لا أسعار حالياً"}
                  </div>
                  <div className="text-sm text-mist">كن أول من يضيف سعراً</div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {allReports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                  {hasNextReports && (
                    <div className="py-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => fetchNextReports()}
                        disabled={isFetchingNextReports}
                        className="px-6 py-2.5 rounded-xl bg-olive-pale border border-olive-mid text-olive text-sm font-body font-medium disabled:opacity-50"
                      >
                        {isFetchingNextReports ? "جاري التحميل..." : "تحميل المزيد"}
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <>
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

      {/* Demo data banner */}
      {showDemoBanner && (
        <div className="mx-4 my-2 rounded-xl bg-sand-light border border-sand/30 flex-shrink-0 overflow-hidden animate-slide-down">
          <div className="flex items-start gap-2.5 px-3.5 py-3">
            <span className="text-base mt-0.5 flex-shrink-0">&#9888;&#65039;</span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[12px] text-ink leading-snug">
                اهلا بك 👋 هذه نسخة تجريبية من التطبيق
              </div>
              <div className="text-[11px] text-mist mt-0.5 leading-relaxed">
                الأسعار الحالية تجريبية فقط. كن أول من يضيف الأسعار الحقيقية في منطقتك وساعد الناس في غزة لمعرفة الأسعار. تنبيه: إضافة أسعار مزيفة ستؤدي لحظر رقمك نهائياً.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDemoBanner(false)}
              className="text-mist/50 text-base p-0.5 shrink-0"
              aria-label="إغلاق"
            >
              ×
            </button>
          </div>
          <div className="h-[2px] w-full bg-sand/20">
            <div className="h-full bg-sand/50" style={{ animation: "toastProgress 10s linear forwards" }} />
          </div>
        </div>
      )}

      {/* Category tabs — show immediately; skeleton chips while categories load */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0 bg-surface border-b border-border">
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
