"use client";

interface DesktopAddChooserProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onSuggest: () => void;
  onListing: () => void;
}

const OPTIONS = [
  {
    key: "price",
    title: "أضف سعر منتج",
    desc: "عندك سعر من محل؟ ساعد الناس يعرفوا الأسعار الحقيقية",
    exampleText: "كيلو أرز في محل أبو أحمد = 12₪",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="#1E4D2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
    iconBg: "bg-[#E8F5EE]",
    stripColor: "border-r-[#2D6B3F]",
    arrowBg: "bg-[#E8F5EE]",
    arrowStroke: "#1E4D2B",
  },
  {
    key: "product",
    title: "اقترح منتج جديد",
    desc: "منتج مش موجود في القائمة؟ اقترحه وأضف أول سعر له",
    exampleText: "حليب بودرة نيدو 900غ",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    iconBg: "bg-[#FFFBEB]",
    stripColor: "border-r-[#F59E0B]",
    arrowBg: "bg-[#FFFBEB]",
    arrowStroke: "#F59E0B",
  },
  {
    key: "listing",
    title: "أضف إعلان في السوق",
    desc: "عندك شي للبيع؟ انشر إعلان مجاني في السوق المحلي",
    exampleText: "جوال · أثاث · ملابس",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
    iconBg: "bg-[#EFF6FF]",
    stripColor: "border-r-[#3B82F6]",
    arrowBg: "bg-[#EFF6FF]",
    arrowStroke: "#3B82F6",
  },
];

export function DesktopAddChooser({ open, onClose, onSubmit, onSuggest, onListing }: DesktopAddChooserProps) {
  if (!open) return null;

  function handleClick(key: string) {
    onClose();
    if (key === "price") onSubmit();
    else if (key === "product") onSuggest();
    else if (key === "listing") onListing();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display font-black text-lg text-ink">إضافة</h2>
            <p className="text-xs text-mist mt-0.5">شو بدك تضيف؟</p>
          </div>
          <button onClick={onClose} className="text-mist hover:text-ink p-1 text-xl leading-none">×</button>
        </div>

        {/* Options */}
        <div className="px-5 pb-4 space-y-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleClick(opt.key)}
              className="w-full text-right bg-white border border-[#E5E7EB] rounded-[20px] p-[18px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-150 hover:-translate-x-[3px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-[52px] h-[52px] ${opt.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-black text-[15px] text-ink mb-1">{opt.title}</div>
                  <p className="text-xs text-[#6B7280] leading-relaxed mb-1.5">{opt.desc}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-[#9CA3AF]">مثال:</span>
                    <span className="text-[10px] text-[#9CA3AF] bg-[#F8F9FA] border border-[#E5E7EB] px-2 py-0.5 rounded-full">{opt.exampleText}</span>
                  </div>
                </div>
                <div className={`w-7 h-7 ${opt.arrowBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={opt.arrowStroke} strokeWidth="2.5" className="w-[13px] h-[13px]" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Tip box */}
        <div className="mx-5 mb-5 bg-[#E8F5EE] border border-[#1E4D2B]/15 rounded-2xl p-3.5 flex items-start gap-2.5">
          <div className="w-8 h-8 bg-[#1E4D2B] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>
            </svg>
          </div>
          <div>
            <div className="font-display text-xs font-extrabold text-[#1E4D2B] mb-0.5">كل مساهمة تفرق</div>
            <div className="text-[11px] text-[#2D6B3F] leading-relaxed">كل سعر تضيفه يساعد عائلة في غزة تتخذ قرار أفضل. شكراً لك.</div>
          </div>
        </div>
      </div>
    </>
  );
}
