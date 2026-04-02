"use client";

import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { Product } from "@/types/app";

export function DesktopSearchBar() {
  const router = useRouter();
  const { query, setQuery, results, loading, open, setOpen, clear } = useSearch();

  function handleSelect(product: Product) {
    clear();
    router.push(`/product/${product.id}`);
  }

  function handleSuggest() {
    const name = query.trim();
    clear();
    router.push(`/suggest?name=${encodeURIComponent(name)}`);
  }

  const showDropdown = open && query.trim().length >= 1 && !loading;
  const hasResults = results.length > 0;
  const showNoResults = showDropdown && !hasResults;

  return (
    <div className="relative flex-1 min-w-0">
      <div className="desktop-search-wrap relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن منتج... سكر، أرز، زيت"
          className="w-full h-[38px] bg-white/8 border border-white/14 rounded-[10px] pr-3.5 pl-10 text-[13px] font-body text-white/90 placeholder:text-white/35 outline-none focus:bg-white/12 focus:border-sand/50 transition-colors"
          dir="rtl"
        />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {loading && <div className="absolute left-10 top-1/2 -translate-y-1/2"><LoaderDots size="sm" /></div>}
      </div>

      {showDropdown && hasResults && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelect(product)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fog text-right border-b border-border last:border-0 transition-colors cursor-pointer"
            >
              <span className="text-lg flex-shrink-0">{product.category?.icon ?? "📦"}</span>
              <div className="flex-1 min-w-0 text-right">
                <div className="font-display font-bold text-sm text-ink truncate">{product.name_ar}</div>
                <div className="text-xs text-mist">
                  {product.unit_size} {product.unit} · {product.category?.name_ar ?? ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showNoResults && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50">
          <button
            type="button"
            onClick={handleSuggest}
            className="w-full flex items-center gap-3 px-4 py-3 text-right bg-fog hover:bg-olive-pale transition-colors cursor-pointer"
          >
            <span className="text-lg flex-shrink-0">➕</span>
            <div className="flex-1 min-w-0 text-sm text-olive font-semibold">
              اقترح منتجاً جديداً: {query.trim()}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
