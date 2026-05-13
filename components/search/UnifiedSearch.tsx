"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useProductsSearch, usePlacesSearch } from "@/lib/queries/hooks";
import { fetchListings } from "@/lib/queries/fetchers";
import { useArea } from "@/hooks/useArea";
import { LoaderDots } from "@/components/ui/LoaderDots";
import type { Product } from "@/types/app";

const TOP_N = 3;

export function UnifiedSearch({ variant = "mobile" }: { variant?: "mobile" | "desktop" }) {
  const router = useRouter();
  const { area } = useArea();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setDebounced(""); setOpen(false); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebounced(query.trim());
      setOpen(true);
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const enabled = debounced.length >= 1;

  // Products
  const { data: productsData, isLoading: productsLoading } = useProductsSearch(debounced, TOP_N, area?.id);
  const products = ((productsData?.products ?? []) as Product[]).slice(0, TOP_N);

  // Places
  const { data: placesData, isLoading: placesLoading } = usePlacesSearch(debounced);
  const places = ((placesData?.places ?? []) as any[]).slice(0, TOP_N);

  // Market listings
  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ["unified-search-listings", debounced],
    queryFn: () => fetchListings({ search: debounced, limit: TOP_N }),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
  const listings = ((marketData?.listings ?? []) as any[]).slice(0, TOP_N);

  const loading = productsLoading || placesLoading || marketLoading;
  const hasAny = products.length > 0 || places.length > 0 || listings.length > 0;
  const showDropdown = open && enabled && !loading;

  function select(path: string) {
    setQuery("");
    setDebounced("");
    setOpen(false);
    router.push(path);
  }

  const isDesktop = variant === "desktop";

  return (
    <div className={isDesktop ? "relative w-[260px] flex-shrink-0" : "relative z-20"} ref={wrapRef}>
      {/* Input */}
      {isDesktop ? (
        <div className="desktop-search-wrap relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج، محل، إعلان..."
            className="w-full h-[34px] bg-white/8 border border-white/12 rounded-full pr-3.5 pl-9 text-[12px] font-body text-white/90 placeholder:text-white/35 outline-none focus:bg-white/12 focus:border-sand/50 transition-colors"
            dir="rtl"
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {loading && <div className="absolute left-10 top-1/2 -translate-y-1/2"><LoaderDots size="sm" /></div>}
        </div>
      ) : (
        <div className="bg-white/95 dark:bg-white/12 dark:border dark:border-white/20 rounded-full flex items-center gap-2 px-3 py-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-mist dark:text-white/50 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج، محل، إعلان..."
            className="flex-1 text-xs text-mist dark:text-white placeholder:text-mist dark:placeholder:text-white/50 bg-transparent outline-none min-w-0 font-semibold"
            dir="rtl"
          />
          {loading && <LoaderDots size="sm" className="flex-shrink-0" />}
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && hasAny && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 max-h-[420px] overflow-y-auto" dir="rtl">

          {/* Products */}
          {products.length > 0 && (
            <div>
              <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-mist uppercase tracking-wide">منتجات</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(`/product/${p.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-fog text-right transition-colors cursor-pointer"
                >
                  <span className="text-base flex-shrink-0">{p.category?.icon ?? ""}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-medium text-[13px] text-ink truncate">{p.name_ar}</div>
                    <div className="text-[11px] text-mist">{p.unit_size} {p.unit} · {p.category?.name_ar ?? ""}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Places */}
          {places.length > 0 && (
            <div>
              <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-mist uppercase tracking-wide">محلات</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {places.map((place: any) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => select(`/places/${place.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-fog text-right transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-olive-pale flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {place.avatar_url ? (
                      <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-olive"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-medium text-[13px] text-ink truncate">{place.name}</div>
                    <div className="text-[11px] text-mist">{place.area?.name_ar ?? ""}</div>
                  </div>
                  {place.is_open != null && (
                    <span className={`text-[9px] font-bold flex-shrink-0 ${place.is_open ? "text-olive" : "text-mist"}`}>
                      {place.is_open ? "مفتوح" : "مغلق"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Market listings */}
          {listings.length > 0 && (
            <div>
              <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-mist uppercase tracking-wide">السوق</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {listings.map((listing: any) => (
                <button
                  key={listing.id}
                  type="button"
                  onClick={() => select(`/market/${listing.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-fog text-right transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-fog flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {listing.images?.[0]?.url ? (
                      <img src={listing.images[0].url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mist"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-medium text-[13px] text-ink truncate">{listing.title}</div>
                    <div className="text-[11px] text-mist">
                      {listing.price ? `${listing.price} ₪` : ""}
                      {listing.area?.name_ar ? ` · ${listing.area.name_ar}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {showDropdown && !hasAny && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50" dir="rtl">
          <div className="px-4 py-3 text-sm text-mist text-right">لا توجد نتائج</div>
        </div>
      )}
    </div>
  );
}
