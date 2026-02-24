import { apiGet } from "@/lib/api/client";
import type { Category } from "@/types/app";

type BackendCategory = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  icon?: string | null;
  sort_order: number;
};

export async function getCategories(): Promise<Category[]> {
  const data = await apiGet<BackendCategory[]>("/categories");
  return (data ?? []).map((c) => ({
    id: c.id,
    name_ar: c.name_ar,
    name_en: c.name_en ?? "",
    icon: c.icon ?? "",
    sort_order: c.sort_order ?? 0,
  }));
}
