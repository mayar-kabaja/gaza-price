import { apiGet } from "@/lib/api/client";

export interface PublicStats {
  categories: number;
  products: number;
  prices: number;
}

export async function getPublicStats(): Promise<PublicStats> {
  const data = await apiGet<PublicStats>("/stats");
  return {
    categories: data?.categories ?? 0,
    products: data?.products ?? 0,
    prices: data?.prices ?? 0,
  };
}
