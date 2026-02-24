"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { PriceList } from "@/components/prices/PriceList";
import type { Category, Price, PriceStats } from "@/types/app";

const FALLBACK_CHIPS = ["🌾 دقيق", "🍚 أرز", "🫒 زيت", "🍬 سكر", "🥛 حليب", "🧂 ملح"];

const DEFAULT_PRODUCT_ID = process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_ID ?? "";

export function HomeData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [stats, setStats] = useState<PriceStats>({ avg_price: 0, median_price: 0, min_price: 0, report_count: 0 });
  const [productName, setProductName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/products?limit=10").then((r) => (r.ok ? r.json() : { products: [], total: 0 })),
        ]);
        if (cancelled) return;

        const cats = Array.isArray(categoriesRes) ? categoriesRes : [];
        setCategories(cats);

        const products = productsRes.products ?? [];
        const productId = DEFAULT_PRODUCT_ID || products[0]?.id;
        const productFromList = products.find((p: { id: string; name_ar?: string }) => p.id === productId);

        if (!productId) {
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
  }, []);

  const chipLabels =
    categories.length > 0
      ? categories
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((c) => (c.icon ? `${c.icon} ${c.name_ar}` : c.name_ar))
      : FALLBACK_CHIPS;

  return (
    <div className="flex flex-col min-h-dvh">
      <AppHeader />

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar flex-shrink-0">
        {chipLabels.map((chip, i) => (
          <span
            key={chip}
            className={`px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] flex-shrink-0 ${
              i === 0 ? "bg-olive-pale border-olive text-olive font-semibold" : "bg-white border-border text-slate"
            }`}
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar py-3 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <div className="font-display font-bold text-ink mb-1">جاري التحميل...</div>
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
