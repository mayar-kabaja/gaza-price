"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

/* Fix default marker icons */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationPickerInnerProps {
  position: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function LocationPickerInner({ position, onPick }: LocationPickerInnerProps) {
  return (
    <>
      <ClickHandler onPick={onPick} />
      {position && <Marker position={position} />}
    </>
  );
}

interface LocationPickerProps {
  value?: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

export default function LocationPicker({
  value,
  onChange,
  className = "",
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    value ? [value.lat, value.lng] : null
  );
  const [loadingGps, setLoadingGps] = useState(false);

  useEffect(() => {
    if (value) setPosition([value.lat, value.lng]);
  }, [value]);

  const handlePick = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      onChange({ lat, lng });
    },
    [onChange]
  );

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        onChange({ lat, lng });
        setLoadingGps(false);
      },
      () => setLoadingGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onChange]);

  const center: [number, number] = position ?? [31.4, 34.38];

  return (
    <div className={className} dir="rtl">
      <div className="rounded-xl overflow-hidden border border-border h-[300px] relative">
        <MapContainer
          center={center}
          zoom={position ? 15 : 12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPickerInner position={position} onPick={handlePick} />
        </MapContainer>

        {/* GPS button */}
        <button
          type="button"
          onClick={useMyLocation}
          disabled={loadingGps}
          className="absolute bottom-3 left-3 z-[1000] bg-white dark:bg-zinc-800 shadow-lg rounded-full px-3 py-2 text-xs font-semibold text-ink flex items-center gap-1.5 border border-border hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50"
        >
          {loadingGps ? (
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          )}
          استخدم موقعي الحالي
        </button>
      </div>

      {/* Coordinates display */}
      {position && (
        <div className="mt-2 text-xs text-mist font-mono text-center">
          {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </div>
      )}
    </div>
  );
}
