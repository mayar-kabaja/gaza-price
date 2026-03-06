"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Area } from "@/types/app";
import { useSession } from "@/hooks/useSession";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";
import { useCategories, useAreas, useSuggestProduct } from "@/lib/queries/hooks";
import { ReceiptUpload } from "@/components/reports/ReceiptUpload";
import { uploadReceiptPhoto } from "@/lib/api/upload";
import { PRODUCT_UNITS } from "@/lib/constants";
import { playSound } from "@/lib/sounds";

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

interface DesktopSuggestModalProps {
  open: boolean;
  onClose: () => void;
}

export function DesktopSuggestModal({ open, onClose }: DesktopSuggestModalProps) {
  const router = useRouter();
  const { accessToken } = useSession();
  const { data: categoriesData } = useCategories();
  const { data: areasData } = useAreas();
  const suggestProduct = useSuggestProduct();

  const categories = Array.isArray(categoriesData) ? categoriesData : [];
  const areas = (areasData as { areas?: Area[] })?.areas ?? [];
  const sortedCategories = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const [name_ar, setNameAr] = useState("");
  const [category_id, setCategoryId] = useState("");
  const [unit, setUnit] = useState("كغ");
  const [unit_size, setUnitSize] = useState("");
  const [price, setPrice] = useState("");
  const [area_id, setAreaId] = useState("");
  const [store_name_raw, setStoreNameRaw] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [receipt_photo_url, setReceiptPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [priceToast, setPriceToast] = useState<string | null>(null);
  const [unitSizeToast, setUnitSizeToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Array<{ id: string; name_ar: string; similarity: number }>>([]);
  const priceToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unitSizeToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Auto-select area from localStorage
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

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (priceToastRef.current) clearTimeout(priceToastRef.current);
      if (unitSizeToastRef.current) clearTimeout(unitSizeToastRef.current);
      if (successToastRef.current) clearTimeout(successToastRef.current);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const showPriceToast = useCallback((msg: string) => {
    if (priceToastRef.current) clearTimeout(priceToastRef.current);
    setPriceToast(msg);
    priceToastRef.current = setTimeout(() => { setPriceToast(null); priceToastRef.current = null; }, 3000);
  }, []);

  const showUnitSizeToast = useCallback((msg: string) => {
    if (unitSizeToastRef.current) clearTimeout(unitSizeToastRef.current);
    setUnitSizeToast(msg);
    unitSizeToastRef.current = setTimeout(() => { setUnitSizeToast(null); unitSizeToastRef.current = null; }, 3000);
  }, []);

  function resetForm() {
    setNameAr("");
    setCategoryId("");
    setUnit("كغ");
    setUnitSize("");
    setPrice("");
    setStoreNameRaw("");
    setStorePhone("");
    setReceiptPhotoUrl(null);
    setError("");
    setSimilarProducts([]);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function validate(): string | null {
    if (!name_ar.trim()) return "يرجى إدخال اسم المنتج";
    if (!category_id) return "يرجى اختيار التصنيف";
    const size = Number(unit_size);
    if (!unit_size.trim() || isNaN(size) || size < 0) return "يرجى إدخال الكمية صحيحة";
    const priceNum = Number(price);
    if (!price.trim() || isNaN(priceNum) || priceNum <= 0) return "يرجى إدخال سعر صحيح";
    if (!area_id) return "يرجى اختيار المنطقة";
    if (!store_name_raw.trim()) return "يرجى إدخال اسم المتجر";
    if (store_name_raw.trim().length < 2) return "اسم المتجر يجب أن يكون حرفين على الأقل";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
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
        store_phone: storePhone.trim() || undefined,
        receipt_photo_url: receipt_photo_url || undefined,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      playSound("submitted");
      setSuccessToast("تم إرسال الاقتراح بنجاح");
      if (successToastRef.current) clearTimeout(successToastRef.current);
      successToastRef.current = setTimeout(() => {
        setSuccessToast(null);
        successToastRef.current = null;
        resetForm();
        onClose();
      }, 1500);
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

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) handleClose(); }}
    >
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden animate-fade-up">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-olive-pale/50">
          <div>
            <h2 className="font-display font-extrabold text-lg text-ink">اقتراح منتج جديد</h2>
            <p className="text-xs text-mist font-body mt-0.5">أضفه وسيظهر بعد مراجعة بسيطة</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-mist hover:text-ink hover:bg-fog transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Product name */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">اسم المنتج</label>
            <input
              type="text"
              value={name_ar}
              onChange={(e) => { setNameAr(e.target.value); setError(""); }}
              placeholder="مثال: شاي أحمد ٢٥٠غ"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm font-body text-ink outline-none"
              dir="rtl"
              autoFocus
            />
          </div>

          {/* Category + Unit + Unit size */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">التصنيف والوحدة</label>
            <div className="flex gap-2 flex-wrap">
              <select
                value={category_id}
                onChange={(e) => { setCategoryId(e.target.value); setError(""); }}
                className="flex-1 min-w-[100px] bg-surface border border-border rounded-xl px-4 py-3 text-sm font-body text-ink outline-none cursor-pointer"
              >
                <option value="">التصنيف</option>
                {sortedCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>
                ))}
              </select>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="bg-surface border border-border rounded-xl px-4 py-3 text-sm font-body text-ink outline-none cursor-pointer"
              >
                {PRODUCT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                lang="en"
                value={unit_size}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (hasArabicDigits(raw)) {
                    showUnitSizeToast("الكمية: استخدم الأرقام الإنجليزية (0-9) فقط");
                    setUnitSize(normalizePriceInput(raw));
                  } else setUnitSize(raw);
                  setError("");
                }}
                placeholder="250"
                className="w-20 bg-surface border border-border rounded-xl px-3 py-3 text-sm font-body text-ink outline-none text-left"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">السعر الذي رأيته</label>
            <div className="bg-surface border border-border rounded-xl flex items-center overflow-hidden">
              <input
                type="text"
                inputMode="decimal"
                lang="en"
                dir="ltr"
                value={price}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (hasArabicDigits(raw)) {
                    showPriceToast("استخدم الأرقام الإنجليزية (0-9) فقط");
                    setPrice(normalizePriceInput(raw));
                  } else setPrice(raw);
                  setError("");
                }}
                placeholder="0.00"
                className="flex-1 px-4 py-3 text-lg font-display font-bold text-ink outline-none bg-transparent price-number text-left"
              />
              <div className="px-4 text-mist font-display font-bold text-lg border-r border-border">₪</div>
            </div>
          </div>

          {/* Area */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">المنطقة</label>
            <select
              value={area_id}
              onChange={(e) => { setAreaId(e.target.value); setError(""); }}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm font-body text-ink outline-none cursor-pointer"
            >
              <option value="">اختر المنطقة</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name_ar}</option>
              ))}
            </select>
          </div>

          {/* Store name */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">اسم المتجر</label>
            <input
              type="text"
              value={store_name_raw}
              onChange={(e) => { setStoreNameRaw(e.target.value); setError(""); }}
              placeholder="مثال: بقالة أبو رامي"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm font-body text-ink outline-none"
              dir="rtl"
            />
          </div>

          {/* Store phone */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">رقم هاتف المتجر (اختياري)</label>
            <input
              type="tel"
              inputMode="tel"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="مثال: 0599123456"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm font-body text-ink outline-none"
              dir="ltr"
            />
          </div>

          {/* Receipt upload */}
          <ReceiptUpload
            value={receipt_photo_url}
            onChange={setReceiptPhotoUrl}
            onError={setError}
            uploadFn={(file) => uploadReceiptPhoto(file, accessToken)}
            disabled={suggestProduct.isPending}
          />

          {/* Error */}
          {error && <ApiErrorBox message={error} onDismiss={() => setError("")} />}

          {/* Similar products */}
          {similarProducts.length > 0 && (
            <div className="rounded-xl bg-olive-pale border border-olive-mid p-3">
              <p className="text-xs font-bold text-olive-deep mb-2">اختر منتجاً موجوداً إن كان مطابقاً:</p>
              <div className="flex flex-wrap gap-2">
                {similarProducts.map((s) => (
                  <Link
                    key={s.id}
                    href={`/submit?product_id=${s.id}`}
                    onClick={handleClose}
                    className="px-3 py-1.5 rounded-lg bg-surface border border-olive text-olive text-sm font-body cursor-pointer"
                  >
                    {s.name_ar}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Toasts */}
          {(priceToast || unitSizeToast) && (
            <div className="rounded-xl px-4 py-2.5 text-center text-sm text-white" style={{ background: "rgba(26,31,46,0.95)" }} role="status">
              {priceToast || unitSizeToast}
            </div>
          )}
          {successToast && (
            <div className="rounded-xl bg-confirm px-4 py-2.5 text-center text-sm text-white" role="status">
              {successToast}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-fog/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-display font-bold text-slate hover:bg-surface transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={suggestProduct.isPending}
              onClick={handleSubmit}
              className="flex-1 bg-olive text-white py-2.5 rounded-xl font-display font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-olive-deep transition-colors cursor-pointer"
            >
              {suggestProduct.isPending ? "جاري الإرسال..." : "أرسل الاقتراح والسعر"}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 rounded-lg bg-sand-light border border-sand/30 px-3 py-2">
            <span className="text-sm">⌛</span>
            <p className="text-xs text-ink font-body">سيظهر بعد مراجعة المشرف — عادةً خلال ٢٤ ساعة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
