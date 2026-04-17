/**
 * Demo listings data + persist saved state in localStorage.
 * Real listings use the API; demo listings only exist client-side.
 */

import type { Listing } from "@/lib/queries/fetchers";

const KEY = "gaza_price_demo_saved";

export function getDemoSavedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function toggleDemoSaved(id: string): boolean {
  const ids = getDemoSavedIds();
  const next = !ids.has(id);
  if (next) ids.add(id); else ids.delete(id);
  localStorage.setItem(KEY, JSON.stringify([...ids]));
  return next;
}

/** Get demo listings that the user has saved. */
export function getSavedDemoListings(): Listing[] {
  const ids = getDemoSavedIds();
  return DEMO_LISTINGS.filter((l) => ids.has(l.id));
}

export const DEMO_LISTINGS: Listing[] = [
  {
    id: "demo-1", seller_id: "demo", seller: { id: "demo", display_handle: "أبو أحمد" },
    title: "جوال Samsung Galaxy A14 جديد بالكرتونة",
    description: "جوال سامسونج A14 جديد لم يفتح، مع ضمان سنة. شاشة 6.6 بوصة، رام 4GB، ذاكرة 64GB.",
    price: 450, category: "electronics", condition: "new",
    area_id: null, area: { name_ar: "دير البلح", id: "deir-balah" },
    is_negotiable: true, whatsapp: null, phone: null,
    images: [{ id: "img-1", url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-2", seller_id: "demo", seller: { id: "demo", display_handle: "محمد" },
    title: "طقم كنب 3 قطع حالة ممتازة",
    description: "كنب مستعمل بحالة نظيفة جداً، 3+2+1، لون بيج. السعر قابل للتفاوض.",
    price: 800, category: "furniture", condition: "used",
    area_id: null, area: { name_ar: "خان يونس", id: "khan-younis" },
    is_negotiable: true, whatsapp: null, phone: null,
    images: [{ id: "img-2", url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-3", seller_id: "demo", seller: { id: "demo", display_handle: "أم عمر" },
    title: "ملابس أطفال شتوية (3-5 سنوات) — 12 قطعة",
    description: "طقم ملابس شتوية للأطفال، بحالة ممتازة، غسيل قليل. جاكيتات وبناطيل وبلوزات.",
    price: 120, category: "clothes", condition: "used",
    area_id: null, area: { name_ar: "النصيرات", id: "nuseirat" },
    is_negotiable: false, whatsapp: null, phone: null,
    images: [{ id: "img-3", url: "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-4", seller_id: "demo", seller: { id: "demo", display_handle: "أبو يوسف" },
    title: "بطارية سيارة 70 أمبير جديدة",
    description: "بطارية 70 أمبير أصلية مع ضمان 6 أشهر. توصيل داخل الوسطى مجاناً.",
    price: 280, category: "tools", condition: "new",
    area_id: null, area: { name_ar: "المغازي", id: "maghazi" },
    is_negotiable: false, whatsapp: null, phone: null,
    images: [{ id: "img-4", url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-5", seller_id: "demo", seller: { id: "demo", display_handle: "سارة" },
    title: "كتب تحصيلي وتوجيهي — الفرع العلمي كاملة",
    description: "جميع كتب التوجيهي العلمي مع ملخصات وأسئلة سنوات سابقة. حالة ممتازة.",
    price: 60, category: "books", condition: "used",
    area_id: null, area: { name_ar: "رفح", id: "rafah" },
    is_negotiable: true, whatsapp: null, phone: null,
    images: [{ id: "img-5", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-6", seller_id: "demo", seller: { id: "demo", display_handle: "خالد" },
    title: "شاحن سولار 50 واط مع بطارية",
    description: "لوح طاقة شمسية 50 واط + بطارية ليثيوم 20000mAh + منظم شحن. مثالي للخيمة.",
    price: 350, category: "electronics", condition: "new",
    area_id: null, area: { name_ar: "المواصي", id: "mawasi" },
    is_negotiable: true, whatsapp: null, phone: null,
    images: [{ id: "img-6", url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-7", seller_id: "demo", seller: { id: "demo", display_handle: "أبو محمد" },
    title: "غاز طبخ (بابور) حالة ممتازة",
    description: "بابور غاز مستعمل بحالة ممتازة، شعلتين، مع خرطوم جديد.",
    price: 150, category: "tools", condition: "used",
    area_id: null, area: { name_ar: "البريج", id: "bureij" },
    is_negotiable: true, whatsapp: null, phone: null,
    images: [{ id: "img-7", url: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-8", seller_id: "demo", seller: { id: "demo", display_handle: "فاطمة" },
    title: "ماكينة خياطة يدوية صغيرة",
    description: "ماكينة خياطة يدوية محمولة، تعمل ببطاريات، مناسبة للإصلاحات السريعة.",
    price: 40, category: "tools", condition: "new",
    area_id: null, area: { name_ar: "دير البلح", id: "deir-balah" },
    is_negotiable: false, whatsapp: null, phone: null,
    images: [{ id: "img-8", url: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-9", seller_id: "demo", seller: { id: "demo", display_handle: "عمر" },
    title: "عربة أطفال + كرسي سيارة — ماركة Graco",
    description: "عربة أطفال مع كرسي سيارة متوافق، ماركة Graco، استخدام 6 أشهر فقط. نظيفة جداً.",
    price: 200, category: "toys", condition: "used",
    area_id: null, area: { name_ar: "خان يونس", id: "khan-younis" },
    is_negotiable: true, whatsapp: null, phone: null,
    images: [{ id: "img-9", url: "https://images.unsplash.com/photo-1586048956606-16a4c38d23e4?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 40).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-10", seller_id: "demo", seller: { id: "demo", display_handle: "أحمد" },
    title: "طحين 25 كيلو — سعر الجملة",
    description: "طحين أبيض 25 كغ، إنتاج حديث. متوفر كميات. التوصيل حسب الاتفاق.",
    price: 95, category: "food", condition: "new",
    area_id: null, area: { name_ar: "النصيرات", id: "nuseirat" },
    is_negotiable: false, whatsapp: null, phone: null,
    images: [{ id: "img-10", url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-11", seller_id: "demo", seller: { id: "demo", display_handle: "يوسف" },
    title: "لابتوب HP EliteBook i5 — مستعمل نظيف",
    description: "HP EliteBook 840 G5, معالج i5 الجيل الثامن, رام 8GB, SSD 256GB. بطارية ممتازة.",
    price: 700, category: "electronics", condition: "used",
    area_id: null, area: { name_ar: "دير البلح", id: "deir-balah" },
    is_negotiable: true, whatsapp: null, phone: null,
    images: [{ id: "img-11", url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 55).toISOString(),
    status: "active", is_demo: true,
  },
  {
    id: "demo-12", seller_id: "demo", seller: { id: "demo", display_handle: "نور" },
    title: "فستان سهرة مقاس M — جديد لم يُلبس",
    description: "فستان سهرة أنيق، لون كحلي غامق، مقاس M، مع حزام. مناسب للمناسبات.",
    price: 180, category: "clothes", condition: "new",
    area_id: null, area: { name_ar: "رفح", id: "rafah" },
    is_negotiable: false, whatsapp: null, phone: null,
    images: [{ id: "img-12", url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=300&fit=crop", sort_order: 0 }],
    created_at: new Date(Date.now() - 3600000 * 60).toISOString(),
    status: "active", is_demo: true,
  },
];
