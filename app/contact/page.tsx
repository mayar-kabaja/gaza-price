import Link from "next/link";

export const metadata = {
  title: "تواصل معنا — غزة بريس",
  description: "تواصل مع فريق غزة بريس عبر واتساب أو إنستغرام.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-fog" dir="rtl">
      <div className="max-w-2xl mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.svg" alt="" className="w-10 h-10 rounded-full" />
            <span className="font-display font-extrabold text-2xl text-ink">
              غزة<span className="text-olive">بريس</span>
            </span>
          </Link>
          <h1 className="font-display font-extrabold text-3xl text-ink mb-3">تواصل معنا</h1>
          <p className="text-mist text-base max-w-md mx-auto leading-relaxed">
            نحب نسمع منك! سواء كان لديك اقتراح، ملاحظة، أو تريد التعاون معنا.
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* WhatsApp */}
          <a
            href="https://wa.me/972567786946"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-2xl border border-border p-6 flex flex-col items-center text-center hover:border-olive/30 hover:shadow-sm transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
            </div>
            <h3 className="font-display font-bold text-base text-ink mb-1">واتساب</h3>
            <p className="text-[13px] text-mist mb-3">راسلنا مباشرة على واتساب</p>
            <span className="text-olive font-display font-bold text-sm" dir="ltr">+972 56-778-6946</span>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/gaza.price.watch"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-2xl border border-border p-6 flex flex-col items-center text-center hover:border-olive/30 hover:shadow-sm transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E4405F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </div>
            <h3 className="font-display font-bold text-base text-ink mb-1">إنستغرام</h3>
            <p className="text-[13px] text-mist mb-3">تابعنا وراسلنا على إنستغرام</p>
            <span className="text-olive font-display font-bold text-sm">@gaza.price.watch</span>
          </a>
        </div>

        {/* Additional info */}
        <div className="bg-surface rounded-2xl border border-border p-6 mt-4">
          <h2 className="font-display font-bold text-lg text-ink mb-4">كيف يمكننا مساعدتك؟</h2>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--olive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p className="text-[14px] text-ink/80">الإبلاغ عن مشكلة أو خطأ في المنصة</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--olive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p className="text-[14px] text-ink/80">اقتراح منتج أو فئة جديدة</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--olive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p className="text-[14px] text-ink/80">تسجيل محلك أو مطعمك على المنصة</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--olive)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <p className="text-[14px] text-ink/80">التعاون والشراكات مع منظمات أو جهات</p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link href="/" className="text-olive font-display font-bold text-sm hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
