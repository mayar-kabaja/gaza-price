"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Product, Area } from "@/types/app";
import { useSearch } from "@/hooks/useSearch";
import { useSession } from "@/hooks/useSession";
import { LoaderDots } from "@/components/ui/LoaderDots";

function SubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get("product_id");
  const { accessToken } = useSession();

  const { query, setQuery, results, loading, open, setOpen, clear } = useSearch();
  const [product, setProduct] = useState<Product | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [price, setPrice] = useState("");
  const [areaId, setAreaId] = useState("");
  const [storeNameRaw, setStoreNameRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showNewProductInput, setShowNewProductInput] = useState(false);
  const [newProductName, setNewProductName] = useState("");

  useEffect(() => {
    if (productIdFromUrl) {
      fetch(`/api/products/${productIdFromUrl}`).then(r => r.json()).then(setProduct);
    }
    fetch("/api/areas").then(r => r.json()).then(d => {
      setAreas(d.areas ?? []);
      try {
        const saved = localStorage.getItem("gazaprice_area");
        if (saved) { const a = JSON.parse(saved); setAreaId(a.id); }
      } catch {}
    });
  }, [productIdFromUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = product?.id ?? productIdFromUrl;
    if (!id || !price || !areaId) { setError("يرجى ملء جميع الحقول"); return; }

    setSubmitting(true);
    setError("");

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const res = await fetch("/api/reports", {
      method: "POST",
      headers,
      body: JSON.stringify({
        product_id: id,
        price: parseFloat(price),
        area_id: areaId,
        store_name_raw: storeNameRaw || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? "حدث خطأ");
      setSubmitting(false);
      return;
    }

    router.push(`/product/${id}?submitted=1`);
  }

  function handleSelectProduct(p: Product) {
    setProduct(p);
    clear();
    setOpen(false);
    setShowNewProductInput(false);
  }

  function handleSuggestNewProduct() {
    setNewProductName(query.trim());
    setShowNewProductInput(true);
    setOpen(false);
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="bg-olive px-5 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/60">←</Link>
          <div className="font-display font-extrabold text-lg text-white">
            إضافة سعر جديد
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-4 py-5 space-y-4 overflow-y-auto pb-8">

        {/* Product */}
        <div>
          <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">المنتج</label>
          {product ? (
            <div className="bg-olive-pale border border-olive-mid rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0">{product.category?.icon ?? "📦"}</span>
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm text-ink">{product.name_ar}</div>
                  <div className="text-xs text-mist">{product.unit_size} {product.unit}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setProduct(null); clear(); setShowNewProductInput(false); }}
                className="text-mist hover:text-ink text-sm flex-shrink-0"
              >
                تغيير
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="bg-white border border-border rounded-2xl flex items-center gap-2.5 px-3.5 py-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-ink/40 flex-shrink-0">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث... سكر، أرز، زيت، دقيق"
                  className="flex-1 py-2 text-sm font-body text-ink placeholder:text-mist bg-transparent outline-none min-w-0"
                  dir="rtl"
                />
                {loading && <LoaderDots size="sm" className="flex-shrink-0" />}
              </div>

              {open && query.trim().length >= 1 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-30 max-h-60 overflow-y-auto">
                  {results.length > 0 ? (
                    results.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fog text-right border-b border-border last:border-0 transition-colors"
                      >
                        <span className="text-lg flex-shrink-0">{p.category?.icon ?? "📦"}</span>
                        <div className="flex-1 min-w-0 text-right">
                          <div className="font-display font-bold text-sm text-ink truncate">{p.name_ar}</div>
                          <div className="text-xs text-mist">{p.unit_size} {p.unit}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={handleSuggestNewProduct}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right bg-fog hover:bg-olive-pale transition-colors"
                    >
                      <span className="text-lg flex-shrink-0">➕</span>
                      <span className="flex-1 min-w-0 text-sm text-olive font-semibold text-right">
                        اقترح منتجاً جديداً: {query.trim()}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {showNewProductInput && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="اسم المنتج المقترح"
                    className="w-full bg-white border border-border rounded-2xl px-4 py-3 text-sm font-body text-ink outline-none"
                    dir="rtl"
                  />
                  <Link
                    href={newProductName.trim() ? `/suggest?name=${encodeURIComponent(newProductName.trim())}` : "/suggest"}
                    className="block w-full py-3 rounded-xl bg-olive-pale border border-olive text-olive text-center font-display font-bold text-sm"
                  >
                    اقترح المنتج للمراجعة
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">السعر</label>
          <div className="bg-white border border-border rounded-2xl flex items-center overflow-hidden">
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="flex-1 px-4 py-3.5 text-lg font-display font-bold text-ink outline-none bg-transparent price-number"
            />
            <div className="px-4 text-mist font-display font-bold text-lg border-r border-border">₪</div>
          </div>
        </div>

        {/* Area */}
        <div>
          <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">المنطقة</label>
          <select
            value={areaId}
            onChange={e => setAreaId(e.target.value)}
            className="w-full bg-white border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none appearance-none"
          >
            <option value="">اختر المنطقة</option>
            {areas.map(area => (
              <option key={area.id} value={area.id}>{area.name_ar}</option>
            ))}
          </select>
        </div>

        {/* Store name */}
        <div>
          <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">اسم المتجر (اختياري)</label>
          <input
            type="text"
            value={storeNameRaw}
            onChange={e => setStoreNameRaw(e.target.value)}
            placeholder="مثال: بقالة أبو رامي"
            className="w-full bg-white border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !product || !price || !areaId}
          className="w-full bg-olive text-white py-4 rounded-2xl font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-all"
        >
          {submitting ? "جاري الإرسال..." : "إرسال السعر ←"}
        </button>

        <p className="text-center text-xs text-mist">مجهول الهوية تماماً · لا اسم · لا هاتف</p>
      </form>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitForm />
    </Suspense>
  );
}
