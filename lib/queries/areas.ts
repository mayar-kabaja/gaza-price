/**
 * Areas data from backend only (no Supabase).
 */
import { getAreasFromBackend } from "@/lib/api/areas";
import type { Area, Governorate } from "@/types/app";

export async function getAreas(governorate?: Governorate): Promise<Area[]> {
  return getAreasFromBackend(governorate as string | undefined);
}

export async function getAreaById(id: string): Promise<Area | null> {
  const areas = await getAreasFromBackend();
  return areas.find((a) => a.id === id) ?? null;
}
