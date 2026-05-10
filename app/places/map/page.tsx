"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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

export default function MapPage() {
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(true);

  // Request user location
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

  // Fetch nearby places once we have coordinates
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    setLoading(true);
    fetchNearbyPlaces(userLat, userLng, 15, 100)
      .then(setPlaces)
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false));
  }, [userLat, userLng]);

  // Nearest 5 for the bottom card
  const nearestPlaces = useMemo(
    () => [...places].sort((a, b) => a.distance_km - b.distance_km).slice(0, 5),
    [places]
  );

  if (locating) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-fog gap-3"
        dir="rtl"
      >
        <div className="w-10 h-10 border-3 border-olive border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-mist font-semibold">
          جاري تحديد موقعك...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-fog" dir="rtl">
      {/* Top bar */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 z-10">
        <Link
          href="/places"
          className="text-ink hover:text-olive transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-display font-bold text-ink text-sm flex-1">
          الأماكن القريبة
        </h1>
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

      {/* Bottom floating card — nearest places */}
      <div className="bg-surface border-t border-border rounded-t-2xl shadow-lg max-h-[35vh] overflow-y-auto z-10">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <h2 className="font-display font-bold text-ink text-sm">
            الأقرب إليك
          </h2>
          {loading && (
            <div className="w-4 h-4 border-2 border-olive border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {!loading && nearestPlaces.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-mist">
            لا توجد أماكن قريبة
          </div>
        )}

        <div className="divide-y divide-border">
          {nearestPlaces.map((place) => (
            <Link
              key={place.id}
              href={`/places/${place.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-fog transition-colors"
            >
              {/* Color dot */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    place.section === "food"
                      ? "#16a34a"
                      : place.section === "store"
                      ? "#d97706"
                      : "#7c3aed",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink truncate">
                  {place.name}
                </div>
                <div className="text-xs text-mist">{place.type}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span
                  className={`text-[10px] font-bold ${
                    place.is_open ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {place.is_open ? "مفتوح" : "مغلق"}
                </span>
                <span className="text-[10px] text-mist">
                  {formatDistance(place.distance_km)}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </div>
    </div>
  );
}
