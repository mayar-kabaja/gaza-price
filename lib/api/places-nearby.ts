import { apiFetch } from "@/lib/api/fetch";

export interface NearbyPlace {
  id: string;
  name: string;
  section: string;
  type: string;
  area?: { id: string; name_ar: string };
  address?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_open: boolean;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radius = 10,
  limit = 50
): Promise<NearbyPlace[]> {
  const res = await apiFetch(
    `/places/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const json = await res.json();
  return json.data ?? json;
}
