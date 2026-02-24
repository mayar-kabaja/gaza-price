import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";
import { searchProducts } from "@/lib/api/products";
import { searchProducts as searchProductsSupabase } from "@/lib/queries/products";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("category_id") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 30);
  const offset = Number(searchParams.get("offset") ?? 0);

  const useBackend = !!getApiBaseUrl();
  try {
    const result = useBackend
      ? await searchProducts(search, categoryId, limit, offset)
      : await searchProductsSupabase(search, categoryId, limit, offset);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err instanceof Error ? err.message : "خطأ في الخادم" },
      { status: 500 }
    );
  }
}
