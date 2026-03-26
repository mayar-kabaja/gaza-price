"use client";

import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { Product } from "@/types/app";

interface SearchBarProps {
  hideActions?: boolean;
}

export function SearchBar({ hideActions = false }: SearchBarProps) {
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
    <div className="relative z-20">
      <div className="bg-white/95 dark:bg-white/12 dark:border dark:border-white/20 rounded-2xl flex items-center gap-2 px-3 py-2.5">
        <span className="text-xs text-mist dark:text-white/50">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={hideActions ? "ابحث عن محل، مطعم، منتج..." : "ابحث... سكر، أرز، زيت، دقيق"}
          className="flex-1 text-xs text-mist dark:text-white placeholder:text-mist dark:placeholder:text-white/50 bg-transparent outline-none min-w-0 font-semibold"
          dir="rtl"
        />
        {loading && (
          <LoaderDots size="sm" className="flex-shrink-0" />
        )}
      </div>

      {/* Results dropdown */}
      {showDropdown && hasResults && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-30">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelect(product)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fog text-right border-b border-border last:border-0 transition-colors"
            >
              <span className="text-lg flex-shrink-0">{product.category?.icon ?? "📦"}</span>
              <div className="flex-1 min-w-0 text-right">
                <div className="font-display font-bold text-sm text-ink truncate">
                  {product.name_ar}
                </div>
                <div className="text-xs text-mist">
                  {product.unit_size} {product.unit} · {product.category?.name_ar ?? ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results — suggest new product */}
      {showNoResults && (
        <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-30">
          <button
            type="button"
            onClick={handleSuggest}
            className="w-full flex items-center gap-3 px-4 py-3 text-right bg-fog hover:bg-olive-pale transition-colors"
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
