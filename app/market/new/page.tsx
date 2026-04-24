"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAreas } from "@/lib/queries/hooks";
import { useSession } from "@/hooks/useSession";
import { useAreaContext } from "@/contexts/AreaContext";
import { getStoredToken } from "@/lib/auth/token";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compress-image";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { toArabicNumerals } from "@/lib/arabic";
import { BottomNav } from "@/components/layout/BottomNav";
import { event as gtagEvent } from "@/lib/gtag";

const CATEGORIES = [
  { value: "electronics", label: "إلكترونيات", emoji: "📱" },
  { value: "clothes",     label: "ملابس",       emoji: "👕" },
  { value: "furniture",   label: "أثاث",        emoji: "🪑" },
  { value: "food",        label: "طعام",        emoji: "🍞" },
  { value: "books",       label: "كتب",         emoji: "📚" },
  { value: "tools",       label: "أدوات",       emoji: "🔧" },
  { value: "toys",        label: "ألعاب",       emoji: "🧸" },
  { value: "other",       label: "أخرى",        emoji: "📦" },
];

const CONDITIONS = [
  { value: "new",    label: "جديد",    emoji: "✨" },
  { value: "used",   label: "مستعمل",  emoji: "👍" },
  { value: "urgent", label: "عاجل",    emoji: "⚡" },
];

const STEPS = [
  { id: "title",       title: "شو اسم المنتج؟",   sub: "اكتب اسم واضح للإعلان" },
  { id: "category",    title: "شو نوع الإعلان؟",   sub: "اختر التصنيف المناسب" },
  { id: "condition",   title: "حالة البضاعة؟",      sub: "حدد حالة المنتج" },
  { id: "price",       title: "كم السعر؟",          sub: "أدخل السعر بالشيكل" },
  { id: "images",      title: "صور المنتج",         sub: "أضف صور واضحة (اختياري)" },
  { id: "extras",      title: "تفاصيل إضافية",      sub: "وصف ومنطقة (اختياري)" },
  { id: "confirm",     title: "تأكيد ونشر",         sub: "راجع البيانات قبل النشر" },
] as const;

async function uploadListingImage(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const token = getStoredToken();
  const formData = new FormData();
  formData.append("file", compressed);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("/api/upload/listing", {
    method: "POST",
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "فشل رفع الصورة");
  if (typeof data?.url !== "string") throw new Error("لم يُرجَع رابط الصورة");
  return data.url;
}

export default function NewListingPage() {
  const router = useRouter();
  const { accessToken, contributor } = useSession();
  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── State ── */
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [description, setDescription] = useState("");
  const { area: savedArea } = useAreaContext();
  const contributorAreaId = contributor?.area?.id ?? null;
  const knownAreaId = contributorAreaId ?? savedArea?.id ?? null;
  const [areaId, setAreaId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = STEPS.length;
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const isLastStep = step === totalSteps - 1;
  const currentStep = STEPS[step];

  /* ── Navigation ── */
  function nextStep() {
    if (step < totalSteps - 1) { setStep((s) => s + 1); setError(null); }
  }
  function prevStep() {
    if (step > 0) { setStep((s) => s - 1); setError(null); }
  }

  /* ── Can advance? ── */
  function canNext(): boolean {
    switch (currentStep.id) {
      case "title": return title.trim().length >= 2;
      case "category": return !!category;
      case "condition": return !!condition;
      case "price": { const n = Number(price); return !!(price.trim() && !isNaN(n) && n >= 0); }
      case "images": return true; // optional
      case "extras": return true; // optional
      case "confirm": return true;
      default: return true;
    }
  }

  /* ── Images ── */
  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 5 - images.length;
    const toAdd = files.slice(0, remaining);
    const newEntries = toAdd.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...newEntries]);
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  /* ── Submit ── */
  async function handleSubmit() {
    setError(null);
    if (!title.trim()) return setError("أدخل اسم المنتج");
    if (!category) return setError("اختر التصنيف");
    if (!condition) return setError("اختر الحالة");
    if (!price || isNaN(Number(price)) || Number(price) < 0) return setError("أدخل سعرًا صحيحًا");

    if (!contributor?.phone_verified || !accessToken) {
      setShowAuthPopup(true);
      return;
    }
    await doSubmit(accessToken);
  }

  async function doSubmit(token: string) {
    setSubmitting(true);
    setUploading(true);

    let imageUrls: string[] = [];
    try {
      imageUrls = await Promise.all(
        images.map((img) => img.url ?? uploadListingImage(img.file))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الصور");
      setSubmitting(false);
      setUploading(false);
      return;
    }
    setUploading(false);

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        category,
        condition,
        price: Number(price),
        is_negotiable: isNegotiable,
      };
      if (description.trim()) body.description = description.trim();
      const effectiveAreaId = knownAreaId ?? areaId;
      if (effectiveAreaId) body.area_id = effectiveAreaId;
      if (imageUrls.length) body.image_urls = imageUrls;

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join("، ") : (data?.message ?? "فشل نشر الإعلان");
        setError(msg);
        setSubmitting(false);
        return;
      }
      gtagEvent({ action: "submit_listing", category: "engagement", label: category });
      router.replace(`/market/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مجددًا");
      setSubmitting(false);
    }
  }

  /* ── Step content ── */
  function renderStepContent() {
    switch (currentStep.id) {
      case "title":
        return (
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(null); }}
            placeholder="مثال: iPhone 12 64GB"
            maxLength={200}
            autoFocus
            className="w-full bg-surface border-[1.5px] border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors"
            dir="rtl"
          />
        );

      case "category":
        return (
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setCategory(cat.value);
                  setError(null);
                  setTimeout(nextStep, 260);
                }}
                className={cn(
                  "px-3.5 py-2 rounded-full border-[1.5px] text-[13px] font-semibold transition-all active:scale-95",
                  category === cat.value
                    ? "bg-olive text-white border-olive shadow-sm"
                    : "bg-surface border-border text-ink hover:border-olive/40"
                )}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        );

      case "condition":
        return (
          <div className="grid grid-cols-3 gap-3">
            {CONDITIONS.map((cond) => (
              <button
                key={cond.value}
                type="button"
                onClick={() => {
                  setCondition(cond.value);
                  setError(null);
                  setTimeout(nextStep, 260);
                }}
                className={cn(
                  "py-4 rounded-xl border-[1.5px] text-sm font-bold transition-all active:scale-95",
                  condition === cond.value
                    ? "bg-olive-pale border-olive text-olive"
                    : "bg-surface border-border text-ink"
                )}
              >
                <span className="block text-xl leading-none mb-1.5">{cond.emoji}</span>
                {cond.label}
              </button>
            ))}
          </div>
        );

      case "price":
        return (
          <div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={price}
                onChange={(e) => { setPrice(e.target.value); setError(null); }}
                placeholder="0"
                min={0}
                autoFocus
                className="flex-1 bg-surface border-[1.5px] border-border rounded-xl px-4 py-3 text-lg font-bold text-ink placeholder:text-mist outline-none focus:border-olive transition-colors text-center"
                dir="ltr"
              />
              <span className="text-lg font-bold text-mist">₪</span>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <div
                onClick={() => setIsNegotiable((v) => !v)}
                className={cn(
                  "w-10 rounded-full relative transition-colors flex-shrink-0",
                  isNegotiable ? "bg-olive" : "bg-fog border border-border"
                )}
                style={{ height: "22px" }}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                  isNegotiable ? "right-0.5" : "left-0.5"
                )} />
              </div>
              <span className="text-xs font-semibold text-ink">قابل للتفاوض</span>
            </label>
          </div>
        );

      case "images":
        return (
          <div>
            <div className="flex gap-2 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border flex-shrink-0">
                  <Image src={img.preview} alt="" fill className="object-cover" sizes="80px" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-mist transition-colors hover:border-olive active:bg-fog",
                    images.length === 0 ? "w-full h-28" : "w-20 h-20 flex-shrink-0"
                  )}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cn(images.length === 0 ? "w-8 h-8" : "w-5 h-5")}>
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {images.length === 0 && (
                    <span className="text-xs font-semibold">اضغط لإضافة صور</span>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImagePick}
            />
          </div>
        );

      case "extras":
        return (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-mist mb-1.5">الوصف</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب تفاصيل المنتج..."
                rows={3}
                className="w-full bg-surface border-[1.5px] border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors resize-none"
                dir="rtl"
              />
            </div>
            {!knownAreaId && (
              <div>
                <div className="text-[11px] font-semibold text-mist mb-1.5">المنطقة</div>
                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => setAreaId(area.id)}
                      className={cn(
                        "px-3.5 py-2 rounded-full border-[1.5px] text-[13px] font-semibold transition-all active:scale-95",
                        areaId === area.id
                          ? "bg-olive text-white border-olive shadow-sm"
                          : "bg-surface border-border text-ink hover:border-olive/40"
                      )}
                    >
                      {area.name_ar}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "confirm": {
        const catLabel = CATEGORIES.find((c) => c.value === category)?.label ?? "";
        const condLabel = CONDITIONS.find((c) => c.value === condition)?.label ?? "";
        const areaLabel = areas.find((a) => a.id === (knownAreaId ?? areaId))?.name_ar ?? "";
        const rows = [
          { label: "المنتج", value: title },
          { label: "التصنيف", value: catLabel },
          { label: "الحالة", value: condLabel },
          { label: "السعر", value: `${price} ₪${isNegotiable ? " (قابل للتفاوض)" : ""}`, isPrice: true },
        ];
        if (areaLabel) rows.push({ label: "المنطقة", value: areaLabel });
        if (images.length > 0) rows.push({ label: "الصور", value: `${images.length} صور` });
        if (description.trim()) rows.push({ label: "الوصف", value: description.trim().slice(0, 50) + (description.trim().length > 50 ? "..." : "") });

        return (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-4 py-3 ${i < rows.length - 1 ? "border-b border-border/50" : ""}`}
              >
                <span className="text-[12px] text-mist">{row.label}</span>
                <span className={row.isPrice ? "font-display font-black text-lg text-olive" : "text-sm font-bold text-ink"}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        );
      }

      default: return null;
    }
  }

  /* ═══ MAIN UI ═══ */
  return (
    <div className="flex flex-col min-h-dvh bg-fog pb-[72px]" dir="rtl">
      {/* Header */}
      <div className="bg-olive px-4 pt-3 pb-4 flex-shrink-0 relative overflow-hidden">
        <div className="absolute w-[150px] h-[150px] rounded-full bg-white/[0.04] -top-[50px] -left-[30px]" />
        <div className="flex items-center justify-between mb-3 relative z-[1]">
          <div className="font-display font-black text-base text-white">إعلان جديد</div>
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
        <div className="h-[3px] bg-white/15 rounded-full relative z-[1]">
          <div
            className="h-full bg-white rounded-full transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: "touch" }}>
        <div key={step} className="px-4 pt-4 pb-4 animate-[slideIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
          <div className="font-display font-black text-xl text-ink mb-1 leading-tight text-right">
            {currentStep.title}
          </div>
          <div className="text-[13px] text-mist mb-5 leading-relaxed text-right">
            {currentStep.sub}
          </div>

          {renderStepContent()}

          {error && (
            <div className="mt-4 text-xs text-red-600 font-semibold text-center bg-red-50 rounded-xl py-2 px-3">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
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
          <span>
            {isLastStep
              ? (uploading ? "جارٍ رفع الصور..." : submitting ? "جارٍ النشر..." : "نشر الإعلان ✓")
              : "التالي"}
          </span>
          {!isLastStep && (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <path d="M9 18l-6-6 6-6" />
            </svg>
          )}
        </button>
      </div>

      <BottomNav />

      <PhoneAuthPopup
        open={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        onVerified={(token) => { setShowAuthPopup(false); doSubmit(token); }}
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
