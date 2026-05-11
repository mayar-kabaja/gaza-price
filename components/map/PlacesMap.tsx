"use client";

import { useMemo, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { NearbyPlace } from "@/lib/api/places-nearby";
import Link from "next/link";

/* ── Fix default marker icons ── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/* ── Section colors (matching brand) ── */
const SECTION_COLORS: Record<string, string> = {
  food: "#4A7C59",
  store: "#C9A96E",
  workspace: "#3A6347",
};

function createColorIcon(_color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="font-size:22px;line-height:1;display:block;">📍</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

/* ── Distance formatter ── */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} م`;
  return `${km.toFixed(1)} كم`;
}

/* ── Invalidate size on mount (fixes blank tiles in hidden containers) ── */
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 200);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  return null;
}

/* ── Fly to location (only rendered when coords are valid) ── */
function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    try {
      map.flyTo([lat, lng], 14, { duration: 0.8 });
    } catch {
      // Leaflet map not ready
    }
  }, [lat, lng, map]);

  return null;
}

/* ── Tap handler ── */
function TapToSetLocation({
  onTap,
}: {
  onTap: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const lat = e?.latlng?.lat;
      const lng = e?.latlng?.lng;

      if (
        typeof lat === "number" &&
        typeof lng === "number" &&
        isFinite(lat) &&
        isFinite(lng)
      ) {
        onTap(lat, lng);
      }
    },
  });
  return null;
}

/* ── Props ── */
interface PlacesMapProps {
  places: NearbyPlace[];
  userLat?: number;
  userLng?: number;
  className?: string;
  adjustMode?: boolean;
  onLocationChange?: (lat: number, lng: number) => void;
}

/* ── Main component ── */
export default function PlacesMap({
  places,
  userLat,
  userLng,
  className = "",
  adjustMode = false,
  onLocationChange,
}: PlacesMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const hasUserLocation =
    typeof userLat === "number" &&
    typeof userLng === "number" &&
    isFinite(userLat) &&
    isFinite(userLng);

  const safeLat = hasUserLocation ? userLat : 31.4;
  const safeLng = hasUserLocation ? userLng : 34.38;

  /* ── Validate places ── */
  const validPlaces = useMemo(() => {
    return places.filter(
      (p) =>
        typeof p.latitude === "number" &&
        typeof p.longitude === "number" &&
        isFinite(p.latitude) &&
        isFinite(p.longitude)
    );
  }, [places]);

  /* ── Icons ── */
  const icons = useMemo(() => {
    const map: Record<string, L.DivIcon> = {};
    for (const [section, color] of Object.entries(SECTION_COLORS)) {
      map[section] = createColorIcon(color);
    }
    return map;
  }, []);

  if (!mounted) {
    return <div className={className} style={{ height: "100%", width: "100%", minHeight: "150px" }} />;
  }

  return (
    <MapContainer
      key="leaflet-map"
      center={[31.4, 34.38]}
      zoom={13}
      className={className}
      style={{ height: "100%", width: "100%", minHeight: "150px", zIndex: 0 }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        attribution=""
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <InvalidateSize />
      {hasUserLocation && <FlyToUser lat={safeLat} lng={safeLng} />}

      {adjustMode && onLocationChange && (
        <TapToSetLocation onTap={onLocationChange} />
      )}

      {/* User marker */}
      {hasUserLocation && (
        <>
          <CircleMarker
            center={[safeLat, safeLng]}
            radius={8}
            pathOptions={{
              fillColor: adjustMode ? "#ef4444" : "#4A7C59",
              fillOpacity: 1,
              color: "#fff",
              weight: 3,
            }}
          />
          <CircleMarker
            center={[safeLat, safeLng]}
            radius={18}
            pathOptions={{
              fillColor: adjustMode ? "#ef4444" : "#4A7C59",
              fillOpacity: 0.15,
              color: adjustMode ? "#ef4444" : "#4A7C59",
              weight: 1,
              opacity: 0.4,
            }}
          />
        </>
      )}

      {/* Places */}
      {validPlaces.map((place) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={icons[place.section] ?? icons.food}
        >
          <Popup>
            <div dir="rtl" className="text-right min-w-[160px]">
              <div className="font-bold text-sm mb-1">{place.name}</div>
              <div className="text-xs mb-1 opacity-60">{place.type}</div>

              <div className="flex items-center gap-2 text-xs mb-2">
                <span style={{ color: place.is_open ? '#4A7C59' : '#ef4444', fontWeight: 600 }}>
                  {place.is_open ? "● مفتوح" : "مغلق"}
                </span>
                <span className="opacity-60">
                  {formatDistance(place.distance_km)}
                </span>
              </div>

              <Link
                href={`/places/${place.id}`}
                className="text-xs font-bold no-underline"
                style={{ color: '#4A7C59' }}
              >
                عرض الصفحة ←
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
