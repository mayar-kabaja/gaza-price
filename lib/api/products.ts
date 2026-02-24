import { apiGet } from "@/lib/api/client";
import type { Product } from "@/types/app";

type BackendProduct = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  unit?: string | null;
  unit_size: number;
  category?: { name_ar: string; icon?: string | null } | null;
  stats?: { avg_price: number; median_price: number; min_price: number; active_prices_count: number };
};

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const data = await apiGet<BackendProduct>(`/products/${id}`);
    return {
      id: data.id,
      name_ar: data.name_ar,
      name_en: data.name_en ?? undefined,
      category_id: "", // not always in response
      unit: data.unit ?? "",
      unit_size: data.unit_size,
      status: "active",
      category: data.category
        ? { id: "", name_ar: data.category.name_ar, name_en: "", icon: data.category.icon ?? "", sort_order: 0 }
        : undefined,
      created_at: "",
    };
  } catch {
    return null;
  }
}

export async function searchProducts(
  search?: string,
  categoryId?: string,
  limit = 10,
  offset = 0
): Promise<{ products: Product[]; total: number }> {
  const data = await apiGet<{ products: BackendProduct[]; total: number }>("/products", {
    search: search && search.length >= 2 ? search : undefined,
    category_id: categoryId,
    limit,
    offset,
  });
  const products: Product[] = (data.products ?? []).map((p) => ({
    id: p.id,
    name_ar: p.name_ar,
    name_en: p.name_en ?? undefined,
    category_id: "",
    unit: p.unit ?? "",
    unit_size: p.unit_size,
    status: "active",
    category: p.category
      ? { id: "", name_ar: p.category.name_ar, name_en: "", icon: p.category.icon ?? "", sort_order: 0 }
      : undefined,
    created_at: "",
  }));
  return { products, total: data.total ?? 0 };
}
