'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { useAreas, usePlaces, usePlacesSearch } from '@/lib/queries/hooks';
import { apiFetch } from '@/lib/api/fetch';
import { uploadReceiptPhoto } from '@/lib/api/upload';
import type { Place, MatchedItem } from '@/lib/api/places';
import type { Area } from '@/types/app';
import { cn } from '@/lib/utils';

type Section = 'food' | 'store';

const PAGE_SIZE = 20;

const FOOD_CHIPS = ['الكل', 'مطعم وكافيه', 'مطاعم', 'كافيه', '🟢 مفتوح'];
const STORE_CHIPS = ['الكل', 'ملابس', 'إلكترونيات', 'حلاقة', 'بناء'];

// Map chip labels to DB type values for filtering
const CHIP_TO_TYPE: Record<string, string | string[]> = {
  'مطاعم': ['restaurant', 'مطعم'],
  'كافيه': ['cafe', 'كافيه', 'مقهى'],
  'مطعم وكافيه': ['both', 'مطعم وكافيه'],
  'ملابس': 'ملابس',
  'إلكترونيات': 'إلكترونيات',
  'حلاقة': 'حلاقة',
  'بناء': 'أدوات منزلية',
};

const GOV_LABELS: Record<string, string> = {
  north: 'شمال غزة',
  central: 'وسط غزة',
  south: 'جنوب غزة',
};

const EMOJI_MAP: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', bakery: '🫓', juice: '🧃',
  'ملابس': '👗', 'إلكترونيات': '📱', 'حلاقة': '✂️', 'أدوات منزلية': '🏗️',
  'صيدلية': '💊', 'كتب ودفاتر': '📚', 'ألعاب أطفال': '🧸', 'أزهار': '🌸',
};

const BG_MAP: Record<string, [string, string]> = {
  restaurant: ['#E8F5EE', '#1A2E22'], cafe: ['#E8F5EE', '#1A2E22'], both: ['#E8F5EE', '#1A2E22'], bakery: ['#FFF8E8', '#2A2518'], juice: ['#F0FDF4', '#1A2E22'],
  'ملابس': ['#FEF0EB', '#2A1E18'], 'إلكترونيات': ['#EEF2FF', '#1A1E2A'], 'حلاقة': ['#FDF4FF', '#261A2A'], 'أدوات منزلية': ['#FEF3E8', '#2A2518'],
  'صيدلية': ['#F0FDF4', '#1A2E22'], 'كتب ودفاتر': ['#FFF8E8', '#2A2518'], 'ألعاب أطفال': ['#FEF0EB', '#2A1E18'], 'أزهار': ['#F0FDF4', '#1A2E22'],
};

export default function PlacesPage() {
  const [section, setSection] = useState<Section>('food');
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

  const { data: areasData } = useAreas();
  const areas = areasData?.areas ?? [];
  const [placesArea, setPlacesArea] = useState<Area | null>(null);

  const { data: searchData, isLoading: searchLoading } = usePlacesSearch(debouncedSearch, section, placesArea?.id);

  const offset = page * PAGE_SIZE;
  const { data: placesData, isLoading: loading } = usePlaces(section, placesArea?.id, PAGE_SIZE, offset);
  const allPlaces = placesData?.places ?? [];
  const totalPlaces = placesData?.total ?? 0;
  const totalPages = Math.ceil(totalPlaces / PAGE_SIZE);

  const chips = section === 'food' ? FOOD_CHIPS : STORE_CHIPS;

  const isSearching = debouncedSearch.length >= 1;
  const matchedItems = searchData?.matched_items ?? [];

  // Filter places by selected chip + search query
  const places = useMemo(() => {
    // If searching, use server results
    if (isSearching) return searchData?.places ?? [];

    let filtered = allPlaces;
    const chipLabel = chips[chip];
    if (chipLabel && chipLabel !== 'الكل') {
      if (chipLabel === '🟢 مفتوح') filtered = filtered.filter((p) => p.is_open);
      else {
        const typeFilter = CHIP_TO_TYPE[chipLabel];
        if (typeFilter) {
          const types = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
          filtered = filtered.filter((p) => types.includes(p.type));
        }
      }
    }
    return filtered;
  }, [isSearching, searchData, allPlaces, chip, chips]);

  const count = totalPlaces;

  const grouped = areas.reduce<Record<string, Area[]>>((acc, a) => {
    const g = a.governorate;
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {});
  const govOrder = ['central', 'south', 'north'];

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
            placeholder="ابحث عن محل، مطعم، كافيه، أو صنف..."
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
              onClick={() => { setSection('food'); setChip(0); setPage(0); }}
              className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                section === 'food'
                  ? 'bg-olive text-white shadow-lg'
                  : 'bg-transparent text-ink hover:bg-fog'
              }`}
            >
              🍽️ مطاعم وكافيه
            </button>
            <button
              onClick={() => { setSection('store'); setChip(0); setPage(0); }}
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

      {/* ─── Store "Coming Soon" ─── */}
      {section === 'store' ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-28 pt-12 text-center">
          <div className="w-20 h-20 rounded-full bg-fog border-[3px] border-border flex items-center justify-center mb-5">
            <span className="text-4xl">🏪</span>
          </div>
          <h2 className="font-display font-black text-xl text-ink mb-2">قريباً</h2>
          <p className="text-sm text-mist leading-relaxed max-w-[260px]">
            قسم المتاجر قيد التطوير وسيكون متاحاً قريباً.
          </p>
          <Link
            href="/places/register"
            className="mt-6 inline-flex items-center gap-2 bg-olive text-white font-display font-extrabold text-[13px] px-5 py-2.5 rounded-xl shadow-[0_3px_12px_rgba(30,77,43,0.2)] hover:bg-olive-deep transition-colors"
          >
            🏪 سجّل متجرك
          </Link>
        </div>
      ) : (
        <>
          {/* Area bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-[7px] h-[7px] rounded-full bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.18)]" />
              <span className="font-display font-bold text-xs text-ink">{placesArea?.name_ar || 'كل المناطق'}</span>
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
                {label === '🟢 مفتوح' ? (<><span className={`w-[7px] h-[7px] rounded-full animate-pulse ${chip === i ? 'bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.3)]' : 'bg-olive shadow-[0_0_0_2px_rgba(45,107,63,0.18)]'}`} />مفتوح</>) : label}
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
            href="/places/register"
            className="flex items-center mx-3 mt-2 mb-1 rounded-2xl px-4 py-3 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #3A6347, #4A7C59)' }}
          >
            <div className="absolute w-[100px] h-[100px] rounded-full bg-white/[0.07] -top-[40px] -left-[20px] pointer-events-none" />
            <div className="flex-1 relative z-[1]">
              <div className="font-display font-black text-[14px] text-white leading-tight">
                صاحب مطعم؟ سجّل مجاناً
              </div>
              <div className="text-[10px] text-white/60 mt-0.5">
                {count} مكان مسجّل · انضم الآن
              </div>
            </div>
            <span className="text-[44px] -my-2 -ml-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)] relative z-[1]">🍽️</span>
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
                    <span className="text-[10px] text-mist">{chip === 0 ? (totalPlaces > 4 ? totalPlaces - 4 : 0) : places.length} مكان</span>
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
  const emoji = isBoth ? null : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : '🏪'));
  const gradient = CARD_GRADIENTS[index % 3];
  const typeLabel = isBoth ? 'مطعم وكافيه' : place.type === 'restaurant' ? 'مطعم' : place.type === 'cafe' ? 'كافيه' : place.type;

  const hasAvatar = !!place.avatar_url;

  return (
    <div
      onClick={onClick}
      className="w-[155px] h-[185px] flex-shrink-0 rounded-2xl relative overflow-hidden cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all"
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
              {typeLabel}
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

/* ─── Place Row ─── */
function PlaceRow({ place, index, onClick }: { place: Place; index: number; onClick: () => void }) {
  const { theme } = useTheme();
  const isBoth = place.type === 'both';
  const emoji = isBoth ? null : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : '🏪'));
  const colors = BG_MAP[place.type] || ['#F9FAFB', '#1A1D23'];
  const bg = theme === 'dark' ? colors[1] : colors[0];
  const closed = !place.is_open;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-olive-pale/40 active:bg-olive-pale relative ${
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
            {place.type === 'both' ? 'مطعم وكافيه' : place.type === 'restaurant' ? 'مطعم' : place.type === 'cafe' ? 'كافيه' : place.type}
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

/* ─── Detail Sheet ─── */
interface MenuItem {
  id?: string;
  name: string;
  price: number;
  available: boolean;
  icon?: string | null;
  updated_at?: string;
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

function PlaceSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const isBoth = place.type === 'both';
  const emoji = isBoth ? '🍴☕' : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : '🏪'));
  const [menuSections, setMenuSections] = useState<{ name: string; items: MenuItem[] }[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

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
              {place.section === 'food' ? 'القائمة الكاملة' : 'تفاصيل المتجر'}
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
                <a href={`https://wa.me/${place.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center text-[16px]">
                  💬
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-24">
          {menuLoading ? (
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
                {sec.items.map((item, idx) => (
                  <div
                    key={item.id || `${item.name}-${idx}`}
                    className={`p-3 bg-surface rounded-[11px] mb-1.5 border border-border hover:border-olive/25 ${
                      !item.available ? 'opacity-40' : ''
                    }`}
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
                    {/* Bottom row: freshness + flag */}
                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/50">
                      <span className="text-[9px] text-mist flex items-center gap-1">
                        {item.updated_at ? (
                          <>
                            <span className={`w-[5px] h-[5px] rounded-full ${
                              Date.now() - new Date(item.updated_at).getTime() < 86400000 * 7
                                ? 'bg-olive' : 'bg-amber-400'
                            }`} />
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
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-mist">لا توجد قائمة أسعار بعد</p>
              <p className="text-xs text-mist mt-1">📍 {place.area?.name_ar} · {place.type}</p>
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
      </div>
    </>
  );
}
