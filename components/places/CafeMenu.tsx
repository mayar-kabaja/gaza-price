"use client";

import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { uploadReceiptPhoto } from "@/lib/api/upload";
import type { Place } from "@/lib/api/places";

/* ─── Types ─── */
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
interface MenuSection {
  name: string;
  items: MenuItem[];
}
export interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

/* ─── SVG Illustrations ─── */
const ILLUSTRATIONS: Record<string, React.ReactNode> = {
  hotCup: (
    <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M62 22 Q58 30 63 36 Q67 42 63 50" opacity=".55"/>
      <path d="M76 24 Q72 32 77 38 Q81 44 77 52" opacity=".55"/>
      <ellipse cx="70" cy="58" rx="29" ry="4"/>
      <path d="M41 58 Q41 96 70 96 Q99 96 99 58"/>
      <path d="M99 66 Q117 66 117 80 Q117 92 99 90"/>
      <ellipse cx="70" cy="105" rx="42" ry="5"/>
      <path d="M30 102 Q70 112 110 102"/>
    </svg>
  ),
  icedGlass: (
    <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="38" y1="22" x2="102" y2="22"/>
      <path d="M38 22 L46 122 Q46 126 50 126 L90 126 Q94 126 94 122 L102 22"/>
      <rect x="52" y="32" width="14" height="14" transform="rotate(8 59 39)"/>
      <rect x="72" y="38" width="13" height="13" transform="rotate(-12 78 44)"/>
      <rect x="58" y="54" width="13" height="13" transform="rotate(-5 64 60)"/>
      <rect x="76" y="62" width="12" height="12" transform="rotate(15 82 68)"/>
      <line x1="78" y1="10" x2="84" y2="118"/>
      <line x1="83" y1="10" x2="89" y2="118"/>
    </svg>
  ),
  frappe: (
    <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M44 38 Q48 28 56 32 Q60 22 70 28 Q76 22 84 30 Q92 28 96 38"/>
      <circle cx="78" cy="26" r="3"/>
      <line x1="78" y1="23" x2="80" y2="18"/>
      <path d="M44 38 L52 116 Q52 120 56 120 L84 120 Q88 120 88 116 L96 38"/>
      <path d="M50 64 Q60 60 70 64 Q80 68 90 64"/>
      <path d="M51 80 Q61 76 71 80 Q81 84 91 80"/>
      <line x1="68" y1="18" x2="74" y2="112"/>
      <line x1="73" y1="18" x2="79" y2="112"/>
      <line x1="60" y1="120" x2="56" y2="130"/>
      <line x1="80" y1="120" x2="84" y2="130"/>
      <line x1="50" y1="132" x2="90" y2="132"/>
    </svg>
  ),
  teaCup: (
    <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="62" cy="56" rx="26" ry="4"/>
      <path d="M36 56 Q36 88 62 88 Q88 88 88 56"/>
      <path d="M88 62 Q104 62 104 74 Q104 84 88 82"/>
      <ellipse cx="62" cy="100" rx="36" ry="4"/>
      <path d="M28 98 Q62 106 96 98"/>
      <path d="M58 38 Q54 44 58 50" opacity=".55"/>
      <path d="M68 36 Q64 42 68 48" opacity=".55"/>
    </svg>
  ),
  plate: (
    <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="70" cy="90" rx="50" ry="14"/>
      <ellipse cx="70" cy="86" rx="50" ry="14"/>
      <ellipse cx="70" cy="82" rx="40" ry="8" opacity=".4"/>
      <path d="M55 50 Q58 40 65 45 Q70 35 78 42 Q82 38 88 48"/>
      <path d="M52 54 Q70 68 90 52" opacity=".6"/>
      <path d="M60 60 Q70 72 82 58" opacity=".3"/>
    </svg>
  ),
  cake: (
    <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 90 L30 70 Q30 60 50 58 L90 58 Q110 60 110 70 L110 90"/>
      <path d="M26 90 Q26 100 70 100 Q114 100 114 90"/>
      <path d="M30 90 Q30 96 70 96 Q110 96 110 90"/>
      <ellipse cx="70" cy="58" rx="40" ry="5"/>
      <path d="M40 58 Q40 50 55 48 L85 48 Q100 50 100 58"/>
      <ellipse cx="70" cy="48" rx="30" ry="4"/>
      <line x1="60" y1="48" x2="60" y2="36"/>
      <path d="M57 36 Q60 30 63 36" />
      <line x1="70" y1="48" x2="70" y2="34"/>
      <path d="M67 34 Q70 28 73 34" />
      <line x1="80" y1="48" x2="80" y2="36"/>
      <path d="M77 36 Q80 30 83 36" />
    </svg>
  ),
  sandwich: (
    <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M25 75 Q70 30 115 75"/>
      <path d="M25 75 L25 85 Q70 95 115 85 L115 75"/>
      <path d="M30 75 Q70 55 110 75" opacity=".4"/>
      <path d="M28 80 Q50 72 70 76 Q90 80 112 74" opacity=".3"/>
      <ellipse cx="50" cy="68" rx="6" ry="3" opacity=".5"/>
      <ellipse cx="75" cy="64" rx="5" ry="3" opacity=".5"/>
      <ellipse cx="90" cy="70" rx="5" ry="2" opacity=".5"/>
      <path d="M25 85 L25 92 Q70 102 115 92 L115 85"/>
      <path d="M28 89 Q50 83 70 87 Q90 91 112 85" opacity=".4"/>
    </svg>
  ),
  juice: (
    <svg viewBox="0 0 140 140" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="70" cy="34" rx="22" ry="4"/>
      <path d="M48 34 L54 112 Q54 118 60 118 L80 118 Q86 118 86 112 L92 34"/>
      <path d="M52 56 Q62 52 72 56 Q82 60 92 56" opacity=".4"/>
      <circle cx="60" cy="18" r="8"/>
      <circle cx="78" cy="20" r="6"/>
      <line x1="66" y1="12" x2="68" y2="8"/>
      <path d="M56 14 Q52 10 48 14" />
    </svg>
  ),
};

/* ─── Section name → illustration mapping ─── */
const SECTION_ILLUS_MAP: [RegExp, string][] = [
  [/مشروبات ساخنة|قهوة|hot|coffee/, "hotCup"],
  [/مشروبات باردة|بارد|iced|cold/, "icedGlass"],
  [/فرابي|فرابه|سموذي|مخفوق|blend|frappe/, "frappe"],
  [/شاي|tea/, "teaCup"],
  [/عصير|عصائر|juice/, "juice"],
  [/حلويات|كيك|تورت|dessert|sweet|cake/, "cake"],
  [/ساندويش|سندويش|برجر|شاورما|sandwich|burger/, "sandwich"],
  [/وجبات|أطباق|مقبلات|رئيسي|main|plate|food/, "plate"],
];

function getIllustrationForSection(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [pattern, key] of SECTION_ILLUS_MAP) {
    if (pattern.test(lower)) return key;
  }
  return null;
}

/* ─── Flag reasons ─── */
const FLAG_REASONS = [
  { value: "wrong_price", label: "السعر غلط" },
  { value: "not_available", label: "غير متوفر" },
  { value: "wrong_info", label: "معلومات خاطئة" },
  { value: "other", label: "اخرى" },
];

/* ─── Main Component ─── */
export function CafeMenu({
  place,
  cart,
  onAddToCart,
  onUpdateQty,
}: {
  place: Place;
  cart?: Map<string, CartItem>;
  onAddToCart?: (item: MenuItem) => void;
  onUpdateQty?: (id: string, delta: number) => void;
}) {
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Flag state
  const [flagItem, setFlagItem] = useState<MenuItem | null>(null);
  const [flagReason, setFlagReason] = useState("wrong_price");
  const [flagCorrectPrice, setFlagCorrectPrice] = useState("");
  const [flagNote, setFlagNote] = useState("");
  const [flagPhoto, setFlagPhoto] = useState<string | null>(null);
  const [flagUploading, setFlagUploading] = useState(false);
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagDone, setFlagDone] = useState(false);
  const [flagError, setFlagError] = useState("");

  function openFlag(item: MenuItem) {
    setFlagItem(item);
    setFlagReason("wrong_price");
    setFlagCorrectPrice("");
    setFlagNote("");
    setFlagPhoto(null);
    setFlagDone(false);
    setFlagError("");
  }

  async function handleFlagPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFlagError("الحد الاقصى 5 ميجابايت"); return; }
    setFlagUploading(true);
    setFlagError("");
    try {
      const url = await uploadReceiptPhoto(file);
      setFlagPhoto(url);
    } catch { setFlagError("فشل رفع الصورة"); }
    setFlagUploading(false);
  }

  async function submitFlag() {
    if (!flagItem?.id) return;
    setFlagSubmitting(true);
    setFlagError("");
    try {
      const res = await apiFetch(`/api/places/${place.id}/menu/${flagItem.id}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: flagReason,
          correct_price: flagCorrectPrice ? Number(flagCorrectPrice) : undefined,
          proof_photo_url: flagPhoto || undefined,
          note: flagNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setFlagDone(true);
      setTimeout(() => setFlagItem(null), 1500);
    } catch {
      setFlagError("حدث خطا، حاول مرة اخرى");
    }
    setFlagSubmitting(false);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/places/${place.id}/menu?no_cache=1&_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setMenuSections(data.data || data || []);
        }
      } catch {}
      setLoading(false);
    })();
  }, [place.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-olive border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (menuSections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-mist">لا توجد قائمة اسعار بعد</p>
      </div>
    );
  }

  return (
    <>
      {/* ── The Menu Paper ── */}
      <div className="relative bg-[#F6F3EB] rounded-sm shadow-[0_30px_60px_-30px_rgba(60,55,30,0.25),0_6px_18px_-8px_rgba(60,55,30,0.15)] px-6 sm:px-12 md:px-16 py-12 sm:py-16" dir="rtl">
        {/* Wavy border */}
        <svg className="absolute inset-[14px] w-[calc(100%-28px)] h-[calc(100%-28px)] pointer-events-none z-[1] overflow-visible" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="wavy-menu-edge">
              <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="2" seed="6"/>
              <feDisplacementMap in="SourceGraphic" scale="14"/>
            </filter>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#4A7C59" strokeWidth="1.4" vectorEffect="non-scaling-stroke" filter="url(#wavy-menu-edge)" rx="6" ry="6"/>
        </svg>

        {/* Content */}
        <div className="relative z-[2]">
          {/* Title */}
          <h2 className="text-center font-display font-black text-3xl sm:text-4xl md:text-5xl text-olive mb-10 sm:mb-14">
            {place.name}
          </h2>

          {/* Missing prices notice */}
          {menuSections.some((sec) => sec.items.some((item) => Number(item.price) === 0)) && (
            <div className="text-center text-[11px] text-olive/50 mb-8 border-b border-olive/10 pb-4">
              بعض الاسعار لم تضف بعد من صاحب المحل
            </div>
          )}

          {/* Sections */}
          {menuSections.map((sec, secIdx) => {
            const illusKey = getIllustrationForSection(sec.name);
            const illus = illusKey ? ILLUSTRATIONS[illusKey] : null;
            const side = secIdx % 2 === 0 ? "right" : "left";

            return (
              <div key={sec.name} className={`mb-10 sm:mb-14 last:mb-0 ${illus ? "grid gap-6 sm:gap-8 items-center" : ""}`}
                style={illus ? { gridTemplateColumns: side === "right" ? "1fr 120px" : "120px 1fr" } : undefined}
              >
                {/* Items */}
                <div className={illus && side === "left" ? "order-2" : ""}>
                  <h3 className="font-display font-bold text-[11px] sm:text-xs tracking-[0.2em] text-olive mb-5 sm:mb-6 uppercase">
                    {sec.name}
                  </h3>
                  <div className="space-y-2.5 sm:space-y-3">
                    {sec.items.map((item, idx) => {
                      const canOrder = onAddToCart && item.available && Number(item.price) > 0 && item.id;
                      const inCart = cart?.get(item.id!);
                      return (
                        <div key={item.id || `${item.name}-${idx}`} className={`group ${!item.available ? "opacity-40" : ""}`}>
                          <div className="flex items-end">
                            <span className="font-mono text-[12px] sm:text-[13px] tracking-[0.1em] text-olive whitespace-nowrap">
                              {item.name}
                            </span>
                            {/* Dotted leader */}
                            {item.available && Number(item.price) > 0 && (
                              <span className="flex-1 mx-2 h-[1em] relative top-[-2px]" style={{
                                backgroundImage: "radial-gradient(circle at center, #4A7C59 1px, transparent 1.3px)",
                                backgroundSize: "7px 100%",
                                backgroundRepeat: "repeat-x",
                                backgroundPosition: "0 bottom",
                              }} />
                            )}
                            {/* Price + actions */}
                            <span className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                              {item.available && Number(item.price) > 0 ? (
                                <span className="font-mono text-[12px] sm:text-[13px] tracking-[0.1em] text-olive font-medium">
                                  {item.price} <span className="text-[9px] text-olive/50">&#x20AA;</span>
                                </span>
                              ) : item.available ? (
                                <span className="text-[11px] text-olive/30">--</span>
                              ) : null}
                              {canOrder && !inCart && (
                                <button onClick={() => onAddToCart(item)} className="w-5 h-5 rounded-full bg-olive text-white flex items-center justify-center text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity">+</button>
                              )}
                              {canOrder && inCart && onUpdateQty && (
                                <span className="flex items-center gap-1 text-[11px]">
                                  <button onClick={() => onUpdateQty(item.id!, -1)} className="w-5 h-5 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xs leading-none">-</button>
                                  <span className="font-bold text-olive min-w-[14px] text-center">{inCart.quantity}</span>
                                  <button onClick={() => onUpdateQty(item.id!, 1)} className="w-5 h-5 rounded-full bg-olive-pale text-olive flex items-center justify-center text-xs leading-none">+</button>
                                </span>
                              )}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-olive/40 mt-0.5 pr-1">{item.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Illustration */}
                {illus && (
                  <div className={`text-olive hidden sm:block ${side === "left" ? "order-1" : ""}`}>
                    {illus}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Flag Modal ── */}
      {flagItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !flagSubmitting && setFlagItem(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.2)]" dir="rtl">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-display font-bold text-[14px] text-ink">ابلاغ عن سعر خاطئ</h3>
                <p className="text-[11px] text-mist mt-0.5">{flagItem.name}{Number(flagItem.price) > 0 ? ` -- ${flagItem.price} ` + String.fromCharCode(0x20AA) : ""}</p>
              </div>
              <button onClick={() => !flagSubmitting && setFlagItem(null)} className="text-mist hover:text-ink p-1 text-lg leading-none">x</button>
            </div>
            <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1">
              <div className="flex flex-wrap gap-2">
                {FLAG_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setFlagReason(r.value)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${flagReason === r.value ? "bg-olive text-white border-olive" : "bg-fog text-ink border-border"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {flagReason === "wrong_price" && (
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={"السعر الصحيح (" + String.fromCharCode(0x20AA) + ")"}
                  value={flagCorrectPrice}
                  onChange={(e) => setFlagCorrectPrice(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-[13px] text-ink bg-fog focus:outline-none focus:border-olive"
                  dir="rtl"
                />
              )}
              <textarea
                placeholder="ملاحظة اضافية (اختياري)"
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-[13px] text-ink bg-fog focus:outline-none focus:border-olive resize-none h-[60px]"
                dir="rtl"
              />
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-[12px] text-mist hover:text-ink transition-colors">
                  {flagPhoto ? "تم الرفع" : flagUploading ? "جاري الرفع..." : "ارفق صورة (اختياري)"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFlagPhoto} disabled={flagUploading} />
                </label>
              </div>
              {flagError && <p className="text-[12px] text-red-500">{flagError}</p>}
              {flagDone ? (
                <div className="text-center py-2 text-[13px] font-bold text-olive">تم الابلاغ بنجاح</div>
              ) : (
                <button
                  onClick={submitFlag}
                  disabled={flagSubmitting}
                  className="w-full bg-olive text-white font-display font-bold text-[13px] py-2.5 rounded-xl disabled:opacity-50"
                >
                  {flagSubmitting ? "جاري الارسال..." : "ارسال البلاغ"}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
