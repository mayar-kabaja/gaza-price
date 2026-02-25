"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCategories, useAreas, useSuggestProduct } from "@/lib/queries/hooks";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { BottomNav } from "@/components/layout/BottomNav";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";

const UNITS = [
  { value: "غرام", label: "غرام" },
  { value: "كغ", label: "كغ" },
  { value: "لتر", label: "لتر" },
  { value: "مل", label: "مل" },
  { value: "علبة", label: "علبة" },
  { value: "قطعة", label: "قطعة" },
  { value: "باكيت", label: "باكيت" },
  { value: "كرتون", label: "كرتون" },
  { value: "كوب", label: "كوب" },
  { value: "أخرى", label: "أخرى" },
];

const ARABIC_DIGITS = /[٠-٩]/g;
const ARABIC_TO_ENGLISH: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};
function normalizePriceInput(value: string): string {
  return value.replace(ARABIC_DIGITS, (d) => ARABIC_TO_ENGLISH[d] ?? d);
}
function hasArabicDigits(value: string): boolean {
  return ARABIC_DIGITS.test(value);
}
const PRICE_TOAST_MSG = "استخدم الأرقام الإنجليزية (0-9) فقط";

function SuggestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameFromUrl = searchParams.get("name")?.trim() ?? "";

  const { data: categoriesData } = useCategories();
  const { data: areasData } = useAreas();
  const suggestProduct = useSuggestProduct();

  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const areas = areasData?.areas ?? [];
  const sortedCategories = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const [name_ar, setNameAr] = useState(nameFromUrl);
  const [category_id, setCategoryId] = useState("");
  const [unit, setUnit] = useState("كغ");
  const [unit_size, setUnitSize] = useState("");
  const [price, setPrice] = useState("");
  const [area_id, setAreaId] = useState("");
  const [store_name_raw, setStoreNameRaw] = useState("");
  const [error, setError] = useState("");
  const [priceToast, setPriceToast] = useState<string | null>(null);
  const priceToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const successToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Array<{ id: string; name_ar: string; similarity: number }>>([]);

  useEffect(() => {
    setNameAr((prev) => (nameFromUrl && !prev ? nameFromUrl : prev));
  }, [nameFromUrl]);

  useEffect(() => {
    if (areas.length > 0 && !area_id) {
      try {
        const saved = localStorage.getItem("gazaprice_area");
        if (saved) {
          const a = JSON.parse(saved);
          if (a?.id) setAreaId(a.id);
        }
      } catch {}
    }
  }, [areas.length, area_id]);

  const showPriceToast = useCallback((msg: string) => {
    if (priceToastRef.current) clearTimeout(priceToastRef.current);
    setPriceToast(msg);
    priceToastRef.current = setTimeout(() => {
      setPriceToast(null);
      priceToastRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (priceToastRef.current) clearTimeout(priceToastRef.current);
    if (successToastRef.current) clearTimeout(successToastRef.current);
  }, []);

  function validate(): string | null {
    if (!name_ar.trim()) return "يرجى إدخال اسم المنتج";
    if (!category_id) return "يرجى اختيار التصنيف";
    const size = Number(unit_size);
    if (!unit_size.trim() || isNaN(size) || size < 0) return "يرجى إدخال الكمية صحيحة";
    const priceNum = Number(price);
    if (!price.trim() || isNaN(priceNum) || priceNum <= 0) return "يرجى إدخال سعر صحيح";
    if (!area_id) return "يرجى اختيار المنطقة";
    if (store_name_raw.trim().length === 1) return "اسم المتجر يجب أن يكون حرفين على الأقل";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setSimilarProducts([]);
    try {
      await suggestProduct.mutateAsync({
        name_ar: name_ar.trim(),
        category_id,
        unit: unit || undefined,
        unit_size: Number(unit_size),
        price: Number(price),
        area_id,
        store_name_raw: store_name_raw.trim() || undefined,
      });
      setSuccessToast("تم إرسال الاقتراح بنجاح");
      if (successToastRef.current) clearTimeout(successToastRef.current);
      successToastRef.current = setTimeout(() => {
        setSuccessToast(null);
        successToastRef.current = null;
        router.replace("/?suggested=1");
      }, 2000);
    } catch (err: unknown) {
      const status = (err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 500) as number;
      const data = (err && typeof err === "object" && "data" in err ? (err as { data: ApiErrorResponse }).data : {}) as ApiErrorResponse;
      if (data?.error === "SIMILAR_PRODUCT_EXISTS" && Array.isArray(data.similar)) {
        setSimilarProducts(data.similar);
        setError(data.message ?? "وجدنا منتجات مشابهة، هل تقصد أحدها؟");
      } else {
        handleApiError(new Response(null, { status }), data, setError, router);
      }
    }
  }

  const productDisplayName = name_ar.trim() || nameFromUrl || "المنتج";

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <div className="bg-olive px-5 pt-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/submit" className="text-white/60 hover:text-white font-body text-sm">
            ← رجوع
          </Link>
        </div>
        <h1 className="font-display font-extrabold text-xl text-white">
          اقتراح منتج جديد
        </h1>
        <p className="text-sm text-white/70 mt-1 font-body">
          لم نجد المنتج - ساعدنا بإضافته
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto pb-24">
        {/* Product not found card */}
        <div className="px-4 pt-4">
          <div className="bg-white rounded-2xl border border-border p-5 text-center shadow-sm">
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-display font-bold text-ink text-lg">
              «{productDisplayName}» غير موجود
            </p>
            <p className="text-sm text-mist mt-1 font-body">
              أضفه وسيظهر بعد مراجعة بسيطة
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">اسم المنتج</label>
            <input
              type="text"
              value={name_ar}
              onChange={(e) => { setNameAr(e.target.value); setError(""); }}
              placeholder="مثال: شاي أحمد ٢٥٠غ"
              className="w-full bg-white border border-olive-mid rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none"
              dir="rtl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">الوحدة والكمية</label>
            <div className="flex gap-2 flex-wrap">
              <select
                value={category_id}
                onChange={(e) => { setCategoryId(e.target.value); setError(""); }}
                className="flex-1 min-w-[100px] bg-white border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none"
              >
                <option value="">التصنيف</option>
                {sortedCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>
                ))}
              </select>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="bg-white border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={unit_size}
                onChange={(e) => setUnitSize(e.target.value)}
                placeholder="250"
                className="w-24 bg-white border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">السعر الذي رأيته</label>
            <div className="bg-white border border-border rounded-2xl flex items-center overflow-hidden">
              <span className="px-4 text-mist text-sm">ش ₪</span>
              <input
                type="text"
                inputMode="decimal"
                lang="en"
                dir="ltr"
                value={price}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (hasArabicDigits(raw)) {
                    showPriceToast(PRICE_TOAST_MSG);
                    setPrice(normalizePriceInput(raw));
                  } else setPrice(raw);
                  setError("");
                }}
                placeholder="0.00"
                className="flex-1 px-4 py-3.5 text-lg font-display font-bold text-ink outline-none bg-transparent text-left price-number"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">المنطقة</label>
            <select
              value={area_id}
              onChange={(e) => { setAreaId(e.target.value); setError(""); }}
              className="w-full bg-white border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none"
            >
              <option value="">اختر المنطقة</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name_ar}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">اسم المتجر (اختياري)</label>
            <input
              type="text"
              value={store_name_raw}
              onChange={(e) => { setStoreNameRaw(e.target.value); setError(""); }}
              placeholder="مثال: بقالة أبو رامي"
              className="w-full bg-white border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none"
              dir="rtl"
            />
          </div>

          {/* Receipt placeholder */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">صورة الإيصال (اختياري)</label>
            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-fog/50">
              <span className="text-2xl block mb-2">📸</span>
              <p className="text-sm text-mist font-body">اضغط لرفع صورة</p>
              <p className="text-xs text-mist mt-1">يساعد في التحقق من المنتج · قريباً</p>
            </div>
          </div>

          {error && (
            <ApiErrorBox message={error} onDismiss={() => setError("")} />
          )}

          {similarProducts.length > 0 && (
            <div className="rounded-xl bg-olive-pale border border-olive-mid p-3">
              <p className="text-xs font-bold text-olive-deep mb-2">اختر منتجاً موجوداً إن كان مطابقاً:</p>
              <div className="flex flex-wrap gap-2">
                {similarProducts.map((s) => (
                  <Link
                    key={s.id}
                    href={`/submit?product_id=${s.id}`}
                    className="px-3 py-1.5 rounded-lg bg-white border border-olive text-olive text-sm font-body"
                  >
                    {s.name_ar}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {priceToast && (
            <div className="fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-ink/95 px-4 py-2.5 text-center text-sm text-white shadow-lg">
              {priceToast}
            </div>
          )}
          {successToast && (
            <div className="fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-olive/80 px-3 py-2 text-center text-xs text-white font-medium shadow-lg backdrop-blur-sm">
              {successToast}
            </div>
          )}

          <button
            type="submit"
            disabled={suggestProduct.isPending}
            className="w-full bg-olive text-white py-4 rounded-2xl font-display font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
          >
            + أرسل الاقتراح والسعر
          </button>
        </div>

        {/* Footer info */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2 rounded-xl bg-sand-light border border-sand/30 px-4 py-3">
            <span className="text-lg">⌛</span>
            <div>
              <p className="text-sm font-body text-ink font-medium">سيظهر بعد مراجعة المشرف - عادةً خلال ٢٤ ساعة</p>
              <p className="text-xs text-mist mt-0.5">سعرك محفوظ وسينشر فور الموافقة</p>
            </div>
          </div>
        </div>
      </form>

      <BottomNav />
    </div>
  );
}

export default function SuggestPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-fog flex items-center justify-center font-body text-mist">جاري التحميل...</div>}>
      <SuggestContent />
    </Suspense>
  );
}
