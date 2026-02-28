import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/get-token-from-request";
import { getApiBaseUrl } from "@/lib/api/client";
import { getProductsFirstCategory, searchProducts } from "@/lib/queries/products";

export const dynamic = "force-dynamic";

/** Fetch price preview for a product from backend (confirmation_count, confirmed_by_me, etc.). */
async function fetchPricePreview(
  base: string,
  productId: string,
  token: string | null,
  limit = 5
): Promise<{ id: string; price: number; confirmation_count: number; confirmed_by_me: boolean; flag_count?: number; flagged_by_me?: boolean; is_mine?: boolean; reported_at: string; store?: { name_ar?: string }; area?: { name_ar?: string } }[]> {
  const params = new URLSearchParams({ product_id: productId, sort: "price_asc", limit: String(limit), offset: "0" });
  const headers: HeadersInit = { Accept: "application/json" };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base}/prices?${params.toString()}`, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { prices?: unknown[] };
  return (data.prices ?? []) as { id: string; price: number; confirmation_count: number; confirmed_by_me: boolean; flag_count?: number; flagged_by_me?: boolean; is_mine?: boolean; reported_at: string; store?: { name_ar?: string }; area?: { name_ar?: string } }[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("category_id") ?? undefined;
  const embedPricePreview = searchParams.get("embed") === "price_preview";
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 30);
  const offset = Number(searchParams.get("offset") ?? 0);
  const token = getTokenFromRequest(req);
  const base = getApiBaseUrl();

  try {
    const result = categoryId
      ? await searchProducts(search, categoryId, limit, offset)
      : await getProductsFirstCategory(limit, offset, search);

    if (embedPricePreview && base && result.products.length > 0) {
      const enriched = await Promise.all(
        result.products.map(async (p) => {
          const pricePreview = await fetchPricePreview(base, p.id, token, 5);
          return { ...p, price_preview: pricePreview };
        })
      );
      return NextResponse.json({ products: enriched, total: result.total });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ في الخادم";
    const status = message.includes("NEXT_PUBLIC_API_URL") ? 503 : 500;
    return NextResponse.json(
      { error: "SERVER_ERROR", message },
      { status }
    );
  }
}
