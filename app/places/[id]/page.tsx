'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import { uploadReceiptPhoto } from '@/lib/api/upload';
import type { Place, WorkspaceDetailsData } from '@/lib/api/places';

/* ─── Constants ─── */

const EMOJI_MAP: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', bakery: '🫓', juice: '🧃',
  'ملابس': '👗', 'إلكترونيات': '📱', 'حلاقة': '✂️', 'أدوات منزلية': '🏗️',
  'صيدلية': '💊', 'كتب ودفاتر': '📚', 'ألعاب أطفال': '🧸', 'أزهار': '🌸',
  'workspace': '💻', 'مساحة عمل': '💻',
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
  updated_at?: string;
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
  if (type === 'both' || type === 'مطعم وكافيه') return 'مطعم وكافيه';
  if (type === 'restaurant' || type === 'مطعم') return 'مطعم';
  if (type === 'cafe' || type === 'كافيه' || type === 'مقهى') return 'كافيه';
  return type;
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

function MenuContent({ place }: { place: Place }) {
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
        const res = await apiFetch(`/api/places/${place.id}/menu`);
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
          <div className="font-display font-extrabold text-[13px] text-ink pb-[7px] border-b-2 border-olive-pale mb-2">
            {sec.name}
          </div>
          {sec.items.map((item, idx) => (
            <div
              key={item.id || `${item.name}-${idx}`}
              className={`p-3 bg-surface rounded-[11px] mb-1.5 border border-border hover:border-olive/25 ${!item.available ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {item.icon && (
                    <span className="w-[34px] h-[34px] rounded-[10px] bg-olive-pale flex items-center justify-center text-[17px] flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <div className="text-[13px] font-semibold text-ink">{item.name}</div>
                </div>
                <div>
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
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50">
                <span className="text-[9px] text-mist flex items-center gap-1">
                  {item.updated_at ? (
                    <>
                      <span className={`w-[5px] h-[5px] rounded-full ${Date.now() - new Date(item.updated_at).getTime() < 86400000 * 7 ? 'bg-olive' : 'bg-amber-400'}`} />
                      تحديث {timeAgo(item.updated_at)}
                    </>
                  ) : (
                    <span className="text-mist/50">بدون تاريخ</span>
                  )}
                </span>
                {item.id && (
                  <button
                    onClick={() => openFlag(item)}
                    className="text-[10px] font-semibold text-mist hover:text-sand transition-colors px-1.5 py-0.5 rounded"
                  >
                    🚩 إبلاغ
                  </button>
                )}
              </div>
            </div>
          ))}
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

  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  if (loading) {
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
      <div className="min-h-screen bg-fog flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">😕</p>
        <h1 className="font-display font-black text-xl text-ink mb-2">المكان غير موجود</h1>
        <p className="text-sm text-mist mb-6">قد يكون الرابط خاطئاً أو أن المكان لم يعد متاحاً</p>
        <Link href="/places" className="bg-olive text-white font-display font-bold text-[13px] px-5 py-2.5 rounded-xl">
          العودة للمحلات
        </Link>
      </div>
    );
  }

  const isBoth = place.type === 'both';
  const emoji = isBoth ? '🍴☕' : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : place.section === 'workspace' ? '💻' : '🏪'));
  const sectionTitle = place.section === 'food' ? 'القائمة الكاملة' : place.section === 'workspace' ? 'تفاصيل مساحة العمل' : 'تفاصيل المتجر';

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
          <MenuContent place={place} />
        )}
      </div>
    </div>
  );
}
