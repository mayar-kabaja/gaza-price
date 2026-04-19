"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListingsInfinite, useAreas } from "@/lib/queries/hooks";
import { BottomNav } from "@/components/layout/BottomNav";
import { ListingCard, ListingCardSkeleton } from "@/components/market/ListingCard";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { apiFetch } from "@/lib/api/fetch";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useSession } from "@/hooks/useSession";
import { useMarketSidebar } from "@/app/market/layout";
import { cn } from "@/lib/utils";
import type { Area } from "@/types/app";
import type { Listing } from "@/lib/queries/fetchers";

const GOV_LABELS: Record<string, string> = {
  central: "وسط غزة",
  south:   "جنوب غزة",
  north:   "شمال غزة",
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

const CONDITIONS = [
  { value: "",       label: "الكل" },
  { value: "new",    label: "جديد" },
  { value: "used",   label: "مستعمل" },
  { value: "urgent", label: "عاجل" },
];

export default function MarketPage() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { contributor, refreshContributor } = useSession();
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [openAreaPicker, setOpenAreaPicker] = useState(false);
  const [unread, setUnread] = useState(0);
  const [openGovs, setOpenGovs] = useState<Record<string, boolean>>({ central: true });
  const queryClient = useQueryClient();

  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];

  const grouped = areas.reduce<Record<string, Area[]>>((acc, a) => {
    const g = a.governorate;
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});
  const govOrder = ["central", "south", "north"];

  const { data: savedIdsData } = useQuery({
    queryKey: ["savedIds"],
    queryFn: async () => {
      const r = await apiFetch("/api/listings/saved");
      return r.ok
        ? new Set<string>((await r.json())?.listings?.map((l: { id: string }) => l.id) ?? [])
        : new Set<string>();
    },
    staleTime: 0,
  });
  const savedIds = savedIdsData ?? new Set<string>();

  function toggleSavedId(id: string, saved: boolean) {
    queryClient.setQueryData<Set<string>>(["savedIds"], (prev) => {
      const next = new Set(prev ?? []);
      saved ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleNewListing() {
    if (!contributor?.phone_verified) {
      setShowAuthPopup(true);
      return;
    }
    router.push("/market/new");
  }

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await apiFetch("/api/chat/conversations");
        if (!res.ok) return;
        const data = await res.json();
        const total = (data as { unread_count?: number }[])
          .reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
        setUnread(total);
      } catch {}
    }
    fetchUnread();
    const t = setInterval(fetchUnread, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useListingsInfinite({
      category: category || undefined,
      condition: condition || undefined,
      search: debouncedSearch || undefined,
      area_id: selectedArea?.id || undefined,
    });

  const allListings = data?.pages.flatMap((p) => p.listings) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const onIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
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

  // Register sidebar content unconditionally (hook rule)
  useMarketSidebar(
    isDesktop ? (
      <div className="space-y-4">
        {/* Search */}
        <div className="bg-fog rounded-xl flex items-center gap-2 px-3 py-2.5 border border-border">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 text-mist flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الإعلانات..."
            className="flex-1 text-xs text-ink placeholder:text-mist bg-transparent outline-none min-w-0" dir="rtl" />
          {search && <button onClick={() => setSearch("")} className="text-mist text-sm">×</button>}
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

        {/* Areas */}
        <div>
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">المنطقة</div>
          <button onClick={() => setSelectedArea(null)}
            className={cn("w-full text-right px-3 py-2 rounded-lg text-sm font-body transition-colors mb-1",
              !selectedArea ? "bg-olive-pale text-olive font-semibold" : "text-slate hover:bg-fog hover:text-ink")}>
            كل المناطق
          </button>
          {govOrder.map((gov) => {
            const govAreas = grouped[gov] ?? [];
            if (!govAreas.length) return null;
            return (
              <div key={gov} className="mb-1">
                <button onClick={() => setOpenGovs((p) => ({ ...p, [gov]: !p[gov] }))}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-mist uppercase tracking-wider hover:text-ink transition-colors">
                  <span>{GOV_LABELS[gov]}</span>
                  <svg width="10" height="10" viewBox="0 0 12 12" className={cn("text-mist transition-transform", openGovs[gov] && "rotate-90")}>
                    <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </button>
                {openGovs[gov] && govAreas.map((a) => (
                  <button key={a.id} onClick={() => setSelectedArea(a)}
                    className={cn("w-full text-right px-3 py-1.5 rounded-lg text-[13px] font-body transition-colors",
                      selectedArea?.id === a.id ? "bg-olive-pale text-olive font-semibold" : "text-slate hover:bg-fog hover:text-ink")}>
                    {a.name_ar}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    ) : null
  );

  /* ── Desktop layout ── */
  if (isDesktop) {
    return (
      <div className="p-5 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-extrabold text-lg text-ink">السوق المحلي</h1>
          <div className="flex items-center gap-2">
            <Link href="/market/my" className="text-xs font-semibold text-olive hover:underline">إعلاناتي</Link>
            <Link href="/market/saved" className="text-xs font-semibold text-mist hover:text-ink">المحفوظات</Link>
          </div>
        </div>

        {isLoading && <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)}</div>}

        {!isLoading && allListings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-surface rounded-2xl border border-border">
            <div className="text-5xl mb-3">🛍️</div>
            <div className="font-display font-bold text-ink mb-1">لا توجد إعلانات</div>
            <div className="text-sm text-mist mb-4">جرب تغيير الفلاتر</div>
            <button onClick={handleNewListing} className="px-5 py-2 bg-olive text-white rounded-full text-sm font-semibold">+ أضف إعلاناً</button>
          </div>
        )}

        {!isLoading && allListings.length > 0 && (
          <>
            {total > 0 && <p className="text-[11px] text-mist mb-3">{total} إعلان نشط</p>}
            <div className="grid grid-cols-2 gap-3">
              {allListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing}
                  isSaved={savedIds.has(listing.id)}
                  onSaveToggle={toggleSavedId}
                />
              ))}
            </div>
            {isFetchingNextPage && <div className="py-4 flex justify-center"><div className="w-5 h-5 border-2 border-olive/30 border-t-olive rounded-full animate-spin" /></div>}
            {!hasNextPage && allListings.length >= 20 && <p className="text-center text-xs text-mist py-4">لا توجد إعلانات أخرى</p>}
          </>
        )}
        <div ref={loadMoreRef} className="h-4" />
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

  /* ── Mobile layout ── */
  return (
    <div className="flex flex-col min-h-dvh bg-fog">

      {/* ── Header (olive) ── */}
      <div className="bg-olive px-4 pt-3 pb-3 flex-shrink-0">
        {/* Top row */}
        <div className="flex items-center gap-2 mb-2.5">
          {/* Title */}
          <span className="font-display font-extrabold text-base text-white leading-none flex-1">
            السوق المحلي
          </span>

          {/* Icon buttons */}
          <Link href="/market/my" aria-label="إعلاناتي"
            className="w-7 h-7 flex items-center justify-center bg-white/15 rounded-full">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </Link>
          <Link href="/market/saved" aria-label="المحفوظات"
            className="w-7 h-7 flex items-center justify-center bg-white/15 rounded-full">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link href="/market/chat" aria-label="رسائل"
            className="relative w-7 h-7 flex items-center justify-center bg-white/15 rounded-full">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[13px] h-[13px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>

          {/* Add listing button */}
          <button onClick={handleNewListing}
            className="flex items-center gap-1 bg-white/15 hover:bg-white/25 transition-colors text-white text-[12px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            إعلان
          </button>
        </div>

        {/* Search bar */}
        <div className="bg-white/15 rounded-xl flex items-center gap-2 px-3 py-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 opacity-70 flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="ابحث في الإعلانات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-xs text-white placeholder:text-white/60 bg-transparent outline-none min-w-0"
            dir="rtl"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-white/70 text-base leading-none">×</button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-surface border-b border-border flex-shrink-0">

        {/* Area bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-[7px] h-[7px] rounded-full bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.18)]" />
            <span className="font-display font-bold text-[12px] text-ink">
              {selectedArea?.name_ar ?? "كل المناطق"}
            </span>
          </div>
          <button
            onClick={() => setOpenAreaPicker(true)}
            className="text-[11px] font-semibold text-olive"
          >
            📍 تغيير
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                category === cat.value
                  ? "bg-olive text-white shadow-sm"
                  : "bg-fog text-slate border border-border hover:border-olive-mid"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Condition chips */}
        <div className="flex gap-2 px-4 pb-2.5 overflow-x-auto no-scrollbar">
          {CONDITIONS.map((cond) => (
            <button
              key={cond.value}
              onClick={() => setCondition(cond.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                condition === cond.value
                  ? "bg-olive-pale text-olive border border-olive-mid"
                  : "bg-transparent text-mist border border-border hover:border-olive-mid"
              }`}
            >
              {cond.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Listings ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        {total > 0 && (
          <p className="text-[11px] text-mist px-4 pt-3 pb-1">{total} إعلان نشط</p>
        )}

        {isLoading && (
          <div className="px-4 pt-4">
            {Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && allListings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="text-5xl mb-4">🛍️</div>
            <div className="font-display font-bold text-ink text-lg mb-1">
              {debouncedSearch || category || condition || selectedArea ? "لا توجد نتائج" : "لا توجد إعلانات بعد"}
            </div>
            <div className="text-sm text-mist mb-6">
              {debouncedSearch || category || condition || selectedArea
                ? "جرب تغيير الفلاتر"
                : "كن أول من يضيف إعلاناً"}
            </div>
            <button onClick={handleNewListing} className="px-5 py-2.5 bg-olive text-white rounded-full font-semibold text-sm">
              + أضف إعلاناً
            </button>
          </div>
        )}

        {!isLoading && allListings.length > 0 && (
          <div className="px-4 pt-2 space-y-3">
            {allListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={savedIds.has(listing.id)}
                onSaveToggle={toggleSavedId}
              />
            ))}
            {isFetchingNextPage && (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
              </div>
            )}
            {!hasNextPage && allListings.length >= 20 && (
              <p className="text-center text-xs text-mist py-4">لا توجد إعلانات أخرى</p>
            )}
          </div>
        )}

        <div ref={loadMoreRef} className="h-4" />
      </div>

      {/* ── Area picker sheet ── */}
      {openAreaPicker && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setOpenAreaPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl max-h-[75vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.15)]">
            <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
              <h2 className="font-display font-bold text-ink">اختر المنطقة</h2>
              <button onClick={() => setOpenAreaPicker(false)} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto no-scrollbar flex-1 px-4 py-3 pb-8">
              <button
                onClick={() => { setSelectedArea(null); setOpenAreaPicker(false); }}
                className={cn(
                  "w-full flex items-center gap-3 p-3.5 rounded-2xl border-[1.5px] mb-2 transition-all text-right",
                  !selectedArea ? "border-olive bg-olive-pale" : "border-border bg-surface hover:border-olive-mid"
                )}
              >
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", !selectedArea ? "border-olive bg-olive" : "border-border")}>
                  {!selectedArea && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={cn("font-display font-bold text-sm", !selectedArea ? "text-olive-deep" : "text-ink")}>كل المناطق</span>
              </button>

              {govOrder.map((gov) => {
                const govAreas = grouped[gov];
                if (!govAreas?.length) return null;
                return (
                  <div key={gov} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[11px] font-bold text-mist uppercase tracking-widest">{GOV_LABELS[gov]}</span>
                    </div>
                    {govAreas.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setSelectedArea(a); setOpenAreaPicker(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-2xl border-[1.5px] mb-2 transition-all text-right",
                          selectedArea?.id === a.id ? "border-olive bg-olive-pale" : "border-border bg-surface hover:border-olive-mid"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", selectedArea?.id === a.id ? "border-olive bg-olive" : "border-border")}>
                          {selectedArea?.id === a.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={cn("font-display font-bold text-sm", selectedArea?.id === a.id ? "text-olive-deep" : "text-ink")}>{a.name_ar}</div>
                          <div className="text-xs text-mist mt-0.5">{GOV_LABELS[a.governorate]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
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

      <BottomNav />
    </div>
  );
}
