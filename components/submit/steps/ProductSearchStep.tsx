"use client";

import { Product } from "@/types/app";
import { useSearch } from "@/hooks/useSearch";
import { LoaderDots } from "@/components/ui/LoaderDots";

interface ProductSearchStepProps {
  onSelect: (product: Product) => void;
  onSuggestNew: (name: string) => void;
}

export function ProductSearchStep({ onSelect, onSuggestNew }: ProductSearchStepProps) {
  const { query, setQuery, results, loading, open } = useSearch();

  return (
    <div>
      {/* Search box */}
      <div className="relative mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-mist pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث..."
          className="w-full bg-surface border-[1.5px] border-border rounded-[14px] py-3 pr-10 pl-3.5 text-sm font-body text-ink outline-none focus:border-olive transition-colors"
          dir="rtl"
          autoFocus
        />
        {loading && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <LoaderDots size="sm" />
          </div>
        )}
      </div>

      {/* Results */}
      {open && query.trim().length >= 1 && !loading && (
        <div className="bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)] max-h-60 overflow-y-auto">
          {results.length > 0 ? (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p)}
                className="w-full flex items-center justify-between px-4 py-3 text-right border-b border-border/50 last:border-0 hover:bg-olive-pale/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base flex-shrink-0">{p.category?.icon ?? "📦"}</span>
                  <div className="min-w-0">
                    <div className="font-body font-bold text-sm text-ink">{p.name_ar}</div>
                    <div className="text-[11px] text-mist">{p.unit_size} {p.unit}</div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={() => onSuggestNew(query.trim())}
              className="w-full flex items-center gap-2 px-4 py-3 text-right hover:bg-olive-pale/30 transition-colors"
            >
              <div className="w-[22px] h-[22px] rounded-full bg-olive-pale flex items-center justify-center flex-shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-olive">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-sm text-olive font-bold">
                أضف &quot;{query.trim()}&quot; كمنتج جديد
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
