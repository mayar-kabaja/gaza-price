"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/layout/BottomNav";
import { ListingCard, ListingCardSkeleton } from "@/components/market/ListingCard";
import { apiFetch } from "@/lib/api/fetch";
import { useSession } from "@/hooks/useSession";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useMarketSidebar } from "@/app/market/layout";
import { cn } from "@/lib/utils";
import type { Listing } from "@/lib/queries/fetchers";

const CATEGORIES = [
  { value: "",            label: "الكل" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "clothes",     label: "ملابس" },
  { value: "furniture",   label: "أثاث" },
  { value: "food",        label: "طعام" },
  { value: "books",       label: "كتب" },
  { value: "tools",       label: "أدوات" },
  { value: "toys",        label: "ألعاب" },
  { value: "other",       label: "أخرى" },
];

const CONDITIONS = [
  { value: "",       label: "الكل" },
  { value: "new",    label: "جديد" },
  { value: "used",   label: "مستعمل" },
  { value: "urgent", label: "عاجل" },
];

// ── Shared data hook ──────────────────────────────────────────────────────────

function useSavedListings() {
  const { contributor, loading: sessionLoading } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionLoading) return;
    if (!contributor?.phone_verified) { setLoading(false); return; }
    apiFetch("/api/listings/saved")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const items: Listing[] = data?.listings ?? [];
        setListings(items);
        setSavedIds(new Set(items.map((l) => l.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionLoading, contributor?.phone_verified]);

  function handleSaveToggle(id: string, saved: boolean) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      saved ? next.add(id) : next.delete(id);
      return next;
    });
    if (!saved) setListings((prev) => prev.filter((l) => l.id !== id));
  }

  return { listings, savedIds, loading, handleSaveToggle };
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function SavedListingsPage() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { listings, savedIds, loading, handleSaveToggle } = useSavedListings();
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");

  const display = listings.filter((l) => {
    if (category && l.category !== category) return false;
    if (condition && l.condition !== condition) return false;
    return true;
  });

  // Register sidebar content unconditionally (hook rule)
  useMarketSidebar(
    isDesktop ? (
      <div className="space-y-4">
        {/* Categories */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">التصنيف</div>
          <div className="space-y-0.5">
            {CATEGORIES.map((cat) => (
              <button key={cat.value} onClick={() => setCategory(cat.value)}
                className={cn("w-full text-right px-3 py-2 rounded-lg text-sm font-display font-bold transition-colors",
                  category === cat.value ? "bg-olive-pale text-olive border border-olive-mid" : "text-ink hover:bg-fog")}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">الحالة</div>
          <div className="space-y-0.5">
            {CONDITIONS.map((cond) => (
              <button key={cond.value} onClick={() => setCondition(cond.value)}
                className={cn("w-full text-right px-3 py-2 rounded-lg text-sm font-body transition-colors",
                  condition === cond.value ? "bg-olive-pale text-olive font-semibold" : "text-slate hover:bg-fog hover:text-ink")}>
                {cond.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    ) : null
  );

  if (isDesktop) {
    return (
      <div className="p-5 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display font-bold text-xl text-ink">المحفوظات</h1>
          <div className="flex items-center gap-2">
            <Link href="/market" className="text-xs font-semibold text-mist hover:text-ink">السوق</Link>
            <Link href="/market/my" className="text-xs font-semibold text-mist hover:text-ink">إعلاناتي</Link>
            {listings.length > 0 && <span className="text-sm text-mist">{listings.length} إعلان</span>}
          </div>
        </div>

        {loading && <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}</div>}

        {!loading && display.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface rounded-2xl border border-border">
            <div className="text-4xl mb-3">🔖</div>
            <div className="font-display font-bold text-ink mb-1">
              {listings.length === 0 ? "لا توجد إعلانات محفوظة" : "لا توجد نتائج"}
            </div>
            <div className="text-sm text-mist mb-4">
              {listings.length === 0 ? "احفظ الإعلانات التي تعجبك لتجدها هنا" : "جرب تغيير الفلاتر"}
            </div>
            {listings.length === 0 && (
              <Link href="/market" className="px-5 py-2 bg-olive text-white rounded-full font-semibold text-sm">تصفح السوق</Link>
            )}
          </div>
        )}

        {!loading && display.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {display.map((l) => (
              <ListingCard key={l.id} listing={l} isSaved={savedIds.has(l.id)} onSaveToggle={handleSaveToggle} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-dvh bg-fog">
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => router.back()} className="text-mist p-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-display font-bold text-ink">المحفوظات</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading && <div className="px-4 pt-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}</div>}

        {!loading && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-5xl mb-4">🔖</div>
            <div className="font-display font-bold text-ink text-lg mb-1">لا توجد إعلانات محفوظة</div>
            <div className="text-sm text-mist mb-6">احفظ الإعلانات التي تعجبك لتجدها هنا</div>
            <button onClick={() => router.push("/market")} className="px-5 py-2.5 bg-olive text-white rounded-full font-semibold text-sm">
              تصفح السوق
            </button>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="px-4 pt-4 space-y-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} isSaved={savedIds.has(l.id)} onSaveToggle={handleSaveToggle} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
