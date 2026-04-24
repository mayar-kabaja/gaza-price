"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Product, Area } from "@/types/app";
import { useSession } from "@/hooks/useSession";
import { useProduct, useAreas, useSubmitReport, useSuggestProduct } from "@/lib/queries/hooks";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { validateSubmitPrice, validatePhone } from "@/lib/validation/submit-price";
import { handleApiError } from "@/lib/api/errors";
import type { ApiErrorResponse } from "@/lib/api/errors";
import { enqueueReport } from "@/lib/offline/queue";
import { playSound } from "@/lib/sounds";
import { event as gtagEvent } from "@/lib/gtag";
import { toArabicNumerals } from "@/lib/arabic";
import { cn } from "@/lib/utils";
import { ApiErrorBox } from "@/components/ui/ApiErrorBox";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { BottomNav } from "@/components/layout/BottomNav";

import { TypeGrid, SubmitType } from "./TypeGrid";
import { ProductSearchStep } from "./steps/ProductSearchStep";
import { PriceInputStep } from "./steps/PriceInputStep";
import { StoreNameStep } from "./steps/StoreNameStep";
import { AreaStep } from "./steps/AreaStep";
import { ConfirmStep } from "./steps/ConfirmStep";
import { ProductNameStep } from "./steps/ProductNameStep";
import { CategoryStep } from "./steps/CategoryStep";
import { UnitStep } from "./steps/UnitStep";

/* ── Flow definitions ── */
const FLOWS = {
  price: {
    steps: ["product-search", "price-input", "store-name", "area", "confirm"] as const,
    titles: ["شو المنتج؟", "كم السعر؟", "من أي محل؟", "أي منطقة؟", "تأكيد البيانات"],
    subs: ["ابحث أو اختر من القائمة", "أدخل السعر الحالي بالشيكل", "اكتب اسم المحل اللي شفت فيه السعر", "اختر المنطقة", "راجع المعلومات قبل الإرسال"],
  },
  product: {
    steps: ["product-name", "category", "unit", "price-input", "store-name", "area", "confirm"] as const,
    titles: ["شو اسم المنتج؟", "شو تصنيفه؟", "الوحدة والكمية؟", "كم السعر؟", "من أي محل؟", "أي منطقة؟", "تأكيد البيانات"],
    subs: ["اكتب الاسم الكامل للمنتج", "اختر التصنيف المناسب", "حدد وحدة القياس والكمية", "أدخل السعر الحالي بالشيكل", "اكتب اسم المحل", "اختر المنطقة", "راجع المعلومات قبل الإرسال"],
  },
};

export function SubmitWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get("product_id");

  const { accessToken, contributor } = useSession();
  const { data: productFromUrl } = useProduct(productIdFromUrl);
  const { data: areasData } = useAreas();
  const submitReport = useSubmitReport();
  const suggestProduct = useSuggestProduct();
  const { refreshCount: refreshQueueCount } = useOfflineQueue();

  const areas = areasData?.areas ?? [];

  /* ── Type & step ── */
  const [type, setType] = useState<SubmitType>("price");
  const [step, setStep] = useState(productIdFromUrl ? 1 : 0);

  /* ── Price flow state ── */
  const [product, setProduct] = useState<Product | null>(null);
  const [price, setPrice] = useState("");
  const [areaId, setAreaId] = useState("");
  const [storeNameRaw, setStoreNameRaw] = useState("");
  const [storeNameValid, setStoreNameValid] = useState(true);
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | null>(null);

  /* ── Product (suggest) flow state ── */
  const [newProductName, setNewProductName] = useState("");
  const [nameIsValid, setNameIsValid] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("كغ");
  const [unitSize, setUnitSize] = useState("");

  /* ── UI state ── */
  const [error, setError] = useState("");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | undefined>(undefined);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [queuedToast, setQueuedToast] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<Array<{ id: string; name_ar: string; similarity: number }>>([]);

  const submitting = submitReport.isPending || suggestProduct.isPending;
  const flow = FLOWS[type];
  const totalSteps = flow.steps.length;
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const isLastStep = step === totalSteps - 1;

  /* ── Load product from URL ── */
  useEffect(() => {
    if (productIdFromUrl && productFromUrl && !product) {
      setProduct(productFromUrl as Product);
    }
  }, [productIdFromUrl, productFromUrl, product]);

  /* ── Load saved area ── */
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

  /* ── Type change ── */
  const handleTypeChange = useCallback((newType: SubmitType) => {
    setType(newType);
    setStep(0);
    setError("");
  }, []);

  /* ── Navigation ── */
  function nextStep() {
    if (step < totalSteps - 1) { setStep((s) => s + 1); setError(""); }
  }
  function prevStep() {
    if (step > 0) { setStep((s) => s - 1); setError(""); }
  }

  /* ── Can advance? ── */
  function canNext(): boolean {
    const id = flow.steps[step];
    switch (id) {
      case "product-search": return !!product;
      case "product-name": return !!(newProductName.trim() && nameIsValid);
      case "category": return !!categoryId;
      case "unit": { const sz = Number(unitSize); return !!(unitSize.trim() && !isNaN(sz) && sz > 0); }
      case "price-input": { const n = Number(price); return !!(price.trim() && !isNaN(n) && n > 0); }
      case "store-name": return !!(storeNameRaw.trim().length >= 2 && storeNameValid);
      case "area": return !!areaId;
      case "confirm": return true;
      default: return true;
    }
  }

  /* ── Submit: price ── */
  async function doSubmitPrice(token: string) {
    const id = product?.id ?? productIdFromUrl ?? null;
    setError(""); setRetryAfterSeconds(undefined);
    try {
      await submitReport.mutateAsync({
        product_id: id!, price: parseFloat(price), area_id: areaId,
        store_name_raw: storeNameRaw || undefined,
        store_phone: storePhone.trim() || undefined,
        store_address: storeAddress.trim() || undefined,
        receipt_photo_url: receiptPhotoUrl || undefined,
        headers: { Authorization: `Bearer ${token}` },
      });
      playSound("submitted");
      gtagEvent({ action: "submit_price", category: "engagement", label: id ?? undefined });
      setShowAuthPopup(false);
      setShowSuccess(true);
    } catch (err: unknown) {
      setShowAuthPopup(false);
      if (err instanceof TypeError || !navigator.onLine) {
        try {
          await enqueueReport({
            product_id: id!, product_name_ar: product?.name_ar ?? "",
            price: parseFloat(price), area_id: areaId,
            store_name_raw: storeNameRaw || undefined,
            store_phone: storePhone.trim() || undefined,
            store_address: storeAddress.trim() || undefined,
            receipt_photo_url: receiptPhotoUrl || undefined,
          });
          await refreshQueueCount();
          setQueuedToast("تم حفظ السعر — سيُرسل تلقائياً عند عودة الاتصال");
          setTimeout(() => setQueuedToast(null), 4000);
          setShowSuccess(true);
        } catch { setError("تعذر حفظ البيانات — حاول مرة أخرى"); }
        return;
      }
      const status = (err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 500) as number;
      const data = (err && typeof err === "object" && "data" in err ? (err as { data: ApiErrorResponse }).data : {}) as ApiErrorResponse;
      handleApiError(new Response(null, { status }), data, setError, router);
      if (status === 429 && typeof data?.retry_after_seconds === "number") setRetryAfterSeconds(data.retry_after_seconds);
    }
  }

  /* ── Submit: product ── */
  async function doSubmitProduct(token: string) {
    setError(""); setSimilarProducts([]);
    try {
      await suggestProduct.mutateAsync({
        name_ar: newProductName.trim(), category_id: categoryId,
        unit: unit || undefined, unit_size: Number(unitSize),
        price: Number(price), area_id: areaId,
        store_name_raw: storeNameRaw.trim() || undefined,
        store_phone: storePhone.trim() || undefined,
        store_address: storeAddress.trim() || undefined,
        receipt_photo_url: receiptPhotoUrl || undefined,
        headers: { Authorization: `Bearer ${token}` },
      });
      playSound("submitted");
      setShowAuthPopup(false);
      setShowSuccess(true);
    } catch (err: unknown) {
      setShowAuthPopup(false);
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

  /* ── Validate & submit ── */
  function handleSubmit() {
    if (type === "price") {
      const id = product?.id ?? productIdFromUrl ?? null;
      const fe = validateSubmitPrice({ productId: id, price, areaId, storeNameRaw });
      if (fe) { setError(fe); return; }
      if (!storeNameValid) { setError("اسم المتجر غير صالح"); return; }
      const pe = validatePhone(storePhone);
      if (pe) { setError(pe); return; }
    } else {
      if (!newProductName.trim()) { setError("يرجى إدخال اسم المنتج"); return; }
      if (!nameIsValid) { setError("اسم المنتج غير صالح"); return; }
      if (!categoryId) { setError("يرجى اختيار التصنيف"); return; }
      const sz = Number(unitSize);
      if (!unitSize.trim() || isNaN(sz) || sz < 0) { setError("يرجى إدخال الكمية صحيحة"); return; }
      const pn = Number(price);
      if (!price.trim() || isNaN(pn) || pn <= 0) { setError("يرجى إدخال سعر صحيح"); return; }
      if (!areaId) { setError("يرجى اختيار المنطقة"); return; }
      if (!storeNameRaw.trim()) { setError("يرجى إدخال اسم المتجر"); return; }
      if (!storeNameValid) { setError("اسم المتجر غير صالح"); return; }
    }
    if (contributor?.phone_verified && accessToken) {
      if (type === "price") doSubmitPrice(accessToken);
      else doSubmitProduct(accessToken);
      return;
    }
    setShowAuthPopup(true);
  }

  /* ── Reset ── */
  function resetWizard() {
    setProduct(null); setPrice(""); setAreaId(""); setStoreNameRaw("");
    setStorePhone(""); setStoreAddress(""); setReceiptPhotoUrl(null);
    setNewProductName(""); setCategoryId(""); setUnit("كغ"); setUnitSize("");
    setError(""); setStep(0); setShowSuccess(false); setSimilarProducts([]);
    try { const s = localStorage.getItem("gazaprice_area"); if (s) { const a = JSON.parse(s); if (a?.id) setAreaId(a.id); } } catch {}
  }

  /* ═══ SUCCESS SCREEN ═══ */
  if (showSuccess) {
    return (
      <div className="flex flex-col min-h-dvh bg-fog pb-[72px]">
        {/* Header with full progress */}
        <div className="bg-olive px-4 pt-3 pb-4 flex-shrink-0">
          <div className="font-display font-black text-base text-white mb-2.5">إضافة</div>
          <div className="h-[3px] bg-white/15 rounded-full">
            <div className="h-full w-full bg-white rounded-full" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          {/* Animated ring */}
          <div className="w-[72px] h-[72px] rounded-full border-[3px] border-olive flex items-center justify-center mb-5 animate-[popIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]" style={{ background: "#E8F5EE" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#1E4D2B" strokeWidth="2.5" strokeLinecap="round" className="w-8 h-8">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="font-display font-black text-[22px] text-ink mb-2">تم الإرسال!</div>
          <p className="text-sm text-mist leading-relaxed mb-7 max-w-[280px]">
            شكراً — مساهمتك وصلت وستساعد أهل غزة يعرفوا الأسعار الحقيقية.
          </p>

          {queuedToast && (
            <p className="text-xs text-olive bg-olive-pale rounded-[14px] px-4 py-2.5 mb-5">{queuedToast}</p>
          )}

          {/* Stats */}
          <div className="flex gap-3 mb-7 w-full max-w-[300px]">
            <div className="flex-1 bg-surface border border-border rounded-[14px] py-3.5 text-center">
              <div className="font-display font-black text-xl text-olive">+١</div>
              <div className="text-[11px] text-mist mt-0.5">نقطة ثقة</div>
            </div>
            <div className="flex-1 bg-surface border border-border rounded-[14px] py-3.5 text-center">
              <div className="font-display font-black text-xl text-olive">{toArabicNumerals(18914)}</div>
              <div className="text-[11px] text-mist mt-0.5">مستخدم يستفيد</div>
            </div>
          </div>

          <button
            onClick={resetWizard}
            className="w-full max-w-[300px] bg-olive text-white rounded-[14px] py-3.5 font-display font-black text-sm mb-2.5 shadow-[0_3px_12px_rgba(30,77,43,0.25)] active:scale-[0.98] transition-transform"
          >
            أضف شيء ثاني
          </button>
          <Link
            href="/"
            className="w-full max-w-[300px] bg-surface border-[1.5px] border-border rounded-[14px] py-3 text-sm font-bold text-ink/60 text-center block active:scale-[0.98] transition-transform"
          >
            العودة للرئيسية
          </Link>
        </div>

        <BottomNav />

        <style jsx>{`
          @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
        `}</style>
      </div>
    );
  }

  /* ═══ STEP CONTENT ═══ */
  function renderStepContent() {
    const id = flow.steps[step];
    switch (id) {
      case "product-search":
        return (
          <ProductSearchStep
            onSelect={(p) => { setProduct(p); setError(""); setTimeout(nextStep, 260); }}
            onSuggestNew={(name) => { setNewProductName(name); handleTypeChange("product"); }}
          />
        );
      case "product-name":
        return (
          <ProductNameStep
            name={newProductName}
            onNameChange={(v) => { setNewProductName(v); setError(""); }}
            onNameValidityChange={setNameIsValid}
          />
        );
      case "category":
        return (
          <CategoryStep
            categoryId={categoryId}
            onCategoryChange={(id) => { setCategoryId(id); setError(""); }}
            onAutoAdvance={nextStep}
          />
        );
      case "unit":
        return (
          <UnitStep
            unit={unit}
            onUnitChange={setUnit}
            unitSize={unitSize}
            onUnitSizeChange={(v) => { setUnitSize(v); setError(""); }}
          />
        );
      case "price-input":
        return (
          <PriceInputStep
            price={price}
            onPriceChange={(v) => { setPrice(v); setError(""); }}
            onQuickSelect={nextStep}
            unitLabel={product?.unit ?? "وحدة أو كيلو"}
          />
        );
      case "store-name":
        return (
          <StoreNameStep
            value={storeNameRaw}
            onChange={(v) => { setStoreNameRaw(v); setError(""); }}
            onValidityChange={setStoreNameValid}
          />
        );
      case "area":
        return (
          <AreaStep
            areaId={areaId}
            onAreaChange={(id) => { setAreaId(id); setError(""); }}
            onAutoAdvance={nextStep}
          />
        );
      case "confirm": {
        const selectedArea = areas.find((a: Area) => a.id === areaId) ?? null;
        return (
          <ConfirmStep
            type={type} product={product} productName={newProductName}
            price={price} area={selectedArea} storeName={storeNameRaw}
            receiptPhotoUrl={receiptPhotoUrl} onReceiptChange={setReceiptPhotoUrl}
            onError={setError} accessToken={accessToken} submitting={submitting}
            storePhone={storePhone} onStorePhoneChange={setStorePhone}
            storeAddress={storeAddress} onStoreAddressChange={setStoreAddress}
          />
        );
      }
      default: return null;
    }
  }

  const priceDetails = type === "price"
    ? { productName: product?.name_ar, price, areaName: areas.find((a: Area) => a.id === areaId)?.name_ar }
    : undefined;

  /* ═══ MAIN UI ═══ */
  return (
    <div className="flex flex-col min-h-dvh bg-fog pb-[72px]">
      {/* ── HEADER ── */}
      <div className="bg-olive px-4 pt-3 pb-4 flex-shrink-0 relative overflow-hidden">
        <div className="absolute w-[150px] h-[150px] rounded-full bg-white/[0.04] -top-[50px] -left-[30px]" />

        <div className="flex items-center justify-between mb-3 relative z-[1]">
          <div className="font-display font-black text-base text-white">إضافة</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-white/50">
              خطوة {toArabicNumerals(step + 1)} من {toArabicNumerals(totalSteps)}
            </span>
            {step > 0 && (
              <button
                onClick={prevStep}
                className="w-[30px] h-[30px] bg-white/[0.12] border border-white/20 rounded-lg flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-white/15 rounded-full relative z-[1]">
          <div
            className="h-full bg-white rounded-full transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── STEP CONTENT ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Type cards (on step 0) */}
        {step === 0 && (
          <div className="px-4 pt-4 pb-2">
            <TypeGrid selected={type} onSelect={handleTypeChange} />
          </div>
        )}

        <div key={`${type}-${step}`} className="px-4 pt-4 pb-4 animate-[slideIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
          {/* Step question */}
          <div className="font-display font-black text-xl text-ink mb-1 leading-tight text-right">
            {flow.titles[step]}
          </div>
          <div className="text-[13px] text-mist mb-5 leading-relaxed text-right">
            {flow.subs[step]}
          </div>

          {/* Step body */}
          {renderStepContent()}

          {/* Error */}
          {error && (
            <div className="mt-4">
              <ApiErrorBox
                message={error}
                retryAfterSeconds={retryAfterSeconds}
                onDismiss={() => { setError(""); setRetryAfterSeconds(undefined); }}
              />
            </div>
          )}

          {/* Similar products */}
          {similarProducts.length > 0 && (
            <div className="mt-4 rounded-[14px] bg-olive-pale border border-olive-mid p-3.5">
              <p className="text-xs font-bold text-olive-deep mb-2">اختر منتجاً موجوداً إن كان مطابقاً:</p>
              <div className="flex flex-wrap gap-2">
                {similarProducts.map((s) => (
                  <Link
                    key={s.id}
                    href={`/submit?product_id=${s.id}`}
                    className="px-3.5 py-2 rounded-[14px] bg-surface border border-olive text-olive text-sm font-body font-semibold"
                  >
                    {s.name_ar}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex-shrink-0 px-4 py-3 bg-fog border-t border-border/50 flex items-center gap-2.5">
        {step > 0 && (
          <button
            type="button"
            onClick={prevStep}
            className="bg-surface border-[1.5px] border-border rounded-[14px] px-[18px] py-[11px] text-[13px] font-bold text-ink/60 flex-shrink-0 hover:bg-fog transition-colors active:scale-[0.97]"
          >
            رجوع
          </button>
        )}
        <button
          type="button"
          onClick={isLastStep ? handleSubmit : nextStep}
          disabled={!canNext() || (isLastStep && submitting)}
          className={cn(
            "flex-1 rounded-[14px] py-3 font-display font-black text-sm text-white flex items-center justify-center gap-2 transition-all",
            canNext() && !(isLastStep && submitting)
              ? "bg-olive shadow-[0_3px_12px_rgba(30,77,43,0.25)] hover:bg-[#2D6B3F] active:scale-[0.98]"
              : "bg-olive/40 cursor-not-allowed shadow-none"
          )}
        >
          <span>{isLastStep ? (submitting ? "جاري الإرسال..." : "إرسال ✓") : "التالي"}</span>
          {!isLastStep && (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <path d="M9 18l-6-6 6-6" />
            </svg>
          )}
        </button>
      </div>

      <BottomNav />

      {/* Phone auth */}
      <PhoneAuthPopup
        open={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        onVerified={(token) => { if (type === "price") doSubmitPrice(token); else doSubmitProduct(token); }}
        priceDetails={priceDetails}
      />

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
