import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { getPricesByProduct } from "@/lib/api/prices";
import { getPricesByProduct as getPricesByProductSupabase } from "@/lib/queries/prices";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id");
  const areaId = searchParams.get("area_id") ?? undefined;
  const sort = (searchParams.get("sort") ?? "price_asc") as "price_asc" | "trust_desc" | "recent";
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const offset = Number(searchParams.get("offset") ?? 0);

  if (!productId) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "product_id مطلوب" }, { status: 400 });
  }

  const useBackend = !!getApiBaseUrl();
  try {
    const result = useBackend
      ? await getPricesByProduct(productId, areaId, sort, limit, offset)
      : await getPricesByProductSupabase(productId, areaId, sort, limit, offset);
    return NextResponse.json(result);
  } catch (err) {
    if (useBackend) {
      return NextResponse.json({
        prices: [],
        stats: { avg_price: 0, median_price: 0, min_price: 0 },
        total: 0,
      });
    }
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
