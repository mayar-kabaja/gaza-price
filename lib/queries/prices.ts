/**
 * Prices data from backend only (no Supabase).
 */
import { getPricesByProduct as apiGetPricesByProduct } from "@/lib/api/prices";
import type { Price } from "@/types/app";

export async function getPricesByProduct(
  productId: string,
  areaId?: string,
  sort: "price_asc" | "trust_desc" | "recent" = "price_asc",
  limit = 20,
  offset = 0
) {
  return apiGetPricesByProduct(productId, areaId, sort, limit, offset);
}

export async function getPriceById(id: string): Promise<Price | null> {
  try {
    const data = await import("@/lib/api/client").then((m) =>
      m.apiGet<Price & { product?: unknown; store?: unknown; area?: unknown }>(`/prices/${id}`)
    );
    return data ?? null;
  } catch {
    return null;
  }
}
