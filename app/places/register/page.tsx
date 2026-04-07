"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAreas } from "@/lib/queries/hooks";
import { apiFetch } from "@/lib/api/fetch";

const TYPE_OPTIONS = [
  { key: "workspace", label: "مساحة عمل", sub: "مساحة عمل مشتركة أو مكتب", icon: "💻", section: "workspace", wide: true, smallIcon: false },
  { key: "restaurant", label: "مطعم", sub: "وجبات رئيسية", icon: "🍽️", section: "food", wide: false, smallIcon: false },
  { key: "cafe", label: "كافيه", sub: "مشروبات وحلويات", icon: "☕", section: "food", wide: false, smallIcon: false },
  { key: "both", label: "مطعم وكافيه", sub: "يقدم طعام ومشروبات معاً", icon: "🍴☕", section: "food", wide: true, smallIcon: true },
  { key: "store", label: "متجر", sub: "ملابس، إلكترونيات، أدوات...", icon: "🏪", section: "store", wide: true, smallIcon: false },
] as const;

type PlaceType = (typeof TYPE_OPTIONS)[number]["key"];

const STORE_CATEGORIES = [
  { label: "مواد غذائية وبقالة", icon: "🛒", types: ["بقالية عامة", "سوبرماركت", "خضار وفواكه", "لحوم", "سمك", "مخبز", "حلويات ومعجنات", "بهارات وتوابل"] },
  { label: "صحة وصيدلية", icon: "💊", types: ["صيدلية", "عيادة وطب", "مستلزمات طبية", "بصريات"] },
  { label: "ملابس وأزياء", icon: "👕", types: ["ملابس رجالي", "ملابس حريمي", "ملابس أطفال", "أحذية", "إكسسوارات", "خياطة وتعديل"] },
  { label: "منزل وأثاث", icon: "🏠", types: ["أثاث منزلي", "مفروشات وستائر", "أدوات منزلية", "كهرباء ولوازم منزلية", "نظافة ومنظفات", "أدوات صحية وسباكة"] },
  { label: "إلكترونيات وتقنية", icon: "📱", types: ["موبايل وإكسسوارات", "كمبيوتر ولاب توب", "كهربائيات", "طاقة شمسية", "إصلاح وصيانة"] },
  { label: "بناء ومواد", icon: "🏗️", types: ["مواد بناء", "حديد وألمنيوم", "دهانات وديكور", "أخشاب", "سيراميك وبلاط"] },
  { label: "تعليم وثقافة", icon: "📚", types: ["مكتبة وقرطاسية", "ألعاب أطفال", "أدوات رسم وفنون"] },
  { label: "خدمات شخصية", icon: "💈", types: ["حلاقة وصالون", "عطور وكوزمتيك", "تصوير"] },
  { label: "سيارات", icon: "🚗", types: ["قطع غيار سيارات", "كراج وميكانيك", "إطارات"] },
  { label: "زراعة وحيوانات", icon: "🌿", types: ["مستلزمات زراعية", "علف وبيطري"] },
  { label: "أخرى", icon: "📦", types: ["أخرى"] },
];

const PLAN_FEATURES = [
  { name: "ظهور في القائمة",     free: true,  basic: true,  premium: true },
  { name: "صفحة خاصة",          free: true,  basic: true,  premium: true },
  { name: "قائمة الأسعار",       free: true,  basic: true,  premium: true },
  { name: "Toggle مفتوح/مغلق",  free: true,  basic: true,  premium: true },
  { name: "لوحة تحكم",          free: true,  basic: true,  premium: true },
  { name: "إحصائيات الزيارات",   free: false, basic: true,  premium: true },
  { name: "في قسم الأبرز",       free: false, basic: false, premium: true },
  { name: 'شارة "موثّق"',       free: false, basic: true,  premium: true },
  { name: "تقارير الأسعار",      free: false, basic: true,  premium: true },
  { name: "PDF المنيو",          free: false, basic: false, premium: true },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4 mx-auto" fill="none" stroke="#3A6347" strokeWidth={2.5} strokeLinecap="round">
      <polyline points="2,8 6,12 14,4" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 mx-auto" fill="none" stroke="#D1D5DB" strokeWidth={2} strokeLinecap="round">
      <line x1={4} y1={4} x2={12} y2={12} /><line x1={12} y1={4} x2={4} y2={12} />
    </svg>
  );
}

const PREFIX_OPTIONS = [
  { value: "+970", flag: "", label: "+970" },
  { value: "+972", flag: "", label: "+972" },
];

function PrefixPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = PREFIX_OPTIONS.find((p) => p.value === value) ?? PREFIX_OPTIONS[0];

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="bg-[#EBF3EE] h-full px-2.5 flex items-center gap-1 text-[12px] font-bold text-[#4A7C59] cursor-pointer rounded-l-[10px]"
      >
        {selected.label}
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20 overflow-hidden min-w-[110px]">
            {PREFIX_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => { onChange(p.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-right transition-colors ${
                  p.value === value ? "bg-[#EBF3EE] text-[#4A7C59]" : "text-[#374151] hover:bg-[#F9FAFB]"
                }`}
              >
                <span>{p.label}</span>
                {p.value === value && (
                  <svg viewBox="0 0 12 12" className="w-3 h-3 mr-auto" fill="none" stroke="#4A7C59" strokeWidth={2.5} strokeLinecap="round">
                    <polyline points="1,6 4,10 11,2" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const SECTION_TO_TYPE: Record<string, PlaceType | null> = {
  food: null,
  store: "store",
  workspace: "workspace",
};

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFB]" />}>
      <RegisterPlacePage />
    </Suspense>
  );
}

function RegisterPlacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const preselectedType = sectionParam ? SECTION_TO_TYPE[sectionParam] ?? null : null;

  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];

  const skipTypeStep = preselectedType === "workspace";
  const [step, setStep] = useState(skipTypeStep ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "basic" | "premium" | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Form state — pre-select type from URL param
  const [type, setType] = useState<PlaceType | null>(preselectedType);
  const [storeSubType, setStoreSubType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [waPrefix, setWaPrefix] = useState("+970");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTypeOption = TYPE_OPTIONS.find((t) => t.key === type);
  const isWorkspace = type === "workspace";
  const isStore = type === "store";
  const isFood = type === "restaurant" || type === "cafe" || type === "both";
  const placeWord = isWorkspace ? "مساحة العمل" : type === "cafe" ? "الكافيه" : type === "both" ? "المطعم والكافيه" : isFood ? "المطعم" : isStore ? "المتجر" : "المكان";
  const placeWordShort = isWorkspace ? "مساحتك" : type === "cafe" ? "الكافيه" : type === "both" ? "مطعمك" : isFood ? "مطعمك" : isStore ? "متجرك" : "مكانك";

  /** Strip non-digits from input */
  function digitsOnly(v: string) { return v.replace(/[^0-9]/g, ""); }

  /** Normalize a phone number to the format the backend expects (e.g. 0591234567) */
  function normalizePhone(raw: string): string {
    let d = digitsOnly(raw);
    // Remove leading country code if user typed it
    if (d.startsWith("970")) d = "0" + d.slice(3);
    if (d.startsWith("972")) d = "0" + d.slice(3);
    // Ensure starts with 0
    if (d.length > 0 && !d.startsWith("0")) d = "0" + d;
    return d;
  }

  /** Normalize WhatsApp: dropdown prefix + local number → e.g. 970567359920 or 972567359920 */
  function normalizeWhatsApp(raw: string, prefix: string): string {
    let d = digitsOnly(raw);
    // Strip country code if user accidentally typed it in the number field
    if (d.startsWith("970")) d = d.slice(3);
    else if (d.startsWith("972")) d = d.slice(3);
    // Strip leading 0
    if (d.startsWith("0")) d = d.slice(1);
    // Use the prefix from dropdown
    const code = prefix === "+972" ? "972" : "970";
    return d.length > 0 ? code + d : "";
  }

  /** Validate phone: must be 10 digits starting with 05 */
  function isValidPhone(raw: string): boolean {
    const d = normalizePhone(raw);
    return /^05[0-9]{8}$/.test(d);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${base}/upload/avatar`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setAvatarUrl(data.url);
      }
    } catch {
      // silent fail — avatar is optional
    } finally {
      setUploadingAvatar(false);
    }
  }

  function canNext() {
    if (step === 1) {
      if (!type) return false;
      if (type === "store" && !storeSubType) return false;
      if (sectionParam === "food" && !["restaurant", "cafe", "both"].includes(type)) return false;
      return true;
    }
    if (step === 2) return name.trim().length >= 2 && !!areaId;
    if (step === 3) return isValidPhone(phone);
    return true;
  }

  function handleNext() {
    if (!canNext()) return;
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const normalizedPhone = normalizePhone(phone);
      const normalizedWa = whatsapp.trim() ? normalizeWhatsApp(whatsapp, waPrefix) : undefined;
      const body = {
        name: name.trim(),
        section: selectedTypeOption?.section ?? "food",
        type: type === "store" && storeSubType ? storeSubType : (selectedTypeOption?.label ?? type),
        area_id: areaId,
        address: address.trim() || undefined,
        phone: normalizedPhone,
        whatsapp: normalizedWa,
        avatar_url: avatarUrl || undefined,
      };
      const res = await apiFetch("/api/places/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message ?? "حدث خطأ، حاول مرة أخرى");
        setSubmitting(false);
        return;
      }
      setStep(5); // success
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  const areaName = areas.find((a) => a.id === areaId)?.name_ar ?? "";

  return (
    <div className="min-h-screen bg-[#F9FAFB]" dir="rtl">
      {/* Header */}
      <div className="bg-[#4A7C59] px-4 pt-3 pb-5 relative overflow-hidden">
        <div className="absolute w-40 h-40 rounded-full bg-white/5 -top-14 -left-10" />
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <button
            onClick={() => {
              const minStep = skipTypeStep ? 2 : 1;
              if (step > minStep && step < 5) setStep(step - 1);
              else router.back();
            }}
            className="w-9 h-9 bg-white/10 rounded-[10px] flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="font-bold text-base text-white">سجّل {placeWordShort}</h1>
        </div>

        {/* Stepper */}
        {step < 5 && (
          <div className="flex items-center relative z-10">
            {(skipTypeStep
              ? [
                  { n: 2, label: "البيانات" },
                  { n: 3, label: "التواصل" },
                  { n: 4, label: "مراجعة" },
                ]
              : [
                  { n: 1, label: "النوع" },
                  { n: 2, label: "البيانات" },
                  { n: 3, label: "التواصل" },
                  { n: 4, label: "مراجعة" },
                ]
            ).map((s, i, arr) => (
              <div key={s.n} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold
                      ${s.n < step ? "bg-white text-[#4A7C59]" : s.n === step ? "bg-white/25 border-2 border-white text-white" : "bg-white/10 border-2 border-white/25 text-white/50"}`}
                  >
                    {s.n < step ? "✓" : ["١", "٢", "٣", "٤"][s.n - 1]}
                  </div>
                  <span className={`text-[9px] font-semibold ${s.n === step ? "text-white" : "text-white/50"}`}>
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-3 max-w-[30px] ${s.n < step ? "bg-white/60" : "bg-white/20"}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-5 pb-28">
        {/* Step 1: Type */}
        {step === 1 && (
          <div className="animate-fadeIn">
            {sectionParam === "food" ? (
              <>
                <h2 className="font-bold text-lg text-[#111827] mb-1">شو نوع نشاطك؟</h2>
                <p className="text-[13px] text-[#9CA3AF] mb-5 leading-relaxed">اختر الوصف الأقرب لمكانك</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {(TYPE_OPTIONS.filter((t) => t.section === "food") as typeof TYPE_OPTIONS[number][]).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setType(t.key)}
                      className={`rounded-2xl border-2 p-4 transition-all
                        ${t.wide ? "col-span-2 flex items-center gap-3.5 text-right" : "text-center"}
                        ${type === t.key ? "border-[#4A7C59] bg-[#EBF3EE]" : "border-[#E5E7EB] bg-white hover:border-[#3A6347]"}`}
                    >
                      <div
                        className={`w-[52px] h-[52px] rounded-[14px] flex items-center justify-center flex-shrink-0
                          ${t.wide ? "" : "mx-auto mb-2.5"}
                          ${"smallIcon" in t && t.smallIcon ? "text-lg" : "text-2xl"}
                          ${type === t.key ? "bg-[#4A7C59] text-white" : "bg-[#EBF3EE]"}`}
                      >
                        {t.icon}
                      </div>
                      <div className={t.wide ? "flex-1" : ""}>
                        <div className={`font-bold text-[13px] ${type === t.key ? "text-[#4A7C59]" : "text-[#111827]"}`}>
                          {t.label}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${type === t.key ? "text-[#3A6347]" : "text-[#9CA3AF]"}`}>
                          {t.sub}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${t.wide ? "mr-auto" : "mx-auto mt-2"}
                          ${type === t.key ? "bg-[#4A7C59] border-[#4A7C59]" : "border-[#E5E7EB]"}`}
                      >
                        {type === t.key && (
                          <svg viewBox="0 0 12 12" className="w-[11px] h-[11px]" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                            <polyline points="1,6 4,10 11,2" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : preselectedType === "store" ? (
              <>
                <h2 className="font-bold text-lg text-[#111827] mb-1">نوع المتجر</h2>
                <p className="text-[13px] text-[#9CA3AF] mb-5 leading-relaxed">اختر التصنيف الأقرب لنشاطك</p>
                <div className="space-y-2">
                  {STORE_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <div className="text-[11px] font-bold text-[#374151] flex items-center gap-1.5 mb-1.5">
                        <span className="text-[14px]">{cat.icon}</span>
                        {cat.label}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {cat.types.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setStoreSubType(t)}
                            className={`text-[11px] font-semibold px-3 py-[6px] rounded-full border transition-all
                              ${storeSubType === t
                                ? "bg-[#4A7C59] text-white border-[#4A7C59]"
                                : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#4A7C59]"
                              }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="font-bold text-lg text-[#111827] mb-1">نوع النشاط</h2>
                <p className="text-[13px] text-[#9CA3AF] mb-5 leading-relaxed">اختر النوع حتى نعرض المعلومات الصحيحة للزوار</p>

                <div className="grid grid-cols-2 gap-2.5">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => { setType(t.key); if (t.key !== "store") setStoreSubType(null); }}
                      className={`rounded-2xl border-2 p-4 transition-all
                        ${t.wide ? "col-span-2 flex items-center gap-3.5 text-right" : "text-center"}
                        ${type === t.key ? "border-[#4A7C59] bg-[#EBF3EE]" : "border-[#E5E7EB] bg-white hover:border-[#3A6347]"}`}
                    >
                      <div
                        className={`w-[52px] h-[52px] rounded-[14px] flex items-center justify-center flex-shrink-0
                          ${t.wide ? "" : "mx-auto mb-2.5"}
                          ${"smallIcon" in t && t.smallIcon ? "text-lg" : "text-2xl"}
                          ${type === t.key ? "bg-[#4A7C59] text-white" : "bg-[#EBF3EE]"}`}
                      >
                        {t.icon}
                      </div>
                      <div className={t.wide ? "flex-1" : ""}>
                        <div className={`font-bold text-[13px] ${type === t.key ? "text-[#4A7C59]" : "text-[#111827]"}`}>
                          {t.label}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${type === t.key ? "text-[#3A6347]" : "text-[#9CA3AF]"}`}>
                          {t.sub}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${t.wide ? "mr-auto" : "mx-auto mt-2"}
                          ${type === t.key ? "bg-[#4A7C59] border-[#4A7C59]" : "border-[#E5E7EB]"}`}
                      >
                        {type === t.key && (
                          <svg viewBox="0 0 12 12" className="w-[11px] h-[11px]" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                            <polyline points="1,6 4,10 11,2" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Store sub-type picker when selected from generic flow */}
                {type === "store" && (
                  <div className="mt-5 animate-fadeIn">
                    <h3 className="font-bold text-[14px] text-[#111827] mb-1">نوع المتجر</h3>
                    <p className="text-[11px] text-[#9CA3AF] mb-3">اختر التصنيف الأقرب لنشاطك</p>
                    <div className="space-y-2">
                      {STORE_CATEGORIES.map((cat) => (
                        <div key={cat.label}>
                          <div className="text-[11px] font-bold text-[#374151] flex items-center gap-1.5 mb-1.5">
                            <span className="text-[14px]">{cat.icon}</span>
                            {cat.label}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {cat.types.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setStoreSubType(t)}
                                className={`text-[11px] font-semibold px-3 py-[6px] rounded-full border transition-all
                                  ${storeSubType === t
                                    ? "bg-[#4A7C59] text-white border-[#4A7C59]"
                                    : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#4A7C59]"
                                  }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <h2 className="font-bold text-lg text-[#111827] mb-1">بيانات {placeWord}</h2>
            <p className="text-[13px] text-[#9CA3AF] mb-5 leading-relaxed">هذه المعلومات ستظهر للزوار في صفحتك</p>

            <div className="space-y-4">
              {/* Avatar upload */}
              <div className="flex flex-col items-center mb-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-[80px] h-[80px] rounded-full border-2 border-dashed border-[#C2DBC9] bg-[#EBF3EE] flex items-center justify-center overflow-hidden hover:border-[#4A7C59] transition-colors"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#4A7C59" strokeWidth={1.8} strokeLinecap="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-full">
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-[#4A7C59] border-t-transparent" />
                    </div>
                  )}
                </button>
                <span className="text-[10px] text-[#9CA3AF] mt-1.5">صورة {placeWord} (اختياري)</span>
              </div>

              <div>
                <label className="text-xs font-bold text-[#374151] mb-1.5 flex items-center gap-1">
                  اسم {type === "cafe" ? "الكافيه" : type === "restaurant" ? "المطعم" : type === "both" ? "المطعم" : placeWord} <span className="text-[#E05C35] text-[11px]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isWorkspace ? "مثال: مساحة عمل النجاح" : type === "cafe" ? "مثال: كافيه الصباح" : type === "both" ? "مثال: مطعم وكافيه الديوان" : isStore ? "مثال: سوبرماركت الأمل" : "مثال: مطعم أبو مازن"}
                  className={`w-full border-[1.5px] rounded-xl px-3.5 py-3 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF]
                    ${name.trim() ? "border-[#4A7C59] bg-[#EBF3EE]" : "border-[#E5E7EB] bg-white focus:border-[#3A6347]"}`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#374151] mb-1.5 flex items-center gap-1">
                  المنطقة <span className="text-[#E05C35] text-[11px]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="w-full border-[1.5px] border-[#E5E7EB] bg-white rounded-xl px-3.5 py-3 text-sm text-[#111827] outline-none appearance-none focus:border-[#3A6347]"
                  >
                    <option value="">اختر المنطقة...</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name_ar}</option>
                    ))}
                  </select>
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-xs pointer-events-none">▾</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#374151] mb-1.5 block">العنوان التفصيلي</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isWorkspace ? "مثال: شارع الوحدة، الطابق الثاني..." : "مثال: شارع النصر، بجانب مسجد العمر..."}
                  className="w-full border-[1.5px] border-[#E5E7EB] bg-white rounded-xl px-3.5 py-3 text-sm text-[#111827] outline-none resize-none h-20 placeholder:text-[#9CA3AF] focus:border-[#3A6347]"
                />
                <p className="text-[10px] text-[#9CA3AF] mt-1">اختياري — يساعد الزوار على إيجادك</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact */}
        {step === 3 && (
          <div className="animate-fadeIn">
            <h2 className="font-bold text-lg text-[#111827] mb-1">بيانات التواصل</h2>
            <p className="text-[13px] text-[#9CA3AF] mb-5 leading-relaxed">سيتواصل معك الزوار والفريق عبر هذه الأرقام</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#374151] mb-1.5 flex items-center gap-1">
                  رقم الهاتف <span className="text-[#E05C35] text-[11px]">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="059 XXX XXXX"
                  className="w-full border-[1.5px] border-[#E5E7EB] bg-white rounded-xl px-3.5 py-3 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#3A6347]"
                />
                {phone.trim() && !isValidPhone(phone) && (
                  <p className="text-[10px] text-[#E05C35] mt-1">الرقم يجب أن يبدأ بـ 05 ويتكون من 10 أرقام</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-[#374151] mb-1.5 block">رقم واتساب</label>
                <div className="flex items-stretch rounded-xl border-[1.5px] border-[#E5E7EB] focus-within:border-[#3A6347] outline-none">
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="059 XXX XXXX"
                    className="flex-1 px-3.5 py-3 text-sm text-[#111827] outline-none border-none placeholder:text-[#9CA3AF] bg-transparent rounded-r-xl"
                  />
                  <PrefixPicker value={waPrefix} onChange={setWaPrefix} />
                </div>
                <p className="text-[10px] text-[#9CA3AF] mt-1">اختياري — سيُرسل لك رابط لوحة التحكم هنا</p>
              </div>

              {/* Info box */}
              <div className="bg-[#EBF3EE] border border-[#4A7C59]/20 rounded-xl p-3.5 flex gap-2.5">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0 mt-0.5" fill="none" stroke="#4A7C59" strokeWidth={2} strokeLinecap="round">
                  <circle cx={12} cy={12} r={10} /><line x1={12} y1={8} x2={12} y2={12} /><line x1={12} y1={16} x2={12.01} y2={16} />
                </svg>
                <p className="text-[11px] text-[#3A6347] leading-relaxed">
                  بعد موافقة الفريق، ستصلك رسالة واتساب تحتوي على رابط خاص للوحة التحكم الخاصة بـ{placeWordShort}
                </p>
              </div>

              {/* How it works */}
              <div className="space-y-2.5">
                {[
                  { n: "١", title: "ترسل الطلب", sub: "تملأ البيانات وترسلها الآن" },
                  { n: "٢", title: "الفريق يراجع", sub: "خلال 24 ساعة نراجع طلبك ونوافق" },
                  { n: "٣", title: "رابطك يصلك", sub: "رابط لوحة التحكم يصلك على واتساب مجاناً" },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3 bg-white border border-[#E5E7EB] rounded-xl p-3.5">
                    <div className="w-[26px] h-[26px] rounded-full bg-[#4A7C59] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                      {s.n}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-[#111827]">{s.title}</div>
                      <div className="text-[11px] text-[#9CA3AF]">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="animate-fadeIn">
            <h2 className="font-bold text-lg text-[#111827] mb-1">مراجعة الطلب</h2>
            <p className="text-[13px] text-[#9CA3AF] mb-5 leading-relaxed">تأكد من صحة البيانات قبل الإرسال</p>

            <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-2xl overflow-hidden mb-4">
              <div className="bg-[#4A7C59] p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-bold text-[15px] text-white">{name || "—"}</div>
                  <div className="text-[10px] text-white/60 mt-0.5">
                    {type === "store" && storeSubType ? storeSubType : (selectedTypeOption?.label ?? "—")}
                  </div>
                </div>
              </div>
              <div className="p-4">
                {[
                  { key: "النوع", val: type === "store" && storeSubType ? `متجر — ${storeSubType}` : selectedTypeOption?.label },
                  { key: "المنطقة", val: areaName },
                  { key: "العنوان", val: address.trim() || "غير محدد" },
                  { key: "الهاتف", val: `+970 ${normalizePhone(phone)}` },
                  { key: "واتساب", val: whatsapp.trim() ? `${waPrefix} ${whatsapp.trim()}` : "غير محدد" },
                ].map((r, i, arr) => (
                  <div key={r.key} className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? "border-b border-[#E5E7EB]" : ""}`}>
                    <span className="text-[11px] text-[#9CA3AF] font-semibold">{r.key}</span>
                    <span className="text-xs text-[#111827] font-bold">{r.val || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            <div className="bg-[#EBF3EE] border border-[#4A7C59]/20 rounded-xl p-3.5 flex gap-2.5">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0 mt-0.5" fill="none" stroke="#4A7C59" strokeWidth={2} strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-[11px] text-[#3A6347] leading-relaxed">
                بإرسال الطلب توافق على عرض بياناتك للزوار على منصة GazaPriceWatch مجاناً
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="animate-fadeIn">
            {/* Success banner */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#EBF3EE] flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#4A7C59" strokeWidth={2.5} strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="font-bold text-lg text-[#111827] mb-1">تم إرسال الطلب!</h2>
              <p className="text-[12px] text-[#9CA3AF] leading-relaxed">الفريق سيراجع طلبك خلال 24 ساعة وسيتواصل معك على واتساب</p>
            </div>

            {/* ── أربع خطوات وصفحتك جاهزة ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-[#4A7C59] bg-[#EBF3EE] border border-[#C2DBC9] rounded-full px-2.5 py-0.5">كيف يعمل</span>
              </div>
              <h3 className="font-bold text-[15px] text-[#111827] mb-4">أربع خطوات وصفحتك جاهزة</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: "📝", n: "١", title: `سجّل ${placeWordShort}`, text: "أدخل بياناتك في أقل من دقيقتين" },
                  { icon: "✅", n: "٢", title: "موافقة خلال 24 ساعة", text: "الفريق يراجع ويوافق" },
                  { icon: isWorkspace ? "💻" : "🍽️", n: "٣", title: isWorkspace ? "جهّز مساحتك" : "أضف قائمتك", text: isWorkspace ? "أضف التفاصيل والخدمات" : "أصناف وأسعار من هاتفك" },
                  { icon: "🚀", n: "٤", title: isWorkspace ? "العملاء يجدونك" : "الزبائن يجدونك", text: "صفحتك تظهر للآلاف يومياً" },
                ].map((s) => (
                  <div key={s.n} className="bg-white rounded-2xl border border-[#E5E7EB] p-3 relative">
                    <div className="w-10 h-10 rounded-full bg-[#EBF3EE] border border-[#C2DBC9] flex items-center justify-center text-lg mb-2 relative">
                      {s.icon}
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C9A96E] flex items-center justify-center text-[8px] font-bold text-white">{s.n}</div>
                    </div>
                    <div className="text-[12px] font-bold text-[#111827] mb-0.5">{s.title}</div>
                    <div className="text-[10px] text-[#9CA3AF] leading-relaxed">{s.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Plans section (landing page style) ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-[#4A7C59] bg-[#EBF3EE] border border-[#C2DBC9] rounded-full px-2.5 py-0.5">الأسعار</span>
              </div>
              <h3 className="font-bold text-[15px] text-[#111827] mb-1">شفاف وبدون مفاجآت</h3>
              <p className="text-[11px] text-[#9CA3AF] mb-4">أنت الآن على الباقة المجانية — يمكنك الترقية لاحقاً</p>

              {/* Plan cards — landing style */}
              <div className="space-y-3 mb-4">
                {([
                  {
                    key: "free" as const, label: "مجاني دائماً", price: "0",
                    desc: isWorkspace ? "لمساحات العمل التي تريد فقط الظهور في القائمة" : "لمن يريد فقط الظهور في القائمة",
                    features: ["صفحة أساسية", "الظهور في نتائج البحث", "رقم التواصل", "حالة مفتوح / مغلق"],
                    missing: ["قائمة الأصناف", "إحصاءات"],
                    btnClass: "border-2 border-[#E5E7EB] text-[#4A5E52] bg-white",
                    btnText: "باقتك الحالية",
                    active: true,
                    popular: false,
                  },
                  {
                    key: "basic" as const, label: "أساسي", price: "100",
                    desc: isWorkspace ? "لمساحات العمل التي تريد حضور رقمي حقيقي" : "لمن يريد قائمة حية وحضور رقمي حقيقي",
                    features: ["كل شيء في المجاني", "قائمة أصناف كاملة", "تحديث الأسعار أي وقت", 'شارة "موثّق ✓"', "تقارير الأسعار"],
                    missing: ["ظهور مميّز أولاً"],
                    btnClass: "bg-[#4A7C59] text-white shadow-md shadow-[#4A7C59]/25",
                    btnText: "اشترك الآن",
                    active: false,
                    popular: true,
                  },
                  {
                    key: "premium" as const, label: "مميّز", price: "200",
                    desc: isWorkspace ? "لمساحات العمل التي تريد التميّز وأكثر عملاء" : "لمن يريد التميّز وأكثر زبائن",
                    features: ["كل شيء في الأساسي", "ظهور أول في القائمة", "في قسم الأبرز", "PDF المنيو", "إحصائيات مفصّلة"],
                    missing: [],
                    btnClass: "bg-gradient-to-l from-[#C9A96E] to-[#A07840] text-white shadow-md shadow-[#C9A96E]/30",
                    btnText: "اشترك الآن",
                    active: false,
                    popular: false,
                  },
                ] as const).map((p) => (
                  <div
                    key={p.key}
                    className={`bg-white rounded-2xl border-2 p-4 transition-all relative ${
                      selectedPlan === p.key ? "border-[#4A7C59] shadow-lg shadow-[#4A7C59]/10" : p.popular ? "border-[#4A7C59] shadow-md shadow-[#4A7C59]/10" : "border-[#E5E7EB]"
                    }`}
                  >
                    {p.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4A7C59] text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">الأكثر اختياراً</div>
                    )}
                    <div className="text-[11px] font-bold text-[#4A5E52] uppercase tracking-wide mb-1">{p.label}</div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-[32px] font-black text-[#111827] leading-none">{p.price}</span>
                      <span className="text-[14px] font-bold text-[#4A5E52]">₪</span>
                      {p.price !== "0" && <span className="text-[11px] text-[#9CA3AF]">/ شهر</span>}
                    </div>
                    <p className="text-[11px] text-[#4A5E52] mb-3 leading-relaxed">{p.desc}</p>
                    <div className="h-px bg-[#E5E7EB] mb-3" />
                    <div className="space-y-2 mb-3">
                      {p.features.map((f) => (
                        <div key={f} className="flex items-start gap-2 text-[11px] text-[#374151]">
                          <span className="text-[#2D9E5F] font-bold text-xs mt-px flex-shrink-0">✓</span>
                          {f}
                        </div>
                      ))}
                      {p.missing.map((f) => (
                        <div key={f} className="flex items-start gap-2 text-[11px] text-[#9CA3AF]">
                          <span className="text-[10px] mt-px flex-shrink-0">✕</span>
                          {f}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedPlan(selectedPlan === p.key ? null : p.key)}
                      className={`w-full py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                        p.active ? "border-2 border-[#C2DBC9] text-[#4A7C59] bg-[#EBF3EE]" : p.btnClass
                      }`}
                    >
                      {p.active ? "باقتك الحالية" : selectedPlan === p.key ? "تم الاختيار ✓" : p.btnText}
                    </button>

                    {/* Payment inside this card */}
                    {!p.active && selectedPlan === p.key && (
                      <div className="mt-3 pt-3 border-t border-[#C2DBC9] animate-fadeIn text-right">
                        <div className="bg-[#F9FAFB] rounded-xl p-3 mb-2">
                          <div className="text-[10px] text-[#9CA3AF] font-semibold mb-1.5">١. حوّل المبلغ عبر بنك فلسطين</div>
                          <div className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 flex items-center justify-between">
                            <span className="text-[15px] font-bold text-[#111827] tracking-wider" dir="ltr">0567359920</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText("0567359920"); }}
                              className="text-[10px] text-[#4A7C59] font-bold bg-[#EBF3EE] rounded-lg px-2.5 py-1"
                            >
                              نسخ
                            </button>
                          </div>
                        </div>
                        <div className="bg-[#F9FAFB] rounded-xl p-3">
                          <div className="text-[10px] text-[#9CA3AF] font-semibold mb-1.5">٢. أرسل إشعار التحويل للتأكيد</div>
                          <a
                            href={`https://wa.me/972567359920?text=${encodeURIComponent(`مرحباً، حوّلت ${p.price} شيكل لباقة ${p.label} — الاسم: ${name}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-[#25D366] text-white font-bold text-[13px] rounded-xl py-2.5 flex items-center justify-center gap-2"
                          >
                            <svg viewBox="0 0 24 24" className="w-[16px] h-[16px]" fill="white">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.39 0-4.598-.788-6.379-2.117l-.446-.338-2.634.883.883-2.634-.338-.446A9.723 9.723 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z" />
                            </svg>
                            إرسال عبر واتساب
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Comparison table */}
              <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white">
                <table className="w-full text-center" style={{ minWidth: 320 }}>
                  <thead>
                    <tr className="bg-[#F9FAFB]">
                      <th className="text-right text-[10px] font-semibold text-[#9CA3AF] px-3 py-2.5 border-b border-[#E5E7EB]">الميزة</th>
                      <th className={`text-[10px] font-semibold px-2 py-2.5 border-b border-[#E5E7EB] border-r border-[#E5E7EB] ${selectedPlan === "free" ? "text-[#4A7C59] bg-[#EBF3EE]" : "text-[#9CA3AF]"}`}>مجاني</th>
                      <th className={`text-[10px] font-semibold px-2 py-2.5 border-b border-[#E5E7EB] border-r border-[#E5E7EB] ${selectedPlan === "basic" ? "text-[#4A7C59] bg-[#EBF3EE]" : "text-[#9CA3AF]"}`}>أساسي</th>
                      <th className={`text-[10px] font-semibold px-2 py-2.5 border-b border-[#E5E7EB] border-r border-[#E5E7EB] ${selectedPlan === "premium" ? "text-[#4A7C59] bg-[#EBF3EE]" : "text-[#9CA3AF] bg-[#F2FAF5]"}`}>مميّز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_FEATURES.map((f, i) => (
                      <tr key={f.name} className={i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                        <td className="text-right text-[11px] text-[#374151] px-3 py-2 border-b border-[#F3F4F6]">{f.name}</td>
                        <td className={`px-2 py-2 border-b border-[#F3F4F6] border-r border-[#F3F4F6] ${selectedPlan === "free" ? "bg-[#EBF3EE]/40" : ""}`}>{f.free ? <CheckIcon /> : <XIcon />}</td>
                        <td className={`px-2 py-2 border-b border-[#F3F4F6] border-r border-[#F3F4F6] ${selectedPlan === "basic" ? "bg-[#EBF3EE]/40" : ""}`}>{f.basic ? <CheckIcon /> : <XIcon />}</td>
                        <td className={`px-2 py-2 border-b border-[#F3F4F6] border-r border-[#F3F4F6] ${selectedPlan === "premium" ? "bg-[#EBF3EE]/40" : "bg-[#FAFFF7]"}`}>{f.premium ? <CheckIcon /> : <XIcon />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── FAQ ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-[#4A7C59] bg-[#EBF3EE] border border-[#C2DBC9] rounded-full px-2.5 py-0.5">أسئلة شائعة</span>
              </div>
              <h3 className="font-bold text-[15px] text-[#111827] mb-3">أجوبة سريعة</h3>
              <div className="space-y-2">
                {[
                  { q: "هل التسجيل مجاني فعلاً؟", a: "نعم — بدون أي التزام. سجّل وجرّب، وإذا أردت مميزات أكثر يمكنك الترقية لاحقاً." },
                  { q: isWorkspace ? "كيف أحدّث بيانات مساحتي؟" : "كيف أحدّث قائمتي وأسعاري؟", a: isWorkspace ? "من لوحة تحكم بسيطة على هاتفك — تحدّث البيانات في أقل من 30 ثانية. لا تحتاج أي خبرة تقنية." : "من لوحة تحكم بسيطة على هاتفك — تضيف صنفاً أو تغيّر سعراً في أقل من 30 ثانية. لا تحتاج أي خبرة تقنية." },
                  { q: "كم من الوقت يأخذ القبول؟", a: "عادةً خلال 24 ساعة — وتصلك رسالة واتساب فور الموافقة تحتوي رابط لوحة التحكم." },
                  { q: "ماذا لو أردت إلغاء الاشتراك؟", a: "يمكنك الإلغاء في أي وقت بدون رسوم. صفحتك تنتقل للباقة المجانية وتبقى ظاهرة." },
                  { q: "كيف يعرف الزبائن أنك موجود؟", a: "صفحتك تظهر في نتائج البحث عند كل شخص يبحث في منطقتك. الباقة المميّزة تضعك أعلى القائمة." },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`bg-white rounded-2xl border transition-colors ${openFaq === i ? "border-[#C2DBC9]" : "border-[#E5E7EB]"}`}
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-3.5 py-3 text-right"
                    >
                      <span className="text-[12px] font-bold text-[#111827]">{item.q}</span>
                      <svg
                        viewBox="0 0 12 12"
                        className={`w-3 h-3 flex-shrink-0 mr-2 transition-transform text-[#9CA3AF] ${openFaq === i ? "rotate-180 text-[#4A7C59]" : ""}`}
                        fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
                      >
                        <path d="M2 4l4 4 4-4" />
                      </svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-3.5 pb-3 pt-0 border-t border-[#E5E7EB]">
                        <p className="text-[11px] text-[#4A5E52] leading-relaxed pt-2.5">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => router.push("/places")}
              className="w-full bg-[#4A7C59] text-white font-bold text-[15px] rounded-2xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-[#4A7C59]/25 mb-4"
            >
              العودة للرئيسية
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {step >= 1 && step <= 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-4 py-3 pb-5 z-10">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleNext}
              disabled={!canNext() || submitting}
              className="w-full bg-[#4A7C59] text-white font-bold text-[15px] rounded-[14px] py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-[#4A7C59]/25 disabled:opacity-40 transition-opacity"
            >
              {submitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{step === 4 ? "إرسال الطلب" : "التالي"}</span>
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M9 18l-6-6 6-6" />
                  </svg>
                </>
              )}
            </button>
            {step > (skipTypeStep ? 2 : 1) && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-full text-[#6B7280] font-semibold text-[13px] py-2 mt-1.5"
              >
                رجوع
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease; }
      `}</style>
    </div>
  );
}
