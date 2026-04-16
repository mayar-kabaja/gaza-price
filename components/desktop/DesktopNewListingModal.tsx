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

async function uploadListingImage(file: File): Promise<string> {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("/api/upload/listing", { method: "POST", headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "فشل رفع الصورة");
  if (typeof data?.url !== "string") throw new Error("لم يُرجَع رابط الصورة");
  return data.url;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DesktopNewListingModal({ open, onClose }: Props) {
  const router = useRouter();
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

  function reset() {
    setImages([]);
    setTitle("");
    setCategory("electronics");
    setCondition("new");
    setPrice("");
    setIsNegotiable(false);
    setDescription("");
    setAreaId("");
    setError(null);
    setSubmitting(false);
    setUploading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 5 - images.length;
    const toAdd = files.slice(0, remaining);
    setImages((prev) => [...prev, ...toAdd.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  }

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) return setError("أدخل اسم المنتج");
    if (!price || isNaN(Number(price)) || Number(price) < 0) return setError("أدخل سعرًا صحيحًا");
    if (!contributor?.phone_verified || !accessToken) { setShowAuthPopup(true); return; }
    await doSubmit(accessToken);
  }

  async function doSubmit(token: string) {
    setSubmitting(true);
    setUploading(true);
    let imageUrls: string[] = [];
    try {
      imageUrls = await Promise.all(images.map((img) => img.url ?? uploadListingImage(img.file)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الصور");
      setSubmitting(false); setUploading(false); return;
    }
    setUploading(false);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(), category, condition,
        price: Number(price), is_negotiable: isNegotiable,
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
        setError(msg); setSubmitting(false); return;
      }
      reset();
      onClose();
      router.push(`/market/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مجددًا");
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-up"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <h2 className="font-display font-bold text-lg text-ink">إضافة إعلان جديد</h2>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-fog border border-border flex items-center justify-center text-mist hover:text-ink transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">

            {/* Images */}
            <div>
              <label className="block text-sm font-bold text-ink mb-2">صور المنتج</label>
              <div className="flex gap-2 flex-wrap">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden border border-border flex-shrink-0">
                    <Image src={img.preview} alt="" fill className="object-cover" sizes="72px" />
                    <button onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
                {images.length < 5 && (
                  <button onClick={() => fileInputRef.current?.click()}
                    className={cn("flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-mist hover:border-olive transition-colors",
                      images.length === 0 ? "w-full h-24" : "w-[72px] h-[72px] flex-shrink-0")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={images.length === 0 ? "w-7 h-7" : "w-5 h-5"}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {images.length === 0 && <span className="text-xs font-semibold">اضغط لإضافة صور</span>}
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleImagePick} />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">اسم المنتج</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: iPhone 12 64GB" maxLength={200}
                className="w-full bg-fog border border-border rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors"
                dir="rtl" />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">التصنيف</label>
              <div className="relative">
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-fog border border-border rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-olive appearance-none cursor-pointer"
                  dir="rtl">
                  {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-mist">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">الحالة</label>
              <div className="grid grid-cols-3 gap-2">
                {CONDITIONS.map((cond) => (
                  <button key={cond.value} onClick={() => setCondition(cond.value)}
                    className={cn("py-2.5 rounded-xl border text-sm font-bold transition-all",
                      condition === cond.value ? "bg-olive-pale border-olive text-olive" : "bg-fog border-border text-ink")}>
                    <span className="block text-base leading-none mb-0.5">{cond.emoji}</span>
                    {cond.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">السعر (₪)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                placeholder="0" min={0}
                className="w-full bg-fog border border-border rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors"
                dir="ltr" />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <div onClick={() => setIsNegotiable((v) => !v)}
                  className={cn("w-10 rounded-full relative transition-colors flex-shrink-0", isNegotiable ? "bg-olive" : "bg-fog border border-border")}
                  style={{ height: "22px" }}>
                  <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all", isNegotiable ? "right-0.5" : "left-0.5")} />
                </div>
                <span className="text-xs font-semibold text-ink">قابل للتفاوض</span>
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">الوصف</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب تفاصيل المنتج..." rows={3}
                className="w-full bg-fog border border-border rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-mist outline-none focus:border-olive transition-colors resize-none"
                dir="rtl" />
            </div>

            {/* Area */}
            {!knownAreaId && (
              <div>
                <label className="block text-sm font-bold text-ink mb-1.5">المنطقة</label>
                <div className="relative">
                  <select value={areaId} onChange={(e) => setAreaId(e.target.value)}
                    className="w-full bg-fog border border-border rounded-xl px-4 py-2.5 text-sm text-ink outline-none focus:border-olive appearance-none cursor-pointer"
                    dir="rtl">
                    <option value="">اختر المنطقة</option>
                    {areas.map((area) => <option key={area.id} value={area.id}>{area.name_ar}</option>)}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-mist">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            {error && (
              <div className="mb-3 text-xs text-red-600 font-semibold text-center bg-red-50 rounded-xl py-2 px-3">
                {error}
              </div>
            )}
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full bg-olive text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
              {uploading ? "جارٍ رفع الصور..." : submitting ? "جارٍ النشر..." : "نشر الإعلان"}
            </button>
          </div>
        </div>
      </div>

      <PhoneAuthPopup
        open={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        onVerified={(token) => { setShowAuthPopup(false); doSubmit(token); }}
      />
    </>
  );
}
