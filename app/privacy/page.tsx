import Link from "next/link";

export const metadata = {
  title: "سياسة الخصوصية — غزة بريس",
  description: "سياسة الخصوصية لمنصة غزة بريس.",
};

export default function PrivacyPage() {
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
          <h1 className="font-display font-extrabold text-3xl text-ink mb-3">سياسة الخصوصية</h1>
          <p className="text-mist text-sm">آخر تحديث: مايو 2026</p>
        </div>

        {/* Content */}
        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-6">
          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-2">مقدمة</h2>
            <p className="text-ink/80 text-[15px] leading-relaxed">
              نحن في غزة بريس نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيف نجمع ونستخدم ونحمي المعلومات التي تقدمها عند استخدام منصتنا.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-2">البيانات التي نجمعها</h2>
            <ul className="space-y-2 text-ink/80 text-[15px] leading-relaxed">
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span><strong>معلومات الحساب:</strong> رقم الهاتف والاسم المستعار عند التسجيل.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span><strong>بلاغات الأسعار:</strong> الأسعار التي تبلّغ عنها مع اسم المتجر والمنطقة.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span><strong>التصويتات:</strong> تأكيداتك أو بلاغاتك على أسعار الآخرين.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span><strong>الموقع الجغرافي:</strong> المنطقة التي تختارها لعرض الأسعار القريبة منك.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-2">كيف نستخدم بياناتك</h2>
            <ul className="space-y-2 text-ink/80 text-[15px] leading-relaxed">
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span>عرض الأسعار المحدّثة في منطقتك.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span>تحسين دقة البيانات من خلال نظام التصويت المجتمعي.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span>تطوير المنصة وتحسين تجربة المستخدم.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span>التواصل معك بشأن تحديثات مهمة عند الحاجة.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-2">حماية البيانات</h2>
            <p className="text-ink/80 text-[15px] leading-relaxed">
              نتخذ إجراءات أمنية مناسبة لحماية بياناتك من الوصول غير المصرح به أو التغيير أو الحذف. لا نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات التي يتطلبها القانون.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-2">بيانات المحلات</h2>
            <p className="text-ink/80 text-[15px] leading-relaxed">
              عند تسجيل محل على المنصة، يتم عرض اسم المحل وعنوانه ورقم هاتفه بشكل عام لمساعدة المستخدمين في الوصول إليك. يمكنك تعديل أو حذف بيانات محلك في أي وقت من لوحة التحكم.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-2">حقوقك</h2>
            <ul className="space-y-2 text-ink/80 text-[15px] leading-relaxed">
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span>يمكنك طلب حذف حسابك وبياناتك في أي وقت.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span>يمكنك تعديل معلوماتك الشخصية من إعدادات الحساب.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-olive font-bold">-</span>
                <span>يمكنك التواصل معنا لأي استفسار حول بياناتك.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-ink mb-2">تواصل معنا</h2>
            <p className="text-ink/80 text-[15px] leading-relaxed">
              لأي أسئلة حول سياسة الخصوصية، تواصل معنا عبر{" "}
              <a href="https://wa.me/972567786946" target="_blank" rel="noopener noreferrer" className="text-olive font-bold hover:underline">واتساب</a>
              {" "}أو عبر صفحة{" "}
              <Link href="/contact" className="text-olive font-bold hover:underline">تواصل معنا</Link>.
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
