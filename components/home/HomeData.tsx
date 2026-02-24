"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { PriceList } from "@/components/prices/PriceList";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { LOCAL_STORAGE_KEYS } from "@/lib/constants";
import type { Category, Price, PriceStats } from "@/types/app";

const FALLBACK_CHIPS = ["🌾 دقيق", "🍚 أرز", "🫒 زيت", "🍬 سكر", "🥛 حليب", "🧂 ملح"];

const DEFAULT_PRODUCT_ID = process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_ID ?? "";

export function HomeData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [stats, setStats] = useState<PriceStats>({ avg_price: 0, median_price: 0, min_price: 0, report_count: 0 });
  const [productName, setProductName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(LOCAL_STORAGE_KEYS.welcome_toast_dismissed);
    if (!dismissed) setShowWelcomeToast(true);
  }, []);

  function dismissWelcomeToast() {
    setShowWelcomeToast(false);
    if (typeof window !== "undefined") localStorage.setItem(LOCAL_STORAGE_KEYS.welcome_toast_dismissed, "1");
  }

  const sortedCategories = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const effectiveCategoryId = selectedCategoryId ?? sortedCategories[0]?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
          fetch(
            effectiveCategoryId
              ? `/api/products?category_id=${encodeURIComponent(effectiveCategoryId)}&limit=10`
              : "/api/products?limit=10"
          ).then((r) => (r.ok ? r.json() : { products: [], total: 0 })),
        ]);
        if (cancelled) return;

        const cats = Array.isArray(categoriesRes) ? categoriesRes : [];
        if (categories.length === 0) setCategories(cats);

        const products = productsRes.products ?? [];
        const productId = products[0]?.id ?? DEFAULT_PRODUCT_ID;
        const productFromList = products.find((p: { id: string; name_ar?: string }) => p.id === productId);

        if (!productId) {
          setPrices([]);
          setStats({ avg_price: 0, median_price: 0, min_price: 0, report_count: 0 });
          setProductName(null);
          setLoading(false);
          return;
        }

        const [pricesRes, productRes] = await Promise.all([
          fetch(`/api/prices?product_id=${encodeURIComponent(productId)}&sort=price_asc&limit=20`).then((r) =>
            r.ok ? r.json() : { prices: [], stats: {}, total: 0 }
          ),
          fetch(`/api/products/${encodeURIComponent(productId)}`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;

        setPrices(pricesRes.prices ?? []);
        setStats({
          avg_price: pricesRes.stats?.avg_price ?? 0,
          median_price: pricesRes.stats?.median_price ?? 0,
          min_price: pricesRes.stats?.min_price ?? 0,
          report_count: pricesRes.total ?? pricesRes.prices?.length ?? 0,
        });
        setProductName(productRes?.name_ar ?? productFromList?.name_ar ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "تعذر تحميل البيانات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [effectiveCategoryId, categories.length]);

  const hasCategories = sortedCategories.length > 0;

  return (
    <div className="flex flex-col min-h-dvh">
      <AppHeader />

      {showWelcomeToast && (
        <div className="mx-4 mt-3 flex items-center gap-2.5 rounded-xl bg-ink px-3.5 py-3 animate-slide-down flex-shrink-0">
          <span className="text-lg">👋</span>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[13px] text-white leading-snug">أهلاً — كل شيء جاهز</div>
            <div className="text-[11px] text-white/50 mt-0.5">أنت مجهول الهوية تماماً · لا حساب مطلوب</div>
          </div>
          <button type="button" onClick={dismissWelcomeToast} className="text-white/30 text-base p-0.5 shrink-0" aria-label="إغلاق">
            ×
          </button>
        </div>
      )}

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0">
        {hasCategories ? (
          sortedCategories.map((c) => {
            const label = c.icon ? `${c.icon} ${c.name_ar}` : c.name_ar;
            const isSelected = effectiveCategoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryId(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                  isSelected ? "bg-olive-pale border-olive text-olive font-semibold" : "bg-white border-border text-slate hover:border-olive/50"
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
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="font-display font-bold text-ink mb-1">تعذر تحميل البيانات</div>
            <div className="text-sm text-mist mt-1">{error}</div>
          </div>
        ) : productName ? (
          <PriceList prices={prices} stats={stats} productName={productName} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-display font-bold text-ink mb-1">ابحث عن منتج</div>
            <div className="text-sm text-mist">اكتب اسم المنتج في حقل البحث أعلاه</div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
