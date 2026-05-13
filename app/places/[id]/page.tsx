'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/fetch';
import type { Place, WorkspaceDetailsData } from '@/lib/api/places';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useGlobalSidebar } from '@/components/layout/GlobalDesktopShell';
import { OrderSheet, CartBar, type CartItem } from '@/components/places/OrderCart';
import { MyOrdersSheet } from '@/components/places/MyOrdersSheet';
import { useSessionContext } from '@/contexts/SessionContext';
import { PhoneAuthPopup } from '@/components/auth/PhoneAuthPopup';
import { VerifiedBadge } from '@/components/places/VerifiedBadge';

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
  wifi: { bg: 'var(--ws-blue-bg)', stroke: 'var(--ws-blue-stroke)' },
  electricity: { bg: 'var(--ws-amber-bg)', stroke: 'var(--ws-amber-stroke)' },
  printing: { bg: 'var(--ws-blue-bg)', stroke: 'var(--ws-blue-stroke)' },
  screens: { bg: 'var(--ws-blue-bg)', stroke: 'var(--ws-blue-stroke)' },
  private_rooms: { bg: 'var(--ws-amber-bg)', stroke: 'var(--ws-amber-stroke)' },
  drinks: { bg: 'var(--ws-green-bg)', stroke: 'var(--ws-green-stroke)' },
};



interface MenuItem {
  id?: string;
  name: string;
  price: number;
  available: boolean;
  icon?: string | null;
  photo_url?: string | null;
  description?: string | null;
  updated_at?: string;
}

/** Strip emojis from menu item name (safety net) */
function stripEmojis(text: string): string {
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim();
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
      <div className="animate-pulse">
        {/* Pricing card skeleton */}
        <div className="bg-surface border border-border rounded-[14px] overflow-hidden mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 3 ? 'border-b border-border' : ''}`}>
              <div className="w-8 h-8 rounded-[9px] bg-border/30 flex-shrink-0" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-16 bg-border/30 rounded" />
                <div className="h-3.5 w-24 bg-border/40 rounded" />
              </div>
            </div>
          ))}
        </div>
        {/* Services section skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-border/40 rounded-sm" />
          <div className="h-3.5 w-24 bg-border/40 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-fog/50">
              <div className="w-[30px] h-[30px] rounded-lg bg-border/30 flex-shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3 w-14 bg-border/30 rounded" />
                <div className="h-2.5 w-10 bg-border/20 rounded" />
              </div>
            </div>
          ))}
        </div>
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
    green: { bg: 'var(--ws-green-bg)', stroke: 'var(--ws-green-stroke)' },
    blue: { bg: 'var(--ws-blue-bg)', stroke: 'var(--ws-blue-stroke)' },
    amber: { bg: 'var(--ws-amber-bg)', stroke: 'var(--ws-amber-stroke)' },
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
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ws-amber-bg)' }}>
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="var(--ws-amber-stroke)" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
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
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ws-blue-bg)' }}>
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="var(--ws-blue-stroke)" strokeWidth={2} strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {services.map(s => {
              const colors = SERVICE_COLORS[s.service] || { bg: 'var(--ws-green-bg)', stroke: 'var(--ws-green-stroke)' };
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
  const [flagNote, setFlagNote] = useState('');
  const [flagDone, setFlagDone] = useState(false);
  const [flagSending, setFlagSending] = useState(false);

  function openFlag(item: MenuItem) {
    setFlagItem(item);
    setFlagNote('');
    setFlagDone(false);
  }

  async function submitFlag() {
    if (!flagItem?.id || !flagNote.trim() || flagSending) return;
    setFlagSending(true);
    try {
      await apiFetch(`/api/places/${place.id}/menu/${flagItem.id}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: flagNote.trim() }),
      });
      setFlagDone(true);
      setTimeout(() => setFlagItem(null), 1500);
    } catch {}
    setFlagSending(false);
  }

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        // Cache-bust so visitors see menu/photo updates immediately.
        const res = await apiFetch(`/api/places/${place.id}/menu?no_cache=1&_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const sections = (data.data || data || []) as MenuSection[];
          setMenuSections(
            sections
              .map((s) => ({ ...s, items: s.items.filter((i) => i.available !== false) }))
              .filter((s) => s.items.length > 0)
          );
        }
      } catch { /* menu might not exist */ }
      setLoading(false);
    };
    fetchMenu();
  }, [place.id]);

  if (loading) {
    const isFood = place.section === 'food';
    if (isFood) {
      return (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-8 animate-pulse">
          {[...Array(4)].map((_, si) => (
            <div key={si} className="break-inside-avoid mb-6">
              <div className="h-4 w-20 bg-border/40 rounded mb-2 pb-1.5 border-b-2 border-border/20" />
              {[...Array(si % 2 === 0 ? 4 : 3)].map((_, j) => (
                <div key={j} className="flex items-baseline gap-2 py-1.5">
                  <div className="h-3 w-20 bg-border/30 rounded" />
                  <div className="flex-1 border-b border-dotted border-border/20" />
                  <div className="h-3.5 w-10 bg-border/30 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-5 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 rounded-md bg-border/40 mb-2" />
            <div className="space-y-1.5">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-3 p-3 bg-surface rounded-[11px] border border-border">
                  <div className="w-10 h-10 rounded-lg bg-border/40 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-28 rounded bg-border/40" />
                    <div className="h-2.5 w-20 rounded bg-border/30" />
                  </div>
                  <div className="h-4 w-14 rounded bg-border/40" />
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

  const isFood = place.section === 'food';

  return (
    <>
      {menuSections.some((sec) => sec.items.some((item) => Number(item.price) === 0)) && (
        <div className="text-center mb-4">
          <p className="text-[11px] text-olive/50">بعض الأسعار لم تُضاف بعد من صاحب المحل</p>
        </div>
      )}

      {isFood ? (
      /* ── Food: multi-column menu with dotted leaders ── */
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-8">
      {menuSections.map((sec) => (
        <div key={sec.name} className="break-inside-avoid mb-6">
          <h3 className="font-display font-black text-[16px] text-olive mb-2 pb-1.5 border-b-2 border-olive/20">
            {sec.name}
          </h3>
          {sec.items.map((item, idx) => {
            const inCart = cart?.get(item.id!);
            const canOrder = onAddToCart && item.available && Number(item.price) > 0 && item.id;
            return (
            <div
              key={item.id || `${item.name}-${idx}`}
              className={`group py-1.5 ${!item.available ? 'opacity-35' : ''}`}
            >
              <div className="flex items-start gap-1">
                <div className="flex-1 min-w-0 flex items-baseline">
                  <span className="text-[13px] font-semibold text-ink whitespace-nowrap">{stripEmojis(item.name)}</span>
                  {item.available && Number(item.price) > 0 && (
                    <span className="flex-1 mx-1.5 border-b border-dotted border-olive/20 min-w-[20px] relative top-[-3px]" />
                  )}
                  {item.available && Number(item.price) > 0 ? (
                    <span className="font-display font-black text-[14px] text-olive whitespace-nowrap tabular-nums">{item.price} <span className="text-[9px] font-normal text-olive/50">₪</span></span>
                  ) : item.available ? <span className="text-[11px] text-mist">—</span> : null}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 mr-1">
                  {item.id && place.whatsapp && (
                    <button onClick={() => openFlag(item)} className="text-red-400/50 hover:text-red-400 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    </button>
                  )}
                  {canOrder && !inCart && (
                    <button onClick={() => onAddToCart(item)} className="w-5 h-5 rounded-full bg-olive text-white flex items-center justify-center active:scale-95">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 stroke-white" fill="none" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  )}
                  {canOrder && inCart && onUpdateQty && (
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => onUpdateQty(item.id!, -1)} className="w-5 h-5 rounded-full bg-red-50 text-[#E05C35] flex items-center justify-center text-[12px] leading-none">−</button>
                      <span className="font-display font-extrabold text-[12px] text-ink min-w-[12px] text-center">{inCart.quantity}</span>
                      <button onClick={() => onUpdateQty(item.id!, 1)} className="w-5 h-5 rounded-full bg-olive-pale text-olive flex items-center justify-center text-[12px] leading-none">+</button>
                    </div>
                  )}
                </div>
              </div>
              {item.description && <p className="text-[10px] text-olive/40 mt-0.5 pr-1">{item.description}</p>}
            </div>
            );
          })}
        </div>
      ))}
      </div>
      ) : (
      /* ── Store: card-row style ── */
      <div className="space-y-5">
      {menuSections.map((sec) => (
        <div key={sec.name}>
          <h3 className="font-display font-bold text-[14px] text-ink mb-2">{sec.name}</h3>
          <div className="space-y-1.5">
            {sec.items.map((item, idx) => (
              <div
                key={item.id || `${item.name}-${idx}`}
                className={`flex items-center gap-3 p-3 bg-surface rounded-[11px] border border-border ${!item.available ? 'opacity-40' : ''}`}
              >
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-fog flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-mist" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-semibold text-ink">{stripEmojis(item.name)}</span>
                  {item.description && <p className="text-[10px] text-mist mt-0.5">{item.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mr-1">
                  {item.id && place.whatsapp && (
                    <button onClick={() => openFlag(item)} className="text-red-400/50 hover:text-red-400 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    </button>
                  )}
                  {item.available && Number(item.price) > 0 ? (
                    <span className="font-display font-bold text-[14px] text-olive whitespace-nowrap">{item.price} <span className="text-[9px] font-normal text-mist">₪</span></span>
                  ) : item.available ? (
                    <span className="text-[11px] text-mist">—</span>
                  ) : (
                    <span className="text-[10px] text-red-400">غير متوفر</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
      )}

      {/* Note modal */}
      {flagItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setFlagItem(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.2)] lg:top-1/2 lg:left-1/2 lg:right-auto lg:bottom-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:max-h-[80vh] lg:w-[420px] lg:max-w-[90vw]" dir="rtl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-display font-bold text-[14px] text-ink">ملاحظة للمحل</h3>
                <p className="text-[11px] text-mist mt-0.5">{flagItem.name}{Number(flagItem.price) > 0 ? ` — ${flagItem.price} ₪` : ''}</p>
              </div>
              <button onClick={() => setFlagItem(null)} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
            </div>
            <div className="px-4 py-3 space-y-3">
              <textarea
                placeholder="اكتب ملاحظتك هنا..."
                value={flagNote}
                onChange={e => setFlagNote(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-[13px] text-ink bg-fog focus:outline-none focus:border-olive resize-none h-[80px]"
                dir="rtl"
              />
              {flagDone ? (
                <div className="text-center py-2 text-[13px] font-bold text-olive">تم الإرسال</div>
              ) : (
                <button
                  onClick={submitFlag}
                  disabled={!flagNote.trim() || flagSending}
                  className="w-full py-2.5 rounded-xl bg-olive text-white font-display font-bold text-[13px] disabled:opacity-50"
                >
                  {flagSending ? 'جاري الإرسال...' : 'إرسال'}
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
  const { contributor, refreshContributor } = useSessionContext();
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [showCart, setShowCart] = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false);

  const addToCart = useCallback((item: MenuItem) => {
    if (!item.id) return;
    if (!contributor?.phone_verified) {
      setShowAuthPopup(true);
      return;
    }
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id!);
      if (existing) {
        next.set(item.id!, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(item.id!, { menu_item_id: item.id!, name: stripEmojis(item.name), price: Number(item.price), quantity: 1 });
      }
      return next;
    });
  }, [contributor?.phone_verified]);

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

  // Record visit
  useEffect(() => {
    if (!id || error) return;
    fetch(`/api/places/${id}/visit`, { method: "POST" }).catch(() => {});
  }, [id, error]);

  // Listen for global header cart open event
  useEffect(() => {
    const handleOpenCart = () => setShowCart(true);
    window.addEventListener('open-cart', handleOpenCart);
    return () => {
      window.removeEventListener('open-cart', handleOpenCart);
    };
  }, []);

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
              <VerifiedBadge plan={place.plan} />
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
        <div className="h-full overflow-y-auto bg-surface" dir="rtl">
          <div className="p-6 animate-pulse">
            {/* Place info row */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-border/40 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-36 bg-border/40 rounded" />
                <div className="h-3 w-24 bg-border/30 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-border/30" />
                <div className="w-8 h-8 rounded-full bg-border/30" />
              </div>
            </div>
            {/* Section title */}
            <div className="h-4 w-28 bg-border/40 rounded mb-4" />
            {/* Multi-column menu skeleton */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-8">
              {[...Array(4)].map((_, si) => (
                <div key={si} className="break-inside-avoid mb-6">
                  <div className="h-4 w-20 bg-border/40 rounded mb-2 pb-1.5 border-b-2 border-border/20" />
                  {[...Array(si % 2 === 0 ? 4 : 3)].map((_, j) => (
                    <div key={j} className="flex items-baseline gap-2 py-1.5">
                      <div className="h-3 w-20 bg-border/30 rounded" />
                      <div className="flex-1 border-b border-dotted border-border/20" />
                      <div className="h-3.5 w-10 bg-border/30 rounded" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-fog flex flex-col" dir="rtl">
        {/* Header skeleton */}
        <div className="bg-olive p-4 pb-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[30px] h-[30px] rounded-lg bg-white/12" />
            <div className="h-3.5 w-24 bg-white/20 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-[50px] h-[50px] rounded-full bg-white/14" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-36 bg-white/20 rounded" />
              <div className="h-3 w-24 bg-white/15 rounded" />
            </div>
          </div>
        </div>
        {/* Menu skeleton */}
        <div className="p-4 animate-pulse">
          {[...Array(3)].map((_, si) => (
            <div key={si} className="mb-5">
              <div className="h-4 w-20 bg-border/40 rounded mb-2 pb-1.5 border-b-2 border-border/20" />
              {[...Array(si === 0 ? 4 : 3)].map((_, j) => (
                <div key={j} className="flex items-baseline gap-2 py-1.5">
                  <div className="h-3 w-20 bg-border/30 rounded" />
                  <div className="flex-1 border-b border-dotted border-border/20" />
                  <div className="h-3.5 w-10 bg-border/30 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className={`${isDesktop ? 'h-full' : 'min-h-screen'} bg-fog flex flex-col items-center justify-center px-6 text-center`}>
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
      <div className="h-full overflow-y-auto bg-surface" dir="rtl">
        <div className="p-6">
          {/* Place info row */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-11 h-11 rounded-full bg-olive-pale flex items-center justify-center flex-shrink-0 overflow-hidden ${!place.avatar_url && isBoth ? 'text-[10px] gap-0' : !place.avatar_url ? 'text-lg' : ''}`}>
              {place.avatar_url ? (
                <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
              ) : isBoth ? <span className="flex items-center -space-x-1"><span>🍴</span><span>☕</span></span> : emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-bold text-lg text-ink">{place.name}</h1>
                <VerifiedBadge plan={place.plan} size="md" />
              </div>
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
                <a href={`tel:${place.phone}`} className="w-8 h-8 rounded-full bg-fog border border-border flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                </a>
              )}
              {place.whatsapp && (
                <a href={`https://wa.me/${cleanWhatsapp(place.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#25D366]" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* Section title + My Orders */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-sm text-ink">{sectionTitle}</h2>
            {ordersEnabled && contributor?.phone_verified && (
              <button onClick={() => setShowMyOrders(true)} className="text-[12px] font-semibold text-olive hover:underline">
                طلباتي
              </button>
            )}
          </div>

          {/* Content */}
          {place.section === 'workspace' ? (
            <WorkspaceContent place={place} />
          ) : (
            <MenuContent place={place} cart={ordersEnabled ? cart : undefined} onAddToCart={ordersEnabled ? addToCart : undefined} onUpdateQty={ordersEnabled ? updateCartQty : undefined} />
          )}

          {/* Desktop cart */}
          {ordersEnabled && (
            <>
              <CartBar itemCount={cartCount} total={cartTotal} onClick={() => setShowCart(true)} />
              {showCart && (
                <>
                  <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowCart(false)} />
                  <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-[0_-4px_24px_rgba(0,0,0,0.2)] lg:top-1/2 lg:left-1/2 lg:right-auto lg:bottom-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:max-h-[80vh] lg:w-[480px] lg:max-w-[90vw]" dir="rtl">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                      <h3 className="font-display font-bold text-[14px] text-ink">سلة الطلب</h3>
                      <div className="flex items-center gap-3">
                        {contributor?.phone_verified && (
                          <button onClick={() => { setShowCart(false); setShowMyOrders(true); }} className="text-[12px] font-semibold text-olive hover:underline">طلباتي</button>
                        )}
                        <button onClick={() => setShowCart(false)} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
                      </div>
                    </div>
                    <OrderSheet
                      placeId={id}
                      placeWhatsapp={place.whatsapp}
                      cart={cart}
                      onUpdateQty={updateCartQty}
                      onClear={clearCart}
                      onOrderPlaced={() => setCart(new Map())}
                      userPhone={contributor?.phone_number}
                      userHandle={contributor?.display_handle}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <PhoneAuthPopup
            open={showAuthPopup}
            onClose={() => setShowAuthPopup(false)}
            onVerified={() => {
              setShowAuthPopup(false);
              refreshContributor().catch(() => {});
            }}
            mode="login"
            reason="سجّل دخولك برقم الواتساب حتى يتمكن المطعم من التواصل معك وتأكيد طلبك"
          />
          {showMyOrders && <MyOrdersSheet onClose={() => setShowMyOrders(false)} />}
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
          <span className="font-display font-bold text-[13px] text-white flex-1">{sectionTitle}</span>
          {ordersEnabled && contributor?.phone_verified && (
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCart(true)} className="text-[12px] font-semibold text-white/70 hover:text-white">
                سلة الطلب
              </button>
              <button onClick={() => setShowMyOrders(true)} className="text-[12px] font-semibold text-white/70 hover:text-white">
                طلباتي
              </button>
            </div>
          )}
        </div>

        {/* Place info */}
        <div className="flex items-center gap-3 relative z-[1]">
          <div className={`w-[50px] h-[50px] rounded-full bg-white/[0.14] border-[1.5px] border-white/[0.22] flex items-center justify-center flex-shrink-0 overflow-hidden ${!place.avatar_url && isBoth ? 'text-[10px] gap-0' : !place.avatar_url ? 'text-2xl' : ''}`}>
            {place.avatar_url ? (
              <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
            ) : isBoth ? <span className="flex items-center -space-x-1"><span>🍴</span><span>☕</span></span> : emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-display font-black text-[17px] text-white">{place.name}</span>
              <VerifiedBadge plan={place.plan} size="md" />
            </div>
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
              <a href={`tel:${place.phone}`} className="w-9 h-9 rounded-full bg-white/10 border border-white/[0.18] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              </a>
            )}
            {place.whatsapp && (
              <a href={`https://wa.me/${cleanWhatsapp(place.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#25D366]" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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
              <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-[0_-4px_24px_rgba(0,0,0,0.2)] lg:top-1/2 lg:left-1/2 lg:right-auto lg:bottom-auto lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:max-h-[80vh] lg:w-[480px] lg:max-w-[90vw]" dir="rtl">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                  <h3 className="font-display font-bold text-[14px] text-ink">سلة الطلب</h3>
                  <div className="flex items-center gap-3">
                    {contributor?.phone_verified && (
                      <button onClick={() => { setShowCart(false); setShowMyOrders(true); }} className="text-[12px] font-semibold text-olive hover:underline">طلباتي</button>
                    )}
                    <button onClick={() => setShowCart(false)} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
                  </div>
                </div>
                <OrderSheet
                  placeId={id}
                  cart={cart}
                  onUpdateQty={updateCartQty}
                  onClear={clearCart}
                  onOrderPlaced={() => setCart(new Map())}
                  userPhone={contributor?.phone_number}
                  userHandle={contributor?.display_handle}
                />
              </div>
            </>
          )}
        </>
      )}
      <PhoneAuthPopup
        open={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        onVerified={() => {
          setShowAuthPopup(false);
          refreshContributor().catch(() => {});
        }}
        mode="login"
        reason="سجّل دخولك برقم الواتساب حتى يتمكن المطعم من التواصل معك وتأكيد طلبك"
      />
      {showMyOrders && <MyOrdersSheet onClose={() => setShowMyOrders(false)} />}
    </div>
  );
}
