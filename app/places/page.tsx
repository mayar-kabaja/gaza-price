'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { useArea } from '@/hooks/useArea';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useAreas, usePlaces, usePlacesSearch } from '@/lib/queries/hooks';
import { apiFetch } from '@/lib/api/fetch';
import { uploadReceiptPhoto } from '@/lib/api/upload';
import type { Place, MatchedItem } from '@/lib/api/places';
import type { Area } from '@/types/app';
import { cn } from '@/lib/utils';

const DesktopHeader = dynamic(() => import("@/components/desktop/DesktopHeader").then(m => ({ default: m.DesktopHeader })), { ssr: false });
const DesktopSubmitModal = dynamic(() => import("@/components/desktop/DesktopSubmitModal").then(m => ({ default: m.DesktopSubmitModal })), { ssr: false });
const DesktopSuggestModal = dynamic(() => import("@/components/desktop/DesktopSuggestModal").then(m => ({ default: m.DesktopSuggestModal })), { ssr: false });

type Section = 'food' | 'store' | 'workspace';

const PAGE_SIZE = 20;

const FOOD_CHIPS = ['الكل', 'مطعم وكافيه', 'مطاعم', 'كافيه', 'مفتوح'];
const STORE_CHIPS = ['الكل', 'غذائية', 'صحة', 'ملابس', 'منزل', 'إلكترونيات', 'بناء', 'تعليم', 'خدمات', 'سيارات', 'زراعة', 'مفتوح'];
const WORKSPACE_CHIPS = ['الكل', 'مفتوح'];

// Map chip labels to DB type values for filtering
const CHIP_TO_TYPE: Record<string, string | string[]> = {
  'مطاعم': ['restaurant', 'مطعم'],
  'كافيه': ['cafe', 'كافيه', 'مقهى'],
  'مطعم وكافيه': ['both', 'مطعم وكافيه'],
  'غذائية': ['بقالية عامة', 'سوبرماركت', 'خضار وفواكه', 'لحوم', 'سمك', 'مخبز', 'حلويات ومعجنات', 'بهارات وتوابل'],
  'صحة': ['صيدلية', 'عيادة وطب', 'مستلزمات طبية', 'بصريات'],
  'ملابس': ['ملابس رجالي', 'ملابس حريمي', 'ملابس أطفال', 'أحذية', 'إكسسوارات', 'خياطة وتعديل'],
  'منزل': ['أثاث منزلي', 'مفروشات وستائر', 'أدوات منزلية', 'كهرباء ولوازم منزلية', 'نظافة ومنظفات', 'أدوات صحية وسباكة'],
  'إلكترونيات': ['موبايل وإكسسوارات', 'كمبيوتر ولاب توب', 'كهربائيات', 'طاقة شمسية', 'إصلاح وصيانة'],
  'بناء': ['مواد بناء', 'حديد وألمنيوم', 'دهانات وديكور', 'أخشاب', 'سيراميك وبلاط'],
  'تعليم': ['مكتبة وقرطاسية', 'ألعاب أطفال', 'أدوات رسم وفنون'],
  'خدمات': ['حلاقة وصالون', 'عطور وكوزمتيك', 'تصوير'],
  'سيارات': ['قطع غيار سيارات', 'كراج وميكانيك', 'إطارات'],
  'زراعة': ['مستلزمات زراعية', 'علف وبيطري', 'أخرى'],
};

const GOV_LABELS: Record<string, string> = {
  north: 'شمال غزة',
  central: 'وسط غزة',
  south: 'جنوب غزة',
};

// Normalize type labels for display
function typeLabel(type: string): string {
  if (type === 'both' || type === 'مطعم وكافيه') return 'مطعم وكافيه';
  if (type === 'restaurant' || type === 'مطعم') return 'مطعم';
  if (type === 'cafe' || type === 'كافيه' || type === 'مقهى') return 'كافيه';
  if (type === 'workspace' || type === 'مساحة عمل') return 'مساحة عمل';
  return type;
}

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

const EMOJI_MAP: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', bakery: '🫓', juice: '🧃',
  // 🛒 مواد غذائية وبقالة
  'بقالية عامة': '🛒', 'سوبرماركت': '🛒', 'خضار وفواكه': '🥬', 'لحوم': '🥩',
  'سمك': '🐟', 'مخبز': '🫓', 'حلويات ومعجنات': '🍰', 'بهارات وتوابل': '🌶️',
  // 💊 صحة وصيدلية
  'صيدلية': '💊', 'عيادة وطب': '🏥', 'مستلزمات طبية': '🩺', 'بصريات': '👓',
  // 👕 ملابس وأزياء
  'ملابس رجالي': '👔', 'ملابس حريمي': '👗', 'ملابس أطفال': '🧒', 'أحذية': '👟',
  'إكسسوارات': '💍', 'خياطة وتعديل': '🧵',
  // 🏠 منزل وأثاث
  'أثاث منزلي': '🛋️', 'مفروشات وستائر': '🪟', 'أدوات منزلية': '🏠', 'كهرباء ولوازم منزلية': '💡',
  'نظافة ومنظفات': '🧹', 'أدوات صحية وسباكة': '🔧',
  // 📱 إلكترونيات وتقنية
  'موبايل وإكسسوارات': '📱', 'كمبيوتر ولاب توب': '💻', 'كهربائيات': '🔌',
  'طاقة شمسية': '☀️', 'إصلاح وصيانة': '🔧',
  // 🏗️ بناء ومواد
  'مواد بناء': '🏗️', 'حديد وألمنيوم': '🔩', 'دهانات وديكور': '🎨', 'أخشاب': '🪵', 'سيراميك وبلاط': '🧱',
  // 📚 تعليم وثقافة
  'مكتبة وقرطاسية': '📚', 'ألعاب أطفال': '🧸', 'أدوات رسم وفنون': '🎨',
  // 💈 خدمات شخصية
  'حلاقة وصالون': '💈', 'عطور وكوزمتيك': '🌸', 'تصوير': '📷',
  // 🚗 سيارات
  'قطع غيار سيارات': '🚗', 'كراج وميكانيك': '🔧', 'إطارات': '🛞',
  // 🌿 زراعة وحيوانات
  'مستلزمات زراعية': '🌿', 'علف وبيطري': '🐄', 'أخرى': '📦',
  // workspace
  'workspace': '💻', 'مساحة عمل': '💻',
};

const _green: [string, string] = ['#E8F5EE', '#1A2E22'];
const _blue: [string, string] = ['#EFF6FF', '#1A1E2A'];
const _amber: [string, string] = ['#FFFBEB', '#2A2518'];
const _purple: [string, string] = ['#F5F3FF', '#261A2A'];
const _slate: [string, string] = ['#F1F5F9', '#1A1E2A'];
const _orange: [string, string] = ['#FFF7ED', '#2A1E18'];
const _teal: [string, string] = ['#F0FDFA', '#1A2E2A'];
const _pink: [string, string] = ['#FDF2F8', '#261A2A'];
const _indigo: [string, string] = ['#EEF2FF', '#1A1E2A'];
const _emerald: [string, string] = ['#ECFDF5', '#1A2E22'];

const BG_MAP: Record<string, [string, string]> = {
  restaurant: _green, cafe: _green, both: _green, bakery: _amber, juice: _green,
  // غذائية
  'بقالية عامة': _green, 'سوبرماركت': _green, 'خضار وفواكه': _green, 'لحوم': _green,
  'سمك': _green, 'مخبز': _green, 'حلويات ومعجنات': _green, 'بهارات وتوابل': _green,
  // صحة
  'صيدلية': _blue, 'عيادة وطب': _blue, 'مستلزمات طبية': _blue, 'بصريات': _blue,
  // ملابس
  'ملابس رجالي': _amber, 'ملابس حريمي': _amber, 'ملابس أطفال': _amber,
  'أحذية': _amber, 'إكسسوارات': _amber, 'خياطة وتعديل': _amber,
  // منزل
  'أثاث منزلي': _purple, 'مفروشات وستائر': _purple, 'أدوات منزلية': _purple,
  'كهرباء ولوازم منزلية': _purple, 'نظافة ومنظفات': _purple, 'أدوات صحية وسباكة': _purple,
  // إلكترونيات
  'موبايل وإكسسوارات': _slate, 'كمبيوتر ولاب توب': _slate, 'كهربائيات': _slate,
  'طاقة شمسية': _slate, 'إصلاح وصيانة': _slate,
  // بناء
  'مواد بناء': _orange, 'حديد وألمنيوم': _orange, 'دهانات وديكور': _orange,
  'أخشاب': _orange, 'سيراميك وبلاط': _orange,
  // تعليم
  'مكتبة وقرطاسية': _teal, 'ألعاب أطفال': _teal, 'أدوات رسم وفنون': _teal,
  // خدمات
  'حلاقة وصالون': _pink, 'عطور وكوزمتيك': _pink, 'تصوير': _pink,
  // سيارات
  'قطع غيار سيارات': _indigo, 'كراج وميكانيك': _indigo, 'إطارات': _indigo,
  // زراعة
  'مستلزمات زراعية': _emerald, 'علف وبيطري': _emerald, 'أخرى': _emerald,
  // workspace
  'workspace': _indigo, 'مساحة عمل': _indigo,
};

export default function PlacesPage() {
  const isDesktop = useIsDesktop();
  const [section, setSection] = useState<Section>('store');
  const [chip, setChip] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [openAreaPicker, setOpenAreaPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { area: userArea } = useArea();
  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];
  const [placesArea, setPlacesArea] = useState<Area | null>(null);
  const [openGovs, setOpenGovs] = useState<Record<string, boolean>>({ central: true });
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);

  // "الكل" chip (0) = all areas, other chips = user's saved area
  const activeArea = placesArea;

  const { data: searchData, isLoading: searchLoading } = usePlacesSearch(debouncedSearch, section, activeArea?.id);

  const chips = section === 'food' ? FOOD_CHIPS : section === 'workspace' ? WORKSPACE_CHIPS : STORE_CHIPS;

  // Fetch ALL places for this section (no pagination limit) so client-side filtering works correctly
  const { data: placesData, isLoading: loading } = usePlaces(section, activeArea?.id, 500, 0);
  const allPlaces = placesData?.places ?? [];

  const isSearching = debouncedSearch.length >= 1;
  const matchedItems = searchData?.matched_items ?? [];

  // Filter places by selected chip
  const filteredPlaces = useMemo(() => {
    if (isSearching) return searchData?.places ?? [];

    let filtered = allPlaces;
    const chipLabel = chips[chip];
    if (chipLabel && chipLabel !== 'الكل') {
      if (chipLabel === 'مفتوح') filtered = filtered.filter((p) => p.is_open);
      else {
        const typeFilter = CHIP_TO_TYPE[chipLabel];
        if (typeFilter) {
          const types = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
          filtered = filtered.filter((p) => types.includes(p.type));
        }
      }
    }
    // Sort stores: most items first
    if (section === 'store') {
      filtered = [...filtered].sort((a, b) => ((b as any).menu_items_count ?? 0) - ((a as any).menu_items_count ?? 0));
    }
    // Sort workspaces: by featured_order first, then by completeness score
    if (section === 'workspace') {
      function wsScore(p: Place): number {
        const wd = (p as any).workspace_details;
        const hasAvatar = !!p.avatar_url;
        const hasContact = !!(p.phone || p.whatsapp);
        const hasAddress = !!p.address;
        const hasDetails = !!(wd && (wd.price_hour || wd.price_day || wd.total_seats));
        const hasServices = Array.isArray((p as any).workspace_services) && (p as any).workspace_services.length > 0;
        // Truly empty: no avatar, no contact, no address, no details → last
        if (!hasAvatar && !hasContact && !hasAddress && !hasDetails) return 0;
        let score = 0;
        if (hasAvatar) score += 2;
        if (hasContact) score += 1;
        if (hasAddress) score += 1;
        if (hasDetails) score += 2;
        if (hasServices) score += 1;
        return score;
      }

      filtered = [...filtered].sort((a, b) => {
        const aScore = wsScore(a);
        const bScore = wsScore(b);
        // Score 0 (no avatar / empty) always goes last
        if (aScore === 0 && bScore > 0) return 1;
        if (bScore === 0 && aScore > 0) return -1;
        // Both have content → respect featured_order, break ties by score
        const aOrder = a.featured_order ?? 9999;
        const bOrder = b.featured_order ?? 9999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return bScore - aScore;
      });
    }
    return filtered;
  }, [isSearching, searchData, allPlaces, chip, chips, section]);

  const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / PAGE_SIZE));
  const places = filteredPlaces.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const count = filteredPlaces.length;

  const grouped = areas.reduce<Record<string, Area[]>>((acc, a) => {
    const g = a.governorate;
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});
  const govOrder = ['central', 'south', 'north'];

  /* ═══ DESKTOP LAYOUT ═══ */
  if (isDesktop) {
    return (
      <div className="h-screen grid grid-rows-[60px_1fr]" dir="rtl">
        <DesktopHeader
          onSubmitClick={() => setSubmitModalOpen(true)}
          onSuggestClick={() => setSuggestModalOpen(true)}
          onProfileClick={() => window.location.href = '/account'}
          isProfileActive={false}
        />
        <div className="flex-1 overflow-y-auto bg-fog">
          <div className="max-w-[900px] mx-auto flex min-h-full">
          {/* ── Sidebar ── */}
          <aside className="w-[280px] flex-shrink-0 bg-surface border border-border rounded-2xl shadow-sm overflow-y-auto no-scrollbar flex flex-col sticky top-0 h-fit max-h-screen my-4 mr-4">
            {/* Search */}
            <div className="p-4 pb-2">
              <div className="bg-fog rounded-xl flex items-center gap-2 px-3 py-2.5 border border-border">
                <span className="text-xs text-mist">🔍</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={section === 'food' ? 'ابحث عن مطعم أو وجبة...' : section === 'store' ? 'ابحث عن متجر أو منتج...' : 'ابحث عن مساحة عمل...'}
                  className="flex-1 text-xs text-ink placeholder:text-mist bg-transparent outline-none min-w-0 font-semibold"
                  dir="rtl"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-mist text-sm leading-none hover:text-ink">×</button>
                )}
              </div>
            </div>

            {/* Section nav */}
            <div className="px-4 pb-3">
              <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">الأقسام</div>
              <div className="space-y-0.5">
                {([
                  { key: 'store' as Section, icon: '🏪', label: 'متاجر' },
                  { key: 'workspace' as Section, icon: '💻', label: 'مساحات عمل' },
                  { key: 'food' as Section, icon: '🍽️', label: 'مطاعم وكافيهات' },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { setSection(item.key); setChip(0); setPage(0); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-display font-bold transition-colors text-right cursor-pointer',
                      section === item.key
                        ? 'bg-olive-pale text-olive border border-olive-mid'
                        : 'text-ink hover:bg-fog'
                    )}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Area filter */}
            <div className="px-4 pb-3">
              <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">المنطقة</div>
              <button
                onClick={() => { setPlacesArea(null); setPage(0); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-body transition-colors text-right mb-1',
                  !placesArea ? 'bg-olive-pale text-olive font-semibold' : 'text-slate hover:bg-fog hover:text-ink'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', !placesArea ? 'bg-olive' : 'bg-border')} />
                كل المناطق
              </button>
              {govOrder.map((gov) => {
                const govAreas = grouped[gov];
                if (!govAreas?.length) return null;
                const isGovOpen = openGovs[gov] ?? false;
                return (
                  <div key={gov} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setOpenGovs((prev) => ({ ...prev, [gov]: !prev[gov] }))}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-mist/70 uppercase tracking-wider hover:text-mist transition-colors cursor-pointer"
                    >
                      <span>{GOV_LABELS[gov] || gov}</span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        className={cn("text-mist transition-transform", isGovOpen && "rotate-90")}
                      >
                        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                    {isGovOpen && govAreas.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setPlacesArea(a); setPage(0); }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-body transition-colors text-right',
                          placesArea?.id === a.id ? 'bg-olive-pale text-olive font-semibold' : 'text-slate hover:bg-fog hover:text-ink'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', placesArea?.id === a.id ? 'bg-olive' : 'bg-border')} />
                        {a.name_ar}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Chips / categories */}
            {section === 'food' && (
              <div className="px-4 pb-3 border-t border-border pt-3">
                <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">التصنيف</div>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => { setChip(i); setPage(0); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-body whitespace-nowrap border-[1.5px] transition-colors ${
                        chip === i
                          ? 'bg-olive-pale border-olive text-olive font-semibold'
                          : 'bg-surface border-border text-slate hover:border-olive/50'
                      }`}
                    >
                      {label === 'مفتوح' ? (<><span className={`w-[6px] h-[6px] rounded-full animate-pulse ${chip === i ? 'bg-olive' : 'bg-olive/60'}`} />مفتوح</>) : label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {section === 'workspace' && (
              <div className="px-4 pb-3 border-t border-border pt-3">
                <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">الحالة</div>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => { setChip(i); setPage(0); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-body whitespace-nowrap border-[1.5px] transition-colors ${
                        chip === i
                          ? 'bg-olive-pale border-olive text-olive font-semibold'
                          : 'bg-surface border-border text-slate hover:border-olive/50'
                      }`}
                    >
                      {label === 'مفتوح' ? (<><span className={`w-[6px] h-[6px] rounded-full animate-pulse ${chip === i ? 'bg-olive' : 'bg-olive/60'}`} />مفتوح</>) : label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {section === 'store' && (
              <div className="px-4 pb-3 border-t border-border pt-3">
                <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">التصنيف</div>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => { setChip(i); setPage(0); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-body whitespace-nowrap border-[1.5px] transition-colors ${
                        chip === i
                          ? 'bg-olive-pale border-olive text-olive font-semibold'
                          : 'bg-surface border-border text-slate hover:border-olive/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Register CTA */}
            <div className="mt-auto p-4 border-t border-border">
              <Link
                href={`/places/register?section=${section}`}
                className="flex items-center justify-center gap-2 bg-olive text-white font-display font-extrabold text-[12px] px-4 py-2.5 rounded-xl shadow-md hover:bg-olive-deep transition-colors w-full"
              >
                {section === 'food' ? '🍽️' : section === 'store' ? '🏪' : '💻'} سجّل {section === 'workspace' ? 'مساحة عملك' : 'محلك'} مجاناً
              </Link>
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex-1 p-8 min-h-0">
            {/* Header bar */}
            <div className="flex items-center justify-between px-8 py-4 bg-surface border-b border-border sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <h1 className="font-display font-black text-lg text-ink">
                  {section === 'food' ? 'مطاعم وكافيه' : section === 'store' ? 'متاجر' : 'مساحات عمل'}
                </h1>
                <span className="text-[11px] font-semibold text-olive bg-olive-pale px-2.5 py-0.5 rounded-full">
                  {count} مكان
                </span>
              </div>
              {activeArea && (
                <span className="text-[12px] text-mist">📍 {activeArea.name_ar}</span>
              )}
            </div>

            {section === 'store' ? (
              isSearching ? (
                (searchLoading) ? (
                  <div className="bg-surface border-b border-border divide-y divide-border">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-6 py-3">
                        <div className="w-[46px] h-[46px] rounded-[13px] bg-border/60 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                          <div className="h-2.5 w-20 rounded-md bg-border/60 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : places.length === 0 && matchedItems.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-sm text-mist">لا توجد نتائج لـ &quot;{debouncedSearch}&quot;</p>
                  </div>
                ) : (
                  <div>
                    {places.length > 0 && (
                      <>
                        <div className="bg-olive px-6 py-2">
                          <span className="font-display font-bold text-[13px] text-white">متاجر</span>
                        </div>
                        <div className="bg-surface border-b border-border">
                          {places.map((place, i) => (
                            <PlaceRow key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                          ))}
                        </div>
                      </>
                    )}
                    {matchedItems.length > 0 && (() => {
                      const groupedItems = matchedItems.reduce<Record<string, MatchedItem[]>>((acc, item) => {
                        if (!acc[item.place_id]) acc[item.place_id] = [];
                        acc[item.place_id].push(item);
                        return acc;
                      }, {});
                      const placeMap = new Map((searchData?.places ?? []).map((p) => [p.id, p]));
                      return (
                        <>
                          <div className="bg-olive px-6 py-2 mt-2">
                            <span className="font-display font-bold text-[13px] text-white">منتجات</span>
                          </div>
                          {Object.entries(groupedItems).map(([placeId, items]) => {
                            const place = placeMap.get(placeId);
                            if (!place) return null;
                            return (
                              <div key={placeId} className="bg-surface border-b border-border">
                                <div
                                  className="flex items-center gap-2 px-6 py-2.5 bg-olive-pale border-b-2 border-olive/20 cursor-pointer hover:bg-olive-pale/80"
                                  onClick={() => setSelectedPlace(place)}
                                >
                                  <span className="font-display font-extrabold text-[12px] text-olive-deep flex-1">{place.name}</span>
                                  <span className="text-[10px] text-mist">{place.area?.name_ar}</span>
                                </div>
                                {items.map((item, idx) => (
                                  <div key={`${placeId}-${idx}`} className="flex items-center justify-between px-7 py-2.5 border-b border-border/50 last:border-b-0">
                                    <span className="text-[13px] font-semibold text-ink">{item.item_name}</span>
                                    {Number(item.price) > 0 ? (
                                      <span className="font-display font-black text-[14px] text-olive">{item.price} <span className="text-[10px] font-normal text-mist">₪</span></span>
                                    ) : (
                                      <span className="text-[10px] text-mist">—</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                )
              ) : loading ? (
                <div className="bg-surface border-b border-border divide-y divide-border">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-3">
                      <div className="w-[46px] h-[46px] rounded-[13px] bg-border/60 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                        <div className="h-2.5 w-20 rounded-md bg-border/60 animate-pulse" />
                      </div>
                      <div className="h-2.5 w-12 rounded-md bg-border/60 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : places.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-fog border-[3px] border-border flex items-center justify-center mb-5">
                    <span className="text-4xl">🏪</span>
                  </div>
                  <h2 className="font-display font-black text-xl text-ink mb-2">لا توجد متاجر حالياً</h2>
                  <p className="text-sm text-mist leading-relaxed max-w-[260px]">كن أول من يسجّل متجر في منطقتك</p>
                  <Link
                    href={`/places/register?section=${section}`}
                    className="mt-6 inline-flex items-center gap-2 bg-olive text-white font-display font-extrabold text-[13px] px-5 py-2.5 rounded-xl shadow-[0_3px_12px_rgba(30,77,43,0.2)] hover:bg-olive-deep transition-colors"
                  >
                    🏪 سجّل متجرك
                  </Link>
                </div>
              ) : (
                <div className="p-6">
                  {/* الأبرز — Story Circles */}
                  {chip === 0 && places.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-[18px] bg-olive rounded-sm" />
                          <span className="font-display font-black text-[14px] text-ink">الأبرز</span>
                        </div>
                      </div>
                      <div className="flex gap-5 overflow-x-auto no-scrollbar pb-1">
                        {places.slice(0, 10).map((place) => {
                          const emoji = EMOJI_MAP[place.type] || '🏪';
                          const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;
                          const closed = !place.is_open;
                          return (
                            <div
                              key={place.id}
                              onClick={() => setSelectedPlace(place)}
                              className="flex-shrink-0 flex flex-col items-center gap-[5px] cursor-pointer group"
                            >
                              <div
                                className="w-[64px] h-[64px] rounded-full p-[2.5px] transition-transform group-hover:scale-105"
                                style={{
                                  background: closed
                                    ? 'linear-gradient(135deg, #9CA3AF, #D1D5DB)'
                                    : accent.ring,
                                }}
                              >
                                <div className="w-full h-full rounded-full bg-surface border-[2.5px] border-surface flex items-center justify-center overflow-hidden">
                                  {place.avatar_url ? (
                                    <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
                                  ) : (
                                    <span className={`text-[28px] ${closed ? 'opacity-45' : ''}`}>{emoji}</span>
                                  )}
                                </div>
                              </div>
                              <div className={`text-[10px] font-semibold text-center max-w-[68px] truncate ${closed ? 'text-mist' : 'text-ink'}`}>
                                {place.name}
                              </div>
                              <div className="text-[9px] text-mist text-center -mt-[2px]">
                                {closed ? 'مغلق' : (place.type || 'متجر')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* الكل — Accent Bar Cards */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-[18px] bg-olive rounded-sm" />
                      <span className="font-display font-black text-[14px] text-ink">الكل</span>
                    </div>
                    <span className="text-[11px] font-semibold text-olive bg-olive-pale px-[9px] py-[2px] rounded-full">
                      {count} متجر
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {places.map((place, i) => (
                      <StoreCard key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 py-6">
                      <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors">السابق ←</button>
                      <span className="text-[11px] font-semibold text-mist">{page + 1} / {totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors">→ التالي</button>
                    </div>
                  )}
                </div>
              )
            ) : section === 'workspace' ? (
              /* Workspace listing */
              loading ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 p-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-surface rounded-2xl border border-border p-4 animate-pulse">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-[14px] bg-border/60" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-28 rounded-md bg-border/60" />
                          <div className="h-3 w-20 rounded-md bg-border/60" />
                        </div>
                      </div>
                      <div className="h-8 rounded-lg bg-border/60" />
                    </div>
                  ))}
                </div>
              ) : places.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-fog border-[3px] border-border flex items-center justify-center mb-5">
                    <span className="text-4xl">💻</span>
                  </div>
                  <h2 className="font-display font-black text-xl text-ink mb-2">لا توجد مساحات عمل حالياً</h2>
                  <p className="text-sm text-mist leading-relaxed max-w-[260px]">كن أول من يسجّل مساحة عمل في منطقتك</p>
                  <Link
                    href={`/places/register?section=${section}`}
                    className="mt-6 inline-flex items-center gap-2 bg-olive text-white font-display font-extrabold text-[13px] px-5 py-2.5 rounded-xl shadow-[0_3px_12px_rgba(30,77,43,0.2)] hover:bg-olive-deep transition-colors"
                  >
                    💻 سجّل مساحة عملك
                  </Link>
                </div>
              ) : (
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    {places.map((place, i) => (
                      <WorkspaceCard key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 py-6">
                      <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors">السابق ←</button>
                      <span className="text-[11px] font-semibold text-mist">{page + 1} / {totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors">→ التالي</button>
                    </div>
                  )}
                </div>
              )
            ) : isSearching ? (
              /* Search results */
              (searchLoading) ? (
                <div className="bg-surface border-b border-border divide-y divide-border">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-3">
                      <div className="w-[46px] h-[46px] rounded-[13px] bg-border/60 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                        <div className="h-2.5 w-20 rounded-md bg-border/60 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : places.length === 0 && matchedItems.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-sm text-mist">لا توجد نتائج لـ &quot;{debouncedSearch}&quot;</p>
                </div>
              ) : (
                <div>
                  {places.length > 0 && (
                    <>
                      <div className="bg-olive px-6 py-2">
                        <span className="font-display font-bold text-[13px] text-white">محلات</span>
                      </div>
                      <div className="bg-surface border-b border-border">
                        {places.map((place, i) => (
                          <PlaceRow key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                        ))}
                      </div>
                    </>
                  )}
                  {matchedItems.length > 0 && (() => {
                    const groupedItems = matchedItems.reduce<Record<string, MatchedItem[]>>((acc, item) => {
                      if (!acc[item.place_id]) acc[item.place_id] = [];
                      acc[item.place_id].push(item);
                      return acc;
                    }, {});
                    const placeMap = new Map((searchData?.places ?? []).map((p) => [p.id, p]));
                    return (
                      <>
                        <div className="bg-olive px-6 py-2 mt-2">
                          <span className="font-display font-bold text-[13px] text-white">أصناف القائمة</span>
                        </div>
                        {Object.entries(groupedItems).map(([placeId, items]) => {
                          const place = placeMap.get(placeId);
                          if (!place) return null;
                          return (
                            <div key={placeId} className="bg-surface border-b border-border">
                              <div
                                className="flex items-center gap-2 px-6 py-2.5 bg-olive-pale border-b-2 border-olive/20 cursor-pointer hover:bg-olive-pale/80"
                                onClick={() => setSelectedPlace(place)}
                              >
                                <span className="font-display font-extrabold text-[12px] text-olive-deep flex-1">{place.name}</span>
                                <span className="text-[10px] text-mist">{place.area?.name_ar}</span>
                              </div>
                              {items.map((item, idx) => (
                                <div key={`${placeId}-${idx}`} className="flex items-center justify-between px-7 py-2.5 border-b border-border/50 last:border-b-0">
                                  <span className="text-[13px] font-semibold text-ink">{item.item_name}</span>
                                  {Number(item.price) > 0 ? (
                                    <span className="font-display font-black text-[14px] text-olive">{item.price} <span className="text-[10px] font-normal text-mist">₪</span></span>
                                  ) : (
                                    <span className="text-[10px] text-mist">—</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )
            ) : (
              /* Normal listing */
              <>
                {loading ? (
                  <div className="bg-surface border-b border-border divide-y divide-border">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-6 py-3">
                        <div className="w-[46px] h-[46px] rounded-[13px] bg-border/60 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                          <div className="h-2.5 w-20 rounded-md bg-border/60 animate-pulse" />
                        </div>
                        <div className="h-2.5 w-12 rounded-md bg-border/60 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : places.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-sm text-mist">لا توجد مطاعم أو مقاهي حالياً</p>
                  </div>
                ) : (
                  <>
                    {/* Spotlight — only on الكل chip, first page */}
                    {chip === 0 && page === 0 && places.length > 0 && (
                      <div className="px-8 pt-5 pb-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-display font-extrabold text-[14px] text-ink">الأبرز</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {places.slice(0, 3).map((place, i) => (
                            <SpotlightCard key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* List */}
                    {((chip === 0 && page === 0) ? places.length > 3 : places.length > 0) && (
                      <>
                        <div className="flex items-center justify-between px-8 py-2.5 bg-fog border-b border-border">
                          <span className="font-display font-bold text-[12px] text-mist">الكل</span>
                          <span className="text-[10px] text-mist">{chip === 0 && page === 0 ? (places.length > 3 ? places.length - 3 : 0) : places.length} مكان</span>
                        </div>
                        <div className="bg-surface border-b border-border divide-y divide-border/50">
                          {(chip === 0 && page === 0 ? places.slice(3) : places).map((place, i) => (
                            <PlaceRow key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 px-6 py-6">
                        <button
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors"
                        >
                          السابق ←
                        </button>
                        <span className="text-[11px] font-semibold text-mist">{page + 1} / {totalPages}</span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={page >= totalPages - 1}
                          className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors"
                        >
                          → التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </main>
          </div>
        </div>

        {/* Detail Sheet — same for desktop */}
        {selectedPlace && (
          <PlaceSheet place={selectedPlace} onClose={() => setSelectedPlace(null)} />
        )}
        <DesktopSubmitModal open={submitModalOpen} onClose={() => setSubmitModalOpen(false)} />
        <DesktopSuggestModal open={suggestModalOpen} onClose={() => setSuggestModalOpen(false)} />
      </div>
    );
  }

  /* ═══ MOBILE LAYOUT ═══ */
  return (
    <div className="min-h-screen bg-fog" dir="rtl">
      <AppHeader hideActions hideSearch />

      {/* Search bar — inside green area */}
      <div className="bg-olive px-4 pb-3 -mt-px">
        <div className="bg-white/95 dark:bg-white/12 dark:border dark:border-white/20 rounded-2xl flex items-center gap-2 px-3 py-2.5">
          <span className="text-xs text-mist dark:text-white/50">🔍</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={section === 'food' ? 'ابحث عن مطعم أو وجبة...' : section === 'store' ? 'ابحث عن متجر أو منتج...' : 'ابحث عن مساحة عمل...'}
            className="flex-1 text-xs text-mist dark:text-white placeholder:text-mist dark:placeholder:text-white/50 bg-transparent outline-none min-w-0 font-semibold"
            dir="rtl"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-mist dark:text-white/50 text-sm leading-none hover:text-ink dark:hover:text-white">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-30 bg-surface px-4 py-3 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-0 bg-fog rounded-2xl p-1">
            <button
              onClick={() => { setSection('store'); setChip(0); setPage(0); }}
              className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                section === 'store'
                  ? 'bg-olive text-white shadow-lg'
                  : 'bg-transparent text-ink hover:bg-fog'
              }`}
            >
              متاجر
            </button>
            <button
              onClick={() => { setSection('workspace'); setChip(0); setPage(0); }}
              className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                section === 'workspace'
                  ? 'bg-olive text-white shadow-lg'
                  : 'bg-transparent text-ink hover:bg-fog'
              }`}
            >
              مساحات عمل
            </button>
            <button
              onClick={() => { setSection('food'); setChip(0); setPage(0); }}
              className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                section === 'food'
                  ? 'bg-olive text-white shadow-lg'
                  : 'bg-transparent text-ink hover:bg-fog'
              }`}
            >
              مطاعم
            </button>
          </div>
        </div>
      </div>

      {/* ─── Store listing ─── */}
      {section === 'store' ? (
        <>
          {/* Area bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-[7px] h-[7px] rounded-full bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.18)]" />
              <span className="font-display font-bold text-[12px] text-ink">{placesArea?.name_ar ?? 'كل المناطق'}</span>
            </div>
            <button onClick={() => setOpenAreaPicker(true)} className="text-[11px] font-semibold text-olive">📍 تغيير</button>
          </div>

          {/* Chips */}
          <div className="flex gap-2 px-4 py-2.5 bg-surface border-b border-border overflow-x-auto no-scrollbar">
            {chips.map((label, i) => (
              <button
                key={label}
                onClick={() => { setChip(i); setPage(0); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                  chip === i ? 'bg-olive-pale border-olive text-olive font-semibold' : 'bg-surface border-border text-slate hover:border-olive/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Section header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-fog">
            <span className="font-display font-extrabold text-[13px] text-ink">المتاجر</span>
            <span className="text-[11px] font-semibold text-olive bg-olive-pale px-2.5 py-0.5 rounded-full">
              {count} متجر
            </span>
          </div>

          {/* Banner */}
          <Link
            href={`/places/register?section=${section}`}
            className="flex items-center mx-3 mt-2 mb-1 rounded-2xl px-4 py-3 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #3A6347, #4A7C59)' }}
          >
            <div className="absolute w-[100px] h-[100px] rounded-full bg-white/[0.07] -top-[40px] -left-[20px] pointer-events-none" />
            <div className="flex-1 relative z-[1]">
              <div className="font-display font-black text-[14px] text-white leading-tight">
                صاحب متجر؟ سجّل مجاناً
              </div>
              <div className="text-[10px] text-white/60 mt-0.5">
                {count} متجر مسجّل · انضم الآن
              </div>
            </div>
            <span className="mr-2 inline-flex items-center bg-white font-display font-extrabold text-[11px] px-3 py-[5px] rounded-full flex-shrink-0 relative z-[1] text-[#3A6347]">
              سجّل ←
            </span>
          </Link>

          {isSearching ? (
            searchLoading ? (
              <div className="bg-surface border-b border-border mb-2 pb-32 divide-y divide-border">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-[46px] h-[46px] rounded-[13px] bg-border/60 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                      <div className="h-2.5 w-20 rounded-md bg-border/60 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : places.length === 0 && matchedItems.length === 0 ? (
              <div className="bg-surface border-b border-border mb-2 pb-20">
                <div className="text-center py-12">
                  <p className="text-sm text-mist">لا توجد نتائج لـ &quot;{debouncedSearch}&quot;</p>
                </div>
              </div>
            ) : (
              <div className="pb-24">
                {places.length > 0 && (
                  <>
                    <div className="bg-olive px-4 py-2">
                      <span className="font-display font-bold text-[13px] text-white">متاجر</span>
                    </div>
                    <div className="bg-surface border-b border-border">
                      {places.map((place, i) => (
                        <PlaceRow key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                      ))}
                    </div>
                  </>
                )}
                {matchedItems.length > 0 && (() => {
                  const grouped = matchedItems.reduce<Record<string, MatchedItem[]>>((acc, item) => {
                    if (!acc[item.place_id]) acc[item.place_id] = [];
                    acc[item.place_id].push(item);
                    return acc;
                  }, {});
                  const placeMap = new Map((searchData?.places ?? []).map((p) => [p.id, p]));
                  return (
                    <>
                      <div className="bg-olive px-4 py-2 mt-2">
                        <span className="font-display font-bold text-[13px] text-white">منتجات</span>
                      </div>
                      {Object.entries(grouped).map(([placeId, items]) => {
                        const place = placeMap.get(placeId);
                        if (!place) return null;
                        return (
                          <div key={placeId} className="bg-surface border-b border-border">
                            <div
                              className="flex items-center gap-2 px-4 py-2.5 bg-olive-pale border-b-2 border-olive/20 cursor-pointer hover:bg-olive-pale/80"
                              onClick={() => setSelectedPlace(place)}
                            >
                              <span className="text-[14px]">🏪</span>
                              <span className="font-display font-extrabold text-[12px] text-olive-deep flex-1">{place.name}</span>
                              <span className="text-[9px] text-mist">{place.area?.name_ar}</span>
                              <span className="text-[11px] text-mist">{'‹'}</span>
                            </div>
                            {items.map((item, idx) => (
                              <div
                                key={`${placeId}-${idx}`}
                                className="flex items-center justify-between px-5 py-2.5 border-b border-border/50 last:border-b-0 cursor-pointer hover:bg-fog/50"
                                onClick={() => setSelectedPlace(place)}
                              >
                                <span className="text-[13px] font-semibold text-ink">{item.item_name}</span>
                                {Number(item.price) > 0 ? (
                                  <span className="font-display font-black text-[14px] text-olive">{item.price} <span className="text-[10px] font-normal text-mist">₪</span></span>
                                ) : (
                                  <span className="text-[10px] text-mist">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )
          ) : loading ? (
            <div className="bg-surface border-b border-border divide-y divide-border pb-28">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-[46px] h-[46px] rounded-[13px] bg-border/60 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                    <div className="h-2.5 w-20 rounded-md bg-border/60 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 pb-28 pt-12 text-center">
              <div className="w-20 h-20 rounded-full bg-fog border-[3px] border-border flex items-center justify-center mb-5">
                <span className="text-4xl">🏪</span>
              </div>
              <h2 className="font-display font-black text-xl text-ink mb-2">لا توجد متاجر حالياً</h2>
              <p className="text-sm text-mist leading-relaxed max-w-[260px]">كن أول من يسجّل متجر في منطقتك</p>
              <Link href={`/places/register?section=${section}`} className="mt-6 inline-flex items-center gap-2 bg-olive text-white font-display font-extrabold text-[13px] px-5 py-2.5 rounded-xl shadow-[0_3px_12px_rgba(30,77,43,0.2)] hover:bg-olive-deep transition-colors">
                🏪 سجّل متجرك
              </Link>
            </div>
          ) : (
            <div className="pb-28">
              {/* الأبرز — Story Circles */}
              {chip === 0 && places.length > 0 && (
                <div className="px-4 pt-4 pb-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-[18px] bg-olive rounded-sm" />
                      <span className="font-display font-black text-[14px] text-ink">الأبرز</span>
                    </div>
                    <span className="text-[11px] text-mist">اسحب ←</span>
                  </div>
                  <div className="flex gap-[14px] overflow-x-auto no-scrollbar pb-1">
                    {places.slice(0, 8).map((place) => {
                      const emoji = EMOJI_MAP[place.type] || '🏪';
                      const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;
                      const closed = !place.is_open;
                      return (
                        <div
                          key={place.id}
                          onClick={() => setSelectedPlace(place)}
                          className="flex-shrink-0 flex flex-col items-center gap-[5px] cursor-pointer group"
                        >
                          <div
                            className="w-[60px] h-[60px] rounded-full p-[2.5px] transition-transform group-hover:scale-105"
                            style={{
                              background: closed
                                ? 'linear-gradient(135deg, #9CA3AF, #D1D5DB)'
                                : accent.ring,
                            }}
                          >
                            <div className="w-full h-full rounded-full bg-surface border-[2.5px] border-surface flex items-center justify-center overflow-hidden">
                              {place.avatar_url ? (
                                <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
                              ) : (
                                <span className={`text-[26px] ${closed ? 'opacity-45' : ''}`}>{emoji}</span>
                              )}
                            </div>
                          </div>
                          <div className={`text-[10px] font-semibold text-center max-w-[64px] truncate ${closed ? 'text-mist' : 'text-ink'}`}>
                            {place.name}
                          </div>
                          <div className="text-[9px] text-mist text-center -mt-[2px]">
                            {closed ? 'مغلق' : (place.type || 'متجر')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* الكل — Accent Bar Cards */}
              <div className="px-4 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-[18px] bg-olive rounded-sm" />
                    <span className="font-display font-black text-[14px] text-ink">الكل</span>
                  </div>
                  <span className="text-[11px] font-semibold text-olive bg-olive-pale px-[9px] py-[2px] rounded-full">
                    {places.length} متجر
                  </span>
                </div>
                <div className="flex flex-col gap-2 pb-4">
                  {places.map((place, i) => (
                    <StoreCard key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : section === 'workspace' ? (
        /* ─── Workspace listing ─── */
        <>
          {/* Area bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-[7px] h-[7px] rounded-full bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.18)]" />
              <span className="font-display font-bold text-[12px] text-ink">{placesArea?.name_ar ?? 'كل المناطق'}</span>
            </div>
            <button onClick={() => setOpenAreaPicker(true)} className="text-[11px] font-semibold text-olive">📍 تغيير</button>
          </div>

          {/* Chips */}
          <div className="flex gap-2 px-4 py-2.5 bg-surface border-b border-border overflow-x-auto no-scrollbar">
            {chips.map((label, i) => (
              <button
                key={label}
                onClick={() => { setChip(i); setPage(0); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-body whitespace-nowrap border-[1.5px] flex-shrink-0 transition-colors ${
                  chip === i ? 'bg-olive-pale border-olive text-olive font-semibold' : 'bg-surface border-border text-slate hover:border-olive/50'
                }`}
              >
                {label === 'مفتوح' ? (<><span className={`w-[6px] h-[6px] rounded-full animate-pulse ${chip === i ? 'bg-olive' : 'bg-olive/60'}`} />مفتوح</>) : label}
              </button>
            ))}
          </div>

          {/* Section header */}
          <div className="flex items-center justify-between px-4 py-2 bg-fog border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-olive rounded-sm" />
              <span className="font-display font-bold text-[13px] text-ink">مساحات العمل</span>
            </div>
            <span className="text-[11px] font-semibold text-olive bg-olive-pale px-2.5 py-0.5 rounded-full">{places.length} مكان</span>
          </div>

          {loading ? (
            <div className="px-4 py-3 space-y-3 pb-28">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-surface rounded-2xl border border-border p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-[14px] bg-border/60" />
                    <div className="flex-1 space-y-2"><div className="h-4 w-28 rounded-md bg-border/60" /><div className="h-3 w-20 rounded-md bg-border/60" /></div>
                  </div>
                  <div className="h-8 rounded-lg bg-border/60" />
                </div>
              ))}
            </div>
          ) : places.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 pb-28 pt-12 text-center">
              <div className="w-20 h-20 rounded-full bg-fog border-[3px] border-border flex items-center justify-center mb-5">
                <span className="text-4xl">💻</span>
              </div>
              <h2 className="font-display font-black text-xl text-ink mb-2">لا توجد مساحات عمل حالياً</h2>
              <p className="text-sm text-mist leading-relaxed max-w-[260px]">كن أول من يسجّل مساحة عمل في منطقتك</p>
              <Link href={`/places/register?section=${section}`} className="mt-6 inline-flex items-center gap-2 bg-olive text-white font-display font-extrabold text-[13px] px-5 py-2.5 rounded-xl shadow-[0_3px_12px_rgba(30,77,43,0.2)] hover:bg-olive-deep transition-colors">
                💻 سجّل مساحة عملك
              </Link>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-3 pb-28">
              {/* Register banner */}
              <Link
                href={`/places/register?section=${section}`}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #3A6347, #4A7C59)' }}
              >
                <div className="absolute w-[80px] h-[80px] rounded-full bg-white/[0.07] -bottom-[20px] -left-[10px] pointer-events-none" />
                <div className="w-[38px] h-[38px] rounded-[10px] bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                </div>
                <div className="flex-1 relative z-[1]">
                  <div className="font-display font-black text-[12px] text-white">صاحب مساحة عمل؟ سجّل مجاناً</div>
                  <div className="text-[10px] text-white/55">أضف مساحتك وابدأ الآن</div>
                </div>
                <span className="text-white/40 text-sm">‹</span>
              </Link>

              {places.map((place, i) => (
                <WorkspaceCard key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 px-3.5 py-2 rounded-xl border-[1.5px] border-border bg-fog text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors">السابق ←</button>
                  <span className="text-[11px] font-semibold text-mist">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="flex items-center gap-1 px-3.5 py-2 rounded-xl border-[1.5px] border-border bg-fog text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors">→ التالي</button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Area bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-[7px] h-[7px] rounded-full bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.18)]" />
              <span className="font-display font-bold text-xs text-ink">{activeArea?.name_ar || 'كل المناطق'}</span>
            </div>
            <button onClick={() => setOpenAreaPicker(true)} className="text-[11px] font-semibold text-olive cursor-pointer">
              📍 تغيير
            </button>
          </div>

          {/* Chips */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-surface border-b border-border">
            {chips.map((label, i) => (
              <button
                key={label}
                onClick={() => setChip(i)}
                className={`flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap border-[1.5px] transition-colors ${
                  chip === i
                    ? 'bg-olive-pale border-olive text-olive font-semibold'
                    : 'bg-surface border-border text-slate hover:border-olive/50'
                }`}
              >
                {label === 'مفتوح' ? (<><span className={`w-[7px] h-[7px] rounded-full animate-pulse ${chip === i ? 'bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.3)]' : 'bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.18)]'}`} />مفتوح</>) : label}
              </button>
            ))}
          </div>

          {/* Section header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-fog">
            <span className="font-display font-extrabold text-[13px] text-ink">مطاعم وكافيه</span>
            <span className="text-[11px] font-semibold text-olive bg-olive-pale px-2.5 py-0.5 rounded-full">
              {count} مكان
            </span>
          </div>

          {/* Banner — compact strip */}
          <Link
            href={`/places/register?section=${section}`}
            className="flex items-center mx-3 mt-2 mb-1 rounded-2xl px-4 py-3 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #3A6347, #4A7C59)' }}
          >
            <div className="absolute w-[100px] h-[100px] rounded-full bg-white/[0.07] -top-[40px] -left-[20px] pointer-events-none" />
            <div className="flex-1 relative z-[1]">
              <div className="font-display font-black text-[14px] text-white leading-tight">
                صاحب مطعم أو كافيه؟ سجّل مجاناً
              </div>
              <div className="text-[10px] text-white/60 mt-0.5">
                {count} مكان مسجّل · انضم الآن
              </div>
            </div>
            <span className="mr-2 inline-flex items-center bg-white font-display font-extrabold text-[11px] px-3 py-[5px] rounded-full flex-shrink-0 relative z-[1] text-[#3A6347]">
              سجّل ←
            </span>
          </Link>

          {/* ─── Search Results (PDF-style grouped layout) ─── */}
          {isSearching ? (
            (searchLoading) ? (
              <div className="bg-surface border-b border-border mb-2 pb-32 divide-y divide-border">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-[46px] h-[46px] rounded-[13px] bg-border/60 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                      <div className="h-2.5 w-20 rounded-md bg-border/60 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : places.length === 0 && matchedItems.length === 0 ? (
              <div className="bg-surface border-b border-border mb-2 pb-20">
                <div className="text-center py-12">
                  <p className="text-sm text-mist">لا توجد نتائج لـ &quot;{debouncedSearch}&quot;</p>
                </div>
              </div>
            ) : (
              <div className="pb-24">
                {/* Places matching by name */}
                {places.length > 0 && (
                  <>
                    <div className="bg-olive px-4 py-2">
                      <span className="font-display font-bold text-[13px] text-white">محلات</span>
                    </div>
                    <div className="bg-surface border-b border-border">
                      {places.map((place, i) => (
                        <PlaceRow key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                      ))}
                    </div>
                  </>
                )}

                {/* Menu items matching — grouped by place (PDF style) */}
                {matchedItems.length > 0 && (() => {
                  // Group items by place_id
                  const grouped = matchedItems.reduce<Record<string, MatchedItem[]>>((acc, item) => {
                    if (!acc[item.place_id]) acc[item.place_id] = [];
                    acc[item.place_id].push(item);
                    return acc;
                  }, {});
                  const placeMap = new Map((searchData?.places ?? []).map((p) => [p.id, p]));

                  return (
                    <>
                      <div className="bg-olive px-4 py-2 mt-2">
                        <span className="font-display font-bold text-[13px] text-white">أصناف القائمة</span>
                      </div>
                      {Object.entries(grouped).map(([placeId, items]) => {
                        const place = placeMap.get(placeId);
                        if (!place) return null;
                        const isBoth = place.type === 'both';
                        const emoji = isBoth ? '🍴☕' : (EMOJI_MAP[place.type] || '🍽️');
                        return (
                          <div key={placeId} className="bg-surface border-b border-border">
                            {/* Place header — green bar like PDF */}
                            <div
                              className="flex items-center gap-2 px-4 py-2.5 bg-olive-pale border-b-2 border-olive/20 cursor-pointer hover:bg-olive-pale/80"
                              onClick={() => setSelectedPlace(place)}
                            >
                              <span className="text-[14px]">{emoji}</span>
                              <span className="font-display font-extrabold text-[12px] text-olive-deep flex-1">{place.name}</span>
                              <span className="text-[9px] text-mist">{place.area?.name_ar}</span>
                              <span className="text-[11px] text-mist">{'‹'}</span>
                            </div>
                            {/* Items — clean rows like PDF: name right, price left */}
                            {items.map((item, idx) => (
                              <div
                                key={`${placeId}-${idx}`}
                                className="flex items-center justify-between px-5 py-2.5 border-b border-border/50 last:border-b-0 cursor-pointer hover:bg-fog/50"
                                onClick={() => setSelectedPlace(place)}
                              >
                                <span className="text-[13px] font-semibold text-ink">{item.item_name}</span>
                                {Number(item.price) > 0 ? (
                                  <span className="font-display font-black text-[14px] text-olive">
                                    {item.price} <span className="text-[10px] font-normal text-mist">₪</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-mist font-semibold">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )
          ) : (
            /* ─── Normal listing (no search) ─── */
            <>
          {/* Spotlight + List */}
          {loading ? (
            <>
              {/* Carousel skeleton */}
              <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-[160px] flex-shrink-0 rounded-2xl bg-border/60 animate-pulse h-[190px]" />
                ))}
              </div>
              {/* List skeleton */}
              <div className="bg-surface border-b border-border mb-2 pb-32 divide-y divide-border">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-[46px] h-[46px] rounded-[13px] bg-border/60 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 rounded-md bg-border/60 animate-pulse" />
                      <div className="h-2.5 w-20 rounded-md bg-border/60 animate-pulse" />
                    </div>
                    <div className="h-2.5 w-12 rounded-md bg-border/60 animate-pulse" />
                  </div>
                ))}
              </div>
            </>
          ) : places.length === 0 ? (
            <div className="bg-surface border-b border-border mb-2 pb-20">
              <div className="text-center py-12">
                <p className="text-sm text-mist">لا توجد مطاعم أو مقاهي حالياً</p>
              </div>
            </div>
          ) : (
            <>
              {/* Spotlight carousel — first page only, only on "الكل" chip */}
              {chip === 0 && page === 0 && places.length > 0 && (
                <div className="px-4 pt-2 pb-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-display font-extrabold text-[13px] text-ink">الأبرز</span>
                    <span className="text-[10px] text-mist">اسحب ←</span>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
                    {places.slice(0, 4).map((place, i) => (
                      <SpotlightCard key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Compact list */}
              {((chip === 0 && page === 0) ? places.length > 4 : places.length > 0) && (
                <>
                  <div className="flex items-center justify-between px-4 py-1.5 bg-fog border-b border-border">
                    <span className="font-display font-bold text-[12px] text-mist">الكل</span>
                    <span className="text-[10px] text-mist">{chip === 0 ? (places.length > 4 ? places.length - 4 : 0) : places.length} مكان</span>
                  </div>
                  <div className={`bg-surface border-b border-border mb-2 ${totalPages <= 1 ? 'pb-20' : ''}`}>
                    {(chip === 0 && page === 0 ? places.slice(4) : places).map((place, i) => (
                      <PlaceRow key={place.id} place={place} index={i} onClick={() => setSelectedPlace(place)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 px-4 py-4 bg-surface border-t border-border pb-24">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border-[1.5px] border-border bg-fog text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors"
              >
                السابق ←
              </button>
              <span className="text-[11px] font-semibold text-mist">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl border-[1.5px] border-border bg-fog text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors"
              >
                → التالي
              </button>
            </div>
          )}
            </>
          )}
        </>
      )}

      {/* Detail Sheet */}
      {selectedPlace && (
        <PlaceSheet place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      )}

      {/* Area picker sheet */}
      {openAreaPicker && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setOpenAreaPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl max-h-[75vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.15)]">
            <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
              <h2 className="font-display font-bold text-ink">اختر المنطقة</h2>
              <button onClick={() => setOpenAreaPicker(false)} className="text-mist hover:text-ink p-1 text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto no-scrollbar flex-1 px-4 py-3 pb-8">
              {/* All areas option */}
              <button
                onClick={() => { setPlacesArea(null); setOpenAreaPicker(false); setPage(0); }}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-2xl border-[1.5px] mb-2 transition-all text-right',
                  !placesArea ? 'border-olive bg-olive-pale' : 'border-border bg-surface hover:border-olive-mid'
                )}
              >
                <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', !placesArea ? 'border-olive bg-olive' : 'border-border')}>
                  {!placesArea && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={cn('font-display font-bold text-sm', !placesArea ? 'text-olive-deep' : 'text-ink')}>كل المناطق</span>
              </button>

              {govOrder.map((gov) => {
                const govAreas = grouped[gov];
                if (!govAreas?.length) return null;
                return (
                  <div key={gov} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[11px] font-bold text-mist uppercase tracking-widest">{GOV_LABELS[gov] || gov}</span>
                    </div>
                    {govAreas.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setPlacesArea(a); setOpenAreaPicker(false); setPage(0); }}
                        className={cn(
                          'w-full flex items-center gap-3 p-3.5 rounded-2xl border-[1.5px] mb-2 transition-all text-right',
                          placesArea?.id === a.id ? 'border-olive bg-olive-pale' : 'border-border bg-surface hover:border-olive-mid'
                        )}
                      >
                        <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', placesArea?.id === a.id ? 'border-olive bg-olive' : 'border-border')}>
                          {placesArea?.id === a.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={cn('font-display font-bold text-sm', placesArea?.id === a.id ? 'text-olive-deep' : 'text-ink')}>{a.name_ar}</div>
                          <div className="text-xs text-mist mt-0.5">{gov}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}

/* ─── Spotlight Card (top 3 carousel) ─── */
const CARD_GRADIENTS = [
  'from-[#4A7C59] to-[#3A6347]',
  'from-[#5C7A4A] to-[#465E38]',
  'from-[#3D6B5A] to-[#2D5244]',
];

function SpotlightCard({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const isBoth = place.type === 'both';
  const emoji = isBoth ? null : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : place.section === 'workspace' ? '💻' : '🏪'));
  const gradient = CARD_GRADIENTS[index % 3];
  const placeTypeLabel = typeLabel(place.type);

  const hasAvatar = !!place.avatar_url;

  return (
    <div
      onClick={onClick}
      className="w-[155px] lg:w-auto h-[185px] flex-shrink-0 rounded-2xl relative overflow-hidden cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all"
      style={{ animation: `slideUp 0.3s ease both ${0.1 * (index + 1)}s` }}
    >
      {/* Background */}
      {hasAvatar ? (
        <img src={place.avatar_url!} alt="" className="absolute inset-0 w-full h-full object-cover scale-[1.05]" loading="eager" />
      ) : (
        <div className="absolute inset-0 bg-surface border-[0.5px] border-confirm" />
      )}
      {/* Dark overlay for readability when avatar exists */}
      {hasAvatar && <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />}

      {/* Content */}
      <div className="relative z-[1] h-full flex flex-col justify-between p-3">
        {/* Top: status + emoji */}
        <div className="flex items-center justify-between">
          {place.is_open ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white bg-olive/80 backdrop-blur-sm px-2 py-[3px] rounded-full">
              <span className="w-[5px] h-[5px] rounded-full bg-white animate-pulse" />
              مفتوح
            </span>
          ) : (
            <span className="inline-flex text-[9px] font-semibold text-white/80 bg-black/30 backdrop-blur-sm px-2 py-[3px] rounded-full">مغلق</span>
          )}
          {!hasAvatar && (
            <span className={`${isBoth ? 'text-[14px]' : 'text-[16px]'}`}>
              {isBoth ? <span className="flex items-center -space-x-1"><span>🍴</span><span>☕</span></span> : emoji}
            </span>
          )}
        </div>

        {/* Bottom: info */}
        <div>
          <div className={`font-display font-bold text-sm mb-1 leading-tight line-clamp-2 ${hasAvatar ? 'text-white' : 'text-ink'}`}>
            {place.name}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-semibold px-1.5 py-[2px] rounded-full ${hasAvatar ? 'bg-white/20 text-white backdrop-blur-sm' : 'bg-olive-pale text-olive'}`}>
              {placeTypeLabel}
            </span>
            <span className={`text-[10px] truncate ${hasAvatar ? 'text-white/70' : 'text-mist'}`}>
              {place.area?.name_ar}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Store type → accent color mapping ─── */
/* ── Parent category accent definitions ── */
const _A_GREEN   = { border: '#1E4D2B', bg: '#E8F5EE', text: '#1E4D2B', ring: 'linear-gradient(135deg, #1E4D2B, #4CAF50)' };
const _A_BLUE    = { border: '#3B82F6', bg: '#EFF6FF', text: '#1A3A5C', ring: 'linear-gradient(135deg, #1A3A5C, #60A5FA)' };
const _A_AMBER   = { border: '#F59E0B', bg: '#FFFBEB', text: '#B45309', ring: 'linear-gradient(135deg, #B45309, #FBBF24)' };
const _A_PURPLE  = { border: '#7C3AED', bg: '#F5F3FF', text: '#7C3AED', ring: 'linear-gradient(135deg, #6D28D9, #A78BFA)' };
const _A_SLATE   = { border: '#475569', bg: '#F1F5F9', text: '#475569', ring: 'linear-gradient(135deg, #334155, #94A3B8)' };
const _A_ORANGE  = { border: '#C2410C', bg: '#FFF7ED', text: '#C2410C', ring: 'linear-gradient(135deg, #9A3412, #FB923C)' };
const _A_TEAL    = { border: '#0D9488', bg: '#F0FDFA', text: '#0D9488', ring: 'linear-gradient(135deg, #0F766E, #5EEAD4)' };
const _A_PINK    = { border: '#DB2777', bg: '#FDF2F8', text: '#DB2777', ring: 'linear-gradient(135deg, #BE185D, #F9A8D4)' };
const _A_INDIGO  = { border: '#4338CA', bg: '#EEF2FF', text: '#4338CA', ring: 'linear-gradient(135deg, #3730A3, #818CF8)' };
const _A_EMERALD = { border: '#059669', bg: '#ECFDF5', text: '#059669', ring: 'linear-gradient(135deg, #047857, #6EE7B7)' };

const STORE_ACCENT: Record<string, { border: string; bg: string; text: string; ring: string }> = {
  // 🛒 مواد غذائية وبقالة
  'بقالية عامة': _A_GREEN, 'سوبرماركت': _A_GREEN, 'خضار وفواكه': _A_GREEN, 'لحوم': _A_GREEN,
  'سمك': _A_GREEN, 'مخبز': _A_GREEN, 'حلويات ومعجنات': _A_GREEN, 'بهارات وتوابل': _A_GREEN,
  // 💊 صحة وصيدلية
  'صيدلية': _A_BLUE, 'عيادة وطب': _A_BLUE, 'مستلزمات طبية': _A_BLUE, 'بصريات': _A_BLUE,
  // 👕 ملابس وأزياء
  'ملابس رجالي': _A_AMBER, 'ملابس حريمي': _A_AMBER, 'ملابس أطفال': _A_AMBER,
  'أحذية': _A_AMBER, 'إكسسوارات': _A_AMBER, 'خياطة وتعديل': _A_AMBER,
  // 🏠 منزل وأثاث
  'أثاث منزلي': _A_PURPLE, 'مفروشات وستائر': _A_PURPLE, 'أدوات منزلية': _A_PURPLE,
  'كهرباء ولوازم منزلية': _A_PURPLE, 'نظافة ومنظفات': _A_PURPLE, 'أدوات صحية وسباكة': _A_PURPLE,
  // 📱 إلكترونيات وتقنية
  'موبايل وإكسسوارات': _A_SLATE, 'كمبيوتر ولاب توب': _A_SLATE, 'كهربائيات': _A_SLATE,
  'طاقة شمسية': _A_SLATE, 'إصلاح وصيانة': _A_SLATE,
  // 🏗️ بناء ومواد
  'مواد بناء': _A_ORANGE, 'حديد وألمنيوم': _A_ORANGE, 'دهانات وديكور': _A_ORANGE,
  'أخشاب': _A_ORANGE, 'سيراميك وبلاط': _A_ORANGE,
  // 📚 تعليم وثقافة
  'مكتبة وقرطاسية': _A_TEAL, 'ألعاب أطفال': _A_TEAL, 'أدوات رسم وفنون': _A_TEAL,
  // 💈 خدمات شخصية
  'حلاقة وصالون': _A_PINK, 'عطور وكوزمتيك': _A_PINK, 'تصوير': _A_PINK,
  // 🚗 سيارات
  'قطع غيار سيارات': _A_INDIGO, 'كراج وميكانيك': _A_INDIGO, 'إطارات': _A_INDIGO,
  // 🌿 زراعة وحيوانات
  'مستلزمات زراعية': _A_EMERALD, 'علف وبيطري': _A_EMERALD, 'أخرى': _A_EMERALD,
};
const DEFAULT_ACCENT = _A_GREEN;

/* ─── Store Card — Accent Bar ─── */
function StoreCard({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const closed = !place.is_open;
  const emoji = EMOJI_MAP[place.type] || '🏪';
  const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-border flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] active:scale-[0.99] ${closed ? 'opacity-55' : ''}`}
      style={{ animation: `slideUp 0.22s ease both ${0.04 * (index + 1)}s` }}
    >
      {/* Emoji */}
      <div className="w-[42px] h-[42px] rounded-full bg-fog flex items-center justify-center text-[20px] flex-shrink-0 overflow-hidden">
        {place.avatar_url ? (
          <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
        ) : (
          emoji
        )}
      </div>

      {/* Name + type flag */}
      <div className="flex-1 min-w-0">
        <div className="font-display font-extrabold text-[13px] text-ink truncate mb-[3px]">{place.name}</div>
        <div className="flex items-center gap-[6px]">
          <span
            className="text-[10px] font-bold px-[7px] py-[2px] rounded-full shadow-sm"
            style={{ background: accent.bg, color: accent.text, boxShadow: `0 1px 4px ${accent.border}30` }}
          >
            {place.type || 'متجر'}
          </span>
          <span className="text-[10px] text-mist flex items-center gap-[2px]">
            <svg viewBox="0 0 24 24" className="w-[9px] h-[9px]" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
            {place.area?.name_ar}
          </span>
        </div>
      </div>

      {/* Status + count */}
      <div className="flex flex-col items-end gap-[3px] flex-shrink-0">
        {place.is_open ? (
          <span className="flex items-center gap-[3px] text-[10px] font-bold text-olive">
            <span className="w-[5px] h-[5px] rounded-full bg-olive" />مفتوح
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-mist">مغلق</span>
        )}
        {(place as any).menu_items_count != null && (
          <span className="text-[9px] text-mist">{(place as any).menu_items_count} منتج</span>
        )}
      </div>
    </div>
  );
}

/* ─── Place Row ─── */
function PlaceRow({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const { theme } = useTheme();
  const isBoth = place.type === 'both';
  const emoji = isBoth ? null : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : place.section === 'workspace' ? '💻' : '🏪'));
  const colors = BG_MAP[place.type] || ['#F9FAFB', '#1A1D23'];
  const bg = theme === 'dark' ? colors[1] : colors[0];
  const closed = !place.is_open;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-olive-pale/40 active:bg-olive-pale relative ${
        closed ? 'opacity-60' : ''
      }`}
      style={{ animation: `slideUp 0.25s ease both ${0.04 * (index + 1)}s` }}
    >
      {/* Avatar */}
      <div
        className={`w-[46px] h-[46px] ${place.avatar_url ? 'rounded-full' : 'rounded-[13px]'} flex items-center justify-center flex-shrink-0 relative overflow-hidden ${
          closed ? 'border-2 border-border' : 'border-2 border-olive'
        } ${!place.avatar_url && isBoth ? 'text-[10px] gap-0' : !place.avatar_url ? 'text-[22px]' : ''}`}
        style={{ background: closed ? 'var(--color-fog)' : bg }}
      >
        {place.avatar_url ? (
          <img src={place.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : isBoth ? <span className="flex items-center -space-x-1"><span>🍴</span><span>☕</span></span> : emoji}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-2 border-surface ${
            closed ? 'bg-mist' : 'bg-olive'
          }`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-display font-extrabold text-[13px] text-ink truncate">
            {place.name}
          </span>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-olive-pale text-olive border border-olive/15 flex-shrink-0">
            {typeLabel(place.type)}
          </span>
        </div>
        <div className="text-[10px] text-mist mb-0.5">
          📍 {place.area?.name_ar}{place.address ? ` — ${place.address}` : ''}
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {place.is_open ? (
          <span className="text-[9px] font-bold text-olive">● مفتوح</span>
        ) : (
          <span className="text-[9px] font-semibold text-mist">مغلق</span>
        )}
        <span className="text-sm text-mist">{'‹'}</span>
      </div>
    </div>
  );
}

/* ─── Workspace Card ─── */
const SERVICE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  wifi: { label: 'WiFi', icon: <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg> },
  electricity: { label: 'كهرباء', icon: <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M13 2l-2 6.5H5l5.5 4-2 6.5L14 15l5.5 4-2-6.5L23 8.5H16z"/></svg> },
  printing: { label: 'طباعة', icon: <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> },
  screens: { label: 'شاشات', icon: <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  private_rooms: { label: 'غرف خاصة', icon: <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg> },
  drinks: { label: 'مشروبات', icon: <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg> },
};

function formatTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m ? `${h12}:${String(m).padStart(2,'0')} ${period}` : `${h12}:00 ${period}`;
}

function WorkspaceCard({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const closed = !place.is_open;
  const wd = place.workspace_details;
  const services = place.workspace_services?.filter(s => s.available) || [];

  // Pick best price to show on card
  const priceDisplay = wd?.price_hour ? { val: wd.price_hour, unit: '/ ساعة' }
    : wd?.price_day ? { val: wd.price_day, unit: '/ يوم' }
    : wd?.price_month ? { val: wd.price_month, unit: '/ شهر' }
    : null;

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] flex flex-col ${closed ? 'opacity-60' : ''}`}
      style={{ animation: `slideUp 0.25s ease both ${0.05 * (index + 1)}s` }}
    >
      {/* Header: avatar + name + status */}
      <div className="flex items-center gap-3 p-4">
        <div
          className={`w-[48px] h-[48px] rounded-[14px] flex items-center justify-center flex-shrink-0 text-[20px] border-[1.5px] ${
            closed ? 'bg-fog border-border' : 'bg-[#EEF2FF] border-[rgba(30,77,43,0.15)]'
          }`}
        >
          {place.avatar_url ? (
            <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-[14px]" loading="lazy" />
          ) : '💻'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-extrabold text-[14px] text-ink truncate">{place.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-mist flex items-center gap-1 truncate">
              <svg viewBox="0 0 24 24" className="w-[9px] h-[9px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {place.area?.name_ar}
            </span>
            <span className="text-mist">·</span>
            {place.is_open ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-olive flex-shrink-0">
                <span className="w-[5px] h-[5px] rounded-full bg-olive" />مفتوح
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-mist flex-shrink-0">مغلق</span>
            )}
          </div>
        </div>
      </div>

      {/* Info row: price + hours + seats */}
      <div className="flex items-center gap-2 flex-wrap px-4 pb-3">
        {priceDisplay && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-olive bg-olive-pale border border-olive/15">
            {priceDisplay.val} ₪ <span className="font-normal text-olive/70">{priceDisplay.unit}</span>
          </span>
        )}
        {wd?.total_seats ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#3B82F6] bg-[#EFF6FF] border border-[#BFDBFE]">
            <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            {wd.total_seats} مقعد
          </span>
        ) : null}
        {wd?.opens_at && wd?.closes_at && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] text-mist bg-fog border border-border">
            <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {formatTime(wd.opens_at)} — {formatTime(wd.closes_at)}
          </span>
        )}
      </div>

      {/* Services chips */}
      {services.length > 0 && (
        <div className="flex gap-1.5 flex-wrap px-4 pb-3">
          {services.slice(0, 4).map(s => {
            const info = SERVICE_LABELS[s.service];
            return (
              <span key={s.service} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-mist bg-fog">
                {info?.icon}{info?.label || s.service}
              </span>
            );
          })}
        </div>
      )}

      {/* Spacer to push footer down */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border mt-auto">
        {place.address ? (
          <span className="text-[10px] text-mist flex items-center gap-1 truncate max-w-[60%]">
            <svg viewBox="0 0 24 24" className="w-[10px] h-[10px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {place.address}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[11px] font-bold text-olive flex-shrink-0">التفاصيل ←</span>
      </div>
    </div>
  );
}

/* ─── Detail Sheet ─── */
interface MenuItem {
  id?: string;
  name: string;
  price: number;
  available: boolean;
  icon?: string | null;
  photo_url?: string | null;
  updated_at?: string;
}

function resolvePublicImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  if (!base) return url;
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

const FLAG_REASONS = [
  { value: 'wrong_price', label: 'السعر غلط' },
  { value: 'not_available', label: 'غير متوفر' },
  { value: 'wrong_info', label: 'معلومات خاطئة' },
  { value: 'other', label: 'أخرى' },
];

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

const SERVICE_DETAIL_COLORS: Record<string, { bg: string; stroke: string }> = {
  wifi: { bg: '#EFF6FF', stroke: '#3B82F6' },
  electricity: { bg: '#FFFBEB', stroke: '#F59E0B' },
  printing: { bg: '#EFF6FF', stroke: '#3B82F6' },
  screens: { bg: '#EFF6FF', stroke: '#3B82F6' },
  private_rooms: { bg: '#FEF0EB', stroke: '#E05C35' },
  drinks: { bg: '#E8F5EE', stroke: '#1E4D2B' },
};

function WorkspaceSheetContent({ place }: { place: Place }) {
  const wd = place.workspace_details;
  const services = place.workspace_services || [];

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
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
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
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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
              <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div>
              <div className="text-[11px] text-mist">الطاقة الاستيعابية</div>
              <div className="text-[13px] font-bold text-ink">{wd.total_seats} مقعد</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Services section */}
      {services.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-olive rounded-sm" />
            <span className="font-display font-extrabold text-[13px] text-ink">الخدمات المتاحة</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {services.map(s => {
              const info = SERVICE_LABELS[s.service];
              const colors = SERVICE_DETAIL_COLORS[s.service] || { bg: '#E8F5EE', stroke: '#1E4D2B' };
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 p-3 rounded-xl border ${
                    s.available
                      ? 'bg-olive-pale border-olive/20'
                      : 'bg-fog border-border opacity-50'
                  }`}
                >
                  <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: colors.bg }}>
                    <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke={colors.stroke} strokeWidth={2} strokeLinecap="round">
                      {s.service === 'wifi' && <><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></>}
                      {s.service === 'electricity' && <path d="M13 2l-2 6.5H5l5.5 4-2 6.5L14 15l5.5 4-2-6.5L23 8.5H16z"/>}
                      {s.service === 'printing' && <><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>}
                      {s.service === 'screens' && <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>}
                      {s.service === 'private_rooms' && <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></>}
                      {s.service === 'drinks' && <><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></>}
                    </svg>
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-ink">{info?.label || s.service}</div>
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

function PlaceSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const isBoth = place.type === 'both';
  const emoji = isBoth ? '🍴☕' : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : place.section === 'workspace' ? '💻' : '🏪'));
  const [menuSections, setMenuSections] = useState<{ name: string; items: MenuItem[] }[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

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
        const res = await apiFetch(`/api/places/${place.id}/menu?no_cache=1&_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setMenuSections(data.data || data || []);
        }
      } catch {
        // menu endpoint might not exist yet
      }
      setMenuLoading(false);
    };
    fetchMenu();
  }, [place.id]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-0 bg-fog z-50 flex flex-col animate-slideIn">
        {/* Header */}
        <div className="bg-olive p-4 pb-5 flex-shrink-0 relative overflow-hidden">
          <div className="absolute w-[140px] h-[140px] rounded-full bg-white/[0.06] -bottom-[50px] -left-5 pointer-events-none" />

          {/* Back row */}
          <div className="flex items-center gap-2 mb-3 relative z-[1]">
            <button
              onClick={onClose}
              className="w-[30px] h-[30px] bg-white/[0.12] rounded-lg flex items-center justify-center text-white font-bold text-[15px]"
            >
              {'›'}
            </button>
            <span className="font-display font-bold text-[13px] text-white">
              {place.section === 'food' ? 'القائمة الكاملة' : place.section === 'workspace' ? 'تفاصيل مساحة العمل' : 'تفاصيل المتجر'}
            </span>
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
            <WorkspaceSheetContent place={place} />
          ) : menuLoading ? (
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
          ) : menuSections.length > 0 ? (
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
                {sec.items.map((item, idx) => {
                  const photoUrl = resolvePublicImageUrl(item.photo_url);
                  return (
                  <div
                    key={item.id || `${item.name}-${idx}`}
                    className={`bg-surface rounded-2xl mb-2.5 shadow-sm border border-border/60 overflow-hidden transition-all hover:shadow-md ${!item.available ? 'opacity-45' : ''}`}
                  >
                    <div className="flex items-center gap-0">
                      {/* Square image */}
                      {photoUrl ? (
                        <div className="w-[110px] h-[110px] flex-shrink-0 p-2 flex flex-col">
                          <div className="relative flex-1 rounded-xl overflow-hidden">
                            <img
                              src={photoUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={() => setImagePreviewUrl(photoUrl)}
                              className="absolute bottom-1 left-1 bg-olive text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow"
                            >
                              عرض الصورة
                            </button>
                          </div>
                        </div>
                      ) : item.icon ? (
                        <div className="w-[110px] h-[110px] flex-shrink-0 p-2">
                          <div className="w-full h-full bg-olive-pale rounded-xl flex items-center justify-center text-[32px]">
                            {item.icon}
                          </div>
                        </div>
                      ) : null}

                      {/* Content */}
                      <div className="flex-1 px-3 py-3 min-w-0">
                        {/* Name row + عرض الصورة badge */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-bold text-[13px] text-ink leading-snug flex-1">{item.name}</div>
                          {!item.available && (
                            <span className="flex-shrink-0 bg-orange-50 text-orange-500 text-[9px] font-bold px-2 py-0.5 rounded-full border border-orange-200">غير متوفر</span>
                          )}
                        </div>

                        {/* Description */}
                        {item.description && (
                          <p className="text-[11px] text-mist leading-snug line-clamp-2 mb-1.5">{item.description}</p>
                        )}

                        {/* Price + flag row */}
                        <div className="flex items-center justify-between mt-1">
                          {item.available && Number(item.price) > 0 ? (
                            <span className="font-display font-black text-[17px] text-olive">
                              {item.price} <span className="text-[10px] font-normal text-mist">₪</span>
                            </span>
                          ) : item.available ? (
                            <span className="text-[11px] text-mist">—</span>
                          ) : null}
                          {item.id && (
                            <button onClick={() => openFlag(item)} className="text-[9px] font-semibold text-mist/50 hover:text-sand transition-colors mr-auto mr-0">
                              🚩 إبلاغ
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            ))}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-mist">لا توجد قائمة أسعار بعد</p>
              <p className="text-xs text-mist mt-1">📍 {place.area?.name_ar} · {typeLabel(place.type)}</p>
            </div>
          )}
        </div>

        {/* ══ FLAG SHEET ══ */}
        {flagItem && (
          <>
            <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => !flagSubmitting && setFlagItem(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.2)]" dir="rtl">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="font-display font-bold text-[14px] text-ink">🚩 إبلاغ عن سعر خاطئ</h3>
                  <p className="text-[11px] text-mist mt-0.5">{flagItem.name}{Number(flagItem.price) > 0 ? ` — ${flagItem.price} ₪` : ''}</p>
                </div>
                <button
                  onClick={() => !flagSubmitting && setFlagItem(null)}
                  className="text-mist hover:text-ink p-1 text-lg leading-none"
                >×</button>
              </div>

              <div className="overflow-y-auto flex-1 px-4 py-3 pb-6">
                {flagDone ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-olive-pale border-[3px] border-olive flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">✅</span>
                    </div>
                    <h4 className="font-display font-black text-lg text-ink mb-1">شكراً لمساعدتك!</h4>
                    <p className="text-[13px] text-mist">سيتم مراجعة البلاغ وتحديث السعر</p>
                  </div>
                ) : (
                  <>
                    {/* Reason picker */}
                    <div className="mb-4">
                      <div className="text-[12px] font-bold text-slate mb-1.5">سبب البلاغ</div>
                      <div className="flex flex-wrap gap-2">
                        {FLAG_REASONS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setFlagReason(r.value)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border-[1.5px] transition-colors ${
                              flagReason === r.value
                                ? 'bg-sand/15 border-sand text-sand'
                                : 'bg-surface border-border text-mist hover:border-sand/50'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Correct price */}
                    {flagReason === 'wrong_price' && (
                      <div className="mb-4">
                        <div className="text-[12px] font-bold text-slate mb-1.5">السعر الصحيح (اختياري)</div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={flagCorrectPrice}
                            onChange={(e) => setFlagCorrectPrice(e.target.value)}
                            placeholder="0"
                            className="flex-1 bg-surface border-[1.5px] border-border rounded-xl px-3 py-2.5 text-[14px] text-ink font-body outline-none transition-colors placeholder:text-mist focus:border-olive-mid"
                          />
                          <div className="bg-olive-pale border-[1.5px] border-olive rounded-xl px-3 py-2.5 text-[14px] font-display font-extrabold text-olive flex-shrink-0">₪</div>
                        </div>
                      </div>
                    )}

                    {/* Note */}
                    <div className="mb-4">
                      <div className="text-[12px] font-bold text-slate mb-1.5">ملاحظة (اختياري)</div>
                      <input
                        type="text"
                        value={flagNote}
                        onChange={(e) => setFlagNote(e.target.value)}
                        placeholder="مثال: السعر ارتفع من أمس..."
                        className="w-full bg-surface border-[1.5px] border-border rounded-xl px-3 py-2.5 text-[13px] text-ink font-body outline-none transition-colors placeholder:text-mist focus:border-olive-mid"
                      />
                    </div>

                    {/* Proof photo */}
                    <div className="mb-5">
                      <div className="text-[12px] font-bold text-slate mb-1.5">صورة إثبات (مطلوب للتحقق الأسرع)</div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        onChange={handleFlagPhoto}
                        className="hidden"
                        id="flag-photo-input"
                      />
                      <label
                        htmlFor="flag-photo-input"
                        className={cn(
                          'block border-2 border-dashed rounded-2xl p-5 text-center transition-colors cursor-pointer',
                          flagPhoto ? 'border-olive bg-olive-pale' : 'border-border bg-fog/50 hover:border-olive-mid'
                        )}
                      >
                        {flagUploading ? (
                          <p className="text-sm text-mist">جاري الرفع...</p>
                        ) : flagPhoto ? (
                          <div className="space-y-1.5">
                            <span className="text-2xl block">✓</span>
                            <p className="text-sm text-olive font-semibold">تم رفع صورة الإثبات</p>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setFlagPhoto(null); }}
                              className="text-xs text-mist hover:text-ink underline"
                            >إزالة</button>
                          </div>
                        ) : (
                          <>
                            <span className="text-2xl block mb-1">📸</span>
                            <p className="text-[12px] text-mist font-semibold">صوّر السعر الحقيقي أو الإيصال</p>
                            <p className="text-[10px] text-mist mt-0.5">JPG, PNG حتى 5 ميجابايت</p>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Error */}
                    {flagError && (
                      <div className="mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-[12px]">
                        {flagError}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      onClick={submitFlag}
                      disabled={flagSubmitting || flagUploading}
                      className={cn(
                        'w-full font-display font-extrabold text-[14px] rounded-2xl py-3 flex items-center justify-center gap-2 transition-all',
                        flagSubmitting || flagUploading
                          ? 'bg-border text-mist cursor-not-allowed'
                          : 'bg-sand text-white shadow-[0_4px_12px_rgba(196,142,68,0.3)] hover:bg-[#b8813e]'
                      )}
                    >
                      {flagSubmitting ? 'جاري الإرسال...' : '🚩 إرسال البلاغ'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══ IMAGE PREVIEW ══ */}
        {imagePreviewUrl && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-[80]"
              onClick={() => setImagePreviewUrl(null)}
            />
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" dir="rtl">
              <div className="relative w-full max-w-md">
                <button
                  type="button"
                  onClick={() => setImagePreviewUrl(null)}
                  className="absolute -top-3 -left-3 w-9 h-9 rounded-full bg-white text-[#111827] shadow-lg flex items-center justify-center text-xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={imagePreviewUrl}
                    alt=""
                    className="w-full h-auto max-h-[80vh] object-contain bg-black"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── Desktop Place Card ─── */
function DesktopPlaceCard({ place, onClick }: { place: Place; onClick: () => void }) {
  const { theme } = useTheme();
  const isBoth = place.type === 'both';
  const emoji = isBoth ? null : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : place.section === 'workspace' ? '💻' : '🏪'));
  const colors = BG_MAP[place.type] || ['#F9FAFB', '#1A1D23'];
  const bg = theme === 'dark' ? colors[1] : colors[0];
  const closed = !place.is_open;
  const placeTypeLabel = typeLabel(place.type);

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-olive/30 hover:-translate-y-0.5 ${closed ? 'opacity-60' : ''}`}
    >
      {/* Avatar / header area */}
      <div className="h-[100px] relative overflow-hidden" style={{ background: place.avatar_url ? undefined : bg }}>
        {place.avatar_url ? (
          <img src={place.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isBoth ? (
              <span className="text-3xl flex items-center -space-x-1"><span>🍴</span><span>☕</span></span>
            ) : (
              <span className="text-4xl">{emoji}</span>
            )}
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {place.is_open ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white bg-olive/80 backdrop-blur-sm px-2 py-[3px] rounded-full">
              <span className="w-[5px] h-[5px] rounded-full bg-white animate-pulse" />
              مفتوح
            </span>
          ) : (
            <span className="inline-flex text-[9px] font-semibold text-white/90 bg-black/40 backdrop-blur-sm px-2 py-[3px] rounded-full">مغلق</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="font-display font-extrabold text-[13px] text-ink mb-1 truncate">{place.name}</div>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-olive-pale text-olive border border-olive/15">{placeTypeLabel}</span>
          <span className="text-[10px] text-mist truncate">📍 {place.area?.name_ar}</span>
        </div>
        {place.address && (
          <div className="text-[10px] text-mist truncate">{place.address}</div>
        )}
      </div>
    </div>
  );
}
