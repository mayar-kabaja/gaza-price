"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Product, Area } from "@/types/app";

function SubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product_id");

  const [product, setProduct] = useState<Product | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [price, setPrice] = useState("");
  const [areaId, setAreaId] = useState("");
  const [storeNameRaw, setStoreNameRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (productId) {
      fetch(`/api/products/${productId}`).then(r => r.json()).then(setProduct);
    }
    fetch("/api/areas").then(r => r.json()).then(d => {
      setAreas(d.areas ?? []);
      // Pre-select from localStorage
      try {
        const saved = localStorage.getItem("gazaprice_area");
        if (saved) { const a = JSON.parse(saved); setAreaId(a.id); }
      } catch {}
    });
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !price || !areaId) { setError("يرجى ملء جميع الحقول"); return; }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
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

    router.push(`/product/${productId}?submitted=1`);
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
            <div className="bg-olive-pale border border-olive-mid rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-lg">{product.category?.icon ?? "📦"}</span>
              <div>
                <div className="font-display font-bold text-sm text-ink">{product.name_ar}</div>
                <div className="text-xs text-mist">{product.unit_size} {product.unit}</div>
              </div>
            </div>
          ) : (
            <Link href="/" className="block bg-fog border border-border rounded-2xl px-4 py-3 text-sm text-mist">
              اختر منتجاً من البحث →
            </Link>
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
