"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAreas } from "@/lib/queries/hooks";
import { apiFetch } from "@/lib/api/fetch";
import { compressImage } from "@/lib/compress-image";
import { normalizeDigits } from "@/lib/normalize-digits";
import { event as gtagEvent } from "@/lib/gtag";
import { toArabicNumerals } from "@/lib/arabic";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/layout/BottomNav";

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

const STEP_TITLES: Record<number, string> = {
  1: "شو نوع النشاط؟",
  2: "بيانات المكان",
  3: "بيانات التواصل",
  4: "مراجعة الطلب",
};
const STEP_SUBS: Record<number, string> = {
  1: "اختر الوصف الأقرب لمكانك",
  2: "هذه المعلومات ستظهر للزوار في صفحتك",
  3: "سيتواصل معك الزوار والفريق عبر هذه الأرقام",
  4: "تأكد من صحة البيانات قبل الإرسال",
};

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-fog" />}>
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
  const minStep = skipTypeStep ? 2 : 1;
  const totalSteps = skipTypeStep ? 3 : 4;
  const [step, setStep] = useState(minStep);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "basic" | "premium" | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const stepIndex = step - minStep;
  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const isLastStep = step === 4;

  // Form state
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

  function digitsOnly(v: string) { return v.replace(/[^0-9]/g, ""); }

  function normalizePhone(raw: string): string {
    let d = digitsOnly(raw);
    if (d.startsWith("970")) d = "0" + d.slice(3);
    if (d.startsWith("972")) d = "0" + d.slice(3);
    if (d.length > 0 && !d.startsWith("0")) d = "0" + d;
    return d;
  }

  function normalizeWhatsApp(raw: string, prefix: string): string {
    let d = digitsOnly(raw);
    if (d.startsWith("970")) d = d.slice(3);
    else if (d.startsWith("972")) d = d.slice(3);
    if (d.startsWith("0")) d = d.slice(1);
    const code = prefix === "+972" ? "972" : "970";
    return d.length > 0 ? code + d : "";
  }

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
      const compressed = await compressImage(file);
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch(`${base}/upload/avatar`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setAvatarUrl(data.url);
      }
    } catch {
      // silent fail
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
    if (step === 2) return name.trim().length >= 2 && !!areaId && !!avatarUrl;
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

  function prevStep() {
    if (step > minStep) setStep(step - 1);
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
        type: type === "store" && storeSubType ? storeSubType : (selectedTypeOption?.key ?? type),
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
      gtagEvent({ action: "register_place", category: "places", label: type ?? undefined });
      setStep(5);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  const areaName = areas.find((a) => a.id === areaId)?.name_ar ?? "";

  /* ═══ SUCCESS SCREEN ═══ */
  if (step === 5) {
    return (
      <div className="flex flex-col min-h-dvh bg-fog pb-[72px]" dir="rtl">
        <div className="bg-olive px-4 pt-3 pb-4 flex-shrink-0">
          <div className="font-display font-black text-base text-white mb-2.5">تسجيل مكان</div>
          <div className="h-[3px] bg-white/15 rounded-full">
            <div className="h-full w-full bg-white rounded-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5" style={{ WebkitOverflowScrolling: "touch" }}>
          {/* Success banner */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-olive flex items-center justify-center mb-5 animate-[popIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]" style={{ background: "#E8F5EE" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#1E4D2B" strokeWidth="2.5" strokeLinecap="round" className="w-8 h-8">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="font-display font-black text-[22px] text-ink mb-2">تم إرسال الطلب!</div>
            <p className="text-sm text-mist leading-relaxed max-w-[280px]">الفريق سيراجع طلبك خلال 24 ساعة وسيتواصل معك على واتساب</p>
          </div>

          {/* أربع خطوات وصفحتك جاهزة */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-[#4A7C59] bg-[#EBF3EE] border border-[#C2DBC9] rounded-full px-2.5 py-0.5">كيف يعمل</span>
            </div>
            <h3 className="font-bold text-[15px] text-ink mb-4">أربع خطوات وصفحتك جاهزة</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: "📝", n: "١", title: `سجّل ${placeWordShort}`, text: "أدخل بياناتك في أقل من دقيقتين" },
                { icon: "✅", n: "٢", title: "موافقة خلال 24 ساعة", text: "الفريق يراجع ويوافق" },
                { icon: isWorkspace ? "💻" : "🍽️", n: "٣", title: isWorkspace ? "جهّز مساحتك" : "أضف قائمتك", text: isWorkspace ? "أضف التفاصيل والخدمات" : "أصناف وأسعار من هاتفك" },
                { icon: "🚀", n: "٤", title: isWorkspace ? "العملاء يجدونك" : "الزبائن يجدونك", text: "صفحتك تظهر للآلاف يومياً" },
              ].map((s) => (
                <div key={s.n} className="bg-surface rounded-2xl border border-border p-3 relative">
                  <div className="w-10 h-10 rounded-full bg-[#EBF3EE] border border-[#C2DBC9] flex items-center justify-center text-lg mb-2 relative">
                    {s.icon}
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C9A96E] flex items-center justify-center text-[8px] font-bold text-white">{s.n}</div>
                  </div>
                  <div className="text-[12px] font-bold text-ink mb-0.5">{s.title}</div>
                  <div className="text-[10px] text-mist leading-relaxed">{s.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Plans section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-[#4A7C59] bg-[#EBF3EE] border border-[#C2DBC9] rounded-full px-2.5 py-0.5">الأسعار</span>
            </div>
            <h3 className="font-bold text-[15px] text-ink mb-1">شفاف وبدون مفاجآت</h3>
            <p className="text-[11px] text-mist mb-4">أنت الآن على الباقة المجانية — يمكنك الترقية لاحقاً</p>

            <div className="space-y-3 mb-4">
              {([
                {
                  key: "free" as const, label: "مجاني دائماً", price: "0",
                  desc: isWorkspace ? "لمساحات العمل التي تريد فقط الظهور في القائمة" : "لمن يريد فقط الظهور في القائمة",
                  features: ["صفحة أساسية", "الظهور في نتائج البحث", "رقم التواصل", "حالة مفتوح / مغلق"],
                  missing: ["قائمة الأصناف", "إحصاءات"],
                  btnClass: "border-2 border-border text-ink/60 bg-surface",
                  btnText: "باقتك الحالية",
                  active: true,
                  popular: false,
                },
                {
                  key: "basic" as const, label: "أساسي", price: "100",
                  desc: isWorkspace ? "لمساحات العمل التي تريد حضور رقمي حقيقي" : "لمن يريد قائمة حية وحضور رقمي حقيقي",
                  features: ["كل شيء في المجاني", "قائمة أصناف كاملة", "تحديث الأسعار أي وقت", 'شارة "موثّق ✓"', "تقارير الأسعار"],
                  missing: ["ظهور مميّز أولاً"],
                  btnClass: "bg-olive text-white shadow-md shadow-olive/25",
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
                  className={`bg-surface rounded-2xl border-2 p-4 transition-all relative ${
                    selectedPlan === p.key ? "border-olive shadow-lg shadow-olive/10" : p.popular ? "border-olive shadow-md shadow-olive/10" : "border-border"
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-olive text-white text-[9px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">الأكثر اختياراً</div>
                  )}
                  <div className="text-[11px] font-bold text-ink/60 uppercase tracking-wide mb-1">{p.label}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[32px] font-black text-ink leading-none">{p.price}</span>
                    <span className="text-[14px] font-bold text-ink/60">₪</span>
                    {p.price !== "0" && <span className="text-[11px] text-mist">/ شهر</span>}
                  </div>
                  <p className="text-[11px] text-ink/60 mb-3 leading-relaxed">{p.desc}</p>
                  <div className="h-px bg-border mb-3" />
                  <div className="space-y-2 mb-3">
                    {p.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-[11px] text-ink">
                        <span className="text-olive font-bold text-xs mt-px flex-shrink-0">✓</span>
                        {f}
                      </div>
                    ))}
                    {p.missing.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-[11px] text-mist">
                        <span className="text-[10px] mt-px flex-shrink-0">✕</span>
                        {f}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedPlan(selectedPlan === p.key ? null : p.key)}
                    className={`w-full py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                      p.active ? "border-2 border-[#C2DBC9] text-olive bg-[#EBF3EE]" : p.btnClass
                    }`}
                  >
                    {p.active ? "باقتك الحالية" : selectedPlan === p.key ? "تم الاختيار ✓" : p.btnText}
                  </button>

                  {!p.active && selectedPlan === p.key && (
                    <div className="mt-3 pt-3 border-t border-[#C2DBC9] animate-[slideIn_0.3s_cubic-bezier(0.4,0,0.2,1)] text-right">
                      <div className="bg-fog rounded-xl p-3 mb-2">
                        <div className="text-[10px] text-mist font-semibold mb-1.5">١. حوّل المبلغ عبر بنك فلسطين</div>
                        <div className="bg-surface border border-border rounded-xl px-3 py-2.5 flex items-center justify-between">
                          <span className="text-[15px] font-bold text-ink tracking-wider" dir="ltr">0567359920</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText("0567359920"); }}
                            className="text-[10px] text-olive font-bold bg-[#EBF3EE] rounded-lg px-2.5 py-1"
                          >
                            نسخ
                          </button>
                        </div>
                      </div>
                      <div className="bg-fog rounded-xl p-3">
                        <div className="text-[10px] text-mist font-semibold mb-1.5">٢. أرسل إشعار التحويل للتأكيد</div>
                        <a
                          href={`https://wa.me/972567786946?text=${encodeURIComponent(`مرحباً، حوّلت ${p.price} شيكل لباقة ${p.label} — الاسم: ${name}`)}`}
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
            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full text-center" style={{ minWidth: 320 }}>
                <thead>
                  <tr className="bg-fog">
                    <th className="text-right text-[10px] font-semibold text-mist px-3 py-2.5 border-b border-border">الميزة</th>
                    <th className={`text-[10px] font-semibold px-2 py-2.5 border-b border-border border-r border-border ${selectedPlan === "free" ? "text-olive bg-[#EBF3EE]" : "text-mist"}`}>مجاني</th>
                    <th className={`text-[10px] font-semibold px-2 py-2.5 border-b border-border border-r border-border ${selectedPlan === "basic" ? "text-olive bg-[#EBF3EE]" : "text-mist"}`}>أساسي</th>
                    <th className={`text-[10px] font-semibold px-2 py-2.5 border-b border-border border-r border-border ${selectedPlan === "premium" ? "text-olive bg-[#EBF3EE]" : "text-mist bg-[#F2FAF5]"}`}>مميّز</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_FEATURES.map((f, i) => (
                    <tr key={f.name} className={i % 2 === 0 ? "bg-surface" : "bg-fog"}>
                      <td className="text-right text-[11px] text-ink px-3 py-2 border-b border-border/50">{f.name}</td>
                      <td className={`px-2 py-2 border-b border-border/50 border-r border-border/50 ${selectedPlan === "free" ? "bg-[#EBF3EE]/40" : ""}`}>{f.free ? <CheckIcon /> : <XIcon />}</td>
                      <td className={`px-2 py-2 border-b border-border/50 border-r border-border/50 ${selectedPlan === "basic" ? "bg-[#EBF3EE]/40" : ""}`}>{f.basic ? <CheckIcon /> : <XIcon />}</td>
                      <td className={`px-2 py-2 border-b border-border/50 border-r border-border/50 ${selectedPlan === "premium" ? "bg-[#EBF3EE]/40" : "bg-[#FAFFF7]"}`}>{f.premium ? <CheckIcon /> : <XIcon />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-[#4A7C59] bg-[#EBF3EE] border border-[#C2DBC9] rounded-full px-2.5 py-0.5">أسئلة شائعة</span>
            </div>
            <h3 className="font-bold text-[15px] text-ink mb-3">أجوبة سريعة</h3>
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
                  className={`bg-surface rounded-2xl border transition-colors ${openFaq === i ? "border-[#C2DBC9]" : "border-border"}`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-3.5 py-3 text-right"
                  >
                    <span className="text-[12px] font-bold text-ink">{item.q}</span>
                    <svg
                      viewBox="0 0 12 12"
                      className={`w-3 h-3 flex-shrink-0 mr-2 transition-transform text-mist ${openFaq === i ? "rotate-180 text-olive" : ""}`}
                      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
                    >
                      <path d="M2 4l4 4 4-4" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-3.5 pb-3 pt-0 border-t border-border">
                      <p className="text-[11px] text-ink/70 leading-relaxed pt-2.5">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push("/places")}
            className="w-full bg-olive text-white font-bold text-[15px] rounded-[14px] py-3.5 flex items-center justify-center gap-2 shadow-[0_3px_12px_rgba(30,77,43,0.25)] mb-4 active:scale-[0.98] transition-transform"
          >
            العودة للرئيسية
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>

        <BottomNav />

        <style jsx>{`
          @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-16px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

  /* ═══ MAIN WIZARD UI ═══ */
  return (
    <div className="flex flex-col min-h-dvh bg-fog pb-[72px]" dir="rtl">
      {/* ── HEADER ── */}
      <div className="bg-olive px-4 pt-3 pb-4 flex-shrink-0 relative overflow-hidden">
        <div className="absolute w-[150px] h-[150px] rounded-full bg-white/[0.04] -top-[50px] -left-[30px]" />

        <div className="flex items-center justify-between mb-3 relative z-[1]">
          <div className="font-display font-black text-base text-white">تسجيل مكان</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-white/50">
              خطوة {toArabicNumerals(stepIndex + 1)} من {toArabicNumerals(totalSteps)}
            </span>
            {step > minStep && (
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
        <div key={step} className="px-4 pt-4 pb-4 animate-[slideIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
          {/* Step question */}
          <div className="font-display font-black text-xl text-ink mb-1 leading-tight text-right">
            {STEP_TITLES[step]}
          </div>
          <div className="text-[13px] text-mist mb-5 leading-relaxed text-right">
            {STEP_SUBS[step]}
          </div>

          {/* Step body */}
          {step === 1 && (
            <>
              {sectionParam === "food" ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {(TYPE_OPTIONS.filter((t) => t.section === "food") as typeof TYPE_OPTIONS[number][]).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setType(t.key)}
                      className={`rounded-2xl border-2 p-4 transition-all
                        ${t.wide ? "col-span-2 flex items-center gap-3.5 text-right" : "text-center"}
                        ${type === t.key ? "border-olive bg-[#EBF3EE]" : "border-border bg-surface hover:border-olive/40"}`}
                    >
                      <div
                        className={`w-[52px] h-[52px] rounded-[14px] flex items-center justify-center flex-shrink-0
                          ${t.wide ? "" : "mx-auto mb-2.5"}
                          ${"smallIcon" in t && t.smallIcon ? "text-lg" : "text-2xl"}
                          ${type === t.key ? "bg-olive text-white" : "bg-[#EBF3EE]"}`}
                      >
                        {t.icon}
                      </div>
                      <div className={t.wide ? "flex-1" : ""}>
                        <div className={`font-bold text-[13px] ${type === t.key ? "text-olive" : "text-ink"}`}>
                          {t.label}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${type === t.key ? "text-olive/80" : "text-mist"}`}>
                          {t.sub}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${t.wide ? "mr-auto" : "mx-auto mt-2"}
                          ${type === t.key ? "bg-olive border-olive" : "border-border"}`}
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
              ) : preselectedType === "store" ? (
                <>
                  <div className="space-y-2">
                    {STORE_CATEGORIES.map((cat) => (
                      <div key={cat.label}>
                        <div className="text-[11px] font-bold text-ink flex items-center gap-1.5 mb-1.5">
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
                                  ? "bg-olive text-white border-olive"
                                  : "bg-surface text-ink border-border hover:border-olive/40"
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
                  <div className="grid grid-cols-2 gap-2.5">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => { setType(t.key); if (t.key !== "store") setStoreSubType(null); }}
                        className={`rounded-2xl border-2 p-4 transition-all
                          ${t.wide ? "col-span-2 flex items-center gap-3.5 text-right" : "text-center"}
                          ${type === t.key ? "border-olive bg-[#EBF3EE]" : "border-border bg-surface hover:border-olive/40"}`}
                      >
                        <div
                          className={`w-[52px] h-[52px] rounded-[14px] flex items-center justify-center flex-shrink-0
                            ${t.wide ? "" : "mx-auto mb-2.5"}
                            ${"smallIcon" in t && t.smallIcon ? "text-lg" : "text-2xl"}
                            ${type === t.key ? "bg-olive text-white" : "bg-[#EBF3EE]"}`}
                        >
                          {t.icon}
                        </div>
                        <div className={t.wide ? "flex-1" : ""}>
                          <div className={`font-bold text-[13px] ${type === t.key ? "text-olive" : "text-ink"}`}>
                            {t.label}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${type === t.key ? "text-olive/80" : "text-mist"}`}>
                            {t.sub}
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                            ${t.wide ? "mr-auto" : "mx-auto mt-2"}
                            ${type === t.key ? "bg-olive border-olive" : "border-border"}`}
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

                  {type === "store" && (
                    <div className="mt-5 animate-[slideIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
                      <h3 className="font-bold text-[14px] text-ink mb-1">نوع المتجر</h3>
                      <p className="text-[11px] text-mist mb-3">اختر التصنيف الأقرب لنشاطك</p>
                      <div className="space-y-2">
                        {STORE_CATEGORIES.map((cat) => (
                          <div key={cat.label}>
                            <div className="text-[11px] font-bold text-ink flex items-center gap-1.5 mb-1.5">
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
                                      ? "bg-olive text-white border-olive"
                                      : "bg-surface text-ink border-border hover:border-olive/40"
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
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Avatar upload */}
              <div className="flex flex-col items-center mb-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-[80px] h-[80px] rounded-full border-2 border-dashed border-[#C2DBC9] bg-[#EBF3EE] flex items-center justify-center overflow-hidden hover:border-olive transition-colors"
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
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-olive border-t-transparent" />
                    </div>
                  )}
                </button>
                <span className="text-[10px] text-mist mt-1.5">
                  صورة {placeWord} <span className="text-[#E05C35] text-[11px]">*</span>
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-mist mb-1.5 flex items-center gap-1 pr-0.5">
                  اسم {type === "cafe" ? "الكافيه" : type === "restaurant" ? "المطعم" : type === "both" ? "المطعم" : placeWord} <span className="text-[#E05C35] text-[11px]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isWorkspace ? "مثال: مساحة عمل النجاح" : type === "cafe" ? "مثال: كافيه الصباح" : type === "both" ? "مثال: مطعم وكافيه الديوان" : isStore ? "مثال: سوبرماركت الأمل" : "مثال: مطعم أبو مازن"}
                  className="w-full py-3 px-3.5 text-sm font-body bg-surface rounded-xl border-[1.5px] border-border outline-none text-right text-ink placeholder:text-mist placeholder:text-[13px] focus:border-olive transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-mist mb-1.5 flex items-center gap-1 pr-0.5">
                  المنطقة <span className="text-[#E05C35] text-[11px]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="w-full border-[1.5px] border-border rounded-xl px-3.5 h-[44px] text-sm font-body text-ink bg-surface outline-none focus:border-olive"
                  >
                    <option value="">اختر المنطقة...</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name_ar}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-mist mb-1.5 block pr-0.5">العنوان التفصيلي</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isWorkspace ? "مثال: شارع الوحدة، الطابق الثاني..." : "مثال: شارع النصر، بجانب مسجد العمر..."}
                  className="w-full border-[1.5px] border-border bg-surface rounded-xl px-3.5 py-3 text-sm text-ink outline-none resize-none h-20 placeholder:text-mist focus:border-olive transition-colors"
                />
                <p className="text-[10px] text-mist mt-1">اختياري — يساعد الزوار على إيجادك</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-mist mb-1.5 flex items-center gap-1 pr-0.5">
                  رقم الهاتف <span className="text-[#E05C35] text-[11px]">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                  placeholder="059 XXX XXXX"
                  className="w-full py-3 px-3.5 text-sm font-body bg-surface rounded-xl border-[1.5px] border-border outline-none text-ink placeholder:text-mist focus:border-olive transition-colors"
                />
                {phone.trim() && !isValidPhone(phone) && (
                  <p className="text-[10px] text-[#E05C35] mt-1">الرقم يجب أن يبدأ بـ 05 ويتكون من 10 أرقام</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-mist mb-1.5 block pr-0.5">رقم واتساب</label>
                <div className="flex items-stretch rounded-xl border-[1.5px] border-border focus-within:border-olive outline-none">
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="059 XXX XXXX"
                    className="flex-1 px-3.5 py-3 text-sm text-ink outline-none border-none placeholder:text-mist bg-transparent rounded-r-xl"
                  />
                  <PrefixPicker value={waPrefix} onChange={setWaPrefix} />
                </div>
                <p className="text-[10px] text-mist mt-1">اختياري — سيُرسل لك رابط لوحة التحكم هنا</p>
              </div>

              {/* Info box */}
              <div className="bg-[#EBF3EE] border border-olive/20 rounded-xl p-3.5 flex gap-2.5">
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
                  <div key={s.n} className="flex items-start gap-3 bg-surface border border-border rounded-xl p-3.5">
                    <div className="w-[26px] h-[26px] rounded-full bg-olive flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                      {s.n}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-ink">{s.title}</div>
                      <div className="text-[11px] text-mist">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <>
              <div className="bg-surface border-[1.5px] border-border rounded-2xl overflow-hidden mb-4">
                <div className="bg-olive p-4 flex items-center gap-3">
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
                    <div key={r.key} className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                      <span className="text-[11px] text-mist font-semibold">{r.key}</span>
                      <span className="text-xs text-ink font-bold">{r.val || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <div className="bg-[#EBF3EE] border border-olive/20 rounded-xl p-3.5 flex gap-2.5">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0 mt-0.5" fill="none" stroke="#4A7C59" strokeWidth={2} strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-[11px] text-[#3A6347] leading-relaxed">
                  بإرسال الطلب توافق على عرض بياناتك للزوار على منصة GazaPriceWatch مجاناً
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex-shrink-0 px-4 py-3 bg-fog border-t border-border/50 flex items-center gap-2.5">
        {step > minStep && (
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
          onClick={handleNext}
          disabled={!canNext() || (isLastStep && submitting)}
          className={cn(
            "flex-1 rounded-[14px] py-3 font-display font-black text-sm text-white flex items-center justify-center gap-2 transition-all",
            canNext() && !(isLastStep && submitting)
              ? "bg-olive shadow-[0_3px_12px_rgba(30,77,43,0.25)] hover:bg-[#2D6B3F] active:scale-[0.98]"
              : "bg-olive/40 cursor-not-allowed shadow-none"
          )}
        >
          {isLastStep && submitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>{isLastStep ? "إرسال الطلب" : "التالي"}</span>
              {!isLastStep && (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
                  <path d="M9 18l-6-6 6-6" />
                </svg>
              )}
            </>
          )}
        </button>
      </div>

      <BottomNav />

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
