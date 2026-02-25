"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { PriceList } from "@/components/prices/PriceList";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { Category, Price, PriceStats } from "@/types/app";
import {
  useCategories,
  useProducts,
  usePrices,
  useProduct,
} from "@/lib/queries/hooks";

const FALLBACK_CHIPS = ["🌾 دقيق", "🍚 أرز", "🫒 زيت", "🍬 سكر", "🥛 حليب", "🧂 ملح"];

const DEFAULT_PRODUCT_ID = process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_ID ?? "";

export function HomeData() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const sortedCategories = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const effectiveCategoryId = selectedCategoryId ?? sortedCategories[0]?.id ?? null;

  const { data: productsData, isLoading: productsLoading } = useProducts({
    category_id: effectiveCategoryId,
    limit: 10,
  });
  const products = productsData?.products ?? [];
  const productId = products[0]?.id ?? DEFAULT_PRODUCT_ID;

  const { data: pricesData, isLoading: pricesLoading, isError: pricesError } = usePrices({
    productId: productId || null,
    sort: "price_asc",
    limit: 20,
  });
  const { data: productDetail } = useProduct(productId || null);

  const prices = (pricesData?.prices ?? []) as Price[];
  const stats: PriceStats = {
    avg_price: pricesData?.stats?.avg_price ?? 0,
    median_price: pricesData?.stats?.median_price ?? 0,
    min_price: pricesData?.stats?.min_price ?? 0,
    report_count: pricesData?.total ?? pricesData?.prices?.length ?? 0,
  };
  const productName =
    (productDetail as { name_ar?: string } | null)?.name_ar ??
    (products.find((p: { id: string; name_ar?: string }) => p.id === productId) as { name_ar?: string } | undefined)
      ?.name_ar ??
    null;

  const loading = categoriesLoading || productsLoading || pricesLoading;
  const error = pricesError ? "تعذر تحميل البيانات" : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(LOCAL_STORAGE_KEYS.welcome_toast_dismissed);
    if (!dismissed) setShowWelcomeToast(true);
  }, []);

  function dismissWelcomeToast() {
    setShowWelcomeToast(false);
    if (typeof window !== "undefined")
      localStorage.setItem(LOCAL_STORAGE_KEYS.welcome_toast_dismissed, "1");
  }

  const hasCategories = sortedCategories.length > 0;

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

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0">
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="font-display font-bold text-ink flex items-center justify-center gap-2">
              جاري التحميل
              <LoaderDots size="sm" />
            </div>
          </div>
        ) : error ? (
          <div className="mx-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : productName ? (
          <PriceList prices={prices} stats={stats} productName={productName} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-display font-bold text-ink mb-1">ابحث عن منتج</div>
            <div className="text-sm text-mist">
              اكتب اسم المنتج في حقل البحث أعلاه
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
