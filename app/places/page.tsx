'use client';

import { useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';

type Section = 'food' | 'store';
type Sheet = 'restaurant' | 'store' | 'register' | null;

export default function PlacesPage() {
  const [section, setSection] = useState<Section>('food');
  const [openSheet, setOpenSheet] = useState<Sheet>(null);

  return (
    <div className="min-h-screen bg-fog" dir="rtl">
      <AppHeader />

      {/* Section Toggle */}
      <div className="sticky top-16 z-30 bg-white px-4 py-3 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-0 bg-fog rounded-2xl p-1">
            <button
              onClick={() => setSection('food')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                section === 'food'
                  ? 'bg-olive text-white shadow-lg'
                  : 'bg-transparent text-ink hover:bg-fog'
              }`}
            >
              🍽️ مطاعم وكافيه
            </button>
            <button
              onClick={() => setSection('store')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                section === 'store'
                  ? 'bg-olive text-white shadow-lg'
                  : 'bg-transparent text-ink hover:bg-fog'
              }`}
            >
              🏪 متاجر
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
        {/* Area Pill */}
        <div className="flex items-center justify-between bg-white rounded-3xl px-3 py-2.5 mb-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-olive animate-pulse"></div>
            <div>
              <div className="text-xs text-mist font-semibold">المنطقة</div>
              <div className="font-display font-bold text-xs text-ink">كل المناطق</div>
            </div>
          </div>
          <div className="text-xs font-bold text-olive bg-olive-pale px-2.5 py-1 rounded-full">
            {section === 'food' ? '24' : '61'} محل
          </div>
        </div>

        {/* ══ FOOD SECTION ══ */}
        {section === 'food' && (
          <div className="space-y-4">
            <SectionLabel emoji="🍽️" text="مطاعم وكافيه" count="24 محل" />

            {/* Featured Card */}
            <button
              onClick={() => setOpenSheet('restaurant')}
              className="w-full bg-gradient-to-br from-olive via-olive-deep to-olive rounded-3xl overflow-hidden cursor-pointer transform hover:scale-[1.01] transition-transform p-4 relative min-h-48 flex flex-col justify-end group shadow-md"
            >
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute top-4 right-4 text-3xl drop-shadow-lg">🍛</div>
              <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/15 border border-white/25 rounded-full px-2 py-1 text-white text-xs font-bold z-10">
                ✦ موثّق
              </div>
              <div className="relative z-10">
                <h3 className="font-display font-black text-lg text-white mb-1 drop-shadow">
                  مطعم أبو خالد
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white/80 font-semibold">📍 خان يونس</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    مفتوح
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {['3₪ فول', '8₪ شاكشوكة', '25₪ أرز'].map((p) => (
                    <div
                      key={p}
                      className="bg-white/12 border border-white/20 rounded-lg px-2 py-1 text-xs text-white/90"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </button>

            {/* Grid Row 2 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Cafe Card */}
              <button className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-3.5 flex flex-col justify-between min-h-40 text-white shadow-sm hover:shadow-md transition-shadow text-left">
                <div className="text-2xl drop-shadow">☕</div>
                <div>
                  <h4 className="font-display font-bold text-sm mb-0.5 drop-shadow">كافيه النخيل</h4>
                  <p className="text-xs text-white/75 font-semibold mb-1">📍 وسط القطاع</p>
                  <p className="font-display font-black text-base drop-shadow">
                    4 <span className="text-xs font-medium opacity-80">₪</span>
                  </p>
                  <p className="text-xs text-white/65 font-medium mt-0.5">قهوة تركية</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                    <span className="text-xs font-bold text-emerald-300">مفتوح</span>
                  </div>
                </div>
              </button>

              {/* Stat Card */}
              <div className="bg-ink rounded-3xl p-4 flex flex-col items-center justify-center min-h-40 text-center shadow-sm">
                <div className="font-display font-black text-4xl bg-gradient-to-r from-olive-mid to-olive bg-clip-text text-transparent mb-1">
                  24
                </div>
                <p className="text-xs text-white/50 font-semibold">مطعم وكافيه</p>
                <p className="text-xs text-white/30 mt-0.5">في كل المناطق</p>
                <div className="text-lg mt-3">🍽️☕🧃</div>
              </div>
            </div>

            {/* Grid Row 3 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Standard Card */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col min-h-32">
                <div className="flex-1 px-3 pt-3 pb-2.5">
                  <span className="block text-xl mb-1.5">🥙</span>
                  <h4 className="font-display font-bold text-xs text-ink mb-0.5 line-clamp-2">
                    مطعم الشام
                  </h4>
                  <p className="text-xs text-mist font-semibold mb-1.5">📍 رفح</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-olive"></span>
                    <span className="text-xs font-bold text-olive">مفتوح</span>
                  </div>
                </div>
                <div className="border-t border-border px-3 py-2 bg-fog flex items-center justify-between">
                  <span className="text-xs font-bold text-olive-deep bg-olive-pale px-2 py-0.5 rounded-full">
                    مطعم
                  </span>
                  <span className="text-xs text-mist font-semibold">15 صنف</span>
                </div>
              </div>

              {/* Juice Card */}
              <button className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl p-3.5 flex flex-col justify-between min-h-32 text-white cursor-pointer hover:shadow-md transition-shadow shadow-sm text-left">
                <span className="text-xl">🧃</span>
                <div>
                  <h4 className="font-display font-bold text-sm mb-0.5">عصير الصحة</h4>
                  <p className="text-xs text-white/75 font-semibold">📍 شمال غزة</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                    <span className="text-xs font-bold text-emerald-300">مفتوح</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Promo Card */}
            <button
              onClick={() => setOpenSheet('register')}
              className="w-full bg-gradient-to-r from-ink via-slate to-slate rounded-3xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-lg transition-shadow shadow-md"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-olive-deep to-olive rounded-2xl flex items-center justify-center text-base flex-shrink-0">
                🍽️
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-display font-bold text-sm text-white mb-0.5">
                  صاحب مطعم؟ سجّل مجاناً
                </h4>
                <p className="text-xs text-white/45 leading-relaxed">
                  أضف قائمتك وتواصل مع زبائنك مباشرةً
                </p>
              </div>
              <div className="w-7 h-7 bg-white/8 border border-white/12 rounded-lg flex items-center justify-center text-white/40 text-sm flex-shrink-0">
                ‹
              </div>
            </button>
          </div>
        )}

        {/* ══ STORE SECTION ══ */}
        {section === 'store' && (
          <div className="space-y-4">
            <SectionLabel emoji="🏪" text="متاجر" count="61 متجر" />

            {/* Featured Card */}
            <button
              onClick={() => setOpenSheet('store')}
              className="w-full bg-gradient-to-br from-olive via-olive-deep to-olive rounded-3xl overflow-hidden cursor-pointer transform hover:scale-[1.01] transition-transform p-4 relative min-h-48 flex flex-col justify-end group shadow-md"
            >
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute top-4 right-4 text-3xl drop-shadow-lg">👗</div>
              <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/15 border border-white/25 rounded-full px-2 py-1 text-white text-xs font-bold z-10">
                ✦ موثّق
              </div>
              <div className="relative z-10">
                <h3 className="font-display font-black text-lg text-white mb-1 drop-shadow">
                  متجر الأناقة
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white/80 font-semibold">📍 خان يونس</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    مفتوح
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {['45₪ جينز', '25₪ قميص', '60₪ فستان'].map((p) => (
                    <div
                      key={p}
                      className="bg-white/12 border border-white/20 rounded-lg px-2 py-1 text-xs text-white/90"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </button>

            {/* Grid Row 2 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Electronics Card */}
              <button className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-3.5 flex flex-col justify-between min-h-40 text-white shadow-sm hover:shadow-md transition-shadow text-left">
                <div className="text-2xl drop-shadow">📱</div>
                <div>
                  <h4 className="font-display font-bold text-sm mb-0.5 drop-shadow">محل أبو سامي</h4>
                  <p className="text-xs text-white/75 font-semibold mb-1">📍 رفح</p>
                  <p className="font-display font-black text-base drop-shadow">
                    15 <span className="text-xs font-medium opacity-80">₪</span>
                  </p>
                  <p className="text-xs text-white/65 font-medium mt-0.5">شاحن هاتف</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                    <span className="text-xs font-bold text-emerald-300">مفتوح</span>
                  </div>
                </div>
              </button>

              {/* Stat Card */}
              <div className="bg-ink rounded-3xl p-4 flex flex-col items-center justify-center min-h-40 text-center shadow-sm">
                <div className="font-display font-black text-4xl bg-gradient-to-r from-olive-mid to-olive bg-clip-text text-transparent mb-1">
                  61
                </div>
                <p className="text-xs text-white/50 font-semibold">متجر مسجّل</p>
                <p className="text-xs text-white/30 mt-0.5">ملابس · إلكترونيات · وغيرها</p>
                <div className="text-lg mt-3">👗📱✂️</div>
              </div>
            </div>

            {/* Grid Row 3 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Barber Card */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col min-h-32">
                <div className="flex-1 px-3 pt-3 pb-2.5">
                  <span className="block text-xl mb-1.5">✂️</span>
                  <h4 className="font-display font-bold text-xs text-ink mb-0.5">صالون الأمل</h4>
                  <p className="text-xs text-mist font-semibold mb-1.5">📍 شمال غزة</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-mist"></span>
                    <span className="text-xs font-bold text-mist">مغلق</span>
                  </div>
                </div>
                <div className="border-t border-border px-3 py-2 bg-fog flex items-center justify-between">
                  <span className="text-xs font-bold text-olive-deep bg-olive-pale px-2 py-0.5 rounded-full">
                    حلاقة
                  </span>
                  <span className="text-xs text-mist font-semibold">3 أسعار</span>
                </div>
              </div>

              {/* Building Card */}
              <button className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-3xl p-3.5 flex flex-col justify-between min-h-32 text-white cursor-pointer hover:shadow-md transition-shadow shadow-sm text-left">
                <span className="text-xl">🏗️</span>
                <div>
                  <h4 className="font-display font-bold text-sm mb-0.5">مواد بناء أبو علي</h4>
                  <p className="text-xs text-white/75 font-semibold">📍 خان يونس</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                    <span className="text-xs font-bold text-emerald-300">مفتوح</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Promo Card */}
            <button
              onClick={() => setOpenSheet('register')}
              className="w-full bg-gradient-to-r from-ink via-slate to-slate rounded-3xl p-4 flex items-center gap-3 cursor-pointer hover:shadow-lg transition-shadow shadow-md"
            >
              <div className="w-11 h-11 bg-gradient-to-br from-olive-deep to-olive rounded-2xl flex items-center justify-center text-base flex-shrink-0">
                🏪
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-display font-bold text-sm text-white mb-0.5">
                  صاحب متجر؟ سجّل مجاناً
                </h4>
                <p className="text-xs text-white/45 leading-relaxed">أضف متجرك وتواصل مع زبائنك</p>
              </div>
              <div className="w-7 h-7 bg-white/8 border border-white/12 rounded-lg flex items-center justify-center text-white/40 text-sm flex-shrink-0">
                ‹
              </div>
            </button>
          </div>
        )}
      </div>

      {/* DETAIL SHEETS */}
      {openSheet && (
        <DetailSheet sheet={openSheet} onClose={() => setOpenSheet(null)} />
      )}

      <BottomNav />
    </div>
  );
}

function SectionLabel({ emoji, text, count }: { emoji: string; text: string; count: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border"></div>
      <div className="font-display font-bold text-xs text-slate whitespace-nowrap flex items-center gap-1.5">
        <span>{emoji}</span>
        {text} · {count}
      </div>
      <div className="flex-1 h-px bg-border"></div>
    </div>
  );
}

function DetailSheet({ sheet, onClose }: { sheet: string; onClose: () => void }) {
  const isOpen = sheet !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity z-30 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-fog rounded-t-3xl shadow-2xl z-30 max-h-[90vh] overflow-y-auto transition-transform ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-gradient-to-b from-olive via-olive-deep to-olive-deep/95 p-4 flex items-center justify-between rounded-t-3xl">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-white hover:bg-white/10 px-3 py-2 rounded-lg transition"
          >
            ‹ رجوع
          </button>
          <h2 className="font-display font-bold text-white text-sm">
            {sheet === 'restaurant' && 'مطعم أبو خالد'}
            {sheet === 'store' && 'متجر الأناقة'}
            {sheet === 'register' && 'سجّل محلك'}
          </h2>
          <div className="w-8"></div>
        </div>

        <div className="p-4 space-y-4">
          {sheet === 'restaurant' && (
            <>
              <div className="space-y-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink mb-2">🌅 فطور</h3>
                  {['فول بالزيت - 3 ₪', 'شاكشوكة - 8 ₪', 'فلافل بالخبز - 5 ₪'].map((item) => (
                    <div key={item} className="flex justify-between p-2 bg-white rounded-lg text-xs mb-1">
                      <span className="font-semibold">{item.split(' - ')[0]}</span>
                      <span className="text-olive font-bold">{item.split(' - ')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {sheet === 'store' && (
            <>
              <div className="space-y-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink mb-2">👗 ملابس رجالية</h3>
                  {[
                    { name: 'بنطلون جينز', price: '45 ₪' },
                    { name: 'قميص رجالي', price: '25 ₪' },
                  ].map((item) => (
                    <div key={item.name} className="flex justify-between p-2 bg-white rounded-lg text-xs mb-1">
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-olive font-bold">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {sheet === 'register' && (
            <>
              <div className="space-y-3">
                {[
                  { icon: '📝', title: 'سجّل بياناتك', desc: 'اسم المحل، المنطقة، رقم التواصل' },
                  { icon: '✅', title: 'موافقة يدوية', desc: 'الفريق يراجع ويوافق خلال 24 ساعة' },
                  { icon: '🚀', title: 'ابدأ فوراً', desc: 'رابط خاص يصلك على WhatsApp' },
                ].map((step) => (
                  <div key={step.title} className="flex gap-3 p-3 bg-white rounded-2xl">
                    <div className="text-2xl">{step.icon}</div>
                    <div>
                      <h4 className="font-bold text-sm text-ink">{step.title}</h4>
                      <p className="text-xs text-mist">{step.desc}</p>
                    </div>
                  </div>
                ))}
                <button className="w-full bg-gradient-to-r from-olive to-olive-deep text-white font-bold py-3 rounded-xl mt-4">
                  تقديم طلب التسجيل
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
