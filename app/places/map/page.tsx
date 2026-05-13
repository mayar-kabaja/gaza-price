"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";
import { fetchNearbyPlaces, type NearbyPlace } from "@/lib/api/places-nearby";
import { formatDistance } from "@/components/map/PlacesMap";

const PlacesMap = dynamic(() => import("@/components/map/PlacesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-fog">
      <div className="w-8 h-8 border-3 border-olive border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const GAZA_CENTER = { lat: 31.4, lng: 34.38 };

function typeLabel(type: string): string {
  if (type === 'both') return 'مطعم وكافيه';
  if (type === 'restaurant') return 'مطعم';
  if (type === 'cafe') return 'كافيه';
  if (type === 'workspace') return 'مساحة عمل';
  return type;
}

const EMOJI_MAP: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', both: '🍽️', bakery: '🫓', juice: '🧃',
  'بقالية عامة': '🛒', 'سوبرماركت': '🛒', 'خضار وفواكه': '🥬', 'لحوم': '🥩',
  'سمك': '🐟', 'مخبز': '🫓', 'حلويات ومعجنات': '🍰', 'بهارات وتوابل': '🌶️',
  'صيدلية': '💊', 'موبايل وإكسسوارات': '📱', 'ملابس رجالي': '👔', 'ملابس حريمي': '👗',
  'أحذية': '👟', 'مكتبة وقرطاسية': '📚', workspace: '💻', 'أخرى': '📦',
};

const _green: [string, string] = ['#E8F5EE', '#1A2E22'];
const _amber: [string, string] = ['#FFFBEB', '#2A2518'];
const _purple: [string, string] = ['#F5F3FF', '#261A2A'];
const _slate: [string, string] = ['#F1F5F9', '#1A1E2A'];

const BG_MAP: Record<string, [string, string]> = {
  restaurant: _green, cafe: _green, both: _green, bakery: _amber, juice: _green,
  'بقالية عامة': _green, 'سوبرماركت': _green, 'خضار وفواكه': _green,
  'صيدلية': _slate, 'موبايل وإكسسوارات': _slate,
  'ملابس رجالي': _amber, 'ملابس حريمي': _amber, 'أحذية': _amber,
  'مكتبة وقرطاسية': _purple, workspace: _purple, 'أخرى': _slate,
};

function MapPlaceRow({ place }: { place: NearbyPlace }) {
  const router = useRouter();
  const { theme } = useTheme();
  const isBoth = place.type === 'both';
  const emoji = isBoth ? null : (EMOJI_MAP[place.type] || (place.section === 'food' ? '🍽️' : place.section === 'workspace' ? '💻' : '🏪'));
  const colors = BG_MAP[place.type] || ['#F9FAFB', '#1A1D23'];
  const bg = theme === 'dark' ? colors[1] : colors[0];
  const closed = !place.is_open;

  return (
    <div
      onClick={() => router.push(`/places/${place.id}`)}
      className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-olive-pale/40 active:bg-olive-pale ${closed ? 'opacity-60' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-[46px] h-[46px] rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden ${
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
          <span className="font-display font-extrabold text-[13px] text-ink truncate">{place.name}</span>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-olive-pale text-olive border border-olive/15 flex-shrink-0">
            {typeLabel(place.type)}
          </span>
        </div>
        <div className="text-[10px] text-mist">
          📍 {place.area?.name_ar}{place.address ? ` — ${place.address}` : ''}
        </div>
      </div>

      {/* Status + Distance */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {place.is_open ? (
          <span className="text-[9px] font-bold text-olive">● مفتوح</span>
        ) : (
          <span className="text-[9px] font-semibold text-mist">مغلق</span>
        )}
        <span className="text-[9px] text-mist">{formatDistance(place.distance_km)}</span>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLat(GAZA_CENTER.lat);
      setUserLng(GAZA_CENTER.lng);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setUserLat(GAZA_CENTER.lat);
        setUserLng(GAZA_CENTER.lng);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (userLat == null || userLng == null) return;
    setLoading(true);
    fetchNearbyPlaces(userLat, userLng, 50, 500)
      .then(setPlaces)
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false));
  }, [userLat, userLng]);

  const nearestPlaces = useMemo(
    () => [...places].sort((a, b) => a.distance_km - b.distance_km).slice(0, 20),
    [places]
  );

  if (locating) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-fog gap-3" dir="rtl">
        <div className="w-10 h-10 border-3 border-olive border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-mist font-semibold">جاري تحديد موقعك...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-fog" dir="rtl">
      {/* Top bar */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 z-10">
        <Link href="/places" className="text-ink hover:text-olive transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-display font-bold text-ink text-sm flex-1">الأماكن القريبة</h1>
        <span className="text-[11px] text-mist">{places.length} مكان</span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <PlacesMap
          places={places}
          userLat={userLat}
          userLng={userLng}
          className="h-full w-full"
        />
      </div>

      {/* Bottom panel — nearest places list */}
      <div className="bg-surface border-t border-border rounded-t-2xl shadow-lg max-h-[40vh] overflow-y-auto z-10">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between sticky top-0 bg-surface z-10">
          <h2 className="font-display font-bold text-ink text-sm">الأقرب إليك</h2>
          {loading && (
            <div className="w-4 h-4 border-2 border-olive border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {!loading && nearestPlaces.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-mist">لا توجد أماكن قريبة</div>
        )}

        {nearestPlaces.map((place) => (
          <MapPlaceRow key={place.id} place={place} />
        ))}

        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
}
