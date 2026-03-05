"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Product, Area } from "@/types/app";
import { useSearch } from "@/hooks/useSearch";
import { useSession } from "@/hooks/useSession";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";
import { validateSubmitPrice } from "@/lib/validation/submit-price";
import { useAreas, useSubmitReport } from "@/lib/queries/hooks";
import { ReceiptUpload } from "@/components/reports/ReceiptUpload";
import { uploadReceiptPhoto } from "@/lib/api/upload";
import { enqueueReport } from "@/lib/offline/queue";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

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

interface DesktopSubmitModalProps {
  open: boolean;
  onClose: () => void;
}

export function DesktopSubmitModal({ open, onClose }: DesktopSubmitModalProps) {
  const router = useRouter();
  const { accessToken } = useSession();

  const { query, setQuery, results, loading, open: searchOpen, setOpen: setSearchOpen, clear } = useSearch();
  const { data: areasData } = useAreas();
  const submitReport = useSubmitReport();
  const { refreshCount: refreshQueueCount } = useOfflineQueue();

  const [product, setProduct] = useState<Product | null>(null);
  const [price, setPrice] = useState("");
  const [areaId, setAreaId] = useState("");
  const [storeNameRaw, setStoreNameRaw] = useState("");
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | undefined>(undefined);
  const [priceToast, setPriceToast] = useState<string | null>(null);
  const [queuedToast, setQueuedToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const priceToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const areas = (areasData as { areas?: Area[] })?.areas ?? [];
  const submitting = submitReport.isPending;

  const showPriceToast = useCallback((message: string) => {
    if (priceToastTimeoutRef.current) clearTimeout(priceToastTimeoutRef.current);
    setPriceToast(message);
    priceToastTimeoutRef.current = setTimeout(() => {
      setPriceToast(null);
      priceToastTimeoutRef.current = null;
    }, 3000);
  }, []);

  // Auto-select area from localStorage
  useEffect(() => {
    if (areas.length > 0 && !areaId) {
      try {
        const saved = localStorage.getItem("gazaprice_area");
        if (saved) {
          const a = JSON.parse(saved);
          if (a?.id) setAreaId(a.id);
        }
      } catch {}
    }
  }, [areas.length, areaId]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (priceToastTimeoutRef.current) clearTimeout(priceToastTimeoutRef.current);
      if (queuedToastTimeoutRef.current) clearTimeout(queuedToastTimeoutRef.current);
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

  function resetForm() {
    setProduct(null);
    setPrice("");
    setStoreNameRaw("");
    setReceiptPhotoUrl(null);
    setError("");
    setRetryAfterSeconds(undefined);
    clear();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSelectProduct(p: Product) {
    setProduct(p);
    setError("");
    clear();
    setSearchOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const id = product?.id ?? null;
    const frontendError = validateSubmitPrice({ productId: id, price, areaId, storeNameRaw });
    if (frontendError) {
      setError(frontendError);
      return;
    }

    setError("");
    setRetryAfterSeconds(undefined);

    try {
      await submitReport.mutateAsync({
        product_id: id!,
        price: parseFloat(price),
        area_id: areaId,
        store_name_raw: storeNameRaw || undefined,
        receipt_photo_url: receiptPhotoUrl || undefined,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      setSuccessToast("تم إرسال السعر بنجاح");
      resetForm();
      setTimeout(() => {
        setSuccessToast(null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const isNetworkError = err instanceof TypeError || !navigator.onLine;
      if (isNetworkError) {
        try {
          await enqueueReport({
            product_id: id!,
            product_name_ar: product?.name_ar ?? "",
            price: parseFloat(price),
            area_id: areaId,
            store_name_raw: storeNameRaw || undefined,
            receipt_photo_url: receiptPhotoUrl || undefined,
          });
          await refreshQueueCount();
          resetForm();
          if (queuedToastTimeoutRef.current) clearTimeout(queuedToastTimeoutRef.current);
          setQueuedToast("تم حفظ السعر — سيُرسل تلقائياً عند عودة الاتصال");
          queuedToastTimeoutRef.current = setTimeout(() => {
            setQueuedToast(null);
            queuedToastTimeoutRef.current = null;
            onClose();
          }, 3000);
        } catch {
          setError("تعذر حفظ البيانات — حاول مرة أخرى");
        }
        return;
      }

      const status = (err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 500) as number;
      const data = (err && typeof err === "object" && "data" in err ? (err as { data: ApiErrorResponse }).data : {}) as ApiErrorResponse;
      const res = new Response(null, { status });
      handleApiError(res, data, setError, router);
      if (status === 429 && typeof data?.retry_after_seconds === "number") {
        setRetryAfterSeconds(data.retry_after_seconds);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden animate-fade-up">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-olive-pale/50">
          <h2 className="font-display font-extrabold text-lg text-ink">إضافة سعر جديد</h2>
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
          {/* Product */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">المنتج</label>
            {product ? (
              <div className="bg-olive-pale border border-olive-mid rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">{product.category?.icon ?? "📦"}</span>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-ink">{product.name_ar}</div>
                    <div className="text-xs text-mist">{product.unit_size} {product.unit}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setProduct(null); clear(); }}
                  className="text-mist hover:text-ink text-sm flex-shrink-0 cursor-pointer"
                >
                  تغيير
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="bg-white border border-border rounded-xl flex items-center gap-2.5 px-3.5 py-2.5">
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
                    autoFocus
                  />
                  {loading && <LoaderDots size="sm" className="flex-shrink-0" />}
                </div>

                {searchOpen && query.trim().length >= 1 && !loading && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50 max-h-48 overflow-y-auto">
                    {results.length > 0 ? (
                      results.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-fog text-right border-b border-border last:border-0 transition-colors cursor-pointer"
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
                        onClick={() => {
                          handleClose();
                          window.location.href = `/suggest?name=${encodeURIComponent(query.trim())}`;
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-right bg-fog hover:bg-olive-pale transition-colors cursor-pointer"
                      >
                        <span className="text-lg flex-shrink-0">➕</span>
                        <span className="flex-1 min-w-0 text-sm text-olive font-semibold text-right">
                          اقترح منتجاً جديداً: {query.trim()}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">السعر</label>
            <div className="bg-white border border-border rounded-xl flex items-center overflow-hidden">
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
                  } else {
                    setPrice(raw);
                  }
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
              value={areaId}
              onChange={(e) => { setAreaId(e.target.value); setError(""); }}
              className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm font-body text-ink outline-none appearance-none cursor-pointer"
            >
              <option value="">اختر المنطقة</option>
              {areas.map((area) => (
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
              onChange={(e) => { setStoreNameRaw(e.target.value); setError(""); }}
              placeholder="مثال: بقالة أبو رامي"
              className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm font-body text-ink outline-none"
              dir="rtl"
            />
          </div>

          {/* Receipt upload */}
          <ReceiptUpload
            value={receiptPhotoUrl}
            onChange={setReceiptPhotoUrl}
            onError={setError}
            uploadFn={(file) => uploadReceiptPhoto(file, accessToken)}
            disabled={submitting}
          />

          {/* Error */}
          {error && (
            <ApiErrorBox
              message={error}
              retryAfterSeconds={retryAfterSeconds}
              onDismiss={() => { setError(""); setRetryAfterSeconds(undefined); }}
            />
          )}

          {/* Toasts */}
          {priceToast && (
            <div className="rounded-xl bg-ink/95 px-4 py-2.5 text-center text-sm text-white" role="status">
              {priceToast}
            </div>
          )}
          {queuedToast && (
            <div className="rounded-xl px-4 py-2.5 text-center text-sm text-white" style={{ background: "#166534" }} role="status">
              {queuedToast}
            </div>
          )}
          {successToast && (
            <div className="rounded-xl bg-confirm px-4 py-2.5 text-center text-sm text-white" role="status">
              {successToast}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-fog/50 flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-display font-bold text-slate hover:bg-white transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 bg-olive text-white py-2.5 rounded-xl font-display font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-olive-deep transition-colors cursor-pointer"
          >
            {submitting ? "جاري الإرسال..." : "إرسال السعر"}
          </button>
        </div>

        <p className="text-center text-xs text-mist pb-3">مجهول الهوية تماماً · لا اسم · لا هاتف</p>
      </div>
    </div>
  );
}
