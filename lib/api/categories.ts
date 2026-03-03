import { apiGet } from "@/lib/api/client";
import type { Category, Section } from "@/types/app";

type BackendCategory = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  icon?: string | null;
  sort_order: number;
  section_id?: string | null;
  section?: { id: string; name_ar: string; icon: string | null; sort_order: number } | null;
};

type BackendSection = {
  id: string;
  name_ar: string;
  icon: string | null;
  sort_order: number;
  categories: BackendCategory[];
};

export async function getCategories(): Promise<Category[]> {
  const data = await apiGet<BackendCategory[]>("/categories");
  return (data ?? []).map((c) => ({
    id: c.id,
    name_ar: c.name_ar,
    name_en: c.name_en ?? "",
    icon: c.icon ?? "",
    sort_order: c.sort_order ?? 0,
    section_id: c.section_id ?? null,
    section: c.section
      ? { id: c.section.id, name_ar: c.section.name_ar, icon: c.section.icon, sort_order: c.section.sort_order }
      : null,
  }));
}

export async function getSectionsWithCategories(): Promise<Section[]> {
  const data = await apiGet<BackendSection[]>("/sections");
  return (data ?? []).map((s) => ({
    id: s.id,
    name_ar: s.name_ar,
    icon: s.icon,
    sort_order: s.sort_order ?? 0,
    categories: (s.categories ?? []).map((c) => ({
      id: c.id,
      name_ar: c.name_ar,
      name_en: c.name_en ?? "",
      icon: c.icon ?? "",
      sort_order: c.sort_order ?? 0,
      section_id: s.id,
    })),
  }));
}
