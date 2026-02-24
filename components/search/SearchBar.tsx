"use client";

import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { Product } from "@/types/app";

export function SearchBar() {
  const router = useRouter();
  const { query, setQuery, results, loading, open, setOpen, clear } = useSearch();

  function handleSelect(product: Product) {
    clear();
    router.push(`/product/${product.id}`);
  }

  return (
    <div className="relative z-20">
      <div className="bg-white rounded-xl flex items-center gap-2.5 px-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.18)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-ink/40 flex-shrink-0">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث... سكر، أرز، زيت، دقيق"
          className="flex-1 py-3 text-sm font-body text-ink placeholder:text-mist bg-transparent outline-none"
          dir="rtl"
        />
        {loading && (
          <LoaderDots size="sm" className="flex-shrink-0" />
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-border overflow-hidden z-30">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fog text-right border-b border-border last:border-0 transition-colors"
            >
              <span className="text-lg">{product.category?.icon ?? "📦"}</span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm text-ink truncate">
                  {product.name_ar}
                </div>
                <div className="text-xs text-mist">
                  {product.unit_size} {product.unit} · {product.category?.name_ar}
                </div>
              </div>
            </button>
          ))}
          {/* Suggest row */}
          <button
            onClick={() => { setOpen(false); router.push(`/suggest?name=${encodeURIComponent(query)}`); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-right bg-fog hover:bg-olive-pale transition-colors"
          >
            <span className="text-lg">➕</span>
            <div className="text-sm text-olive font-semibold">
              اقترح منتجاً جديداً: "{query}"
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
