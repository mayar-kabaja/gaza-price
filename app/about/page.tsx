import Link from "next/link";

export const metadata = {
  title: "من نحن — غزة بريس",
  description: "تعرّف على منصة غزة بريس وكيف تساهم في توفير شفافية الأسعار في غزة.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-fog" dir="rtl">
      <div className="max-w-3xl mx-auto px-5 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.svg" alt="" className="w-10 h-10 rounded-full" />
            <span className="font-display font-extrabold text-2xl text-ink">
              غزة<span className="text-olive">بريس</span>
            </span>
          </Link>
          <h1 className="font-display font-extrabold text-3xl text-ink mb-3">من نحن</h1>
          <p className="text-mist text-base max-w-lg mx-auto leading-relaxed">
            منصة مجتمعية لمتابعة أسعار السلع الأساسية في غزة — شفافية حقيقية، من الناس وللناس.
          </p>
        </div>

        {/* Content */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-8">
          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-3">رسالتنا</h2>
            <p className="text-ink/80 text-[15px] leading-relaxed">
              غزة بريس هي منصة مجتمعية تهدف إلى تمكين المواطنين في غزة من متابعة أسعار السلع الأساسية بشفافية. نؤمن بأن المعلومة الدقيقة حق للجميع، وأن الشفافية في الأسعار تساهم في حماية المستهلك وتعزيز العدالة الاقتصادية.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-3">كيف تعمل المنصة؟</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--olive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div>
                  <h3 className="font-display font-bold text-[14px] text-ink">أبلغ عن سعر</h3>
                  <p className="text-[13px] text-mist leading-relaxed">يقوم المستخدمون بالإبلاغ عن أسعار المنتجات التي يشترونها من المحلات في مناطقهم.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--olive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
                  <h3 className="font-display font-bold text-[14px] text-ink">تأكيد المجتمع</h3>
                  <p className="text-[13px] text-mist leading-relaxed">يقوم باقي المستخدمين بتأكيد أو الإبلاغ عن الأسعار المنشورة لضمان دقتها.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-olive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--olive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </div>
                <div>
                  <h3 className="font-display font-bold text-[14px] text-ink">شفافية للجميع</h3>
                  <p className="text-[13px] text-mist leading-relaxed">يستطيع أي شخص الاطلاع على الأسعار الحالية ومقارنتها بين المحلات والمناطق المختلفة.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-3">للمحلات وأصحاب الأعمال</h2>
            <p className="text-ink/80 text-[15px] leading-relaxed mb-4">
              نوفر للمحلات والمطاعم إمكانية تسجيل أماكنهم على المنصة مجاناً، مما يساعدهم في الوصول إلى عملاء جدد وعرض منتجاتهم وخدماتهم. كما نوفر لوحة تحكم لإدارة الطلبات والمنيو.
            </p>
            <Link
              href="/places/register"
              className="inline-flex items-center gap-2 bg-olive text-white px-5 py-2.5 rounded-xl font-display font-bold text-[13px] hover:bg-olive-deep transition-colors"
            >
              سجّل محلك مجاناً
            </Link>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-3">تواصل معنا</h2>
            <p className="text-ink/80 text-[15px] leading-relaxed">
              لديك اقتراح أو ملاحظة؟ نحب نسمع منك! تواصل معنا عبر{" "}
              <a href="https://wa.me/972567786946" target="_blank" rel="noopener noreferrer" className="text-olive font-bold hover:underline">واتساب</a>
              {" "}أو عبر صفحتنا على{" "}
              <a href="https://www.instagram.com/gaza.price.watch" target="_blank" rel="noopener noreferrer" className="text-olive font-bold hover:underline">إنستغرام</a>.
            </p>
          </section>
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
