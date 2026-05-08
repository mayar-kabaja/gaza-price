'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { useArea } from '@/hooks/useArea';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useQueryClient } from '@tanstack/react-query';
import { useAreas, usePlaces, usePlacesSearch } from '@/lib/queries/hooks';
import { queryKeys, fetchPlaces } from '@/lib/queries/fetchers';
import type { Place, MatchedItem } from '@/lib/api/places';
import type { Area } from '@/types/app';
import { cn } from '@/lib/utils';
import { useGlobalSidebar } from '@/components/layout/GlobalDesktopShell';

type Section = 'food' | 'store' | 'workspace';

/** Deterministic shuffle — changes every 12 hours */
function shuffleFeatured<T>(arr: T[], maxItems: number): T[] {
  if (arr.length === 0) return [];
  const seed = Math.floor(Date.now() / (12 * 60 * 60 * 1000));
  const copy = arr.slice(0, Math.min(arr.length, 30));
  for (let i = copy.length - 1; i > 0; i--) {
    const hash = ((seed * 2654435761 + i * 40503) >>> 0) % (i + 1);
    [copy[i], copy[hash]] = [copy[hash], copy[i]];
  }
  return copy.slice(0, maxItems);
}

const PAGE_SIZE = 20;

const FOOD_CHIPS = ['الكل', 'مطعم وكافيه', 'مطاعم', 'كافيه', 'مفتوح'];
const STORE_CHIPS = ['الكل', 'غذائية', 'صحة', 'ملابس', 'منزل', 'إلكترونيات', 'بناء', 'تعليم', 'خدمات', 'سيارات', 'زراعة', 'مفتوح'];
const WORKSPACE_CHIPS = ['الكل', 'مفتوح', 'الأقل سعراً', 'واي فاي', 'كهرباء', 'غرف خاصة', 'طباعة', 'مشروبات'];

// Map chip labels to DB type values for filtering
const CHIP_TO_TYPE: Record<string, string | string[]> = {
  'مطاعم': 'restaurant',
  'كافيه': 'cafe',
  'مطعم وكافيه': 'both',
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
  if (type === 'both') return 'مطعم وكافيه';
  if (type === 'restaurant') return 'مطعم';
  if (type === 'cafe') return 'كافيه';
  if (type === 'workspace') return 'مساحة عمل';
  return type;
}

/** Extract Arabic portion of a name like "Pizza AlTaboon - بيتزا الطابون" */
function arabicName(name: string): string {
  const parts = name.split(' - ');
  if (parts.length >= 2) {
    // Return the part that contains Arabic characters
    const arabic = parts.find(p => /[\u0600-\u06FF]/.test(p));
    if (arabic) return arabic.trim();
  }
  return name;
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
  'workspace': '💻',
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
  'workspace': _indigo,
};

export default function PlacesPage() {
  return (
    <Suspense fallback={null}>
      <PlacesContent />
    </Suspense>
  );
}

function PlacesContent() {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section') as Section | null;
  const section: Section = (sectionParam === 'food' || sectionParam === 'store' || sectionParam === 'workspace') ? sectionParam : 'food';
  const setSection = (s: Section) => { router.push(`/places?section=${s}`, { scroll: false }); };
  const [chip, setChip] = useState(0);
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
  const [openGovs, setOpenGovs] = useState<Record<string, boolean>>({});

  // "الكل" chip (0) = all areas, other chips = user's saved area
  const activeArea = placesArea;

  const { data: searchData, isLoading: searchLoading } = usePlacesSearch(debouncedSearch, section, activeArea?.id);

  const chips = section === 'food' ? FOOD_CHIPS : section === 'workspace' ? WORKSPACE_CHIPS : STORE_CHIPS;

  // Fetch ALL places for this section (no pagination limit) so client-side filtering works correctly
  const { data: placesData, isLoading: loading } = usePlaces(section, activeArea?.id, 500, 0);
  const allPlaces = placesData?.places ?? [];

  // Prefetch other sections so switching is instant
  const qc = useQueryClient();
  useEffect(() => {
    const others = (['food', 'store', 'workspace'] as const).filter(s => s !== section);
    others.forEach(s => {
      qc.prefetchQuery({
        queryKey: queryKeys.places(s, activeArea?.id, 500, 0),
        queryFn: () => fetchPlaces(s, activeArea?.id, 500, 0),
        staleTime: 30 * 1000,
      });
    });
  }, [section, activeArea?.id, qc]);

  const isSearching = debouncedSearch.length >= 1;
  const matchedItems = searchData?.matched_items ?? [];

  // Filter places by selected chip
  const filteredPlaces = useMemo(() => {
    if (isSearching) return searchData?.places ?? [];

    let filtered = allPlaces;
    const chipLabel = chips[chip];
    if (chipLabel && chipLabel !== 'الكل') {
      if (chipLabel === 'مفتوح') filtered = filtered.filter((p) => p.is_open);
      else if (section === 'workspace') {
        const serviceMap: Record<string, string> = {
          'واي فاي': 'wifi', 'كهرباء': 'electricity', 'غرف خاصة': 'private_rooms',
          'طباعة': 'printing', 'مشروبات': 'drinks',
        };
        const serviceKey = serviceMap[chipLabel];
        if (serviceKey) {
          filtered = filtered.filter((p) => {
            const services = (p as any).workspace_services;
            return Array.isArray(services) && services.some((s: any) => s.service === serviceKey && s.available);
          });
        }
        // 'الأقل سعراً' is handled in the sort section below
      } else {
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

      if (chipLabel === 'الأقل سعراً') {
        // Sort by cheapest: price_hour first, fallback to price_day
        filtered = [...filtered].sort((a, b) => {
          const aWd = (a as any).workspace_details;
          const bWd = (b as any).workspace_details;
          const aPrice = aWd?.price_hour ?? aWd?.price_day ?? Infinity;
          const bPrice = bWd?.price_hour ?? bWd?.price_day ?? Infinity;
          return aPrice - bPrice;
        });
      } else {
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
    }
    return filtered;
  }, [isSearching, searchData, allPlaces, chip, chips, section]);

  const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / PAGE_SIZE));
  const places = filteredPlaces.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const isAllChip = !chips[chip] || chips[chip] === 'الكل';
  const count = isAllChip && !isSearching ? (placesData?.total ?? filteredPlaces.length) : filteredPlaces.length;

  // Featured places — random shuffle, changes every 12 hours
  const featured = useMemo(() => shuffleFeatured(places, 10), [places]);

  const grouped = areas.reduce<Record<string, Area[]>>((acc, a) => {
    const g = a.governorate;
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});
  const govOrder = ['central', 'south', 'north'];

  useGlobalSidebar(isDesktop ? (
    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col -m-3">
      {/* Place types — nested under محلات */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-sm font-display font-extrabold text-ink">محلات</span>
        </div>
        <div className="space-y-0.5 pr-2">
          {([
            { key: 'food' as Section, label: 'مطاعم وكافيهات' },
            { key: 'workspace' as Section, label: 'مساحات عمل' },
            { key: 'store' as Section, label: 'متاجر' },
          ] as const).map((item) => (
            <div key={item.key}>
              <button
                onClick={() => { setSection(item.key); setChip(0); setPage(0); }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-body transition-colors text-right cursor-pointer',
                  section === item.key
                    ? 'bg-olive-pale text-olive font-semibold'
                    : 'text-slate hover:bg-fog hover:text-ink'
                )}
              >
                <span>{item.label}</span>
                {section === item.key && (
                  <span className="mr-auto w-1.5 h-1.5 rounded-full bg-olive" />
                )}
              </button>
              {item.key === 'food' && (
                <Link
                  href="/orders"
                  className="w-full flex items-center gap-2 px-5 py-1.5 rounded-lg text-[12px] font-body transition-colors text-right cursor-pointer text-mist hover:bg-fog hover:text-olive"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
                  <span>طلباتي</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-4 border-t border-border/60" />

      {/* Area filter */}
      <div className="px-4 py-3">
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
      <div className="mx-4 border-t border-border/60" />
      {section === 'food' && (
        <div className="px-4 pb-3 pt-3">
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
        <div className="px-4 pb-3 pt-3">
          <div className="text-[11px] font-bold text-mist uppercase tracking-widest mb-2">تصفية</div>
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
        <div className="px-4 pb-3 pt-3">
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

    </div>
  ) : null);

  /* ═══ DESKTOP LAYOUT ═══ */
  if (isDesktop) {
    return (
      <>
        <div className="flex-1 min-h-0 overflow-y-auto" dir="rtl">
          {/* ── Main Content ── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h1 className="font-display font-black text-lg text-ink">
              {section === 'food' ? 'مطاعم وكافيه' : section === 'store' ? 'متاجر' : 'مساحات عمل'}
            </h1>
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
                            <PlaceRow key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
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
                                  onClick={() => router.push(`/places/${place.id}`)}
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
                <div className="p-6">
                  {/* Story circles skeleton */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                      <div className="h-3.5 w-12 bg-border/50 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-6">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-[6px]">
                          <div className="w-[86px] h-[86px] rounded-full bg-border/40 animate-pulse" />
                          <div className="h-2.5 w-14 bg-border/40 rounded animate-pulse" />
                          <div className="h-2 w-10 bg-border/30 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* List skeleton */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                    <div className="h-3.5 w-10 bg-border/50 rounded animate-pulse" />
                  </div>
                  <div className="bg-surface rounded-2xl overflow-hidden border border-border/40 divide-y divide-border/40">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                        <div className="w-11 h-11 rounded-full bg-border/40 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-28 bg-border/40 rounded" />
                          <div className="h-2.5 w-20 bg-border/30 rounded" />
                        </div>
                        <div className="h-5 w-12 rounded-full bg-border/30" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : places.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
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
                      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-1">
                        {featured.map((place) => {
                          const emoji = EMOJI_MAP[place.type] || '🏪';
                          const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;
                          const closed = !place.is_open;
                          return (
                            <div
                              key={place.id}
                              onClick={() => router.push(`/places/${place.id}`)}
                              className="flex-shrink-0 flex flex-col items-center gap-[6px] cursor-pointer group"
                            >
                              <div
                                className="w-[86px] h-[86px] rounded-full p-[3px] transition-transform group-hover:scale-105"
                                style={{
                                  background: closed
                                    ? 'linear-gradient(135deg, #9CA3AF, #D1D5DB)'
                                    : accent.ring,
                                }}
                              >
                                <div className="w-full h-full rounded-full bg-surface border-[3px] border-surface flex items-center justify-center overflow-hidden">
                                  {place.avatar_url ? (
                                    <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
                                  ) : (
                                    <span className={`text-[36px] ${closed ? 'opacity-45' : ''}`}>{emoji}</span>
                                  )}
                                </div>
                              </div>
                              <div className={`text-[12px] font-semibold text-center max-w-[90px] truncate ${closed ? 'text-mist' : 'text-ink'}`}>
                                {arabicName(place.name)}
                              </div>
                              <div className="text-[10px] text-mist text-center -mt-[2px]">
                                {closed ? 'مغلق' : typeLabel(place.type || 'متجر')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* الكل — Cards */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-[18px] bg-olive rounded-sm" />
                      <span className="font-display font-black text-[14px] text-ink">الكل</span>
                    </div>
                  </div>
                  <div className="bg-surface rounded-2xl overflow-hidden border border-border/40">
                    {places.map((place, i) => (
                      <PlaceRow key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
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
              <>
              {loading ? (
                <div className="p-6">
                  {/* Story circles skeleton */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                      <div className="h-3.5 w-12 bg-border/50 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-6">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-[6px]">
                          <div className="w-[86px] h-[86px] rounded-full bg-border/40 animate-pulse" />
                          <div className="h-2.5 w-14 bg-border/40 rounded animate-pulse" />
                          <div className="h-2 w-10 bg-border/30 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* List skeleton */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                    <div className="h-3.5 w-10 bg-border/50 rounded animate-pulse" />
                  </div>
                  <div className="bg-surface rounded-2xl overflow-hidden border border-border/40 divide-y divide-border/40">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                        <div className="w-12 h-12 rounded-[14px] bg-border/40 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-28 bg-border/40 rounded" />
                          <div className="h-2.5 w-20 bg-border/30 rounded" />
                        </div>
                        <div className="h-5 w-16 rounded-lg bg-border/30" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : places.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
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
                  {/* الأبرز — Story Circles (only on first page, الكل chip) */}
                  {chip === 0 && page === 0 && featured.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-[18px] bg-olive rounded-sm" />
                          <span className="font-display font-black text-[14px] text-ink">الأبرز</span>
                        </div>
                      </div>
                      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-1">
                        {featured.map((place) => {
                          const emoji = EMOJI_MAP[place.type] || '💻';
                          const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;
                          const closed = !place.is_open;
                          return (
                            <div
                              key={place.id}
                              onClick={() => router.push(`/places/${place.id}`)}
                              className="flex-shrink-0 flex flex-col items-center gap-[6px] cursor-pointer group"
                            >
                              <div
                                className="w-[86px] h-[86px] rounded-full p-[3px] transition-transform group-hover:scale-105"
                                style={{
                                  background: closed
                                    ? 'linear-gradient(135deg, #9CA3AF, #D1D5DB)'
                                    : accent.ring,
                                }}
                              >
                                <div className="w-full h-full rounded-full bg-surface border-[3px] border-surface flex items-center justify-center overflow-hidden">
                                  {place.avatar_url ? (
                                    <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
                                  ) : (
                                    <span className={`text-[36px] ${closed ? 'opacity-45' : ''}`}>{emoji}</span>
                                  )}
                                </div>
                              </div>
                              <div className={`text-[12px] font-semibold text-center max-w-[90px] truncate ${closed ? 'text-mist' : 'text-ink'}`}>
                                {arabicName(place.name)}
                              </div>
                              <div className="text-[10px] text-mist text-center -mt-[2px]">
                                {closed ? 'مغلق' : typeLabel(place.type || 'مساحة عمل')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* الكل grid */}
                  {places.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-[18px] bg-olive rounded-sm" />
                        <span className="font-display font-extrabold text-[14px] text-ink">الكل</span>
                      </div>
                      <div className="bg-surface rounded-2xl overflow-hidden border border-border/40">
                        {places.map((place, i) => (
                          <WorkspaceCard key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
                        ))}
                      </div>
                    </>
                  )}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 py-6">
                      <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors">السابق ←</button>
                      <span className="text-[11px] font-semibold text-mist">{page + 1} / {totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-4 py-2 rounded-xl border border-border bg-surface text-xs font-bold text-ink disabled:opacity-40 hover:border-olive transition-colors">→ التالي</button>
                    </div>
                  )}
                </div>
              )}
              </>
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
                          <PlaceRow key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
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
                                onClick={() => router.push(`/places/${place.id}`)}
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
                  <div className="px-8 pt-5">
                    {/* Story circles skeleton */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                        <div className="h-3.5 w-12 bg-border/50 rounded animate-pulse" />
                      </div>
                      <div className="flex gap-6">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex flex-col items-center gap-[6px]">
                            <div className="w-[86px] h-[86px] rounded-full bg-border/40 animate-pulse" />
                            <div className="h-2.5 w-14 bg-border/40 rounded animate-pulse" />
                            <div className="h-2 w-10 bg-border/30 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* List skeleton */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                      <div className="h-3.5 w-10 bg-border/50 rounded animate-pulse" />
                    </div>
                    <div className="bg-surface rounded-2xl overflow-hidden border border-border/40 divide-y divide-border/40">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                          <div className="w-11 h-11 rounded-full bg-border/40 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3.5 w-28 bg-border/40 rounded" />
                            <div className="h-2.5 w-20 bg-border/30 rounded" />
                          </div>
                          <div className="h-5 w-12 rounded-full bg-border/30" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : places.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-sm text-mist">لا توجد مطاعم أو مقاهي حالياً</p>
                  </div>
                ) : (
                  <>
                    {/* الأبرز — Story Circles */}
                    {chip === 0 && page === 0 && places.length > 0 && (
                      <div className="px-8 pt-5 pb-2">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-[18px] bg-olive rounded-sm" />
                            <span className="font-display font-black text-[14px] text-ink">الأبرز</span>
                          </div>
                        </div>
                        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-1">
                          {featured.map((place) => {
                            const emoji = EMOJI_MAP[place.type] || '🍽️';
                            const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;
                            const closed = !place.is_open;
                            return (
                              <div
                                key={place.id}
                                onClick={() => router.push(`/places/${place.id}`)}
                                className="flex-shrink-0 flex flex-col items-center gap-[6px] cursor-pointer group"
                              >
                                <div
                                  className="w-[86px] h-[86px] rounded-full p-[3px] transition-transform group-hover:scale-105"
                                  style={{
                                    background: closed
                                      ? 'linear-gradient(135deg, #9CA3AF, #D1D5DB)'
                                      : accent.ring,
                                  }}
                                >
                                  <div className="w-full h-full rounded-full bg-surface border-[3px] border-surface flex items-center justify-center overflow-hidden">
                                    {place.avatar_url ? (
                                      <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
                                    ) : (
                                      <span className={`text-[36px] ${closed ? 'opacity-45' : ''}`}>{emoji}</span>
                                    )}
                                  </div>
                                </div>
                                <div className={`text-[12px] font-semibold text-center max-w-[90px] truncate ${closed ? 'text-mist' : 'text-ink'}`}>
                                  {arabicName(place.name)}
                                </div>
                                <div className="text-[10px] text-mist text-center -mt-[2px]">
                                  {closed ? 'مغلق' : typeLabel(place.type || 'مطعم')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* الكل — Row list */}
                    {places.length > 0 && (
                      <>
                        <div className="flex items-center justify-between px-8 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-[18px] bg-olive rounded-sm" />
                            <span className="font-display font-black text-[14px] text-ink">الكل</span>
                          </div>
                        </div>
                        <div className="bg-surface rounded-2xl mx-6 overflow-hidden border border-border/40">
                          {places.map((place, i) => (
                            <PlaceRow key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
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
        </div>
      </>
    );
  }

  /* ═══ MOBILE LAYOUT ═══ */
  return (
    <div className="min-h-screen bg-fog" dir="rtl">
      <AppHeader hideActions hideSearch showOrders />

      {/* Search bar — inside green area */}
      <div className="bg-olive px-4 pt-3 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/95 dark:bg-white/12 dark:border dark:border-white/20 rounded-full flex items-center gap-2 px-3 py-2.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-mist dark:text-white/50 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
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
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-30 bg-surface px-4 py-3 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-0 bg-fog rounded-2xl p-1">
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
              onClick={() => { setSection('store'); setChip(0); setPage(0); }}
              className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                section === 'store'
                  ? 'bg-olive text-white shadow-lg'
                  : 'bg-transparent text-ink hover:bg-fog'
              }`}
            >
              متاجر
            </button>
          </div>
        </div>
      </div>

      {/* ─── Sections ─── */}
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
                        <PlaceRow key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
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
                              onClick={() => router.push(`/places/${place.id}`)}
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
                                onClick={() => router.push(`/places/${place.id}`)}
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
            <>
              {/* Story circles skeleton */}
              <div className="px-4 pt-4 pb-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                  <div className="h-3.5 w-12 bg-border/50 rounded animate-pulse" />
                </div>
                <div className="flex gap-[14px] overflow-x-auto no-scrollbar pb-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 flex flex-col items-center gap-[5px]">
                      <div className="w-[60px] h-[60px] rounded-full bg-border/40 animate-pulse" />
                      <div className="h-2.5 w-12 bg-border/40 rounded animate-pulse" />
                      <div className="h-2 w-8 bg-border/30 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              {/* List skeleton */}
              <div className="flex items-center justify-between px-4 py-1.5 bg-fog border-b border-border">
                <div className="h-3 w-10 bg-border/40 rounded animate-pulse" />
                <div className="h-2.5 w-14 bg-border/30 rounded animate-pulse" />
              </div>
              <div className="bg-surface border-b border-border mb-2 pb-28 divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-[42px] h-[42px] rounded-full bg-border/40 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 bg-border/40 rounded" />
                      <div className="h-2.5 w-20 bg-border/30 rounded" />
                    </div>
                    <div className="h-2.5 w-12 bg-border/30 rounded" />
                  </div>
                ))}
              </div>
            </>
          ) : places.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 pb-28 pt-12 text-center">
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
                    {featured.slice(0, 8).map((place) => {
                      const emoji = EMOJI_MAP[place.type] || '🏪';
                      const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;
                      const closed = !place.is_open;
                      return (
                        <div
                          key={place.id}
                          onClick={() => router.push(`/places/${place.id}`)}
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
                            {arabicName(place.name)}
                          </div>
                          <div className="text-[9px] text-mist text-center -mt-[2px]">
                            {closed ? 'مغلق' : typeLabel(place.type || 'متجر')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* الكل */}
              <div className="flex items-center justify-between px-4 py-1.5 bg-fog border-b border-border">
                <span className="font-display font-bold text-[12px] text-mist">الكل</span>
                <span className="text-[10px] text-mist">{count} متجر</span>
              </div>
              <div className="bg-surface border-b border-border mb-2 pb-20">
                {places.map((place, i) => (
                  <PlaceRow key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
                ))}
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
            <span className="text-[11px] font-semibold text-olive bg-olive-pale px-2.5 py-0.5 rounded-full">{count} مكان</span>
          </div>

          {loading ? (
            <>
              {/* Story circles skeleton */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                  <div className="h-3.5 w-12 bg-border/50 rounded animate-pulse" />
                </div>
                <div className="flex gap-[14px] overflow-x-auto no-scrollbar pb-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 flex flex-col items-center gap-[5px]">
                      <div className="w-[60px] h-[60px] rounded-full bg-border/40 animate-pulse" />
                      <div className="h-2.5 w-12 bg-border/40 rounded animate-pulse" />
                      <div className="h-2 w-8 bg-border/30 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              {/* List skeleton */}
              <div className="flex items-center justify-between px-4 py-1.5 bg-fog border-b border-border">
                <div className="h-3 w-10 bg-border/40 rounded animate-pulse" />
                <div className="h-2.5 w-14 bg-border/30 rounded animate-pulse" />
              </div>
              <div className="bg-surface border-b border-border mb-2 pb-28 divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-12 h-12 rounded-[14px] bg-border/40 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 bg-border/40 rounded" />
                      <div className="h-2.5 w-20 bg-border/30 rounded" />
                    </div>
                    <div className="h-5 w-16 rounded-lg bg-border/30" />
                  </div>
                ))}
              </div>
            </>
          ) : places.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 pb-28 pt-12 text-center">
              <h2 className="font-display font-black text-xl text-ink mb-2">لا توجد مساحات عمل حالياً</h2>
              <p className="text-sm text-mist leading-relaxed max-w-[260px]">كن أول من يسجّل مساحة عمل في منطقتك</p>
              <Link href={`/places/register?section=${section}`} className="mt-6 inline-flex items-center gap-2 bg-olive text-white font-display font-extrabold text-[13px] px-5 py-2.5 rounded-xl shadow-[0_3px_12px_rgba(30,77,43,0.2)] hover:bg-olive-deep transition-colors">
                💻 سجّل مساحة عملك
              </Link>
            </div>
          ) : (
            <div className="pb-28">
              {/* Register banner */}
              <div className="px-4 mt-2">
                <Link
                  href={`/places/register?section=${section}`}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 relative overflow-hidden mb-1"
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
              </div>

              {/* الأبرز — Story Circles */}
              {chip === 0 && places.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-[18px] bg-olive rounded-sm" />
                      <span className="font-display font-black text-[14px] text-ink">الأبرز</span>
                    </div>
                    <span className="text-[11px] text-mist">اسحب ←</span>
                  </div>
                  <div className="flex gap-[14px] overflow-x-auto no-scrollbar pb-1">
                    {featured.slice(0, 8).map((place) => {
                      const closed = !place.is_open;
                      return (
                        <div
                          key={place.id}
                          onClick={() => router.push(`/places/${place.id}`)}
                          className="flex-shrink-0 flex flex-col items-center gap-[5px] cursor-pointer group"
                        >
                          <div
                            className="w-[60px] h-[60px] rounded-full p-[2.5px] transition-transform group-hover:scale-105"
                            style={{
                              background: closed
                                ? 'linear-gradient(135deg, #9CA3AF, #D1D5DB)'
                                : 'linear-gradient(135deg, #3730A3, #818CF8)',
                            }}
                          >
                            <div className="w-full h-full rounded-full bg-surface border-[2.5px] border-surface flex items-center justify-center overflow-hidden">
                              {place.avatar_url ? (
                                <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
                              ) : (
                                <span className={`text-[26px] ${closed ? 'opacity-45' : ''}`}>💻</span>
                              )}
                            </div>
                          </div>
                          <div className={`text-[10px] font-semibold text-center max-w-[64px] truncate ${closed ? 'text-mist' : 'text-ink'}`}>
                            {arabicName(place.name)}
                          </div>
                          <div className="text-[9px] text-mist text-center -mt-[2px]">
                            {closed ? 'مغلق' : 'مساحة عمل'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-1.5 bg-fog border-b border-border">
                <span className="font-display font-bold text-[12px] text-mist">الكل</span>
                <span className="text-[10px] text-mist">{count} مكان</span>
              </div>
              <div className="bg-surface border-b border-border mb-2 pb-20">
                {places.map((place, i) => (
                  <WorkspaceCard key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
                ))}
              </div>

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
                        <PlaceRow key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
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
                              onClick={() => router.push(`/places/${place.id}`)}
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
                                onClick={() => router.push(`/places/${place.id}`)}
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
              {/* Story circles skeleton */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-[18px] bg-border/50 rounded-sm" />
                  <div className="h-3.5 w-12 bg-border/50 rounded animate-pulse" />
                </div>
                <div className="flex gap-[14px] overflow-x-auto no-scrollbar pb-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 flex flex-col items-center gap-[5px]">
                      <div className="w-[60px] h-[60px] rounded-full bg-border/40 animate-pulse" />
                      <div className="h-2.5 w-12 bg-border/40 rounded animate-pulse" />
                      <div className="h-2 w-8 bg-border/30 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
              {/* List skeleton */}
              <div className="flex items-center justify-between px-4 py-1.5 bg-fog border-b border-border">
                <div className="h-3 w-10 bg-border/40 rounded animate-pulse" />
                <div className="h-2.5 w-14 bg-border/30 rounded animate-pulse" />
              </div>
              <div className="bg-surface border-b border-border mb-2 pb-32 divide-y divide-border">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="w-[46px] h-[46px] rounded-full bg-border/40 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 bg-border/40 rounded" />
                      <div className="h-2.5 w-20 bg-border/30 rounded" />
                    </div>
                    <div className="h-2.5 w-12 bg-border/30 rounded" />
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
              {/* الأبرز — Story Circles */}
              {chip === 0 && page === 0 && places.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-[18px] bg-olive rounded-sm" />
                      <span className="font-display font-black text-[14px] text-ink">الأبرز</span>
                    </div>
                    <span className="text-[11px] text-mist">اسحب ←</span>
                  </div>
                  <div className="flex gap-[14px] overflow-x-auto no-scrollbar pb-1">
                    {featured.slice(0, 8).map((place) => {
                      const closed = !place.is_open;
                      return (
                        <div
                          key={place.id}
                          onClick={() => router.push(`/places/${place.id}`)}
                          className="flex-shrink-0 flex flex-col items-center gap-[5px] cursor-pointer group"
                        >
                          <div
                            className="w-[60px] h-[60px] rounded-full p-[2.5px] transition-transform group-hover:scale-105"
                            style={{
                              background: closed
                                ? 'linear-gradient(135deg, #9CA3AF, #D1D5DB)'
                                : 'linear-gradient(135deg, #1E4D2B, #4CAF50)',
                            }}
                          >
                            <div className="w-full h-full rounded-full bg-surface border-[2.5px] border-surface flex items-center justify-center overflow-hidden">
                              {place.avatar_url ? (
                                <img src={place.avatar_url} alt="" className="w-full h-full object-cover rounded-full" loading="lazy" />
                              ) : (
                                <span className={`text-[26px] ${closed ? 'opacity-45' : ''}`}>{EMOJI_MAP[place.type] || '🍽️'}</span>
                              )}
                            </div>
                          </div>
                          <div className={`text-[10px] font-semibold text-center max-w-[64px] truncate ${closed ? 'text-mist' : 'text-ink'}`}>
                            {arabicName(place.name)}
                          </div>
                          <div className="text-[9px] text-mist text-center -mt-[2px]">
                            {closed ? 'مغلق' : typeLabel(place.type)}
                          </div>
                        </div>
                      );
                    })}
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
                      <PlaceRow key={place.id} place={place} index={i} onClick={() => router.push(`/places/${place.id}`)} />
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
            {typeLabel(place.type || 'متجر')}
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

      {/* Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {place.is_open ? (
          <span className="text-[9px] font-bold text-olive">● مفتوح</span>
        ) : (
          <span className="text-[9px] font-semibold text-mist">مغلق</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-mist/50"><path d="M15 18l-6-6 6-6"/></svg>
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
  const { theme } = useTheme();
  const closed = !place.is_open;
  const wd = place.workspace_details;
  const services = place.workspace_services?.filter(s => s.available) || [];
  const colors = BG_MAP[place.type] || ['#F9FAFB', '#1A1D23'];
  const bg = theme === 'dark' ? colors[1] : colors[0];

  const priceDisplay = wd?.price_hour ? { val: wd.price_hour, unit: '/ ساعة' }
    : wd?.price_day ? { val: wd.price_day, unit: '/ يوم' }
    : wd?.price_month ? { val: wd.price_month, unit: '/ شهر' }
    : null;

  return (
    <div
      onClick={onClick}
      className={`flex flex-col px-4 lg:px-6 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-olive-pale/40 active:bg-olive-pale ${
        closed ? 'opacity-60' : ''
      }`}
      style={{ animation: `slideUp 0.25s ease both ${0.04 * (index + 1)}s` }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`w-[46px] h-[46px] ${place.avatar_url ? 'rounded-full' : 'rounded-[13px]'} flex items-center justify-center flex-shrink-0 relative overflow-hidden ${
            closed ? 'border-2 border-border' : 'border-2 border-olive'
          } ${!place.avatar_url ? 'text-[22px]' : ''}`}
          style={{ background: closed ? 'var(--color-fog)' : bg }}
        >
          {place.avatar_url ? (
            <img src={place.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : '💻'}
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
              مساحة عمل
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
          {priceDisplay && (
            <span className="text-[10px] font-bold text-olive">{priceDisplay.val} ₪ <span className="font-normal text-olive/70 text-[9px]">{priceDisplay.unit}</span></span>
          )}
        </div>
      </div>

      {/* Details row: services + seats + hours */}
      {(services.length > 0 || wd?.total_seats || (wd?.opens_at && wd?.closes_at)) && (
        <div className="flex items-center gap-1.5 flex-wrap mt-2 mr-[58px]">
          {wd?.total_seats ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-[#3B82F6] bg-[#EFF6FF] border border-[#BFDBFE]">
              {wd.total_seats} مقعد
            </span>
          ) : null}
          {wd?.opens_at && wd?.closes_at && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] text-mist bg-fog border border-border">
              {formatTime(wd.opens_at)} — {formatTime(wd.closes_at)}
            </span>
          )}
          {services.slice(0, 4).map(s => {
            const info = SERVICE_LABELS[s.service];
            return (
              <span key={s.service} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium text-mist bg-fog">
                {info?.icon}{info?.label || s.service}
              </span>
            );
          })}
        </div>
      )}

    </div>
  );
}

/* ─── Desktop Workspace Card (matches mobile card style) ─── */
function DesktopWorkspaceCard({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const { theme } = useTheme();
  const closed = !place.is_open;
  const wd = place.workspace_details;
  const services = place.workspace_services?.filter(s => s.available) || [];
  const colors = BG_MAP[place.type] || ['#F9FAFB', '#1A1D23'];
  const bg = theme === 'dark' ? colors[1] : colors[0];

  const priceDisplay = wd?.price_hour ? { val: wd.price_hour, unit: '/ ساعة' }
    : wd?.price_day ? { val: wd.price_day, unit: '/ يوم' }
    : wd?.price_month ? { val: wd.price_month, unit: '/ شهر' }
    : null;

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-olive/30 flex flex-col h-full ${closed ? 'opacity-60' : ''}`}
      style={{ animation: `slideUp 0.25s ease both ${0.04 * (index + 1)}s` }}
    >
      {/* Top section: avatar + info */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-[56px] h-[56px] ${place.avatar_url ? 'rounded-full' : 'rounded-[15px]'} flex items-center justify-center flex-shrink-0 relative overflow-hidden border-2 ${closed ? 'border-border' : 'border-olive'}`}
            style={{ background: closed ? 'var(--color-fog)' : bg }}
          >
            {place.avatar_url ? (
              <img src={place.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-[26px]">💻</span>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-2 border-white ${closed ? 'bg-mist' : 'bg-olive'}`} />
          </div>

          {/* Name + area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-display font-extrabold text-[15px] text-ink truncate">{place.name}</span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-olive-pale text-olive border border-olive/15 flex-shrink-0">مساحة عمل</span>
            </div>
            <div className="text-[11px] text-mist flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {place.area?.name_ar}
              <span className="opacity-40 mx-0.5">·</span>
              {place.is_open ? (
                <span className="text-olive font-bold">● مفتوح</span>
              ) : (
                <span className="text-mist font-semibold">مغلق</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Badges row: price, seats, hours */}
      <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
        {priceDisplay && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-olive bg-olive-pale border border-olive/15">
            {priceDisplay.val} ₪ <span className="font-normal text-olive/70 text-[10px]">{priceDisplay.unit}</span>
          </span>
        )}
        {wd?.total_seats ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-[#3B82F6] bg-[#EFF6FF] border border-[#BFDBFE]">
            {wd.total_seats} مقعد
          </span>
        ) : null}
        {wd?.opens_at && wd?.closes_at && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] text-mist bg-fog border border-border">
            {formatTime(wd.opens_at)} — {formatTime(wd.closes_at)}
          </span>
        )}
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap">
          {services.slice(0, 5).map(s => {
            const info = SERVICE_LABELS[s.service];
            return (
              <span key={s.service} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-mist bg-fog">
                {info?.icon}{info?.label || s.service}
              </span>
            );
          })}
        </div>
      )}

      {/* Bottom: address + details link — pinned to bottom */}
      <div className="mt-auto px-5 py-3 border-t border-border/40 flex items-center justify-between gap-2">
        {place.address ? (
          <div className="text-[10px] text-mist truncate flex items-center gap-1 flex-1 min-w-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span className="truncate">{place.address}</span>
          </div>
        ) : <div />}
        <span className="text-[11px] text-olive font-bold flex-shrink-0">التفاصيل ←</span>
      </div>
    </div>
  );
}

/* ─── Desktop Store Card (matches workspace card style) ─── */
function DesktopStoreCard({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const closed = !place.is_open;
  const emoji = EMOJI_MAP[place.type] || '🏪';
  const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-olive/30 flex flex-col h-full ${closed ? 'opacity-60' : ''}`}
      style={{ animation: `slideUp 0.25s ease both ${0.04 * (index + 1)}s` }}
    >
      {/* Top section: avatar + info */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-[56px] h-[56px] ${place.avatar_url ? 'rounded-full' : 'rounded-[15px]'} flex items-center justify-center flex-shrink-0 relative overflow-hidden border-2 ${closed ? 'border-border' : 'border-olive'}`}
            style={{ background: closed ? 'var(--color-fog)' : accent.bg }}
          >
            {place.avatar_url ? (
              <img src={place.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-[26px]">{emoji}</span>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-2 border-white ${closed ? 'bg-mist' : 'bg-olive'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-display font-extrabold text-[15px] text-ink truncate">{place.name}</span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: accent.bg, color: accent.text }}>{typeLabel(place.type || 'متجر')}</span>
            </div>
            <div className="text-[11px] text-mist flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {place.area?.name_ar}
              <span className="opacity-40 mx-0.5">&middot;</span>
              {place.is_open ? (
                <span className="text-olive font-bold">● مفتوح</span>
              ) : (
                <span className="text-mist font-semibold">مغلق</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Badges row */}
      <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
        {(place as any).menu_items_count != null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-olive bg-olive-pale border border-olive/15">
            {(place as any).menu_items_count} منتج
          </span>
        )}
      </div>

      {/* Bottom: address + details link — pinned to bottom */}
      <div className="mt-auto px-5 py-3 border-t border-border/40 flex items-center justify-between gap-2">
        {place.address ? (
          <div className="text-[10px] text-mist truncate flex items-center gap-1 flex-1 min-w-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span className="truncate">{place.address}</span>
          </div>
        ) : <div />}
        <span className="text-[11px] text-olive font-bold flex-shrink-0">التفاصيل ←</span>
      </div>
    </div>
  );
}

/* ─── Desktop Food Card (matches workspace card style) ─── */
function DesktopFoodCard({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const closed = !place.is_open;
  const isBoth = place.type === 'both';
  const emoji = isBoth ? '🍽️' : (EMOJI_MAP[place.type] || '🍽️');
  const accent = STORE_ACCENT[place.type] || DEFAULT_ACCENT;
  const placeTypeLabel = typeLabel(place.type);

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-2xl border border-border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-olive/30 flex flex-col h-full ${closed ? 'opacity-60' : ''}`}
      style={{ animation: `slideUp 0.25s ease both ${0.04 * (index + 1)}s` }}
    >
      {/* Top section: avatar + info */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-[56px] h-[56px] ${place.avatar_url ? 'rounded-full' : 'rounded-[15px]'} flex items-center justify-center flex-shrink-0 relative overflow-hidden border-2 ${closed ? 'border-border' : 'border-olive'}`}
            style={{ background: closed ? 'var(--color-fog)' : accent.bg }}
          >
            {place.avatar_url ? (
              <img src={place.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-[26px]">{emoji}</span>
            )}
            <span className={`absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full border-2 border-white ${closed ? 'bg-mist' : 'bg-olive'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-display font-extrabold text-[15px] text-ink truncate">{place.name}</span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-olive-pale text-olive border border-olive/15 flex-shrink-0">{placeTypeLabel}</span>
            </div>
            <div className="text-[11px] text-mist flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {place.area?.name_ar}
              <span className="opacity-40 mx-0.5">&middot;</span>
              {place.is_open ? (
                <span className="text-olive font-bold">● مفتوح</span>
              ) : (
                <span className="text-mist font-semibold">مغلق</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Badges row */}
      <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
        {(place as any).menu_items_count != null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-olive bg-olive-pale border border-olive/15">
            {(place as any).menu_items_count} صنف
          </span>
        )}
      </div>

      {/* Bottom: address + details link — pinned to bottom */}
      <div className="mt-auto px-5 py-3 border-t border-border/40 flex items-center justify-between gap-2">
        {place.address ? (
          <div className="text-[10px] text-mist truncate flex items-center gap-1 flex-1 min-w-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span className="truncate">{place.address}</span>
          </div>
        ) : <div />}
        <span className="text-[11px] text-olive font-bold flex-shrink-0">التفاصيل ←</span>
      </div>
    </div>
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
