"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { usePlacesSearch, useListingsInfinite } from "@/lib/queries/hooks";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { Product } from "@/types/app";

type SearchMode = "products" | "places" | "market" | "chat";

function getMode(pathname: string): SearchMode {
  if (pathname.startsWith("/places")) return "places";
  if (pathname.startsWith("/market/chat")) return "chat";
  if (pathname.startsWith("/market")) return "market";
  return "products";
}

const PLACEHOLDERS: Record<SearchMode, string> = {
  products: "ابحث عن منتج...",
  places: "ابحث عن محل أو مطعم...",
  market: "ابحث في السوق...",
  chat: "ابحث في المحادثات...",
};

export function DesktopSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const mode = getMode(pathname);

  // Shared query state
  const [localQuery, setLocalQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!localQuery.trim()) { setDebounced(""); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(localQuery.trim()), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [localQuery]);

  // Clear when navigating
  useEffect(() => { setLocalQuery(""); setDebounced(""); }, [pathname]);

  // Product search
  const productSearch = useSearch();

  // Places search
  const { data: placesData, isLoading: placesLoading } = usePlacesSearch(
    mode === "places" ? debounced : ""
  );
  const placesResults = (placesData?.places ?? []) as any[];

  // Market search
  const { data: marketData, isLoading: marketLoading } = useListingsInfinite({
    search: mode === "market" ? debounced : undefined,
  });
  const marketResults = (marketData?.pages?.flatMap(p => p.listings) ?? []).slice(0, 8);

  // Route queries correctly
  const query = mode === "products" ? productSearch.query : localQuery;
  const setQuery = mode === "products" ? productSearch.setQuery : setLocalQuery;
  const loading = mode === "products" ? productSearch.loading
    : mode === "places" ? placesLoading
    : mode === "market" ? marketLoading
    : false;

  const hasQuery = query.trim().length >= 1;
  const showDropdown = hasQuery && !loading;

  const hasResults = mode === "products" ? productSearch.results.length > 0
    : mode === "places" ? placesResults.length > 0
    : mode === "market" ? (debounced.length > 0 && marketResults.length > 0)
    : false;

  function clear() {
    if (mode === "products") productSearch.clear();
    else { setLocalQuery(""); setDebounced(""); }
  }

  return (
    <div className="relative w-[260px] flex-shrink-0">
      <div className="desktop-search-wrap relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={PLACEHOLDERS[mode]}
          className="w-full h-[34px] bg-white/8 border border-white/12 rounded-full pr-3.5 pl-9 text-[12px] font-body text-white/90 placeholder:text-white/35 outline-none focus:bg-white/12 focus:border-sand/50 transition-colors"
          dir="rtl"
        />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {loading && <div className="absolute left-10 top-1/2 -translate-y-1/2"><LoaderDots size="sm" /></div>}
      </div>

      {showDropdown && hasResults && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 max-h-[360px] overflow-y-auto">
          {mode === "places" && placesResults.map((place: any) => (
            <button
              key={place.id}
              type="button"
              onClick={() => { clear(); router.push(`/places/${place.id}`); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fog text-right border-b border-border last:border-0 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-olive-pale flex items-center justify-center flex-shrink-0 overflow-hidden">
                {place.avatar_url ? (
                  <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-olive"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="font-display font-medium text-sm text-ink truncate">{place.name}</div>
                <div className="text-xs text-mist">{place.area?.name_ar ?? ""}</div>
              </div>
              {place.is_open != null && (
                <span className={`text-[9px] font-bold flex-shrink-0 ${place.is_open ? "text-olive" : "text-mist"}`}>
                  {place.is_open ? "مفتوح" : "مغلق"}
                </span>
              )}
            </button>
          ))}

          {mode === "market" && marketResults.map((listing: any) => (
            <button
              key={listing.id}
              type="button"
              onClick={() => { clear(); router.push(`/market/${listing.id}`); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fog text-right border-b border-border last:border-0 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-fog flex items-center justify-center flex-shrink-0 overflow-hidden">
                {listing.images?.[0]?.url ? (
                  <img src={listing.images[0].url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mist"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                )}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="font-display font-medium text-sm text-ink truncate">{listing.title}</div>
                <div className="text-xs text-mist">
                  {listing.price ? `${listing.price} ₪` : ""}
                  {listing.area?.name_ar ? ` · ${listing.area.name_ar}` : ""}
                </div>
              </div>
            </button>
          ))}

          {mode === "products" && productSearch.results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => { productSearch.clear(); router.push(`/product/${product.id}`); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fog text-right border-b border-border last:border-0 transition-colors cursor-pointer"
            >
              <span className="text-lg flex-shrink-0">{product.category?.icon ?? "📦"}</span>
              <div className="flex-1 min-w-0 text-right">
                <div className="font-display font-medium text-sm text-ink truncate">{product.name_ar}</div>
                <div className="text-xs text-mist">
                  {product.unit_size} {product.unit} · {product.category?.name_ar ?? ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && !hasResults && mode === "products" && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50">
          <button
            type="button"
            onClick={() => { const name = query.trim(); productSearch.clear(); router.push(`/suggest?name=${encodeURIComponent(name)}`); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-right bg-fog hover:bg-olive-pale transition-colors cursor-pointer"
          >
            <div className="flex-1 min-w-0 text-sm text-olive font-semibold">
              اقترح منتج جديد: {query.trim()}
            </div>
          </button>
        </div>
      )}

      {showDropdown && !hasResults && mode !== "products" && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50">
          <div className="px-4 py-3 text-sm text-mist text-right">لا توجد نتائج</div>
        </div>
      )}
    </div>
  );
}
