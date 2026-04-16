"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useListingsInfinite } from "@/lib/queries/hooks";
import { cn } from "@/lib/utils";
import type { Listing } from "@/lib/queries/fetchers";

const CATEGORIES = [
  { value: "", label: "الكل" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "clothes", label: "ملابس" },
  { value: "furniture", label: "أثاث" },
  { value: "food", label: "طعام" },
  { value: "books", label: "كتب" },
  { value: "tools", label: "أدوات" },
  { value: "toys", label: "ألعاب" },
  { value: "other", label: "أخرى" },
];

const CATEGORY_EMOJI: Record<string, string> = {
  electronics: "📱", clothes: "👕", furniture: "🪑", food: "🥗",
  books: "📚", tools: "🔧", toys: "🧸", other: "📦",
};

const CONDITION_BADGE: Record<string, { label: string; cls: string }> = {
  new:    { label: "جديد",    cls: "bg-emerald-100 text-emerald-800" },
  used:   { label: "مستعمل", cls: "bg-amber-100 text-amber-800" },
  urgent: { label: "عاجل",   cls: "bg-red-100 text-red-700" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DesktopMarketModal({ open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useListingsInfinite({
      category: category || undefined,
      search: debouncedSearch || undefined,
    });

  const allListings = data?.pages.flatMap((p) => p.listings) ?? [];

  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(onIntersect, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-y-4 left-1/2 -translate-x-1/2 w-full max-w-4xl z-50 flex flex-col bg-surface rounded-2xl shadow-2xl overflow-hidden border border-border">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border flex-shrink-0 bg-olive">
          <div className="font-display font-extrabold text-base text-white flex-1">السوق المحلي</div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5 w-56">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 opacity-70 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="ابحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-xs text-white placeholder:text-white/60 bg-transparent outline-none min-w-0"
              dir="rtl"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-white/70 text-sm leading-none">×</button>
            )}
          </div>

          {/* My listings link */}
          <Link
            href="/market/my"
            onClick={onClose}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-[12px] font-semibold px-3 py-1.5 rounded-full"
          >
            إعلاناتي
          </Link>

          {/* Add listing link */}
          <Link
            href="/market/new"
            onClick={onClose}
            className="flex items-center gap-1 bg-white/15 hover:bg-white/25 transition-colors text-white text-[12px] font-semibold px-3 py-1.5 rounded-full"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            إعلان جديد
          </Link>

          {/* Close */}
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 px-5 py-2.5 border-b border-border overflow-x-auto scrollbar-none flex-shrink-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                category === c.value
                  ? "bg-olive text-white"
                  : "bg-fog text-mist hover:bg-border hover:text-ink"
              )}
            >
              {c.value && <span>{CATEGORY_EMOJI[c.value]}</span>}
              {c.label}
            </button>
          ))}
        </div>

        {/* Listings grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-fog rounded-xl h-28 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && allListings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🛒</div>
              <div className="font-display font-bold text-ink mb-1">لا توجد إعلانات</div>
              <div className="text-sm text-mist">جرّب تصفية أخرى</div>
            </div>
          )}

          {!isLoading && allListings.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {allListings.map((listing) => (
                <ListingCardDesktop key={listing.id} listing={listing} onClose={onClose} />
              ))}
            </div>
          )}

          <div ref={loadMoreRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="text-center py-4 text-sm text-mist">جارٍ التحميل...</div>
          )}
        </div>
      </div>
    </>
  );
}

function ListingCardDesktop({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const firstImage = listing.images?.sort((a, b) => a.sort_order - b.sort_order)[0];
  const cond = CONDITION_BADGE[listing.condition] ?? CONDITION_BADGE.used;

  return (
    <Link
      href={`/market/${listing.id}`}
      onClick={onClose}
      className="flex gap-3 bg-fog hover:bg-border/40 rounded-xl p-3 transition-colors border border-border/60 hover:border-border"
    >
      {/* Image */}
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-olive-pale flex items-center justify-center">
        {firstImage ? (
          <div className="relative w-full h-full">
            <Image src={firstImage.url} alt={listing.title} fill className="object-cover" sizes="80px" unoptimized />
          </div>
        ) : (
          <span className="text-2xl">{CATEGORY_EMOJI[listing.category] ?? "📦"}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="font-bold text-[13px] text-ink line-clamp-2 leading-snug mb-1">{listing.title}</div>
          <span className={cn("text-[10px] font-bold px-2 py-[2px] rounded-full", cond.cls)}>{cond.label}</span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-display font-black text-[15px] text-olive-deep" dir="ltr">
            ₪{Number(listing.price).toLocaleString()}
          </span>
          <span className="text-[10px] text-mist">{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
