/** Custom SVG food icons — consistent monoline style, olive-themed */

const S = { fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function I({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className || 'w-7 h-7'} style={{ stroke: 'currentColor', ...S }}>
      {children}
    </svg>
  );
}

export const FoodIcon = {
  coffee: (c?: string) => (
    <I className={c}>
      <path d="M10 14h16v10a6 6 0 01-6 6h-4a6 6 0 01-6-6V14z"/>
      <path d="M26 17h2a3 3 0 010 6h-2"/>
      <path d="M14 8c0-2 2-2 2-4"/><path d="M18 8c0-2 2-2 2-4"/><path d="M22 8c0-2 2-2 2-4"/>
    </I>
  ),
  tea: (c?: string) => (
    <I className={c}>
      <path d="M12 16h14v8a6 6 0 01-6 6h-2a6 6 0 01-6-6v-8z"/>
      <path d="M26 19h2a3 3 0 010 6h-2"/>
      <path d="M17 10l2-3h2l2 3"/>
    </I>
  ),
  juice: (c?: string) => (
    <I className={c}>
      <path d="M14 10h12l-2 20h-8l-2-20z"/>
      <line x1="20" y1="6" x2="20" y2="10"/>
      <circle cx="20" cy="5" r="1"/>
      <path d="M16 18c2 2 6-2 8 0"/>
    </I>
  ),
  cake: (c?: string) => (
    <I className={c}>
      <path d="M8 20h24v6a2 2 0 01-2 2H10a2 2 0 01-2-2v-6z"/>
      <path d="M10 20v-4a2 2 0 012-2h16a2 2 0 012 2v4"/>
      <path d="M16 14v-2a2 2 0 114 0v2"/><circle cx="18" cy="9" r="1" fill="currentColor" strokeWidth="0"/>
    </I>
  ),
  icecream: (c?: string) => (
    <I className={c}>
      <path d="M16 22l4 10 4-10"/>
      <path d="M12 16a8 8 0 0116 0"/>
      <path d="M12 16c0 3.3 3.6 6 8 6s8-2.7 8-6"/>
      <circle cx="20" cy="13" r="2"/>
    </I>
  ),
  dessert: (c?: string) => (
    <I className={c}>
      <ellipse cx="20" cy="22" rx="10" ry="4"/>
      <path d="M10 22v4c0 2.2 4.5 4 10 4s10-1.8 10-4v-4"/>
      <path d="M14 22c0-6 12-6 12 0"/>
      <path d="M18 16c0-3 4-3 4 0"/>
    </I>
  ),
  waffle: (c?: string) => (
    <I className={c}>
      <rect x="9" y="9" width="22" height="22" rx="3"/>
      <line x1="9" y1="16.3" x2="31" y2="16.3"/>
      <line x1="9" y1="23.7" x2="31" y2="23.7"/>
      <line x1="16.3" y1="9" x2="16.3" y2="31"/>
      <line x1="23.7" y1="9" x2="23.7" y2="31"/>
    </I>
  ),
  crepe: (c?: string) => (
    <I className={c}>
      <path d="M8 28l12-18 12 18z"/>
      <path d="M14 28l6-9 6 9"/>
      <circle cx="20" cy="24" r="1.5" fill="currentColor" strokeWidth="0"/>
    </I>
  ),
  donut: (c?: string) => (
    <I className={c}>
      <ellipse cx="20" cy="20" rx="11" ry="9"/>
      <ellipse cx="20" cy="20" rx="4" ry="3"/>
      <path d="M9 18c1-5 5-7 11-7s10 2 11 7" style={{strokeDasharray: '3 2'}}/>
    </I>
  ),
  shawarma: (c?: string) => (
    <I className={c}>
      <path d="M10 30c0-12 4-20 10-20s10 8 10 20"/>
      <path d="M13 22c2 1 5 1 7 0s5-1 7 0"/>
      <path d="M14 16c2 1 4 1 6 0s4-1 6 0"/>
      <ellipse cx="20" cy="30" rx="10" ry="2"/>
    </I>
  ),
  burger: (c?: string) => (
    <I className={c}>
      <path d="M8 18h24"/>
      <path d="M8 18c0-6 5.4-10 12-10s12 4 12 10"/>
      <path d="M9 22h22"/>
      <path d="M10 26h20a2 2 0 002-2H8a2 2 0 002 2z"/>
      <path d="M8 18v4"/>
      <path d="M32 18v4"/>
    </I>
  ),
  pizza: (c?: string) => (
    <I className={c}>
      <path d="M20 6L6 32h28L20 6z"/>
      <path d="M12 24c3-1 5 1 8 0s5 1 8 0"/>
      <circle cx="18" cy="18" r="1.5" fill="currentColor" strokeWidth="0"/>
      <circle cx="22" cy="22" r="1.5" fill="currentColor" strokeWidth="0"/>
      <circle cx="16" cy="24" r="1" fill="currentColor" strokeWidth="0"/>
    </I>
  ),
  falafel: (c?: string) => (
    <I className={c}>
      <circle cx="20" cy="16" r="6"/>
      <circle cx="20" cy="16" r="2.5"/>
      <circle cx="12" cy="26" r="4"/>
      <circle cx="20" cy="28" r="4"/>
      <circle cx="28" cy="26" r="4"/>
    </I>
  ),
  grill: (c?: string) => (
    <I className={c}>
      <path d="M8 20h24"/><path d="M10 24h20"/><path d="M12 28h16"/>
      <line x1="14" y1="20" x2="14" y2="28"/>
      <line x1="20" y1="20" x2="20" y2="28"/>
      <line x1="26" y1="20" x2="26" y2="28"/>
      <path d="M14 14c0-3 2-3 2-6"/><path d="M20 14c0-3 2-3 2-6"/><path d="M26 14c0-3 2-3 2-6"/>
    </I>
  ),
  chicken: (c?: string) => (
    <I className={c}>
      <path d="M16 30l-2-8c-3-1-5-4-5-8a9 9 0 0118 0c0 4-2 7-5 8l-2 8z"/>
      <path d="M16 30h8"/>
      <circle cx="17" cy="13" r="1" fill="currentColor" strokeWidth="0"/>
      <path d="M24 10c2-2 4-1 4 1"/>
    </I>
  ),
  fish: (c?: string) => (
    <I className={c}>
      <path d="M6 20c4-8 12-10 20-7l4-3v20l-4-3c-8 3-16 1-20-7z"/>
      <circle cx="27" cy="18" r="1.5" fill="currentColor" strokeWidth="0"/>
      <path d="M14 16c3 2 3 6 0 8"/>
    </I>
  ),
  pasta: (c?: string) => (
    <I className={c}>
      <path d="M8 22c0 5 5.4 8 12 8s12-3 12-8"/>
      <path d="M8 22h24"/>
      <path d="M14 22c-2-6 1-12 6-14"/>
      <path d="M20 8c5 2 8 8 6 14"/>
      <path d="M17 22c0-4 2-8 5-10"/>
    </I>
  ),
  rice: (c?: string) => (
    <I className={c}>
      <path d="M8 18h24v2c0 6-5.4 10-12 10S8 26 8 20v-2z"/>
      <path d="M8 18c0-3 5.4-5 12-5s12 2 12 5"/>
      <ellipse cx="16" cy="22" rx="1.5" ry="1" fill="currentColor" strokeWidth="0"/>
      <ellipse cx="21" cy="20" rx="1.5" ry="1" fill="currentColor" strokeWidth="0"/>
      <ellipse cx="24" cy="24" rx="1.5" ry="1" fill="currentColor" strokeWidth="0"/>
    </I>
  ),
  sandwich: (c?: string) => (
    <I className={c}>
      <path d="M6 22h28l-4 6H10l-4-6z"/>
      <path d="M6 22c0-6 6.3-10 14-10s14 4 14 10"/>
      <path d="M10 22c1-1 4 0 6-1s4 1 6 0 4-1 6 0"/>
    </I>
  ),
  salad: (c?: string) => (
    <I className={c}>
      <path d="M8 20c0 6 5.4 10 12 10s12-4 12-10H8z"/>
      <path d="M6 20h28"/>
      <path d="M16 14c-2-3 0-6 3-5"/>
      <path d="M19 9c2-2 5 0 4 3"/>
      <path d="M23 12c2-1 4 1 3 3"/>
      <circle cx="14" cy="24" r="1.5" fill="currentColor" strokeWidth="0"/>
      <circle cx="22" cy="22" r="1" fill="currentColor" strokeWidth="0"/>
    </I>
  ),
  fries: (c?: string) => (
    <I className={c}>
      <path d="M12 18l-2 14h20l-2-14z"/>
      <path d="M10 18h20c0-2-4-3-10-3s-10 1-10 3z"/>
      <line x1="16" y1="12" x2="15" y2="18"/>
      <line x1="20" y1="10" x2="20" y2="18"/>
      <line x1="24" y1="11" x2="24" y2="18"/>
      <line x1="18" y1="13" x2="17" y2="18"/>
      <line x1="22" y1="12" x2="23" y2="18"/>
    </I>
  ),
  soup: (c?: string) => (
    <I className={c}>
      <path d="M8 18h24v2c0 6-5.4 10-12 10S8 26 8 20v-2z"/>
      <path d="M6 18h28"/>
      <path d="M14 12c0-2 2-2 2-4"/><path d="M20 12c0-2 2-2 2-4"/><path d="M26 12c0-2 2-2 2-4"/>
    </I>
  ),
  egg: (c?: string) => (
    <I className={c}>
      <ellipse cx="20" cy="22" rx="12" ry="8"/>
      <circle cx="20" cy="22" r="4" fill="currentColor" strokeWidth="0" opacity="0.2"/>
      <circle cx="20" cy="22" r="2" fill="currentColor" strokeWidth="0" opacity="0.4"/>
    </I>
  ),
  bread: (c?: string) => (
    <I className={c}>
      <ellipse cx="20" cy="20" rx="13" ry="10"/>
      <path d="M12 18c3 1 5 0 8-1s5 0 8 1"/>
      <circle cx="16" cy="22" r="1" fill="currentColor" strokeWidth="0"/>
      <circle cx="22" cy="24" r="1" fill="currentColor" strokeWidth="0"/>
      <circle cx="20" cy="20" r="0.8" fill="currentColor" strokeWidth="0"/>
    </I>
  ),
  soda: (c?: string) => (
    <I className={c}>
      <rect x="13" y="10" width="14" height="22" rx="3"/>
      <path d="M13 16h14"/>
      <path d="M13 26h14"/>
      <path d="M18 6l-2 4"/><path d="M22 6l2 4"/>
    </I>
  ),
  beans: (c?: string) => (
    <I className={c}>
      <path d="M8 20c0 5 5.4 8 12 8s12-3 12-8"/>
      <ellipse cx="20" cy="20" rx="12" ry="5"/>
      <ellipse cx="16" cy="19" rx="2.5" ry="1.5" fill="currentColor" strokeWidth="0" opacity="0.25"/>
      <ellipse cx="22" cy="18" rx="2" ry="1.5" fill="currentColor" strokeWidth="0" opacity="0.25"/>
      <ellipse cx="19" cy="22" rx="2.5" ry="1.5" fill="currentColor" strokeWidth="0" opacity="0.25"/>
    </I>
  ),
  sweets: (c?: string) => (
    <I className={c}>
      <rect x="10" y="14" width="20" height="14" rx="3"/>
      <path d="M10 20h20"/>
      <path d="M16 14v-4l4 2-4 2"/><path d="M24 14v-4l-4 2 4 2"/>
      <circle cx="15" cy="24" r="1" fill="currentColor" strokeWidth="0"/>
      <circle cx="20" cy="17" r="1" fill="currentColor" strokeWidth="0"/>
      <circle cx="25" cy="24" r="1" fill="currentColor" strokeWidth="0"/>
    </I>
  ),
  cookie: (c?: string) => (
    <I className={c}>
      <circle cx="20" cy="20" r="10"/>
      <circle cx="16" cy="17" r="1.5" fill="currentColor" strokeWidth="0"/>
      <circle cx="22" cy="15" r="1.2" fill="currentColor" strokeWidth="0"/>
      <circle cx="18" cy="23" r="1.3" fill="currentColor" strokeWidth="0"/>
      <circle cx="24" cy="22" r="1.5" fill="currentColor" strokeWidth="0"/>
      <circle cx="14" cy="22" r="1" fill="currentColor" strokeWidth="0"/>
    </I>
  ),
  milkshake: (c?: string) => (
    <I className={c}>
      <path d="M13 14h14l-2 16h-10l-2-16z"/>
      <path d="M11 14h18"/>
      <path d="M16 10c1-3 4-3 4-3s3 0 4 3"/>
      <circle cx="20" cy="8" r="1.5"/>
      <path d="M17 20c2 1 4 1 6 0"/>
    </I>
  ),
  plate: (c?: string) => (
    <I className={c}>
      <ellipse cx="20" cy="22" rx="13" ry="8"/>
      <ellipse cx="20" cy="22" rx="8" ry="5"/>
      <path d="M16 12l-1-6"/><path d="M20 11v-6"/><path d="M24 12l1-6"/>
    </I>
  ),
};

/** Map Arabic item name → icon key */
const ITEM_ICON_MAP: [RegExp, keyof typeof FoodIcon][] = [
  [/قهوة|كابتشينو|لاتيه|اسبرسو|موكا|أمريكان|تركي|قهوه/, 'coffee'],
  [/شاي|شاى/, 'tea'],
  [/عصير|سموذي|كوكتيل|ليمون/, 'juice'],
  [/كيك|كعك|تورت|بان كيك/, 'cake'],
  [/تشيز/, 'cake'],
  [/شوكولا|نوتيلا/, 'sweets'],
  [/بوظة|آيس كريم|ايس كريم|جيلاتو/, 'icecream'],
  [/كنافة|كنافه|قشطوطة|قشطة|نابلسية/, 'dessert'],
  [/وافل/, 'waffle'],
  [/كريب/, 'crepe'],
  [/دونات/, 'donut'],
  [/شاورما|شاورمة/, 'shawarma'],
  [/برجر|بيرغر|همبرجر/, 'burger'],
  [/بيتزا/, 'pizza'],
  [/فلافل|طعمية|حمص|مسبحة/, 'falafel'],
  [/مشوي|مشاوي|كباب|كفت|شيش|ستيك|لحم/, 'grill'],
  [/دجاج|فراخ|تشكن/, 'chicken'],
  [/سمك|جمبري/, 'fish'],
  [/فوتشيني|معكرونة|باستا|مكرونة|سباغيت|بيني|فيتوتشيني/, 'pasta'],
  [/أرز|رز/, 'rice'],
  [/ساندويش|سندويش|توست|خبز|راب/, 'sandwich'],
  [/سلطة|فتوش|تبولة/, 'salad'],
  [/بطاطا|بطاطس|فرايز/, 'fries'],
  [/شوربة|حساء/, 'soup'],
  [/فطور|إفطار|بيض|شكشوك/, 'egg'],
  [/مناقيش|زعتر|فطيرة/, 'bread'],
  [/بيبسي|كولا|غازي|سفن|سبرايت|موهيتو/, 'soda'],
  [/فول/, 'beans'],
  [/حلو|بقلاو|معمول|بسبوس|هريسة/, 'sweets'],
  [/بسكوت|كوكيز/, 'cookie'],
  [/سان سبيستيان|باسك/, 'cake'],
  [/ميلك شيك|ميلكشيك|شيك/, 'milkshake'],
  [/موز|فراولة|توت|مانجو|مانجا/, 'juice'],
];

/** Map Arabic section/category names (plurals) → icon key */
const SECTION_ICON_MAP: [RegExp, keyof typeof FoodIcon][] = [
  [/مشروبات|مشاريب|عصائر|عصاير/, 'juice'],
  [/قهوة|قهاوي|مشروبات ساخنة/, 'coffee'],
  [/سلطات/, 'salad'],
  [/شوربات|شوربة/, 'soup'],
  [/مقبلات|مقبل/, 'falafel'],
  [/ساندويشات|سندويشات|ساندوتشات/, 'sandwich'],
  [/بيتزا/, 'pizza'],
  [/برجر|برغر/, 'burger'],
  [/شاورما|شاورمة/, 'shawarma'],
  [/مشاوي|مشويات/, 'grill'],
  [/دجاج|فراخ/, 'chicken'],
  [/أسماك|سمك/, 'fish'],
  [/معكرونات|باستا/, 'pasta'],
  [/أرز|رز|أطباق رئيسية|وجبات/, 'rice'],
  [/حلويات|حلا|تحلية/, 'dessert'],
  [/كيكات|كيك/, 'cake'],
  [/فطور|إفطار/, 'egg'],
  [/خبز|مناقيش|معجنات|فطائر/, 'bread'],
  [/بطاطا|بطاطس/, 'fries'],
  [/فول|حبوب/, 'beans'],
  [/مثلجات|بوظة|آيس كريم/, 'icecream'],
  [/وافل/, 'waffle'],
  [/كريب/, 'crepe'],
  [/إضافات|صوصات|صلصات|توابل/, 'plate'],
];

/** Get the icon render function for an Arabic food name */
export function getItemIcon(name: string): (className?: string) => React.JSX.Element {
  for (const [pattern, key] of ITEM_ICON_MAP) {
    if (pattern.test(name)) return FoodIcon[key];
  }
  for (const [pattern, key] of SECTION_ICON_MAP) {
    if (pattern.test(name)) return FoodIcon[key];
  }
  return FoodIcon.plate;
}

/** List of subtle background colors to cycle through */
const ICON_BG_COLORS = [
  '#FFF0F5', '#FFF8E8', '#E8F5EE', '#EEF2FF', '#FEF0EB',
  '#F5F3FF', '#ECFDF5', '#FEF3C7', '#FCE7F3', '#E0F2FE',
];

/** Get a consistent background color for an item based on its name */
export function getItemBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return ICON_BG_COLORS[Math.abs(hash) % ICON_BG_COLORS.length];
}
