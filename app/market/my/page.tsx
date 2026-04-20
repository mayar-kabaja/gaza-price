"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BottomNav } from "@/components/layout/BottomNav";
import { ListingCardSkeleton } from "@/components/market/ListingCard";
import { apiFetch } from "@/lib/api/fetch";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useSession } from "@/hooks/useSession";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { useMarketSidebar, useMarketContext } from "@/app/market/layout";
import { cn } from "@/lib/utils";
import type { Listing } from "@/lib/queries/fetchers";

const STATUS_TABS = [
  { value: "all",     label: "الكل" },
  { value: "active",  label: "نشط" },
  { value: "pending", label: "قيد المراجعة" },
  { value: "sold",    label: "مُباع" },
];

const STATUS_BADGE: Record<string, string> = {
  active:  "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  sold:    "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<string, string> = {
  active:  "نشط",
  pending: "قيد المراجعة",
  sold:    "مُباع",
};

const CATEGORY_CONFIG: Record<string, { bg: string; emoji: string }> = {
  electronics: { bg: "bg-blue-50",    emoji: "📱" },
  clothes:     { bg: "bg-pink-50",    emoji: "👕" },
  furniture:   { bg: "bg-amber-50",   emoji: "🪑" },
  food:        { bg: "bg-green-50",   emoji: "🥗" },
  books:       { bg: "bg-violet-50",  emoji: "📚" },
  tools:       { bg: "bg-slate-100",  emoji: "🔧" },
  toys:        { bg: "bg-yellow-50",  emoji: "🧸" },
  other:       { bg: "bg-olive-pale", emoji: "📦" },
};

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return `منذ ${Math.floor(days / 30)} شهر`;
}

// ── Shared data hook ──────────────────────────────────────────────────────────

function useMyListings() {
  const [tab, setTab] = useState("all");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingSoldId, setMarkingSoldId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/listings/me?limit=50")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setListings(data?.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleSold(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (markingSoldId) return;
    setMarkingSoldId(id);
    try {
      const res = await apiFetch(`/api/listings/${id}/sold`, { method: "PATCH" });
      if (res.ok) {
        const data = await res.json();
        setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: data?.status ?? (l.status === "sold" ? "active" : "sold") } : l));
      }
    } catch { /* silent */ } finally { setMarkingSoldId(null); }
  }

  const filtered = tab === "all" ? listings : listings.filter((l) => l.status === tab);
  return { tab, setTab, listings, filtered, loading, markingSoldId, handleToggleSold };
}

// ── Listing row (shared) ──────────────────────────────────────────────────────

function ListingRow({ listing, markingSoldId, handleToggleSold }: {
  listing: Listing;
  markingSoldId: string | null;
  handleToggleSold: (e: React.MouseEvent, id: string) => void;
}) {
  const cat = CATEGORY_CONFIG[listing.category] ?? CATEGORY_CONFIG.other;
  const firstImage = listing.images?.sort((a, b) => a.sort_order - b.sort_order)[0];
  return (
    <Link
      href={`/market/${listing.id}`}
      className="flex items-stretch bg-surface rounded-2xl border border-border/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="w-[100px] flex-shrink-0 p-2.5">
        <div className={cn(
          "relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center min-h-[84px]",
          !firstImage && cat.bg
        )}>
          {firstImage ? (
            <Image src={firstImage.url} alt={listing.title} fill className="object-cover" sizes="100px" unoptimized />
          ) : (
            <span className="text-[28px] select-none">{cat.emoji}</span>
          )}
        </div>
      </div>
      <div className="flex-1 px-3 py-3 min-w-0 flex flex-col justify-between">
        <div>
          <div className="font-bold text-[13px] text-ink leading-snug line-clamp-2 mb-1.5">{listing.title}</div>
          <span className={cn("inline-block text-[10px] font-bold px-2 py-[2px] rounded-full", STATUS_BADGE[listing.status] ?? "bg-fog text-mist")}>
            {STATUS_LABEL[listing.status] ?? listing.status}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-display font-black text-[16px] text-olive-deep leading-none" dir="ltr">
            ₪{Number(listing.price).toLocaleString()}
          </span>
          {(listing.status === "active" || listing.status === "sold") ? (
            <button
              onClick={(e) => handleToggleSold(e, listing.id)}
              disabled={markingSoldId === listing.id}
              className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-transform disabled:opacity-60 flex-shrink-0 ${listing.status === "sold" ? "bg-olive/10 text-olive" : "bg-slate-100 text-slate-600"}`}
            >
              {markingSoldId === listing.id ? (
                <div className="w-3 h-3 border-[1.5px] border-slate-400 border-t-slate-700 rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <path d={listing.status === "sold" ? "M4 4l16 16M4 20L20 4" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {listing.status === "sold" ? "إعادة للنشط" : "تحديد كمُباع"}
            </button>
          ) : (
            <span className="text-[10px] text-mist">{timeAgo(listing.created_at)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function MyListingsPage() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { openNewListingModal } = useMarketContext();
  const { contributor, refreshContributor } = useSession();
  const { tab, setTab, listings, filtered, loading, markingSoldId, handleToggleSold } = useMyListings();
  const [category, setCategory] = useState("");
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  function handleNewListing() {
    if (!contributor?.phone_verified) {
      setShowAuthPopup(true);
      return;
    }
    if (isDesktop) {
      openNewListingModal();
    } else {
      router.push("/market/new");
    }
  }

  const display = filtered.filter((l) => {
    if (category && l.category !== category) return false;
    return true;
  });

  // Register sidebar content unconditionally (hook rule)
  useMarketSidebar(
    isDesktop ? (
      <div className="space-y-4">
        {/* Status tabs */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">الحالة</div>
          <div className="space-y-0.5">
            {STATUS_TABS.map((t) => {
              const count = t.value === "all" ? listings.length : listings.filter((l) => l.status === t.value).length;
              return (
                <button key={t.value} onClick={() => setTab(t.value)}
                  className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-body transition-colors",
                    tab === t.value ? "bg-olive-pale text-olive font-semibold" : "text-slate hover:bg-fog hover:text-ink")}>
                  <span>{t.label}</span>
                  {count > 0 && (
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                      tab === t.value ? "bg-olive text-white" : "bg-border text-mist")}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
      </div>
    ) : null
  );

  if (isDesktop) {
    return (
      <div className="p-5 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display font-bold text-xl text-ink">إعلاناتي</h1>
          <div className="flex items-center gap-2">
            <Link href="/market" className="text-xs font-semibold text-mist hover:text-ink">السوق</Link>
            <Link href="/market/saved" className="text-xs font-semibold text-mist hover:text-ink">المحفوظات</Link>
            <button onClick={handleNewListing} className="flex items-center gap-1.5 bg-olive text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-olive-deep transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
              إعلان جديد
            </button>
          </div>
        </div>

        {loading && <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={i} />)}</div>}

        {!loading && display.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-surface rounded-2xl border border-border">
            <div className="text-4xl mb-3">📋</div>
            <div className="font-display font-bold text-ink mb-1">
              {tab === "all" && !category ? "لا توجد إعلانات بعد" : "لا توجد نتائج"}
            </div>
            <div className="text-sm text-mist mb-4">
              {tab === "all" && !category ? "أضف أول إعلان لك الآن" : "جرب تغيير الفلاتر"}
            </div>
            {tab === "all" && !category && (
              <button onClick={handleNewListing} className="px-5 py-2 bg-olive text-white rounded-full font-semibold text-sm">أضف إعلاناً</button>
            )}
          </div>
        )}

        {!loading && display.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {display.map((l) => <ListingRow key={l.id} listing={l} markingSoldId={markingSoldId} handleToggleSold={handleToggleSold} />)}
          </div>
        )}
        <PhoneAuthPopup
          open={showAuthPopup}
          onClose={() => setShowAuthPopup(false)}
          mode="login"
          reason="سجّل دخولك لإضافة إعلان في السوق"
          onVerified={async () => {
            setShowAuthPopup(false);
            await refreshContributor();
            router.push("/market/new");
          }}
        />
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
        <h1 className="font-display font-bold text-ink flex-1">إعلاناتي</h1>
        <button onClick={handleNewListing} className="flex items-center gap-1.5 bg-olive text-white text-xs font-bold px-3 py-1.5 rounded-full">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
          </svg>
          إعلان جديد
        </button>
      </div>

      <div className="bg-surface border-b border-border px-4 flex gap-1 overflow-x-auto scrollbar-none flex-shrink-0">
        {STATUS_TABS.map((t) => {
          const count = t.value === "all" ? listings.length : listings.filter((l) => l.status === t.value).length;
          return (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={cn("flex-shrink-0 flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-colors",
                tab === t.value ? "border-olive text-olive" : "border-transparent text-mist hover:text-ink")}>
              {t.label}
              {count > 0 && (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  tab === t.value ? "bg-olive text-white" : "bg-fog text-mist")}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {loading && <div className="px-4 pt-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <ListingCardSkeleton key={i} />)}</div>}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-5xl mb-4">📋</div>
            <div className="font-display font-bold text-ink text-lg mb-1">
              {tab === "all" ? "لا توجد إعلانات بعد" : `لا توجد إعلانات ${STATUS_LABEL[tab] ?? ""}`}
            </div>
            <div className="text-sm text-mist mb-6">{tab === "all" ? "أضف أول إعلان لك الآن" : "جرب تصفية أخرى"}</div>
            {tab === "all" && <button onClick={handleNewListing} className="px-5 py-2.5 bg-olive text-white rounded-full font-semibold text-sm">أضف إعلاناً</button>}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-4 pt-4 space-y-3">
            {filtered.map((l) => <ListingRow key={l.id} listing={l} markingSoldId={markingSoldId} handleToggleSold={handleToggleSold} />)}
          </div>
        )}
      </div>

      <PhoneAuthPopup
        open={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        mode="login"
        reason="سجّل دخولك لإضافة إعلان في السوق"
        onVerified={async () => {
          setShowAuthPopup(false);
          await refreshContributor();
          router.push("/market/new");
        }}
      />
      <BottomNav />
    </div>
  );
}
