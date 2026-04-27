'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { uploadReceiptPhoto } from '@/lib/api/upload';
import type { Place, WorkspaceDetailsData } from '@/lib/api/places';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useGlobalSidebar } from '@/components/layout/GlobalDesktopShell';
import { OrderSheet, CartBar, type CartItem } from '@/components/places/OrderCart';

/* ─── Constants ─── */

const EMOJI_MAP: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', bakery: '🫓', juice: '🧃',
  'ملابس': '👗', 'إلكترونيات': '📱', 'حلاقة': '✂️', 'أدوات منزلية': '🏗️',
  'صيدلية': '💊', 'كتب ودفاتر': '📚', 'ألعاب أطفال': '🧸', 'أزهار': '🌸',
  'workspace': '💻',
};

const SERVICE_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  electricity: 'كهرباء',
  printing: 'طباعة',
  screens: 'شاشات',
  private_rooms: 'غرف خاصة',
  drinks: 'مشروبات',
};

const SERVICE_COLORS: Record<string, { bg: string; stroke: string }> = {
  wifi: { bg: '#EFF6FF', stroke: '#3B82F6' },
  electricity: { bg: '#FFFBEB', stroke: '#F59E0B' },
  printing: { bg: '#EFF6FF', stroke: '#3B82F6' },
  screens: { bg: '#EFF6FF', stroke: '#3B82F6' },
  private_rooms: { bg: '#FEF0EB', stroke: '#E05C35' },
  drinks: { bg: '#E8F5EE', stroke: '#1E4D2B' },
};

const FLAG_REASONS = [
  { value: 'wrong_price', label: 'السعر غلط' },
  { value: 'not_available', label: 'غير متوفر' },
  { value: 'wrong_info', label: 'معلومات خاطئة' },
  { value: 'other', label: 'أخرى' },
];

interface MenuItem {
  id?: string;
  name: string;
  price: number;
  available: boolean;
  icon?: string | null;
  photo_url?: string | null;
  updated_at?: string;
}

const ITEM_EMOJI_MAP: [RegExp, string, string][] = [
  // [pattern, emoji, bg color]
  // Drinks
  [/قهوة|كابتشينو|لاتيه|اسبرسو|إسبريسو|موكا|أمريكان|تركي|فلتر/i, '☕', '#FFF8E8'],
  [/شاي|شاى/i, '🍵', '#E8F5EE'],
  [/عصير|جوس|سموذي|كوكتيل|ليمون/i, '🥤', '#FFF0F5'],
  [/ماء|مياه|مويه/i, '💧', '#EFF6FF'],
  [/حليب|لبن/i, '🥛', '#FFF8E8'],
  [/بيبسي|كولا|غازي|صودا|سفن|سبرايت|ميرندا|فانتا/i, '🥤', '#FEF0EB'],
  [/موهيتو|نعناع/i, '🍹', '#E8F5EE'],
  // Sweets & desserts
  [/كيك|كعك|تورت/i, '🎂', '#FFF0F5'],
  [/تشيز/i, '🍰', '#FFF0F5'],
  [/بسكوت|كوكيز|بسكويت/i, '🍪', '#FFF8E8'],
  [/آيس كريم|بوظة|جيلاتو|ايس كريم/i, '🍦', '#F0FDF4'],
  [/شوكولا|نوتيلا|كاكاو/i, '🍫', '#FFF8E8'],
  [/كنافة|كنافه/i, '🍮', '#FFF8E8'],
  [/حلو|بقلاو|معمول|بسبوس|هريسة|قطايف/i, '🍬', '#FFF8E8'],
  [/وافل/i, '🧇', '#FFF8E8'],
  [/كريب|بان كيك|بانكيك/i, '🥞', '#FFF8E8'],
  [/دونات/i, '🍩', '#FFF0F5'],
  // Main dishes
  [/شاورما|شاورمة/i, '🥙', '#E8F5EE'],
  [/برجر|بيرغر|همبرجر|باركر/i, '🍔', '#FFF8E8'],
  [/بيتزا/i, '🍕', '#FEF0EB'],
  [/فلافل|طعمية/i, '🧆', '#E8F5EE'],
  [/حمص|مسبحة/i, '🧆', '#FFF8E8'],
  [/فول/i, '🫘', '#FFF8E8'],
  [/مشوي|شوي|مشاوي|كباب|كفت|شيش/i, '🥩', '#FEF0EB'],
  [/ستيك|لحم/i, '🥩', '#FEF0EB'],
  [/دجاج|فراخ|تشكن|دجاجة/i, '🍗', '#FEF0EB'],
  [/سمك|سمكة|جمبري|كاليمار|بحري/i, '🐟', '#EFF6FF'],
  [/مقلوبة|منسف|كبسة|مندي|مضغوط|بريان/i, '🍛', '#FFF8E8'],
  [/معكرونة|باستا|مكرونة|سباغيت|فيتوتشيني|بيني/i, '🍝', '#FEF0EB'],
  [/أرز|رز|ارز/i, '🍚', '#F0FDF4'],
  // Sandwiches & wraps
  [/ساندويش|سندويش|توست|خبز|صاج|لفة|راب/i, '🥪', '#FFF8E8'],
  [/هوت دوج|هوت دوغ|نقانق/i, '🌭', '#FEF0EB'],
  [/تاكو/i, '🌮', '#FFF8E8'],
  // Breakfast
  [/فطور|إفطار|فطار/i, '🍳', '#FFF8E8'],
  [/بيض|عجة|شكشوك/i, '🥚', '#FFF8E8'],
  // Sides & salads
  [/سلطة|سلطات|فتوش|تبولة/i, '🥗', '#F0FDF4'],
  [/بطاطا|بطاطس|فرايز|فرنسي/i, '🍟', '#FFF8E8'],
  [/ناجتس|نجتس/i, '🍗', '#FFF8E8'],
  // Soups
  [/شوربة|شوربه|حساء/i, '🍲', '#FFF8E8'],
  // Bakery
  [/خبز|صمون|عيش|كماج|طابون/i, '🫓', '#FFF8E8'],
  [/مناقيش|منقوش|فطيرة|فطير|بيتزا|زعتر/i, '🫓', '#E8F5EE'],
  [/معجنات|سمبوسة|سمبوسك|رقاق|بورك/i, '🥟', '#FFF8E8'],
  // Fruits
  [/فواكه|فاكهة|فراولة|موز|تفاح|برتقال|مانجو/i, '🍓', '#FFF0F5'],
  // Store items
  [/زيت/i, '🫒', '#E8F5EE'],
  [/سكر/i, '🧂', '#F0FDF4'],
  [/طحين|دقيق/i, '🌾', '#FFF8E8'],
];

function getItemEmoji(name: string): { emoji: string; bg: string } {
  const lower = name.toLowerCase();
  for (const [pattern, emoji, bg] of ITEM_EMOJI_MAP) {
    if (pattern.test(lower)) return { emoji, bg };
  }
  return { emoji: '🏷️', bg: '#F2FAF5' };
}


interface MenuSection {
  name: string;
  items: MenuItem[];
}

function formatTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${period}` : `${h12}:00 ${period}`;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} ي`;
  return `منذ ${Math.floor(days / 7)} أ`;
}

/** Clean whatsapp number: ensure it starts with 972 (not 970972 or similar) */
/** Clean whatsapp number: fix double prefix, keep 970 or 972 */
function cleanWhatsapp(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('970972')) d = d.slice(3);
  if (d.startsWith('972970')) d = '972' + d.slice(6);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '970' + d.slice(1);
  if (!d.startsWith('970') && !d.startsWith('972')) d = '970' + d;
  return d;
}

function typeLabel(type: string): string {
  if (type === 'both') return 'مطعم وكافيه';
  if (type === 'restaurant') return 'مطعم';
  if (type === 'cafe') return 'كافيه';
  if (type === 'workspace') return 'مساحة عمل';
  return type;
}

function resolvePublicImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  if (!base) return url;
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

/* ─── Workspace Content ─── */

function WorkspaceContent({ place }: { place: Place }) {
  const [wsData, setWsData] = useState<{ details: any; services: any[] } | null>(null);
  const [wsLoading, setWsLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await apiFetch(`/api/places/${place.id}/workspace`);
        if (res.ok) {
          const json = await res.json();
          setWsData(json.data || json);
        }
      } catch { /* ignore */ }
      setWsLoading(false);
    };
    fetch_();
  }, [place.id]);

  const wd = wsData?.details || place.workspace_details;
  const services = wsData?.services || place.workspace_services || [];

  if (wsLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-[14px] bg-border/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const pricingRows = [
    { label: 'سعر الساعة', value: wd?.price_hour, unit: '₪ / ساعة', color: 'green' },
    { label: 'نصف يوم', value: wd?.price_half_day, unit: '₪ / نصف يوم', color: 'green' },
    { label: 'سعر اليوم', value: wd?.price_day, unit: '₪ / يوم', color: 'blue' },
    { label: 'سعر الأسبوع', value: wd?.price_week, unit: '₪ / أسبوع', color: 'blue' },
    { label: 'سعر الشهر', value: wd?.price_month, unit: '₪ / شهر', color: 'amber' },
  ].filter(r => r.value);

  const iconColors: Record<string, { bg: string; stroke: string }> = {
    green: { bg: '#E8F5EE', stroke: '#1E4D2B' },
    blue: { bg: '#EFF6FF', stroke: '#3B82F6' },
    amber: { bg: '#FFFBEB', stroke: '#F59E0B' },
  };

  return (
    <>
      {/* Pricing card */}
      <div className="bg-surface border border-border rounded-[14px] overflow-hidden mb-4">
        {pricingRows.map((row, i) => {
          const ic = iconColors[row.color];
          return (
            <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < pricingRows.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: ic.bg }}>
                <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke={ic.stroke} strokeWidth={2} strokeLinecap="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] text-mist">{row.label}</div>
                <div className="text-[13px] font-bold text-ink">{row.value} {row.unit}</div>
              </div>
            </div>
          );
        })}

        {/* Hours */}
        {wd?.opens_at && wd?.closes_at && (
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-border">
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: '#FFFBEB' }}>
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <div className="text-[11px] text-mist">أوقات العمل</div>
              <div className="text-[13px] font-bold text-ink">{formatTime(wd.opens_at)} — {formatTime(wd.closes_at)}</div>
            </div>
          </div>
        )}

        {/* Seats */}
        {wd?.total_seats ? (
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-border">
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
            </div>
            <div>
              <div className="text-[11px] text-mist">الطاقة الاستيعابية</div>
              <div className="text-[13px] font-bold text-ink">{wd.total_seats} مقعد</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Services */}
      {services.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-olive rounded-sm" />
            <span className="font-display font-extrabold text-[13px] text-ink">الخدمات المتاحة</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {services.map(s => {
              const colors = SERVICE_COLORS[s.service] || { bg: '#E8F5EE', stroke: '#1E4D2B' };
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 p-3 rounded-xl border ${s.available ? 'bg-olive-pale border-olive/20' : 'bg-fog border-border opacity-50'}`}
                >
                  <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: colors.bg }}>
                    <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke={colors.stroke} strokeWidth={2} strokeLinecap="round">
                      {s.service === 'wifi' && <><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" /></>}
                      {s.service === 'electricity' && <path d="M13 2l-2 6.5H5l5.5 4-2 6.5L14 15l5.5 4-2-6.5L23 8.5H16z" />}
                      {s.service === 'printing' && <><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>}
                      {s.service === 'screens' && <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>}
                      {s.service === 'private_rooms' && <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></>}
                      {s.service === 'drinks' && <><path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /></>}
                    </svg>
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-ink">{SERVICE_LABELS[s.service] || s.service}</div>
                    <div className={`text-[10px] ${s.available ? 'text-olive' : 'text-mist'}`}>
                      {s.available ? (s.detail || 'متاح') : 'غير متاح'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!wd && services.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-mist">لا توجد تفاصيل بعد</p>
          <p className="text-xs text-mist mt-1">📍 {place.area?.name_ar}</p>
        </div>
      )}
    </>
  );
}

/* ─── Menu Content ─── */

function MenuContent({ place, cart, onAddToCart, onUpdateQty }: { place: Place; cart?: Map<string, CartItem>; onAddToCart?: (item: MenuItem) => void; onUpdateQty?: (id: string, delta: number) => void }) {
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Flag state
  const [flagItem, setFlagItem] = useState<MenuItem | null>(null);
  const [flagReason, setFlagReason] = useState('wrong_price');
  const [flagCorrectPrice, setFlagCorrectPrice] = useState('');
  const [flagNote, setFlagNote] = useState('');
  const [flagPhoto, setFlagPhoto] = useState<string | null>(null);
  const [flagUploading, setFlagUploading] = useState(false);
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagDone, setFlagDone] = useState(false);
  const [flagError, setFlagError] = useState('');

  function openFlag(item: MenuItem) {
    setFlagItem(item);
    setFlagReason('wrong_price');
    setFlagCorrectPrice('');
    setFlagNote('');
    setFlagPhoto(null);
    setFlagDone(false);
    setFlagError('');
  }

  async function handleFlagPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFlagError('الحد الأقصى 5 ميجابايت'); return; }
    setFlagUploading(true);
    setFlagError('');
    try {
      const url = await uploadReceiptPhoto(file);
      setFlagPhoto(url);
    } catch { setFlagError('فشل رفع الصورة'); }
    setFlagUploading(false);
  }

  async function submitFlag() {
    if (!flagItem?.id) return;
    setFlagSubmitting(true);
    setFlagError('');
    try {
      const res = await apiFetch(`/api/places/${place.id}/menu/${flagItem.id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: flagReason,
          correct_price: flagCorrectPrice ? Number(flagCorrectPrice) : undefined,
          proof_photo_url: flagPhoto || undefined,
          note: flagNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('فشل الإبلاغ');
      setFlagDone(true);
      setTimeout(() => setFlagItem(null), 1500);
    } catch {
      setFlagError('حدث خطأ، حاول مرة أخرى');
    }
    setFlagSubmitting(false);
  }

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        // Cache-bust so visitors see menu/photo updates immediately.
        const res = await apiFetch(`/api/places/${place.id}/menu?no_cache=1&_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setMenuSections(data.data || data || []);
        }
      } catch { /* menu might not exist */ }
      setLoading(false);
    };
    fetchMenu();
  }, [place.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 rounded-md bg-border/60 animate-pulse mb-3" />
            <div className="space-y-1.5">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between p-3 bg-surface rounded-[11px] border border-border">
                  <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                  <div className="h-4 w-14 rounded-md bg-border/60 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (menuSections.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-mist">لا توجد قائمة أسعار بعد</p>
        <p className="text-xs text-mist mt-1">📍 {place.area?.name_ar} · {typeLabel(place.type)}</p>
      </div>
    );
  }

  return (
    <>
      {menuSections.some((sec) => sec.items.some((item) => Number(item.price) === 0)) && (
        <div className="bg-surface rounded-2xl border border-border p-3 mb-4 text-center">
          <p className="text-[12px] font-semibold text-mist">بعض الأسعار لم تُضاف بعد من صاحب المحل</p>
          <p className="text-[10px] text-mist/70 mt-1">تواصل مع المحل مباشرة للاستفسار عن الأسعار &nbsp;📞</p>
        </div>
      )}
      {menuSections.map((sec) => (
        <div key={sec.name} className="mb-5">
          {/* Section divider */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-center gap-1.5 font-display font-bold text-[12px] text-mist whitespace-nowrap">
              <span className="w-[22px] h-[22px] rounded-[6px] bg-olive-pale flex items-center justify-center text-[11px]">🍽️</span>
              {sec.name}
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex flex-col gap-2">
          {sec.items.map((item, idx) => {
            const inCart = cart?.get(item.id!);
            const canOrder = onAddToCart && item.available && Number(item.price) > 0 && item.id;
            return (
            <div
              key={item.id || `${item.name}-${idx}`}
              className={`flex items-center gap-3 p-3 bg-surface rounded-[14px] border border-border hover:border-olive/20 hover:shadow-[0_3px_10px_rgba(0,0,0,0.08)] transition-all ${!item.available ? 'opacity-40' : ''}`}
            >
              {/* Emoji / Photo */}
              {resolvePublicImageUrl(item.photo_url) ? (
                <div className="relative w-[46px] h-[46px] rounded-[12px] flex-shrink-0 overflow-hidden bg-olive-pale">
                  <img src={resolvePublicImageUrl(item.photo_url)!} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (() => {
                const ie = getItemEmoji(item.name);
                return (
                  <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[22px] flex-shrink-0" style={{ background: ie.bg }}>
                    {item.icon || ie.emoji}
                  </div>
                );
              })()}

              {/* Name + description */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-ink">{item.name}</div>
                {item.id && (
                  <button onClick={() => openFlag(item)} className="text-[9px] text-mist/60 hover:text-mist mt-1">🚩 إبلاغ</button>
                )}
              </div>

              {/* Price + add/qty */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                {item.available ? (
                  Number(item.price) > 0 ? (
                    <span className="font-display font-black text-[15px] text-olive">
                      {item.price} <span className="text-[10px] font-normal text-mist">₪</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-mist font-semibold">—</span>
                  )
                ) : (
                  <span className="text-[10px] text-orange-500 font-semibold">غير متوفر</span>
                )}
                {canOrder && !inCart && (
                  <button
                    onClick={() => onAddToCart(item)}
                    className="w-[30px] h-[30px] rounded-full bg-olive flex items-center justify-center shadow-[0_2px_8px_rgba(74,124,89,0.25)] hover:bg-olive-deep transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-white" fill="none" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                )}
                {canOrder && inCart && onUpdateQty && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateQty(item.id!, -1)}
                      className="w-[26px] h-[26px] rounded-full border-[1.5px] border-red-300 bg-white flex items-center justify-center text-red-500 text-[15px] font-bold"
                    >
                      −
                    </button>
                    <span className="font-display font-extrabold text-[14px] text-ink min-w-[16px] text-center">{inCart.quantity}</span>
                    <button
                      onClick={() => onUpdateQty(item.id!, 1)}
                      className="w-[26px] h-[26px] rounded-full border-[1.5px] border-olive bg-olive flex items-center justify-center text-white text-[14px] font-bold"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}
          </div>
        </div>
      ))}

      {/* Flag modal */}
      {flagItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !flagSubmitting && setFlagItem(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.2)]" dir="rtl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-display font-bold text-[14px] text-ink">🚩 إبلاغ عن سعر خاطئ</h3>
                <p className="text-[11px] text-mist mt-0.5">{flagItem.name}{Number(flagItem.price) > 0 ? ` — ${flagItem.price} ₪` : ''}</p>
              </div>
              <button onClick={() => !flagSubmitting && setFlagItem(null)} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1">
              <div className="flex flex-wrap gap-2">
                {FLAG_REASONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setFlagReason(r.value)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${flagReason === r.value ? 'bg-olive text-white border-olive' : 'bg-fog text-ink border-border'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {flagReason === 'wrong_price' && (
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="السعر الصحيح (₪)"
                  value={flagCorrectPrice}
                  onChange={e => setFlagCorrectPrice(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-[13px] text-ink bg-fog focus:outline-none focus:border-olive"
                  dir="rtl"
                />
              )}
              <textarea
                placeholder="ملاحظة إضافية (اختياري)"
                value={flagNote}
                onChange={e => setFlagNote(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-[13px] text-ink bg-fog focus:outline-none focus:border-olive resize-none h-[60px]"
                dir="rtl"
              />
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-[12px] text-mist hover:text-ink transition-colors">
                  📸 {flagPhoto ? 'تم الرفع ✓' : (flagUploading ? 'جاري الرفع...' : 'أرفق صورة (اختياري)')}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFlagPhoto} disabled={flagUploading} />
                </label>
              </div>
              {flagError && <p className="text-[12px] text-red-500">{flagError}</p>}
              {flagDone ? (
                <div className="text-center py-2 text-[13px] font-bold text-olive">✅ تم الإبلاغ بنجاح</div>
              ) : (
                <button
                  onClick={submitFlag}
                  disabled={flagSubmitting}
                  className="w-full py-2.5 rounded-xl bg-olive text-white font-display font-bold text-[13px] disabled:opacity-50"
                >
                  {flagSubmitting ? 'جاري الإرسال...' : 'إرسال الإبلاغ'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ─── Main Page ─── */

export default function PlaceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const isDesktop = useIsDesktop();

  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [showCart, setShowCart] = useState(false);

  const addToCart = useCallback((item: MenuItem) => {
    if (!item.id) return;
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id!);
      if (existing) {
        next.set(item.id!, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(item.id!, { menu_item_id: item.id!, name: item.name, price: Number(item.price), quantity: 1 });
      }
      return next;
    });
  }, []);

  const updateCartQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = next.get(id);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) { next.delete(id); } else { next.set(id, { ...item, quantity: newQty }); }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(new Map());
    setShowCart(false);
  }, []);

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const res = await apiFetch(`/api/places/${id}`);
        if (!res.ok) { setError(true); setLoading(false); return; }
        const data = await res.json();
        setPlace(data.data || data);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    if (id) fetchPlace();
  }, [id]);

  const isBoth = !loading && !error && place ? place.type === 'both' : false;
  const emoji = place ? (isBoth ? '🍴☕' : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : place.section === 'workspace' ? '💻' : '🏪'))) : '🏪';

  useGlobalSidebar(
    isDesktop ? (
      <div className="space-y-1">
        <Link href="/places" className="flex items-center gap-1.5 text-xs text-mist hover:text-olive transition-colors font-semibold mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          العودة للمحلات
        </Link>
        {place && (
          <div className="bg-olive-pale rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{isBoth ? '🍴☕' : emoji}</span>
              <span className="font-display font-bold text-sm text-ink truncate">{place.name}</span>
            </div>
            {place.area?.name_ar && (
              <div className="text-[11px] text-mist">📍 {place.area.name_ar}</div>
            )}
            {place.is_open && (
              <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-olive">
                <span className="w-[5px] h-[5px] rounded-full bg-olive animate-pulse" />
                مفتوح الآن
              </div>
            )}
          </div>
        )}
      </div>
    ) : null
  );

  if (loading) {
    if (isDesktop) {
      return (
        <div className="h-full overflow-y-auto bg-fog">
          <div className="max-w-2xl mx-auto p-6 space-y-4">
            <div className="h-6 w-40 bg-border/40 rounded animate-pulse" />
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-[14px] bg-border/40 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-fog flex flex-col">
        <div className="bg-olive p-4 pb-5">
          <div className="h-8 w-24 rounded-md bg-white/20 animate-pulse mb-3" />
          <div className="flex items-center gap-3">
            <div className="w-[50px] h-[50px] rounded-[14px] bg-white/20 animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-40 rounded-md bg-white/20 animate-pulse mb-2" />
              <div className="h-3 w-24 rounded-md bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-[14px] bg-border/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className={`${isDesktop ? 'h-full' : 'min-h-screen'} bg-fog flex flex-col items-center justify-center px-6 text-center`}>
        <p className="text-4xl mb-4">😕</p>
        <h1 className="font-display font-black text-xl text-ink mb-2">المكان غير موجود</h1>
        <p className="text-sm text-mist mb-6">قد يكون الرابط خاطئاً أو أن المكان لم يعد متاحاً</p>
        <Link href="/places" className="bg-olive text-white font-display font-bold text-[13px] px-5 py-2.5 rounded-xl">
          العودة للمحلات
        </Link>
      </div>
    );
  }

  const sectionTitle = place.section === 'food' ? 'القائمة الكاملة' : place.section === 'workspace' ? 'تفاصيل مساحة العمل' : 'تفاصيل المتجر';
  const ordersEnabled = place.orders_enabled === true;
  // DEBUG — remove after confirming
  console.log('[DEBUG] orders_enabled:', place.orders_enabled, 'ordersEnabled:', ordersEnabled, 'section:', place.section);
  const cartItems = Array.from(cart.values());
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  // ── Desktop layout ──
  if (isDesktop) {
    return (
      <div className="h-full overflow-y-auto bg-fog" dir="rtl">
        <div className="max-w-2xl mx-auto p-6">
          {/* Place info row */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-11 h-11 rounded-xl bg-olive-pale flex items-center justify-center flex-shrink-0 overflow-hidden ${!place.avatar_url && isBoth ? 'text-[10px] gap-0' : !place.avatar_url ? 'text-lg' : ''}`}>
              {place.avatar_url ? (
                <img src={place.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : isBoth ? <span className="flex items-center -space-x-1"><span>🍴</span><span>☕</span></span> : emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-lg text-ink">{place.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-mist">📍 {place.area?.name_ar}</span>
                {place.is_open && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-olive">
                    <span className="w-[5px] h-[5px] rounded-full bg-olive animate-pulse" />
                    مفتوح
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {place.phone && (
                <a href={`tel:${place.phone}`} className="w-8 h-8 rounded-full bg-fog border border-border flex items-center justify-center text-sm">
                  📞
                </a>
              )}
              {place.whatsapp && (
                <a href={`https://wa.me/${cleanWhatsapp(place.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-sm">
                  💬
                </a>
              )}
            </div>
          </div>

          {/* Section title */}
          <h2 className="font-display font-bold text-sm text-ink mb-3">{sectionTitle}</h2>

          {/* Content */}
          <div className="bg-surface rounded-2xl border border-border p-5">
            {place.section === 'workspace' ? (
              <WorkspaceContent place={place} />
            ) : (
              <MenuContent place={place} cart={ordersEnabled ? cart : undefined} onAddToCart={ordersEnabled ? addToCart : undefined} onUpdateQty={ordersEnabled ? updateCartQty : undefined} />
            )}
          </div>

          {/* Desktop cart */}
          {ordersEnabled && (
            <>
              <CartBar itemCount={cartCount} total={cartTotal} onClick={() => setShowCart(true)} />
              {showCart && (
                <>
                  <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowCart(false)} />
                  <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-[0_-4px_24px_rgba(0,0,0,0.2)] max-w-lg mx-auto" dir="rtl">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                      <h3 className="font-display font-bold text-[14px] text-ink">🛒 سلة الطلب</h3>
                      <button onClick={() => setShowCart(false)} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
                    </div>
                    <OrderSheet
                      placeId={id}
                      placeWhatsapp={place.whatsapp}
                      cart={cart}
                      onUpdateQty={updateCartQty}
                      onClear={clearCart}
                      onOrderPlaced={() => {}}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Mobile layout ──
  return (
    <div className="min-h-screen bg-fog flex flex-col" dir="rtl">
      {/* Header */}
      <div className="bg-olive p-4 pb-5 flex-shrink-0 relative overflow-hidden">
        <div className="absolute w-[140px] h-[140px] rounded-full bg-white/[0.06] -bottom-[50px] -left-5 pointer-events-none" />

        {/* Back row */}
        <div className="flex items-center gap-2 mb-3 relative z-[1]">
          <Link
            href="/places"
            className="w-[30px] h-[30px] bg-white/[0.12] rounded-lg flex items-center justify-center text-white font-bold text-[15px]"
          >
            {'›'}
          </Link>
          <span className="font-display font-bold text-[13px] text-white">{sectionTitle}</span>
        </div>

        {/* Place info */}
        <div className="flex items-center gap-3 relative z-[1]">
          <div className={`w-[50px] h-[50px] rounded-[14px] bg-white/[0.14] border-[1.5px] border-white/[0.22] flex items-center justify-center flex-shrink-0 overflow-hidden ${!place.avatar_url && isBoth ? 'text-[10px] gap-0' : !place.avatar_url ? 'text-2xl' : ''}`}>
            {place.avatar_url ? (
              <img src={place.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : isBoth ? <span className="flex items-center -space-x-1"><span>🍴</span><span>☕</span></span> : emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-black text-[17px] text-white mb-1">{place.name}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-white/55">📍 {place.area?.name_ar}</span>
              {place.is_open && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#7DEAAA]">
                  <span className="w-[5px] h-[5px] rounded-full bg-[#7DEAAA] animate-pulse" />
                  مفتوح الآن
                </span>
              )}
            </div>
            {place.address && (
              <div className="text-[10px] text-white/40 mt-0.5 truncate">{place.address}</div>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {place.phone && (
              <a href={`tel:${place.phone}`} className="w-9 h-9 rounded-full bg-white/10 border border-white/[0.18] flex items-center justify-center text-[16px]">
                📞
              </a>
            )}
            {place.whatsapp && (
              <a href={`https://wa.me/${cleanWhatsapp(place.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center text-[16px]">
                💬
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-24">
        {place.section === 'workspace' ? (
          <WorkspaceContent place={place} />
        ) : (
          <MenuContent place={place} cart={ordersEnabled ? cart : undefined} onAddToCart={ordersEnabled ? addToCart : undefined} onUpdateQty={ordersEnabled ? updateCartQty : undefined} />
        )}
      </div>

      {/* Cart bar + order sheet */}
      {ordersEnabled && (
        <>
          <CartBar itemCount={cartCount} total={cartTotal} onClick={() => setShowCart(true)} />
          {showCart && (
            <>
              <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowCart(false)} />
              <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-[0_-4px_24px_rgba(0,0,0,0.2)]" dir="rtl">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                  <h3 className="font-display font-bold text-[14px] text-ink">🛒 سلة الطلب</h3>
                  <button onClick={() => setShowCart(false)} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
                </div>
                <OrderSheet
                  placeId={id}
                  cart={cart}
                  onUpdateQty={updateCartQty}
                  onClear={clearCart}
                  onOrderPlaced={() => {}}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
