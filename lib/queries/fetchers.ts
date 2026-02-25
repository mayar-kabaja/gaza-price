/**
 * React Query keys and fetchers. Use with useQuery/useMutation for caching and fewer requests.
 */

import type { Area, Category, Price, PriceStats, Product } from "@/types/app";

// ── Query keys ──
export const queryKeys = {
  areas: ["areas"] as const,
  areasPicker: (gov?: string) => (gov ? ["areas", "picker", gov] : ["areas", "picker"]),
  categories: ["categories"] as const,
  products: (filters?: { category_id?: string; limit?: number; offset?: number }) =>
    ["products", filters ?? {}],
  product: (id: string) => ["products", id] as const,
  productsSearch: (search: string, limit?: number) =>
    ["products", "search", search, limit ?? 10],
  prices: (productId: string, areaId?: string, sort?: string, limit?: number) =>
    ["prices", productId, areaId, sort, limit],
  contributorMe: ["contributors", "me"] as const,
};

// ── Fetchers (return parsed JSON, throw on !res.ok for mutations) ──

async function getJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data as T;
}

export async function fetchAreas(): Promise<{ areas: Area[] }> {
  return getJson("/api/areas");
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories", { credentials: "include" });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchProducts(params: {
  category_id?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ products: Product[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.category_id) sp.set("category_id", params.category_id);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  if (params.search) sp.set("search", params.search);
  const url = `/api/products?${sp.toString()}`;
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  return {
    products: data?.products ?? [],
    total: data?.total ?? 0,
  };
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const res = await fetch(`/api/products/${id}`, { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data ?? null;
}

export async function fetchPrices(params: {
  product_id: string;
  area_id?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  prices: Price[];
  stats: Partial<PriceStats>;
  total: number;
}> {
  const sp = new URLSearchParams({ product_id: params.product_id });
  if (params.area_id) sp.set("area_id", params.area_id);
  if (params.sort) sp.set("sort", params.sort);
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const res = await fetch(`/api/prices?${sp.toString()}`, { credentials: "include" });
  const data = await res.json();
  return {
    prices: data?.prices ?? [],
    stats: data?.stats ?? {},
    total: data?.total ?? 0,
  };
}

export async function fetchContributorMe(headers?: Record<string, string>): Promise<{ contributor: unknown }> {
  return getJson("/api/contributors/me", { headers });
}
