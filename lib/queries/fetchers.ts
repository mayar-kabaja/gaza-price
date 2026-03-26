/**
 * React Query keys and fetchers. Use with useQuery/useMutation for caching and fewer requests.
 */

import type { Area, Category, Price, PriceStats, Product, Section } from "@/types/app";
import { apiFetch, apiFetchAdmin } from "@/lib/api/fetch";

// ── Query keys ──
export const queryKeys = {
  areas: ["areas"] as const,
  areasPicker: (gov?: string) => (gov ? ["areas", "picker", gov] : ["areas", "picker"]),
  categories: ["categories"] as const,
  sections: ["sections"] as const,
  stats: ["stats"] as const,
  products: (filters?: { limit?: number; offset?: number; search?: string; categoryId?: string; areaId?: string; embedPricePreview?: boolean }) =>
    ["products", filters ?? {}],
  product: (id: string) => ["products", id] as const,
  productsSearch: (search: string, limit?: number, areaId?: string) =>
    ["products", "search", search, limit ?? 10, areaId ?? ""],
  prices: (productId: string, areaId?: string, sort?: string, limit?: number) =>
    ["prices", productId, areaId, sort, limit],
  contributorMe: ["contributors", "me"] as const,
  contributorMeReports: (status?: string, limit?: number) =>
    ["contributors", "me", "reports", status ?? "all", limit ?? 20] as const,
  reports: (filter: string, areaId?: string | null, limit?: number) =>
    ["reports", filter, areaId ?? "", limit ?? 20] as const,
  // Places
  places: (section: string, areaId?: string, limit?: number, offset?: number) =>
    ["places", section, areaId ?? "", limit ?? 20, offset ?? 0] as const,
  placesSearch: (q: string, section?: string, areaId?: string) =>
    ["places", "search", q, section ?? "", areaId ?? ""] as const,
  // Admin dashboard
  adminStats: ["admin", "stats"] as const,
  adminPendingProducts: (limit: number, offset: number) =>
    ["admin", "pending-products", limit, offset] as const,
  adminFlags: (limit: number, offset: number) =>
    ["admin", "flags", limit, offset] as const,
  adminPlaces: (status: string, limit: number, offset: number) =>
    ["admin", "places", status, limit, offset] as const,
};

// ── Fetchers (return parsed JSON, throw on !res.ok for mutations) ──

async function getJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await apiFetch(url, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data as T;
}

/** Map Arabic governorate names from backend → English keys used by frontend components. */
const GOV_MAP: Record<string, string> = {
  "شمال غزة": "north",
  "غزة":      "north",
  "الوسطى":   "central",
  "خان يونس": "south",
  "رفح":      "south",
};

function mapAreas(raw: unknown[]): Area[] {
  return (raw ?? []).map((a: any) => ({
    ...a,
    governorate: GOV_MAP[a.governorate] ?? a.governorate ?? "central",
  }));
}

export interface BootstrapData {
  areas: { areas: Area[] };
  categories: Category[];
  sections: Section[];
}

export async function fetchBootstrap(): Promise<BootstrapData> {
  const data = await getJson<{ areas: unknown[]; categories: unknown[]; sections: unknown[] }>("/api/bootstrap");
  return {
    areas: { areas: mapAreas(data.areas) },
    categories: (data.categories ?? []) as Category[],
    sections: (data.sections ?? []) as Section[],
  };
}

export async function fetchAreas(): Promise<{ areas: Area[] }> {
  const data = await getJson<{ areas: unknown[] }>("/api/areas");
  return { areas: mapAreas(data.areas) };
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch("/api/categories", { credentials: "include" });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchSectionsWithCategories(): Promise<Section[]> {
  const res = await apiFetch("/api/sections", { credentials: "include" });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export interface PublicStats {
  categories: number;
  products: number;
  prices: number;
}

export async function fetchPublicStats(): Promise<PublicStats> {
  const res = await apiFetch("/api/stats", { credentials: "include" });
  const data = await res.json();
  return {
    categories: data?.categories ?? 0,
    products: data?.products ?? 0,
    prices: data?.prices ?? 0,
  };
}

export async function fetchProducts(params: {
  limit?: number;
  offset?: number;
  search?: string;
  categoryId?: string;
  /** Area for price_preview filtering. */
  areaId?: string;
  /** When true, backend returns price_preview for each product. */
  embedPricePreview?: boolean;
}): Promise<{ products: Product[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  if (params.search) sp.set("search", params.search);
  if (params.categoryId) sp.set("category_id", params.categoryId);
  if (params.areaId) sp.set("area_id", params.areaId);
  if (params.embedPricePreview) sp.set("embed", "price_preview");
  const url = `/api/products?${sp.toString()}`;
  const res = await apiFetch(url);
  const data = await res.json();
  return {
    products: data?.products ?? [],
    total: data?.total ?? 0,
  };
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const res = await apiFetch(`/api/products/${id}`, { credentials: "include" });
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
  /** Pass from useSession(). If omitted, fetcher will use stored token via apiFetch. */
  accessToken?: string | null;
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
  const res = await apiFetch(`/api/prices?${sp.toString()}`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    prices: data?.prices ?? [],
    stats: data?.stats ?? {},
    total: data?.total ?? 0,
  };
}

export async function fetchContributorMe(headers?: Record<string, string>): Promise<{ contributor: unknown }> {
  return getJson("/api/contributors/me", { headers });
}

export interface ReportsResponse {
  reports: import("@/types/app").ReportFeedItem[];
  total: number;
  next_offset: number | null;
}

export async function fetchReports(params: {
  filter: string;
  areaId?: string | null;
  limit?: number;
  offset: number;
  demoLast?: boolean;
  activeOnly?: boolean;
}): Promise<ReportsResponse> {
  const sp = new URLSearchParams();
  sp.set("filter", params.filter === "my_area" ? "all" : params.filter);
  if (params.areaId) sp.set("area_id", params.areaId);
  if (params.demoLast) sp.set("demo_last", "true");
  if (params.activeOnly) sp.set("active_only", "true");
  sp.set("limit", String(params.limit ?? 20));
  sp.set("offset", String(params.offset));
  const res = await apiFetch(`/api/reports?${sp.toString()}`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    reports: data?.reports ?? [],
    total: data?.total ?? 0,
    next_offset: typeof data?.next_offset === "number" ? data.next_offset : null,
  };
}

/** My (contributor) reports — requires auth. */
export interface MyReportItem {
  id: string;
  product_id: string | null;
  product: { id: string; name_ar: string } | null;
  price: number;
  status: string;
  trust_score: number;
  confirmation_count: number;
  reported_at: string;
}

export async function fetchContributorMeReports(params: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ reports: MyReportItem[]; total: number }> {
  const sp = new URLSearchParams();
  sp.set("status", params.status ?? "all");
  sp.set("limit", String(params.limit ?? 20));
  sp.set("offset", String(params.offset ?? 0));
  const res = await apiFetch(`/api/contributors/me/reports?${sp.toString()}`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    reports: data?.reports ?? [],
    total: data?.total ?? 0,
  };
}

// ── Admin dashboard ──
export async function fetchAdminStats(): Promise<Record<string, unknown>> {
  const res = await apiFetchAdmin("/api/admin/stats");
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data as Record<string, unknown>;
}

export interface AdminPendingProduct {
  id: string;
  name_ar: string;
  unit?: string;
  unit_size?: number;
  category?: { name_ar: string };
  suggested_by_handle?: string | null;
  pending_price?: number | null;
  created_at?: string;
}

export async function fetchAdminPendingProducts(limit: number, offset: number): Promise<{
  products: AdminPendingProduct[];
  total: number;
}> {
  const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await apiFetchAdmin(`/api/admin/products/pending?${sp.toString()}`);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    products: data?.products ?? [],
    total: data?.total ?? 0,
  };
}

export interface AdminFlaggedReport {
  id: string;
  price: number;
  product?: { name_ar?: string };
  flag_count: number;
  flags?: { reason?: string; flagged_at?: string }[];
  reported_at?: string;
}

export async function fetchAdminFlags(limit: number, offset: number): Promise<{
  reports: AdminFlaggedReport[];
  total: number;
}> {
  const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await apiFetchAdmin(`/api/admin/flags?${sp.toString()}`);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    reports: data?.reports ?? [],
    total: data?.total ?? 0,
  };
}

export interface AdminPlace {
  id: string;
  name: string;
  section: string;
  type: string;
  area_id?: string;
  area?: { id: string; name_ar: string };
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  owner_token?: string | null;
  is_open: boolean;
  status: string;
  plan?: string;
  created_at?: string;
}

export async function fetchAdminPlaces(status: string, limit: number, offset: number): Promise<{
  data: AdminPlace[];
  total: number;
}> {
  const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) sp.set("status", status);
  const res = await apiFetchAdmin(`/api/admin/places?${sp.toString()}`);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    data: data?.data ?? [],
    total: data?.total ?? 0,
  };
}

// ── Places ──
export async function fetchPlacesSearch(params: {
  q: string;
  section?: string;
  areaId?: string;
  limit?: number;
}): Promise<{
  places: import("@/lib/api/places").Place[];
  matched_items: import("@/lib/api/places").MatchedItem[];
}> {
  const sp = new URLSearchParams();
  sp.set("q", params.q);
  if (params.section) sp.set("section", params.section);
  if (params.areaId) sp.set("area_id", params.areaId);
  if (params.limit) sp.set("limit", String(params.limit));
  const res = await apiFetch(`/api/places/search?${sp.toString()}`);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    places: data?.places ?? [],
    matched_items: data?.matched_items ?? [],
  };
}

export async function fetchPlaces(section: string, areaId?: string, limit = 20, offset = 0): Promise<{
  places: import("@/lib/api/places").Place[];
  total: number;
}> {
  const sp = new URLSearchParams();
  if (areaId) sp.set("area_id", areaId);
  sp.set("limit", String(limit));
  sp.set("offset", String(offset));
  const query = sp.toString();
  const res = await apiFetch(`/api/places/by-section/${section}${query ? `?${query}` : ""}`);
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return {
    places: data?.data ?? [],
    total: data?.pagination?.total ?? 0,
  };
}
