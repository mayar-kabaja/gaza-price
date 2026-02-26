import { NextRequest, NextResponse } from "next/server";
import { getPricesByProduct } from "@/lib/queries/prices";

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

  try {
    const result = await getPricesByProduct(productId, areaId, sort, limit, offset);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[prices] GET error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
