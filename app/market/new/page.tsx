"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAreas } from "@/lib/queries/hooks";
import { useSession } from "@/hooks/useSession";
import { useAreaContext } from "@/contexts/AreaContext";
import { getStoredToken } from "@/lib/auth/token";
import { cn } from "@/lib/utils";
import { PhoneAuthPopup } from "@/components/auth/PhoneAuthPopup";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useMarketSidebar } from "@/app/market/layout";

const CATEGORIES = [
  { value: "electronics", label: "إلكترونيات" },
  { value: "clothes",     label: "ملابس" },
  { value: "furniture",   label: "أثاث" },
  { value: "food",        label: "طعام" },
  { value: "books",       label: "كتب" },
  { value: "tools",       label: "أدوات" },
  { value: "toys",        label: "ألعاب" },
  { value: "other",       label: "أخرى" },
];

const CONDITIONS = [
  { value: "new",    label: "جديد",    emoji: "✨" },
  { value: "used",   label: "مستعمل",  emoji: "👍" },
  { value: "urgent", label: "عاجل",    emoji: "⚡" },
];

/** Compress image client-side to stay under Vercel's body limit */
function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    // If already small enough, skip compression
    if (file.size <= 1024 * 1024) { resolve(file); return; }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('فشل ضغط الصورة')); };
    img.src = url;
  });
}

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
  const isDesktop = useIsDesktop();
  const { accessToken, contributor } = useSession();
  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("electronics");
  const [condition, setCondition] = useState("new");
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

  useMarketSidebar(
    isDesktop ? (
      <div className="space-y-1">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-mist hover:text-olive transition-colors font-semibold mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          العودة للسوق
        </button>
        <div className="bg-olive-pale rounded-xl p-3">
          <div className="font-display font-bold text-sm text-ink">إضافة إعلان جديد</div>
        </div>
      </div>
    ) : null
  );

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) return setError("أدخل اسم المنتج");
    if (!price || isNaN(Number(price)) || Number(price) < 0) return setError("أدخل سعرًا صحيحًا");

    // Require phone verification before submitting
    if (!contributor?.phone_verified || !accessToken) {
      setShowAuthPopup(true);
      return;
    }

    await doSubmit(accessToken);
  }

  async function doSubmit(token: string) {
    setSubmitting(true);
    setUploading(true);

    // Upload images first
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
      // Navigate to the newly created listing
      router.replace(`/market/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مجددًا");
      setSubmitting(false);
    }
  }

  const formFields = (
    <div className="space-y-5">
      {/* Images */}
      <div>
        <label className="block text-sm font-bold text-ink mb-2">صور المنتج</label>
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

      {/* Title */}
      <div>
        <label className="block text-sm font-bold text-ink mb-2">اسم المنتج</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: iPhone 12 64GB"
          maxLength={200}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors"
          dir="rtl"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-bold text-ink mb-2">التصنيف</label>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-olive appearance-none cursor-pointer"
            dir="rtl"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-mist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-sm font-bold text-ink mb-2">الحالة</label>
        <div className="grid grid-cols-3 gap-2">
          {CONDITIONS.map((cond) => (
            <button
              key={cond.value}
              onClick={() => setCondition(cond.value)}
              className={cn(
                "py-3 rounded-xl border text-sm font-bold transition-all",
                condition === cond.value
                  ? "bg-olive-pale border-olive text-olive"
                  : "bg-surface border-border text-ink"
              )}
            >
              <span className="block text-base leading-none mb-0.5">{cond.emoji}</span>
              {cond.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-bold text-ink mb-2">السعر (₪)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
          min={0}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors"
          dir="ltr"
        />
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <div
            onClick={() => setIsNegotiable((v) => !v)}
            className={cn(
              "w-10 h-5.5 rounded-full relative transition-colors flex-shrink-0",
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

      {/* Description */}
      <div>
        <label className="block text-sm font-bold text-ink mb-2">الوصف</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="اكتب تفاصيل المنتج..."
          rows={3}
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors resize-none"
          dir="rtl"
        />
      </div>

      {/* Area — only shown if no area is known */}
      {!knownAreaId && (
        <div>
          <label className="block text-sm font-bold text-ink mb-2">المنطقة</label>
          <div className="relative">
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-olive appearance-none cursor-pointer"
              dir="rtl"
            >
              <option value="">اختر المنطقة</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name_ar}</option>
              ))}
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-mist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const submitBar = (
    <>
      {error && (
        <div className="mb-3 text-xs text-red-600 font-semibold text-center bg-red-50 rounded-xl py-2 px-3">
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-olive text-white font-bold py-4 rounded-2xl text-base active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {uploading ? "جارٍ رفع الصور..." : submitting ? "جارٍ النشر..." : "نشر الإعلان"}
      </button>
    </>
  );

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="h-full overflow-y-auto bg-fog" dir="rtl">
        <div className="max-w-2xl mx-auto p-6">
          <h1 className="font-display font-bold text-lg text-ink mb-5">إضافة إعلان جديد</h1>
          {formFields}
          <div className="mt-6">
            {submitBar}
          </div>
        </div>
        <PhoneAuthPopup
          open={showAuthPopup}
          onClose={() => setShowAuthPopup(false)}
          onVerified={(token) => { setShowAuthPopup(false); doSubmit(token); }}
        />
      </div>
    );
  }

  // ── Mobile layout ──
  return (
    <div className="flex flex-col min-h-dvh bg-fog" dir="rtl">
      {/* Header */}
      <div className="bg-surface border-b border-border flex items-center justify-between px-4 py-3.5 flex-shrink-0">
        <h1 className="font-display font-bold text-lg text-ink">إضافة إعلان جديد</h1>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-fog border border-border flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 pt-5">
          {formFields}
        </div>
      </div>

      {/* Submit bar */}
      <div className="fixed bottom-0 inset-x-0 px-4 py-4 bg-surface border-t border-border">
        {submitBar}
      </div>

      <PhoneAuthPopup
        open={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        onVerified={(token) => { setShowAuthPopup(false); doSubmit(token); }}
      />
    </div>
  );
}
