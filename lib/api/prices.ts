import { apiGet } from "@/lib/api/client";
import type { Price, PriceStats } from "@/types/app";

const PRICES_LIST_PATH = process.env.NEXT_PUBLIC_API_PRICES_PATH || "/prices";
const PRICES_FALLBACK_PATH = "/price-reports";

type BackendPrice = {
  id: string;
  price: number;
  currency: string;
  store?: { name_ar?: string };
  area?: { name_ar?: string };
  trust_score: number;
  confirmation_count: number;
  flag_count?: number;
  has_receipt: boolean;
  is_lowest?: boolean;
  reported_at: string;
  expires_at: string;
  confirmed_by_me?: boolean;
  flagged_by_me?: boolean;
  is_mine?: boolean;
  is_stale?: boolean;
};

type BackendPricesResponse = {
  prices: BackendPrice[];
  stats: { avg_price: number; median_price: number; min_price: number };
  total: number;
};

function mapPrice(p: BackendPrice, productId: string): Price {
  return {
    id: p.id,
    product_id: productId,
    store: p.store ? { id: "", name_ar: p.store.name_ar ?? "", area_id: "", is_verified: false } : undefined,
    area: p.area ? { id: "", name_ar: p.area.name_ar ?? "", governorate: "central", is_active: true } : undefined,
    area_id: "",
    price: typeof p.price === "string" ? parseFloat(p.price) : p.price,
    currency: (p.currency as Price["currency"]) ?? "ILS",
    status: "confirmed",
    trust_score: p.trust_score ?? 0,
    confirmation_count: p.confirmation_count ?? 0,
    flag_count: p.flag_count ?? 0,
    has_receipt: p.has_receipt ?? false,
    is_lowest: p.is_lowest,
    reported_at: p.reported_at,
    expires_at: p.expires_at,
    confirmed_by_me: p.confirmed_by_me,
    flagged_by_me: p.flagged_by_me,
    is_mine: p.is_mine,
    is_stale: p.is_stale,
  };
}

async function fetchPricesResponse(
  path: string,
  params: { product_id: string; area_id?: string; sort: string; limit: number; offset: number }
): Promise<BackendPricesResponse> {
  return apiGet<BackendPricesResponse>(path, params);
}

export async function getPricesByProduct(
  productId: string,
  areaId?: string,
  sort: "price_asc" | "trust_desc" | "recent" = "price_asc",
  limit = 20,
  offset = 0
): Promise<{ prices: Price[]; stats: PriceStats; total: number }> {
  const params = {
    product_id: productId,
    area_id: areaId,
    sort,
    limit,
    offset,
  };
  let data: BackendPricesResponse;
  try {
    data = await fetchPricesResponse(PRICES_LIST_PATH, params);
  } catch (err) {
    if (PRICES_LIST_PATH === "/prices" && err instanceof Error && err.message.includes("404")) {
      data = await fetchPricesResponse(PRICES_FALLBACK_PATH, params);
    } else {
      throw err;
    }
  }
  const prices = (data.prices ?? []).map((p) => mapPrice(p, productId));
  const stats: PriceStats = {
    avg_price: data.stats?.avg_price ?? 0,
    median_price: data.stats?.median_price ?? 0,
    min_price: data.stats?.min_price ?? 0,
    report_count: data.total ?? prices.length,
  };
  return { prices, stats, total: data.total ?? 0 };
}
