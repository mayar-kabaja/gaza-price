"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { Product, Area } from "@/types/app";
import { useSearch } from "@/hooks/useSearch";
import { useSession } from "@/hooks/useSession";
import { LoaderDots } from "@/components/ui/LoaderDots";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";
import { validateSubmitPrice, validatePhone } from "@/lib/validation/submit-price";
import { useProduct, useAreas, useSubmitReport } from "@/lib/queries/hooks";
import { ReceiptUpload } from "@/components/reports/ReceiptUpload";
import { event as gtagEvent } from "@/lib/gtag";
import { normalizeDigits } from "@/lib/normalize-digits";
import { uploadReceiptPhoto } from "@/lib/api/upload";
import { enqueueReport } from "@/lib/offline/queue";
import { playSound } from "@/lib/sounds";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { BottomNav } from "@/components/layout/BottomNav";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { StoreNameInput } from "@/components/StoreNameInput";

const PRICE_TOAST_MSG = "استخدم الأرقام الإنجليزية (0-9) فقط";
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

function SubmitForm() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get("product_id");
  const { accessToken, contributor } = useSession();
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  // Desktop redirect handled by SubmitPageInner

  const { query, setQuery, results, loading, open, setOpen, clear } = useSearch();
  const { data: productFromUrl } = useProduct(productIdFromUrl);
  const { data: areasData } = useAreas();
  const submitReport = useSubmitReport();
  const { refreshCount: refreshQueueCount } = useOfflineQueue();

  const [product, setProduct] = useState<Product | null>(null);
  const [cleared, setCleared] = useState(false);
  const [price, setPrice] = useState("");
  const [areaId, setAreaId] = useState("");
  const [storeNameRaw, setStoreNameRaw] = useState("");
  const [storeNameValid, setStoreNameValid] = useState(true);
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | undefined>(undefined);
  const [showNewProductInput, setShowNewProductInput] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [priceToast, setPriceToast] = useState<string | null>(null);
  const [queuedToast, setQueuedToast] = useState<string | null>(null);
  const priceToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const areas = areasData?.areas ?? [];
  const effectiveProduct = product ?? (cleared ? null : (productFromUrl as Product | null)) ?? null;
  const submitting = submitReport.isPending;

  const showPriceToast = useCallback((message: string) => {
    if (priceToastTimeoutRef.current) clearTimeout(priceToastTimeoutRef.current);
    setPriceToast(message);
    priceToastTimeoutRef.current = setTimeout(() => {
      setPriceToast(null);
      priceToastTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (priceToastTimeoutRef.current) clearTimeout(priceToastTimeoutRef.current);
      if (queuedToastTimeoutRef.current) clearTimeout(queuedToastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (productIdFromUrl && productFromUrl && !product && !cleared) {
      setProduct(productFromUrl as Product);
    }
  }, [productIdFromUrl, productFromUrl, product, cleared]);

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

  async function doSubmit(token: string) {
    const id = effectiveProduct?.id ?? productIdFromUrl ?? null;
    setError("");
    setRetryAfterSeconds(undefined);

    try {
      await submitReport.mutateAsync({
        product_id: id!,
        price: parseFloat(price),
        area_id: areaId,
        store_name_raw: storeNameRaw || undefined,
        store_phone: storePhone.trim() || undefined,
        store_address: storeAddress.trim() || undefined,
        receipt_photo_url: receiptPhotoUrl || undefined,
        headers: { Authorization: `Bearer ${token}` },
      });
      playSound("submitted");
      gtagEvent({ action: "submit_price", category: "engagement", label: id ?? undefined });
      setShowAuthPopup(false);
      router.push(`/product/${id}?submitted=1`);
    } catch (err: unknown) {
      setShowAuthPopup(false);

      const isNetworkError =
        err instanceof TypeError || !navigator.onLine;

      if (isNetworkError) {
        try {
          await enqueueReport({
            product_id: id!,
            product_name_ar: effectiveProduct?.name_ar ?? "",
            price: parseFloat(price),
            area_id: areaId,
            store_name_raw: storeNameRaw || undefined,
            store_phone: storePhone.trim() || undefined,
            store_address: storeAddress.trim() || undefined,
            receipt_photo_url: receiptPhotoUrl || undefined,
          });
          await refreshQueueCount();

          setProduct(null);
          setPrice("");
          setStoreNameRaw("");
          setReceiptPhotoUrl(null);
          setError("");
          clear();

          if (queuedToastTimeoutRef.current) clearTimeout(queuedToastTimeoutRef.current);
          setQueuedToast("تم حفظ السعر — سيُرسل تلقائياً عند عودة الاتصال");
          queuedToastTimeoutRef.current = setTimeout(() => {
            setQueuedToast(null);
            queuedToastTimeoutRef.current = null;
          }, 4000);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const id = effectiveProduct?.id ?? productIdFromUrl ?? null;

    const frontendError = validateSubmitPrice({
      productId: id,
      price,
      areaId,
      storeNameRaw,
    });
    if (frontendError) {
      setError(frontendError);
      return;
    }

    if (!storeNameValid) {
      setError("اسم المتجر غير صالح");
      return;
    }

    const phoneError = validatePhone(storePhone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    // If user is already phone-verified, submit directly
    if (contributor?.phone_verified && accessToken) {
      await doSubmit(accessToken);
      return;
    }

    // Otherwise show the phone auth popup
    setShowAuthPopup(true);
  }

  function handleSelectProduct(p: Product) {
    setProduct(p);
    setCleared(false);
    setError("");
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
          {effectiveProduct ? (
            <div className="bg-olive-pale border border-olive-mid rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0">{effectiveProduct.category?.icon ?? "📦"}</span>
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm text-ink">{effectiveProduct.name_ar}</div>
                  <div className="text-xs text-mist">{effectiveProduct.unit_size} {effectiveProduct.unit}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setProduct(null); setCleared(true); clear(); setShowNewProductInput(false); }}
                className="text-mist hover:text-ink text-sm flex-shrink-0"
              >
                تغيير
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="bg-surface border border-border rounded-2xl flex items-center gap-2.5 px-3.5 py-2.5">
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
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-30 max-h-60 overflow-y-auto">
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
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm font-body text-ink outline-none"
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

        {/* Price — LTR so digits stay English (0-9) */}
        <div>
          <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">السعر</label>
          <p className="text-xs text-mist mb-2 font-body">أرقام إنجليزية (0-9) فقط</p>
          <div className="bg-surface border border-border rounded-2xl flex items-center overflow-hidden">
            <input
              type="text"
              inputMode="decimal"
              lang="en"
              dir="ltr"
              value={price}
              onChange={e => {
                const raw = e.target.value;
                if (hasArabicDigits(raw)) {
                  showPriceToast(PRICE_TOAST_MSG);
                  setPrice(normalizePriceInput(raw));
                } else {
                  setPrice(raw);
                }
                setError("");
              }}
              placeholder="0.00"
              className="flex-1 px-4 py-3.5 text-lg font-display font-bold text-ink outline-none bg-transparent price-number text-left"
            />
            <div className="px-4 text-mist font-display font-bold text-lg border-r border-border">₪</div>
          </div>
        </div>

        {/* Area */}
        <div>
          <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">المنطقة</label>
          <select
            value={areaId}
            onChange={e => { setAreaId(e.target.value); setError(""); }}
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none appearance-none"
          >
            <option value="">اختر المنطقة</option>
            {areas.map(area => (
              <option key={area.id} value={area.id}>{area.name_ar}</option>
            ))}
          </select>
        </div>

        {/* Store name */}
        <StoreNameInput
          value={storeNameRaw}
          onChange={(val) => { setStoreNameRaw(val); setError(""); }}
          onValidityChange={setStoreNameValid}
        />

        {/* Store address (optional) */}
        <div>
          <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">عنوان تفصيلي للمتجر</label>
          <input
            type="text"
            value={storeAddress}
            onChange={e => setStoreAddress(e.target.value)}
            placeholder="مثال: شارع الجلاء بجانب مسجد العمري"
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none"
            dir="rtl"
          />
        </div>

        {/* Store phone (optional) */}
        <div>
          <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">رقم هاتف المتجر (اختياري)</label>
          <input
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={storePhone}
            onChange={e => setStorePhone(normalizeDigits(e.target.value))}
            placeholder="مثال: 0599123456"
            className="w-full bg-surface border border-border rounded-2xl px-4 py-3.5 text-sm font-body text-ink outline-none text-left"
          />
        </div>

        <ReceiptUpload
          value={receiptPhotoUrl}
          onChange={setReceiptPhotoUrl}
          onError={setError}
          uploadFn={(file) => uploadReceiptPhoto(file, accessToken)}
          disabled={submitting}
        />

        {error && (
          <ApiErrorBox
            message={error}
            retryAfterSeconds={retryAfterSeconds}
            onDismiss={() => { setError(""); setRetryAfterSeconds(undefined); }}
          />
        )}

        {/* Small toast when user enters Arabic numerals in price */}
        {priceToast && (
          <div
            className="fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl px-4 py-2.5 text-center text-sm text-white shadow-lg"
            style={{ background: "rgba(26,31,46,0.95)" }}
            role="status"
            aria-live="polite"
          >
            {priceToast}
          </div>
        )}

        {/* Toast when report queued for offline sync */}
        {queuedToast && (
          <div
            className="fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl px-4 py-2.5 text-center text-sm text-white shadow-lg"
            style={{ background: "#166534" }}
            role="status"
            aria-live="polite"
          >
            {queuedToast}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-olive text-white py-4 rounded-2xl font-display font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-all"
        >
          {submitting ? "جاري الإرسال..." : "إرسال السعر ←"}
        </button>

        <p className="text-center text-xs text-mist">
          {contributor?.phone_verified ? "✓ تم التحقق من رقمك" : "سيُطلب التحقق عبر WhatsApp عند الإرسال"}
        </p>

        <Link
          href="/suggest"
          className="block text-center text-sm text-olive font-body font-semibold py-2"
        >
          لم تجد المنتج؟ اقترح منتجاً جديداً +
        </Link>
      </form>

      <PhoneAuthPopup
        open={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        onVerified={(token) => doSubmit(token)}
        priceDetails={{
          productName: effectiveProduct?.name_ar,
          price,
          areaName: areas.find((a) => a.id === areaId)?.name_ar,
        }}
      />
    </div>
  );
}

/* ── Action Chooser ── */
function AddChooser({ onSelect }: { onSelect: (action: string) => void }) {
  const router = useRouter();

  const options = [
    {
      key: "price",
      title: "أضف سعر منتج",
      desc: "عندك سعر من محل؟ ساعد الناس يعرفوا الأسعار الحقيقية",
      exampleText: "كيلو أرز في محل أبو أحمد = 12₪",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 stroke-olive" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      ),
      iconBg: "bg-olive-pale",
      stripColor: "border-r-olive",
      arrowBg: "bg-olive-pale",
      arrowCls: "stroke-olive",
    },
    {
      key: "product",
      title: "اقترح منتج جديد",
      desc: "منتج مش موجود في القائمة؟ اقترحه وأضف أول سعر له",
      exampleText: "حليب بودرة نيدو 900غ",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 stroke-sand" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      ),
      iconBg: "bg-sand-light",
      stripColor: "border-r-sand",
      arrowBg: "bg-sand-light",
      arrowCls: "stroke-sand",
    },
    {
      key: "listing",
      title: "أضف إعلان في السوق",
      desc: "عندك شي للبيع؟ انشر إعلان مجاني في السوق المحلي",
      exampleText: "جوال · أثاث · ملابس",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 stroke-blue-500 dark:stroke-blue-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      ),
      iconBg: "bg-blue-50 dark:bg-blue-500/15",
      stripColor: "border-r-blue-500",
      arrowBg: "bg-blue-50 dark:bg-blue-500/15",
      arrowCls: "stroke-blue-500 dark:stroke-blue-400",
    },
    {
      key: "place",
      title: "سجّل مكانك",
      desc: "عندك محل، مطعم، كافيه أو مساحة عمل؟ أضف مكانك ليظهر للجميع",
      exampleText: "مطعم · كافيه · محل · مساحة عمل",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 stroke-purple-500 dark:stroke-purple-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      iconBg: "bg-purple-50 dark:bg-purple-500/15",
      stripColor: "border-r-purple-500",
      arrowBg: "bg-purple-50 dark:bg-purple-500/15",
      arrowCls: "stroke-purple-500 dark:stroke-purple-400",
    },
  ];

  return (
    <div className="flex flex-col min-h-dvh bg-fog">
      {/* Header */}
      <div className="bg-olive px-4 pt-4 pb-5 flex-shrink-0 relative overflow-hidden">
        <div className="absolute w-40 h-40 rounded-full bg-white/5 -top-16 -left-8" />
        <div className="flex items-center gap-2 mb-1 relative z-[1]">
          <button onClick={() => router.back()} className="w-[30px] h-[30px] bg-white/10 border border-white/20 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-3.5 h-3.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round"/></svg>
          </button>
          <h1 className="font-display font-black text-[17px] text-white">إضافة</h1>
        </div>
        <p className="text-white/55 text-xs font-body relative z-[1]">شو بدك تضيف؟</p>
      </div>

      {/* Options */}
      <div className="flex-1 px-4 pt-5 pb-28 space-y-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => {
              if (opt.key === "listing") {
                router.push("/market/new");
              } else if (opt.key === "place") {
                router.push("/places/register");
              } else {
                onSelect(opt.key);
              }
            }}
            className="w-full text-right bg-surface border border-border rounded-[20px] p-[18px] transition-all duration-150 active:scale-[0.98] hover:-translate-x-[3px] hover:border-olive-mid hover:shadow-lg overflow-hidden relative"
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-[52px] h-[52px] ${opt.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-black text-[15px] text-ink mb-1">{opt.title}</div>
                <p className="text-xs text-mist leading-relaxed mb-1.5">{opt.desc}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-mist">مثال:</span>
                  <span className="text-[10px] text-mist bg-fog border border-border px-2 py-0.5 rounded-full">{opt.exampleText}</span>
                </div>
              </div>
              <div className={`w-7 h-7 ${opt.arrowBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                <svg viewBox="0 0 24 24" fill="none" className={`w-[13px] h-[13px] ${opt.arrowCls}`} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </div>
            </div>
          </button>
        ))}

        {/* Tip box */}
        <div className="bg-olive-pale border border-olive-mid/30 rounded-2xl p-3.5 flex items-start gap-2.5 mt-1">
          <div className="w-8 h-8 bg-olive rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>
            </svg>
          </div>
          <div>
            <div className="font-display text-xs font-extrabold text-olive mb-0.5">كل مساهمة تفرق</div>
            <div className="text-[11px] text-olive-deep dark:text-olive-mid leading-relaxed">كل سعر تضيفه يساعد عائلة في غزة تتخذ قرار أفضل. شكراً لك.</div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitPageInner />
    </Suspense>
  );
}

function SubmitPageInner() {
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const productIdFromUrl = searchParams.get("product_id");
  const modeFromUrl = searchParams.get("mode");
  const [selected, setSelected] = useState<string | null>(
    productIdFromUrl ? "price" : modeFromUrl ?? null
  );

  useEffect(() => {
    if (isDesktop) router.replace("/");
  }, [isDesktop, router]);

  if (selected === "price") {
    return <SubmitForm />;
  }

  if (selected === "product") {
    router.push("/suggest");
    return null;
  }

  return <AddChooser onSelect={setSelected} />;
}
