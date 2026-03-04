import { apiGet } from "@/lib/api/client";
import type { Area, Governorate } from "@/types/app";

type BackendArea = {
  id: string;
  name_ar: string;
  governorate: string | null;
  active_reports_count?: number;
};

type BackendAreasResponse = { areas: BackendArea[] };

/** Map Arabic governorate names from DB → English keys used in the frontend. */
const GOV_MAP: Record<string, Governorate> = {
  "شمال غزة": "north",
  "غزة":      "north",
  "الوسطى":   "central",
  "خان يونس": "south",
  "رفح":      "south",
};

export async function getAreasFromBackend(governorate?: string): Promise<Area[]> {
  const params = governorate ? { governorate } : undefined;
  const data = await apiGet<BackendAreasResponse>("/areas", params);
  return (data?.areas ?? []).map((a) => ({
    id: a.id,
    name_ar: a.name_ar,
    governorate: GOV_MAP[a.governorate ?? ""] ?? "central",
    is_active: true,
    active_reports_count: a.active_reports_count,
  }));
}
